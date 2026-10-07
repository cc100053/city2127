import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { UploadQueue } from '../server/queue.js';
import { temporary, memoryRepository, enqueueFixture } from './helpers.js';

test('durable queue survives restart and retries storage failures with exponential delay', async t => {
  const dataDir = await temporary(t), repository = memoryRepository();
  await repository.create('session_test');
  let now = 100;
  const options = { dataDir, repository, now: () => now, retryBaseMs: 2000 };
  let queue = new UploadQueue(options); await queue.init();
  const job = await enqueueFixture(queue);
  await assert.rejects(queue.enqueue({ id: job.id, sessionId: 'session_other' }), { status: 409 });
  assert.equal(JSON.parse(await readFile(path.join(dataDir, 'jobs', `${job.id}.json`))).status, 'queued');
  queue = new UploadQueue(options); await queue.init();
  repository.failures = 2;
  await queue.runOnce();
  assert.equal(queue.jobs.get(job.id).status, 'retry_wait');
  assert.equal(queue.jobs.get(job.id).nextAttemptAt, 2100);
  await queue.runOnce(); assert.equal(repository.uploads.length, 1);
  now = 2100; await queue.runOnce();
  assert.equal(queue.jobs.get(job.id).nextAttemptAt, 6100);
  now = 6100; await queue.runOnce();
  assert.equal(queue.jobs.get(job.id).status, 'completed');
  assert.equal((await repository.get('session_test')).status, 'ready');
  assert.equal(new Set(repository.uploads).size, 1, 'Retries must reuse the same object path');
  await assert.rejects(stat(queue.filePath(job)), { code: 'ENOENT' });
});

test('exhausted jobs retain the file and can be manually retried after a restart', async t => {
  const dataDir = await temporary(t), repository = memoryRepository();
  await repository.create('session_test'); repository.failures = 1;
  const options = { dataDir, repository, maxAttempts: 1 };
  let queue = new UploadQueue(options); await queue.init();
  const job = await enqueueFixture(queue); await queue.runOnce();
  assert.equal(queue.jobs.get(job.id).status, 'failed');
  assert.equal((await repository.get('session_test')).status, 'failed');
  assert.ok((await stat(queue.filePath(job))).size > 0);
  queue = new UploadQueue(options); await queue.init();
  await queue.retry(job.id); await queue.runOnce();
  assert.equal(queue.jobs.get(job.id).status, 'completed');
  await assert.rejects(queue.retry(job.id), { status: 409 });
});

test('database commit failure after upload is idempotent and ready is never exposed early', async t => {
  const dataDir = await temporary(t), repository = memoryRepository();
  await repository.create('session_test'); repository.commitFailures = 1;
  let now = 0;
  const queue = new UploadQueue({ dataDir, repository, now: () => now }); await queue.init();
  const job = await enqueueFixture(queue); await queue.runOnce();
  assert.equal((await repository.get('session_test')).status, 'queued');
  assert.equal((await repository.get('session_test')).media_url, null);
  now = 2000; await queue.runOnce();
  assert.equal(queue.jobs.get(job.id).status, 'completed');
  assert.equal(repository.uploads[0], repository.uploads[1]);
});

test('a crash after ready was committed does not reupload or reset the session', async t => {
  const dataDir = await temporary(t), repository = memoryRepository();
  await repository.create('session_test');
  let queue = new UploadQueue({ dataDir, repository }); await queue.init();
  const job = await enqueueFixture(queue);
  await queue.persist({ ...job, status: 'uploading', attempts: 1 });
  await repository.setStatus('session_test', 'ready', 'https://storage.example/committed.png');
  queue = new UploadQueue({ dataDir, repository }); await queue.init();
  await queue.runOnce();
  assert.equal(queue.jobs.get(job.id).status, 'completed');
  assert.equal(repository.uploads.length, 0);
});

test('only one durable upload can be accepted for the same session', async t => {
  const dataDir = await temporary(t), repository = memoryRepository();
  const queue = new UploadQueue({ dataDir, repository }); await queue.init();
  const results = await Promise.allSettled([enqueueFixture(queue), enqueueFixture(queue)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(queue.jobs.size, 1);
});
