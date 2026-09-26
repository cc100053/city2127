export const AXES = ['automation', 'publicSharing', 'environmentalPriority', 'urbanConcentration'] as const;
export type Scores = Record<typeof AXES[number], number>;

export const LOT_SOCKET_IDS = ['nw', 'ne', 'sw', 'se'] as const;
export type LotSocketId = typeof LOT_SOCKET_IDS[number];
export type Lot = { lot: 'empty' | 'park' | 'plaza'; building: 'none' | 'small' | 'medium' | 'tall' };
export type Layout = Record<LotSocketId, Lot>;

export type Decision = {
  revision: number;
  year?: number;
  pressure?: string;
  questionText: string;
  optionLabel: string;
  policyChange: Record<string, number>;
  cityChanges: { socketId: LotSocketId; label: string }[];
};

export type SurveyView = { runId: string; revision: number; scores: Scores; layout: Layout; history: Decision[] };
export type SurveyEventKind = 'city-state-snapshot' | 'city-state-updated' | 'run-reset';
export type ParsedSurveyEvent = { kind: SurveyEventKind; view: SurveyView };

const LOT_KINDS = ['empty', 'park', 'plaza'] as const;
const BUILDING_KINDS = ['none', 'small', 'medium', 'tall'] as const;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isOneOf = <T extends readonly string[]>(value: unknown, options: T): value is T[number] =>
  typeof value === 'string' && options.includes(value);

function isDecision(value: unknown): value is Decision {
  return isRecord(value)
    && typeof value.revision === 'number'
    && typeof value.optionLabel === 'string'
    && typeof value.questionText === 'string'
    && isRecord(value.policyChange)
    && Object.values(value.policyChange).every(delta => typeof delta === 'number')
    && Array.isArray(value.cityChanges)
    && value.cityChanges.every(change => isRecord(change)
      && LOT_SOCKET_IDS.includes(change.socketId as LotSocketId)
      && typeof change.label === 'string');
}

/** Parses one WebSocket message from the survey server; anything malformed returns null. */
export function parseSurveyEvent(data: unknown): ParsedSurveyEvent | null {
  if (!isRecord(data) || !isRecord(data.view)) return null;
  if (data.type !== 'city-state-snapshot' && data.type !== 'city-state-updated' && data.type !== 'run-reset') return null;
  const { runId, revision, scores, history, layout } = data.view;
  if (typeof runId !== 'string' || typeof revision !== 'number' || !isRecord(scores) || !Array.isArray(history)) return null;
  if (!AXES.every(axis => typeof scores[axis] === 'number') || !history.every(isDecision)) return null;
  const lots = isRecord(layout) && isRecord(layout.lots) ? layout.lots : null;
  if (!lots || !LOT_SOCKET_IDS.every(id => isRecord(lots[id])
    && isOneOf(lots[id].lot, LOT_KINDS)
    && isOneOf(lots[id].building, BUILDING_KINDS))) return null;
  return {
    kind: data.type,
    view: { runId, revision, scores: scores as Scores, layout: lots as Layout, history: history as Decision[] },
  };
}

/** A view replaces the current one unless it is an older or repeated revision of the same run. */
export const supersedes = (current: SurveyView | undefined, next: SurveyView) =>
  !current || next.runId !== current.runId || next.revision > current.revision;

/** Keeps a WebSocket to the survey server open; every (re)connect starts with a full snapshot. */
export function connectSurvey(
  url: string,
  onView: (kind: SurveyEventKind, view: SurveyView) => void,
  onStatus: (status: string) => void,
) {
  let delay = 500;
  const open = () => {
    const socket = new WebSocket(url);
    onStatus('接続中…');
    socket.addEventListener('open', () => { delay = 500; onStatus('接続済み'); });
    socket.addEventListener('message', message => {
      let event: ParsedSurveyEvent | null = null;
      try { event = parseSurveyEvent(JSON.parse(String(message.data))); } catch { event = null; }
      if (event) onView(event.kind, event.view); else console.warn('Ignored malformed survey message', message.data);
    });
    socket.addEventListener('close', () => {
      onStatus(`切断 — ${delay / 1000}秒後に再接続`);
      setTimeout(open, delay);
      delay = Math.min(delay * 2, 8000);
    });
  };
  open();
}
