import test from 'node:test';
import assert from 'node:assert/strict';
import { selectQrLandmark } from '../src/landmarkSelection.js';

const candidates = ['future-tower-0', 'future-tower-1', 'future-pavilion-2'].map(id => ({ id }));

test('a proposal keeps the same QR landmark', () => {
  assert.deepEqual(selectQrLandmark('proposal-42', candidates), selectQrLandmark('proposal-42', candidates));
});

test('only the supplied snapshot candidates can be selected', () => {
  assert.equal(selectQrLandmark('proposal-42', [candidates[2]]).id, candidates[2].id);
  assert.throws(() => selectQrLandmark('proposal-42', []), /No building/);
});

test('the selector reaches every prepared landmark', () => {
  const selected = new Set(Array.from({ length: 200 }, (_, index) => selectQrLandmark(`proposal-${index}`, candidates).id));
  assert.deepEqual(selected, new Set(candidates.map(landmark => landmark.id)));
});
