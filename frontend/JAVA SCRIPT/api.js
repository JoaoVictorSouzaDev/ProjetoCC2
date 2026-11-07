import { API_BASE_URL, TIMEOUT_API_MS } from './configuracao-api.js';

function falha(mensagem, codigo = 'error') {
  return Object.assign(new Error(mensagem), { codigo });
}

export function validarId(id) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Dados desta estação indisponíveis no momento.');
  return encodeURIComponent(id);
}

async function lerResposta(resposta) {
  const texto = await resposta.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; }
  catch { throw new Error('A API retornou uma resposta que não é JSON válido.'); }
  if (resposta.ok) return dados;
  const mensagens = { 404: 'Estação não encontrada ou sem leituras.', 422: 'Parâmetros rejeitados pela API.' };
  const vazio = resposta.status === 404 && dados?.detail === 'Nenhuma leitura registrada para esta estação.';
  throw falha(mensagens[resposta.status] || `API indisponível (HTTP ${resposta.status}).`, vazio ? 'empty' : 'error');
}

export async function requisitar(caminho, opcoes = {}) {
  if (!API_BASE_URL) throw new Error('Não foi possível consultar os dados no momento.');
  const controle = new AbortController();
  const cancelar = () => controle.abort();
  const timer = setTimeout(cancelar, TIMEOUT_API_MS);
  opcoes.signal?.addEventListener('abort', cancelar, { once: true });
  if (opcoes.signal?.aborted) cancelar();
  try {
    return await lerResposta(await fetch(API_BASE_URL.replace(/\/$/, '') + caminho,
      { ...opcoes, signal: controle.signal, headers: { Accept: 'application/json', ...opcoes.headers } }));
  } catch (erro) {
    if (opcoes.signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
    throw falha(erro.name === 'AbortError' ? 'A API excedeu o tempo de resposta.' :
      erro instanceof TypeError ? 'Não foi possível conectar ao serviço. Tente novamente mais tarde.' : erro.message, erro.codigo || (erro instanceof TypeError || erro.name === 'AbortError' ? 'offline' : 'error'));
  } finally {
    clearTimeout(timer); opcoes.signal?.removeEventListener('abort', cancelar);
  }
}

export function verificarApi(signal) { return requisitar('/', { signal }); }
export function validarData(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Selecione uma data válida.');
  const instante = Date.parse(`${data}T00:00:00Z`);
  if (!Number.isFinite(instante) || new Date(instante).toISOString().slice(0, 10) !== data)
    throw new Error('Selecione uma data válida.');
}
export function obterLeituraRecente(id, signal) {
  return requisitar(`/api/estacoes/${validarId(id)}/recente`, { signal });
}
export function obterHistorico(id, consulta) {
  validarData(consulta.data);
  return requisitar(`/api/estacoes/${validarId(id)}/historico?data=${encodeURIComponent(consulta.data)}`,
    { signal: consulta.signal });
}
export function registrarLeitura(leitura) {
  validarId(leitura.estacao_id);
  const campos = ['temperatura', 'umidade', 'pressao', 'qualidade_ar', 'luminosidade'];
  if (campos.some(campo => !Number.isFinite(leitura[campo]))) throw new Error('Preencha as cinco medições numéricas.');
  if (leitura.temperatura < -40 || leitura.temperatura > 80) throw new Error('Temperatura fora dos limites aceitos.');
  const corpo = { estacao_id: leitura.estacao_id, ...Object.fromEntries(campos.map(campo => [campo, leitura[campo]])) };
  return requisitar('/api/leituras', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo) });
}
