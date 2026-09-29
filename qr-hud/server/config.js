import 'dotenv/config';
import path from 'node:path';

function integer(env, name, fallback, min, max) {
  const value = Number(env[name] || fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
  return value;
}

export function loadConfig(env = process.env) {
  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
  const operatorToken = env.TERMINAL_WRITE_TOKEN || '';
  const configured = Boolean(supabaseUrl && supabaseKey && operatorToken);
  if (operatorToken && operatorToken.length < 32) throw new Error('TERMINAL_WRITE_TOKEN must contain at least 32 characters');
  const port = integer(env, 'PORT', 4173, 1, 65535);
  const publicUrl = new URL(env.APP_PUBLIC_URL || `http://localhost:${port}`);
  if (!['http:', 'https:'].includes(publicUrl.protocol) || publicUrl.username || publicUrl.password || publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash) {
    throw new Error('APP_PUBLIC_URL must be an HTTP(S) origin, without a path or credentials');
  }
  const production = env.NODE_ENV === 'production';
  if (production && (!configured || publicUrl.protocol !== 'https:')) {
    throw new Error('Production requires Supabase settings, an operator token, and an HTTPS APP_PUBLIC_URL');
  }
  const bucket = env.SUPABASE_STORAGE_BUCKET || 'session-media';
  if (!/^[a-z0-9-]{1,63}$/.test(bucket)) throw new Error('Invalid SUPABASE_STORAGE_BUCKET');
  return {
    configured, supabaseUrl, supabaseKey, operatorToken, bucket, production,
    publicUrl: publicUrl.origin, port, host: env.HOST || '0.0.0.0',
    dataDir: path.resolve(env.DATA_DIR || '.data'),
    uploadMaxBytes: integer(env, 'UPLOAD_MAX_MB', 50, 1, 50) * 1024 * 1024,
    queueMaxBytes: integer(env, 'QUEUE_MAX_MB', 512, 50, 10240) * 1024 * 1024,
    maxAttempts: integer(env, 'UPLOAD_MAX_ATTEMPTS', 5, 1, 20),
    retryBaseMs: integer(env, 'RETRY_BASE_MS', 2000, 100, 60000),
    signedUrlTtl: integer(env, 'SIGNED_URL_TTL_SECONDS', 3600, 60, 86400),
    trustProxy: env.TRUST_PROXY === '1',
  };
}
