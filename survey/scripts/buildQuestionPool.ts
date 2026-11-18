// Regenerates src/pool/questionPool.v1.json from docs/planning-team/SURVEY_V2.md.
// `--check` only verifies that the committed JSON matches the Markdown (exit 1 when stale).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseSurveyMarkdown } from '../src/pool/surveyMarkdown.ts';

export const SURVEY_SOURCE = 'docs/planning-team/SURVEY_V2.md';
export const SURVEY_PATH = fileURLToPath(new URL(`../../${SURVEY_SOURCE}`, import.meta.url));
export const POOL_PATH = fileURLToPath(new URL('../src/pool/questionPool.v1.json', import.meta.url));

export function renderQuestionPool(): string {
  return `${JSON.stringify(parseSurveyMarkdown(readFileSync(SURVEY_PATH, 'utf8'), SURVEY_SOURCE), null, 2)}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const json = renderQuestionPool();
  if (process.argv.includes('--check')) {
    if (readFileSync(POOL_PATH, 'utf8') !== json) {
      console.error(`${POOL_PATH} is stale; run npm run pool:build`);
      process.exit(1);
    }
    console.log('question pool matches SURVEY_V2.md');
  } else {
    writeFileSync(POOL_PATH, json);
    console.log(`wrote ${POOL_PATH}`);
  }
}
