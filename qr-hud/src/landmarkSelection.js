/** Stable per-proposal choice: random-looking, but unchanged after reload. */
export function selectQrLandmark(proposalId = '', candidates) {
  if (!candidates?.length) throw new Error('No building is present in this city snapshot.');
  let hash = 0x811c9dc5;
  for (const character of proposalId || '2127') {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return candidates[(hash >>> 0) % candidates.length];
}
