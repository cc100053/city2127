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
  arc(wing, 0, 1.2, 25, [0, 0, 0], trim);
  // The service neck and seated joints make the existing fork read as one supported assembly.
  arc(wing, 0, .96, 4.2, [0, 25, 0], dark);
  arc(wing, 0, 1.14, 3.7, [0, 25.25, 0], trim);
  for (const y of [1, 15.6, 17, 24.6, 28.8]) {
    arc(wing, 1.16, 1.34, .18, [0, y, 0], chrome);
    arc(wing, 1.16, 1.28, .12, [0, y + .22, 0], dark);
  }
  box(wing, [.72, 7.2, .08], [0, 8, 1.18], dark);
  box(wing, [.58, 6.95, .08], [0, 8, 1.22], trim);
  box(wing, [.2, .65, .08], [.15, 8, 1.28], chrome);
  arc(wing, 1.18, 1.3, .35, [0, 23.95, 0], trim);
  for (const side of [-1, 1]) {
    box(wing, [.08, 6.5, .32], [side * 1.18, 20.6, 0], dark);
    box(wing, [.08, 6.3, .16], [side * 1.22, 20.6, 0], chrome);
  }
  for (const z of [-1.16, 1.16]) {
    box(wing, [.44, 2.5, .1], [0, 26.95, z], dark);
    box(wing, [.3, 2.25, .12], [0, 26.95, z], trim);
    for (const y of [25.95, 27.95]) box(wing, [.12, .12, .14], [0, y, z], chrome);
  }
  for (const side of [-1, 1]) {
    member(wing, [0, 16, 0], [side * 20, 31.8, 0], 1.4);
    for (const z of [-.71, .71]) {
      member(wing, [side * 2.3, 17.82, z], [side * 18, 30.22, z], .4, dark);
      member(wing, [side * 2.3, 17.82, z + Math.sign(z) * .18], [side * 18, 30.22, z + Math.sign(z) * .18], .18, trim);
      const joint = arc(wing, 0, .78, .12, [side * 1.35, 17.07, z], trim);
      joint.rotation.x = Math.sign(z) * Math.PI / 2;
      const gasket = arc(wing, .3, .59, .14, [side * 1.35, 17.07, z], dark);
      gasket.rotation.x = Math.sign(z) * Math.PI / 2;
      const pin = arc(wing, 0, .3, .18, [side * 1.35, 17.07, z], chrome);
      pin.rotation.x = Math.sign(z) * Math.PI / 2;
      for (const dx of [-.43, .43]) for (const dy of [-.43, .43])
        box(wing, [.13, .13, .12], [side * 1.35 + dx, 17.07 + dy, z + Math.sign(z) * .13], chrome);
    }
    const leaf = new T.Group(); leaf.position.set(side * 13, 31, 0); leaf.rotation.z = side * .22; wing.add(leaf);
    box(leaf, [25, 1.1, 20], [0, 0, 0], trim);
    for (const z of [-9.7, 9.7]) {
      box(leaf, [24.7, .12, .18], [0, .67, z], chrome);
      box(leaf, [24.5, .14, .08], [0, -.18, z + Math.sign(z) * .25], dark);
      for (let x = -10; x <= 10; x += 5) {
        box(leaf, [4.6, .2, .08], [x, .17, z + Math.sign(z) * .25], dark);
        box(leaf, [4.25, .08, .09], [x, .19, z + Math.sign(z) * .25], chrome);
      }
    }
    for (let x = -10; x <= 10; x += 5) {
      box(leaf, [4.5, .12, 18.3], [x, .59, 0], dark);
      for (const z of [-9.05, 9.05]) {
        box(leaf, [4.4, .18, .26], [x, .68, z], chrome);
        box(leaf, [3.85, .08, .14], [x, .78, z], trim);
      }
      for (let row = 0; row < 12; row++) {
        const z = -8.25 + row * 1.5;
        for (const dx of [-1.1, 1.1]) box(leaf, [2.1, .12, 1.34], [x + dx, .71, z], solar, .015);
        if (row % 3 === 2 && row < 11) box(leaf, [4.4, .06, .08], [x, .74, z + .75], chrome, .01);
      }
      for (const dx of [-2.32, 2.32]) {
        box(leaf, [.12, .2, 18.4], [x + dx, .68, 0], chrome);
        for (const z of [-8.4, 0, 8.4]) box(leaf, [.22, .08, .38], [x + dx, .76, z], trim);
      }
    }
    // Underside spars receive the fork below the surface instead of protruding through it.
    for (const z of [-6.8, 6.8]) member(leaf, [-11.6, -.8, z], [11.6, -.8, z], .45, dark);
    for (const x of [-7.5, 7.5]) member(leaf, [x, -.8, -6.8], [x, -.8, 6.8], .35, trim);
    box(leaf, [3.1, .6, 4], [side * 7, -.8, 0], trim);
    for (const z of [-1.85, 1.85]) {
      box(leaf, [2.8, .16, .18], [side * 7, -1.12, z], chrome);
      const seat = arc(leaf, 0, .75, .15, [side * 7, -.65, z], trim);
      seat.rotation.x = Math.sign(z) * Math.PI / 2;
      const bearing = arc(leaf, .28, .56, .18, [side * 7, -.65, z], dark);
      bearing.rotation.x = Math.sign(z) * Math.PI / 2;
      const pin = arc(leaf, 0, .25, .21, [side * 7, -.65, z], chrome);
      pin.rotation.x = Math.sign(z) * Math.PI / 2;
    }
    member(leaf, [-12, -.8, -8], [12, -.8, 8], .6, dark);
  }
  // Submerged service trunk, rather than a visible fictional energy beam.
  member(wing, [0, -1.8, 0], [8, -1.8, 30], 1, dark);

  // All water-garden metalwork shares the city's finishes and is baked with the fixed chassis.
  const pipe = (parent: T.Group, a: number[], b: number[], radius: number, material: T.Material = chrome) => {
    const from = new T.Vector3(...a), to = new T.Vector3(...b), delta = to.clone().sub(from);
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, delta.length(), 12), material);
    mesh.position.copy(from).add(to).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
  };
  const collar = (a: number[], b: number[], t: number, radius: number) => {
    const from = new T.Vector3(...a), delta = new T.Vector3(...b).sub(from).normalize();
    const center = from.lerp(new T.Vector3(...b), t);
    pipe(garden, center.clone().addScaledVector(delta, -.18).toArray(), center.clone().addScaledVector(delta, .18).toArray(), radius);
    for (const offset of [-.25, .25]) pipe(garden, center.clone().addScaledVector(delta, offset - .035).toArray(), center.clone().addScaledVector(delta, offset + .035).toArray(), radius + .07, dark);
  };

  // One upper/lower reservoir pair, with separate gravity/turbine and pumped-return pipes.
  garden.position.set(-310, 0, -151);
  arc(garden, 0, 14, .4, [0, -1.5, 0], stone);
  arc(garden, 12.5, 14, 2.1, [0, -1.1, 0], trim);

  arc(garden, 11, 12, 1.5, [8, 21.8, 0], trim);
  arc(garden, 0, 11, .6, [8, 21.2, 0], stone);
  // A shallow structural bowl transfers the upper reservoir into its splayed legs.
  const bowl = new T.Mesh(new T.CylinderGeometry(11, 4.8, 2.5, 64, 1, true), trim);
  bowl.position.set(8, 19.95, 0); bowl.castShadow = bowl.receiveShadow = true; garden.add(bowl);
  arc(garden, 0, 4.8, .25, [8, 18.6, 0], dark);
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12, c = Math.cos(a), z = Math.sin(a);
    member(garden, [8 + 5.05 * c, 18.7, 5.05 * z], [8 + 11.12 * c, 21.25, 11.12 * z], .23, trim);
    member(garden, [8 + 12.015 * c, 21.85, 12.015 * z], [8 + 12.015 * c, 23.23, 12.015 * z], .035, dark);
    member(garden, [14.015 * c, -1.05, 14.015 * z], [14.015 * c, .95, 14.015 * z], .035, dark);
  }
  for (const [inner, outer, y] of [[11.05, 11.22, 23.28], [11.8, 12, 23.28], [11.9, 12, 21.75]])
    arc(garden, inner, outer, .12, [8, y, 0], chrome);
  // Recessed pool-edge light and coping retain the existing wall and maintenance width.
  arc(garden, 10.96, 11.04, .08, [8, 23.12, 0], publicLight);
  arc(garden, 12.48, 12.56, .08, [0, .78, 0], publicLight);
  arc(garden, 12.55, 13.95, .12, [0, 1, 0], stone);
  arc(garden, 13.85, 14, .12, [0, .85, 0], chrome);
  // The maintenance walk stays on the existing wall; the reservoir remains visibly full of water.
  for (const y of [1.45, 1.9, 2.25]) arc(garden, 13.69, 13.77, .08, [0, y, 0], chrome, -Math.PI / 2 + .16, Math.PI * 2 - .32);
  for (let i = 0; i < 40; i++) {
    const a = i * Math.PI / 20, x = 13.73 * Math.cos(a), z = 13.73 * Math.sin(a);
    if (z < 13.4 || Math.abs(x) > 2.4) pipe(garden, [x, 1.1, z], [x, 2.3, z], .065);
  }

  for (const z of [-8, 8]) {
    member(garden, [-8, 0, z], [1, 21.8, z], 1.1);
    member(garden, [11, 0, z], [16, 21.8, z], 1.1);
    for (const [a, b] of [[[-8, 0, z], [1, 21.8, z]], [[11, 0, z], [16, 21.8, z]]]) {
      for (const t of [.06, .24, .91]) collar(a, b, t, .85);
      pipe(garden, a, new T.Vector3(...a).lerp(new T.Vector3(...b), .07).toArray(), .95, trim);
    }
  }
  box(garden, [9, 5, 6], [-5, 3, -7], glass).name = 'energy-turbine-room';
  // Ceramic service enclosure: recessed louvres, removable panels and a framed inspection face.
  for (const x of [-9.5, -.5]) {
    box(garden, [.22, 5.1, 6.15], [x, 3, -7], trim);
    box(garden, [.25, 3.2, 4.6], [x + (x < -5 ? -.13 : .13), 3, -7], dark);
    for (let y = 1.55; y < 4.5; y += .38) box(garden, [.32, .12, 4.5], [x + (x < -5 ? -.25 : .25), y, -7], chrome);
  }
  for (const y of [.55, 5.45]) box(garden, [9.3, .2, 6.25], [-5, y, -7], trim);
  for (const x of [-9.45, -7.6, -2.4, -.55]) box(garden, [.14, 4.8, .18], [x, 3, -10.08], trim);
  box(garden, [8.7, .18, 5.7], [-5, 5.65, -7], dark);
  for (const x of [-8.6, -1.4]) {
    box(garden, [1.2, .12, .14], [x, 5.18, -10.2], publicLight);
    box(garden, [.72, 1.3, .12], [x, 3.1, -10.17], dark);
    for (const y of [2.75, 3.1, 3.45]) box(garden, [.45, .06, .04], [x, y, -10.25], chrome);
  }
  for (const x of [-9.7, -.3]) box(garden, [.08, .1, 4.45], [x, 4.8, -7], publicLight);
  // A deep ceramic inspection lip frames the recessed rotor without turning with it.
  const casing = arc(garden, 2.32, 2.64, .42, [-5, 3.5, -10.55], trim);
  casing.rotation.x = -Math.PI / 2;
  const casingBead = new T.Mesh(new T.TorusGeometry(2.4, .055, 8, 64), chrome);
  casingBead.position.set(-5, 3.5, -11); garden.add(casingBead);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    box(garden, [.13, .13, .13], [-5 + 2.48 * Math.cos(a), 3.5 + 2.48 * Math.sin(a), -11.01], dark);
  }
  const turbineRotor = new T.Group(); turbineRotor.name = 'energy-turbine'; turbineRotor.position.set(-5, 3.5, -10.6); garden.add(turbineRotor);
  const turbine = new T.Mesh(new T.TorusGeometry(2.03, .14, 10, 64), chrome);
  turbineRotor.add(turbine);
  // Swept impeller vanes share one profile and stay inside the original 2.3 m rotor envelope.
  const vane = new T.Shape();
  vane.moveTo(.38, -.12); vane.bezierCurveTo(.95, -.35, 1.75, -.15, 2.03, .25);
  vane.lineTo(1.9, .64); vane.bezierCurveTo(1.36, .24, .86, .12, .38, .24); vane.closePath();
  const vaneGeometry = new T.ExtrudeGeometry(vane, { depth: .18, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 2, steps: 1, curveSegments: 10 });
  vaneGeometry.translate(0, 0, -.09);
  for (let i = 0; i < 7; i++) {
    const blade = new T.Mesh(vaneGeometry, dark); blade.rotation.z = i * Math.PI * 2 / 7; turbineRotor.add(blade);
  }
  pipe(turbineRotor, [0, 0, -.25], [0, 0, .25], .52, chrome);
  pipe(turbineRotor, [0, 0, -.34], [0, 0, -.26], .28, dark);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    box(turbineRotor, [.08, .08, .06], [.39 * Math.cos(a), .39 * Math.sin(a), -.29], trim);
  }
  for (const z of [-7.8, -6.2]) {
    const a = [2, 23, z], b = [-5, 5.5, z];
    pipe(garden, a, b, .31, glass);
    for (const t of [.1, .35, .7, .94]) collar(a, b, t, .36);
  }
  member(garden, [-5, .5, -7], [-5, 2, -7], 1.6, solar);
  // Return line closes the loop visibly; it is storage charged by an external supply.
  for (const z of [7.5, 8.5]) {
    const a = [5, .5, z], b = [15, 23, z];
    pipe(garden, a, b, .25, dark);
    for (const t of [.06, .3, .65, .95]) collar(a, b, t, .3);
  }
  member(garden, [15, 23, 8], [12, 23, 0], .9, dark);
  // Independent public spur meets the existing shore, outside the reservoir and its plant.
  const spur = new T.Group(); spur.position.set(0, 0, 34.75); spur.rotation.x = Math.atan2(.6, 34.5); garden.add(spur);
  box(spur, [4, .6, 34.5], [0, 0, 0], stone);
  for (const x of [-2, 2]) {
    for (const y of [.45, .85, 1.35]) box(spur, [.08, .08, 34.5], [x, y, 0], chrome);
    for (let z = -17; z <= 17; z += 2.8) pipe(spur, [x, .3, z], [x, 1.4, z], .055);
    box(spur, [.16, .08, 34.5], [x, .32, 0], trim);
  }
  for (let z = -16; z < 17; z += 2) box(spur, [3.8, .012, .025], [0, .307, z], dark);
  box(garden, [7, .6, 7], [0, .3, 17.5], stone);

  // A supported wing over the service room carries local receiving equipment, separate from the public court.
  for (const x of [-9, -1]) member(garden, [x, 0, -6], [x, 10, -6], .5);
  const canopy = new T.Group(); canopy.position.set(-5, 10, -6); canopy.rotation.z = -.16; garden.add(canopy);
  box(canopy, [16, .5, 10], [0, 0, 0], dark);
  for (let x = -6; x <= 6; x += 4) for (const z of [-2.5, 2.5])
    box(canopy, [3.82, .09, 4.78], [x, .3, z], solar);
  // Panel-size seams remain legible from the authored view without subpixel cell-line shimmer.
  for (const x of [-4, 0, 4]) box(canopy, [.07, .06, 9.65], [x, .36, 0], chrome);
  box(canopy, [15.65, .06, .07], [0, .36, 0], chrome);
  for (const z of [-4.9, 4.9]) box(canopy, [15.9, .12, .12], [0, .35, z], chrome);
  for (const x of [-7.9, 7.9]) box(canopy, [.12, .12, 9.8], [x, .35, 0], chrome);
  for (const x of [-6, 0, 6]) box(canopy, [.18, .5, 9.5], [x, -.45, 0], trim);
  for (const x of [-9, -1]) for (const z of [-9.5, -2.5])
    member(garden, [x, 6, -6], [x, 9.3 + (x + 5) * -.16, z], .22, chrome);
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
  // Layered races and replaceable cassettes stay inside the original full-rotation envelope.
  const belt = arc(rotor, 29.55, 32.45, 1.8, [0, 0, -.9], dark);
  belt.rotation.x = Math.PI / 2;
  for (const z of [-1.12, 1.12]) for (const radius of [29.65, 32.35]) {
    const race = new T.Mesh(new T.TorusGeometry(radius, .13, 8, 128), chrome);
    race.position.z = z; race.castShadow = race.receiveShadow = true; rotor.add(race);
  }
  for (let i = 0; i < 24; i++) for (const z of [-1.2, 1.05]) {
    for (const [inner, outer] of [[29.85, 30.25], [31.75, 32.15]]) {
      const shoulder = arc(rotor, inner, outer, .15, [0, 0, z], chrome, i * Math.PI / 12 + .012, Math.PI / 12 - .024);
      shoulder.rotation.x = Math.PI / 2;
    }
  }
  for (let i = 0; i < 48; i++) {
    const angle = i * Math.PI / 24, span = Math.PI / 24;
    for (const z of [-1.04, .94]) {
      const cassette = arc(rotor, 30.33, 31.67, .16, [0, 0, z], solar, angle + .009, span - .018);
      cassette.rotation.x = Math.PI / 2;
    }
    const c = Math.cos(angle), s = Math.sin(angle);
    const joint = box(rotor, [1.54, .12, 2.12], [31 * c, 31 * s, 0], dark);
    joint.rotation.z = angle;
    if (i % 4 === 0) {
      for (const radius of [29.85, 32.15]) {
        const clip = box(rotor, [.34, .65, .16], [radius * c, radius * s, -1.25], trim);
        clip.rotation.z = angle;
      }
    }
    for (const radius of [30.35, 31.65]) {
      pipe(rotor, [radius * c, radius * s, -1.18], [radius * c, radius * s, -1.32], .105, chrome);
    }
  }
  // Sparse operating marks keep the rotor readable at night without turning its belt into a light ring.
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const marker = box(rotor, [1.2, .42, .12], [31 * Math.cos(a), 31 * Math.sin(a), -1.2], publicLight);
    marker.rotation.z = a;
  }
  for (const side of [-1, 1]) {
    const x = side * 25.7, y = 25.7;
    // Fixed bearing housings clear r33 even while the complete belt sweeps past.
    member(ring, [side * 22, 30, 12], [x, y, 3.3], 1.1);
    member(ring, [side * 26, 30, 12], [x, y, 3.3], .65, chrome);
    box(ring, [5.2, .65, 3], [side * 24, 30, 11], trim);
    pipe(ring, [x, y, -.8], [x, y, 3.4], 2.14, dark);
    for (const [z, depth] of [[-1.18, .93], [.05, 2.2], [2.55, .7]]) {
      const shell = arc(ring, 2.12, 2.45, depth, [x, y, z], trim);
      shell.rotation.x = Math.PI / 2;
    }
    for (const z of [-1.4, -.9, 2.5]) {
      const rim = new T.Mesh(new T.TorusGeometry(2.25, .18, 8, 40), chrome);
      rim.position.set(x, y, z); rim.castShadow = rim.receiveShadow = true; ring.add(rim);
    }
    const lip = arc(ring, 1.68, 2.22, .28, [x, y, -1.45], chrome);
    lip.rotation.x = Math.PI / 2;
    pipe(ring, [x, y, -1.05], [x, y, -1.3], 1.65, dark);
    const bearingLip = arc(ring, .66, .88, .14, [x, y, -1.48], chrome);
    bearingLip.rotation.x = Math.PI / 2;
    pipe(ring, [x, y, -1.31], [x, y, -1.38], .55, dark);
    for (const anchor of [22, 26]) {
      box(ring, [1.7, 1.1, .4], [side * anchor, 29.8, 10.65], chrome);
      pipe(ring, [side * anchor, 29.8, 10.42], [side * anchor, 29.8, 10.2], .27, dark);
    }
    for (const dx of [-1.5, 1.5]) {
      member(ring, [x + dx, y, 2.8], [x + dx, y + 1.7, 4.2], .42, chrome);
      pipe(ring, [x + dx - .25, y + 1.7, 4.2], [x + dx + .25, y + 1.7, 4.2], .38, dark);
    }
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4, dx = 1.98 * Math.cos(angle), dy = 1.98 * Math.sin(angle);
      pipe(ring, [x + dx, y + dy, -1.45], [x + dx, y + dy, -1.65], .13, dark);
    }
    pipe(ring, [side * 22, 30, 10.8], [x, y + 1, 3.4], .18, dark);
  }

  // Three reclaimed caissons read as new coastline. A clear-span service bridge preserves the existing shipping routes below.
  island.position.set(-60, 0, -470);
  for (const z of [-16, 0, 16]) {
    box(island, [40, 4, 15.5], [0, -.4, z], stone);
    box(island, [40.4, .8, 1], [0, 1.9, z - 7.8], trim);
    for (const x of [-19.7, 19.7]) {
      box(island, [.35, .3, 15.2], [x, 1.75, z], trim);
      for (const dz of [-5, 0, 5]) {
        box(island, [.18, 2.8, .16], [Math.sign(x) * 20.015, -.15, z + dz], dark);
        member(island, [x, 1.9, z + dz], [x, 3, z + dz], .1, chrome);
      }
      for (const y of [2.45, 3]) pipe(island, [x, y, z - 7.4], [x, y, z + 7.4], .055);
    }
    for (const x of [-19.15, 19.15]) {
      box(island, [.32, .035, 14.8], [x, 1.625, z], dark);
      for (const dz of [-5, 0, 5]) {
        box(island, [.6, .18, .65], [x, 1.7, z + dz], chrome);
        box(island, [.16, .08, .35], [x, 1.83, z + dz], publicLight);
      }
    }
    for (const x of [-16, -8, 0, 8, 16]) box(island, [.055, .025, 15], [x, 1.615, z], dark);
  }
  for (const z of [-23.2, 23.2]) {
    for (const y of [2.45, 3]) pipe(island, [-19.7, y, z], [19.7, y, z], .055);
    for (let x = -18; x <= 18; x += 6) member(island, [x, 1.9, z], [x, 3, z], .1, chrome);
  }
  for (const x of [-9, 9]) {
    arc(island, 0, 7, 12, [x, 1.6, -3], trim);
    const cap = new T.Mesh(new T.SphereGeometry(7, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), trim);
    cap.position.set(x, 13.6, -3); cap.castShadow = cap.receiveShadow = true; island.add(cap);
    // Shallow joints and maintenance metalwork leave the sealed shell and its silhouette intact.
    for (const y of [2, 7.5, 13.55]) arc(island, 7.015, 7.065, .07, [x, y, -3], chrome);
    for (const angle of [Math.PI / 6, Math.PI / 3]) {
      const r = 7 * Math.cos(angle), y = 13.6 + 7 * Math.sin(angle);
      arc(island, r + .005, r + .055, .05, [x, y, -3], chrome);
    }
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8, c = Math.cos(a), z = Math.sin(a);
      member(island, [x + 7.025 * c, 2.1, -3 + 7.025 * z], [x + 7.025 * c, 13.6, -3 + 7.025 * z], .055, chrome);
      for (let j = 0; j < 10; j++) {
        const a0 = j * Math.PI / 22, a1 = (j + 1) * Math.PI / 22;
        pipe(island, [x + 7.025 * Math.cos(a0) * c, 13.6 + 7.025 * Math.sin(a0), -3 + 7.025 * Math.cos(a0) * z],
          [x + 7.025 * Math.cos(a1) * c, 13.6 + 7.025 * Math.sin(a1), -3 + 7.025 * Math.cos(a1) * z], .035, chrome);
      }
      member(island, [x + 7.5 * c, 13.4, -3 + 7.5 * z], [x + 7.5 * c, 14.5, -3 + 7.5 * z], .065, chrome);
      member(island, [x + 7.02 * c, 12.5, -3 + 7.02 * z], [x + 7.5 * c, 13.35, -3 + 7.5 * z], .12, trim);
    }
    arc(island, 7, 7.65, .16, [x, 13.3, -3], chrome);
    for (const y of [13.95, 14.5]) arc(island, 7.47, 7.54, .065, [x, y, -3], chrome);
    arc(island, 6.95, 7.3, .3, [x, 1.7, -3], chrome);
    arc(island, .85, 1.05, .12, [x, 20.45, -3], chrome);
    // Raised hatch hardware stays below the original dome crown.
    for (const dx of [-.6, .6]) pipe(island, [x + dx, 20.48, -3.3], [x + dx, 20.48, -2.7], .07);
    for (const z of [-10.7, 4.7]) {
      box(island, [1.3, .45, .55], [x, 1.825, z], dark);
      box(island, [1, .1, .35], [x, 2.1, z], publicLight);
    }
    // Removable skirt shoes and a side ladder give the sealed units a service scale.
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, c = Math.cos(a), z = Math.sin(a);
      const shoe = box(island, [.65, .7, .9], [x + 7.2 * c, 2.05, -3 + 7.2 * z], trim);
      shoe.rotation.y = -a;
      pipe(island, [x + 7.2 * c, 2.42, -3 + 7.2 * z], [x + 7.2 * c, 2.55, -3 + 7.2 * z], .11, dark);
    }
    const ladderX = x + Math.sign(x) * 7.85;
    for (const z of [-3.5, -2.5]) pipe(island, [ladderX, 1.8, z], [ladderX, 14.4, z], .065);
    for (let y = 2.1; y < 13.5; y += .4) pipe(island, [ladderX, y, -3.5], [ladderX, y, -2.5], .065);
    for (const y of [3, 7, 11]) for (const z of [-3.5, -2.5])
      member(island, [x + Math.sign(x) * 7, y, z], [ladderX, y, z], .09, trim);
    for (const side of [-1, 1]) {
      pipe(island, [x + side * 5.3, 2.3, 2.1], [x + side * 5.3, 5.4, 2.1], .3);
      pipe(island, [x + side * 5.3, 2.3, 2.1], [x + side * 5.3, 2.3, 10], .3);
      for (const z of [4, 7, 9]) pipe(island, [x + side * 5.3, 2.3, z - .12], [x + side * 5.3, 2.3, z + .12], .43, trim);
    }
    box(island, [12, 5, 10], [x, 4.1, 15], dark);
    box(island, [12.15, .25, 10.15], [x, 6.6, 15], trim);
    box(island, [12.15, .3, 10.15], [x, 1.75, 15], chrome);
    for (const side of [-1, 1]) {
      for (const dz of [-3.2, 0, 3.2]) {
        box(island, [.12, 3.8, 2.9], [x + side * 6.03, 4.1, 15 + dz], teal);
        box(island, [.18, .16, 2.6], [x + side * 6.1, 5.7, 15 + dz], chrome);
        for (const y of [2.5, 5.7]) box(island, [.2, .12, .12], [x + side * 6.12, y, 14 + dz], trim);
      }
    }
    for (const dx of [-5.8, 0, 5.8]) box(island, [.16, 4.8, .18], [x + dx, 4.1, 20.03], trim);
    for (const dx of [-3, 3]) {
      box(island, [5.4, .12, 8.5], [x + dx, 6.79, 15], dark);
      for (let dz = -3.8; dz <= 3.8; dz += .5)
        box(island, [4.9, .13, .15], [x + dx, 6.9, 15 + dz], chrome);
      for (const edge of [-2.6, 2.6]) box(island, [.13, .19, 8.5], [x + dx + edge, 6.9, 15], trim);
      box(island, [4.8, 3.4, .12], [x + dx, 4.1, 20.08], trim);
      for (let y = 2.7; y < 5.6; y += .4) box(island, [4.4, .18, .18], [x + dx, y, 20.2], dark);
    }
    for (const dz of [-4, 0, 4]) box(island, [10.8, .07, .07], [x, 6.88, 15 + dz], chrome);
    box(island, [1.6, 2.7, .16], [x, 2.95, 9.97], trim);
    box(island, [1.2, .08, .12], [x, 4.45, 9.85], publicLight);
  }
  box(island, [32, 1, 8], [0, 2.1, -19], teal);
  for (let x = -12; x <= 12; x += 8) box(island, [.1, .025, 7.7], [x, 2.615, -19], trim);
  for (const z of [-22.8, -15.2]) box(island, [31.5, .025, .12], [0, 2.615, z], chrome);
  const start = new T.Vector3(0, 18, 16), end = new T.Vector3(80, 18, 118), length = start.distanceTo(end);
  const bridge = new T.Group(); bridge.position.copy(start).add(end).multiplyScalar(.5); bridge.lookAt(end); island.add(bridge);
  box(bridge, [5, .8, length], [0, 0, 0], stone);
  for (const x of [-2.6, 2.6]) {
    box(bridge, [.5, .5, length], [x, 3.5, 0], trim);
    box(bridge, [.35, .65, length], [x, .1, 0], trim);
    box(bridge, [.12, .2, length], [x, 3.19, 0], dark);
    box(bridge, [.12, .08, length], [x * .91, .58, 0], dark);
    box(bridge, [.28, .12, length], [x * .8, .48, 0], chrome);
    for (const y of [1, 1.7]) pipe(bridge, [x, y, -length / 2], [x, y, length / 2], .06);
    for (let z = -length / 2; z < length / 2; z += 12) {
      const next = Math.min(z + 12, length / 2);
      member(bridge, [x, .4, z], [x, 3.5, next], .3, dark);
      member(bridge, [x, .4, z], [x, 3.5, z], .22);
      box(bridge, [.65, .65, .45], [x, .4, z], chrome);
      box(bridge, [.56, .4, .4], [x, 3.4, z], chrome);
      box(bridge, [.1, .12, 1.1], [x * .91, .95, z + .7], publicLight);
      for (const offset of [0, 4, 8]) if (z + offset < length / 2) member(bridge, [x, .4, z + offset], [x, 1.7, z + offset], .085, chrome);
    }
  }
  for (let z = -length / 2 + 6; z < length / 2; z += 12) {
    box(bridge, [5.2, .18, .3], [0, -.38, z], trim);
    box(bridge, [4.9, .035, .13], [0, .415, z], dark);
    box(bridge, [1.1, .045, .22], [0, .44, z], trim);
  }
  for (const [x, z, base] of [[0, 16, 1.6], [80, 118, 0]]) {
    box(island, [3, 18 - base, 3], [x, (18 + base) / 2, z], glass);
    for (const dx of [-1.8, 1.8]) {
      member(island, [x + dx, base, z], [x + dx, 18, z], .5);
      for (let y = base + 2; y < 18; y += 3) box(island, [.65, .18, 3.2], [x + dx, y, z], trim);
    }
    box(island, [4.1, .3, 4.1], [x, 17.6, z], trim);
    box(island, [1.5, .1, .15], [x, base + 2.8, z - 1.6], publicLight);
    for (const dx of [-1.45, 1.45]) box(island, [.12, 17 - base, .12], [x + dx, (17 + base) / 2, z - 1.56], dark);
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
  const water = new T.MeshPhysicalMaterial({ color: '#527f99', roughness: .075, metalness: .38, clearcoat: .9, clearcoatRoughness: .08, envMap: chrome.envMap, envMapIntensity: .7 });
  // Reuse the generated bay normal, with metre-scaled UVs; Node geometry checks need no image loader.
  if (typeof document !== 'undefined' && typeof document.createElementNS === 'function') {
    const normal = new T.TextureLoader().load(new URL('../asset/textures/bay-ripple-normal.png', import.meta.url).href);
    normal.wrapS = normal.wrapT = T.RepeatWrapping; normal.repeat.set(.065, .065);
    water.normalMap = normal; water.normalScale.set(1.1, 1.1);
    water.clearcoatNormalMap = normal; water.clearcoatNormalScale.set(.75, .75);
  }
  const lowerWater = arc(garden, 0, 12.4, .2, [0, .1, 0], water);
  const upperWater = arc(garden, 0, 10.7, .2, [8, 23, 0], water);
  lowerWater.name = 'energy-lower-water'; upperWater.name = 'energy-upper-water';
  const garden2 = garden.clone(); garden2.name = 'energy-district-garden';
  garden2.position.set(30, 0, -395); garden2.scale.setScalar(.72); root.add(garden2);
  const gardens = [garden, garden2];
  const secondGardenLights = new T.Group(); secondGardenLights.name = 'energy-second-garden-edge-lights';
  arc(secondGardenLights, 11.96, 12.025, .08, [8, 21.84, 0], publicLight);
  for (const z of [-8, 8]) {
    member(secondGardenLights, [-7.55, 1, z - .57], [.55, 20.8, z - .57], .08, publicLight);
    member(secondGardenLights, [11.22, 1, z - .57], [15.78, 20.8, z - .57], .08, publicLight);
  }
  // Rebuild only this clone's light batch; shared geometry and the west garden stay untouched.
  secondGardenLights.add(...garden2.children.filter(child => child instanceof T.Mesh && child.material === publicLight));
  secondGardenLights.add(...bake(secondGardenLights)); garden2.add(secondGardenLights);
  const westGardenLights = new T.Group(); westGardenLights.name = 'energy-west-garden-edge-lights';
  arc(westGardenLights, 11.96, 12.025, .08, [8, 21.84, 0], publicLight);
  for (const z of [-8, 8]) {
    member(westGardenLights, [-7.55, 1, z - .57], [.55, 20.8, z - .57], .08, publicLight);
    member(westGardenLights, [11.22, 1, z - .57], [15.78, 20.8, z - .57], .08, publicLight);
  }
  // Rebatch the west garden separately so both gardens retain independent local light geometry.
  westGardenLights.add(...garden.children.filter(child => child instanceof T.Mesh && child.material === publicLight));
  westGardenLights.add(...bake(westGardenLights)); garden.add(westGardenLights);
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
    water.envMapIntensity = chrome.envMapIntensity * .7;
    // Absolute-time UV drift keeps snapshots reproducible and reduced-motion surfaces still.
    water.normalMap?.offset.set(reducedMotion ? .1 : seconds * .007, reducedMotion ? .05 : seconds * .004);
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
