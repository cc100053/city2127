// Optional browser acceptance; reuses installed Playwright and a fresh scratch survey DB.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
if (!process.env.CITY2127_PLAYWRIGHT_PATH) throw new Error('Set CITY2127_PLAYWRIGHT_PATH to the installed Playwright index.mjs');
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH).href);
const survey = process.env.CITY2127_SURVEY_URL ?? 'http://127.0.0.1:8795';
const cityURL = process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const guest = await context.newPage(), admin = await context.newPage(), city = await context.newPage(), monitor = await context.newPage();
const errors = [];
for (const page of [guest, admin, city, monitor]) page.on('pageerror', e => errors.push(e.message));
admin.on('dialog', dialog => dialog.accept());
const read = async path => (await (await context.request.get(survey + path)).json()).data;
const undoButton = admin.getByRole('button', { name: '直前の提案を取り消す', exact: true });
async function checkCity(view) {
  await city.waitForFunction(v => {
    const text = document.querySelector('canvas')?.dataset.siteAssets;
    if (!text) return false;
    const d = JSON.parse(text), p = d.stationEastPark.environmentPark, l = v.layout;
    return document.querySelector('.causal-panel')?.dataset.guestCount === String(v.guestCount)
      && d.magnetEast.automationHub?.visibleAutomatedPorts === l.automatedPorts
      && d.dogenzakaSouth.commonsPlaza?.visibleSharedSeats === l.sharedSeats
      && d.centerGaiRear.concentrationTower?.activeFunctionModules === l.functionModules
      && p?.visibleTreeCount === l.treeCount && p?.visibleCoolingFins === l.coolingFins
      && Math.abs(p?.plantedFraction - l.plantedFraction) < 1e-9;
  }, view, { timeout: 30_000 });
}
async function answerAll() {
  await guest.getByRole('button', { name: 'はじめる', exact: true }).click();
  for (let i = 0; i < 4; i++) {
    await guest.locator('input[type=radio]').last().check();
    await guest.locator('[data-auto-action=next]').click();
  }
  await guest.locator('[data-auto-action=submit]').click();
  await guest.waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'result');
}
try {
  const initial = await read('/api/city-view');
  assert.equal(initial.guestCount, 0, 'use a fresh scratch database');
  await guest.goto(`${survey}/guest`);
  await admin.goto(`${survey}/admin`);
  await monitor.goto(`${survey}/monitor`);
  await city.goto(`${cityURL}/?survey=${encodeURIComponent(survey.replace('http', 'ws') + '/ws')}&hour=16`);
  await checkCity(initial);
  await city.screenshot({ path: 'artifacts/resident-p2-admin-undo-city-before.png' });
  assert.equal(await undoButton.isDisabled(), true);
  await answerAll();
  await checkCity(await read('/api/city-view'));
  await undoButton.click();
  await guest.getByText('管理者が直前の提案を取り消し、変更前の街に戻しました。もう一度回答するには「はじめる」を押してください。', { exact: true }).waitFor();
  assert.equal(await guest.locator('#app').getAttribute('data-screen'), 'welcome');
  assert.equal(await guest.evaluate(() => localStorage.getItem('city2127.guest-draft.v2')), null);
  await admin.getByText('#1 · 取り消し済み', { exact: true }).first().waitFor();
  assert.equal(await undoButton.isDisabled(), true);
  assert.deepEqual(await read('/api/city-view'), initial);
  await checkCity(initial);
  await monitor.getByText('管理者が直前の提案を取り消しました。', { exact: true }).waitFor();
  await city.screenshot({ path: 'artifacts/resident-p2-admin-undo-city-restored.png' });
  await admin.screenshot({ path: 'artifacts/resident-p2-admin-undo-admin.png' });
  await city.reload(); await checkCity(initial);
  // A replacement is counted once; next Guest start closes Undo even if staff end that draft.
  await answerAll();
  assert.equal((await read('/api/city-view')).guestCount, 1);
  await undoButton.waitFor({ state: 'visible' });
  await admin.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === '直前の提案を取り消す' && !b.disabled));
  await guest.getByRole('button', { name: '次の方へ', exact: true }).click();
  await guest.getByRole('button', { name: 'はじめる画面へ', exact: true }).click();
  await guest.waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'welcome');
  await guest.getByRole('button', { name: 'はじめる', exact: true }).click();
  await admin.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === '直前の提案を取り消す' && b.disabled));
  const current = await read('/api/admin/current-run');
  assert.equal(current.undoProposal, null);
  await admin.getByRole('button', { name: '未完了の体験を終了', exact: true }).click();
  assert.equal(await undoButton.isDisabled(), true);
  // Recovery cannot replay the revoked submission after reload, even with its exact stored request.
  const revoked = (await read('/api/admin/events')).proposals.find(p => p.undoneAt);
  assert.ok(revoked);
  const response = await context.request.post(survey + '/api/proposals', { data: {
    submissionId: revoked.id, guestSessionId: revoked.guestSessionId, expectedRevision: revoked.revisionBefore,
    answers: revoked.answers.map(({ questionId, optionId }) => ({ questionId, optionId })),
  } });
  assert.equal(response.status(), 409);
  assert.equal((await response.json()).error.code, 'proposal_undone');
  assert.deepEqual(errors, []);
  console.log('PASS browser: native Admin Undo + disabled timing, exact city snapshot/visible sites/reload, Guest cleared result/storage, Monitor, audit, replacement and revoked retry; no page exceptions.');
} finally { await browser.close(); }
