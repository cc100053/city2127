import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createContext, createSurveyServer } from '../survey/src/server/server.ts';

const playwrightPath = process.env.CITY2127_PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error('Set CITY2127_PLAYWRIGHT_PATH to the installed Playwright entry point.');
const { chromium } = await import(pathToFileURL(playwrightPath));
const ctx = createContext({ dbPath: ':memory:', questionsPath: resolve('survey/src/survey/questions.exhibition.json') });
const { server, realtime } = createSurveyServer({ ctx, staticDir: resolve('survey/dist') });
let browser;

try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: process.env.CITY2127_CHROME_PATH, headless: true });
  const admin = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  admin.on('pageerror', error => errors.push(error.message));
  const button = name => admin.getByRole('button', { name, exact: true });
  const read = async path => (await (await admin.request.get(url + path)).json()).data;
  const clickConfirmed = async (name, accept = true) => {
    admin.once('dialog', dialog => accept ? dialog.accept() : dialog.dismiss());
    await button(name).click();
  };

  await admin.goto(url + '/admin');
  await admin.getByText('A・B どちらでもご案内できます。', { exact: true }).waitFor();
  const a = await browser.newPage();
  const b = await browser.newPage();
  await a.goto(url + '/guest?station=A');
  await b.goto(url + '/guest?station=B');
  await a.locator('[data-auto-action=start]').click();
  await admin.getByText('次の方は B ステーションへ', { exact: true }).waitFor();
  assert.equal(await admin.locator('[data-station="A"] .admin-station-status').textContent(), '回答中');
  assert.equal(await admin.locator('[data-station="B"] .admin-station-status').textContent(), '開始できます');
  assert.equal(await button('直前の提案を取り消す').isDisabled(), true);
  assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const endA = button('A の未完了の体験を終了');
  await admin.keyboard.press('Tab');
  assert.equal(await endA.evaluate(element => element === document.activeElement), true);
  const diagnostics = await admin.locator('details table').first().elementHandle();
  await admin.waitForFunction(table => !table.isConnected, diagnostics);
  assert.equal(await endA.evaluate(element => element === document.activeElement), true);
  await diagnostics.dispose();
  const cancelledEnd = admin.waitForEvent('dialog').then(async dialog => {
    assert.match(dialog.message(), /ステーション A/);
    await dialog.dismiss();
  });
  await Promise.all([cancelledEnd, admin.keyboard.press('Enter')]);
  assert.equal(await admin.locator('[data-station="A"] .admin-station-status').textContent(), '回答中');
  const evidence = process.env.CITY2127_EVIDENCE_DIR;
  if (evidence) {
    mkdirSync(evidence, { recursive: true });
    await admin.screenshot({ path: resolve(evidence, 'admin-ab.png') });
  }

  for (const [name, mode] of [['夜', 'night'], ['昼', 'day'], ['自動', 'auto']]) {
    await button(name).click();
    await admin.locator('.admin-light-preview[data-mode="' + mode + '"]').waitFor();
    assert.equal(await button(name).getAttribute('aria-pressed'), 'true');
    assert.equal((await read('/api/admin/current-run')).displayMode, mode);
  }

  await clickConfirmed('現在の都市をリセット', false);
  assert.equal((await read('/api/admin/current-run')).lifecycle.pendingReset, 'none');
  await clickConfirmed('現在の都市をリセット');
  await admin.getByText('新しい体験の受付を停止しています。', { exact: true }).waitFor();
  assert.equal(await admin.locator('[data-station="B"] .admin-station-status').textContent(), '受付停止中');
  assert.equal((await read('/api/admin/current-run')).lifecycle.pendingReset, 'city');
  await b.locator('[data-auto-action=start]').click();
  await b.getByText('このステーションは体験中、またはリセット待ちです。少し待ってから開始してください。', { exact: true }).waitFor();
  await button('保留中のリセットを取り消す').click();
  await admin.getByText('次の方は B ステーションへ', { exact: true }).waitFor();
  assert.equal((await read('/api/admin/current-run')).lifecycle.pendingReset, 'none');

  const runBeforeReset = (await read('/api/admin/current-run')).run.id;
  await clickConfirmed('現在の都市をリセット');
  await admin.getByText('新しい体験の受付を停止しています。', { exact: true }).waitFor();
  assert.equal((await read('/api/admin/current-run')).run.id, runBeforeReset);
  await clickConfirmed('A の未完了の体験を終了');
  await admin.getByText('A・B どちらでもご案内できます。', { exact: true }).waitFor();
  assert.notEqual((await read('/api/admin/current-run')).run.id, runBeforeReset);
  await b.locator('[data-auto-action=start]').click();
  for (let question = 0; question < 4; question++) {
    await b.locator('input[type=radio]').first().check();
    await b.locator('[data-auto-action=next]').click();
  }
  await b.locator('[data-auto-action=submit]').click();
  await admin.locator('[data-station="B"]').getByText('記録済み', { exact: true }).waitFor();
  assert.equal((await read('/api/admin/current-run')).state.guestCount, 1);
  await clickConfirmed('直前の提案を取り消す');
  await admin.getByText('#1 · 取り消し済み · B', { exact: true }).waitFor();
  assert.equal((await read('/api/admin/current-run')).state.guestCount, 0);
  assert.equal(await button('直前の提案を取り消す').isDisabled(), true);
  await admin.locator('summary').click();
  assert.equal(await button('全データを初期化').isDisabled(), true);
  await admin.getByRole('textbox', { name: '全データ初期化の確認' }).fill('全データ初期化');
  assert.equal(await button('全データを初期化').isEnabled(), true);
  assert.deepEqual(errors, []);
  console.log('PASS: Admin UI in Chrome ' + browser.version() + ' (1280×900). A/B availability, keyboard focus across polling, lighting, reset confirmation and cancellation, targeted end, undo and full-reset confirmation gate.');
} finally {
  try {
    await browser?.close();
  } finally {
    realtime.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    ctx.db.close();
  }
}
