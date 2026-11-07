// Configure apenas identificadores confirmados pela API. Null significa não configurado.
export const catalogoEstacoes = Object.freeze([
  { id: 'sao-paulo', nome: 'São Paulo', uf: 'SP', imagem: 'sao-paulo.webp', posicao: 'center 65%', apiId: null },
  { id: 'campinas', nome: 'Campinas', uf: 'SP', imagem: 'campinas.webp', posicao: 'center', apiId: null },
  { id: 'sorocaba', nome: 'Sorocaba', uf: 'SP', imagem: 'sorocaba.webp', posicao: 'center', apiId: 1 },
  { id: 'santos', nome: 'Santos', uf: 'SP', imagem: 'santos.webp', posicao: 'center 75%', apiId: null },
  { id: 'curitiba', nome: 'Curitiba', uf: 'PR', imagem: 'curitiba.webp', posicao: 'center 60%', apiId: null },
].map(item => Object.freeze({ ...item, cidade: item.nome,
  imagem: `../ASSETS/images/locations/${item.imagem}`,
  rota: `dashboard.html?local=${encodeURIComponent(item.id)}`,
  disponibilidade: item.apiId === null ? 'unconfigured' : 'configured',
})));
export const estacoes = Object.freeze(Object.fromEntries(catalogoEstacoes.map(item => [item.id, item.apiId])));

export function moverSelecao(lista, atual, deslocamento) {
  if (!lista.length) return null;
  const indice = lista.findIndex(local => local.id === atual);
  if (indice < 0) return lista[deslocamento < 0 ? lista.length - 1 : 0].id;
  return lista[((indice + deslocamento) % lista.length + lista.length) % lista.length].id;
}
