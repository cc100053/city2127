// Reuses the accepted headline integration smoke, with isolated evidence and DEV diagnostics checks.
import assert from 'node:assert/strict';
import {chromium} from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {mkdtempSync,mkdirSync,existsSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createContext,createSurveyServer} from '../../survey/src/server/server.ts';
const dev=process.env.CITY2127_SMOKE_DEV==='1';
const out=process.env.CITY2127_EVIDENCE_DIR??`artifacts/closeup-polish/S0/${dev?'dev':'production'}-smoke`;
assert.ok(!existsSync(out),'Preserve existing smoke evidence; select a fresh directory.');mkdirSync(out,{recursive:true});
const cityURL=process.env.CITY2127_CITY_URL??'http://127.0.0.1:5195';
const dir=mkdtempSync(join(tmpdir(),'headline-integration-'));
const ctx=createContext({dbPath:join(dir,'survey.sqlite'),questionsPath:new URL('../../survey/src/survey/questions.exhibition.json',import.meta.url).pathname});
const {server,realtime}=createSurveyServer({ctx});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
const api=async(path,body)=>{const r=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify(body)});const j=await r.json();assert.equal(j.ok,true,JSON.stringify(j));return j.data;};
try{
 await page.goto(cityURL+'/?survey='+encodeURIComponent(base.replace('http','ws')+'/ws')+'&hour=12',{waitUntil:'domcontentloaded'});await page.bringToFront();
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);assert.equal(await page.evaluate(()=>typeof window.cityShot),dev?'function':'undefined');assert.equal(await page.evaluate(()=>typeof window.cityShotFrame),dev?'function':'undefined');
 const s=await api('/api/proposal-sessions',{});await api('/api/proposals',{submissionId:crypto.randomUUID(),guestSessionId:s.session.id,expectedRevision:s.state.revision,answers:s.questions.map(q=>({questionId:q.id,optionId:q.id==='energy-2127'?'water-storage':q.options[q.id==='service-2127'?2:1].id}))});
 await page.waitForTimeout(8300);assert.equal(await page.locator('.causal-panel').getAttribute('data-presentation'),'result');assert.match(await page.locator('.resident-place').textContent(),/デックス西/);assert.match(await page.locator('.resident-card-copy').textContent(),/あなたは/);
 if(dev){const before=await page.evaluate(()=>window.cityShot());const resources=await page.locator('canvas').evaluate(c=>[c.dataset.geometries,c.dataset.textures]);const frame=await page.evaluate(()=>window.cityShotFrame('nw:focal'));assert.ok(frame.box);assert.deepEqual(await page.evaluate(()=>window.cityShot()),before);assert.deepEqual(await page.locator('canvas').evaluate(c=>[c.dataset.geometries,c.dataset.textures]),resources);checks.push({check:'DEV measurement leaves active headline pose and GPU resource counts unchanged',frame,pass:true});}
 await page.screenshot({path:`${out}/production-live.jpg`,type:'jpeg',quality:90});checks.push({check:'real v4 live headline and reason',place:await page.locator('.resident-place').textContent(),pass:true});
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.causal-panel')?.dataset.presentation==='ambient');await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps);
 await page.screenshot({path:`${out}/production-reload-hero.jpg`,type:'jpeg',quality:90});checks.push({check:'reload snapshot ambient hero',pass:true});
 assert.deepEqual(errors,[]);
}finally{
 writeFileSync(`${out}/smoke.json`,JSON.stringify({browser:browser.version(),viewport:[1920,1080],dpr:1,quality:'default',mode:dev?'DEV':'production',checks,errors,performanceClaim:'none; diagnostics only used for load readiness'},null,2));
 await browser.close();realtime.close();server.closeAllConnections();await new Promise(r=>server.close(r));ctx.db.close();
}
