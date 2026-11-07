export function formatarData(horario, estilo = 'completo') {
  const opcoes = { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' };
  if (estilo === 'completo') Object.assign(opcoes, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return new Intl.DateTimeFormat('pt-BR', opcoes).format(new Date(horario));
}
