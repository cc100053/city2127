// Sector B report checks the complete raw matrix before presenting any acceptance result.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename,join} from 'node:path';
const read=p=>JSON.parse(readFileSync(p,'utf8')),mean=a=>a.reduce((n,x)=>n+x,0)/a.length;
const gate=(fps,calls,oldFps,oldCalls)=>fps>=oldFps*.95&&calls<=oldCalls*1.1;
if(process.argv.includes('--self-test')){
 assert.equal(gate(95,110,100,100),true);assert.equal(gate(94.99,100,100,100),false);assert.equal(gate(100,110.01,100,100),false);
 console.log('PASS B report: unchanged95% FPS and110% calls boundaries.');process.exit(0);
}
const root='artifacts/closeup-polish/B',key=r=>`${r.id}/${r.state}/${r.hour}`;
const s0=read('artifacts/closeup-polish/S0/baseline/capture.json'),s0p=read('artifacts/closeup-polish/S0/baseline/performance.json');
const ids=['sw:focal','sw:district','hero'],expected=s0.rows.filter(r=>ids.includes(r.id)).map(key).sort();assert.equal(expected.length,18);
const rounds={};
for(const name of ['r1','r2','r3']){
 const capture=read(`${root}/${name}/capture.json`),perf=read(`${root}/${name}/performance.json`),comparison=read(`${root}/${name}/comparison.json`);
 assert.deepEqual(capture.rows.map(key).sort(),expected);assert.equal(perf.rows.length,6);assert.equal(comparison.rows.length,16);
 assert.deepEqual(capture.viewport,[1920,1080]);assert.equal(capture.dpr,1);assert.equal(capture.quality,'default');
 assert.ok(perf.launchArgs.includes('--disable-gpu-vsync')&&perf.launchArgs.includes('--disable-frame-rate-limit'));
 for(const r of capture.rows){assert.ok(r.complete&&r.takes.length===2);const u=new URL(r.url);assert.equal(u.searchParams.get('reviewTime'),'20');assert.equal(u.searchParams.get('hour'),String(r.hour));assert.equal(r.takes[0].url,r.takes[1].url);assert.deepEqual(r.takes[0].pose,r.takes[1].pose);for(const p of r.images)assert.ok(readFileSync(p).length>0);}
 for(const r of perf.rows){assert.ok(r.complete&&r.rounds.length===2);for(const t of r.rounds){assert.ok(t.sample.elapsedMs>=5000);assert.ok(Math.abs(t.sample.fps-t.sample.intervals.length*1000/t.sample.elapsedMs)<1e-8);}assert.ok(Math.abs(r.meanFps-mean(r.rounds.map(t=>t.sample.fps)))<1e-8);}
 rounds[name]={capture,perf,comparison};
}
const final=rounds.r3,visual=read(`${root}/visual-review.json`),checks=read(`${root}/checks.json`);assert.equal(checks.A7.status,'PASS');
assert.equal(Object.keys(visual.rows).length,18);assert.equal(new Set(visual.reviewedOriginals).size,18);
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const [p,h]of Object.entries(read(`${root}/r3/source-hashes.json`).sha256))assert.equal(hash(p),h,`Changed verified source ${p}`);
for(const sector of ['S0','A'])for(const [p,h]of Object.entries(read(`artifacts/closeup-polish/${sector}/original-images.json`)))assert.equal(hash(p),h,`Changed ${sector} original ${p}`);
const performance=final.perf.rows.map(p=>{
 const old=s0p.rows.find(b=>b.id===p.id&&b.hour===p.hour),calls=r=>mean(r.rounds.map(t=>Number(t.diagnostics.drawCalls)));
 return {id:p.id,hour:p.hour,fps:p.meanFps,baselineFps:old.meanFps,fpsRatio:p.meanFps/old.meanFps,calls:calls(p),baselineCalls:calls(old),callsRatio:calls(p)/calls(old),minimumFps:old.meanFps*.95,fpsGap:Math.max(0,old.meanFps*.95-p.meanFps),maximumCalls:calls(old)*1.1,callsGap:Math.max(0,calls(p)-calls(old)*1.1),pass:gate(p.meanFps,calls(p),old.meanFps,calls(old))};
});
const mark=(r,k)=>r.id==='hero'?'N/A':r.auto[k]===true?'PASS':r.auto[k]===false?'FAIL':'FAIL (unmeasurable)';
const rows=final.capture.rows.map(r=>{
 const v=visual.rows[key(r)],old=s0.rows.find(b=>key(b)===key(r)),p=performance.find(p=>p.id===r.id&&p.hour===r.hour);
 assert.equal(v.image,`r3/${basename(r.images[1])}`);assert.ok(visual.reviewedOriginals.includes(v.image));
 assert.ok(['V1','V2','V3','V4','V5','V6'].every(k=>v.V1_V6[k]?.length===2&&v.V1_V6[k][0]!=='PENDING'));
 return {id:r.id,state:r.state,hour:r.hour,image:v.image,baselineImage:`../S0/baseline/${basename(old.images[1])}`,A1:mark(r,'A1'),A2:mark(r,'A2'),A3:{status:mark(r,'A3'),hits:r.frame?.hits??null,gap:r.frame?.box?Math.max(0,7-r.frame.hits):null},
  A4:final.comparison.rows.filter(p=>p.id===r.id&&p.hour===r.hour&&(p.from===r.state||p.to===r.state)),
  A5:{reference:p,vsync:Number(r.diagnostics.fps),calls:Number(r.diagnostics.drawCalls),baselineCalls:Number(old.diagnostics.drawCalls),pass:p.pass&&Number(r.diagnostics.fps)>=58&&Number(r.diagnostics.drawCalls)<=Number(old.diagnostics.drawCalls)*1.1},A6:r.A6?'PASS':'FAIL',V1_V6:v.V1_V6};
});
const count=a=>Object.fromEntries([...new Set(a)].map(k=>[k,a.filter(x=>x===k).length]));
const summary={finalStates:18,allMeasuredStates:54,rawStaticImages:108,roundsUsed:3,A1:count(rows.map(r=>r.A1)),A2:count(rows.map(r=>r.A2)),A3:count(rows.map(r=>r.A3.status)),A4:{pass:final.comparison.rows.filter(p=>p.pass).length,pairs:16},A5:count(rows.map(r=>r.A5.pass?'PASS':'FAIL')),A6:count(rows.map(r=>r.A6)),reproducibility:count(final.capture.rows.map(r=>r.reproducibility.pass?'PASS':'FAIL')),V:Object.fromEntries(['V1','V2','V3','V4','V5','V6'].map(k=>[k,count(rows.map(r=>r.V1_V6[k][0]))]))};
const hashes={};function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(jpg|png)$/.test(p))hashes[p]=hash(p);}}walk(root);writeFileSync(`${root}/original-images.json`,JSON.stringify(hashes,null,2)+'\n');
writeFileSync(`${root}/report.json`,JSON.stringify({summary,sourceCommit:final.capture.commit,browser:final.capture.browser,gpu:final.capture.rows[0].gpu,checks,performance,rows},null,2)+'\n');
let md='# Sector B — S0 / final r3 review\n\n三輪已用完；**未經owner接受／未merge main**。7/9 raycast、A4 6%/12%、A5 95%FPS/+10%calls及58fps門檻不變。[逐項JSON](report.json)、[原圖量度](r3/capture.json)、[視覺理由](visual-review.json)、[驗證](checks.json)、[live](live/browser.json)。\n\n**r3 focal構圖比r2退步**：新前景支柱遮住廣場，雖然數值A1/A2通過，仍不符合設施辨識；[r2原圖](r2/sw-focal__0__h12.jpg)顯示較少遮擋。三輪後停止，不用未量測的r2 pose＋r3 builder組合冒充final，也不自行開第四輪。新幾何保留為待審候選，建議owner暫不接受B美術。\n\n18張final第二take原圖逐張檢視；S0欄引用既有基準。每輪18狀態、16比較、6組×2效能窗；三輪全部保存，A與S0原圖hash核對。\n\n```json\n'+JSON.stringify(summary,null,2)+'\n```\n\n';
for(const r of rows){md+=`## ${r.id} · ${r.state} · h${r.hour}\n\n| S0 original | Final r3 original |\n| --- | --- |\n| [![S0](${r.baselineImage})](${r.baselineImage}) | [![Final](${r.image})](${r.image}) |\n\nA1 ${r.A1}；A2 ${r.A2}；A3 ${r.A3.status}（${r.A3.hits??'—'}/9；差${r.A3.gap??'—'}條）；A4 ${r.A4.filter(p=>p.pass).length}/${r.A4.length}；A5 ${r.A5.pass?'PASS':'FAIL'}（vsync ${r.A5.vsync}；calls ${r.A5.calls}/${r.A5.baselineCalls} S0）；A6 ${r.A6}。\n\n`;for(const [k,[status,reason]]of Object.entries(r.V1_V6))md+=`- **${k} ${status}**：${reason}\n`;md+='\n';}
md+='## A4 原門檻與精確差距\n\n| Shot | hour | Pair | MAD | Required | Gap | Result |\n| --- | --- | --- | --- | --- | --- | --- |\n';
for(const p of final.comparison.rows)md+=`| ${p.id} | ${p.hour} | ${p.from} → ${p.to} (${p.kind}) | ${p.mad===null?'無有效box':(p.mad*100).toFixed(3)+'%'} | ${p.threshold*100}% | ${p.mad===null?'不可量測':Math.max(0,(p.threshold-p.mad)*100).toFixed(3)+' pp'} | ${p.pass?'PASS':'FAIL'} |\n`;
md+='\n## A5 雙flags uncapped效能\n\n載入≥16s後量兩個5s rAF窗；同S0 default quality比較。\n\n| Shot | hour | S0 FPS | r1 | r2 | r3 | FPS/S0 | calls/S0 | Gate |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n';
for(const p of performance){const fps=n=>rounds[n].perf.rows.find(r=>r.id===p.id&&r.hour===p.hour).meanFps.toFixed(2);md+=`| ${p.id} | ${p.hour} | ${p.baselineFps.toFixed(2)} | ${fps('r1')} | ${fps('r2')} | ${fps('r3')} | ${(p.fpsRatio*100).toFixed(1)}% | ${p.calls.toFixed(0)}/${p.baselineCalls.toFixed(0)} | ${p.pass?'PASS':'FAIL'} |\n`;}
md+='\n## 限制及下一步\n\n三輪後停止，未通過項目交owner決定，不另開第四輪。[A3原始射線診斷](a3-diagnostics.json)：144條射線0命中，80個取樣點在視窗外（每個district狀態8個）；其餘miss未重做3D原因分類，不全稱作遮擋。完整SharingDistrict仍包含六個水室及十個內陸court；AABB跨空隙／視窗外的miss保持FAIL，不能等同全部被遮擋。A4範圍依完整主體box，未裁成局部好看區。Live browser診斷每120frames更新，只證實中間easing；精確3s及retarget由node tests驗證。靜態V6不證明所有動態狀態無閃爍。\n\nChrome沿用同一安裝路徑，但r2/r3為156.0.8078.73，S0/r1為156.0.8078.48；保留原S0數值門檻，不把跨patch比較當成完全同環境的性能保證，也不歸因為本批優化。只測開發Mac Chrome1920×1080/DPR1/default；未測展示硬件、Safari/iPad、Windows、真人2秒辨識、全城Z。Survey／module-swap source未改、未另跑其獨立suite；未部署。\n';
writeFileSync(`${root}/REVIEW.md`,md);console.log(JSON.stringify(summary,null,2));
