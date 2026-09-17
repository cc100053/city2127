import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { cityRig } from './cityRig';
import { heroCamera, HERO_TARGET } from './heroCamera';
import { createWorldState } from './worldState';
import { overlay } from './overlay';
import './style.css';

try {
  const scene=new T.Scene();scene.background=new T.Color('#dfd6cd');scene.fog=new T.FogExp2('#dfd6cd',.008);
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label','A multi-level Shibuya crossing in 2127. Drag to orbit, scroll to zoom, right-drag to pan. Use 0 for daylight, 1 for pulse, 2 for still.');
  document.querySelector('#app')!.appendChild(renderer.domElement);
  const environment=new T.PMREMGenerator(renderer),room=new RoomEnvironment();
  scene.environment=environment.fromScene(room,.04).texture;scene.environmentIntensity=.3;room.dispose();environment.dispose();
  const camera=heroCamera(innerWidth,innerHeight);
  const ambient=new T.HemisphereLight('#edf1e4','#849184',2.2);scene.add(ambient);
  const sun=new T.DirectionalLight('#ffe4b8',3.4);sun.position.set(-20,38,18);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:180});sun.shadow.normalBias=.12;scene.add(sun);
  const floor=new T.Mesh(new T.PlaneGeometry(500,500),new T.MeshStandardMaterial({color:'#e5ddcc',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.76;floor.receiveShadow=true;scene.add(floor);
  const rig=cityRig(scene);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(...HERO_TARGET);controls.enableDamping=true;controls.dampingFactor=.06;controls.rotateSpeed=.45;controls.zoomSpeed=.6;controls.panSpeed=.5;
  controls.minDistance=45;controls.maxDistance=180;controls.minPolarAngle=.35;controls.maxPolarAngle=1.42;controls.screenSpacePanning=false;controls.update();
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.2,.5,1.1);composer.addPass(bloom);composer.addPass(new OutputPass());
  const world=createWorldState();let now=0;
  const updateOverlay=overlay(name=>world.choose(name,now));
  const dusk=new T.Color('#c3d9e7'),night=new T.Color('#accbdc'),morning=new T.Color('#e0e6dc');
  const sunWarm=new T.Color('#ffe2b3'),sunCool=new T.Color('#e5f3ff'),ambientWarm=new T.Color('#eef0df'),ambientCool=new T.Color('#a7c9ed');
  const start=performance.now();
  let frames=0,measureStart=start;
  renderer.setAnimationLoop(()=>{
    now=(performance.now()-start)/1000;
    const status=world.update(now),s=world.state;
    const pulse=T.MathUtils.clamp((s.neon-.25)/.7,0,1),still=T.MathUtils.clamp((s.warmth-.55)/.3,0,1);
    (scene.background as T.Color).copy(dusk).lerp(night,pulse).lerp(morning,still);
    (scene.fog as T.FogExp2).color.copy(scene.background as T.Color);(scene.fog as T.FogExp2).density=.0015+s.haze*.003;
    floor.material.color.copy(scene.background as T.Color);
    sun.color.copy(sunWarm).lerp(sunCool,pulse);sun.intensity=2.6+pulse*.2+still*.4;
    sun.position.set(-30+still*10,65,30);ambient.intensity=1.3+pulse*.15+still*.15;
    ambient.color.copy(ambientWarm).lerp(ambientCool,pulse);
    bloom.strength=.06+pulse*.04;
    controls.update();rig.update(s,now);updateOverlay(status);renderer.info.reset();composer.render();
    if(++frames===120){renderer.domElement.dataset.time=now.toFixed(2);renderer.domElement.dataset.fps=(120000/(performance.now()-measureStart)).toFixed(1);renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);renderer.domElement.dataset.geometries=String(renderer.info.memory.geometries);frames=0;measureStart=performance.now();}
  });
  window.addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);
  });
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);const message=document.createElement('p');message.className='error';message.textContent='The graphics context was lost. Reload to return to the crossing.';document.body.appendChild(message);});
} catch(error) {
  const message=document.createElement('p');message.className='error';message.textContent='The crossing could not load. Reload to try again. '+(error instanceof Error ? error.message : String(error));document.body.appendChild(message);console.error(error);
}
