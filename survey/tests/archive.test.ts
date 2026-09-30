import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exhibitionFixture, ok, staff, startServer } from './surveyFixture.ts';
import { createProposalSession, submitProposal } from '../src/server/proposalService.ts';
import { archiveRecord } from '../src/server/archiveService.ts';
import { parseSurveyEvent } from '../../src/surveyView.ts';

const temp = mkdtempSync(join(tmpdir(), 'city2127-archive-'));
const dbPath = join(temp, 'test.sqlite');
const { ctx } = exhibitionFixture(dbPath);
function propose(id: string, option = 0) {
  const session = ok(createProposalSession(ctx));
  return ok(submitProposal(ctx, { submissionId: id, guestSessionId: session.session.id,
    expectedRevision: session.state.revision,
    answers: session.questions.map(q => ({ questionId: q.id, optionId: q.options[option].id })),
  }).response);
}
propose('archive-first');
const first = archiveRecord(ctx, 'archive-first')!;
assert.equal(first.status, 'ready');
assert.equal(first.result_type, '3d');
const parsed = parseSurveyEvent({ type: 'city-state-snapshot', view: first.view });
assert.ok(parsed && 'view' in parsed, 'root renderer accepts saved exhibition view');
const http = await startServer(ctx);
try {
  const record = await (await fetch(`${http.base}/api/sessions/archive-first`)).json();
  assert.equal(record.proposal_number, 1);
  assert.equal(record.city_url, `${http.base}/city/archive-first`);
  assert.deepEqual(record.view, first.view);
  ok(staff(ctx, 'guest-left')); propose('archive-second', 2);
  assert.notDeepEqual(archiveRecord(ctx, 'archive-second')!.view.layout, first.view.layout);
  assert.deepEqual(archiveRecord(ctx, 'archive-first'), first);
  assert.equal(archiveRecord(ctx, 'archive-second')!.view.recentProposals.length, 1);
  ok(staff(ctx, 'reset-city', 'RESET')); ok(staff(ctx, 'guest-left'));
  assert.deepEqual(archiveRecord(ctx, 'archive-first'), first);
  ok(staff(ctx, 'full-reset', 'FULL RESET'));
  assert.deepEqual(archiveRecord(ctx, 'archive-first'), first);
  assert.equal((await fetch(`${http.base}/api/archives/unknown`)).status, 404);
  assert.equal((await fetch(`${http.base}/api/archives/archive-first`, { method: 'POST' })).status, 404);
  assert.equal((await fetch(`${http.base}/api/archives/archive-first/image`)).status, 404);
} finally { await http.close(); ctx.db.close(); }
const reopened = exhibitionFixture(dbPath);
try { assert.deepEqual(archiveRecord(reopened.ctx, 'archive-first'), first); }
finally { reopened.ctx.db.close(); rmSync(temp, { recursive: true }); }
console.log('PASS: personal 3D view, root validation, historical layout, later proposals, city/full reset and restart preservation, read-only API.');
