import 'dotenv/config';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Trusted producer interface; Supabase keys stay on the application server.
const [sessionId, filename, suppliedId] = process.argv.slice(2);
if (!sessionId || !filename || !process.env.TERMINAL_WRITE_TOKEN || !process.env.APP_PUBLIC_URL) {
  console.error('Usage: node scripts/upload-media.mjs <sessionId> <file> [jobId]\nSet APP_PUBLIC_URL and TERMINAL_WRITE_TOKEN in the environment.');
  process.exit(1);
}
const jobId = suppliedId || randomUUID();
console.log(`Idempotency-Key: ${jobId} (reuse if the request is interrupted)`);
try {
  if ((await stat(filename)).size > 50 * 1024 ** 2) throw new Error('File must be at most 50 MB.');
  const form = new FormData();
  form.append('media', new Blob([await readFile(filename)]), path.basename(filename));
  const response = await fetch(`${process.env.APP_PUBLIC_URL.replace(/\/$/, '')}/api/sessions/${encodeURIComponent(sessionId)}/media`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.TERMINAL_WRITE_TOKEN}`, 'Idempotency-Key': jobId }, body: form, signal: AbortSignal.timeout(180000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`Upload was not confirmed: ${error.message}`);
  process.exitCode = 1;
}
