import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarLeitura, normalizarHistorico, situacaoLeitura, classificar, obterAlerta, obterDicaAmbiental } from '../JAVA SCRIPT/leituras.js';
import { formatarData } from '../JAVA SCRIPT/dados-dashboards.js';

test('campos do contrato alimentam os indicadores sem carregar propriedades extras', () => {
  assert.deepEqual(normalizarLeitura({ temperatura: 23, umidade: 60, pressao: 1012,
    qualidade_ar: 35, luminosidade: 420, data_hora: '2026-10-21T10:00:00Z', extra: 99 }),
  { temperatura: 23, umidade: 60, pressao: 1012, ar: 35, luminosidade: 420, horario: '2026-10-21T10:00:00Z', precipitacao: null });
});
test('histórico mantém valores e ordena as leituras para gráfico e tabela', () => {
  const serie = normalizarHistorico([{ temperatura: 25, data_hora: '2026-10-21T12:00:00Z' },
    { temperatura: 20, data_hora: '2026-10-21T09:00:00Z' }]);
  assert.deepEqual(serie.map(item => item.temperatura), [20, 25]);
  assert.equal(serie[0].umidade, null);
});
test('classificação dos alertas respeita os limites de umidade e qualidade do ar', () => {
  assert.deepEqual(obterAlerta('umidade', 11.9), {
    severidade: 'Emergência',
    mensagem: 'Umidade abaixo de 12%. Ar muito seco! Hidrate-se bem e umidifique o ambiente.',
  });
  assert.deepEqual(obterAlerta('umidade', 12), {
    severidade: 'Atenção',
    mensagem: 'Umidade abaixo de 30%. Ar muito seco! Hidrate-se bem e umidifique o ambiente.',
  });
  assert.equal(obterAlerta('umidade', 30), null);
  assert.equal(obterAlerta('ar', 70), null);
  assert.deepEqual(obterAlerta('ar', 70.1), {
    severidade: 'Aviso', mensagem: 'Poluição do ar elevada acima de 70%. Mantenha os ambientes ventilados.',
  });
  assert.deepEqual(obterAlerta('ar', 90), {
    severidade: 'Crítico',
    mensagem: 'Poluição do ar em nível crítico, acima de 90%. Evite atividades físicas ao ar livre.',
  });
  assert.equal(obterAlerta('ar', null), null);
});
test('dicas de temperatura e umidade respeitam faixas e ignoram valores ausentes', () => {
  assert.equal(obterDicaAmbiental('temperatura', 32).tom, 'quente');
  assert.equal(obterDicaAmbiental('temperatura', 15).tom, 'frio');
  assert.equal(obterDicaAmbiental('temperatura', 15.1).tom, 'neutro');
  assert.equal(obterDicaAmbiental('temperatura', 15.05).tom, 'neutro');
  assert.equal(obterDicaAmbiental('temperatura', 31.9).tom, 'neutro');
  assert.equal(obterDicaAmbiental('temperatura', 31.99).tom, 'neutro');
  assert.equal(obterDicaAmbiental('temperatura', null), null);
  assert.equal(obterDicaAmbiental('temperatura', undefined), null);
  assert.equal(obterDicaAmbiental('umidade', 29.9), null);
  assert.equal(obterDicaAmbiental('umidade', 30).tom, 'neutro');
  assert.equal(obterDicaAmbiental('umidade', 80).tom, 'neutro');
  assert.equal(obterDicaAmbiental('umidade', 80.1).tom, 'frio');
  assert.equal(obterDicaAmbiental('umidade', null), null);
});
test('atualidade das leituras não é confundida com conectividade da estação', () => {
  assert.match(situacaoLeitura({ horario: new Date().toISOString() }), /conectividade não informada/);
  assert.match(situacaoLeitura(null), /Sem leituras/);
  assert.match(classificar('umidade', 10), /Emergência/);
  assert.match(classificar('umidade', 20), /Atenção/);
  assert.match(classificar('ar', 35), /não informadas/);
  assert.match(classificar('ar', 71), /Aviso/);
  assert.match(classificar('ar', 90), /Crítico/);
});
test('horários com offset são exibidos no fuso de Brasília', () => {
  assert.match(formatarData('2026-09-25T21:30:00Z'), /25\/09\/2026.*18:30/);
});
