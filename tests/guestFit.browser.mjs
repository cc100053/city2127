// Guest fit and link check (2026-11-11), runnable in CI: no 3D city, a fresh temporary database, the real survey server.
// 1. Every Guest screen fits an exhibition iPad in landscape and portrait without scrolling (the handoff panel once ran 45 px over).
// 2. A dropped live socket shows the link banner after the grace period and holds Start; reconnecting clears both.
// 3. Kiosk CSS: no text selection or overscroll on the Guest page.
// Run: build survey/, set CITY2127_PLAYWRIGHT_PATH (and optionally CITY2127_CHROME_PATH), then
//   node --experimental-strip-types tests/guestFit.browser.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = process.cwd();
const evidence = process.env.CITY2127_EVIDENCE_DIR ?? join(tmpdir(), 'guest-fit-evidence');
if (!process.env.CITY2127_PLAYWRIGHT_PATH) throw new Error('Set CITY2127_PLAYWRIGHT_PATH to the installed Playwright entry point.');
const { createContext, createSurveyServer } = await import(pathToFileURL(join(repo, 'survey/src/server/server.ts')));
const { DISPLAY_MS } = await import(pathToFileURL(join(repo, 'survey/src/shared/displayTiming.ts')));
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH));
const temporary = mkdtempSync(join(tmpdir(), 'guest-fit-'));
mkdirSync(evidence, { recursive: true });
const ctx = createContext({ dbPath: join(temporary, 'survey.sqlite'), questionsPath: join(repo, 'survey/src/survey/questions.exhibition.json') });
const { server, realtime } = createSurveyServer({ ctx, staticDir: join(repo, 'survey/dist') });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ ...(process.env.CITY2127_CHROME_PATH ? { executablePath: process.env.CITY2127_CHROME_PATH } : {}), headless: true });
const errors = [];
const checks = [];

const VIEWPORTS = [{ name: 'landscape', width: 1024, height: 900 }, { name: 'portrait', width: 820, height: 1180 }];
const screen = (page, name, timeout = 10_000) => page.waitForFunction(name => document.querySelector('#app')?.dataset.screen === name, name, { timeout });
/** Waits out the entrance animations, then asserts the page does not scroll in either direction. */
async function fits(page, viewport, label) {
  await page.waitForTimeout(1100);
  const size = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth }));
  await page.screenshot({ path: join(evidence, `${viewport.name}-${label}.png`) });
  assert.ok(size.h <= viewport.height, `${viewport.name} ${label}: page is ${size.h}px tall in a ${viewport.height}px screen`);
  assert.ok(size.w <= viewport.width, `${viewport.name} ${label}: page is ${size.w}px wide in a ${viewport.width}px screen`);
}

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url + '/guest');
    await screen(page, 'welcome');
    await fits(page, viewport, 'welcome');
    await page.locator('[data-auto-action=start]').click();
    for (let i = 0; i < 4; i++) {
      await screen(page, 'question');
      // The last option of each question: the energy question has four, the longest cards.
      await page.locator('.guest-choice').last().click();
      await fits(page, viewport, `question-${i + 1}`);
      await page.locator('[data-auto-action=next]').click();
    }
    await screen(page, 'review');
    await fits(page, viewport, 'review');
    await page.locator('[data-auto-action=submit]').click();
    await screen(page, 'result');
    await fits(page, viewport, 'result');
    await screen(page, 'handoff', DISPLAY_MS + 10_000);
    await page.locator('.guest-tendency').waitFor();
    await fits(page, viewport, 'handoff');
    await page.getByRole('button', { name: 'はじめる画面へ', exact: true }).click();
    await screen(page, 'welcome');
    await context.close();
  }
  checks.push('Welcome, four questions, review, result and handoff fit 1024x900 and 820x1180 without scrolling');

  // Link banner: route the live socket so the test can cut it and let it back.
  const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  let cut = false;
  const sockets = new Set();
  await page.routeWebSocket(/\/ws$/, ws => {
    if (cut) { ws.close(); return; }
    sockets.add(ws);
    ws.connectToServer();
  });
  await page.goto(url + '/guest');
  await screen(page, 'welcome');
  const state = () => page.evaluate(() => ({
    banner: !document.querySelector('.guest-link').hidden,
    startDisabled: document.querySelector('[data-auto-action=start]').disabled,
  }));
  await page.waitForTimeout(500);
  assert.deepEqual(await state(), { banner: false, startDisabled: false }, 'connected: no banner, Start enabled');
  cut = true;
  for (const ws of sockets) ws.close();
  await page.waitForTimeout(1200);
  assert.deepEqual(await state(), { banner: false, startDisabled: false }, 'a short drop stays silent');
  await page.locator('.guest-link').waitFor({ state: 'visible', timeout: 6000 });
  assert.equal((await state()).startDisabled, true, 'a lasting drop holds Start');
  await page.screenshot({ path: join(evidence, 'link-down.png') });
  cut = false;
  await page.locator('.guest-link').waitFor({ state: 'hidden', timeout: 15_000 });
  assert.equal((await state()).startDisabled, false, 'reconnecting re-enables Start');
  checks.push('Socket drop: silent under 3 s, then banner and held Start; reconnect clears both');

  const kiosk = await page.evaluate(() => ({
    select: getComputedStyle(document.body).userSelect || getComputedStyle(document.body).webkitUserSelect,
    overscroll: getComputedStyle(document.documentElement).overscrollBehaviorY,
  }));
  assert.equal(kiosk.select, 'none', 'Guest text is not selectable');
  assert.equal(kiosk.overscroll, 'none', 'Guest page does not rubber-band or pull to refresh');
  checks.push('Kiosk CSS: no text selection, no overscroll');
  await context.close();

  assert.deepEqual(errors, [], 'no page errors');
  console.log(JSON.stringify({ status: 'PASS', browser: browser.version(), checks, errors }));
} finally {
  await browser.close(); realtime.close(); server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  ctx.db.close();
  rmSync(temporary, { recursive: true, force: true });
}
