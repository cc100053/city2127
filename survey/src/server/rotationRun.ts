import type { DatabaseSync } from 'node:sqlite';
import type { ProposalRecord, ProposalRotation, RotationCity } from '../shared/cityView.ts';
import { crowdShare, foldRotation, type RotationFold, type RotationSet, type RotationSubmission } from '../shared/rotation.ts';
import type { SurveyContext } from './context.ts';
import { CorruptStateError, num, str } from './runStore.ts';

export type QuestionKind = 'axes' | 'rotation';

/** The kind of the run's active proposals, or null for a run without any. A run never mixes kinds. */
export function runQuestionKind(db: DatabaseSync, runId: string): QuestionKind | null {
  const kinds = db.prepare('SELECT DISTINCT question_kind FROM active_proposal_events WHERE run_id = ?').all(runId).map(row => str(row, 'question_kind'));
  if (kinds.length > 1) throw new CorruptStateError(`run ${runId} mixes four-axis and rotation proposals`);
  return (kinds[0] as QuestionKind | undefined) ?? null;
}

/** Whether new proposals in this run use the rotation set: configured, and the run holds no four-axis proposals. */
export function rotationActive(ctx: SurveyContext, runId: string): ctx is SurveyContext & { rotation: RotationSet } {
  return !!ctx.rotation && runQuestionKind(ctx.db, runId) !== 'axes';
}

export type RunRotation = { fold: RotationFold; byId: Map<string, ProposalRotation> };

/**
 * Folds the run's active rotation proposals (those before `beforeSequence`) in sequence order. The stamp is
 * the proposal sequence and the drawn questions are its four stored answers, so Undo and restart replay.
 */
export function runRotation(ctx: SurveyContext & { rotation: RotationSet }, runId: string, beforeSequence = Number.MAX_SAFE_INTEGER): RunRotation {
  const ids: string[] = [];
  const submissions: RotationSubmission[] = [];
  for (const row of ctx.db.prepare(`SELECT id, sequence, answers_json FROM active_proposal_events
      WHERE run_id = ? AND question_kind = 'rotation' AND sequence < ? ORDER BY sequence`).iterate(runId, beforeSequence)) {
    const answers = JSON.parse(str(row, 'answers_json')) as { questionId: string; optionId: string }[];
    ids.push(str(row, 'id'));
    submissions.push({ stamp: num(row, 'sequence'), drawn: answers.map(a => a.questionId), answers: Object.fromEntries(answers.map(a => [a.questionId, a.optionId])) });
  }
  // Crowd shares for each proposal include every answer up to and including it.
  const byId = new Map<string, ProposalRotation>();
  const fold = foldRotation(ctx.rotation, submissions, (index, step) => {
    byId.set(ids[index], { outcome: step.outcome, shares: Object.entries(submissions[index].answers).map(([q, o]) => crowdShare(step.tallies, q, o)) });
  });
  return { fold, byId };
}

export function rotationCity(set: RotationSet, fold: RotationFold): RotationCity {
  return { version: set.version, shown: fold.state.shown, changedAt: fold.state.changedAt };
}

export function withRotation(record: ProposalRecord, run: RunRotation | undefined): ProposalRecord {
  const rotation = run?.byId.get(record.id);
  return rotation ? { ...record, rotation } : record;
}
