import type { Scene } from 'three';
import { ENERGY_OPTIONS, energyPrototype, type EnergyOption } from './energyPrototype.ts';

/** Reload-free comparison in the unchanged hero camera, isolated from survey and Meter review. */
export function startEnergyReview(scene: Scene, params: URLSearchParams) {
  const study = energyPrototype(); scene.add(study.root);
  const panel = document.createElement('aside'); panel.className = 'causal-panel energy-review';
  panel.innerHTML = `<h2 class="causal-title">Energy · E2 空間比較</h2>
    <label>配置 <select aria-label="能源比較配置">${Object.entries(ENERGY_OPTIONS).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select></label>
    <p data-description></p><p class="causal-status">靜態設計比較 · 非問卷／Meter<br>水循環與旋轉環是儲能；外部供電充能。未驗證容量或工程可行性。</p>`;
  document.body.appendChild(panel);
  const input = panel.querySelector('select')!, description = panel.querySelector('[data-description]')!;
  const descriptions: Record<EnergyOption, string> = {
    baseline: '現行富士媒體總部／球體劇場、六座 water rooms 與公共通道。',
    a: '一組上下水庭＋小型海上接收翼。落水經渦輪室；另一條管線抽水返回上水庭。',
    b: '一組大型接收翼＋富士外置儲能環。固定支承與旋轉帶分離，劇場及頂部泊位保留。',
    c: '分段填海能源島／核能路線量體＋跨水檢修橋。既有岸線與橋下船道保留；3・11的歷史記憶與海岸佔用留作敘事議題。',
    mixed: '一組接收翼、上下水庭、富士儲能環與能源島共存。數量只供空間比較，並非正式城市配置。',
  };
  function select(option: EnergyOption) {
    study.select(option); input.value = option; description.textContent = descriptions[option];
    const url = new URL(location.href); url.searchParams.set('energy', option); history.replaceState(null, '', url);
  }
  input.addEventListener('change', () => select(input.value as EnergyOption));
  const requested = params.get('energy');
  select(requested && Object.hasOwn(ENERGY_OPTIONS, requested) ? requested as EnergyOption : 'baseline');
}
