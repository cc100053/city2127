// DEV-only prototype (`?meters=nw:2&shot=nw:resident`): 湊's counter closes beside the NW hub's +1 lobby. Added to the hub stage at runtime, never built otherwise.
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { quadFleet, white } from './automationKit.ts';
import { changeSites } from './layout.ts';
import { MINATO_LOOP, minatoPose } from './minatoTimeline.ts';

const mat = (color: string, emissive = '#000000') => new T.MeshStandardMaterial({ color, emissive, roughness: .7 });
const part = (parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) => {
  const mesh = new T.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
};
export const RESIDENT_FOV = 52;
/** Kiosk position on the hub stage (stage units, +z = the camera-facing front) and the resident camera relative to it (metres in kiosk space: x across, y up, z out of the opening). */
export const KIOSK: readonly [number, number] = [1.2, 4.35]; // chosen from the pose survey: clear of the -1, 0 and +1 trees, benches, terminals and seated people
export const CAM_REL = { position: [2.2, 1.5, 4.2], target: [-.4, 1.5, .4] } as const; // front-right: keeps the -1 crowd group out of the foreground
/** World camera pose for a kiosk position: the stage is turned a quarter, so stage (x, z) -> world (z, -x), scaled by the site (3). */
export function residentPose(kiosk: readonly [number, number] = KIOSK, rel: { position: readonly number[]; target: readonly number[] } = CAM_REL) {
  const site = changeSites.nw, base = [site.x + site.scale * kiosk[1], 1.2 * site.scale, site.z - site.scale * kiosk[0]];
  const at = (p: readonly number[]) => [base[0] + p[2], base[1] + p[1], base[2] - p[0]] as [number, number, number];
  return { position: at(rel.position), target: at(rel.target) };
}
const MINATO_URL = new URL('../asset/models/resident-minato/minato.glb', import.meta.url).href;
/** Rigid-part nodes of minato.glb (build_minato.py); three.js drops the dots from node names. */
const NODES = ['hips', 'torso', 'head', 'upperArm.L', 'upperArm.R', 'lowerArm.L', 'lowerArm.R', 'hand.L', 'hand.R', 'upperLeg.L', 'upperLeg.R', 'lowerLeg.L', 'lowerLeg.R'] as const;
const cube = (w: number, h: number, d: number) => new T.BoxGeometry(w, h, d);

