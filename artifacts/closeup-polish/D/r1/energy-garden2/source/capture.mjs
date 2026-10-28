import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const energyStates = { garden:['baseline','a','mixed'], garden2:['baseline','a','mixed'], ring:['baseline','b','mixed'], wing:['baseline','a','b','mixed'], island:['baseline','c','mixed'] };
export const matrix = [
  ...['nw','ne','sw','se'].flatMap(site => ['focal','district'].flatMap(kind =>
    (kind === 'focal' ? [-2,0,2] : [-8,-5,0,5,8]).map(score => ({id:`${site}:${kind}`,state:String(score),meters:`${site}:${score}`})))),
  ...Object.entries(energyStates).flatMap(([part,states]) => states.map(energy => ({id:`energy:${part}`,state:energy,energy}))),
  {id:'hero',state:'neutral',meters:'nw:0,ne:0,sw:0,se:0'},
].flatMap(row => [12,22].map(hour => ({...row,hour})));
export const sePairings = [
  {state:'low-solar',meters:'se:-8,ne:-8',baseState:'-8'},
  {state:'high-forest',meters:'se:8,ne:8',baseState:'8'},
  {state:'high-docks',meters:'se:8,nw:8',baseState:'8'},
].flatMap(row=>[12,22].map(hour=>({...row,id:'se:district',hour,pairing:true})));
export const nwPairings = [
  {state:'low-no-docks',meters:'nw:-8,se:8',baseState:'-8'},
  {state:'high-docks',meters:'nw:8,se:8',baseState:'8'},
].flatMap(row=>[12,22].map(hour=>({...row,id:'nw:district',hour,pairing:true})));
export const selectedShots = (ids, pairings = false) => [...matrix,...(pairings?sePairings:[])].filter(row => !ids || ids.split(',').includes(row.id));
export function framing(frame, id) {
  if (!frame?.box) return {A1:null,A2:null,A3:null,reason:frame?.reason ?? 'hero has no subject'};
  const b=frame.box,w=b.right-b.left,h=b.bottom-b.top,x=(b.left+b.right)/2,y=(b.top+b.bottom)/2;
  const cardOverlap=Math.max(0,Math.min(b.right,1)-Math.max(b.left,.78))*Math.max(0,Math.min(b.bottom,.45)-Math.max(b.top,0))/(w*h);
  return {A1:id.endsWith('focal') ? h>=.25&&h<=.60 : id.endsWith('district') ? w>=.35 : Math.max(w,h)>=.20,
    A2:x>=.08&&x<=.72&&y>=.15&&y<=.85&&cardOverlap<=.05,A3:frame.hits>=7,width:w,height:h,center:{x,y},cardOverlap};
}
function comparisonBox(a,b) {
  const boxes=[a?.box,b?.box].filter(Boolean);
  return boxes.length ? {left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))} : null;
}
if (process.argv.includes('--self-test')) {
  assert.equal(selectedShots('ne:focal,ne:district,energy:garden,hero').length,24);
  const sectorB=selectedShots('sw:focal,sw:district,hero');
  assert.equal(sectorB.length,18);
  assert.equal(sectorB.filter(r=>r.id==='hero'||r.state===(r.id.endsWith('district')?'8':'2')).length,6);
  assert.equal(['focal','district'].reduce((n,kind)=>n+2*(selectedShots(`sw:${kind}`).length/2),0),16,'B adjacent plus extreme comparisons');
  assert.equal(selectedShots('ne:focal').length,6); assert.equal(selectedShots(undefined).length,98);
  assert.equal(nwPairings.length,4);assert.ok(nwPairings.every(r=>r.pairing&&r.id==='nw:district'));
  assert.equal(matrix.length,98); assert.equal(new Set(matrix.map(r=>`${r.id}/${r.state}/${r.hour}`)).size,98);
  assert.equal(selectedShots('se:district,hero',true).length,18,'C includes all three cross-Meter pairings at both hours');
  assert.equal(selectedShots('se:focal,hero',true).length,8,'pairing support leaves other shots unchanged');
  assert.deepEqual(framing({box:{left:.2,right:.6,top:.2,bottom:.6},hits:7},'ne:focal').A1,true);
  assert.equal(framing({box:{left:.8,right:1,top:0,bottom:.4},hits:6},'ne:focal').A2,false);
  assert.equal(comparisonBox({box:null},{box:null}),null,'invalid projections cannot silently disappear from A4');
  const a={left:-.1,right:.4,top:.2,bottom:.6},b={left:.2,right:.7,top:.1,bottom:.8};
  assert.deepEqual(comparisonBox({box:a},{box:b}),{left:-.1,right:.7,top:.1,bottom:.8});
  assert.deepEqual(comparisonBox(null,{box:a}),a,'absent energy uses its present counterpart');
  console.log('PASS: 98 captures, energy membership, framing thresholds.'); process.exit(0);
}
const mode=process.argv[2]??'capture',out=resolve(process.env.CITY2127_EVIDENCE_DIR??'artifacts/closeup-polish/S0/baseline');
assert.ok(['capture','perf','compare'].includes(mode),'mode: capture | perf | compare');
mkdirSync(out,{recursive:true});
const {chromium}=await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH??'/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs').href);
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:mode==='perf'?['--disable-gpu-vsync','--disable-frame-rate-limit']:[]});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
const errors=[];page.on('pageerror',e=>errors.push({type:'page',message:e.message}));
page.on('console',m=>{if(m.type()==='error')errors.push({type:'console',message:m.text(),location:m.location(),expected:m.location().url.endsWith('/favicon.ico')&&m.text().includes('404')});});
page.on('requestfailed',r=>errors.push({type:'network',message:r.failure()?.errorText,url:r.url()}));
const file=`${out}/${mode==='perf'?'performance':mode==='compare'?'comparison':'capture'}.json`;
const report=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{mode,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  sourceDiff:execFileSync('git',['diff','--','src','tests','package.json'],{encoding:'utf8'}),browser:browser.version(),viewport:[1920,1080],dpr:1,quality:'default',launchArgs:mode==='perf'?['--disable-gpu-vsync','--disable-frame-rate-limit']:[],rows:[],errors:[]};
const save=()=>writeFileSync(file,JSON.stringify(report,null,2)+'\n');
const key=row=>`${row.id.replaceAll(':','-')}__${row.state}__h${row.hour}`;
const selected=[...selectedShots(process.env.CITY_SHOTS??process.env.CITY_SHOT_ONLY,process.env.CITY_SE_PAIRINGS==='1'),...(process.env.CITY_NW_PAIRINGS==='1'?nwPairings:[])];
async function load(row,wait) {
  const url=new URL(process.env.CITY2127_CITY_URL??'http://127.0.0.1:5194/');
  url.search=new URLSearchParams({reviewTime:'20',hour:String(row.hour),...(row.energy?{energy:row.energy}:{meters:row.meters}),...(row.id==='hero'?{}:{shot:row.id})});
  errors.length=0;const at=Date.now();await page.goto(url.href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.fps&&typeof window.cityShotFrame==='function',null,{timeout:60000});
  await page.waitForTimeout(Math.max(wait,mode==='perf'?16000-(Date.now()-at):0));
  return {url:url.href,...await page.evaluate(id=>({pose:window.cityShot(),diagnostics:{...document.querySelector('canvas').dataset},frame:id==='hero'?null:window.cityShotFrame(id),
    gpu:(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable';})()}),row.id)};
}
async function difference(a,b,box={left:0,top:0,right:1,bottom:1}) {
  return page.evaluate(async({a,b,box})=>{
    const images=await Promise.all([a,b].map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;})));
    const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;const ctx=canvas.getContext('2d');
    const x=Math.max(0,Math.floor(box.left*1920)),y=Math.max(0,Math.floor(box.top*1080)),w=Math.min(1920,Math.ceil(box.right*1920))-x,h=Math.min(1080,Math.ceil(box.bottom*1080))-y;
    if(w<=0||h<=0)return null;
    const pixels=images.map(img=>{ctx.clearRect(0,0,1920,1080);ctx.drawImage(img,0,0);return ctx.getImageData(x,y,w,h).data;});
    let sum=0;for(let i=0;i<pixels[0].length;i+=4)for(let c=0;c<3;c++)sum+=Math.abs(pixels[0][i+c]-pixels[1][i+c]);
    return {mad:sum/(w*h*3*255),rect:{x,y,width:w,height:h}};
  },{a,b,box});
}
const imageData=path=>'data:image/jpeg;base64,'+readFileSync(path).toString('base64');
try {
  if(mode==='capture') for(const row of selected) {
    if(report.rows.some(old=>key(old)===key(row)&&old.complete))continue;
    const images=[],takes=[];
    for(let take=1;take<=2;take++) {
      const data=await load(row,6000),path=`${out}/${key(row)}${take===1?'__repeat1':''}.jpg`;
      assert.ok(!existsSync(path),`Preserve existing image: ${path}; use a new evidence directory or archive the interrupted take.`);
      await page.screenshot({path,type:'jpeg',quality:90});images.push(path);takes.push({...data,errors:[...errors]});
    }
    const reproducibility=await difference(...images.map(imageData)),data=takes[1],auto=framing(data.frame,row.id);
    const result={...row,...data,images,takes,reproducibility:{...reproducibility,pass:reproducibility.mad<1/255},auto,
      A6:takes.every(t=>t.errors.every(e=>e.expected)),complete:true};
    report.rows.push(result);save();console.log(key(row),JSON.stringify({auto,reproducibility:result.reproducibility,A6:result.A6}));
  }
  if(mode==='perf') for(const row of selected.filter(r=>r.id==='hero'||r.energy==='mixed'||r.state===(r.id.endsWith('district')?'8':'2'))) {
    if(report.rows.some(old=>key(old)===key(row)&&old.complete))continue;
    const rounds=[];
    for(let round=1;round<=2;round++) {
      const data=await load(row,0),sample=await page.evaluate(()=>new Promise(resolve=>{
        const intervals=[];let first,last;function frame(now){if(first===undefined)first=now;if(last!==undefined)intervals.push(now-last);last=now;
          if(now-first>=5000)resolve({fps:intervals.length*1000/(now-first),elapsedMs:now-first,intervals});else requestAnimationFrame(frame);}requestAnimationFrame(frame);
      }));rounds.push({round,...data,sample,errors:[...errors]});
    }
    report.rows.push({...row,rounds,meanFps:rounds.reduce((n,r)=>n+r.sample.fps,0)/2,complete:true});save();console.log('perf',key(row),report.rows.at(-1).meanFps);
  }
  if(mode==='compare') {
    const captureReport=JSON.parse(readFileSync(`${out}/capture.json`,'utf8')),captures=captureReport.rows;
    assert.ok(selected.every(row=>captures.some(c=>key(c)===key(row)&&c.complete)),'Complete the selected matrix before A4 comparisons.');
    report.rows=[];
    for(const id of new Set(selected.map(r=>r.id))) for(const hour of [12,22]) {
      const rows=captures.filter(r=>r.id===id&&r.hour===hour&&!r.pairing); if(rows.length<2)continue;
      const pairs=rows.slice(1).map((r,i)=>[rows[i],r,'adjacent']);pairs.push([rows[0],rows.at(-1),'extremes']);
      for(const paired of captures.filter(r=>r.id===id&&r.hour===hour&&r.pairing)) {
        const base=rows.find(r=>r.state===paired.baseState);assert.ok(base,'Pairing requires its unpaired same-tier counterpart');pairs.push([base,paired,'pairing']);
      }
      for(const [a,b,kind] of pairs) {
        const box=comparisonBox(a.frame,b.frame);
        if(!box){report.rows.push({id,hour,from:a.state,to:b.state,kind,threshold:kind==='extremes'?.12:.06,mad:null,pass:false,reason:'No valid projected subject box in either state',frameReasons:[a.frame?.reason,b.frame?.reason]});continue;}
        const delta=await difference(imageData(a.images[1]),imageData(b.images[1]),box),threshold=kind==='extremes'?.12:.06;
        report.rows.push({id,hour,from:a.state,to:b.state,kind,threshold,...(delta??{mad:null,reason:'Subject box does not overlap viewport'}),pass:delta!==null&&delta.mad>=threshold});
      }
    }
    const performance=existsSync(`${out}/performance.json`)?JSON.parse(readFileSync(`${out}/performance.json`,'utf8')).rows:[];
    for(const row of captures) {
      row.A4=report.rows.filter(pair=>pair.id===row.id&&pair.hour===row.hour&&(pair.from===row.state||pair.to===row.state));
      const reference=performance.find(p=>p.id===row.id&&p.hour===row.hour);
      row.A5={vsync:{fps:Number(row.diagnostics.fps),pass:Number(row.diagnostics.fps)>=58},
        uncappedReference:reference?{state:reference.state,meanFps:reference.meanFps,drawCalls:reference.rounds.map(r=>Number(r.diagnostics.drawCalls)),meanDrawCalls:reference.rounds.reduce((n,r)=>n+Number(r.diagnostics.drawCalls),0)/reference.rounds.length}:null,relative:'S0 establishes reference; 95% / +10% comparisons apply to later rounds'};
    }
    writeFileSync(`${out}/capture.json`,JSON.stringify(captureReport,null,2)+'\n');save();
  }
} finally { report.errors.push(...errors);save();await browser.close(); }
