import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { UploadQueue } from '../server/queue.js';
import { loadConfig } from '../server/config.js';
import { temporary, memoryRepository, png } from './helpers.js';

async function fixture(t, overrides = {}) {
  const dataDir = await temporary(t), repository = memoryRepository();
  const config = { configured: true, production: false, operatorToken: randomBytes(32).toString('hex'), dataDir, publicUrl: 'http://localhost:4173', uploadMaxBytes: 1024, ...overrides };
  const queue = new UploadQueue({ dataDir, repository }); await queue.init();
  const server = createApp({ config, repository, queue }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { config, queue, repository, url: `http://127.0.0.1:${server.address().port}` };
}

test('operator auth, private writes, signed media read, durable acceptance and idempotency', async t => {
  const { url, config, queue } = await fixture(t);
  let response = await fetch(`${url}/api/sessions`, { method: 'POST' }); assert.equal(response.status, 401);
  response = await fetch(`${url}/api/operator/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: config.operatorToken }) });
  assert.equal(response.status, 200);
  const rawCookie = response.headers.get('set-cookie'); assert.match(rawCookie, /HttpOnly/i); assert.match(rawCookie, /SameSite=Strict/i);
  const headers = { Cookie: rawCookie.split(';')[0] };
  response = await fetch(`${url}/api/sessions`, { method: 'POST', headers }); assert.equal(response.status, 201);
  const record = await response.json(); assert.match(record.id, /^session_[a-f0-9]{24}$/); assert.equal(record.status, 'queued');
  const id = randomUUID();
  const form = new FormData(); form.append('media', new Blob([png], { type: 'image/png' }), 'picture.png');
  response = await fetch(`${url}/api/sessions/${record.id}/media`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': id }, body: form });
  assert.equal(response.status, 202, await response.clone().text());
  const job = await response.json(); assert.equal(job.id, id); assert.equal(job.status, 'queued'); assert.equal(job.objectPath, undefined);
  response = await fetch(`${url}/api/sessions/${record.id}/media`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': id }, body: form });
  assert.equal(response.status, 202); assert.equal(queue.jobs.size, 1);
  await queue.runOnce();
  response = await fetch(`${url}/api/sessions/${record.id}`); assert.equal(response.status, 200);
  const ready = await response.json(); assert.equal(ready.status, 'ready'); assert.equal(ready.media_type, 'image/png');
  assert.ok(ready.media_url);
  response = await fetch(`${url}/api/uploads`); assert.equal(response.status, 401);
  response = await fetch(`${url}/api/config`); const text = await response.text(); assert.ok(!text.includes(config.operatorToken));
  response = await fetch(`${url}/api/operator/logout`, { method: 'POST', headers }); assert.equal(response.status, 200);
  response = await fetch(`${url}/api/uploads`, { headers }); assert.equal(response.status, 401);
});

test('rejects cross-origin writes, spoofed files and oversized payloads', async t => {
  const { url, config, repository } = await fixture(t);
  const headers = { Authorization: `Bearer ${config.operatorToken}` };
  let response = await fetch(`${url}/api/sessions`, { method: 'POST', headers: { ...headers, Origin: 'https://attacker.example' } });
  assert.equal(response.status, 403);
  await repository.create('session_test');
  const form = new FormData(); form.append('media', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'fake.png');
  response = await fetch(`${url}/api/sessions/session_test/media`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': randomUUID() }, body: form });
  assert.equal(response.status, 415);
  const large = new FormData(); large.append('media', new Blob([Buffer.alloc(2048)], { type: 'image/png' }), 'large.png');
  response = await fetch(`${url}/api/sessions/session_test/media`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': randomUUID() }, body: large });
  assert.equal(response.status, 413);
  response = await fetch(`${url}/api/sessions/missing`); assert.equal(response.status, 404);
});

test('missing environment settings are explicit and fail closed', async t => {
  const { url } = await fixture(t, { configured: false });
  const response = await fetch(`${url}/api/sessions/session_test`);
  assert.equal(response.status, 503); assert.equal((await response.json()).code, 'NOT_CONFIGURED');
  assert.equal(loadConfig({}).configured, false);
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /Production requires/);
  assert.throws(() => loadConfig({ TERMINAL_WRITE_TOKEN: 'short' }), /32 characters/);
});
