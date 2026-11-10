import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SCORE_MAX, SCORE_MIN } from '../src/shared/citySurveyState.ts';
import { ENERGY_CHOICES } from '../src/shared/energy.ts';
import { hasOptionIcon } from '../src/ui/guestIcons.ts';
import { AXIS_VIEWS, ENERGY_TITLES, OPTION_SIDE, energyShares, leanText, scorePercent } from '../src/ui/guestTendency.ts';

assert.equal(scorePercent(SCORE_MIN), 0);
assert.equal(scorePercent(0), 50);
assert.equal(scorePercent(SCORE_MAX), 100);
assert.equal(scorePercent(SCORE_MAX + 5), 100, 'out-of-range scores stay on the track');

const poles = { low: '人に相談', high: 'いつでも自動' };
assert.equal(leanText(0, poles), 'ちょうど半ば');
assert.equal(leanText(-3, poles), 'やや「人に相談」寄り');
assert.equal(leanText(8, poles), '「いつでも自動」が多い街');

assert.deepEqual(energyShares({ 'water-storage': 0, 'rotor-storage': 0, 'orbital-supply': 0, 'island-supply': 0 }),
  { 'water-storage': 0, 'rotor-storage': 0, 'orbital-supply': 0, 'island-supply': 0 }, 'no energy votes yet: no shares');
const thirds = energyShares({ 'water-storage': 1, 'rotor-storage': 1, 'orbital-supply': 1, 'island-supply': 0 });
assert.equal(Object.values(thirds).reduce((sum, value) => sum + value, 0), 100, 'rounded shares always add to 100');
assert.equal(thirds['island-supply'], 0);

// The guest-side tables must cover the live question set, or a renamed option would silently lose its icon or marker.
const questionSet = JSON.parse(readFileSync(fileURLToPath(new URL('../src/survey/questions.exhibition.json', import.meta.url)), 'utf8')) as
  { questions: { id: string; options: { id: string; energy?: string }[] }[] };
for (const question of questionSet.questions)
  for (const option of question.options) assert.ok(hasOptionIcon(option.id), `icon for ${option.id}`);
for (const view of AXIS_VIEWS) {
  const question = questionSet.questions.find(item => item.id === view.questionId);
  assert.ok(question, `question ${view.questionId} exists`);
  assert.deepEqual(question.options.map(option => OPTION_SIDE[option.id]), [-1, 0, 1], `${view.questionId} options run low → high`);
}
for (const choice of ENERGY_CHOICES) assert.ok(ENERGY_TITLES[choice] && hasOptionIcon(choice), `energy ${choice} has a title and icon`);

console.log('PASS: guest tendency scale, lean wording, energy shares and option coverage.');
