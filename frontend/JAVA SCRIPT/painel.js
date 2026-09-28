import { localidades, formatarIndicadores, filtrarLocalidades } from './dados-demonstrativos.js';

const dashboardPorLocal = Object.freeze({
  'sao-paulo': 'dashboard.html?local=sao-paulo',
  campinas: 'dashboard.html?local=campinas',
  sorocaba: 'dashboard.html?local=sorocaba',
  santos: 'dashboard.html?local=santos',
  curitiba: 'dashboard.html?local=curitiba'
});

const lista = document.querySelector('#lista-localidades');
const carrossel = document.querySelector('.carrossel');
const paginacao = document.querySelector('.paginacao');
const busca = document.querySelector('#busca');
const movimentoReduzido = matchMedia('(prefers-reduced-motion: reduce)');
let disponiveis = [...localidades];
let selecionada = 'sorocaba';
let inicioGesto = null;
let bloquearClique = false;
let quadroCentralizacao = 0;
let larguraObservada = 0;

function escrever(id, texto) {
  document.getElementById(id).textContent = texto;
}

function atualizarPainel(local) {
  document.getElementById('link-dashboard').href = dashboardPorLocal[local.id];
  escrever('titulo-painel', `${local.nome} — ${local.uf}`);
  escrever('condicao-painel', `${local.condicao} · Dados demonstrativos`);
  escrever('localizacao-selecionada', `Localidade demonstrativa: ${local.nome} — ${local.uf}.`);
  escrever('resumo-localidade', `${local.nome}: ${local.condicao.toLowerCase()}, ` +
    `${local.temperatura} °C e umidade de ${local.umidade} %.`);
  for (const [campo, valor] of Object.entries(formatarIndicadores(local))) escrever(`valor-${campo}`, valor);
  escrever('anuncio-localidade', `${local.nome} selecionada. Painel atualizado com dados demonstrativos.`);
}

function atualizarCartoes() {
  lista.querySelectorAll('[data-localidade]').forEach(cartao => {
    const ativo = cartao.dataset.localidade === selecionada;
    cartao.classList.toggle('selecionada', ativo);
    cartao.querySelector('article').setAttribute('aria-current', String(ativo));
  });
  paginacao.querySelectorAll('button').forEach(botao => {
    botao.setAttribute('aria-pressed', String(botao.dataset.selecionar === selecionada));
  });
}

function atualizarEspacosLaterais() {
  const cartoes = [...lista.children].filter(cartao => !cartao.hidden);
  const largura = carrossel.getBoundingClientRect().width;
  const primeiro = cartoes[0]?.getBoundingClientRect().width || largura;
  const ultimo = cartoes.at(-1)?.getBoundingClientRect().width || largura;
  lista.style.paddingLeft = `${Math.max(0, (largura - primeiro) / 2)}px`;
  lista.style.paddingRight = `${Math.max(0, (largura - ultimo) / 2)}px`;
}

function calcularPosicaoCentral() {
  const cartao = lista.querySelector('.selecionada:not([hidden])');
  if (!cartao) return 0;
  const container = lista.getBoundingClientRect();
  const ativo = cartao.getBoundingClientRect();
  const centroDoContainer = container.left + container.width / 2;
  const centroDoCardAtivo = ativo.left + ativo.width / 2;
  const deslocamento = centroDoContainer - centroDoCardAtivo;
  return Math.max(0, Math.min(lista.scrollWidth - lista.clientWidth, lista.scrollLeft - deslocamento));
}

function animarCentralizacao(inicio, agora) {
  inicio.tempo ??= agora;
  const progresso = Math.min(1, (agora - inicio.tempo) / 380);
  const suavidade = 1 - (1 - progresso) ** 3;
  atualizarEspacosLaterais();
  const destino = calcularPosicaoCentral();
  lista.scrollTo({ left: inicio.rolagem + (destino - inicio.rolagem) * suavidade, behavior: 'instant' });
  quadroCentralizacao = progresso < 1
    ? requestAnimationFrame(tempo => animarCentralizacao(inicio, tempo)) : 0;
}

