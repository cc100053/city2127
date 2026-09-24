import type { StateName } from './presets';
import type { createWorldState } from './worldState';
export function overlay(choose: (name: StateName) => void) {
  const host = document.createElement('main');
  host.innerHTML = `<header><a class="brand" href="/" aria-label="2127 home"><span class="mark">✳</span><span>2127<span class="brand-sub">TOKYO / CIVIC FUTURES</span></span></a><span class="edition">ONE CROSSING. TWO FUTURES.<br><span>STUDY № 001 — 35°40′ N 139°42′ E</span></span></header>
    <a class="venue-link" href="./odaiba.html">Explore Odaiba ↗</a>
    <section class="intro"><p class="eyebrow">A SMALL PLACE. A BIG DECISION.</p><h1>The same street.<br>A different <em>tomorrow.</em></h1><p class="question">May a perfect future erase<br>an imperfect past?</p></section>
    <aside class="state-label"><span class="state-dot"></span><span id="state-name">DAYLIGHT TOKYO</span><span id="time">12:00</span></aside>
    <section class="verdict" aria-live="polite" aria-atomic="true"><p id="judgment"></p><span id="hold-note"></span></section>
    <footer><span class="footnote">A FROZEN INTERSECTION<br><span>Built once. Three ways to belong.</span></span><div class="choices" role="group" aria-label="Choose a future"><button data-state="neutral" aria-pressed="true"><kbd>0</kbd><span>Daylight<small>The shared city</small></span></button><button data-state="pulse" aria-pressed="false"><kbd>1</kbd><span>Pulse<small>Always awake</small></span></button><button data-state="still" aria-pressed="false"><kbd>2</kbd><span>Still<small>Room to breathe</small></span></button><div class="progress"></div></div><span class="instruction" id="instruction">DRAG TO ORBIT · SCROLL TO ZOOM<br><span>Press 0, 1 or 2</span></span></footer>`;
  document.body.appendChild(host);
  const buttons = Array.from(host.querySelectorAll<HTMLButtonElement>('button'));
  buttons.forEach(button => button.onclick = () => choose(button.dataset.state as StateName));
  window.addEventListener('keydown', event => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    const name = ({ '0':'neutral', '1':'pulse', '2':'still' } as Record<string,StateName>)[event.key];
    if (name) choose(name);
  });
  const names = { neutral:'DAYLIGHT TOKYO', pulse:'PULSE TOKYO', still:'STILL TOKYO' };
  const times = { neutral:'12:00', pulse:'12:00 / ACTIVE', still:'09:00 / CALM' };
  let previous = '';
  return (status: ReturnType<ReturnType<typeof createWorldState>['update']>) => {
    const key = `${status.target}:${status.phase}:${Math.ceil(status.remaining)}`;
    (host.querySelector('.progress') as HTMLElement).style.transform = `scaleX(${status.phase === 'transition' ? status.progress : 0})`;
    if (key === previous) return;
    previous = key;
    document.body.dataset.state = status.target;
    document.body.dataset.phase = status.phase;
    host.querySelector('#state-name')!.textContent = names[status.target];
    host.querySelector('#time')!.textContent = times[status.target];
    host.querySelector('#judgment')!.textContent = status.judgment ? `JUDGMENT: YOU CHOSE ${names[status.target]}` : '';
    host.querySelector('#hold-note')!.textContent = status.judgment ? status.phase === 'hold' ? `A moment to live with your choice. ${Math.ceil(status.remaining)}s` : 'The same crossing. A future chosen by you.' : '';
    host.querySelector('#instruction')!.innerHTML = status.phase === 'transition' ? 'THE CITY IS BECOMING…' : status.phase === 'hold' ? 'LET THE CHOICE SETTLE' : 'DRAG TO ORBIT · SCROLL TO ZOOM<br><span>Press 0, 1 or 2 to choose again</span>';
    buttons.forEach(button => { button.disabled = status.phase !== 'ready'; button.setAttribute('aria-pressed', String(button.dataset.state === status.target)); });
  };
}
