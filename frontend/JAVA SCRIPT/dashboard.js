import { dashboards, obterDashboard, obterSerie, resumirSerie, formatarData, periodos } from './dados-dashboards.js';
import { moverSelecao, unidades } from './dados-demonstrativos.js';
import { desenharGrafico } from './grafico-temperatura.js';

let local = obterDashboard('sorocaba');
let periodo = '24h';
let registrosExpandidos = false;
const numero = valor => valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const elemento = id => document.getElementById(id);
const escrever = (id, texto) => { elemento(id).textContent = texto; };

function carregarEndereco() {
  const parametros = new URLSearchParams(location.search);
  const solicitado = parametros.get('local') || 'sorocaba';
  local = obterDashboard(solicitado) || obterDashboard('sorocaba');
  const escolhido = parametros.get('periodo') || '24h';
  periodo = Object.hasOwn(periodos, escolhido) ? escolhido : '24h';
  const invalido = local.id !== solicitado || periodo !== escolhido;
  elemento('erro-dashboard').hidden = !invalido;
  escrever('erro-dashboard', 'Localidade ou período não encontrado. Exibindo uma seleção demonstrativa disponível.');
}

function atualizarEndereco() {
  const endereco = new URL(location.href);
  endereco.searchParams.set('local', local.id);
  endereco.searchParams.set('periodo', periodo);
  history.pushState(null, '', endereco);
}

function atualizarAbas() {
  document.querySelectorAll('[data-local]').forEach(aba => {
    const ativa = aba.dataset.local === local.id;
    aba.setAttribute('aria-selected', String(ativa));
    aba.tabIndex = ativa ? 0 : -1;
  });
  elemento('dashboard').setAttribute('aria-labelledby', `aba-${local.id}`);
  elemento('dashboard').dataset.local = local.id;
  document.querySelectorAll('[data-periodo]').forEach(botao => {
    botao.setAttribute('aria-pressed', String(botao.dataset.periodo === periodo));
  });
}

function atualizarCabecalho() {
  escrever('nome-local', `${local.nome} — ${local.uf}`);
  escrever('condicao-local', ` · ${local.condicao}`);
  escrever('estado-local', local.estado);
  elemento('estado-local').dataset.tom = local.tom;
  escrever('ultima-leitura', `${formatarData(local.leitura)} (UTC−03)`);
  elemento('ultima-leitura').dateTime = local.leitura;
  document.title = `${local.nome} — Dashboard | Estação Ambiental IoT`;
}

function atualizarMetricas() {
  const variacao = resumirSerie(local.series['24h']).variacao;
  Object.keys(unidades).forEach(campo => escrever(`metrica-${campo}`, numero(local[campo])));
  escrever('contexto-temperatura', `${variacao >= 0 ? '+' : ''}${numero(variacao)} °C em 24h · exemplo`);
  escrever('contexto-umidade', 'Umidade relativa · exemplo');
  escrever('contexto-pressao', 'Pressão local · exemplo');
  escrever('contexto-ar', 'Partículas finas · sem classificação de risco');
  escrever('contexto-luminosidade', 'Iluminância da última amostra');
  escrever('contexto-ruido', 'Nível sonoro com ponderação A');
}

function atualizarEstacao() {
  const campos = { local: `${local.nome} — ${local.uf}`, estado: local.estado,
    horario: `${formatarData(local.leitura)} (UTC−03)`, intervalo: local.intervalo,
    sensores: String(local.sensores), dispositivo: local.dispositivo };
  Object.entries(campos).forEach(([campo, valor]) => escrever(`estacao-${campo}`, valor));
  escrever('resumo-condicao', `${local.condicao} · ${local.nome}`);
  escrever('resumo-texto', local.resumo);
  escrever('resumo-umidade', `${numero(local.umidade)} %`);
  escrever('resumo-ruido', `${numero(local.ruido)} dB(A)`);
}

function criarLinha(valores) {
  const linha = document.createElement('tr');
  valores.forEach(valor => {
    const celula = document.createElement('td');
    celula.textContent = valor;
    linha.append(celula);
  });
  return linha;
}

function atualizarTabelaSerie(serie) {
  const linhas = serie.map(ponto => criarLinha([formatarData(ponto.horario), `${numero(ponto.temperatura)} °C`]));
  elemento('tabela-serie').replaceChildren(...linhas);
  escrever('legenda-serie', `${local.nome} · ${periodos[periodo]} · dados demonstrativos (UTC−03)`);
}

