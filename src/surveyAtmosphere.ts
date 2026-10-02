import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';
import type { CarrierChange } from './cityChangeManager.ts';
import type { DisplayMode } from './dayCycle.ts';
import { presets, type WorldState } from './presets.ts';
import { changeSites } from './layout.ts';
import { AXES, connectSurvey, isExhibitionView, supersedes, type CityView, type Decision, type ExhibitionProposal, type ExhibitionView, type SurveyEventKind, type SurveyView } from './surveyView.ts';

// Root-scene side of the survey server's CityView contract (survey/src/shared/cityView.ts).
// Scores drive the atmosphere; the CityChangeManager renders the server-derived layout.

/** One answer is +2 on an axis; two answers on the same axis reach the full effect. */
const FULL = 4;
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** Policy scores → atmosphere, as offsets from the neutral preset. Negative scores push the other way. */
export function scoresToWorldState(s: SurveyView['scores']): WorldState {
  const [a, p, e, c] = AXES.map(axis => Math.max(-1, Math.min(1, s[axis] / FULL)));
  const n = presets.neutral;
  return {
    timeOfDay: n.timeOfDay,
    neon: clamp(n.neon + .3 * a + .35 * c),
    traffic: clamp(n.traffic + .5 * a + .15 * c),
    crowd: clamp(n.crowd + .6 * p),
    signage: clamp(n.signage + .4 * p + .2 * c),
    greenery: clamp(n.greenery + .6 * e),
    haze: clamp(n.haze - .15 * e + .1 * c),
    windowLife: clamp(n.windowLife + .5 * c + .1 * a),
    glyph: clamp(n.glyph + .6 * a + .4 * e),
    warmth: clamp(n.warmth + .3 * e - .2 * a),
  };
}

const LABELS: Record<string, string> = { automation: '自動化', publicSharing: '公共共有', environmentalPriority: '環境優先', urbanConcentration: '都市集約' };
const EXHIBITION_LABELS: Record<string, string> = {
  automation: 'サービスの担い手', publicSharing: '空間の使い方',
  environmentalPriority: '暑さへの備え', urbanConcentration: '機能の配置',
};
const EXHIBITION_FIELD_LABELS: Record<string, string> = {
  band: 'Meter帯', automatedPorts: '自律サービス端口', sharedSeats: '共有席',
  treeCount: '樹冠', plantedFraction: '植栽面', coolingFins: '冷却設備', functionModules: '機能モジュール',
};
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const signedMeter = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;

function exhibitionValue(key: string, value: number | string) {
  return key === 'plantedFraction' ? `${(Number(value) * 100).toFixed(1)}%` : String(value);
}
export const voteSymbol = (vote: number) => vote > 0 ? '＋' : vote < 0 ? '−' : '·';
export const exhibitionVoteMarks = (votes: ExhibitionProposal['votes']) => AXES.map(axis => ({
  label: EXHIBITION_LABELS[axis], vote: votes[axis], symbol: voteSymbol(votes[axis]),
}));

/** Causal panel text: policy deltas, and city changes named by the Odaiba place where they appear. */
export const policyText = (d: Decision) =>
  Object.entries(d.policyChange).map(([axis, n]) => `${LABELS[axis] ?? axis} ${n > 0 ? '↑' : '↓'} ${signed(n)}`).join('　') || '変化なし';
export const cityText = (d: Decision) =>
  d.cityChanges.map(c => `${changeSites[c.socketId as keyof typeof changeSites]?.place ?? c.socketId.toUpperCase()} ${c.label}`).join('　') || '見た目の変化なし';

