import assert from './assert.ts';
import { Scene, Group, Mesh, MeshStandardMaterial, Box3, PlaneGeometry, Raycaster, Vector3 } from 'three';
import { boatPoses, routes, WATER_PERIOD, HULL } from '../src/mobility.ts';
import { publicLight } from '../src/cityRig.ts';
import { CityChangeManager } from '../src/cityChangeManager.ts';
import { repairRoads } from '../src/roadRepair.ts';
import { EnergyRuntime } from '../src/energyRuntime.ts';
import { buildSurveySites } from '../src/siteBuilders/index.ts';
import { parseSurveyEvent, type ExhibitionView } from '../src/surveyView.ts';
import { residentResult, residentCards } from '../src/surveyAtmosphere.ts';
import { ENERGY_VOTE_SITE, lanternSpot } from '../src/voteJourney.ts';
import { currentView } from '../survey/src/server/answerService.ts';
import { createProposalSession, submitProposal } from '../survey/src/server/proposalService.ts';
import { CURRENT_EXHIBITION_QUESTIONS_PATH, exhibitionFixture, ok, startServer } from '../survey/tests/surveyFixture.ts';
import { ENERGY_CHOICES, emptyEnergyCounts, energyConfiguration, emptyEnergyConfiguration, type EnergyChoice } from '../survey/src/shared/energy.ts';
import { deriveExhibitionLayout, pickHeadline } from '../survey/src/shared/cityView.ts';
import { headlineShot } from '../src/headlineCamera.ts';
import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';

const documentBefore = Object.getOwnPropertyDescriptor(globalThis, 'document');
Object.defineProperty(globalThis, 'document', { configurable: true, value: {
  createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }),
} });
const scene = new Scene(), energy = new EnergyRuntime(scene);
const sites = buildSurveySites(scene, { cloneRoot: () => new Promise<Group>(() => {}) , load: () => new Promise<never>(() => {}) } as never);
if (documentBefore) Object.defineProperty(globalThis, 'document', documentBefore); else delete (globalThis as { document?: unknown }).document;
const manager = new CityChangeManager(sites, energy);
// Conservative circumscribed boat radius keeps all fallback structures out of active shipping routes.
scene.updateMatrixWorld(true);
for (const frame of energy.model.activity.waterGardens) for (const [x, z] of [[-335, -162], [-322.8, -156.6]]) {
  const hits = new Raycaster(new Vector3(x, 2, z), new Vector3(0, -1, 0)).intersectObject(frame, true);
  assert.ok(hits.some(hit => Math.abs(hit.point.y - 1.05) < .01), 'water platform reaches the garden base in either configuration');
}
// Trim the apron under the column feet while keeping the through walk and its connection to the ramp.
const sidewalk = new Mesh(new PlaneGeometry(64, 110).rotateX(-Math.PI / 2));
sidewalk.name = 'SIDEWALK_NETWORK';
sidewalk.position.set(-223, -.18, 411);
const oldRoad = new Mesh(sidewalk.geometry.clone());
oldRoad.name = 'ROAD_SECONDARY';
oldRoad.position.copy(sidewalk.position).setY(-.25);
const surroundings = new Group();
surroundings.add(sidewalk, oldRoad);
repairRoads(surroundings);
const groundAt = (x: number, z: number, root: Group) => new Raycaster(new Vector3(x, 2, z), new Vector3(0, -1, 0)).intersectObject(root, true)[0]?.point.y;
for (const [x, z] of [[-213, 389], [-216, 411], [-211, 433], [-199, 451]]) assert.equal(groundAt(x, z, surroundings), undefined);
for (const [x, z] of [[-244, 389], [-233, 405], [-221, 433], [-211, 451]]) assert.ok(groundAt(x, z, surroundings) !== undefined);
const walkSeam = [-232.1, 405] as const;
assert.ok(Math.abs((groundAt(...walkSeam, energy.farm) ?? 1) - (groundAt(...walkSeam, surroundings) ?? -1)) < .015,
  'gravel meets the surveyed walk without a kerb');
