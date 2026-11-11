// DEV-only prototype (`?meters=nw:2&shot=nw:resident`): 湊's counter closes beside the NW hub's +1 lobby. Added to the hub stage at runtime, never built otherwise.
import * as T from 'three';
import { quadFleet, white } from './automationKit.ts';
import { MINATO_LOOP, minatoPose } from './minatoTimeline.ts';

const mat = (color: string, emissive = '#000000') => new T.MeshStandardMaterial({ color, emissive, roughness: .7 });
const part = (parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) => {
  const mesh = new T.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
};
const cube = (w: number, h: number, d: number) => new T.BoxGeometry(w, h, d);

/** Returns the per-frame callback for main's `devFrame`; `window.cityMinatoT = s` freezes the action at s seconds (frame capture). */
export function startMinato(scene: T.Scene) {
  const stage = scene.getObjectByName('hub-stage'), high = scene.getObjectByName('hub-state-high');
  if (!stage || !high) throw new Error('?shot=nw:resident needs the NW hub (meters=nw:2)');
  // Stage units are 3 m (site scale 3): scale the puppet space by 1/3 so everything is in metres. Floor = plinth top (1.2).
  const rig = new T.Group();
  rig.position.set(-3.4, 1.2, 4);
  rig.scale.setScalar(1 / 3);
  stage.add(rig);

  const lamp = mat('#f6d9a8', '#ffb45a');
  const uniform = mat('#2b3a55'), skin = mat('#e8cdb0'), capMat = mat('#16233a');
  // Booth: counter, two posts, header, lit back panel, shutter panel.
  part(rig, cube(1.6, 1, .5), white, 0, .5, .5);
  for (const x of [-.8, .8]) part(rig, cube(.1, 1.3, .1), white, x, 1.65, .5);
  part(rig, cube(1.8, .15, .7), white, 0, 2.3, .5);
  part(rig, cube(1.5, 1.2, .05), lamp, 0, 1.6, -.75);
  const shutter = part(rig, cube(1.5, 1.2, .06), mat('#c9d4de'), 0, 2.98, .9);
  const light = new T.PointLight('#ffb45a', 0, 6, 1.5);
  light.position.set(0, 1.6, -.3);
  rig.add(light);

  // Minato: head, cap (dome + brim), torso, two arms (the left holds the tablet), two legs.
  const man = new T.Group();
  rig.add(man);
  part(man, new T.SphereGeometry(.12, 12, 8), skin, 0, 1.62, 0);
  part(man, new T.SphereGeometry(.13, 12, 6, 0, Math.PI * 2, 0, Math.PI * .5), capMat, 0, 1.66, 0);
  part(man, cube(.2, .02, .14), capMat, 0, 1.67, .12);
  part(man, new T.CapsuleGeometry(.17, .5, 3, 8), uniform, 0, 1.15, 0);
  const limb = (x: number, y: number, r: number, len: number, material: T.Material) => {
    const pivot = new T.Group();
    pivot.position.set(x, y, 0);
    part(pivot, new T.CapsuleGeometry(r, len, 3, 6), material, 0, -len / 2 - r, 0);
    man.add(pivot);
    return pivot;
  };
  const armR = limb(.25, 1.42, .05, .5, uniform), armL = limb(-.25, 1.42, .05, .5, uniform);
  part(armL, cube(.2, .02, .27), mat('#10151c', '#4fb8ff'), 0, -.62, .1);
  const legR = limb(.09, .88, .07, .6, mat('#1f2a3a')), legL = limb(-.09, .88, .07, .6, mat('#1f2a3a'));

  // One delivery drone: the hub's own quad mesh, 1.5 m across.
  const drone = quadFleet(rig, 1, 'minato-drone'), pose = new T.Object3D();
  pose.scale.setScalar(1.5 / 5.6);
  let frozen: number | null = null;
  Object.assign(window, { cityMinatoT: (seconds: number | null) => { frozen = seconds; } });

  return (now: number) => {
    const shown = high.visible && high.scale.y > .999;
    rig.visible = shown;
    drone.show(shown);
    if (!shown) return;
    const p = minatoPose(frozen ?? now % MINATO_LOOP);
    man.position.set(p.x, 0, p.z);
    man.rotation.y = p.yaw;
    const swing = p.moving ? Math.sin(p.gait) * .5 : 0;
    legR.rotation.x = swing; legL.rotation.x = -swing;
    armR.rotation.x = -2.6 * p.reach + (p.moving ? -swing * .6 : 0);
    armL.rotation.x = -1.1 * p.tablet;
    shutter.position.y = T.MathUtils.lerp(2.98, 1.6, p.shutter);
    light.intensity = p.light * 6;
    lamp.emissiveIntensity = .2 + p.light * .8;
    pose.position.set(T.MathUtils.lerp(-6, 6, T.MathUtils.clamp(p.drone, 0, 1)), 3.2, -1.5);
    pose.rotation.y = Math.PI / 2;
    if (p.drone < 0 || p.drone > 1) pose.position.y = -50;
    drone.set(0, pose);
    drone.flush();
  };
}
