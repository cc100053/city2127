// Optional browser acceptance: use an existing Playwright installation, not a new repo dependency.
// Start survey `npm run dev:auto` and root Vite; this check requires a fresh scratch DB.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

if (!process.env.CITY2127_PLAYWRIGHT_PATH) throw new Error('Set CITY2127_PLAYWRIGHT_PATH to the installed Playwright index.mjs');
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH).href);
const survey = process.env.CITY2127_SURVEY_URL ?? 'http://127.0.0.1:8788';
const cityURL = process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: process.env.CITY2127_CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const guest = await context.newPage(), city = await context.newPage();
const errors = [];
for (const page of [guest, city]) page.on('pageerror', error => errors.push(error.message));
const read = async path => (await (await context.request.get(survey + path)).json()).data;
async function checkModel() {
  const view = await read('/api/city-view');
  await city.waitForFunction(layout => {
    const text = document.querySelector('canvas')?.dataset.siteAssets;
    if (!text) return false;
    const d = JSON.parse(text), p = d.stationEastPark.environmentPark;
    return d.magnetEast.automationHub?.visibleAutomatedPorts === layout.automatedPorts
      && d.dogenzakaSouth.commonsPlaza?.visibleSharedSeats === layout.sharedSeats
      && d.centerGaiRear.concentrationTower?.activeFunctionModules === layout.functionModules
      && p?.visibleTreeCount === layout.treeCount && p?.visibleCoolingFins === layout.coolingFins
      && Math.abs(p?.plantedFraction - layout.plantedFraction) < 1e-9
      && d.magnetEast.automationHub?.band === layout.bands.nw && p?.band === layout.bands.ne
      && d.dogenzakaSouth.commonsPlaza?.band === layout.bands.sw && d.centerGaiRear.concentrationTower?.band === layout.bands.se;
  }, view.layout, { timeout: 20_000 });
  return view;
}
try {
  assert.equal((await read('/api/city-view')).revision, 0, 'use a newly launched scratch database');
  await guest.goto(`${survey}/guest`);
  assert.equal(await guest.locator('.dev-auto-panel').count(), 0);
  await city.goto(`${cityURL}/?survey=${encodeURIComponent(survey.replace('http', 'ws') + '/ws')}&hour=12`);
  await guest.goto(`${survey}/guest?dev-auto`);
  await guest.locator('[data-dev-start]').waitFor();
  let expectedCount = 0;
  for (const [profile, count] of [['high', 2], ['low', 4], ['mixed', 2]]) {
    await guest.locator('[data-dev-profile]').selectOption(profile);
    await guest.locator('[data-dev-count]').fill(String(count));
    await guest.locator('[data-dev-start]').click();
    await guest.waitForFunction(() => document.querySelector('[data-dev-status]')?.textContent.includes('完了・退出確認済み'), null, { timeout: count * 20_000 });
    const view = await checkModel();
    expectedCount += count;
    assert.equal(view.guestCount, expectedCount);
    if (profile === 'low') assert.ok(Object.values(view.layout.bands).every(band => band === 'low'));
    assert.equal((await read('/api/admin/current-run')).lifecycle.phase, 'ready');
    await city.screenshot({ path: `artifacts/survey-auto-${profile}-city.png` });
    if (profile === 'high') await guest.screenshot({ path: 'artifacts/survey-auto-guest.png' });
    console.log(`PASS browser ${profile}: ${view.guestCount} proposals, matching actual model diagnostics`, JSON.stringify(view.layout));
  }
  // Stop during the real question flow: no submission and no inferred exit.
  await guest.locator('[data-dev-start]').click();
  await guest.waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'question');
  await guest.locator('[data-dev-stop]').click();
  await guest.waitForFunction(() => !document.querySelector('[data-dev-start]')?.disabled);
  assert.equal((await read('/api/city-view')).guestCount, expectedCount);
  assert.equal((await read('/api/admin/current-run')).lifecycle.phase, 'in_experience');
  // Manual completion remains available after cancelling automation.
  while (await guest.locator('#app').getAttribute('data-screen') === 'question') {
    await guest.locator('input[type=radio]').first().check();
    await guest.locator('[data-auto-action=next]').click();
  }
  await guest.locator('[data-auto-action=submit]').click();
  await guest.waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'result');
  assert.equal((await read('/api/city-view')).guestCount, ++expectedCount);
  assert.equal((await read('/api/admin/current-run')).lifecycle.phase, 'awaiting_exit');
  await checkModel();
  await city.reload(); await checkModel();
  await guest.waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'welcome', null, { timeout: 20_000 });
  const admin = await read('/api/admin/current-run');
  assert.equal((await context.request.post(survey + '/api/admin/lifecycle', { data: { command: 'guest-left', expectedRevision: admin.lifecycle.revision } })).status(), 200);
  // The server commits but the browser loses the response: automation stops, then the
  // same-ID manual retry restores the result without another proposal or inferred exit.
  await guest.route('**/api/proposals', async route => { await route.fetch(); await route.abort('failed'); });
  await guest.locator('[data-dev-count]').fill('1');
  await guest.locator('[data-dev-start]').click();
  await guest.waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'review' && !document.querySelector('[data-dev-start]')?.disabled);
  assert.equal((await read('/api/city-view')).guestCount, ++expectedCount);
  assert.equal((await read('/api/admin/current-run')).lifecycle.phase, 'awaiting_exit');
  await guest.unroute('**/api/proposals');
  await guest.reload();
  await guest.waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'result');
  assert.equal((await read('/api/city-view')).guestCount, expectedCount);
  assert.equal(await guest.locator('[data-dev-status]').textContent(), '待機中', 'reload must not resume automation');
  await checkModel();
  assert.deepEqual(errors, []);
  console.log(`PASS browser normal Guest, eight automatic proposals, final exits, cancel/manual completion, lost-response reload/same-ID recovery (${expectedCount} total), and City reload. No page exceptions.`);
} finally { await browser.close(); }
