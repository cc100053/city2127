import type { PerspectiveCamera, Scene } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CityChangeManager } from './cityChangeManager.ts';
import { devLayout } from './devMeters.ts';
import { HERO_POSITION, HERO_TARGET } from './heroCamera.ts';
import { HOUSING_OPTIONS, HOUSING_SITES, housingPrototype, type HousingOption } from './housingPrototype.ts';

/** Isolated H2 study: fixed authority baseline, compressed-years movement and an unchanged, locked hero camera. */
export function startHousingReview(scene: Scene, camera: PerspectiveCamera, controls: OrbitControls, manager: CityChangeManager, params: URLSearchParams) {
  manager.applyExhibitionLayout({ ...devLayout(''), energy: { waterGardens: 2, receiver: 'large', flywheel: true, island: true } }, 'city-state-snapshot', 0);
  const study = housingPrototype(); scene.add(study.root); controls.enabled = false;
  const panel = document.createElement('aside'); panel.className = 'causal-panel energy-review housing-review';
  panel.innerHTML = `<h2 class="causal-title">Housing · H2 建築・居住</h2>
    <label>配置 <select aria-label="住宅比較配置">${Object.entries(HOUSING_OPTIONS).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></label>
    <label>鏡頭 <select aria-label="住宅比較鏡頭"><option value="hero">原 hero · 鎖定</option><option value="material">M · 輕材／複合近景</option><option value="membrane">P · 植物膜近景</option><option value="mobile">U · 交換骨架近景</option><option value="collective">M · 橫向共享室</option><option value="algae">P · 藻類循環設備</option><option value="home">U · 完整小屋／更新軌</option></select></label>
    <label><input type="checkbox" aria-label="住宅靜態閱讀"> 靜態閱讀／停泊</label>
    <button type="button" data-replay>重播90秒</button> <button type="button" data-reset>重設／停泊</button>
    <p data-cycle aria-live="off"></p><p data-description></p><p class="causal-status">隔離設計比較 · 非問卷／Meter結果<br>四軸0、四類能源共存。90秒「多年更新壓縮示意」：代表數年至數十年更新，並非日常通勤。前側專用搬運路徑來回兩個接駁位置。植物與藻類不自發光。</p>`;
  document.body.appendChild(panel);
  const input = panel.querySelector<HTMLSelectElement>('[aria-label="住宅比較配置"]')!;
  const view = panel.querySelector<HTMLSelectElement>('[aria-label="住宅比較鏡頭"]')!;
  const description = panel.querySelector('[data-description]')!;
  const descriptions: Record<HousingOption, string> = {
    baseline: '現行混合城市、四類能源及原有建築。',
    material: 'M · Aqua City北側。分叉支承抬起輕材住宅；右側只有一組橫向共享骨架，內含公共生活室及連廊，與遠處Q4集約塔分開。',
    membrane: 'P · Aqua City／DECKS間。折面厚植物膜保留；後側獨立藻類面板由支架承托，集配管、回水管與過濾槽形成循環。藻類不自發光。',
    mobile: 'U · Hilton前側水庭。原固定骨架／交換艙保留；前側完整小屋停在獨立更新軌，兩個接駁底座與水電服務柱可見，與後側公共廊分開。前側吊運門架配下承叉架把生活艙送往空socket；完整小屋沿專用軌道搬遷。',
    mixed: 'M／P／U三區共存。M同一棟輕材架空住宅疊加植物外皮與可換生活艙；原塔樓、公共步道及海灣保留。',
  };
  function select(next: HousingOption) {
    study.select(next); input.value = next; description.textContent = descriptions[next];
    const url = new URL(location.href); url.searchParams.set('housing', next); history.replaceState(null, '', url);
    panel.dataset.configuration = next;
  }
  function frame(next: string) {
    const secondary = next === 'collective' || next === 'algae' || next === 'home';
    const site = next === 'collective' ? 'material' : next === 'algae' ? 'membrane' : next === 'home' ? 'mobile' : next;
    const key = Object.hasOwn(HOUSING_SITES, site) ? site as keyof typeof HOUSING_SITES : null;
    if (key && secondary) {
      const [x, z] = HOUSING_SITES[key];
      if (next === 'algae') { camera.position.set(x + 8, 13, z + 31); controls.target.set(x, 7, z + 7.5); }
      else if (next === 'collective') { camera.position.set(x + 16, 22, z - 15); controls.target.set(x + 8, 18, z - .5); }
      else { camera.position.set(x - 24, 15, z - 33); controls.target.set(x, 5, z - 4); }
    }
    else if (key) { const [x, z] = HOUSING_SITES[key]; camera.position.set(x + (key === 'membrane' ? 0 : -42), key === 'membrane' ? 52 : 36, z - (key === 'membrane' ? 41 : 54)); controls.target.set(x, 11, z); }
    else { camera.position.set(...HERO_POSITION); controls.target.set(...HERO_TARGET); }
    controls.minDistance = secondary ? 12 : key ? 30 : 150;
    camera.lookAt(controls.target); controls.update(); view.value = key ? next : 'hero';
    const url = new URL(location.href); if (key) url.searchParams.set('housingView', next); else url.searchParams.delete('housingView'); history.replaceState(null, '', url);
  }
  input.addEventListener('change', () => select(input.value as HousingOption));
  view.addEventListener('change', () => frame(view.value));
  const requested = params.get('housing');
  select(requested && Object.hasOwn(HOUSING_OPTIONS, requested) ? requested as HousingOption : 'baseline');
  frame(params.get('housingView') ?? 'hero');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const still = panel.querySelector<HTMLInputElement>('[aria-label="住宅靜態閱讀"]')!;
  const status = panel.querySelector('[data-cycle]')!;
  still.checked = motion.matches;
  motion.addEventListener('change', () => { still.checked = motion.matches; });
  const phases: Record<string, string> = {
    docked: 'A停泊／水電已接通', disconnect: 'A解除水電接駁', departure: '離開A：叉架承托／生活艙抽出，小屋等待軌道搬運',
    transport: '專用路徑搬運 → B', docking: '抵達B／對準socket、降下停泊', connected: 'B停泊／水電接通',
    'return-disconnect': 'B解除水電接駁', 'return-departure': '離開B：叉架承托／抽出，示意返回更新', 'return-transport': '專用路徑搬運 → A', 'return-docking': '抵達A／對準、降下停泊', reconnect: 'A重新接通水電',
  };
  let origin = 0, last = 0, previous = '';
  panel.querySelector('[data-replay]')!.addEventListener('click', () => { origin = last; still.checked = false; });
  panel.querySelector('[data-reset]')!.addEventListener('click', () => { origin = last; still.checked = true; });
  return (seconds: number) => {
    last = seconds;
    const cycle = study.update(seconds - origin, motion.matches || still.checked);
    panel.dataset.phase = cycle.phase; panel.dataset.cycleTime = cycle.time.toFixed(3);
    const text = `${motion.matches || still.checked ? '靜態閱讀 · ' : '90秒多年更新壓縮示意 · '}${phases[cycle.phase]}`;
    if (text !== previous) { status.textContent = text; previous = text; }
  };
}
