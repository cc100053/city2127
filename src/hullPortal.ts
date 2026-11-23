import * as T from 'three';
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

const worldBounds = opening.clone().applyMatrix4(root);

type Vertex = { point: T.Vector3; normal: T.Vector3; uv: T.Vector2 | undefined };

const sides: ((p: T.Vector3) => number)[] = [
  p => p.x - opening.min.x, p => opening.max.x - p.x,
  p => p.y - opening.min.y, p => opening.max.y - p.y,
  p => p.z - opening.min.z, p => opening.max.z - p.z,
];

/** Cut the nominal opening through the old bulkhead and deck edges, keeping the original faces and UVs around it. */
export function cutHullBowOpening(geometry: T.BufferGeometry) {
  geometry.computeBoundingBox();
  if (!geometry.boundingBox?.intersectsBox(worldBounds)) return;
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
  const triangle = new T.Triangle();
  const local = [triangle.a, triangle.b, triangle.c];
  const points: number[] = [], normals: number[] = [], texcoords: number[] = [];
  let changed = false;

  for (let i = 0; i < position.count; i += 3) {
    for (const [j, p] of local.entries()) p.fromBufferAttribute(position, i + j).applyMatrix4(inverse);
    if (!opening.intersectsTriangle(triangle)) {
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
      return point.applyMatrix4(root);
    });
  });
}

function band(outer: Profile, inner: Profile) {
  const a = outline(outer), b = outline(inner);
  const edges = a.map((point, i) => [point, b[i]] as const);
  edges.push(edges[0]); // Keep the metre UV continuous across the strip's closing segment.
  const uv = hullFrameUv(edges);
  const positions: number[] = [], coords: number[] = [], indices: number[] = [];
  for (const [i, [outerPoint, innerPoint]] of edges.entries()) {
    positions.push(...outerPoint.toArray(), ...innerPoint.toArray());
    coords.push(uv[i].along, uv[i].low, uv[i].along, uv[i].high);
    if (i + 1 < edges.length) {
      const start = i * 2;
      indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(coords, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const normals = geometry.getAttribute('normal');
  const normal = new T.Vector3(), endNormal = new T.Vector3();
  for (let i = 0; i < 2; i++) {
    const end = a.length * 2 + i;
    normal.fromBufferAttribute(normals, i).add(endNormal.fromBufferAttribute(normals, end)).normalize();
    normals.setXYZ(i, normal.x, normal.y, normal.z);
    normals.setXYZ(end, normal.x, normal.y, normal.z);
  }
  return geometry;
}

type Finish = 'frame' | 'panel' | 'guide' | 'dark';

export function buildHullBowPortal(surface: (finish: Finish, geometry: T.BufferGeometry) => void) {
  const flange = { u: face - .34, side: 2.9, crown: 3.6, sill: 2.1, radius: 3.9, fold: { reach: 2.1, inset: 2.55 } };
  const shoulder = { u: face + .83, side: 2.12, crown: 2.9, sill: 1.86, radius: 3.2, fold: { reach: 2.18, inset: 0 } };
  const lip = { u: face + 1.02, side: .99, crown: 1.36, sill: 1.02, radius: 2.1, fold: { reach: 0, inset: 0 } };
  const throat = { u: face + .13, side: .32, crown: .32, sill: .32, radius: .7, fold: { reach: .49, inset: .06 } };
  const guideTop = { u: face + .08, side: .40, crown: .40, sill: .40, radius: .80, fold: { reach: .38, inset: .08 } };
  const guideBottom = { u: face - .06, side: .14, crown: .14, sill: .14, radius: .39, fold: { reach: 0, inset: .08 } };
  const liner = { u: face - 1.12, side: 0, crown: 0, sill: 0, radius: 0 };
  const back = { ...liner, u: recess };
  const finishBand = (finish: Finish, outer: Profile, inner: Profile) => {
    const geometry = band(outer, inner);
    surface(finish, geometry);
    geometry.dispose();
  };
  finishBand('panel', flange, shoulder);
  finishBand('frame', shoulder, lip);
  finishBand('frame', lip, throat);
  finishBand('panel', throat, guideTop);
  finishBand('guide', guideTop, guideBottom);
  finishBand('frame', guideBottom, liner);
  finishBand('panel', liner, back);

  // The deep end disappears into the unmodelled hull interior beyond this entrance.
  const shadow = new T.PlaneGeometry(width, height * 2).rotateY(Math.PI / 2)
    .translate(recess, mid, centre).applyMatrix4(root);
  surface('dark', shadow);
  shadow.dispose();
}
