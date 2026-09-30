import './debug.css';
import type { ProposalRecord } from '../shared/cityView.ts';
import type { ExhibitionState } from '../shared/citySurveyState.ts';
import type { ProposalData, ProposalRequest, ProposalSessionData } from '../shared/protocol.ts';
import { api, el, newAnswerId } from './debugApi.ts';
import { buildProposalRequest } from './guestFlow.ts';

const app = document.querySelector<HTMLElement>('#app')!;
app.classList.add('guest');
document.body.classList.add('guest-page');

type Screen = 'welcome' | 'starting' | 'question' | 'review' | 'submitting' | 'result' | 'handoff' | 'abandoned';
type GuestRecovery = {
  session: ProposalSessionData;
  choices: [string, string][];
  questionIndex: number;
  screen: 'question' | 'review' | 'result';
  pendingRequest?: ProposalRequest;
};
const recoveryKey = 'city2127.guest-draft.v2';
let screen: Screen = 'welcome';
let session: ProposalSessionData | undefined;
let draft = new Map<string, string>();
let questionIndex = 0;
let pendingRequest: ProposalRequest | undefined;
let saved: ProposalData | undefined;
let conflictState: ExhibitionState | undefined;
let notice: { text: string; role: 'status' | 'alert' } | undefined;
let idleTimer = 0;
let abandonTimer = 0;
/** Result (~10 s) → handoff (~5 s) → welcome, per the exhibition flow; buttons skip ahead. */
let flowTimer = 0;
const RESULT_MS = 10_000;
const HANDOFF_MS = 5_000;
let idleWarning = false;
let busy = false;
/** Set by a review-screen 変更: submitting that question returns to review. */
let editingFromReview = false;
let recoveryUnavailable = false;

const axisNames: Record<keyof ExhibitionState['scores'], string> = {
  automation: '自動化', publicSharing: '公共共有',
  environmentalPriority: '環境優先', urbanConcentration: '都市集約',
};

function clearIdleTimers() {
  clearTimeout(idleTimer);
  clearTimeout(abandonTimer);
  idleWarning = false;
}

function clearRecovery() {
  try { localStorage.removeItem(recoveryKey); } catch { /* Storage may be disabled. */ }
}

function persistRecovery() {
  if (!session || !['question', 'review', 'submitting', 'result'].includes(screen)) return;
  const progressScreen = screen === 'result' ? 'result' : screen === 'question' ? 'question' : 'review';
  const recovery: GuestRecovery = {
    session, choices: [...draft], questionIndex, screen: progressScreen, pendingRequest,
  };
  try { localStorage.setItem(recoveryKey, JSON.stringify(recovery)); }
  catch { recoveryUnavailable = true; }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecovery(): GuestRecovery | undefined {
  try {
    const raw = localStorage.getItem(recoveryKey);
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    if (!isObject(value) || !isObject(value.session) || !isObject(value.session.session)
        || typeof value.session.session.id !== 'string' || !Array.isArray(value.session.questions)
        || value.session.questions.length !== 4 || !isObject(value.session.state)
        || !isObject(value.session.state.scores) || !Array.isArray(value.choices)
        || !value.choices.every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(item => typeof item === 'string'))
        || !Number.isSafeInteger(value.questionIndex) || (value.questionIndex as number) < 0
        || !['question', 'review', 'result'].includes(String(value.screen))) {
      clearRecovery();
      return undefined;
    }
    const scores = value.session.state.scores;
    if (!['automation', 'publicSharing', 'environmentalPriority', 'urbanConcentration']
      .every(axis => typeof scores[axis] === 'number' && Number.isFinite(scores[axis]))
        || !value.session.questions.every(question => isObject(question) && typeof question.id === 'string'
          && typeof question.text === 'string' && Array.isArray(question.options)
          && question.options.every(option => isObject(option) && typeof option.id === 'string' && typeof option.label === 'string'))) {
      clearRecovery();
      return undefined;
    }
    if (value.pendingRequest !== undefined && (!isObject(value.pendingRequest)
        || typeof value.pendingRequest.submissionId !== 'string'
        || typeof value.pendingRequest.guestSessionId !== 'string'
        || !Number.isSafeInteger(value.pendingRequest.expectedRevision)
        || !Array.isArray(value.pendingRequest.answers) || value.pendingRequest.answers.length !== 4
        || !value.pendingRequest.answers.every(answer => isObject(answer)
          && typeof answer.questionId === 'string' && typeof answer.optionId === 'string'))) {
      clearRecovery();
      return undefined;
    }
    return value as unknown as GuestRecovery;
  } catch {
    clearRecovery();
    return undefined;
  }
}

