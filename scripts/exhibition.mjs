import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { networkInterfaces } from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24 or newer is required.');
function run(directory, entry, args = []) {
  const result = spawnSync(process.execPath, [resolve(root, directory, entry), ...args], {
    cwd: resolve(root, directory), stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
if (process.argv[2] === 'build') {
  run('.', 'node_modules/typescript/bin/tsc', ['--noEmit']);
  run('.', 'node_modules/vite/bin/vite.js', ['build', '--base=/display/', '--outDir=dist-exhibition']);
  run('survey', 'node_modules/typescript/bin/tsc', ['--noEmit']);
  run('survey', 'node_modules/vite/bin/vite.js', ['build', '--configLoader=native']);
  run('qr-hud', 'node_modules/vite/bin/vite.js', ['build', '--base=/qr/', '--outDir=dist-exhibition']);
} else if (process.argv[2] === 'start') {
  const port = process.env.SURVEY_PORT || '8787';
  console.log(`City display (keep visible on the PC): http://localhost:${port}/display/?survey`);
  console.log(`Questionnaire: http://localhost:${port}/guest`);
  console.log(`Staff controls: http://localhost:${port}/admin`);
  if (!process.env.SURVEY_PUBLIC_URL) {
    console.log('QR links currently use the address used to open the questionnaire. For phone access, set SURVEY_PUBLIC_URL to your Wi-Fi/LAN address.');
    for (const [name, addresses] of Object.entries(networkInterfaces())) for (const ip of addresses || []) {
      if (ip.family === 'IPv4' && !ip.internal) console.log(`  ${name}: http://${ip.address}:${port}`);
    }
  }
  const child = spawn(process.execPath, ['--experimental-strip-types', 'src/server/server.ts'], {
    cwd: resolve(root, 'survey'), stdio: 'inherit',
    env: { ...process.env, SURVEY_HOST: process.env.SURVEY_HOST || '0.0.0.0' },
  });
  child.on('exit', code => process.exit(code || 0));
  process.on('SIGINT', () => child.kill('SIGINT'));
} else console.log('Usage: node scripts/exhibition.mjs build | start');
