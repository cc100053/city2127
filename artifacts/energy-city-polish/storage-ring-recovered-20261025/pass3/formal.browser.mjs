// Formal E4 acceptance: real questions/server/SQLite/WebSocket, no DEV energy switch.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createContext, createSurveyServer } from '../survey/src/server/server.ts';
import { createProposalSession, submitProposal } from '../survey/src/server/proposalService.ts';
import { currentView } from '../survey/src/server/answerService.ts';
import { ENERGY_CHOICES, emptyEnergyConfiguration } from '../survey/src/shared/energy.ts';
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH).href);
const directory = mkdtempSync(join(tmpdir(), 'energy-e4-browser-'));
const evidence = process.env.CITY2127_EVIDENCE_DIR ?? 'artifacts/energy-city-e4/formal'; mkdirSync(evidence, { recursive: true });
const questionsPath = new URL('../survey/src/survey/questions.exhibition.json', import.meta.url).pathname;
const legacyPath = new URL('../survey/src/survey/questions.exhibition.v3.json', import.meta.url).pathname;
const dbPath = join(directory, 'scratch.sqlite');
let offset = 0;
const now = () => new Date(Date.now() + offset);
const unwrap = response => { assert.ok(response.ok, JSON.stringify(response)); return response.data; };
const old = createContext({ dbPath, questionsPath: legacyPath, now });
const oldSession = unwrap(createProposalSession(old).response);
const oldRequest = { submissionId: 'legacy-before-upgrade', guestSessionId: oldSession.session.id, expectedRevision: 0,
  answers: oldSession.questions.map(q => ({ questionId: q.id, optionId: q.options[q.id === 'cooling-2127' ? 2 : 1].id })) };
