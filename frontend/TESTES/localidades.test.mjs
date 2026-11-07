import test from 'node:test';
import assert from 'node:assert/strict';
import { localidades, filtrarLocalidades }
  from '../JAVA SCRIPT/dados-demonstrativos.js';
import { moverSelecao } from '../JAVA SCRIPT/estacoes.js';

test('abas do dashboard avançam, voltam e fecham o ciclo', () => {
  assert.equal(moverSelecao(localidades, 'sorocaba', 1), 'santos');
  assert.equal(moverSelecao(localidades, 'sorocaba', -1), 'campinas');
  assert.equal(moverSelecao(localidades, 'curitiba', 1), 'sao-paulo');
  assert.equal(moverSelecao(localidades, 'sao-paulo', -1), 'curitiba');
});

test('busca ignora acentos e navegação respeita a lista filtrada', () => {
  assert.deepEqual(filtrarLocalidades(' SAO PAULO ').map(item => item.id), ['sao-paulo']);
  const paulistas = filtrarLocalidades('SP');
  assert.equal(moverSelecao(paulistas, 'santos', 1), 'sao-paulo');
  assert.equal(moverSelecao(filtrarLocalidades('inexistente'), 'santos', 1), null);
  assert.equal(moverSelecao(filtrarLocalidades('Curitiba'), 'curitiba', 1), 'curitiba');
});

test('cada cartão mantém seus dados demonstrativos e não inventa qualidade do ar', () => {
  assert.equal(localidades.find(item => item.id === 'sorocaba').temperatura, 26);
  assert.ok(localidades.every(item => !Object.hasOwn(item, 'umidade')));
  assert.ok(localidades.every(item => !Object.hasOwn(item, 'ar')));
  assert.equal(new Set(localidades.map(item => item.id)).size, 5);
  assert.equal(moverSelecao(localidades, 'inexistente', 1), 'sao-paulo');
});
