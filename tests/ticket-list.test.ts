import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { Hono } from 'hono';
import { FirestoreClient, type Env } from '../worker/core-utils';
import { TicketEntity } from '../worker/entities';
import { userRoutes } from '../worker/user-routes';
import worker from '../worker/index';

const env = {} as Env;
const token = (offset: number) => `offset/${offset}+?&=`;

test('a health check as the first worker request does not prevent ticket routes from loading', async t => {
  setup(t, 205);
  const ctx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  const health = await worker.fetch(new Request('https://mtrack.test/api/health'), env, ctx);
  assert.equal(health.status, 200);
  const response = await worker.fetch(new Request('https://mtrack.test/api/tickets'), env, ctx);
  assert.equal(response.status, 200);
  assert.equal((await response.json() as any).data.items.length, 205);
});

function setup(t: TestContext, count: number) {
  const documents = Array.from({ length: count }, (_, index) => ({
    name: `projects/test/databases/(default)/documents/tickets/${String(index).padStart(4, '0')}`,
    fields: { title: { stringValue: `Ticket ${index}` } },
  }));
  const requests: URL[] = [];
  t.mock.method(FirestoreClient, 'request', async (_env: Env, path: string, method = 'GET', body?: any) => {
    const url = new URL(path, 'https://firestore.test');
    requests.push(url);
    if (method === 'PATCH') {
      documents.push({ name: `projects/test/databases/(default)/documents${url.pathname}`, ...body });
      return documents.at(-1);
    }
    if (url.pathname !== '/tickets') {
      return documents.find(doc => doc.name.endsWith(url.pathname));
    }
    const cursor = url.searchParams.get('pageToken');
    const offset = cursor ? Number(cursor.split('/')[1].split('+')[0]) : 0;
    if (cursor) assert.equal(cursor, token(offset));
    const size = Number(url.searchParams.get('pageSize'));
    return {
      documents: documents.slice(offset, offset + size),
      nextPageToken: offset + size < documents.length ? token(offset + size) : undefined,
    };
  });
  const app = new Hono<{ Bindings: Env }>();
  userRoutes(app);
  return { app, requests };
}

test('a newly saved ticket beyond the first 100 is present in the default list', async t => {
  const { app, requests } = setup(t, 205);
  await TicketEntity.create(env, { ...TicketEntity.initialState, id: 'zz-new-ticket', title: 'New ticket' });
  const detail = await app.request('/api/tickets/zz-new-ticket', {}, env);
  assert.equal((await detail.json()).data.id, 'zz-new-ticket');
  const response = await app.request('/api/tickets', {}, env);
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.items.length, 206);
  assert.equal(new Set(data.items.map((ticket: any) => ticket.id)).size, 206);
  assert.ok(data.items.some((ticket: any) => ticket.id === 'zz-new-ticket'));
  assert.equal(data.next, null);
  assert.deepEqual(requests.filter(url => url.searchParams.has('pageToken')).map(url => url.searchParams.get('pageToken')), [token(100), token(200)]);
});

test('explicit pagination returns distinct pages and preserves encoded cursors', async t => {
  const { app } = setup(t, 205);
  const first = await (await app.request('/api/tickets?limit=100', {}, env)).json();
  const second = await (await app.request(`/api/tickets?limit=100&cursor=${encodeURIComponent(first.data.next)}`, {}, env)).json();
  assert.equal(first.data.items.length, 100);
  assert.equal(second.data.items.length, 100);
  assert.equal(second.data.items[0].id, '0100');
  assert.equal(second.data.next, token(200));
});

test('empty collections terminate without another request', async t => {
  const { requests } = setup(t, 0);
  assert.deepEqual(await TicketEntity.listAll(env), { items: [], next: null });
  assert.equal(requests.length, 1);
});

test('a later-page failure rejects instead of returning a partial list', async t => {
  t.mock.method(FirestoreClient, 'request', async (_env: Env, path: string) => {
    if (new URL(path, 'https://firestore.test').searchParams.has('pageToken')) {
      throw new Error('Firestore unavailable');
    }
    return { documents: [], nextPageToken: token(100) };
  });
  await assert.rejects(TicketEntity.listAll(env), /Firestore unavailable/);
});
