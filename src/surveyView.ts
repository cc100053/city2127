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

export type SurveyView = { version: 1; runId: string; revision: number; scores: Scores; layout: Layout; history: Decision[] };
export type Band = 'low' | 'mixed' | 'high';
export type ExhibitionLayout = {
  version: 2;
  bands: Record<LotSocketId, Band>;
  automatedPorts: number;
  sharedSeats: number;
  treeCount: number;
  plantedFraction: number;
  coolingFins: number;
  functionModules: number;
};
export type ProposalAnswer = { questionId: string; optionId: string; questionText: string; optionLabel: string };
export type ExhibitionCityChange = {
  socketId: LotSocketId;
  label: string;
  before: Record<string, number | string>;
  after: Record<string, number | string>;
};
export type ExhibitionProposal = {
  id: string;
  runId: string;
  guestSessionId: string;
  ordinal: number;
  questionSetVersion: number;
  algorithmVersion: 2;
  answers: ProposalAnswer[];
  votes: Scores;
  revisionBefore: number;
  revisionAfter: number;
  submittedAt: string;
  beforeScores: Scores;
  afterScores: Scores;
  beforeLayout: ExhibitionLayout;
  afterLayout: ExhibitionLayout;
  cityChanges: ExhibitionCityChange[];
};
export type ExhibitionView = {
  version: 2;
  runId: string;
  revision: number;
  guestCount: number;
  algorithmVersion: 2;
  voteSums: Scores;
  recentVotes: Scores;
  scores: Scores;
  layout: ExhibitionLayout;
  recentProposals: ExhibitionProposal[];
  latestProposal?: ExhibitionProposal;
};
export type CityView = SurveyView | ExhibitionView;
export type SurveyEventKind = 'city-state-snapshot' | 'city-state-updated' | 'run-reset';
export type ParsedSurveyEvent = { kind: SurveyEventKind; view: CityView } | { unsupportedVersion: unknown };

const LOT_KINDS = ['empty', 'park', 'plaza'] as const;
const BUILDING_KINDS = ['none', 'small', 'medium', 'tall'] as const;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isOneOf = <T extends readonly string[]>(value: unknown, options: T): value is T[number] =>
  typeof value === 'string' && options.includes(value);
const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const isBoundedText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;
const isSafeCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const isFiniteBetween = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

function isScores(value: unknown, min: number, max: number): value is Scores {
  return isRecord(value) && hasExactKeys(value, AXES) && AXES.every(axis => isFiniteBetween(value[axis], min, max));
}

function isMeterScores(value: unknown): value is Scores {
  return isScores(value, -12, 12);
}

function isIntegerScores(value: unknown, min: number, max: number): value is Scores {
  return isScores(value, min, max) && AXES.every(axis => Number.isInteger(value[axis]));
}

function isExhibitionLayout(value: unknown): value is ExhibitionLayout {
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'bands', 'automatedPorts', 'sharedSeats', 'treeCount', 'plantedFraction', 'coolingFins', 'functionModules'])
    || value.version !== 2 || !isRecord(value.bands) || !hasExactKeys(value.bands, LOT_SOCKET_IDS)) return false;
  const bands = value.bands;
  return LOT_SOCKET_IDS.every(id => isOneOf(bands[id], ['low', 'mixed', 'high']))
    && Number.isInteger(value.automatedPorts) && isFiniteBetween(value.automatedPorts, 0, 6)
    && Number.isInteger(value.sharedSeats) && isFiniteBetween(value.sharedSeats, 0, 8)
    && Number.isInteger(value.treeCount) && isFiniteBetween(value.treeCount, 3, 12)
    && isFiniteBetween(value.plantedFraction, .2, .8)
    && Number.isInteger(value.coolingFins) && isFiniteBetween(value.coolingFins, 0, 6)
    && Number.isInteger(value.functionModules) && isFiniteBetween(value.functionModules, 2, 6);
}

const EXHIBITION_SITE_FIELDS: Record<LotSocketId, readonly (keyof ExhibitionLayout)[]> = {
  nw: ['automatedPorts'], ne: ['treeCount', 'plantedFraction', 'coolingFins'],
  sw: ['sharedSeats'], se: ['functionModules'],
};
const exhibitionSiteChanged = (before: ExhibitionLayout, after: ExhibitionLayout, id: LotSocketId) =>
  before.bands[id] !== after.bands[id] || EXHIBITION_SITE_FIELDS[id].some(key => before[key] !== after[key]);

