import * as T from 'three';
import { AOI_CAPTION_FROM, AOI_DURATION, AOI_SEED_RELEASE, AOI_SHOTS, aoiPose, aoiShot, smooth } from './aoiTimeline.ts';
import type { AoiPose, AoiShotName } from './aoiTimeline.ts';
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
// Fixed shots cut on action (handoff shot table). Each moves at most 4 % of its distance: `push` slides the camera
// along its own sight line, `rise` tilts the aim up.
const SHOTS: Record<AoiShotName, { position: T.Vector3; target: T.Vector3; fov: number; push: number; rise: number }> = {
  S1: { position: ENTRY, target: ENTRY_TARGET, fov: 53, push: .035, rise: 0 },
  S2: { position: MEDIUM, target: GESTURE.clone().setY(3.6), fov: 40, push: .04, rise: 0 },
  S3: { position: BED_VIEW, target: BED_TARGET, fov: 53, push: 0, rise: .9 },
  S4: { position: FACE, target: FACE_TARGET, fov: 35, push: .03, rise: 0 },
};
const VIEWS: Record<string, AoiShotName> = { entry: 'S1', hands: 'S2', canopy: 'S3', payoff: 'S4' };

export async function startAoi(energy: EnergyRuntime, camera: T.PerspectiveCamera, controls: { target: T.Vector3; enabled: boolean }, params: URLSearchParams) {
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
  const fill = new T.PointLight('#ffd5b3', 3, 4, 2);
  fill.position.copy(CHARACTER).add(new T.Vector3(-.8, 1.75, .65));
  set.add(fill);
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
    fill.intensity = .2 + 5 * darkness;
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
  };
  return { effects, frame };
}
