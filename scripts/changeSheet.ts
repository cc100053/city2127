// Change review sheet for the owner: per change unit, which choice pushes it, what the result card says, what the building does, before/after frames, and the resident scene.
// Nothing is typed here twice: status and residents come from docs/RESIDENT_SCENE_PLAN.md, copy from src/surveyAtmosphere.ts, options from the live question set, frames from scripts/closeupSheet.mjs.
// Run: node --experimental-strip-types scripts/changeSheet.ts   (re-run closeupSheet.mjs first when a model or camera changed)
// Writes artifacts/change-review/ (committed): index.html and 960 px copies of the frames, refreshed only when the evidence frame is newer.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evidenceRoot } from './evidence.mjs';
import { RESIDENT_CARDS, residentResult } from '../src/surveyAtmosphere.ts';

type Row = { shot: string; site: 'nw' | 'sw' | 'se' | 'ne'; from: string; to: string; share: number };
const SITES = {
  nw: { question: 'service-2127', cards: ['service.human', 'service.hybrid', 'service.autonomous'] },
  sw: { question: 'commons-2127', cards: ['commons.private', 'commons.hybrid', 'commons.open'] },
  ne: { question: 'cooling-2127', cards: ['climate.equipment', 'climate.hybrid', 'climate.canopy'] },
  se: { question: 'functions-2127', cards: ['functions.distributed', 'functions.hybrid', 'functions.vertical'] },
} as const;
/** `plan`: start of the unit's first cell in the plan table; `shots`: which close-ups belong to it; `resident`: the plan's resident heading. */
const UNITS = [
  { plan: 'NW focal', shots: /^nw:focal/, resident: 'デックス西' },
  { plan: 'NW bays', shots: /^nw:(stage|district)/ },
  { plan: 'SE focal', shots: /^se:focal/, resident: 'フジテレビ東' },
  { plan: 'SE 塔', shots: /^se:(stage|district)/ },
  { plan: 'SW rooms', shots: /^sw:stage-rooms/ },
  { plan: 'SW focal', shots: /^sw:focal/, resident: 'お台場南岸' },
  { plan: 'SW courts', shots: /^sw:(stage-courts|district)/ },
  { plan: '能源', shots: /^energy:/, resident: '葵' },
];

