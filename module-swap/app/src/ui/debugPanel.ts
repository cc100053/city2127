import {
  BUILDING_KINDS,
  LOT_KINDS,
  LOT_SOCKET_IDS,
  type BuildingKind,
  type CityLayoutState,
  type LotKind,
  type LotSocketId,
} from "../state/cityLayoutState";

export interface DebugToggles {
  readonly sockets: boolean;
  readonly connectors: boolean;
  readonly bounds: boolean;
  readonly renderer: boolean;
  readonly grid: boolean;
}

export interface DebugPanelActions {
  selectSocket(id: LotSocketId): void;
  swapLot(id: LotSocketId, kind: LotKind): Promise<void>;
  swapBuilding(id: LotSocketId, kind: BuildingKind): Promise<void>;
  reset(): Promise<void>;
  save(): void;
  load(): Promise<void>;
  clearSaved(): void;
  debugChanged(toggles: DebugToggles): void;
}

export class DebugPanel {
  private selected: LotSocketId = "nw";
  private stateText: HTMLElement;
  private messageText: HTMLElement;
  private errorText: HTMLElement;
  private rendererText: HTMLElement;
  private controls: HTMLButtonElement[] = [];
  private actions?: DebugPanelActions;
  private state?: CityLayoutState;

  constructor(private readonly container: HTMLElement) {
    container.innerHTML = `
      <h1>Module Swap Test</h1>
      <p class="hint">GLB / socket / state debug</p>
      <section><h2>対象区画</h2><div data-role="socket-buttons" class="button-row"></div></section>
      <section><h2>区画交換</h2><div data-role="lot-buttons" class="button-row"></div></section>
      <section><h2>建物交換</h2><div data-role="building-buttons" class="button-row"></div></section>
      <section><h2>状態</h2><div data-role="state-buttons" class="button-row"></div></section>
      <section class="toggles"><h2>Debug</h2></section>
      <pre data-role="state"></pre>
      <p data-role="message" class="message">起動中...</p>
      <pre data-role="renderer" class="renderer"></pre>
      <pre data-role="error" class="error" hidden></pre>
    `;
    this.stateText = this.requireElement("state");
    this.messageText = this.requireElement("message");
    this.errorText = this.requireElement("error");
    this.rendererText = this.requireElement("renderer");
    this.createButtons();
    this.createToggles();
  }

  setActions(actions: DebugPanelActions): void {
    this.actions = actions;
  }

  setState(state: CityLayoutState, busy: boolean): void {
    this.state = state;
    const current = state.lots[this.selected];
    this.stateText.textContent = [
      `selected: ${this.selected.toUpperCase()}`,
      `lot: ${current.lot}`,
      `building: ${current.building}`,
      `animating: ${busy}`,
      "",
      JSON.stringify(state, null, 2),
    ].join("\n");
    this.container.querySelectorAll<HTMLButtonElement>("[data-socket]").forEach((button) => {
      button.classList.toggle("active", button.dataset.socket === this.selected);
    });
  }

  setBusy(busy: boolean): void {
    for (const control of this.controls) control.disabled = busy;
    if (this.state) this.setState(this.state, busy);
  }

  setMessage(message: string, warning = false): void {
    this.messageText.textContent = message;
    this.messageText.classList.toggle("warning", warning);
  }

  showError(message: string): void {
    this.errorText.hidden = false;
    this.errorText.textContent = message;
    this.setMessage("エラーが発生しました。", true);
  }

  setRendererInfo(message: string): void {
    this.rendererText.textContent = message;
  }

  private createButtons(): void {
    const socketArea = this.requireElement("socket-buttons");
    for (const id of LOT_SOCKET_IDS) {
      this.addButton(socketArea, id.toUpperCase(), () => {
        this.selected = id;
        this.actions?.selectSocket(id);
        if (this.state) this.setState(this.state, false);
      }, { socket: id });
    }
    const lotArea = this.requireElement("lot-buttons");
    for (const kind of LOT_KINDS) {
      this.addButton(lotArea, kind, () => void this.actions?.swapLot(this.selected, kind));
    }
    const buildingArea = this.requireElement("building-buttons");
    for (const kind of BUILDING_KINDS) {
      this.addButton(buildingArea, kind, () => void this.actions?.swapBuilding(this.selected, kind));
    }
    const stateArea = this.requireElement("state-buttons");
    this.addButton(stateArea, "Reset", () => void this.actions?.reset());
    this.addButton(stateArea, "Save", () => this.actions?.save());
    this.addButton(stateArea, "Load", () => void this.actions?.load());
    this.addButton(stateArea, "Clear", () => this.actions?.clearSaved());
  }

  private createToggles(): void {
    const area = this.container.querySelector<HTMLElement>(".toggles");
    if (!area) throw new Error("Debug toggle container is missing.");
    const definitions: ReadonlyArray<readonly [keyof DebugToggles, string]> = [
      ["sockets", "socket markers"],
      ["connectors", "connector markers"],
      ["bounds", "bounds"],
      ["renderer", "renderer info"],
      ["grid", "grid"],
    ];
    const inputs = new Map<keyof DebugToggles, HTMLInputElement>();
    const publish = (): void => {
      this.actions?.debugChanged({
        sockets: inputs.get("sockets")?.checked ?? false,
        connectors: inputs.get("connectors")?.checked ?? false,
        bounds: inputs.get("bounds")?.checked ?? false,
        renderer: inputs.get("renderer")?.checked ?? false,
        grid: inputs.get("grid")?.checked ?? false,
      });
    };
    for (const [key, labelText] of definitions) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.addEventListener("change", publish);
      inputs.set(key, input);
      label.append(input, document.createTextNode(labelText));
      area.append(label);
    }
  }

  private addButton(
    parent: HTMLElement,
    label: string,
    listener: () => void,
    data?: Readonly<Record<string, string>>,
  ): void {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (data) Object.assign(button.dataset, data);
    button.addEventListener("click", listener);
    parent.append(button);
    this.controls.push(button);
  }

  private requireElement(role: string): HTMLElement {
    const element = this.container.querySelector<HTMLElement>(`[data-role="${role}"]`);
    if (!element) throw new Error(`Debug panel element is missing: ${role}`);
    return element;
  }
}
