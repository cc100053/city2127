import {
  Box3,
  BoxHelper,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Scene,
  SphereGeometry,
  Vector3,
} from "three";
import "./style.css";
import { ALL_ASSET_IDS, ASSET_CATALOG, type AssetId } from "./assets/assetCatalog";
import { AssetLoaderCache } from "./assets/assetLoader";
import { runBrowserSelfTest } from "./browserSelfTest";
import { ModuleManager } from "./placement/moduleManager";
import { readWorldTransform } from "./placement/socketPlacement";
import { createScene } from "./scene/createScene";
import { createInitialCityLayout, type BuildingKind, type LotKind, type LotSocketId } from "./state/cityLayoutState";
import { clearSavedCityLayout, loadCityLayout, saveCityLayout } from "./state/persistence";
import { DebugPanel, type DebugToggles } from "./ui/debugPanel";

const PROP_NODE_NAMES = [
  "prop_tree_small",
  "prop_tree_large",
  "prop_bench",
  "prop_planter",
  "prop_streetlight",
  "prop_bollard",
] as const;

const BUILDING_EXTRA_KEYS = [
  "asset_id",
  "category",
  "footprint_x",
  "footprint_y",
  "height",
  "forward_axis",
  "compatible_socket",
] as const;

const runtimeErrors: string[] = [];
window.addEventListener("error", (event) => runtimeErrors.push(event.message));
window.addEventListener("unhandledrejection", (event) => {
  runtimeErrors.push(event.reason instanceof Error ? event.reason.message : String(event.reason));
});

interface Diagnostics {
  readonly loadedAssets: readonly AssetId[];
  readonly requestCounts: Readonly<Record<AssetId, number>>;
  readonly socketsFound: readonly string[];
  readonly connectorsFound: readonly string[];
  readonly buildingExtrasValid: boolean;
  readonly propNodesValid: boolean;
  readonly groundSize: readonly [number, number];
}

declare global {
  interface Window {
    __moduleSwapTest?: {
      getState(): ReturnType<ModuleManager["getState"]>;
      swapLot(id: LotSocketId, kind: LotKind): Promise<boolean>;
      swapBuilding(id: LotSocketId, kind: BuildingKind): Promise<boolean>;
      reset(): Promise<boolean>;
      save(): void;
      load(): Promise<boolean>;
      diagnostics(): Diagnostics;
    };
  }
}

function requireHtmlElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing HTML element: #${id}`);
  return element;
}

function enableShadows(root: Object3D): void {
  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
}

function markerAt(node: Object3D, color: number, name: string): Mesh {
  const marker = new Mesh(
    new SphereGeometry(0.38, 12, 8),
    new MeshBasicMaterial({ color, depthTest: false }),
  );
  marker.name = name;
  marker.position.copy(readWorldTransform(node).position);
  marker.renderOrder = 10;
  return marker;
}

