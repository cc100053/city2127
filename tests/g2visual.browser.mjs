import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH).href);
import { exhibitionFixture, CURRENT_EXHIBITION_QUESTIONS_PATH, ok, startServer } from '../survey/tests/surveyFixture.ts';
import { createProposalSession, submitProposal } from '../survey/src/server/proposalService.ts';
import { currentView } from '../survey/src/server/answerService.ts';
import { SHOTS } from '../src/headlineCamera.ts';
import { ENERGY_CHOICES, ENERGY_CHOICE_PART } from '../survey/src/shared/energy.ts';
import { RESULT_LEASE_MS } from '../survey/src/shared/displayTiming.ts';
const dir = '/Users/fatboy/city2127/.task-relay/guest-agency/g2-visual-2'; mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const results = [], errors = [];
try {
  for (const choice of ENERGY_CHOICES.filter(choice => !process.env.CITY2127_ENERGY_CHOICE || choice === process.env.CITY2127_ENERGY_CHOICE)) {
    const { ctx, clock } = exhibitionFixture(':memory:', Date.now(), CURRENT_EXHIBITION_QUESTIONS_PATH);
    const server = await startServer(ctx); let i = 0;
    const submit = () => {
      const session = ok(createProposalSession(ctx).response);
      ok(submitProposal(ctx, { submissionId: `v${++i}`, guestSessionId: session.session.id, expectedRevision: session.state.revision,
        answers: session.questions.map(q => ({ questionId: q.id, optionId: q.id === 'energy-2127' ? choice : q.options[1].id })) }).response);
      clock.ms += RESULT_LEASE_MS + 1000;
    };
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(e.message));
    const shots = { 'water-storage': 'energy:garden', 'rotor-storage': 'energy:ring', 'orbital-supply': 'energy:wing', 'island-supply': 'energy:island' };
    const url = `${process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5199'}/?survey=${encodeURIComponent(server.base.replace('http', 'ws') + '/ws')}&hour=12&shot=${shots[choice]}`;
    try {
      const stages = process.env.CITY2127_BASELINE_ONLY ? [0, 1] : [0, 1, 2, 1];
      for (const desired of stages) {
        if (desired !== 0) { do { assert.ok(i < 10); submit(); } while (currentView(ctx).layout.energy?.activity?.[ENERGY_CHOICE_PART[choice]] !== desired); }
        const view = currentView(ctx);
        await page.goto(url); await page.waitForFunction(v => JSON.stringify(JSON.parse(document.querySelector('canvas')?.dataset.energy ?? 'null')?.target) === JSON.stringify(v.layout.energy ?? { waterGardens: 0, receiver: 'none', flywheel: false, island: false }), view, { timeout: 90000 });
        const tick = await page.locator('canvas').getAttribute('data-time');
        await page.evaluate(shot => window.cityShot(shot), shots[choice]);
        await page.waitForFunction(previous => document.querySelector('canvas')?.dataset.time !== previous, tick, { timeout: 90000 });
        const pose = await page.evaluate(() => window.cityShot());
        assert.deepEqual(pose.position, SHOTS[shots[choice]].position);
        assert.deepEqual(pose.target, SHOTS[shots[choice]].target);
        await page.screenshot({ path: `${dir}/${choice}-${i}-${desired}.png` });
        const samples = [];
        for (let sample = 0; sample < 3; sample++) {
          const previous = await page.locator('canvas').getAttribute('data-time');
          await page.waitForFunction(time => document.querySelector('canvas')?.dataset.time !== time, previous, { timeout: 90000 });
          samples.push(await page.locator('canvas').evaluate(c => ({ calls: Number(c.dataset.drawCalls), fps: Number(c.dataset.fps), energy: JSON.parse(c.dataset.energy) })));
        }
        const stats = samples.reduce((best, sample) => sample.calls < best.calls ? sample : best);
        results.push({ choice, desired, stats, samples, layout: view.layout.energy });
        await page.goto('about:blank');
      }
    } finally { await page.close(); await server.close(); ctx.db.close(); }
  }
  for (const choice of ENERGY_CHOICES) {
    const pair = results.filter(result => result.choice === choice);
    if (pair.length >= 2) assert.ok(pair[1].stats.calls <= pair[0].stats.calls * 1.1, `${choice} fallback exceeds 10% draw calls`);
  }
  writeFileSync(`${dir}/browser.json`, JSON.stringify({ browser: browser.version(), viewport: '1920x1080 DPR1', results, errors }, null, 2));
  assert.deepEqual(errors, []); console.log('G2 visual snapshot captures:', JSON.stringify(results.map(({choice, desired, stats})=>({choice, desired, calls:stats.calls, fps:stats.fps}))));
} finally { await browser.close(); }
