// Optional browser acceptance for hand mode (M2): drives a full guest run with the DEV-only synthetic hand
// (welcome -> four questions -> review -> submit -> result) against a scratch-DB server on the rotation set.
// Uses an existing Playwright installation, not a repo dependency (same convention as tests/surveyAuto.browser.mjs):
//   npm run build && CITY2127_PLAYWRIGHT_PATH=/path/to/playwright/index.mjs npm run test:hand-browser
// Optional: CITY2127_CHROME_PATH (browser binary), HAND_SHOTS_DIR (saves question/review screenshots).
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
  const hold = (p, pinch = false) => page.evaluate(([x, y, pinch]) => window.__handDev.hold(x, y, pinch), [p.x, p.y, pinch]);
  const release = () => page.evaluate(() => window.__handDev.release());
  const waitFor = async (check, what, timeout = 6000) => {
    for (const end = Date.now() + timeout; Date.now() < end; await sleep(50)) if (await check()) return;
    throw new Error(`timed out waiting for ${what}`);
  };

  // Welcome: the prompt invites a hand; dwell on はじめる starts the session.
  assert.equal(await page.locator('.hand-prompt').textContent(), '画面に手をかざしてください');
  await hold(await center('[data-auto-action="start"]'));
  await waitFor(async () => (await screen()) === 'question', 'first question');

  for (let q = 0; q < 4; q++) {
    const before = await title();
    const count = await page.locator('label.guest-choice').count();
    const target = `label.guest-choice:nth-of-type(${(q % count) + 1})`;
    await release(); await sleep(150); // leave whatever the new screen put under the cursor
    const p = await center(target);
    if (q % 2 === 1) { await hold(p); await sleep(250); await hold(p, true); } // pinch
    else await hold(p); // dwell 1 s
    if (q === 0 && shots) { await sleep(550); await page.screenshot({ path: join(shots, 'hand-question.png') }); }
    await waitFor(async () => (await page.locator(`${target} input`).isChecked()), `question ${q + 1} choice`, 3000);
    // Auto-advance: next question (or review) without touching 次へ.
    await waitFor(async () => (await screen()) === 'review' || (await title()) !== before, `advance after question ${q + 1}`, 3000);
  }
  assert.equal(await screen(), 'review');
  await release(); await sleep(150);
  // Dwell on the large submit button records the proposal.
  await hold(await center('[data-auto-action="submit"]'));
  if (shots) { await sleep(450); await page.screenshot({ path: join(shots, 'hand-review.png') }); }
  await waitFor(async () => ['submitting', 'waiting', 'result', 'handoff'].includes(await screen()), 'submit', 6000);
  await waitFor(async () => ['waiting', 'result', 'handoff'].includes(await screen()), 'result', 10_000);
  const stats = await page.evaluate(() => window.__handDev.state());
  assert.ok(stats.dwell >= 3 && stats.pinch >= 2, `dwell ${stats.dwell}, pinch ${stats.pinch}`);
  const city = await (await fetch(`${base}/api/city-state`)).json();
  assert.equal(city.data.guestCount, 1, 'one proposal recorded');
  assert.deepEqual(errors, []);
  console.log(`PASS hand guest run: welcome -> 4 questions -> review -> ${await screen()} (dwell ${stats.dwell}, pinch ${stats.pinch})`);
} finally {
  await browser.close();
  server.kill();
}
