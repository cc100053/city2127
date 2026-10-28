// Decode original JPEGs with the same browser canvas RGB MAD as capture.mjs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
import {key,lastSnapshots,sectorFor} from './snapshots.mjs';
const root='artifacts/closeup-polish/Z',read=p=>JSON.parse(readFileSync(p,'utf8'));
const metric=(from,to)=>({from:from??null,to:to??null,delta:Number.isFinite(from)&&Number.isFinite(to)?to-from:null});
if(process.argv.includes('--self-test')){
 assert.deepEqual(metric(.25,.3),{from:.25,to:.3,delta:.3-.25});assert.deepEqual(metric(undefined,.3),{from:null,to:.3,delta:null});
 console.log('PASS: numeric deltas preserve missing projection instead of inventing zero.');process.exit(0);
}
const file=`${root}/snapshot-comparisons.json`;assert.ok(!existsSync(file),'Preserve earlier measurements');
const current=read(`${root}/current/capture.json`),s0=read('artifacts/closeup-polish/S0/baseline/capture.json'),last=lastSnapshots();
assert.equal(current.rows.length,98);
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage(),rows=[];
try{
 for(const r of current.rows){
  const prior=[{label:'S0',row:s0.rows.find(b=>key(b)===key(r))}];
  if(r.id==='hero')for(const sector of ['A','B','C','D'])prior.push({label:`${sector}-last`,...last.get(`${sector}/${key(r)}`)});
  else prior.push({label:`${sectorFor(r.id)}-last`,...last.get(`${sectorFor(r.id)}/${key(r)}`)});
  for(const old of prior){
   assert.ok(old.row,'Every canonical state has a prior snapshot');
   const boxes=[r.frame?.box,old.row.frame?.box].filter(Boolean);
   const box=boxes.length?{left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))}:null;
   const data=await page.evaluate(async({a,b,box})=>{
    const imgs=await Promise.all([a,b].map(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.src=src;})));
    const c=document.createElement('canvas');c.width=1920;c.height=1080;const ctx=c.getContext('2d');
    const pixels=imgs.map(img=>{ctx.clearRect(0,0,1920,1080);ctx.drawImage(img,0,0);return ctx.getImageData(0,0,1920,1080).data;});
    function mad(rect){if(!rect)return null;const x=Math.max(0,Math.floor(rect.left*1920)),y=Math.max(0,Math.floor(rect.top*1080)),right=Math.min(1920,Math.ceil(rect.right*1920)),bottom=Math.min(1080,Math.ceil(rect.bottom*1080));if(right<=x||bottom<=y)return null;
     let sum=0;for(let py=y;py<bottom;py++)for(let px=x;px<right;px++)for(let ch=0;ch<3;ch++){const i=(py*1920+px)*4+ch;sum+=Math.abs(pixels[0][i]-pixels[1][i]);}
     return {mad:sum/((right-x)*(bottom-y)*3*255),rect:{x,y,width:right-x,height:bottom-y}};
    }
    return {full:mad({left:0,right:1,top:0,bottom:1}),subjectUnion:mad(box)};
   },{a:'data:image/jpeg;base64,'+readFileSync(old.row.images[1]).toString('base64'),b:'data:image/jpeg;base64,'+readFileSync(r.images[1]).toString('base64'),box});
   const numeric=Object.fromEntries(['width','height','cardOverlap'].map(k=>[k,metric(old.row.auto[k],r.auto[k])]));
   numeric.hits=metric(old.row.frame?.hits,r.frame?.hits);for(const k of ['fps','drawCalls'])numeric[k]=metric(Number(old.row.diagnostics[k]),Number(r.diagnostics[k]));
   rows.push({id:r.id,state:r.state,hour:r.hour,from:old.label,priorCommit:old.commit??s0.commit,priorImage:old.row.images[1],currentImage:r.images[1],poseChanged:JSON.stringify(old.row.pose)!==JSON.stringify(r.pose),numeric,...data});
  }
 }
 assert.equal(rows.length,202,'98 S0 + 96 local shot + eight sector hero comparisons');
 writeFileSync(file,JSON.stringify({method:'RGB mean absolute difference /255, original second-take JPEG90, full image and clipped union of complete subject projected boxes. Cross-pose MAD is descriptive, not an isolated art score or an A4 gate.',browser:browser.version(),rows},null,2)+'\n');
}finally{await browser.close();}
