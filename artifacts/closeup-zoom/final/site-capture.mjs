import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
const site=process.env.CITY_SITE, out=process.env.CITY2127_EVIDENCE_DIR;
if(!['ne','sw','se','nw'].includes(site)||!out)throw Error('Set CITY_SITE and CITY2127_EVIDENCE_DIR');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
await page.emulateMedia({reducedMotion:'reduce'});
const images=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const stable=async()=>{for(let i=0;i<2;i++){const time=await page.locator('canvas').getAttribute('data-time');await page.waitForFunction(t=>document.querySelector('canvas')?.dataset.time!==t,time,{timeout:120000});}};
try {
 for(const hour of [12,22]){
  await page.goto(`${process.env.CITY2127_CITY_URL??'http://127.0.0.1:5184'}/?meters=${site}:0&hour=${hour}`);
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.siteAssets&&typeof window.cityMeters==='function',null,{timeout:120000});
  if(process.env.CITY_PERF_ONLY)await stable();
  await page.screenshot({path:`${out}/hero-${hour}.jpg`,type:'jpeg',quality:90});
  const hero=await page.locator('canvas').evaluate(c=>({fps:Number(c.dataset.fps),drawCalls:Number(c.dataset.drawCalls)}));
  images.push({hour,kind:'hero',score:0,file:`hero-${hour}.jpg`,metrics:hero});
  if(process.env.CITY_HERO_ONLY)continue;
  for(const kind of (process.env.CITY_PERF_ONLY?['focal']:['focal','district']))for(const score of (process.env.CITY_PERF_ONLY?[0]:[-4,0,4])){
   await page.evaluate(({site,kind,score})=>{window.cityMeters(`${site}:${score}`);window.cityShot(`${site}:${kind}`);},{site,kind,score});
   await page.waitForTimeout(1500);
   if(process.env.CITY_PERF_ONLY)await stable();
   const file=`${kind}-${score}-${hour}.jpg`;
   await page.screenshot({path:`${out}/${file}`,type:'jpeg',quality:90});
   const metrics=await page.locator('canvas').evaluate(c=>({fps:Number(c.dataset.fps),drawCalls:Number(c.dataset.drawCalls)}));
   images.push({hour,kind,score,file,metrics});
  }
 }
}finally{writeFileSync(`${out}/capture.json`,JSON.stringify({site,images,errors,browser:browser.version(),viewport:[1600,900]},null,2));await browser.close();}
