// Close-up review sheet: before/after captures of every tier close-up a guest can trigger, ordered by scripts/closeupFrequencySim.ts.
// Run with a Vite DEV server up: node scripts/closeupSheet.mjs [cityUrl]   (default http://127.0.0.1:5173/)
// Static DEV `?meters=&shot=` frames (slot seed 0, other sites mixed): a triage tool, not the live transition. Energy close-ups are not covered.
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { captureCity, launchBrowser, newCityPage } from './capture.mjs';
import { evidenceDir } from './evidence.mjs';

const city = process.argv[2] ?? 'http://127.0.0.1:5173/', out = evidenceDir('stage-closeups', 'sheet');
const sim = JSON.parse(execFileSync('node', ['--experimental-strip-types', 'scripts/closeupFrequencySim.ts', '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 }));
const share = Object.fromEntries(sim.shots.map(([id, n]) => [id, n / sim.proposals]));
const count = Object.fromEntries(sim.transitions);
const focal = [['nw 0→+1', 'nw:focal'], ['nw 0→-1', 'nw:focal-low'], ['se 0→+1', 'se:focal'], ['se 0→-1', 'se:focal-low'], ['sw 0→+1', 'sw:focal'], ['sw 0→-1', 'sw:focal']];
// Each stage shows the one-rung change that moves most of its slots at seed 0; ties go to the change guests most often see there.
const district = Object.entries(sim.stages).map(([shot, slots]) => {
  const moved = change => slots.filter(slot => sim.seed0[slot]?.includes(change)).length;
  const changes = [...new Set(slots.flatMap(slot => sim.seed0[slot] ?? []))];
  return [changes.reduce((a, b) => (moved(b) - moved(a) || (count[`${b} | ${shot}`] ?? 0) - (count[`${a} | ${shot}`] ?? 0)) > 0 ? b : a), shot];
});
const RUNG_SCORE = { '-3': -8, '-2': -5, '-1': -2, '0': 0, '+1': 2, '+2': 5, '+3': 8 };
const rows = [...focal, ...district].map(([change, shot]) => {
  const [site, steps] = change.split(' '), [from, to] = steps.split('→');
  return { shot, site, from, to, share: share[shot] ?? 0 };
}).sort((a, b) => b.share - a.share);
const name = (shot, tier, hour) => `${shot.replace(':', '-')}__${tier}__h${hour}.jpg`;
const jobs = [...new Map(rows.flatMap(r => [12, 22].flatMap(hour => [r.from, r.to].map(tier =>
  [name(r.shot, tier, hour), { file: name(r.shot, tier, hour), shot: r.shot, meters: `${r.site}:${RUNG_SCORE[tier]}`, hour }])))).values()]
  .filter(job => !existsSync(`${out}/${job.file}`));

const browser = await launchBrowser();
const errors = [];
await Promise.all(Array.from({ length: 3 }, async () => {
  const page = await newCityPage(browser, { width: 1600, height: 900 }, errors);
  for (let job; (job = jobs.shift());) {
    const url = new URL(city); url.search = new URLSearchParams({ reviewTime: '20', hour: String(job.hour), meters: job.meters, shot: job.shot });
    await captureCity(page, url.href, `${out}/${job.file}`);
    console.log(job.file);
  }
}));
await browser.close();

const pct = n => `${(100 * n).toFixed(1)}%`;
const figure = (r, hour) => `<div class="pair"><div><img src="${name(r.shot, r.from, hour)}" loading="lazy"><p>${r.from}（${hour}:00）</p></div><div><img src="${name(r.shot, r.to, hour)}" loading="lazy"><p>${r.to}（${hour}:00）</p></div></div>`;
writeFileSync(`${out}/rows.json`, JSON.stringify(rows, null, 1));
writeFileSync(`${out}/index.html`, `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>Close-up review sheet</title>
<style>body{font:14px system-ui,sans-serif;margin:16px;background:#111;color:#eee}figure{margin:0 0 28px}figcaption{font-size:16px;margin-bottom:6px}small{color:#9ab}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}.pair img{width:100%;display:block}.pair p{margin:2px 0 0;color:#9ab}</style>
<h1>近鏡對照表（按頻率排序）</h1>
<p>${sim.proposals} 份模擬提案；百分比係該鏡頭佔全部提案嘅比例（偏向型模擬，唔係真人數據）。靜態 DEV 畫面，slot seed 0，其他 site 喺 0；能源近鏡未包括。</p>
${rows.map((r, i) => `<figure><figcaption>${i + 1}. <b>${r.shot}</b> ${r.site} ${r.from} → ${r.to} <small>${pct(r.share)}</small></figcaption>${figure(r, 12)}${figure(r, 22)}</figure>`).join('\n')}
</html>`);
console.log(`${rows.length} rows → ${out}/index.html; page errors: ${errors.length}`);
if (errors.length) console.log([...new Set(errors)].join('\n'));
