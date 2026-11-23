// Live tuning for the 住民の窓 hand UI. Defaults are rex's accepted values from the mocks (2026-11-23); `&tune`
// shows the panel, and its values persist in localStorage `handUiTune`. Page 1 keys carry a `reg` prefix because
// pages 2-5 reuse the names lockMs/relMs/shake/shakeAt for other effects. Page 3-5 keys are listed for later phases.

export const TUNE_DEFAULTS = {
  // Page 1 住民登録
  regScanMs: 4000, regPull: 0.175, regMote: 0.35, regCurve: 2.8, regShakeAt: 0.75, regShake: 2.5, regLockMs: 150, regRelMs: 800, regOver: 2,
  // Page 2 question cards
  bootMs: 700, gapFar: 18, steps: 8, lockMs: 150, relMs: 800, rings: 3, chipMs: 560, brkMs: 220, lineMs: 180, printMs: 420, decodeMs: 460, stagger: 80, readMs: 1000,
  // Page 3 review
  dropMs: 560, dropStagger: 110, unfoldMs: 280, holdMs: 800, holdSteps: 10, shakeAt: 0.75, shake: 2, drainMs: 300, sendLockMs: 150, mergeMs: 620, launchMs: 560,
  // Page 4 look-up
  waitMs: 0, dockMs: 640, beamGrowMs: 520, chevN: 4, chevMs: 1400, flowRate: 9, flowSpeed: 420, flowSpread: 22, dimDelay: 2500, dimLevel: 0.15, dimMs: 900, dimBeam: 0.55,
  showMs: 13000, rxMs: 1500, doneMs: 2000, endHoldMs: 500, endFadeMs: 700,
  // Page 5 handoff
  hideGraceMs: 400, scrMs: 260, reshow: 0, countMs: 900, lmDelay: 250, exFlyMs: 2000, exStepMs: 4000, exDimDelay: 2500, offerMs: 8000, warnMs: 3000, moveMin: 40,
  deresMs: 900, convMs: 800,
};
export type TuneKey = keyof typeof TUNE_DEFAULTS;
export type Tune = Record<TuneKey, number>;

const STORE = 'handUiTune';

function load(): Tune {
  const tune: Tune = { ...TUNE_DEFAULTS };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORE) ?? 'null');
    if (saved && typeof saved === 'object')
      for (const [key, value] of Object.entries(saved)) if (key in tune && typeof value === 'number' && Number.isFinite(value)) tune[key as TuneKey] = value;
  } catch { /* storage disabled or bad JSON: defaults */ }
  return tune;
}

/** Shared, mutated in place by the panel so every page reads the live value. */
export const T: Tune = load();

const save = () => { try { localStorage.setItem(STORE, JSON.stringify(T)); } catch { /* storage disabled */ } };