for (const [x, z] of [[-231.5, 405], [-224, 405], [-216, 404], [-209, 404], [-204, 406], [-200, 408]]) {
  const height = groundAt(x, z, energy.farm);
  assert.ok(height !== undefined && height >= -.18 && height < -.10, 'entrance stays connected at walking grade');
}
for (const [x, z] of [[-200, 408], [-201.1, 408.9], [-198.9, 407.1]]) {
  assert.ok(Math.abs((groundAt(x, z, energy.farm) ?? 1) + .107) < .003, 'gravel meets the ramp across the diagonal sill');
}
for (const [x, z] of [[-237, 397], [-233, 405], [-228.5, 414]]) {
  assert.equal(groundAt(x, z, energy.farm), undefined, 'planting and rack stay outside the through walk');
}
const activityBounds = (['waterGardens', 'receiver', 'island'] as const).flatMap(part => energy.model.activity[part].map(group => new Box3().setFromObject(group)));
const waterRoutes = routes(), boatRadius = Math.hypot(HULL.x, HULL.stern);
for (let t = 0; t < WATER_PERIOD; t += .25) for (const boat of boatPoses(t, waterRoutes)) {
  if (boat.scale < .05) continue;
  for (const bounds of activityBounds) {
    const dx = Math.max(bounds.min.x - boat.x, 0, boat.x - bounds.max.x), dz = Math.max(bounds.min.z - boat.z, 0, boat.z - bounds.max.z);
    assert.ok(Math.hypot(dx, dz) - boatRadius * boat.scale > 2.5, `fallback reaches a boat route at ${t}s`);
  }
}

const fixture = () => exhibitionFixture(':memory:', Date.parse('2026-10-24T00:00:00Z'), CURRENT_EXHIBITION_QUESTIONS_PATH);
const eventOf = (event: unknown) => {
  const parsed = parseSurveyEvent(JSON.parse(JSON.stringify(event)));
  assert.ok(parsed && 'view' in parsed && parsed.view.version === 2);
  return parsed as { kind: 'city-state-snapshot' | 'city-state-updated'; view: ExhibitionView };
};
const assertModel = (view: ExhibitionView) => {
  const t = view.layout.energy ?? emptyEnergyConfiguration(), m = energy.model;
  assert.deepEqual(energy.getConfiguration(), t);
  assert.equal(m.gardens[0].visible, t.waterGardens > 0); assert.equal(m.gardens[1].visible, t.waterGardens === 2);
  assert.equal(m.parts.wing.visible, t.receiver === 'small');
  assert.equal(m.parts.wing.scale.x, .65);
  assert.equal(energy.farm.visible, t.receiver === 'large');
  assert.deepEqual(energy.farm.position.toArray(), [-152, -.15, 408]);
  assert.equal(energy.farm.scale.x, 1);
  assert.equal(m.parts.ring.visible, t.flywheel); assert.equal(m.parts.island.visible, t.island);
};
const receiver = (orbital: number, water = 0) =>
  energyConfiguration({ ...emptyEnergyCounts(), 'orbital-supply': orbital, 'water-storage': water });
assert.equal(receiver(1).receiver, 'none');
assert.equal(receiver(2, 4).receiver, 'small'); // exactly 20%
assert.equal(receiver(2, 5).receiver, 'none');
assert.equal(receiver(4, 2).receiver, 'large'); // exactly 40%
assert.equal(receiver(4, 3).receiver, 'small');
const small = receiver(4, 3), large = receiver(4, 2);
const neutralVotes = { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 };
const baseline = deriveExhibitionLayout(neutralVotes);
assert.deepEqual(pickHeadline({ ...baseline, energy: receiver(3) },
  { ...baseline, energy: { ...receiver(3, 1), activity: { waterGardens: 1 } } },
  { ...neutralVotes, energy: 'water-storage' }), { energy: true, part: 'receiver' });