async function start(): Promise<void> {
  const viewport = requireHtmlElement("viewport");
  const panel = new DebugPanel(requireHtmlElement("debug-panel"));
  const context = createScene(viewport);
  const loader = new AssetLoaderCache();
  const warnings: string[] = [];

  panel.setMessage("8個のGLBを読み込み中...");
  const loaded = await Promise.all(ALL_ASSET_IDS.map((id) => loader.load(id)));

  let buildingExtrasValid = true;
  for (const asset of loaded.filter((entry) => entry.definition.category === "building")) {
    for (const key of BUILDING_EXTRA_KEYS) {
      if (!(key in asset.root.userData)) {
        buildingExtrasValid = false;
        warnings.push(`${asset.definition.id}: missing GLB Extra '${key}'`);
      }
    }
  }

  const prop = loaded.find((entry) => entry.definition.id === "prop-kit");
  if (!prop) throw new Error("prop-kit did not load.");
  let propNodesValid = true;
  for (const name of PROP_NODE_NAMES) {
    const templateNode = prop.root.getObjectByName(name);
    if (!templateNode) {
      propNodesValid = false;
      warnings.push(`prop-kit: missing node ${name}`);
      continue;
    }
    const original = templateNode.position.clone();
    const clone = templateNode.clone(true);
    clone.position.set(100, 0, 100);
    if (!templateNode.position.equals(original)) {
      propNodesValid = false;
      warnings.push(`prop-kit template position mutated for ${name}`);
    }
  }

  const groundRoot = await loader.cloneRoot("ground-cross");
  groundRoot.name = "GROUND_CROSS_RUNTIME";
  enableShadows(groundRoot);
  context.scene.add(groundRoot);

  let latestState = createInitialCityLayout();
  const manager = new ModuleManager(groundRoot, loader, {
    onStateChanged: (state) => {
      latestState = state;
      panel.setState(state, manager.isBusy());
      rebuildBounds();
    },
    onBusyChanged: (busy) => panel.setBusy(busy),
    onWarning: (message) => {
      warnings.push(message);
      panel.setMessage(message, true);
      console.warn(message);
    },
  });

  const markers = new Group();
  markers.name = "DEBUG_MARKERS";
  context.scene.add(markers);
  const socketMarkers = new Group();
  const connectorMarkers = new Group();
  markers.add(socketMarkers, connectorMarkers);
  for (const [id, socket] of manager.getSockets()) {
    socketMarkers.add(markerAt(socket, 0x37f6c3, `socket-marker-${id}`));
  }
  for (const connector of manager.connectors) {
    connectorMarkers.add(markerAt(connector, 0xffc857, `marker-${connector.name}`));
  }
  socketMarkers.visible = false;
  connectorMarkers.visible = false;

  const boundsGroup = new Group();
  boundsGroup.name = "DEBUG_BOUNDS";
  boundsGroup.visible = false;
  context.scene.add(boundsGroup);
  function rebuildBounds(): void {
    boundsGroup.clear();
    for (const object of manager.getDebugObjects()) {
      const helper = new BoxHelper(object, 0xff72d0);
      helper.name = `bounds-${object.name}`;
      boundsGroup.add(helper);
    }
  }

  const loadResult = loadCityLayout(localStorage);
  if (loadResult.warning) warnings.push(loadResult.warning);
  await manager.initialize(loadResult.state);
  latestState = manager.getState();
  enableShadows(groundRoot);

  const groundBox = new Box3().setFromObject(groundRoot);
  const groundSizeVector = groundBox.getSize(new Vector3());
  const groundSize: readonly [number, number] = [
    Number(groundSizeVector.x.toFixed(3)),
    Number(groundSizeVector.z.toFixed(3)),
  ];
  if (Math.abs(groundSize[0] - 60) > 0.01 || Math.abs(groundSize[1] - 60) > 0.01) {
    warnings.push(`ground-cross horizontal bounds differ from 60m: ${groundSize.join(" x ")}`);
  }

  const debugChanged = (toggles: DebugToggles): void => {
    socketMarkers.visible = toggles.sockets;
    connectorMarkers.visible = toggles.connectors;
    boundsGroup.visible = toggles.bounds;
    context.grid.visible = toggles.grid;
    panel.setRendererInfo(toggles.renderer ? rendererInfo() : "");
  };

  const restoreSaved = async (): Promise<boolean> => {
    const result = loadCityLayout(localStorage);
    if (result.warning) panel.setMessage(result.warning, true);
    return manager.restore(result.state, false);
  };

  panel.setActions({
    selectSocket: () => panel.setState(latestState, manager.isBusy()),
    swapLot: async (id, kind) => {
      const ok = await manager.swapLot(id, kind);
      panel.setMessage(ok ? `${id.toUpperCase()} lot → ${kind}` : "操作は拒否されました。", !ok);
    },
    swapBuilding: async (id, kind) => {
      const ok = await manager.swapBuilding(id, kind);
      panel.setMessage(ok ? `${id.toUpperCase()} building → ${kind}` : "建物を配置できません。", !ok);
    },
    reset: async () => {
      await manager.restore(createInitialCityLayout(), false);
      panel.setMessage("初期状態へ戻しました。");
    },
    save: () => {
      saveCityLayout(localStorage, manager.getState());
      panel.setMessage("配置状態をlocalStorageへ保存しました。");
    },
    load: async () => {
      await restoreSaved();
      panel.setMessage("保存状態を再構築しました。");
    },
    clearSaved: () => {
      clearSavedCityLayout(localStorage);
      panel.setMessage("保存状態を削除しました。");
    },
    debugChanged,
  });

  const diagnostics = (): Diagnostics => ({
    loadedAssets: [...ALL_ASSET_IDS],
    requestCounts: Object.fromEntries(
      ALL_ASSET_IDS.map((id) => [id, loader.getRequestCount(id)]),
    ) as Record<AssetId, number>,
    socketsFound: [...manager.getSockets().values()].map((socket) => socket.name),
    connectorsFound: manager.connectors.map((connector) => connector.name),
    buildingExtrasValid,
    propNodesValid,
    groundSize,
  });

  window.__moduleSwapTest = {
    getState: () => manager.getState(),
    swapLot: (id, kind) => manager.swapLot(id, kind),
    swapBuilding: (id, kind) => manager.swapBuilding(id, kind),
    reset: () => manager.restore(createInitialCityLayout(), false),
    save: () => saveCityLayout(localStorage, manager.getState()),
    load: restoreSaved,
    diagnostics,
  };

  panel.setState(manager.getState(), false);
  panel.setMessage(
    warnings.length === 0
      ? `Ready: ${ALL_ASSET_IDS.length} GLBs / sockets 4 / connectors 4`
      : warnings.join("\n"),
    warnings.length > 0,
  );
  console.info("Module swap diagnostics", diagnostics());

  let lastInfoUpdate = 0;
  function rendererInfo(): string {
    const info = context.renderer.info;
    return [
      `geometries: ${info.memory.geometries}`,
      `textures: ${info.memory.textures}`,
      `calls: ${info.render.calls}`,
      `triangles: ${info.render.triangles}`,
    ].join("\n");
  }

  function render(now: number): void {
    context.controls.update();
    context.renderer.render(context.scene, context.camera);
    if (now - lastInfoUpdate > 500 && panel) {
      lastInfoUpdate = now;
      const rendererElement = document.querySelector<HTMLElement>("[data-role='renderer']");
      if (rendererElement?.textContent) panel.setRendererInfo(rendererInfo());
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
  void runBrowserSelfTest({ manager, loader, renderer: context.renderer, runtimeErrors, diagnostics }).catch(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      panel.showError(message);
      console.error("BROWSER_SELF_TEST_FAIL", error);
    },
  );
}

start().catch((error: unknown) => {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
  console.error(error);
  const panelElement = document.getElementById("debug-panel");
  if (panelElement) {
    const panel = new DebugPanel(panelElement);
    panel.showError(message);
  }
});
