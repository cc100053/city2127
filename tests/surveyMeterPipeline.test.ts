import assert from 'node:assert/strict';
import * as T from 'three';
import { CityChangeManager } from '../src/cityChangeManager.ts';
import { buildSurveySites } from '../src/siteBuilders/index.ts';
import { parseSurveyEvent } from '../src/surveyView.ts';
import { exhibitionFixture, ok, staff, startServer } from '../survey/tests/surveyFixture.ts';
import { createProposalSession, submitProposal } from '../survey/src/server/proposalService.ts';
import { answersForVotes, firstProposalGolden, METER_CONTRACTS, meterCombinations } from '../survey/tests/meterContract.ts';
import type { ExhibitionCityView } from '../survey/src/shared/cityView.ts';
import type { ProposalData, ProposalRequest, ProposalSessionData, ServerEvent } from '../survey/src/shared/protocol.ts';
import type { CityChangeDiagnostics } from '../src/cityChangeManager.ts';
import { readLifecycle } from '../survey/src/server/adminService.ts';
import { currentView } from '../survey/src/server/answerService.ts';

// Only canvas text drawing / external GLB loading are substituted. Real Three.js meshes,
// instancing, site builders and controllers drive visible diagnostics below (no mock targets).
const documentBefore = Object.getOwnPropertyDescriptor(globalThis, 'document');
Object.defineProperty(globalThis, 'document', { configurable: true, value: {
  createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }),
} });
const scene = new T.Scene();
const sites = buildSurveySites(scene, { cloneRoot: () => new Promise<T.Group>(() => {}) } as never);
if (documentBefore) Object.defineProperty(globalThis, 'document', documentBefore);
else delete (globalThis as { document?: unknown }).document;
const manager = new CityChangeManager(sites);

