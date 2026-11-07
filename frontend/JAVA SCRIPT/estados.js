import { LIMITE_DESATUALIZACAO_MS } from './configuracao-api.js';
const minutos = LIMITE_DESATUALIZACAO_MS / 60000;
export const estados = Object.freeze({
  loading: { titulo: 'Consultando dados', texto: 'Aguarde a resposta do serviço.', icone: 'loading', acao: null },
  success: { titulo: 'Leitura recebida', texto: 'Origem: A conectividade da estação não é informada.',
    icone: 'check', acao: 'Atualizar dados' },
  empty: { acao: 'Consultar novamente' },
  error: { titulo: 'Não foi possível atualizar', texto: 'A consulta falhou. Tente novamente.',
    icone: 'error', acao: 'Tentar novamente' },
  offline: { titulo: 'Serviço inacessível', texto: 'Não foi possível alcançar as informações da estação meteorológica. Verifique sua conexão e tente novamente.',
    icone: 'offline', acao: 'Tentar novamente' },
  stale: { titulo: 'Leitura desatualizada', texto: `Origem: A última leitura tem mais de ${minutos} minutos; a conexão da estação é desconhecida.`,
    icone: 'clock', acao: 'Atualizar dados' },
});
export function estadoDaLeitura(item, agora = Date.now()) {
  if (!item) return { tipo: 'empty' };
  if (!Number.isFinite(Date.parse(item.horario)))
    return { tipo: 'success', texto: 'Origem: Horário da leitura indisponível; atualidade desconhecida.' };
  const idade = agora - Date.parse(item.horario);
  if (idade < -60000) return { tipo: 'success', texto: 'Origem: Horário inconsistente; atualidade desconhecida.' };
  return { tipo: idade > LIMITE_DESATUALIZACAO_MS ? 'stale' : 'success' };
}
export function estadoDaFalha(erro) {
  return { tipo: erro.codigo === 'offline' ? 'offline' : erro.codigo === 'empty' ? 'empty' : 'error' };
}
