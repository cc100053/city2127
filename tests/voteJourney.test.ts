import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as T from 'three';
import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';
import { changeSites, LOTS } from '../src/layout.ts';
import { METER_COLORS } from '../src/districtMeters.ts';
import { SITE_TRANSITION_SECONDS } from '../src/siteBuilders/siteRuntime.ts';
import { ARRIVAL_SECONDS, FLIGHT_SECONDS, landingFor, lanternSpot, rotationFlights, rotationLantern, VoteJourney } from '../src/voteJourney.ts';

// The journey plus the city transition finishes inside one 10 s reading slot, leaving the slot's end for reading.
assert.ok(ARRIVAL_SECONDS + SITE_TRANSITION_SECONDS <= DISPLAY_MS / 1000 - 4, `journey ${ARRIVAL_SECONDS}s + transition must leave 4 s of the slot`);

// Lanterns are deterministic and float above their own focal site, clear of trees and podiums.
const sites = { automation: changeSites.nw, publicSharing: changeSites.sw, environmentalPriority: changeSites.ne, urbanConcentration: changeSites.se };
for (const [axis, site] of Object.entries(sites) as [keyof typeof sites, typeof changeSites.nw][]) for (let ordinal = 1; ordinal <= 80; ordinal++) {
  const p = lanternSpot(ordinal, axis);
  assert.deepEqual(p, lanternSpot(ordinal, axis));
  assert.ok(Math.hypot(p.x - site.x, p.z - site.z) <= Math.max(site.w, site.d) * site.scale * 1.1 + 1e-9, `${axis} #${ordinal} stays over its site`);
  assert.ok(p.y >= 42 && p.y <= 64);
}
assert.notDeepEqual(lanternSpot(1, 'automation'), lanternSpot(2, 'automation'));
// A district headline lands its own axis on the changed slots; other axes, energy and focal-only results keep the focal site.
const bays = { socketId: 'nw', points: [{ x: 100, z: 0, r: 26 }, { x: 200, z: 40, r: 26 }] };
assert.deepEqual(landingFor('automation', false, bays), { x: 150, z: 20, scans: bays.points });
assert.deepEqual(landingFor('publicSharing', false, bays), landingFor('publicSharing', false));
assert.equal(landingFor('automation', false, { socketId: 'nw' }).x, changeSites.nw.x);
assert.equal(landingFor('environmentalPriority', true, { socketId: 'ne', points: bays.points }).scans.length, 1);
assert.equal(landingFor('automation', false, { socketId: 'nw', points: Array.from({ length: 20 }, (_, i) => ({ x: i, z: 0, r: 1 })) }).scans.length, 8);

// --- Whole journeys, headless: glowTexture only needs a 2D canvas stub. Scene children: points, scans, lanterns, big rotation orb.
const ctx = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, fillStyle: '' };
(globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
const journey = () => {
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 16 / 9, 1, 5000);
  camera.position.set(600, 400, 700); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  return { scene, j: new VoteJourney(scene, camera) };
};
const parts = (scene: T.Scene) => scene.children as [T.Points, T.InstancedMesh, T.InstancedMesh, T.Points];
const round = (a: ArrayLike<number>, k: number) => Array.from(a).slice(0, k).map(v => Math.round(v * 1e4) / 1e4);
function snap(scene: T.Scene) {
  const [points, scans, lanterns] = parts(scene), n = points.geometry.drawRange.count;
  return { n, pos: round(points.geometry.attributes.position.array, n * 3), col: round(points.geometry.attributes.color.array, n * 3),
    scans: scans.count, scanM: round(scans.instanceMatrix.array, scans.count * 16), scanC: scans.instanceColor ? round(scans.instanceColor.array, scans.count * 3) : null,
    lanM: round(lanterns.instanceMatrix.array, 64 * 4 * 16), lanC: round(lanterns.instanceColor!.array, 64 * 4 * 3) };
}
/** Visible lanterns as world positions and colours. */
function lit(scene: T.Scene) {
  const lanterns = parts(scene)[2], m = new T.Matrix4(), c = new T.Color(), out: { slot: number; at: T.Vector3; color: string; scale: number }[] = [];
  for (let i = 0; i < lanterns.count; i++) {
    lanterns.getMatrixAt(i, m); const at = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3(); m.decompose(at, q, s);
    if (s.x > 0) { lanterns.getColorAt(i, c); out.push({ slot: i, at, color: `#${c.getHexString()}`, scale: Math.round(s.x * 100) / 100 }); }
  }
  return out;
}

