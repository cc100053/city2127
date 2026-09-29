import path from 'node:path';
import { mkdir, readdir, readFile, writeFile, rename, unlink, stat } from 'node:fs/promises';

const pendingStates = new Set(['queued', 'uploading', 'retry_wait']);
export const validJobId = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);

// One worker per persistent DATA_DIR. Each manifest is atomically replaced.
// A 202 response is sent only after BOTH the payload and manifest are durable.
export class UploadQueue {
  constructor({ dataDir, repository, maxAttempts = 5, retryBaseMs = 2000, queueMaxBytes = 512 * 1024 ** 2, now = Date.now }) {
    this.dataDir = dataDir;
    this.repository = repository;
    this.maxAttempts = maxAttempts;
    this.retryBaseMs = retryBaseMs;
    this.queueMaxBytes = queueMaxBytes;
    this.now = now;
    this.jobs = new Map();
    this.reservations = new Set();
    this.mutating = new Set();
    this.pendingBytes = 0;
    this.busy = false;
  }

  async init() {
    await Promise.all(['jobs', 'files', 'incoming'].map(dir => mkdir(path.join(this.dataDir, dir), { recursive: true })));
    for (const name of await readdir(path.join(this.dataDir, 'jobs'))) {
      if (!name.endsWith('.json')) continue;
      const job = JSON.parse(await readFile(path.join(this.dataDir, 'jobs', name), 'utf8'));
      if (!validJobId(job.id) || name !== `${job.id}.json`) throw new Error('Invalid upload manifest');
      if (job.status === 'uploading') { job.status = 'queued'; job.nextAttemptAt = 0; }
      this.jobs.set(job.id, job);
    }
    // Recover a crash after committing COMPLETE but before deleting the payload.
    for (const job of this.jobs.values()) if (job.status === 'completed') await unlink(this.filePath(job)).catch(() => {});
  }

  filePath(job) { return path.join(this.dataDir, 'files', job.id); }
  async persist(job) {
    const destination = path.join(this.dataDir, 'jobs', `${job.id}.json`);
    await writeFile(`${destination}.tmp`, JSON.stringify(job), { flush: true });
    await rename(`${destination}.tmp`, destination);
    this.jobs.set(job.id, job);
  }
  publicJob(job) {
    const { id, sessionId, status, attempts, nextAttemptAt, createdAt, updatedAt, error, size, mime } = job;
    return { id, sessionId, status, attempts, nextAttemptAt, createdAt, updatedAt, error, size, mime };
  }
  list() { return [...this.jobs.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100).map(job => this.publicJob(job)); }
  findForSession(sessionId) { return [...this.jobs.values()].find(job => job.sessionId === sessionId && job.status !== 'completed'); }
  async enqueue({ id, sessionId, tempPath, size, mime, extension }) {
    if (this.jobs.has(id)) {
      const existing = this.jobs.get(id);
      if (existing.sessionId !== sessionId) throw Object.assign(new Error('このIdempotency-Keyは別のセッションで使用されています。'), { status: 409 });
      return existing;
    }
    if (this.findForSession(sessionId) || this.reservations.has(sessionId) || this.reservations.has(id)) throw Object.assign(new Error('このセッションは受付済みです。元のアップロードを再試行してください。'), { status: 409 });
    const total = [...this.jobs.values()].filter(job => job.status !== 'completed').reduce((sum, job) => sum + job.size, 0);
    if (total + this.pendingBytes + size > this.queueMaxBytes) throw Object.assign(new Error('アップロード待ちの容量が上限に達しました。失敗した送信を先に処理してください。'), { status: 507 });
    const now = this.now();
    const job = { id, sessionId, objectPath: `${sessionId}/${id}.${extension}`, size, mime, status: 'queued', attempts: 0, nextAttemptAt: now, createdAt: now, updatedAt: now, error: null };
    // Reserve synchronously to prevent concurrent enqueues for the same session.
    this.reservations.add(sessionId);
    this.reservations.add(id);
    this.pendingBytes += size;
    try {
      await rename(tempPath, this.filePath(job));
      await persistFile(this.filePath(job));
      await this.persist(job);
      return job;
    } catch (error) {
      this.jobs.delete(id);
      await unlink(this.filePath(job)).catch(() => {});
      throw error;
    } finally {
      this.reservations.delete(sessionId);
      this.reservations.delete(id);
      this.pendingBytes -= size;
    }
  }

