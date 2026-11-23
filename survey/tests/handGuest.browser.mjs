// Optional browser acceptance for hand mode (M2): drives a full guest run with the DEV-only synthetic hand
// (住民の窓: 住民登録 palm scan + pinch -> four hologram question cards by pinch -> M3 review -> submit -> look-up -> handoff) against a scratch-DB server on the rotation set.
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
  page.on('pageerror', error => errors.push(String(error.stack ?? error.message).split('\n').slice(0, 3).join(' | ')));

  // Without ?hand neither the hand layer, the 住民の窓 stage nor its card images load.
  const images = [];
  page.on('request', request => { if (/\.webp(\?|$)/.test(request.url())) images.push(request.url()); });
  await page.goto(`${base}/guest?station=A`);
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'welcome');
  await sleep(500);
  assert.equal(await page.locator('.hand-layer, .holo').count(), 0, 'no hand layer or stage without ?hand');
  assert.deepEqual(images, [], 'no card images without ?hand');

  // A stale draft from an earlier run (its session unknown to this server) must not trap the hand kiosk: back to 住民登録.
  await page.evaluate(() => {
    const q = id => ({ id, text: id, options: [{ id: 'A', label: 'a' }, { id: 'B', label: 'b' }, { id: 'C', label: 'c' }] });
    localStorage.setItem('city2127.guest-draft.v2.A', JSON.stringify({
      session: { session: { id: 'gone-session' }, questions: ['Q01', 'Q02', 'Q03', 'Q04'].map(q),
        state: { revision: 0, scores: { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 } } },
      choices: [['Q01', 'A']], questionIndex: 1, screen: 'question' }));
  });
  await page.goto(`${base}/guest?station=A&hand&dev-hand`);
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'welcome' && '__handDev' in window);
  const screen = () => page.evaluate(() => document.querySelector('#app').dataset.screen);
  const title = () => page.evaluate(() => document.querySelector('#app h1')?.textContent ?? '');
  const center = selector => page.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, selector);
  const fromStage = (x, y) => page.evaluate(([x, y]) => window.__handDev.fromStage(x, y), [x, y]);
  const hold = (p, pose = 'palm', pinch = false) => page.evaluate(([x, y, pose, pinch]) => window.__handDev.hold(x, y, { pose, pinch }), [p.x, p.y, pose, pinch]);
  const release = () => page.evaluate(() => window.__handDev.release());
  const state = () => page.evaluate(() => window.__handDev.state());
  const holo = async () => (await state()).holo ?? {};
  const shot = async name => { if (shots) await page.screenshot({ path: join(shots, `${name}.png`) }); };
  const waitFor = async (check, what, timeout = 6000) => {
    for (const end = Date.now() + timeout; Date.now() < end; await sleep(50)) if (await check()) return;
    throw new Error(`timed out waiting for ${what}`);
  };
  /** Open palm on p, then close the pinch (a fresh closing edge) and open again. */
  const pinchAt = async p => { await hold(p, 'palm'); await sleep(300); await hold(p, 'palm', true); await sleep(150); await hold(p, 'palm'); };
  const ring = await fromStage(320, 410);

  // Page 1 住民登録: a fist or a pinch before the scan does nothing; a 4 s open palm scans, locks and releases, then a pinch registers.
  await waitFor(async () => (await holo()).page === 'register' && (await holo()).phase === 'idle', 'registration stage');
  assert.equal(await page.locator('#app').evaluate(el => getComputedStyle(el).visibility), 'hidden', 'page DOM hidden under the stage');
  await shot('01-register-idle');
  await hold(ring, 'rest'); await sleep(400); await hold(ring, 'rest', true); await sleep(300);
  assert.equal((await holo()).phase, 'idle', 'a fist and a pinch do not register');
  await hold(ring, 'palm'); await sleep(1500);
  assert.equal((await holo()).phase, 'charge');
  await hold(ring, 'palm', true); await sleep(150); await hold(ring, 'palm');
  assert.equal((await holo()).phase, 'charge', 'a pinch during the scan does not register');
  await waitFor(async () => (await holo()).phase === 'ready', 'scan, lock and release', 8000);
  await shot('04-register-ready');
  await hold(ring, 'palm', true); await sleep(150);
  await waitFor(async () => (await holo()).phase === 'registered', 'registered', 2000);
  await hold(ring, 'palm');
  await sleep(600); await shot('05-registered');
  await release();
  await waitFor(async () => (await screen()) === 'question' && (await holo()).page === 'question', 'first question after registration', 6000);

  // Page 2: four questions picked by pinch through the hologram cards.
  for (let q = 0; q < 4; q++) {
    const before = await title();
    const index = q % 3;
    const card = `.p2-card[data-i="${index}"]`;
    const input = page.locator('.guest-choice input').nth(index);
    const p = await center(card);
    assert.equal((await holo()).locked, true, `question ${q + 1} read lock`);
    if (q === 0) { await sleep(450); await shot('06-cards-build-in'); }
    await pinchAt(p);
    assert.equal(await input.isChecked(), false, 'pinch during the read lock ignored');
    await waitFor(async () => (await holo()).locked === false, 'read lock end', 3000);
    if (q === 0) {
      // A palm already on a card previews it as soon as the read lock ends (no move-off rule, rex 2026-11-23).
      await sleep(300);
      assert.equal((await holo()).hover, `pick:${index}`, 'preview right after the read lock');
      await hold(p, 'rest'); await sleep(600);
      assert.equal(await page.locator('.hs-cursor.is-gone').count(), 1, 'fist = rest, no cursor');
      await hold(p, 'palm'); await sleep(1500);
      assert.equal((await holo()).hover, `pick:${index}`, 'an open palm previews the card');
      assert.equal(await input.isChecked(), false, 'hovering never selects');
      await shot('07-card-hover');
    }
    await pinchAt(p);
    await waitFor(() => input.isChecked(), `question ${q + 1} pick`, 2000);
    if (q === 0) { await sleep(450); await shot('08-picked-chip'); }
    await waitFor(async () => (await screen()) === 'review' || (await title()) !== before, `advance after question ${q + 1}`, 4000);
  }
  assert.equal(await screen(), 'review');
  await hold(await center('.guest-review-row:nth-of-type(2)'), 'palm'); await sleep(400);
  await shot('10-review');
  await pinchAt(await center('[data-auto-action="submit"]'));
  await release();
  await waitFor(async () => (await state()).lookup === 'look-up', 'look-up screen', 10_000);
  await sleep(800); await shot('11-look-up');
  await waitFor(async () => (await state()).lookup === 'dim', 'dimmed', 6000);
  await sleep(1300); await shot('12-dimmed');
  await waitFor(async () => (await screen()) === 'handoff', 'handoff', 20_000);
  await sleep(500); await shot('13-handoff');
  const stats = await state();
  assert.equal(stats.registered, 1);
  assert.ok(stats.pinch >= 9, `pinch actions ${stats.pinch}`);
  const city = await (await fetch(`${base}/api/city-state`)).json();
  assert.equal(city.data.guestCount, 1, 'one proposal recorded');
  assert.deepEqual(errors, []);
  console.log(`PASS hand guest run: 住民登録 scan -> pinch register -> 4 hologram questions (pinch) -> review -> look-up -> dim -> handoff (pinch ${stats.pinch})`);
} finally {
  await browser.close();
  server.kill();
}