function centralizar(modo = 'suave') {
  cancelAnimationFrame(quadroCentralizacao);
  quadroCentralizacao = 0;
  if (modo === 'imediato' || movimentoReduzido.matches) {
    lista.classList.add('sem-transicao');
    atualizarEspacosLaterais();
    lista.scrollTo({ left: calcularPosicaoCentral(), behavior: 'instant' });
    lista.classList.remove('sem-transicao');
    return;
  }
  const inicio = { tempo: null, rolagem: lista.scrollLeft };
  quadroCentralizacao = requestAnimationFrame(tempo => animarCentralizacao(inicio, tempo));
}

function atualizarSetas() {
  const indice = disponiveis.findIndex(local => local.id === selecionada);
  document.querySelector('.anterior').disabled = indice <= 0;
  document.querySelector('.proxima').disabled = indice < 0 || indice >= disponiveis.length - 1;
}

function selecionar(id) {
  const local = disponiveis.find(item => item.id === id);
  if (!local) return;
  selecionada = id;
  atualizarPainel(local);
  atualizarCartoes();
  atualizarSetas();
  centralizar();
}

function navegar(deslocamento) {
  const indice = disponiveis.findIndex(local => local.id === selecionada);
  const destino = disponiveis[indice + deslocamento];
  if (indice >= 0 && destino) selecionar(destino.id);
  else centralizar();
}

function criarPaginacao() {
  paginacao.replaceChildren(...disponiveis.map(local => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.dataset.selecionar = local.id;
    botao.setAttribute('aria-label', `Selecionar ${local.nome}`);
    botao.setAttribute('aria-controls', 'painel lista-localidades');
    botao.setAttribute('aria-pressed', String(local.id === selecionada));
    return botao;
  }));
}

function abrirDashboard(id) {
  const destino = dashboardPorLocal[id];
  if (destino) location.assign(destino);
}

function abrirLocalidade(evento) {
  const cartao = evento.target.closest('[data-localidade]');
  if (cartao) return abrirDashboard(cartao.dataset.localidade);
  const indicador = evento.target.closest('[data-selecionar]');
  if (indicador) selecionar(indicador.dataset.selecionar);
}

function ativarCardTeclado(evento) {
  if (!evento.target.matches('[data-dashboard]')) return;
  if (!['Enter', ' '].includes(evento.key)) return;
  evento.preventDefault();
  if (!evento.repeat) abrirDashboard(evento.target.dataset.dashboard);
}

function selecionarCardFocado(evento) {
  if (inicioGesto) return;
  const cartao = evento.target.closest('[data-localidade]');
  if (cartao && cartao.dataset.localidade !== selecionada) selecionar(cartao.dataset.localidade);
}

function ignorarCliqueAposArraste(evento) {
  if (!bloquearClique) return;
  evento.preventDefault();
  evento.stopImmediatePropagation();
  bloquearClique = false;
}

function navegarTeclado(evento) {
  bloquearClique = false;
  const destinos = { ArrowLeft: -1, ArrowRight: 1 };
  if (evento.key in destinos) navegar(destinos[evento.key]);
  else if (evento.key === 'Home') selecionar(disponiveis[0]?.id);
  else if (evento.key === 'End') selecionar(disponiveis.at(-1)?.id);
  else return;
  evento.preventDefault();
  const destino = carrossel.contains(evento.target)
    ? lista.querySelector('.selecionada article') : paginacao.querySelector('[aria-pressed="true"]');
  destino?.focus({ preventScroll: true });
}

function filtrar() {
  disponiveis = filtrarLocalidades(busca.value);
  lista.querySelectorAll('[data-localidade]').forEach(cartao => {
    cartao.hidden = !disponiveis.some(local => local.id === cartao.dataset.localidade);
  });
  criarPaginacao();
  escrever('contagem-localidades', `${disponiveis.length} localidades demonstrativas`);
  escrever('resultado-busca', disponiveis.length ? '' : 'Nenhuma cidade encontrada. O painel mantém a última seleção.');
  if (!disponiveis.some(local => local.id === selecionada)) selecionar(disponiveis[0]?.id);
  atualizarCartoes();
  atualizarSetas();
  centralizar('imediato');
}

function iniciarGesto(evento) {
  if (!evento.isPrimary || evento.button !== 0) return;
  bloquearClique = false;
  cancelAnimationFrame(quadroCentralizacao);
  quadroCentralizacao = 0;
  inicioGesto = { id: evento.pointerId, x: evento.clientX, y: evento.clientY, rolagem: lista.scrollLeft };
}

