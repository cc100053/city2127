// Change review sheet for the owner, rotation question set: per question and option (27 building versions), the model, its lot and
// status, what the result card says, the facility card, live result frames and the resident scene.
// Nothing is typed here twice: questions, models and lots come from survey/src/survey/questions.rotation.v1.json, status from the
// docs/QUESTION_ROTATION_PLAN.md section 2 table, residents from docs/RESIDENT_SCENE_PLAN.md, copy from src/surveyAtmosphere.ts.
// Run: node --experimental-strip-types scripts/changeSheet.ts   (Q01 frames: re-run closeupSheet.mjs first when its model or camera changed)
// Writes artifacts/change-review/ (committed): index.html and 960 px JPEG copies of the frames, refreshed only when the evidence frame is newer.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evidenceRoot } from './evidence.mjs';
import { RESIDENT_CARDS, residentResult } from '../src/surveyAtmosphere.ts';
import { CROWD_SHARE_MIN_VOTES, DRAW_COUNT, type RotationSet } from '../survey/src/shared/rotation.ts';

const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
/** Plan cell → HTML: links become their text, bold and code are kept. */
const md = (s: string) => esc(s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
const cells = (line: string) => line.split('|').slice(1, -1).map(c => c.trim());
/** Body rows of the first Markdown table after `heading`. */
function table(text: string, heading: string, file: string) {
  const at = text.indexOf(heading);
  if (at < 0) throw new Error(`${file} has no "${heading}"`);
  const lines = text.slice(at).split('\n').slice(1), start = lines.findIndex(l => l.startsWith('|'));
  const end = lines.findIndex((l, i) => i > start && !l.startsWith('|'));
  return lines.slice(start + 2, end < 0 ? undefined : end).map(cells);
}

const rotationPlan = readFileSync('docs/QUESTION_ROTATION_PLAN.md', 'utf8');
const residentPlan = readFileSync('docs/RESIDENT_SCENE_PLAN.md', 'utf8');
const set: RotationSet = JSON.parse(readFileSync('survey/src/survey/questions.rotation.v1.json', 'utf8'));
const planRows = table(rotationPlan, '## 2. 總表', 'QUESTION_ROTATION_PLAN');
const otherAssets = table(rotationPlan, '### 不在新題組內的現有資產', 'QUESTION_ROTATION_PLAN');
const unitRows = table(residentPlan, '## 變化單位總表', 'RESIDENT_SCENE_PLAN');
const OPTIONS = ['A', 'B', 'C'];

const OUT = 'artifacts/change-review', closeups = join(evidenceRoot, 'stage-closeups', 'sheet'), live = join(evidenceRoot, 'question-rotation');
mkdirSync(join(OUT, 'rotation'), { recursive: true });
let copied = 0;
/** Copies an evidence frame to `dest` (under OUT) as a 960 px JPEG when newer; true when the committed copy exists. */
function frame(src: string, dest: string) {
  const out = join(OUT, dest);
  if (existsSync(src) && (!existsSync(out) || statSync(src).mtimeMs > statSync(out).mtimeMs)) {
    execFileSync('sips', ['-Z', '960', '-s', 'format', 'jpeg', '-s', 'formatOptions', '75', src, '--out', out], { stdio: 'ignore' }); // macOS built-in; the frames only exist on the owner's Mac
    copied++;
  }
  return existsSync(out);
}
const figure = (src: string, caption: string, alt: string) => `<figure><img loading="lazy" src="${src}" alt="${esc(alt)}"><figcaption>${esc(caption)}</figcaption></figure>`;

/** Q01 shows the NW focal close-ups; Q02/Q03/Q06 show the live result ≈10 s after the swap. */
const Q01_TIERS: Record<string, string> = { A: 'nw-focal-low__-1', B: 'nw-focal__0', C: 'nw-focal__+1' };
const LIVE: Record<string, (option: string) => [day: string, night: string]> = {
  Q02: o => [`q02-closeup/to-${o}-10s.png`, `q02-closeup/night-to-${o}-10s.png`],
  Q03: o => [`q03-drawer/day/to-${o}-10s.png`, `q03-drawer/night/night-to-${o}-10s.png`],
  Q06: o => [`q06-access/live-day/to-${o}-10s.png`, `q06-access/live-night/to-${o}-10s.png`],
};
function frames(question: string, option: string, label: string) {
  if (question === 'Q01') return [12, 22].map(h => {
    const name = `${Q01_TIERS[option]}__h${h}.jpg`;
    return frame(join(closeups, name), join('frames', name)) ? figure(`frames/${name}`, `近鏡（${h}:00）`, `${label}，${h}:00 近鏡`) : '';
  }).join('');
  const snapshot = question === 'Q08';
  const sources = snapshot ? [`q08-access/snapshots/${option}-day.png`, `q08-access/snapshots/${option}-night.png`] : LIVE[question]?.(option);
  if (!sources) return '';
  return sources.map((src, i) => {
    const dest = `rotation/${question}-${option}-${i ? 'night' : 'day'}.jpg`;
    const light = i ? '夜' : '日';
    const caption = snapshot ? `落定地塊（${light}景）` : `實時結果（${light}，換入後約 10 秒）`;
    return frame(join(live, src), dest) ? figure(dest, caption, `${label}，${light}景`) : '';
  }).join('');
}

/** The result card's own function, fed a one-swap rotation proposal (no crowd share: the card adds that line from live tallies). */
const BASE_LAYOUT = { bands: { nw: 'mixed', sw: 'mixed', ne: 'mixed', se: 'mixed' }, tiers: { nw: 0, sw: 0, ne: 0, se: 0 }, automatedPorts: 3, sharedSeats: 4, treeCount: 4, coolingFins: 4 };
function resultCard(questionId: string, from: string, to: string) {
  return residentResult({
    answers: [{ questionId, optionId: to }], votes: {}, rotation: { outcome: { kind: 'swap', questionId, from, to }, shares: [] },
    beforeLayout: BASE_LAYOUT, afterLayout: BASE_LAYOUT,
  } as never, questionId === 'Q01' ? [{ socketId: 'nw', focal: true, district: false }] as never : undefined);
}
/** Facility cards that exist for a rotation version; the rest wait for plan step 5.3. */
const FACILITY: Record<string, string> = { 'Q01-A': 'service.human', 'Q01-B': 'service.hybrid', 'Q01-C': 'service.autonomous', 'Q02-C': 'energy.rectenna', 'Q08-C': 'commons.hybrid' };
/** Residents per plan section 2 「居民對應」: version → [RESIDENT_SCENE_PLAN unit row, resident heading]. */
const RESIDENTS: Record<string, readonly [string, string]> = { Q01: ['NW focal', 'デックス西'], 'Q02-C': ['能源', '受電テラス農園'], 'Q08-C': ['SW focal', 'お台場南岸'] };
function resident(key: string) {
  const r = RESIDENTS[key];
  if (!r) return '';
  const unit = unitRows.find(c => c[0].startsWith(r[0])), heading = residentPlan.split('\n').find(l => l.startsWith('### ') && l.includes(r[1]));
  if (!unit || !heading) throw new Error(`RESIDENT_SCENE_PLAN has no unit "${r[0]}" or resident "${r[1]}"`);
  return `<h4>居民情景：${md(heading.replace(/^### \d+\. /, ''))}</h4><p><small>狀態：${md(unit[3])}；下一步：${md(unit[4])}</small></p>
<table><tr><th>實際變化</th><th>台詞（字幕）</th><th>行動</th><th>得／失</th></tr>${table(residentPlan, heading, 'RESIDENT_SCENE_PLAN').map(c => `<tr>${c.map(x => `<td>${md(x)}</td>`).join('')}</tr>`).join('')}</table>`;
}

// Owner-accepted building records kept from earlier rounds, now shown under the version they belong to.
const EXTRA: Record<string, string> = {
  'Q02-C': `<h4>受電テラス農園 R3 實景 <small>建築已驗收</small></h4>
<p>台場南岸的虹彩六角天幕接收軌道電力，坡道把公共步道、菜床及退台連在一起。故事設定見<a href="../../docs/BUILDING_STORIES.md#rectenna-farm">天氣圖書館</a>。</p>
<div class="frames">
<figure><img loading="lazy" src="rectenna-r3/focal-day.jpg" alt="日間的陸上農園全景"><figcaption>日景｜六角受電天幕覆蓋同心退台</figcaption></figure>
<figure><img loading="lazy" src="rectenna-r3/focal-night.jpg" alt="入夜後的陸上農園全景"><figcaption>夜景｜從南岸看夜色中的天幕與農園</figcaption></figure>
<figure><img loading="lazy" src="rectenna-r3/access.jpg" alt="從西入口步道仰望農園的退台"><figcaption>西入口 R3｜當時的露天菜床與坡道</figcaption></figure>
</div>
<h4>葵與西坡道 R3 <small>居民段落為 DEV 實景</small></h4>
<p>碎石前地接上原西坡道。兩條行走帶上坡後匯入水平平台，再轉入露台內的走道。<a href="../resident-aoi/r2/entrance-target-comparison.jpg">Gemini 目標圖與 R2 實景</a></p>
<div class="frames">
<figure><img loading="lazy" src="../resident-aoi/r3/west-before.jpg" alt="修改前的西坡道被外圈菜槽擋住"><figcaption>同鏡頭・修改前｜外圈底板及菜槽橫跨入口</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/r3/west-after.jpg" alt="修改後的西坡道接上碎石前地"><figcaption>同鏡頭・修改後｜打開外圈底板及菜槽</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/r3/ramp-walk.jpg" alt="沿兩條行走帶由碎石前地望向露台"><figcaption>行人視角｜碎石接縫與原有欄杆</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/r3/ramp-plan.jpg" alt="天幕下俯視西坡道及露台出口"><figcaption>俯視｜兩條行走帶通往水平平台</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/r3/terrace-landing.jpg" alt="西坡道頂部的平台、欄杆和露台走道"><figcaption>上端｜沿平台側面轉入露台</figcaption></figure>
</div>
<h4>葵借回那一天的陽光 <small>DEV 演示</small></h4>
<p>細小的種子散落後，鏡頭拉遠。一格六角板亮起，暖光從板下射向原有菜畦。以下定格隱藏字幕，後兩張用同一鏡頭對照菜畦與鄰樹。</p>
<div class="frames">
<figure><img loading="lazy" src="../resident-aoi/pullback/palm.jpg" alt="葵攤開掌心托住舊種子"><figcaption>掌心｜葵托起種子</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/pullback/seed-drop.jpg" alt="一撮細種子散開落向菜畦邊"><figcaption>落種｜細粒散開落向菜畦</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/pullback/sun-before.jpg" alt="天幕未啟用時，菜畦和鄰樹同在自然光下"><figcaption>同鏡頭・亮板前｜菜畦及鄰樹</figcaption></figure>
<figure><img loading="lazy" src="../resident-aoi/pullback/sun-after.jpg" alt="暖光從單格六角板射向菜畦，鄰樹留在自然光下"><figcaption>同鏡頭・亮板後｜本畦復現暖斜陽</figcaption></figure>
</div>`,
  'Q03-A': `<h4 id="drawer-housing">車が引き出しになる住宅 R2 實景 <small>建築已驗收</small></h4>
<p>フジテレビ西南側。兩個共用載車艙把小車升到住戶樓層，像抽屜一樣推入外牆泊位。住宅與西側梯田巨構相隔 15.9 m。沿立面的暖米色車道從右側繞入樓隙，經背面成環，並接入導軌大道 ②；住宅淡出時環道保留。</p>
<p lang="ja">満潮で低い道が水に戻るころ、佐伯澪さんの車は外壁の引き出しに収まり、工具が三階の作業台に届きます。地上を歩く場所にしたぶん、住民は二つの昇降台を順番に使います。</p>
<p><a href="../../docs/BUILDING_STORIES.md#drawer-housing">佐伯澪的故事</a> · <a href="../../docs/handoffs/archive/drawer-housing-placement.md">地塊座標與驗證</a></p>
<div class="frames">
<figure><img loading="lazy" src="drawer-housing/gemini-target.jpg" alt="目標圖中的貼樓暖色車道、右側彎道和前方步道"><figcaption>Gemini 目標｜貼樓車道及右側彎道</figcaption></figure>
<figure><img loading="lazy" src="drawer-housing/vs-target.jpg" alt="同角度比較 Gemini 目標、R1 的 T 字前場和 R2 的貼樓環道"><figcaption>同角度｜Gemini、R1、R2</figcaption></figure>
<figure><img loading="lazy" src="drawer-housing/day.jpg" alt="日間近鏡可見兩個外伸載車艙、沿立面的陶板帶及右側彎路"><figcaption>R2 日景｜從前立面繞往樓隙</figcaption></figure>
<figure><img loading="lazy" src="drawer-housing/night.jpg" alt="同一角度的夜景，導光線沿彎道延伸"><figcaption>R2 夜景｜環道導光</figcaption></figure>
<figure><img loading="lazy" src="drawer-housing/plan.jpg" alt="俯視可見完整環道與接入導軌大道的支路"><figcaption>R2 接駁俯視｜與大道相通的環道</figcaption></figure>
<figure><img loading="lazy" src="drawer-housing/hero.jpg" alt="住宅位於城市主視角富士框架右下方"><figcaption>城市主視角｜富士框架右下方</figcaption></figure>
</div>`,
};

/** A version's kind, from the question set alone. */
const kind = (o: { modelId: string | null; lotId: string | null }) => o.modelId ? '有模型' : o.lotId ? '空置（地塊已定）' : '未有模型及地塊';
const versions = set.questions.flatMap(q => q.options.map(o => ({ q, o })));
if (set.questions.some(q => q.options.map(o => o.id).join() !== OPTIONS.join())) throw new Error('every rotation question needs options A, B, C');

const articles = set.questions.map(q => {
  const row = planRows.find(c => c[0] === q.id);
  if (!row) throw new Error(`QUESTION_ROTATION_PLAN section 2 has no row for ${q.id}`);
  const wired = q.options.some(o => o.modelId);
  const options = q.options.map((o, i) => {
    const key = `${q.id}-${o.id}`, label = `${key}「${o.label}」`;
    const cards = wired ? q.options.filter(f => f.id !== o.id).map(f => {
      const r = resultCard(q.id, f.id, o.id);
      return `<dt>由 ${f.id} 換入：結果卡</dt><dd>${esc(r.preference)}<br>${esc(r.effect)}<br><small>地點標示：${esc(r.place)}</small></dd>`;
    }).join('') : '<dt>結果卡</dt><dd><small>此題尚未有輪換模型，城市用探訪或構想地。</small></dd>';
    const card = FACILITY[key] ? RESIDENT_CARDS[FACILITY[key]] : undefined;
    const shots = frames(q.id, o.id, label);
    return `<section class="change" id="${key}"><h3>${key} <small>${esc(kind(o))}${o.id === q.initial ? '，起始版本（暫定）' : ''}</small></h3>
<div class="cols"><dl>
<dt>選項</dt><dd><b>「${esc(o.label)}」</b></dd>
<dt>建築版本（計劃總表）</dt><dd>${md(row[2 + i])}<br><small>模型 ID：${o.modelId ? `<code>${esc(o.modelId)}</code>` : '無'}；地塊：${o.lotId ? `<code>${esc(o.lotId)}</code>` : '未定'}</small></dd>
${cards}
<dt>設施卡</dt><dd>${card ? `<b>${esc(card[0])}</b><br>${esc(card[1])}` : '<small>此選項尚未有專用設施卡。</small>'}</dd>
</dl><div class="frames">${shots || '<p><small>未有實時截圖。</small></p>'}</div></div>
${resident(key)}${EXTRA[key] ?? ''}</section>`;
  }).join('\n');
  return `<article id="${q.id}"><h2>${q.id} ${esc(q.text)} <small>${md(row[1])}</small></h2>
<table class="status"><tr><th>地塊方式與位置</th><th>城市接線／三態</th></tr><tr><td>${md(row[5])}</td><td>${md(row[6])}</td></tr></table>
${resident(q.id)}
${options}</article>`;
});

const count = (k: string) => versions.filter(v => kind(v.o) === k).length;
const out = join(OUT, 'index.html');
const exhibitionDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
writeFileSync(out, `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>變化總覽 — city2127</title>
<style>body{font:15px/1.6 system-ui,"Noto Sans JP",sans-serif;margin:24px auto;max-width:1500px;padding:0 20px;background:#f4f3ee;color:#222}
h1{font-size:26px}h2{font-size:21px;margin:0 0 8px}h3{font-size:16px;margin:18px 0 6px}h4{font-size:15px;margin:16px 0 6px}small{color:#667;font-weight:400}code{background:#e6e4da;padding:0 4px;border-radius:3px}
article{background:#fff;border-radius:10px;padding:18px 22px;margin:22px 0;box-shadow:0 1px 4px #0002}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #d6d4c8;padding:6px 9px;text-align:left;vertical-align:top}th{background:#eceadf;font-weight:600}
.change{border-top:1px solid #e2e0d4;margin-top:16px}.cols{display:grid;grid-template-columns:minmax(300px,2fr) 3fr;gap:20px}
dt{color:#667;font-size:13px;margin-top:8px}dd{margin:0}.frames{display:grid;grid-template-columns:1fr 1fr;gap:6px;align-content:start}
p.intro{background:#f4f3ee;border-radius:6px;padding:8px 12px;margin:10px 0}figure{margin:0}figure img{width:100%;display:block;border-radius:4px;background:#ddd}figcaption{font-size:12px;color:#667}</style>
<h1>變化總覽：${set.questions.length} 題 × 3 選項＝${versions.length} 個建築版本</h1>
<p>生成：${exhibitionDate}，<code>scripts/changeSheet.ts</code>。題目、選項、模型及地塊來自輪換題組 <code>questions.rotation.v1.json</code>（version ${set.version}${set.draft ? '，草稿：題目文字仍為 SURVEY_V2 暫定稿' : ''}）；狀態來自 QUESTION_ROTATION_PLAN 第 2 節總表；居民來自 RESIDENT_SCENE_PLAN；日文結果卡及設施卡文案由程式生成。Q01 截圖取自 <code>scripts/closeupSheet.mjs</code>，其餘為輪換實時測試的畫面（含 guest 所見的結果卡）。</p>
<p class="intro"><b>抽題輪換。</b>每位觀眾從 ${set.questions.length} 題中回答 ${DRAW_COUNT} 題，優先抽取最久未變的題目。四個答案均按題目分別計入，大屏幕聚焦其中一個選擇，最多切換一個模型。沒有可見變化時，鏡頭探訪已顯示觀眾所選模型的地塊，或前往構想地展示「構想中」。iPad 交接頁可逐張揭示同題同選項的比例（含本人）；每題未滿 ${CROWD_SHARE_MIN_VOTES} 票時顯示收集進度。</p>
<p>現況：${versions.length} 個版本中，${count('有模型')} 個有模型，${count('空置（地塊已定）')} 個為空置地塊，${count('未有模型及地塊')} 個未有模型及地塊。</p>
<table><tr><th>題</th><th>選項</th><th>建築版本（計劃總表）</th><th>類別</th></tr>
${versions.map(({ q, o }, i) => `<tr>${i % 3 ? '' : `<td rowspan="3"><a href="#${q.id}">${q.id}</a><br><small>${esc(q.text)}</small></td>`}<td><a href="#${q.id}-${o.id}">${o.id}</a>「${esc(o.label)}」</td><td>${md(planRows.find(c => c[0] === q.id)![2 + OPTIONS.indexOf(o.id)])}</td><td>${esc(kind(o))}</td></tr>`).join('\n')}</table>
${articles.join('\n')}
<article id="others"><h2>不在新題組內的現有資產 <small>QUESTION_ROTATION_PLAN 第 2 節</small></h2>
<p>下表記錄已轉為背景或待確認去留的資產。城市輪換規則見<a href="../../docs/EXHIBITION_SPEC.md#抽題輪換唯一現行版本">展覽規格</a>。</p>
<table><tr><th>資產</th><th>處理建議</th></tr>${otherAssets.map(c => `<tr>${c.map(x => `<td>${md(x)}</td>`).join('')}</tr>`).join('')}</table></article>
</html>`);
console.log(`${set.questions.length} questions, ${versions.length} versions, ${copied} frames refreshed → ${out}`);
