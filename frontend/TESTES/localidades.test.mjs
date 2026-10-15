import test from 'node:test';
import assert from 'node:assert/strict';
import { localidades, moverSelecao, filtrarLocalidades, formatarIndicadores }
  from '../JAVA SCRIPT/dados-demonstrativos.js';

test('carrossel avança, volta e fecha o ciclo nas duas extremidades', () => {
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

test('seleções distintas fornecem todos os indicadores e unidades corretos', () => {
  const sorocaba = localidades.find(item => item.id === 'sorocaba');
  const santos = localidades.find(item => item.id === 'santos');
  assert.deepEqual(formatarIndicadores(sorocaba), {
    temperatura: '26 °C', umidade: '54 %', pressao: '1.012 hPa',
    ar: '12 µg/m³', luminosidade: '420 lx', ruido: '48 dB(A)',
  });
  assert.deepEqual(formatarIndicadores(santos), {
    temperatura: '24 °C', umidade: '78 %', pressao: '1.008 hPa',
    ar: '10 µg/m³', luminosidade: '180 lx', ruido: '52 dB(A)',
  });
  assert.equal(new Set(localidades.map(item => item.id)).size, 5);
});
