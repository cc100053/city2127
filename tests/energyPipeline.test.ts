import assert from 'node:assert/strict';
import { Scene, Group, Mesh, MeshStandardMaterial } from 'three';
import { publicLight } from '../src/cityRig.ts';
import { CityChangeManager } from '../src/cityChangeManager.ts';
import { EnergyRuntime } from '../src/energyRuntime.ts';
import { buildSurveySites } from '../src/siteBuilders/index.ts';
import { parseSurveyEvent, type ExhibitionView } from '../src/surveyView.ts';
import { residentResult, residentCards } from '../src/surveyAtmosphere.ts';
import { ENERGY_VOTE_SITE, lanternSpot } from '../src/voteJourney.ts';
import { currentView } from '../survey/src/server/answerService.ts';
import { createProposalSession, submitProposal } from '../survey/src/server/proposalService.ts';
import { CURRENT_EXHIBITION_QUESTIONS_PATH, exhibitionFixture, ok, startServer } from '../survey/tests/surveyFixture.ts';
import { ENERGY_CHOICES, emptyEnergyConfiguration, type EnergyChoice } from '../survey/src/shared/energy.ts';

const documentBefore = Object.getOwnPropertyDescriptor(globalThis, 'document');
Object.defineProperty(globalThis, 'document', { configurable: true, value: {
  createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }),
} });
const scene = new Scene(), energy = new EnergyRuntime(scene);
const sites = buildSurveySites(scene, { cloneRoot: () => new Promise<Group>(() => {}) } as never);
if (documentBefore) Object.defineProperty(globalThis, 'document', documentBefore); else delete (globalThis as { document?: unknown }).document;
const manager = new CityChangeManager(sites, energy);
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
  assert.equal(m.parts.wing.visible, t.receiver !== 'none');
  if (t.receiver !== 'none') assert.equal(m.parts.wing.scale.x, t.receiver === 'small' ? .65 : 1);
  assert.equal(m.parts.ring.visible, t.flywheel); assert.equal(m.parts.island.visible, t.island);
};
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
    manager.update(5);
    assertModel(parsed.view);
    assert.equal(parsed.view.scores.environmentalPriority, 0);
    assert.equal(parsed.view.layout.bands.ne, 'mixed');
    assert.equal(changes.some(c => c.energy), false, 'first energy preference alone leaves the equipment configuration');
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
    clock.ms += 10_001;
    return eventOf(event);
  };
  manager.applyExhibitionLayout((currentView(ctx) as ExhibitionView).layout, 'city-state-snapshot', 10);
  const first = await submit('water-storage', 'water-1');
  const noChange = manager.applyExhibitionLayout(first.view.layout, 'city-state-updated', 11);
  assert.equal(noChange.length, 0);
  assert.match(residentResult(first.view.latestProposal!, noChange).effect, /今の配置/);
  assert.match(residentResult(first.view.latestProposal!).effect, /回答を記録/, 'no actual predecessor evidence stays conservative');
  const second = await submit('water-storage', 'water-2');
  const changes = manager.applyExhibitionLayout(second.view.layout, 'city-state-updated', 20);
  assert.equal(changes.length, 1); assert.ok(changes[0].energy);
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
  const reordered = structuredClone(snapshot); reordered.view.layout.energy = { island: false, flywheel: false, receiver: 'none', waterGardens: 2 };
  assert.ok(parseSurveyEvent(reordered));
  for (const bad of ['size', 'extra', 'tally', 'choice'] as const) {
    const input = structuredClone(snapshot);
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
  assert.deepEqual(energy.getConfiguration(), { waterGardens: 1, receiver: 'small', flywheel: true, island: true });
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