energy.setTarget(small, 0, true);
for (const [from, to, shot] of [[small, large, 'energy:farm'], [large, small, 'energy:wing']] as const) {
  const change = energy.setTarget(to, 10, false);
  assert.deepEqual(change, { before: from, after: to });
  assert.equal(headlineShot({ socketId: 'ne', focal: false, district: true, energy: change }), shot);
  energy.update(11.5, false);
  assert.equal(energy.getDiagnostics().farm.opacity, .5);
  const forecourt = energy.farm.getObjectByName('rectenna-entry-forecourt');
  assert.ok(forecourt instanceof Mesh && forecourt.material instanceof MeshStandardMaterial);
  assert.equal(forecourt.material.opacity, .5);
  const seedlings = energy.farm.getObjectByName('rectenna-seedling-rack');
  assert.ok(seedlings);
  seedlings.traverse(part => {
    if (part instanceof Mesh && part.material instanceof MeshStandardMaterial) assert.equal(part.material.opacity, .5);
  });
  assert.equal(energy.getDiagnostics().parts[0].opacity, .5);
  energy.update(13, false);
  assert.equal(energy.farm.visible, to.receiver === 'large');
  assert.equal(energy.model.parts.wing.visible, to.receiver === 'small');
}
energy.setTarget(emptyEnergyConfiguration(), 0, true);

let combinations = 0;
for (const energyChoice of ENERGY_CHOICES) for (const a of [0, 1, 2]) for (const s of [0, 1, 2]) for (const c of [0, 1, 2]) {
  const { ctx } = fixture();
  try {
    manager.applyExhibitionLayout((currentView(ctx) as ExhibitionView).layout, 'city-state-snapshot', 0);
    const session = ok(createProposalSession(ctx).response);
    const choices = [a, s, 0, c];
    const result = submitProposal(ctx, { submissionId: 'combination', guestSessionId: session.session.id, expectedRevision: 0,
      answers: session.questions.map((q, i) => ({ questionId: q.id, optionId: q.id === 'energy-2127' ? energyChoice : q.options[choices[i]].id })) });
    const parsed = eventOf(result.event);
    const changes = manager.applyExhibitionLayout(parsed.view.layout, parsed.kind, 1, parsed.view.slotSeeds);
    manager.update(7); // the SW mixed band change runs 5 s
    assertModel(parsed.view);
    assert.equal(parsed.view.scores.environmentalPriority, 0);
    assert.equal(parsed.view.layout.bands.ne, 'mixed');
    assert.equal(changes.some(c => c.energy), !!parsed.view.layout.energy?.activity, 'fallback appears only when needed');
    assert.ok(!residentResult(parsed.view.latestProposal!, changes).effect.includes('この公園'));
    const d = manager.getDiagnostics();
    assert.equal(d.magnetEast.automationHub!.visibleAutomatedPorts, parsed.view.layout.automatedPorts);
    assert.equal(d.dogenzakaSouth.commonsPlaza!.visibleSharedSeats, parsed.view.layout.sharedSeats);
    assert.equal(d.centerGaiRear.concentrationTower!.activeFunctionModules, parsed.view.layout.functionModules);
    combinations++;
  } finally { ctx.db.close(); }
}

