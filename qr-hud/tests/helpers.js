import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=', 'base64');
export async function temporary(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), '2127-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
export function memoryRepository() {
  const records = new Map();
  let count = 0;
  return {
    records, uploads: [], failures: 0, commitFailures: 0,
    async create(id) {
      const record = { id, status: 'queued', proposal_number: ++count, media_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      records.set(id, record); return { ...record };
    },
    async get(id) { const record = records.get(id); return record ? { ...record } : null; },
    async setStatus(id, status, mediaUrl = null) {
      if (status === 'ready' && this.commitFailures-- > 0) throw new Error('Database unavailable');
      const record = records.get(id);
      if (!record) throw new Error('Missing session');
      Object.assign(record, { status, media_url: mediaUrl, updated_at: new Date().toISOString() });
    },
    async upload(job) {
      this.uploads.push(job.objectPath);
      if (this.failures-- > 0) throw new Error('Storage temporarily unavailable');
      return `https://storage.example/${job.objectPath}`;
    },
    async publicSession(record) { return { ...record, media_type: record.status === 'ready' ? 'image/png' : null }; },
  };
}
export async function enqueueFixture(queue, sessionId = 'session_test') {
  const tempPath = path.join(queue.dataDir, 'incoming', randomUUID());
  await writeFile(tempPath, png);
  return queue.enqueue({ id: randomUUID(), sessionId, tempPath, size: png.length, mime: 'image/png', extension: 'png' });
}