function isProposalAnswer(value: unknown): value is ProposalAnswer {
  return isRecord(value) && hasExactKeys(value, ['questionId', 'optionId', 'questionText', 'optionLabel'])
    && isBoundedText(value.questionId, 128) && isBoundedText(value.optionId, 128)
    && isBoundedText(value.questionText, 512) && isBoundedText(value.optionLabel, 512);
}

function isVotes(value: unknown): value is Scores {
  return isRecord(value) && hasExactKeys(value, AXES) && AXES.every(axis => value[axis] === -1 || value[axis] === 0 || value[axis] === 1);
}

function isChangeValues(value: unknown, layout: ExhibitionLayout, socketId: LotSocketId): value is Record<string, number | string> {
  if (!isRecord(value) || !isOneOf(value.band, ['low', 'mixed', 'high']) || value.band !== layout.bands[socketId]) return false;
  return hasExactKeys(value, ['band', ...EXHIBITION_SITE_FIELDS[socketId]])
    && EXHIBITION_SITE_FIELDS[socketId].every(key => value[key] === layout[key]);
}

function isExhibitionCityChange(value: unknown, before: ExhibitionLayout, after: ExhibitionLayout): value is ExhibitionCityChange {
  if (!isRecord(value) || !hasExactKeys(value, ['socketId', 'label', 'before', 'after']) || !LOT_SOCKET_IDS.includes(value.socketId as LotSocketId)
    || !isBoundedText(value.label, 256)
    || !isChangeValues(value.before, before, value.socketId as LotSocketId)
    || !isChangeValues(value.after, after, value.socketId as LotSocketId)) return false;
  const beforeValues = value.before as Record<string, number | string>;
  const afterValues = value.after as Record<string, number | string>;
  return Object.keys(beforeValues).some(key => beforeValues[key] !== afterValues[key]);
}

function isExhibitionProposal(value: unknown, runId: string, revision: number): value is ExhibitionProposal {
  if (!isRecord(value) || !hasExactKeys(value, ['id', 'runId', 'guestSessionId', 'ordinal', 'questionSetVersion', 'algorithmVersion', 'answers', 'votes', 'revisionBefore', 'revisionAfter', 'submittedAt', 'beforeScores', 'afterScores', 'beforeLayout', 'afterLayout', 'cityChanges'])
    || !isBoundedText(value.id, 128) || value.runId !== runId
    || !isBoundedText(value.guestSessionId, 128) || !isSafeCount(value.ordinal) || value.ordinal < 1
    || !isSafeCount(value.questionSetVersion) || value.questionSetVersion < 1 || value.algorithmVersion !== 2
    || !Array.isArray(value.answers) || value.answers.length !== 4 || !value.answers.every(isProposalAnswer)
    || !isVotes(value.votes) || !isSafeCount(value.revisionBefore) || !isSafeCount(value.revisionAfter)
    || value.revisionBefore !== value.ordinal - 1 || value.revisionAfter !== value.ordinal || value.revisionAfter > revision
    || !isBoundedText(value.submittedAt, 80) || !isMeterScores(value.beforeScores) || !isMeterScores(value.afterScores)
    || !isExhibitionLayout(value.beforeLayout) || !isExhibitionLayout(value.afterLayout)
    || !Array.isArray(value.cityChanges) || value.cityChanges.length > LOT_SOCKET_IDS.length
    || !value.cityChanges.every(change => isExhibitionCityChange(change, value.beforeLayout as ExhibitionLayout, value.afterLayout as ExhibitionLayout))) return false;
  const answers = value.answers as ProposalAnswer[];
  const changedSites = new Set(value.cityChanges.map(change => (change as ExhibitionCityChange).socketId));
  const expectedChanges = LOT_SOCKET_IDS.filter(id => exhibitionSiteChanged(value.beforeLayout as ExhibitionLayout, value.afterLayout as ExhibitionLayout, id));
  return new Set(answers.map(answer => answer.questionId)).size === answers.length
    && answers.some(answer => answer.questionId === 'cooling-2127')
    && changedSites.size === value.cityChanges.length
    && expectedChanges.length === changedSites.size
    && expectedChanges.every(id => changedSites.has(id));
}

