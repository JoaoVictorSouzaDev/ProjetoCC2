import { obterLeituraCompartilhada } from './leitura-compartilhada.js?v=20261105u';
import { normalizarLeitura, numero } from './leituras.js?v=20261105u';
import { apresentarUmidade } from './umidade.js?v=20261105u';
import { estadoDaLeitura, estadoDaFalha } from './estados.js?v=20261105u';
import { mostrarAvisoMedicao } from './avisos-interface.js?v=20261108d';
import { INTERVALO_ATUALIZACAO_MS } from './configuracao-api.js';

let timer;
let controle;
let ativo = true;
let eventosConectados = false;

function criarIcone(nome, classe = 'icone') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  svg.setAttribute('class', classe);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('viewBox', '0 0 24 24');
  use.setAttribute('href', `../ASSETS/icones-dashboard.svg#${nome}`);
  svg.append(use);
  return svg;
}

function adicionarMedicao(lista, nome, icone, seletor) {
  const campo = document.createElement('div');
  const rotulo = document.createElement('dt');
  const valor = document.createElement('dd');
  const aviso = document.createElement('dd');
  campo.dataset.medicao = seletor;
  rotulo.append(criarIcone(icone), document.createTextNode(nome));
  valor.dataset.valor = seletor;
  valor.textContent = 'Indisponível';
  aviso.className = 'aviso-medicao';
  aviso.hidden = true;
  campo.append(rotulo, valor, aviso);
  lista.append(campo);
}

function mostrarLeitura(item, estacao, resultado) {
  const clima = item.querySelector('.clima');
  const valor = seletor => item.querySelector(`[data-valor="${seletor}"]`);
  const situacao = item.querySelector('[data-situacao]');
  const leitura = resultado.leitura;
  const temperatura = Number.isFinite(leitura?.temperatura)
    ? `${numero(leitura.temperatura)} °C` : 'Indisponível';
  const umidade = apresentarUmidade(leitura?.umidade).texto;
  const valores = {
    umidade,
    pressao: Number.isFinite(leitura?.pressao) ? `${numero(leitura.pressao)} hPa` : 'Indisponível',
    ar: Number.isFinite(leitura?.ar) ? `${numero(leitura.ar)} %` : 'Indisponível',
    luminosidade: Number.isFinite(leitura?.luminosidade) ? `${numero(leitura.luminosidade)} %` : 'Indisponível',
  };
  Object.entries(valores).forEach(([campo, texto]) => { valor(campo).textContent = texto; });
  valor('temperatura-principal').textContent = temperatura;
  mostrarAvisoMedicao(valor('umidade'), 'umidade', leitura?.umidade);
  mostrarAvisoMedicao(valor('ar'), 'ar', leitura?.ar);
  const textos = {
    success: 'Leitura recente',
    stale: 'Leitura desatualizada',
    empty: 'Sem leitura disponível',
    error: 'Falha ao consultar',
    offline: 'Serviço inacessível',
  };
  situacao.textContent = textos[resultado.estado.tipo] || 'Leitura indisponível';
  situacao.dataset.estado = resultado.estado.tipo;
  situacao.hidden = false;
  item.querySelectorAll('[data-valor]').forEach(elemento => {
    elemento.title = situacao.textContent;
  });
  clima.setAttribute('aria-label', `${estacao.nome}: ${temperatura}, ${situacao.textContent}`);
}

