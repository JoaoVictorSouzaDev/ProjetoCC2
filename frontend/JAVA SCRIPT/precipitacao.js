import { formatarHorario } from './leituras.js?v=20261105u';

const estados = Object.freeze({
  loading: 'Consultando precipitação…',
  error: 'Não foi possível atualizar a precipitação.',
  offline: 'Serviço de dados inacessível.',
  empty: 'Sem medição de precipitação disponível.',
  stale: 'Consulta com leitura desatualizada.',
});

function descreverMedicao(medicao, disponivel) {
  if (disponivel) return medicao.origem === 'demonstracao' ? 'Dados demonstrativos.' : 'Acumulado no período informado.';
  if (medicao?.mm != null && (!Number.isFinite(medicao.mm) || medicao.mm < 0)) return 'Medição de precipitação inválida.';
  if (Number.isFinite(medicao?.mm)) return 'Acumulado não exibido: período indisponível.';
  return 'Sem medição de precipitação disponível.';
}

// Recebe apenas o modelo interno em milímetros; não interpreta campos ou contagens da API.
export function apresentarPrecipitacao(medicao, estado = 'success') {
  const periodo = typeof medicao?.periodo === 'string' ? medicao.periodo.trim() : '';
  const valido = Number.isFinite(medicao?.mm) && medicao.mm >= 0 && Boolean(periodo);
  const bloqueado = ['loading', 'error', 'offline', 'empty'].includes(estado);
  const disponivel = valido && !bloqueado;
  return {
    valor: disponivel ? medicao.mm.toLocaleString('pt-BR', { maximumFractionDigits: 20 }) : 'Indisponível',
    unidade: disponivel ? 'mm' : '',
    periodo: disponivel ? `Período: ${periodo}` : 'Período de acumulação indisponível.',
    horario: disponivel ? formatarHorario(medicao.horario) : 'Indisponível',
    situacao: [...new Set([estados[estado], descreverMedicao(medicao, disponivel)])].filter(Boolean).join(' '),
  };
}
