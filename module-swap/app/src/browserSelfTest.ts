import type { WebGLRenderer } from "three";
import type { AssetId } from "./assets/assetCatalog";
import type { AssetLoaderCache } from "./assets/assetLoader";
import type { ModuleManager } from "./placement/moduleManager";
import { createInitialCityLayout } from "./state/cityLayoutState";
import { clearSavedCityLayout, saveCityLayout } from "./state/persistence";

const EXPECTED_KEY = "threejs-module-swap-test.selftest-expected";

export interface SelfTestDependencies {
  readonly manager: ModuleManager;
  readonly loader: AssetLoaderCache;
  readonly renderer: WebGLRenderer;
  readonly runtimeErrors: string[];
  readonly diagnostics: () => {
    readonly loadedAssets: readonly AssetId[];
    readonly requestCounts: Readonly<Record<AssetId, number>>;
    readonly socketsFound: readonly string[];
    readonly connectorsFound: readonly string[];
    readonly buildingExtrasValid: boolean;
    readonly propNodesValid: boolean;
    readonly groundSize: readonly [number, number];
  };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function requestedSequence(manager: ModuleManager): Promise<void> {
  await manager.swapLot("nw", "park");
  await manager.swapLot("nw", "plaza");
  await manager.swapLot("nw", "empty");
  await manager.swapBuilding("nw", "small");
  await manager.swapBuilding("nw", "medium");
  await manager.swapBuilding("nw", "tall");
  await manager.swapBuilding("nw", "none");
  await manager.swapBuilding("se", "medium");
  await manager.swapLot("ne", "empty");
  await manager.swapBuilding("ne", "small");
}

function publish(result: object, status: "prepared" | "pass"): void {
  const report = document.createElement("pre");
  report.id = "self-test-report";
  report.dataset.result = status;
  report.textContent = JSON.stringify(result, null, 2);
  document.body.append(report);
  console.info(`BROWSER_SELF_TEST_${status.toUpperCase()}`, result);
}

export async function runBrowserSelfTest(deps: SelfTestDependencies): Promise<void> {
  const mode = new URLSearchParams(location.search).get("selftest");
  if (mode !== "prepare" && mode !== "1") return;
  if (mode === "prepare") {
    localStorage.removeItem(EXPECTED_KEY);
    await deps.manager.restore(createInitialCityLayout(), false);
    await requestedSequence(deps.manager);
    const expected = deps.manager.getState();
    saveCityLayout(localStorage, expected);
    localStorage.setItem(EXPECTED_KEY, JSON.stringify(expected));
    publish({ prepared: true, savedState: expected }, "prepared");
    return;
  }

  const expectedRaw = localStorage.getItem(EXPECTED_KEY);
  if (!expectedRaw) throw new Error("Self-test reload stage is missing expected state.");
  const restoredMatches = JSON.stringify(deps.manager.getState()) === expectedRaw;

  // Warm every interchangeable asset in this browser/WebGL context.
  await requestedSequence(deps.manager);
  await nextFrame();
  const memoryBefore = { ...deps.renderer.info.memory };
  await requestedSequence(deps.manager);
  await nextFrame();
  const memoryAfter = { ...deps.renderer.info.memory };

  const runtime = deps.manager.getRuntimeDiagnostics();
  const noDuplicates = Object.values(runtime).every(
    (slot) => slot.lotAttachmentCount === 1 && slot.buildingAttachmentCount <= 1,
  );
  const exactFinalTransforms = Object.values(runtime).every((slot) => slot.finalTransformsExact);
  const cacheUsedOnce = Object.values(deps.diagnostics().requestCounts).every((count) => count === 1);
  const memoryStable =
    memoryAfter.geometries === memoryBefore.geometries && memoryAfter.textures === memoryBefore.textures;
  const networkEntries = performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".glb"));
  const uniqueNetworkEntries = new Set(networkEntries).size === networkEntries.length;

  await deps.manager.restore(createInitialCityLayout(), false);
  const resetMatches =
    JSON.stringify(deps.manager.getState()) === JSON.stringify(createInitialCityLayout());
  const diagnostics = deps.diagnostics();
  const passed =
    restoredMatches &&
    noDuplicates &&
    exactFinalTransforms &&
    cacheUsedOnce &&
    memoryStable &&
    uniqueNetworkEntries &&
    resetMatches &&
    diagnostics.socketsFound.length === 4 &&
    diagnostics.connectorsFound.length === 4 &&
    diagnostics.buildingExtrasValid &&
    diagnostics.propNodesValid &&
    deps.runtimeErrors.length === 0;
  if (!passed) {
    throw new Error(`Browser self-test failed: ${JSON.stringify({
      restoredMatches,
      noDuplicates,
      exactFinalTransforms,
      cacheUsedOnce,
      memoryStable,
      uniqueNetworkEntries,
      resetMatches,
      diagnostics,
      runtimeErrors: deps.runtimeErrors,
    })}`);
  }

  localStorage.removeItem(EXPECTED_KEY);
  clearSavedCityLayout(localStorage);
  publish({
    passed,
    restoredMatches,
    noDuplicates,
    exactFinalTransforms,
    cacheUsedOnce,
    memoryBefore,
    memoryAfter,
    uniqueNetworkEntries,
    networkEntries,
    resetMatches,
    diagnostics,
    runtime,
    renderer: {
      calls: deps.renderer.info.render.calls,
      triangles: deps.renderer.info.render.triangles,
      lines: deps.renderer.info.render.lines,
      points: deps.renderer.info.render.points,
    },
    runtimeErrors: deps.runtimeErrors,
  }, "pass");
}
