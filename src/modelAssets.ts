import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Add an exported Blender GLB at scene coordinates (glTF already converts Z-up to Y-up). */
export async function addCityModel(scene:T.Scene,url:string,position:[number,number,number],rotationY=0) {
  const {scene:model}=await new GLTFLoader().loadAsync(url);
  model.position.set(...position);
  model.rotation.y=rotationY;
  model.traverse(object=>{if(object instanceof T.Mesh){object.castShadow=true;object.receiveShadow=true;}});
  scene.add(model);
  return model;
}