function idleIsActive() {
  return session !== undefined && (screen === 'question' || screen === 'review') && !busy && !pendingRequest;
}

function resetIdleTimer() {
  clearIdleTimers();
  if (!idleIsActive()) return;
  idleTimer = window.setTimeout(() => {
    idleWarning = true;
    renderCurrent(false);
    app.querySelector<HTMLElement>('.guest-notice--warn button')?.focus();
    abandonTimer = window.setTimeout(abandonDraft, 15_000);
  }, 60_000);
}

app.addEventListener('pointerdown', resetIdleTimer);
app.addEventListener('keydown', resetIdleTimer);
app.addEventListener('change', resetIdleTimer);

function action(label: string, run: () => void, primary = false, disabled = false) {
  const button = el('button', {
    type: 'button',
    class: primary ? 'primary' : 'secondary',
    ...(disabled ? { disabled: '' } : {}),
  }, label);
  button.addEventListener('click', run);
  return button;
}

function page(title: string, eyebrow: string, ...content: (HTMLElement | string)[]) {
  persistRecovery();
  app.dataset.screen = screen;
  app.replaceChildren(
    el('div', { class: 'guest-frame' },
      el('header', { class: 'guest-masthead' }, el('span', {}, '2127 · ODAIBA'), el('span', {}, '共同のまちづくり')),
      el('section', { class: 'guest-screen' },
        el('p', { class: 'guest-eyebrow' }, eyebrow),
        el('h1', { tabindex: '-1' }, title),
        ...content)),
  );
}

function focusTitle() {
  app.querySelector<HTMLElement>('h1')?.focus();
}

function renderNotice() {
  return notice ? el('p', {
    class: 'guest-notice', role: notice.role, 'aria-live': notice.role === 'alert' ? 'assertive' : 'polite',
  }, notice.text) : undefined;
}

function noticeNodes() {
  const node = renderNotice();
  return node ? [node] : [];
}

function recoveryNodes() {
  return recoveryUnavailable
    ? [el('p', { class: 'guest-notice guest-notice--warn', role: 'status' }, 'このブラウザーでは草稿を保存できません。再読み込みすると回答が失われる場合があります。')]
    : [];
}

function renderIdleWarning() {
  if (!idleWarning) return undefined;
  const keep = action('続ける', () => { resetIdleTimer(); renderCurrent(); }, true);
  return el('div', { class: 'guest-notice guest-notice--warn', role: 'alert', 'aria-live': 'assertive' },
    el('p', {}, '操作がないため、15秒後にこの草稿を終了します。提案はまだ記録されていません。'), keep);
}

function idleWarningNodes() {
  const node = renderIdleWarning();
  return node ? [node] : [];
}

function renderWelcome(focus = false) {
  const button = action(screen === 'starting' ? '準備中…' : 'はじめる', () => startSession(session !== undefined && draft.size > 0), true, busy);
  button.dataset.autoAction = 'start';
  const status = screen === 'starting' ? el('p', { class: 'guest-status', role: 'status', 'aria-live': 'polite' }, '四つの質問を準備しています。') : undefined;
  page('次のお台場を一緒に選ぶ', '共同提案',
    el('p', { class: 'guest-lead' }, 'ここは2127年のお台場。四つの質問に答えて、これからの街のあり方を一緒に選びます。'),
    el('p', { class: 'guest-copy' }, '回答は最後にまとめて確認してから記録します。選んでいる間、街の集計は変わりません。'),
    ...noticeNodes(),
    ...(status ? [status] : []),
    el('div', { class: 'guest-actions' }, button));
  if (focus) focusTitle();
}

