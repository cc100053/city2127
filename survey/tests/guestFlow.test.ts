import assert from 'node:assert/strict';
import type { PublicQuestion } from '../src/shared/question.ts';
import { buildProposalRequest } from '../src/ui/guestFlow.ts';

const questions: PublicQuestion[] = ['q1', 'q2', 'q3', 'q4'].map(id => ({
  id, text: id, options: [{ id: `${id}-yes`, label: 'yes' }, { id: `${id}-no`, label: 'no' }],
}));
const choices = new Map(questions.map(question => [question.id, question.options[1].id]));

assert.equal(buildProposalRequest(questions, new Map(), 'session', 'submission', 0), undefined,
  'a proposal cannot be built until every question is answered');
assert.equal(buildProposalRequest(questions, new Map([...choices, ['q3', 'foreign-option']]), 'session', 'submission', 0), undefined,
  'each draft choice must belong to its question');
assert.deepEqual(buildProposalRequest(questions, choices, 'session', 'submission', 7), {
  submissionId: 'submission', guestSessionId: 'session', expectedRevision: 7,
  answers: questions.map(question => ({ questionId: question.id, optionId: `${question.id}-no` })),
}, 'the request preserves question order and the reviewed revision');

console.log('PASS: guest proposal builder requires four valid choices and preserves request order/revision.');
