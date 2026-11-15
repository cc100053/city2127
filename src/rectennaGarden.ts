import * as T from 'three';
import { box, cream, leaf, leafyCrown, paint } from './cityRig.ts';
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
  const channel = paint('#526c70', .45), rim = paint('#888573', .9);
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
  surface('rectenna-bed-access', [
    [-230,-.25,393], [-228,-.25,391.5], [-224,-.25,396], [-219,-.115,401], [-221,-.115,403], [-227,-.23,397],
  ], gravel, true);

  surface('rectenna-exposed-earth', [[-233,-.318,387],[-225,-.318,385],[-220,-.318,386],[-216,-.318,396],[-222,-.318,399],[-228,-.318,397]], soil);

  const plants: Parameters<typeof plantShrubs>[1] = [];
  for (const [i, x, z, length] of [[0,-229,389.8,8.6], [1,-225,390.8,9.2], [2,-221,391.5,8.1]]) {
    const bed = new T.Group();
    bed.position.set(x, -.31, z);
    bed.rotation.y = .49;
    bed.name = 'rectenna-open-crop-bed';
    garden.add(bed);
    box(bed, [2.6,.29,length], [0,.075,0], rim);
    box(bed, [2.3,.08,length-.3], [0,.22,0], soil);
    for (let row = -1; row <= 1; row++) for (let j = 0; j < 9; j++) {
      const u = row * .66, v = (j - 4) * (length - 1) / 9;
      plants.push([x + Math.cos(.49)*u + Math.sin(.49)*v, -.05, z - Math.sin(.49)*u + Math.cos(.49)*v, .27 + hash(i*31+j+row)*.16, .32]);
    }
  }

  // A recessed-looking wet strip between two flush gravel shoulders, off the walking surface.
  surface('rectenna-irrigation-gravel', [[-235,-.281,387],[-233.5,-.281,386.6],[-226,-.126,400.8],[-228,-.126,401.1]], gravel);
  surface('rectenna-irrigation-channel', [[-234.65,-.276,387],[-234.08,-.276,386.9],[-226.6,-.118,400.83],[-227.22,-.118,400.94]], channel);

  const fruit: Point[] = [];
  const bark = paint('#776957', 1);
  for (const [x,z,scale] of [[-235,382,1],[-222,383,.9],[-218,378,.8]]) {
    const stem = new T.Mesh(new T.CylinderGeometry(.09,.17,1.65*scale,6), bark);
    stem.position.set(x,-.36 + .825*scale,z);
    stem.castShadow = true; garden.add(stem);
    for (let i=0;i<5;i++) {
      const a = i*2.4;
      const px = x + Math.cos(a)*.72*scale, pz = z + Math.sin(a)*.72*scale;
      plants.push([px, .78*scale, pz, .99*scale, 1.46*scale]);
      fruit.push([px + Math.cos(a)*.88*scale, 1.49*scale, pz + Math.sin(a)*.88*scale]);
    }
  }
  plantShrubs(garden, plants);
  const matrix = new T.Matrix4();
  const fruits = new T.InstancedMesh(leafyCrown(0).scale(.15,.15,.15), paint('#a97840', .88), fruit.length);
  fruit.forEach(([x,y,z],i) => fruits.setMatrixAt(i, matrix.makeTranslation(x,y,z)));
  garden.add(fruits);

  // Sparse coarse grasses leave an open sightline south of the approach.
  const tuft = new T.BufferGeometry();
  tuft.setAttribute('position', new T.Float32BufferAttribute([
    -.12,0,0, .10,0,0, -.08,.6,.11, 0,0,-.12, 0,0,.11, .14,.49,-.045,
    -.10,0,-.10, .04,0,.05, -.21,.38,-.02,
  ], 3));
  tuft.computeVertexNormals();
  const meadow = new T.InstancedMesh(tuft, new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: 1, color: leaf.color }), 216);
  const pose = new T.Object3D(), tint = new T.Color();
  const patches = [[-234,384,-.35,3,2.5],[-214,394,-.35,3.4,3.5],[-220,414,-.32,2.6,4.2]];
  for (let i=0;i<meadow.count;i++) {
    const patch = i % 3, j = i * 3;
    const [x,z,y,rx,rz] = patches[patch];
    const angle = hash(j)*Math.PI*2, d = Math.sqrt(hash(j+1));
    pose.position.set(x+Math.cos(angle)*rx*d,y,z+Math.sin(angle)*rz*d);
    pose.rotation.y = hash(j+2)*Math.PI*2;
    pose.scale.setScalar(.5+hash(j+3)*1.15);
    pose.updateMatrix();
    meadow.setMatrixAt(i,pose.matrix);
    meadow.setColorAt(i,tint.setHSL(.16+hash(j+4)*.13,.27,.33+hash(j+5)*.35));
  }
  meadow.name = 'rectenna-meadow'; meadow.receiveShadow = true;
  garden.add(meadow);
  return garden;
}
