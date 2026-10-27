// Scoped real-server sector A regression; scratch data and all services are closed in finally.
import assert from 'node:assert/strict';
import {chromium} from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createContext,createSurveyServer} from '../../../survey/src/server/server.ts';
import {SHOTS} from '../../../src/headlineCamera.ts';
import {HERO_POSITION} from '../../../src/heroCamera.ts';
const out=process.env.CITY2127_EVIDENCE_DIR??'artifacts/closeup-polish/A/live';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
const errors=[],checks=[],scratch=[];let owned,base;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
const api=async(path,body)=>{const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(body)});const j=await r.json();assert.equal(j.ok,true,JSON.stringify(j));return j.data;};
async function closeServer(){if(!owned)return;owned.realtime.close();owned.server.closeAllConnections();await new Promise(r=>owned.server.close(r));owned.ctx.db.close();owned=null;}
async function open(version){
 await page.goto('about:blank');await closeServer();const dir=mkdtempSync(join(tmpdir(),'closeup-a-'));scratch.push(dir);
 const ctx=createContext({dbPath:join(dir,'survey.sqlite'),questionsPath:new URL(`../../../survey/src/survey/questions.exhibition${version===3?'.v3':''}.json`,import.meta.url).pathname});
 const services=createSurveyServer({ctx});await new Promise(r=>services.server.listen(0,'127.0.0.1',r));owned={...services,ctx};base=`http://127.0.0.1:${services.server.address().port}`;
 await page.goto((process.env.CITY2127_CITY_URL??'http://127.0.0.1:5194')+'/?survey='+encodeURIComponent(base.replace('http','ws')+'/ws')+'&hour=12',{waitUntil:'domcontentloaded'});await page.bringToFront();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);
}
const pose=()=>page.evaluate(()=>window.cityShot());
const at=async p=>assert.ok(Math.hypot(...(await pose()).position.map((x,i)=>x-p[i]))<.02);
const data=()=>page.locator('canvas').evaluate(c=>({time:Number(c.dataset.time),fps:Number(c.dataset.fps),park:JSON.parse(c.dataset.siteAssets).stationEastPark.environmentPark,district:JSON.parse(c.dataset.siteAssets).stationEastPark.environmentDistrict,energy:JSON.parse(c.dataset.energy)}));
async function submit(axis='cooling-2127'){
 const s=await api('/api/proposal-sessions',{});return api('/api/proposals',{submissionId:crypto.randomUUID(),guestSessionId:s.session.id,expectedRevision:s.state.revision,answers:s.questions.map(q=>({questionId:q.id,optionId:q.id==='energy-2127'?'water-storage':q.options[q.id===axis?2:1].id}))});
}
async function live(id){
 const before=await data(),started=Date.now();await submit(id.startsWith('energy:')?'none':'cooling-2127');const samples=[];
 while(Date.now()-started<8300){const d=await data();if(samples.at(-1)?.time!==d.time)samples.push({elapsedMs:Date.now()-started,...d});await page.waitForTimeout(100);}
 await at(SHOTS[id].position);const place=await page.locator('.resident-place').textContent();assert.match(place,id.startsWith('energy:')?/海辺の蓄電庭園/:/海浜公園|海辺の歩道/);
 await page.screenshot({path:`${out}/${id.replace(':','-')}.jpg`,type:'jpeg',quality:90});checks.push({check:'live hold',id,before,samples,place,pose:await pose(),pass:true});return samples;
}
async function undo(){const a=await api('/api/admin/current-run'),v=await api('/api/city-view');await api('/api/admin/lifecycle',{command:'undo-proposal',expectedRevision:a.lifecycle.revision,proposalId:v.latestProposal.id});await page.waitForTimeout(250);await at(HERO_POSITION);checks.push({check:'Undo immediately restores hero',pass:true});}
try{
 // Historical Q3 climate fixture exercises the retained current v2 Meter geometry; current v4 Q3 is energy.
 await open(3);const park=await live('ne:focal');assert.ok(park.some(s=>s.park.plantedFraction>.5&&s.park.plantedFraction<.8),'live Park exposes an intermediate eased planting target');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);await at(HERO_POSITION);assert.equal((await data()).park.plantedFraction,.8);checks.push({check:'reload snapshot immediately restores settled Park and hero',pass:true});
 await live('ne:district');await undo();
 await page.emulateMedia({reducedMotion:'reduce'});await submit();await page.waitForTimeout(250);await at(HERO_POSITION);await page.waitForTimeout(2500);await at(HERO_POSITION);checks.push({check:'reduced-motion NE result stays at hero',diagnostics:await data(),pass:true});await page.emulateMedia({reducedMotion:'no-preference'});
 await open(4);await submit('none');await page.waitForTimeout(10300);
 const energy=await live('energy:garden');assert.ok(energy.some(s=>s.energy.parts[1].opacity>0&&s.energy.parts[1].opacity<1),'water garden exposes an intermediate 3s fade');await undo();
 await page.waitForTimeout(2200);assert.equal((await data()).energy.parts[1].visible,false);checks.push({check:'energy Undo removes first water garden',pass:true});
 await page.emulateMedia({reducedMotion:'reduce'});await submit('none');await page.waitForTimeout(250);await at(HERO_POSITION);await page.waitForTimeout(2500);const still=await data();assert.equal(still.energy.parts[1].opacity,1);await at(HERO_POSITION);checks.push({check:'reduced-motion garden immediately settles without camera playback',diagnostics:still,pass:true});
 assert.deepEqual(errors,[]);
}finally{
 writeFileSync(`${out}/browser.json`,JSON.stringify({browser:browser.version(),viewport:[1920,1080],dpr:1,quality:'default',checks,errors,timing:'Browser diagnostics refresh each120 frames (~2s); intermediate states prove easing. Exact3s duration/retarget remains covered by root tests; no3.000s browser precision claim.',fixtures:'v3 historical climate for NE Meter; real current v4 energy proposals for garden; isolated scratch SQLite.'},null,2)+'\n');await browser.close();await closeServer();for(const dir of scratch)rmSync(dir,{recursive:true,force:true});
}
