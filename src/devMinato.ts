// DEV-only (`?meters=nw:2&shot=nw:resident`, `?residentDemo`): 湊 at his service kiosk beside the NW hub, in every hub state. Added to the hub stage at runtime, never built otherwise.
// Scale rule: the hub's crowd is x1.0 in +1, x1.6 in 0 and x2.6 in -1; Minato, the kiosk and the whole set scale with it, and so does the camera offset.
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { quadFleet } from './automationKit.ts';
import { changeSites } from './layout.ts';
import { MINATO_LOOP, minatoPose } from './minatoTimeline.ts';
import { pedestrians } from './mobility.ts';
import { CITY_KIT_ID, instanceProps, loadPropKit } from './siteAssets/propKit.ts';
import { SiteAssetLoaderCache } from './siteAssets/assetLoader.ts';

export const RESIDENT_FOV = 52;
export type Band = 'low' | 'mixed' | 'high';
export const FACTOR: Record<Band, number> = { low: 2.6, mixed: 1.6, high: 1 }; // the hub crowd's size per state (FOLK in siteBuilders/automationHub.ts)
/** Kiosk position on the hub stage (stage units, +z = the camera-facing front) per state. Shifted from the survey spot (1.2, 4.35): the scaled kiosk must stay on the plinth and clear of the -1 tree. */
export const KIOSK_BY: Record<Band, readonly [number, number]> = { low: [.6, 4.15], mixed: [1.2, 4.1], high: [1.2, 4.15] };
export const KIOSK = KIOSK_BY.high;
const PLINTH: Record<Band, { x: readonly [number, number]; z: number }> = { low: { x: [-12, 12], z: 7 }, mixed: { x: [-4.8, 4.8], z: 4.7 }, high: { x: [-4.8, 4.8], z: 4.7 } };
/** The resident camera in kiosk space at x1.0 (metres: x right, y up, z out of the opening); multiplied by the state's factor. */
export const CAM_REL = { position: [2.7, 1.5, 5.2], target: [.1, 1.15, .3] } as const;
/** World camera pose: the stage is turned a quarter, so stage (x, z) -> world (z, -x), scaled by the site (3). `scale` multiplies the camera offset. */
export function residentPose(kiosk: readonly [number, number] = KIOSK, rel: { position: readonly number[]; target: readonly number[] } = CAM_REL, scale = 1) {
  const site = changeSites.nw, base = [site.x + site.scale * kiosk[1], 1.2 * site.scale, site.z - site.scale * kiosk[0]];
  const at = (p: readonly number[]) => [base[0] + p[2] * scale, base[1] + p[1] * scale, base[2] - p[0] * scale] as [number, number, number];
  return { position: at(rel.position), target: at(rel.target) };
}

const MINATO_URL = new URL('../asset/models/resident-minato/minato.glb', import.meta.url).href;
const KIOSK_URL = new URL('../asset/models/resident-kiosk/kiosk.glb', import.meta.url).href;
/** Rigid-part nodes of minato.glb (build_minato.py); three.js drops the dots from node names. */
const NODES = ['hips', 'torso', 'head', 'upperArm.L', 'upperArm.R', 'lowerArm.L', 'lowerArm.R', 'hand.L', 'hand.R', 'upperLeg.L', 'upperLeg.R', 'lowerLeg.L', 'lowerLeg.R'] as const;
const KIOSK_NODES = ['shutter', 'glass_room', 'arm_base', 'arm_upper', 'arm_fore', 'arm_grip'] as const;
const mat = (color: string, emissive = '#000000', roughness = .8) => new T.MeshStandardMaterial({ color, emissive, roughness });
const HIDDEN = 1e-3;

/** Flat ribbon (0.06 m wide) along a curve on the floor. */
function ribbon(points: readonly [number, number][], width: number, y: number) {
  const curve = new T.CatmullRomCurve3(points.map(([x, z]) => new T.Vector3(x, y, z))), samples = curve.getPoints(80), pos: number[] = [], index: number[] = [];
  samples.forEach((p, i) => {
    const d = (samples[Math.min(i + 1, samples.length - 1)].clone().sub(samples[Math.max(i - 1, 0)])).normalize(), side = new T.Vector3(-d.z, 0, d.x).multiplyScalar(width / 2);
    pos.push(p.x - side.x, y, p.z - side.z, p.x + side.x, y, p.z + side.z);
    if (i) index.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
  });
  const geometry = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(pos, 3)).setIndex(index);
  geometry.computeVertexNormals(); // the AO pre-pass needs normals (without them the strip renders black)
  return geometry;
}