function moverGesto(evento) {
  if (!inicioGesto || evento.pointerId !== inicioGesto.id) return;
  const distancia = evento.clientX - inicioGesto.x;
  const vertical = Math.abs(evento.clientY - inicioGesto.y);
  if (!bloquearClique && (Math.abs(distancia) < 8 || vertical > Math.abs(distancia))) return;
  bloquearClique = true;
  lista.classList.add('arrastando');
  if (!lista.hasPointerCapture(evento.pointerId)) lista.setPointerCapture(evento.pointerId);
  evento.preventDefault();
  lista.scrollTo({ left: inicioGesto.rolagem - distancia, behavior: 'instant' });
}

function encerrarGesto() {
  const id = inicioGesto?.id;
  inicioGesto = null;
  lista.classList.remove('arrastando');
  if (id !== undefined && lista.hasPointerCapture(id)) lista.releasePointerCapture(id);
}

function concluirGesto(evento) {
  if (!inicioGesto || evento.pointerId !== inicioGesto.id) return;
  const distancia = evento.clientX - inicioGesto.x;
  const vertical = Math.abs(evento.clientY - inicioGesto.y);
  const largura = lista.querySelector('.selecionada')?.getBoundingClientRect().width || lista.clientWidth;
  const limite = Math.min(50, largura * .15);
  encerrarGesto();
  if (bloquearClique && Math.abs(distancia) >= limite && vertical < Math.abs(distancia)) {
    navegar(distancia < 0 ? 1 : -1);
  } else centralizar();
}

function cancelarGesto() {
  if (!inicioGesto) return;
  encerrarGesto();
  centralizar();
}

function recalcularLargura() {
  const largura = carrossel.getBoundingClientRect().width;
  if (largura === larguraObservada) return;
  larguraObservada = largura;
  encerrarGesto();
  centralizar('imediato');
}

function corrigirRolagemManual() {
  if (quadroCentralizacao || inicioGesto) return;
  if (Math.abs(calcularPosicaoCentral() - lista.scrollLeft) > 1) centralizar();
}

function atualizarNavegacao() {
  const destino = location.hash || '#localidades';
  document.querySelectorAll('nav a').forEach(link => {
    if (link.hash === destino) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

function conectarGestos() {
  lista.addEventListener('keydown', ativarCardTeclado);
  lista.addEventListener('focusin', selecionarCardFocado);
  lista.addEventListener('pointerdown', iniciarGesto);
  lista.addEventListener('pointermove', moverGesto);
  document.addEventListener('pointerup', concluirGesto);
  lista.addEventListener('pointercancel', cancelarGesto);
  lista.addEventListener('lostpointercapture', cancelarGesto);
  lista.addEventListener('click', ignorarCliqueAposArraste, true);
  lista.addEventListener('dragstart', evento => evento.preventDefault());
  lista.addEventListener('scrollend', corrigirRolagemManual);
  window.addEventListener('blur', cancelarGesto);
}

function conectarControles() {
  document.querySelector('.anterior').addEventListener('click', () => navegar(-1));
  document.querySelector('.proxima').addEventListener('click', () => navegar(1));
  document.getElementById('localidades').addEventListener('click', abrirLocalidade);
  carrossel.addEventListener('keydown', navegarTeclado);
  paginacao.addEventListener('keydown', navegarTeclado);
  busca.addEventListener('input', filtrar);
  document.getElementById('busca-localidades').addEventListener('submit', evento => evento.preventDefault());
  window.addEventListener('hashchange', atualizarNavegacao);
  movimentoReduzido.addEventListener('change', () => centralizar('imediato'));
}

function iniciar() {
  document.querySelectorAll('[data-selecionar], #busca').forEach(item => { item.disabled = false; });
  criarPaginacao();
  atualizarPainel(localidades.find(local => local.id === selecionada));
  atualizarSetas();
  atualizarCartoes();
  conectarControles();
  conectarGestos();
  new ResizeObserver(recalcularLargura).observe(carrossel);
  document.fonts.ready.then(() => centralizar('imediato'));
  atualizarNavegacao();
  centralizar('imediato');
}

iniciar();
