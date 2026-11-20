// Optional browser acceptance for the question rotation full flow (QUESTION_ROTATION_PLAN 6.3): real Guest UI on stations A/B,
// city drawn from rotation.shown (Q01 NW band, Q02 lots, Q03 drawer housing, Q08 SW vacancy), Admin Undo and reset, city reload mid-transition,
// network drop and reduced motion. Needs a fresh rotation scratch server (survey-rotation: SURVEY_QUESTIONS=…rotation.v1.json,
// port 8789) and the root Vite city (5173). Not part of npm test.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { evidenceDir } from '../scripts/evidence.mjs';
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH ?? '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs').href);
const survey = process.env.CITY2127_SURVEY_URL ?? 'http://127.0.0.1:8789';
const cityURL = process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5173';
const out = evidenceDir(process.env.ROUND ?? 'question-rotation/full-flow');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const options = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };
const ca = await browser.newContext(options), cb = await browser.newContext(options), display = await browser.newContext({ ...options, viewport: { width: 1600, height: 900 } });
const a = await ca.newPage(), b = await cb.newPage(), city = await display.newPage(), admin = await display.newPage();
const errors = [], log = [];
for (const [name, page] of [['A', a], ['B', b], ['city', city], ['admin', admin]]) page.on('pageerror', e => errors.push(`${name}: ${e.message}`));
admin.on('dialog', dialog => dialog.accept());
const note = (step, data = {}) => { log.push({ step, at: new Date().toISOString(), ...data }); console.log(step, JSON.stringify(data)); };
const read = async path => (await (await display.request.get(survey + path)).json()).data;
const screen = (page, name, timeout = 30_000) => page.waitForFunction(n => document.querySelector('#app')?.dataset.screen === n, name, { timeout });
const WIRED = ['Q01', 'Q02', 'Q03', 'Q06', 'Q08'];
const BAND = { A: 'low', B: 'mixed', C: 'high' };

/** Waits until the city draws `view`: guest count, Q01 NW band, Q02 lot (hydro/flower/farm), Q03 drawer housing, Q06 pod tower, Q08 SW vacancy. */
async function checkCity(view, timeout = 30_000) {
  const shown = view.rotation.shown;
  await city.waitForFunction(([count, s, band]) => {
    const c = document.querySelector('canvas'), d = c?.dataset;
    if (!d?.siteAssets || !d.lots || !d.energy) return false;
    const sites = JSON.parse(d.siteAssets), lots = JSON.parse(d.lots), energy = JSON.parse(d.energy);
    return document.querySelector('.causal-panel')?.dataset.guestCount === String(count)
      && sites.magnetEast.automationHub?.band === band
      && lots.hydro === (s.Q02 === 'A' ? 1 : 0) && lots.flower === (s.Q02 === 'B' ? 1 : 0) && energy.farm.visible === (s.Q02 === 'C')
      && lots.housing === (s.Q03 === 'A' ? 1 : 0) && lots.tower === (s.Q06 === 'B' ? 1 : 0)
      && sites.dogenzakaSouth.commonsPlaza?.vacant === (s.Q08 === 'A' || s.Q08 === 'B');
  }, [view.guestCount, shown, BAND[shown.Q01]], { timeout });
}
const cityState = () => city.evaluate(() => {
  const d = document.querySelector('canvas').dataset;
  return { nw: JSON.parse(d.siteAssets).magnetEast.automationHub?.band, lots: JSON.parse(d.lots), farm: JSON.parse(d.energy).farm.visible,
    swVacant: JSON.parse(d.siteAssets).dogenzakaSouth.commonsPlaza?.vacant, card: document.querySelector('.resident-card-copy')?.textContent,
    place: document.querySelector('.resident-place')?.textContent, share: document.querySelector('.resident-share')?.textContent };
});
const shot = async (page, name) => { await page.screenshot({ path: `${out}/${name}.png` }); };
/** City back to its ambient panel (the live result's reading slot is over). */
const ambient = (timeout = 40_000) => city.waitForFunction(() => document.querySelector('.causal-panel')?.dataset.presentation !== 'result', null, { timeout });

