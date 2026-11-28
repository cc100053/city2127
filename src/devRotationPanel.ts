// DEV-only `?rotation` panel: the nine rotation questions × three options. Pressing an option plays one simulated guest who chooses it
// (src/devRotation.ts): the vote orb, the camera flying to its lot, the model transition and the result card, exactly as a live result.
// 「即時」 instead sets it at once and pins that option's close-up. Options without a model fly to the concept-lot hologram.
// `&jump=Q05:B,Q03:A` sets options at once on load (review captures; add `&shot=` for the camera).
import type { CityView, SurveyEventKind } from './surveyView.ts';
import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';
import { localRotationRun, ROTATION_SET } from './devRotation.ts';
import { ROTATION_VISITS } from './rotationLayout.ts';

/** Panel names for the built models (modelId → short label); an option without one shows its question-set label. */
const MODEL_NAMES: Record<string, string> = {
  'automation-hub-low': 'HUB 人手窓口', 'automation-hub-mixed': 'HUB 人機協作', 'automation-hub-high': 'HUB 全自動',
  'q02a-hydro-terrace': '水の棚田', 'bay-flower-receiver': '湾の花', 'rectenna-farm-canopy': '受電テラス農園',
  'drawer-housing-2127': '車抽屜住宅', 'pod-frame-tower-2127': '蛋艙塔', 'event-shelf-2127': '活動モジュール棚',
  'q05a-reverse-ac-2127': '逆向き冷房塔',
  'q05b-breathing-leaf-2127': '呼吸する巨葉',
  'q05c-snow-cloud-2127': '雪雲噴水',
};

type Emit = (kind: SurveyEventKind, view: CityView, displayMs?: number) => void;

export function mountRotationPanel(emit: Emit, onStatus: (text: string) => void, shot: (id: string) => void, show = true) {
  const run = localRotationRun();
  onStatus('DEV ローカル（サーバーなし）');
  const jumps = new URLSearchParams(location.search).get('jump')?.split(',').map(pair => pair.split(':')) ?? [];
  let start = run.snapshot();
  for (const [q, o] of jumps) if (ROTATION_SET.questions.some(x => x.id === q && x.options.some(y => y.id === o))) start = run.jump(q, o);
  emit('city-state-snapshot', start);
  Object.assign(window, { cityRotation: (questionId: string, optionId: string) => emit('city-state-updated', run.play(questionId, optionId), DISPLAY_MS) });
  if (!show) return;

  const panel = document.createElement('aside');
  panel.className = 'causal-panel scale-lab rotation-panel';
  panel.innerHTML = `<details open><summary class="causal-title">モデルシーン · DEV</summary>
    <p class="causal-context">押すと、その選択をした訪客の結果を再生します。● モデルあり ◇ ホログラム（モデル未完成）</p>
    ${ROTATION_SET.questions.map(q => `<div class="rotation-row" title="${q.text}"><b>${q.id}</b>
      ${q.options.map(o => `<button data-q="${q.id}" data-o="${o.id}" title="${o.label}">${o.modelId ? '●' : '◇'} ${o.id} <small>${o.modelId ? MODEL_NAMES[o.modelId] ?? o.modelId : o.label.replace(/[。.]$/, '')}</small></button>`).join('')}</div>`).join('')}
    <label class="lab-check"><input data-k="jump" type="checkbox"> 即時（演出なし・近景に固定）</label>
    <div class="lab-transport"><button data-act="hero">ヒーローへ戻る</button><button data-act="reset">初期状態に戻す</button></div></details>`;
  document.body.appendChild(panel);
  const jump = panel.querySelector<HTMLInputElement>('[data-k=jump]')!;
  const mark = () => {
    panel.querySelectorAll<HTMLButtonElement>('button[data-q]').forEach(button => button.classList.toggle('is-shown', run.shown[button.dataset.q!] === button.dataset.o));
  };
  panel.addEventListener('click', event => {
    const button = (event.target as Element).closest('button');
    if (!button) return;
    const { q, o, act } = button.dataset;
    if (q && o) {
      const close = ROTATION_VISITS[q]?.[o]?.shot;
      // A hologram option has no close-up of its own, so 即時 still plays its result (the hologram only shows during one).
      if (jump.checked && close) { emit('city-state-snapshot', run.jump(q, o)); shot(close); }
      else emit('city-state-updated', run.play(q, o), DISPLAY_MS);
    } else if (act === 'hero') emit('city-state-snapshot', run.snapshot());
    else if (act === 'reset') emit('city-state-snapshot', run.reset());
    mark();
  });
  mark();
}
