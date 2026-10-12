import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { Downstream, UpstreamError } from '../src/downstream.js';

/** Servidor HTTP falso: responde com o status da fila e conta as chamadas por método. */
async function fakeServer(statuses: number[]) {
  const calls: string[] = [];
  const server: Server = createServer((req, res) => {
    calls.push(req.method!);
    const status = statuses.length > 1 ? statuses.shift()! : statuses[0];
    res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify({ status }));
  });
  await new Promise<void>((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url, calls, close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }) };
}

test('GET é repetido depois de um 503 e devolve a resposta boa', async () => {
  const s = await fakeServer([503, 200]);
  const ds = new Downstream('svc', s.url);
  const res = await ds.call<{ status: number }>({ path: '/x' });
  assert.equal(res.status, 200);
  assert.deepEqual(s.calls, ['GET', 'GET']);
  ds.breaker.shutdown();
  await s.close();
});

test('POST nunca é repetido (não é idempotente)', async () => {
  const s = await fakeServer([503]);
  const ds = new Downstream('svc', s.url);
  await assert.rejects(ds.call({ method: 'POST', path: '/x', body: {} }), (e) => e instanceof UpstreamError && e.status === 503);
  assert.deepEqual(s.calls, ['POST']);
  ds.breaker.shutdown();
  await s.close();
});

test('4xx é regra de negócio: repassa o erro e não conta como falha do circuito', async () => {
  const s = await fakeServer([409]);
  const ds = new Downstream('svc', s.url);
  for (let i = 0; i < 6; i++) {
    await assert.rejects(ds.call({ method: 'POST', path: '/x', body: {} }), (e) => e instanceof UpstreamError && e.status === 409);
  }
  assert.equal(ds.state().state, 'CLOSED');
  ds.breaker.shutdown();
  await s.close();
});

test('circuito abre depois de falhas seguidas e passa a falhar sem chamar o serviço', async () => {
  const s = await fakeServer([500]);
  const ds = new Downstream('svc', s.url);
  for (let i = 0; i < 5; i++) await ds.call({ method: 'POST', path: '/x', body: {} }).catch(() => {});
  assert.equal(ds.state().state, 'OPEN');
  const before = s.calls.length;
  await assert.rejects(ds.call({ path: '/x' }), /circuito aberto/);
  assert.equal(s.calls.length, before);
  ds.breaker.shutdown();
  await s.close();
});
