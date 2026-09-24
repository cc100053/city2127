export const LOT_SOCKET_IDS = ["nw", "ne", "sw", "se"] as const;
export const LOT_KINDS = ["empty", "park", "plaza"] as const;
export const BUILDING_KINDS = ["none", "small", "medium", "tall"] as const;

export type LotSocketId = (typeof LOT_SOCKET_IDS)[number];
export type LotKind = (typeof LOT_KINDS)[number];
export type BuildingKind = (typeof BUILDING_KINDS)[number];

export interface LotState {
  readonly socketId: LotSocketId;
  readonly lot: LotKind;
  readonly building: BuildingKind;
}

export interface CityLayoutState {
  readonly version: 1;
  readonly lots: Record<LotSocketId, LotState>;
}

const initialLots: Record<LotSocketId, LotState> = {
  nw: { socketId: "nw", lot: "empty", building: "none" },
  ne: { socketId: "ne", lot: "park", building: "none" },
  sw: { socketId: "sw", lot: "plaza", building: "none" },
  se: { socketId: "se", lot: "empty", building: "none" },
};

export function createInitialCityLayout(): CityLayoutState {
  return {
    version: 1,
    lots: Object.fromEntries(
      LOT_SOCKET_IDS.map((id) => [id, { ...initialLots[id] }]),
    ) as Record<LotSocketId, LotState>,
  };
}

/** Survey-mode baseline: four empty lots, no buildings, before any guest decision. */
export function createBaselineCityLayout(): CityLayoutState {
  return {
    version: 1,
    lots: Object.fromEntries(
      LOT_SOCKET_IDS.map((id) => [id, { socketId: id, lot: "empty", building: "none" }]),
    ) as Record<LotSocketId, LotState>,
  };
}

export function setLotKind(state: CityLayoutState, socketId: LotSocketId, lot: LotKind): CityLayoutState {
  const previous = state.lots[socketId];
  return {
    ...state,
    lots: {
      ...state.lots,
      [socketId]: {
        ...previous,
        lot,
        building: lot === "empty" ? previous.building : "none",
      },
    },
  };
}

export function setBuildingKind(
  state: CityLayoutState,
  socketId: LotSocketId,
  building: BuildingKind,
): CityLayoutState {
  const previous = state.lots[socketId];
  if (previous.lot !== "empty" && building !== "none") {
    throw new Error(`Cannot place ${building} on ${previous.lot} lot ${socketId}.`);
  }
  return {
    ...state,
    lots: {
      ...state.lots,
      [socketId]: { ...previous, building },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

export function validateCityLayout(value: unknown): CityLayoutState | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.lots)) return null;
  const lots = {} as Record<LotSocketId, LotState>;
  for (const id of LOT_SOCKET_IDS) {
    const candidate = value.lots[id];
    if (!isRecord(candidate)) return null;
    if (candidate.socketId !== id) return null;
    if (!isOneOf(candidate.lot, LOT_KINDS)) return null;
    if (!isOneOf(candidate.building, BUILDING_KINDS)) return null;
    if (candidate.lot !== "empty" && candidate.building !== "none") return null;
    lots[id] = { socketId: id, lot: candidate.lot, building: candidate.building };
  }
  if (Object.keys(value.lots).some((key) => !LOT_SOCKET_IDS.includes(key as LotSocketId))) {
    return null;
  }
  return { version: 1, lots };
}
