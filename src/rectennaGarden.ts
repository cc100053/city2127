import * as T from 'three';
import { box, cream, leaf, paint } from './cityRig.ts';
import { hash, plantShrubs } from './coastalCanopy.ts';

// World metres surveyed against the existing walk and the lowest GLB ramp landing.
type Point = [number, number, number];

export function buildFarmGarden(origin: T.Vector3) {
  const garden = new T.Group();
  garden.name = 'rectenna-public-garden';
  garden.position.copy(origin).negate();

  const gravel = paint('#a59b86', .96), soil = paint('#695443', 1);
  const grit = new Uint8Array(32*32*4);
  for (let i=0;i<32*32;i++) {
    const tone = Math.round(170 + 85*hash(i));
    grit.set([tone,tone,tone,255],i*4);
  }
  gravel.map = new T.DataTexture(grit,32,32);
  gravel.map.wrapS = gravel.map.wrapT = T.RepeatWrapping;
  gravel.map.magFilter = T.LinearFilter;
  gravel.map.minFilter = T.LinearMipmapLinearFilter;
  gravel.map.generateMipmaps = true;
  gravel.map.needsUpdate = true;
  const surface = (name: string, points: Point[], material: T.Material, solid = false) => {
    const geometry = new T.BufferGeometry();
    const vertices = points.flat();
    const indices = T.ShapeUtils.triangulateShape(points.map(([x,,z]) => new T.Vector2(x, -z)), []).flat();
    if (solid) {
      points.forEach(([x,,z]) => vertices.push(x, -.38, z));
      points.forEach((_, i) => {
        const j = (i + 1) % points.length;
        indices.push(i, j, i + points.length, j, j + points.length, i + points.length);
      });
    }
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(points.flatMap(([x,,z]) => [x*.8,z*.8]).concat(solid ? points.flatMap(([x,,z]) => [x*.8,z*.8]) : []), 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new T.Mesh(geometry, material);
    mesh.name = name; mesh.receiveShadow = true;
    garden.add(mesh);
  };
  // Western end overlaps the main walk. The forecourt flares on the crop side of the turn.
  surface('rectenna-gravel-turn', [
    [-234,-.17,402.3], [-226,-.104,402.1], [-218,-.107,401.8],
    [-218,-.107,407.0], [-226,-.104,407.2], [-234,-.16,406.7],
  ], gravel, true);
  surface('rectenna-entry-forecourt', [
    [-218,-.107,401.8], [-211,-.107,400.6], [-206,-.107,402.2], [-202,-.107,405.6],
    [-198,-.107,405.6], [-198,-.107,410.4], [-203,-.107,410.4], [-210,-.107,406.5], [-218,-.107,407.0],
  ], cream, true);
  // The rack sits alongside the branch, outside both the walk and the entrance throat.
  const rack = new T.Group();
  rack.name = 'rectenna-seedling-rack';
  rack.position.set(-226, -.35, 399.95);
  rack.rotation.y = .96;
  garden.add(rack);
  const wood = paint('#79644c', .83), tray = paint('#4f5a54', .88);
  box(rack, [2.15, .09, .63], [0, .85, 0], wood, .025);
  for (const x of [-.94, .94]) for (const z of [-.24, .24]) {
    box(rack, [.08, .86, .08], [x, .43, z], wood, .015);
  }
  const seedlings: Parameters<typeof plantShrubs>[1] = [];
  for (const x of [-.68, 0, .68]) {
    box(rack, [.55, .067, .48], [x, .93, 0], tray, .025);
    box(rack, [.48, .026, .41], [x, .968, 0], soil, .016);
    for (const u of [-.14, 0, .14]) for (const z of [-.1, .1]) {
      seedlings.push([x + u, .98, z, .06, .115 + .045 * hash(100 * (x + u + z))]);
    }
  }
  plantShrubs(rack, seedlings);
  const edging = paint('#aaa698', .93);
  for (const [x, z, length] of [[-230.6, 396.9, 5], [-227.1, 411.1, 4.5]]) {
    const edge = box(garden, [.16, .27, length], [x, -.23, z], edging, .035);
    edge.rotation.y = .49;
  }

  // Sparse coarse grasses leave an open sightline south of the approach.
  const tuft = new T.BufferGeometry();
  tuft.setAttribute('position', new T.Float32BufferAttribute([
    -.12,0,0, .10,0,0, -.08,.6,.11, 0,0,-.12, 0,0,.11, .14,.49,-.045,
    -.10,0,-.10, .04,0,.05, -.21,.38,-.02,
  ], 3));
  tuft.computeVertexNormals();
  const meadow = new T.InstancedMesh(tuft, new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: 1, color: leaf.color }), 216);
  const pose = new T.Object3D(), tint = new T.Color();
  const patches = [[-229.7,397,-.35,1.4,2.1],[-214,394,-.35,3.4,3.5],[-225.8,411.1,-.32,1.4,2.1]];
  for (let i=0;i<meadow.count;i++) {
    const patch = i % 3, j = i * 3;
    const [x,z,y,rx,rz] = patches[patch];
    const angle = hash(j)*Math.PI*2, d = Math.sqrt(hash(j+1));
    pose.position.set(x+Math.cos(angle)*rx*d,y,z+Math.sin(angle)*rz*d);
    pose.rotation.y = hash(j+2)*Math.PI*2;
    pose.scale.setScalar(.35+hash(j+3)*.57);
    pose.updateMatrix();
    meadow.setMatrixAt(i,pose.matrix);
    meadow.setColorAt(i,tint.setHSL(.16+hash(j+4)*.13,.27,.33+hash(j+5)*.35));
  }
  meadow.name = 'rectenna-meadow'; meadow.receiveShadow = true;
  garden.add(meadow);
  return garden;
}
