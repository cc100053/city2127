// Report current-source evidence without rewriting old measurements or relaxing failed gates.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {relative,join} from 'node:path';
import {key,lastSnapshots,sectorFor} from './snapshots.mjs';
import {SHOTS} from '../../../src/headlineCamera.ts';
import {HERO_POSITION,HERO_TARGET} from '../../../src/heroCamera.ts';
const read=p=>JSON.parse(readFileSync(p,'utf8')),mean=a=>a.reduce((n,x)=>n+x,0)/a.length;
const gate=(fps,calls,baselineFps,baselineCalls)=>fps>=baselineFps*.95&&calls<=baselineCalls*1.1;
const mark=(r,k)=>r.id==='hero'||r.frame?.reason==='subject absent in this state'?'N/A':r.auto[k]===true?'PASS':r.auto[k]===false?'FAIL':'FAIL (unmeasurable)';
const canonical=r=>{
 const u=new URL(r.url),pose=r.id==='hero'?{position:HERO_POSITION,target:HERO_TARGET}:SHOTS[r.id];assert.ok(pose);
 assert.equal(u.origin,'http://127.0.0.1:5194');assert.equal(u.searchParams.get('reviewTime'),'20');assert.equal(u.searchParams.get('hour'),String(r.hour));assert.equal(u.searchParams.get('shot'),r.id==='hero'?null:r.id);
 if(r.id.startsWith('energy:')){assert.equal(u.searchParams.get('energy'),r.state);assert.equal(u.searchParams.get('meters'),null);}
 else{assert.equal(u.searchParams.get('meters'),r.id==='hero'?'nw:0,ne:0,sw:0,se:0':r.id.split(':')[0]+':'+r.state);assert.equal(u.searchParams.get('energy'),null);}
 for(const k of ['position','target'])assert.ok(Math.hypot(...pose[k].map((n,i)=>n-r.pose[k][i]))<.02,'Current authored '+k+' must match measured pose');
};
if(process.argv.includes('--self-test')){
 const r={id:'nw:focal',state:'2',hour:12,url:'http://127.0.0.1:5194/?reviewTime=20&hour=12&meters=nw:2&shot=nw:focal',pose:SHOTS['nw:focal']};canonical(r);assert.throws(()=>canonical({...r,url:r.url.replace('shot=nw:focal','shot=ne:focal')}));assert.throws(()=>canonical({...r,pose:{...r.pose,position:[0,0,0]}}));
 assert.ok(/\.(jpg|png)$/.test('current/example.jpg'));assert.ok(!/\.(jpg|png)$/.test('capture.json'));
 assert.ok(gate(95,110,100,100));assert.ok(!gate(94.99,110,100,100));assert.ok(!gate(100,110.01,100,100));
 assert.equal(mark({id:'sw:district',frame:{reason:'near plane'},auto:{A1:null}},'A1'),'FAIL (unmeasurable)');
 assert.equal(mark({id:'energy:ring',frame:{reason:'subject absent in this state'},auto:{A1:null}},'A1'),'N/A');
 const last=lastSnapshots();for(const id of ['ne:focal','sw:focal','se:focal','nw:focal'])assert.ok(last.has(`${sectorFor(id)}/${id}/2/12`));
 console.log('PASS: current URL/pose and wrong-shot rejection, A5 boundaries, invalid projection FAIL, absent N/A, final snapshot selections.');process.exit(0);
}
const root='artifacts/closeup-polish/Z',capture=read(`${root}/current/capture.json`),perf=read(`${root}/current/performance.json`),pairs=read(`${root}/current/comparison.json`);
const s0=read('artifacts/closeup-polish/S0/baseline/capture.json'),s0p=read('artifacts/closeup-polish/S0/baseline/performance.json'),last=lastSnapshots(),visual=read(`${root}/visual-review.json`),delta=read(`${root}/snapshot-comparisons.json`),checks=read(`${root}/checks.json`);
assert.ok(['rootNpmTest','rootNpmBuild','live','headlineAwareE4','devSmoke','productionSmoke'].every(k=>checks[k]?.status==='PASS'),'Complete A7 behavior checks before final report');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const [p,h]of Object.entries(read(`${root}/preflight.json`).sha256))assert.equal(hash(p),h,`Runtime/tests/package changed: ${p}`);
for(const sector of ['S0','A','B','C','D'])for(const [p,h]of Object.entries(read(`artifacts/closeup-polish/${sector}/original-images.json`)))assert.equal(hash(p),h,`Changed prior original ${p}`);
assert.deepEqual(capture.rows.map(key).sort(),s0.rows.map(key).sort());assert.equal(capture.rows.length,98);assert.equal(perf.rows.length,28);assert.equal(pairs.rows.length,96);assert.equal(delta.rows.length,202);
assert.equal(new Set(capture.rows.map(key)).size,98);assert.equal(new Set(perf.rows.map(r=>`${r.id}/${r.hour}`)).size,28);
assert.deepEqual(capture.viewport,[1920,1080]);assert.equal(capture.dpr,1);assert.equal(capture.quality,'default');assert.deepEqual(perf.launchArgs,['--disable-gpu-vsync','--disable-frame-rate-limit']);
for(const r of capture.rows){canonical(r);for(const t of r.takes)canonical({...r,...t});assert.ok(r.complete&&r.takes.length===2);assert.equal(r.takes[0].url,r.takes[1].url);assert.deepEqual(r.takes[0].pose,r.takes[1].pose);const u=new URL(r.url);assert.equal(u.searchParams.get('reviewTime'),'20');assert.equal(u.searchParams.get('hour'),String(r.hour));assert.equal(r.reproducibility.pass,r.reproducibility.mad<1/255);}
const performance=perf.rows.map(r=>{
 const baseline=s0p.rows.find(b=>b.id===r.id&&b.hour===r.hour);assert.ok(baseline);assert.equal(r.state,baseline.state);
 assert.ok(r.complete&&r.rounds.length===2);for(const t of r.rounds){canonical({...r,...t});assert.ok(t.sample.elapsedMs>=5000);assert.ok(Math.abs(t.sample.fps-t.sample.intervals.length*1000/t.sample.elapsedMs)<1e-8);}
 assert.ok(Math.abs(r.meanFps-mean(r.rounds.map(t=>t.sample.fps)))<1e-8);
 const calls=mean(r.rounds.map(t=>Number(t.diagnostics.drawCalls))),baselineCalls=mean(baseline.rounds.map(t=>Number(t.diagnostics.drawCalls)));
 return {id:r.id,hour:r.hour,state:r.state,fps:r.meanFps,baselineFps:baseline.meanFps,fpsRatio:r.meanFps/baseline.meanFps,calls,baselineCalls,rawCalls:r.rounds.map(t=>Number(t.diagnostics.drawCalls)),minimumFps:baseline.meanFps*.95,maximumCalls:baselineCalls*1.1,pass:gate(r.meanFps,calls,baseline.meanFps,baselineCalls)};
});
assert.equal(new Set(visual.reviewedOriginals).size,98);assert.equal(Object.keys(visual.rows).length,98);
const rows=capture.rows.map(r=>{
 const b=s0.rows.find(b=>key(b)===key(r)),v=visual.rows[key(r)],reference=performance.find(p=>p.id===r.id&&p.hour===r.hour);
 assert.equal(v.image,r.images[1]);assert.ok(visual.reviewedOriginals.includes(v.image));assert.equal(v.detail,'original');assert.ok(['V1','V2','V3','V4','V5','V6'].every(k=>v.V1_V6[k]?.length===2&&v.V1_V6[k][0]!=='PENDING'));assert.ok(v.s0ToZ?.length>0&&v.lastToZ?.length>0);
 const previous=r.id==='hero'?['A','B','C','D'].map(s=>last.get(`${s}/${key(r)}`)):[last.get(`${sectorFor(r.id)}/${key(r)}`)];
 return {id:r.id,state:r.state,hour:r.hour,image:r.images[1],s0Image:b.images[1],previous:previous.map(p=>({sector:p.sector,image:p.row.images[1],commit:p.commit,browser:p.browser})),measurement:r.auto,box:r.frame?.box??null,frameReason:r.frame?.reason??null,A1:mark(r,'A1'),A2:mark(r,'A2'),A3:{status:mark(r,'A3'),hits:r.frame?.hits??null,samples:r.frame?.samples??null},A4:pairs.rows.filter(p=>p.id===r.id&&p.hour===r.hour&&(p.from===r.state||p.to===r.state)),A5:{reference,vsync:Number(r.diagnostics.fps),instantCalls:Number(r.diagnostics.drawCalls),baselineInstantCalls:Number(b.diagnostics.drawCalls),pass:reference.pass&&Number(r.diagnostics.fps)>=58&&Number(r.diagnostics.drawCalls)<=Number(b.diagnostics.drawCalls)*1.1},A6:r.A6?'PASS':'FAIL',reproducibility:r.reproducibility,delta:delta.rows.filter(p=>key(p)===key(r)),...v};
});
for(const p of pairs.rows){assert.equal(p.threshold,p.kind==='extremes'?.12:.06);assert.equal(p.pass,p.mad!==null&&p.mad>=p.threshold);}
const count=a=>Object.fromEntries([...new Set(a)].map(k=>[k,a.filter(x=>x===k).length]));
const summary={states:98,originalFinalImagesReviewed:98,A1:count(rows.map(r=>r.A1)),A2:count(rows.map(r=>r.A2)),A3:count(rows.map(r=>r.A3.status)),A4:{pass:pairs.rows.filter(p=>p.pass).length,pairs:pairs.rows.length},A5:count(rows.map(r=>r.A5.pass?'PASS':'FAIL')),canonicalPerformance:count(performance.map(p=>p.pass?'PASS':'FAIL')),A6:count(rows.map(r=>r.A6)),reproducibility:count(rows.map(r=>r.reproducibility.pass?'PASS':'FAIL')),V:Object.fromEntries(['V1','V2','V3','V4','V5','V6'].map(k=>[k,count(rows.map(r=>r.V1_V6[k][0]))])),performance:{minFps:Math.min(...performance.map(p=>p.fps)),maxFps:Math.max(...performance.map(p=>p.fps)),minVsync:Math.min(...rows.map(r=>r.A5.vsync)),maxVsync:Math.max(...rows.map(r=>r.A5.vsync))}};
const hashes={};function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(jpg|png)$/.test(p))hashes[p]=hash(p);}}walk(root);
if(existsSync(`${root}/original-images.json`))for(const [p,h]of Object.entries(read(`${root}/original-images.json`)))assert.equal(hashes[p],h,'Preserve every earlier Z original');
writeFileSync(`${root}/original-images.json`,JSON.stringify(hashes,null,2)+'\n');
writeFileSync(`${root}/report.json`,JSON.stringify({summary,measuredCommit:capture.commit,runtime:'44521a0d63aae904c306a19c4baac52a44b62a87',browser:capture.browser,s0Browser:s0.browser,checks,performance,comparisons:pairs.rows,rows},null,2)+'\n');
const link=p=>relative(root,p),pct=n=>Number.isFinite(n)?(n*100).toFixed(3)+'%':'不可量測';
let md='# Z — 全當前累積 source / S0 / sector-last\n\n98 態原矩陣完整重截；所有 final 第二 take 原圖逐張以 original detail 檢視。只做量度及文件，runtime/tests/package byte-identical to 4a3ad9f（runtime44521a0）。A–D 美術未經 owner 接受，未 merge main；root/live PASS 與 art acceptance 分開。\n\n'+`Chrome ${capture.browser}，S0 ${s0.browser}；累積A/B/C/D source 及版本差異不能當同版本隔離優化。完整 root/carrier/group、A3≥7/9、A4≥6%/12%、A5≥95%FPS/≤110%calls/vsync≥58 保持。[JSON](report.json)、[raw capture](current/capture.json)、[raw perf](current/performance.json)、[逐圖理由](visual-review.json)、[檢查](checks.json)。\n\n`;
md+='```json\n'+JSON.stringify(summary,null,2)+'\n```\n\n';
for(const r of rows){
 md+=`## ${r.id} · ${r.state} · h${r.hour}\n\n| S0 original | Sector-last original | Z current original |\n| --- | --- | --- |\n| [![S0](${link(r.s0Image)})](${link(r.s0Image)}) | ${r.previous.map(p=>`[![${p.sector} last](${link(p.image)})](${link(p.image)})`).join(' ')} | [![Z](${link(r.image)})](${link(r.image)}) |\n\n`;
 md+=`S0→Z：${r.s0ToZ}\n\nSector-last→Z：${r.lastToZ}\n\n`;
 md+=r.previous.map(p=>`[${p.sector} last original ${p.commit.slice(0,7)}](${link(p.image)})`).join(' · ');
 md+='\n\n'+r.delta.map(d=>`${d.from}→Z full MAD ${pct(d.full?.mad)}、subject-union ${pct(d.subjectUnion?.mad)}、pose ${d.poseChanged?'changed':'same'}`).join('；')+'。MAD 只描述跨 source／pose 像素差，不替代 A4 或美術判斷。\n\n';
 for(const d of r.delta)md+=`${d.from}→Z numeric delta：width ${d.numeric.width.delta===null?'不可量測':(d.numeric.width.delta*100).toFixed(3)+'pp'}、height ${d.numeric.height.delta===null?'不可量測':(d.numeric.height.delta*100).toFixed(3)+'pp'}、card overlap ${d.numeric.cardOverlap.delta===null?'不可量測':(d.numeric.cardOverlap.delta*100).toFixed(3)+'pp'}、A3 hits ${d.numeric.hits.delta??'不可量測'}、vsync FPS ${d.numeric.fps.delta.toFixed(2)}、instant calls ${d.numeric.drawCalls.delta}。\n\n`;
 md+=`A1 ${r.A1}；A2 ${r.A2}；A3 ${r.A3.status} (${r.A3.hits??'—'}/9)；A4 ${r.A4.filter(p=>p.pass).length}/${r.A4.length}；A5 ${r.A5.pass?'PASS':'FAIL'} (vsync ${r.A5.vsync}、instant calls ${r.A5.instantCalls}/${r.A5.baselineInstantCalls} S0)；A6 ${r.A6}。\n\n完整 bounds width ${pct(r.measurement.width)}、height ${pct(r.measurement.height)}、card overlap ${pct(r.measurement.cardOverlap)}。\n\n`;
 for(const [k,[status,reason]]of Object.entries(r.V1_V6))md+=`- **${k} ${status}**：${reason}\n`;md+='\n';
}
md+='## A4 原門檻\n\n| Shot | Hour | Pair | MAD | Required | Result |\n| --- | --- | --- | --- | --- | --- |\n';for(const p of pairs.rows)md+=`| ${p.id} | ${p.hour} | ${p.from}→${p.to} | ${pct(p.mad)} | ${pct(p.threshold)} | ${p.pass?'PASS':'FAIL'} |\n`;
md+='\n## A5 全28組\n\n雙 uncapping flags，載入至少16s，各兩個至少5s rAF窗，raw shadow calls/outliers 不過濾。\n\n| Shot | Hour | FPS / S0 | Raw calls | Mean / S0 calls | Gate |\n| --- | --- | --- | --- | --- | --- |\n';for(const p of performance)md+=`| ${p.id} | ${p.hour} | ${p.fps.toFixed(3)} / ${p.baselineFps.toFixed(3)} (${pct(p.fpsRatio)}) | ${p.rawCalls.join('/')} | ${p.calls}/${p.baselineCalls} | ${p.pass?'PASS':'FAIL'} |\n`;
md+='\n## Owner decisions / limits\n\nA/B/C/D 各自接受、部分接受或棄用，A3/A4 維持／另定量度定義／接受現狀，以及是否追加超限輪，全部仍由 owner 決定。本批不改 gate、不填 AABB 空隙、不捏造同 energy body 的 option 差異、不回復或混用未量測 pose/builder。完整 world-AABB 的 offscreen/gap misses 不全等於前景遮擋；near-plane invalid 仍 FAIL。全部失敗／retry／原圖留存。\n\n只測開發 Mac Chrome1920×1080/DPR1/default；V1為session判斷，非真人兩秒測試；V6 STATIC PASS 不證明全時間無閃爍。展示硬件、Safari/iPad、Windows、實體HDMI、長跑及真人理解未驗。\n';
assert.ok(!/[ \t]+$/m.test(md),'Generated Markdown must not have trailing whitespace');
writeFileSync(`${root}/REVIEW.md`,md);console.log(JSON.stringify(summary,null,2));
