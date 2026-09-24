import assert from "node:assert/strict";
import test from "node:test";
import { createBaselineCityLayout, setBuildingKind, setLotKind } from "../src/state/cityLayoutState.ts";
import { parseSurveyEvent, slotLabels, supersedes, type SurveyView } from "../src/state/surveyView.ts";

const demoLayout = setBuildingKind(setLotKind(setBuildingKind(createBaselineCityLayout(), "nw", "medium"), "sw", "plaza"), "se", "tall");
const demoHistory = [
  { revision: 1, pressure: "労働力不足", questionText: "q1", optionLabel: "店舗と配達を自動化する", policyChange: { automation: 2 }, cityChanges: [{ socketId: "nw", label: "自動サービス拠点（自動化）" }] },
  { revision: 2, pressure: "街のにぎわいの低下", questionText: "q2", optionLabel: "コモンズ", policyChange: { publicSharing: 2 }, cityChanges: [{ socketId: "sw", label: "公共コモンズ広場（公共共有）" }] },
  { revision: 3, pressure: "中心部の土地不足", questionText: "q3", optionLabel: "上へ", policyChange: { urbanConcentration: 2 }, cityChanges: [{ socketId: "se", label: "高層集約タワー（都市集約）" }] },
];
const message = (view: object, type = "city-state-updated") => ({ type, state: {}, view });
const view = (runId: string, revision: number): SurveyView => ({ runId, revision, layout: createBaselineCityLayout(), history: [] });

test("baseline layout is four empty lots without buildings", () => {
  assert.ok(Object.values(createBaselineCityLayout().lots).every((lot) => lot.lot === "empty" && lot.building === "none"));
});

test("a server view parses into a validated layout and history", () => {
  const parsed = parseSurveyEvent(message({ runId: "r", revision: 3, layout: demoLayout, history: demoHistory }));
  assert.equal(parsed?.kind, "city-state-updated");
  assert.deepEqual(parsed?.view.layout, demoLayout);
  assert.equal(parsed?.view.history.length, 3);
});

test("malformed messages are rejected", () => {
  assert.equal(parseSurveyEvent({ type: "city-state-updated" }), null);
  assert.equal(parseSurveyEvent(message({ runId: "r", revision: 1, layout: demoLayout, history: [] }, "other")), null);
  const buildingOnPlaza = structuredClone(demoLayout) as { lots: { sw: { building: string } } };
  buildingOnPlaza.lots.sw.building = "tall";
  assert.equal(parseSurveyEvent(message({ runId: "r", revision: 1, layout: buildingOnPlaza, history: [] })), null);
  const badChange = [{ ...demoHistory[0], cityChanges: [{ socketId: "center", label: "x" }] }];
  assert.equal(parseSurveyEvent(message({ runId: "r", revision: 1, layout: demoLayout, history: badChange })), null);
});

test("old or repeated revisions of the same run are ignored; a new run always replaces", () => {
  assert.equal(supersedes(undefined, view("a", 0)), true);
  assert.equal(supersedes(view("a", 2), view("a", 3)), true);
  assert.equal(supersedes(view("a", 3), view("a", 3)), false);
  assert.equal(supersedes(view("a", 3), view("a", 2)), false);
  assert.equal(supersedes(view("a", 3), view("b", 0)), true);
});

test("each occupied lot is labelled by the decision that last changed it", () => {
  const parsed = parseSurveyEvent(message({ runId: "r", revision: 3, layout: demoLayout, history: demoHistory }));
  assert.ok(parsed);
  assert.deepEqual(slotLabels(parsed.view), {
    nw: "自動サービス拠点（自動化）",
    sw: "公共コモンズ広場（公共共有）",
    se: "高層集約タワー（都市集約）",
  });
});
