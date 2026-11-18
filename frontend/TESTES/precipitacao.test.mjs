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
test('mapeador lê pluviometria da API e deixa ausência explícita', () => {
  assert.equal(normalizarLeitura({ temperatura: 22, data_hora: amostra.horario }).precipitacao, null);
  assert.equal(normalizarLeitura({ pluviometria: null }).precipitacao, null);
  assert.deepEqual(normalizarLeitura({ pluviometria: 0 }).precipitacao, {
    mm: 0, periodo: 'intervalo da leitura', horario: null,
  });
});

test('precipitação pequena não é arredondada para zero e valor inválido é identificado', () => {
  assert.equal(apresentarPrecipitacao({ ...amostra, mm: 0.04 }).valor, '0,04');
  assert.match(apresentarPrecipitacao({ ...amostra, mm: '12' }).situacao, /inválida/);
  assert.match(apresentarPrecipitacao({ ...amostra, origem: 'demonstracao' }, 'stale').situacao, /demonstrativos/);
});
test('aumenta a classificação e a cor conforme o acumulado de chuva', () => {
  assert.match(apresentarPrecipitacao({ ...amostra, mm: 0 }).situacao, /Céu limpo/);
  assert.match(apresentarPrecipitacao({ ...amostra, mm: 2 }).situacao, /Céu limpo/);
  assert.equal(apresentarPrecipitacao({ ...amostra, mm: 2.01 }).intensidade, 'leve');
  assert.equal(apresentarPrecipitacao({ ...amostra, mm: 5 }).intensidade, 'leve');
  assert.equal(apresentarPrecipitacao({ ...amostra, mm: 5.01 }).intensidade, 'moderada');
  assert.equal(apresentarPrecipitacao({ ...amostra, mm: 10 }).intensidade, 'moderada');
  assert.equal(apresentarPrecipitacao({ ...amostra, mm: 10.01 }).intensidade, 'forte');
  assert.equal(apresentarPrecipitacao({ ...amostra, mm: 20 }).intensidade, 'forte');
  assert.equal(apresentarPrecipitacao({ ...amostra, mm: 20.01 }).intensidade, 'intensa');
  assert.match(apresentarPrecipitacao(null).situacao, /Pluviometria não informada pela API/);
  assert.equal(apresentarPrecipitacao(null).intensidade, null);
  assert.doesNotMatch(apresentarPrecipitacao(null, 'loading').situacao, /Pluviometria não informada pela API/);
});