type Row = [TuneKey, string, number, number, number, string] | ['#', string];
const SPEC: Row[] = [
  ['#', '第 1 頁：住民登録'],
  ['regScanMs', '掃描時間', 3000, 5000, 100, 'ms'],
  ['regPull', '畫面收縮幅度', 0, 0.25, 0.005, ''],
  ['regMote', '前景光點收縮幅度', 0, 0.45, 0.005, ''],
  ['regCurve', '收緊加速曲線', 1, 6, 0.1, ''],
  ['regShakeAt', '震動開始（掃描 %）', 0.5, 1, 0.01, ''],
  ['regShake', '震動幅度', 0, 8, 0.1, 'px'],
  ['regLockMs', '鎖定停頓', 0, 800, 10, 'ms'],
  ['regRelMs', '釋放時間', 200, 2500, 10, 'ms'],
  ['regOver', '釋放回彈', 0, 4, 0.1, ''],
  ['#', '第 2 頁：問題卡'],
  ['readMs', '閱讀鎖', 0, 2500, 50, 'ms'],
  ['bootMs', '全息開機時間（停留幾耐砌完）', 200, 1600, 10, 'ms'],
  ['gapFar', '夾爪起始距離', 6, 36, 1, 'px'],
  ['steps', '夾爪收緊格數', 3, 16, 1, '格'],
  ['lockMs', '琥珀鎖定停頓', 0, 400, 10, 'ms'],
  ['relMs', '場膜擴散時間', 300, 1600, 10, 'ms'],
  ['rings', '場膜圈數', 1, 4, 1, '圈'],
  ['chipMs', '數據晶片飛行時間', 250, 1200, 10, 'ms'],
  ['brkMs', '砌出①：夾爪飛入定位', 80, 600, 10, 'ms'],
  ['lineMs', '砌出②：四角連線成框', 60, 500, 10, 'ms'],
  ['printMs', '砌出③：線框逐層列印', 150, 1000, 10, 'ms'],
  ['decodeMs', '砌出④：文字解碼', 150, 1000, 10, 'ms'],
  ['stagger', '三張卡錯開', 0, 250, 5, 'ms'],
  ['#', '第 3 頁：確認（未接入）'],
  ['dropMs', 'A 晶片由 HUD 跌落時間', 250, 1200, 10, 'ms'],
  ['dropStagger', 'A 四粒晶片錯開', 0, 300, 5, 'ms'],
  ['unfoldMs', 'A 晶片展開成卡', 100, 700, 10, 'ms'],
  ['holdMs', '捏住幾耐（送出／はじめる画面へ）', 300, 2000, 10, 'ms'],
  ['holdSteps', 'D2 填充格數', 3, 20, 1, '格'],
  ['shakeAt', 'D2 幾多 % 開始震', 0, 1, 0.05, ''],
  ['shake', 'D2 震動幅度', 0, 6, 0.5, 'px'],
  ['drainMs', 'D2 放手倒退時間', 100, 1000, 10, 'ms'],
  ['sendLockMs', 'D2 琥珀鎖定停頓', 0, 400, 10, 'ms'],
  ['mergeMs', 'E 晶片匯合時間', 250, 1200, 10, 'ms'],
  ['launchMs', 'E 數據包射上時間', 250, 1200, 10, 'ms'],
  ['#', '第 4 頁：抬頭（未接入）'],
  ['waitMs', 'A1 排隊時間', 0, 13000, 500, 'ms'],
  ['dockMs', 'A1 數據包升上待機槽', 200, 1500, 10, 'ms'],
  ['beamGrowMs', 'B2 光柱生長', 100, 1500, 10, 'ms'],
  ['chevN', 'B2 箭咀數量', 0, 8, 1, '個'],
  ['chevMs', 'B2 箭咀行一轉', 500, 3000, 50, 'ms'],
  ['flowRate', 'B2 數據粒每秒', 0, 30, 1, '粒'],
  ['flowSpeed', 'B2 數據粒速度', 100, 1200, 10, 'px/s'],
  ['flowSpread', 'B2 數據粒左右散開', 0, 80, 1, 'px'],
  ['dimDelay', 'C1 幾耐之後調暗', 0, 8000, 100, 'ms'],
  ['dimLevel', 'C1 調暗後亮度', 0, 1, 0.05, ''],
  ['dimMs', 'C1 調暗過程', 100, 3000, 50, 'ms'],
  ['dimBeam', 'C1 調暗後光柱亮度', 0, 1, 0.05, ''],
  ['showMs', 'D2 大屏顯示時間', 3000, 20000, 500, 'ms'],
  ['rxMs', 'D2「受信」格長度', 300, 4000, 100, 'ms'],
  ['doneMs', 'D2「完了」格長度', 300, 4000, 100, 'ms'],
  ['endHoldMs', '完了後停留', 0, 2000, 50, 'ms'],
  ['endFadeMs', '淡出去 handoff', 200, 2000, 50, 'ms'],
  ['#', '第 5 頁：Handoff（未接入）'],
  ['countMs', 'A1 百分比數上去時間', 200, 3000, 50, 'ms'],
  ['hideGraceMs', 'A1 手離開張卡幾耐先收起', 0, 2000, 50, 'ms'],
  ['scrMs', 'A1 收起時數字亂碼時間', 0, 800, 10, 'ms'],
  ['lmDelay', 'B1 地標卡喺卡之後幾耐出', 0, 1500, 50, 'ms'],
  ['exFlyMs', 'C1 大屏飛過去', 500, 5000, 100, 'ms'],
  ['exStepMs', 'C1 每段字幕', 1000, 8000, 100, 'ms'],
  ['exDimDelay', 'C1 幾耐之後調暗', 0, 8000, 100, 'ms'],
  ['offerMs', 'D1 閒置幾耐返第 1 頁', 2000, 30000, 500, 'ms'],
  ['moveMin', 'D1 手郁幾快先算操作中', 0, 300, 5, 'px/s'],
  ['warnMs', 'D1 最後幾秒變琥珀色', 0, 10000, 500, 'ms'],
  ['deresMs', '收場 de-res 時間', 300, 2500, 50, 'ms'],
  ['convMs', '收場 數據收入環門', 300, 2000, 50, 'ms'],
];

/** `&tune`: a drawer over the stage with every value, copy and reset. */
export function mountTunePanel(parent: HTMLElement) {
  const wrap = document.createElement('div');
  wrap.className = 'holo-tune';
  wrap.innerHTML = `<button type="button" class="ht-toggle">TUNE</button><div class="ht-panel" hidden>
    <div class="ht-head"><b>即時調整</b><button type="button" data-a="copy">複製設定</button><button type="button" data-a="reset">還原預設</button></div>
    <div class="ht-grid"></div><code class="ht-out"></code></div>`;
  parent.append(wrap);
  const panel = wrap.querySelector<HTMLElement>('.ht-panel')!, grid = wrap.querySelector<HTMLElement>('.ht-grid')!, out = wrap.querySelector<HTMLElement>('.ht-out')!;
  const show = () => { out.textContent = JSON.stringify(T); };
  const build = () => {
    grid.innerHTML = SPEC.map(row => row[0] === '#' ? `<h3>${row[1]}</h3>`
      : `<label><span>${row[1]}<output data-k="${row[0]}">${T[row[0]]} ${row[5]}</output></span><input type="range" data-k="${row[0]}" min="${row[2]}" max="${row[3]}" step="${row[4]}" value="${T[row[0]]}"></label>`).join('');
    show();
  };
  grid.addEventListener('input', event => {
    const input = event.target as HTMLInputElement, key = input.dataset.k as TuneKey;
    const row = SPEC.find(r => r[0] === key) as Row & { 5: string };
    T[key] = Number(input.value);
    grid.querySelector(`output[data-k="${key}"]`)!.textContent = `${T[key]} ${row[5]}`;
    save(); show();
  });
  wrap.addEventListener('pointerdown', event => event.stopPropagation());
  wrap.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest('button');
    if (!button) return;
    if (button.classList.contains('ht-toggle')) panel.hidden = !panel.hidden;
    else if (button.dataset.a === 'reset') { Object.assign(T, TUNE_DEFAULTS); save(); build(); }
    else if (button.dataset.a === 'copy') void navigator.clipboard?.writeText(JSON.stringify(T)).then(() => { button.textContent = '已複製'; }, () => undefined);
  });
  build();
}
