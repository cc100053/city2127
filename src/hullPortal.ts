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

function outline({ u, side, crown, sill, radius, fold }: Profile, inlandOnly = false) {
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([d, y], corner) =>
    Array.from({ length: 9 }, (_, step) => {
      const angle = (corner + step / 8) * Math.PI / 2;
      const across = d * (half + side - radius) + Math.cos(angle) * radius;
      const rise = y * (height + (y > 0 ? crown : sill) - radius) + Math.sin(angle) * radius;
      return new T.Vector3(u, mid + rise, centre + across);
    }));
  if (inlandOnly) {
    const top = corners[0].reverse(), bottom = corners[3].reverse();
    return [top[0].clone().setZ(centre), ...top, ...bottom, bottom[bottom.length - 1].clone().setZ(centre)];
  }
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
  return geometry.applyMatrix4(root);
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

  // Match each column on the flank to the same part of the rolled section on the end wall.
  type Section = readonly [width: number, relief: number, axialSpread: number, advance: number];
  const inner: Section[] = [[0, 0, 0, .13], [.19, .16, .14, .40], [.37, .56, .30, .73],
    [.69, .75, .52, .98], [.98, .68, .72, 1], [1.12, .42, .89, .76]];
  const groove: Section[] = [inner[inner.length - 1], [1.29, .25, 1.04, .63], [1.52, .28, 1.16, .69]];
  const outer: Section[] = [groove[groove.length - 1], [1.66, .73, 1.29, 1.02], [1.91, 1.08, 1.48, 1.27],
    [2.34, 1.16, 1.78, 1.30], [2.95, .96, 2.14, 1.14], [3.6, .54, 2.43, .79],
    [4.12, .18, 2.68, .22], [4.45, -.13, 2.85, -.45]];
  // Keep the crown and sill outside the R9 cut as the loft turns onto the end wall.
  const turn = (from: T.Vector3[][], to: T.Vector3[][]) => {
    const start = from[from.length - 1], end = to[0];
    const curves = start.map((point, j) => {
      const reach = Math.min(2.4, point.distanceTo(end[j]) * .38);
      const outgoing = point.clone().sub(from[from.length - 2][j]).normalize();
      const incoming = end[j].clone().sub(to[1][j]).normalize();
      return new T.CubicBezierCurve3(point, point.clone().addScaledVector(outgoing, reach),
        end[j].clone().addScaledVector(incoming, reach), end[j]);
    });
    return Array.from({ length: 7 }, (_, i) => curves.map(path => path.getPoint((i + 1) / 8)));
  };
  const sweep = (finish: Finish, section: Section[]) => {
    const side = stations.map(({ x, y, setback, outward }) => section.map(([width, relief]) => {
      const shoulder = Math.exp(-((y - 22) ** 2) / 5) + .6 * Math.exp(-((y - 11.5) ** 2) / 3);
      const spread = width * (1 + .25 * shoulder);
      const u = x + outward.x * spread, rise = y + outward.y * spread;
      const skin = T.MathUtils.lerp(hullFront(0, u), hullFront(1, u), setback) - .88;
      return new T.Vector3(u, rise + .035 * setback, skin - relief);
    }));
    const profiles = section.map(([, , spread, advance]) => outline({
      u: face + advance, side: .32 + 1.08 * spread, crown: .32 + 1.28 * spread,
      sill: .32 + .83 * spread, radius: .7 + 1.46 * spread,
    }, true));
    const end = profiles[0].map((_, i) => profiles.map(profile => profile[i]));
    // Carry the sill around the outside of the corner stiffener before turning back onto the flank.
    const elbow = end[end.length - 1].map((point, j) =>
      new T.Vector3(point.x + .92, T.MathUtils.lerp(point.y, side[0][j].y, .2), -.58));
    const elbowTangent = new T.Vector3(-.8, 0, -.6);
    const pastElbow = elbow.map(point => point.clone().add(elbowTangent));
    const beforeElbow = elbow.map(point => point.clone().sub(elbowTangent));
    const geometry = loft([...side, ...turn(side, end), ...end, ...turn(end, [elbow, pastElbow]),
      elbow, ...turn([beforeElbow, elbow], side)]);
    const flat = geometry.toNonIndexed();
    subtract(flat, axialCut);
    surface(finish, flat);
    flat.dispose();
    geometry.dispose();
  };
  sweep('frame', inner);
  sweep('dark', groove);
  sweep('frame', outer);
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

export function buildHullBowPortal(surface: (finish: Finish, geometry: T.BufferGeometry) => void) {
  const throat = { u: face + .13, side: .32, crown: .32, sill: .32, radius: .7, fold: { reach: .49, inset: .06 } };
  const guideTop = { u: face + .08, side: .40, crown: .40, sill: .40, radius: .80, fold: { reach: .38, inset: .08 } };
  const guideBottom = { u: face - .06, side: .14, crown: .14, sill: .14, radius: .39, fold: { reach: 0, inset: .08 } };
  const liner = { u: face - 1.12, side: 0, crown: 0, sill: 0, radius: 0 };
  const back = { ...liner, u: recess };
  const finishBand = (finish: Finish, outer: Profile, inner: Profile) => {
    const a = outline(outer), b = outline(inner);
    const geometry = loft(a.map((point, i) => [point, b[i]]));
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
  buildBowFrame(surface);

  // The deep end disappears into the unmodelled hull interior beyond this entrance.
  const shadow = new T.PlaneGeometry(width, height * 2).rotateY(Math.PI / 2)
    .translate(recess, mid, centre).applyMatrix4(root);
  surface('dark', shadow);
  shadow.dispose();
}
