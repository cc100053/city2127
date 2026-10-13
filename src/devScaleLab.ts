// DEV-only `?scaleLab`: plays a seeded guest sequence through the real reducer into the city, toggling between the old Meter
// scale and the authoritative ramped Scale A at the same guest, with an optional vote-journey prototype. No survey server; nothing is persisted.
import type * as T from 'three';
import { CITY_AXES, type CityAxis } from '../survey/src/shared/citySurveyState.ts';
import { exhibitionBand } from '../survey/src/shared/cityView.ts';
import type { CityChangeManager } from './cityChangeManager.ts';
import { METER_COLORS } from './districtMeters.ts';
import { changeSites } from './layout.ts';
import { displayScore, labLayout, PROFILE_LABELS, replay, scaleStats, simulateVotes, type LabScale, type LabStep, type VoteProfile } from './scaleLab.ts';
import { ARRIVAL_SECONDS, VoteJourney } from './voteJourney.ts';

const SOCKET: Record<CityAxis, keyof typeof changeSites> = { automation: 'nw', publicSharing: 'sw', environmentalPriority: 'ne', urbanConcentration: 'se' };
const AXIS_NAME: Record<CityAxis, string> = { automation: '自動化', publicSharing: '共有', environmentalPriority: '環境', urbanConcentration: '集約' };
const BAND_NAME = { low: 'low', mixed: 'mix', high: 'HIGH' } as const;
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function startScaleLab(scene: T.Scene, camera: T.PerspectiveCamera, city: CityChangeManager, clock: () => number, params: URLSearchParams) {
  const journey = new VoteJourney(scene, camera);
  let profile = (params.get('profile') as VoteProfile) in PROFILE_LABELS ? params.get('profile') as VoteProfile : 'balanced';
  let guests = Number(params.get('guests')) || 60, seed = Number(params.get('seed')) || 1;
  let scale: LabScale = params.get('scale') === 'old' ? 'old' : 'a';
  let steps: LabStep[] = [], step = 0, playing = false, nextAt = 0, interval = 2, journeyOn = params.has('journey');
  let pending: { step: number; at: number } | undefined;

  const panel = document.createElement('aside');
  panel.className = 'causal-panel scale-lab';
  panel.innerHTML = `
    <h2 class="causal-title">Scale Lab · DEV</h2>
    <div class="lab-scale" role="group" aria-label="Meter scale">
      <button data-scale="old">舊刻度 ×1</button><button data-scale="a">刻度 A（×0.85→2.4）</button>
    </div>
    <label>觀眾傾向 <select data-k="profile">${Object.entries(PROFILE_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    <label>人數 <select data-k="guests">${[20, 60, 120, 200].map(n => `<option>${n}</option>`).join('')}</select></label>
    <label>Seed <input data-k="seed" type="number" min="1" step="1"></label>
    <label>每位 <select data-k="interval"><option value="1">1 秒</option><option value="2">2 秒</option><option value="4">4 秒</option><option value="8">8 秒</option></select></label>
    <label class="lab-check"><input data-k="journey" type="checkbox"> 一票旅程演出</label>
    <div class="lab-transport"><button data-act="back" aria-label="上一位">◀</button><button data-act="play">▶ 播放</button><button data-act="next" aria-label="下一位">▶|</button></div>
    <input data-k="scrub" type="range" min="0" value="0" aria-label="第幾位觀眾">
    <p class="lab-ordinal"></p>
    <canvas width="300" height="128" aria-label="四條 Meter 曲線；虛線係形態切換門檻"></canvas>
    <table class="lab-readout"></table>
    <table class="lab-stats"></table>
    <p class="causal-status">S 切換刻度 · Space 播放 · ←/→ 逐位</p>`;
  document.body.appendChild(panel);
  const $ = <E extends Element>(q: string) => panel.querySelector<E>(q)!;
  const scrub = $<HTMLInputElement>('[data-k=scrub]'), canvas = $<HTMLCanvasElement>('canvas'), ctx = canvas.getContext('2d')!;
  $<HTMLSelectElement>('[data-k=profile]').value = profile; $<HTMLSelectElement>('[data-k=guests]').value = String(guests);
  $<HTMLInputElement>('[data-k=seed]').value = String(seed); $<HTMLSelectElement>('[data-k=interval]').value = String(interval);
  $<HTMLInputElement>('[data-k=journey]').checked = journeyOn;

  const stepSeconds = () => journeyOn ? Math.max(interval, ARRIVAL_SECONDS + 4) : interval;

  function apply(kind: 'city-state-snapshot' | 'city-state-updated') {
    const s = steps[step];
    city.applyExhibitionLayout(labLayout(s, scale), kind, clock(), s.slotSeeds);
    render();
  }
  /** Immediate jump: no flight, lanterns for every guest so far. */
  function jump(to: number) {
    step = Math.max(0, Math.min(steps.length - 1, to)); pending = undefined;
    journey.setLanterns(steps.slice(1, step + 1).map(s => s.votes!));
    apply('city-state-snapshot');
  }
  function advance() {
    if (step >= steps.length - 1) { playing = false; render(); return; }
    const next = step + 1;
    if (journeyOn) { journey.play(steps[next].votes!, next, clock()); pending = { step: next, at: clock() + ARRIVAL_SECONDS }; }
    else { step = next; apply('city-state-updated'); }
  }
  function rebuild() {
    steps = replay(simulateVotes(profile, guests, seed));
    scrub.max = String(guests); playing = false; jump(0);
  }

  function render() {
    scrub.value = String(step);
    $('[data-act=play]').textContent = playing ? '❚❚ 暫停' : '▶ 播放';
    panel.querySelectorAll<HTMLButtonElement>('[data-scale]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scale === scale)));
    $('.lab-ordinal').textContent = step ? `暮らしの声 #${step} / ${guests}` : `開館（0 / ${guests}）`;
    const current = steps[step], scores = current.state.scores;
    $('.lab-readout').innerHTML = `<tr><th></th><th>M</th><th>舊</th><th>A</th></tr>` + CITY_AXES.map(axis => {
      const now = exhibitionBand(scores[axis]), a = exhibitionBand(displayScore(current, axis, 'a'));
      return `<tr><th style="color:${METER_COLORS[axis]}">${AXIS_NAME[axis]}<small>${changeSites[SOCKET[axis]].place}</small></th><td>${scores[axis].toFixed(1)}</td>`
        + `<td class="${scale === 'old' ? 'lab-on' : ''}">${BAND_NAME[now]}</td><td class="${scale === 'a' ? 'lab-on' : ''}">${BAND_NAME[a]}</td></tr>`;
    }).join('');
    // The curves: each lane is −12..12 in the active scale; dashed lines are the ±3 band thresholds.
    const w = canvas.width, lane = canvas.height / 4;
    ctx.clearRect(0, 0, w, canvas.height);
    CITY_AXES.forEach((axis, i) => {
      const y = (m: number) => i * lane + lane / 2 - m / 12 * (lane / 2 - 2), x = (k: number) => k / Math.max(1, guests) * w;
      ctx.fillStyle = i % 2 ? '#35413908' : '#35413912'; ctx.fillRect(0, i * lane, w, lane);
      ctx.setLineDash([3, 3]); ctx.strokeStyle = '#35413955'; ctx.lineWidth = 1;
      for (const t of [3, -3]) { ctx.beginPath(); ctx.moveTo(0, y(t)); ctx.lineTo(w, y(t)); ctx.stroke(); }
      ctx.setLineDash([]); ctx.strokeStyle = METER_COLORS[axis]; ctx.lineWidth = 1.6; ctx.beginPath();
      steps.forEach((s, k) => { const m = displayScore(s, axis, scale); if (k) ctx.lineTo(x(k), y(m)); else ctx.moveTo(x(k), y(m)); });
      ctx.stroke();
    });
    ctx.strokeStyle = '#354139'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(step / guests * w, 0); ctx.lineTo(step / guests * w, canvas.height); ctx.stroke();
  }
  function renderStats() {
    const current = scaleStats(steps, 'old'), wide = scaleStats(steps, 'a');
    const cells = (s: ReturnType<typeof scaleStats>, axis: CityAxis) => `<td>${pct(s.bands[axis].low)}</td><td>${pct(s.bands[axis].mixed)}</td><td>${pct(s.bands[axis].high)}</td>`;
    $('.lab-stats').innerHTML = `<caption>成段序列（#11 之後）形態佔比</caption><tr><th></th><th colspan="3">舊 L/M/H</th><th colspan="3">A L/M/H</th></tr>`
      + CITY_AXES.map(axis => `<tr><th>${AXIS_NAME[axis]}</th>${cells(current, axis)}${cells(wide, axis)}</tr>`).join('')
      + `<tr><th>切換</th><td colspan="3">${current.flips} 次</td><td colspan="3">${wide.flips} 次</td></tr>`
      + `<tr><th>端口級數</th><td colspan="3">${current.portValues} / 7</td><td colspan="3">${wide.portValues} / 7</td></tr>`;
  }
  const setScale = (next: LabScale) => { scale = next; apply('city-state-snapshot'); };

  panel.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest('button');
    if (!target) return;
    if (target.dataset.scale) setScale(target.dataset.scale as LabScale);
    if (target.dataset.act === 'play') { playing = !playing; nextAt = clock(); render(); }
    if (target.dataset.act === 'next') { playing = false; if (pending) jump(pending.step); else advance(); }
    if (target.dataset.act === 'back') { playing = false; jump(pending ? step : step - 1); }
  });
  panel.addEventListener('change', event => {
    const input = event.target as HTMLInputElement;
    if (input.dataset.k === 'profile') { profile = input.value as VoteProfile; rebuild(); renderStats(); }
    if (input.dataset.k === 'guests') { guests = Number(input.value); rebuild(); renderStats(); }
    if (input.dataset.k === 'seed') { seed = Math.max(1, Math.trunc(Number(input.value)) || 1); rebuild(); renderStats(); }
    if (input.dataset.k === 'interval') interval = Number(input.value);
    if (input.dataset.k === 'journey') journeyOn = input.checked;
  });
  scrub.addEventListener('input', () => { playing = false; jump(Number(scrub.value)); });
  addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    if (event.key === 's' || event.key === 'S') setScale(scale === 'a' ? 'old' : 'a');
    else if (event.key === ' ') { event.preventDefault(); playing = !playing; nextAt = clock(); render(); }
    else if (event.key === 'ArrowRight') { playing = false; if (pending) jump(pending.step); else advance(); }
    else if (event.key === 'ArrowLeft') { playing = false; jump(step - 1); }
  });

  rebuild(); renderStats();
  Object.assign(window, { scaleLab: { get step() { return step; }, get scale() { return scale; }, jump, setScale, journey } });

  return (now: number, darkness: number) => {
    if (pending && now >= pending.at) { step = pending.step; pending = undefined; apply('city-state-updated'); }
    if (playing && !pending && now >= nextAt) { advance(); nextAt = now + stepSeconds(); }
    journey.update(now, darkness);
  };
}
