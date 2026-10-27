// Read the original captures; never replace a failed gate or an earlier image.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename,join} from 'node:path';
const read=p=>JSON.parse(readFileSync(p,'utf8')),mean=a=>a.reduce((n,x)=>n+x,0)/a.length;
const gate=(fps,calls,oldFps,oldCalls)=>fps>=oldFps*.95&&calls<=oldCalls*1.1;
if(process.argv.includes('--self-test')){
 assert.equal(gate(95,110,100,100),true);assert.equal(gate(94.99,100,100,100),false);assert.equal(gate(100,110.01,100,100),false);
 console.log('PASS C report: 95% FPS / 110% calls boundaries.');process.exit(0);
}
const root='artifacts/closeup-polish/C',key=r=>`${r.id}/${r.state}/${r.hour}`,hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const s0=read('artifacts/closeup-polish/S0/baseline/capture.json'),s0p=read('artifacts/closeup-polish/S0/baseline/performance.json');
const plan=read(`${root}/rounds.json`),visual=read(`${root}/visual-review.json`),checks=read(`${root}/checks.json`),all=[],rows=[],performance=[],comparisons=[];
for(const [id,rounds]of Object.entries(plan)){
 assert.ok(rounds.length>0&&rounds.length<=3,'Maximum three rounds per shot');
 for(const [index,dir]of rounds.entries()){
  const c=read(`${root}/${dir}/capture.json`),p=read(`${root}/${dir}/performance.json`),a4=read(`${root}/${dir}/comparison.json`);
  const expected=s0.rows.filter(r=>r.id===id||r.id==='hero').map(key).sort();
  assert.deepEqual(c.rows.filter(r=>!r.pairing).map(key).sort(),expected);assert.equal(p.rows.length,4);
  assert.deepEqual(c.viewport,[1920,1080]);assert.equal(c.dpr,1);assert.equal(c.quality,'default');
  assert.ok(p.launchArgs.includes('--disable-gpu-vsync')&&p.launchArgs.includes('--disable-frame-rate-limit'));
  for(const r of c.rows){assert.ok(r.complete&&r.takes.length===2);const u=new URL(r.url);assert.equal(u.searchParams.get('reviewTime'),'20');assert.equal(u.searchParams.get('hour'),String(r.hour));assert.equal(r.takes[0].url,r.takes[1].url);assert.deepEqual(r.takes[0].pose,r.takes[1].pose);for(const image of r.images)assert.ok(readFileSync(image).length>0);}
  for(const r of p.rows){assert.ok(r.complete&&r.rounds.length===2);for(const t of r.rounds){assert.ok(t.sample.elapsedMs>=5000);assert.ok(Math.abs(t.sample.fps-t.sample.intervals.length*1000/t.sample.elapsedMs)<1e-8);}assert.ok(Math.abs(r.meanFps-mean(r.rounds.map(t=>t.sample.fps)))<1e-8);}
  const perf=p.rows.map(r=>{const old=s0p.rows.find(b=>b.id===r.id&&b.hour===r.hour),calls=mean(r.rounds.map(t=>Number(t.diagnostics.drawCalls))),oldCalls=mean(old.rounds.map(t=>Number(t.diagnostics.drawCalls)));return {id:r.id,hour:r.hour,round:index+1,directory:dir,fps:r.meanFps,baselineFps:old.meanFps,fpsRatio:r.meanFps/old.meanFps,calls,baselineCalls:oldCalls,minimumFps:old.meanFps*.95,maximumCalls:oldCalls*1.1,pass:gate(r.meanFps,calls,old.meanFps,oldCalls)};});
  all.push({id,directory:dir,states:c.rows.length,A4:a4.rows.filter(r=>r.pass).length,A4pairs:a4.rows.length,browser:c.browser});performance.push(...perf);
  if(index!==rounds.length-1)continue;
  comparisons.push(...a4.rows.map(r=>({...r,directory:dir})));
  for(const r of c.rows){
   const k=`${id}/${key(r)}`,v=visual.rows[k],old=s0.rows.find(b=>key(b)===key(r)),ref=perf.find(p=>p.id===r.id&&p.hour===r.hour),absent=r.id.startsWith('energy:')&&r.frame?.reason==='subject absent in this state';
   assert.equal(v.image,`${dir}/${basename(r.images[1])}`);assert.ok(visual.reviewedOriginals.includes(v.image));assert.ok(['V1','V2','V3','V4','V5','V6'].every(k=>v.V1_V6[k]?.length===2&&v.V1_V6[k][0]!=='PENDING'));
   const mark=k=>r.id==='hero'||absent?'N/A':r.auto[k]===true?'PASS':r.auto[k]===false?'FAIL':'FAIL (unmeasurable)';
   rows.push({id:r.id,state:r.state,hour:r.hour,finalShot:id,image:v.image,baselineImage:old?`../S0/baseline/${basename(old.images[1])}`:null,A1:mark('A1'),A2:mark('A2'),A3:{status:mark('A3'),hits:r.frame?.hits??null},A4:a4.rows.filter(p=>p.id===r.id&&p.hour===r.hour&&(p.from===r.state||p.to===r.state)),A5:{reference:ref,vsync:Number(r.diagnostics.fps),calls:Number(r.diagnostics.drawCalls),pass:ref.pass&&Number(r.diagnostics.fps)>=58&&(!old||Number(r.diagnostics.drawCalls)<=Number(old.diagnostics.drawCalls)*1.1)},A6:r.A6?'PASS':'FAIL',V1_V6:v.V1_V6});
  }
 }
}
assert.equal(new Set(visual.reviewedOriginals).size,rows.length);assert.equal(checks.A7.status,'PASS');
for(const sector of ['S0','A','B'])for(const [p,h]of Object.entries(read(`artifacts/closeup-polish/${sector}/original-images.json`)))assert.equal(hash(p),h,`Changed ${sector} original ${p}`);
for(const [p,h]of Object.entries(read(`${root}/final-source-hashes.json`).sha256))assert.equal(hash(p),h,`Changed final source ${p}`);
const count=a=>Object.fromEntries([...new Set(a)].map(k=>[k,a.filter(x=>x===k).length]));
const summary={finalStates:rows.length,measuredStates:all.reduce((n,r)=>n+r.states,0),rounds:all,A1:count(rows.map(r=>r.A1)),A2:count(rows.map(r=>r.A2)),A3:count(rows.map(r=>r.A3.status)),A4:{pass:comparisons.filter(p=>p.pass).length,pairs:comparisons.length},A5:count(rows.map(r=>r.A5.pass?'PASS':'FAIL')),A6:count(rows.map(r=>r.A6))};
const hashes={};function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(jpg|png)$/.test(p))hashes[p]=hash(p);}}walk(root);writeFileSync(`${root}/original-images.json`,JSON.stringify(hashes,null,2)+'\n');
writeFileSync(`${root}/report.json`,JSON.stringify({summary,checks,performance,comparisons,rows},null,2)+'\n');
let md='# Sector C — S0 / final review\n\n未經owner接受，未merge main。每shot最多三輪；所有原圖、完整root/carrier/group量度及原門檻保留。不同shot依序打磨，hero重拍可核對累積影響；pairing沒有S0同狀態原圖，明列無基準。[JSON](report.json)、[視覺逐圖理由](visual-review.json)、[驗證](checks.json)。\n\n```json\n'+JSON.stringify(summary,null,2)+'\n```\n\n';
for(const r of rows){md+=`## ${r.finalShot} / ${r.id} · ${r.state} · h${r.hour}\n\n| S0 original | Final original |\n| --- | --- |\n| ${r.baselineImage?`[![S0](${r.baselineImage})](${r.baselineImage})`:'無同狀態S0'} | [![Final](${r.image})](${r.image}) |\n\nA1 ${r.A1}；A2 ${r.A2}；A3 ${r.A3.status}（${r.A3.hits??'—'}/9）；A4 ${r.A4.filter(p=>p.pass).length}/${r.A4.length}；A5 ${r.A5.pass?'PASS':'FAIL'}（vsync ${r.A5.vsync}、calls ${r.A5.calls}）；A6 ${r.A6}。\n\n`;for(const [k,[status,reason]]of Object.entries(r.V1_V6))md+=`- **${k} ${status}**：${reason}\n`;md+='\n';}
md+='## A4 原門檻\n\n| Shot | Hour | Pair | MAD | Required | Gap | Result |\n| --- | --- | --- | --- | --- | --- | --- |\n';for(const p of comparisons)md+=`| ${p.id} | ${p.hour} | ${p.from}→${p.to} | ${p.mad==null?'不可量測':(p.mad*100).toFixed(3)+'%'} | ${p.threshold*100}% | ${p.mad==null?'—':Math.max(0,(p.threshold-p.mad)*100).toFixed(3)+' pp'} | ${p.pass?'PASS':'FAIL'} |\n`;
md+='\n## A5 各輪原始效能\n\n雙uncapping flags，載入≥16s，兩個≥5s rAF窗。\n\n| Directory | Shot | Hour | FPS / S0 | Calls / S0 | Gate |\n| --- | --- | --- | --- | --- | --- |\n';for(const p of performance)md+=`| ${p.directory} | ${p.id} | ${p.hour} | ${p.fps.toFixed(2)} / ${p.baselineFps.toFixed(2)} (${(p.fpsRatio*100).toFixed(1)}%) | ${p.calls}/${p.baselineCalls} | ${p.pass?'PASS':'FAIL'} |\n`;
md+='\n## 限制\n\nChrome156.0.8078.73與S0 .48有patch差異；不把硬件噪聲或跨版本FPS變化當優化。完整carrier跨全城、AABB空隙及off-screen射線保持原定義，FAIL不等於每次都是前景遮擋。靜態V6不證明完整動態無閃爍。未測展示機、Safari/iPad、Windows、真人兩秒辨識、production或Z全城回歸。A/B pending與FAIL保持，無部署。\n';writeFileSync(`${root}/REVIEW.md`,md);console.log(JSON.stringify(summary,null,2));
