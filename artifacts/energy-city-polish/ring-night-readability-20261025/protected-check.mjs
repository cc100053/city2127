import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Mesh, InstancedMesh, Vector3 } from 'three';
const { energyPrototype } = await import(process.argv.includes('--record') ? '../../../.dream-loop/ring-night-readability/baseline-runtime.ts' : '../../../src/energyPrototype.ts');
import { chrome, trim, dark, solar } from '../../../src/cityRig.ts';
const dir = 'artifacts/energy-city-polish/ring-night-readability-20261025';
const hash = value => createHash('sha256').update(value).digest('hex');
const source = readFileSync('src/energyPrototype.ts', 'utf8');
const start = source.indexOf('  // Bay-facing flywheel'), end = source.indexOf('  // Three reclaimed caissons');
assert.ok(start > 0 && end > start);
const finish = m => ({ type:m.type, color:m.color?.getHexString(), emissive:m.emissive?.getHexString(), emissiveIntensity:m.emissiveIntensity, roughness:m.roughness, metalness:m.metalness, envMapIntensity:m.envMapIntensity, clearcoat:m.clearcoat, clearcoatRoughness:m.clearcoatRoughness, opacity:m.opacity, transparent:m.transparent });
const model = energyPrototype(); model.select('mixed'); model.update(50); model.root.updateMatrixWorld(true);
function triangles(group, materials = false) {
 const rows = [], p = new Vector3();
 group.traverse(mesh => {
  if (!(mesh instanceof Mesh) || mesh instanceof InstancedMesh) return;
  const a = mesh.geometry.attributes.position, ix = mesh.geometry.index;
  for (let i=0;i<(ix?.count ?? a.count);i+=3) {
   const vertices=[];
   for (let j=0;j<3;j++) vertices.push(p.fromBufferAttribute(a,ix ? ix.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld).toArray().map(v=>String(v)).join(','));
   rows.push(vertices.join(';')+(materials ? JSON.stringify(finish(mesh.material)) : ''));
  }
 });
 return { triangles:rows.length, sha256:hash(rows.sort().join('\n')) };
}
const protectedState = {
 outsideRingSource:hash(source.slice(0,start)+source.slice(end)),
 geometry:Object.fromEntries(Object.entries(model.parts).map(([key,group])=>[key,triangles(group)])),
 nonRingMaterials:Object.fromEntries(Object.entries(model.parts).filter(([key])=>key!=='ring').map(([key,group])=>[key,triangles(group,true)])),
 sharedMaterials:[chrome,trim,dark,solar].map(finish),
};
if(process.argv.includes('--record')) {
 writeFileSync(dir+'/protected-baseline.json',JSON.stringify(protectedState,null,2)+'\n');
 console.log('Recorded exact baseline geometry, non-ring source/materials and shared finishes');
} else {
 assert.deepEqual(JSON.parse(JSON.stringify(protectedState)),JSON.parse(readFileSync(dir+'/protected-baseline.json','utf8')));
 const changed=execFileSync('git',['diff','--name-only','b24cf3d8b569780324e4bf0f491bdf8af3c30169','--','src','tests','survey','module-swap'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 assert.ok(changed.every(path=>path==='src/energyPrototype.ts'),JSON.stringify(changed));
 if(process.argv.includes('--restored')) {
  assert.equal(source,readFileSync(dir+'/baseline-energyPrototype.ts','utf8'),'restored source differs from accepted baseline');
  console.log('PASS restored source byte-identical to baseline; exact geometry/non-ring/shared material checks pass');
  writeFileSync(dir+'/restored-protected-result.json',JSON.stringify({passed:true,sourceSha256:hash(source),...protectedState},null,2)+'\n');
 } else {
 const nonRing=new Set();
 for(const [key,group] of Object.entries(model.parts)) if(key!=='ring')group.traverse(mesh=>{if(mesh instanceof Mesh)nonRing.add(mesh.material);});
 const shared=new Set([chrome,trim,dark,solar]);
 const local=new Set(); model.parts.ring.traverse(mesh=>{if(mesh instanceof Mesh&&!shared.has(mesh.material)&&mesh.material.emissive?.getHex()===0)local.add(mesh.material);});
 for(const m of local) {assert.ok(!nonRing.has(m),'ring finish leaks outside ring');assert.equal(m.emissive.getHex(),0);}
 assert.ok(local.size>0,'trial has no isolated non-emissive ring finish');
 console.log('PASS exact protected source, all-part world geometry, non-ring/shared finishes, ring material isolation; no protected code/test changes');
 writeFileSync(dir+'/protected-result.json',JSON.stringify({passed:true,...protectedState,localNonEmissiveFinishes:[...local].map(finish)},null,2)+'\n');
 }
}
