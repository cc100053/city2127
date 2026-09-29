import type { PublicQuestion } from '../shared/question.ts';
import type { ProposalRequest } from '../shared/protocol.ts';

/** Build one complete, ordered proposal; retries should reuse the returned request unchanged. */
export function buildProposalRequest(
  questions: readonly PublicQuestion[],
  choices: ReadonlyMap<string, string>,
  guestSessionId: string,
  submissionId: string,
  expectedRevision: number,
): ProposalRequest | undefined {
  if (questions.length !== 4 || !guestSessionId || !submissionId
      || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) return undefined;
  const answers: ProposalRequest['answers'] = [];
  for (const question of questions) {
    const optionId = choices.get(question.id);
    if (!optionId || !question.options.some(option => option.id === optionId)) return undefined;
    answers.push({ questionId: question.id, optionId });
  }
  return { submissionId, guestSessionId, expectedRevision, answers };
}
