import { ENERGY_PHASES } from './devEnergy.ts';
import type { CarrierChange } from './cityChangeManager.ts';
import type { EnergyRuntime } from './energyRuntime.ts';
import { shotTimeline, type ShotId } from './headlineCamera.ts';
import { DISPLAY_MS } from '../survey/src/shared/displayTiming.ts';

type Part = 'garden' | 'garden2' | 'ring' | 'wing' | 'island';
const CYCLE_SECONDS = 60;
// The result card names whose voice and what changed; this caption only says how the shown part works.
export const NARRATION: Record<Part, { title: string; steps: readonly [string, string, string] }> = {
  garden: { title: '海辺の蓄電庭園 · 揚水式', steps: [ENERGY_PHASES.a.charge, ENERGY_PHASES.a.hold, ENERGY_PHASES.a.release] },
  garden2: { title: '二つ目の蓄電庭園 · 揚水式', steps: [ENERGY_PHASES.a.charge, ENERGY_PHASES.a.hold, ENERGY_PHASES.a.release] },
  ring: { title: 'フジテレビ前・蓄電環 · 回転式', steps: [ENERGY_PHASES.b.charge, ENERGY_PHASES.b.hold, ENERGY_PHASES.b.release] },
  wing: { title: '沖の受電翼 · 外部からの受電', steps: ['受電 → 翼が軌道からの電力を受ける', '送電 → 岸の配電ゲートへ', '配電 → 街区の拠点から街へ'] },
  island: { title: '沖のエネルギー島 · 島からの送電', steps: ['発電 → 沖の島の原子力施設', '送電 → 検修橋に沿って岸へ', '配電 → 街区の拠点から街へ'] },
};

/** The part a headline close-up shows, while it stays in the city: removals get the card alone. */
export function narratedPart(shot: ShotId | null, change: CarrierChange | undefined): Part | null {
  const after = change?.energy?.after;
  if (!after || !shot?.startsWith('energy:')) return null;
  const part = shot.slice(7) as Part;
  const present = { garden: after.waterGardens > 0, garden2: after.waterGardens === 2, ring: after.flywheel, wing: after.receiver !== 'none', island: after.island };
  return present[part] ? part : null;
}

/** One storage cycle from charge, compressed between the camera's arrival and the hold's end (8.88 s of the 13 s slot). */
export function narrationPlan(now: number, displayMs = DISPLAY_MS) {
  const t = shotTimeline(displayMs), start = now + t.hold, end = now + t.flyOut;
  return { start, end, base: Math.ceil(start / CYCLE_SECONDS) * CYCLE_SECONDS, rate: CYCLE_SECONDS / (end - start) };
}
export type NarrationPlan = ReturnType<typeof narrationPlan>;
/** The narrated part's seconds: continuous everywhere, at a cycle start when the window opens and a cycle later when it closes. */
export function narratedSeconds(plan: NarrationPlan, seconds: number) {
  if (seconds < plan.start) return seconds + plan.base - plan.start;
  if (seconds < plan.end) return plan.base + (seconds - plan.start) * plan.rate;
  return plan.base + CYCLE_SECONDS + seconds - plan.end;
}
/** Highlighted step while the caption shows (-1 outside the window). */
export const narrationStep = (plan: NarrationPlan, seconds: number) =>
  seconds < plan.start || seconds >= plan.end ? -1 : Math.min(2, Math.floor((seconds - plan.start) / (plan.end - plan.start) * 3));

/** Bottom-left caption plus the narrated part's own energy clock; everything else keeps the shared clock. */
export class EnergyNarration {
  private readonly panel = document.createElement('aside');
  private readonly title: HTMLElement;
  private readonly list: HTMLOListElement;
  private readonly note: HTMLElement;
  private plan: NarrationPlan | null = null;
  private part: Part | null = null;
  private energy: () => EnergyRuntime | undefined;
  constructor(energy: () => EnergyRuntime | undefined) {
    this.energy = energy;
    // Not a `.causal-panel`: that class is the survey card's, which runners and styles select by.
    this.panel.className = 'energy-narration'; this.panel.hidden = true;
    this.panel.innerHTML = '<h2 class="causal-title"></h2><ol></ol><p class="causal-status"></p>';
    document.body.appendChild(this.panel);
    this.title = this.panel.querySelector('h2')!; this.list = this.panel.querySelector('ol')!; this.note = this.panel.querySelector('p')!;
  }
  /** A live result: narrate the headline's energy part, or cancel any narration still holding its clock. */
  play(shot: ShotId | null, change: CarrierChange | undefined, now: number, displayMs = DISPLAY_MS) {
    this.cancel();
    const part = narratedPart(shot, change);
    if (!part) return;
    this.show(part, part === 'wing' || part === 'island' ? '送電経路のイメージ' : '60秒の蓄電サイクルを短縮して表示');
    this.plan = narrationPlan(now, displayMs);
  }
  /** Snapshots, resets, Undo, reconnects and superseding results: hide at once and return every part to the shared clock. */
  cancel() {
    this.plan = null; this.part = null; this.panel.hidden = true;
    const energy = this.energy(); if (energy) energy.clock = {};
    delete document.body.dataset.energyNarration;
  }
  update(now: number, reducedMotion: boolean) {
    if (!this.plan || !this.part) return;
    // Reduced motion receives results as immediate snapshots with no card, so a cycle switched off mid-way simply stops.
    if (reducedMotion) return this.cancel();
    const local = narratedSeconds(this.plan, now), energy = this.energy();
    // After the window the offset stays, so the part continues smoothly instead of jumping back to the shared phase.
    // Wing and island have no storage loop: their narration drives the shared distribution rail only.
    if (energy) energy.clock = this.part === 'wing' || this.part === 'island' ? { distribution: local } : { [this.part]: local, distribution: local };
    const step = narrationStep(this.plan, now);
    this.panel.hidden = step < 0;
    Array.from(this.list.children).forEach((li, i) => li.classList.toggle('active', i === step));
    document.body.dataset.energyNarration = JSON.stringify({ part: this.part, step, seconds: +local.toFixed(2) });
  }
  private show(part: Part, note: string) {
    this.part = part;
    this.title.textContent = NARRATION[part].title; this.note.textContent = note;
    this.list.replaceChildren(...NARRATION[part].steps.map(step => Object.assign(document.createElement('li'), { textContent: step })));
  }
}