async function toWelcome(page) {
  for (let i = 0; i < 40; i++) {
    const s = await page.locator('#app').getAttribute('data-screen');
    if (s === 'welcome') return;
    if (s === 'result') await page.getByRole('button', { name: '次の方へ', exact: true }).click().catch(() => {});
    else if (s === 'handoff') await page.getByRole('button', { name: 'はじめる画面へ', exact: true }).click().catch(() => {});
    await page.waitForTimeout(1000);
  }
  throw new Error(`guest never reached welcome: ${await page.locator('#app').getAttribute('data-screen')}`);
}
/** Starts a guest and returns the four drawn question IDs (read from the radio inputs, one screen at a time). */
async function startGuest(page) {
  await toWelcome(page);
  for (;;) {
    await page.locator('[data-auto-action=start]').click();
    try { await screen(page, 'question', 5000); break; } catch { await page.waitForTimeout(2000); } // reading slot or pending reset
  }
}
/** The four drawn question IDs of the guest's current session (its stored recovery draft). */
const drawnOf = page => page.evaluate(() => {
  for (const key of Object.keys(localStorage)) {
    try { const v = JSON.parse(localStorage.getItem(key)); if (v?.session?.questions) return v.session.questions.map(q => q.id); } catch {}
  }
  return null;
});
/** Answers every question with `choose(qid, shown)`; `after` runs once after the first answer (mid-questionnaire reload). */
async function answerGuest(page, choose, after) {
  const shown = (await read('/api/city-view')).rotation.shown, seen = [];
  for (;;) {
    const s = await page.locator('#app').getAttribute('data-screen');
    if (s === 'review') break;
    const qid = await page.locator('input[type=radio]').first().getAttribute('data-question-id');
    seen.push(qid);
    await page.locator(`input[type=radio][value="${choose(qid, shown)}"]`).check();
    await page.locator('[data-auto-action=next]').click();
    if (after && seen.length === 1) { await after(seen); after = undefined; }
  }
  return seen;
}
async function submit(page) { await page.locator('[data-auto-action=submit]').click(); await screen(page, 'result'); }
const other = (shown, prefer) => prefer && prefer !== shown ? prefer : shown === 'A' ? 'B' : 'A';
/** One sequential guest: swaps `target` to `to` if drawn, else the first drawn wired question, else the first drawn one;
 *  `keepAll` keeps every shown option (fallback). */
async function guest(page, label, { target, to, keepAll = false, after } = {}) {
  const before = await read('/api/city-view');
  await startGuest(page);
  const ids = await drawnOf(page);
  assert.ok(ids?.length === 4, `drawn questions readable: ${ids}`);
  const pick = keepAll ? undefined : ids.includes(target) ? target : ids.find(q => WIRED.includes(q)) ?? ids[0];
  const drawn = await answerGuest(page, (qid, shown) => qid === pick ? other(shown[qid], qid === target ? to : undefined) : shown[qid], after);
  assert.deepEqual(drawn, ids);
  await submit(page);
  const view = await read('/api/city-view'), proposal = view.recentProposals.at(-1);
  note(label, { drawn, swapped: pick, outcome: proposal?.rotation?.outcome, shown: view.rotation.shown });
  return { before, view, drawn, swapped: pick };
}

