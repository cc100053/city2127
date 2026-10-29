// Reuse the unchanged S0 runner for this batch's six selected views in one comparison report.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('artifacts/closeup-polish/capture.mjs','utf8');
const selection="const selected=matrix.filter(row=>!process.env.CITY_SHOT_ONLY||row.id===process.env.CITY_SHOT_ONLY);";
assert.equal(source.split(selection).length,2,'S0 runner selection changed; inspect before reusing');
const code=source.replace(selection,"const selected=matrix.filter(row=>['nw:focal','sw:focal','sw:district','se:district','energy:ring','hero'].includes(row.id));");
assert.equal(process.argv[2],'compare');
await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