function criarCartao(estacao) {
  const item = document.createElement('li');
  const artigo = document.createElement('article');
  const clima = document.createElement('div');
  const imagem = document.createElement('img');
  const condicoes = document.createElement('div');
  const temperaturaIcone = criarIcone('temperature', 'icone icone-clima');
  const temperatura = document.createElement('p');
  const situacao = document.createElement('p');
  const identificacao = document.createElement('div');
  const titulo = document.createElement('h3');
  const detalhes = document.createElement('div');
  const resumo = document.createElement('dl');
  const link = document.createElement('a');

  item.className = 'localidade';
  item.dataset.localidade = estacao.id;
  item.dataset.dashboardUrl = `dashboard.html?estacao=${encodeURIComponent(estacao.id)}`;
  artigo.append(clima, detalhes);
  clima.className = 'clima';
  imagem.className = 'foto-localidade';
  imagem.src = estacao.imagem;
  imagem.alt = `Paisagem da estação ${estacao.nome}`;
  imagem.width = 720;
  imagem.height = 960;
  imagem.loading = 'lazy';
  imagem.decoding = 'async';
  imagem.draggable = false;
  condicoes.className = 'condicoes-cartao';
  temperatura.className = 'temperatura-cartao';
  temperatura.dataset.valor = 'temperatura-principal';
  temperatura.textContent = '—';
  situacao.dataset.situacao = '';
  situacao.setAttribute('aria-live', 'polite');
  situacao.hidden = true;
  condicoes.append(temperaturaIcone, temperatura, situacao);
  identificacao.className = 'identificacao-localidade';
  titulo.textContent = estacao.nome;
  identificacao.append(titulo);
  clima.append(imagem, condicoes, identificacao);
  detalhes.className = 'detalhes-localidade';
  resumo.className = 'resumo-localidade';
  adicionarMedicao(resumo, 'Umidade', 'humidity', 'umidade');
  adicionarMedicao(resumo, 'Pressão atmosférica', 'pressure', 'pressao');
  adicionarMedicao(resumo, 'Qualidade do ar', 'air', 'ar');
  adicionarMedicao(resumo, 'Luminosidade', 'light', 'luminosidade');
  detalhes.append(resumo);
  link.className = 'selecionar';
  link.href = item.dataset.dashboardUrl;
  link.setAttribute('aria-label', `Ver dashboard da estação ${estacao.nome}`);
  link.append(document.createTextNode('Ver clima completo'));
  const nomeAcessivel = document.createElement('span');
  nomeAcessivel.className = 'sr-only';
  nomeAcessivel.textContent = ` de ${estacao.nome}`;
  link.append(nomeAcessivel);
  detalhes.append(link);
  item.append(artigo);
  return item;
}

export function criarCartoes(estacoes) {
  const lista = document.getElementById('lista-localidades');
  lista.replaceChildren(...estacoes.map(criarCartao));
}

async function consultarCartao(estacao, signal) {
  const item = [...document.querySelectorAll('[data-localidade]')]
    .find(cartao => cartao.dataset.localidade === estacao.id);
  if (!item) return;
  try {
    const dados = await obterLeituraCompartilhada(estacao, { signal });
    signal.throwIfAborted();
    const leitura = dados === null ? null : normalizarLeitura(dados);
    mostrarLeitura(item, estacao, {
      leitura,
      estado: estadoDaLeitura(leitura),
    });
  } catch (erro) {
    if (erro.name === 'AbortError') return;
    mostrarLeitura(item, estacao, { leitura: null, estado: estadoDaFalha(erro) });
  }
}

async function atualizarLeituras(estacoes) {
  controle?.abort();
  controle = new AbortController();
  await Promise.all(estacoes.map(estacao => consultarCartao(estacao, controle.signal)));
}

export function iniciarLeiturasCartoes(estacoes) {
  ativo = true;
  clearTimeout(timer);
  atualizarLeituras(estacoes).finally(() => {
    if (ativo) timer = setTimeout(() => iniciarLeiturasCartoes(estacoes), INTERVALO_ATUALIZACAO_MS);
  });
  if (eventosConectados) return;
  eventosConectados = true;
  window.addEventListener('pagehide', () => {
    ativo = false;
    clearTimeout(timer);
    controle?.abort();
  });
  window.addEventListener('pageshow', evento => {
    if (evento.persisted) iniciarLeiturasCartoes(estacoes);
  });
}

export function mostrarEstadoCartoes(mensagem, tipo = 'status') {
  const item = document.createElement('li');
  item.className = 'estado-carrossel';
  item.setAttribute('role', tipo);
  item.textContent = mensagem;
  document.getElementById('lista-localidades').replaceChildren(item);
}
