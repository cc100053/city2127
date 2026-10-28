// Scoped real-server sector C regression; scratch data and all services are closed in finally.
import assert from 'node:assert/strict';
import {chromium} from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createContext,createSurveyServer} from '../../../survey/src/server/server.ts';
import {SHOTS} from '../../../src/headlineCamera.ts';
import {HERO_POSITION} from '../../../src/heroCamera.ts';
const out=process.env.CITY2127_EVIDENCE_DIR??'artifacts/closeup-polish/C/live';assert.ok(!existsSync(out),'Preserve existing live evidence; choose a fresh directory.');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
const errors=[],checks=[],scratch=[];let owned,base;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
const api=async(path,body)=>{const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(body)});const j=await r.json();assert.equal(j.ok,true,JSON.stringify(j));return j.data;};
async function closeServer(){if(!owned)return;owned.realtime.close();owned.server.closeAllConnections();await new Promise(r=>owned.server.close(r));owned.ctx.db.close();owned=null;}
async function open(){
 await page.goto('about:blank');await closeServer();const dir=mkdtempSync(join(tmpdir(),'closeup-c-'));scratch.push(dir);
 const ctx=createContext({dbPath:join(dir,'survey.sqlite'),questionsPath:new URL('../../../survey/src/survey/questions.exhibition.json',import.meta.url).pathname});
 const services=createSurveyServer({ctx});await new Promise(r=>services.server.listen(0,'127.0.0.1',r));owned={...services,ctx};base=`http://127.0.0.1:${services.server.address().port}`;
 await page.goto((process.env.CITY2127_CITY_URL??'http://127.0.0.1:5194')+'/?survey='+encodeURIComponent(base.replace('http','ws')+'/ws')+'&hour=12',{waitUntil:'domcontentloaded'});await page.bringToFront();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);
}
const pose=()=>page.evaluate(()=>window.cityShot());
const at=async p=>assert.ok(Math.hypot(...(await pose()).position.map((x,i)=>x-p[i]))<.02);
const data=()=>page.locator('canvas').evaluate(c=>({time:Number(c.dataset.time),fps:Number(c.dataset.fps),tower:JSON.parse(c.dataset.siteAssets).centerGaiRear.concentrationTower,district:JSON.parse(c.dataset.siteAssets).centerGaiRear.concentrationDistrict,energy:JSON.parse(c.dataset.energy)}));
async function submit(axis='functions-2127'){
 const s=await api('/api/proposal-sessions',{});return api('/api/proposals',{submissionId:crypto.randomUUID(),guestSessionId:s.session.id,expectedRevision:s.state.revision,answers:s.questions.map(q=>({questionId:q.id,optionId:q.id==='energy-2127'?(axis==='energy-only'?'rotor-storage':'water-storage'):q.options[q.id===axis?2:1].id}))});
}
async function live(id){
 const before=await data(),started=Date.now();await submit(id==='energy:ring'?'energy-only':'functions-2127');const samples=[];
 while(Date.now()-started<8300){const d=await data();if(samples.at(-1)?.time!==d.time)samples.push({elapsedMs:Date.now()-started,...d});await page.waitForTimeout(100);}
 await at(SHOTS[id].position);const place=await page.locator('.resident-place').textContent();assert.match(place,/フジテレビ東|フジテレビ前・蓄電環|フジテレビ周辺・街なか/);
 await page.screenshot({path:`${out}/${id.replace(':','-')}.jpg`,type:'jpeg',quality:90});checks.push({check:'live hold',id,before,samples,place,pose:await pose(),pass:true});return samples;
}
async function undo(){const a=await api('/api/admin/current-run'),v=await api('/api/city-view');await api('/api/admin/lifecycle',{command:'undo-proposal',expectedRevision:a.lifecycle.revision,proposalId:v.latestProposal.id});await page.waitForTimeout(250);await at(HERO_POSITION);checks.push({check:'Undo immediately restores hero',pass:true});}
try{
 await open();const tower=await live('se:focal');
 assert.ok(tower.some(s=>s.tower.transitioning),'live tower exposes intermediate easing');
 checks.push({check:'live tower shows intermediate easing',pass:true});
 const settled=await data();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);await at(HERO_POSITION);assert.deepEqual((await data()).tower,settled.tower);assert.deepEqual((await data()).district,settled.district);checks.push({check:'reload snapshot immediately restores settled tower, district and hero',pass:true});
 const district=await live('se:district');const end=district.at(-1).district;assert.ok(district.some(s=>s.district.visibleTowers+s.district.visiblePods>end.visibleTowers+end.visiblePods),'district exposes complementary intermediate geometry');checks.push({check:'district shows intermediate easing',pass:true});await undo();
 await page.waitForFunction(target=>JSON.parse(document.querySelector('canvas').dataset.siteAssets).centerGaiRear.concentrationDistrict.targetConcentration===target,settled.district.targetConcentration);
 assert.deepEqual((await data()).tower,settled.tower);assert.deepEqual((await data()).district,settled.district);checks.push({check:'Undo restores previous tower and district counts on next diagnostic refresh',pass:true});
 await page.emulateMedia({reducedMotion:'reduce'});await submit();await page.waitForTimeout(250);await at(HERO_POSITION);await page.waitForTimeout(2500);await at(HERO_POSITION);const reduced=await data();assert.equal(reduced.tower.activeFunctionModules,reduced.tower.targetFunctionModules);assert.equal(reduced.tower.transitioning,false);assert.ok(reduced.district.targetConcentration>settled.district.targetConcentration);assert.equal(reduced.district.activePulses,0);checks.push({check:'reduced-motion SE stays at hero and settles geometry without pulses',diagnostics:reduced,pass:true});
 await page.emulateMedia({reducedMotion:'no-preference'});await open();await submit('energy-only');await page.waitForTimeout(16000);const ring=await live('energy:ring');assert.ok(ring.some(s=>s.energy.parts[3].opacity>0&&s.energy.parts[3].opacity<1),'ring uses intermediate local fade');checks.push({check:'energy ring fades over the shared transition',pass:true});await undo();
 assert.deepEqual(errors,[]);
}finally{
 writeFileSync(`${out}/browser.json`,JSON.stringify({browser:browser.version(),apiOrigin:base,viewport:[1920,1080],dpr:1,quality:'default',checks,errors,timing:'Browser diagnostics refresh each120 frames (~2s); intermediate states prove easing. Exact3s duration/retarget remains covered by root tests; no3.000s browser precision claim.',fixtures:'Real current v4 concentration and rotor proposals; isolated scratch SQLite.'},null,2)+'\n');await browser.close();await closeServer();for(const dir of scratch)rmSync(dir,{recursive:true,force:true});
}
