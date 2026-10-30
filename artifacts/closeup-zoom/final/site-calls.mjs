import * as T from 'three';
import {pathToFileURL} from 'node:url';
const root=process.argv[2], site=process.argv[3];
const context=new Proxy({}, {get:()=>()=>{},set:()=>true});
globalThis.document={createElement:()=>({width:512,height:128,getContext:()=>context})};
const {buildConcentrationTower}=await import(pathToFileURL(`${root}/src/siteBuilders/concentrationTower.ts`));
if(site!=='se')throw Error('Only SE is supported');
const scene=new T.Scene(),built=buildConcentrationTower(scene,{windows:[],signs:[],random:()=>.5});
for(const [band,count] of [['low',2],['mixed',4],['high',6]]){
 built.concentrationTower.setTarget({band,functionModules:count},0,true);
 for(const [name,layer] of Object.entries(built.layers)) {layer.group.visible=name==='towerBase'||name==='towerUpper'&&band==='high'||name==='towerNeutralProps'&&band==='mixed';layer.group.scale.set(1,1,1);}
 let meshes=0;built.root.traverseVisible(o=>{if(o instanceof T.Mesh) meshes+=Array.isArray(o.material)?o.material.length:1;});
 console.log(JSON.stringify({band,meshes}));
}
