// Raw captures live outside Git (docs/VALIDATION.md, Evidence storage); only scripts/publish-evidence.mjs output is committed under artifacts/.
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const evidenceRoot = process.env.CITY2127_EVIDENCE_ROOT ?? join(homedir(), 'city2127-evidence');

export function evidenceDir(...parts) {
  const dir = join(evidenceRoot, ...parts);
  mkdirSync(dir, { recursive: true });
  return dir;
}