export function exhibitionFeedback(proposal?: ExhibitionProposal) {
  if (!proposal) return null;
  const scores = AXES.map(axis => ({
    label: EXHIBITION_LABELS[axis],
    before: signedMeter(proposal.beforeScores[axis]),
    after: signedMeter(proposal.afterScores[axis]),
  }));
  const cityChanges = proposal.cityChanges.flatMap(change => {
    const numericKeys = Object.keys(change.before)
      .filter(key => typeof change.before[key] === 'number' && typeof change.after[key] === 'number' && change.before[key] !== change.after[key])
    const changedKeys = numericKeys.length ? numericKeys : change.before.band !== change.after.band ? ['band'] : [];
    const effect = changedKeys
      .map(key => `${EXHIBITION_FIELD_LABELS[key] ?? key} ${exhibitionValue(key, change.before[key])} → ${exhibitionValue(key, change.after[key])}`)
      .join(' · ');
    return effect ? [{ place: changeSites[change.socketId].place, label: change.label, effect }] : [];
  }).slice(0, 2);
  const scoresChanged = AXES.some(axis => proposal.beforeScores[axis] !== proposal.afterScores[axis]);
  const cityChanged = proposal.cityChanges.length > 0;
  return {
    ordinal: proposal.ordinal,
    answers: proposal.answers.map(({ questionText, optionLabel }) => ({ questionText, optionLabel })),
    scores,
    cityChanges,
    cityChanged,
    changed: scoresChanged || cityChanged,
    note: cityChanged
      ? `提案 #${proposal.ordinal} の街区構成変更を記録しました。`
      : scoresChanged
        ? `Meter値を更新しました。街区構成は維持されました。提案 #${proposal.ordinal} を記録しました。`
        : `Meter値と街区構成は維持されました。提案 #${proposal.ordinal} を記録しました。`,
  };
}

export const exhibitionScoresText = (scores: ExhibitionView['scores']) =>
  AXES.map(axis => `${EXHIBITION_LABELS[axis]} ${scores[axis] > 0 ? '+' : ''}${scores[axis].toFixed(1)}`).join(' · ');

type ResidentCard = { id: string; title: string; text: string; place: string };
// P1 copy; facility selection follows rendered focal quantities, not the resident's vote.
const RESIDENT_CARDS: Record<string, readonly [string, string]> = {
  "intro.identity": ["あなたも、この街の住民です。", "ここは2127年のお台場。あなたは、この街で暮らす一人です。"],
  "intro.inherited": ["街には、これまでの思いが重なっています。", "あなたの前にも、住民たちが暮らしへの思いを残しました。目の前の街は、その積み重ねを受け継いでいます。"],
  "intro.lineage": ["台場の記憶が、街の骨組みに。", "骨組み、球体、大きな空洞。かつてのフジテレビの形は、2127年の街をつなぐ構造へと受け継がれています。"],
  "intro.participation": ["あなたは、どんな毎日を過ごしたい？", "手元の画面で、四つの問いに答えてください。あなたの思いも、ほかの住民の声と重なって街に反映されます。"],
  "service.human": ["人に相談できる街", "人と話しながら用事を済ませたい。その思いに応えるため、街には対面のサービスを支える場所があります。"],
  "service.hybrid": ["普段は自動、困ったら人へ", "日常の便利さと、人に相談できる安心を組み合わせる。サービス拠点には、人と自動設備が役割を分け合う場所があります。"],
  "service.autonomous": ["時間に縛られないサービス", "自分の都合でサービスを使いたい。街には、自律サービスの端口や、配送を支える発着の場所があります。"],
  "commons.private": ["海辺に、自分の時間を", "一人や親しい人と静かに過ごしたい。庭や囲われた小さな空間が、海辺に落ち着ける居場所をつくっています。"],
  "commons.hybrid": ["静けさと出会いのあいだ", "静かに休む日も、人と集まる日もある。庭と座席を組み合わせた場所が、二つの過ごし方をつないでいます。"],
  "commons.open": ["予約せずに、海辺へ", "思い立ったときに、誰でも海辺で過ごしたい。開かれた座席や広場が、集まれる場所を支えています。"],
  "climate.equipment": ["設備がつくる夏の居場所", "暑い日も、海辺を歩いて過ごしたい。日差しを調整する屋根や冷却設備が、歩く道と休む場所を支えています。"],
  "climate.hybrid": ["設備と木陰が支え合う道", "涼しさを、一つの方法だけに任せない。屋根や冷却設備と植栽を組み合わせて、夏の居場所をつくっています。"],
  "climate.canopy": ["木陰をつないで、海辺を歩く", "木陰や緑のそばで、夏を過ごしたい。歩道、屋根、建物の植栽が、緑のある居場所を街に広げています。"],
  "functions.distributed": ["用事のあいだに、海辺を歩く", "暮らしの用事を、街を歩きながら済ませたい。低い機能ポッドが点在し、いくつかの場所をめぐる日常を支えています。"],
  "functions.hybrid": ["歩く日も、上へ向かう日も", "用事や気分に合わせて、街をめぐりたい。高さの違う建物が、歩いて向かう場所と、上へ向かう場所を組み合わせています。"],
  "functions.vertical": ["暮らしを、縦につなぐ", "一つの場所で、いくつもの用事を済ませたい。タワーや空中のつながりが、上下に広がる日常を支えています。"],
};

