import assert from 'node:assert/strict';
import { CARD_FADE, REPLAY_FROM, REPLAY_UNTIL, VOICES_SECONDS, demoVoices, meterPoints, strongestLean, voicesCardOpacity, voicesShown, votedAxes, type VoiceRecord } from '../src/voicesReplay.ts';
import { AttractLoop, SEGMENTS } from '../src/attractLoop.ts';
import * as T from 'three';

assert.equal(VOICES_SECONDS, 25);
assert.equal(voicesShown(0, 40), 0); assert.equal(voicesShown(REPLAY_FROM, 40), 0);
assert.equal(voicesShown((REPLAY_FROM + REPLAY_UNTIL) / 2, 40), 20, 'half-way through the replay half the guests have landed');
assert.equal(voicesShown(REPLAY_UNTIL + 1, 40), 40);
assert.equal(voicesCardOpacity(0), 0); assert.equal(voicesCardOpacity(10), 1); assert.ok(Math.abs(voicesCardOpacity(VOICES_SECONDS - CARD_FADE / 2) - .5) < 1e-9);

const v = (ordinal: number, automation: number, publicSharing: number, score = 0): VoiceRecord =>
  ({ ordinal, votes: { automation, publicSharing, environmentalPriority: 0, urbanConcentration: 0, energy: 'water-storage' }, afterScores: { automation: score, publicSharing: -score, environmentalPriority: 0, urbanConcentration: 0 } });
const history = [v(1, 1, 0, 12), v(2, 1, -1, 0), v(3, -1, -1, -12), v(4, 1, 0, 6)];
assert.deepEqual(votedAxes(history).map(a => a.axis), ['automation', 'publicSharing'], 'axes nobody moved (energy placeholder) are left out');
assert.deepEqual(strongestLean(history), { axis: 'automation', word: '自律', share: .75 }, '+1 on automation reads as the 自律 side');
assert.deepEqual(strongestLean([v(1, -1, 0), v(2, -1, 0), v(3, 0, 1)]), { axis: 'automation', word: '人', share: 2 / 3 });
assert.equal(meterPoints(history, 'automation', 0, 100, 10), '');
assert.equal(meterPoints(history, 'automation', 2.5, 300, 10), '0.0,0.0 100.0,5.0', 'landed guests only, x across the whole run, +12 at the top');
assert.equal(meterPoints(history, 'automation', 4, 300, 10).split(' ').at(-1), '300.0,2.5');

const demo = demoVoices(60);
assert.equal(demo.length, 60); assert.deepEqual(demo.map(r => r.ordinal), Array.from({ length: 60 }, (_, i) => i + 1));
assert.ok(demo.every(r => Math.abs(r.afterScores.automation) <= 12) && votedAxes(demo).length === 3, 'seeded preview stays in range and votes on three axes');

// The loop hands 声の灯 its segment time only when the run is long enough.
const calls: (number | null)[] = [];
let ready = true;
const loop = new AttractLoop(new T.PerspectiveCamera(), { target: new T.Vector3(), enabled: true }, null, 10, 0, { get ready() { return ready; }, update: t => calls.push(t) });
loop.update(10, false, false, 0); loop.update(10 + SEGMENTS.voices[0] + 3, false, false, 0);
assert.deepEqual(calls, [null, 3]);
ready = false; loop.update(10 + SEGMENTS.voices[0] + 4, false, false, 0); assert.equal(calls.at(-1), null, 'too few guests: no 声の灯');
loop.wake(40); assert.equal(calls.at(-1), null, 'wake stops it');

// Lanterns: only landed guests show during the replay, and the city's lanterns come back untouched.
// Minimal canvas stub for the journey's glow texture (node has no DOM).
const context = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, fillStyle: '' };
Object.assign(globalThis, { document: { createElement: () => ({ getContext: () => context }) } });
const { VoteJourney } = await import('../src/voteJourney.ts');
const scene = new T.Scene(), journey = new VoteJourney(scene, new T.PerspectiveCamera());
const lanterns = scene.children.find(o => (o as T.InstancedMesh).isInstancedMesh && (o as T.InstancedMesh).count > 12) as T.InstancedMesh;
const visible = () => { let n = 0; const m = new T.Matrix4(), p = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3(); for (let i = 0; i < lanterns.count; i++) { lanterns.getMatrixAt(i, m); m.decompose(p, q, sc); if (sc.x > 0) n++; } return n; };
journey.setLanterns(history);
const before = lanterns.instanceMatrix.array.slice();
assert.equal(visible(), 16);
journey.replayLanterns(history, 0); assert.equal(visible(), 0, 'all dark before the first voice');
journey.replayLanterns(history, 2); assert.equal(visible(), 8);
journey.replayLanterns(history, 2.5); assert.equal(visible(), 12, 'the next guest is rising');
journey.endReplay(); assert.deepEqual(lanterns.instanceMatrix.array, before, 'endReplay restores the lanterns exactly');

console.log('PASS: 声の灯 timing, card fade, voted axes, strongest lean, Meter curve points, seeded preview and loop hand-off.');