const { ctx, clock } = fixture();
const server = await startServer(ctx);
try {
  const ws = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
  const messages: unknown[] = [];
  ws.addEventListener('message', event => messages.push(JSON.parse(String(event.data))));
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  const submit = async (choice: EnergyChoice, id: string) => {
    const session = ok(createProposalSession(ctx).response);
    const request = { submissionId: id, guestSessionId: session.session.id, expectedRevision: session.state.revision,
      answers: session.questions.map(q => ({ questionId: q.id, optionId: q.id === 'energy-2127' ? choice : q.options[1].id })) };
    const response = await server.request('/api/proposals', request); ok(response.body);
    for (let n = 0; n < 100 && !messages.some(m => (m as { submissionId?: string }).submissionId === id); n++) await new Promise(r => setTimeout(r, 5));
    const event = messages.find(m => (m as { submissionId?: string }).submissionId === id); assert.ok(event);
    clock.ms += DISPLAY_MS + 1;
    return eventOf(event);
  };
  manager.applyExhibitionLayout((currentView(ctx) as ExhibitionView).layout, 'city-state-snapshot', 10);
  const first = await submit('water-storage', 'water-1');
  const noChange = manager.applyExhibitionLayout(first.view.layout, 'city-state-updated', 11);
  assert.equal(noChange.length, 1);
  assert.match(residentResult(first.view.latestProposal!, noChange).effect, /整備フレーム/);
  assert.equal(headlineShot(noChange[0]), 'energy:garden');
  manager.update(14); assert.equal(energy.model.activity.waterGardens[0].visible, true);
  assert.equal(energy.model.activity.waterGardens[1].visible, false);
  const copy = energy.getConfiguration(); copy.activity!.waterGardens = 2;
  assert.equal(energy.getConfiguration().activity!.waterGardens, 1, 'diagnostics cannot mutate the target');
  assert.match(residentResult(first.view.latestProposal!).effect, /回答を記録/, 'no actual predecessor evidence stays conservative');
  const second = await submit('water-storage', 'water-2');
  const changes = manager.applyExhibitionLayout(second.view.layout, 'city-state-updated', 20);
  assert.equal(changes.length, 1); assert.ok(changes[0].energy);
  const multi = { ...changes[0], energy: { before: { waterGardens: 1 as const, receiver: 'none' as const, flywheel: false, island: false },
    after: { waterGardens: 0 as const, receiver: 'none' as const, flywheel: true, island: false }, part: 'flywheel' as const } };
  assert.equal(headlineShot(multi), 'energy:ring');
  assert.match(residentResult(second.view.latestProposal!, [multi]).place, /蓄電環/, 'card and camera name the selected energy part');
  const baseline = { ...second.view.layout, energy: multi.energy.before };
  manager.applyExhibitionLayout(baseline, 'city-state-snapshot', 20);
  const selected = manager.applyExhibitionLayout({ ...baseline, energy: multi.energy.after }, 'city-state-updated', 20, undefined, 20,
    { automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0, energy: 'rotor-storage' });
  assert.equal(selected[0].energy?.part, 'flywheel');
  assert.equal(headlineShot(selected[0]), 'energy:ring');
  assert.match(residentResult(second.view.latestProposal!, selected).place, /蓄電環/);
  manager.applyExhibitionLayout(first.view.layout, 'city-state-snapshot', 20);
  manager.applyExhibitionLayout(second.view.layout, 'city-state-updated', 20);
  assert.equal(energy.model.gardens[0].visible, false, 'new model waits for the scheduled arrival');
  manager.update(19); assert.equal(energy.model.gardens[0].visible, false);
  manager.update(21.5); assert.equal(energy.getDiagnostics().parts[1].opacity, .5);
  assert.equal(energy.model.gardens[0].scale.y, 1, 'public access heights stay fixed during the transition');
  manager.update(23); assertModel(second.view);
  assert.match(residentResult(second.view.latestProposal!, changes).effect, /1か所/);
  assert.equal(residentCards(second.view).filter(c => c.id.startsWith('energy.')).length, 1);
  // Identical target never restarts motion or claims a visible change; snapshots interrupt immediately.
  assert.deepEqual(manager.applyExhibitionLayout(second.view.layout, 'city-state-updated', 24), []);
  const third = await submit('water-storage', 'water-3');
  manager.applyExhibitionLayout(third.view.layout, 'city-state-updated', 30); manager.update(31);
  manager.applyExhibitionLayout(second.view.layout, 'city-state-snapshot', 31); assertModel(second.view);
  const reducedBefore = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: true }) });
  manager.applyExhibitionLayout(third.view.layout, 'city-state-updated', 32); assertModel(third.view);
  manager.update(32); const fixed = energy.model.rotor.rotation.z; manager.update(92); assert.equal(energy.model.rotor.rotation.z, fixed);
  if (reducedBefore) Object.defineProperty(globalThis, 'matchMedia', reducedBefore); else delete (globalThis as { matchMedia?: unknown }).matchMedia;
  // Reordered or invalid input is checked at the wire boundary; old v2 was already exercised by the original pipeline.
  const snapshot = { type: 'city-state-snapshot', view: third.view };
  const reordered = structuredClone(snapshot); reordered.view.layout.energy = { island: false, flywheel: false, receiver: 'none', waterGardens: 2, activity: reordered.view.layout.energy?.activity };
  assert.ok(parseSurveyEvent(reordered));
  for (const bad of ['size', 'extra', 'tally', 'choice', 'activity'] as const) {
    const input = structuredClone(snapshot);
    if (bad === 'activity') Object.assign(input.view.layout.energy!, { activity: { waterGardens: 3 } });
    if (bad === 'size') (input.view.layout.energy as unknown as { waterGardens: number }).waterGardens = 3;
    if (bad === 'extra') Object.assign(input.view.layout.energy!, { extra: true });
    if (bad === 'tally') input.view.energy!.counts['water-storage']++;
    if (bad === 'choice') input.view.latestProposal!.answers[2].optionId = 'island-supply';
    assert.equal(parseSurveyEvent(input), null, bad);
  }
  assert.ok(lanternSpot(1, 'environmentalPriority', true).distanceTo(lanternSpot(1, 'environmentalPriority')) > 30);
  const p = lanternSpot(1, 'environmentalPriority', true);
  assert.ok(Math.hypot(p.x - ENERGY_VOTE_SITE.x, p.z - ENERGY_VOTE_SITE.z) < 16);
  let step = 0;
  for (const choice of ENERGY_CHOICES) for (let n = choice === 'water-storage' ? 3 : 0; n < 4; n++) {
    const parsed = await submit(choice, `mixed-${++step}`);
    manager.applyExhibitionLayout(parsed.view.layout, 'city-state-updated', 100 + step * 4);
    manager.update(103 + step * 4); assertModel(parsed.view);
  }
  assert.deepEqual({ ...energy.getConfiguration(), activity: undefined }, { waterGardens: 1, receiver: 'small', flywheel: true, island: true, activity: undefined });
  assert.equal(residentCards(currentView(ctx) as ExhibitionView).filter(c => c.id.startsWith('energy.')).length, 4);
  const resourceIds = () => {
    const ids: string[] = [];
    energy.model.root.traverse(o => { if (o instanceof Mesh) ids.push(o.geometry.uuid, ...(Array.isArray(o.material) ? o.material : [o.material]).map(m => m.uuid)); });
    return ids;
  };
  const ids = resourceIds(), light = publicLight.emissiveIntensity;
  energy.setTarget(emptyEnergyConfiguration(), 200, false); publicLight.emissiveIntensity = light + .4;
  energy.update(201.5, false);
  assert.equal(energy.getDiagnostics().parts[4].opacity, .5);
  assert.equal(energy.model.parts.island.scale.y, 1, 'energy island bridge never drops through the boat corridor during a fade');
  assert.equal(energy.model.gardens[0].scale.y, 1);
  let clonedLights = 0;
  energy.model.root.traverse(o => { if (o instanceof Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material])
    if (m instanceof MeshStandardMaterial && m.emissive.getHex() === publicLight.emissive.getHex()) {
      assert.notEqual(m, publicLight); assert.equal(m.emissiveIntensity, light + .4); clonedLights++;
    }
  });
  assert.ok(clonedLights); assert.equal(publicLight.opacity, 1, 'local fades never alter shared city finishes');
  assert.deepEqual(resourceIds(), ids, 'fades reuse geometry, materials and instance buffers'); publicLight.emissiveIntensity = light;
  ws.close(); await new Promise(resolve => ws.addEventListener('close', resolve, { once: true }));
} finally { await server.close(); ctx.db.close(); }
console.log(`PASS: ${combinations} current four-question combinations → authority → strict wire → actual models; HTTP/WebSocket, evidence, no-change, journey node, retarget/snapshot/reduced motion.`);
