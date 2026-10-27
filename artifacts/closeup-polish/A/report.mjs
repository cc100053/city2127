// Sector A evidence report: preserve failed gates and verify raw inputs before summarizing them.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename,join} from 'node:path';
const mean=a=>a.reduce((n,x)=>n+x,0)/a.length;
function performanceGate(current,baseline){
 const draw=mean(current.rounds.map(r=>Number(r.diagnostics.drawCalls))),oldDraw=mean(baseline.rounds.map(r=>Number(r.diagnostics.drawCalls)));
 return {fps:current.meanFps,baselineFps:baseline.meanFps,fpsRatio:current.meanFps/baseline.meanFps,drawCalls:draw,baselineDrawCalls:oldDraw,drawRatio:draw/oldDraw,
 pass:current.meanFps>=baseline.meanFps*.95&&draw<=oldDraw*1.1};
}
const sample=(fps,calls)=>({meanFps:fps,rounds:[{diagnostics:{drawCalls:String(calls)}}]});
if(process.argv.includes('--self-test')){
 assert.equal(performanceGate(sample(95,110),sample(100,100)).pass,true);
 assert.equal(performanceGate(sample(94.99,100),sample(100,100)).pass,false);
 assert.equal(performanceGate(sample(100,110.01),sample(100,100)).pass,false);
 console.log('PASS A report: unchanged95% FPS and110% draw-call boundary checks.');process.exit(0);
}
const root='artifacts/closeup-polish/A',read=p=>JSON.parse(readFileSync(p,'utf8')),ids=['ne:focal','ne:district','energy:garden','hero'];
const s0=read('artifacts/closeup-polish/S0/baseline/capture.json'),s0p=read('artifacts/closeup-polish/S0/baseline/performance.json');
const visual=read(`${root}/visual-review.json`),checks=read(`${root}/checks.json`),rounds={};
assert.equal(checks.A7.status,'PASS');
for(const [p,h]of Object.entries(read(`${root}/r3/source-hashes.json`).sha256))assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),h,`Changed verified source ${p}`);
const key=r=>`${r.id}/${r.state}/${r.hour}`,expected=s0.rows.filter(r=>ids.includes(r.id)).map(key).sort();assert.equal(expected.length,24);
for(const round of ['r1','r2','r3']){
 const capture=read(`${root}/${round}/capture.json`),perf=read(`${root}/${round}/performance.json`),comparison=read(`${root}/${round}/comparison.json`);
 assert.deepEqual(capture.rows.map(key).sort(),expected);assert.equal(perf.rows.length,8);assert.equal(comparison.rows.length,22);
 assert.ok(perf.launchArgs.includes('--disable-gpu-vsync')&&perf.launchArgs.includes('--disable-frame-rate-limit'));
 assert.deepEqual(capture.viewport,[1920,1080]);assert.equal(capture.dpr,1);assert.equal(capture.quality,'default');
 for(const row of capture.rows){assert.ok(row.complete&&row.takes.length===2);for(const p of row.images)assert.ok(existsSync(p));const u=new URL(row.url);assert.equal(u.searchParams.get('reviewTime'),'20');assert.equal(u.searchParams.get('hour'),String(row.hour));assert.equal(row.takes[0].url,row.takes[1].url);assert.deepEqual(row.takes[0].pose,row.takes[1].pose);}
 for(const row of perf.rows){assert.ok(row.complete&&row.rounds.length===2);for(const t of row.rounds){assert.ok(t.sample.elapsedMs>=5000);assert.ok(Math.abs(t.sample.fps-t.sample.intervals.length*1000/t.sample.elapsedMs)<1e-8);}assert.ok(Math.abs(row.meanFps-mean(row.rounds.map(t=>t.sample.fps)))<1e-8);}
 rounds[round]={capture,perf,comparison};
}
const final=rounds.r3;assert.equal(Object.keys(visual.rows).length,24);assert.equal(new Set(visual.reviewedOriginals).size,24);
const mark=(r,k)=>r.auto[k]===true?'PASS':r.auto[k]===false?'FAIL':r.id==='hero'||r.auto.reason==='subject absent in this state'?'N/A':'FAIL (unmeasurable)';
const performance=final.perf.rows.map(p=>({id:p.id,hour:p.hour,state:p.state,...performanceGate(p,s0p.rows.find(b=>b.id===p.id&&b.hour===p.hour)),
 rounds:p.rounds.map(t=>({fps:t.sample.fps,drawCalls:Number(t.diagnostics.drawCalls)}))}));
