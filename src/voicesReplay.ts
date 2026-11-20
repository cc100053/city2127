// 声の灯 (owner 2026-11-20): the middle of the idle attract loop. Instead of replaying buildings (only a few models flip
// back and forth), the screen replays the run's voices: every lantern goes dark, then guest by guest each one's lanterns
// rise from the sites they voted on, while a card draws the Meter curves up to that guest and ends on the strongest lean.
// Data is the city view's recentProposals (the latest 64 guests, the lanterns' own window); a longer run says so.
import { HOLOGRAM_AXES } from './heroHolograms.ts';
import { METER_COLORS } from './districtMeters.ts';
import { SEGMENTS } from './attractLoop.ts';
import type { CityAxis } from '../survey/src/shared/citySurveyState.ts';
import type { EnergyChoice } from '../survey/src/shared/energy.ts';

export type VoiceRecord = { readonly ordinal: number; readonly votes: Readonly<Record<CityAxis, number> & { energy?: EnergyChoice }>; readonly afterScores: Readonly<Record<CityAxis, number>> };
export type LanternReplay = { replayLanterns(history: readonly VoiceRecord[], shown: number): void; endReplay(): void };

/** Fewer guests than this and the loop skips 声の灯 (the drift continues). */
export const MIN_VOICES = 3;
export const VOICES_SECONDS = SEGMENTS.voices[1] - SEGMENTS.voices[0];
/** Card fade, the dark beat before the first lantern, and the end of the guest-by-guest replay (seconds into the segment). */
export const CARD_FADE = .8, REPLAY_FROM = 1.5, REPLAY_UNTIL = 19;
/** Meter scores are clamped to ±12 by the server. */
const SCORE_LIMIT = 12;

/** Guests shown so far (fractional: the integer part have landed, the fraction is the next one rising). */
export function voicesShown(t: number, count: number) {
  if (t <= REPLAY_FROM) return 0;
  if (t >= REPLAY_UNTIL) return count;
  return count * (t - REPLAY_FROM) / (REPLAY_UNTIL - REPLAY_FROM);
}

export function voicesCardOpacity(t: number) {
  if (t <= 0 || t >= VOICES_SECONDS) return 0;
  return Math.min(1, t / CARD_FADE, (VOICES_SECONDS - t) / CARD_FADE);
}

/** Axes this run actually voted on (Q3 energy answers leave environmentalPriority at zero). */
export function votedAxes(history: readonly VoiceRecord[]) {
  return HOLOGRAM_AXES.filter(({ axis }) => history.some(record => record.votes[axis] !== 0));
}

/** The strongest one-sided lean among the voted axes: share of all guests, and the word for that side of the axis label. */
export function strongestLean(history: readonly VoiceRecord[]) {
  let best: { axis: string; word: string; share: number } | null = null;
  for (const { axis, label } of votedAxes(history)) {
    const [low, high] = label.split('と');
    for (const [side, word] of [[-1, low], [1, high]] as const) {
      const share = history.filter(record => record.votes[axis] === side).length / history.length;
      if (!best || share > best.share) best = { axis, word, share };
    }
  }
  return best;
}

/** SVG polyline points for one axis through the first `shown` guests, x across the whole history. */
export function meterPoints(history: readonly VoiceRecord[], axis: CityAxis, shown: number, width: number, height: number) {
  const last = Math.max(1, history.length - 1), n = Math.min(history.length, Math.floor(shown));
  return history.slice(0, n).map((record, i) => {
    const score = Math.max(-SCORE_LIMIT, Math.min(SCORE_LIMIT, record.afterScores[axis] ?? 0));
    return `${(i / last * width).toFixed(1)},${((1 - (score + SCORE_LIMIT) / (2 * SCORE_LIMIT)) * height).toFixed(1)}`;
  }).join(' ');
}

const W = 520, H = 120;
const svg = (tag: string, attrs: Record<string, string>) => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
};