const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
/** Plan cell → HTML: links become their text, bold and code are kept. */
const md = (s: string) => esc(s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
const cells = (line: string) => line.split('|').slice(1, -1).map(c => c.trim());
/** Body rows of the first Markdown table after `heading`. */
function table(text: string, heading: string) {
  const at = text.indexOf(heading);
  if (at < 0) throw new Error(`RESIDENT_SCENE_PLAN has no "${heading}"`);
  const lines = text.slice(at).split('\n').slice(1), start = lines.findIndex(l => l.startsWith('|'));
  const end = lines.findIndex((l, i) => i > start && !l.startsWith('|'));
  return lines.slice(start + 2, end < 0 ? undefined : end).map(cells);
}

const plan = readFileSync('docs/RESIDENT_SCENE_PLAN.md', 'utf8');
const questions: { id: string; text: string; options: { id: string; label: string; effects?: Record<string, number> }[] }[] = JSON.parse(readFileSync('survey/src/survey/questions.exhibition.json', 'utf8')).questions;
const question = (id: string) => { const q = questions.find(q => q.id === id); if (!q) throw new Error(`question set has no ${id}`); return q; };
const frames = join(evidenceRoot, 'stage-closeups', 'sheet'), OUT = 'artifacts/change-review';
mkdirSync(join(OUT, 'frames'), { recursive: true });
// rows.json is committed beside the sheet, so a checkout without the evidence folder can still regenerate the text.
if (existsSync(join(frames, 'rows.json'))) writeFileSync(join(OUT, 'rows.json'), readFileSync(join(frames, 'rows.json')));
const rows: Row[] = existsSync(join(OUT, 'rows.json')) ? JSON.parse(readFileSync(join(OUT, 'rows.json'), 'utf8')) : [];
const unitRows = table(plan, '## 變化單位總表');
const band = (tier: string) => Number(tier) > 0 ? 2 : Number(tier) < 0 ? 0 : 1;
let copied = 0;
function img(r: Row, tier: string, hour: number) {
  const name = `${r.shot.replace(':', '-')}__${tier}__h${hour}.jpg`, src = join(frames, name), dest = join(OUT, 'frames', name);
  if (existsSync(src) && (!existsSync(dest) || statSync(src).mtimeMs > statSync(dest).mtimeMs)) {
    execFileSync('sips', ['-Z', '960', '-s', 'format', 'jpeg', '-s', 'formatOptions', '75', src, '--out', dest], { stdio: 'ignore' }); // macOS built-in; the frames only exist on the owner's Mac
    copied++;
  }
  return `<figure><img loading="lazy" src="frames/${name}"><figcaption>${tier}（${hour}:00）</figcaption></figure>`;
}

function change(r: Row) {
  const site = SITES[r.site], q = question(site.question), up = Number(r.to) > Number(r.from);
  const option = q.options.find(o => Math.sign(Object.values(o.effects ?? {})[0] ?? 0) === (up ? 1 : -1));
  if (!option) throw new Error(`${q.id} has no option pushing ${up ? '+' : '-'}`);
  const focal = r.shot.includes('focal'), b = ['low', 'mixed', 'high'][band(r.to)];
  // The result card's own function, fed the smallest proposal that shows this change.
  const result = residentResult({
    answers: [{ questionId: q.id, optionId: option.id }], votes: {},
    beforeLayout: { automatedPorts: 3, sharedSeats: [0, 4, 8][band(r.from)], treeCount: 4, coolingFins: 4, bands: { [r.site]: ['low', 'mixed', 'high'][band(r.from)] } },
    afterLayout: { automatedPorts: up ? 6 : 0, sharedSeats: [0, 4, 8][band(r.to)], treeCount: up ? 8 : 4, coolingFins: up ? 4 : 8, bands: { [r.site]: b } },
  } as never, [{ socketId: r.site, focal, district: !focal }] as never);
  const card = RESIDENT_CARDS[site.cards[band(r.to)]];
  return `<section class="change"><h3>${r.site.toUpperCase()} ${r.from} → ${r.to} <small>${esc(r.shot)}，佔全部提案 ${(100 * r.share).toFixed(1)}%</small></h3>
<div class="cols"><dl>
<dt>哪項選擇推向這一邊</dt><dd>${esc(q.text)}<br><b>「${esc(option.label)}」</b></dd>
<dt>結果卡第一句（guest 的選擇）</dt><dd>${esc(result.preference)}</dd>
<dt>結果卡第二句（變化說明）</dt><dd>${esc(result.effect)}<br><small>地點標示：${esc(result.place)}</small></dd>
<dt>變化後這裏的功能（設施卡）</dt><dd><b>${esc(card[0])}</b><br>${esc(card[1])}</dd>
</dl><div class="frames">${[12, 22].map(h => img(r, r.from, h) + img(r, r.to, h)).join('')}</div></div></section>`;
}

const units = UNITS.map(u => {
  const row = unitRows.find(c => c[0].startsWith(u.plan));
  if (!row) throw new Error(`RESIDENT_SCENE_PLAN unit table has no row starting "${u.plan}"`);
  const mine = rows.filter(r => u.shots.test(r.shot));
  const resident = u.resident ? plan.split('\n').find(l => l.startsWith('### ') && l.includes(u.resident)) : undefined;
  if (u.resident && !resident) throw new Error(`RESIDENT_SCENE_PLAN has no resident heading with "${u.resident}"`);
  const story = resident ? `<h3>階段 2：${md(resident.replace(/^### \d+\. /, ''))}</h3><table><tr><th>實際變化</th><th>台詞（字幕）</th><th>行動</th><th>得／失</th></tr>${table(plan, resident).map(c => `<tr>${c.map(x => `<td>${md(x)}</td>`).join('')}</tr>`).join('')}</table>` : '';
  const energy = u.plan === '能源' ? `<section class="change"><dl><dt>相關選擇</dt><dd>${esc(question('energy-2127').text)}${question('energy-2127').options.map(o => `<br><b>「${esc(o.label)}」</b>`).join('')}</dd>
<dt>這些設施的功能（設施卡）</dt><dd>${['energy.water', 'energy.rotor', 'energy.orbital', 'energy.rectenna', 'energy.island'].map(id => `<b>${esc(RESIDENT_CARDS[id][0])}</b><br>${esc(RESIDENT_CARDS[id][1])}`).join('<br>')}</dd></dl></section>
<section class="change" id="rectenna-farm">
<h3>陸上農園 — 受電テラス農園 R3 <small>建築已驗收 · Meter 觸發計法待調整</small></h3>
<p>台場南岸的虹彩六角天幕接收軌道電力，坡道把公共步道、菜床及退台連在一起。故事設定見<a href="../../docs/BUILDING_STORIES.md#rectenna-farm">天氣圖書館</a>。以下為 R3 已驗收配置的靜態實景。</p>
<div class="frames">
<figure><img loading="lazy" src="rectenna-r3/focal-day.jpg" alt="日間的陸上農園全景"><figcaption>日景｜六角受電天幕覆蓋同心退台</figcaption></figure>
<figure><img loading="lazy" src="rectenna-r3/focal-night.jpg" alt="入夜後的陸上農園全景"><figcaption>夜景｜從南岸看夜色中的天幕與農園</figcaption></figure>
<figure><img loading="lazy" src="rectenna-r3/access.jpg" alt="從西入口步道仰望農園的退台"><figcaption>西入口 R3｜當時的露天菜床與坡道</figcaption></figure>
</div>
<h3>葵與西入口 R2 <small>居民段落為 DEV 實景 · 待驗收</small></h3>
<p><a href="../resident-aoi/r2/entrance-comparison.jpg">R1／R2 同鏡頭與俯視對照</a> · <a href="../resident-aoi/r2/entrance-target-comparison.jpg">Gemini 目標圖與 R2 實景</a></p>
<div class="frames">
<figure><img loading="lazy" src="../resident-aoi/r2/west-entrance.jpg" alt="城市步道旁的碎石支路及取苗架"><figcaption>西入口｜步道、取苗架與坡道</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/r2/entrance-plan.jpg" alt="鳥瞰步道到西坡道的接駁"><figcaption>俯視｜支路從既有步道分出</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/r2/ramp-detail.jpg" alt="從碎石前地看西側坡道的入口"><figcaption>坡道口｜碎石接到坡道底端，外圈菜槽橫跨坡道</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/palm.jpg" alt="葵在菜畦旁攤開手掌"><figcaption>菜畦｜葵攤開手中的種子</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/seed-drop.jpg" alt="種子從葵掌心落向菜畦"><figcaption>落種｜鏡頭推近看手勢</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/weather-cell.jpg" alt="天幕一格轉青，薄霧落在菜畦"><figcaption>天氣圖書館｜一格天幕、一畦霧</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/night.jpg" alt="葵在入夜後的菜畦及薄霧旁"><figcaption>夜景｜菜畦局部起霧</figcaption></figure>
</div></section>` : '';
  return { row, html: `<article id="${esc(u.plan)}"><h2>${md(row[0])} <small>${md(row[1])}</small></h2>
<table class="status"><tr><th>階段 1：建築／變化</th><th>階段 2：居民情景</th><th>下一步</th></tr><tr>${row.slice(2, 5).map(c => `<td>${md(c)}</td>`).join('')}</tr></table>
<p class="intro">${md(row[5])}</p>
${mine.map(change).join('\n')}${energy}${mine.length || energy ? '' : '<p><small>尚無前後對照截圖：請先執行 scripts/closeupSheet.mjs。</small></p>'}${story}</article>` };
});

const out = join(OUT, 'index.html');
writeFileSync(out, `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>變化總覽 — city2127</title>
<style>body{font:15px/1.6 system-ui,"Noto Sans JP",sans-serif;margin:24px auto;max-width:1500px;padding:0 20px;background:#f4f3ee;color:#222}
h1{font-size:26px}h2{font-size:21px;margin:0 0 8px}h3{font-size:16px;margin:18px 0 6px}small{color:#667;font-weight:400}code{background:#e6e4da;padding:0 4px;border-radius:3px}
article{background:#fff;border-radius:10px;padding:18px 22px;margin:22px 0;box-shadow:0 1px 4px #0002}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #d6d4c8;padding:6px 9px;text-align:left;vertical-align:top}th{background:#eceadf;font-weight:600}
.change{border-top:1px solid #e2e0d4;margin-top:16px}.cols{display:grid;grid-template-columns:minmax(300px,2fr) 3fr;gap:20px}
dt{color:#667;font-size:13px;margin-top:8px}dd{margin:0}.frames{display:grid;grid-template-columns:1fr 1fr;gap:6px;align-content:start}
p.intro{background:#f4f3ee;border-radius:6px;padding:8px 12px;margin:10px 0}figure{margin:0}figure img{width:100%;display:block;border-radius:4px;background:#ddd}figcaption{font-size:12px;color:#667}</style>
<h1>變化總覽：選擇 → 變化 → 建築 → 居民</h1>
<p>生成：${new Date().toISOString().slice(0, 10)}，<code>scripts/changeSheet.ts</code>。狀態、居民與建築介紹來自 RESIDENT_SCENE_PLAN，日文文案來自結果卡與設施卡的程式，選項來自正式問卷。截圖為靜態 DEV 畫面，取自 <code>scripts/closeupSheet.mjs</code> 或個別建築驗收紀錄。佔比為模擬數字，並非真人數據。</p>
<p><b>變化成因：</b>每位 guest 回答四題，每個選項將對應軸的 Meter 推 −1、0 或 +1。Meter 是所有人累積的結果；每份提案最多令一個地點前進一級，並優先採用 guest 自己推動的方向。因此 guest 的選擇不一定等於本次的變化方向，結果卡第二句一律說明實際變化。</p>
<table><tr><th>單位</th><th>佔比</th><th>階段 1：建築／變化</th><th>階段 2：居民情景</th><th>下一步</th></tr>
${units.map((u, i) => `<tr><td><a href="#${esc(UNITS[i].plan)}">${md(u.row[0])}</a></td>${u.row.slice(1, 5).map(c => `<td>${md(c)}</td>`).join('')}</tr>`).join('\n')}</table>
${units.map(u => u.html).join('\n')}
</html>`);
const loose = rows.filter(r => !UNITS.some(u => u.shots.test(r.shot)));
console.log(`${units.length} units, ${rows.length} change rows, ${copied} frames refreshed → ${out}${loose.length ? `; rows in no unit: ${loose.map(r => r.shot).join(', ')}` : ''}`);
