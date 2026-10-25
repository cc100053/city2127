// Bounded current-source visual evidence; reuse formal E4 scratch services and existing review camera hooks.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import { createContext, createSurveyServer } from '../../../survey/src/server/server.ts';
import { createProposalSession, submitProposal } from '../../../survey/src/server/proposalService.ts';
import { currentView } from '../../../survey/src/server/answerService.ts';
import { ENERGY_CHOICES } from '../../../survey/src/shared/energy.ts';
const evidence = resolve(process.argv[2] ?? 'artifacts/energy-city-polish/water-island-current-review-20261025');
const base = process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5193';
assert.ok(!existsSync(join(evidence, 'browser.json')), 'Preserve completed evidence');
mkdirSync(evidence, { recursive: true });
const sourceHash = createHash('sha256').update(readFileSync('src/energyPrototype.ts')).digest('hex');
assert.equal(sourceHash, '01987a48101b59559709dc2ce5461ec51617f0a73a06803e45c50354612556f3');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const scratch = mkdtempSync(join(tmpdir(), 'water-island-review-'));
let offset = 0;
const ctx = createContext({ dbPath: join(scratch, 'scratch.sqlite'), questionsPath: resolve('survey/src/survey/questions.exhibition.json'), now: () => new Date(Date.now() + offset) });
const unwrap = response => { assert.ok(response.ok, JSON.stringify(response)); return response.data; };
const proposals = [];
for (const choice of ENERGY_CHOICES) for (let i = 0; i < 4; i++) {
 offset += 16000;
 const session = unwrap(createProposalSession(ctx).response);
 const request = { submissionId: `current-review-${choice}-${i}`, guestSessionId: session.session.id, expectedRevision: session.state.revision,
  answers: session.questions.map(q => ({ questionId: q.id, optionId: q.id === 'energy-2127' ? choice : q.options[1].id })) };
 unwrap(submitProposal(ctx, request).response); proposals.push(request);
}
const view = currentView(ctx);
assert.deepEqual(view.layout.energy, { waterGardens: 1, receiver: 'small', flywheel: true, island: true });
assert.equal(view.guestCount, 16);
writeFileSync(join(evidence, 'formal-fixture.json'), JSON.stringify({ proposals, view, offset, note: '16 valid proposals, four per energy choice; Q1/Q2/Q4 option index1. Scratch clock advances skip reading waits, not visitor timing.' }, null, 2)+'\n');
const { server, realtime } = createSurveyServer({ ctx, staticDir: resolve('survey/dist') });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const surveyPort = server.address().port;
const ws = `ws://127.0.0.1:${surveyPort}/ws`;
let browser;
const exceptions=[], consoleMessages=[], responses=[], failures=[], shots=[];
const cameras = [
 { name:'hero', position:[-520,300,-620], target:[-40,25,-60] },
 { name:'water-orbit', position:[-415,85,-260], target:[-310,10,-151] },
 { name:'water-detail', position:[-357,35,-205], target:[-308,10,-151] },
 { name:'island-orbit', position:[-165,94,-580], target:[-40,8,-427] },
 { name:'island-detail', position:[-112,44,-536], target:[-60,9,-470] },
];
let gpu, motion, browserVersion, cleanup, failure;
try {
 browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
 browserVersion=browser.version();
 const context=await browser.newContext({ viewport:{width:1920,height:1080}, deviceScaleFactor:1 });
 const page=await context.newPage(); page.setDefaultTimeout(60000);
 page.on('pageerror', e=>exceptions.push(e.message));
 page.on('console', m=>{ if(['warning','error'].includes(m.type())) consoleMessages.push({type:m.type(),text:m.text(),url:m.location().url}); });
 page.on('response', r=>{ if(r.status()>=400) responses.push({url:r.url(),status:r.status()}); });
 page.on('requestfailed', r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
 function url(hour,camera,time=50) {
  const u=new URL(base);u.searchParams.set('survey',ws);u.searchParams.set('hour',hour);
  if(time!==null)u.searchParams.set('reviewTime',time);
  if(camera.name!=='hero'){u.searchParams.set('review','street');u.searchParams.set('cam',camera.position.join(','));u.searchParams.set('at',camera.target.join(','));}
  return u.href;
 }
 async function open(hour,camera,time=50){
  await page.goto(url(hour,camera,time));
  await page.waitForFunction(t=>{
   const c=document.querySelector('canvas'),d=JSON.parse(c?.dataset.energy??'null');
   return d&&JSON.stringify(d.target)===JSON.stringify(t)&&d.parts.every(p=>!p.visible||p.opacity===1)&&!!c.dataset.time;
  },view.layout.energy);
  await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('.error').count(),0);
  assert.equal(await page.getByLabel('能源比較配置').count(),0,'formal runtime, no DEV energy selector');
 }
 for(const camera of cameras)for(const [period,hour]of[['day',12],['night',22]]){
  await open(hour,camera);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const name=`${camera.name}-${period}`,bytes=await page.screenshot({path:join(evidence,name+'.png')});
  const data=await page.locator('canvas').evaluate(c=>({time:c.dataset.time,hour:c.dataset.hour,width:c.width,height:c.height,energy:JSON.parse(c.dataset.energy)}));
  assert.deepEqual([data.width,data.height],[1920,1080]);assert.equal(data.time,'50.00');
  assert.equal(bytes.readUInt32BE(16),1920);assert.equal(bytes.readUInt32BE(20),1080);
  shots.push({name,url:page.url(),capturedAt:new Date().toISOString(),camera,fov:42,...data,sha256:createHash('sha256').update(bytes).digest('hex')});
  console.log('captured',name);
 }
 assert.equal(shots.length,10);
 gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return{renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)};});
 // Observe live/static at the water view without spending extra screenshots or rerunning the product matrix.
 await open(12,cameras[2],null);
 const read=()=>page.locator('canvas').evaluate(c=>({time:Number(c.dataset.time),angle:JSON.parse(c.dataset.energy).rotorAngle}));
 const liveA=await read();
 await page.waitForFunction(t=>Number(document.querySelector('canvas')?.dataset.time)>=t+3,liveA.time);
 const liveB=await read();assert.notEqual(liveA.angle,liveB.angle);
 await page.emulateMedia({reducedMotion:'reduce'});
 const t=liveB.time;await page.waitForFunction(t=>Number(document.querySelector('canvas')?.dataset.time)>=t+2,t);
 const staticA=await read();await page.waitForFunction(t=>Number(document.querySelector('canvas')?.dataset.time)>=t+2,staticA.time);
 const staticB=await read();assert.equal(staticA.angle,staticB.angle);
 motion={liveA,liveB,staticA,staticB,scope:'Formal global energy rotor diagnostic only. No water level/turbine transform hook; no dynamics engineering or continuous collision claim.'};
 assert.deepEqual(exceptions,[]);assert.deepEqual(consoleMessages.filter(m=>!m.url.endsWith('/favicon.ico')),[]);
 assert.deepEqual(responses.filter(r=>!r.url.endsWith('/favicon.ico')),[]);assert.deepEqual(failures,[]);
 console.log('PASS bounded formal review: 10 original PNGs, exact config, live/static diagnostic, no unexpected errors');
}catch(error){failure=error.stack;throw error;}
finally{
 if(browser)await browser.close();realtime.close();server.closeAllConnections();await new Promise(r=>server.close(r));ctx.db.close();rmSync(scratch,{recursive:true,force:true});
 cleanup={browserClosed:true,surveyClosed:!server.listening,surveyPort,scratchRemoved:!existsSync(scratch)};
 writeFileSync(join(evidence,'browser.json'),JSON.stringify({head,sourceHash,browser:browserVersion,platform:process.platform,viewport:{width:1920,height:1080},dpr:1,quality:'default',gpu,shots,motion,exceptions,consoleMessages,responses,failures,failure,cleanup,note:'All 10 images newly captured in formal survey configuration. Existing camera/reviewTime hooks only; source unchanged. Water/detail distance75.7m, island/detail91.0m; orbit cameras >=150m. Not a full product regression or FPS measurement.'},null,2)+'\n');
}
