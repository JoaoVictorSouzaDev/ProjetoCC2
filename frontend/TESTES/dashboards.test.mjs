import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboards, obterDashboard, obterSerie, resumirSerie, formatarData }
  from '../JAVA SCRIPT/dados-dashboards.js';

test('cinco lugares possuem leituras, dispositivos e históricos independentes', () => {
  assert.equal(dashboards.length, 5);
  for (const campo of ['id', 'leitura', 'dispositivo']) {
    assert.equal(new Set(dashboards.map(local => local[campo])).size, 5, campo);
  }
  for (const periodo of ['24h', '7d', '30d']) {
    assert.equal(new Set(dashboards.map(local => JSON.stringify(obterSerie(local, periodo)))).size, 5);
  }
  assert.equal(obterDashboard('desconhecido'), undefined);
  assert.match(obterDashboard('santos').estado, /pausada/);
  assert.match(obterDashboard('curitiba').estado, /Manutenção/);
});

test('última leitura, tabela e métricas têm os mesmos dados para cada lugar', () => {
  for (const local of dashboards) {
    assert.equal(local.demonstrativo, true);
    const ultima = local.registros.at(-1);
    assert.equal(Date.parse(ultima.horario), Date.parse(local.leitura));
    for (const campo of ['temperatura', 'umidade', 'pressao', 'ar', 'luminosidade', 'ruido']) {
      assert.equal(ultima[campo], local[campo], `${local.id}: ${campo}`);
    }
    for (const periodo of ['24h', '7d', '30d']) {
      assert.equal(obterSerie(local, periodo).at(-1).temperatura, local.temperatura);
    }
  }
});

test('períodos possuem amostras cronológicas e cobrem a janela indicada', () => {
  const quantidades = { '24h': 9, '7d': 7, '30d': 30 };
  for (const local of dashboards) {
    for (const [periodo, quantidade] of Object.entries(quantidades)) {
      const serie = obterSerie(local, periodo);
      assert.equal(serie.length, quantidade);
      assert.ok(serie.every((ponto, i) => i === 0 || Date.parse(ponto.horario) > Date.parse(serie[i - 1].horario)));
      const horas = (Date.parse(serie.at(-1).horario) - Date.parse(serie[0].horario)) / 3600000;
      assert.equal(horas, periodo === '24h' ? 24 : (quantidade - 1) * 24);
    }
  }
  assert.throws(() => obterSerie(dashboards[0], '90d'), /não disponível/);
});

test('resumo deriva da série selecionada e horários independem do fuso do computador', () => {
  assert.deepEqual(resumirSerie(obterSerie(obterDashboard('sorocaba'), '24h')), {
    minima: 20, maxima: 28, variacao: 6, amostras: 9,
  });
  assert.equal(resumirSerie([]), null);
  assert.match(formatarData('2026-09-25T21:30:00Z'), /25\/09\/2026.*18:30/);
});
