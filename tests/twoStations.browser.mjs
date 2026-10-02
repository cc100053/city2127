// Desktop acceptance with two isolated browser clients and a fresh scratch survey DB.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH).href);
const survey = process.env.CITY2127_SURVEY_URL ?? 'http://127.0.0.1:8795';
const cityURL = process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const options = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };
const ca = await browser.newContext(options), cb = await browser.newContext(options), display = await browser.newContext(options);
const a = await ca.newPage(), b = await cb.newPage(), city = await display.newPage(), admin = await display.newPage();
const errors = [];
for (const page of [a, b, city, admin]) page.on('pageerror', error => errors.push(error.message));
admin.on('dialog', dialog => dialog.accept());
const read = async path => (await (await display.request.get(survey + path)).json()).data;
const screen = (page, name) => page.waitForFunction(name => document.querySelector('#app')?.dataset.screen === name, name);
async function answer(page, option = 2) {
  for (let i = 0; i < 4; i++) { await page.locator('input[type=radio]').nth(option).check(); await page.locator('[data-auto-action=next]').click(); }
}
async function start(page) { await page.locator('[data-auto-action=start]').click(); await screen(page, 'question'); }
async function finish(page) {
  await page.getByRole('button', { name: '次の方へ', exact: true }).click();
  await page.getByRole('button', { name: 'はじめる画面へ', exact: true }).click();
  await screen(page, 'welcome');
}
async function checkCity(view) {
  await city.waitForFunction(v => {
    const text = document.querySelector('canvas')?.dataset.siteAssets;
    if (!text) return false;
    const d = JSON.parse(text), p = d.stationEastPark.environmentPark, l = v.layout;
    return document.querySelector('.causal-panel')?.dataset.guestCount === String(v.guestCount)
      && d.magnetEast.automationHub?.visibleAutomatedPorts === l.automatedPorts
      && d.dogenzakaSouth.commonsPlaza?.visibleSharedSeats === l.sharedSeats
      && d.centerGaiRear.concentrationTower?.activeFunctionModules === l.functionModules
      && p?.visibleTreeCount === l.treeCount && p?.visibleCoolingFins === l.coolingFins;
  }, view, { timeout: 30_000 });
}
try {
  const initial = await read('/api/city-view');
  assert.equal(initial.guestCount, 0, 'use a fresh scratch DB');
  await a.goto(survey + '/guest?station=A'); await b.goto(survey + '/guest?station=B');
  await admin.goto(survey + '/admin');
  await city.goto(`${cityURL}/?survey=${encodeURIComponent(survey.replace('http', 'ws') + '/ws')}&hour=16`);
  await checkCity(initial);
  await city.evaluate(() => {
    window.stationDisplays = [];
    new MutationObserver(() => {
      const label = document.querySelector('.causal-panel section .causal-context')?.textContent;
      if (label?.includes('暮らしの声 #') && label !== window.stationDisplays.at(-1)?.label) window.stationDisplays.push({ label, at: performance.now() });
    }).observe(document.querySelector('.causal-panel'), { subtree: true, childList: true });
  });
  await Promise.all([start(a), start(b)]);
  assert.equal((await read('/api/admin/current-run')).stations.length, 2);
  await Promise.all([answer(a), answer(b, 0)]);
  // Lose B's response after the real commit. Reload must reuse its exact pending request.
  await b.route('**/api/proposals', async route => { await route.fetch(); await route.abort('failed'); }, { times: 1 });
  await Promise.all([a.locator('[data-auto-action=submit]').click(), b.locator('[data-auto-action=submit]').click()]);
  await screen(a, 'result'); await b.getByRole('button', { name: '記録を確認する' }).waitFor();
  assert.equal((await read('/api/city-view')).guestCount, 2);
  await b.reload(); await screen(b, 'result');
  const combined = await read('/api/city-view');
  assert.equal(combined.guestCount, 2);
  assert.deepEqual(combined.recentProposals.map(p => p.stationId).sort(), ['A', 'B']);
  const ownA = combined.recentProposals.find(p => p.stationId === 'A'), ownB = combined.recentProposals.find(p => p.stationId === 'B');
  assert.equal(await a.locator('.guest-result-number').textContent(), `ステーション A · 暮らしの声 #${ownA.ordinal}`);
  assert.equal(await b.locator('.guest-result-number').textContent(), `ステーション B · 暮らしの声 #${ownB.ordinal}`);
  await checkCity(combined);
  const displays = await city.evaluate(() => window.stationDisplays);
  assert.deepEqual(displays.slice(0, 2).map(d => d.label), combined.recentProposals.map(p => `ステーション ${p.stationId} · 暮らしの声 #${p.ordinal}`));
  assert.ok(displays[1].at - displays[0].at >= 2950, `separate transitions: ${displays[1].at - displays[0].at} ms`);
  await a.screenshot({ path: 'artifacts/resident-p2-two-stations-a.png' }); await b.screenshot({ path: 'artifacts/resident-p2-two-stations-b.png' });
  await city.screenshot({ path: 'artifacts/resident-p2-two-stations-city.png' });
  await finish(a); await start(a);
  const afterA = await read('/api/admin/current-run');
  assert.equal(afterA.stations.find(s => s.stationId === 'B')?.sessionId, ownB.guestSessionId);
  await a.locator('input[type=radio]').first().check(); await a.locator('[data-auto-action=next]').click();
  await a.reload(); await screen(a, 'question');
  assert.equal(await a.locator('.guest-progress-copy').textContent(), '質問 2 / 4');
  await a.getByRole('button', { name: '前の質問へ' }).click();
  assert.equal(await a.locator('input[type=radio]').first().isChecked(), true);
  // Reset closes admission but never clears the unfinished A draft or B's result.
  await admin.reload();
  const resetReply = admin.waitForResponse(r => r.url().endsWith('/api/admin/lifecycle') && r.request().method() === 'POST');
  await admin.getByRole('button', { name: '現在の都市をリセット', exact: true }).click();
  const resetBody = await (await resetReply).json();
  assert.equal(resetBody.ok, true, JSON.stringify(resetBody));
  assert.equal(resetBody.data.lifecycle.pendingReset, 'city');
  await finish(b);
  await b.locator('[data-auto-action=start]').click();
  assert.equal((await read('/api/admin/current-run')).lifecycle.pendingReset, 'city', 'pending reset survives B handoff');
  await b.getByText('このステーションは体験中、またはリセット待ちです。少し待ってから開始してください。', { exact: true }).waitFor();
  assert.equal((await read('/api/city-view')).runId, combined.runId);
  await answer(a); await a.locator('[data-auto-action=submit]').click(); await screen(a, 'result');
  assert.equal((await read('/api/city-view')).guestCount, 3);
  await a.waitForTimeout(3100); await finish(a);
  await city.waitForFunction(() => document.querySelector('.causal-panel')?.dataset.guestCount === '0');
  assert.notEqual((await read('/api/city-view')).runId, combined.runId);
  assert.equal((await read('/api/admin/current-run')).lifecycle.totalGuestCount, 3);
  await a.waitForTimeout(1100);
  assert.equal((await read('/api/admin/current-run')).lifecycle.phase, 'ready', 'new cycle remains ready after the station timer');
  // Named Admin cancellation leaves the peer's draft usable and Guest sees the cancellation.
  await Promise.all([start(a), start(b)]);
  await Promise.all([answer(a), answer(b)]);
  await admin.getByRole('button', { name: 'A の未完了の体験を終了', exact: true }).click();
  await screen(a, 'abandoned');
  assert.equal(await b.locator('#app').getAttribute('data-screen'), 'review');
  await b.locator('[data-auto-action=submit]').click(); await screen(b, 'result');
  await checkCity(await read('/api/city-view'));
  await admin.screenshot({ path: 'artifacts/resident-p2-two-stations-admin.png' });
  await city.reload(); await checkCity(await read('/api/city-view'));
  assert.deepEqual(errors, []);
  console.log(`PASS browser: two isolated clients, simultaneous submit/lost-response reload counted once, own results, ${Math.round(displays[1].at - displays[0].at)} ms display order, draft reload, independent next Guest, reset draining/admission/counts, targeted Admin cancellation and actual City/reload; no page exceptions.`);
} finally { await browser.close(); }
