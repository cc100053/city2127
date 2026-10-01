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
import { DISTRICT } from './layout';
import { createWorldState } from './worldState';
import { displayHour, type DisplayMode, sunHeight, daylight, moodAt, withNight, nightLighting } from './dayCycle';
import { overlay } from './overlay';
import { addCityModel } from './modelAssets';
import { loadOdaiba, updateOdaiba } from './odaibaScene';
import { build2127 } from './odaiba2127';
import { bayWater } from './bayWater';
import { scoresToWorldState, startSurveyAtmosphere } from './surveyAtmosphere';
import { isExhibitionView } from './surveyView';
import { createCityChangeManager } from './createCityChangeManager';
import './style.css';

try {
  const scene=new T.Scene();scene.background=new T.Color('#dfd6cd');scene.fog=new T.FogExp2('#dfd6cd',.0005);
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
  renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=.84;renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.VSMShadowMap;
  renderer.domElement.setAttribute('aria-label','The Odaiba waterfront around the Fuji TV sphere in 2127. Drag to orbit, scroll to zoom, right-drag to pan. One city day, dawn to night, passes every three minutes.');
  document.querySelector('#app')!.appendChild(renderer.domElement);
  scene.environmentIntensity=.6;
  const camera=heroCamera(innerWidth,innerHeight);
  const reviewParams=new URLSearchParams(location.search);
  const civicReview=import.meta.env.DEV && reviewParams.get('review')==='civic';
  if(civicReview){camera.position.set(-180,105,-235);camera.lookAt(-10,78,20);}
  const reviewTime=import.meta.env.DEV && reviewParams.has('reviewTime') ? Number(reviewParams.get('reviewTime')) : NaN;
  const ambient=new T.HemisphereLight('#edf1e4','#8a8274',2.2);scene.add(ambient);
  const sun=new T.DirectionalLight('#ffe4b8',3.4);sun.position.set(-20,38,18);sun.castShadow=true;
  // Shadow box fitted to the hero cluster (Fuji TV, Aqua City, DECKS, Hilton, Nikko, DiverCity), in metres.
  sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-480,right:480,top:480,bottom:-480,near:10,far:2400});sun.shadow.normalBias=.3;sun.shadow.radius=5;sun.shadow.blurSamples=12;scene.add(sun);
  // Generated clouds fade into the clock-driven gradient at dusk; the sky follows the camera.
  const skyTexture=new T.TextureLoader().load(new URL('../asset/textures/maritime-sky.png',import.meta.url).href,texture=>{
    // The generated sky is LDR: preserve HDR light-card energy while replacing enclosed-room reflections.
    const capture=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);
    // Reflections see a softened, warmer copy of the sky: the generated blue is too saturated for bay water and glass at golden hour.
    const soft=document.createElement('canvas');soft.width=texture.image.width;soft.height=texture.image.height;
    const context=soft.getContext('2d')!;context.filter='saturate(.55) sepia(.12) brightness(1.04)';context.drawImage(texture.image,0,0);
    const reflected=new T.CanvasTexture(soft);reflected.colorSpace=T.SRGBColorSpace;reflected.mapping=T.EquirectangularReflectionMapping;
    capture.background=reflected;
    capture.traverse(object=>{if(object instanceof T.Mesh && object.material instanceof T.MeshStandardMaterial)object.visible=false;});
    scene.environment=pmrem.fromScene(capture,.04).texture;
    capture.dispose();pmrem.dispose();reflected.dispose();
  });skyTexture.colorSpace=T.SRGBColorSpace;skyTexture.wrapS=T.RepeatWrapping;
  skyTexture.mapping=T.EquirectangularReflectionMapping;
  const sky=new T.Mesh(new T.SphereGeometry(1500,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color()},horizon:{value:new T.Color()},clouds:{value:skyTexture},day:{value:1},tint:{value:new T.Color(1,1,1)},sunDir:{value:new T.Vector3(0,1,0)},sunGlow:{value:new T.Color()}},
    vertexShader:'varying vec3 p;varying vec2 skyUv;void main(){p=position;skyUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    // A broad warm bloom around the sun's bearing lights the horizon and cloud edges on that side of the frame (target: backlit bay to the right).
    // Altitude is measured from the curved sea's horizon (about 4.7° below level, see EARTH in bayContext), so a warm haze band sits on the sea and clouds rise above it.
    // The hero frame shows only ~6° of sky, so the generated cumulus band (texture rows ~.40–.50) is mapped just above the sea horizon,
    // tiled twice around; its saturated blue is keyed out (blue minus red) so the clock gradient shows between warm, desaturated clouds.
    fragmentShader:'uniform vec3 top,horizon,tint,sunDir,sunGlow;uniform sampler2D clouds;uniform float day;varying vec3 p;varying vec2 skyUv;void main(){vec3 v=normalize(p);float altitude=v.y+.085;float h=clamp(altitude*7.,0.,1.);vec3 gradient=mix(horizon,top,pow(h,.8));float toSun=max(dot(v,sunDir),0.);gradient+=sunGlow*(pow(toSun,5.)*.45+pow(toSun,48.)*.6)*(1.-.5*h);vec3 c=texture2D(clouds,vec2(skyUv.x*2.,clamp(.4+(skyUv.y-.474)*2.2,.02,.98))).rgb;float mask=1.-smoothstep(.1,.4,c.b-c.r);vec3 cloud=mix(vec3(dot(c,vec3(.299,.587,.114))),c,.5)*tint*1.14+sunGlow*pow(toSun,6.)*.25;gl_FragColor=vec4(mix(gradient,cloud,day*mask*.95*smoothstep(.006,.035,altitude)),1.);}'}));
  sky.frustumCulled=false;sky.renderOrder=-1;scene.add(sky);
  // Open sea beyond the masterplan plate; fog closes the horizon.
  const water=bayWater();
  // 100 m cells so the sea can curve down to its horizon beyond the plate.
  const floor=new T.Mesh(new T.PlaneGeometry(18000,18000,180,180),water);floor.rotation.x=-Math.PI/2;floor.position.y=-1.2;floor.receiveShadow=true;scene.add(floor);
  const rig=cityRig(scene);
  build2127(scene);
  loadOdaiba(scene,water).catch(error=>{const message=document.createElement('p');message.className='error';message.textContent='Odaiba could not load. Reload to try again. '+(error instanceof Error ? error.message : String(error));document.body.appendChild(message);console.error(error);});
  if(import.meta.env.DEV && new URLSearchParams(location.search).has('asset-preview')){
    const input=document.createElement('input');input.type='file';input.accept='.glb,model/gltf-binary';input.className='asset-preview';input.title='Preview a Blender GLB in the city scene';input.setAttribute('aria-label','Preview a Blender GLB');
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
  controls.target.set(...HERO_TARGET);controls.enableDamping=true;controls.dampingFactor=.06;controls.rotateSpeed=.45;controls.zoomSpeed=.6;controls.panSpeed=.8;
  if(civicReview)controls.target.set(-10,78,20);
  // Orbit and pan stay on the hero district; the hazed ground beyond is backdrop, not a destination.
  const districtMin=new T.Vector3(DISTRICT.minX,0,DISTRICT.minZ),districtMax=new T.Vector3(DISTRICT.maxX,160,DISTRICT.maxZ),panBack=new T.Vector3();
  controls.minDistance=150;controls.maxDistance=1000;controls.minPolarAngle=.35;controls.maxPolarAngle=1.42;controls.screenSpacePanning=false;controls.update();
  // MSAA target: the composer's default target has no samples, so edges were aliased once post-processing ran.
  const composer=new EffectComposer(renderer,new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType,samples:4}));composer.setSize(innerWidth,innerHeight);composer.addPass(new RenderPass(scene,camera));
  // Contact shadows where slabs, planters and cores meet: the cheapest step from blockout to built object.
  const ao=new GTAOPass(scene,camera,innerWidth,innerHeight);ao.updateGtaoMaterial({radius:3,distanceFallOff:.8,thickness:3,samples:16});ao.blendIntensity=1;composer.addPass(ao);
  // GTAO's normal/depth prepass uses an override material without the earth curvature, so the far bay would ghost above the horizon: skip the curved sea and bay context there, and the transparent boat wakes (no normals; they read as black AO).
  const aoPass=ao as unknown as {_overrideVisibility():void;_restoreVisibility():void},hideFlat=aoPass._overrideVisibility.bind(aoPass),showFlat=aoPass._restoreVisibility.bind(aoPass);
  let flat:T.Object3D[]=[];
  aoPass._overrideVisibility=()=>{hideFlat();flat=[floor,scene.getObjectByName('bay-context'),scene.getObjectByName('water-taxi-wakes')].filter((o):o is T.Object3D=>!!o?.visible);for(const o of flat)o.visible=false;};
  aoPass._restoreVisibility=()=>{showFlat();for(const o of flat)o.visible=true;};
  const bloom=new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.2,.7,1);composer.addPass(bloom);
  const vignette=new ShaderPass(VignetteShader);vignette.uniforms.offset.value=.9;vignette.uniforms.darkness.value=.9;composer.addPass(vignette);composer.addPass(new OutputPass());
  // Display-space grade after tone mapping: richer colour and contrast by day, warm highlights over cool shadows (golden-hour print look).
  const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},amount:{value:1}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform sampler2D tDiffuse;uniform float amount;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.2126,.7152,.0722));vec3 g=mix(vec3(l),c.rgb,1.08);g=(g-.45)*1.12+.45;g*=mix(vec3(.96,.99,1.03),vec3(1.07,1.01,.9),smoothstep(.1,.8,l));gl_FragColor=vec4(mix(c.rgb,clamp(g,0.,1.),amount),c.a);}'});
  composer.addPass(grade);
  const world=createWorldState();let now=0;
  const params=new URLSearchParams(location.search);
  // `?survey` or `?survey=ws://host:port/ws`: survey policy scores drive the city state; the day/night light still runs.
  const surveyParam=params.get('survey');
  const surveyUrl=surveyParam===null?null:/^wss?:\/\//.test(surveyParam)?surveyParam:`ws://${location.hostname}:8787/ws`;
  // `?hour=21` holds the clock at one hour, for review captures.
  const heldHour=Number(params.get('hour')??NaN),hold=heldHour>=0&&heldHour<24?heldHour:null;
  let displayMode: DisplayMode = 'auto';
  const updateOverlay=overlay();
  // DEV-only `?meters=nw:high,ne:low` (band or score −12..12 per site, unlisted = 0) applies a v2 layout without the survey server, for review captures; `window.cityMeters('ne:high')` then animates a live change.
  const metersParam=import.meta.env.DEV?params.get('meters'):null;
  const cityChanges=surveyUrl||metersParam!==null?createCityChangeManager(scene):null;
  if(import.meta.env.DEV && metersParam!==null)import('./devMeters').then(({devLayout})=>{
    cityChanges!.applyExhibitionLayout(devLayout(metersParam),'city-state-snapshot',now);
    Object.assign(window,{cityMeters:(meters:string)=>cityChanges!.applyExhibitionLayout(devLayout(meters),'city-state-updated',now)});
  });
  if(surveyUrl)startSurveyAtmosphere(surveyUrl,(kind,view)=>{
    if(isExhibitionView(view)){
      // Cancel any legacy score blend while preserving its current rendered atmosphere.
      world.blendTo(world.state,now);
      cityChanges!.applyExhibitionLayout(view.layout,kind,now);
      return;
    }
    world.blendTo(scoresToWorldState(view.scores),now);
    if(kind==='city-state-updated')cityChanges!.applyIncrementalUpdate(view,now);
    else cityChanges!.restoreFromSnapshot(view,now);
  }, mode => { displayMode = mode; });
  // Day tints per mood, then dusk and night colours laid over them by the clock.
  const dayBase=new T.Color('#d3dde0'),dayPulse=new T.Color('#accbdc'),dayStill=new T.Color('#e0e6dc');
  const topBase=new T.Color('#6e9cc6'),topPulse=new T.Color('#6a8db0'),topStill=new T.Color('#a9bcc4');
  const duskHorizon=new T.Color('#f6b58a'),duskTop=new T.Color('#7a86ad'),nightHorizon=new T.Color('#1c2941'),nightTop=new T.Color('#070d1c');
  const sunLow=new T.Color('#ffae78'),sunHigh=new T.Color('#ffe7c4'),moon=new T.Color('#7d9be0'),ambientDay=new T.Color('#e3ebee'),ambientPulse=new T.Color('#a7c9ed'),ambientNight=new T.Color('#899dbd'),ambientLate=new T.Color('#f4dcc0'),white=new T.Color('#ffffff'),cloudGold=new T.Color('#ffcf98'),seaHaze=new T.Color('#a9c4d6'),horizonCream=new T.Color('#f7ead8'),sunBloom=new T.Color('#ffe2b0'),sunDirection=new T.Vector3();
  const start=performance.now();
  let frames=0,measureStart=start;
  renderer.setAnimationLoop(()=>{
    now=Number.isFinite(reviewTime)&&reviewTime>=0 ? reviewTime : (performance.now()-start)/1000;
    const hour=hold??displayHour(displayMode,now),height=sunHeight(hour),day=daylight(hour),dark=1-day,glow=1-T.MathUtils.smoothstep(Math.abs(height),0,1),nightSky=T.MathUtils.smoothstep(dark,.35,1);
    if(surveyUrl)world.update(now);
    const s=withNight(surveyUrl?world.state:moodAt(hour),dark);
    const pulse=T.MathUtils.clamp((s.neon-.25)/.7,0,1)*day,still=T.MathUtils.clamp((s.warmth-.55)/.3,0,1);
    (scene.background as T.Color).copy(dayBase).lerp(dayPulse,pulse).lerp(dayStill,still).lerp(duskHorizon,glow*.85).lerp(nightHorizon,nightSky);
    // Clear bay air by day: the district stays crisp, the sea keeps its blue to the horizon and far shores fade to a cool haze.
    (scene.fog as T.FogExp2).color.copy(scene.background as T.Color).lerp(seaHaze,day*.6);(scene.fog as T.FogExp2).density=.00015+s.haze*.0001;grade.uniforms.amount.value=.35+.65*day;
    sky.material.uniforms.day.value=day;sky.material.uniforms.tint.value.copy(white).lerp(cloudGold,glow*.45);
    sky.position.copy(camera.position);sky.material.uniforms.horizon.value.copy(scene.background as T.Color).lerp(horizonCream,day*.6);sky.material.uniforms.top.value.copy(topBase).lerp(topPulse,pulse).lerp(topStill,still).lerp(duskTop,glow*.5).lerp(nightTop,nightSky);
    // The sun arcs east to west; below the horizon the same light becomes a dim moon from the opposite side, so shadows never stop.
    const arc=Math.PI*(hour-6)/12,up=height>0?1:-1;
    // The arc runs south of the island (+Z), so late-afternoon light rakes across the waterfront toward the hero pose and glints on the bay.
    sun.position.set(840*Math.cos(arc)*up,480*Math.abs(height)+48,760);
    sky.material.uniforms.sunDir.value.copy(sunDirection.copy(sun.position).normalize());sky.material.uniforms.sunGlow.value.copy(sunBloom).multiplyScalar(day*T.MathUtils.smoothstep(height,-.05,.1));
    sun.color.copy(sunLow).lerp(sunHigh,T.MathUtils.smoothstep(height,.25,1)).lerp(moon,dark);
    sun.intensity=(3.15+pulse*.2+still*.05+glow*.5)*T.MathUtils.smoothstep(height,-.02,.2)+.55*T.MathUtils.smoothstep(-height,.02,.25);
    const light=nightLighting(dark);
    ambient.intensity=(.6+pulse*.15+still*.15)*(1-glow*.18*day)*light.ambient;
    ambient.color.copy(ambientDay).lerp(ambientPulse,pulse).lerp(ambientLate,glow*.6).lerp(ambientNight,dark);
    scene.environmentIntensity=light.environment;renderer.toneMappingExposure=light.exposure*(1+.16*day);
    bloom.strength=light.bloom+pulse*.04;vignette.uniforms.offset.value=light.vignette;
    controls.update();panBack.copy(controls.target).clamp(districtMin,districtMax).sub(controls.target);controls.target.add(panBack);camera.position.add(panBack);cityChanges?.update(now);rig.update(s,now,dark,cityChanges?.automationLevel);updateOdaiba(dark);updateOverlay(hour,dark>.5);renderer.info.reset();composer.render();
    if(++frames===120){renderer.domElement.dataset.hour=hour.toFixed(2);renderer.domElement.dataset.displayMode=displayMode;renderer.domElement.dataset.time=now.toFixed(2);renderer.domElement.dataset.fps=(120000/(performance.now()-measureStart)).toFixed(1);renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);renderer.domElement.dataset.geometries=String(renderer.info.memory.geometries);if(cityChanges)renderer.domElement.dataset.siteAssets=JSON.stringify(cityChanges.getDiagnostics());frames=0;measureStart=performance.now();}
  });
  window.addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);
  });
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);const message=document.createElement('p');message.className='error';message.textContent='The graphics context was lost. Reload to return to the city.';document.body.appendChild(message);});
} catch(error) {
  const message=document.createElement('p');message.className='error';message.textContent='The city could not load. Reload to try again. '+(error instanceof Error ? error.message : String(error));document.body.appendChild(message);console.error(error);
}
