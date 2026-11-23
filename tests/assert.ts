// node:assert/strict for every test, with two guards against a test eating the machine (2026-11-24: a
// failing `assert.equal(hit?.object, mesh)` grew one test process past 380 GB in minutes).
// 1. A failing equality on objects whose full inspection is large fails with a short message instead of
//    the unbounded inspect-and-diff node:assert builds, which grows at ~1.7 GB/s for three.js objects.
// 2. A watchdog thread kills the process once its resident memory passes CITY2127_TEST_RSS_MB
//    (default 3072; `npm test` peaks near 1.5 GB). 0 turns it off.
// Import this instead of node:assert; tests/assertGuard.test.ts enforces that.
import strict from 'node:assert/strict';
import { inspect, isDeepStrictEqual } from 'node:util';
import { isMainThread, Worker } from 'node:worker_threads';

type Message = string | Error | undefined;

const limitMB = Number(process.env.CITY2127_TEST_RSS_MB ?? 3072);
// The thread keeps sampling while the test's own thread is stuck in synchronous work. An eval'd worker
// may load as ESM, so it reaches builtins without require.
if (isMainThread && limitMB > 0) new Worker(`
  const { workerData: { limit } } = process.getBuiltinModule('node:worker_threads');
  setInterval(() => {
    const rss = process.memoryUsage.rss();
    if (rss <= limit * 2 ** 20) return;
    process.getBuiltinModule('node:fs').writeSync(2,'\\nmemory guard (tests/assert.ts): ' + Math.round(rss / 2 ** 20) + ' MB resident > '
      + limit + ' MB, killing pid ' + process.pid + '. Raise CITY2127_TEST_RSS_MB if this test really needs it.\\n');
    process.kill(process.pid, 'SIGKILL');
  }, 200);
`, { eval: true, workerData: { limit: limitMB } }).unref();

/** Above this many inspected characters per operand the diff is skipped (node:assert inspects without limits). */
const MAX_DIFF = 20_000;
const large = (value: unknown) => typeof value === 'string' ? value.length > MAX_DIFF
  : typeof value === 'object' && value !== null
    && inspect(value, { customInspect: false, depth: 1000, maxArrayLength: 1000, maxStringLength: MAX_DIFF, getters: true }).length > MAX_DIFF;
function brief(value: unknown) {
  if (typeof value !== 'object' || value === null) return inspect(value, { maxStringLength: 80 });
  if (Array.isArray(value)) return `Array(${value.length})`;
  const name = (value as { name?: unknown }).name;
  return `${value.constructor?.name ?? 'Object'}${typeof name === 'string' && name ? ` '${name}'` : ''}`;
}

function cheapFail(message: Message, operator: string, actual: unknown, expected: unknown): never {
  if (message instanceof Error) throw message;
  strict.fail(`${message ?? 'Assertion failed'} (${operator}: ${brief(actual)} vs ${brief(expected)}; diff skipped, operands too large)`);
}

function guard(pass: (a: unknown, b: unknown) => boolean, check: (a: unknown, b: unknown, m?: Message) => void, operator: string) {
  return function (actual: unknown, expected: unknown, message?: Message) {
    if (pass(actual, expected)) return;
    if (large(actual) || large(expected)) cheapFail(message, operator, actual, expected);
    // Node 26 rejects an explicit undefined message.
    if (message === undefined) check.call(strict, actual, expected);
    else check.call(strict, actual, expected, message);
  };
}

const equal = guard(Object.is, strict.strictEqual, 'strictEqual');
const notEqual = guard((a, b) => !Object.is(a, b), strict.notStrictEqual, 'notStrictEqual');
const deepEqual = guard(isDeepStrictEqual, strict.deepStrictEqual, 'deepStrictEqual');
const notDeepEqual = guard((a, b) => !isDeepStrictEqual(a, b), strict.notDeepStrictEqual, 'notDeepStrictEqual');

// Bound, so a failing `assert(expr)` still reports the caller's expression.
const assert = Object.assign(strict.ok.bind(null), strict, {
  equal, strictEqual: equal, notEqual, notStrictEqual: notEqual,
  deepEqual, deepStrictEqual: deepEqual, notDeepEqual, notDeepStrictEqual: notDeepEqual,
}) as typeof strict;
assert.strict = assert;

export default assert;