const rows=final.capture.rows.map(r=>{
 const v=visual.rows[key(r)],baseline=s0.rows.find(b=>key(b)===key(r)),perf=performance.find(p=>p.id===r.id&&p.hour===r.hour);
 assert.equal(v.image,`r3/${basename(r.images[1])}`);assert.ok(visual.reviewedOriginals.includes(v.image));
 assert.ok(['V1','V2','V3','V4','V5','V6'].every(k=>v.V1_V6[k]?.length===2&&v.V1_V6[k][0]!=='PENDING'));
 const pairs=final.comparison.rows.filter(p=>p.id===r.id&&p.hour===r.hour&&(p.from===r.state||p.to===r.state));
 const drawRatio=Number(r.diagnostics.drawCalls)/Number(baseline.diagnostics.drawCalls),vsync=Number(r.diagnostics.fps);
 return {id:r.id,state:r.state,hour:r.hour,image:v.image,baselineImage:`../S0/baseline/${basename(baseline.images[1])}`,A1:mark(r,'A1'),A2:mark(r,'A2'),A3:{status:mark(r,'A3'),hits:r.frame?.hits??null,required:7,gap:r.frame?.box?Math.max(0,7-r.frame.hits):null},
 A4:pairs,A5:{reference:perf,vsync,captureDrawCalls:Number(r.diagnostics.drawCalls),baselineCaptureDrawCalls:Number(baseline.diagnostics.drawCalls),captureDrawRatio:drawRatio,pass:perf.pass&&vsync>=58&&drawRatio<=1.1},A6:r.A6?'PASS':'FAIL',reproducibility:r.reproducibility,V1_V6:v.V1_V6,notes:v.notes};
});
const count=values=>Object.fromEntries([...new Set(values)].map(k=>[k,values.filter(v=>v===k).length]));
const summary={finalStates:24,allMeasuredStates:72,rawStaticImages:144,originalFinalImagesReviewed:24,roundsUsed:3,
 A1:count(rows.map(r=>r.A1)),A2:count(rows.map(r=>r.A2)),A3:count(rows.map(r=>r.A3.status)),A4:{pairs:22,pass:final.comparison.rows.filter(p=>p.pass).length},A5:count(rows.map(r=>r.A5.pass?'PASS':'FAIL')),A6:count(rows.map(r=>r.A6)),reproducibility:count(rows.map(r=>r.reproducibility.pass?'PASS':'FAIL')),
 V:Object.fromEntries(['V1','V2','V3','V4','V5','V6'].map(k=>[k,count(rows.map(r=>r.V1_V6[k][0]))]))};
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const [p,h]of Object.entries(read('artifacts/closeup-polish/S0/original-images.json')))assert.equal(hash(p),h,`Changed S0 original ${p}`);
if(existsSync(`${root}/original-images.json`))for(const [p,h]of Object.entries(read(`${root}/original-images.json`)))assert.equal(hash(p),h,`Changed A original ${p}`);
const hashes={};function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(jpg|png)$/.test(p))hashes[p]=hash(p);}}walk(root);
writeFileSync(`${root}/original-images.json`,JSON.stringify(hashes,null,2)+'\n');
const limits=['Three rounds exhausted; all failures remain owner decisions.','Session recognition judgments are not visitor tests or owner acceptance.','A3 uses the complete original subject world-AABB; off-screen/gap samples remain failures.','District A2 PASS does not imply the full carrier is visible; its projected bounds exceed the viewport.','Energy a/mixed use the same first garden; their A4 difference remains subject to the original6% gate.','V6 STATIC PASS does not certify flicker across all states.','Only development Mac/Chrome1920x1080/DPR1/default measured; no exhibition hardware, Safari/iPad, Windows or full Z regression.'];
writeFileSync(`${root}/report.json`,JSON.stringify({summary,sourceCommit:final.capture.commit,checks,performance,rows,limits},null,2)+'\n');
let md='# Sector A — S0 / final r3 review\n\n三輪實作及量測完成，**未通過全部美術門檻，未經owner接受／未merge main**。原始S0不覆寫，A3的7/9、A4的6%/12%、A5的95%/+10%均保持。[完整逐項JSON](report.json)、[final原圖與量度](r3/capture.json)、[A4](r3/comparison.json)、[效能](r3/performance.json)、[逐圖V理由](visual-review.json)、[驗證](checks.json)。\n\n';
md+=`Source: \`${final.capture.commit}\`。24個final第二take原圖已逐張以original detail檢視；S0欄引用已接受基準，沒有宣稱本批重新驗收所有S0圖。r1/r2完整自動矩陣保留，V採樣問題另見[r2 notes](r2/review-notes.md)。\n\n`;
md+='## Gates\n\n```json\n'+JSON.stringify(summary,null,2)+'\n```\n\n';
md+='## 每狀態原圖並排與理由\n\n';
for(const r of rows){
 md+=`### ${r.id} · ${r.state} · hour ${r.hour}\n\n| S0 original | Final r3 original |\n| --- | --- |\n| [![S0](${r.baselineImage})](${r.baselineImage}) | [![Final](${r.image})](${r.image}) |\n\n`;
 md+=`A1 ${r.A1}；A2 ${r.A2}；A3 ${r.A3.status}${r.A3.status==='N/A'?'':`（${r.A3.hits}/9，距門檻${r.A3.gap}條）`}；A4 ${r.A4.length?`${r.A4.filter(p=>p.pass).length}/${r.A4.length}相關pair通過`:'N/A'}；A5 ${r.A5.pass?'PASS':'FAIL'}（vsync ${r.A5.vsync} FPS；instant calls ${r.A5.captureDrawCalls}/${r.A5.baselineCaptureDrawCalls} S0）；A6 ${r.A6}。\n\n`;
 for(const [k,[status,reason]]of Object.entries(r.V1_V6))md+=`- **${k} ${status}**：${reason}\n`;
 md+='\n';
}
md+='## A4 pixel differences — unchanged thresholds\n\n| Shot | hour | Pair | MAD | Required | Gap | Result |\n| --- | --- | --- | --- | --- | --- | --- |\n';
for(const p of final.comparison.rows)md+=`| ${p.id} | ${p.hour} | ${p.from} → ${p.to} (${p.kind}) | ${(p.mad*100).toFixed(3)}% | ${(p.threshold*100).toFixed(0)}% | ${Math.max(0,(p.threshold-p.mad)*100).toFixed(3)} pp | ${p.pass?'PASS':'FAIL'} |\n`;
md+='\n';
md+='## Performance — same two uncapping flags, two5s windows after≥16s\n\n| Shot | hour | S0 FPS | r1 FPS | r2 FPS | final FPS | FPS/S0 | mean calls/S0 | Gate |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
for(const p of performance){const previous=round=>rounds[round].perf.rows.find(r=>r.id===p.id&&r.hour===p.hour).meanFps.toFixed(2);md+=`| ${p.id} | ${p.hour} | ${p.baselineFps.toFixed(2)} | ${previous('r1')} | ${previous('r2')} | ${p.fps.toFixed(2)} | ${(p.fpsRatio*100).toFixed(1)}% | ${p.drawCalls.toFixed(0)}/${p.baselineDrawCalls.toFixed(0)} | ${p.pass?'PASS':'FAIL'} |\n`;}
md+='\nFPS相對門檻按原S0；每狀態A5另核對其instant draw calls及vsync。單次calls可能落在shadow redraw frame，仍不靜默豁免FAIL。r1 hero source不變但FPS不同，故不把升幅當性能優化成果。\n\n## 行為與限制\n\n';
md+='A7以[checks](checks.json)及[scratch live](live/browser.json)為準；browser診斷每120frame更新，只證實中間easing，精確三秒retarget由root tests核對。第一次r2 batch上限失敗及合批修正已保留於[r2 checks](r2/checks.json)。本批沒有asset／survey／module-swap／部署改動，second garden保持原幾何。\n\n';
for(const limit of limits)md+=`- ${limit}\n`;
writeFileSync(`${root}/REVIEW.md`,md);console.log(JSON.stringify(summary,null,2));