export function residentCards(view: ExhibitionView): ResidentCard[] {
  const l = view.layout;
  const ids = ['intro.identity', 'intro.lineage', 'intro.participation'];
  if (view.recentProposals.length) ids.splice(1, 0, 'intro.inherited');
  const facilityIds = [
    l.automatedPorts === 0 ? 'service.human' : l.automatedPorts === 6 ? 'service.autonomous' : 'service.hybrid',
    l.sharedSeats === 0 ? 'commons.private' : l.sharedSeats === 8 ? 'commons.open' : 'commons.hybrid',
    l.coolingFins === 0 ? 'climate.canopy' : l.treeCount === 0 ? 'climate.equipment' : 'climate.hybrid',
    l.bands.se === 'low' ? 'functions.distributed' : l.bands.se === 'high' ? 'functions.vertical' : 'functions.hybrid',
  ];
  const places = ['nw', 'sw', 'ne', 'se'] as const;
  return [...ids, ...facilityIds].map((id, index) => ({
    id, title: RESIDENT_CARDS[id][0], text: RESIDENT_CARDS[id][1],
    place: index < ids.length ? 'お台場全景' : changeSites[places[index - ids.length]].place,
  }));
}

export const residentIdentity = (proposal: ExhibitionProposal) =>
  `${proposal.stationId ? `ステーション ${proposal.stationId} · ` : ''}暮らしの声 #${proposal.ordinal}`;

const RESIDENT_PREFERENCES: Record<string, string> = {
  'human-led': 'あなたは、人に相談できる日常を大切にしました。',
  'human-machine': 'あなたは、自動の便利さと、人に相談できる安心を選びました。',
  autonomous: 'あなたは、自分の都合でいつでも使えるサービスを大切にしました。',
  'private-pods': 'あなたは、一人や親しい人と静かに過ごす時間を大切にしました。',
  'mixed-seating': 'あなたは、静かな時間と、人が集まれる場所の両方を選びました。',
  'open-commons': 'あなたは、予約せずに誰でも使える海辺を大切にしました。',
  'active-cooling': 'あなたは、屋根と冷却設備に支えられた夏の道を選びました。',
  'hybrid-cooling': 'あなたは、設備と木陰を組み合わせた夏の道を選びました。',
  'canopy-cooling': 'あなたは、海風が通る木陰と緑のある道を選びました。',
  'distributed-pavilions': 'あなたは、水辺を歩いて用事を済ませる日常を選びました。',
  'mixed-functions': 'あなたは、高さの違う建物をめぐる日常を選びました。',
  'vertical-functions': 'あなたは、一つのタワーで用事を済ませる日常を選びました。',
};
const RESULT_AXES = { nw: 'service-2127', sw: 'commons-2127', ne: 'cooling-2127', se: 'functions-2127' } as const;
const DISTRICT_RESULTS = {
  nw: ['水辺のサービス拠点・移動ルート', 'サービス拠点と移動の構成が変わり、日々の用事を支える配置が調整されました。'],
  sw: ['水辺の居場所・庭の広場', '水辺や庭の構成が変わり、静かに休む場所と集まれる場所の配置が調整されました。'],
  ne: ['海辺の歩道・屋根・建物の外壁', '海辺の暑さへの備えが変わり、設備や植栽が支える居場所の配置が調整されました。'],
  se: ['街に点在する建物', '建物の構成が変わり、暮らしの用事を分け合う場所の配置が調整されました。'],
} as const;

