import { obterLeituraRecente, validarId } from './api.js?v=20261105u';
import { normalizarLeitura } from './leituras.js?v=20261105u';
import { API_BASE_URL, INTERVALO_ATUALIZACAO_MS } from './configuracao-api.js';

export function validarLeituraDaEstacao(dados, id) {
  if (dados?.estacao_id !== undefined && dados.estacao_id !== id)
    throw new Error('A resposta não pertence à estação selecionada.');
  if (dados !== null) normalizarLeitura(dados);
  return dados;
}
function armazenamentoDaSessao() {
  try { return globalThis.sessionStorage; } catch { return null; }
}
export function politicaInicialDeLeitura() {
  const navegacao = globalThis.performance?.getEntriesByType('navigation')[0];
  return navegacao?.type === 'reload' ? 'atualizar' : 'reutilizar';
}
// O cache conserva a resposta e seu horário original, nunca o horário da consulta como leitura.
export function criarRepositorioLeituras(opcoes) {
  const memoria = new Map(), pendentes = new Map();
  const chave = id => `aeris:leitura:v1:${opcoes.baseUrl}:${id}`;
  function salvar(id, registro) {
    memoria.set(id, registro);
    try { opcoes.armazenamento?.setItem(chave(id), JSON.stringify(registro)); }
    catch {
      // Impede que uma gravação recusada deixe uma leitura antiga reutilizável.
      try { opcoes.armazenamento?.removeItem(chave(id)); } catch { /* Armazenamento bloqueado pelo navegador. */ }
    }
  }
  function recuperar(id) {
    let registro = memoria.get(id);
    try {
      const salvo = JSON.parse(opcoes.armazenamento?.getItem(chave(id)) || 'null');
      if (salvo && (!registro || salvo.consultadoEm >= registro.consultadoEm)) registro = salvo;
    } catch { /* A memória continua utilizável se o armazenamento estiver bloqueado ou corrompido. */ }
    const idade = opcoes.agora() - registro?.consultadoEm;
    return Number.isFinite(idade) && idade >= 0 && idade < opcoes.validade ? registro : null;
  }
  async function buscar(id, signal) {
    try {
      const recebido = await opcoes.buscar(id, signal);
      signal?.throwIfAborted();
      const dados = validarLeituraDaEstacao(recebido, id);
      salvar(id, { dados, consultadoEm: opcoes.agora() });
      return dados;
    } catch (erro) {
      if (erro.name !== 'AbortError') salvar(id, { erro: { message: erro.message, codigo: erro.codigo || 'error' },
        consultadoEm: opcoes.agora() });
      throw erro;
    }
  }
  return function obter(estacao, consulta = {}) {
    if (!estacao?.apiId) return Promise.resolve(null);
    validarId(estacao.apiId);
    const id = estacao.apiId, pendente = pendentes.get(id);
    if (pendente && !pendente.signal?.aborted) return pendente.promessa;
    const registro = consulta.politica === 'atualizar' ? null : recuperar(id);
    if (registro?.erro) return Promise.reject(Object.assign(new Error(registro.erro.message), registro.erro));
    if (registro && Object.hasOwn(registro, 'dados')) {
      try { return Promise.resolve(validarLeituraDaEstacao(registro.dados, id)); }
      catch { memoria.delete(id); }
    }
    const promessa = buscar(id, consulta.signal).finally(() => {
      if (pendentes.get(id)?.promessa === promessa) pendentes.delete(id);
    });
    pendentes.set(id, { promessa, signal: consulta.signal });
    return promessa;
  };
}
export const obterLeituraCompartilhada = criarRepositorioLeituras({
  buscar: obterLeituraRecente, baseUrl: API_BASE_URL, agora: Date.now,
  validade: INTERVALO_ATUALIZACAO_MS, armazenamento: armazenamentoDaSessao(),
});
