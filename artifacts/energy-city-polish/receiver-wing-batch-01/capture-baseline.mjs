import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
const out = 'artifacts/energy-city-polish/receiver-wing-batch-01/baseline-corrected';
assert.ok(!existsSync(`${out}/browser.json`), 'Preserve previous evidence');
mkdirSync(out, { recursive:true });
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page = await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
page.setDefaultTimeout(60000);
const errors=[], warnings=[], failures=[], responses=[], shots=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(['error','warning'].includes(m.type())) warnings.push({type:m.type(),text:m.text(),url:m.location().url});});
page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
page.on('response',r=>{if(r.status()>=400) responses.push({url:r.url(),status:r.status()});});
try {
 for(const [name,energy,hour,detail] of [['detail-day-large','b',12,true],['detail-day-small','a',12,true],['detail-night-large','b',22,true]]) {
  const u=new URL('http://127.0.0.1:5187');
  for(const [k,v] of Object.entries({energy,hour,reviewTime:50,...(detail?{review:'street',cam:'125,85,-290',at:'125,60,-360'}:{})}))u.searchParams.set(k,v);
  await page.goto(u.href); await page.getByLabel('能源比較配置').waitFor();
  await page.waitForFunction(()=>!!document.querySelector('canvas')?.dataset.time);
  await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('.error').count(),0);
  const png=await page.screenshot({path:`${out}/${name}.png`});
  const canvas=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height,time:c.dataset.time,hour:c.dataset.hour}));
  assert.deepEqual([canvas.width,canvas.height],[1920,1080]);
  shots.push({name,url:u.href,capturedAt:new Date().toISOString(),...canvas,sha256:createHash('sha256').update(png).digest('hex')});
  console.log(name);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 assert.deepEqual(responses.filter(r=>!r.url.endsWith('/favicon.ico')),[]);
 assert.deepEqual(warnings.filter(r=>!r.url.endsWith('/favicon.ico')),[]);
} finally {
 const gpu=await page.locator('canvas').evaluate(c=>{const g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return {renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),version:g.getParameter(g.VERSION)};});
 writeFileSync(`${out}/browser.json`,JSON.stringify({sourceSha256:createHash('sha256').update(readFileSync('src/energyPrototype.ts')).digest('hex'),browser:browser.version(),platform:process.platform,quality:'default',dpr:1,gpu,errors,warnings,failures,responses,shots,scope:'Preparation baseline only; no implementation or full regression/FPS claim'},null,2)+'\n');
 await browser.close();
}
