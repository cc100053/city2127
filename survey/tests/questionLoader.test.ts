import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadQuestionSetFile, parseQuestionSet, QuestionSetError } from '../src/survey/questionLoader.ts';
import { MVP_QUESTIONS_PATH, QUESTIONS_PATH } from './surveyFixture.ts';

const set = loadQuestionSetFile(QUESTIONS_PATH);
assert.equal(set.version, 1);
assert.equal(set.questions.length, 8);
assert.ok(set.questions.every(q => q.options.length === 3));

const base = () => JSON.parse(readFileSync(QUESTIONS_PATH, 'utf8'));
const rejects = (mutate: (json: ReturnType<typeof base>) => void, pattern: RegExp) => {
  const json = base();
  mutate(json);
  assert.throws(() => parseQuestionSet(json), (error: unknown) => error instanceof QuestionSetError && pattern.test(error.message));
};
rejects(j => { j.questions[1].id = j.questions[0].id; }, /duplicate question id/);
rejects(j => { j.questions[0].options[1].id = j.questions[0].options[0].id; }, /duplicate option id/);
rejects(j => { j.questions[0].options[0].effects.happiness = 1; }, /unknown city axis "happiness"/);
rejects(j => { j.questions[0].options[0].effects.automation = 4; }, /between -3 and 3/);
rejects(j => { j.questions[0].options[0].effects.automation = -4; }, /between -3 and 3/);
rejects(j => { j.questions[0].options[0].effects.automation = 1.5; }, /must be an integer/);
rejects(j => { j.questions[0].options[0].effects.automation = '2'; }, /must be an integer/);
rejects(j => { j.questions[0].options = []; }, /has no options/);
rejects(j => { j.questions[0].id = ''; }, /id must be a non-empty string/);
rejects(j => { j.questions[0].options[0].id = ' '; }, /id must be a non-empty string/);
rejects(j => { j.questions[0].text = ''; }, /text must be a non-empty string/);
rejects(j => { j.questions[0].options[0].label = ''; }, /label must be a non-empty string/);
rejects(j => { delete j.version; }, /version/);
rejects(j => { j.questions[0].trigger = { happiness: { gte: 1 } }; }, /unknown city axis "happiness"/);
rejects(j => { j.questions[0].trigger = { automation: { gt: 1 } }; }, /unknown bound "gt"/);
rejects(j => { j.questions[0].trigger = { automation: {} }; }, /gte and\/or lte/);
rejects(j => { j.questions[0].trigger = { automation: { gte: 1.5 } }; }, /must be an integer/);
rejects(j => { j.questions[0].background = ''; }, /background must be a non-empty string/);
rejects(j => { j.questions[0].year = '2082'; }, /year must be an integer/);

// The exhibition MVP question set loads and keeps scenario metadata server-side.
const mvp = loadQuestionSetFile(MVP_QUESTIONS_PATH);
assert.deepEqual(mvp.questions.find(q => q.id === 'automation-street-decline')?.trigger, { automation: { gte: 2 } });
assert.ok(mvp.questions.every(q => q.background && q.year && q.pressure));
console.log('PASS: question JSON loads; duplicate/unknown/out-of-range/empty definitions are rejected.');