async function startSession(keepDraft = false) {
  if (busy) return;
  const previous = keepDraft ? draft : new Map<string, string>();
  clearIdleTimers();
  screen = 'starting';
  busy = true;
  notice = undefined;
  renderWelcome();
  const result = await api<ProposalSessionData>('/api/proposal-sessions', {});
  busy = false;
  if (!result.ok) {
    screen = 'welcome';
    notice = { role: 'alert', text: errorText(result.error.code, result.error.message) };
    renderWelcome(true);
    return;
  }
  session = result.data;
  draft = new Map([...previous].filter(([questionId, optionId]) => {
    const question = session!.questions.find(item => item.id === questionId);
    return question?.options.some(option => option.id === optionId) ?? false;
  }));
  pendingRequest = undefined;
  saved = undefined;
  conflictState = undefined;
  lastErrorCode = undefined;
  notice = undefined;
  questionIndex = Math.max(0, session.questions.findIndex(question => !draft.has(question.id)));
  screen = draft.size === session.questions.length ? 'review' : 'question';
  resetIdleTimer();
  renderCurrent();
}

async function restoreRecovery(recovery: GuestRecovery) {
  session = recovery.session;
  draft = new Map(recovery.choices);
  questionIndex = Math.min(recovery.questionIndex, session.questions.length - 1);
  pendingRequest = recovery.pendingRequest;
  screen = 'starting';
  busy = true;
  renderWelcome();

  const checked = await api<ProposalSessionData>(`/api/proposal-sessions/${encodeURIComponent(session.session.id)}`);
  busy = false;
  if (checked.ok) {
    const initialState = recovery.session.state;
    session = { ...checked.data, state: initialState };
    draft = new Map([...draft].filter(([questionId, optionId]) => {
      const question = session!.questions.find(item => item.id === questionId);
      return question?.options.some(option => option.id === optionId) ?? false;
    }));
    conflictState = checked.data.state.revision > initialState.revision ? checked.data.state : undefined;
    if (conflictState) {
      lastErrorCode = 'revision_conflict';
      notice = { role: 'status', text: '草稿を復元しました。回答中に街の集計が更新されています。最新のMeterを確認してから記録してください。' };
    }
  } else {
    if (checked.state && 'guestCount' in checked.state && checked.state.revision > session.state.revision)
      conflictState = checked.state;
    lastErrorCode = checked.error.code;
    notice = { role: 'alert', text: errorText(checked.error.code, checked.error.message) };
  }

  if (pendingRequest) {
    screen = 'review';
    renderReview(false);
    await submitProposal();
    return;
  }

  const complete = session.questions.every(question => question.options.some(option => option.id === draft.get(question.id)));
  if (!complete) questionIndex = Math.max(0, session.questions.findIndex(question => !draft.has(question.id)));
  screen = complete ? 'review' : 'question';
  resetIdleTimer();
  renderCurrent();
}

function renderProgress() {
  const steps = session!.questions.map((_, index) => {
    const item = el('li', {
      class: index < questionIndex ? 'is-complete' : index === questionIndex ? 'is-current' : '',
      ...(index === questionIndex ? { 'aria-current': 'step' } : {}),
    }, `${index + 1}`);
    return item;
  });
  const progress = el('progress', { max: '4', value: String(questionIndex + 1), 'aria-label': `質問 ${questionIndex + 1} / 4` });
  return el('div', { class: 'guest-progress-block' },
    el('ol', { class: 'guest-steps', 'aria-label': '質問の進行状況' }, ...steps), progress,
    el('p', { class: 'guest-progress-copy' }, `質問 ${questionIndex + 1} / ${session!.questions.length}`));
}

