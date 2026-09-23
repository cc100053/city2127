import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialCityLayout,
  setBuildingKind,
  setLotKind,
  validateCityLayout,
} from "../src/state/cityLayoutState.ts";

test("initial state matches the four verified Blender lots", () => {
  const state = createInitialCityLayout();
  assert.deepEqual(
    Object.values(state.lots).map(({ socketId, lot, building }) => ({ socketId, lot, building })),
    [
      { socketId: "nw", lot: "empty", building: "none" },
      { socketId: "ne", lot: "park", building: "none" },
      { socketId: "sw", lot: "plaza", building: "none" },
      { socketId: "se", lot: "empty", building: "none" },
    ],
  );
});

test("small building can be assigned to an empty lot", () => {
  const state = setBuildingKind(createInitialCityLayout(), "nw", "small");
  assert.equal(state.lots.nw.building, "small");
});

test("building cannot be assigned to a park", () => {
  assert.throws(() => setBuildingKind(createInitialCityLayout(), "ne", "small"));
});

test("changing an occupied empty lot to park removes its building", () => {
  const occupied = setBuildingKind(createInitialCityLayout(), "nw", "tall");
  const changed = setLotKind(occupied, "nw", "park");
  assert.equal(changed.lots.nw.building, "none");
});

test("reset creates a fresh initial state", () => {
  const changed = setLotKind(createInitialCityLayout(), "nw", "plaza");
  const reset = createInitialCityLayout();
  assert.notDeepEqual(changed, reset);
  assert.equal(reset.lots.nw.lot, "empty");
});

test("valid parsed JSON is restored", () => {
  const json = JSON.stringify(setBuildingKind(createInitialCityLayout(), "se", "medium"));
  const restored = validateCityLayout(JSON.parse(json) as unknown);
  assert.equal(restored?.lots.se.building, "medium");
});

test("invalid JSON shape is rejected", () => {
  assert.equal(validateCityLayout({ version: 1, lots: { nw: "bad" } }), null);
});

test("unknown socket ID is rejected", () => {
  const value = createInitialCityLayout() as unknown as { version: 1; lots: Record<string, unknown> };
  value.lots.center = { socketId: "center", lot: "empty", building: "none" };
  assert.equal(validateCityLayout(value), null);
});
