import * as T from 'three';
import { arc, bake, box, chrome, dark, glass, solar, stone, teal, trim, publicLight } from './cityRig.ts';

export const ENERGY_OPTIONS = {
  baseline: '基準 · 現行城市',
  a: 'A · 海と暮らす',
  b: 'B · 空とつながる',
  c: 'C · 陸地を増やす',
  mixed: 'M1 · 混合配置',
} as const;
export type EnergyOption = keyof typeof ENERGY_OPTIONS;
import type { EnergyConfiguration } from '../survey/src/shared/energy.ts';
export type { EnergyConfiguration } from '../survey/src/shared/energy.ts';

// A narrated storage cycle, not a power / fluid simulation. Time is absolute for reproducible captures.
export function energyCycle(seconds: number, reducedMotion = false) {
  const t = reducedMotion ? 50 : ((seconds % 60) + 60) % 60;
  const phase: 'charge' | 'hold' | 'release' = t < 20 ? 'charge' : t < 40 ? 'hold' : 'release';
  const level = t < 20 ? t / 20 : t < 40 ? 1 : 1 - (t - 40) / 20;
  // Integral of a gentle 0.02 → 0.08 → 0.02 rad/s cycle: no angle jump at the phase boundaries.
  const angle = t < 20 ? .02 * t + .0015 * t * t : t < 40 ? 1 + .08 * (t - 20) : 2.6 + .08 * (t - 40) - .0015 * (t - 40) ** 2;
  return { t, phase, level, angle: reducedMotion ? .7 : Math.floor(seconds / 60) * 3.6 + angle };
}

