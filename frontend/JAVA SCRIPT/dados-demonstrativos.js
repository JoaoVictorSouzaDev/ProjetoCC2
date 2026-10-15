export const localidades = Object.freeze([
  { id: 'sao-paulo', nome: 'São Paulo', uf: 'SP', condicao: 'Parcialmente nublado',
    temperatura: 23, umidade: 64, vento: 11, pressao: 1013, ar: 16, luminosidade: 380, ruido: 56 },
  { id: 'campinas', nome: 'Campinas', uf: 'SP', condicao: 'Parcialmente nublado',
    temperatura: 25, umidade: 59, vento: 12, pressao: 1011, ar: 14, luminosidade: 510, ruido: 46 },
  { id: 'sorocaba', nome: 'Sorocaba', uf: 'SP', condicao: 'Ensolarado',
    temperatura: 26, umidade: 54, vento: 9, pressao: 1012, ar: 12, luminosidade: 420, ruido: 48 },
  { id: 'santos', nome: 'Santos', uf: 'SP', condicao: 'Chuva leve',
    temperatura: 24, umidade: 78, vento: 21, pressao: 1008, ar: 10, luminosidade: 180, ruido: 52 },
  { id: 'curitiba', nome: 'Curitiba', uf: 'PR', condicao: 'Nublado',
    temperatura: 17, umidade: 72, vento: 14, pressao: 1016, ar: 8, luminosidade: 230, ruido: 42 },
].map(Object.freeze));

export const unidades = Object.freeze({
  temperatura: '°C', umidade: '%', pressao: 'hPa', ar: 'µg/m³', luminosidade: 'lx', ruido: 'dB(A)',
});

export function formatarIndicadores(localidade) {
  return Object.fromEntries(Object.entries(unidades).map(([campo, unidade]) =>
    [campo, `${localidade[campo].toLocaleString('pt-BR')} ${unidade}`]));
}

export function moverSelecao(lista, atual, deslocamento) {
  if (!lista.length) return null;
  const indice = Math.max(0, lista.findIndex(local => local.id === atual));
  return lista[((indice + deslocamento) % lista.length + lista.length) % lista.length].id;
}

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function filtrarLocalidades(consulta) {
  const termo = normalizar(consulta);
  return localidades.filter(local => normalizar(`${local.nome} ${local.uf}`).includes(termo));
}
