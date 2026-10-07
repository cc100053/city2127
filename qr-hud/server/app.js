import express from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { fileTypeFromFile } from 'file-type';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { validJobId } from './queue.js';

const validSession = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);
const sameSecret = (a, b) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export function createApp({ config, repository, queue, distDir = path.resolve('dist') }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  const logins = new Map();
  const cookieName = config.production ? '__Host-terminal' : 'terminal';
  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: config.production, path: '/', maxAge: 8 * 3600000 };
  const getCookie = req => req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  function authorized(req) {
    const bearer = req.get('authorization');
    if (config.operatorToken && bearer?.startsWith('Bearer ') && sameSecret(bearer.slice(7), config.operatorToken)) return true;
    const token = getCookie(req);
    const expires = token && logins.get(token);
    if (expires && expires > Date.now()) return true;
    if (token) logins.delete(token);
    return false;
  }
  function requireConfigured(req, res, next) {
    if (!config.configured) return res.status(503).json({ error: 'ただいま準備中です。スタッフにお声がけください。', code: 'NOT_CONFIGURED' });
    next();
  }
  function requireOperator(req, res, next) {
    if (!authorized(req)) return res.status(401).json({ error: 'スタッフ用アカウントでログインしてください。' });
    next();
  }
  app.use('/api', (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      const developmentOrigins = config.production ? [] : [`http://${req.get('host')}`, 'http://localhost:5173', 'http://127.0.0.1:5173'];
      if (origin && ![config.publicUrl, ...developmentOrigins].includes(origin)) return res.status(403).json({ error: 'このアクセス元からの操作は許可されていません。' });
    }
    next();
  });
  app.use(express.json({ limit: '8kb' }));
  app.get('/api/health', (req, res) => res.json({ ok: true, configured: config.configured }));
  app.get('/api/config', (req, res) => res.json({ configured: config.configured, authenticated: authorized(req), publicBaseUrl: config.publicUrl, maxUploadBytes: config.uploadMaxBytes }));
  app.post('/api/operator/login', rateLimit({ windowMs: 10 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'ログイン試行回数が上限に達しました。しばらくしてからお試しください。' } }), requireConfigured, (req, res) => {
    const token = req.body?.token;
    if (typeof token !== 'string' || !sameSecret(token, config.operatorToken)) return res.status(401).json({ error: 'パスワードが正しくありません。' });
    for (const [key, expires] of logins) if (expires < Date.now()) logins.delete(key);
    const login = randomBytes(32).toString('hex');
    logins.set(login, Date.now() + cookieOptions.maxAge);
    res.cookie(cookieName, login, cookieOptions).json({ ok: true });
  });
  app.post('/api/operator/logout', (req, res) => {
    logins.delete(getCookie(req));
    res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined }).json({ ok: true });
  });

  app.post('/api/sessions', requireConfigured, requireOperator, async (req, res) => {
    const record = await repository.create(`session_${randomBytes(12).toString('hex')}`);
    res.status(201).json({ ...record, city_url: `${config.publicUrl}/city/${record.id}` });
  });
  app.get('/api/sessions/:id', requireConfigured, async (req, res) => {
    if (!validSession(req.params.id)) return res.status(400).json({ error: 'セッションIDの形式が正しくありません。' });
    const record = await repository.get(req.params.id);
    if (!record) return res.status(404).json({ error: 'このアーカイブは見つかりません。' });
    res.json(await repository.publicSession(record));
  });
  app.get('/api/uploads', requireConfigured, requireOperator, (req, res) => res.json({ jobs: queue.list() }));
  app.post('/api/uploads/:id/retry', requireConfigured, requireOperator, async (req, res) => {
    if (!validJobId(req.params.id)) return res.status(400).json({ error: 'アップロードIDの形式が正しくありません。' });
    const job = await queue.retry(req.params.id);
    res.status(202).json(queue.publicJob(job));
  });
  const receive = multer({
    dest: path.join(config.dataDir, 'incoming'),
    limits: { fileSize: config.uploadMaxBytes, files: 1, fields: 0, parts: 1 },
  }).single('media');
  app.post('/api/sessions/:id/media', requireConfigured, requireOperator, async (req, res, next) => {
    if (!validSession(req.params.id) || !validJobId(req.get('idempotency-key'))) return res.status(400).json({ error: '有効なセッションIDとUUID v4のIdempotency-Keyを指定してください。' });
    const existing = queue.jobs.get(req.get('idempotency-key'));
    if (existing) {
      if (existing.sessionId !== req.params.id) return res.status(409).json({ error: 'このIdempotency-Keyは別のセッションで使用されています。' });
      return res.status(202).json(queue.publicJob(existing));
    }
    const record = await repository.get(req.params.id);
    if (!record) return res.status(404).json({ error: 'このアーカイブは見つかりません。' });
    if (record.status === 'ready') return res.status(409).json({ error: 'このアーカイブは完成しています。新しいセッションを作成してください。' });
    const active = queue.findForSession(req.params.id);
    if (active) return res.status(409).json({ error: 'このセッションは受付済みです。一覧の再試行ボタンを使用してください。' });
    next();
  }, receive, async (req, res) => {
    if (!req.file) return res.status(400).json({ error: '画像またはMP4ファイルを選択してください。' });
    try {
      const type = await fileTypeFromFile(req.file.path);
      if (!type || !supportedTypes.has(type.mime)) return res.status(415).json({ error: '有効なJPEG・PNG・WebP・MP4ファイルを選択してください。' });
      const job = await queue.enqueue({ id: req.get('idempotency-key'), sessionId: req.params.id, tempPath: req.file.path, size: req.file.size, mime: type.mime, extension: type.ext });
      res.status(202).json(queue.publicJob(job));
    } finally { await unlink(req.file.path).catch(() => {}); }
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'APIが見つかりません。' }));
  app.use(express.static(distDir, { index: false, dotfiles: 'deny' }));
  app.get(['/', '/city/:sessionId'], (req, res) => {
    res.set({ 'Cache-Control': 'no-cache', 'Referrer-Policy': 'no-referrer' });
    res.sendFile(path.join(distDir, 'index.html'));
  });
  app.use((req, res) => res.status(404).send('404 — Not found'));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof multer.MulterError) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'ファイルサイズが上限を超えています。' : 'アップロード形式が正しくありません。ファイルを1つ選択してください。' });
    const status = Number(error.status);
    if (status >= 400 && status < 500 || status === 507) return res.status(status).json({ error: status === 400 ? 'リクエストの形式が正しくありません。' : error.message });
    // Never expose SDK errors, credentials, signed URLs, or filesystem paths.
    res.status(503).json({ error: 'サービスに接続できません。しばらくしてからお試しください。' });
  });
  return app;
}
