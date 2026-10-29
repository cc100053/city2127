// N1 live narration: current-v4 HTTP proposals on fresh dev:auto-mode scratch services (adapted from C1/live.mjs); never the exhibition DB.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,existsSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createContext,createSurveyServer} from '../../../survey/src/server/server.ts';
import {SHOTS} from '../../../src/headlineCamera.ts';
import {HERO_POSITION} from '../../../src/heroCamera.ts';
import {energyCycle} from '../../../src/energyPrototype.ts';
import {NARRATION} from '../../../src/energyNarration.ts';

const {chromium}=await import(process.env.CITY2127_PLAYWRIGHT_PATH??'/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs');
const out=process.env.CITY2127_EVIDENCE_DIR??'artifacts/closeup-next/N1/live';assert.ok(!existsSync(out),'Use fresh evidence directory');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
const errors=[],checks=[],scratch=[];let owned,base,sockets=[],complete=false;
page.on('pageerror',e=>errors.push({type:'page',message:e.message}));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push({type:'console',message:m.text(),url:m.location().url});});
const api=async(path,body)=>{const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(body)});const j=await r.json();assert.equal(j.ok,true,JSON.stringify(j));return j.data;};
const narration=()=>page.evaluate(()=>{const p=document.querySelector('.energy-narration');return {data:document.body.dataset.energyNarration?JSON.parse(document.body.dataset.energyNarration):null,hidden:p.hidden,title:p.querySelector('h2').textContent,steps:[...p.querySelectorAll('li')].map(li=>({text:li.textContent,active:li.classList.contains('active')})),note:p.querySelector('p').textContent,card:document.querySelector('.resident-card-copy')?.textContent??'',place:document.querySelector('.resident-place')?.textContent??''};});
const pose=()=>page.evaluate(()=>window.cityShot());
const near=(p,q)=>Math.hypot(...p.map((x,i)=>x-q[i]))<.02;
async function close(){if(owned){owned.realtime.close();owned.server.closeAllConnections();await new Promise(r=>owned.server.close(r));owned.ctx.db.close();owned=null;}}
async function open(){
 await page.goto('about:blank');await close();const dir=mkdtempSync(join(tmpdir(),'n1-narration-'));scratch.push(dir);sockets=[];
 const ctx=createContext({dbPath:join(dir,'survey.sqlite'),questionsPath:new URL('../../../survey/src/survey/questions.exhibition.json',import.meta.url).pathname});
 const services=createSurveyServer({ctx,devAuto:true,staticDir:new URL('../../../survey/dist',import.meta.url).pathname});services.server.on('connection',s=>sockets.push(s));
 await new Promise(r=>services.server.listen(0,'127.0.0.1',r));owned={...services,ctx};base=`http://127.0.0.1:${services.server.address().port}`;
 const config=await api('/api/admin/dev-survey-config');assert.equal(config.questionSetVersion,4);
 await page.goto((process.env.CITY2127_CITY_URL??'http://127.0.0.1:5196')+'/?survey='+encodeURIComponent(base.replace('http','ws')+'/ws')+'&hour=12');
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.energy);
 return {origin:base,database:join(dir,'survey.sqlite'),devAuto:true};
}
// The server holds each result's ten-second reading slot (single station), so the next proposal waits for it.
async function submit(option){
 for(const deadline=Date.now()+20000;;){try{return await propose(option);}catch(e){if(!String(e.message).includes('reading slot')||Date.now()>deadline)throw e;await new Promise(r=>setTimeout(r,250));}}
}
async function propose(option){
 const s=await api('/api/proposal-sessions',{});
 const request={submissionId:crypto.randomUUID(),guestSessionId:s.session.id,expectedRevision:s.state.revision,answers:s.questions.map(q=>({questionId:q.id,optionId:q.id==='energy-2127'?option:q.options[1].id}))};
 await api('/api/proposals',request);return api('/api/city-view');
}
async function undo(view){const admin=await api('/api/admin/current-run');await api('/api/admin/lifecycle',{command:'undo-proposal',expectedRevision:admin.lifecycle.revision,proposalId:view.latestProposal.id});}
// Rotor angle and shared time come from the same diagnostic frame (120-frame refresh); rounding of time allows ~1e-3 rad.
const rotor=()=>page.locator('canvas').evaluate(c=>({time:Number(c.dataset.time),angle:JSON.parse(c.dataset.energy).rotorAngle}));
async function sharedRotor(){const first=await rotor();await page.waitForFunction(t=>Number(document.querySelector('canvas').dataset.time)>t,first.time);const r=await rotor();return {...r,expected:energyCycle(r.time).angle,pass:Math.abs(r.angle-energyCycle(r.time).angle)<5e-3};}
const parts=[
 {part:'garden',option:'water-storage',preload:1,cancel:'Undo'},
 {part:'garden2',option:'water-storage',preload:2,cancel:'second live result'},
 {part:'ring',option:'rotor-storage',preload:1,cancel:'reconnect'},
 {part:'wing',option:'orbital-supply',preload:1,cancel:'reset'},
 {part:'island',option:'island-supply',preload:1,cancel:'reload snapshot'},
];
try{
 for(const spec of parts.filter(p=>!process.env.N1_PART||p.part===process.env.N1_PART)){
  const origin=await open(),record={...spec,origin};
  // Preloads and the reduced-motion result settle immediately (the client turns them into snapshots with no card).
  await page.emulateMedia({reducedMotion:'reduce'});
  for(let n=0;n<spec.preload;n++){await submit(spec.option);await page.waitForTimeout(400);}
  const still=await submit(spec.option),stillSamples=[];
  for(const end=Date.now()+5000;Date.now()<end;await page.waitForTimeout(250))stillSamples.push(await narration());
  assert.ok(stillSamples.every(n=>n.data===null&&n.hidden),'reduced motion never narrates');assert.ok(near((await pose()).position,HERO_POSITION));
  await page.screenshot({path:`${out}/${spec.part}-reduced.jpg`,type:'jpeg',quality:90});
  record.reduced={energy:still.latestProposal.afterLayout.energy,samples:stillSamples.length,presentation:await page.evaluate(()=>document.querySelector('.resident-panel')?.dataset.presentation),pass:true};
  await undo(still);await page.waitForTimeout(400);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(800);
  // Full live narration with the real clock.
  const started=Date.now(),view=await submit(spec.option),samples=[];let charge=null,release=null,hold=false;
  while(Date.now()-started<13500){
   const n=await narration(),p=await pose(),elapsedMs=Date.now()-started;
   if(near(p.position,SHOTS[`energy:${spec.part}`].position))hold=true;
   const t=n.data&&typeof n.data.seconds==='number'?((n.data.seconds%60)+60)%60:null;
   if(samples.at(-1)?.step!==n.data?.step||samples.at(-1)?.hidden!==n.hidden)samples.push({elapsedMs,step:n.data?.step??null,hidden:n.hidden,t});
   if(!charge&&n.data?.step===0&&t>=16&&t<20){await page.screenshot({path:`${out}/${spec.part}-charge.jpg`,type:'jpeg',quality:90});charge={elapsedMs,t,n};}
   if(!release&&n.data?.step===2&&t>=52&&t<59){await page.screenshot({path:`${out}/${spec.part}-release.jpg`,type:'jpeg',quality:90});release={elapsedMs,t,n};}
   await page.waitForTimeout(80);
  }
  assert.ok(hold&&charge&&release,`${spec.part}: authored hold plus charge and release captions (${JSON.stringify(samples)})`);
  assert.equal(charge.n.title,NARRATION[spec.part].title);assert.deepEqual(charge.n.steps.map(s=>s.text),[...NARRATION[spec.part].steps]);
  assert.ok(near((await pose()).position,HERO_POSITION),'returns to hero');assert.equal((await narration()).hidden,true,'caption leaves with fly-out');
  const shown=samples.filter(s=>!s.hidden),steps=[0,1,2].map(i=>{const a=samples.find(s=>s.step===i&&!s.hidden),b=samples.find(s=>a&&s.elapsedMs>a.elapsedMs&&s.step!==i);return a&&b?(b.elapsedMs-a.elapsedMs)/1000:null;});
  record.live={view:view.latestProposal.afterLayout.energy,samples,charge:{elapsedMs:charge.elapsedMs,t:charge.t,card:charge.n.card,place:charge.n.place},release:{elapsedMs:release.elapsedMs,t:release.t,card:release.n.card,place:release.n.place},
   stepSeconds:steps,captionFirstMs:shown[0]?.elapsedMs,chars:NARRATION[spec.part].steps.map(s=>s.replace(/\s/g,'').length),pass:true};
  // One interruption per part, mid-narration: caption hides at once and the energy clock returns to shared time.
  await undo(view);await page.waitForTimeout(800);
  const again=await submit(spec.option);await page.waitForFunction(()=>JSON.parse(document.body.dataset.energyNarration??'{}').step===1,null,{timeout:12000});
  const before=await narration(),at=Date.now();
  if(spec.cancel==='Undo')await undo(again);
  if(spec.cancel==='second live result'){await submit(spec.option);record.secondAfterMs=Date.now()-at;}
  if(spec.cancel==='reconnect'){for(const s of sockets)s.destroy();}
  if(spec.cancel==='reset'){let s=await api('/api/admin/current-run');await api('/api/admin/lifecycle',{command:'guest-left',expectedRevision:s.lifecycle.revision});s=await api('/api/admin/current-run');await api('/api/admin/lifecycle',{command:'reset-city',confirmation:'RESET',expectedRevision:s.lifecycle.revision});}
  if(spec.cancel==='reload snapshot'){await page.reload();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.energy);}
  await page.waitForFunction(p=>{const d=document.body.dataset.energyNarration;return document.querySelector('.energy-narration').hidden&&(!d||JSON.parse(d).part!==p);},spec.part,{timeout:5000});
  const cancelMs=Date.now()-at,after=await narration();await page.waitForTimeout(spec.cancel==='second live result'?200:600);
  const heroAfter=spec.cancel==='second live result'?null:near((await pose()).position,HERO_POSITION);
  record.cancel={kind:spec.cancel,before:before.data,after:after.data,cancelMs,heroAfter,rotor:spec.part==='ring'||spec.cancel!=='reset'?await sharedRotor():null,pass:true};
  if(heroAfter===false)throw new Error(`${spec.cancel} did not return to hero`);
  if(record.cancel.rotor&&!record.cancel.rotor.pass)throw new Error(`rotor clock not restored: ${JSON.stringify(record.cancel.rotor)}`);
  checks.push(record);console.log(spec.part,JSON.stringify({steps:record.live.stepSeconds,cancel:record.cancel.kind,cancelMs}));
 }
 assert.deepEqual(errors,[]);complete=true;
}finally{
 writeFileSync(`${out}/browser.json`,JSON.stringify({complete,browser:browser.version(),viewport:[1920,1080],dpr:1,quality:'default',
  mode:'Same createSurveyServer devAuto:true and fresh mkdtemp SQLite isolation as npm run dev:auto, dynamic loopback ports; proposals through the real HTTP API, city over real WebSocket. Guest UI not exercised.',
  timing:'Real clock and unchanged DISPLAY_MS. The single-station server refuses a second proposal until the reading slot ends, so the second live result arrives after the caption window (it then cancels the persisted part clock). Sampling ~80 ms plus evaluate latency, so step seconds are ±0.2 s; exact plan timing is in tests/energyNarration.test.ts.',checks,errors},null,2)+'\n');
 await browser.close();await close();for(const dir of scratch)rmSync(dir,{recursive:true,force:true});
}