/** Evidence is the renderer's before/after targets, including visible pairings and shuffled slots. */
export function residentResult(proposal: ExhibitionProposal, changes?: readonly CarrierChange[]) {
  const change = changes?.[0];
  const questionId = change ? RESULT_AXES[change.socketId]
    : Object.values(RESULT_AXES)[AXES.findIndex(axis => proposal.votes[axis] !== 0)];
  const answer = proposal.answers.find(answer => answer.questionId === questionId) ?? proposal.answers[0];
  const preference = RESIDENT_PREFERENCES[answer?.optionId] ?? 'あなたの思いが、住民の声に加わりました。';
  let effect = '回答を記録しました。', place = 'お台場全景', kind = 'recorded';
  if (change) {
    kind = 'configuration';
    place = change.focal ? changeSites[change.socketId].place : DISTRICT_RESULTS[change.socketId][0];
    effect = DISTRICT_RESULTS[change.socketId][1];
    if (change.focal) {
      const before = proposal.beforeLayout, after = proposal.afterLayout;
      if (change.socketId === 'nw') effect = after.automatedPorts > before.automatedPorts
        ? 'この拠点では、自分の都合で使える自律サービスの端口が増えました。'
        : after.automatedPorts < before.automatedPorts ? 'この拠点では、人に相談できる窓口が増えました。' : 'この拠点のサービスの構成が変わりました。';
      if (change.socketId === 'sw') effect = after.sharedSeats > before.sharedSeats
        ? 'この水辺では、予約せずに使える共有席が増えました。'
        : after.sharedSeats < before.sharedSeats ? 'この水辺では、静かに過ごすための囲われた席が増えました。' : 'この水辺の居場所の構成が変わりました。';
      if (change.socketId === 'ne') effect = after.treeCount > before.treeCount
        ? 'この公園では、木陰を支える樹冠が増えました。'
        : after.coolingFins > before.coolingFins ? 'この公園では、夏の居場所を支える冷却設備が増えました。' : 'この公園では、設備と植栽が支える夏の居場所の構成が変わりました。';
      if (change.socketId === 'se') effect = after.bands.se === 'low'
        ? 'この拠点では、歩いて用事を済ませる低い建物が暮らしを支える構成になりました。'
        : after.bands.se === 'high' ? 'この拠点では、上下に用事をつなぐタワーが暮らしを支える構成になりました。' : 'この拠点では、高さの違う建物が用事を分け合う構成になりました。';
    }
    effect = `ほかの住民の声と重なり、${effect}`;
  } else if (changes) {
    const direction = AXES.some(axis => proposal.beforeScores[axis] !== proposal.afterScores[axis]);
    kind = direction ? 'direction' : 'maintained';
    effect = direction ? '街の方向は少し動きましたが、見えている施設の構成は維持されました。' : '思いは記録され、見えている施設の構成は維持されました。';
  }
  return { preference, effect, place, kind };
}

const LEGACY_HISTORY_SHOWN = 3;
const el = (tag: string, className: string, text = '') => { const e = document.createElement(tag); e.className = className; e.textContent = text; return e; };
const row = (term: string, value: string) => { const r = el('div', 'causal-row'); r.append(el('span', 'causal-term', term), el('span', '', value)); return r; };