type ModelAdapter = (diagnostics: CityChangeDiagnostics) => { band: string; parameters: Record<string, number> };
const adapters: Record<string, ModelAdapter> = {
  automation: d => ({ band: d.magnetEast.automationHub!.band, parameters: { automatedPorts: d.magnetEast.automationHub!.visibleAutomatedPorts } }),
  publicSharing: d => ({ band: d.dogenzakaSouth.commonsPlaza!.band, parameters: { sharedSeats: d.dogenzakaSouth.commonsPlaza!.visibleSharedSeats } }),
  environmentalPriority: d => ({ band: d.stationEastPark.environmentPark!.band, parameters: {
    treeCount: d.stationEastPark.environmentPark!.visibleTreeCount, plantedFraction: d.stationEastPark.environmentPark!.plantedFraction,
    coolingFins: d.stationEastPark.environmentPark!.visibleCoolingFins } }),
  urbanConcentration: d => ({ band: d.centerGaiRear.concentrationTower!.band, parameters: { functionModules: d.centerGaiRear.concentrationTower!.activeFunctionModules } }),
};
assert.deepEqual(Object.keys(adapters).sort(), METER_CONTRACTS.map(meter => meter.axis).sort(), 'every Meter needs a real model adapter');
function assertModels(view: ExhibitionCityView) {
  const diagnostics = manager.getDiagnostics();
  for (const meter of METER_CONTRACTS) {
    const actual = adapters[meter.axis](diagnostics);
    assert.equal(actual.band, view.layout.bands[meter.socket as keyof typeof view.layout.bands]);
    for (const key of Object.keys(meter.parameters)) {
      assert.ok(Math.abs(actual.parameters[key] - Number(view.layout[key as keyof typeof view.layout])) < 1e-9, `${meter.axis}/${key}: actual model must use server parameter`);
    }
  }
  // District layer (P1 meter variety): every promenade bay is covered by exactly one shade type, sized by the server's planted fraction.
  const district = diagnostics.stationEastPark.environmentDistrict!;
  assert.equal(district.visibleCanopies + district.visibleSails, district.slots);
  assert.ok(Math.abs(district.targetCanopy - (view.layout.plantedFraction - .2) / .6) < 1e-9);
  const automation = diagnostics.magnetEast.automationDistrict!;
  assert.equal(automation.enabled, true);
  assert.equal(automation.targetAutomation, view.layout.automatedPorts / 6);
  assert.ok(Math.abs(manager.automationLevel! - view.layout.automatedPorts / 6) < 1e-7);
  const sharing = diagnostics.dogenzakaSouth.sharingDistrict!;
  assert.equal(sharing.enabled, true);
  assert.equal(sharing.targetSharing, view.layout.sharedSeats / 8);
  assert.equal(sharing.visibleOpenRooms + sharing.visiblePrivateRooms, sharing.rooms);
  if (view.layout.sharedSeats <= 2) assert.equal(sharing.visiblePrivateRooms, sharing.rooms);
  if (view.layout.sharedSeats >= 7) assert.equal(sharing.visibleOpenRooms, sharing.rooms);
  const concentration = diagnostics.centerGaiRear.concentrationDistrict!;
  assert.equal(concentration.enabled, true);
  assert.equal(concentration.targetConcentration, (view.layout.functionModules - 2) / 4);
  if (view.layout.functionModules <= 3) assert.deepEqual([concentration.visibleTowers, concentration.visiblePods], [0, concentration.pods]);
  if (view.layout.functionModules >= 5) assert.deepEqual([concentration.visibleTowers, concentration.visiblePods], [concentration.towers, 0]);
  // P10: each cross-Meter extra appears exactly when its two axes agree (both high, or both low for solar pods), never otherwise.
  const band = view.layout.bands;
  const positions = { nw: view.layout.automatedPorts / 6, sw: view.layout.sharedSeats / 8, ne: (view.layout.plantedFraction - .2) / .6, se: (view.layout.functionModules - 2) / 4 };
  const both = (a: 'nw' | 'sw' | 'ne' | 'se', b: 'nw' | 'sw' | 'ne' | 'se', side: string) => side === 'high' ? Math.min(positions[a], positions[b]) >= .7 : Math.max(positions[a], positions[b]) <= .3;
  const pairings: [string, number, boolean, number][] = [
    ['drone kiosks (sharing + automation high)', sharing.droneKiosks, both('sw', 'nw', 'high'), sharing.visibleOpenCourts],
    ['orchards (sharing + environment high)', sharing.orchardCourts, both('sw', 'ne', 'high'), sharing.visibleOpenCourts],
    ['vertical forest (concentration + environment high)', concentration.forestTowers, both('se', 'ne', 'high'), concentration.visibleTowers],
    ['drone docks (concentration + automation high)', concentration.droneDocks, both('se', 'nw', 'high'), concentration.visibleTowers],
    ['solar pods (concentration + environment low)', concentration.solarPods, both('se', 'ne', 'low'), concentration.visiblePods],
  ];
  for (const [name, visible, expected, all] of pairings) {
    assert.equal(visible, expected ? all : 0, `${name}: ${JSON.stringify(band)}`);
    if (expected) pairingHits.add(name);
  }
}
const pairingHits = new Set<string>();
function applyEvent(event: unknown, now: number) {
  const parsed = parseSurveyEvent(JSON.parse(JSON.stringify(event)));
  assert.ok(parsed && parsed.view.version === 2, 'real server event passes client validation');
  manager.applyExhibitionLayout(parsed.view.layout, parsed.kind, now, parsed.view.slotSeeds);
  manager.update(now + 3.1);
  assertModels(parsed.view as ExhibitionCityView);
}

let count = 0;
for (const votes of meterCombinations(METER_CONTRACTS)) {
  const { ctx } = exhibitionFixture();
  try {
    const session = ok(createProposalSession(ctx));
    const outcome = submitProposal(ctx, { submissionId: `mesh-${count}`, guestSessionId: session.session.id, expectedRevision: 0,
      answers: answersForVotes(METER_CONTRACTS, votes) });
    const result = ok(outcome.response);
    assert.deepEqual(result.proposal.afterLayout, firstProposalGolden(METER_CONTRACTS, votes).layout);
    applyEvent(outcome.event, count * 4);
    count++;
  } finally { ctx.db.close(); }
}