function parseExhibitionView(value: unknown): ExhibitionView | null {
  if (!isRecord(value) || !hasExactKeys(value, ['version', 'runId', 'revision', 'guestCount', 'algorithmVersion', 'voteSums', 'recentVotes', 'scores', 'layout', 'recentProposals', ...(Object.hasOwn(value, 'latestProposal') ? ['latestProposal'] : [])])
    || value.version !== 2 || !isBoundedText(value.runId, 128)
    || !isSafeCount(value.revision) || !isSafeCount(value.guestCount) || value.revision !== value.guestCount
    || value.algorithmVersion !== 2 || !isIntegerScores(value.voteSums, -value.guestCount, value.guestCount)
    || !isScores(value.recentVotes, -1, 1) || !isMeterScores(value.scores) || !isExhibitionLayout(value.layout)
    || !Array.isArray(value.recentProposals) || value.recentProposals.length > 64
    || !value.recentProposals.every(proposal => isExhibitionProposal(proposal, value.runId as string, value.revision as number))) return null;
  const recent = value.recentProposals as ExhibitionProposal[];
  if (recent.some((proposal, i) => i > 0 && proposal.ordinal <= recent[i - 1].ordinal)) return null;
  const latest = value.latestProposal;
  if (value.guestCount === 0) return recent.length === 0 && latest === undefined && !Object.hasOwn(value, 'latestProposal') ? value as ExhibitionView : null;
  const tail = recent.at(-1);
  if (!isExhibitionProposal(latest, value.runId, value.revision) || latest.ordinal !== value.guestCount
    || !tail || tail.id !== latest.id || tail.revisionAfter !== latest.revisionAfter
    || !sameScores(latest.afterScores, tail.afterScores) || !sameLayout(latest.afterLayout, tail.afterLayout)
    || !sameScores(tail.afterScores, value.scores as Scores) || !sameLayout(tail.afterLayout, value.layout as ExhibitionLayout)) return null;
  return { ...value as ExhibitionView, latestProposal: tail };
}

function sameScores(a: Scores, b: Scores): boolean {
  return AXES.every(axis => a[axis] === b[axis]);
}

function sameLayout(a: ExhibitionLayout, b: ExhibitionLayout): boolean {
  return a.version === b.version && LOT_SOCKET_IDS.every(id => a.bands[id] === b.bands[id])
    && ['automatedPorts', 'sharedSeats', 'treeCount', 'plantedFraction', 'coolingFins', 'functionModules']
      .every(key => a[key as keyof ExhibitionLayout] === b[key as keyof ExhibitionLayout]);
}

export const isExhibitionView = (view: CityView): view is ExhibitionView => 'version' in view && view.version === 2;

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
  if (Object.hasOwn(data.view, 'version') && data.view.version !== 1 && data.view.version !== 2) return { unsupportedVersion: data.view.version };
  if (data.view.version === 2) {
    const view = parseExhibitionView(data.view);
    return view ? { kind: data.type, view } : null;
  }
  const { runId, revision, scores, history, layout } = data.view;
  if (typeof runId !== 'string' || typeof revision !== 'number' || !isRecord(scores) || !Array.isArray(history)) return null;
  if (!AXES.every(axis => typeof scores[axis] === 'number') || !history.every(isDecision)) return null;
  const lots = isRecord(layout) && isRecord(layout.lots) ? layout.lots : null;
  if (!lots || !LOT_SOCKET_IDS.every(id => isRecord(lots[id])
    && isOneOf(lots[id].lot, LOT_KINDS)
    && isOneOf(lots[id].building, BUILDING_KINDS))) return null;
  return {
    kind: data.type,
    view: { version: 1, runId, revision, scores: scores as Scores, layout: lots as Layout, history: history as Decision[] },
  };
}

/** A view replaces the current one unless it is an older or repeated revision of the same run. */
export const supersedes = (current: CityView | undefined, next: CityView) =>
  !current || next.runId !== current.runId || next.revision > current.revision;

/** Keeps a WebSocket to the survey server open; every (re)connect starts with a full snapshot. */
export function connectSurvey(
  url: string,
  onView: (kind: SurveyEventKind, view: CityView) => void,
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
      if (event && 'unsupportedVersion' in event) onStatus('Unsupported exhibition view version');
      else if (event) onView(event.kind, event.view);
      else console.warn('Ignored malformed survey message', message.data);
    });
    socket.addEventListener('close', () => {
      onStatus(`切断 — ${delay / 1000}秒後に再接続`);
      setTimeout(open, delay);
      delay = Math.min(delay * 2, 8000);
    });
  };
  open();
}