/** `?survey` mode: the survey server is the only source of the atmosphere, the change sites and the causal panel. */
export function startSurveyAtmosphere(
  url: string,
  apply: (kind: SurveyEventKind, view: CityView) => CarrierChange[] | void,
  onDisplayMode?: (mode: DisplayMode) => void,
) {
  document.body.dataset.mode = 'survey';
  // Latest choice → policy change → city effect, then the run's history (ported from module-swap's CausalPanel).
  const panel = el('aside', 'causal-panel');
  panel.setAttribute('aria-live', 'polite');
  const pending = el('p', 'causal-context'), latest = el('section', ''), history = el('ol', ''), scores = el('p', 'causal-scores'), status = el('p', 'causal-status');
  const historyTitle = el('h3', 'causal-subtitle', 'これまでの決定'), historyCount = el('p', 'causal-history-total');
  const historyLegend = el('p', 'causal-vote-legend', '各格子左上から：担い手／共有／暑さ／機能');
  pending.hidden = true;
  historyCount.hidden = true;
  historyLegend.hidden = true;
  const title = el('h2', 'causal-title', '2127 — 選択が都市を変える');
  panel.append(title, pending, latest, historyTitle, historyCount, historyLegend, history, scores, status);
  document.body.appendChild(panel);
  let current: CityView | undefined;
  let cardIndex = 0;
  let storyTimer = 0;
  let reasonTimer = 0;
  const showAmbient = () => {
    if (!current || !isExhibitionView(current)) return;
    const cards = residentCards(current), card = cards[cardIndex++ % cards.length];
    panel.dataset.presentation = 'ambient';
    delete panel.dataset.resultKind;
    latest.replaceChildren(el('p', 'causal-context', 'この街の暮らし'),
      el('h3', 'resident-card-title', card.title), el('p', 'resident-card-copy', card.text),
      el('p', 'resident-place', `街の画面：${card.place}`));
    storyTimer = window.setTimeout(showAmbient, 12_000);
  };
  connectSurvey(url, (kind, view, displayMs = DISPLAY_MS) => {
    if (kind !== 'city-state-snapshot' && !supersedes(current, view, kind)) return;
    const previous = current;
    current = view;
    const changes = apply(kind, view);
    clearTimeout(reasonTimer);
    if (isExhibitionView(view)) {
      panel.classList.add('resident-panel');
      panel.dataset.guestCount = String(view.guestCount);
      title.textContent = '2127 · お台場の暮らし';
      for (const node of [pending, historyTitle, historyCount, historyLegend, history, scores]) node.hidden = true;
      clearTimeout(storyTimer);
      if (kind === 'city-state-updated' && view.latestProposal) {
        panel.dataset.presentation = 'result';
        const proposal = view.latestProposal;
        const evidence = previous && isExhibitionView(previous) && previous.runId === proposal.runId
          && previous.revision === proposal.revisionBefore && JSON.stringify(previous.layout) === JSON.stringify(proposal.beforeLayout)
          ? changes || undefined : undefined;
        const result = residentResult(proposal, evidence);
        panel.dataset.resultKind = result.kind;
        latest.replaceChildren(el('p', 'causal-context', residentIdentity(proposal)),
          el('h3', 'resident-card-title', '思いが重なり、街が応える。'),
          el('p', 'resident-card-copy', '街の画面をご覧ください。'),
          el('p', 'resident-place', `街の画面：${result.place}`));
        const showReason = () => {
          latest.querySelector('.resident-card-copy')!.textContent = `${result.preference}${result.effect}`;
        };
        const transitionMs = SITE_TRANSITION_SECONDS * 1000;
        if (displayMs < DISPLAY_MS - 100) showReason();
        else reasonTimer = window.setTimeout(showReason, transitionMs);
        storyTimer = window.setTimeout(showAmbient, displayMs);
      } else {
        cardIndex = 0;
        showAmbient();
      }
    } else {
      clearTimeout(storyTimer);
      panel.classList.remove('resident-panel');
      delete panel.dataset.presentation;
      delete panel.dataset.guestCount;
      title.textContent = '2127 — 選択が都市を変える';
      for (const node of [historyTitle, history, scores]) node.hidden = false;
      historyTitle.textContent = 'これまでの決定';
      historyCount.hidden = true;
      historyCount.textContent = '';
      historyLegend.hidden = true;
      history.className = '';
      history.removeAttribute('aria-label');
      pending.hidden = true;
      pending.textContent = '';
      panel.insertBefore(latest, historyTitle);
      renderLegacyFeedback(view, latest, history, scores);
    }
  }, text => { status.textContent = `サーバー: ${text}`; }, onDisplayMode);
}

function renderLegacyFeedback(view: SurveyView, latest: HTMLElement, history: HTMLElement, scores: HTMLElement) {
  const last = view.history.at(-1);
  latest.replaceChildren(...(last
    ? [el('p', 'causal-context', `${last.year ?? ''} ${last.pressure ?? ''} — ${last.questionText}`), row('CHOICE', last.optionLabel), row('POLICY', policyText(last)), row('CITY EFFECT', cityText(last))]
    : [el('p', 'causal-context', 'まだ決定はありません。最初のゲストの選択を待っています。')]));
  const shown = view.history.slice(-LEGACY_HISTORY_SHOWN);
  history.setAttribute('start', String(view.history.length - shown.length + 1));
  history.replaceChildren(...shown.map(d => el('li', '', `${d.pressure ?? d.questionText} → ${d.optionLabel} → ${cityText(d)}`)));
  scores.textContent = AXES.map(axis => `${LABELS[axis]} ${signed(view.scores[axis])}`).join(' · ');
}