// P11: early order survives the latest-64 window even after the EMA converges to exactly equal scores.
{
  const histories = [[1, -1], [-1, 1]].map(prefix => [...prefix, ...Array.from({ length: 140 }, (_, i) => i % 2 ? -1 : 1)]);
  const districtRoots = [sites.magnetEast.automationDistrict!.root, sites.dogenzakaSouth.sharingDistrict!.root,
    sites.stationEastPark.environmentDistrict!.root, sites.centerGaiRear.concentrationDistrict!.root];
  const matrices = () => districtRoots.map(root => root.children.filter(o => o instanceof T.InstancedMesh && !['meter-pulse', 'plaza-crowds', 'service-drones'].includes(o.name))
    .map(o => [...(o as T.InstancedMesh).instanceMatrix.array]));
  // Architecture restores independently of animation time; P12 actors restore at a common held phase.
  const actorsAt = (now: number) => {
    manager.update(now, 1);
    return districtRoots.map(root => root.children.filter(o => o instanceof T.InstancedMesh && ['plaza-crowds', 'service-drones'].includes(o.name))
      .map(o => [...(o as T.InstancedMesh).instanceMatrix.array]));
  };
  const views: ExhibitionCityView[] = [], cities: ReturnType<typeof matrices>[] = [];
  for (const history of histories) {
    const time = 1000 + views.length * 800;
    const { ctx } = exhibitionFixture();
    try {
      let firstRequest: ProposalRequest | undefined;
      for (const [ordinal, vote] of history.entries()) {
        const session = ok(createProposalSession(ctx));
        const request = { submissionId: `path-${ordinal}`, guestSessionId: session.session.id, expectedRevision: ordinal,
          answers: answersForVotes(METER_CONTRACTS, Object.fromEntries(METER_CONTRACTS.map(m => [m.axis, vote])) as Record<string, -1 | 0 | 1>) };
        firstRequest ??= request;
        const outcome = submitProposal(ctx, request);
        ok(outcome.response); applyEvent(outcome.event, time + ordinal * 4);
        const beforeRetry = currentView(ctx);
        assert.equal(ok(submitProposal(ctx, request).response).replayed, true);
        assert.deepEqual(currentView(ctx), beforeRetry, 'same-ID retry cannot rehash history');
        ok(staff(ctx, 'guest-left'));
      }
      const view = currentView(ctx) as ExhibitionCityView;
      const city = matrices(), actors = actorsAt(time + 700); views.push(view); cities.push(city);
      applyEvent(JSON.parse(JSON.stringify({ type: 'city-state-snapshot', view })), time + 600);
      assert.deepEqual(matrices(), city, 'serialized reload restores exact instance transforms');
      assert.deepEqual(actorsAt(time + 700), actors, 'P12 reload restores actors at the same clock phase');
      const reset = ok(staff(ctx, 'reset-city', 'RESET'));
      const resetView = currentView(ctx) as ExhibitionCityView;
      assert.deepEqual(Object.values(resetView.slotSeeds), [0, 0, 0, 0]);
      applyEvent({ type: 'run-reset', view: resetView }, time + 601);
      const baseline = matrices(), baselineActors = actorsAt(time + 700);
      // Replaying an old submission after reset cannot seed the new run.
      assert.equal(ok(submitProposal(ctx, firstRequest!).response).replayed, true);
      assert.deepEqual(currentView(ctx), resetView);
      assert.equal(currentView(ctx).runId, reset.state.runId);
      applyEvent({ type: 'city-state-snapshot', view: resetView }, time + 602);
      assert.deepEqual(matrices(), baseline, 'reset and reloaded reset have identical cities');
      assert.deepEqual(actorsAt(time + 700), baselineActors, 'P12 reset and reload restore actors at the same phase');
      // A snapshot in the middle of a live retarget settles immediately and clears all old pulses.
      manager.applyExhibitionLayout(view.layout, 'city-state-updated', time + 603, view.slotSeeds);
      manager.update(time + 604);
      applyEvent({ type: 'city-state-snapshot', view }, time + 604);
      assert.deepEqual(matrices(), city);
      assert.ok(Object.values(manager.getDiagnostics()).every(d =>
        [d.environmentDistrict, d.automationDistrict, d.sharingDistrict, d.concentrationDistrict].every(c => !c || c.activePulses === 0)));
      for (const [ordinal, vote] of history.entries()) {
        const session = ok(createProposalSession(ctx));
        ok(submitProposal(ctx, { submissionId: `rebuild-${ordinal}`, guestSessionId: session.session.id, expectedRevision: ordinal,
          answers: answersForVotes(METER_CONTRACTS, Object.fromEntries(METER_CONTRACTS.map(m => [m.axis, vote])) as Record<string, -1 | 0 | 1>) }).response);
        ok(staff(ctx, 'guest-left'));
      }
      const replayed = currentView(ctx) as ExhibitionCityView;
      assert.deepEqual(replayed.slotSeeds, view.slotSeeds, 'rebuilding the same votes in a new run yields identical seeds');
      applyEvent({ type: 'city-state-snapshot', view: replayed }, time + 605);
      assert.deepEqual(matrices(), city, 'full replay restores exact city transforms regardless of new IDs');
      assert.deepEqual(actorsAt(time + 700), actors, 'P12 replay restores actors at the same phase');
    } finally { ctx.db.close(); }
  }
  assert.deepEqual(views[0].scores, views[1].scores, 'different early orders converge to exactly equal Meter scores');
  assert.deepEqual(views[0].layout, views[1].layout);
  assert.deepEqual(views[0].recentProposals.map(p => p.votes), views[1].recentProposals.map(p => p.votes));
  assert.notDeepEqual(views[0].slotSeeds, views[1].slotSeeds, 'full history, not only the identical latest 64, determines order');
  cities[0].forEach((city, i) => assert.notDeepEqual(city, cities[1][i], `district ${i}: equal scores can produce different cities`));
  console.log('PASS: P11 full-history order, equal-score/different-city in all four districts, >64 guests, retry, reload, reset and interrupted snapshot.');
}

