// Fixed city captures into the evidence folder, one browser for the whole batch; closeupSheet.mjs shares the loader.
// npm run capture -- [--size=3200x1800] [--settle=7] [--ui] <url> <task/round/name> [<url> <task/round/name>...]
// A url starting with `?` goes to $CITY2127_URL (default http://127.0.0.1:5173/); a name without .jpg saves PNG.
// Each image gets a .json sidecar: url, commit, dirty tree, viewport, DPR and the canvas diagnostics at capture.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { evidenceDir } from './evidence.mjs';

export async function launchBrowser() {
  const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH ?? '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs').href);
  return chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
}

export async function newCityPage(browser, { width = 1600, height = 900 } = {}, errors = []) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  page.on('pageerror', e => errors.push(e.message));
  return page;
}

// Loads the city, waits for the first 120-frame diagnostics, then lets builds and fades settle before the shot.
export async function captureCity(page, url, path, { settleMs = 7000, hideUi = true } = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.fps, null, { timeout: 90000 });
  if (hideUi) await page.addStyleTag({ content: 'body *:not(canvas):not(:has(canvas)) { visibility: hidden !important }' });
  await page.waitForTimeout(settleMs);
  await page.screenshot({ path, ...(path.endsWith('.jpg') ? { type: 'jpeg', quality: 85 } : {}) });
  return page.evaluate(() => ({ ...document.querySelector('canvas').dataset }));
}

export function parseArgs(argv, base = 'http://127.0.0.1:5173/') {
  const opts = { width: 1600, height: 900, settleMs: 7000, hideUi: true }, rest = [];
  for (const arg of argv) {
    const [key, value] = arg.split('=');
    if (key === '--size') [opts.width, opts.height] = value.split('x').map(Number);
    else if (key === '--settle') opts.settleMs = Number(value) * 1000;
    else if (key === '--ui') opts.hideUi = false;
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`);
    else rest.push(arg);
  }
  if (!rest.length || rest.length % 2 || !(opts.width > 0 && opts.height > 0 && opts.settleMs >= 0)) throw new Error('usage: npm run capture -- [--size=WxH] [--settle=s] [--ui] <url> <task/round/name> ...');
  const jobs = [];
  for (let i = 0; i < rest.length; i += 2) {
    const [url, name] = rest.slice(i, i + 2);
    if (!/^(https?:\/\/|\?)/.test(url) || name.startsWith('/') || name.split('/').includes('..') || !name.includes('/')) throw new Error(`bad pair: ${url} ${name} (url first, then task/name)`);
    jobs.push({ url: url.startsWith('?') ? new URL(url, base).href : url, dir: dirname(name), file: /\.(png|jpg)$/.test(name) ? basename(name) : `${basename(name)}.png` });
  }
  return { opts, jobs };
}

if (process.argv[2] === '--self-test') {
  const { opts, jobs } = parseArgs(['--size=3200x1800', '--settle=10', '?shot=nw:e&hour=12', 'nw/r3/day', 'http://127.0.0.1:5174/?hour=22', 'nw/r3/night.jpg'], 'http://127.0.0.1:5173/');
  assert.deepEqual(opts, { width: 3200, height: 1800, settleMs: 10000, hideUi: true });
  assert.deepEqual(jobs, [
    { url: 'http://127.0.0.1:5173/?shot=nw:e&hour=12', dir: 'nw/r3', file: 'day.png' },
    { url: 'http://127.0.0.1:5174/?hour=22', dir: 'nw/r3', file: 'night.jpg' },
  ]);
  for (const bad of [[], ['?x'], ['nw/day', '?x'], ['?x', 'day'], ['?x', '../day'], ['?x', '/abs/day'], ['--size=0x9', '?x', 'a/b'], ['--zoom', '?x', 'a/b']]) assert.throws(() => parseArgs(bad), bad.join(' '));
  console.log('capture self-test PASS');
} else if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { opts, jobs } = parseArgs(process.argv.slice(2), process.env.CITY2127_URL);
  const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const source = { commit: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']), dirty: git(['status', '--porcelain', '--untracked-files=no']) !== '' };
  const browser = await launchBrowser(), errors = [];
  try {
    const page = await newCityPage(browser, opts, errors);
    for (const job of jobs) {
      const path = join(evidenceDir(job.dir), job.file), before = errors.length;
      const canvas = await captureCity(page, job.url, path, opts);
      writeFileSync(path.replace(/\.(png|jpg)$/, '.json'), `${JSON.stringify({ url: job.url, ...source, viewport: { width: opts.width, height: opts.height }, dpr: 1, settleMs: opts.settleMs, hideUi: opts.hideUi, capturedAt: new Date().toISOString(), pageErrors: errors.slice(before), canvas }, null, 1)}\n`);
      console.log(`${path}  fps ${canvas.fps}  hour ${canvas.hour}${source.dirty ? '  (uncommitted changes)' : ''}`);
    }
  } finally { await browser.close(); }
  if (errors.length) console.log(`page errors:\n${[...new Set(errors)].join('\n')}`);
}
