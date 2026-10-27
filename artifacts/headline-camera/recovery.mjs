import assert from 'node:assert/strict';
import {chromium} from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createContext,createSurveyServer} from '../../survey/src/server/server.ts';
import {fixture} from '../../survey/tests/surveyFixture.ts';
import {SHOTS} from '../../src/headlineCamera.ts';
import {HERO_POSITION} from '../../src/heroCamera.ts';
const out='artifacts/headline-camera/final';
const dir=mkdtempSync(join(tmpdir(),'headline-recovery-'));
const ctx=createContext({dbPath:join(dir,'survey.sqlite'),questionsPath:new URL('../../survey/src/survey/questions.exhibition.v3.json',import.meta.url).pathname});
const {server,realtime}=createSurveyServer({ctx});
const sockets=new Set();server.on('upgrade',(_r,s)=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
const page=await context.newPage(),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
const pose=()=>page.evaluate(()=>{const log=console.log;console.log=()=>{};try{return window.cityShot();}finally{console.log=log;}});
const same=(a,b)=>assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))<.02,`${a} != ${b}`);
const api=async(path,body)=>{const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(body)});const j=await r.json();assert.equal(j.ok,true,JSON.stringify(j));return j.data;};
const submit=async()=>{const s=await api('/api/proposal-sessions',{});return api('/api/proposals',{submissionId:crypto.randomUUID(),guestSessionId:s.session.id,expectedRevision:s.state.revision,answers:s.questions.map(q=>({questionId:q.id,optionId:q.options[q.id==='service-2127'?2:1].id}))});};
const command=async(command,extra={})=>{const a=await api('/api/admin/current-run');return api('/api/admin/lifecycle',{command,expectedRevision:a.lifecycle.revision,...extra});};
let legacy;
try{
 await page.goto('http://127.0.0.1:5184/?survey='+encodeURIComponent(base.replace('http','ws')+'/ws')+'&hour=12',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);
 const before=await api('/api/city-view');await submit();await page.waitForTimeout(4900);same((await pose()).position,SHOTS['nw:focal'].position);
 const after=await api('/api/city-view');for(const s of sockets)s.destroy();await page.waitForTimeout(150);same((await pose()).position,HERO_POSITION);
 await page.waitForTimeout(900);same((await pose()).position,HERO_POSITION);checks.push({check:'actual TCP disconnect + reconnect cut hero',pass:true});
 await page.waitForTimeout(5000);await submit();await page.waitForTimeout(4900);same((await pose()).position,SHOTS['nw:district'].position);
 await command('reset-city',{confirmation:'RESET'});await command('guest-left');await page.waitForTimeout(150);same((await pose()).position,HERO_POSITION);checks.push({check:'actual reset cuts active hold',pass:true});
 // Replay real validated authority with a shortened display slot; this is a wire fixture, not a server timing claim.
 await page.routeWebSocket(base.replace('http','ws')+'/ws',ws=>{ws.send(JSON.stringify({type:'city-state-snapshot',view:before}));setTimeout(()=>ws.send(JSON.stringify({type:'city-state-updated',view:after,displayWaitMs:0,displayRemainingMs:5000})),300);});
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.causal-panel')?.dataset.presentation==='result');await page.waitForTimeout(4300);
 same((await pose()).position,HERO_POSITION);assert.match(await page.locator('.resident-card-copy').textContent(),/あなたは/);checks.push({check:'5000ms catch-up stays hero, reason immediate (real-view wire fixture)',pass:true});
 await page.goto('http://127.0.0.1:5184/?meters=&metersTo=se:high&metersAge=5&reviewTime=20&hour=12',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.cityMeters==='function');await page.waitForTimeout(700);same((await pose()).position,SHOTS['se:district'].position);
 await page.evaluate(()=>window.cityMeters('sw:high'));same((await pose()).position,SHOTS['se:district'].position);checks.push({check:'DEV meters age preview and no first-frame interruption jump',pass:true});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>{const log=console.log;console.log=()=>{};try{return Math.abs(window.cityShot().position[0]+520)<.02;}finally{console.log=log;}},null,{timeout:3000});same((await pose()).position,HERO_POSITION);checks.push({check:'DEV reduced-motion toggle cancels immediately',pass:true});await page.emulateMedia({reducedMotion:'no-preference'});
 // A separate preserved v1 server verifies the legacy branch, without altering the exhibition server.
 const f=fixture(join(dir,'legacy.sqlite'));legacy={ctx:f.ctx,...createSurveyServer({ctx:f.ctx})};await new Promise(r=>legacy.server.listen(0,'127.0.0.1',r));
 await page.goto('http://127.0.0.1:5184/?survey='+encodeURIComponent(`ws://127.0.0.1:${legacy.server.address().port}/ws`),{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.causal-panel')&&!document.querySelector('.resident-panel'));await page.waitForTimeout(300);same((await pose()).position,HERO_POSITION);checks.push({check:'legacy v1 snapshot hero',pass:true});
 await page.goto('http://127.0.0.1:5184/?shot=nw:focal&hour=12',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.siteAssets);same((await pose()).position,SHOTS['nw:focal'].position);assert.ok(await page.locator('canvas').evaluate(c=>JSON.parse(c.dataset.siteAssets).magnetEast.automationHub));checks.push({check:'standalone shot query loads neutral exhibition carriers',pass:true});
 await page.goto('http://127.0.0.1:5184/?hour=12',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof window.cityShot==='function');await page.waitForTimeout(300);same((await pose()).position,HERO_POSITION);checks.push({check:'standalone hero',pass:true});
 assert.deepEqual(errors,[]);
}finally{
 writeFileSync(`${out}/recovery.json`,JSON.stringify({checks,errors,browser:browser.version()},null,2));await browser.close();
 realtime.close();server.closeAllConnections();await new Promise(r=>server.close(r));ctx.db.close();
 if(legacy){legacy.realtime.close();legacy.server.closeAllConnections();await new Promise(r=>legacy.server.close(r));legacy.ctx.db.close();}
}
