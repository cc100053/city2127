// DEV-only `?meters` / `?shot` panel: ▲/▼ simulates one guest moving a site one rung (full live headline sequence); shot buttons pin a pose.
import { SHOTS } from './headlineCamera.ts';
import { devLayout, stepMeters } from './devMeters.ts';
import type { ExhibitionLayout } from './surveyView.ts';

const SITES = { nw: '自動化', ne: '環境', sw: '共有', se: '集中' } as const;

export function mountShotPanel(start: ExhibitionLayout['tiers'], play: (meters: string) => void, shot: (id: string) => void) {
  let tiers = start;
  const panel = document.createElement('aside');
  panel.className = 'causal-panel scale-lab shot-panel';
  panel.innerHTML = `<details open><summary class="causal-title">クローズアップ · DEV</summary>
    <p class="causal-subtitle">ゲストの選択（1段ずつ）</p>
    ${Object.entries(SITES).map(([id, name]) => `<div class="lab-transport"><span>${name} <b data-tier="${id}"></b></span>
      <button data-site="${id}" data-dir="-1">▼</button><button data-site="${id}" data-dir="1">▲</button></div>`).join('')}
    <div class="lab-transport"><button data-reset>リセット（全サイト中立）</button></div>
    <p class="causal-subtitle">ショット</p>
    <div class="shot-grid">${Object.keys(SHOTS).map(id => `<button data-shot="${id}">${id}</button>`).join('')}</div></details>`;
  document.body.appendChild(panel);
  const show = () => { for (const [id, tier] of Object.entries(tiers)) panel.querySelector(`[data-tier="${id}"]`)!.textContent = tier > 0 ? `+${tier}` : `${tier}`; };
  const apply = (meters: string) => { tiers = devLayout(meters).tiers; show(); play(meters); };
  panel.addEventListener('click', event => {
    const button = (event.target as Element).closest('button');
    if (!button) return;
    if (button.dataset.shot) shot(button.dataset.shot);
    else if (button.dataset.site) apply(stepMeters(tiers, button.dataset.site as keyof typeof SITES, Number(button.dataset.dir) as 1 | -1));
    else apply('');
  });
  show();
}
