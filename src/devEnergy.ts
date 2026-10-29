import type { Scene } from 'three';
import { ENERGY_OPTIONS, energyPrototype, type EnergyOption } from './energyPrototype.ts';

/** Storage-cycle phases, shared with the live energy close-up narration. */
export const ENERGY_PHASES = {
  a: { charge: '接收／外部供電 → 抽水上行、上水庭蓄水', hold: '暫存 → 上水庭保水、渦輪停定', release: '釋能／分配 → 落水經渦輪 → 街區用電' },
  b: { charge: '接收／外部供電 → 旋轉環充能', hold: '暫存 → 旋轉環續轉', release: '釋能／分配 → 旋轉環減速 → 街區用電' },
  mixed: { charge: '接收／外部供電 → 抽水上行、旋轉環充能', hold: '暫存 → 上水庭保水、旋轉環續轉', release: '釋能／分配 → 落水經渦輪、旋轉環減速 → 街區用電' },
};
/** Reduced-motion readings: the cycle is described, never played. */
export const ENERGY_STATIC = {
  a: '靜態閱讀：接收 → 儲能 → 街區；箭頭標示落水／抽水回管，水位與機械保持固定。',
  b: '靜態閱讀：接收 → 儲能 → 街區；接收翼、旋轉環與配電門架保持固定。',
  c: '能源島 → 檢修橋服務線 → 街區配電節點（供電路線示意）',
};

/** Reload-free comparison in the unchanged hero camera, isolated from survey and Meter review. */
export function startEnergyReview(scene: Scene, params: URLSearchParams) {
  const study = energyPrototype(); scene.add(study.root);
  const panel = document.createElement('aside'); panel.className = 'causal-panel energy-review';
  panel.innerHTML = `<h2 class="causal-title">Energy · E3 城市組合</h2>
    <label>配置 <select aria-label="能源比較配置">${Object.entries(ENERGY_OPTIONS).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></label>
    <label><input type="checkbox" aria-label="靜態閱讀"> 靜態閱讀（reduced motion）</label>
    <p data-description></p><p data-cycle aria-live="off"></p><p class="causal-status">設計動態示意 · 非問卷／Meter<br>水循環與旋轉環是儲能；外部供電充能。未驗證容量或工程可行性。</p>`;
  document.body.appendChild(panel);
  const input = panel.querySelector('select')!, description = panel.querySelector('[data-description]')!;
  const descriptions: Record<EnergyOption, string> = {
    baseline: '現行富士媒體總部／球體劇場、六座 water rooms 與公共通道。',
    a: '兩處上下水庭／翼形檢修遮棚＋小型海上接收翼。落水經渦輪室；另一條管線抽水返回上水庭。',
    b: '一組大型接收翼＋富士外置儲能環。固定支承與旋轉帶分離，兩處岸邊配電門架連至街區；劇場及頂部泊位保留。',
    c: '分段填海能源島／核能路線量體＋跨水檢修橋。配電門架延至兩處街區，既有岸線與橋下船道保留；3・11的歷史記憶與海岸佔用留作敘事議題。',
    mixed: '一組接收翼、兩處水庭／翼形遮棚、富士儲能環與能源島共存。兩處岸邊配電門架承接街區服務。數量只供空間比較，並非正式城市配置。',
  };
  function select(option: EnergyOption) {
    study.select(option); input.value = option; description.textContent = descriptions[option];
    const url = new URL(location.href); url.searchParams.set('energy', option); history.replaceState(null, '', url);
  }
  input.addEventListener('change', () => select(input.value as EnergyOption));
  const requested = params.get('energy');
  select(requested && Object.hasOwn(ENERGY_OPTIONS, requested) ? requested as EnergyOption : 'baseline');
  const motion = matchMedia('(prefers-reduced-motion: reduce)'), status = panel.querySelector('[data-cycle]')!;
  const still = panel.querySelector<HTMLInputElement>('input')!;
  still.checked = motion.matches;
  motion.addEventListener('change', () => { still.checked = motion.matches; });
  let previous = '';
  return (seconds: number) => {
    const cycle = study.update(seconds, motion.matches || still.checked);
    const staticText = study.option === 'b' ? ENERGY_STATIC.b : ENERGY_STATIC.a;
    const text = study.option === 'baseline' ? '' : study.option === 'c' ? ENERGY_STATIC.c : motion.matches || still.checked ? staticText : `60 秒示意循環 · ${ENERGY_PHASES[study.option][cycle.phase]}`;
    if (text !== previous) { status.textContent = text; previous = text; }
  };
}
