import { FUSO_LEITURAS, LIMITE_DESATUALIZACAO_MS } from './configuracao-api.js';
import { normalizarUmidade } from './umidade.js?v=20261105u';
export const campos = ['temperatura', 'umidade', 'pressao', 'ar', 'luminosidade'];
export const numero = valor => Number.isFinite(valor) ? valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : 'Indisponível';
function normalizarHorario(valor) {
  let horario = typeof valor === 'string' ? valor : '';
  if (!/^\d{4}-\d{2}-\d{2}[T ]/.test(horario)) return null;
  const data = horario.slice(0, 10);
  const dia = Date.parse(`${data}T00:00:00Z`);
  if (!Number.isFinite(dia) || new Date(dia).toISOString().slice(0, 10) !== data) return null;
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(horario)) horario = FUSO_LEITURAS ? horario + FUSO_LEITURAS : '';
  return Number.isFinite(Date.parse(horario)) ? horario : null;
}
export function normalizarLeitura(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Formato de leitura inválido.');
  if (!['data_hora', 'temperatura', 'umidade', 'pressao', 'qualidade_ar', 'luminosidade']
    .some(campo => Object.hasOwn(item, campo))) throw new Error('Resposta sem campos de leitura.');
  const valores = Object.fromEntries(campos.map(campo => {
    const valor = item[campo === 'ar' ? 'qualidade_ar' : campo];
    if (campo === 'umidade') return [campo, normalizarUmidade(valor)];
    return [campo, typeof valor === 'number' && Number.isFinite(valor) ? valor : null];
  }));
  // Sem campo, unidade e período documentados: não inferir chuva a partir de outras medições.
  return { ...valores, horario: normalizarHorario(item.data_hora), precipitacao: null };
}
export function normalizarHistorico(dados) {
  if (dados === null) return [];
  if (!Array.isArray(dados)) throw new Error('Formato de histórico inválido: esperado uma lista.');
  return dados.map(normalizarLeitura).sort((a, b) =>
    (Date.parse(a.horario) || 0) - (Date.parse(b.horario) || 0));
}
export function situacaoLeitura(item) {
  if (!item) return 'Sem leituras disponíveis';
  if (!item.horario) return 'Horário da leitura indisponível';
  const idade = Date.now() - Date.parse(item.horario);
  if (idade < -60000) return 'Horário da leitura no futuro — verificar relógio da estação';
  return idade > LIMITE_DESATUALIZACAO_MS ? 'Dados desatualizados — conectividade não informada' :
    'Leitura recente — conectividade não informada pela API';
}
export function formatarHorario(horario) {
  return Number.isFinite(Date.parse(horario)) ? new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short',
    timeZone: 'America/Sao_Paulo' }).format(new Date(horario)) : 'Indisponível';
}
export function classificar(campo, valor) {
  if (!Number.isFinite(valor)) return 'Indisponível';
  if (campo === 'umidade') return valor < 12 ? 'Emergência: umidade abaixo de 12%' :
    valor < 30 ? 'Atenção: umidade abaixo de 30%' : 'Sem alerta de baixa umidade';
  return campo === 'ar' ? 'Unidade e calibração não informadas pela API' : 'Sem faixas de classificação documentadas';
}
