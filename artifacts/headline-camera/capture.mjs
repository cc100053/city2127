import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import { mkdirSync,writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const out='artifacts/headline-camera/final';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
const previous=process.env.CITY_SHOT_ONLY?JSON.parse((await import('node:fs')).readFileSync(`${out}/shots.json`,'utf8')):null;
const result={browser:browser.version(),viewport:[1920,1080],dpr:1,quality:'default',shots:previous?.shots.filter(s=>s.id!==process.env.CITY_SHOT_ONLY)??[],errors};
try {
 let group='';
 for(const id of ['hero','nw:focal','ne:focal','sw:focal','se:focal','nw:district','ne:district','sw:district','se:district','energy:garden','energy:garden2','energy:ring','energy:wing','energy:island']){
  if(process.env.CITY_SHOT_ONLY && id!==process.env.CITY_SHOT_ONLY)continue;
  const next=id.startsWith('energy')?'energy':'meters';
  if(group!==next){
   group=next;
   const params=new URLSearchParams({hour:'12',reviewTime:'20'});
   if(group==='energy')params.set('energy','mixed');else params.set('meters','nw:high,ne:high,sw:high,se:high');
   await page.goto('http://127.0.0.1:5184/?'+params,{waitUntil:'domcontentloaded'});await page.bringToFront();
   await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps,null,{timeout:60000});
  }
  if(id!=='hero')await page.evaluate(id=>window.cityShot(id),id);
  await page.waitForTimeout(6000);
  const data=await page.evaluate(()=>({diagnostics:{...document.querySelector('canvas').dataset},pose:window.cityShot(),gpu:(()=>{const gl=document.querySelector('canvas').getContext('webgl2');const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable';})()}));
  assert.ok(Number(data.diagnostics.fps)>0 && Number(data.diagnostics.drawCalls)>0);
  await page.screenshot({path:`${out}/${id.replace(':','-')}.jpg`,type:'jpeg',quality:90});
  result.shots.push({id,...data});writeFileSync(`${out}/shots.json`,JSON.stringify(result,null,2));console.log(id,data.diagnostics.fps,data.diagnostics.drawCalls);
 }
 assert.deepEqual(errors,[]);
}finally{writeFileSync(`${out}/shots.json`,JSON.stringify(result,null,2));await browser.close();}
