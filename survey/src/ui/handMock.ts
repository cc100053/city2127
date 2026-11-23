// DEV-ONLY layout mock for the hand-controlled guest flow (M3 design review). Static screens, no tracking, no API.
// Served at /hand-mock only when SURVEY_DEV_HAND=1. ?s=<screen> picks a screen; ?shot hides the switcher.
import './handMock.css';

const params = new URLSearchParams(location.search);
const root = document.querySelector<HTMLElement>('#mock')!;

const question = {
  index: 0, text: '荷物の受け取り予定が急に変わったら、どうする？',
  options: ['配達スタッフに相談する。', 'AIの提案から、自分で選ぶ。', 'AIに時間や受け取り場所を決めてもらう。'],
};
const answers = [
  ['荷物の受け取り予定が急に変わったら、どうする？', '配達スタッフに相談する。'],
  ['お台場に新しい自動運転の水上バスが登場した。どうする？', '利用者の評判を見てから試す。'],
  ['たまに使う小型の乗り物が必要になった。どうする？', '地域の共有サービスを使う。'],
  ['街のAIが、あなたの好みを覚えるとしたら？', '必要なときだけ情報を使ってほしい。'],
];
const letters = ['A', 'B', 'C'];

const palm = `<svg class="palm" viewBox="0 0 200 240" aria-hidden="true">
  <rect x="52" y="104" width="100" height="104" rx="38"/>
  <rect x="58" y="40" width="20" height="84" rx="10"/><rect x="82" y="22" width="20" height="96" rx="10"/>
  <rect x="106" y="28" width="20" height="92" rx="10"/><rect x="130" y="50" width="18" height="74" rx="9"/>
  <rect x="18" y="112" width="20" height="66" rx="10" transform="rotate(-38 28 145)"/>
</svg>`;
const ring = (fill: number, cls = '') => `<svg class="ring ${cls}" viewBox="0 0 320 320" aria-hidden="true">
  <circle cx="160" cy="160" r="148" class="ring-track"/>
  <circle cx="160" cy="160" r="148" class="ring-arc" transform="rotate(-90 160 160)" stroke-dasharray="930" stroke-dashoffset="${930 * (1 - fill)}"/>
  ${Array.from({ length: 48 }, (_, i) => `<line x1="160" y1="4" x2="160" y2="${i % 4 ? 10 : 16}" transform="rotate(${i * 7.5} 160 160)" class="ring-tick"/>`).join('')}
</svg>`;
const pinchIcon = `<svg class="pinch-icon" viewBox="0 0 120 80" aria-hidden="true">
  <path class="pinch-thumb" d="M12 62 C30 60 44 52 54 40"/><path class="pinch-index" d="M108 18 C88 22 70 30 58 38"/>
  <circle class="pinch-spark" cx="56" cy="39" r="5"/></svg>`;

const bar = (screenLabel: string, hand: 'rest' | 'point' | 'none') => `
<header class="bar">
  <div class="brand"><span class="brand-name">2127 / ODAIBA</span><span class="brand-caption">住民の声</span></div>
  <div class="bar-right">
    ${hand === 'none' ? '' : `<span class="hand-state hand-state--${hand}"><span class="hand-state-dot"></span>${hand === 'rest' ? '休止中 — 指を伸ばすと操作' : '指で操作中'}</span>`}
    <span class="station">STATION A</span>
  </div>
  <span class="visually-hidden">${screenLabel}</span>
</header>`;

const dots = (current: number) => `<ol class="dots" aria-label="質問 ${current + 1} / 4">${[0, 1, 2, 3].map(i =>
  `<li class="${i < current ? 'done' : i === current ? 'now' : ''}"></li>`).join('')}</ol>`;

function welcome(state: 'idle' | 'scanning' | 'pinch') {
  const fill = state === 'idle' ? 0 : state === 'scanning' ? 0.5 : 1;
  const title = state === 'pinch' ? 'つまんで登録' : '手のひらをかざして住民登録';
  const lead = state === 'idle' ? '2127年の台場へようこそ。手のひらを画面に向けてください。'
    : state === 'scanning' ? 'そのまま手のひらを向けていてください…' : '親指と人さし指をつまむと、住民として登録されます。';
  return `${bar('welcome', state === 'idle' ? 'none' : 'rest')}
<section class="welcome welcome--${state}">
  <div class="scanner">${ring(fill, state === 'scanning' ? 'is-scanning' : '')}${palm}
    ${state === 'scanning' ? '<div class="scanline"></div>' : ''}
    ${state === 'pinch' ? pinchIcon : ''}
  </div>
  <div class="welcome-copy">
    <p class="eyebrow">${state === 'idle' ? '住民登録' : state === 'scanning' ? 'スキャン中 50%' : '確認'}</p>
    <h1>${title}</h1>
    <p class="lead">${lead}</p>
    <ol class="steps">
      <li class="${state === 'idle' ? 'now' : 'done'}"><b>1</b>手のひらをかざす</li>
      <li class="${state === 'scanning' ? 'now' : state === 'pinch' ? 'done' : ''}"><b>2</b>そのまま待つ</li>
      <li class="${state === 'pinch' ? 'now' : ''}"><b>3</b>つまんで登録</li>
    </ol>
    <p class="privacy">手の形は保存しません。カメラ映像は端末の外へ送られません。</p>
  </div>
  <button class="touch-start" type="button">タッチで始める</button>
</section>`;
}

