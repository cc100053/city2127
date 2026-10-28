// Scoped real-server sector D regression; scratch data and all services are closed in finally.
import assert from 'node:assert/strict';
import {chromium} from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createContext,createSurveyServer} from '../../../survey/src/server/server.ts';
import {SHOTS} from '../../../src/headlineCamera.ts';
import {HERO_POSITION} from '../../../src/heroCamera.ts';
const out=process.env.CITY2127_EVIDENCE_DIR??'artifacts/closeup-polish/D/live';assert.ok(!existsSync(out),'Preserve existing live evidence; choose a fresh directory.');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
const errors=[],checks=[],scratch=[],origins=[];let owned,base,complete=false;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
const api=async(path,body)=>{const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(body)});const j=await r.json();assert.equal(j.ok,true,JSON.stringify(j));return j.data;};
async function closeServer(){if(!owned)return;owned.realtime.close();owned.server.closeAllConnections();await new Promise(r=>owned.server.close(r));owned.ctx.db.close();owned=null;}
async function open(){
 await page.goto('about:blank');await closeServer();const dir=mkdtempSync(join(tmpdir(),'closeup-d-'));scratch.push(dir);
 const ctx=createContext({dbPath:join(dir,'survey.sqlite'),questionsPath:new URL('../../../survey/src/survey/questions.exhibition.json',import.meta.url).pathname});
 const services=createSurveyServer({ctx});await new Promise(r=>services.server.listen(0,'127.0.0.1',r));owned={...services,ctx};base=`http://127.0.0.1:${services.server.address().port}`;origins.push(base);
 await page.goto((process.env.CITY2127_CITY_URL??'http://127.0.0.1:5194')+'/?survey='+encodeURIComponent(base.replace('http','ws')+'/ws')+'&hour=12',{waitUntil:'domcontentloaded'});await page.bringToFront();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);
}
const pose=()=>page.evaluate(()=>window.cityShot());
const at=async p=>assert.ok(Math.hypot(...(await pose()).position.map((x,i)=>x-p[i]))<.02);
const data=()=>page.locator('canvas').evaluate(c=>({time:Number(c.dataset.time),fps:Number(c.dataset.fps),hub:JSON.parse(c.dataset.siteAssets).magnetEast.automationHub,district:JSON.parse(c.dataset.siteAssets).magnetEast.automationDistrict,energy:JSON.parse(c.dataset.energy)}));
async function submit(axis='service-2127'){
 const s=await api('/api/proposal-sessions',{});return api('/api/proposals',{submissionId:crypto.randomUUID(),guestSessionId:s.session.id,expectedRevision:s.state.revision,answers:s.questions.map(q=>({questionId:q.id,optionId:q.id==='energy-2127'?(axis.startsWith('energy-')?axis.slice(7):'water-storage'):q.options[q.id===axis?2:1].id}))});
}
let energyChoice;
async function live(id){
 const before=await data(),started=Date.now();await submit(id.startsWith('energy:')?'energy-'+energyChoice:'service-2127');const samples=[];
 let hold;
 while(Date.now()-started<30000){
  const d=await data();if(samples.at(-1)?.time!==d.time)samples.push({elapsedMs:Date.now()-started,...d});
  const current=await pose();if(Math.hypot(...current.position.map((x,i)=>x-SHOTS[id].position[i]))<.02)hold??=Date.now();
  if(hold&&Date.now()-hold>=2500)break;await page.waitForTimeout(100);
 }
 assert.ok(hold,'queued live result never reached its authored hold');
 await at(SHOTS[id].position);const place=await page.locator('.resident-place').textContent();assert.match(place,/デックス|サービス|街を巡る|海辺の蓄電庭園|沖の受電翼|沖のエネルギー島/);
 await page.screenshot({path:`${out}/${id.replace(':','-')}.jpg`,type:'jpeg',quality:90});checks.push({check:'live hold',id,before,samples,place,pose:await pose(),pass:true});return samples;
}
async function undo(){const a=await api('/api/admin/current-run'),v=await api('/api/city-view');await api('/api/admin/lifecycle',{command:'undo-proposal',expectedRevision:a.lifecycle.revision,proposalId:v.latestProposal.id});await page.waitForTimeout(250);await at(HERO_POSITION);checks.push({check:'Undo immediately restores hero',pass:true});}
try{
 await open();const hub=await live('nw:focal');
 assert.ok(hub.some(s=>s.hub.visibleAutomatedPorts+s.hub.visibleHumanCounters>6),'service slots expose complementary intermediate forms');
 checks.push({check:'six service slots show intermediate easing',pass:true});
 const settled=await data();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);await at(HERO_POSITION);assert.deepEqual((await data()).hub,settled.hub);assert.deepEqual((await data()).district,settled.district);checks.push({check:'reload snapshot immediately restores settled hub, district and hero',pass:true});
 const district=await live('nw:district');const end=district.at(-1).district;assert.ok(district.some(s=>s.district.visibleStaffedPavilions+s.district.visibleDronePorts>end.visibleStaffedPavilions+end.visibleDronePorts),'district exposes complementary intermediate geometry');checks.push({check:'district shows intermediate easing',pass:true});await undo();
 await page.waitForFunction(target=>JSON.parse(document.querySelector('canvas').dataset.siteAssets).magnetEast.automationDistrict.targetAutomation===target,settled.district.targetAutomation);
 assert.deepEqual((await data()).hub,settled.hub);assert.deepEqual((await data()).district,settled.district);checks.push({check:'Undo restores previous hub and district counts on next diagnostic refresh',pass:true});
 await page.emulateMedia({reducedMotion:'reduce'});await submit();await page.waitForTimeout(250);await at(HERO_POSITION);await page.waitForTimeout(2500);await at(HERO_POSITION);const reduced=await data();assert.equal(reduced.hub.visibleAutomatedPorts,reduced.hub.targetAutomatedPorts);assert.equal(reduced.hub.visibleHumanCounters,reduced.hub.targetHumanCounters);assert.equal(reduced.district.activePulses,0);checks.push({check:'reduced-motion NW stays at hero and settles geometry without pulses',diagnostics:reduced,pass:true});
 await page.emulateMedia({reducedMotion:'no-preference'});
 for (const [id,choice,preload,index] of [['energy:garden2','water-storage',2,2],['energy:wing','orbital-supply',1,0],['energy:island','island-supply',1,4]]) {
  energyChoice=choice;await open();
  for(let i=0;i<preload;i++){await submit('energy-'+choice);await page.waitForTimeout(16000);}
  const samples=await live(id);assert.ok(samples.some(s=>s.energy.parts[index].opacity>0&&s.energy.parts[index].opacity<1),'energy local transition has no intermediate fade');checks.push({check:'local energy fade',id,pass:true});await undo();
  await page.emulateMedia({reducedMotion:'reduce'});await submit('energy-'+choice);await page.waitForTimeout(250);await at(HERO_POSITION);await page.waitForTimeout(2500);await at(HERO_POSITION);
  const immediate=await data();assert.equal(immediate.energy.parts[index].opacity,1);assert.equal(immediate.energy.parts[index].visible,true);checks.push({check:'reduced-motion energy settles immediately at hero',id,diagnostics:immediate.energy,pass:true});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);await at(HERO_POSITION);const reloaded=await data();assert.deepEqual(reloaded.energy.target,immediate.energy.target);assert.equal(reloaded.energy.parts[index].opacity,1);checks.push({check:'energy reload snapshot restores target and full part at hero',id,pass:true});
  await page.emulateMedia({reducedMotion:'no-preference'});
 }
 assert.deepEqual(errors,[]);complete=true;

}finally{
 writeFileSync(`${out}/browser.json`,JSON.stringify({complete,browser:browser.version(),apiOrigin:base,apiOrigins:origins,viewport:[1920,1080],dpr:1,quality:'default',checks,errors,timing:'Wait for the actual authored hold plus2.5s (queued submissions may wait behind earlier slots). Browser diagnostics refresh each120 frames (~2s); intermediate states prove easing. Exact3s duration/retarget remains covered by root tests; no3.000s browser precision claim.',fixtures:'Real current v4 service, water, receiver and island proposals; isolated scratch SQLite.'},null,2)+'\n');await browser.close();await closeServer();for(const dir of scratch)rmSync(dir,{recursive:true,force:true});
}
