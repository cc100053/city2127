// Optional browser acceptance for hand mode (M2): drives a full guest run with the DEV-only synthetic hand
// (住民登録 palm scan + pinch -> four questions by pinch -> review -> submit -> look-up -> handoff) against a scratch-DB server on the rotation set.
// Uses an existing Playwright installation, not a repo dependency (same convention as tests/surveyAuto.browser.mjs):
//   npm run build && CITY2127_PLAYWRIGHT_PATH=/path/to/playwright/index.mjs npm run test:hand-browser
// Optional: CITY2127_CHROME_PATH (browser binary), HAND_SHOTS_DIR (saves a screenshot of each hand-mode screen).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

if (!process.env.CITY2127_PLAYWRIGHT_PATH) throw new Error('Set CITY2127_PLAYWRIGHT_PATH to the installed Playwright index.mjs');
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH).href);
const surveyDir = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.HAND_TEST_PORT ?? 8796), base = `http://127.0.0.1:${port}`;
const shots = process.env.HAND_SHOTS_DIR;
if (shots) mkdirSync(shots, { recursive: true });

const server = spawn(process.execPath, ['--experimental-strip-types', 'src/server/server.ts'], {
  cwd: surveyDir, stdio: ['ignore', 'pipe', 'inherit'],
  env: { ...process.env, SURVEY_PORT: String(port), SURVEY_HOST: '127.0.0.1', SURVEY_DB_PATH: join(mkdtempSync(join(tmpdir(), 'hand-guest-')), 'survey.sqlite'),
    SURVEY_QUESTIONS: 'src/survey/questions.rotation.v1.json', SURVEY_DEV_HAND: '', SURVEY_TLS_CERT: '', SURVEY_TLS_KEY: '' },
});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
for (let i = 0; ; i++) {
  try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* starting */ }
  if (i > 100) throw new Error('survey server did not start');
  await sleep(100);
}

const launch = process.env.CITY2127_CHROME_PATH ? { executablePath: process.env.CITY2127_CHROME_PATH } : {};
const browser = await chromium.launch({ ...launch, headless: true });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1180, height: 746 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));

  // Without ?hand the hand layer never loads.
  await page.goto(`${base}/guest?station=A`);
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'welcome');
  await sleep(500);
  assert.equal(await page.locator('.hand-layer').count(), 0, 'no hand layer without ?hand');

  await page.goto(`${base}/guest?station=A&hand&dev-hand`);
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'welcome' && '__handDev' in window);
  const screen = () => page.evaluate(() => document.querySelector('#app').dataset.screen);
  const title = () => page.evaluate(() => document.querySelector('#app h1')?.textContent ?? '');
  const center = selector => page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, selector);
  const hold = (p, pose = 'point', pinch = false) => page.evaluate(([x, y, pose, pinch]) => window.__handDev.hold(x, y, { pose, pinch }), [p.x, p.y, pose, pinch]);
  const release = () => page.evaluate(() => window.__handDev.release());
  const state = () => page.evaluate(() => window.__handDev.state());
  const shot = async name => { if (shots) await page.screenshot({ path: join(shots, `${name}.png`) }); };
  const hasCursor = () => page.evaluate(() => document.querySelector('.hand-layer').classList.contains('has-cursor'));
  const waitFor = async (check, what, timeout = 6000) => {
    for (const end = Date.now() + timeout; Date.now() < end; await sleep(50)) if (await check()) return;
    throw new Error(`timed out waiting for ${what}`);
  };
  /** Point at p, open, then close the pinch (a fresh closing edge from the pointing pose). */
  const pinchAt = async p => { await hold(p, 'point'); await sleep(300); await hold(p, 'point', true); await sleep(150); await hold(p, 'point'); };
  const mid = { x: 590, y: 420 };

  // Welcome = 住民登録: a pointing finger or a pinch does nothing; an open palm scans, then a pinch registers.
  await waitFor(async () => (await state()).welcome === 'idle', 'registration overlay');
  await shot('01-welcome-idle');
  await hold(mid, 'point'); await sleep(400); await pinchAt(mid); await sleep(300);
  assert.equal((await state()).welcome, 'idle', 'pointing and pinching do not register');
  await hold(mid, 'palm'); await sleep(800);
  assert.equal((await state()).welcome, 'scanning');
  await shot('02-welcome-scanning');
  await waitFor(async () => (await state()).welcome === 'pinch', 'scan complete', 3000);
  await shot('03-welcome-pinch');
  await hold(mid, 'palm', true); await sleep(150);
  await waitFor(async () => (await state()).welcome === 'registered', 'registered', 2000);
  await release();
  await shot('04-registered');
  await waitFor(async () => (await screen()) === 'question', 'first question after registration', 6000);

  for (let q = 0; q < 4; q++) {
    const before = await title();
    const count = await page.locator('label.guest-choice').count();
    const target = `label.guest-choice:nth-of-type(${(q % count) + 1})`;
    const p = await center(target);
    // Read lock first; pinching during it does nothing.
    await waitFor(async () => (await page.locator('.hand-readlock').count()) === 1, `question ${q + 1} read lock`, 500);
    if (q === 0) { await sleep(450); await shot('05-question-read-lock'); }
    await pinchAt(p);
    assert.equal(await page.locator(`${target} input`).isChecked(), false, 'pinch during the read lock ignored');
    await waitFor(async () => (await page.locator('.hand-readlock').count()) === 0, 'read lock end', 3000);
    if (q === 0) {
      // Rest: an open palm over a card shows no cursor; a pointing finger previews but never selects by itself.
      await hold(p, 'palm'); await sleep(600);
      assert.equal(await hasCursor(), false, 'open palm = rest, no cursor');
      await hold(p, 'point'); await sleep(2500);
      assert.equal(await hasCursor(), true);
      assert.ok(await page.locator(`${target}.is-hand-hover`).count() === 1, 'pointing previews the card');
      assert.equal(await page.locator(`${target} input`).isChecked(), false, 'hovering never selects');
      await shot('06-question-preview');
    }
    await pinchAt(p);
    await waitFor(async () => page.locator(`${target} input`).isChecked(), `question ${q + 1} pick`, 2000);
    if (q === 0) { await sleep(120); await shot('07-picked'); }
    await waitFor(async () => (await screen()) === 'review' || (await title()) !== before, `advance after question ${q + 1}`, 3000);
  }
  assert.equal(await screen(), 'review');
  await hold(await center('.guest-review-row:nth-of-type(2)'), 'point'); await sleep(400);
  await shot('08-review');
  await pinchAt(await center('[data-auto-action="submit"]'));
  await release();
  await waitFor(async () => (await state()).lookup === 'look-up', 'look-up screen', 10_000);
  await sleep(800); await shot('09-look-up');
  await waitFor(async () => (await state()).lookup === 'dim', 'dimmed', 6000);
  await sleep(1300); await shot('10-dimmed');
  await waitFor(async () => (await screen()) === 'handoff', 'handoff', 20_000);
  await sleep(500); await shot('11-handoff');
  const stats = await state();
  assert.equal(stats.registered, 1);
  assert.ok(stats.pinch >= 5, `pinch actions ${stats.pinch}`);
  const city = await (await fetch(`${base}/api/city-state`)).json();
  assert.equal(city.data.guestCount, 1, 'one proposal recorded');
  assert.deepEqual(errors, []);
  console.log(`PASS hand guest run: palm scan -> pinch register -> 4 questions (pinch) -> review -> look-up -> dim -> handoff (pinch ${stats.pinch})`);
} finally {
  await browser.close();
  server.kill();
}
