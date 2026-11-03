// Publish chosen captures into the committed record layer as JPEG (q85, ≤ 2400 px wide) so artifacts/ stays small (docs/VALIDATION.md, Evidence storage).
// Usage: node scripts/publish-evidence.mjs <artifacts subfolder> <image>...
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const MAX_WIDTH = 2400;
const MAX_BYTES = 4 * 1024 * 1024;

const [folder, ...images] = process.argv.slice(2);
if (!folder || images.length === 0) {
  console.error('usage: node scripts/publish-evidence.mjs <artifacts subfolder> <image>...');
  process.exit(1);
}
const out = join('artifacts', folder);
mkdirSync(out, { recursive: true });
for (const image of images) {
  const dest = join(out, `${basename(image, extname(image))}.jpg`);
  // shortcut: sips is macOS-only (the owner's capture Mac); swap in an image library if captures are published elsewhere.
  const width = Number(execFileSync('sips', ['-g', 'pixelWidth', image], { encoding: 'utf8' }).match(/pixelWidth: (\d+)/)[1]);
  const resize = width > MAX_WIDTH ? ['--resampleWidth', String(MAX_WIDTH)] : [];
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', ...resize, image, '--out', dest], { stdio: 'ignore' });
  const bytes = statSync(dest).size;
  console.log(`${dest} ${(bytes / 1024).toFixed(0)} KB${bytes > MAX_BYTES ? ' — over the 4 MB CI limit, crop or split it' : ''}`);
}
