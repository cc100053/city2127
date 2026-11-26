// Frame-exact reel of a DEV resident beat (resident-cinematic skill): one headless Chrome steps the beat clock with
// `window.__residentSeek(t)`, captures every frame (CDP via Playwright), encodes an MP4 with the system ffmpeg, and lays out a
// 0.5 s contact sheet in the same Chrome. Evidence only; publish with scripts/publish-evidence.mjs.
// node scripts/beatReel.mjs [--fps=30] [--from=0] [--to=<beat end>] [--size=1920x1080] [--settle=5] [--keep-frames] <url> <task/round/name>
// A url starting with `?` goes to $CITY2127_URL (default http://127.0.0.1:5173/). The city clock must hold still between
// frames, so a url without `reviewTime` gets `reviewTime=20`: traffic, water and sky are frozen in every reel.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser, newCityPage } from './capture.mjs';
import { evidenceDir } from './evidence.mjs';

const USAGE = 'usage: node scripts/beatReel.mjs [--fps=30] [--from=0] [--to=s] [--size=WxH] [--settle=s] [--keep-frames] <url> <task/round/name>';

export function parseArgs(argv, base = 'http://127.0.0.1:5173/') {
  const opts = { fps: 30, from: 0, to: undefined, width: 1920, height: 1080, settleMs: 5000, keepFrames: false }, rest = [];
  for (const arg of argv) {
    const [key, value] = arg.split('=');
    if (key === '--fps') opts.fps = Number(value);
    else if (key === '--from') opts.from = Number(value);
    else if (key === '--to') opts.to = Number(value);
    else if (key === '--size') [opts.width, opts.height] = value.split('x').map(Number);
    else if (key === '--settle') opts.settleMs = Number(value) * 1000;
    else if (arg === '--keep-frames') opts.keepFrames = true;
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}\n${USAGE}`);
    else rest.push(arg);
  }
  const [url, name] = rest;
  const sizes = [opts.width, opts.height].every(n => Number.isInteger(n) && n > 0 && n % 2 === 0);
  if (rest.length !== 2 || !Number.isInteger(opts.fps) || opts.fps < 2 || opts.fps % 2 || !(opts.from >= 0) || !sizes || !(opts.settleMs >= 0)
    || (opts.to !== undefined && !(opts.to > opts.from))) throw new Error(USAGE);
  if (!/^(https?:\/\/|\?)/.test(url) || name.startsWith('/') || name.split('/').includes('..') || !name.includes('/')) throw new Error(`bad pair: ${url} ${name} (url first, then task/round/name)`);
  const full = new URL(url.startsWith('?') ? new URL(url, base).href : url);
  if (!full.searchParams.has('reviewTime')) full.searchParams.set('reviewTime', '20');
  return { opts, job: { url: full.href, dir: dirname(name), name: basename(name) } };
}

// Integer frame index, never an accumulated step, so frame i always shows t = from + i / fps.
export function frameTimes(from, to, fps) {
  const count = Math.floor((to - from) * fps + 1e-6) + 1;
  return Array.from({ length: count }, (_, i) => ({ i, t: from + i / fps, sheet: (2 * i) % fps === 0 }));
}

async function contactSheet(browser, frames, path, columns = 6) {
  const page = await browser.newPage({ viewport: { width: columns * 320, height: 200 }, deviceScaleFactor: 1 });
  const tiles = frames.map(({ file, t }) => `<figure><img src="data:image/jpeg;base64,${readFileSync(file).toString('base64')}"><figcaption>${t.toFixed(1)} s</figcaption></figure>`).join('');
  await page.setContent(`<style>body{margin:0;background:#111;display:grid;grid-template-columns:repeat(${columns},320px)}figure{margin:0;position:relative}img{width:320px;display:block}figcaption{position:absolute;left:6px;top:4px;padding:1px 6px;border-radius:4px;background:#000a;color:#fff;font:600 15px system-ui}</style>${tiles}`);
  await page.screenshot({ path, type: 'jpeg', quality: 85, fullPage: true });
  await page.close();
}

if (process.argv[2] === '--self-test') {
  const { opts, job } = parseArgs(['--fps=30', '--to=11', '?shot=energy:aoi&hour=12&nopanel', 'aoi-cinematic/r1/old-day'], 'http://127.0.0.1:5173/');
  assert.deepEqual(opts, { fps: 30, from: 0, to: 11, width: 1920, height: 1080, settleMs: 5000, keepFrames: false });
  assert.deepEqual(job, { url: 'http://127.0.0.1:5173/?shot=energy%3Aaoi&hour=12&nopanel=&reviewTime=20', dir: 'aoi-cinematic/r1', name: 'old-day' });
  assert.equal(parseArgs(['http://127.0.0.1:5174/?reviewTime=3', 'a/b']).job.url, 'http://127.0.0.1:5174/?reviewTime=3');
  const times = frameTimes(0, 11, 30);
  assert.equal(times.length, 331);
  assert.equal(times[330].t, 11);
  assert.deepEqual(times.filter(f => f.sheet).map(f => f.t), Array.from({ length: 23 }, (_, k) => k / 2));
  assert.equal(frameTimes(2.4, 2.5, 30).length, 4);
  for (const bad of [[], ['?x'], ['?x', 'day'], ['?x', '../a/b'], ['--fps=25', '?x', 'a/b'], ['--to=0', '?x', 'a/b'], ['--size=1919x1080', '?x', 'a/b'], ['--ui', '?x', 'a/b']]) assert.throws(() => parseArgs(bad), bad.join(' '));
  console.log('beatReel self-test PASS');
} else if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { opts, job } = parseArgs(process.argv.slice(2), process.env.CITY2127_URL);
  const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const source = { commit: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']), dirty: git(['status', '--porcelain', '--untracked-files=no']) !== '' };
  const encoder = execFileSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' }).includes(' libx264 ') ? ['-c:v', 'libx264', '-crf', '18', '-preset', 'slow'] : ['-c:v', 'h264_videotoolbox', '-b:v', '16M'];
  const dir = evidenceDir(job.dir), framesDir = join(dir, `${job.name}-frames`);
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir);
  const browser = await launchBrowser(), errors = [], startedAt = Date.now();
  try {
    const page = await newCityPage(browser, opts, errors);
    await page.goto(job.url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(from => window.__residentSeek?.(from).ready, opts.from, { timeout: 120000, polling: 250 });
    await page.waitForTimeout(opts.settleMs);
    const duration = await page.evaluate(() => window.__residentSeek().duration);
    const to = opts.to ?? duration, sheet = [];
    for (const { i, t, sheet: onSheet } of frameTimes(opts.from, to, opts.fps)) {
      const ready = await page.evaluate(t => new Promise(resolve => {
        window.__residentSeek(t);
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.__residentSeek().ready)));
      }), t);
      if (!ready) throw new Error(`the beat was hidden at ${t.toFixed(3)} s`);
      const file = join(framesDir, `${String(i).padStart(5, '0')}.jpg`);
      // Playwright's CDP screenshot keeps the viewport; a raw CDP session here shrank it to the window (1920 × 993).
      await page.screenshot({ path: file, type: 'jpeg', quality: 95 });
      if (onSheet) sheet.push({ file, t });
    }
    const canvas = await page.evaluate(() => ({ ...document.querySelector('canvas').dataset }));
    const mp4 = join(dir, `${job.name}.mp4`), sheetPath = join(dir, `${job.name}-sheet.jpg`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(opts.fps), '-i', join(framesDir, '%05d.jpg'), ...encoder, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
    await contactSheet(browser, sheet, sheetPath);
    const frameCount = frameTimes(opts.from, to, opts.fps).length;
    writeFileSync(join(dir, `${job.name}.json`), `${JSON.stringify({
      url: job.url, ...source, viewport: { width: opts.width, height: opts.height }, dpr: 1, fps: opts.fps, from: opts.from, to, frames: frameCount,
      beatDuration: duration, sheetStep: .5, clock: `city clock held by reviewTime=${new URL(job.url).searchParams.get('reviewTime')}`,
      encoder: encoder[1], settleMs: opts.settleMs, captureSeconds: Math.round((Date.now() - startedAt) / 1000), capturedAt: new Date().toISOString(),
      pageErrors: errors, canvas, note: 'canvas.fps is the stepped capture rate, not playback FPS',
    }, null, 1)}\n`);
    if (!opts.keepFrames) rmSync(framesDir, { recursive: true });
    console.log(`${mp4}  ${frameCount} frames ${opts.from}–${to} s @ ${opts.fps} fps${source.dirty ? '  (uncommitted changes)' : ''}\n${sheetPath}`);
  } finally { await browser.close(); }
  if (errors.length) console.log(`page errors:\n${[...new Set(errors)].join('\n')}`);
}
