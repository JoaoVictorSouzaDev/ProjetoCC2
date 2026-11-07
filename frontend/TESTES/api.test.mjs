import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizarLeitura, normalizarHistorico, situacaoLeitura } from '../JAVA SCRIPT/leituras.js';
import { estacoes } from '../JAVA SCRIPT/estacoes.js';
const codigo = (await readFile(new URL('../JAVA SCRIPT/api.js', import.meta.url), 'utf8'))
  .replace("import { API_BASE_URL, TIMEOUT_API_MS } from './configuracao-api.js';",
    "const API_BASE_URL = 'https://api.example.test'; const TIMEOUT_API_MS = 20;");
const api = await import(`data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`);

test('consulta somente o ID solicitado e envia a data exigida pelo contrato', async t => {
  const chamadas = [];
  t.mock.method(globalThis, 'fetch', async (url, opcoes) => {
    chamadas.push({ url, opcoes }); return new Response('[]');
  });
  await api.verificarApi();
  await api.obterLeituraRecente(17);
  await api.obterHistorico(29, { data: '2026-10-21' });
  assert.deepEqual(chamadas.map(item => item.url), ['https://api.example.test/',
    'https://api.example.test/api/estacoes/17/recente',
    'https://api.example.test/api/estacoes/29/historico?data=2026-10-21']);
  assert.ok(chamadas.every(item => !item.opcoes.method));
});
test('POST envia somente os campos reais e valida medições', async t => {
  let corpo;
  t.mock.method(globalThis, 'fetch', async (_, opcoes) => {
    corpo = JSON.parse(opcoes.body); return new Response('{"status":"sucesso"}', { status: 201 });
  });
  const leitura = { estacao_id: 17, temperatura: 22, umidade: 65, pressao: 1010, qualidade_ar: 35, luminosidade: 420 };
  assert.deepEqual(await api.registrarLeitura({ ...leitura, campo_extra: 10 }), { status: 'sucesso' });
  assert.deepEqual(corpo, leitura);
  assert.throws(() => api.registrarLeitura({ ...leitura, temperatura: 90 }), /limites/);
});
test('trata ausência de conteúdo, HTTP 404 e JSON inválido', async t => {
  const respostas = [new Response(null, { status: 204 }), new Response('{}', { status: 404 }), new Response('html')];
  t.mock.method(globalThis, 'fetch', async () => respostas.shift());
  assert.equal(await api.obterLeituraRecente(17), null);
  await assert.rejects(api.obterLeituraRecente(17), /sem leituras/);
  await assert.rejects(api.obterLeituraRecente(17), /JSON/);
});
test('timeout e cancelamento encerram a requisição', async t => {
  t.mock.method(globalThis, 'fetch', (_, opcoes) => new Promise((resolve, reject) => {
    const abortar = () => reject(new DOMException('Cancelada', 'AbortError'));
    if (opcoes.signal.aborted) abortar();
    else opcoes.signal.addEventListener('abort', abortar, { once: true });
  }));
  await assert.rejects(api.obterLeituraRecente(17), /tempo de resposta/);
  const controle = new AbortController(); controle.abort();
  await assert.rejects(api.obterLeituraRecente(17, controle.signal), { name: 'AbortError' });
});
test('valores inválidos não viram zero ou NaN e datas sem fuso não são inventadas', () => {
  const leitura = normalizarLeitura({ temperatura: null, umidade: '65', qualidade_ar: 12, data_hora: '2026-10-21T10:00:00' });
  assert.equal(leitura.temperatura, null); assert.equal(leitura.umidade, null);
  assert.equal(leitura.ar, 12); assert.equal(leitura.horario, null);
  assert.deepEqual(normalizarHistorico([]), []);
  assert.throws(() => normalizarHistorico({}), /lista/);
  assert.match(situacaoLeitura(normalizarLeitura({ data_hora: '2020-01-01T00:00:00Z' })), /desatualizados/);
  assert.ok(Object.values(estacoes).every(id => id === null));
});
