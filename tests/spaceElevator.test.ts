import assert from 'node:assert/strict';
import { Color, Mesh, PerspectiveCamera, Raycaster, Scene, Vector3 } from 'three';
import { changeSites, SPACE_ELEVATOR } from '../src/layout.ts';
import { HERO_POSITION, HERO_TARGET, heroSettledCamera } from '../src/heroCamera.ts';
import { EARTH } from '../src/bayContext.ts';
import { elevatorTone, NEAR_CLIMB, spaceElevator, spaceElevatorNear } from '../src/spaceElevator.ts';

const luminance = (c: Color) => .2126 * c.r + .7152 * c.g + .0722 * c.b;
// By day the elevator is a shade darker than the haze and unlit; at night it is dark and its lamps glow.
const day = new Color('#c9d6dd'), night = new Color('#141b2e');
assert.ok(elevatorTone(day).glow < .05 && luminance(elevatorTone(day).body) < luminance(day), 'day tone');
assert.ok(elevatorTone(night).glow > .95, 'night glow');

const scene = new Scene(), root = spaceElevator(scene);
scene.updateMatrixWorld(true);
const meshes = root.children.filter((o): o is Mesh => o instanceof Mesh);
assert.ok(meshes.length > 0 && meshes.length <= 4, `batches ${meshes.length}`);
for (const m of meshes) assert.equal(m.castShadow, false, 'elevator casts no shadow');

// The station stays right of the Civic Core in the settled hero frame (guards the position, not the detail).
const { x, z } = SPACE_ELEVATOR, sink = (Math.hypot(x, z) - EARTH.plate) ** 2 / (2 * EARTH.radius);
const p = new Vector3(x, SPACE_ELEVATOR.station - sink, z).project(heroSettledCamera(1920, 1080)), px = (p.x + 1) / 2 * 1920;
assert.ok(px > 1100 && px < 1400, `station screen x ${px.toFixed(0)}`);

// The hero sightlines to the focal sites never cross the elevator.
const camera = new PerspectiveCamera(42, 16 / 9, 2, 9000); camera.position.set(...HERO_POSITION); camera.lookAt(...HERO_TARGET);
const ray = new Raycaster();
for (const site of Object.values(changeSites)) for (const height of [1, site.h * site.scale / 4, site.h * site.scale]) {
  const look = new Vector3(site.x, height, site.z);
  ray.set(camera.position, look.clone().sub(camera.position).normalize()); ray.far = camera.position.distanceTo(look);
  assert.equal(ray.intersectObjects(meshes).length, 0, `${site.name} hero sightline crosses the elevator at ${height} m`);
}
// R1 near model: lazy, swaps with the far root, few batches, no shadows, climbers stay on the tether between the station and the frame top.
const near = spaceElevatorNear(scene, root);
assert.equal(near.root.children.length, 0, 'near model builds lazily'); assert.equal(root.visible, true);
near.setActive(true); scene.updateMatrixWorld(true);
const nearMeshes = near.root.children.filter((o): o is Mesh => o instanceof Mesh), climbers = near.root.getObjectByName('near-climbers')!;
assert.ok(near.root.visible && !root.visible, 'near replaces far');
assert.ok(nearMeshes.length > 0 && nearMeshes.length <= 8, `near batches ${nearMeshes.length}`);
for (const m of nearMeshes) assert.equal(m.castShadow, false, 'near elevator casts no shadow');
assert.equal(climbers.children.length, 3);
for (let t = 0; t < 120; t += 1.7) {
  near.update(t, t / 120); // fog is null here: only the colour and climber updates run
  for (const c of climbers.children) assert.ok(c.position.y >= NEAR_CLIMB[0] && c.position.y <= NEAR_CLIMB[1], `climber y ${c.position.y} at ${t}`);
}
near.setActive(false); assert.ok(root.visible && !near.root.visible, 'far restored');

console.log(`spaceElevator tests passed: ${meshes.length} batches, station x ${px.toFixed(0)} px`);