function renderQuestion(focus = true) {
  const question = session!.questions[questionIndex];
  const fieldset = el('fieldset', { class: 'guest-choices' });
  const next = el('button', {
    type: 'submit', class: 'primary', 'data-auto-action': 'next', ...(!draft.has(question.id) ? { disabled: '' } : {}),
  }, questionIndex === session!.questions.length - 1 ? '回答を確認する' : '次の質問へ');
  fieldset.append(el('legend', { class: 'visually-hidden' }, question.text));
  question.options.forEach((option, optionIndex) => {
    const input = el('input', {
      type: 'radio', name: `question-${questionIndex}`, id: `guest-choice-${questionIndex}-${optionIndex}`,
      'data-question-id': question.id,
      value: option.id, ...(draft.get(question.id) === option.id ? { checked: '' } : {}),
    });
    input.addEventListener('change', () => {
      if (input.checked) draft.set(question.id, option.id);
      next.disabled = false;
      persistRecovery();
      resetIdleTimer();
    });
    fieldset.append(el('label', { class: 'guest-choice' }, input,
      el('span', { class: 'guest-choice-copy' }, option.label),
      el('span', { class: 'guest-choice-state' }, '選択中')));
  });

  const form = el('form', { class: 'guest-form' }, fieldset,
    el('div', { class: 'guest-actions guest-actions--between' },
      ...(questionIndex > 0 ? [action('前の質問へ', () => { questionIndex -= 1; renderQuestion(); })] : [el('span', { class: 'guest-action-spacer' })]),
      next));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!draft.has(question.id)) return;
    notice = undefined;
    const complete = session!.questions.every(item => draft.has(item.id));
    if (questionIndex < session!.questions.length - 1 && !(editingFromReview && complete)) {
      questionIndex += 1;
      renderQuestion();
    } else {
      screen = 'review';
      renderReview();
    }
  });
  const resume = notice && ['session_expired', 'already_answered', 'unsupported_version'].includes(lastErrorCode ?? '')
    ? action('新しい予約で草稿を続ける', () => startSession(true), false, busy)
    : undefined;
  page(question.text, '質問', renderProgress(),
    ...(question.background ? [el('p', { class: 'guest-copy' }, question.background)] : []),
    ...noticeNodes(), ...recoveryNodes(), ...idleWarningNodes(), form,
    ...(resume ? [el('div', { class: 'guest-actions' }, resume)] : []));
  if (focus) focusTitle();
}

function renderAnswerRow(index: number, editable: boolean) {
  const question = session!.questions[index];
  const selected = question.options.find(option => option.id === draft.get(question.id));
  const edit = action('変更', () => { questionIndex = index; screen = 'question'; editingFromReview = true; renderQuestion(); }, false, !editable);
  return el('li', { class: 'guest-review-row' },
    el('div', { class: 'guest-review-copy' },
      el('p', { class: 'guest-review-number' }, `質問 ${index + 1}`),
      el('p', { class: 'guest-review-question' }, question.text),
      el('p', { class: 'guest-review-answer' }, selected?.label ?? '未選択')),
    edit);
}

