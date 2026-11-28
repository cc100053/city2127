// Caption guard for rotation models (owner 2026-11-28): every option with a model in the city must ship its result caption with it —
// a preference line of its own, a specific effect for every swap in its question, and the guest's exact option on the big screen
// (featuredAnswer) for swap, visit and concept results. A new ROTATION_VISITS entry without copy fails here.
import assert from './assert.ts';
import { ladderLayout } from '../survey/src/shared/cityView.ts';
import { FACILITY_TO_COME } from '../survey/src/shared/rotation.ts';
import { loadRotationSetFile } from '../survey/src/survey/questionLoader.ts';
import { conceptVisit, featuredAnswer, rotationVisit, ROTATION_VISITS } from '../src/rotationLayout.ts';
import { residentResult } from '../src/surveyAtmosphere.ts';
import type { CarrierChange } from '../src/cityChangeManager.ts';
import type { ExhibitionProposal } from '../src/surveyView.ts';

type Outcome = NonNullable<ExhibitionProposal['rotation']>['outcome'];
const zero = { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 };
const neutral = ladderLayout({ nw: 0, ne: 0, sw: 0, se: 0 });
const set = loadRotationSetFile(new URL('../survey/src/survey/questions.rotation.v1.json', import.meta.url).pathname);
const proposal = (questionId: string, optionId: string, label: string, outcome: Outcome, visit?: string): ExhibitionProposal => ({
  id: 'p', runId: 'r', guestSessionId: 'g', ordinal: 1, questionSetVersion: 1, algorithmVersion: 2,
  answers: [{ questionId, optionId, questionText: '', optionLabel: label }],
  votes: zero, revisionBefore: 0, revisionAfter: 1, submittedAt: '', beforeScores: zero, afterScores: zero,
  beforeLayout: neutral, afterLayout: neutral, cityChanges: [],
  rotation: { outcome, shares: [], ...(visit ? { visit } : {}) },
});
// Generic lines a modelled option must never fall back to.
const GENERIC = new Set([FACILITY_TO_COME, '回答を記録しました。', 'あなたの思いが、住民の声に加わりました。']);
const oneSentence = (text: string, what: string) => {
  assert.ok(text.trim().length > 0, `${what}: non-empty`);
  assert.ok(text.split('。').filter(part => part.trim()).length === 1, `${what}: about one sentence — ${text}`);
};

const modelled = Object.keys(ROTATION_VISITS);
assert.ok(modelled.length > 0);
for (const questionId of modelled) {
  const question = set.questions.find(q => q.id === questionId);
  assert.ok(question, `${questionId} is in the shipped set`);
  const labelOf = (optionId: string) => question.options.find(o => o.id === optionId)!.label;
  const exact = (optionId: string) => labelOf(optionId).trim().replace(/[。.]$/, '');
  for (const [optionId, visitRow] of Object.entries(ROTATION_VISITS[questionId])) {
    const label = labelOf(optionId);
    assert.ok(label, `${questionId}:${optionId} has an option label`);
    assert.ok(visitRow.place.trim() && visitRow.shot, `${questionId}:${optionId} has a visit place and headline shot`);
    // (1) Visit: the card carries the option's own preference line, not the label echo or the generic line.
    const visited = proposal(questionId, optionId, label, { kind: 'swap', questionId: 'Q99', from: 'A', to: 'B' }, questionId);
    assert.equal(rotationVisit(visited)?.optionId, optionId, `${questionId}:${optionId} visit resolves`);
    const visitCard = residentResult(visited, []);
    assert.equal(visitCard.kind, 'already-here');
    assert.ok(!GENERIC.has(visitCard.preference) && !visitCard.preference.includes('」という暮らしを選びました'),
      `${questionId}:${optionId} needs its own result copy row (preference), got: ${visitCard.preference}`);
    oneSentence(visitCard.preference, `${questionId}:${optionId} preference`);
    // (3) featuredAnswer names the guest's exact option for the visit …
    assert.deepEqual(featuredAnswer(visited), { questionId, label: exact(optionId) }, `${questionId}:${optionId} visit label`);
    // … and for the concept lot (a fallback with nothing to visit).
    const concept = proposal(questionId, optionId, label, { kind: 'fallback', questionId });
    assert.equal(conceptVisit(concept)?.questionId, questionId, `${questionId}:${optionId} fallback without a visit reaches the concept lot`);
    assert.deepEqual(featuredAnswer(concept), { questionId, label: exact(optionId) }, `${questionId}:${optionId} concept label`);
  }
  // (2) Every swap in a modelled question reads a specific effect; one that brings or takes away a model is a configuration card.
  const ids = question.options.map(o => o.id);
  for (const from of ids) for (const to of ids) {
    if (from === to) continue;
    const swap = proposal(questionId, to, labelOf(to), { kind: 'swap', questionId, from, to });
    const evidence: CarrierChange[] = questionId === 'Q01' ? [{ socketId: 'nw', focal: true, district: false, ...(to === 'A' ? { low: true } : {}) }] : [];
    const card = residentResult(swap, evidence);
    const what = `${questionId} ${from}→${to}`;
    assert.ok(!GENERIC.has(card.effect), `${what} needs a specific effect, got: ${card.effect}`);
    if (ROTATION_VISITS[questionId][from] || ROTATION_VISITS[questionId][to]) {
      assert.equal(card.kind, 'configuration', `${what} shows a model change, so it needs its own swap card`);
      oneSentence(card.effect, `${what} effect`);
      assert.ok(!GENERIC.has(card.preference) && !card.preference.includes('」という暮らしを選びました'), `${what} preference row`);
    }
    // (3) … and for the swap.
    assert.deepEqual(featuredAnswer(swap), { questionId, label: exact(to) }, `${what} swap label`);
  }
}