/** Shared authored geometry for DEV comparisons and the authoritative energy runtime. */
export function energyPrototype() {
  const root = new T.Group(); root.name = 'energy-prototype';
  const wing = new T.Group(), garden = new T.Group(), ring = new T.Group(), island = new T.Group();
  const distribution = new T.Group();
  const parts = { wing, garden, ring, island, distribution };
  for (const [name, group] of Object.entries(parts)) { group.name = `energy-${name}`; root.add(group); }
  const member = (parent: T.Group, a: number[], b: number[], width: number, material: T.Material = trim) => {
    const from = new T.Vector3(...a), to = new T.Vector3(...b), delta = to.clone().sub(from);
    const mesh = box(parent, [width, delta.length(), width], from.add(to).multiplyScalar(.5).toArray(), material);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  };

  // Offshore receiver: a bifurcating mast carries two folded collection surfaces, leaving open sea beneath.
  wing.position.set(125, 0, -424);
  arc(wing, 0, 5, 2, [0, -2, 0], stone);
  member(wing, [0, 0, 0], [0, 25, 0], 2.4);
  for (const side of [-1, 1]) {
    member(wing, [0, 16, 0], [side * 20, 34, 0], 1.4);
    const leaf = new T.Group(); leaf.position.set(side * 13, 31, 0); leaf.rotation.z = side * .22; wing.add(leaf);
    box(leaf, [25, 1.1, 20], [0, 0, 0], trim);
    for (let x = -10; x <= 10; x += 5) box(leaf, [4.4, .22, 18], [x, .7, 0], solar);
    member(leaf, [-12, -.8, -8], [12, -.8, 8], .6, dark);
  }
  // Submerged service trunk, rather than a visible fictional energy beam.
  member(wing, [0, -1.8, 0], [8, -1.8, 30], 1, dark);

  // One upper/lower reservoir pair, with separate gravity/turbine and pumped-return pipes.
  garden.position.set(-310, 0, -151);
  arc(garden, 0, 14, .4, [0, -1.5, 0], stone);
  arc(garden, 12.5, 14, 2.1, [0, -1.1, 0], trim);

  arc(garden, 11, 12, 1.5, [8, 21.8, 0], trim);
  arc(garden, 0, 11, .6, [8, 21.2, 0], stone);

  for (const z of [-8, 8]) {
    member(garden, [-8, 0, z], [1, 21.8, z], 1.1);
    member(garden, [11, 0, z], [16, 21.8, z], 1.1);
  }
  box(garden, [9, 5, 6], [-5, 3, -7], glass).name = 'energy-turbine-room';
  const turbineRotor = new T.Group(); turbineRotor.name = 'energy-turbine'; turbineRotor.position.set(-5, 3.5, -10.6); garden.add(turbineRotor);
  const turbine = new T.Mesh(new T.TorusGeometry(1.8, .4, 6, 20), chrome);
  turbineRotor.add(turbine);
  for (const angle of [0, Math.PI / 3, Math.PI * 2 / 3]) {
    const blade = box(turbineRotor, [.4, 3.6, .3], [0, 0, 0], dark); blade.rotation.z = angle;
  }
  for (const z of [-7.8, -6.2]) member(garden, [2, 23, z], [-5, 5.5, z], .35, trim);
  member(garden, [-5, .5, -7], [-5, 2, -7], 1.6, solar);
  // Return line closes the loop visibly; it is storage charged by an external supply.
  for (const z of [7.5, 8.5]) member(garden, [5, .5, z], [15, 23, z], .25, dark);
  member(garden, [15, 23, 8], [12, 23, 0], .9, dark);
  // Independent public spur meets the existing shore, outside the reservoir and its plant.
  const spur = new T.Group(); spur.position.set(0, 0, 34.75); spur.rotation.x = Math.atan2(.6, 34.5); garden.add(spur);
  box(spur, [4, .6, 34.5], [0, 0, 0], stone);
  for (const x of [-2, 2]) box(spur, [.15, 1.1, 34.5], [x, .85, 0], trim);
  box(garden, [7, .6, 7], [0, .3, 17.5], stone);

  // A supported wing over the service room carries local receiving equipment, separate from the public court.
  for (const x of [-9, -1]) member(garden, [x, 0, -6], [x, 10, -6], .5);
  const canopy = box(garden, [16, .6, 10], [-5, 10, -6], solar); canopy.rotation.z = -.16;
  for (const [a, b] of [[[2, 23, -7], [-5, 5.5, -7]], [[5, .5, 8], [15, 23, 8]]]) {
    const end = new T.Vector3(...b), direction = end.clone().sub(new T.Vector3(...a)).normalize();
    for (const side of [-1, 1]) {
      const tail = end.clone().addScaledVector(direction, -2); tail.x += side;
      member(garden, tail.toArray(), end.toArray(), .3, trim);
    }
  }

  // Bay-facing flywheel stands ahead of the occupied wings; fixed bearings hang from the transfer frame.
  ring.position.set(-18, 100, -24);
  const rotor = new T.Group(); rotor.name = 'energy-rotor'; ring.add(rotor);
  const wheel = new T.Mesh(new T.TorusGeometry(31, 1.2, 8, 96), dark); rotor.add(wheel);
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8;
    const block = box(rotor, [2.2, 1.5, 1.4], [31 * Math.cos(angle), 31 * Math.sin(angle), 0], chrome);
    block.rotation.z = angle;
  }
  box(rotor, [2.4, .7, .2], [31, 0, -.9], publicLight);
  for (const x of [-22, 22]) {
    member(ring, [x, 30, 12], [x, 22, 4], 1.1);
    box(ring, [3.6, 2, 3], [x, 22, 4], trim);
  }

  // Three reclaimed caissons read as new coastline. A clear-span service bridge preserves the existing shipping routes below.
  island.position.set(-60, 0, -470);
  for (const z of [-16, 0, 16]) {
    box(island, [40, 4, 15.5], [0, -.4, z], stone);
    box(island, [40.4, .8, 1], [0, 1.9, z - 7.8], trim);
  }
  for (const x of [-9, 9]) {
    arc(island, 0, 7, 12, [x, 1.6, -3], trim);
    const cap = new T.Mesh(new T.SphereGeometry(7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), trim);
    cap.position.set(x, 13.6, -3); island.add(cap);
    box(island, [12, 5, 10], [x, 4.1, 15], dark);
  }
  box(island, [32, 1, 8], [0, 2.1, -19], teal);
  const start = new T.Vector3(0, 18, 16), end = new T.Vector3(80, 18, 118), length = start.distanceTo(end);
  const bridge = new T.Group(); bridge.position.copy(start).add(end).multiplyScalar(.5); bridge.lookAt(end); island.add(bridge);
  box(bridge, [5, .8, length], [0, 0, 0], stone);
  for (const x of [-2.6, 2.6]) {
    box(bridge, [.5, .5, length], [x, 3.5, 0], trim);
    for (let z = -length / 2; z < length / 2; z += 12) member(bridge, [x, .4, z], [x, 3.5, Math.min(z + 12, length / 2)], .4);
  }
  for (const [x, z, base] of [[0, 16, 1.6], [80, 118, 0]]) {
    box(island, [3, 18 - base, 3], [x, (18 + base) / 2, z], glass);
    for (const dx of [-1.8, 1.8]) member(island, [x + dx, base, z], [x + dx, 18, z], .5);
  }

  // Two shore service gates carry distribution through a ring/wing chassis; public passage stays beneath.
  const distributionNodes: T.Group[] = [];
  for (const [x, z, scale] of [[-310, -151, 1], [30, -395, .72]]) {
    const node = new T.Group(); node.position.set(x, 0, z); node.scale.setScalar(scale); distribution.add(node); distributionNodes.push(node);
    const arch = new T.Mesh(new T.TorusGeometry(3.4, .3, 6, 32, Math.PI), publicLight);
    arch.position.set(0, 5, 46); node.add(arch);
    for (const side of [-1, 1]) {
      member(node, [side * 3.4, -1.8, 46], [side * 3.4, 5, 46], .5);
      box(node, [1.4, 2.6, 2], [side * 3.5, 1.3, 46], dark);
      const fin = box(node, [4, .35, 3], [side * 3, 5.5, 46], solar); fin.rotation.z = side * .2;
    }
    member(node, [3.4, 2.6, 35], [3.4, 2.6, 50], .3, trim);
    // Buried/submerged service conduit, with only the supported shore riser visible.
    member(node, [3.4, -1.8, 46], [3.4, 2.6, 46], .35, chrome);
  }

  // Bake stationary finishes once; moving water and machines keep independent transforms.
  rotor.removeFromParent(); turbineRotor.removeFromParent();
  for (const group of [...Object.values(parts), rotor, turbineRotor]) group.add(...bake(group));
  ring.add(rotor); garden.add(turbineRotor);
  const lowerWater = arc(garden, 0, 12.4, .2, [0, .1, 0], teal);
  const upperWater = arc(garden, 0, 10.7, .2, [8, 23, 0], teal);
  lowerWater.name = 'energy-lower-water'; upperWater.name = 'energy-upper-water';
  const garden2 = garden.clone(); garden2.name = 'energy-district-garden';
  garden2.position.set(30, 0, -395); garden2.scale.setScalar(.72); root.add(garden2);
  const gardens = [garden, garden2];
  // Short markers stay inside the two pipe frames; they illustrate direction, never a visible energy beam.
  const flowGeometry = new T.SphereGeometry(.48, 8, 6);
  const flows = gardens.map(g => {
    const markers = new T.InstancedMesh(flowGeometry, publicLight, 8);
    markers.name = 'energy-water-flow'; g.add(markers); return markers;
  });
  const deliveries = distributionNodes.map(node => {
    const markers = new T.InstancedMesh(flowGeometry, publicLight, 3);
    markers.name = 'energy-distribution-flow';
    markers.boundingSphere = new T.Sphere(new T.Vector3(3.4, 2.6, 42.5), 9);
    node.add(markers); return markers;
  });
  const pose = new T.Object3D(), from = new T.Vector3(), to = new T.Vector3();
  let option: EnergyOption = 'baseline';
  let configuration: EnergyConfiguration;
  function configure(next: EnergyConfiguration) {
    configuration = { ...next };
    wing.visible = next.receiver !== 'none';
    wing.scale.setScalar(next.receiver === 'small' ? .65 : 1);
    garden.visible = next.waterGardens > 0;
    garden2.visible = next.waterGardens === 2;
    ring.visible = next.flywheel;
    island.visible = next.island;
    distribution.visible = garden.visible || wing.visible || ring.visible || island.visible;
  }
  function select(next: EnergyOption) {
    option = next;
    configure({
      waterGardens: next === 'a' || next === 'mixed' ? 2 : 0,
      receiver: next === 'a' ? 'small' : next === 'b' || next === 'mixed' ? 'large' : 'none',
      flywheel: next === 'b' || next === 'mixed',
      island: next === 'c' || next === 'mixed',
    });
  }
  for (const flow of flows) flow.boundingSphere = new T.Sphere(new T.Vector3(5, 12, 0), 20);
  function update(seconds: number, reducedMotion = false) {
    const cycle = energyCycle(seconds, reducedMotion);
    rotor.rotation.z = cycle.angle;
    for (const [i, g] of gardens.entries()) {
      g.getObjectByName('energy-upper-water')!.position.y = 22.2 + cycle.level * .8;
      g.getObjectByName('energy-lower-water')!.position.y = .1 - cycle.level * .8;
      g.getObjectByName('energy-turbine')!.rotation.z = reducedMotion ? .4 : cycle.phase === 'release' ? Math.PI * 2 * ((cycle.t - 40) / 20) - Math.sin(Math.PI * 2 * (cycle.t - 40) / 20) : 0;
      const pumping = cycle.phase === 'charge';
      from.set(pumping ? 5 : 2, pumping ? .5 : 23, pumping ? 8 : -7);
      to.set(pumping ? 15 : -5, pumping ? 23 : 5.5, pumping ? 8 : -7);
      flows[i].visible = reducedMotion || cycle.phase !== 'hold';
      for (let j = 0; j < 8; j++) {
        pose.position.lerpVectors(from, to, (j / 8 + (reducedMotion ? 0 : cycle.t * .06)) % 1);
        pose.updateMatrix(); flows[i].setMatrixAt(j, pose.matrix);
      }
      flows[i].instanceMatrix.needsUpdate = true;
    }
    for (const markers of deliveries) {
      markers.visible = reducedMotion || (configuration.waterGardens === 0 && !configuration.flywheel) || cycle.phase === 'release';
      for (let j = 0; j < 3; j++) {
        pose.position.set(3.4, 2.6, 35 + 15 * ((j / 3 + (reducedMotion ? 0 : seconds * .06)) % 1));
        pose.updateMatrix(); markers.setMatrixAt(j, pose.matrix);
      }
      markers.instanceMatrix.needsUpdate = true;
    }
    return cycle;
  }
  select(option); update(0);
  return { root, parts, gardens, rotor, select, configure, update, getConfiguration: () => ({ ...configuration }), get option() { return option; } };
}
