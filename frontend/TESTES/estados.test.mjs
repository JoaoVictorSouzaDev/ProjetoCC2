import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoDaLeitura, estadoDaFalha, estados } from '../JAVA SCRIPT/estados.js';
import { interpretarResultados } from '../JAVA SCRIPT/consulta-estacao.js';
import { catalogoEstacoes } from '../JAVA SCRIPT/estacoes.js';
const ok = value => ({ status: 'fulfilled', value });
const erro = codigo => ({ status: 'rejected', reason: Object.assign(new Error('Falhou'), { codigo }) });
const agora = Date.parse('2026-10-27T12:00:00Z');
test('distingue leitura recente, antiga, ausente, sem horário e futura sem inferir conectividade', () => {
  assert.equal(estadoDaLeitura(null).tipo, 'empty');
  assert.equal(estadoDaLeitura({ horario: '2026-10-27T11:59:00Z' }, agora).tipo, 'success');
  assert.equal(estadoDaLeitura({ horario: '2026-10-27T11:00:00Z' }, agora).tipo, 'stale');
  assert.match(estadoDaLeitura({ horario: null }).texto, /desconhecida/);
  assert.match(estadoDaLeitura({ horario: '2026-10-28T12:00:00Z' }, agora).texto, /inconsistente/);
});
test('mantém falha HTTP distinta de rede inacessível e ausência de cadastro', () => {
  assert.equal(estadoDaFalha({ codigo: 'offline' }).tipo, 'offline');
  assert.equal(estadoDaFalha({ codigo: 'error' }).tipo, 'error');
  assert.equal(estadoDaFalha({ codigo: 'empty' }).tipo, 'empty');
  assert.deepEqual(estados.empty, { acao: 'Consultar novamente' });
  for (const [tipo, estado] of Object.entries(estados)) {
    if (tipo !== 'empty') assert.ok(estado.titulo && estado.texto && estado.icone);
  }
});
test('não mistura leitura de outra estação e preserva sucesso parcial do histórico', () => {
  const resultado = interpretarResultados([ok({ estacao_id: 7, temperatura: 20 }),
    ok([{ temperatura: 21, data_hora: '2026-10-27T12:00:00Z' }])], 8);
  assert.equal(resultado.leitura, null);
  assert.equal(resultado.estado.tipo, 'error');
  assert.equal(resultado.historico[0].temperatura, 21);
});
test('erro no histórico não destrói a leitura atual e vazio não vira erro', () => {
  const resultado = interpretarResultados([ok({ estacao_id: 8, temperatura: 23 }), erro('offline')], 8);
  assert.equal(resultado.leitura.temperatura, 23);
  assert.equal(resultado.falhaHistorico, 'offline');
  const vazio = interpretarResultados([erro('empty'), ok([])], 8);
  assert.equal(vazio.estado.tipo, 'empty');
  assert.equal(vazio.falhaHistorico, null);
});
test('catálogo é a origem única de nomes, rotas, imagens e disponibilidade', () => {
  assert.equal(new Set(catalogoEstacoes.map(item => item.id)).size, catalogoEstacoes.length);
  for (const item of catalogoEstacoes) {
    assert.ok(item.nome && item.cidade && item.uf && item.imagem);
    assert.equal(new URL(item.rota, 'http://localhost/').searchParams.get('local'), item.id);
    assert.equal(item.disponibilidade, item.apiId === null ? 'unconfigured' : 'configured');
  }
});
