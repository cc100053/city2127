import assert from 'node:assert/strict';
import { Box3, Group, InstancedMesh, Matrix4, Mesh, Scene, Vector3, type BufferGeometry } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { CityChangeManager } from '../src/cityChangeManager.ts';
import { EnergyRuntime } from '../src/energyRuntime.ts';
import { buildSurveySites } from '../src/siteBuilders/index.ts';
import { deriveExhibitionLayout } from '../survey/src/shared/cityView.ts';
import { arc, trim } from '../src/cityRig.ts';

const documentBefore = Object.getOwnPropertyDescriptor(globalThis, 'document');
Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) } });
const scene = new Scene(), energy = new EnergyRuntime(scene);
const manager = new CityChangeManager(buildSurveySites(scene, { cloneRoot: () => new Promise<Group>(() => {}) } as never), energy);
if (documentBefore) Object.defineProperty(globalThis, 'document', documentBefore); else delete (globalThis as { document?: unknown }).document;
const full = { waterGardens: 2, receiver: 'large', flywheel: true, island: true } as const;
manager.applyExhibitionLayout({ ...deriveExhibitionLayout({ automation: 0, publicSharing: 0, environmentalPriority: 0, urbanConcentration: 0 }), energy: full }, 'city-state-snapshot', 0);
scene.updateMatrixWorld(true);
const obstacles: Mesh[] = [];
energy.model.root.traverse(o => { if (o instanceof Mesh && !(o instanceof InstancedMesh)) obstacles.push(o); });
// Add complete rotor sweep volumes; district clearance must hold at every mechanical angle.
const swept = new Group(), ring = arc(swept, 29, 33, 3, [0, -1.5, 0], trim);
ring.updateMatrix(); ring.geometry.applyMatrix4(ring.matrix); ring.position.set(0,0,0); ring.rotation.x = Math.PI / 2;
swept.position.copy(energy.model.parts.ring.position); swept.updateMatrixWorld(true); obstacles.push(ring);
for (const garden of energy.model.gardens) {
  const rotor = garden.getObjectByName('energy-turbine')!;
  const group = new Group(), disc = arc(group, 0, 2.3, .9, [0, -.45, 0], trim);
  disc.updateMatrix(); disc.geometry.applyMatrix4(disc.matrix); disc.position.set(0,0,0); disc.rotation.x = Math.PI / 2;
  group.position.copy(rotor.position); garden.add(group); scene.updateMatrixWorld(true); obstacles.push(disc);
}
const tree = new Map<BufferGeometry, MeshBVH>();
const bounds = (mesh: Mesh, matrix = mesh.matrixWorld) => { if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox(); return mesh.geometry.boundingBox!.clone().applyMatrix4(matrix); };
const energyShapes = obstacles.map(mesh => ({ mesh, box: bounds(mesh), inverse: mesh.matrixWorld.clone().invert() }));
for (const { mesh } of energyShapes) if (!tree.has(mesh.geometry)) tree.set(mesh.geometry, new MeshBVH(mesh.geometry, { indirect: true }));
const energyObjects = new Set(); energy.model.root.traverse(o => energyObjects.add(o));
const visible = (mesh: Mesh) => { for (let o: typeof mesh | typeof mesh.parent = mesh; o; o = o.parent) if (!o.visible || energyObjects.has(o)) return false; return mesh.name !== 'meter-pulse'; };
const instance = new Matrix4(), world = new Matrix4(), relative = new Matrix4(), scale = new Vector3();
let candidates = 0, cases = 0;
for (const receiver of ['small', 'large'] as const) for (const seed of [0, 4242]) for (const a of [-12,0,12]) for (const s of [-12,0,12]) for (const e of [-12,0,12]) for (const c of [-12,0,12]) {
  const layout = { ...deriveExhibitionLayout({ automation: a, publicSharing: s, environmentalPriority: e, urbanConcentration: c }), energy: { ...full, receiver } };
  manager.applyExhibitionLayout(layout, 'city-state-snapshot', ++cases, { automation: seed, publicSharing: seed, environmentalPriority: seed, urbanConcentration: seed });
  scene.updateMatrixWorld(true);
  for (const shape of energyShapes) { shape.box.copy(shape.mesh.geometry.boundingBox!).applyMatrix4(shape.mesh.matrixWorld); shape.inverse.copy(shape.mesh.matrixWorld).invert(); }
  scene.traverse(o => {
    if (!(o instanceof Mesh) || !visible(o)) return;
    const count = o instanceof InstancedMesh ? o.count : 1;
    for (let i = 0; i < count; i++) {
      if (o instanceof InstancedMesh) { o.getMatrixAt(i, instance); scale.setFromMatrixScale(instance); if (Math.max(scale.x, scale.y, scale.z) < .01) continue; world.multiplyMatrices(o.matrixWorld, instance); }
      else world.copy(o.matrixWorld);
      const box = bounds(o, world);
      for (const shape of energyShapes) if (shape.box.intersectsBox(box)) {
        candidates++;
        relative.multiplyMatrices(shape.inverse, world);
        assert.equal(tree.get(shape.mesh.geometry)!.intersectsGeometry(o.geometry, relative), false,
          `energy ${shape.mesh.parent?.name} meets district ${o.name} instance ${i}; scores ${a}/${s}/${e}/${c}, seed ${seed}, receiver ${receiver}`);
      }
    }
  });
}
assert.ok(candidates > 0, 'broad phase must exercise exact mesh checks');
console.log(`PASS: energy maximal envelope and full rotor sweeps clear actual district meshes across ${cases} low/mixed/high + history-seed + receiver-size cases (${candidates} exact geometry checks).`);
