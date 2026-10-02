// P2 desktop copy/review/focus and pre-upgrade A/B draft recovery on a real scratch SQLite.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createContext, createSurveyServer } from '../survey/src/server/server.ts';
import { createProposalSession } from '../survey/src/server/proposalService.ts';
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH).href);
const directory = mkdtempSync(join(tmpdir(), 'resident-p2-browser-'));
const questionsPath = new URL('../survey/src/survey/questions.exhibition.json', import.meta.url).pathname;
const oldQuestions = JSON.parse(readFileSync(questionsPath, 'utf8'));
oldQuestions.version = 2;
oldQuestions.questions[0].text = 'Previous question copy';
const oldPath = join(directory, 'questions.old.json'), dbPath = join(directory, 'survey.sqlite');
writeFileSync(oldPath, JSON.stringify(oldQuestions));
const old = createContext({ dbPath, questionsPath: oldPath,
  legacyQuestionsPath: new URL('../survey/src/survey/questions.mvp.json', import.meta.url).pathname });
const sessions = ['A', 'B'].map(stationId => {
  const result = createProposalSession(old, { stationId }).response;
  assert.ok(result.ok); return result.data;
});
old.db.close();
const ctx = createContext({ dbPath, questionsPath });
const { server, realtime } = createSurveyServer({ ctx, staticDir: new URL('../survey/dist', import.meta.url).pathname });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const survey = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [], pages = [];
  for (const session of sessions) {
    const page = await context.newPage(); pages.push(page);
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(data => localStorage.setItem(`city2127.guest-draft.v2.${data.session.stationId}`, JSON.stringify({
      session: data, choices: [[data.questions[0].id, data.questions[0].options[2].id]], questionIndex: 1, screen: 'question',
    })), session);
    await page.goto(`${survey}/guest?station=${session.session.stationId}`);
    await page.getByRole('button', { name: '新しい予約で草稿を続ける', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'question');
    assert.equal(await page.locator('.guest-progress-copy').textContent(), '質問 2 / 4');
    assert.ok(await page.locator('h1').evaluate(e => e === document.activeElement));
    await page.getByRole('button', { name: '前の質問へ' }).click();
    assert.ok(await page.locator('input[type=radio]').last().isChecked());
    assert.notEqual(await page.locator('h1').textContent(), 'Previous question copy');
    // Match the formal current set, not a local old question snapshot.
    const current = JSON.parse(readFileSync(questionsPath, 'utf8'));
    assert.equal(await page.locator('.guest-copy').first().textContent(), current.questions[0].background);
    await page.screenshot({ path: `artifacts/resident-p2-question-${session.session.stationId}.png` });
    // Keyboard native radio selection, visible selected state and navigation.
    await page.locator('input[type=radio]').first().focus();
    await page.keyboard.press('Space');
    assert.ok(await page.locator('input[type=radio]').first().isChecked());
    assert.equal(await page.locator('.guest-choice-state').first().evaluate(e => getComputedStyle(e).visibility), 'visible');
    await page.locator('[data-auto-action=next]').click();
    for (let i = 1; i < 4; i++) {
      await page.locator('input[type=radio]').nth(1).check();
      await page.locator('[data-auto-action=next]').click();
    }
    await page.locator('.guest-review-row button').first().click();
    await page.locator('input[type=radio]').last().check();
    await page.locator('[data-auto-action=next]').click();
    assert.equal(await page.locator('#app').getAttribute('data-screen'), 'review');
    assert.ok((await page.locator('.guest-review-answer').first().textContent()).includes('いつでも自動'));
  }
  const read = async () => (await (await context.request.get(survey + '/api/city-view')).json()).data;
  assert.equal((await read()).guestCount, 0, 'all partial answers/review changes leave city unchanged');
  await pages[0].screenshot({ path: 'artifacts/resident-p2-review.png' });
  const city = await context.newPage();
  city.on('pageerror', error => errors.push(error.message));
  await city.goto(`${process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5173'}/?survey=${encodeURIComponent(survey.replace('http', 'ws') + '/ws')}&hour=16`);
  await city.locator('.resident-card-title').waitFor();
  assert.equal(await city.locator('.causal-panel').getAttribute('data-presentation'), 'ambient');
  const bounds = await city.locator('.causal-panel').boundingBox();
  assert.ok(bounds.width * bounds.height / (1280 * 720) < .16);
  await city.screenshot({ path: 'artifacts/resident-p2-city-ambient.png' });
  await city.getByText('普段は自動、困ったら人へ', { exact: true }).waitFor({ timeout: 45000 });
  assert.equal(await city.locator('.resident-place').textContent(), '街の画面：デックス西');
  await city.screenshot({ path: 'artifacts/resident-p2-city-facility.png' });
  // Fail before commit, then verify the identical request is retried and cast exactly once.
  const requests = [];
  pages[0].on('request', r => { if (r.url().endsWith('/api/proposals')) requests.push(r.postDataJSON()); });
  await pages[0].route('**/api/proposals', route => route.abort('failed'), { times: 1 });
  await pages[0].locator('[data-auto-action=submit]').click();
  await pages[0].getByRole('button', { name: '記録を確認する', exact: true }).click();
  await pages[0].waitForFunction(() => document.querySelector('#app')?.dataset.screen === 'result');
  assert.deepEqual(requests[0], requests[1]);
  assert.equal((await read()).guestCount, 1);
  assert.equal(await pages[0].locator('h1').textContent(), '街の画面をご覧ください。');
  assert.equal(await pages[0].locator('table, .guest-result-answers, .guest-change-list').count(), 0);
  await city.waitForFunction(() => document.querySelector('.causal-panel')?.dataset.presentation === 'result');
  assert.equal(await city.locator('section .causal-context').textContent(), await pages[0].locator('.guest-result-number').textContent());
  assert.ok((await city.locator('.resident-card-copy').textContent()).includes('住民の声に加わりました'));
  await pages[0].screenshot({ path: 'artifacts/resident-p2-look-up.png' });
  await city.screenshot({ path: 'artifacts/resident-p2-city-result.png' });
  await city.reload();
  await city.waitForFunction(() => document.querySelector('.causal-panel')?.dataset.presentation === 'ambient');
  assert.ok(!(await city.locator('section .causal-context').textContent()).includes('暮らしの声 #'));
  assert.deepEqual(errors, []);
  console.log('PASS P2 browser: real pre-upgrade A/B drafts, new copy/background and preserved choices, native keyboard/focus/selection, review edit, no partial vote, pre-commit network retry same ID, no result tables, shared identity, compact ambient/result card and reload without old story replay. Chrome 1280x720.');
} finally {
  await browser.close(); realtime.close(); server.closeAllConnections();
  await new Promise(resolve => server.close(resolve)); ctx.db.close();
  rmSync(directory, { recursive: true, force: true });
}