function registered() {
  return `${bar('registered', 'rest')}
<section class="registered">
  <p class="eyebrow">住民登録完了</p>
  <p class="resident-label">あなたの住民番号</p>
  <p class="resident-number">#0042</p>
  <p class="lead">ようこそ、2127年の台場へ。四つの質問に、暮らしの声でお答えください。</p>
  <div class="next-bar"><span></span></div>
  <p class="hint">まもなく最初の質問へ</p>
</section>`;
}

function questionScreen(mode: 'read' | 'hover' | 'picked') {
  const cards = question.options.map((label, i) => {
    const cls = mode === 'hover' && i === 1 ? 'is-preview' : mode === 'picked' ? (i === 0 ? 'is-picked' : 'is-dim') : '';
    return `<div class="card ${cls}">
      <span class="card-letter">${letters[i]}</span>
      <span class="card-label">${label}</span>
      <span class="card-hint">${mode === 'hover' && i === 1 ? '<b>つまんで選ぶ</b>' : mode === 'picked' && i === 0 ? '選択しました' : ''}</span>
    </div>`;
  }).join('');
  return `${bar('question', mode === 'read' ? 'rest' : 'point')}
<section class="question">
  <div class="text-zone">
    <div class="q-meta"><span class="eyebrow">質問 ${question.index + 1} / 4</span>${dots(question.index)}</div>
    <h1>${question.text}</h1>
    ${mode === 'read' ? '<div class="read-lock"><span></span><em>読み終わると選べます</em></div>' : '<p class="zone-note">ここは読むための場所です。手を置いても選ばれません。</p>'}
  </div>
  <div class="band">
    <div class="back-strip"><span>前の<br>質問へ</span></div>
    <div class="cards">${cards}</div>
  </div>
  ${mode === 'hover' ? '<div class="cursor" style="left:592px;top:520px"></div>' : ''}
  ${mode === 'picked' ? `<div class="picked">
    <p><b>A</b> を選択しました</p>
    <small>次の質問へ進みます — 戻るときは「前の質問へ」</small>
    <div class="picked-bar"><span></span></div>
  </div>` : ''}
</section>`;
}

function review() {
  return `${bar('review', 'point')}
<section class="review">
  <div class="text-zone text-zone--short">
    <p class="eyebrow">送信前の確認</p>
    <h1>あなたの声を確認してください。</h1>
    <p class="zone-note">変えたい答えのカードをつまむと、その質問に戻ります。</p>
  </div>
  <div class="review-band">
    <ol class="answers">${answers.map(([q, a], i) => `<li class="answer ${i === 1 ? 'is-preview' : ''}">
      <span class="answer-number">質問 ${i + 1}</span><span class="answer-q">${q}</span><span class="answer-a">${a}</span>
      <span class="answer-edit">${i === 1 ? '<b>つまんで変更</b>' : '変更'}</span></li>`).join('')}</ol>
    <div class="submit">この声を街へ届ける<small>つまんで送信</small></div>
  </div>
  <div class="cursor" style="left:840px;top:330px"></div>
</section>`;
}

function lookUp() {
  return `<section class="lookup">
  <div class="beam"></div>
  <div class="chevrons">${[0, 1, 2, 3, 4].map(i => `<span style="--i:${i}"></span>`).join('')}</div>
  <div class="lookup-copy">
    <p class="eyebrow">住民 #0042 の声を記録しました</p>
    <h1>上の画面をご覧ください</h1>
    <p class="lead">あなたの声が街へ</p>
  </div>
</section>`;
}

function dimmed() {
  return `<section class="dimmed">
  <div class="beam beam--faint"></div>
  <p>上の画面で、あなたの声が街に届いています。</p>
</section>`;
}

const screens: Record<string, { name: string; render: () => string }> = {
  'welcome-idle': { name: '歓迎・待機', render: () => welcome('idle') },
  'welcome-scanning': { name: '歓迎・スキャン', render: () => welcome('scanning') },
  'welcome-pinch': { name: '歓迎・つまむ', render: () => welcome('pinch') },
  registered: { name: '登録完了', render: registered },
  question: { name: '質問（読む）', render: () => questionScreen('read') },
  'question-hover': { name: '質問・プレビュー', render: () => questionScreen('hover') },
  picked: { name: '選択・次へ', render: () => questionScreen('picked') },
  review: { name: '確認', render: review },
  'submitted-look-up': { name: '送信・上を見る', render: lookUp },
  dimmed: { name: '減光', render: dimmed },
};
const order = Object.keys(screens);

function show(id: string) {
  const key = screens[id] ? id : order[0];
  root.className = `mock mock--${key}`;
  root.innerHTML = screens[key].render();
  if (!params.has('shot')) {
    const nav = document.createElement('nav');
    nav.className = 'switcher';
    nav.innerHTML = order.map(k => `<button type="button" data-s="${k}" class="${k === key ? 'on' : ''}">${screens[k].name}</button>`).join('');
    nav.addEventListener('click', e => { const s = (e.target as HTMLElement).closest('button')?.dataset.s; if (s) { history.replaceState(null, '', `?s=${s}`); show(s); } });
    root.append(nav);
  }
}
addEventListener('keydown', e => {
  const i = order.indexOf(root.className.replace('mock mock--', ''));
  if (e.key === 'ArrowRight') show(order[(i + 1) % order.length]);
  if (e.key === 'ArrowLeft') show(order[(i + order.length - 1) % order.length]);
});
show(params.get('s') ?? order[0]);
