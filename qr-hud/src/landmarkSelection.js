export const QR_LANDMARKS = [
  { id: 'fuji-tv', label: 'フジテレビ本社ビル' },
  { id: 'telecom-center', label: 'テレコムセンター' },
  { id: 'divercity-office-tower', label: 'ダイバーシティオフィスタワー' },
];

/** Stable per-proposal choice: random-looking, but unchanged after reload. */
export function selectQrLandmark(proposalId = '') {
  let hash = 0x811c9dc5;
  for (const character of proposalId || '2127') {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return QR_LANDMARKS[(hash >>> 0) % QR_LANDMARKS.length];
}
