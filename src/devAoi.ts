import * as T from 'three';
import { AOI_CAPTION_FROM, AOI_DURATION, AOI_SEED_RELEASE, AOI_SHOTS, aoiPose, aoiShot, smooth } from './aoiTimeline.ts';
import type { AoiPose, AoiShotName } from './aoiTimeline.ts';
import type { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { addCityModel } from './modelAssets.ts';
import type { EnergyRuntime } from './energyRuntime.ts';

const AOI_URL = new URL('../asset/models/resident-aoi/resident-aoi.glb', import.meta.url).href;
const ENTRY = new T.Vector3(-242, 6.5, 389);
const ENTRY_TARGET = new T.Vector3(-213, 2.6, 407);
const MEDIUM = new T.Vector3(-181.44, 4.85, 397.96);
const BED_VIEW = new T.Vector3(-162.5, 13.5, 385.5);
const BED_TARGET = new T.Vector3(-185.1, 13.4, 401.4);
const CHARACTER = new T.Vector3(-185.59, 2.25, 398.75);
const GESTURE = new T.Vector3(-185.31, 3.42, 399.02);
const FACE = new T.Vector3(-183.53, 3.24, 399.55);
const FACE_TARGET = new T.Vector3(-185.58, 3.9, 398.76);
// S4 is a medium close-up, head to hands: from FACE's spot (the crop bed lies just beyond it, farther or more frontal
// cameras look through it) but at chest height instead of 16° below her face, with a wider lens, so the steep up-angle no
// longer hides her arms behind the torso.
const PAYOFF = FACE.clone().setY(3.55);
const PAYOFF_TARGET = new T.Vector3(-185.58, 3.5, 398.76);
// Fixed shots cut on action (handoff shot table). Each moves at most 4 % of its distance: `push` slides the camera
// along its own sight line, `rise` tilts the aim up.
const SHOTS: Record<AoiShotName, { position: T.Vector3; target: T.Vector3; fov: number; push: number; rise: number }> = {
  S1: { position: ENTRY, target: ENTRY_TARGET, fov: 53, push: .035, rise: 0 },
  S2: { position: MEDIUM, target: GESTURE.clone().setY(3.6), fov: 40, push: .04, rise: 0 },
  S3: { position: BED_VIEW, target: BED_TARGET, fov: 53, push: 0, rise: .9 },
  S4: { position: PAYOFF, target: PAYOFF_TARGET, fov: 46, push: .03, rise: 0 },
};
// Face light intensities (candela, decay 2) by day and at full night; the key also follows `pose.sunlight`.
const FILL = { day: 1.5, night: 22 };
const KEY = { day: 5, night: 8 };
const RIM = { day: 60, night: 16 };
// Depth of field (resident-cinematic rule 9), medium and close shots only: S2 focuses on the sowing hand, S4 on the face.
// `aperture` is blur per metre off focus and `maxblur` its cap, both in screen widths (BokehShader).
const LENS: Partial<Record<AoiShotName, { aperture: number; maxblur: number }>> = {
  S2: { aperture: .004, maxblur: .008 },
  S4: { aperture: .005, maxblur: .008 },
};
const VIEWS: Record<string, AoiShotName> = { entry: 'S1', hands: 'S2', canopy: 'S3', payoff: 'S4' };

export async function startAoi(energy: EnergyRuntime, camera: T.PerspectiveCamera, controls: { target: T.Vector3; enabled: boolean }, params: URLSearchParams, lens?: BokehPass) {
  await energy.farmReady;
  const set = new T.Group();
  set.name = 'aoi-weather-library';
  set.position.copy(energy.farm.position).negate();
  energy.farm.add(set);
  const aoi = await addCityModel(set, AOI_URL, CHARACTER.toArray(), .58);
  aoi.traverse(object => { object.castShadow = false; });
  const required = (name: string) => {
    const joint = aoi.getObjectByName(name.replace(".", ""));
    if (!joint) throw new Error(`Aoi rig is missing ${name}`);
    return joint;
  };
  const arms = ['L', 'R'].map(side => ({
    upper: required(`upperArm.${side}`),
    lower: required(`lowerArm.${side}`),
    hand: required(`hand.${side}`),
  }));
  const head = required('head'), torso = required('torso');

  // One measured face of HexPanels_Glass, under the existing rim.
  const paneGeometry = new T.BufferGeometry();
  paneGeometry.setAttribute('position', new T.Float32BufferAttribute([
    -189.2629,24.0971,403.8119, -183.6817,24.9314,405.5438,
    -186.9721,24.4764,406.3065, -184.973,24.6263,399.7918,
    -188.2634,24.1722,400.5545, -182.6822,24.5967,402.2864,
  ], 3));
  paneGeometry.setIndex([4, 3, 5, 4, 5, 1, 4, 1, 2, 4, 2, 0]);
  const effects = new T.Group();
  effects.name = 'aoi-weather-effects';
  set.add(effects);
  const pane = new T.Mesh(paneGeometry, new T.MeshBasicMaterial({
    color: new T.Color('#ffc477').multiplyScalar(1.65), side: T.DoubleSide, transparent: true, depthWrite: false,
  }));
  pane.name = 'aoi-weather-pane';
  pane.renderOrder = 1;
  effects.add(pane);

  const palm = new T.Vector3(), release = new T.Vector3();
  const landing = new T.Vector3(-185.6, 2.9, 399.20);
  const sunlight = new T.SpotLight('#ffbd72', 0, 28, .073, .28, 2);
  sunlight.name = 'aoi-archived-sunlight';
  sunlight.position.set(-186, 24.2, 404);
  sunlight.target.position.set(-185, 3.15, 400.05);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(512, 512);
  sunlight.shadow.camera.near = 17;
  sunlight.shadow.normalBias = .025;
  set.add(sunlight, sunlight.target);
  const beamDirection = sunlight.position.clone().sub(sunlight.target.position);
  const shaft = new T.Mesh(
    new T.CylinderGeometry(.22, 1.38, beamDirection.length(), 32, 1, true),
    new T.ShaderMaterial({
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
      uniforms: { reach: { value: 0 } },
      vertexShader: `
        varying vec3 surfaceNormal;
        varying vec3 eye;
        varying float along;
        void main() {
          vec4 view = modelViewMatrix * vec4(position, 1.0);
          surfaceNormal = normalMatrix * normal;
          eye = -view.xyz;
          along = 1.0 - uv.y;
          gl_Position = projectionMatrix * view;
        }
      `,
      fragmentShader: `
        uniform float reach;
        varying vec3 surfaceNormal;
        varying vec3 eye;
        varying float along;
        void main() {
          float center = max(0.0, dot(normalize(surfaceNormal), normalize(eye)));
          float edge = smoothstep(0.0, .045, along) * (1.0 - smoothstep(.88, 1.0, along));
          float front = smoothstep(along, along + .16, reach);
          gl_FragColor = vec4(1.0, .60, .25, center * center * edge * front * .24);
        }
      `,
    }),
  );
  shaft.position.copy(sunlight.position).lerp(sunlight.target.position, .5);
  shaft.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), beamDirection.normalize());
  shaft.renderOrder = 2;
  effects.add(shaft);

  const seedColor = new T.MeshStandardMaterial({ color: '#be934f', roughness: .95 });
  const seedShape = new T.SphereGeometry(.0095, 6, 4);
  const seeds = Array.from({ length: 17 }, (_, i) => {
    const grain = new T.Mesh(seedShape, seedColor);
    grain.scale.set(1.15, .74, .86);
    grain.rotation.y = i * 2.4;
    set.add(grain);
    const radius = .016 * Math.sqrt(i);
    const offset = new T.Vector3(Math.cos(i * 2.4) * radius, .009 + (i % 3) * .009, Math.sin(i * 2.4) * radius);
    return { grain, offset, fallSpeed: .74 + (i % 7) * .12 };
  });
  // Head, arms and torso each read their own offset copy of the channels (overlapping action); breath and drift keep
  // Aoi from ever standing fully still.
  const setPose = ({ head: h, arms: a, torso: b, breath, drift }: AoiPose) => {
    torso.rotation.x = .04 + .14 * b.sow - .07 * b.look + .012 * breath;
    head.rotation.x = .06 + .19 * h.lift + .15 * h.sow - .42 * h.look + .01 * breath;
    head.rotation.y = .30 * h.lift * (1 - T.MathUtils.clamp(h.sow, 0, 1)) + .035 * drift;
    arms.forEach(({ upper, lower, hand }, index) => {
      upper.rotation.x = -.14 - a.lift * (index === 0 ? .16 : .78) - a.sow * (index === 0 ? .04 : .43);
      upper.rotation.z = (index === 0 ? 1 : -1) * (.13 + a.lift * .12 + .012 * breath);
      lower.rotation.x = -.17 - a.lift * (index === 0 ? .57 : .78) + a.sow * .22;
      hand.rotation.x = -.19 - a.lift * .36 + a.sow * 1.05;
    });
    palm.set(-.012, -.084, .022);
    arms[1].hand.localToWorld(palm);
    set.worldToLocal(palm);
  };
  setPose(aoiPose(AOI_SEED_RELEASE));
  release.copy(palm);
  // Face lights (resident-cinematic rule 8). Both cameras that show her face (S2, S4) sit on her +x side, the glass rail
  // is 0.93 m behind her on -x and the crops sit between her and the S2 camera. The fill used to be a point light between
  // her and the rail, and at night it blew out the rail and parapet behind her. It is now one narrow spot from the camera
  // side, steep enough that the light passing her lands on the floor before the parapet; still the one fill for day and
  // night. Fill, key and rim never cast shadows and only change intensity, so no lit material recompiles mid-beat.
  const fill = new T.SpotLight('#ffd5b3', 0, 6, .3, .8, 2);
  fill.name = 'aoi-fill';
  fill.position.copy(CHARACTER).add(new T.Vector3(.9, 3.8, 0));
  fill.target.position.copy(FACE_TARGET).setY(3.5);
  set.add(fill, fill.target);
  // Warm key from above and in front, the side the lit pane is on: it comes up with the archived sunlight and carries
  // the payoff close-up, where the sunlight itself misses her face.
  const key = new T.SpotLight('#ffc27a', 0, 6, .32, .7, 2);
  key.name = 'aoi-face-key';
  key.position.copy(FACE_TARGET).add(new T.Vector3(.7, 2.6, 1.5));
  key.target.position.copy(FACE_TARGET);
  // Cool rim from behind the rail at head height, aimed back along both face cameras' sight lines: it grazes the edge of
  // her hair and shoulders against the set (S4 looks up at her, so a rim from above would only light the hidden top), and
  // the rail's and parapet's lit faces look away from it.
  const rim = new T.SpotLight('#9fc6ff', 0, 6, .25, .5, 2);
  rim.name = 'aoi-rim';
  rim.position.copy(FACE_TARGET).add(new T.Vector3(-2, .3, -.8));
  rim.target.position.copy(FACE_TARGET).setY(3.7);
  set.add(key, key.target, rim, rim.target);
  // The lens's depth prepass draws every mesh opaque, so glass (the rail, through which S2 sees the whole background) and
  // the beam would hold the focus depth: hide transparent meshes for that prepass. The list is rescanned every 120 frames.
  const focus = new T.Vector3(), forward = new T.Vector3();
  const blur = lens?.uniforms as Record<'focus' | 'aperture' | 'maxblur', { value: number }> | undefined;
  if (lens) {
    const draw = lens.render.bind(lens);
    let clear: T.Object3D[] = [], passes = 0;
    lens.render = (...args) => {
      if (passes++ % 120 === 0) {
        clear = [];
        lens.scene.traverse(object => {
          const material = (object as T.Mesh).material;
          if (material && [material].flat().some(m => m.transparent)) clear.push(object);
        });
      }
      const shown = clear.filter(object => object.visible);
      shown.forEach(object => { object.visible = false; });
      draw(...args);
      shown.forEach(object => { object.visible = true; });
    };
  }
  const held = Number(params.get('aoiTime'));
  const freeze = params.has('aoiTime') && Number.isFinite(held);
  const view = VIEWS[params.get('aoiView') ?? ''];
  const caption = document.createElement('div');
  caption.textContent = 'あの日の陽ざしを借りて、この種をもう一度。';
  caption.lang = 'ja';
  caption.style.cssText = 'position:fixed;left:44px;bottom:44px;z-index:4;padding:14px 20px;border-radius:10px;background:#f9f8f0e6;color:#2f3d36;font:600 22px/1.5 system-ui';
  caption.style.pointerEvents = 'none';
  document.body.append(caption);
  controls.enabled = false;
  let started: number | undefined, sought: number | undefined, shown = false;
  // DEV reel hook (scripts/beatReel.mjs): holds the beat at `t` seconds until the next seek; the caller waits two
  // animation frames before capturing. Returns whether the last frame drew the set (false while the farm fades in).
  if (import.meta.env.DEV) Object.assign(window, { __residentSeek: (t?: number) => {
    if (t !== undefined) sought = t;
    return { ready: shown, duration: AOI_DURATION };
  } });
  const frame = (now: number, darkness: number) => {
    shown = energy.getDiagnostics().farm.opacity >= .999;
    if (!shown) {
      set.visible = false;
      caption.hidden = true;
      started = undefined;
      return;
    }
    set.visible = true;
    started ??= now;
    const t = sought ?? (freeze ? held : now - started);
    const pose = aoiPose(t);
    const { seeds: fall, pane: lit, beam, sunlight: sun } = pose;
    setPose(pose);
    pane.visible = lit > 0;
    pane.material.opacity = .95 * lit;
    shaft.visible = beam > 0;
    shaft.material.uniforms.reach.value = beam * 1.16;
    sunlight.intensity = 5400 * sun;
    seeds.forEach(({ grain, offset, fallSpeed }) => {
      const drop = fall ** fallSpeed;
      grain.position.copy(palm);
      if (drop > 0) {
        grain.position.lerpVectors(release, landing, drop);
        grain.position.y = T.MathUtils.lerp(release.y, landing.y, drop * drop);
      }
      grain.position.addScaledVector(offset, 1 + 2.6 * drop);
      grain.visible = (pose.arms.lift > .5 || fall > 0) && drop < .99;
    });
    fill.intensity = FILL.day + (FILL.night - FILL.day) * darkness;
    key.intensity = (KEY.day + (KEY.night - KEY.day) * darkness) * sun;
    rim.intensity = RIM.day + (RIM.night - RIM.day) * darkness;
    const playing = aoiShot(t);
    caption.hidden = params.has('aoiNoCaption') || playing.shot !== 'S4' || t < AOI_CAPTION_FROM || t > AOI_DURATION;
    // aoiView holds one shot's framing; its move follows the beat clock, clamped to that shot's span.
    const span = view && AOI_SHOTS.find(({ shot }) => shot === view)!;
    const { shot, u } = span ? { shot: span.shot, u: T.MathUtils.clamp((t - span.start) / (span.end - span.start), 0, 1) } : playing;
    const { position, target, fov, push, rise } = SHOTS[shot];
    const move = smooth(u);
    camera.position.lerpVectors(position, target, push * move);
    controls.target.copy(target);
    controls.target.y += rise * move;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(controls.target);
    const look = LENS[shot];
    if (lens && blur) {
      lens.enabled = !!look;
      if (look) {
        if (shot === 'S2') set.localToWorld(focus.copy(palm));
        else head.getWorldPosition(focus);
        blur.focus.value = focus.sub(camera.position).dot(camera.getWorldDirection(forward));
        blur.aperture.value = look.aperture;
        blur.maxblur.value = look.maxblur;
      }
    }
  };
  return { effects, frame };
}
