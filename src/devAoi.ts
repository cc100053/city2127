import * as T from 'three';
import { aoiPose } from './aoiTimeline.ts';
import { glowTexture } from './glowTexture.ts';
import { addCityModel } from './modelAssets.ts';
import type { EnergyRuntime } from './energyRuntime.ts';

const AOI_URL = new URL('../asset/models/resident-aoi/resident-aoi.glb', import.meta.url).href;
const ENTRY = new T.Vector3(-236, 8, 387);
const ENTRY_TARGET = new T.Vector3(-214, 3.7, 411);
const MEDIUM = new T.Vector3(-181.44, 4.43, 397.96);
const CLOSE = new T.Vector3(-183.02, 4.04, 398.94);
const BED_VIEW = new T.Vector3(-208, 12.6, 383);
const BED_TARGET = new T.Vector3(-185.1, 12.85, 401.4);
const CHARACTER = new T.Vector3(-185.35, 2.25, 398.96);
const BED = new T.Vector3(-184.37, 3.22, 401.16);
const GESTURE = new T.Vector3(-185.11, 3.35, 399.22);
const PANE_Y = 24.58;

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
    color: new T.Color('#52f1e6').multiplyScalar(2.15), side: T.DoubleSide, transparent: true, depthWrite: false,
  }));
  pane.name = 'aoi-weather-pane';
  pane.renderOrder = 1;
  effects.add(pane);

  const glow = glowTexture();
  const mist = Array.from({ length: 12 }, (_, index) => {
    const sprite = new T.Sprite(new T.SpriteMaterial({
      map: glow, color: '#d7f0ea', transparent: true, depthWrite: false,
    }));
    sprite.scale.set(1.15 + (index % 3) * .38, index < 3 ? 7.1 : 1.25, 1);
    effects.add(sprite);
    return sprite;
  });
  const palm = new T.Vector3(), release = new T.Vector3();
  const landing = new T.Vector3(-184.88, 2.89, 399.95);
  const seedColor = new T.MeshStandardMaterial({ color: '#b98440', roughness: .95 });
  const seedShape = new T.SphereGeometry(.014, 6, 4);
  const seeds = Array.from({ length: 5 }, () => {
    const seed = new T.Mesh(seedShape, seedColor);
    set.add(seed);
    return seed;
  });
  const setPose = ({ lift, sow }: ReturnType<typeof aoiPose>) => {
    torso.rotation.x = .04 + .23 * sow;
    head.rotation.x = .06 + .19 * lift + .15 * sow;
    head.rotation.y = .30 * lift * (1 - sow);
    arms.forEach(({ upper, lower, hand }, index) => {
      upper.rotation.x = -.14 - lift * (index === 0 ? .16 : .78) - sow * (index === 0 ? .04 : .43);
      upper.rotation.z = (index === 0 ? 1 : -1) * (.13 + lift * .12);
      lower.rotation.x = -.17 - lift * (index === 0 ? .57 : .78) + sow * .53;
      hand.rotation.x = -.19 - lift * .36 + sow * 1.05;
    });
    palm.set(-.012, -.084, .022);
    arms[1].hand.localToWorld(palm);
    set.worldToLocal(palm);
  };
  setPose(aoiPose(5.18));
  release.copy(palm);
  const fill = new T.PointLight('#ffd5b3', 3, 4, 2);
  fill.position.copy(CHARACTER).add(new T.Vector3(-.8, 1.75, .65));
  set.add(fill);
  const held = Number(params.get('aoiTime'));
  const freeze = params.has('aoiTime') && Number.isFinite(held);
  const view = params.get('aoiView');
  const caption = document.createElement('div');
  caption.textContent = 'あの日の霧を借りて、もう一度この種をまきます。';
  caption.lang = 'ja';
  caption.style.cssText = 'position:fixed;left:44px;bottom:44px;z-index:4;padding:14px 20px;border-radius:10px;background:#f9f8f0e6;color:#2f3d36;font:600 22px/1.5 system-ui';
  caption.style.pointerEvents = 'none';
  document.body.append(caption);
  controls.enabled = false;
  camera.fov = 53;
  camera.updateProjectionMatrix();
  let started: number | undefined;
  const frame = (now: number, darkness: number) => {
    if (energy.getDiagnostics().farm.opacity < .999) {
      set.visible = false;
      caption.hidden = true;
      started = undefined;
      return;
    }
    set.visible = true;
    started ??= now;
    const t = freeze ? held : now - started;
    const pose = aoiPose(t);
    const { push, seeds: fall, pane: lit, mist: vapor } = pose;
    setPose(pose);
    pane.visible = lit > 0;
    pane.material.opacity = .95 * lit;
    mist.forEach((sprite, index) => {
      const u = index / mist.length;
      const height = index < 3 ? PANE_Y - 3.6 - 6.6 * index : BED.y + .35 + (index % 3) * .7 - .21 * Math.sin(u * 13 + t * .9);
      const fromBed = (height - BED.y) / (PANE_Y - BED.y);
      sprite.position.set(
        T.MathUtils.lerp(BED.x, -185.97, fromBed) + Math.sin(u * 34 + t * .42) * .49,
        height,
        T.MathUtils.lerp(BED.z, 403.05, fromBed) + Math.cos(u * 25 + t * .27) * .43,
      );
      sprite.material.opacity = index < 3 ? .38 * vapor : .31 * T.MathUtils.smoothstep(vapor, .23, 1);
      sprite.visible = vapor > 0;
    });
    seeds.forEach((seed, i) => {
      const drop = fall;
      if (drop === 0) seed.position.copy(palm);
      else {
        seed.position.lerpVectors(release, landing, drop);
        seed.position.y = T.MathUtils.lerp(release.y, landing.y, drop * drop);
      }
      seed.position.x += (i - 2) * (.018 + .022 * drop);
      seed.visible = t >= 3.9 && drop < .99;
    });
    fill.intensity = .2 + 5 * darkness;
    caption.hidden = params.has('aoiNoCaption') || t < 3.5 || t > 9.4;
    if (view === 'entry' || (view !== 'hands' && view !== 'canopy' && t < 2.8)) {
      camera.position.copy(ENTRY);
      controls.target.copy(ENTRY_TARGET);
    } else if (view === 'canopy' || (t >= 8.6 && view !== 'hands')) {
      camera.position.copy(BED_VIEW);
      controls.target.copy(BED_TARGET);
    } else {
      camera.position.lerpVectors(MEDIUM, CLOSE, push);
      controls.target.copy(GESTURE);
    }
    camera.lookAt(controls.target);
  };
  return { effects, frame };
}