/** Builds the kiosk set and Minato on the NW hub stage. `settled()`: the state is fully up; `show(on, t)` poses the action at t seconds. */
export function createMinato(scene: T.Scene, kioskOverride?: readonly [number, number], anyState = false) {
  const stage = scene.getObjectByName('hub-stage'), groups = { low: scene.getObjectByName('hub-state-low'), mixed: scene.getObjectByName('hub-state-mixed'), high: scene.getObjectByName('hub-state-high') };
  if (!stage || !groups.high || !groups.mixed || !groups.low) throw new Error('?shot=nw:resident needs the NW hub (meters=nw:2)');
  const rig = new T.Group(); // stage space, turned to the kiosk: x across, y up, z out of the opening, in metres x the state's factor
  stage.add(rig);
  const assets = new SiteAssetLoaderCache();
  let band: Band | null = null;

  // ---- ground: pale slabs with fine dark joints, clipped to the plinth; a cool-blue inlaid line curving round the kiosk front
  const slabs = new T.Group(), slabMat = mat('#b9c3d0', '#000000', .9), jointMat = mat('#6d7888'), lineMat = new T.MeshBasicMaterial({ color: '#8fdcff', side: T.DoubleSide });
  rig.add(slabs);
  const ground = (b: Band) => {
    slabs.clear();
    const f = FACTOR[b], k = KIOSK_BY[b], P = PLINTH[b], x0 = Math.max((P.x[0] - k[0]) * 3 / f, -14), x1 = Math.min((P.x[1] - k[0]) * 3 / f, 14), z0 = -2.2, z1 = (P.z - k[1]) * 3 / f - .02;
    const base = new T.Mesh(new T.BoxGeometry(x1 - x0, .02, z1 - z0), slabMat);
    base.position.set((x0 + x1) / 2, .03, (z0 + z1) / 2);
    base.receiveShadow = true;
    const lines: T.BufferGeometry[] = [];
    for (let x = Math.ceil(x0 / 1.8) * 1.8; x < x1; x += 1.8) lines.push(new T.BoxGeometry(.07, .012, z1 - z0).translate(x, .042, (z0 + z1) / 2));
    for (let z = Math.ceil(z0 / 1.8) * 1.8; z < z1; z += 1.8) lines.push(new T.BoxGeometry(x1 - x0, .012, .07).translate((x0 + x1) / 2, .042, z));
    slabs.add(base, new T.Mesh(mergeGeometries(lines.map(g => g.toNonIndexed()))!, jointMat));
    // The blue line runs in from the left, curves round the front of the kiosk and leaves to the right, kept on the slabs.
    const zl = Math.min(z1 - .06, 1.55);
    const pts: [number, number][] = [[x0 + .05, zl - .05], [-3.5, zl], [0, zl + .02], [3.4, zl - .1], [x1 - .6, zl - .9], [x1 - .05, -1.2]].filter(([x]) => x >= x0 && x <= x1) as [number, number][];
    slabs.add(new T.Mesh(ribbon(pts, .09, .05), lineMat));
  };

  // ---- the kiosk (GLB) and its parts
  const kioskRoot = new T.Group();
  rig.add(kioskRoot);
  const knodes: Partial<Record<(typeof KIOSK_NODES)[number], T.Object3D>> = {};
  let kioskLoaded = false;
  new GLTFLoader().loadAsync(KIOSK_URL).then(gltf => {
    for (const name of KIOSK_NODES) { const o = gltf.scene.getObjectByName(name); if (!o) throw new Error(`kiosk.glb has no node ${name}`); knodes[name] = o; }
    gltf.scene.traverse(o => { if (o instanceof T.Mesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
    kioskRoot.add(gltf.scene);
    kioskLoaded = true;
    if (band) configure(band, true);
  }).catch(error => console.warn('kiosk.glb did not load', error));
  const light = new T.PointLight('#ffb45a', 0, 7, 1.5); // the warm interior light that fades when the shutter closes
  light.position.set(0, 1.7, -.2);
  rig.add(light);
  const fill = new T.PointLight('#fff0e0', 3.2, 3.6, 1.4); // a low fill so his face reads when he stands in the lit kiosk
  fill.position.set(.3, 1.85, 1.3);
  rig.add(fill);

  // ---- set dressing from the prop kit (bench, planter) and a slim wayfinding post with an emissive screen (no text)
  const dressing = new T.Group();
  rig.add(dressing);
  const post = new T.Group();
  const postBody = new T.Mesh(new T.BoxGeometry(.3, 1.9, .2), mat('#dfe5ec', '#000000', .6)), screen = new T.Mesh(new T.BoxGeometry(.22, .3, .02), new T.MeshBasicMaterial({ color: '#d9f6ff' }));
  postBody.position.y = .95;
  screen.position.set(0, 1.45, -.11);
  post.add(postBody, screen);
  post.add(new T.Mesh(new T.BoxGeometry(.18, .12, .02), new T.MeshBasicMaterial({ color: '#7e8794' })).translateY(1.1).translateZ(-.11));
  rig.add(post);
  loadPropKit(assets).then(kit => {
    dressing.add(instanceProps(kit, [{ name: 'bench', position: [0, 0, 0] }, { name: 'planter_1m', position: [1.4, 0, -.2] }], 1));
    dressing.children.forEach(c => c.position.y = .04);
  }).catch(error => console.warn(`${CITY_KIT_ID} did not load`, error));

  // ---- people from the hub's own figure builder (queue of five in -1, one visitor in 0, a staff member inside in -1)
  const crowd = pedestrians(rig, 8, 'minato-set-people');
  const figure = new T.Object3D();
  const placeFigures = (b: Band) => {
    const list: [number, number, number][] = b === 'low' ? [[0, 1.9, Math.PI], [-1.15, 1.9, Math.PI / 2], [-2.1, 1.9, Math.PI / 2], [-3.05, 1.9, Math.PI / 2], [-4.0, 1.9, Math.PI / 2], [2.0, .1, 0]] : b === 'mixed' ? [[-.15, 1.9, Math.PI - .15]] : [];
    for (let i = 0; i < 8; i++) {
      const p = list[i];
      figure.position.set(p?.[0] ?? 0, .04, p?.[1] ?? 0);
      figure.rotation.set(0, p?.[2] ?? 0, 0);
      figure.scale.setScalar(p ? 1 : HIDDEN);
      crowd.set(i, figure); crowd.gait(i, 0, 0); crowd.social(i, 0, 0);
    }
    crowd.show(list.length > 0);
    crowd.flush();
  };

  // ---- Minato
  const man = new T.Group(), bones: Partial<Record<(typeof NODES)[number], T.Object3D>> = {};
  man.position.y = .04;
  rig.add(man);
  let loaded = false;
  new GLTFLoader().loadAsync(MINATO_URL).then(gltf => {
    for (const name of NODES) {
      const node = gltf.scene.getObjectByName(name.replace('.', ''));
      if (!node) throw new Error(`minato.glb has no node ${name}`);
      bones[name] = node;
    }
    gltf.scene.traverse(o => {
      if (!(o instanceof T.Mesh)) return;
      o.castShadow = true; o.frustumCulled = false;
      const m = o.material as T.MeshStandardMaterial; // carrier-only: this load's materials, lifted a little so the face reads indoors
      if (m.name === 'res_skin') { m.emissive = new T.Color('#ffd2a8'); m.emissiveIntensity = .38; }
      if (m.name === 'res_navy') { m.emissive = new T.Color('#16224a'); m.emissiveIntensity = .3; }
    });
    man.add(gltf.scene);
    loaded = true;
  }).catch(error => console.warn('minato.glb did not load', error));
  const parcel = new T.Mesh(new T.BoxGeometry(.2, .15, .16), mat('#c9a56a'));
  parcel.visible = false;
  rig.add(parcel);

  // ---- one delivery drone (+1 only): the hub's own quad mesh, 1.5 m across
  const drone = quadFleet(rig, 1, 'minato-drone'), pose = new T.Object3D();
  pose.scale.setScalar(1.9 / 5.6);
  const tint = new T.Color('#3b4655'); // the shared white frame vanishes against the white drum wall: darken this one instance
  rig.traverse(o => { if (o instanceof T.InstancedMesh && o.name === 'minato-drone') o.setColorAt(0, tint); });

  const configure = (b: Band, force = false) => {
    if (b === band && !force) return;
    band = b;
    const f = FACTOR[b], k = kioskOverride ?? KIOSK_BY[b];
    rig.position.set(k[0], 1.2, k[1]);
    rig.scale.setScalar(f / 3);
    ground(b);
    const side = b === 'low' ? 1.55 : 0; // the -1 glass room pushes the dressing to the right
    dressing.position.set(3.0 + side, 0, .6);
    dressing.rotation.y = -.55;
    post.position.set(5.5 + side, .04, -.2);
    if (kioskLoaded) {
      knodes.glass_room!.visible = b === 'low';
      for (const n of ['arm_base'] as const) knodes[n]!.visible = b === 'mixed';
    }
    placeFigures(b);
    hubPeople.length = 0; // the hub's own crowd stands exactly where the queue and the kiosk go in -1 and 0: hidden each frame for the DEV shot (it stays in +1)
    scene.traverse(o => { if (o.name === 'hub-service-people') hubPeople.push(o); });
  };
  const hubPeople: T.Object3D[] = [];
  const detect = (): Band => groups.low!.visible ? 'low' : groups.mixed!.visible ? 'mixed' : 'high';

  const edge = new T.Vector3(), handA = new T.Vector3(), handB = new T.Vector3();
  const standingHeight = (camera: T.PerspectiveCamera) => {
    const top = man.localToWorld(edge.set(0, 1.72, 0)).project(camera).y, bottom = man.localToWorld(edge.set(0, 0, 0)).project(camera).y;
    return (top - bottom) / 2;
  };
  /** Screen y in CSS pixels of the point `y` metres above Minato's feet (debug measurement). */
  const screenY = (camera: T.PerspectiveCamera, y: number) => (1 - man.localToWorld(edge.set(0, y, 0)).project(camera).y) / 2 * innerHeight;

  return {
    standingHeight, screenY, detect,
    get band() { return band; },
    settled: () => anyState || (groups.high!.visible && groups.high!.scale.y > .999), // the shot shows the kiosk in every hub state; the live demo only in +1
    show(on: boolean, time: number) {
      rig.visible = on;
      drone.show(on && band === 'high');
      if (!on) return;
      const b = anyState ? detect() : 'high';
      configure(b);
      if (b !== 'high') for (const o of hubPeople) o.visible = false;
      if (!loaded || !kioskLoaded) return;
      const bn = bones as Record<(typeof NODES)[number], T.Object3D>, kn = knodes as Record<(typeof KIOSK_NODES)[number], T.Object3D>;
      let shutter = 0, lightLevel = 1;
      for (const n of NODES) bn[n].rotation.set(0, 0, 0);
      for (const n of ['arm_upper', 'arm_fore', 'arm_grip'] as const) kn[n].rotation.set(0, 0, 0);
      bn['upperArm.L'].rotation.x = -.3; bn['lowerArm.L'].rotation.x = -1.35; bn['hand.L'].rotation.x = -.25; // the tablet is always held up
      parcel.visible = false;
      if (b === 'high') {
        const p = minatoPose(time);
        man.position.set(p.x, .04, p.z);
        man.rotation.y = p.yaw;
        const swing = p.moving ? Math.sin(p.gait) * .5 : 0, knee = (phase: number) => p.moving ? Math.max(0, phase) * .8 : 0;
        bn['upperLeg.R'].rotation.x = swing; bn['upperLeg.L'].rotation.x = -swing;
        bn['lowerLeg.R'].rotation.x = knee(-Math.cos(p.gait)); bn['lowerLeg.L'].rotation.x = knee(Math.cos(p.gait));
        bn.torso.rotation.y = p.look; bn.head.rotation.y = p.look * .35;
        bn['upperArm.R'].rotation.z = -2.5 * p.reach; // pulls the shutter overhead with the arm he has free, sideways toward the kiosk
        bn['upperArm.R'].rotation.x = p.moving ? -swing * .6 : 0;
        shutter = p.shutter; lightLevel = p.light;
        pose.position.set(T.MathUtils.lerp(-3.2, 3.2, T.MathUtils.clamp(p.drone, 0, 1)), 3.6, -2.5);
        pose.rotation.y = Math.PI / 2;
        if (p.drone < 0 || p.drone > 1) pose.position.y = -50;
        drone.set(0, pose);
        drone.flush();
      } else {
        const t = time % 5;
        man.position.set(0, .04, -.1);
        if (b === 'low') { // one bow toward the first person in the queue
          man.rotation.y = 0;
          const bow = T.MathUtils.smoothstep(t, .8, 1.8) * (1 - T.MathUtils.smoothstep(t, 3.0, 4.2));
          bn.torso.rotation.x = .55 * bow; bn.head.rotation.x = .2 * bow;
        } else { // hands a small parcel to the robot arm, which swings it away
          man.rotation.y = .75;
          const take = T.MathUtils.smoothstep(t, 1.3, 2.3), away = T.MathUtils.smoothstep(t, 2.6, 4.0), back = T.MathUtils.smoothstep(t, 4.2, 4.9);
          const hold = T.MathUtils.smoothstep(t, .3, 1.1) * (1 - T.MathUtils.smoothstep(t, 2.4, 3.0)); // the free arm offers the parcel
          bn['upperArm.R'].rotation.x = -.85 * hold; bn['lowerArm.R'].rotation.x = -.9 * hold;
          kn.arm_upper.rotation.z = .85 * take - 1.25 * away * (1 - back) + 0 * back;
          kn.arm_fore.rotation.z = .55 * take - .6 * away * (1 - back);
          man.updateMatrixWorld(true); kn.arm_grip.updateMatrixWorld(true);
          kn.arm_grip.getWorldPosition(handA); rig.worldToLocal(handA);
          handB.set(.18, 1.05, .45).applyMatrix4(man.matrix); // between his hands, in front of his chest
          if (t < 4.2) { parcel.visible = true; parcel.position.copy(handB).lerp(handA, take); }
        }
      }
      kn.shutter.scale.y = Math.max(.001, shutter);
      kn.shutter.visible = shutter > .004;
      light.intensity = lightLevel * 6;
    },
  };
}

/** `?shot=nw:resident`: returns the per-frame callback for main's `devFrame`; `window.cityMinatoT = s` freezes the action at s seconds (frame capture). */
export function startMinato(scene: T.Scene, camera: T.PerspectiveCamera, at: T.Vector3, setPose: (position: number[], target: number[]) => void, override?: { kiosk?: [number, number]; cam?: { position: number[]; target: number[] } }) {
  const minato = createMinato(scene, override?.kiosk, true);
  let frozen: number | null = null, posed: Band | null = null;
  Object.assign(window, { cityMinatoT: (seconds: number | null) => { frozen = seconds; }, cityMinatoFigure: () => minato.standingHeight(camera), cityMinatoScreenY: (y: number) => minato.screenY(camera, y) });
  // The pose's narrow lens applies only while the camera sits on this DEV pose (a shot button or a live change moves it away).
  const fov = camera.fov;
  return (now: number) => {
    const b = minato.detect();
    if (b !== posed) { // the camera offset scales with the state's crowd factor, so the framing is the same in -1, 0 and +1
      posed = b;
      const pose = residentPose(override?.kiosk ?? KIOSK_BY[b], override?.cam ?? CAM_REL, FACTOR[b]);
      setPose(pose.position, pose.target);
      at.set(...pose.position);
    }
    const here = camera.position.distanceTo(at) < .05;
    if (camera.fov !== (here ? RESIDENT_FOV : fov)) { camera.fov = here ? RESIDENT_FOV : fov; camera.updateProjectionMatrix(); }
    minato.show(here, frozen ?? now % MINATO_LOOP);
  };
}
