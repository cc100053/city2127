import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

// DEV-ONLY: remove this launcher or migrate its tooling to Admin before exhibition.
// Each invocation retains a NEW scratch DB for inspection; never uses SURVEY_DB_PATH.
const directory = mkdtempSync(join(tmpdir(), 'city2127-auto-'));
const port = process.env.SURVEY_PORT ?? '8788';
console.log(`Scratch database: ${join(directory, 'survey.sqlite')}`);
console.log(`Guest: http://127.0.0.1:${port}/guest?dev-auto`);
console.log(`City: http://127.0.0.1:5173/?survey=ws://127.0.0.1:${port}/ws`);
const child = spawn(process.execPath, ['--experimental-strip-types', 'src/server/server.ts'], {
  stdio: 'inherit', env: { ...process.env, SURVEY_HOST: '127.0.0.1', SURVEY_PORT: port,
    SURVEY_DB_PATH: join(directory, 'survey.sqlite'), SURVEY_DEV_AUTO: '1' },
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 0; });
