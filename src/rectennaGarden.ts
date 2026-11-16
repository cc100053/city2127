import * as T from 'three';
import { box, leaf, paint } from './cityRig.ts';
import { hash, plantShrubs } from './coastalCanopy.ts';

// World metres surveyed against the existing walk and the lowest GLB ramp landing.
type Point = [number, number, number];

export function buildFarmGarden(origin: T.Vector3) {
  const garden = new T.Group();
  garden.name = 'rectenna-public-garden';
  garden.position.copy(origin).negate();

  const gravel = paint('#a99c83', .98), soil = paint('#695443', 1);
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
  const surface = (name: string, points: Point[], material: T.Material) => {
    const geometry = new T.BufferGeometry();
    const vertices = points.flat();
    const indices = T.ShapeUtils.triangulateShape(points.map(([x,,z]) => new T.Vector2(x, -z)), []).flat();
    points.forEach(([x,,z]) => vertices.push(x, -.38, z));
    points.forEach((_, i) => {
      const j = (i + 1) % points.length;
      indices.push(i, j, i + points.length, j, j + points.length, i + points.length);
    });
    geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(points.flatMap(([x,,z]) => [x*.8,z*.8]).concat(points.flatMap(([x,,z]) => [x*.8+.19,z*.8+.23])), 2));
    geometry.setIndex(indices);
    const paving = geometry.toNonIndexed();
    paving.computeVertexNormals();
    const mesh = new T.Mesh(paving, material);
    mesh.name = name; mesh.receiveShadow = true;
    garden.add(mesh);
  };
  // The west edge slips under the surveyed walk. The diagonal east edge meets the existing ramp sill.
  surface('rectenna-entry-forecourt', [
    [-234.1,-.181,401.8], [-226,-.14,401.5], [-218,-.111,401.1],
    [-211,-.107,400.9], [-206,-.107,402.7], [-198.1,-.107,406.51],
    [-201.79,-.107,409.59], [-206,-.107,408.05], [-211,-.107,406.8],
    [-218,-.111,406.9], [-226,-.14,407.25], [-230.7,-.174,407.5],
  ], gravel);
  // The rack sits alongside the branch, outside both the walk and the entrance throat.
  const rack = new T.Group();
  rack.name = 'rectenna-seedling-rack';
  rack.position.set(-230.0, -.35, 399.45);
  rack.rotation.y = -1.03;
  garden.add(rack);
  const wood = paint('#79644c', .83), frame = paint('#626762', .76, .18), tray = paint('#4f5a54', .88);
  box(rack, [2.38, .055, .62], [0, .75, 0], wood, .025);
  for (const x of [-1.05, 1.05]) for (const z of [-.24, .24]) {
    box(rack, [.045, .74, .045], [x, .37, z], frame, .015);
  }
  const seedlings: Parameters<typeof plantShrubs>[1] = [];
  for (const x of [-.75, 0, .75]) {
    box(rack, [.55, .067, .48], [x, .81, 0], tray, .025);
    box(rack, [.48, .026, .41], [x, .847, 0], soil, .016);
    for (const u of [-.14, 0, .14]) for (const z of [-.1, .1]) {
      seedlings.push([x + u, .86, z, .045, .125 + .045 * hash(100 * (x + u + z))]);
    }
  }
  plantShrubs(rack, seedlings);
  const edging = paint('#aaa698', .93);
  const walkAngle = Math.atan(.6);
  const borders = [[-234.85, 397.2, 7.4, -.35], [-225.65, 413.0, 8, -.32]];
  for (const [x, z, length, y] of borders) {
    const border = new T.Group();
    border.name = 'rectenna-walk-border';
    border.position.set(x, y, z);
    border.rotation.y = walkAngle;
    garden.add(border);
    box(border, [1.06, .15, length], [-.53, .015, 0], soil, .025);
    box(border, [.16, .25, length], [0, .075, 0], edging, .025);
  }

  const tuft = new T.BufferGeometry();
  tuft.setAttribute('position', new T.Float32BufferAttribute([
    -.12,0,0, .10,0,0, -.08,.6,.11, 0,0,-.12, 0,0,.11, .14,.49,-.045,
    -.10,0,-.10, .04,0,.05, -.21,.38,-.02,
  ], 3));
  tuft.computeVertexNormals();
  const meadow = new T.InstancedMesh(tuft, new T.MeshStandardMaterial({ side: T.DoubleSide, roughness: 1, color: leaf.color }), 216);
  const pose = new T.Object3D(), tint = new T.Color();
  const lateral = new T.Vector3(Math.cos(walkAngle), 0, -Math.sin(walkAngle));
  const along = new T.Vector3(Math.sin(walkAngle), 0, Math.cos(walkAngle));
  for (let i=0; i<meadow.count; i++) {
    const [x, z, length, y] = borders[i % borders.length];
    const j = i * 7;
    pose.position.set(x, y + .085, z)
      .addScaledVector(lateral, -.2 - .67 * hash(j))
      .addScaledVector(along, (hash(j+1) - .5) * (length - .35));
    pose.rotation.y = hash(j+2)*Math.PI*2;
    pose.scale.setScalar(.35+hash(j+3)*.52);
    pose.updateMatrix();
    meadow.setMatrixAt(i,pose.matrix);
    meadow.setColorAt(i,tint.setHSL(.19+hash(j+4)*.10,.27,.35+hash(j+5)*.28));
  }
  meadow.name = 'rectenna-meadow'; meadow.receiveShadow = true;
  garden.add(meadow);
  return garden;
}
