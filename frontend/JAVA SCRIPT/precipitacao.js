import { formatarHorario } from './leituras.js?v=20261105u';

const estados = Object.freeze({
  loading: 'Consultando precipitação…',
  error: 'Não foi possível atualizar a precipitação.',
  offline: 'Serviço de dados inacessível.',
  empty: 'Sem medição de precipitação disponível.',
  stale: 'Consulta com leitura desatualizada.',
});

function classificarIntensidade(mm) {
  if (mm <= 2) return { intensidade: 'limpa', mensagem: 'Céu limpo.' };
  if (mm <= 5) return { intensidade: 'leve', mensagem: 'Chuva leve.' };
  if (mm <= 10) return { intensidade: 'moderada', mensagem: 'Chuva moderada.' };
  if (mm <= 20) return { intensidade: 'forte', mensagem: 'Chuva forte.' };
  return { intensidade: 'intensa', mensagem: 'Chuva muito forte.' };
}

function descreverMedicao(medicao, disponivel, estado) {
  if (disponivel) {
    if (medicao.origem === 'demonstracao') return { situacao: 'Dados demonstrativos.', intensidade: null };
    const classificacao = classificarIntensidade(medicao.mm);
    return {
      situacao: `${classificacao.mensagem} Acumulado informado nesta leitura.`,
      intensidade: classificacao.intensidade,
    };
  }
  if (medicao?.mm != null && (!Number.isFinite(medicao.mm) || medicao.mm < 0))
    return { situacao: 'Medição de precipitação inválida.', intensidade: null };
  if (Number.isFinite(medicao?.mm))
    return { situacao: 'Acumulado não exibido: período indisponível.', intensidade: null };
  if (['success', 'stale'].includes(estado))
    return { situacao: 'Pluviometria não informada pela API.', intensidade: null };
  return { situacao: 'Sem medição de precipitação disponível.', intensidade: null };
}

// Recebe apenas o modelo interno em milímetros; não interpreta campos ou contagens da API.
export function apresentarPrecipitacao(medicao, estado = 'success') {
  const periodo = typeof medicao?.periodo === 'string' ? medicao.periodo.trim() : '';
  const valido = Number.isFinite(medicao?.mm) && medicao.mm >= 0 && Boolean(periodo);
  const bloqueado = ['loading', 'error', 'offline', 'empty'].includes(estado);
  const disponivel = valido && !bloqueado;
  const descricao = descreverMedicao(medicao, disponivel, estado);
  return {
    valor: disponivel ? medicao.mm.toLocaleString('pt-BR', { maximumFractionDigits: 20 }) : 'Indisponível',
    unidade: disponivel ? 'mm' : '',
    periodo: disponivel ? `Período: ${periodo}` : 'Período de acumulação indisponível.',
    horario: disponivel ? formatarHorario(medicao.horario) : 'Indisponível',
    intensidade: descricao.intensidade,
    situacao: [...new Set([estados[estado], descricao.situacao])].filter(Boolean).join(' '),
  };
}
