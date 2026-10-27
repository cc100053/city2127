import assert from 'node:assert/strict';
import {chromium} from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createContext,createSurveyServer} from '../../../survey/src/server/server.ts';
import {SHOTS} from '../../../src/headlineCamera.ts';
import {HERO_POSITION} from '../../../src/heroCamera.ts';
const out='artifacts/headline-camera/correction-1';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
let owned;
const pose=()=>page.evaluate(()=>{const log=console.log;console.log=()=>{};try{return window.cityShot();}finally{console.log=log;}});
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
async function start(version){
 await page.goto('about:blank');
 if(owned){owned.realtime.close();owned.server.closeAllConnections();await new Promise(r=>owned.server.close(r));owned.ctx.db.close();}
 const dir=mkdtempSync(join(tmpdir(),'headline-correction-'));
 const ctx=createContext({dbPath:join(dir,'survey.sqlite'),questionsPath:new URL(`../../../survey/src/survey/questions.exhibition${version===3?'.v3':''}.json`,import.meta.url).pathname});
 owned={ctx,...createSurveyServer({ctx})};await new Promise(r=>owned.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${owned.server.address().port}`;
 await page.goto('http://127.0.0.1:5184/?survey='+encodeURIComponent(base.replace('http','ws')+'/ws')+'&hour=12',{waitUntil:'domcontentloaded'});await page.bringToFront();
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);
 return base;
}
async function api(base,path,body){const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(body)});const j=await r.json();assert.equal(j.ok,true,JSON.stringify(j));return j.data;}
const reserve=(base,station)=>api(base,'/api/proposal-sessions',station?{stationId:station}:{});
const submit=(base,s,axis,energy='water-storage',choice=2)=>api(base,'/api/proposals',{submissionId:crypto.randomUUID(),guestSessionId:s.session.id,expectedRevision:s.state.revision,answers:s.questions.map(q=>({questionId:q.id,optionId:q.id==='energy-2127'?energy:q.options[q.id===axis?choice:1].id}))});
try{
 let base=await start(4);const a=await reserve(base,'A'),b=await reserve(base,'B');
 await page.evaluate(()=>{window.correctionFrames=[];window.recordCorrection=true;const read=()=>{if(!window.recordCorrection)return;const log=console.log;console.log=()=>{};try{window.correctionFrames.push({at:performance.now(),...window.cityShot(),identity:document.querySelector('.causal-panel section .causal-context')?.textContent});}finally{console.log=log;}requestAnimationFrame(read);};requestAnimationFrame(read);});
 const started=Date.now();await submit(base,a,'service-2127');await page.waitForTimeout(1000);const saved=await submit(base,b,'service-2127','rotor-storage',0);const gap=Date.now()-started;
 assert.deepEqual(saved.proposal.beforeLayout,saved.proposal.afterLayout,'B is a genuine proposal with no headline layout/energy change');
 await page.waitForTimeout(7200);assert.ok(distance((await pose()).position,SHOTS['nw:focal'].position)<.02);
 await page.waitForTimeout(5000);assert.ok(distance((await pose()).position,HERO_POSITION)<.02);
 const frames=await page.evaluate(()=>{window.recordCorrection=false;return window.correctionFrames;});
 const index=frames.findIndex(f=>f.identity?.includes('#2'));assert.ok(index>0);
 const jump=distance(frames[index].position,frames[index-1].position);assert.ok(jump<10,`B first-frame jump ${jump}m`);
 const steps=frames.slice(index+1).map((f,i)=>({dt:f.at-frames[index+i].at,d:distance(f.position,frames[index+i].position)})).filter(s=>s.dt<100);
 const maxStep=Math.max(...steps.map(s=>s.d));assert.ok(maxStep<50,`smooth-return frame step ${maxStep}m`);
 const returned=frames.filter(f=>f.at>=frames[index].at+2100);assert.ok(returned.length>20);assert.ok(returned.every(f=>distance(f.position,HERO_POSITION)<.02),'no fly-in after the no-headline return');
 await page.screenshot({path:`${out}/ab-no-headline-hero.jpg`,type:'jpeg',quality:90});
 await page.mouse.wheel(0,-200);await page.waitForTimeout(350);assert.ok(distance((await pose()).position,HERO_POSITION)>1,'OrbitControls re-enabled after return');
 checks.push({check:'real v4 A/B headline to no-headline smooth return',gapMs:gap,bFirstFrameJumpMetres:jump,maxFrameStepMetres:maxStep,heroFramesAfterReturn:returned.length,controlsReenabled:true,pass:true});writeFileSync(`${out}/ab-frames.json`,JSON.stringify(frames));
 base=await start(3);await submit(base,await reserve(base),'commons-2127');await page.waitForTimeout(12400);const before=await api(base,'/api/city-view');
 await submit(base,await reserve(base),'commons-2127');const after=await api(base,'/api/city-view');await page.waitForTimeout(8300);
 assert.ok(distance((await pose()).position,SHOTS['sw:district'].position)<.02);
 const diagnostics=await page.locator('canvas').evaluate(c=>({...c.dataset}));
 await page.screenshot({path:'artifacts/headline-camera/final/live-sw-district.jpg',type:'jpeg',quality:90});
 const carriers=await page.evaluate(async({before,after})=>{
  const {heroCamera}=await import('/src/heroCamera.ts');const {SharingDistrict}=await import('/src/districtMeters.ts');const {SHOTS}=await import('/src/headlineCamera.ts');
  const camera=heroCamera(1920,1080);const district=new SharingDistrict(camera);district.setTarget(before.layout,0,true,before.slotSeeds?.publicSharing);const old=district.getConfiguration();district.setTarget(after.layout,1,true,after.slotSeeds?.publicSharing);const next=district.getConfiguration();
  const shot=SHOTS['sw:district'];camera.position.set(...shot.position);camera.lookAt(...shot.target);camera.updateMatrixWorld();
  return [...district.bays.map((p,i)=>({kind:'room',index:i,p,changed:JSON.stringify(old[0][i])!==JSON.stringify(next[0][i])})),...district.courts.map((p,i)=>({kind:'court',index:i,p,changed:JSON.stringify(old[1][i])!==JSON.stringify(next[1][i])}))].map(c=>{const ndc=camera.position.clone().set(c.p.x,2.8,c.p.z).project(camera);return {...c,ndc:ndc.toArray(),inFrame:Math.abs(ndc.x)<.9&&Math.abs(ndc.y)<.9&&Math.abs(ndc.z)<1};});
 },{before,after});
 assert.ok(carriers.filter(c=>c.kind==='room'&&c.changed&&c.inFrame).length>=2,'at least two genuinely changed sharing water rooms lie safely inside the frame');
 const livePath='artifacts/headline-camera/final/live.json';const live=JSON.parse(readFileSync(livePath,'utf8'));const replacement=live.observations.find(o=>o.id==='sw:district');replacement.diagnostics=diagnostics;replacement.place=await page.locator('.resident-place').textContent();replacement.correction='headline-camera-correction-1';writeFileSync(livePath,JSON.stringify(live,null,2));
 checks.push({check:'SW actual sharing district hold',pose:await pose(),diagnostics,tiers:after.layout.tiers,seed:after.slotSeeds?.publicSharing,carriers,pass:true});
 assert.deepEqual(errors,[]);
}finally{
 writeFileSync(`${out}/browser.json`,JSON.stringify({browser:browser.version(),viewport:[1920,1080],dpr:1,quality:'default',checks,errors},null,2));
 await browser.close();if(owned){owned.realtime.close();owned.server.closeAllConnections();await new Promise(r=>owned.server.close(r));owned.ctx.db.close();}
}
