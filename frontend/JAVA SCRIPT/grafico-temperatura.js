import { formatarData } from './dados-dashboards.js';

const namespace = 'http://www.w3.org/2000/svg';
const numero = valor => valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function elementoSvg(nome, atributos = {}) {
  const elemento = document.createElementNS(namespace, nome);
  Object.entries(atributos).forEach(([chave, valor]) => elemento.setAttribute(chave, valor));
  return elemento;
}

function textoSvg(texto, atributos) {
  const elemento = elementoSvg('text', atributos);
  elemento.textContent = texto;
  return elemento;
}

function calcularEscala(serie, largura) {
  const valores = serie.map(ponto => ponto.temperatura);
  const minimo = Math.floor(valores.reduce((minimo, valor) => Math.min(minimo, valor), Infinity)) - 2;
  const maximo = Math.ceil(valores.reduce((maximo, valor) => Math.max(maximo, valor), -Infinity)) + 2;
  const inicio = Date.parse(serie[0].horario);
  const duracao = Date.parse(serie.at(-1).horario) - inicio;
  return { minimo, maximo, largura,
    x: horario => 40 + ((Date.parse(horario) - inicio) / (duracao || 1)) * (largura - 68),
    y: valor => 232 - (valor - minimo) / (maximo - minimo) * 204,
  };
}

function desenharGrade(svg, escala) {
  for (let linha = 0; linha < 5; linha++) {
    const valor = escala.minimo + (escala.maximo - escala.minimo) * linha / 4;
    const y = escala.y(valor);
    svg.append(elementoSvg('line', { x1: 40, x2: escala.largura - 28, y1: y, y2: y, class: 'linha-grade' }));
    svg.append(textoSvg(numero(valor), { x: 32, y: y + 4, 'text-anchor': 'end' }));
  }
  svg.append(textoSvg('°C', { x: 12, y: 16 }));
}

function rotuloEixo(ponto, periodo) {
  if (periodo === '24h') return formatarData(ponto.horario, 'hora');
  return formatarData(ponto.horario).slice(0, 5);
}

function desenharEixo(svg, contexto) {
  const { serie, escala, periodo } = contexto;
  const indices = [...new Set([0, Math.floor((serie.length - 1) / 2), serie.length - 1])];
  indices.forEach(indice => {
    const ponto = serie[indice];
    svg.append(textoSvg(rotuloEixo(ponto, periodo), {
      x: escala.x(ponto.horario), y: 260, 'text-anchor': 'middle',
    }));
  });
}

function exibirAmostra(ponto) {
  document.getElementById('leitura-grafico').textContent =
    `${formatarData(ponto.horario)} (UTC−03) · ${numero(ponto.temperatura)} °C`;
}

function navegarPontos(evento) {
  const pontos = [...evento.currentTarget.querySelectorAll('.ponto')];
  const atual = pontos.indexOf(evento.target);
  const direcao = { ArrowLeft: -1, ArrowRight: 1 }[evento.key];
  if (atual < 0 || (direcao === undefined && !['Home', 'End'].includes(evento.key))) return;
  evento.preventDefault();
  let proximo = Math.min(pontos.length - 1, Math.max(0, atual + (direcao || 0)));
  if (evento.key === 'Home') proximo = 0;
  if (evento.key === 'End') proximo = pontos.length - 1;
  pontos.forEach(ponto => ponto.setAttribute('tabindex', '-1'));
  pontos[proximo].setAttribute('tabindex', '0');
  pontos[proximo].focus();
}

function criarPonto(ponto, posicao) {
  const circulo = elementoSvg('circle', { cx: posicao.x, cy: posicao.y, r: 4,
    class: 'ponto', tabindex: posicao.indice === 0 ? 0 : -1, role: 'button',
    'aria-label': `${formatarData(ponto.horario)}: ${numero(ponto.temperatura)} graus Celsius`,
  });
  circulo.addEventListener('focus', () => exibirAmostra(ponto));
  circulo.addEventListener('pointerenter', () => exibirAmostra(ponto));
  circulo.addEventListener('click', () => exibirAmostra(ponto));
  circulo.addEventListener('keydown', evento => {
    if (['Enter', ' '].includes(evento.key)) { evento.preventDefault(); exibirAmostra(ponto); }
  });
  return circulo;
}

function desenharLinha(svg, contexto) {
  const { serie, escala } = contexto;
  const pontos = serie.map(ponto => `${escala.x(ponto.horario)},${escala.y(ponto.temperatura)}`).join(' ');
  svg.append(elementoSvg('polyline', { points: pontos, class: 'linha-serie' }));
  serie.forEach((ponto, indice) => svg.append(criarPonto(ponto, {
    x: escala.x(ponto.horario), y: escala.y(ponto.temperatura), indice,
  })));
}

export function desenharGrafico(serie, contexto) {
  const svg = document.getElementById('grafico');
  ultimaSerie = serie; ultimoContexto = contexto;
  observarGrafico(svg);
  const foco = [...svg.querySelectorAll('.ponto')].indexOf(document.activeElement);
  svg.replaceChildren();
  svg.setAttribute('aria-label', `Temperatura de ${contexto.nome}, data selecionada.`);
  if (!serie.length) {
    document.getElementById('leitura-grafico').textContent = 'Nenhuma amostra disponível neste período.';
    return;
  }
  const largura = Math.max(220, Math.round(svg.parentElement.clientWidth - 40));
  svg.setAttribute('viewBox', `0 0 ${largura} 280`);
  const escala = calcularEscala(serie, largura);
  desenharGrade(svg, escala);
  desenharEixo(svg, { serie, escala, periodo: contexto.periodo });
  desenharLinha(svg, { serie, escala });
  svg.onkeydown = navegarPontos;
  exibirAmostra(serie.at(-1));
  if (foco >= 0) {
    const pontos = [...svg.querySelectorAll('.ponto')];
    pontos.forEach(ponto => ponto.setAttribute('tabindex', '-1'));
    const destino = pontos[Math.min(foco, pontos.length - 1)];
    destino.setAttribute('tabindex', '0');
    destino.focus({ preventScroll: true });
  }
}

let ultimaSerie = [], ultimoContexto, observador, larguraAnterior;
function observarGrafico(svg) {
  if (observador) return;
  observador = new ResizeObserver(([entrada]) => {
    const largura = entrada.contentRect.width;
    if (largura === larguraAnterior) return;
    larguraAnterior = largura;
    if (ultimoContexto) desenharGrafico(ultimaSerie, ultimoContexto);
  });
  observador.observe(svg.parentElement);
}
