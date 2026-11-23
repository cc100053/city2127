import * as T from 'three';
import { hullFront } from './hullFacade.ts';
import { HULL } from './megaFootprints.ts';
import { hullFrameUv } from './hullMetals.ts';

// Hull-local metres. The mouth keeps R6's centre and rectangular opening.
export const HULL_BOW_PORTAL = {
  centre: 12.75, width: 18, bottom: 9, top: 23,
  face: HULL.length / 2 + 2.6, recess: 83.5,
};

const { centre, width, bottom, top, face, recess } = HULL_BOW_PORTAL;
const half = width / 2, mid = (top + bottom) / 2, height = (top - bottom) / 2;
const root = new T.Matrix4().makeRotationY(HULL.yaw).setPosition(HULL.x, 0, HULL.z);
const inverse = root.clone().invert();
const opening = new T.Box3(
  new T.Vector3(recess, bottom, centre - half),
  new T.Vector3(face + 2, top, centre + half),
);

// The second cut opens the seaward flank, while the axial opening retains its full clearance.
const flank = [
  new T.Vector2(90.5, 8.3),
  new T.Vector2(86.1, 8.65),
  new T.Vector2(83.6, 9.2),
  new T.Vector2(81.8, 10.5),
  new T.Vector2(80.55, 12.45),
  new T.Vector2(80, 15),
  new T.Vector2(80, 18.6),
  new T.Vector2(80.6, 20.8),
  new T.Vector2(81.35, 22.2),
  new T.Vector2(82.85, 23.2),
  new T.Vector2(85.4, 24.1),
  new T.Vector2(88.6, 24.75),
  new T.Vector2(92, 25.05),
];
const cutEnd = face + 5, flankDepth = centre + half - .01;
const flankBottom = flank[0].y, flankTop = flank[flank.length - 1].y;
export const HULL_BOW_FLANK_AT_DECK = Math.min(...flank.map(point => point.x));
const flankBounds = new T.Box3(new T.Vector3(HULL_BOW_FLANK_AT_DECK, flankBottom, -8), new T.Vector3(cutEnd, flankTop, flankDepth));

type Vertex = { point: T.Vector3; normal: T.Vector3; uv: T.Vector2 | undefined };
type HalfSpace = (point: T.Vector3) => number;

function cutVolume(bounds: T.Box3, extraSides: HalfSpace[] = []) {
  const { min, max } = bounds;
  const sides: HalfSpace[] = [
    p => p.x - min.x, p => max.x - p.x,
    p => p.y - min.y, p => max.y - p.y,
    p => p.z - min.z, p => max.z - p.z,
    ...extraSides,
  ];
  return { bounds, worldBounds: bounds.clone().applyMatrix4(root), sides };
}

const axialCut = cutVolume(opening);
const flankCut = cutVolume(flankBounds, flank.slice(1).map((end, i) => {
  const start = flank[i], slope = (end.x - start.x) / (end.y - start.y);
  return p => p.x - start.x - (p.y - start.y) * slope;
}));

/** Keep the original faces and UVs around the opening and its seaward cut. */
export function cutHullBowOpening(geometry: T.BufferGeometry) {
  subtract(geometry, axialCut);
  subtract(geometry, flankCut);
}

function subtract(geometry: T.BufferGeometry, { bounds, worldBounds, sides }: ReturnType<typeof cutVolume>) {
  geometry.computeBoundingBox();
  if (!geometry.boundingBox?.intersectsBox(worldBounds)) return;
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
  const triangle = new T.Triangle();
  const local = [triangle.a, triangle.b, triangle.c];
  const points: number[] = [], normals: number[] = [], texcoords: number[] = [];
  let changed = false;

  for (let i = 0; i < position.count; i += 3) {
    for (const [j, p] of local.entries()) p.fromBufferAttribute(position, i + j).applyMatrix4(inverse);
    if (!bounds.intersectsTriangle(triangle) || sides.some(side => local.every(point => side(point) < 0))) {
      for (let j = i; j < i + 3; j++) {
        points.push(position.getX(j), position.getY(j), position.getZ(j));
        normals.push(normal.getX(j), normal.getY(j), normal.getZ(j));
        if (uv) texcoords.push(uv.getX(j), uv.getY(j));
      }
      continue;
    }

    changed = true;
    let inside: Vertex[] = local.map((point, j) => ({
      point: point.clone(),
      normal: new T.Vector3().fromBufferAttribute(normal, i + j),
      uv: uv && new T.Vector2(uv.getX(i + j), uv.getY(i + j)),
    }));
    for (const side of sides) {
      const outer: Vertex[] = [], inner: Vertex[] = [];
      for (const [j, a] of inside.entries()) {
        const b = inside[(j + 1) % inside.length], da = side(a.point), db = side(b.point);
        (da >= 0 ? inner : outer).push(a);
        if ((da >= 0) === (db >= 0)) continue;
        const t = da / (da - db);
        const cross = {
          point: a.point.clone().lerp(b.point, t),
          normal: a.normal.clone().lerp(b.normal, t).normalize(),
          uv: a.uv && b.uv && a.uv.clone().lerp(b.uv, t),
        };
        inner.push(cross);
        outer.push(cross);
      }
      for (let j = 1; j + 1 < outer.length; j++) {
        const [a, b, c] = [outer[0], outer[j], outer[j + 1]];
        if (b.point.clone().sub(a.point).cross(c.point.clone().sub(a.point)).lengthSq() < 1e-12) continue;
        for (const { point, normal: n, uv: st } of [a, b, c]) {
          points.push(...point.clone().applyMatrix4(root).toArray());
          normals.push(...n.toArray());
          if (st) texcoords.push(...st.toArray());
        }
      }
      inside = inner;
    }
  }
  if (!changed) return;
  geometry.boundingBox = null;
  geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  if (uv) geometry.setAttribute('uv', new T.Float32BufferAttribute(texcoords, 2));
}

