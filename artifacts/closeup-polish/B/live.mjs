// Scoped real-server sector B regression; scratch data and all services are closed in finally.
import assert from 'node:assert/strict';
import {chromium} from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createContext,createSurveyServer} from '../../../survey/src/server/server.ts';
import {SHOTS} from '../../../src/headlineCamera.ts';
import {HERO_POSITION} from '../../../src/heroCamera.ts';
const out=process.env.CITY2127_EVIDENCE_DIR??'artifacts/closeup-polish/B/live';assert.ok(!existsSync(out),'Preserve existing live evidence; choose a fresh directory.');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
const errors=[],checks=[],scratch=[];let owned,base;
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
const api=async(path,body)=>{const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(body)});const j=await r.json();assert.equal(j.ok,true,JSON.stringify(j));return j.data;};
async function closeServer(){if(!owned)return;owned.realtime.close();owned.server.closeAllConnections();await new Promise(r=>owned.server.close(r));owned.ctx.db.close();owned=null;}
async function open(){
 await page.goto('about:blank');await closeServer();const dir=mkdtempSync(join(tmpdir(),'closeup-b-'));scratch.push(dir);
 const ctx=createContext({dbPath:join(dir,'survey.sqlite'),questionsPath:new URL('../../../survey/src/survey/questions.exhibition.json',import.meta.url).pathname});
 const services=createSurveyServer({ctx});await new Promise(r=>services.server.listen(0,'127.0.0.1',r));owned={...services,ctx};base=`http://127.0.0.1:${services.server.address().port}`;
 await page.goto((process.env.CITY2127_CITY_URL??'http://127.0.0.1:5194')+'/?survey='+encodeURIComponent(base.replace('http','ws')+'/ws')+'&hour=12',{waitUntil:'domcontentloaded'});await page.bringToFront();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);
}
const pose=()=>page.evaluate(()=>window.cityShot());
const at=async p=>assert.ok(Math.hypot(...(await pose()).position.map((x,i)=>x-p[i]))<.02);
const data=()=>page.locator('canvas').evaluate(c=>({time:Number(c.dataset.time),fps:Number(c.dataset.fps),commons:JSON.parse(c.dataset.siteAssets).dogenzakaSouth.commonsPlaza,district:JSON.parse(c.dataset.siteAssets).dogenzakaSouth.sharingDistrict,energy:JSON.parse(c.dataset.energy)}));
async function submit(axis='commons-2127'){
 const s=await api('/api/proposal-sessions',{});return api('/api/proposals',{submissionId:crypto.randomUUID(),guestSessionId:s.session.id,expectedRevision:s.state.revision,answers:s.questions.map(q=>({questionId:q.id,optionId:q.id==='energy-2127'?'water-storage':q.options[q.id===axis?2:1].id}))});
}
async function live(id){
 const before=await data(),started=Date.now();await submit();const samples=[];
 while(Date.now()-started<8300){const d=await data();if(samples.at(-1)?.time!==d.time)samples.push({elapsedMs:Date.now()-started,...d});await page.waitForTimeout(100);}
 await at(SHOTS[id].position);const place=await page.locator('.resident-place').textContent();assert.match(place,/アクアシティ南|水辺の居場所・庭の広場/);
 await page.screenshot({path:`${out}/${id.replace(':','-')}.jpg`,type:'jpeg',quality:90});checks.push({check:'live hold',id,before,samples,place,pose:await pose(),pass:true});return samples;
}
async function undo(){const a=await api('/api/admin/current-run'),v=await api('/api/city-view');await api('/api/admin/lifecycle',{command:'undo-proposal',expectedRevision:a.lifecycle.revision,proposalId:v.latestProposal.id});await page.waitForTimeout(250);await at(HERO_POSITION);checks.push({check:'Undo immediately restores hero',pass:true});}
try{
 await open();const seats=await live('sw:focal');
 assert.ok(seats.some(s=>s.commons.visibleSharedSeats>s.commons.targetSharedSeats||s.commons.visibleScreenedSeats>s.commons.targetScreenedSeats),'live seats expose complementary intermediate geometry');
 checks.push({check:'live seats show intermediate easing',pass:true});
 const settled=await data();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);await at(HERO_POSITION);assert.deepEqual((await data()).commons,settled.commons);assert.deepEqual((await data()).district,settled.district);checks.push({check:'reload snapshot immediately restores settled commons, district and hero',pass:true});
 const district=await live('sw:district');assert.ok(district.some(s=>s.district.visibleOpenRooms+s.district.visiblePrivateRooms>s.district.rooms),'district shows complementary intermediate geometry');checks.push({check:'district shows intermediate easing',pass:true});await undo();
 await page.waitForFunction(target=>JSON.parse(document.querySelector('canvas').dataset.siteAssets).dogenzakaSouth.sharingDistrict.targetSharing===target,settled.district.targetSharing);
 assert.deepEqual((await data()).commons,settled.commons);assert.deepEqual((await data()).district,settled.district);checks.push({check:'Undo restores previous seat and district counts on next diagnostic refresh',pass:true});
 await page.emulateMedia({reducedMotion:'reduce'});await submit();await page.waitForTimeout(250);await at(HERO_POSITION);await page.waitForTimeout(2500);await at(HERO_POSITION);const reduced=await data();assert.equal(reduced.commons.visibleSharedSeats,reduced.commons.targetSharedSeats);assert.equal(reduced.commons.visibleScreenedSeats,reduced.commons.targetScreenedSeats);assert.ok(reduced.district.targetSharing>settled.district.targetSharing);assert.equal(reduced.district.visibleOpenRooms+reduced.district.visiblePrivateRooms,reduced.district.rooms);assert.equal(reduced.district.activePulses,0);checks.push({check:'reduced-motion SW stays at hero and next diagnostics show settled geometry without pulses',diagnostics:reduced,pass:true});
 assert.deepEqual(errors,[]);
}finally{
 writeFileSync(`${out}/browser.json`,JSON.stringify({browser:browser.version(),apiOrigin:base,viewport:[1920,1080],dpr:1,quality:'default',checks,errors,timing:'Browser diagnostics refresh each120 frames (~2s); intermediate states prove easing. Exact3s duration/retarget remains covered by root tests; no3.000s browser precision claim.',fixtures:'Real current v4 sharing proposals; isolated scratch SQLite.'},null,2)+'\n');await browser.close();await closeServer();for(const dir of scratch)rmSync(dir,{recursive:true,force:true});
}
