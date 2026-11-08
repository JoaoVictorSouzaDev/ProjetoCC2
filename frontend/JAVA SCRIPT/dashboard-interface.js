import { mostrarEstado } from './estados-interface.js?v=20261107c';
import { icone } from './icones.js?v=20261105u';
import { campos, numero, formatarHorario, classificar } from './leituras.js?v=20261108b';
import { desenharGrafico } from './grafico-temperatura.js?v=20261105u';
import { apresentarPrecipitacao } from './precipitacao.js?v=20261105u';
import { apresentarUmidade } from './umidade.js?v=20261105u';
import { mostrarAvisoMedicao, mostrarDicaMedicao } from './avisos-interface.js?v=20261108c';
let precipitacaoAtual = null;
export const elemento = id => document.getElementById(id);
export const escrever = (id, texto) => { elemento(id).textContent = texto; };
const unidades = { temperatura: '°C', umidade: '%', pressao: 'hPa', ar: '%', luminosidade: '%' };
function linha(valores) {
  const tr = document.createElement('tr');
  valores.forEach(valor => { const td = document.createElement('td'); td.textContent = valor; tr.append(td); });
  return tr;
}
function mostrarPrecipitacao(estado = 'success') {
  const dados = apresentarPrecipitacao(precipitacaoAtual, estado);
  escrever('metrica-precipitacao', dados.valor);
  elemento('metrica-precipitacao').toggleAttribute('data-indisponivel', !dados.unidade);
  escrever('unidade-precipitacao', dados.unidade);
  escrever('periodo-precipitacao', dados.periodo);
  escrever('horario-precipitacao', `Leitura: ${dados.horario}`);
  escrever('situacao-precipitacao', dados.situacao);
}
export function mostrarSituacao(estado) {
  mostrarPrecipitacao(estado.tipo);
  const dados = mostrarEstado(elemento('dashboard'), estado);
  const botao = elemento('recarregar');
  botao.innerHTML = `${icone('refresh')}<span></span>`;
  botao.querySelector('span').textContent = dados.acao || 'Consultando…';
  botao.disabled = estado.tipo === 'loading';
  escrever('anuncio-dashboard', estado.tipo === 'empty' ? '' : `${dados.titulo}. ${dados.texto}`);
}
export function mostrarLeitura(item) {
  precipitacaoAtual = item?.precipitacao ?? null;
  mostrarPrecipitacao();
  const umidade = apresentarUmidade(item?.umidade);
  campos.forEach(campo => {
    escrever(`metrica-${campo}`, campo === 'umidade' ? umidade.valor : numero(item?.[campo]));
    elemento(`metrica-${campo}`).toggleAttribute('data-indisponivel', !Number.isFinite(item?.[campo]));
  });
  escrever('unidade-umidade', umidade.unidade);
  mostrarDicaMedicao(elemento('metrica-temperatura'), 'temperatura', item?.temperatura);
  mostrarDicaMedicao(elemento('metrica-umidade'), 'umidade', item?.umidade);
  mostrarAvisoMedicao(elemento('metrica-umidade'), 'umidade', item?.umidade);
  mostrarAvisoMedicao(elemento('metrica-ar'), 'ar', item?.ar);
  elemento('metrica-umidade').dataset.horario = item?.horario || '';
  const nota = document.querySelector('.nota-unidade');
  if (nota) nota.dataset.leituraDisponivel = String(Number.isFinite(item?.ar));
  const ultimaLeitura = elemento('ultima-leitura');
  if (ultimaLeitura) {
    escrever('ultima-leitura', formatarHorario(item?.horario));
    ultimaLeitura.dateTime = item?.horario || '';
  }
  escrever('resumo-umidade', umidade.texto);
  escrever('resumo-texto', Number.isFinite(item?.umidade) ? classificar('umidade', item.umidade) : 'Aguardando medições para interpretação.');
}
export function mostrarHistorico(registros, contexto) {
  const serie = registros.filter(item => item.horario && Number.isFinite(item.temperatura));
  const valores = registros.map(item => item.temperatura).filter(Number.isFinite);
  const nota = document.querySelector('.nota-unidade');
  if (nota) nota.hidden = nota.dataset.leituraDisponivel !== 'true' && !registros.some(item => Number.isFinite(item.ar));
  escrever('resumo-minima', valores.length ? `${numero(valores.reduce((minimo, valor) => Math.min(minimo, valor), Infinity))} °C` : 'Indisponível');
  escrever('resumo-maxima', valores.length ? `${numero(valores.reduce((maximo, valor) => Math.max(maximo, valor), -Infinity))} °C` : 'Indisponível');
  escrever('titulo-grafico', `Temperatura — ${contexto.data}`);
  escrever('subtitulo-grafico', `${contexto.nome} · ${registros.length} leituras`);
  escrever('resumo-grafico', registros.length ? `${serie.length} amostras com temperatura e horário válidos.` : 'Histórico vazio.');
  desenharGrafico(serie, { nome: contexto.nome, periodo: '24h' });
  escrever('legenda-medicoes', `${contexto.nome} · ${contexto.data}`);
  mostrarTabela(registros, contexto.pagina);
  mostrarDisponibilidadeHistorico(serie, contexto.situacao);
}
export function mostrarTabela(registros, pagina = 1) {
  const tamanhoPagina = 10;
  const totalPaginas = Math.max(1, Math.ceil(registros.length / tamanhoPagina));
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaAtual - 1) * tamanhoPagina;
  elemento('registros-medicoes').replaceChildren(...[...registros].reverse()
    .slice(inicio, inicio + tamanhoPagina).map(item =>
    linha([formatarHorario(item.horario), ...['temperatura', 'umidade', 'pressao', 'ar'].map(campo =>
      campo === 'umidade' ? apresentarUmidade(item.umidade).texto :
        Number.isFinite(item[campo]) ? `${numero(item[campo])} ${unidades[campo]}` : 'Indisponível')])));
  const rotuloRegistros = registros.length === 1 ? 'medição' : 'medições';
  escrever('pagina-medicoes', registros.length
    ? `Exibindo ${inicio + 1}–${Math.min(inicio + tamanhoPagina, registros.length)} de ${registros.length} ${rotuloRegistros} · página ${paginaAtual} de ${totalPaginas}`
    : 'Nenhuma medição disponível.');
  elemento('medicoes-anterior').disabled = paginaAtual === 1;
  elemento('medicoes-proxima').disabled = paginaAtual === totalPaginas || registros.length === 0;
  return paginaAtual;
}

function mostrarDisponibilidadeHistorico(serie, situacao) {
  const textos = { loading: 'Consultando o histórico…', empty: 'Nenhum registro nesta data. Escolha outra data.',
    error: 'Histórico não atualizado. Use o botão de atualização para tentar novamente.',
    offline: 'Histórico indisponível enquanto o serviço não responde.',
    unconfigured: 'O histórico ficará disponível quando houver leituras desta localidade.' };
  elemento('grafico').toggleAttribute('hidden', !serie.length);
  elemento('leitura-grafico').hidden = !serie.length;
  elemento('resumo-grafico').textContent = serie.length ? `${serie.length} amostras válidas.`
    : textos[situacao] || 'Não há amostras com temperatura e horário válidos para desenhar o gráfico.';
}
