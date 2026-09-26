/// <reference types="vite/client" />
import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { cityRig } from './cityRig';
import { heroCamera, HERO_TARGET } from './heroCamera';
import { createWorldState } from './worldState';
import { hourAt, sunHeight, daylight, moodAt, withNight } from './dayCycle';
import { overlay } from './overlay';
import { addCityModel } from './modelAssets';
import { startSurveyAtmosphere } from './surveyAtmosphere';
import { createCityChangeManager } from './createCityChangeManager';
import './style.css';

try {
  const scene=new T.Scene();scene.background=new T.Color('#dfd6cd');scene.fog=new T.FogExp2('#dfd6cd',.008);
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
  renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=.84;renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.VSMShadowMap;
  renderer.domElement.setAttribute('aria-label','A multi-level Shibuya crossing in 2127. Drag to orbit, scroll to zoom, right-drag to pan. One city day, dawn to night, passes every three minutes.');
  document.querySelector('#app')!.appendChild(renderer.domElement);
  const environment=new T.PMREMGenerator(renderer),room=new RoomEnvironment();
  scene.environment=environment.fromScene(room,.04).texture;scene.environmentIntensity=.6;room.dispose();environment.dispose();
  const camera=heroCamera(innerWidth,innerHeight);
  const ambient=new T.HemisphereLight('#edf1e4','#8a8274',2.2);scene.add(ambient);
  const sun=new T.DirectionalLight('#ffe4b8',3.4);sun.position.set(-20,38,18);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:180});sun.shadow.normalBias=.12;sun.shadow.radius=5;sun.shadow.blurSamples=12;scene.add(sun);
  // Gradient sky: horizon shares the fog colour, zenith is a deeper tone per state. Follows the camera so it never clips.
  const sky=new T.Mesh(new T.SphereGeometry(150,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color()},horizon:{value:new T.Color()}},
    vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top,horizon;varying vec3 p;void main(){float h=clamp(normalize(p).y*1.8,0.,1.);gl_FragColor=vec4(mix(horizon,top,pow(h,.65)),1.);}'}));
  sky.frustumCulled=false;sky.renderOrder=-1;scene.add(sky);
  const floor=new T.Mesh(new T.PlaneGeometry(500,500),new T.MeshStandardMaterial({color:'#e5ddcc',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.76;floor.receiveShadow=true;scene.add(floor);
  const rig=cityRig(scene);
  addCityModel(scene,new URL('../asset/models/future-tree-2127/future-tree-2127.glb',import.meta.url).href,[11,0,23])
    .catch(error=>console.error('Future tree failed to load',error));
  if(import.meta.env.DEV && new URLSearchParams(location.search).has('asset-preview')){
    const input=document.createElement('input');input.type='file';input.accept='.glb,model/gltf-binary';input.className='asset-preview';input.title='Preview a Blender GLB in the Shibuya scene';input.setAttribute('aria-label','Preview a Blender GLB');
    document.body.appendChild(input);
    input.addEventListener('change',async()=>{
      const file=input.files?.[0];if(!file)return;
      const url=URL.createObjectURL(file);input.disabled=true;
      try{await addCityModel(scene,url,[0,0,0]);input.title=`Loaded ${file.name}; reload to preview another model`;}
      catch(error){input.disabled=false;console.error('GLB preview failed',error);alert(`GLB preview failed: ${error instanceof Error?error.message:String(error)}`);}
      finally{URL.revokeObjectURL(url);}
    });
  }
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(...HERO_TARGET);controls.enableDamping=true;controls.dampingFactor=.06;controls.rotateSpeed=.45;controls.zoomSpeed=.6;controls.panSpeed=.5;
  controls.minDistance=45;controls.maxDistance=180;controls.minPolarAngle=.35;controls.maxPolarAngle=1.42;controls.screenSpacePanning=false;controls.update();
  // MSAA target: the composer's default target has no samples, so edges were aliased once post-processing ran.
  const composer=new EffectComposer(renderer,new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType,samples:4}));composer.setSize(innerWidth,innerHeight);composer.addPass(new RenderPass(scene,camera));
  // Contact shadows where slabs, planters and cores meet: the cheapest step from blockout to built object.
  const ao=new GTAOPass(scene,camera,innerWidth,innerHeight);ao.updateGtaoMaterial({radius:3,distanceFallOff:.8,thickness:3,samples:16});ao.blendIntensity=1;composer.addPass(ao);
  const bloom=new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.2,.7,1);composer.addPass(bloom);
  const vignette=new ShaderPass(VignetteShader);vignette.uniforms.offset.value=.9;vignette.uniforms.darkness.value=.9;composer.addPass(vignette);composer.addPass(new OutputPass());
  const world=createWorldState();let now=0;
  const params=new URLSearchParams(location.search);
  // `?survey` or `?survey=ws://host:port/ws`: survey policy scores drive the city state; the day/night light still runs.
  const surveyParam=params.get('survey');
  const surveyUrl=surveyParam===null?null:/^wss?:\/\//.test(surveyParam)?surveyParam:`ws://${location.hostname}:8787/ws`;
  // `?hour=21` holds the clock at one hour, for review captures.
  const heldHour=Number(params.get('hour')??NaN),hold=heldHour>=0&&heldHour<24?heldHour:null;
  const updateOverlay=overlay();
  const cityChanges=surveyUrl?createCityChangeManager(scene):null;
  if(surveyUrl)startSurveyAtmosphere(surveyUrl,(kind,view,state)=>{
    world.blendTo(state,now);
    if(kind==='city-state-updated')cityChanges!.applyIncrementalUpdate(view,now);
    else cityChanges!.restoreFromSnapshot(view,now);
  });
  // Day tints per mood (unchanged daylight look), then dusk and night colours laid over them by the clock.
  const dayBase=new T.Color('#c3d9e7'),dayPulse=new T.Color('#accbdc'),dayStill=new T.Color('#e0e6dc');
  const topBase=new T.Color('#7f9fbd'),topPulse=new T.Color('#6a8db0'),topStill=new T.Color('#a9bcc4');
  const duskHorizon=new T.Color('#f6b58a'),duskTop=new T.Color('#7a86ad'),nightHorizon=new T.Color('#1c2941'),nightTop=new T.Color('#070d1c');
  const sunLow=new T.Color('#ffae78'),sunHigh=new T.Color('#ffe7c4'),moon=new T.Color('#7d9be0'),ambientDay=new T.Color('#e3ebee'),ambientPulse=new T.Color('#a7c9ed'),ambientNight=new T.Color('#3b5796');
  const start=performance.now();
  let frames=0,measureStart=start;
  renderer.setAnimationLoop(()=>{
    now=(performance.now()-start)/1000;
    const hour=hold??hourAt(now),height=sunHeight(hour),day=daylight(hour),dark=1-day,glow=1-T.MathUtils.smoothstep(Math.abs(height),0,.4),nightSky=T.MathUtils.smoothstep(dark,.35,1);
    if(surveyUrl)world.update(now);
    const s=withNight(surveyUrl?world.state:moodAt(hour),dark);
    const pulse=T.MathUtils.clamp((s.neon-.25)/.7,0,1)*day,still=T.MathUtils.clamp((s.warmth-.55)/.3,0,1);
    (scene.background as T.Color).copy(dayBase).lerp(dayPulse,pulse).lerp(dayStill,still).lerp(duskHorizon,glow*.7).lerp(nightHorizon,nightSky);
    (scene.fog as T.FogExp2).color.copy(scene.background as T.Color);(scene.fog as T.FogExp2).density=.0015+s.haze*.003;
    floor.material.color.copy(scene.background as T.Color);
    sky.position.copy(camera.position);sky.material.uniforms.horizon.value.copy(scene.background as T.Color);sky.material.uniforms.top.value.copy(topBase).lerp(topPulse,pulse).lerp(topStill,still).lerp(duskTop,glow*.5).lerp(nightTop,nightSky);
    // The sun arcs east to west; below the horizon the same light becomes a dim moon from the opposite side, so shadows never stop.
    const arc=Math.PI*(hour-6)/12,up=height>0?1:-1;
    sun.position.set(70*Math.cos(arc)*up,40*Math.abs(height)+4,34);
    sun.color.copy(sunLow).lerp(sunHigh,T.MathUtils.smoothstep(height,0,.45)).lerp(moon,dark);
    sun.intensity=(2.55+pulse*.2+still*.05)*T.MathUtils.smoothstep(height,-.02,.2)+.2*T.MathUtils.smoothstep(-height,.02,.25);
    ambient.intensity=(.62+pulse*.15+still*.15)*(.15+.85*day);
    ambient.color.copy(ambientDay).lerp(ambientPulse,pulse).lerp(ambientNight,dark);
    scene.environmentIntensity=.6*(.08+.92*day);renderer.toneMappingExposure=.84+dark*.1;
    bloom.strength=.1+pulse*.04+dark*.3;
    controls.update();rig.update(s,now);cityChanges?.update(now);updateOverlay(hour,dark>.5);renderer.info.reset();composer.render();
    if(++frames===120){renderer.domElement.dataset.time=now.toFixed(2);renderer.domElement.dataset.fps=(120000/(performance.now()-measureStart)).toFixed(1);renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);renderer.domElement.dataset.geometries=String(renderer.info.memory.geometries);if(cityChanges)renderer.domElement.dataset.siteAssets=JSON.stringify(cityChanges.getDiagnostics());frames=0;measureStart=performance.now();}
  });
  window.addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);
  });
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);const message=document.createElement('p');message.className='error';message.textContent='The graphics context was lost. Reload to return to the crossing.';document.body.appendChild(message);});
} catch(error) {
  const message=document.createElement('p');message.className='error';message.textContent='The crossing could not load. Reload to try again. '+(error instanceof Error ? error.message : String(error));document.body.appendChild(message);console.error(error);
}
