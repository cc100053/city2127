import test from 'node:test';
import assert from 'node:assert/strict';
import { QR_LANDMARKS, selectQrLandmark } from '../src/landmarkSelection.js';

test('a proposal keeps the same QR landmark', () => {
  assert.deepEqual(selectQrLandmark('proposal-42'), selectQrLandmark('proposal-42'));
});

test('QR candidates are landmarks loaded in the visible city district', () => {
  assert.deepEqual(QR_LANDMARKS.map(landmark => landmark.id), [
    'aqua-city-odaiba',
    'divercity-tokyo-plaza',
    'grand-nikko-tokyo-daiba',
  ]);
});

test('the selector reaches every prepared landmark', () => {
  const selected = new Set(Array.from({ length: 200 }, (_, index) => selectQrLandmark(`proposal-${index}`).id));
  assert.deepEqual(selected, new Set(QR_LANDMARKS.map(landmark => landmark.id)));
});
