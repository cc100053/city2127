import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRepository } from '../server/repository.js';
import { temporary, png } from './helpers.js';

test('Supabase SDK adapter inserts, uploads with upsert, commits ready and signs a private object URL', async t => {
  const dir = await temporary(t);
  let record, uploadedBytes = 0, signedExpiry;
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const url = new URL(req.url, 'http://test');
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/rest/v1/sessions') {
      if (req.method === 'POST') {
        record = { ...JSON.parse(body.toString()), status: 'queued', proposal_number: 1, media_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        res.end(JSON.stringify(record));
      } else if (req.method === 'PATCH') {
        Object.assign(record, JSON.parse(body.toString())); res.end(JSON.stringify({ id: record.id }));
      } else res.end(JSON.stringify(record ? [record] : []));
    } else if (url.pathname.includes('/object/sign/')) {
      signedExpiry = JSON.parse(body.toString()).expiresIn;
      res.end(JSON.stringify({ signedURL: `${url.pathname.replace('/storage/v1', '')}?token=test-signature` }));
    } else if (url.pathname.includes('/storage/v1/object/')) {
      assert.equal(req.headers['x-upsert'], 'true');
      assert.equal(req.headers['content-type'], 'image/png');
      uploadedBytes = body.length;
      res.end(JSON.stringify({ Key: url.pathname.split('/object/')[1] }));
    } else { res.statusCode = 404; res.end('{}'); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const supabaseUrl = `http://127.0.0.1:${server.address().port}`;
  const repository = createRepository({ supabaseUrl, supabaseKey: 'test-only-placeholder', bucket: 'session-media', signedUrlTtl: 3600 });
  const created = await repository.create('session_test'); assert.equal(created.status, 'queued');
  assert.equal((await repository.get('session_test')).proposal_number, 1);
  const filePath = path.join(dir, 'image.png'); await writeFile(filePath, png);
  const objectPath = 'session_test/12345678-1234-4123-8123-123456789abc.png';
  const permanentUrl = await repository.upload({ objectPath, mime: 'image/png' }, filePath);
  assert.equal(uploadedBytes, png.length);
  assert.equal(permanentUrl, `${supabaseUrl}/storage/v1/object/session-media/${objectPath}`);
  await repository.setStatus('session_test', 'ready', permanentUrl);
  const result = await repository.publicSession(await repository.get('session_test'));
  assert.equal(result.media_type, 'image/png');
  assert.ok(result.media_url.includes('/object/sign/session-media/'));
  assert.ok(result.media_url.endsWith('?token=test-signature'));
  assert.equal(signedExpiry, 3600);
  assert.ok(Date.parse(result.media_expires_at) > Date.now());
});