// version4 `play` and `setLanterns` are unchanged by the rotation path: the digest of every buffer at eight moments of four journeys
// (mixed votes, energy, a district landing, all-zero) equals the one recorded from the pre-rotation voteJourney.ts (93720bb5).
{
  const v4 = { automation: 1, publicSharing: -1, environmentalPriority: 0, urbanConcentration: 1 };
  const energy = { automation: -1, publicSharing: 0, environmentalPriority: 1, urbanConcentration: 0, energy: 'solar' as const };
  const cases = [['mixed', v4, undefined], ['energy', energy, undefined],
    ['landing', { automation: 1, publicSharing: 1, environmentalPriority: -1, urbanConcentration: -1 }, bays],
    ['zero', { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 }, undefined]] as const;
  const out: Record<string, Record<number, unknown>> = {};
  for (const [name, votes, landing] of cases) {
    const { scene, j } = journey();
    j.setLanterns([{ ordinal: 1, votes: v4 }, { ordinal: 2, votes: energy }]);
    j.play(votes, 3, 10, landing);
    out[name] = {};
    for (const t of [10, 10.5, 11.2, 12, 12.3, 12.7, 13.5, 15]) { j.update(t, .3); out[name][t] = snap(scene); }
    assert.equal(parts(scene)[3].geometry.drawRange.count, 0, 'version4 never draws the big rotation orb');
  }
  assert.equal(createHash('sha256').update(JSON.stringify(out)).digest('hex'), '3cca8456d02b4b9a027bffcd19497bfa563d8bb287e4c12264defd53c34e8fcf', 'version4 journey changed');
}

