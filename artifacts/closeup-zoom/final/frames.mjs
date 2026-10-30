import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
const out = process.env.CITY2127_EVIDENCE_DIR ?? 'artifacts/closeup-zoom/final/F';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page = await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**', r=>r.fulfill({contentType:'text/css',body:''}));
const results=[], errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const id of ['ne:focal','sw:focal','se:focal','nw:focal','ne:district','sw:district','se:district','nw:district','energy:garden','energy:garden2','energy:ring','energy:wing','energy:island'].filter(id=>!process.env.CITY_SHOT_ONLY||process.env.CITY_SHOT_ONLY.split(',').includes(id))) {
  const site=id.split(':')[0];
  const query=new URLSearchParams({shot:id,meters:site==='energy'?'':`${site}:-4`,hour:'12'});
  await page.goto(`http://127.0.0.1:5184/?${query}`);
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.siteAssets && typeof window.cityShotFrame==='function' && typeof window.cityMeters==='function', null, {timeout:120000});
  for(const score of id.startsWith('energy:') ? [0] : [-4,0,4]) {
   await page.evaluate(({id,site,score})=>{window.cityMeters(site==='energy'?'':`${site}:${score}`);window.cityShot(id);}, {id,site,score});
   await page.waitForTimeout(1500);
   const frame=await page.evaluate(id=>window.cityShotFrame(id),id);
   const focal=id.endsWith(':district')?await page.evaluate(id=>window.cityShotFrame(id.replace(':district',':focal')),id):null;
   const metrics=await page.locator('canvas').evaluate(c=>({fps:Number(c.dataset.fps),drawCalls:Number(c.dataset.drawCalls)}));
   await page.screenshot({path:`${out}/${id.replace(':','-')}-${score}.jpg`,type:'jpeg',quality:90});
   results.push({id,score,frame,focal,metrics});
  }
 }
} finally { writeFileSync(`${out}/frames.json`,JSON.stringify({results,errors},null,2)); await browser.close(); }
