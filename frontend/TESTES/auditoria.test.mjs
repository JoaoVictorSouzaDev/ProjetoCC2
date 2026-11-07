import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarLeitura, normalizarHistorico, formatarHorario } from '../JAVA SCRIPT/leituras.js';
import { validarData, validarId } from '../JAVA SCRIPT/api.js';
import { interpretarResultados, consultarEstacao } from '../JAVA SCRIPT/consulta-estacao.js';
import { estadoDaLeitura } from '../JAVA SCRIPT/estados.js';
const ok = value => ({ status: 'fulfilled', value });

test('rejeita objetos sem leituras sem transformar ausência em zero', () => {
  for (const item of [{}, { message: 'Falhou' }, [], null]) assert.throws(() => normalizarLeitura(item));
  assert.equal(normalizarLeitura({ temperatura: null }).temperatura, null);
  assert.equal(normalizarLeitura({ temperatura: 0 }).temperatura, 0);
});
test('histórico de outra estação não contamina o dashboard selecionado', () => {
  const resultado = interpretarResultados([ok({ temperatura: 23 }),
    ok([{ estacao_id: 9, temperatura: 27 }])], 8);
  assert.equal(resultado.leitura.temperatura, 23);
  assert.deepEqual(resultado.historico, []);
  assert.equal(resultado.falhaHistorico, 'error');
});
test('valida datas do calendário e IDs antes de abrir qualquer requisição', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Não deveria consultar'); });
  for (const data of ['', '2026-02-30', '2026-13-01', '2026-2-01']) {
    assert.throws(() => validarData(data), /data válida/);
    await assert.rejects(consultarEstacao({ apiId: 8 }, { data }), /data válida/);
  }
  validarData('2024-02-29');
  assert.throws(() => validarId(Number.MAX_SAFE_INTEGER + 1));
  assert.equal(fetch.mock.callCount(), 0);
});
test('horários inválidos não causam exceção nem alegam atualidade conhecida', () => {
  assert.equal(normalizarLeitura({ data_hora: '2026-02-30T12:00:00Z' }).horario, null);
  assert.equal(formatarHorario('inválido'), 'Indisponível');
  assert.match(estadoDaLeitura({ horario: 'inválido' }).texto, /desconhecida/);
  const historico = normalizarHistorico([
    { temperatura: 22, data_hora: '2026-10-29T12:00:00Z' },
    { temperatura: 18 },
    { temperatura: 20, data_hora: '2026-10-29T10:00:00Z' },
  ]);
  assert.deepEqual(historico.map(item => item.temperatura), [18, 20, 22]);
});
