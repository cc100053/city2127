// asset/models/LIBRARY.md is the single index of reusable parts: every prop, module and model folder has a row,
// every row has its code, and every link in the index resolves.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const models = join(root, 'asset/models');
const libraryPath = join(models, 'LIBRARY.md');
const library = readFileSync(libraryPath, 'utf8');

/** First-column `names` of the table rows under the `## <heading>` section. */
function rows(heading: string): string[] {
  const section = library.split(/^## /m).find(s => s.startsWith(heading));
  assert.ok(section, `LIBRARY.md has no "## ${heading}" section`);
  return [...section.matchAll(/^\| `([a-z0-9_-]+)` \|/gm)].map(m => m[1]);
}

/** Keys of a Python dict literal `NAME = { 'key': ..., "key": ... }` in a builder file. */
function dictKeys(file: string, name: string): string[] {
  const src = readFileSync(join(models, file), 'utf8');
  const body = src.match(new RegExp(`^${name} = \\{([\\s\\S]*?)^\\}`, 'm'));
  assert.ok(body, `${file} has no ${name} dict`);
  return [...body[1].matchAll(/["']([a-z0-9_]+)["']\s*:/g)].map(m => m[1]);
}

function sameSet(label: string, code: string[], index: string[]) {
  const missing = code.filter(k => !index.includes(k));
  const stale = index.filter(k => !code.includes(k));
  assert.deepEqual(missing, [], `${label} without a LIBRARY.md row: ${missing.join(', ')}`);
  assert.deepEqual(stale, [], `LIBRARY.md ${label} rows without code: ${stale.join(', ')}`);
  assert.equal(new Set(index).size, index.length, `duplicate ${label} rows`);
}

sameSet('props', dictKeys('city-kit-2127/build_kit.py', 'PROPS'), rows('Props'));
sameSet('modules', dictKeys('city-kit-2127/modules.py', 'MODULES'), rows('Modules'));
const folders = readdirSync(models).filter(f => !f.startsWith('_') && !f.startsWith('.') && statSync(join(models, f)).isDirectory());
sameSet('model folders', folders, rows('Folders'));

for (const [, target] of library.replace(/`[^`]*`/g, '').matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
  if (/^[a-z]+:/.test(target)) continue;
  assert.ok(existsSync(resolve(models, target)), `LIBRARY.md link does not resolve: ${target}`);
}
console.log(`asset library index OK (${rows('Props').length} props, ${rows('Modules').length} modules, ${folders.length} folders)`);