/** Builds the booth and puppet on the NW hub stage. `settled()`: the +1 state is fully up; `show(on, t)` poses the action at t seconds. */
export function createMinato(scene: T.Scene, kiosk: readonly [number, number] = KIOSK, anyState = false) {
  const stage = scene.getObjectByName('hub-stage'), high = scene.getObjectByName('hub-state-high');
  if (!stage || !high) throw new Error('?shot=nw:resident needs the NW hub (meters=nw:2)');
  // Stage units are 3 m (site scale 3): scale the puppet space by 1/3 so everything is in metres. Floor = plinth top (1.2).
  const rig = new T.Group();
  rig.position.set(kiosk[0], 1.2, kiosk[1]);
  rig.scale.setScalar(1 / 3);
  stage.add(rig);

  const lamp = mat('#f6d9a8', '#ffb45a');
  const uniform = mat('#2b3a55'), skin = mat('#e8cdb0'), capMat = mat('#16233a');
  // Ground: a darker paving patch with joint lines, so the white plinth reads in day (DEV-only meshes, shared materials untouched).
  const paving = mat('#7d8896'), joint = mat('#56616e');
  part(rig, cube(8, .02, 4.6), paving, -.5, .03, -1.3); // front edge 1 m from the kiosk: the plinth ends there
  for (let k = -3; k <= 3; k++) part(rig, cube(.05, .025, 4.6), joint, -.5 + k * 1.1, .035, -1.3);
  for (let k = -2; k <= 2; k++) part(rig, cube(8, .025, .05), joint, -.5, .035, -1.3 + k * 1.1);
  // Booth: counter, two posts, shutter housing (header), lit back panel, shutter panel that rolls down out of the housing.
  part(rig, cube(1.6, 1, .5), white, 0, .5, .5);
  for (const x of [-.8, .8]) part(rig, cube(.1, 1.2, .1), white, x, 1.6, .5);
  part(rig, cube(1.9, .45, .8), white, 0, 2.425, .5);
  part(rig, cube(1.5, 1.2, .05), lamp, 0, 1.6, -.75);
  const shutter = part(rig, cube(1.5, 1.2, .06), mat('#c9d4de'), 0, 1.6, .5);
  const light = new T.PointLight('#ffb45a', 0, 6, 1.5);
  light.position.set(0, 1.6, -.3);
  rig.add(light);

  // Minato: legs below the hip; torso, arms and head (cap dome + brim) on `upper`, which twists at the hip for the look back.
  const man = new T.Group(), upper = new T.Group(), head = new T.Group();
  upper.position.y = .9;
  head.position.y = 1.64 - .9;
  rig.add(man);
  man.add(upper);
  upper.add(head);
  part(head, new T.SphereGeometry(.12, 12, 8), skin, 0, -.02, 0);
  part(head, new T.SphereGeometry(.13, 12, 6, 0, Math.PI * 2, 0, Math.PI * .5), capMat, 0, .02, 0);
  part(head, cube(.2, .02, .14), capMat, 0, .03, .12);
  part(upper, new T.CapsuleGeometry(.17, .5, 3, 8), uniform, 0, .25, 0);
  const limb = (x: number, y: number, r: number, len: number, material: T.Material, parent: T.Object3D = man) => {
    const pivot = new T.Group();
    pivot.position.set(x, y, 0);
    part(pivot, new T.CapsuleGeometry(r, len, 3, 6), material, 0, -len / 2 - r, 0);
    parent.add(pivot);
    return pivot;
  };
  const armR = limb(.25, .52, .05, .5, uniform, upper), armL = limb(-.25, .52, .05, .5, uniform, upper);
  part(armL, cube(.2, .02, .27), mat('#10151c', '#4fb8ff'), 0, -.62, .1);
  const legR = limb(.09, .88, .07, .6, mat('#1f2a3a')), legL = limb(-.09, .88, .07, .6, mat('#1f2a3a'));

  // The Blender character (asset/models/resident-minato) replaces the capsule puppet once it has loaded; until then, or if it fails, the puppet stays.
  // He steps out to +x of the booth, so the tablet arm (.L, +x) is the one away from it and .R (-x) reaches for the shutter.
  const mirror = new T.Group();
  mirror.position.y = .04; // on the paving patch
  man.add(mirror);
  const bones: Partial<Record<(typeof NODES)[number], T.Object3D>> = {};
  let loaded = false;
  new GLTFLoader().loadAsync(MINATO_URL).then(gltf => {
    for (const name of NODES) {
      const node = gltf.scene.getObjectByName(name.replace('.', ''));
      if (!node) throw new Error(`minato.glb has no node ${name}`);
      bones[name] = node;
    }
    gltf.scene.traverse(o => { if (o instanceof T.Mesh) { o.castShadow = true; o.frustumCulled = false; } });
    mirror.add(gltf.scene);
    for (const o of [upper, legR, legL]) o.visible = false;
    loaded = true;
  }).catch(error => console.warn('minato.glb did not load; keeping the capsule puppet', error));

  // One delivery drone: the hub's own quad mesh, 1.5 m across.
  const drone = quadFleet(rig, 1, 'minato-drone'), pose = new T.Object3D();
  pose.scale.setScalar(1.9 / 5.6);
  const tint = new T.Color('#3b4655'); // the shared white frame vanishes against the white drum wall: darken this one instance
  rig.traverse(o => { if (o instanceof T.InstancedMesh && o.name === 'minato-drone') o.setColorAt(0, tint); });
  const edge = new T.Vector3();
  const standingHeight = (camera: T.PerspectiveCamera) => { // standing height as a fraction of the frame height
    const top = man.localToWorld(edge.set(0, 1.72, 0)).project(camera).y, bottom = man.localToWorld(edge.set(0, 0, 0)).project(camera).y;
    return (top - bottom) / 2;
  };

  /** Screen y in CSS pixels of the point `y` metres above Minato's feet (debug measurement). */
  const screenY = (camera: T.PerspectiveCamera, y: number) => (1 - man.localToWorld(edge.set(0, y, 0)).project(camera).y) / 2 * innerHeight;
  return {
    standingHeight, screenY,
    settled: () => anyState || (high.visible && high.scale.y > .999), // the shot shows the kiosk in every hub state; the live demo only in +1
    show(on: boolean, time: number) {
    rig.visible = on;
    drone.show(on);
    if (!on) return;
    const p = minatoPose(time);
    man.position.set(p.x, 0, p.z);
    man.rotation.y = p.yaw;
    const swing = p.moving ? Math.sin(p.gait) * .5 : 0;
    if (loaded) {
      const b = bones as Record<(typeof NODES)[number], T.Object3D>;
      // All joint bends are rotations about x (negative = forward/up).
      const knee = (phase: number) => p.moving ? Math.max(0, phase) * .8 : 0;
      b['upperLeg.R'].rotation.x = swing; b['upperLeg.L'].rotation.x = -swing;
      b['lowerLeg.R'].rotation.x = knee(-Math.cos(p.gait)); b['lowerLeg.L'].rotation.x = knee(Math.cos(p.gait));
      b.torso.rotation.y = p.look;
      b.head.rotation.y = p.look * .35;
      b['upperArm.R'].rotation.x = -2.6 * p.reach + (p.moving ? -swing * .6 : 0);
      b['lowerArm.R'].rotation.x = -.3 * p.reach - (p.moving ? .25 : .05);
      // The tablet arm always holds the tablet up in front of the stomach (elbow about 90 deg), standing and walking.
      b['upperArm.L'].rotation.x = -.3;
      b['lowerArm.L'].rotation.x = -1.35;
      b['hand.L'].rotation.x = -.25;
    }
    legR.rotation.x = swing; legL.rotation.x = -swing;
    upper.rotation.y = p.look;
    head.rotation.y = p.look * .35;
    armR.rotation.x = -2.6 * p.reach + (p.moving ? -swing * .6 : 0);
    armL.rotation.x = -1.1 * p.tablet;
    shutter.visible = p.shutter > .01;
    shutter.scale.y = Math.max(.01, p.shutter);
    shutter.position.y = 2.2 - .6 * shutter.scale.y; // hangs from the housing's underside
    light.intensity = p.light * 6;
    lamp.emissiveIntensity = .2 + p.light * .8;
    pose.position.set(T.MathUtils.lerp(-3.2, 3.2, T.MathUtils.clamp(p.drone, 0, 1)), 3.6, -2.5);
    pose.rotation.y = Math.PI / 2;
    if (p.drone < 0 || p.drone > 1) pose.position.y = -50;
    drone.set(0, pose);
    drone.flush();
    },
  };
}

/** `?shot=nw:resident`: returns the per-frame callback for main's `devFrame`; `window.cityMinatoT = s` freezes the action at s seconds (frame capture). */
export function startMinato(scene: T.Scene, camera: T.PerspectiveCamera, at: T.Vector3, kiosk: readonly [number, number] = KIOSK) {
  const minato = createMinato(scene, kiosk, true);
  let frozen: number | null = null;
  Object.assign(window, { cityMinatoT: (seconds: number | null) => { frozen = seconds; }, cityMinatoFigure: () => minato.standingHeight(camera), cityMinatoScreenY: (y: number) => minato.screenY(camera, y) });
  // The pose's narrow lens applies only while the camera sits on this DEV pose (a shot button or a live change moves it away).
  const fov = camera.fov;
  return (now: number) => {
    const here = camera.position.distanceTo(at) < .05;
    if (camera.fov !== (here ? RESIDENT_FOV : fov)) { camera.fov = here ? RESIDENT_FOV : fov; camera.updateProjectionMatrix(); }
    minato.show(here && minato.settled(), frozen ?? now % MINATO_LOOP);
  };
}