function renderReview(focus = true) {
  editingFromReview = false;
  const uncertain = pendingRequest !== undefined;
  const sessionBlocked = ['session_expired', 'already_answered', 'unsupported_version'].includes(lastErrorCode ?? '');
  const submitLabel = busy ? '記録しています…'
    : uncertain ? '同じ申込IDで結果を確認する'
      : sessionBlocked ? '新しい予約で草稿を続けてください'
      : conflictState ? `最新 revision ${conflictState.revision} を確認して記録する`
        : 'この内容で街に記録する';
  const submit = action(submitLabel, () => submitProposal(), true, busy || sessionBlocked);
  submit.dataset.autoAction = 'submit';
  const conflict = conflictState
    ? el('div', { class: 'guest-conflict' },
      el('p', {}, '確認中に別の提案が先に記録されました。草稿は保存されています。最新の集計を確認してから、もう一度記録してください。'),
      renderScores(session!.state.scores, conflictState.scores))
    : undefined;
  const uncertainNotice = uncertain
    ? el('p', { class: 'guest-copy', role: 'status', 'aria-live': 'polite' }, '送信結果をまだ確認できていません。内容は固定し、同じ申込IDで安全に再確認します。')
    : undefined;
  const resume = notice && ['session_expired', 'already_answered', 'unsupported_version'].includes(lastErrorCode ?? '')
    ? action('新しい予約で草稿を続ける', () => startSession(true), false, busy)
    : undefined;
  page('回答を確認する', '送信前の確認',
    el('p', { class: 'guest-copy' }, '変更する質問は「変更」から戻れます。記録後はこの提案を編集できません。'),
    ...noticeNodes(), ...recoveryNodes(), ...idleWarningNodes(),
    ...(conflict ? [conflict] : []),
    ...(uncertainNotice ? [uncertainNotice] : []),
    el('ol', { class: 'guest-review-list' }, ...session!.questions.map((_, index) => renderAnswerRow(index, !busy && !uncertain))),
    el('div', { class: 'guest-actions guest-actions--between' },
      ...(!uncertain ? [action('質問に戻る', () => { questionIndex = session!.questions.length - 1; screen = 'question'; renderQuestion(); }, false, busy)] : [el('span', { class: 'guest-action-spacer' })]),
      submit),
    ...(resume ? [el('div', { class: 'guest-actions' }, resume)] : []));
  if (focus) focusTitle();
}

let lastErrorCode: string | undefined;

async function submitProposal() {
  if (!session || busy) return;
  const request = pendingRequest ?? buildProposalRequest(
    session.questions, draft, session.session.id, newAnswerId(), conflictState?.revision ?? session.state.revision,
  );
  if (!request) {
    notice = { role: 'alert', text: '四つの質問それぞれで選択してください。草稿は保存されています。' };
    renderReview();
    return;
  }
  pendingRequest = request;
  busy = true;
  screen = 'submitting';
  clearIdleTimers();
  renderReview(false);
  const result = await api<ProposalData>('/api/proposals', request);
  busy = false;
  if (result.ok) {
    saved = result.data;
    conflictState = undefined;
    lastErrorCode = undefined;
    notice = undefined;
    screen = 'result';
    // Keep the exact submission locally until handoff; a reload can replay it to recover the result.
    renderResult();
    return;
  }

  lastErrorCode = result.error.code;
  notice = { role: 'alert', text: errorText(result.error.code, result.error.message) };
  screen = 'review';
  if (result.error.code === 'revision_conflict' && result.state && 'guestCount' in result.state) {
    // A revision conflict is a definite rejection; after review, the next request gets a fresh ID.
    pendingRequest = undefined;
    conflictState = result.state;
  } else if (result.error.code === 'internal_error') {
    // Commit status may be unknown; keep the exact request so retry is idempotent.
  } else {
    pendingRequest = undefined;
  }
  resetIdleTimer();
  renderReview();
}

function errorText(code: string, detail: string) {
  const title: Record<string, string> = {
    unsupported_version: '現在の展示runでは、この提案を受け付けられません。',
    session_expired: '質問の予約期限が過ぎました。草稿を新しい予約へ引き継げます。',
    already_answered: 'この予約はすでに送信済みです。',
    revision_conflict: '街の集計が更新されています。現在の状態を確認してください。',
    bad_request: '提案を確認できませんでした。草稿を見直してください。',
    lifecycle_blocked: '前の方の体験がまだ終了していません。スタッフが確認するまで少しお待ちください。',
  };
  // An expected wait, not a fault: the server's English detail would only confuse guests.
  if (code === 'lifecycle_blocked') return title[code];
  return `${title[code] ?? (code === 'internal_error' ? '送信結果を確認できません。再試行できます。' : `通信エラー（${code}）`)} ${detail}`;
}

