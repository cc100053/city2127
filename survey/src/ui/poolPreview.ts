import './debug.css';
import './guestTheme.css';
import './poolPreview.css';
import poolJson from '../pool/questionPool.v1.json';
import { parseQuestionPool, POOL_VARIANTS, type PoolOptionId, type PoolVariantId } from '../pool/questionPool.ts';
import { el } from './debugApi.ts';

// Preview only: choices live in memory, nothing is sent, stored or scored.
const pool = parseQuestionPool(poolJson);
const parameterOf = new Map(pool.parameters.map(p => [p.id, p]));
const VARIANT_NAMES: Record<PoolVariantId, string> = { P: 'P版（心理テスト系）', U: 'U版（都市企画系）' };

const app = document.querySelector<HTMLElement>('#app')!;
app.classList.add('guest', 'pool-preview');
document.body.classList.add('guest-page');

let variant: PoolVariantId = new URLSearchParams(location.search).get('v') === 'U' ? 'U' : 'P';
let index = 0; // 0..n-1 questions, n = summary
const choices = new Map<string, PoolOptionId>();

function button(label: string, kind: 'primary' | 'secondary', onClick: () => void, disabled = false) {
  const node = el('button', { type: 'button', class: kind, ...(disabled ? { disabled: '' } : {}) }, label);
  node.addEventListener('click', onClick);
  return node;
}

function masthead() {
  const toggle = el('div', { class: 'pool-variant', role: 'group', 'aria-label': '版' });
  for (const id of POOL_VARIANTS) {
    toggle.append(button(VARIANT_NAMES[id], id === variant ? 'primary' : 'secondary', () => { variant = id; render(); }));
  }
  return el('header', { class: 'guest-masthead' },
    el('div', { class: 'guest-brand' }, el('span', { class: 'guest-brand-name' }, '問題プール'), el('span', { class: 'guest-brand-caption' }, `プレビュー · ${pool.questions.length}問`)),
    toggle);
}

function steps() {
  const list = el('ol', { class: 'pool-steps' });
  pool.questions.forEach((q, i) => {
    const step = button(q.id.slice(1), 'secondary', () => { index = i; render(); });
    step.classList.toggle('is-current', i === index);
    step.classList.toggle('is-complete', choices.has(q.id));
    step.setAttribute('aria-label', `${q.id}${choices.has(q.id) ? '（回答済み）' : ''}`);
    list.append(el('li', {}, step));
  });
  const summary = button('一覧', 'secondary', () => { index = pool.questions.length; render(); });
  summary.classList.toggle('is-current', index === pool.questions.length);
  list.append(el('li', {}, summary));
  return list;
}

function questionScreen() {
  const question = pool.questions[index];
  const parameter = parameterOf.get(question.parameter)!;
  const v = question.variants[variant];
  const fieldset = el('fieldset', { class: 'guest-choices', 'data-option-count': '3' }, el('legend', { class: 'visually-hidden' }, v.text));
  for (const option of v.options) {
    const input = el('input', { type: 'radio', name: `${question.id}-${variant}`, value: option.id });
    input.checked = choices.get(question.id) === option.id;
    input.addEventListener('change', () => { choices.set(question.id, option.id); render(); });
    fieldset.append(el('label', { class: 'guest-choice' }, input,
      el('span', { class: 'guest-choice-content' },
        el('span', { class: 'guest-choice-title' }, `${option.id}　${option.label}`),
        el('span', { class: 'pool-meta' }, `理由：${option.reason}`),
        ...(option.cityChange ? [el('span', { class: 'pool-meta pool-city' }, `都市の変化：${option.cityChange}`)] : [])),
      el('span', { class: 'guest-choice-state' }, '選択中')));
  }
  const last = index === pool.questions.length - 1;
  return [
    el('p', { class: 'guest-eyebrow' }, `${question.id} · ${parameter.category} · ${parameter.label}`),
    el('h1', {}, v.text),
    el('p', { class: 'guest-copy' }, v.situation),
    fieldset,
    ...(v.notes.length ? [el('ul', { class: 'pool-notes' }, ...v.notes.map(n => el('li', {}, n)))] : []),
    el('p', { class: 'pool-meta' }, `関連仮説：${question.hypotheses.join('／')}`),
    el('div', { class: 'guest-actions guest-actions--between' },
      button('戻る', 'secondary', () => { index--; render(); }, index === 0),
      button(last ? '一覧を見る' : '次へ', 'primary', () => { index++; render(); })),
  ];
}

function summaryScreen() {
  const rows = pool.questions.map((question, i) => {
    const parameter = parameterOf.get(question.parameter)!;
    const chosen = choices.get(question.id);
    const option = question.variants[variant].options.find(o => o.id === chosen);
    const edit = button(chosen ? '変更' : '答える', 'secondary', () => { index = i; render(); });
    return el('li', { class: 'guest-review-row pool-summary-row' },
      el('div', {},
        el('p', { class: 'guest-review-number' }, `${question.id} · ${parameter.category}`),
        el('p', { class: 'guest-review-question' }, parameter.label),
        el('p', { class: 'guest-review-answer' }, option ? `${option.id}　${option.label}` : '未回答')),
      edit);
  });
  return [
    el('p', { class: 'guest-eyebrow' }, `${choices.size} / ${pool.questions.length} 回答`),
    el('h1', {}, '9個のパラメータと選んだ答え'),
    el('p', { class: 'guest-copy' }, 'プレビューなので、答えは保存も集計もされません。A/B/C は並びであり、点数ではありません。'),
    el('ul', { class: 'guest-review-list' }, ...rows),
    el('div', { class: 'guest-actions guest-actions--between' },
      button('最初から', 'secondary', () => { choices.clear(); index = 0; render(); }),
      button('Q01 へ', 'primary', () => { index = 0; render(); })),
  ];
}

function render() {
  const url = new URL(location.href);
  url.searchParams.set('v', variant);
  history.replaceState(null, '', url);
  const screen = el('section', { class: 'guest-screen' }, steps(), ...(index < pool.questions.length ? questionScreen() : summaryScreen()));
  app.replaceChildren(el('div', { class: 'guest-frame' }, masthead(), screen));
}

render();