  async retry(id) {
    const job = this.jobs.get(id);
    if (!job) throw Object.assign(new Error('アップロードが見つかりません。'), { status: 404 });
    if (this.processingId === id || this.mutating.has(id)) throw Object.assign(new Error('処理中です。しばらくしてからお試しください。'), { status: 409 });
    if (job.status !== 'failed' && job.status !== 'retry_wait') throw Object.assign(new Error('このアップロードは再試行できる状態ではありません。'), { status: 409 });
    this.mutating.add(id);
    try {
      await stat(this.filePath(job));
      const updated = { ...job, status: 'queued', attempts: 0, nextAttemptAt: this.now(), updatedAt: this.now(), error: null, statusSynced: false };
      await this.persist(updated);
      return updated;
    } finally { this.mutating.delete(id); }
  }

  async runOnce() {
    if (this.busy || !this.repository) return;
    this.busy = true;
    try {
      const job = [...this.jobs.values()].find(item => !this.mutating.has(item.id) && pendingStates.has(item.status) && item.nextAttemptAt <= this.now());
      if (!job) {
        const failed = [...this.jobs.values()].find(item => !this.mutating.has(item.id) && item.status === 'failed' && !item.statusSynced);
        if (failed) {
          this.processingId = failed.id;
          try {
            await this.repository.setStatus(failed.sessionId, 'failed');
            await this.persist({ ...failed, statusSynced: true });
          } catch { /* Retry status synchronization on the next worker tick. */ }
        }
        return;
      }
      this.processingId = job.id;
      const active = { ...job, status: 'uploading', attempts: job.attempts + 1, updatedAt: this.now(), error: null };
      await this.persist(active);
      let committed = false;
      try {
        // A previous attempt may have committed ready just before a process crash.
        const record = await this.repository.get(active.sessionId);
        if (!record) throw new Error('Session no longer exists');
        if (record.status !== 'ready') {
          await this.repository.setStatus(active.sessionId, 'uploading');
          // Stable path + upsert makes retries safe after ambiguous network failures.
          const mediaUrl = await this.repository.upload(active, this.filePath(active));
          await this.repository.setStatus(active.sessionId, 'ready', mediaUrl);
        }
        committed = true;
        await this.persist({ ...active, status: 'completed', updatedAt: this.now(), nextAttemptAt: null });
        await unlink(this.filePath(active)).catch(() => {});
      } catch {
        // If local completion persistence fails, do not regress a cloud-ready row.
        // The durable uploading manifest will recover by observing ready next time.
        if (committed) throw new Error('Could not persist upload completion');
        const exhausted = active.attempts >= this.maxAttempts;
        const delay = Math.min(60000, this.retryBaseMs * 2 ** (active.attempts - 1));
        const failed = { ...active, status: exhausted ? 'failed' : 'retry_wait', nextAttemptAt: exhausted ? null : this.now() + delay, updatedAt: this.now(), error: exhausted ? 'アップロードに失敗しました。ファイルは保存済みです。手動で再試行できます。' : '接続またはアップロードに失敗しました。自動で再試行します。', statusSynced: false };
        await this.persist(failed);
        try {
          await this.repository.setStatus(active.sessionId, exhausted ? 'failed' : 'queued');
          if (exhausted) await this.persist({ ...failed, statusSynced: true });
        } catch { /* Local queue remains authoritative until Supabase recovers. */ }
      }
    } finally { this.busy = false; this.processingId = null; }
  }

  start() {
    this.timer = setInterval(() => { this.runOnce().catch(() => console.error('Upload worker could not persist its state; check DATA_DIR.')); }, 1000);
    this.timer.unref();
  }
  async stop() {
    clearInterval(this.timer);
    while (this.busy) await new Promise(resolve => setTimeout(resolve, 50));
  }
}

async function persistFile(filePath) {
  const { open } = await import('node:fs/promises');
  const file = await open(filePath, 'r+');
  try { await file.sync(); } finally { await file.close(); }
}
