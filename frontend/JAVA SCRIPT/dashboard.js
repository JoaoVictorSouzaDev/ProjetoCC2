import { catalogoEstacoes as localidades, moverSelecao } from './estacoes.js?v=20261107c';
import { consultarEstacao } from './consulta-estacao.js?v=20261105u';
import { estadoDaFalha, estados } from './estados.js?v=20261105v';
import { INTERVALO_ATUALIZACAO_MS } from './configuracao-api.js';
import { politicaInicialDeLeitura } from './leitura-compartilhada.js?v=20261105u';
import { elemento, escrever, mostrarSituacao, mostrarLeitura, mostrarHistorico, mostrarTabela } from './dashboard-interface.js?v=20261107c';

let local, consulta, timer;
let registros = [];
let paginaMedicoes = 1;
const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
function contexto() {
  return { nome: local?.nome || 'Localidade', data: elemento('data-historico').value, pagina: paginaMedicoes };
}
function limparDados() {
  registros = [];
  paginaMedicoes = 1;
  mostrarLeitura(null);
  mostrarHistorico([], { ...contexto(), situacao: 'loading' });
}
function carregarEndereco() {
  const params = new URLSearchParams(location.search);
  local = localidades.find(item => item.id === (params.get('local') || 'sorocaba'));
  elemento('data-historico').value = params.get('data') || hoje();
  if (!elemento('data-historico').value) elemento('data-historico').value = hoje();
  atualizarSelecao();
}
function atualizarEndereco() {
  const url = new URL(location.href);
  url.searchParams.set('local', local.id);
  url.searchParams.set('data', elemento('data-historico').value);
  url.searchParams.delete('periodo');
  history.pushState(null, '', url);
}
function atualizarSelecao() {
  document.querySelectorAll('[role="tab"]').forEach(aba => {
    const ativa = aba.dataset.local === local?.id;
    aba.setAttribute('aria-selected', String(ativa));
    aba.tabIndex = ativa || (!local && aba.dataset.local === localidades[0].id) ? 0 : -1;
  });
  escrever('nome-local', local ? `${local.nome} — ${local.uf}` : 'Localidade não encontrada');
  document.title = `${local?.nome || 'Localidade'} — AERIS`;
  elemento('dashboard').setAttribute('aria-labelledby', local ? `aba-${local.id}` : 'titulo-dashboard');
  requestAnimationFrame(revelarAbaAtiva);
}
function revelarAbaAtiva() {
  const abas = document.querySelector('.abas-locais');
  const ativa = abas.querySelector('[aria-selected="true"]');
  if (!ativa) return;
  const area = abas.getBoundingClientRect();
  const aba = ativa.getBoundingClientRect();
  abas.scrollTo({ left: abas.scrollLeft + aba.left + aba.width / 2 - area.left - area.width / 2,
    behavior: 'instant' });
}
function cancelarConsulta() {
  clearTimeout(timer); consulta?.abort(); consulta = null;
  elemento('recarregar').disabled = false;
  elemento('dashboard').setAttribute('aria-busy', 'false');
}
function finalizarConsulta(controle) {
  if (consulta !== controle) return;
  consulta = null;
  elemento('dashboard').setAttribute('aria-busy', 'false');
  timer = setTimeout(() => atualizarDados('atualizar'), INTERVALO_ATUALIZACAO_MS);
}
function aplicarResultados(resultado) {
  registros = resultado.historico;
  mostrarLeitura(resultado.leitura);
  const situacao = resultado.falhaHistorico || (registros.length ? 'success' : 'empty');
  mostrarHistorico(registros, { ...contexto(), situacao });
  const estado = { ...resultado.estado };
  if (resultado.falhaHistorico && ['success', 'stale'].includes(estado.tipo)) {
    estado.tipo = resultado.falhaHistorico === 'offline' ? 'offline' : 'error';
    estado.texto = `${estado.texto || estados[estado.tipo].texto} O histórico não pôde ser atualizado.`;
  }
  mostrarSituacao(estado);
}
function prepararConsulta() {
  limparDados();
  if (!local || !local.apiId) {
    mostrarHistorico([], { ...contexto(), situacao: 'unconfigured' });
    mostrarSituacao(local ? { tipo: 'empty' } : { tipo: 'error',
      titulo: 'Localidade não encontrada', texto: 'Selecione uma das cidades disponíveis para continuar.' });
    elemento('recarregar').disabled = true;
    return null;
  }
  const controle = new AbortController(); consulta = controle;
  elemento('dashboard').setAttribute('aria-busy', 'true');
  mostrarSituacao({ tipo: 'loading' });
  return controle;
}
async function atualizarDados(politica = 'reutilizar') {
  if (consulta) return;
  clearTimeout(timer);
  const controle = prepararConsulta();
  if (!controle) return;
  try {
    const resultado = await consultarEstacao(local, { data: elemento('data-historico').value, signal: controle.signal, politica });
    if (consulta === controle) aplicarResultados(resultado);
  } catch (erro) {
    if (consulta !== controle) return;
    mostrarSituacao(estadoDaFalha(erro));
    mostrarHistorico([], { ...contexto(), situacao: 'error' });
  } finally { finalizarConsulta(controle); }
}
function selecionarLocal(id) {
  cancelarConsulta(); local = localidades.find(item => item.id === id);
  atualizarSelecao(); atualizarEndereco(); atualizarDados();
  revelarAbaAtiva();
}
function navegar(deslocamento) { selecionarLocal(moverSelecao(localidades, local?.id, deslocamento)); }
function teclado(evento) {
  const destinos = { ArrowRight: 1, ArrowLeft: -1 };
  if (evento.key in destinos) navegar(destinos[evento.key]);
  else if (evento.key === 'Home') selecionarLocal(localidades[0].id);
  else if (evento.key === 'End') selecionarLocal(localidades.at(-1).id);
  else return;
  evento.preventDefault(); elemento(`aba-${local.id}`).focus();
}
function alterarData() {
  if (!elemento('data-historico').reportValidity()) return;
  cancelarConsulta();
  if (local) atualizarEndereco();
  atualizarDados();
}
function paginarTabela(deslocamento) {
  paginaMedicoes = mostrarTabela(registros, paginaMedicoes + deslocamento);
}
function criarAbas() {
  document.querySelector('.abas-locais').replaceChildren(...localidades.map(item => {
    const aba = document.createElement('button');
    aba.type = 'button'; aba.id = `aba-${item.id}`; aba.dataset.local = item.id;
    aba.setAttribute('role', 'tab'); aba.setAttribute('aria-controls', 'dashboard');
    aba.textContent = item.nome;
    return aba;
  }));
}
function conectarControles() {
  document.querySelectorAll('[role="tab"]').forEach(aba => aba.addEventListener('click', () => selecionarLocal(aba.dataset.local)));
  document.querySelector('.abas-locais').addEventListener('keydown', teclado);
  elemento('local-anterior').addEventListener('click', () => navegar(-1));
  elemento('local-proximo').addEventListener('click', () => navegar(1));
  elemento('data-historico').addEventListener('change', alterarData);
  elemento('recarregar').addEventListener('click', () => atualizarDados('atualizar'));
  elemento('medicoes-anterior').addEventListener('click', () => paginarTabela(-1));
  elemento('medicoes-proxima').addEventListener('click', () => paginarTabela(1));
  document.querySelectorAll('button[disabled]').forEach(botao => { botao.disabled = false; });
}
window.addEventListener('popstate', () => { cancelarConsulta(); carregarEndereco(); atualizarDados(); });
window.addEventListener('pagehide', cancelarConsulta);
window.addEventListener('pageshow', evento => { if (evento.persisted) atualizarDados(); });
criarAbas(); carregarEndereco(); conectarControles(); atualizarDados(politicaInicialDeLeitura());
new ResizeObserver(revelarAbaAtiva).observe(document.querySelector('.abas-locais'));
