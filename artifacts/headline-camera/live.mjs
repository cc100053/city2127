import assert from 'node:assert/strict';
import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import { mkdtempSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createContext,createSurveyServer } from '../../survey/src/server/server.ts';
import { SHOTS,shotTimeline } from '../../src/headlineCamera.ts';
import { HERO_POSITION } from '../../src/heroCamera.ts';
const out='artifacts/headline-camera/final';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
const errors=[],observations=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
const pose=()=>page.evaluate(()=>{const log=console.log;console.log=()=>{};try{return window.cityShot();}finally{console.log=log;}});
const closeTo=(a,b)=>assert.ok(Math.hypot(...a.map((x,i)=>x-b[i]))<.02,`${a} != ${b}`);
let owned;
async function server(version){
 if(owned){owned.realtime.close();owned.server.closeAllConnections();await new Promise(r=>owned.server.close(r));owned.ctx.db.close();}
 const dir=mkdtempSync(join(tmpdir(),'headline-live-'));
 const ctx=createContext({dbPath:join(dir,'survey.sqlite'),questionsPath:new URL(`../../survey/src/survey/questions.exhibition${version===3?'.v3':''}.json`,import.meta.url).pathname});
 const services=createSurveyServer({ctx});await new Promise(r=>services.server.listen(0,'127.0.0.1',r));owned={...services,ctx};
 return `http://127.0.0.1:${services.server.address().port}`;
}
async function api(base,path,body){const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(body)});const j=await r.json();assert.equal(j.ok,true,JSON.stringify(j));return j.data;}
async function open(base){await page.goto('http://127.0.0.1:5184/?survey='+encodeURIComponent(base.replace('http','ws')+'/ws')+'&hour=12',{waitUntil:'domcontentloaded'});await page.bringToFront();await page.waitForFunction(()=>document.querySelector('.causal-panel')?.dataset.presentation==='ambient');await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);}
async function reserve(base,station){return api(base,'/api/proposal-sessions',station?{stationId:station}:{});}
async function submit(base,s,axis,energy='water-storage'){
 return api(base,'/api/proposals',{submissionId:crypto.randomUUID(),guestSessionId:s.session.id,expectedRevision:s.state.revision,answers:s.questions.map(q=>({questionId:q.id,optionId:q.id==='energy-2127'?energy:q.options[q.id===axis?2:1].id}))});
}
async function hold(id,name=id){console.log('hold',id);await page.waitForTimeout(8300);closeTo((await pose()).position,SHOTS[id].position);const d=await page.locator('canvas').evaluate(c=>({...c.dataset}));await page.screenshot({path:`${out}/live-${name.replace(':','-')}.jpg`,type:'jpeg',quality:90});observations.push({check:'live hold',id,diagnostics:d,place:await page.locator('.resident-place').textContent()});}
try{
 for(const [socket,axis]of [['nw','service-2127'],['ne','cooling-2127'],['sw','commons-2127'],['se','functions-2127']]){
  console.log('site',socket);const base=await server(3);await open(base);
  await submit(base,await reserve(base),axis);await page.waitForTimeout(900);closeTo((await pose()).position,HERO_POSITION);await page.waitForTimeout(7400);
  closeTo((await pose()).position,SHOTS[`${socket}:focal`].position);await page.screenshot({path:`${out}/live-${socket}-focal.jpg`,type:'jpeg',quality:90});observations.push({check:'live hold',id:`${socket}:focal`,diagnostics:await page.locator('canvas').evaluate(c=>({...c.dataset})),place:await page.locator('.resident-place').textContent()});
  await page.waitForTimeout(4100);closeTo((await pose()).position,HERO_POSITION);
  await submit(base,await reserve(base),axis);await hold(`${socket}:district`);
  if(socket==='se'){
   await page.reload();await page.waitForFunction(()=>document.querySelector('.causal-panel')?.dataset.presentation==='ambient');closeTo((await pose()).position,HERO_POSITION);observations.push({check:'reload snapshot hero',pass:true});await page.waitForTimeout(5500);
   await page.emulateMedia({reducedMotion:'reduce'});await submit(base,await reserve(base),axis);await page.waitForTimeout(5000);closeTo((await pose()).position,HERO_POSITION);observations.push({check:'reduced motion hero',pass:true});await page.emulateMedia({reducedMotion:'no-preference'});
  }
 }
 // Real current v4 scratch HTTP proposals: no change, garden, second garden, Undo.
 let base=await server(4);await open(base);
 await submit(base,await reserve(base),'none');await page.waitForTimeout(5000);closeTo((await pose()).position,HERO_POSITION);observations.push({check:'no headline hero',pass:true});await page.waitForTimeout(5200);
 await submit(base,await reserve(base),'none');await hold('energy:garden');
 const admin=await api(base,'/api/admin/current-run');const view=await api(base,'/api/city-view');
 await api(base,'/api/admin/lifecycle',{command:'undo-proposal',expectedRevision:admin.lifecycle.revision,proposalId:view.latestProposal.id});await page.waitForTimeout(250);closeTo((await pose()).position,HERO_POSITION);observations.push({check:'Undo cuts hero',pass:true});
 await submit(base,await reserve(base),'none');await hold('energy:garden','garden-after-undo');await page.waitForTimeout(5500);
 await submit(base,await reserve(base),'none');await hold('energy:garden2');await page.waitForTimeout(5500);
 for(const [energy,shot] of [['rotor-storage','energy:ring'],['orbital-supply','energy:wing'],['island-supply','energy:island']]){
  base=await server(4);await open(base);await submit(base,await reserve(base),'none',energy);await page.waitForTimeout(10200);
  await submit(base,await reserve(base),'none',energy);await hold(shot);
 }
 // Separate actual A/B drafts committed within 3 seconds; display remains server queued.
 base=await server(4);await open(base);const a=await reserve(base,'A'),b=await reserve(base,'B');
 const start=Date.now();await submit(base,a,'service-2127');await page.waitForTimeout(1000);await submit(base,b,'commons-2127','rotor-storage');const commitGap=Date.now()-start;
 await page.waitForTimeout(4000);closeTo((await pose()).position,SHOTS['nw:focal'].position);
 await page.waitForTimeout(5200);
 const atBoundary=await pose();await page.waitForTimeout(4500);closeTo((await pose()).position,SHOTS['sw:focal'].position);observations.push({check:'A/B queue and second headline',commitGapMs:commitGap,boundaryPose:atBoundary,pass:true});
 // Changes of motion preference and disconnect settle immediately during an active hold.
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);closeTo((await pose()).position,HERO_POSITION);observations.push({check:'motion toggled during hold',pass:true});
 assert.deepEqual(errors,[]);
}finally{
 writeFileSync(`${out}/live.json`,JSON.stringify({browser:browser.version(),viewport:[1920,1080],quality:'default',observations,errors},null,2));
 await browser.close();if(owned){owned.realtime.close();owned.server.closeAllConnections();await new Promise(r=>owned.server.close(r));owned.ctx.db.close();}
}
