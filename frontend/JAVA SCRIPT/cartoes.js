import { catalogoEstacoes as localidades } from './estacoes.js?v=20261107c';
import { icone } from './icones.js?v=20261105u';
function medicao(titulo, simbolo, atributo, id, descricao) {
  return `<div><dt>${icone(simbolo)}${titulo}</dt><dd data-${atributo}="${id}"
    aria-describedby="${descricao}-${id}">Indisponível</dd>
    <dd class="origem-medicao" id="${descricao}-${id}">Aguardando API</dd></div>`;
}
function conteudo(local) {
  return `<div class="clima">
    <img class="foto-localidade" src="${local.imagem}" alt="Paisagem de ${local.nome}"
      width="720" height="960" loading="lazy" decoding="async" draggable="false">
    <div class="condicoes-cartao">${icone('temperature', 'icone icone-clima')}
      <p class="temperatura-cartao" data-temperatura="${local.id}">Indisponível</p>
      <p data-origem-temperatura="${local.id}">Aguardando API</p></div>
    <div class="identificacao-localidade"><h3>${local.nome}</h3><p class="estado">${local.uf}</p></div></div>
    <div class="detalhes-localidade"><dl class="resumo-localidade">
      ${medicao('Umidade', 'humidity', 'umidade', local.id, 'origem-umidade')}
      ${medicao('Pressão atmosférica', 'pressure', 'pressao', local.id, 'origem-pressao')}
      ${medicao('Qualidade do ar', 'air', 'qualidade-ar', local.id, 'origem-ar')}
      ${medicao('Luminosidade', 'light', 'luminosidade', local.id, 'origem-luminosidade')}</dl>
      <a class="selecionar" href="${local.rota}">Ver clima completo
        <span class="sr-only"> de ${local.nome}</span>${icone('arrow-right')}</a></div>`;
}
export function criarCartoes() {
  document.getElementById('lista-localidades').innerHTML = localidades.map(local =>
    `<li class="localidade" data-localidade="${local.id}"><article>
      ${conteudo(local)}</article></li>`).join('');
  localidades.forEach(local => {
    document.querySelector(`[data-localidade="${local.id}"] img`).style.objectPosition = local.posicao;
  });
}
