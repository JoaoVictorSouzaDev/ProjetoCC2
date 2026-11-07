import test from 'node:test';
import assert from 'node:assert/strict';
import { criarRepositorioLeituras } from '../JAVA SCRIPT/leitura-compartilhada.js';
import { normalizarLeitura } from '../JAVA SCRIPT/leituras.js';
import { apresentarUmidade } from '../JAVA SCRIPT/umidade.js';
import { catalogoEstacoes } from '../JAVA SCRIPT/estacoes.js';
import { estadoDaLeitura } from '../JAVA SCRIPT/estados.js';

function ambiente() {
  const dados = new Map(), chamadas = [];
  let agora = Date.parse('2026-11-05T12:00:00Z'), resposta;
  const armazenamento = { getItem: chave => dados.get(chave), setItem: (chave, valor) => dados.set(chave, valor) };
  const criar = () => criarRepositorioLeituras({ baseUrl: 'teste', armazenamento, validade: 60000,
    agora: () => agora, buscar: async id => {
      chamadas.push(id);
      if (resposta instanceof Error) throw resposta;
      return resposta === undefined ? { estacao_id: id, umidade: id, data_hora: new Date(agora).toISOString() } : resposta;
    } });
  return { criar, chamadas, responder: valor => { resposta = valor; }, avancar: ms => { agora += ms; } };
}
const estacoesTeste = catalogoEstacoes.map((local, indice) => ({ ...local, apiId: indice + 1 }));
const comparar = dados => apresentarUmidade(dados === null ? null : normalizarLeitura(dados).umidade).texto;

test('zero válido e campos ausentes, nulos ou malformados usam o mesmo formatador', () => {
  assert.equal(apresentarUmidade(0).texto, '0 %');
  assert.equal(apresentarUmidade(65.45).texto, '65,5 %');
  for (const valor of [undefined, null, '', '65', false, NaN, Infinity, {}])
    assert.equal(apresentarUmidade(valor).texto, 'Indisponível');
});
for (const estacao of estacoesTeste) {
  test(`${estacao.nome}: Index e dashboard compartilham leitura, horário, refresh, falha e vazio`, async () => {
    const ambienteTeste = ambiente(), index = ambienteTeste.criar(), dashboard = ambienteTeste.criar();
    const inicial = await index(estacao), direto = await dashboard(estacao);
    assert.deepEqual(direto, inicial);
    assert.equal(comparar(inicial), `${estacao.apiId} %`);
    assert.equal(ambienteTeste.chamadas.length, 1);
    ambienteTeste.responder({ estacao_id: estacao.apiId, umidade: 0, data_hora: '2026-11-05T12:01:00Z' });
    const atualizado = await dashboard(estacao, { politica: 'atualizar' });
    assert.deepEqual(await index(estacao), atualizado);
    assert.equal(comparar(atualizado), '0 %');
    ambienteTeste.responder(Object.assign(new Error('Falha simulada'), { codigo: 'offline' }));
    await assert.rejects(dashboard(estacao, { politica: 'atualizar' }), /Falha simulada/);
    await assert.rejects(index(estacao), /Falha simulada/);
    ambienteTeste.responder(null);
    assert.equal(await dashboard(estacao, { politica: 'atualizar' }), null);
    assert.equal(comparar(await index(estacao)), 'Indisponível');
    ambienteTeste.responder({ estacao_id: estacao.apiId, umidade: 77, data_hora: '2020-01-01T00:00:00Z' });
    const antiga = await dashboard(estacao, { politica: 'atualizar' });
    assert.deepEqual(await index(estacao), antiga);
    assert.equal(estadoDaLeitura(normalizarLeitura(antiga)).tipo, 'stale');
  });
}
test('separa cidades, rejeita estação incorreta e expira cache', async () => {
  const a = ambiente(), obter = a.criar();
  for (const local of estacoesTeste) assert.equal((await obter(local)).estacao_id, local.apiId);
  assert.equal(a.chamadas.length, 5);
  a.avancar(60000); await obter(estacoesTeste[0]); assert.equal(a.chamadas.length, 6);
  a.responder({ estacao_id: 99, umidade: 50 });
  await assert.rejects(obter(estacoesTeste[0], { politica: 'atualizar' }), /não pertence/);
  assert.equal(await obter({ apiId: null }), null);
});
test('duas consultas simultâneas da mesma estação usam uma única requisição', async () => {
  const a = ambiente(), obter = a.criar();
  const resultados = await Promise.all([obter(estacoesTeste[0]), obter(estacoesTeste[0])]);
  assert.deepEqual(resultados[0], resultados[1]); assert.equal(a.chamadas.length, 1);
});
test('acesso direto ao dashboard obtém leitura sem depender do Index', async () => {
  const a = ambiente(), dashboard = a.criar();
  for (const local of estacoesTeste) assert.equal(comparar(await dashboard(local)), `${local.apiId} %`);
  assert.equal(a.chamadas.length, 5);
});

test('falha ao gravar cache não restaura umidade anterior depois de erro da API', async () => {
  let salvo, recusar = false, falharApi = false;
  const obter = criarRepositorioLeituras({ baseUrl: 'teste', validade: 60000, agora: () => 100,
    armazenamento: { getItem: () => salvo, setItem: (_, valor) => {
      if (recusar) throw new Error('Cota'); salvo = valor;
    }, removeItem: () => { salvo = null; } },
    buscar: async () => { if (falharApi) throw new Error('API indisponível'); return { umidade: 40 }; } });
  await obter(estacoesTeste[0]); recusar = true; falharApi = true;
  await assert.rejects(obter(estacoesTeste[0], { politica: 'atualizar' }), /API indisponível/);
  await assert.rejects(obter(estacoesTeste[0]), /API indisponível/);
  assert.equal(salvo, null);
});
