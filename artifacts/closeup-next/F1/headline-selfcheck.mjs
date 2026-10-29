// Exercise the copied helper's headline and energy fallback assertions without launching a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../../tests/energyE4.browser.mjs', import.meta.url), 'utf8');
const helper = source.slice(source.indexOf('async function headlineResult(view) {'), source.indexOf('async function answerWater() {'));
const reference = readFileSync(new URL('../../closeup-polish/formal.mjs', import.meta.url), 'utf8');
assert.ok(reference.includes(helper), 'the accepted S0 helper is copied verbatim');
const view = { guestCount: 2, latestProposal: { beforeLayout: {}, afterLayout: {} } };
async function check(headline, copy, kind = 'configuration') {
  const panel = { dataset: { guestCount: '2', presentation: 'result' } };
  const document = { querySelector: selector => selector === '.causal-panel' ? panel : { textContent: copy } };
  const city = {
    waitForFunction: async (predicate, count) => assert.ok(predicate(count)),
    locator: () => ({ textContent: async () => copy, getAttribute: async () => kind }),
  };
  const headlineResult = runInNewContext(`(${helper})`, { assert, city, document,
    pickHeadline: () => headline, residentResult: () => ({ preference: 'あなたは共有を選びました。' }) });
  await headlineResult(view);
}
await check({ socketId: 'sw' }, 'あなたは共有を選びました。ほかの住民の声と重なり、構成が変わりました。');
await assert.rejects(check({ socketId: 'sw' }, 'あなたは別の選択をしました。'));
await assert.rejects(check({ socketId: 'sw' }, 'あなたは共有を選びました。', 'maintained'));
await check(undefined, 'あなたは水庭を選びました。街のエネルギー設備は今の配置を受け継いでいます。');
await check({ energy: true }, 'あなたは水庭を選びました。蓄電庭園は1か所の配置になりました。');
await assert.rejects(check({ energy: true }, 'あなたは水庭を選びました。回答を記録しました。'));
console.log('PASS: verbatim helper; Meter preference/configuration, both energy fallbacks and rejected mismatches.');
