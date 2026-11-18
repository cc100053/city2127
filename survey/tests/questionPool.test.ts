import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseQuestionPool, QuestionPoolError } from '../src/pool/questionPool.ts';
import { parseSurveyMarkdown } from '../src/pool/surveyMarkdown.ts';
import { POOL_PATH, renderQuestionPool } from '../scripts/buildQuestionPool.ts';

const committed = readFileSync(POOL_PATH, 'utf8');
assert.equal(committed, renderQuestionPool(), 'questionPool.v1.json is stale; run npm run pool:build');

const pool = parseQuestionPool(JSON.parse(committed));
assert.equal(pool.questions.length, 9);
assert.equal(pool.parameters.length, 9);
assert.deepEqual(pool.questions.map(q => q.id), ['Q01', 'Q02', 'Q03', 'Q04', 'Q05', 'Q06', 'Q07', 'Q08', 'Q09']);
assert.equal(pool.parameters.find(p => p.id === pool.questions[1].parameter)?.label, '技術受容性');
for (const question of pool.questions) {
  for (const variant of [question.variants.P, question.variants.U]) {
    assert.deepEqual(variant.options.map(o => o.id), ['A', 'B', 'C']);
    assert.ok(variant.text && variant.situation);
  }
  assert.ok(question.variants.U.options.every(o => o.cityChange));
  assert.ok(question.variants.P.options.every(o => o.cityChange === undefined));
  // Options carry no votes: scoring is decided outside the pool.
  assert.ok([...question.variants.P.options, ...question.variants.U.options].every(o => !('effects' in o)));
}

const base = () => JSON.parse(committed);
const rejects = (mutate: (json: ReturnType<typeof base>) => void, pattern: RegExp) => {
  const json = base();
  mutate(json);
  assert.throws(() => parseQuestionPool(json), (error: unknown) => error instanceof QuestionPoolError && pattern.test(error.message));
};
rejects(j => { j.questions[1].id = j.questions[0].id; }, /duplicate question id/);
rejects(j => { j.parameters[1].id = j.parameters[0].id; }, /duplicate parameter id/);
rejects(j => { j.questions[0].parameter = 'nope'; }, /unknown parameter "nope"/);
rejects(j => { j.questions[0].variants.P.options.pop(); }, /exactly options A, B and C/);
rejects(j => { j.questions[0].variants.U.options[2].id = 'D'; }, /must be "C"/);
rejects(j => { j.questions[0].variants.U.options[0].cityChange = ''; }, /cityChange must be a non-empty string/);
rejects(j => { j.questions[0].variants.P.options[0].cityChange = 'x'; }, /only allowed on U options/);
rejects(j => { j.questions[0].variants.P.text = ' '; }, /text must be a non-empty string/);

const md = (extra = '') => `## Q01｜委任度\n\n- **関連仮説：** 甲／乙\n- **上位カテゴリー：** 技術と人間\n- **内部パラメータ：** 委任度\n${extra}
### P01（心理テスト系）\n\n**質問文：** 問\n\n**日常的な状況・外的要因：** 状況\n
| 選択肢 | 内容 | そう解釈する理由 |\n| --- | --- | --- |\n| A | a | ra |\n| B | b | rb |\n| C | c | rc |\n
### U01（都市企画系）\n\n**質問文：** 問U\n\n**日常的な状況・外的要因：** 状況U\n
| 選択肢 | 内容 | そう解釈する理由 | 都市の具体的な変化 |\n| --- | --- | --- | --- |\n| A | a | ra | ca |\n| B | b | rb | cb |\n| C | c | rc | cc |\n\n※注\n`;
const parsed = parseSurveyMarkdown(md(), 'test.md');
assert.deepEqual(parsed.questions[0].hypotheses, ['甲', '乙']);
assert.deepEqual(parsed.questions[0].variants.U.notes, ['※注']);
assert.equal(parsed.questions[0].variants.U.options[2].cityChange, 'cc');
assert.throws(() => parseSurveyMarkdown(md('stray line\n'), 'test.md'), /test\.md:6: unexpected line/);
assert.throws(() => parseSurveyMarkdown(md().replace('## Q01｜委任度', '## Q01｜別名'), 'test.md'), /differs from 内部パラメータ/);

console.log('questionPool tests passed');