type Profile = {
  u: number; side: number; crown: number; sill: number; radius: number;
  fold?: { reach: number; inset: number };
};

const seawardShoulderDepth = -.55;
const foldSlope = Math.tan(T.MathUtils.degToRad(35));

function outline({ u, side, crown, sill, radius, fold }: Profile) {
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([d, y], corner) =>
    Array.from({ length: 9 }, (_, step) => {
      const angle = (corner + step / 8) * Math.PI / 2;
      const across = d * (half + side - radius) + Math.cos(angle) * radius;
      const rise = y * (height + (y > 0 ? crown : sill) - radius) + Math.sin(angle) * radius;
      return new T.Vector3(u, mid + rise, centre + across);
    }));
  return corners.flatMap((arc, corner) => {
    // Sample the horizontal runs so the turned end blends into the original curve before the far jamb.
    const points = corner % 2 === 0
      ? [...arc, ...Array.from({ length: 11 }, (_, i) =>
          arc[arc.length - 1].clone().lerp(corners[corner + 1][0], (i + 1) / 12))]
      : arc;
    return points.map(point => {
      if (fold) {
        const turn = 1 - T.MathUtils.smoothstep(point.z, 4, centre);
        point.z -= fold.reach * turn;
        // Turn the silver face toward the sea and set the guide slightly behind that plane.
        const plane = face - .06 + (point.z - seawardShoulderDepth) * foldSlope - fold.inset;
        point.x = T.MathUtils.lerp(u, plane, turn);
      }
      return point;
    });
  });
}