try {
  const initial = await read('/api/city-view');
  assert.equal(initial.guestCount, 0, 'use a fresh scratch rotation DB');
  assert.ok(initial.rotation, 'server must run the rotation question set');
  await a.goto(`${survey}/guest?station=A`); await b.goto(`${survey}/guest?station=B`); await admin.goto(`${survey}/admin`);
  await city.goto(`${cityURL}/?survey=${encodeURIComponent(survey.replace('http', 'ws') + '/ws')}&hour=12`);
  await city.waitForFunction(() => document.querySelector('canvas')?.dataset.fps, null, { timeout: 90_000 });
  await checkCity(initial); note('initial', { shown: initial.rotation.shown, city: await cityState() }); await shot(city, '00-initial');

  // 1. Q01 swap through the real Guest UI; city settles on the new NW band, guest handoff shows 住民の声.
  let g = await guest(a, 'g1 Q01', { target: 'Q01', to: 'C' });
  assert.equal(g.swapped, 'Q01');
  await city.waitForTimeout(10_500); note('g1 city 10.5s', await cityState()); await shot(city, '01-q01-city-10s');
  await checkCity(g.view); await shot(a, '01-q01-guest-result');
  await a.getByRole('button', { name: '次の方へ', exact: true }).click(); await screen(a, 'handoff');
  assert.ok((await a.locator('#app').innerText()).includes('住民の声')); await shot(a, '01-q01-guest-handoff');
  await ambient();

  // 2. Q02 A→B with a Guest reload after the first answer: same drawn questions, answer kept, resumes on question 2.
  g = await guest(a, 'g2 Q02', { target: 'Q02', to: 'B', after: async drawn => {
    await a.reload(); await screen(a, 'question');
    assert.equal(await a.locator('.guest-progress-copy').textContent(), '質問 2 / 4');
    await a.getByRole('button', { name: '前の質問へ' }).click();
    assert.equal(await a.locator('input[type=radio]').first().getAttribute('data-question-id'), drawn[0]);
    assert.equal(await a.locator('input[type=radio]:checked').count(), 1);
    await a.locator('[data-auto-action=next]').click();
    note('g2 guest reload kept draft', { first: drawn[0] });
  } });
  assert.equal(g.swapped, 'Q02');
  await checkCity(g.view); await city.waitForTimeout(500); note('g2 city', await cityState()); await shot(city, '02-q02-flower');

  // 3. Admin Undo of the Q02 swap: city-view equals the pre-swap view, lots return at once, Guest is told.
  await admin.reload();
  const undo = admin.getByRole('button', { name: '直前の提案を取り消す', exact: true });
  await admin.waitForFunction(() => [...document.querySelectorAll('button')].some(x => x.textContent === '直前の提案を取り消す' && !x.disabled));
  const t0 = Date.now(); await undo.click();
  await a.getByText('管理者が直前の提案を取り消し、変更前の街に戻しました。', { exact: false }).waitFor();
  assert.deepEqual(await read('/api/city-view'), g.before);
  await checkCity(g.before); note('g3 undo restored', { ms: Date.now() - t0, city: await cityState() }); await shot(city, '03-undo');

  // 4. Q02 A→C, city reloaded mid-transition: the reload lands on the settled state.
  g = await guest(a, 'g4 Q02', { target: 'Q02', to: 'C' });
  await city.waitForTimeout(6000); await city.reload();
  await city.waitForFunction(() => document.querySelector('canvas')?.dataset.fps, null, { timeout: 90_000 });
  await checkCity(g.view); note('g4 after mid-transition reload', await cityState()); await shot(city, '04-q02-farm-after-reload');
  await ambient();

  // 5. Fallback: keep every shown option; city unchanged, the card visits a drawn model already showing the answer (plan 3.4).
  g = await guest(a, 'g5 fallback', { keepAll: true });
  assert.deepEqual(g.view.rotation.shown, g.before.rotation.shown);
  await city.waitForTimeout(10_500);
  const held = await cityState(); note('g5 fallback city', held); await shot(city, '05-fallback');
  assert.match(held.card, g.view.latestProposal.rotation.visit ? /すでにここにあります/ : /これから街に加わります/);
  await checkCity(g.view); await ambient();

  // 6. Swap unwired questions until Q08 is drawn, then Q08 C→A (SW vacant).
  for (let i = 0; i < 6; i++) {
    g = await guest(a, `g6.${i}`, { target: 'Q08', to: 'A' });
    await checkCity(g.view); await city.waitForTimeout(10_500); note(`g6.${i} city 10.5s`, await cityState());
    if (g.swapped === 'Q08') { await shot(city, '06-q08-vacant'); await ambient(); break; }
    await shot(city, `06-unwired-${g.swapped}`); await ambient();
  }
  assert.equal(g.view.rotation.shown.Q08, 'A', 'Q08 reached within six guests');

  // 7. Network drop: the city goes offline, a guest swaps, the city comes back and catches up.
  await display.setOffline(true); await city.waitForTimeout(2000);
  g = await guest(a, 'g7 offline', {});
  await city.waitForTimeout(3000); await display.setOffline(false);
  await checkCity(g.view, 60_000); note('g7 reconnected', await cityState()); await shot(city, '07-reconnected');
  await ambient(60_000);

  // 8. A/B: both reserve and submit together; each sees its own result, city shows them ≥ 10 s apart in commit order.
  await city.evaluate(() => {
    window.stationDisplays = [];
    new MutationObserver(() => {
      const label = document.querySelector('.causal-panel section .causal-context')?.textContent;
      if (label?.includes('暮らしの声 #') && label !== window.stationDisplays.at(-1)?.label) window.stationDisplays.push({ label, at: performance.now() });
    }).observe(document.querySelector('.causal-panel'), { subtree: true, childList: true });
  });
  const pre = await read('/api/city-view');
  await Promise.all([startGuest(a), startGuest(b)]);
  const swap = (qid, shown) => WIRED.includes(qid) ? other(shown[qid]) : shown[qid];
  const [drawnA, drawnB] = await Promise.all([answerGuest(a, swap), answerGuest(b, swap)]);
  await Promise.all([a.locator('[data-auto-action=submit]').click(), b.locator('[data-auto-action=submit]').click()]);
  await Promise.all([screen(a, 'result'), screen(b, 'result')]);
  const ab = await read('/api/city-view');
  assert.equal(ab.guestCount, pre.guestCount + 2);
  const last2 = ab.recentProposals.slice(-2);
  assert.deepEqual(last2.map(p => p.stationId).sort(), ['A', 'B']);
  for (const [page, id] of [[a, 'A'], [b, 'B']]) {
    const own = last2.find(p => p.stationId === id);
    assert.ok((await page.locator('#app').innerText()).includes(`ステーション ${id} · 暮らしの声 #${own.ordinal}`));
  }
  note('g8 A/B', { drawnA, drawnB, outcomes: last2.map(p => ({ station: p.stationId, outcome: p.rotation?.outcome })), shown: ab.rotation.shown });
  await city.waitForTimeout(4000); note('g8 first slot', await cityState()); await shot(city, '08-ab-first');
  await city.waitForFunction(() => window.stationDisplays.length >= 2, null, { timeout: 40_000 });
  const displays = await city.evaluate(() => window.stationDisplays);
  assert.deepEqual(displays.slice(-2).map(d => d.label), last2.map(p => `ステーション ${p.stationId} · 暮らしの声 #${p.ordinal}`));
  const gap = displays.at(-1).at - displays.at(-2).at;
  assert.ok(gap >= 9950, `separate reading slots: ${gap} ms`);
  await checkCity(ab, 40_000); note('g8 settled', { gap: Math.round(gap), city: await cityState() }); await shot(city, '08-ab-settled');
  await shot(a, '08-guest-a'); await shot(b, '08-guest-b');
  await ambient();

  // 9. Reduced motion: a live swap settles at once (no journey, no fade).
  await city.emulateMedia({ reducedMotion: 'reduce' }); await city.waitForTimeout(1000);
  const rmT0 = Date.now();
  g = await guest(a, 'g9 reduced motion', { target: 'Q01', to: 'A' });
  await checkCity(g.view, 10_000);
  note('g9 reduced motion settled', { msAfterSubmit: Date.now() - rmT0, city: await cityState() }); await shot(city, '09-reduced-motion');
  await city.emulateMedia({ reducedMotion: 'no-preference' });

  // 10. Admin reset: next run starts on the question set's initial options, count 0.
  await toWelcome(a); await toWelcome(b);
  await admin.reload();
  const reply = admin.waitForResponse(r => r.url().endsWith('/api/admin/lifecycle') && r.request().method() === 'POST');
  await admin.getByRole('button', { name: '現在の都市をリセット', exact: true }).click();
  assert.equal((await (await reply).json()).ok, true);
  await city.waitForFunction(() => document.querySelector('.causal-panel')?.dataset.guestCount === '0', null, { timeout: 60_000 });
  const fresh = await read('/api/city-view');
  assert.deepEqual(fresh.rotation.shown, initial.rotation.shown);
  assert.notEqual(fresh.runId, initial.runId);
  await checkCity(fresh); note('g10 reset', { shown: fresh.rotation.shown, city: await cityState() }); await shot(city, '10-reset');
  await city.reload(); await checkCity(fresh); await shot(admin, '10-admin');

  note('page errors', { errors });
  assert.deepEqual(errors, []);
  console.log('PASS browser: rotation full flow (Guest UI, reload, Undo, mid-transition reload, fallback, Q08, offline, A/B, reduced motion, reset); no page exceptions.');
} finally {
  writeFileSync(`${out}/log.json`, `${JSON.stringify({ survey, cityURL, errors, log }, null, 1)}\n`);
  await browser.close();
}