export class VoicesReplay {
  private history: readonly VoiceRecord[] = [];
  private guestCount = 0;
  private playing = false;
  private readonly element = document.createElement('div');
  private readonly heading: HTMLElement;
  private readonly counter: HTMLElement;
  private readonly lean: HTMLElement;
  private readonly legend: HTMLElement;
  private readonly chart: SVGSVGElement;
  private lines: { axis: CityAxis; line: SVGPolylineElement }[] = [];
  private lanterns: LanternReplay | null;
  constructor(lanterns: LanternReplay | null, parent: HTMLElement = document.body) {
    this.lanterns = lanterns;
    this.element.className = 'attract-cta voices-card'; this.element.hidden = true;
    this.element.innerHTML = '<p class="voices-heading"></p><p class="voices-counter"></p><div class="voices-legend"></div><p class="voices-lean"></p>';
    this.heading = this.element.querySelector('.voices-heading')!; this.counter = this.element.querySelector('.voices-counter')!;
    this.legend = this.element.querySelector('.voices-legend')!; this.lean = this.element.querySelector('.voices-lean')!;
    this.chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'voices-chart', 'aria-hidden': 'true' }) as SVGSVGElement;
    this.chart.append(svg('line', { x1: '0', x2: String(W), y1: String(H / 2), y2: String(H / 2), class: 'voices-zero' }));
    this.counter.after(this.chart);
    parent.append(this.element);
  }
  /** The latest city view: the run's recent proposals (oldest first) and its total guest count. */
  setHistory(history: readonly VoiceRecord[], guestCount: number) {
    this.history = [...history].sort((a, b) => a.ordinal - b.ordinal); this.guestCount = guestCount;
    for (const { line } of this.lines) line.remove();
    this.legend.replaceChildren();
    this.lines = votedAxes(this.history).map(({ axis, label }) => {
      const color = METER_COLORS[axis];
      const line = svg('polyline', { fill: 'none', stroke: color, 'stroke-width': '3', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }) as SVGPolylineElement;
      this.chart.append(line);
      const key = document.createElement('span'); key.textContent = label; key.style.setProperty('--key', color); this.legend.append(key);
      return { axis, line };
    });
    const total = this.guestCount, window = this.history.length;
    this.heading.textContent = total > window ? `今日の暮らしの声 · 最近の ${window} 件` : '今日の暮らしの声';
    const best = strongestLean(this.history);
    this.lean.textContent = best ? `いちばん多かった声：「${best.word}」寄り ${Math.round(best.share * 100)}%` : '';
  }
  /** Whether the loop should give this run its 声の灯 segment. */
  get ready() { return this.history.length >= MIN_VOICES; }
  /** `t`: seconds into the voices segment, or null outside it. Reduced motion shows the finished card with no replay. */
  update(t: number | null, reduced: boolean) {
    if (t === null || !this.ready) { this.stop(); return; }
    const opacity = voicesCardOpacity(t), shown = reduced ? this.history.length : voicesShown(t, this.history.length);
    this.element.hidden = opacity <= 0;
    this.element.style.opacity = opacity.toFixed(3);
    const landed = Math.min(this.history.length, Math.floor(shown));
    const current = this.history[Math.max(0, Math.min(this.history.length - 1, Math.ceil(shown) - 1))];
    this.counter.textContent = landed === 0 ? '' : `暮らしの声 #${current.ordinal}`;
    for (const { axis, line } of this.lines) line.setAttribute('points', meterPoints(this.history, axis, shown, W, H));
    this.lean.hidden = shown < this.history.length;
    if (!reduced) { this.lanterns?.replayLanterns(this.history, shown); this.playing = true; }
  }
  stop() {
    this.element.hidden = true;
    if (this.playing) { this.lanterns?.endReplay(); this.playing = false; }
  }
}

/** DEV preview: `count` seeded guests through the server's Meter reducer (EXHIBITION_SPEC E4: S += v, R = .75R + .25v, M = clamp(6(S/n + R))). */
export function demoVoices(count: number, seed = 7): VoiceRecord[] {
  let s = seed;
  const random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const axes = ['automation', 'publicSharing', 'urbanConcentration'] as const, sum: Record<string, number> = {}, recent: Record<string, number> = {};
  const lean: Record<string, number> = { automation: .35, publicSharing: .2, urbanConcentration: -.15 };
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1, votes: Record<string, number> = { environmentalPriority: 0 }, afterScores: Record<string, number> = { environmentalPriority: 0 };
    for (const axis of axes) {
      const drift = lean[axis] * Math.cos(n / 9), r = random(), v = r < .33 + drift / 2 ? 1 : r > .67 + drift / 2 ? -1 : 0;
      sum[axis] = (sum[axis] ?? 0) + v; recent[axis] = .75 * (recent[axis] ?? 0) + .25 * v;
      votes[axis] = v; afterScores[axis] = Math.max(-12, Math.min(12, 6 * (sum[axis] / n + recent[axis])));
    }
    return { ordinal: n, votes, afterScores } as unknown as VoiceRecord;
  });
}