function loft(rows: T.Vector3[][]) {
  const stride = rows[0].length;
  const strips = [...rows, rows[0]];
  const grain = hullFrameUv(strips.map(row => [row[0], row[stride - 1]]));
  const positions: number[] = [], coords: number[] = [], indices: number[] = [];
  for (const [i, row] of strips.entries()) {
    const { along, low, high } = grain[i];
    for (const [j, point] of row.entries()) {
      positions.push(...point.toArray());
      coords.push(along, T.MathUtils.lerp(low, high, j / (stride - 1)));
      if (i === 0 || j === 0) continue;
      const d = i * stride + j, c = d - 1, b = d - stride, a = b - 1;
      indices.push(a, b, c, c, b, d);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(coords, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const normals = geometry.getAttribute('normal');
  const normal = new T.Vector3(), endNormal = new T.Vector3();
  for (let i = 0; i < stride; i++) {
    const end = rows.length * stride + i;
    normal.fromBufferAttribute(normals, i).add(endNormal.fromBufferAttribute(normals, end)).normalize();
    normals.setXYZ(i, normal.x, normal.y, normal.z);
    normals.setXYZ(end, normal.x, normal.y, normal.z);
  }
  return { geometry: geometry.applyMatrix4(root), indices };
}

type Finish = 'frame' | 'panel' | 'guide' | 'dark';

function buildBowFrame(surface: (finish: Finish, geometry: T.BufferGeometry) => void) {
  const stations = flank.flatMap(({ x, y }, i) => {
    const before = flank[Math.max(0, i - 1)], after = flank[Math.min(i + 1, flank.length - 1)];
    const outward = new T.Vector2(before.y - after.y, after.x - before.x).normalize();
    // Return across the exposed deck nose before continuing up the upper skin.
    const setbacks = y === 15 ? [0, .12, .42, .72, .93, 1] : [y < 15 ? 0 : 1];
    return setbacks.map(setback => ({ x, y, setback, outward }));
  });

  // Sample both silver lips and the recessed gasket in the same rolled section.
  // Shared vertex normals carry the shoulders across the material boundaries.
  const section: [width: number, relief: number, advance: number][] = [
    [0, 0, .13], [.23, .24, .43], [.50, .55, .72], [.80, .56, .81],
    [1.05, .39, .72], [1.24, .23, .58], [1.48, .27, .61],
    [1.69, .55, .84], [2.04, .81, 1.05], [2.60, .90, 1.13],
    [3.22, .76, 1.01], [3.86, .46, .69], [4.42, .13, .17], [4.72, -.05, -.20],
  ];
  const side = stations.map(({ x, y, setback, outward }) => {
    const upper = Math.exp(-(((y - 22.2) / 2.5) ** 2));
    const lower = Math.exp(-(((y - 10.3) / 1.75) ** 2));
    const crown = T.MathUtils.smoothstep(y, 22.2, 25.05);
    return section.map(([width, relief]) => {
      const spread = T.MathUtils.smoothstep(width, 1.65, 4.72);
      const u = x + outward.x * width - spread * (3.8 * upper + 2.9 * lower);
      const rise = y + outward.y * width * (1 - .39 * crown) + .035 * setback
        + spread * (1.25 * upper - 1.05 * lower);
      const skin = T.MathUtils.lerp(hullFront(0, u), hullFront(1, u), setback) - .88;
      return new T.Vector3(u, rise, skin - relief);
    });
  });
  // The near side stays swept into the seaward cut. The end-wall half follows an ellipse,
  // sized to put the new visible shoulders outside the original rectangular opening.
  const end = Array.from({ length: 33 }, (_, i) => {
    const angle = Math.PI * i / 32;
    return section.map(([width, , advance], j) => {
      const crown = side[side.length - 1][j].y + .22;
      const sill = 8.48 - .52 * width;
      const d = centre + (13.8 + .87 * width) * Math.sin(angle);
      const y = mid + Math.cos(angle) * (angle < Math.PI / 2 ? crown - mid : mid - sill);
      // Keep the crest skimming the outside of the end wall as it leaves the flank.
      const crest = 1 - T.MathUtils.smoothstep(angle, 0, Math.PI / 4);
      return new T.Vector3(face + T.MathUtils.lerp(advance, Math.max(advance, .05), crest), y, d);
    });
  });
  // Pass outside the upper bulkhead corner before sweeping across its face.
  const lastSide = side[side.length - 1];
  const bulkheadCorner = hullFront(1, HULL.length / 2);
  const shoulder = end[0].map((point, j) => new T.Vector3(
    point.x + .22, T.MathUtils.lerp(lastSide[j].y, point.y, .3), Math.min(bulkheadCorner - .28, lastSide[j].z + .23),
  ));
  // Carry the sill around the outside of the corner stiffener before turning back onto the flank.
  const elbow = end[end.length - 1].map((point, j) =>
    new T.Vector3(point.x + .92, T.MathUtils.lerp(point.y, side[0][j].y, .12), -.78));

  const columns = section.map((_, j) => new T.CatmullRomCurve3([
    ...side.map(row => row[j]), shoulder[j], ...end.map(row => row[j]), elbow[j],
  ], true));
  const samples = (side.length + end.length + 2) * 3;
  const rows = Array.from({ length: samples }, (_, i) => columns.map(curve => curve.getPoint(i / samples)));
  const { geometry, indices } = loft(rows);
  const bands = [
    { finish: 'frame', from: 0, to: 5 },
    { finish: 'dark', from: 5, to: 6 },
    { finish: 'frame', from: 6, to: section.length - 1 },
  ] satisfies { finish: Finish; from: number; to: number }[];
  const stride = (section.length - 1) * 6;
  for (const { finish, from, to } of bands) {
    const strip: number[] = [];
    for (let i = 0; i < indices.length; i += stride) {
      strip.push(...indices.slice(i + from * 6, i + to * 6));
    }
    geometry.setIndex(strip);
    const flat = geometry.toNonIndexed();
    subtract(flat, axialCut);
    surface(finish, flat);
    flat.dispose();
  }
  geometry.dispose();
}

function buildFlankLining(surface: (finish: Finish, geometry: T.BufferGeometry) => void) {
  const point = (u: number, y: number, d: number) => new T.Vector3(u, y, d).applyMatrix4(root);
  const strip = (finish: Finish, edges: [T.Vector3, T.Vector3][]) => {
    const grain = hullFrameUv(edges);
    const positions: number[] = [], uv: number[] = [];
    for (let i = 1; i < edges.length; i++) {
      const [a, b] = edges[i - 1], [c, d] = edges[i];
      for (const vertex of [a, b, c, c, b, d]) positions.push(...vertex.toArray());
      const [first, next] = [grain[i - 1], grain[i]];
      uv.push(first.along, first.low, first.along, first.high, next.along, next.low,
        next.along, next.low, first.along, first.high, next.along, next.high);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    subtract(geometry, axialCut);
    surface(finish, geometry);
    geometry.dispose();
  };
  // Finish the exposed cut itself. Split at the 15 m step so the edge meets each skin.
  const lower = flank.filter(({ y }) => y <= 15);
  const upper = flank.filter(({ y }) => y >= 15);
  for (const [tier, edge] of [lower, upper].entries()) {
    const skin = (u: number) => hullFront(tier, u) - .88;
    const rim = (u: number) => skin(u) - .24;
    strip('panel', edge.map(({ x, y }) => [
      point(x, y, flankDepth), point(x, y, skin(x)),
    ]));
    strip('guide', edge.map(({ x, y }) => [
      point(x + .17, y, skin(x) + .12), point(x - .09, y, rim(x)),
    ]));
  }

  const deck = lower[lower.length - 1];
  const deckEnds = [hullFront(0, deck.x), hullFront(1, deck.x)].map(d => d - 1.12);
  strip('guide', deckEnds.map(d => [point(deck.x + .17, deck.y + .05, d), point(deck.x - .09, deck.y + .05, d)]));

  // Line the part of the soffit and sill that is now exposed from the side.
  for (const [tier, edge] of [flank[0], flank[flank.length - 1]].entries()) {
    const edges: [T.Vector3, T.Vector3][] = [edge.x, face].map(u => {
      const seaward = point(u, edge.y, hullFront(tier, u) - .88), inland = point(u, edge.y, flankDepth);
      return tier === 0 ? [seaward, inland] : [inland, seaward];
    });
    strip('panel', edges);
  }

  // Close the deep return beside the axial liner, where the flank extends behind it.
  const returnWall = new T.Shape();
  returnWall.moveTo(-face, flankBottom);
  for (const { x, y } of flank) returnWall.lineTo(-x, y);
  returnWall.lineTo(-face, flankTop);
  returnWall.closePath();
  const shape = new T.ShapeGeometry(returnWall);
  const lining = shape.toNonIndexed().rotateY(Math.PI).translate(0, 0, flankDepth).applyMatrix4(root);
  subtract(lining, axialCut);
  surface('dark', lining);
  lining.dispose();
  shape.dispose();
}

/** Batch the editable Blender skin with the existing silver and dark hull finishes. */
function buildBlenderBowFrame(model: T.Group, surface: (finish: Finish, geometry: T.BufferGeometry) => void) {
  const parts: { mesh: T.Mesh; finish: 'frame' | 'dark' }[] = [];
  model.updateWorldMatrix(true, true);
  model.traverse(part => {
    if (!(part instanceof T.Mesh) || Array.isArray(part.material)) return;
    const name = part.material.name;
    if (name === 'bow_silver' || name === 'bow_recess') {
      parts.push({ mesh: part, finish: name === 'bow_silver' ? 'frame' : 'dark' });
    }
  });
  if (!parts.some(({ finish }) => finish === 'frame') || !parts.some(({ finish }) => finish === 'dark')) return false;

  for (const { mesh, finish } of parts) {
    const flat = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    flat.applyMatrix4(root.clone().multiply(mesh.matrixWorld));
    subtract(flat, axialCut);
    surface(finish, flat);
    flat.dispose();
  }
  return true;
}

export function buildHullBowPortal(surface: (finish: Finish, geometry: T.BufferGeometry) => void, model?: T.Group) {
  const throat = { u: face + .13, side: .32, crown: .32, sill: .32, radius: .7, fold: { reach: .49, inset: .06 } };
  const guideTop = { u: face + .08, side: .40, crown: .40, sill: .40, radius: .80, fold: { reach: .38, inset: .08 } };
  const guideBottom = { u: face - .06, side: .14, crown: .14, sill: .14, radius: .39, fold: { reach: 0, inset: .08 } };
  const liner = { u: face - 1.12, side: 0, crown: 0, sill: 0, radius: 0 };
  const back = { ...liner, u: recess };
  const finishBand = (finish: Finish, outer: Profile, inner: Profile) => {
    const a = outline(outer), b = outline(inner);
    const { geometry } = loft(a.map((point, i) => [point, b[i]]));
    const flat = geometry.toNonIndexed();
    subtract(flat, flankCut);
    surface(finish, flat);
    flat.dispose();
    geometry.dispose();
  };
  finishBand('panel', throat, guideTop);
  finishBand('guide', guideTop, guideBottom);
  finishBand('frame', guideBottom, liner);
  finishBand('panel', liner, back);

  buildFlankLining(surface);
  if (!model || !buildBlenderBowFrame(model, surface)) buildBowFrame(surface);

  // The deep end disappears into the unmodelled hull interior beyond this entrance.
  const shadow = new T.PlaneGeometry(width, height * 2).rotateY(Math.PI / 2)
    .translate(recess, mid, centre).applyMatrix4(root);
  surface('dark', shadow);
  shadow.dispose();
}