function signed(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

function renderScores(before: ExhibitionState['scores'], after: ExhibitionState['scores']) {
  const rows = Object.keys(axisNames).map(axis => el('tr', {},
    el('th', { scope: 'row' }, axisNames[axis as keyof typeof axisNames]),
    el('td', { class: 'guest-number' }, signed(before[axis as keyof typeof axisNames])),
    el('td', { class: 'guest-arrow', 'aria-label': 'から' }, '→'),
    el('td', { class: 'guest-number' }, signed(after[axis as keyof typeof axisNames]))));
  return el('table', { class: 'guest-score-table' },
    el('caption', {}, '四つのMeter・提案前から提案後'),
    el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, '優先軸'), el('th', { scope: 'col' }, '前'), el('th', { scope: 'col' }), el('th', { scope: 'col' }, '後'))),
    el('tbody', {}, ...rows));
}

const changeNames: Record<string, string> = {
  band: 'Meter帯', automatedPorts: '自律サービス端口', sharedSeats: '共有席',
  treeCount: '樹冠ユニット', plantedFraction: '植栽面積', coolingFins: '冷却フィン', functionModules: '機能モジュール',
};

function changeValue(key: string, value: number | string) {
  if (key === 'band') return ({ low: '低', mixed: '中間', high: '高' } as Record<string, string>)[String(value)] ?? String(value);
  if (key === 'plantedFraction' && typeof value === 'number') return `${Math.round(value * 100)}%`;
  return String(value);
}

function renderCityChanges(proposal: ProposalRecord) {
  if (!proposal.cityChanges.length) {
    return el('p', { class: 'guest-notice guest-notice--quiet' }, '構成を維持する提案を記録しました。提案の記録は残り、変化のない数値を変化として表示していません。');
  }
  const rows = proposal.cityChanges.map(change => {
    const keys = [...new Set([...Object.keys(change.before), ...Object.keys(change.after)])]
      .filter(key => change.before[key] !== change.after[key]);
    const values = keys.map(key => `${changeNames[key] ?? key} ${changeValue(key, change.before[key])} → ${changeValue(key, change.after[key])}`).join(' · ');
    return el('li', { class: 'guest-change-row' },
      el('strong', {}, change.label), el('span', {}, values));
  });
  return el('ul', { class: 'guest-change-list', 'aria-label': '記録された街の構成変化' }, ...rows);
}

function renderResult(focus = true) {
  if (!saved) return renderWelcome(focus);
  const { proposal, state, replayed } = saved;
  page('この提案を記録しました', '街への反映',
    el('div', { class: 'guest-result-summary' },
      el('p', {}, replayed ? '保存済みの提案を確認しました。集計への加算は一度だけです。' : '提案を記録しました。'),
      el('p', { class: 'guest-result-number' }, `#${proposal.ordinal}`),
      el('p', { class: 'guest-copy' }, `参加者 ${state.guestCount} 人 · revision ${proposal.revisionBefore} → ${proposal.revisionAfter}`)),
    el('h2', {}, '選んだ回答'),
    el('ol', { class: 'guest-result-answers' }, ...proposal.answers.map((answer, index) =>
      el('li', {}, el('span', { class: 'guest-review-number' }, `質問 ${index + 1}`), answer.optionLabel))),
    el('h2', {}, '街の構成'), renderCityChanges(proposal),
    renderScores(proposal.beforeScores, proposal.afterScores),
    el('p', { class: 'guest-copy' }, '街はこの提案を含む集計結果を引き継ぎます。次の方の回答で、共同の街を続けてつくります。'),
    el('p', { class: 'guest-copy' }, 'この画面は約10秒後に次へ進みます。'),
    el('div', { class: 'guest-actions' }, action('次の方へ', renderHandoff, true)));
  if (focus) focusTitle();
  clearTimeout(flowTimer);
  flowTimer = window.setTimeout(renderHandoff, RESULT_MS);
}