// Rotation runs (option A): the outcome question's big orb flies to its site, the guest's other answers fade at their apex.
const answers = ['Q01', 'Q03', 'Q05', 'Q07'].map(questionId => ({ questionId, optionId: 'A' }));
const neutral = '#fff1d6', auto = `#${new T.Color(METER_COLORS.automation).getHexString()}`, nw = changeSites.nw;
const flight = (outcome: Parameters<typeof rotationFlights>[0], ordinal = 5, visit?: string) => {
  const { scene, j } = journey(), proposal = { ordinal, answers, rotation: { outcome, ...(visit ? { visit } : {}) } }, start = 10;
  j.playRotation(proposal, start);
  const [points, scans, , big] = parts(scene), frames: { t: number; small: number; big: number; scans: number; smallPeak: number }[] = [];
  for (let t = start; t <= start + 5; t += .05) {
    j.update(t, 0);
    const col = points.geometry.attributes.color.array, n = points.geometry.drawRange.count;
    let peak = 0; for (let i = 0; i < n * 3; i++) peak = Math.max(peak, col[i]);
    frames.push({ t: t - start, small: n, big: big.geometry.drawRange.count, scans: scans.count, smallPeak: peak });
  }
  return { scene, j, proposal, frames };
};
{
  // A swap: one Meter-colour orb to NW plus three neutral fading orbs; the scan ring rises over NW and one automation lantern stays there.
  const outcome = { kind: 'swap', questionId: 'Q01', from: 'B', to: 'C' } as const;
  assert.deepEqual(rotationFlights(outcome, answers), [{ questionId: 'Q01', site: { x: nw.x, z: nw.z, extent: Math.max(nw.w, nw.d) * nw.scale, color: METER_COLORS.automation, slot: 'automation' }, color: METER_COLORS.automation },
    ...['Q03', 'Q05', 'Q07'].map(questionId => ({ questionId, color: neutral }))]);
  const { scene, frames } = flight(outcome);
  assert.ok(frames.some(f => f.big > 0 && f.small > 0), 'big and small orbs fly together');
  assert.ok(Math.max(...frames.map(f => f.small)) <= 3 * 23 && Math.max(...frames.map(f => f.big)) <= 23, 'three small trails, one big trail');
  // The fading orbs dim to nothing as they reach their apex (the last one starts 3 staggers late), and never leave a scan or lantern.
  const lastFade = FLIGHT_SECONDS + 3 * .14;
  assert.ok(frames.filter(f => f.t > lastFade - .1 && f.t < lastFade).every(f => f.smallPeak < .05), 'fading orbs end dark');
  assert.ok(frames.filter(f => f.t > .3 && f.t < 1).every(f => f.smallPeak > 1), 'fading orbs are bright before the apex');
  assert.equal(frames.find(f => f.t > FLIGHT_SECONDS + .05)!.big, 0, 'the big orb lands on time');
  assert.equal(Math.max(...frames.map(f => f.scans)), 1, 'one scan ring');
  const [, scans] = parts(scene); assert.equal(frames.at(-1)!.small + frames.at(-1)!.big, 0, 'every flight clears');
  const lanterns = lit(scene);
  assert.equal(lanterns.length, 1);
  assert.equal(lanterns[0].color, auto); assert.equal(lanterns[0].scale, 1);
  assert.ok(Math.hypot(lanterns[0].at.x - nw.x, lanterns[0].at.z - nw.z) <= Math.max(nw.w, nw.d) * nw.scale * 1.1, 'lantern over NW');
  assert.equal(scans.count, 0);
}
{
  // A fallback on Q01 still lands at NW, neutral, with no change: a small neutral lantern.
  const outcome = { kind: 'fallback', questionId: 'Q01' } as const;
  assert.equal(rotationFlights(outcome, answers)[0].color, neutral);
  const { scene, frames } = flight(outcome);
  assert.ok(frames.some(f => f.big > 0) && Math.max(...frames.map(f => f.scans)) === 1);
  assert.deepEqual(lit(scene).map(l => [l.color, l.scale]), [[neutral, .7]]);
}
{
  // Plan 3.4: a swap with no site that visits Q01 lands at NW like a Q01 fallback (the camera's stop), with a neutral lantern.
  const { scene, frames } = flight({ kind: 'swap', questionId: 'Q05', from: 'A', to: 'B' }, 5, 'Q01');
  assert.ok(frames.some(f => f.big > 0) && Math.max(...frames.map(f => f.scans)) === 1);
  assert.deepEqual(lit(scene).map(l => [l.color, l.scale]), [[neutral, .7]]);
}
{
  // A question without a site (most of the nine today): four fading orbs, no big orb, no scan ring, no lantern.
  for (const outcome of [{ kind: 'swap', questionId: 'Q05', from: 'A', to: 'B' } as const, { kind: 'fallback', questionId: 'Q04' } as const]) {
    assert.deepEqual(rotationFlights(outcome, answers).map(f => [f.questionId, f.color, f.site]), answers.map(a => [a.questionId, neutral, undefined]));
    assert.equal(rotationLantern(5, outcome), undefined);
    const { scene, frames } = flight(outcome);
    assert.ok(frames.every(f => f.big === 0 && f.scans === 0) && frames.some(f => f.small > 0));
    assert.equal(lit(scene).length, 0);
  }
}
{
  // Q02 (2026-11-19): the big orb lands on the lot of the model the outcome shows (a swap's `to`, a fallback's own answer), in the
  // energy colour for a swap, with one scan ring and one lantern over that lot.
  const q02Answers = [{ questionId: 'Q02', optionId: 'C' }, ...answers.slice(1)];
  const energy = `#${new T.Color('#75e2c2').getHexString()}`;
  for (const [outcome, lot, color, scale] of [
    [{ kind: 'swap', questionId: 'Q02', from: 'A', to: 'B' } as const, LOTS['q02-bay-flower'], energy, 1],
    [{ kind: 'swap', questionId: 'Q02', from: 'B', to: 'A' } as const, LOTS['q02-west-sea'], energy, 1],
    [{ kind: 'fallback', questionId: 'Q02' } as const, LOTS['q02-farm-south'], neutral, .7],
  ] as const) {
    const [first] = rotationFlights(outcome, q02Answers);
    assert.deepEqual([first.questionId, first.site?.x, first.site?.z], ['Q02', lot.x, lot.z]);
    const { scene, j } = journey();
    j.playRotation({ ordinal: 7, answers: q02Answers, rotation: { outcome } }, 0);
    let maxScans = 0; for (let t = 0; t <= 5; t += .05) { j.update(t, 0); maxScans = Math.max(maxScans, parts(scene)[1].count); }
    assert.equal(maxScans, 1, 'one scan ring on the lot');
    const lanterns = lit(scene);
    assert.deepEqual(lanterns.map(l => [l.color, l.scale]), [[color, scale]]);
    assert.ok(Math.hypot(lanterns[0].at.x - lot.x, lanterns[0].at.z - lot.z) <= lot.size / 2 * 1.1, 'lantern over the lot');
    const rebuilt = journey(); rebuilt.j.setRotationLanterns([{ ordinal: 7, answers: q02Answers, rotation: { outcome } }]);
    assert.deepEqual(snap(scene).lanM, snap(rebuilt.scene).lanM, 'rebuild matches the live landing');
  }
}
{
  // Q03 (2026-11-19): every option shares the drawer housing lot, so a swap either way and a fallback all land there; sharing colour.
  const lot = LOTS['drawer-housing'], sharing = `#${new T.Color(METER_COLORS.publicSharing).getHexString()}`;
  for (const [outcome, color, scale] of [
    [{ kind: 'swap', questionId: 'Q03', from: 'A', to: 'B' } as const, sharing, 1],
    [{ kind: 'swap', questionId: 'Q03', from: 'C', to: 'A' } as const, sharing, 1],
    [{ kind: 'fallback', questionId: 'Q03' } as const, neutral, .7],
  ] as const) {
    const [first, ...rest] = rotationFlights(outcome, answers);
    assert.deepEqual([first.questionId, first.site?.x, first.site?.z, first.site?.slot], ['Q03', lot.x, lot.z, 'publicSharing']);
    assert.deepEqual(rest.map(f => f.questionId), ['Q01', 'Q05', 'Q07']);
    const { scene, j } = journey();
    j.playRotation({ ordinal: 9, answers, rotation: { outcome } }, 0);
    let maxScans = 0; for (let t = 0; t <= 5; t += .05) { j.update(t, 0); maxScans = Math.max(maxScans, parts(scene)[1].count); }
    assert.equal(maxScans, 1, 'one scan ring on the housing lot');
    const lanterns = lit(scene);
    assert.deepEqual(lanterns.map(l => [l.color, l.scale]), [[color, scale]]);
    assert.ok(Math.hypot(lanterns[0].at.x - lot.x, lanterns[0].at.z - lot.z) <= lot.size / 2 * 1.1, 'lantern over the housing lot');
    const rebuilt = journey(); rebuilt.j.setRotationLanterns([{ ordinal: 9, answers, rotation: { outcome } }]);
    assert.deepEqual(snap(scene).lanM, snap(rebuilt.scene).lanM, 'rebuild matches the live landing');
  }
}
{
  // Q06 (2026-11-19): every option shares the pod-frame tower lot, so a swap either way and a fallback all land there; environment colour.
  const lot = LOTS['pod-tower'], env = `#${new T.Color(METER_COLORS.environmentalPriority).getHexString()}`;
  const q06answers = ['Q01', 'Q06', 'Q05', 'Q07'].map(questionId => ({ questionId, optionId: 'A' }));
  for (const [outcome, color, scale] of [
    [{ kind: 'swap', questionId: 'Q06', from: 'B', to: 'A' } as const, env, 1],
    [{ kind: 'swap', questionId: 'Q06', from: 'C', to: 'B' } as const, env, 1],
    [{ kind: 'fallback', questionId: 'Q06' } as const, neutral, .7],
  ] as const) {
    const [first, ...rest] = rotationFlights(outcome, q06answers);
    assert.deepEqual([first.questionId, first.site?.x, first.site?.z, first.site?.slot], ['Q06', lot.x, lot.z, 'environmentalPriority']);
    assert.deepEqual(rest.map(f => f.questionId), ['Q01', 'Q05', 'Q07']);
    const { scene, j } = journey();
    j.playRotation({ ordinal: 9, answers: q06answers, rotation: { outcome } }, 0);
    let maxScans = 0; for (let t = 0; t <= 5; t += .05) { j.update(t, 0); maxScans = Math.max(maxScans, parts(scene)[1].count); }
    assert.equal(maxScans, 1, 'one scan ring on the tower lot');
    const lanterns = lit(scene);
    assert.deepEqual(lanterns.map(l => [l.color, l.scale]), [[color, scale]]);
    assert.ok(Math.hypot(lanterns[0].at.x - lot.x, lanterns[0].at.z - lot.z) <= lot.size / 2 * 1.1, 'lantern over the tower lot');
    const rebuilt = journey(); rebuilt.j.setRotationLanterns([{ ordinal: 9, answers: q06answers, rotation: { outcome } }]);
    assert.deepEqual(snap(scene).lanM, snap(rebuilt.scene).lanM, 'rebuild matches the live landing');
  }
}
{
  // Snapshot, Undo and reconnect rebuild the same lanterns the live landings left: one per proposal, only over NW, siteless ones none.
  const history = [
    { ordinal: 1, answers, rotation: { outcome: { kind: 'swap', questionId: 'Q01', from: 'B', to: 'C' } as const } },
    { ordinal: 2, answers, rotation: { outcome: { kind: 'swap', questionId: 'Q04', from: 'A', to: 'B' } as const } },
    { ordinal: 3, answers, rotation: { outcome: { kind: 'fallback', questionId: 'Q01' } as const } },
  ];
  const live = journey();
  for (const p of history) { live.j.playRotation(p, p.ordinal * 20); for (let t = 0; t <= 6; t += .5) live.j.update(p.ordinal * 20 + t, 0); }
  const rebuilt = journey(); rebuilt.j.setRotationLanterns(history);
  const lanterns = lit(rebuilt.scene);
  assert.deepEqual(lanterns.map(l => [l.color, l.scale]), [[auto, 1], [neutral, .7]]);
  assert.ok(lanterns.every(l => Math.hypot(l.at.x - nw.x, l.at.z - nw.z) <= Math.max(nw.w, nw.d) * nw.scale * 1.1), 'rotation lanterns sit only at NW');
  assert.deepEqual(snap(live.scene).lanM, snap(rebuilt.scene).lanM); assert.deepEqual(snap(live.scene).lanC, snap(rebuilt.scene).lanC);
  // The 65th guest takes the 1st guest's slots even when its own question has no site, so live matches the 64-guest rebuild.
  const wrap = { ordinal: 65, answers, rotation: { outcome: { kind: 'swap', questionId: 'Q05', from: 'A', to: 'B' } as const } };
  live.j.playRotation(wrap, 100); for (let t = 0; t <= 6; t += .5) live.j.update(100 + t, 0);
  rebuilt.j.setRotationLanterns([...Array.from({ length: 61 }, (_, i) => ({ ordinal: i + 4, answers })), ...history, wrap].sort((a, b) => a.ordinal - b.ordinal));
  assert.deepEqual(lit(live.scene).map(l => l.slot), lit(rebuilt.scene).map(l => l.slot));
  assert.equal(lit(live.scene).length, 1, 'guest #1 lantern replaced');
}
console.log('voteJourney tests passed');
