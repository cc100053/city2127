import assert from 'node:assert/strict';
import { evidenceDir } from '../scripts/evidence.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { exhibitionFixture, CURRENT_EXHIBITION_QUESTIONS_PATH, ok, startServer } from '../survey/tests/surveyFixture.ts';
import { ENERGY_CHOICES, ENERGY_CHOICE_PART } from '../survey/src/shared/energy.ts';
import { createProposalSession, submitProposal } from '../survey/src/server/proposalService.ts';
import { RESULT_LEASE_MS } from '../survey/src/shared/displayTiming.ts';
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH).href);
const dir = process.env.CITY2127_EVIDENCE_DIR ?? evidenceDir('g2-live'); mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const errors = [], observations = [];
try {
  for (const choice of ENERGY_CHOICES) {
    const { ctx, clock } = exhibitionFixture(':memory:', Date.now(), CURRENT_EXHIBITION_QUESTIONS_PATH);
    if (process.env.CITY2127_PRESEED) {
      clock.ms = Date.now() - 4 * (RESULT_LEASE_MS + 1000);
      for (let i = 0; i < 4; i++) {
        const session = ok(createProposalSession(ctx).response);
        ok(submitProposal(ctx, { submissionId: `seed-${i}`, guestSessionId: session.session.id, expectedRevision: session.state.revision,
          answers: session.questions.map(q => ({ questionId: q.id, optionId: q.id === 'energy-2127' ? choice : q.options[1].id })) }).response);
        clock.ms += RESULT_LEASE_MS + 1000;
      }
    }
    const server = await startServer(ctx);
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(e.message));
    try {
      const url = `${process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5199'}/?survey=${encodeURIComponent(server.base.replace('http', 'ws') + '/ws')}&hour=12`;
      await page.goto(url); await page.waitForFunction(() => document.querySelector('.causal-panel')?.textContent?.includes('接続済み'), null, { timeout: 90000 });
      await page.waitForFunction(() => !!document.querySelector('canvas')?.dataset.energy, null, { timeout: 90000 });
      clock.ms = Date.now();
      const session = ok((await server.request('/api/proposal-sessions', {})).body);
      const request = { submissionId: `live-${choice}`, guestSessionId: session.session.id, expectedRevision: session.state.revision,
        answers: session.questions.map(q => ({ questionId: q.id, optionId: q.id === 'energy-2127' ? choice : q.options[1].id })) };
      const t = Date.now(); const accepted = ok((await server.request('/api/proposals', request)).body);
      if (process.env.CITY2127_PRESEED) {
        const part = ENERGY_CHOICE_PART[choice];
        assert.equal(accepted.proposal.beforeLayout.energy[part], accepted.proposal.afterLayout.energy[part]);
        assert.notEqual(accepted.proposal.beforeLayout.energy.activity[part], accepted.proposal.afterLayout.energy.activity[part]);
      }
      await page.waitForFunction(() => document.querySelector('.causal-panel')?.dataset.presentation === 'result', null, { timeout: 30000 });
      const wait = async seconds => page.waitForTimeout(Math.max(0, t + seconds * 1000 - Date.now()));
      const captured = [];
      for (const sec of [4.9, 6.6, 9.5]) { await wait(sec); captured.push({ requested: sec, actual: (Date.now() - t) / 1000 }); await page.screenshot({ path: `${dir}/${choice}-${sec}.png` }); }
      const card = await page.locator('.resident-card-copy').textContent();
      await page.waitForFunction(() => !!document.querySelector('canvas')?.dataset.energy, null, { timeout: 90000 });
      const diagnostic = await page.locator('canvas').evaluate(c => ({ energy: JSON.parse(c.dataset.energy), calls: +c.dataset.drawCalls, fps: +c.dataset.fps }));
      assert.match(card, /整備フレーム/); observations.push({ choice, card, diagnostic, captured });
    } finally { await page.close(); await server.close(); ctx.db.close(); }
  }
  writeFileSync(`${dir}/browser.json`, JSON.stringify({ browser: browser.version(), observations, errors }, null, 2));
  assert.deepEqual(errors, []); console.log('G2 live frames and result cards captured for all energy choices.');
} finally { await browser.close(); }
