import { LOT_SOCKET_IDS, validateCityLayout, type CityLayoutState, type LotSocketId } from "./cityLayoutState.ts";

// Viewer-side copy of the survey server's CityView contract (survey/src/shared/cityView.ts).
// The server derives the layout from policy state; this app only validates and renders it.

export interface CityChange {
  readonly socketId: LotSocketId;
  readonly label: string;
}

export interface Decision {
  readonly revision: number;
  readonly year?: number;
  readonly pressure?: string;
  readonly questionText: string;
  readonly optionLabel: string;
  readonly policyChange: Readonly<Record<string, number>>;
  readonly cityChanges: readonly CityChange[];
}

export interface SurveyView {
  readonly runId: string;
  readonly revision: number;
  readonly layout: CityLayoutState;
  readonly history: readonly Decision[];
}

export type SurveyEventKind = "city-state-snapshot" | "city-state-updated" | "run-reset";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDecision(value: unknown): value is Decision {
  return (
    isRecord(value) &&
    typeof value.revision === "number" &&
    typeof value.questionText === "string" &&
    typeof value.optionLabel === "string" &&
    isRecord(value.policyChange) &&
    Object.values(value.policyChange).every((delta) => typeof delta === "number") &&
    Array.isArray(value.cityChanges) &&
    value.cityChanges.every(
      (change) => isRecord(change) && LOT_SOCKET_IDS.includes(change.socketId as LotSocketId) && typeof change.label === "string",
    )
  );
}

/** Parses one WebSocket message from the survey server; anything malformed returns null. */
export function parseSurveyEvent(data: unknown): { kind: SurveyEventKind; view: SurveyView } | null {
  if (!isRecord(data) || !isRecord(data.view)) return null;
  if (data.type !== "city-state-snapshot" && data.type !== "city-state-updated" && data.type !== "run-reset") return null;
  const { runId, revision, layout: rawLayout, history } = data.view;
  if (typeof runId !== "string" || typeof revision !== "number") return null;
  const layout = validateCityLayout(rawLayout);
  if (!layout || !Array.isArray(history) || !history.every(isDecision)) return null;
  return { kind: data.type, view: { runId, revision, layout, history } };
}

/** A view replaces the current one unless it is an older or repeated revision of the same run. */
export function supersedes(current: SurveyView | undefined, next: SurveyView): boolean {
  return !current || next.runId !== current.runId || next.revision > current.revision;
}

/** What each lot shows now, from the latest decision that changed it. Empty lots have no label. */
export function slotLabels(view: SurveyView): Partial<Record<LotSocketId, string>> {
  const labels: Partial<Record<LotSocketId, string>> = {};
  for (const decision of view.history) for (const change of decision.cityChanges) labels[change.socketId] = change.label;
  for (const [id, lot] of Object.entries(view.layout.lots) as [LotSocketId, CityLayoutState["lots"][LotSocketId]][]) {
    if (lot.lot === "empty" && lot.building === "none") delete labels[id];
  }
  return labels;
}

/** Keeps a WebSocket to the survey server open; every (re)connect starts with a full snapshot. */
export function connectSurvey(
  url: string,
  onView: (kind: SurveyEventKind, view: SurveyView) => void,
  onStatus: (status: string) => void,
): void {
  let delay = 500;
  const open = (): void => {
    const socket = new WebSocket(url);
    onStatus("接続中…");
    socket.addEventListener("open", () => {
      delay = 500;
      onStatus("接続済み");
    });
    socket.addEventListener("message", (message) => {
      let parsed: ReturnType<typeof parseSurveyEvent> = null;
      try {
        parsed = parseSurveyEvent(JSON.parse(String(message.data)) as unknown);
      } catch {
        parsed = null;
      }
      if (parsed) onView(parsed.kind, parsed.view);
      else console.warn("Ignored malformed survey message", message.data);
    });
    socket.addEventListener("close", () => {
      onStatus(`切断 — ${delay / 1000}秒後に再接続`);
      window.setTimeout(open, delay);
      delay = Math.min(delay * 2, 8000);
    });
  };
  open();
}
