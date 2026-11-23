// tests/assert.ts keeps a failing test from exhausting the machine's memory (see the header there).
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import assert from './assert.ts';

// Every test imports the guarded assert, never node:assert directly.
const direct = readdirSync(new URL('.', import.meta.url))
  .filter(name => /\.(ts|mjs|js)$/.test(name) && name !== 'assert.ts')
  .filter(name => /from ['"](node:)?assert(\/strict)?['"]/.test(readFileSync(new URL(name, import.meta.url), 'utf8')));
assert.deepEqual(direct, [], 'import assert from ./assert.ts instead of node:assert');

const scene = new Group();
const material = new MeshStandardMaterial();
const [a, b] = [0, 1].map(() => new Mesh(new PlaneGeometry(1, 1, 400, 400), material));
scene.add(a, b);
const fails = (run: () => void, pattern: RegExp) => {
  const start = performance.now();
  assert.throws(run, pattern);
  assert.ok(performance.now() - start < 5000, 'a failing object assertion returns quickly');
};
b.name = 'deck';
fails(() => assert.equal(a, b, 'hit the wrong mesh'), /: hit the wrong mesh \(strictEqual: Mesh vs Mesh 'deck'; diff skipped/);
fails(() => assert.equal(undefined, a), /diff skipped/);
fails(() => assert.deepEqual([a], [b]), /diff skipped/);
fails(() => assert.notEqual(a, a), /diff skipped/);
fails(() => assert.notDeepEqual(a, a), /diff skipped/);
assert.equal(a, a);
assert.deepEqual([a.geometry], [a.geometry]);
assert.notEqual(a, b);

// Small values keep node:assert's own diff and messages.
assert.throws(() => assert.deepEqual({ x: 1 }, { x: 2 }), (e: Error) => /\+ +x: 1/.test(e.message) && /- +x: 2/.test(e.message));
// Node 26 appends this diff even to a custom message, which is why a message never protected objects.
assert.throws(() => assert.equal(1, 2, 'custom'), /: custom\n\n1 !== 2/);
assert.throws(() => assert(0 > 1), /assert\(0 > 1\)/);
assert.throws(() => assert.ok(false), /assert\.ok\(false\)/);
assert.equal(assert.strict, assert);

// The watchdog kills a runaway process with a readable reason.
const runaway = spawnSync(process.execPath, ['--input-type=module', '-e', `
  import './tests/assert.ts';
  // About 1 GB/s, so the sample every 200 ms stops it well short of the suite's normal peak.
  const hoard = [];
  for (;;) {
    hoard.push(Buffer.alloc(2 ** 20, 1));
    for (const start = Date.now(); Date.now() - start < 1;);
  }
`], { cwd: new URL('..', import.meta.url), env: { ...process.env, CITY2127_TEST_RSS_MB: '400' }, encoding: 'utf8', timeout: 30_000 });
assert.equal(runaway.signal, 'SIGKILL');
assert.match(runaway.stderr, /memory guard \(tests\/assert\.ts\): \d+ MB resident > 400 MB/);

console.log('assert guard ok (object failures skip the diff, runaway killed at the RSS limit)');
