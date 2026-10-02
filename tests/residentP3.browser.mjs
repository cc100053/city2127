// P3 desktop timing/recovery check; fresh scratch SQLite, installed Chrome/Playwright, existing root preview.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createContext, createSurveyServer } from '../survey/src/server/server.ts';
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH).href);
const directory = mkdtempSync(join(tmpdir(), 'resident-p3-browser-'));
const evidence = process.env.CITY2127_EVIDENCE_DIR ?? 'artifacts';
mkdirSync(evidence, { recursive: true });
const ctx = createContext({ dbPath: join(directory, 'survey.sqlite'),
  questionsPath: new URL('../survey/src/survey/questions.exhibition.json', import.meta.url).pathname });
const { server, realtime } = createSurveyServer({ ctx, staticDir: new URL('../survey/dist', import.meta.url).pathname });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const survey = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const options = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };
const ca = await browser.newContext(options), cb = await browser.newContext(options), cd = await browser.newContext(options);
const a = await ca.newPage(), b = await cb.newPage(), city = await cd.newPage(), admin = await cd.newPage();
const errors = [];
for (const page of [a, b, city, admin]) page.on('pageerror', error => errors.push(error.message));
admin.on('dialog', dialog => dialog.accept());
const read = async path => (await (await cd.request.get(survey + path)).json()).data;
const screen = (page, name) => page.waitForFunction(name => document.querySelector('#app')?.dataset.screen === name, name);
const identity = p => `ステーション ${p.stationId} · 暮らしの声 #${p.ordinal}`;
const label = () => city.locator('.causal-panel section .causal-context').textContent();
const snapshot = async () => {
  const view = await read('/api/city-view');
  await city.waitForFunction(v => {
    const d = JSON.parse(document.querySelector('canvas')?.dataset.siteAssets ?? '{}');
    return document.querySelector('.causal-panel')?.dataset.guestCount === String(v.guestCount)
      && d.magnetEast?.automationHub?.visibleAutomatedPorts === v.layout.automatedPorts
      && d.stationEastPark?.environmentPark?.visibleTreeCount === v.layout.treeCount;
  }, view);
  return view;
};
async function answer(page, index) {
  await page.locator('[data-auto-action=start]').click();
  for (let i = 0; i < 4; i++) { await page.locator('input[type=radio]').nth(index).check(); await page.locator('[data-auto-action=next]').click(); }
}
try {
  await a.goto(survey + '/guest?station=A'); await b.goto(survey + '/guest?station=B'); await admin.goto(survey + '/admin');
  await city.goto(`${process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5173'}/?survey=${encodeURIComponent(survey.replace('http', 'ws') + '/ws')}&hour=16`);
  await snapshot();
  await city.evaluate(() => {
    window.residentDisplays = [];
    new MutationObserver(() => {
      const p = document.querySelector('.causal-panel'), name = p.querySelector('section .causal-context')?.textContent;
      if (p.dataset.presentation === 'result' && name !== window.residentDisplays.at(-1)?.name)
        window.residentDisplays.push({ name, at: performance.now() });
    }).observe(document.querySelector('.causal-panel'), { subtree: true, childList: true });
  });
  await Promise.all([answer(a, 2), answer(b, 0)]);
  const responseA = a.waitForResponse(r => r.url().endsWith('/api/proposals') && r.request().method() === 'POST');
  await a.locator('[data-auto-action=submit]').click();
  const savedA = (await (await responseA).json()).data;
  await screen(a, 'result');
  assert.equal(await label(), identity(savedA.proposal));
  assert.equal(await city.locator('.resident-card-copy').textContent(), '街の画面をご覧ください。');
  // Lose B's reply after commit; reload retains exact request and resumes the same scheduled slot.
  await b.route('**/api/proposals', async route => { await route.fetch(); await route.abort('failed'); }, { times: 1 });
  await b.locator('[data-auto-action=submit]').click(); await b.getByRole('button', { name: '記録を確認する' }).waitFor();
  await b.reload(); await screen(b, 'waiting');
  const view = await read('/api/city-view'), savedB = view.latestProposal;
  assert.equal(view.guestCount, 2);
  assert.equal(Date.parse(savedB.displayAt) - Date.parse(savedA.proposal.displayAt), 10_000);
  assert.equal(await b.locator('.guest-result-number').textContent(), identity(savedB));
  // Early device handoff cannot release A or truncate its live card.
  await a.getByRole('button', { name: '次の方へ', exact: true }).click();
  await a.getByRole('button', { name: 'はじめる画面へ', exact: true }).click();
  await screen(a, 'handoff');
  assert.equal((await read('/api/admin/current-run')).stations.length, 2);
  await admin.getByRole('button', { name: '現在の都市をリセット', exact: true }).click();
  assert.equal((await read('/api/admin/current-run')).lifecycle.pendingReset, 'city');
  await admin.getByRole('button', { name: '夜', exact: true }).click();
  await city.waitForFunction(() => document.querySelector('.resident-card-copy')?.textContent.includes('あなたは'));
  assert.equal(await label(), identity(savedA.proposal), 'lighting leaves the live reading card and pending B intact');
  await city.screenshot({ path: join(evidence, 'resident-p3-city-A-reason.png') });
  await b.screenshot({ path: join(evidence, 'resident-p3-guest-B-waiting.png') });
  await screen(b, 'result');
  await city.waitForFunction(expected => document.querySelector('.causal-panel section .causal-context')?.textContent === expected, identity(savedB));
  assert.equal(await label(), identity(savedB));
  const displays = await city.evaluate(() => window.residentDisplays);
  const interval = displays[1].at - displays[0].at;
  assert.ok(interval >= 9950 && interval < 11_000, `${interval} ms reading interval`);
  await b.waitForTimeout(3300);
  await snapshot();
  const replayReply = b.waitForResponse(r => r.url().endsWith('/api/proposals'));
  await b.reload(); await screen(b, 'result');
  const replay = (await (await replayReply).json()).data;
  assert.ok(replay.displayRemainingMs > 0 && replay.displayRemainingMs < 6700, 'reload resumes remaining reading time');
  assert.equal(await label(), identity(savedB));
  await city.screenshot({ path: join(evidence, 'resident-p3-city-B-reason.png') });
  await b.screenshot({ path: join(evidence, 'resident-p3-guest-B-look-up.png') });
  await b.getByRole('button', { name: '次の方へ', exact: true }).click();
  await b.getByRole('button', { name: 'はじめる画面へ', exact: true }).click();
  assert.equal((await read('/api/city-view')).runId, view.runId, 'reset cannot truncate B reading');
  await city.waitForFunction(() => document.querySelector('.causal-panel')?.dataset.guestCount === '0', null, { timeout: 15_000 });
  assert.equal((await read('/api/admin/current-run')).lifecycle.totalGuestCount, 2);
  assert.equal(await city.locator('.causal-panel').getAttribute('data-presentation'), 'ambient');
  // New proposal followed by reduced motion/reload/Undo: settle immediately, no old text or pulses.
  await screen(a, 'welcome'); await answer(a, 2); await a.locator('[data-auto-action=submit]').click(); await screen(a, 'result');
  await city.emulateMedia({ reducedMotion: 'reduce' });
  await snapshot();
  assert.equal(await city.locator('.causal-panel').getAttribute('data-presentation'), 'ambient');
  await city.reload(); await snapshot();
  assert.equal(await city.locator('.causal-panel').getAttribute('data-presentation'), 'ambient');
  await admin.getByRole('button', { name: '直前の提案を取り消す', exact: true }).click();
  await snapshot();
  assert.equal((await read('/api/city-view')).guestCount, 0);
  await city.waitForTimeout(3300);
  assert.equal(await city.locator('.causal-panel').getAttribute('data-presentation'), 'ambient');
  const pulses = await city.locator('canvas').evaluate(c => Object.values(JSON.parse(c.dataset.siteAssets)).flatMap(d => [d.automationDistrict, d.sharingDistrict, d.environmentDistrict, d.concentrationDistrict]).filter(Boolean).map(d => d.activePulses));
  assert.ok(pulses.every(n => n === 0));
  assert.deepEqual(errors, []);
  console.log(`PASS P3 browser: ${Math.round(interval)} ms ordered reading slots, 3s reason phase, saved B lost-reply/reload counted once, identities, early handoff/reset drain, lighting, reduced motion/reload/Undo immediate recovery; no page exceptions. Chrome1280x720 hour16.`);
} finally {
  await browser.close(); realtime.close(); await new Promise(resolve => server.close(resolve)); ctx.db.close(); rmSync(directory, { recursive: true, force: true });
}
