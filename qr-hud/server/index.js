import { mkdir } from 'node:fs/promises';
import lockfile from 'proper-lockfile';
import { loadConfig } from './config.js';
import { createRepository } from './repository.js';
import { UploadQueue } from './queue.js';
import { createApp } from './app.js';

const config = loadConfig();
await mkdir(config.dataDir, { recursive: true });
let release;
try {
  // A force-killed process can leave its lease for up to 30 seconds.
  release = await lockfile.lock(config.dataDir, { stale: 30000, update: 10000, retries: { retries: 8, minTimeout: 5000, maxTimeout: 5000, factor: 1 } });
} catch {
  console.error('Cannot acquire DATA_DIR lock. Check directory permissions and ensure only one server instance is running.');
  process.exit(1);
}
const repository = config.configured ? createRepository(config) : null;
const queue = new UploadQueue({ ...config, repository });
await queue.init();
const server = createApp({ config, repository, queue }).listen(config.port, config.host, () => {
  console.log(`2127 terminal: http://localhost:${config.port}`);
  console.log(config.configured ? 'Supabase mode · durable upload worker enabled' : 'Demo mode · configure .env and apply the Supabase migration to enable uploads');
});
server.on('error', async error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${config.port} is already in use.` : 'Server failed to start.');
  await release();
  process.exit(1);
});
queue.start();
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close();
  await queue.stop();
  await release();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
