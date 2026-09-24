import './debug.css';
import type { AnswerData, AnswerRequest, ApiResponse, GuestQuestionData } from '../shared/protocol.ts';
import { api, el, newAnswerId, renderState } from './debugApi.ts';

// Debug surface for the future phone survey: one guest session, one assigned question, one answer.
const app = document.querySelector<HTMLElement>('#app')!;
let current: GuestQuestionData | undefined;
let lastRequest: AnswerRequest | undefined;
let expiryTimer = 0;

function show(...children: (Node | string)[]) {
  app.replaceChildren(el('h1', {}, 'Guest debug'), ...children);
}

function start() {
  show(el('p', {}, '一人一問。セッションを作成すると未回答の質問が一つ予約されます（2分）。'),
    el('button', { class: 'primary', id: 'start' }, 'ゲストセッションを開始'));
  app.querySelector('#start')!.addEventListener('click', createSession);
}

async function createSession() {
  const result = await api<GuestQuestionData>('/api/guest-sessions', {});
  if (!result.ok) return showError(result);
  current = result.data;
  lastRequest = undefined;
  renderQuestion();
}

function renderQuestion(notice?: HTMLElement) {
  if (!current) return start();
  const { session, question, state } = current;
  const countdown = el('span', { id: 'countdown' });
  const tick = () => {
    const left = Math.max(0, Math.round((Date.parse(session.expiresAt) - Date.now()) / 1000));
    countdown.textContent = session.status === 'reserved' ? (left > 0 ? `予約残り ${left}s` : '予約期限切れ（送信すると確認します）') : session.status;
  };
  clearInterval(expiryTimer);
  expiryTimer = window.setInterval(tick, 1000);
  tick();
  const options = question.options.map(option => {
    const button = el('button', {}, option.label);
    button.addEventListener('click', () => answer(option.id));
    return button;
  });
  show(
    el('p', { class: 'meta' }, `session ${session.id} · question ${question.id} · expectedRevision ${state.revision} · `, countdown),
    ...(notice ? [notice] : []),
    el('div', { class: 'panel' },
      ...(question.background ? [el('p', { class: 'meta' }, `${question.year ?? ''} ${question.background}`)] : []),
      el('h2', {}, question.text), el('div', { class: 'options' }, ...options)),
    el('h2', {}, 'このセッション開始時の都市状態'), renderState(state),
  );
}

async function answer(optionId: string) {
  if (!current) return;
  lastRequest = {
    answerId: newAnswerId(), guestSessionId: current.session.id, questionId: current.question.id, optionId, expectedRevision: current.state.revision,
  };
  await send(lastRequest);
}

async function send(request: AnswerRequest) {
  const result = await api<AnswerData>('/api/answers', request);
  if (result.ok) return renderAnswered(result.data);
  if (result.error.code === 'revision_conflict' && result.state && current) {
    current = { ...current, state: result.state };
    const retry = el('button', { class: 'primary' }, `最新 revision ${result.state.revision} で送り直す`);
    retry.addEventListener('click', () => lastRequest && send({ ...lastRequest, expectedRevision: result.state!.revision }));
    const notice = el('div', { class: 'notice warn' }, el('p', {}, `revision 競合: ${result.error.message}`), retry);
    return renderQuestion(notice);
  }
  showError(result);
}

function renderAnswered(data: AnswerData) {
  clearInterval(expiryTimer);
  const resend = el('button', {}, '同じ answer ID を再送（冪等性確認）');
  resend.addEventListener('click', () => lastRequest && send({ ...lastRequest, expectedRevision: data.event.revisionBefore }));
  const again = el('button', { class: 'primary' }, '次のゲストとして開始');
  again.addEventListener('click', createSession);
  show(
    el('div', { class: 'notice' }, el('p', {}, data.replayed ? '回答済み（再送: 既存の結果を返しました。加算なし）' : '回答を受け付けました'),
      el('p', { class: 'meta' }, `answer ${data.event.id} · sequence ${data.event.sequence} · revision ${data.event.revisionBefore} → ${data.event.revisionAfter}`)),
    el('div', { class: 'row' }, resend, again),
    el('h2', {}, '現在の都市状態'), renderState(data.state),
  );
}

function showError(result: Extract<ApiResponse<unknown>, { ok: false }>) {
  clearInterval(expiryTimer);
  const titles: Partial<Record<string, string>> = {
    no_question_available: '質問なし：この run の質問はすべて回答済みまたは予約中です',
    session_expired: '予約期限切れ：このセッションでは回答できません',
    already_answered: '回答済み：このセッションは既に回答しています',
  };
  const again = el('button', { class: 'primary' }, 'もう一度ゲストセッションを開始');
  again.addEventListener('click', createSession);
  show(el('div', { class: 'notice warn' }, el('p', {}, titles[result.error.code] ?? `エラー: ${result.error.code}`), el('p', { class: 'meta' }, result.error.message)),
    again, ...(result.state ? [el('h2', {}, '現在の都市状態'), renderState(result.state)] : []));
}

start();
