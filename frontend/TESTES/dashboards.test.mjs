import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarLeitura, normalizarHistorico, situacaoLeitura, classificar } from '../JAVA SCRIPT/leituras.js';
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
test('atualidade das leituras não é confundida com conectividade da estação', () => {
  assert.match(situacaoLeitura({ horario: new Date().toISOString() }), /conectividade não informada/);
  assert.match(situacaoLeitura(null), /Sem leituras/);
  assert.match(classificar('umidade', 10), /Emergência/);
  assert.match(classificar('umidade', 20), /Atenção/);
  assert.match(classificar('ar', 35), /não informadas/);
});
test('horários com offset são exibidos no fuso de Brasília', () => {
  assert.match(formatarData('2026-09-25T21:30:00Z'), /25\/09\/2026.*18:30/);
});