const oldSaved = unwrap(submitProposal(old, oldRequest).response);
offset += 11_000;
const oldDraft = unwrap(createProposalSession(old).response);
old.db.exec('ALTER TABLE exhibition_snapshots DROP COLUMN energy_json; PRAGMA user_version = 7'); old.db.close();
const ctx = createContext({ dbPath, questionsPath, now });
assert.equal(ctx.db.prepare('PRAGMA user_version').get().user_version, 8);
const { server, realtime } = createSurveyServer({ ctx, staticDir: new URL('../survey/dist', import.meta.url).pathname });
const cityURL = process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5173';
const citySockets = new Set();
server.on('upgrade', (request, socket) => { if (request.headers.origin === cityURL) { citySockets.add(socket); socket.on('close', () => citySockets.delete(socket)); } });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const survey = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const viewport = { width: 1920, height: 1080 };
const display = await browser.newContext({ viewport, deviceScaleFactor: 1 });
const input = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const guest = await input.newPage(), city = await display.newPage(), admin = await input.newPage();
const exceptions = [], warnings = [], badResponses = [], failures = [];
for (const page of [guest, city, admin]) {
  page.on('pageerror', e => exceptions.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) warnings.push({ text: m.text(), url: m.location().url }); });
  page.on('response', r => { if (r.status() >= 400) badResponses.push({ url: r.url(), status: r.status() }); });
  page.on('requestfailed', r => failures.push({ url: r.url(), error: r.failure()?.errorText }));
}
admin.on('dialog', d => d.accept());
const read = async path => unwrap(await (await display.request.get(survey + path)).json());
const post = async (path, body) => unwrap(await (await display.request.post(survey + path, { data: body })).json());
const url = (hour = 12) => `${cityURL}/?survey=${encodeURIComponent(survey.replace('http', 'ws') + '/ws')}&hour=${hour}`;
const screen = (page, name) => page.waitForFunction(n => document.querySelector('#app')?.dataset.screen === n, name);
async function model(view = currentView(ctx)) {
  await city.waitForFunction(v => {
    const c = document.querySelector('canvas'), d = JSON.parse(c?.dataset.energy ?? 'null');
    const t = v.layout.energy ?? { waterGardens: 0, receiver: 'none', flywheel: false, island: false };
    if (!d || JSON.stringify(d.target) !== JSON.stringify(t) || document.querySelector('.causal-panel')?.dataset.guestCount !== String(v.guestCount)) return false;
    const expected = [t.receiver === 'none' ? 0 : t.receiver === 'small' ? .65 : 1, t.waterGardens > 0 ? 1 : 0, t.waterGardens === 2 ? .72 : 0, t.flywheel ? 1 : 0, t.island ? 1 : 0,
      t.waterGardens || t.flywheel || t.island || t.receiver !== 'none' ? 1 : 0];
    return d.parts.every((p, i) => p.visible === (expected[i] > 0) && Math.abs(p.opacity - (expected[i] > 0 ? 1 : 0)) < 1e-6 && (expected[i] === 0 || Math.abs(p.scaleY - expected[i]) < 1e-6));
  }, view, { timeout: 45_000 });
  return view;
}
async function answerWater() {
  await guest.locator('[data-auto-action=start]').click();
  for (let i = 0; i < 4; i++) { await guest.locator('input[type=radio]').nth(i === 2 ? 0 : 1).check(); await guest.locator('[data-auto-action=next]').click(); }
  await screen(guest, 'review');
}
try {
  await guest.addInitScript(data => localStorage.setItem('city2127.guest-draft.v2', JSON.stringify({ session: data,
    choices: data.questions.map(q => [q.id, q.options[1].id]), questionIndex: 2, screen: 'question' })), oldDraft);
  await city.goto(url()); await admin.goto(survey + '/admin'); await guest.goto(survey + '/guest'); await model();
  await city.screenshot({ path: join(evidence, 'inherited-climate.png') });
  await guest.getByRole('button', { name: '新しい予約で草稿を続ける', exact: true }).click(); await screen(guest, 'question');
  assert.equal(await guest.locator('.guest-progress-copy').textContent(), '質問 3 / 4');
  assert.equal(await guest.locator('input[type=radio]').count(), 4);
  assert.equal(await guest.locator('input[type=radio]:checked').count(), 0, 'old climate answer does not silently select an energy preference');
  await guest.screenshot({ path: join(evidence, 'q3-current.png') });
  await guest.locator('input[type=radio]').first().focus(); await guest.keyboard.press('Space');
  await guest.locator('[data-auto-action=next]').click();
  assert.ok(await guest.locator('input[type=radio]').nth(1).isChecked(), 'valid Q4 choice survives the upgrade');
  await guest.locator('[data-auto-action=next]').click(); await screen(guest, 'review');
  assert.equal((await read('/api/city-view')).guestCount, 1, 'partial answers never mutate the city');
  await guest.screenshot({ path: join(evidence, 'review-current.png') });
  const requests = []; guest.on('request', r => { if (r.url().endsWith('/api/proposals')) requests.push(r.postDataJSON()); });
  await guest.route('**/api/proposals', r => r.abort('failed'), { times: 1 });
  await guest.locator('[data-auto-action=submit]').click();
  await guest.getByRole('button', { name: '記録を確認する', exact: true }).click(); await screen(guest, 'result');
  assert.deepEqual(requests[0], requests[1]);
  let view = await read('/api/city-view'); assert.equal(view.energy.counts['water-storage'], 1); assert.equal(view.layout.energy.waterGardens, 0);
  await city.getByText(/街のエネルギー設備は今の配置/).waitFor();
  await city.screenshot({ path: join(evidence, 'recorded-no-change.png') });
  await guest.locator('[data-auto-action=start]').waitFor({ timeout: 25_000 });
  await answerWater();
  await guest.route('**/api/proposals', async route => { await route.fetch(); await route.abort('failed'); }, { times: 1 });
  await guest.locator('[data-auto-action=submit]').click();
  await guest.getByRole('button', { name: '記録を確認する', exact: true }).click(); await screen(guest, 'result');
  assert.deepEqual(requests[2], requests[3], 'lost committed response retains the identical submission ID');
  view = await read('/api/city-view'); assert.equal(view.energy.counts['water-storage'], 2);
  await city.getByText(/蓄電庭園は1か所/).waitFor();
  await city.screenshot({ path: join(evidence, 'live-one-garden-result.png') });
  await model(view);
  assert.equal(view.scores.environmentalPriority, oldSaved.state.scores.environmentalPriority);
  await city.screenshot({ path: join(evidence, 'one-garden-settled.png') });
  // Staff Undo removes that actual model; it restores the preceding energy tally without reinterpreting climate.
  offset += 16_000;
  await admin.getByRole('button', { name: '直前の提案を取り消す', exact: true }).click();
  view = await read('/api/city-view'); assert.equal(view.energy.counts['water-storage'], 1); assert.equal(view.layout.energy.waterGardens, 0);
  await model(view); assert.equal(await city.locator('.causal-panel').getAttribute('data-presentation'), 'ambient');
  await city.screenshot({ path: join(evidence, 'undo-restored.png') });
  // Real recorded proposals build a mixed portfolio; fixture clock jumps skip visitor waits, then reload takes the latest snapshot.
  let sequence = 0;
  for (const choice of ENERGY_CHOICES) for (let n = choice === 'water-storage' ? 1 : 0; n < 4; n++) {
    offset += 16_000;
    const session = await post('/api/proposal-sessions', {});
    await post('/api/proposals', { submissionId: `mixed-${++sequence}`, guestSessionId: session.session.id, expectedRevision: session.state.revision,
      answers: session.questions.map(q => ({ questionId: q.id, optionId: q.id === 'energy-2127' ? choice : q.options[1].id })) });
  }
  view = await read('/api/city-view');
  assert.deepEqual(view.layout.energy, { waterGardens: 1, receiver: 'small', flywheel: true, island: true });
  await city.reload(); await model(view);
  for (const hour of [12, 18.5, 22]) { if (hour !== 12) { await city.goto(url(hour)); await model(view); } await city.screenshot({ path: join(evidence, `mixed-${hour}.png`) }); }
  // Disconnect the actual City TCP transport. Reconnect restores the same portfolio with ambient text.
  for (const socket of citySockets) socket.destroy();
  await city.getByText('サーバー: 接続済み', { exact: true }).waitFor(); await model(view);
  assert.equal(await city.locator('.causal-panel').getAttribute('data-presentation'), 'ambient');
  // Release the previous full city while the reduced-motion context cold-loads its own renderer.
  await city.goto('about:blank');
  const reduced = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const still = await reduced.newPage(); still.on('pageerror', e => exceptions.push(e.message));
  await still.goto(url(12));
  await still.waitForFunction(() => !!document.querySelector('canvas')?.dataset.energy);
  const first = await still.locator('canvas').evaluate(c => ({ time: Number(c.dataset.time), angle: JSON.parse(c.dataset.energy).rotorAngle }));
  await still.waitForFunction(t => Number(document.querySelector('canvas')?.dataset.time) >= t + 2, first.time, { timeout: 45_000 });
  assert.equal(await still.locator('canvas').evaluate(c => JSON.parse(c.dataset.energy).rotorAngle), first.angle);
  await still.screenshot({ path: join(evidence, 'mixed-reduced-motion.png') }); await reduced.close();
  await city.goto(url(22)); await model(view);
  await city.setViewportSize({ width: 1440, height: 900 });
  await city.waitForFunction(() => document.querySelector('canvas')?.clientWidth === 1440 && document.querySelector('canvas')?.clientHeight === 900);
  assert.deepEqual(await city.locator('canvas').evaluate(c => [c.clientWidth, c.clientHeight]), [1440, 900]);
  await city.setViewportSize(viewport);
  await city.waitForFunction(() => document.querySelector('canvas')?.clientWidth === 1920);
  offset += 16_000;
  let state = await read('/api/admin/current-run');
  await post('/api/admin/lifecycle', { command: 'guest-left', expectedRevision: state.lifecycle.revision });
  state = await read('/api/admin/current-run');
  await post('/api/admin/lifecycle', { command: 'reset-city', confirmation: 'RESET', expectedRevision: state.lifecycle.revision });
  view = await read('/api/city-view'); assert.equal(view.guestCount, 0); assert.equal(view.energy, undefined);
  await model(view); await city.screenshot({ path: join(evidence, 'reset-baseline.png') });
  assert.deepEqual((await post('/api/proposals', oldRequest)).proposal, oldSaved.proposal);
  assert.deepEqual(exceptions, []);
  const expectedObsoleteSession = `${survey}/api/proposal-sessions/${oldDraft.session.id}`;
  const unexpectedWarnings = warnings.filter(e => !e.url.endsWith('/favicon.ico') && !e.text.includes('net::ERR_FAILED')
    && !(e.url === expectedObsoleteSession && e.text.includes('409')));
  assert.deepEqual(unexpectedWarnings, []);
  assert.ok(badResponses.every(r => r.url.endsWith('/favicon.ico') || (r.status === 409 && r.url === expectedObsoleteSession)));
  writeFileSync(join(evidence, 'browser.json'), JSON.stringify({ browser: browser.version(), viewport, quality: 'default', hour: [12,18.5,22],
    checkedCommit: process.env.CITY2127_CHECKED_COMMIT ?? 'working tree', exceptions, warnings, badResponses, failures,
    tests: ['schema7→8 with original proposal and obsolete draft', 'old climate unchanged', 'Q3 four native radios and review', 'pre/post commit same-ID retry',
      'first preference no visible change', 'second preference actual model/result', 'Undo removes energy model', 'recorded mixed portfolio snapshot',
      'day/dusk/night', 'TCP reconnect', 'browser prefers-reduced-motion', 'normal desktop resize', 'reset removes all equipment', 'old retry after reset'],
    fixtureClockJumps: '11s old reading, then 16s skips for Undo and mixed seeding; not visitor timing' }, null, 2)+'\n');
  console.log('PASS E4 formal browser: old/new history, current Q3, pre/post-commit retry, maintained/actual results, energy Undo, recorded mixed portfolio, day/dusk/night, TCP reconnect, reduced motion, resize and reset; no page exceptions.');
} finally {
  await browser.close(); realtime.close(); server.closeAllConnections();
  await new Promise(resolve => server.close(resolve)); ctx.db.close(); rmSync(directory, { recursive: true, force: true });
}
