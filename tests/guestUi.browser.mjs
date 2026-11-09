import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = process.cwd();
const evidence = process.env.CITY2127_EVIDENCE_DIR ?? join(tmpdir(), 'guest-ui-evidence');
if (!process.env.CITY2127_PLAYWRIGHT_PATH) throw new Error('Set CITY2127_PLAYWRIGHT_PATH to the installed Playwright entry point.');
const { createContext, createSurveyServer } = await import(pathToFileURL(join(repo, 'survey/src/server/server.ts')));
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH));
const temporary = mkdtempSync(join(tmpdir(), 'guest-ui-'));
mkdirSync(evidence, { recursive: true });
const ctx = createContext({ dbPath: join(temporary, 'survey.sqlite'), questionsPath: join(repo, 'survey/src/survey/questions.exhibition.json') });
const { server, realtime } = createSurveyServer({ ctx, staticDir: join(repo, 'survey/dist') });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ ...(process.env.CITY2127_CHROME_PATH ? { executablePath: process.env.CITY2127_CHROME_PATH } : {}), headless: true });
const input = await browser.newContext({ viewport: { width: 1024, height: 900 }, hasTouch: true });
const errors = [];
input.on('page', page => page.on('pageerror', error => errors.push(error.message)));
const page = await input.newPage();
const screen = (target, name) => target.waitForFunction(name => document.querySelector('#app')?.dataset.screen === name, name);
async function screenshot(name) {
  await page.waitForTimeout(220);
  await page.screenshot({ path: join(evidence, name + '.png'), fullPage: true });
}
const read = async path => (await (await input.request.get(url + path)).json()).data;
async function answer(target) {
  await target.locator('[data-auto-action=start]').click();
  for (let i = 0; i < 4; i++) {
    await screen(target, 'question');
    await target.locator('input[type=radio]').nth(1).check();
    await target.locator('[data-auto-action=next]').click();
  }
  await screen(target, 'review');
}
const checks = [];
try {
  await page.goto(url + '/guest');
  await screen(page, 'welcome');
  assert.equal(await page.locator('button.primary').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(223, 189, 133)');
  assert.equal(await page.locator('button.primary').evaluate(el => getComputedStyle(el).borderRadius), '5px');
  await screenshot('welcome');
  await page.locator('[data-auto-action=start]').click();
  for (let index = 0; index < 4; index++) {
    await screen(page, 'question');
    assert.ok(await page.locator('[data-auto-action=next]').isDisabled());
    const radio = page.locator('input[type=radio]').nth(index === 2 ? 2 : 1);
    await radio.focus(); await page.keyboard.press('Space');
    assert.ok(await radio.isChecked());
    assert.equal(await page.locator('.guest-choice').nth(index === 2 ? 2 : 1).evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(53, 75, 65)');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (index === 2) {
      const cards = await page.locator('.guest-choice').evaluateAll(elements => elements.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
      assert.equal(cards[0].y, cards[1].y);
      assert.ok(cards[1].x > cards[0].x);
      assert.ok(cards[2].y > cards[0].y);
      await screenshot('energy-selected');
    }
    await page.locator('[data-auto-action=next]').click();
  }
  await screen(page, 'review');
  await page.reload(); await screen(page, 'review');
  assert.match(await page.locator('.guest-review-answer').nth(2).textContent(), /空から届く電気/);
  assert.equal((await read('/api/city-view')).guestCount, 0);
  await page.locator('.guest-review-row button').first().click();
  await page.locator('input[type=radio]').first().check();
  await page.locator('[data-auto-action=next]').click();
  await screen(page, 'review');
  assert.match(await page.locator('.guest-review-answer').first().textContent(), /人に相談したい/);
  await screenshot('review');
  checks.push('Four questions, keyboard radio, selected styling, 2x2 energy layout, reload recovery, review editing, no partial vote');
  await page.locator('[data-auto-action=submit]').click();
  await screen(page, 'result');
  assert.equal((await read('/api/city-view')).guestCount, 1);
  await screenshot('result');
  await screen(page, 'handoff');
  await screenshot('handoff');
  const requests = [];
  page.on('request', request => { if (request.url().endsWith('/api/explore')) requests.push(JSON.parse(request.postData())); });
  await page.getByRole('button', { name: '空の環を見る', exact: true }).click();
  await page.getByRole('button', { name: '戻る', exact: true }).waitFor();
  assert.equal(requests.at(-1).target, 'sky-ring');
  await page.getByRole('button', { name: '戻る', exact: true }).click();
  await page.getByRole('button', { name: '軌道エレベーターを見る', exact: true }).waitFor();
  await page.getByRole('button', { name: '軌道エレベーターを見る', exact: true }).click();
  await page.getByRole('button', { name: '戻る', exact: true }).waitFor();
  assert.equal(requests.at(-1).target, 'space-elevator');
  await page.getByRole('button', { name: '戻る', exact: true }).click();
  await page.getByRole('button', { name: 'はじめる画面へ', exact: true }).click();
  await screen(page, 'welcome');
  checks.push('Actual submission recorded once, result/handoff timing, both existing exploration API actions and return, next guest');
  const a = await input.newPage(), b = await input.newPage();
  await a.goto(url + '/guest?station=A'); await b.goto(url + '/guest?station=B');
  await answer(a); await answer(b);
  await a.locator('[data-auto-action=submit]').click();
  await screen(a, 'result');
  await b.locator('[data-auto-action=submit]').click();
  await screen(b, 'waiting');
  assert.match(await b.locator('.guest-station').textContent(), /STATION B/);
  assert.equal((await read('/api/city-view')).guestCount, 3);
  await b.screenshot({ path: join(evidence, 'station-b-waiting.png'), fullPage: true });
  checks.push('Independent A/B drafts, queued B waiting screen and three accumulated proposals');
  const admin = await input.newPage(); await admin.goto(url + '/admin');
  assert.equal(await admin.locator('.guest-frame').count(), 0);
  assert.equal(await admin.locator('body').evaluate(el => el.classList.contains('guest-page')), false);
  assert.equal(await admin.locator('link[rel=stylesheet]').evaluateAll(links => links.some(link => /\/guest-/.test(link.href))), false);
  checks.push('Guest-specific stylesheet absent from Admin');
  assert.deepEqual(errors, []);
  const report = { status: 'PASS', browser: browser.version(), viewport: '1024x900, emulated touch', checks, errors, limitation: 'No physical iPad or shared 3D display was tested.' };
  writeFileSync(join(evidence, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await input.request.dispose(); await input.close();
  await browser.close(); realtime.close(); server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  ctx.db.close(); rmSync(temporary, { recursive: true, force: true });
}
