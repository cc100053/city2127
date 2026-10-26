import type { PerspectiveCamera, Scene } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CityChangeManager } from './cityChangeManager.ts';
import { devLayout } from './devMeters.ts';
import { HERO_POSITION, HERO_TARGET } from './heroCamera.ts';
import { HOUSING_OPTIONS, HOUSING_SITES, housingPrototype, type HousingOption } from './housingPrototype.ts';

/** Isolated H1 study: fixed authority baseline, parked homes and an unchanged, locked hero camera. */
export function startHousingReview(scene: Scene, camera: PerspectiveCamera, controls: OrbitControls, manager: CityChangeManager, params: URLSearchParams) {
  manager.applyExhibitionLayout({ ...devLayout(''), energy: { waterGardens: 2, receiver: 'large', flywheel: true, island: true } }, 'city-state-snapshot', 0);
  const study = housingPrototype(); scene.add(study.root); controls.enabled = false;
  const panel = document.createElement('aside'); panel.className = 'causal-panel energy-review housing-review';
  panel.innerHTML = `<h2 class="causal-title">Housing · H1 建築・居住</h2>
    <label>配置 <select aria-label="住宅比較配置">${Object.entries(HOUSING_OPTIONS).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></label>
    <label>鏡頭 <select aria-label="住宅比較鏡頭"><option value="hero">原 hero · 鎖定</option><option value="material">M · 輕材／複合近景</option><option value="membrane">P · 植物膜近景</option><option value="mobile">U · 交換骨架近景</option></select></label>
    <p data-description></p><p class="causal-status">隔離設計比較 · 非問卷／Meter結果<br>四軸0、四類能源共存。H1為停泊靜態；90秒多年更新壓縮循環留待H2。植物與藻類不自發光。</p>`;
  document.body.appendChild(panel);
  const input = panel.querySelector<HTMLSelectElement>('[aria-label="住宅比較配置"]')!;
  const view = panel.querySelector<HTMLSelectElement>('[aria-label="住宅比較鏡頭"]')!;
  const description = panel.querySelector('[data-description]')!;
  const descriptions: Record<HousingOption, string> = {
    baseline: '現行混合城市、四類能源及原有建築。',
    material: 'M · Aqua City北側。分叉支承抬起兩組輕材住宅；公共生活廊、升降核與可拆接生活艙共用固定骨架。',
    membrane: 'P · Aqua City／DECKS間。折面種植層改變住宅截面；棚架、厚植物膜、集水槽及回水管形成可見供水路徑。',
    mobile: 'U · Hilton前側水庭。樁柱保留水面，固定骨架、停泊生活艙、空接駁位及吊運接收架分開；此階段尚不搬遷。',
    mixed: 'M／P／U三區共存。M同一棟輕材架空住宅疊加植物外皮與可換生活艙；原塔樓、公共步道及海灣保留。',
  };
  function select(next: HousingOption) {
    study.select(next); input.value = next; description.textContent = descriptions[next];
    const url = new URL(location.href); url.searchParams.set('housing', next); history.replaceState(null, '', url);
    panel.dataset.configuration = next;
  }
  function frame(next: string) {
    const key = Object.hasOwn(HOUSING_SITES, next) ? next as keyof typeof HOUSING_SITES : null;
    if (key) { const [x, z] = HOUSING_SITES[key]; camera.position.set(x + (key === 'membrane' ? 0 : -42), key === 'membrane' ? 52 : 36, z - (key === 'membrane' ? 41 : 54)); controls.target.set(x, 11, z); }
    else { camera.position.set(...HERO_POSITION); controls.target.set(...HERO_TARGET); }
    controls.minDistance = key ? 30 : 150;
    camera.lookAt(controls.target); controls.update(); view.value = key ?? 'hero';
    const url = new URL(location.href); if (key) url.searchParams.set('housingView', key); else url.searchParams.delete('housingView'); history.replaceState(null, '', url);
  }
  input.addEventListener('change', () => select(input.value as HousingOption));
  view.addEventListener('change', () => frame(view.value));
  const requested = params.get('housing');
  select(requested && Object.hasOwn(HOUSING_OPTIONS, requested) ? requested as HousingOption : 'baseline');
  frame(params.get('housingView') ?? 'hero');
}
