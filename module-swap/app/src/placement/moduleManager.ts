import { Object3D } from "three";
import { AssetLoaderCache } from "../assets/assetLoader";
import type { AssetId } from "../assets/assetCatalog";
import { animateModuleIn, animateModuleOut } from "../animation/swapAnimation";
import {
  createInitialCityLayout,
  LOT_SOCKET_IDS,
  setBuildingKind,
  setLotKind,
  type BuildingKind,
  type CityLayoutState,
  type LotKind,
  type LotSocketId,
} from "../state/cityLayoutState";
import {
  attachModuleToSocket,
  LOT_SOCKET_NODE_NAMES,
  requireNamedNode,
  ROAD_CONNECTOR_NAMES,
  type SocketAttachment,
} from "./socketPlacement";

interface RuntimeModule {
  readonly attachment: SocketAttachment;
  readonly kind: string;
}

interface SlotRuntime {
  readonly socket: Object3D;
  lot?: RuntimeModule;
  building?: RuntimeModule;
}

export interface ModuleManagerEvents {
  onStateChanged(state: CityLayoutState): void;
  onBusyChanged(busy: boolean): void;
  onWarning(message: string): void;
}

export interface RuntimeSlotDiagnostic {
  readonly lot: string | null;
  readonly building: string | null;
  readonly lotAttachmentCount: number;
  readonly buildingAttachmentCount: number;
  readonly buildingParentName: string | null;
  readonly finalTransformsExact: boolean;
}

const lotAssetIds: Record<LotKind, AssetId> = {
  empty: "lot-empty",
  park: "lot-park",
  plaza: "lot-plaza",
};

const buildingAssetIds: Record<Exclude<BuildingKind, "none">, AssetId> = {
  small: "building-basic-small",
  medium: "building-basic-medium",
  tall: "building-basic-tall",
};

export class ModuleManager {
  private state = createInitialCityLayout();
  private busy = false;
  private readonly slots = new Map<LotSocketId, SlotRuntime>();
  readonly connectors: readonly Object3D[];

  constructor(
    readonly groundRoot: Object3D,
    private readonly assets: AssetLoaderCache,
    private readonly events: ModuleManagerEvents,
  ) {
    groundRoot.updateWorldMatrix(true, true);
    for (const id of LOT_SOCKET_IDS) {
      this.slots.set(id, { socket: requireNamedNode(groundRoot, LOT_SOCKET_NODE_NAMES[id]) });
    }
    this.connectors = ROAD_CONNECTOR_NAMES.map((name) => requireNamedNode(groundRoot, name));
  }

  getState(): CityLayoutState {
    return structuredClone(this.state);
  }

  isBusy(): boolean {
    return this.busy;
  }

  getSockets(): ReadonlyMap<LotSocketId, Object3D> {
    return new Map(
      [...this.slots.entries()].map(([id, slot]) => [id, slot.socket] as const),
    );
  }

  getDebugObjects(): readonly Object3D[] {
    const objects: Object3D[] = [this.groundRoot];
    for (const slot of this.slots.values()) {
      if (slot.lot) objects.push(slot.lot.attachment.module);
      if (slot.building) objects.push(slot.building.attachment.module);
    }
    return objects;
  }

  getRuntimeDiagnostics(): Record<LotSocketId, RuntimeSlotDiagnostic> {
    const result = {} as Record<LotSocketId, RuntimeSlotDiagnostic>;
    for (const id of LOT_SOCKET_IDS) {
      const slot = this.requireSlot(id);
      const wrappers = [slot.lot?.attachment.animationWrapper, slot.building?.attachment.animationWrapper]
        .filter((wrapper): wrapper is NonNullable<typeof wrapper> => wrapper !== undefined);
      result[id] = {
        lot: slot.lot?.kind ?? null,
        building: slot.building?.kind ?? null,
        lotAttachmentCount: slot.lot ? 1 : 0,
        buildingAttachmentCount: slot.building ? 1 : 0,
        buildingParentName: slot.building?.attachment.anchor.parent?.name ?? null,
        finalTransformsExact: wrappers.every(
          (wrapper) =>
            wrapper.position.lengthSq() === 0 &&
            wrapper.quaternion.equals(wrapper.quaternion.clone().identity()) &&
            wrapper.scale.x === 1 && wrapper.scale.y === 1 && wrapper.scale.z === 1,
        ),
      };
    }
    return result;
  }

  async initialize(target: CityLayoutState): Promise<void> {
    await this.restore(target, false);
  }