function atualizarHistorico() {
  const serie = obterSerie(local, periodo);
  const resumo = resumirSerie(serie);
  escrever('titulo-grafico', `Temperatura — ${periodos[periodo]}`);
  escrever('subtitulo-grafico', `${local.nome} · ${serie.length} amostras demonstrativas`);
  escrever('resumo-grafico', `${serie.length} amostras · mínimo ${numero(resumo.minima)} °C · ` +
    `máximo ${numero(resumo.maxima)} °C. Horários em UTC−03.`);
  escrever('resumo-minima', `${numero(resumo.minima)} °C`);
  escrever('resumo-maxima', `${numero(resumo.maxima)} °C`);
  desenharGrafico(serie, { nome: local.nome, periodo });
  atualizarTabelaSerie(serie);
}

function atualizarMedicoes() {
  const registros = [...local.registros].reverse().slice(0, registrosExpandidos ? local.registros.length : 3);
  const linhas = registros.map(item => criarLinha([formatarData(item.horario),
    `${numero(item.temperatura)} °C`, `${numero(item.umidade)} %`, `${numero(item.pressao)} hPa`,
    `${numero(item.ar)} µg/m³`]));
  elemento('registros-medicoes').replaceChildren(...linhas);
  escrever('legenda-medicoes', `${local.nome} · medições fictícias · UTC−03`);
  escrever('expandir-medicoes', registrosExpandidos ? 'Mostrar apenas as últimas 3 amostras ↑' : 'Ver todas as amostras →');
  elemento('expandir-medicoes').setAttribute('aria-expanded', String(registrosExpandidos));
}

function renderizar() {
  atualizarAbas();
  atualizarCabecalho();
  atualizarMetricas();
  atualizarEstacao();
  atualizarHistorico();
  atualizarMedicoes();
  escrever('anuncio-dashboard', `Dashboard de ${local.nome} atualizado. ${periodos[periodo]}. Dados demonstrativos.`);
}

function selecionarLocal(id) {
  const escolhido = obterDashboard(id);
  if (!escolhido) return;
  local = escolhido;
  elemento('erro-dashboard').hidden = true;
  renderizar();
  atualizarEndereco();
  elemento(`aba-${local.id}`).scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}

function navegarLocal(deslocamento) {
  selecionarLocal(moverSelecao(dashboards, local.id, deslocamento));
}

function tecladoLocal(evento) {
  if (evento.key === 'ArrowRight') navegarLocal(1);
  else if (evento.key === 'ArrowLeft') navegarLocal(-1);
  else if (evento.key === 'Home') selecionarLocal(dashboards[0].id);
  else if (evento.key === 'End') selecionarLocal(dashboards.at(-1).id);
  else return;
  evento.preventDefault();
  elemento(`aba-${local.id}`).focus({ preventScroll: true });
}

function selecionarPeriodo(evento) {
  const botao = evento.target.closest('[data-periodo]');
  if (!botao) return;
  periodo = botao.dataset.periodo;
  atualizarAbas();
  atualizarHistorico();
  atualizarEndereco();
  escrever('anuncio-dashboard', `${local.nome}: histórico dos ${periodos[periodo]}, demonstrativo.`);
}

function recarregarExemplo() {
  renderizar();
  escrever('anuncio-dashboard', `Exemplo de ${local.nome} recarregado. Nenhum sensor foi consultado; horários preservados.`);
  escrever('subtitulo-grafico', `${local.nome} · exemplo recarregado, sem novas leituras`);
}

function conectarControles() {
  document.querySelectorAll('[data-local]').forEach(aba => {
    aba.addEventListener('click', () => selecionarLocal(aba.dataset.local));
  });
  document.querySelector('.abas-locais').addEventListener('keydown', tecladoLocal);
  elemento('local-anterior').addEventListener('click', () => navegarLocal(-1));
  elemento('local-proximo').addEventListener('click', () => navegarLocal(1));
  document.querySelector('.periodos').addEventListener('click', selecionarPeriodo);
  elemento('recarregar').addEventListener('click', recarregarExemplo);
  elemento('expandir-medicoes').addEventListener('click', () => {
    registrosExpandidos = !registrosExpandidos;
    atualizarMedicoes();
  });
  window.addEventListener('popstate', () => { carregarEndereco(); renderizar(); });
  document.querySelectorAll('button[disabled]').forEach(botao => { botao.disabled = false; });
}

carregarEndereco();
renderizar();
conectarControles();
