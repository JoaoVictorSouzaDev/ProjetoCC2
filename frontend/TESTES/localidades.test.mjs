import test from 'node:test';
import assert from 'node:assert/strict';
import { localidades, filtrarLocalidades }
  from '../JAVA SCRIPT/dados-demonstrativos.js';
import { moverSelecao, normalizarEstacoes } from '../JAVA SCRIPT/estacoes.js';

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

test('normaliza as estações da API e aplica a imagem local exclusiva da UNIP', () => {
  const estacoes = normalizarEstacoes([
    { id: 8, nome: 'Estação Principal UNIP', latitude: -23.5, longitude: -46.6, status: 'ativa' },
    { id: 9, nome: 'Campinas', latitude: -22.9, longitude: -47.1, status: 'inativa' },
  ]);
  assert.equal(estacoes[0].imagem, '../ASSETS/images/locations/UNIP1.jpg');
  assert.equal(estacoes[1].imagem, '../ASSETS/images/locations/sao-paulo.webp');
  assert.equal(estacoes[0].id, '8');
  assert.equal(estacoes[0].apiId, 8);
  assert.equal(estacoes[1].status, 'inativa');
  assert.throws(() => normalizarEstacoes({}), /lista de estações inválida/);
  assert.throws(() => normalizarEstacoes([{ id: 0 }]), /dados inválidos/);
});