  async swapLot(socketId: LotSocketId, lot: LotKind): Promise<boolean> {
    if (this.busy) return false;
    if (this.state.lots[socketId].lot === lot) return true;
    const next = setLotKind(this.state, socketId, lot);
    return this.withLock(async () => {
      const slot = this.requireSlot(socketId);
      await this.removeBuilding(slot, true);
      await this.removeLot(slot, true);
      await this.installLot(slot, socketId, lot, true);
      this.state = next;
      this.events.onStateChanged(this.getState());
    });
  }

  async swapBuilding(socketId: LotSocketId, building: BuildingKind): Promise<boolean> {
    if (this.busy) return false;
    let next: CityLayoutState;
    try {
      next = setBuildingKind(this.state, socketId, building);
    } catch (error: unknown) {
      this.events.onWarning(error instanceof Error ? error.message : String(error));
      return false;
    }
    if (this.state.lots[socketId].building === building) return true;
    return this.withLock(async () => {
      const slot = this.requireSlot(socketId);
      await this.removeBuilding(slot, true);
      if (building !== "none") await this.installBuilding(slot, socketId, building, true);
      this.state = next;
      this.events.onStateChanged(this.getState());
    });
  }

  async restore(target: CityLayoutState, animate = false): Promise<boolean> {
    if (this.busy) return false;
    return this.withLock(async () => {
      for (const id of LOT_SOCKET_IDS) {
        const slot = this.requireSlot(id);
        await this.removeBuilding(slot, animate);
        await this.removeLot(slot, animate);
      }
      for (const id of LOT_SOCKET_IDS) {
        const value = target.lots[id];
        const slot = this.requireSlot(id);
        await this.installLot(slot, id, value.lot, animate);
        if (value.building !== "none") {
          await this.installBuilding(slot, id, value.building, animate);
        }
      }
      this.state = structuredClone(target);
      this.events.onStateChanged(this.getState());
    });
  }

  private requireSlot(id: LotSocketId): SlotRuntime {
    const slot = this.slots.get(id);
    if (!slot) throw new Error(`Unknown lot socket: ${id}`);
    return slot;
  }

  private async installLot(
    slot: SlotRuntime,
    socketId: LotSocketId,
    kind: LotKind,
    animate: boolean,
  ): Promise<void> {
    const module = await this.assets.cloneRoot(lotAssetIds[kind]);
    const attachment = attachModuleToSocket(slot.socket, module, `lot-${socketId}-${kind}`);
    slot.lot = { attachment, kind };
    if (kind === "empty") {
      const buildingSocket = requireNamedNode(module, "socket_building_center");
      const compatible = buildingSocket.userData.compatible_socket;
      if (compatible !== "building") {
        this.events.onWarning(
          `socket_building_center on ${socketId} has unexpected compatible_socket: ${String(compatible)}`,
        );
      }
    }
    if (animate) await animateModuleIn(attachment.animationWrapper);
  }

  private async installBuilding(
    slot: SlotRuntime,
    socketId: LotSocketId,
    kind: Exclude<BuildingKind, "none">,
    animate: boolean,
  ): Promise<void> {
    if (!slot.lot || slot.lot.kind !== "empty") {
      throw new Error(`Building ${kind} requires an empty lot at ${socketId}.`);
    }
    const buildingSocket = requireNamedNode(slot.lot.attachment.module, "socket_building_center");
    const module = await this.assets.cloneRoot(buildingAssetIds[kind]);
    const attachment = attachModuleToSocket(buildingSocket, module, `building-${socketId}-${kind}`);
    slot.building = { attachment, kind };
    if (animate) await animateModuleIn(attachment.animationWrapper);
  }

  private async removeLot(slot: SlotRuntime, animate: boolean): Promise<void> {
    if (!slot.lot) return;
    if (animate) await animateModuleOut(slot.lot.attachment.animationWrapper);
    slot.lot.attachment.anchor.removeFromParent();
    slot.lot = undefined;
  }

  private async removeBuilding(slot: SlotRuntime, animate: boolean): Promise<void> {
    if (!slot.building) return;
    if (animate) await animateModuleOut(slot.building.attachment.animationWrapper);
    slot.building.attachment.anchor.removeFromParent();
    slot.building = undefined;
  }

  private async withLock(operation: () => Promise<void>): Promise<boolean> {
    this.busy = true;
    this.events.onBusyChanged(true);
    try {
      await operation();
      return true;
    } finally {
      this.busy = false;
      this.events.onBusyChanged(false);
    }
  }
}
