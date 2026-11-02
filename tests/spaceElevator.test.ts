import assert from 'node:assert/strict';
import { Color, Mesh, PerspectiveCamera, Raycaster, Scene, Vector3 } from 'three';
import { changeSites, SPACE_ELEVATOR } from '../src/layout.ts';
import { HERO_POSITION, HERO_TARGET, heroSettledCamera } from '../src/heroCamera.ts';
import { EARTH } from '../src/bayContext.ts';
import { elevatorTone, spaceElevator } from '../src/spaceElevator.ts';

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
console.log(`spaceElevator tests passed: ${meshes.length} batches, station x ${px.toFixed(0)} px`);
