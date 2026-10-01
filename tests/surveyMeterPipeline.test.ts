import assert from 'node:assert/strict';
import * as T from 'three';
import { CityChangeManager } from '../src/cityChangeManager.ts';
import { buildSurveySites } from '../src/siteBuilders/index.ts';
import { parseSurveyEvent } from '../src/surveyView.ts';
import { exhibitionFixture, ok, staff, startServer } from '../survey/tests/surveyFixture.ts';
import { createProposalSession, submitProposal } from '../survey/src/server/proposalService.ts';
import { answersForVotes, firstProposalGolden, METER_CONTRACTS, meterCombinations } from '../survey/tests/meterContract.ts';
import type { ExhibitionCityView } from '../survey/src/shared/cityView.ts';
import type { ProposalData, ProposalSessionData, ServerEvent } from '../survey/src/shared/protocol.ts';
import type { CityChangeDiagnostics } from '../src/cityChangeManager.ts';
import { readLifecycle } from '../survey/src/server/adminService.ts';

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
}
function applyEvent(event: unknown, now: number) {
  const parsed = parseSurveyEvent(event);
  assert.ok(parsed && parsed.view.version === 2, 'real server event passes client validation');
  manager.applyExhibitionLayout(parsed.view.layout, parsed.kind, now);
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
  console.log(`PASS: ${count} actual answer combinations → client parser → real four-site models; HTTP/WebSocket, retry, snapshot and reset.`);
} finally { socket.close(); await server.close(); ctx.db.close(); }
