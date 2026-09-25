export function overlay() {
  const host = document.createElement('main');
  host.innerHTML = `<header><a class="brand" href="/" aria-label="2127 home"><span class="mark">✳</span><span>2127<span class="brand-sub">TOKYO / CIVIC FUTURES</span></span></a><span class="edition">ONE CROSSING. TWO FUTURES.<br><span>STUDY № 001 — 35°40′ N 139°42′ E</span></span></header>
    <section class="intro"><p class="eyebrow">A SMALL PLACE. A BIG DECISION.</p><h1>The same street.<br>A different <em>tomorrow.</em></h1><p class="question">May a perfect future erase<br>an imperfect past?</p></section>
    <aside class="state-label"><span class="state-dot"></span><span id="state-name">DAYLIGHT TOKYO</span><span id="time">12:00</span></aside>
    <footer><span class="footnote">A FROZEN INTERSECTION<br><span>Built once. One day at a time.</span></span><span class="instruction">DRAG TO ORBIT · SCROLL TO ZOOM<br><span>One city day passes every three minutes</span></span></footer>`;
  document.body.appendChild(host);
  const name = host.querySelector('#state-name')!, time = host.querySelector('#time')!;
  let previous = '';
  return (hour: number, night: boolean) => {
    const clock = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor(hour % 1 * 60)).padStart(2, '0')}`;
    if (clock === previous) return;
    previous = clock;
    document.body.dataset.time = night ? 'night' : 'day';
    name.textContent = hour >= 5 && hour < 10 ? 'STILL TOKYO' : hour >= 10 && hour < 19.5 ? 'DAYLIGHT TOKYO' : 'PULSE TOKYO';
    time.textContent = clock;
  };
}