function renderHandoff() {
  if (!saved) return nextGuest();
  clearTimeout(flowTimer);
  // The proposal is recorded; a reload from here must not replay the result.
  clearRecovery();
  screen = 'handoff';
  page('次の方へどうぞ', `提案 #${saved.proposal.ordinal} を記録しました`,
    el('p', { class: 'guest-lead' }, '街はこのまま次の方へ引き継がれます。'),
    el('div', { class: 'guest-actions' }, action('はじめる画面へ', nextGuest, true)));
  focusTitle();
  flowTimer = window.setTimeout(nextGuest, HANDOFF_MS);
}

function nextGuest() {
  clearIdleTimers();
  clearTimeout(flowTimer);
  clearRecovery();
  session = undefined;
  draft = new Map();
  pendingRequest = undefined;
  saved = undefined;
  conflictState = undefined;
  lastErrorCode = undefined;
  notice = undefined;
  screen = 'welcome';
  renderWelcome(true);
}

function abandonDraft() {
  clearIdleTimers();
  clearRecovery();
  session = undefined;
  draft = new Map();
  pendingRequest = undefined;
  conflictState = undefined;
  notice = undefined;
  lastErrorCode = undefined;
  screen = 'abandoned';
  renderAbandoned();
}

function renderAbandoned() {
  page('草稿を終了しました', 'セッション終了',
    el('p', { class: 'guest-lead' }, '操作がなかったため、提案を送らずに終了しました。街の集計は変わっていません。'),
    el('div', { class: 'guest-actions' }, action('最初からはじめる', nextGuest, true)));
  focusTitle();
}

function renderCurrent(focus = true) {
  if (screen === 'welcome' || screen === 'starting') return renderWelcome(focus);
  if (screen === 'question') return renderQuestion(focus);
  if (screen === 'review' || screen === 'submitting') return renderReview(focus);
  if (screen === 'result') return renderResult(focus);
  if (screen === 'handoff') return renderHandoff();
  renderAbandoned();
}

const recovery = readRecovery();
if (recovery) void restoreRecovery(recovery);
else renderWelcome();

// DEV-ONLY: remove this import/adapter, or move the controls to Admin before exhibition.
// The runner uses the same radio events, form submission, draft and idempotent submit path.
if (new URLSearchParams(location.search).has('dev-auto')) {
  void import('./autoAnswerPanel.ts').then(({ mountAutoAnswerPanel }) => mountAutoAnswerPanel({
    async start(signal) {
      // Result/handoff use chained timers that a hidden tab may delay; never race them.
      for (const deadline = Date.now() + 10_000; (screen === 'result' || screen === 'handoff') && Date.now() < deadline;) {
        await new Promise(resolve => setTimeout(resolve, 100));
        signal.throwIfAborted();
      }
      if (screen !== 'welcome' || busy || session || pendingRequest)
        throw new Error('草稿や送信を先に完了してください。自動回答は開始画面から実行します。');
      await startSession();
      if (!session || app.dataset.screen !== 'question') throw new Error(notice?.text ?? '質問を開始できません。');
      return session;
    },
    answer(questionId, optionId) {
      if (screen !== 'question' || busy || session?.questions[questionIndex]?.id !== questionId)
        throw new Error('質問画面が変わりました。');
      const input = Array.from(app.querySelectorAll<HTMLInputElement>('input[type=radio]'))
        .find(input => input.dataset.questionId === questionId && input.value === optionId);
      if (!input) throw new Error('回答の選択肢が見つかりません。');
      input.click();
      app.querySelector<HTMLFormElement>('form')!.requestSubmit();
    },
    async submit() {
      if (screen !== 'review' || busy || pendingRequest) throw new Error('確認画面が変わりました。');
      await submitProposal();
      if (!saved) throw new Error(notice?.text ?? '記録できませんでした。');
      return saved;
    },
  })).catch(error => console.error('Development auto-answer:', error));
}
