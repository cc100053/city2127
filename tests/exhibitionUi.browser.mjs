import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createContext, createSurveyServer } from '../survey/src/server/server.ts';

const playwrightPath = process.env.CITY2127_PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error('Set CITY2127_PLAYWRIGHT_PATH to the Playwright entry point.');
const { chromium } = await import(pathToFileURL(playwrightPath));
const ctx = createContext({ dbPath: ':memory:', questionsPath: resolve('survey/src/survey/questions.exhibition.json') });
const { server, realtime } = createSurveyServer({ ctx, staticDir: resolve('survey/dist') });
let latestSocket;
server.on('upgrade', (_, socket) => { latestSocket = socket; });
let browser;

try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: process.env.CITY2127_CHROME_PATH, headless: true });
  const errors = [];
  const open = async path => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url + path);
    return page;
  };
  const monitor = await open('/monitor');
  const status = monitor.locator('.monitor-status');
  await status.filter({ hasText: '接続済み' }).waitFor();
  assert.ok(latestSocket, 'monitor opened a real WebSocket');
  latestSocket.destroy();
  await monitor.locator('.monitor-log').getByText('接続が切れました', { exact: true }).waitFor();
  await monitor.locator('.monitor-log').getByText('再接続しました', { exact: true }).waitFor();
  assert.equal(await status.textContent(), '接続済み');

  const idle = await open('/guest?station=A');
  await idle.clock.install();
  await idle.locator('[data-auto-action=start]').click();
  await idle.locator('input[type=radio]').first().waitFor();
  await idle.clock.fastForward(60000);
  await idle.getByText('回答を続けますか？', { exact: true }).waitFor();
  await idle.getByRole('button', { name: '続ける', exact: true }).click();
  assert.equal(await idle.getByText('回答を続けますか？', { exact: true }).count(), 0);
  await idle.clock.fastForward(60000);
  await idle.getByText('回答を続けますか？', { exact: true }).waitFor();
  await idle.clock.fastForward(15000);
  await idle.getByRole('heading', { name: '草稿を終了しました' }).waitFor();

  const guest = await open('/guest?station=B');
  const received = [];
  await guest.route('**/api/proposals', async route => {
    received.push(route.request().postDataJSON());
    if (received.length === 1) {
      const response = await route.fetch();
      assert.equal((await response.json()).ok, true);
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });
  await guest.locator('[data-auto-action=start]').click();
  for (let question = 0; question < 4; question++) {
    await guest.locator('input[type=radio]').first().check();
    await guest.locator('[data-auto-action=next]').click();
  }
  await guest.locator('[data-auto-action=submit]').click();
  await guest.getByText('送信結果を確認できません', { exact: true }).waitFor();
  const retry = guest.getByRole('button', { name: '記録を確認する', exact: true });
  assert.ok(await retry.evaluate(button => button.getBoundingClientRect().bottom <= innerHeight));
  const evidence = process.env.CITY2127_EVIDENCE_DIR;
  if (evidence) {
    mkdirSync(evidence, { recursive: true });
    await guest.screenshot({ path: resolve(evidence, 'guest-retry.png'), animations: 'disabled' });
  }
  await retry.click();
  await guest.locator('.guest-result-number').waitFor();
  assert.equal(received.length, 2);
  assert.deepEqual(received[1], received[0]);
  const state = await (await monitor.request.get(url + '/api/city-view')).json();
  assert.equal(state.data.guestCount, 1);
  await monitor.locator('.monitor-proposal').filter({ hasText: '提案 #1 · ステーション B' }).waitFor();
  assert.equal(await monitor.locator('.monitor-log li[data-kind="proposal"]').count(), 1);
  assert.equal(await monitor.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (evidence) await monitor.screenshot({ path: resolve(evidence, 'monitor.png') });
  assert.deepEqual(errors, []);
  console.log('PASS: real Monitor disconnect, snapshot recovery and proposal timeline. Guest idle recovery, expiry and idempotent lost-response retry. Chrome ' + browser.version());
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
