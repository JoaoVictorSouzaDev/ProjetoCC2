import { localidades } from './dados-demonstrativos.js';

// Fixtures acadêmicas, sem conexão com sensores. Todos os horários e valores são fictícios.
const cenarios = {
  'sao-paulo': {
    estado: 'Coleta simulada', tom: 'normal', leitura: '2026-09-25T18:32:00-03:00',
    dispositivo: 'ESP32 · SP-01', intervalo: '5 minutos', sensores: 6,
    resumo: 'Cenário urbano com maior concentração de partículas e ruído entre os exemplos.',
    registros: [[18,76,1017,11,90,41],[17,78,1016,10,65,38],[18,74,1015,12,140,43],
      [20,70,1014,13,270,48],[22,65,1013,15,620,54],[24,60,1012,18,780,61],
      [25,58,1011,20,700,63],[24,61,1012,18,510,59],[23,64,1013,16,380,56]],
    semana: [20.5,21.4,19.8,22.1,24.3,23.5,23],
    mes: [18,19,18.5,20,21,22,20.5,19,18,20,21,22,23,21,20,19,21,22,24,25,23,22,21,20.5,21.4,19.8,22.1,24.3,23.5,23],
  },
  campinas: {
    estado: 'Coleta simulada', tom: 'normal', leitura: '2026-09-25T18:27:00-03:00',
    dispositivo: 'ESP32 · CP-02', intervalo: '10 minutos', sensores: 6,
    resumo: 'Exemplo de tarde amena, com luminosidade intermediária e umidade de 59%.',
    registros: [[19,72,1015,9,70,33],[18,74,1014,8,45,30],[19,70,1014,10,160,35],
      [21,66,1013,11,340,40],[24,61,1012,12,730,44],[26,55,1010,15,980,49],
      [28,51,1009,17,820,53],[26,56,1010,15,650,48],[25,59,1011,14,510,46]],
    semana: [22.2,23.4,24.1,21.8,26.5,27.2,25],
    mes: [21,20,22,23,21,22,24,25,23,22,24,25,26,24,23,22,24,25,27,28,26,25,23,22.2,23.4,24.1,21.8,26.5,27.2,25],
  },
  sorocaba: {
    estado: 'Coleta simulada', tom: 'normal', leitura: '2026-09-25T18:30:00-03:00',
    dispositivo: 'ESP32 · SO-03', intervalo: '5 minutos', sensores: 6,
    resumo: 'Cenário ensolarado. A temperatura varia de 20 °C a 28 °C nas amostras das últimas 24 horas.',
    registros: [[20,69,1017,7,80,34],[21,66,1016,8,60,32],[20.5,68,1015,8,150,36],
      [23,61,1014,9,350,40],[24,59,1013,10,690,45],[27,51,1011,13,910,50],
      [26,53,1010,14,760,52],[28,49,1011,13,580,49],[26,54,1012,12,420,48]],
    semana: [23,24.5,22.7,25.2,27.1,28,26],
    mes: [20,21,20.8,22,23,22,21,24,25,23,22,24,25,26,24,23,25,26,28,29,27,26,24,23,24.5,22.7,25.2,27.1,28,26],
  },
  santos: {
    estado: 'Transmissão pausada (exemplo)', tom: 'atencao', leitura: '2026-09-25T17:45:00-03:00',
    dispositivo: 'Arduino · ST-04', intervalo: '15 minutos', sensores: 6,
    resumo: 'Cenário de chuva leve. A transmissão está pausada na simulação; o painel preserva a última amostra.',
    registros: [[22,82,1011,7,50,45],[21,85,1010,6,30,43],[22,83,1010,7,90,44],
      [23,80,1009,8,210,47],[25,75,1007,11,480,53],[26,72,1006,12,570,56],
      [25,76,1007,11,360,54],[23,81,1008,9,140,50],[24,78,1008,10,180,52]],
    semana: [25.1,26.3,24.8,23.2,22.4,23.7,24],
    mes: [24,25,24.5,26,27,25,24,23,25,26,27,26,25,24,23,24,25,27,28,26,25,24,26,25.1,26.3,24.8,23.2,22.4,23.7,24],
  },
  curitiba: {
    estado: 'Manutenção programada (exemplo)', tom: 'atencao', leitura: '2026-09-25T16:10:00-03:00',
    dispositivo: 'ESP32 · CT-05', intervalo: '10 minutos', sensores: 6,
    resumo: 'Cenário nublado e mais frio. As amostras demonstrativas foram registradas antes da manutenção simulada.',
    registros: [[12.5,88,1020,5,35,28],[11,90,1021,4,20,26],[13,86,1020,5,70,30],
      [15,81,1019,6,160,34],[16,75,1017,7,380,38],[18.5,68,1015,9,520,44],
      [19,65,1014,10,470,46],[17.6,69,1015,9,330,43],[17,72,1016,8,230,42]],
    semana: [15.4,16.2,14.8,13.5,16.9,18.1,17],
    mes: [13,14,12,11,13,15,14,12,13,16,17,15,14,12,13,14,16,18,17,15,14,16,15,15.4,16.2,14.8,13.5,16.9,18.1,17],
  },
};

export const periodos = Object.freeze({ '24h': 'últimas 24 horas', '7d': 'últimos 7 dias', '30d': 'últimos 30 dias' });
const campos = ['temperatura', 'umidade', 'pressao', 'ar', 'luminosidade', 'ruido'];

function datarAmostra(leitura, horasAntes) {
  return new Date(Date.parse(leitura) - horasAntes * 3600000).toISOString();
}

function criarRegistros(cenario) {
  return cenario.registros.map((valores, indice) => Object.freeze({
    horario: datarAmostra(cenario.leitura, (cenario.registros.length - 1 - indice) * 3),
    ...Object.fromEntries(campos.map((campo, coluna) => [campo, valores[coluna]])),
  }));
}

function criarSerie(valores, leitura) {
  return Object.freeze(valores.map((temperatura, indice) => Object.freeze({
    horario: datarAmostra(leitura, (valores.length - 1 - indice) * 24), temperatura,
  })));
}

function criarDashboard(local) {
  const cenario = cenarios[local.id];
  const registros = Object.freeze(criarRegistros(cenario));
  return Object.freeze({ ...local, ...cenario, demonstrativo: true, registros,
    series: Object.freeze({ '24h': registros, '7d': criarSerie(cenario.semana, cenario.leitura),
      '30d': criarSerie(cenario.mes, cenario.leitura) }),
  });
}

export const dashboards = Object.freeze(localidades.map(criarDashboard));
export function obterDashboard(id) { return dashboards.find(local => local.id === id); }

export function obterSerie(local, periodo) {
  if (!Object.hasOwn(periodos, periodo)) throw new Error('Período de histórico não disponível.');
  return local.series[periodo];
}

export function resumirSerie(serie) {
  if (!serie.length) return null;
  const valores = serie.map(ponto => ponto.temperatura);
  return { minima: Math.min(...valores), maxima: Math.max(...valores),
    variacao: valores.at(-1) - valores[0], amostras: valores.length };
}

export function formatarData(horario, estilo = 'completo') {
  const opcoes = { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' };
  if (estilo === 'completo') Object.assign(opcoes, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return new Intl.DateTimeFormat('pt-BR', opcoes).format(new Date(horario));
}
