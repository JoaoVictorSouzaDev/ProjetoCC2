export function normalizarUmidade(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}
export function apresentarUmidade(valor) {
  const umidade = normalizarUmidade(valor);
  if (umidade === null) return { valor: 'Indisponível', unidade: '', texto: 'Indisponível' };
  const texto = umidade.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return { valor: texto, unidade: '%', texto: `${texto} %` };
}
