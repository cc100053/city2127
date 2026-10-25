// Bounded current-source visual evidence; reuse formal E4 scratch services and existing review camera hooks.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import { createContext, createSurveyServer } from '../../../../survey/src/server/server.ts';
import { createProposalSession, submitProposal } from '../../../../survey/src/server/proposalService.ts';
import { currentView } from '../../../../survey/src/server/answerService.ts';
import { ENERGY_CHOICES } from '../../../../survey/src/shared/energy.ts';
const evidence = resolve(process.argv[2] ?? 'artifacts/energy-city-polish/water-island-current-review-20261025/supplement');
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
const cameras = [{ name:'island-complete', position:[-150,65,-625], target:[-35,0,-355] }];
// Native model AABB projection verifies framing before either screenshot is captured.
const T = await import('three');
const { energyPrototype } = await import('../../../../src/energyPrototype.ts');
const model=energyPrototype();model.configure(view.layout.energy);model.update(50,false);model.root.updateMatrixWorld(true);
const box=new T.Box3().setFromObject(model.parts.island);
const c=new T.PerspectiveCamera(42,1920/1080,2,9000);c.position.set(...cameras[0].position);
const aim=new T.Vector3(...cameras[0].target);c.lookAt(aim);c.updateMatrixWorld(true);
assert.ok(aim.x>=-460&&aim.x<=260&&aim.y>=0&&aim.y<=160&&aim.z>=-360&&aim.z<=320);
const distance=c.position.distanceTo(aim),polar=Math.acos((c.position.y-aim.y)/distance);
assert.ok(distance>=150&&distance<=1000&&polar>=.35&&polar<=1.42);
const points=[];
for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
 const v=new T.Vector3(x,y,z).project(c),point=[960*(1+v.x),540*(1-v.y),v.z];
 assert.ok(point[0]>64&&point[0]<1856&&point[1]>64&&point[1]<1016&&point[2]>-1&&point[2]<1);points.push(point);
}
writeFileSync(join(evidence,'framing.json'),JSON.stringify({camera:cameras[0],distance,polar,bounds:box,projectedAABBCorners:points,panClampDelta:[0,0,0],status:'PASS conservative entire model AABB within viewport before capture; screenshot self-review still required'},null,2)+'\n');
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
 assert.equal(shots.length,2);
 gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return{renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)};});
 assert.deepEqual(exceptions,[]);assert.deepEqual(consoleMessages.filter(m=>!m.url.endsWith('/favicon.ico')),[]);
 assert.deepEqual(responses.filter(r=>!r.url.endsWith('/favicon.ico')),[]);assert.deepEqual(failures,[]);
 console.log('PASS bounded formal review: 2 supplemental original PNGs, exact config, precomputed framing, no unexpected errors');
}catch(error){failure=error.stack;throw error;}
finally{
 if(browser)await browser.close();realtime.close();server.closeAllConnections();await new Promise(r=>server.close(r));ctx.db.close();rmSync(scratch,{recursive:true,force:true});
 cleanup={browserClosed:true,surveyClosed:!server.listening,surveyPort,scratchRemoved:!existsSync(scratch)};
 writeFileSync(join(evidence,'browser.json'),JSON.stringify({head,sourceHash,browser:browserVersion,platform:process.platform,viewport:{width:1920,height:1080},dpr:1,quality:'default',gpu,shots,motion,exceptions,consoleMessages,responses,failures,failure,cleanup,note:'Two supplemental images only; original ten retained. Formal fixture reused. Bounds-compatible camera precomputed; source unchanged. No full product matrix or motion rerun. See framing.json and visual self-review.'},null,2)+'\n');
}
