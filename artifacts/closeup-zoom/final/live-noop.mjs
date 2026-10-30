// Current-v4 HTTP proposals on fresh dev:auto-mode scratch services; never the exhibition DB.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,existsSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createContext,createSurveyServer} from '../../../survey/src/server/server.ts';
import {SHOTS} from '../../../src/headlineCamera.ts';
import {HERO_POSITION} from '../../../src/heroCamera.ts';
import {emptyEnergyConfiguration} from '../../../survey/src/shared/energy.ts';

function authoritative(d,v){
 const l=v.layout,h=d.sites.magnetEast.automationHub,c=d.sites.dogenzakaSouth.commonsPlaza,p=d.sites.stationEastPark.environmentPark,t=d.sites.centerGaiRear.concentrationTower;
 assert.equal(h.targetAutomatedPorts,l.automatedPorts);assert.equal(h.targetHumanCounters,6-l.automatedPorts);assert.equal(h.visibleAutomatedPorts,l.automatedPorts);assert.equal(h.visibleHumanCounters,6-l.automatedPorts);
 assert.equal(c.targetSharedSeats,l.sharedSeats);assert.equal(c.targetScreenedSeats,8-l.sharedSeats);assert.equal(c.visibleSharedSeats,l.sharedSeats);assert.equal(c.visibleScreenedSeats,8-l.sharedSeats);
 assert.equal(p.targetTreeCount,l.treeCount);assert.equal(p.visibleTreeCount,l.treeCount);assert.equal(p.targetCoolingFins,l.coolingFins);assert.equal(p.visibleCoolingFins,l.coolingFins);assert.equal(p.plantedFraction,l.plantedFraction);
 assert.equal(t.targetFunctionModules,l.functionModules);assert.equal(t.activeFunctionModules,l.functionModules);assert.equal(t.transitioning,false);
 const e=l.energy??emptyEnergyConfiguration();assert.deepEqual(d.energy.target,e);assert.equal(d.guestCount,v.guestCount);
 const scales=[e.receiver==='none'?0:e.receiver==='small'?.65:1,e.waterGardens>0?1:0,e.waterGardens===2?.72:0,e.flywheel?1:0,e.island?1:0,e.waterGardens||e.flywheel||e.island||e.receiver!=='none'?1:0];
 d.energy.parts.forEach((p,i)=>{assert.equal(p.visible,scales[i]>0);assert.equal(p.opacity,scales[i]>0?1:0);if(scales[i])assert.ok(Math.abs(p.scaleY-scales[i])<1e-6);});
}
if(process.argv.includes('--self-test')){
 const l={automatedPorts:3,sharedSeats:4,treeCount:8,coolingFins:3,plantedFraction:.5,functionModules:5,energy:{receiver:'none',waterGardens:0,flywheel:false,island:false}};
 const d={guestCount:0,sites:{magnetEast:{automationHub:{targetAutomatedPorts:3,targetHumanCounters:3,visibleAutomatedPorts:3,visibleHumanCounters:3}},dogenzakaSouth:{commonsPlaza:{targetSharedSeats:4,targetScreenedSeats:4,visibleSharedSeats:4,visibleScreenedSeats:4}},stationEastPark:{environmentPark:{targetTreeCount:8,visibleTreeCount:8,targetCoolingFins:3,visibleCoolingFins:3,plantedFraction:.5}},centerGaiRear:{concentrationTower:{targetFunctionModules:5,activeFunctionModules:5,transitioning:false}}},energy:{target:l.energy,parts:Array.from({length:6},()=>({visible:false,opacity:0,scaleY:1}))}};
 authoritative(d,{layout:l,guestCount:0});delete l.energy;authoritative(d,{layout:l,guestCount:0});d.sites.magnetEast.automationHub.visibleAutomatedPorts=4;assert.throws(()=>authoritative(d,{layout:l,guestCount:0}));
 console.log('PASS: full four-site and energy assertions accept settled authority and reject stale counts.');process.exit(0);
}
const {chromium}=await import('/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs');
const out=process.env.CITY2127_EVIDENCE_DIR??'artifacts/closeup-zoom/final/T';assert.ok(!existsSync(out),'Use fresh evidence directory');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
const errors=[],checks=[],scratch=[],origins=[];let owned,base,complete=false;
page.on('pageerror',e=>errors.push({type:'page',message:e.message}));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push({type:'console',message:m.text(),url:m.location().url});});
const api=async(path,body)=>{const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(body)});const j=await r.json();assert.equal(j.ok,true,JSON.stringify(j));return j.data;};
const data=()=>page.locator('canvas').evaluate(c=>({time:Number(c.dataset.time),sites:JSON.parse(c.dataset.siteAssets),energy:JSON.parse(c.dataset.energy),guestCount:Number(document.querySelector('.causal-panel').dataset.guestCount)}));
const pose=()=>page.evaluate(()=>window.cityShot());
const at=async p=>assert.ok(Math.hypot(...(await pose()).position.map((x,i)=>x-p[i]))<.02);
async function close(){if(owned){owned.realtime.close();owned.server.closeAllConnections();await new Promise(r=>owned.server.close(r));owned.ctx.db.close();owned=null;}}
async function open(){
 await page.goto('about:blank');await close();const dir=mkdtempSync(join(tmpdir(),'closeup-z-auto-'));scratch.push(dir);
 const ctx=createContext({dbPath:join(dir,'survey.sqlite'),questionsPath:new URL('../../../survey/src/survey/questions.exhibition.json',import.meta.url).pathname});
 const services=createSurveyServer({ctx,devAuto:true,staticDir:new URL('../../../survey/dist',import.meta.url).pathname});await new Promise(r=>services.server.listen(0,'127.0.0.1',r));owned={...services,ctx};base=`http://127.0.0.1:${services.server.address().port}`;
 const config=await api('/api/admin/dev-survey-config');assert.equal(config.questionSetVersion,4);assert.equal(config.energy.options.length,4);origins.push({origin:base,database:join(dir,'survey.sqlite'),devAuto:true,config});
 await page.goto((process.env.CITY2127_CITY_URL??'http://127.0.0.1:5184')+'/?survey='+encodeURIComponent(base.replace('http','ws')+'/ws')+'&hour=12');
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps && document.querySelector('canvas')?.dataset.siteAssets && document.querySelector('canvas')?.dataset.energy, null, {timeout:120000});
}
async function submit(axis){
 const s=await api('/api/proposal-sessions',{});assert.equal(s.questions.length,4);
 const request={submissionId:crypto.randomUUID(),guestSessionId:s.session.id,expectedRevision:s.state.revision,answers:s.questions.map(q=>({questionId:q.id,optionId:q.id==='energy-2127'?(axis==='energy-only'?'rotor-storage':'water-storage'):q.options[q.id===axis?2:1].id}))};
 const saved=await api('/api/proposals',request);return {request,saved,view:await api('/api/city-view')};
}
async function settled(v){
 const deadline=Date.now()+15000;
 while(true){const d=await data();try{authoritative(d,v);return d;}catch(e){if(Date.now()>deadline)throw e;}await page.waitForTimeout(100);}
}
const configuration=d=>({sites:Object.fromEntries(['magnetEast','dogenzakaSouth','stationEastPark','centerGaiRear'].map(id=>[id,Object.fromEntries(Object.entries(d.sites[id]).filter(([k])=>/Hub|Plaza|Park|Tower|District/.test(k)))])),energy:{target:d.energy.target,parts:d.energy.parts}});
try {
 await open();const beforeView=await api('/api/city-view'), before=await settled(beforeView), started=Date.now(), proposal=await submit('garden');
 const samples=[];for(const ms of [1000,3000,4900,6600,9500,15000]) {while(Date.now()-started<ms) await page.waitForTimeout(50);await at(HERO_POSITION);const d=await data();samples.push({elapsedMs:Date.now()-started,pose:await pose(),configuration:configuration(d)});await page.screenshot({path:`${out}/noop-${ms}.jpg`,type:'jpeg',quality:90});}
 const after=await settled(proposal.view);assert.deepEqual(configuration(after),configuration(before));assert.deepEqual(errors,[]);checks.push({check:'first neutral water vote has no city change, stays at hero and settles to same four-site and energy configuration',pass:true,beforeView,proposal,samples,after});complete=true;
} finally {
 writeFileSync(`${out}/browser.json`,JSON.stringify({complete,browser:browser.version(),viewport:[1920,1080],mode:'fresh scratch devAuto server, real HTTP/WebSocket',origins,checks,errors},null,2)+'\n');await browser.close();await close();for(const dir of scratch)rmSync(dir,{recursive:true,force:true});
}
