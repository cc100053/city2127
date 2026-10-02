// P4 missing desktop cases. Scratch DB; real wall time except explicit server lease jumps.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createContext, createSurveyServer } from '../survey/src/server/server.ts';
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH).href);
const directory = mkdtempSync(join(tmpdir(), 'resident-p4-browser-'));
const evidence = process.env.CITY2127_EVIDENCE_DIR ?? 'artifacts';
mkdirSync(evidence, { recursive: true });
let clockOffset = 0;
const ctx = createContext({ dbPath: join(directory, 'survey.sqlite'), now: () => new Date(Date.now() + clockOffset),
  questionsPath: new URL('../survey/src/survey/questions.exhibition.json', import.meta.url).pathname });
const { server, realtime } = createSurveyServer({ ctx, staticDir: new URL('../survey/dist', import.meta.url).pathname });
const cityTransports = new Set();
server.on('upgrade', (request, socket) => {
  if (request.headers.origin === (process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5173')) {
    cityTransports.add(socket); socket.on('close', () => cityTransports.delete(socket));
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const survey = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const options = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };
const input = await browser.newContext({ ...options, hasTouch: true });
const display = await browser.newContext(options);
const guest = await input.newPage(), city = await display.newPage(), admin = await display.newPage();
const exceptions = [], consoleErrors = [], failures = [], badResponses = [];
function observe(page) {
  page.on('pageerror', e => exceptions.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push({ text: m.text(), url: m.location().url }); });
  page.on('requestfailed', r => failures.push({ url: r.url(), error: r.failure()?.errorText }));
  page.on('response', r => { if (r.status() >= 400) badResponses.push({ url: r.url(), status: r.status() }); });
}
for (const page of [guest, city, admin]) observe(page);
admin.on('dialog', d => d.accept());
const read = async path => (await (await display.request.get(survey + path)).json()).data;
const screen = (page, name) => page.waitForFunction(name => document.querySelector('#app')?.dataset.screen === name, name);
async function settled() {
  const view = await read('/api/city-view');
  await city.waitForFunction(v => {
    const d = JSON.parse(document.querySelector('canvas')?.dataset.siteAssets ?? '{}');
    return document.querySelector('.causal-panel')?.dataset.guestCount === String(v.guestCount)
      && d.magnetEast?.automationHub?.visibleAutomatedPorts === v.layout.automatedPorts
      && d.dogenzakaSouth?.commonsPlaza?.visibleSharedSeats === v.layout.sharedSeats
      && d.stationEastPark?.environmentPark?.visibleTreeCount === v.layout.treeCount
      && d.centerGaiRear?.concentrationTower?.activeFunctionModules === v.layout.functionModules;
  }, view);
  return view;
}
async function answer(page, option) {
  await page.locator('[data-auto-action=start]').tap();
  for (let i = 0; i < 4; i++) {
    await page.locator('.guest-choice').nth(option).tap();
    await page.locator('[data-auto-action=next]').tap();
  }
}
try {
  await guest.goto(survey + '/guest'); await admin.goto(survey + '/admin');
  await city.goto(`${process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5173'}/?survey=${encodeURIComponent(survey.replace('http', 'ws') + '/ws')}&hour=16`);
  await settled();
  assert.equal(await city.locator('.resident-card-title').textContent(), 'あなたも、この街の住民です。');
  // Desktop touch events, native keyboard radio, return and review edit without a partial vote.
  await guest.locator('[data-auto-action=start]').tap();
  await screen(guest, 'question');
  assert.ok(await guest.locator('h1').evaluate(e => e === document.activeElement));
  for (let i = 0; i < 4; i++) {
    await guest.locator('input[type=radio]').nth(1).focus(); await guest.keyboard.press('Space');
    assert.ok(await guest.locator('input[type=radio]').nth(1).isChecked());
    assert.equal(await guest.locator('.guest-choice-state').nth(1).evaluate(e => getComputedStyle(e).visibility), 'visible');
    await guest.locator('[data-auto-action=next]').tap();
  }
  await guest.locator('.guest-review-row button').first().tap();
  await guest.locator('input[type=radio]').first().check();
  await guest.locator('[data-auto-action=next]').tap();
  await screen(guest, 'review');
  await guest.locator('.guest-review-row button').first().tap();
  await guest.locator('input[type=radio]').nth(1).check();
  await guest.locator('[data-auto-action=next]').tap();
  assert.equal((await read('/api/city-view')).guestCount, 0);
  await guest.screenshot({ path: join(evidence, 'resident-p4-single-review.png') });
  const requests = [];
  guest.on('request', r => { if (r.url().endsWith('/api/proposals')) requests.push(r.postDataJSON()); });
  await guest.route('**/api/proposals', r => r.abort('failed'), { times: 1 });
  await guest.locator('[data-auto-action=submit]').focus();
  await guest.keyboard.press('Enter');
  await guest.getByText('回答の記録を確認できませんでした。もう一度、確認してください。回答内容はそのまま確認します。', { exact: true }).waitFor();
  await screen(guest, 'review');
  assert.equal((await read('/api/city-view')).guestCount, 0);
  assert.ok(await guest.locator('h1').evaluate(e => e === document.activeElement));
  await guest.screenshot({ path: join(evidence, 'resident-p4-save-retry.png'), fullPage: true });
  await guest.getByRole('button', { name: '記録を確認する', exact: true }).tap();
  await screen(guest, 'result');
  assert.deepEqual(requests[0], requests[1]);
  await city.waitForFunction(() => document.querySelector('.causal-panel')?.dataset.presentation === 'result');
  assert.equal(await city.locator('.causal-panel').getAttribute('data-result-kind'), 'maintained');
  assert.equal(await city.locator('section .causal-context').textContent(), await guest.locator('.guest-result-number').textContent());
  await city.waitForFunction(() => document.querySelector('.resident-card-copy')?.textContent.includes('構成は維持'));
  await city.screenshot({ path: join(evidence, 'resident-p4-maintained-city.png') });
  const inherited = await read('/api/city-view');
  assert.equal(inherited.guestCount, 1);
  await screen(guest, 'welcome');
  await answer(guest, 2);
  assert.deepEqual(await read('/api/city-view'), inherited, 'next guest inherits city before submitting');
  await guest.locator('[data-auto-action=submit]').tap(); await screen(guest, 'result');
  await city.waitForFunction(() => document.querySelector('.causal-panel')?.dataset.presentation === 'result');
  // Real network disconnect during playback immediately settles; reconnect does not replay text.
  const cdp = await display.newCDPSession(city);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  assert.equal(cityTransports.size, 1);
  // Offline emulation blocks new connections but Chrome can retain an existing socket.
  for (const socket of cityTransports) socket.destroy();
  await city.getByText(/サーバー: 切断/).waitFor();
  await settled();
  assert.equal(await city.locator('.causal-panel').getAttribute('data-presentation'), 'ambient');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await city.getByText('サーバー: 接続済み', { exact: true }).waitFor();
  await settled();
  await city.waitForTimeout(3300);
  assert.equal(await city.locator('.causal-panel').getAttribute('data-presentation'), 'ambient');
  await city.screenshot({ path: join(evidence, 'resident-p4-reconnected-city.png') });
  await screen(guest, 'welcome');
  // A closes with a reserved questionnaire; B closes after saving. The server clock jump
  // tests expiry, not visitor reading time. Keep City/Admin live through both expirations.
  const peer = await browser.newContext({ ...options, hasTouch: true });
  const a = await input.newPage(), b = await peer.newPage(); observe(a); observe(b);
  await a.goto(survey + '/guest?station=A'); await b.goto(survey + '/guest?station=B');
  await a.locator('[data-auto-action=start]').tap(); await screen(a, 'question');
  await answer(b, 2); await b.locator('[data-auto-action=submit]').tap(); await screen(b, 'result');
  const beforeExpiry = await read('/api/city-view');
  const reservations = (await read('/api/admin/current-run')).stations;
  const reservedA = reservations.find(s => s.stationId === 'A').sessionId;
  await a.close(); await b.close();
  await admin.getByRole('button', { name: '現在の都市をリセット', exact: true }).click();
  assert.equal((await read('/api/admin/current-run')).lifecycle.pendingReset, 'city');
  clockOffset += 16_000;
  let afterB;
  for (let i = 0; i < 50; i++) {
    afterB = await read('/api/admin/current-run');
    if (afterB.stations.length === 1) break;
    await admin.waitForTimeout(100);
  }
  assert.deepEqual(afterB.stations.map(s => s.stationId), ['A']);
  assert.equal(afterB.stations[0].sessionId, reservedA);
  assert.equal((await read('/api/city-view')).runId, beforeExpiry.runId);
  clockOffset += 300_000;
  await city.waitForFunction(() => document.querySelector('.causal-panel')?.dataset.guestCount === '0');
  const newRun = await settled();
  assert.notEqual(newRun.runId, beforeExpiry.runId);
  const finished = await read('/api/admin/current-run');
  assert.equal(finished.lifecycle.phase, 'ready');
  assert.equal(finished.stations.length, 0);
  assert.equal(finished.lifecycle.totalGuestCount, 3);
  assert.equal(await city.locator('.causal-panel').getAttribute('data-presentation'), 'ambient');
  await city.screenshot({ path: join(evidence, 'resident-p4-expired-reset-city.png') });
  await guest.reload(); await guest.locator('[data-auto-action=start]').tap(); await screen(guest, 'question');
  assert.equal((await read('/api/city-view')).guestCount, 0, 'admission is usable after expiry drain');
  writeFileSync(join(evidence, 'resident-p4-browser.json'), JSON.stringify({ browser: browser.version(), viewport: options,
    checkedBase: process.env.CITY2127_CHECKED_COMMIT, exceptions, consoleErrors, failures, badResponses,
    leaseClockJumpsMs: [16000, 300000], guestCountBeforeReset: beforeExpiry.guestCount }, null, 2) + '\n');
  assert.deepEqual(exceptions, []);
  assert.ok(failures.every(r => r.url.endsWith('/api/proposals') && r.error === 'net::ERR_FAILED'), JSON.stringify(failures));
  assert.ok(badResponses.every(r => r.status === 404 && r.url.endsWith('/favicon.ico')), JSON.stringify(badResponses));
  // Chromium also reports the existing missing favicon; preserve its exact URL separately.
  assert.ok(consoleErrors.every(m => /net::ERR_FAILED|WebSocket.*failed/.test(m.text)
    || (m.url.endsWith('/favicon.ico') && /404/.test(m.text))), JSON.stringify(consoleErrors));
  console.log('PASS P4 browser: desktop keyboard/touch/review, pre-commit failure same-ID retry, maintained result/identity, next guest inheritance, real playback disconnect/reconnect without stale text, offline B result expiry preserves reserved A then A expiry drains reset/admission; no unexpected console/network errors.');
} finally {
  await browser.close(); realtime.close(); server.closeAllConnections();
  await new Promise(resolve => server.close(resolve)); ctx.db.close(); rmSync(directory, { recursive: true, force: true });
}
