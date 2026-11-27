// node offline/build.mjs  ->  offline/guest-offline.html (one file, no server needed)
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const run = spawnSync(process.execPath, [join(here, '../node_modules/vite/bin/vite.js'), 'build', '--config', join(here, 'vite.config.ts')], { stdio: 'inherit' });
if (run.status) process.exit(run.status);
const dist = join(here, 'dist'), files = readdirSync(dist, { recursive: true }).map(String);
const js = files.find(f => f === 'guest.js'), css = files.find(f => f.endsWith('.css'));
let html = readFileSync(join(dist, 'guest.html'), 'utf8');
html = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/, '').replace(/<link[^>]*rel="stylesheet"[^>]*>/, '');
const inline = (tag, text) => `<${tag}>${text.replaceAll(`</${tag}`, `<\\/${tag}`)}</${tag}>`;
if (css) html = html.replace('</head>', () => inline('style', readFileSync(join(dist, css), 'utf8')) + '</head>');
html = html.replace('</body>', () => inline('script', readFileSync(join(dist, js), 'utf8')) + '</body>');
writeFileSync(join(here, 'guest-offline.html'), html);
console.log('wrote', join(here, 'guest-offline.html'), (html.length / 1e6).toFixed(2), 'MB');
