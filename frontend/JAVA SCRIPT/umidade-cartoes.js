import { catalogoEstacoes } from './estacoes.js?v=20261107c';
import { obterLeituraCompartilhada, politicaInicialDeLeitura } from './leitura-compartilhada.js?v=20261105u';
import { normalizarLeitura, formatarHorario, numero } from './leituras.js?v=20261105u';
import { apresentarUmidade } from './umidade.js?v=20261105u';
import { estadoDaLeitura, estadoDaFalha } from './estados.js?v=20261105u';
import { INTERVALO_ATUALIZACAO_MS } from './configuracao-api.js';
let timer, atualizando;
function mostrar(estacao, resultado) {
  const leitura = resultado.leitura;
  const valor = seletor => document.querySelector(`[data-${seletor}="${estacao.id}"]`);
  const origem = tipo => document.getElementById(`origem-${tipo}-${estacao.id}`);
  const textos = { success: 'API', stale: 'API · desatualizado', empty: 'Sem leitura',
    error: 'Falha na consulta', offline: 'Serviço inacessível' };
  const situacao = textos[resultado.estado.tipo];
  const horario = formatarHorario(leitura?.horario);
  const temperatura = valor('temperatura');
  temperatura.textContent = Number.isFinite(leitura?.temperatura) ? `${numero(leitura.temperatura)} °C` : 'Indisponível';
  valor('origem-temperatura').textContent = situacao;
  const umidade = valor('umidade');
  umidade.textContent = apresentarUmidade(leitura?.umidade).texto;
  origem('umidade').textContent = situacao;
  const qualidadeAr = valor('qualidade-ar');
  qualidadeAr.textContent = Number.isFinite(leitura?.ar) ? `${numero(leitura.ar)} %` : 'Indisponível';
  origem('ar').textContent = situacao;
  const pressao = valor('pressao');
  pressao.textContent = numero(leitura?.pressao);
  origem('pressao').textContent = situacao;
  const luminosidade = valor('luminosidade');
  luminosidade.textContent = Number.isFinite(leitura?.luminosidade) ? `${numero(leitura.luminosidade)} %` : 'Indisponível';
  origem('luminosidade').textContent = situacao;
  [temperatura, umidade, qualidadeAr, pressao, luminosidade].forEach(item => {
    item.dataset.horario = leitura?.horario || '';
    item.title = `${situacao} · Leitura: ${horario}`;
  });
}
async function consultar(estacao, politica) {
  try {
    const dados = await obterLeituraCompartilhada(estacao, { politica });
    const leitura = dados === null ? null : normalizarLeitura(dados);
    mostrar(estacao, { leitura, estado: estadoDaLeitura(leitura) });
  } catch (erro) { mostrar(estacao, { leitura: null, estado: estadoDaFalha(erro) }); }
}
function atualizar(politica = 'reutilizar') {
  if (atualizando) return atualizando;
  clearTimeout(timer);
  atualizando = Promise.all(catalogoEstacoes.map(estacao => consultar(estacao, politica)))
    .finally(() => { atualizando = null; timer = setTimeout(() => atualizar('atualizar'), INTERVALO_ATUALIZACAO_MS); });
  return atualizando;
}
export function iniciarUmidadeCartoes() {
  atualizar(politicaInicialDeLeitura());
  window.addEventListener('pageshow', evento => { if (evento.persisted) atualizar(); });
  window.addEventListener('pagehide', () => clearTimeout(timer));
}
