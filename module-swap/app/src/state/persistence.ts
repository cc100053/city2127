import {
  createInitialCityLayout,
  validateCityLayout,
  type CityLayoutState,
} from "./cityLayoutState";

// Keep this legacy key so existing version 1 layout data remains readable.
export const STORAGE_KEY = "threejs-module-swap-test.city-state.v1";

export interface LoadResult {
  readonly state: CityLayoutState;
  readonly source: "saved" | "initial";
  readonly warning?: string;
}

export function saveCityLayout(storage: Storage, state: CityLayoutState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadCityLayout(storage: Storage): LoadResult {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { state: createInitialCityLayout(), source: "initial" };
  try {
    const state = validateCityLayout(JSON.parse(raw) as unknown);
    if (state) return { state, source: "saved" };
    return {
      state: createInitialCityLayout(),
      source: "initial",
      warning: "保存データの形式が不正なため、初期状態を使用しました。",
    };
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      state: createInitialCityLayout(),
      source: "initial",
      warning: `保存JSONを解析できません: ${detail}`,
    };
  }
}

export function clearSavedCityLayout(storage: Storage): void {
  storage.removeItem(STORAGE_KEY);
}
