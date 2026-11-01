// DEV-only `?seTransition` (`&hour=22` for night): replays just the SE focal change on a scrubbable clock, camera held on the SE close-up.
import type { CityChangeManager } from './cityChangeManager.ts';
import { devLayout } from './devMeters.ts';
import type { ShotId } from './headlineCamera.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';

const RUNGS = [['-2.5', '−1 低層'], ['0', '0 混在'], ['2.5', '+1 タワー']] as const;
const END = SITE_TRANSITION_SECONDS + .5;

/** Builds the panel and returns the clock the frame loop renders: each replay starts a fresh base, so scrubbing back re-reads the same change. */
export function startSeTransition(changes: CityChangeManager, shot: (id: ShotId) => void): () => number {
  let from = '-2.5', to = '0', base = 0, t = 0, speed = .5, playing = false, last = performance.now();
  document.querySelectorAll<HTMLElement>('body > main').forEach(host => { host.style.display = 'none'; });

  const panel = document.createElement('section');
  panel.setAttribute('aria-label', 'SE 転換デバッグ');
  panel.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:10;padding:12px 14px;background:rgba(18,24,30,.82);color:#f3efe6;font:13px/1.5 system-ui,sans-serif;border-radius:8px;display:grid;gap:8px;min-width:340px';
  const row = (label: string, ...children: HTMLElement[]) => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:6px;align-items:center';
    const span = document.createElement('span');
    span.textContent = label;
    span.style.minWidth = '4.5em';
    div.append(span, ...children);
    return div;
  };
  const button = (text: string, onClick: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  };
  const choices = (pick: (value: string) => void) => RUNGS.map(([value, text]) => {
    const b = button(text, () => { pick(value); load(); });
    b.dataset.value = value;
    return b;
  });
  const fromButtons = choices(value => { from = value; });
  const toButtons = choices(value => { to = value; });
  const slider = document.createElement('input');
  Object.assign(slider, { type: 'range', min: '0', max: String(END), step: '0.01', value: '0' });
  slider.setAttribute('aria-label', '転換の経過時間');
  slider.style.flex = '1';
  const readout = document.createElement('output');
  readout.style.cssText = 'min-width:7em;text-align:right;font-variant-numeric:tabular-nums';
  const play = button('▶ 再生', () => {
    if (!playing && t >= END) t = 0;
    playing = !playing;
    sync();
  });
  const speedSelect = document.createElement('select');
  speedSelect.setAttribute('aria-label', '再生速度');
  for (const value of [.25, .5, 1]) speedSelect.append(new Option(`${value}×`, String(value), false, value === speed));
  speedSelect.addEventListener('change', () => { speed = Number(speedSelect.value); });
  slider.addEventListener('input', () => { playing = false; t = Number(slider.value); sync(); });
  const title = document.createElement('strong');
  title.textContent = 'SE 転換デバッグ';
  panel.append(title, row('変化前', ...fromButtons), row('変化後', ...toButtons), row('時間', slider, readout), row('', play, speedSelect, button('最初から', () => { t = 0; playing = true; sync(); })));
  document.body.append(panel);

  function sync() {
    slider.value = String(t);
    readout.value = `${Math.min(t, SITE_TRANSITION_SECONDS).toFixed(2)} / ${SITE_TRANSITION_SECONDS.toFixed(2)} s`;
    play.textContent = playing ? '⏸ 一時停止' : '▶ 再生';
    for (const [buttons, value] of [[fromButtons, from], [toButtons, to]] as const) for (const b of buttons) {
      b.setAttribute('aria-pressed', String(b.dataset.value === value));
      b.style.background = b.dataset.value === value ? '#ff9a2e' : '';
    }
  }

  // The before state lands as a snapshot one second ahead of the change, which then starts at `base`.
  function load() {
    base += 1000;
    changes.applyExhibitionLayout(devLayout(`se:${from}`), 'city-state-snapshot', base - 1);
    changes.applyExhibitionLayout(devLayout(`se:${to}`), 'city-state-updated', base, undefined, base - 1);
    shot(from === '-2.5' || to === '-2.5' ? 'se:focal-low' : 'se:focal');
    t = 0;
    playing = false;
    sync();
  }
  load();

  return () => {
    const n = performance.now();
    if (playing) {
      t = Math.min(END, t + (n - last) / 1000 * speed);
      playing = t < END;
      sync();
    }
    last = n;
    return base + t;
  };
}
