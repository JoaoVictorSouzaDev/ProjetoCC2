import test from 'node:test';
import assert from 'node:assert/strict';
import { apresentarPrecipitacao } from '../JAVA SCRIPT/precipitacao.js';
import { normalizarLeitura } from '../JAVA SCRIPT/leituras.js';

// Fixtures do modelo de apresentação; não representam campos ou valores recebidos da API.
const amostra = { mm: 12.5, periodo: 'Período de teste de uma hora', horario: '2026-11-05T12:00:00Z' };
test('precipitação apresenta valor positivo, unidade, período e horário', () => {
  const dados = apresentarPrecipitacao(amostra);
  assert.equal(dados.valor, '12,5'); assert.equal(dados.unidade, 'mm');
  assert.match(dados.periodo, /Período de teste/); assert.match(dados.horario, /09:00/);
});
test('zero é uma medida válida e ausência nunca vira zero', () => {
  assert.equal(apresentarPrecipitacao({ ...amostra, mm: 0 }).valor, '0');
  for (const mm of [null, undefined, NaN, Infinity, -1, '12', {}]) {
    assert.equal(apresentarPrecipitacao({ ...amostra, mm }).valor, 'Indisponível');
  }
  assert.equal(apresentarPrecipitacao(null).valor, 'Indisponível');
});
test('não exibe acumulado sem período nem horário inventado', () => {
  for (const periodo of [null, undefined, '', '  ', 24])
    assert.equal(apresentarPrecipitacao({ ...amostra, periodo }).valor, 'Indisponível');
  assert.equal(apresentarPrecipitacao({ ...amostra, horario: null }).horario, 'Indisponível');
});
test('distingue carregamento, falha, offline, vazio e desatualização', () => {
  const mensagens = new Set();
  for (const estado of ['loading', 'error', 'offline', 'empty']) {
    const dados = apresentarPrecipitacao(amostra, estado);
    assert.equal(dados.valor, 'Indisponível'); mensagens.add(dados.situacao);
  }
  assert.equal(mensagens.size, 4);
  assert.match(apresentarPrecipitacao(amostra, 'stale').situacao, /desatualizada/);
  assert.equal(apresentarPrecipitacao(amostra, 'stale').valor, '12,5');
  assert.match(apresentarPrecipitacao({ ...amostra, origem: 'demonstracao' }).situacao, /demonstrativos/);
});
test('mapeador não assume campo, período ou calibração de chuva no contrato atual', () => {
  assert.equal(normalizarLeitura({ temperatura: 22, data_hora: amostra.horario }).precipitacao, null);
});

test('precipitação pequena não é arredondada para zero e valor inválido é identificado', () => {
  assert.equal(apresentarPrecipitacao({ ...amostra, mm: 0.04 }).valor, '0,04');
  assert.match(apresentarPrecipitacao({ ...amostra, mm: '12' }).situacao, /inválida/);
  assert.match(apresentarPrecipitacao({ ...amostra, origem: 'demonstracao' }, 'stale').situacao, /demonstrativos/);
});