// Also cross the real HTTP/WebSocket serialization boundary, then restore/reload/reset.
const { ctx } = exhibitionFixture();
const server = await startServer(ctx);
const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
const queue: ServerEvent[] = [], waiters: ((event: ServerEvent) => void)[] = [];
socket.addEventListener('message', message => {
  const event = JSON.parse(String(message.data)) as ServerEvent;
  const waiter = waiters.shift(); if (waiter) waiter(event); else queue.push(event);
});
function next(): Promise<ServerEvent> {
  const event = queue.shift(); if (event) return Promise.resolve(event);
  return new Promise((resolve, reject) => {
    const waiter = (event: ServerEvent) => { clearTimeout(timer); resolve(event); };
    const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('WebSocket timeout')); }, 5000);
    waiters.push(waiter);
  });
}
try {
  applyEvent(await next(), 400);
  for (const [ordinal, vote] of [1, -1, 0].entries()) {
    const votes = Object.fromEntries(METER_CONTRACTS.map(meter => [meter.axis, vote])) as Record<string, -1 | 0 | 1>;
    const session = ok((await server.request<ProposalSessionData>('/api/proposal-sessions', {})).body);
    const request = { submissionId: `http-mesh-${ordinal}`, guestSessionId: session.session.id,
      expectedRevision: session.state.revision, answers: answersForVotes(METER_CONTRACTS, votes) };
    const result = ok((await server.request<ProposalData>('/api/proposals', request)).body);
    const event = await next();
    assert.equal(event.type, 'city-state-updated');
    assert.deepEqual(event.state, result.state);
    applyEvent(event, 404 + ordinal * 4);
    assert.equal(ok((await server.request<ProposalData>('/api/proposals', request)).body).replayed, true);
    ok(staff(ctx, 'guest-left'));
  }
  const view = ok((await server.request<ExhibitionCityView>('/api/city-view')).body);
  applyEvent({ type: 'city-state-snapshot', view }, 420);
  const reset = await server.request('/api/admin/lifecycle', { command: 'reset-city', confirmation: 'RESET', expectedRevision: readLifecycle(ctx.db).revision });
  assert.equal(reset.status, 200);
  const resetEvent = await next(); assert.equal(resetEvent.type, 'run-reset'); applyEvent(resetEvent, 424);
  manager.restoreFromSnapshot({ version: 1, runId: 'legacy', revision: 0, history: [],
    scores: view.scores, layout: { nw: { lot: 'empty', building: 'none' }, ne: { lot: 'empty', building: 'none' },
      sw: { lot: 'empty', building: 'none' }, se: { lot: 'empty', building: 'none' } } }, 428);
  assert.equal(manager.getDiagnostics().dogenzakaSouth.sharingDistrict!.enabled, false, 'manager hides sharing in legacy v1');
  assert.equal(manager.getDiagnostics().centerGaiRear.concentrationDistrict!.enabled, false, 'manager hides concentration in legacy v1');
  applyEvent(resetEvent, 432);
  assert.equal(pairingHits.size, 5, 'every P10 pairing occurs in the 81 combinations');
  console.log(`PASS: ${count} actual answer combinations → client parser → real four-site models; HTTP/WebSocket, retry, snapshot and reset.`);
} finally { socket.close(); await server.close(); ctx.db.close(); }
