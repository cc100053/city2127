import * as T from 'three';

type Opening = readonly [
  start: number, end: number, fromHeight: number, toHeight: number, below: number, above: number,
  screen?: 'screen',
];

// Heights are measured from the tier's toe, spans as fractions of its frontage.
// Stagger the high ends and low ends along the stack to carry the sweeps across tiers.
const openings: readonly (readonly Opening[])[] = [
  [[.018, .33, 5, 8.2, 3.8, 4.8], [.35, .63, 8.7, 4.2, 3.5, 4.5, 'screen'], [.65, .99, 5.2, 4.2, 4.1, 8.2]],
  [[.012, .24, 4, 8.2, 3.3, 6], [.25, .54, 8.7, 4.7, 3, 5.8], [.55, .77, 4.4, 8.8, 3, 6.3], [.78, .983, 9.1, 5, 4.5, 3.7, 'screen']],
  [[.012, .22, 9.5, 4.7, 4, 4, 'screen'], [.23, .58, 4.4, 9.5, 3.4, 5.6], [.59, .82, 9.4, 4.8, 3.7, 3.8], [.83, .986, 4.6, 7.4, 3.5, 5.7]],
  [[.015, .30, 4.3, 9.4, 3.7, 5.5], [.31, .53, 9.7, 7, 6.2, 3.8, 'screen'], [.54, .985, 7.2, 4.5, 4.5, 6.3]],
  [[.012, .29, 9.4, 5.2, 4.6, 4.1], [.3, .60, 5, 9.4, 3.7, 6.2], [.61, .758, 9.4, 8.3, 5.4, 2.8, 'screen'], [.77, .988, 8.1, 4.4, 3.5, 5.4]],
  [[.013, .31, 4, 9.4, 3.5, 6.2], [.32, .57, 9.6, 4.5, 3.9, 3.4, 'screen'], [.58, .987, 4.3, 8.2, 3.4, 7]],
  [[.014, .29, 7.9, 4.7, 3.5, 4, 'screen'], [.30, .585, 4.5, 8.5, 3.6, 6.7], [.597, .985, 8.8, 5, 4.7, 4.7]],
  [[.015, .41, 4.1, 8.5, 3, 6.7], [.425, .984, 8.8, 5.2, 4.7, 5.2]],
];

type Finish = 'shell' | 'silver' | 'shadow' | 'glass' | 'cove';
type Tier = {
  tier: number;
  from: number;
  to: number;
  height: number;
  entrance: number;
  /** Project local façade coordinates onto this tier's curved frontage. */
  point: (u: number, height: number, inset: number) => T.Vector3;
  surface: (finish: Finish, geometry: T.BufferGeometry) => void;
  bar: (finish: Finish, a: T.Vector3, b: T.Vector3, width: number, height: number) => void;
};

/** Swept frames, recessed glazing and shallow interior rooms specific to the hull's eight-tier elevation. */
export function buildHullFacade({ tier, from, to, height, entrance, point, surface, bar }: Tier) {
  const toe = .72, crown = height - .5, skin = -.85, glassDepth = 1.42, backDepth = 7.6;
  const strip = (finish: Finish, lower: T.Vector3[], upper: T.Vector3[]) => {
    const positions: number[] = [], uv: number[] = [];
    for (let i = 1; i < lower.length; i++) {
      for (const p of [lower[i - 1], upper[i - 1], lower[i], lower[i], upper[i - 1], upper[i]]) {
        positions.push(p.x, p.y, p.z);
      }
      if (finish === 'cove') uv.push(i - 1, 0, i - 1, 1, i, 0, i, 0, i - 1, 1, i, 1);
    }
    const mesh = new T.BufferGeometry();
    mesh.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    if (finish === 'cove') mesh.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    mesh.computeVertexNormals();
    surface(finish, mesh);
    mesh.dispose();
  };
  const tipRim = .89;
  const join = (a: number, b: number, startHeight: number, endHeight: number) => {
    const sill = [point(a, startHeight - tipRim, skin), point(b, endHeight - tipRim, skin)];
    const head = [point(a, startHeight + tipRim, skin), point(b, endHeight + tipRim, skin)];
    strip('shadow', [point(a, toe, skin), point(b, toe, skin)], sill);
    strip('silver', sill, head);
    strip('shadow', head, [point(a, crown, skin), point(b, crown, skin)]);
  };
  let last = from, lastHeight = 4.1;
  for (const [start, end, fromHeight, toHeight, below, above, kind] of openings[tier]) {
    const a = T.MathUtils.lerp(from, to, start), b = T.MathUtils.lerp(from, to, end);
    join(last, a, lastHeight, fromHeight);
    last = b;
    lastHeight = toHeight;
    // Sample the apex and the mullions on the same curve so none cross a curved reveal.
    const panes = Math.ceil((b - a) / 3.4), segments = panes * 4;
    const samples = Array.from({ length: segments + 1 }, (_, i) => {
      const t = i / segments;
      const taper = Math.pow(Math.sin(Math.PI * t), .82);
      const centre = T.MathUtils.lerp(fromHeight, toHeight, T.MathUtils.smoothstep(t, 0, 1));
      const u = T.MathUtils.lerp(a, b, t);
      const entry = tier === 0 ? 1 - T.MathUtils.smoothstep(Math.abs(u - entrance), 2.45, 6.5) : 0;
      return {
        u,
        lower: T.MathUtils.lerp(Math.max(toe + .48, centre - below * taper * (1.26 - .52 * t)), toe + .08, entry),
        upper: Math.min(crown - .48, centre + above * taper * (.68 + .64 * t)),
        sillRim: tipRim + 1.16 * taper * (1 - t),
        headRim: tipRim + 1.71 * taper * t,
      };
    });
    const bottom = samples.map(({ u, lower }) => point(u, lower, -1.16));
    const top = samples.map(({ u, upper }) => point(u, upper, -1.16));
    const lowerRim = samples.map(({ u, lower, sillRim }) => point(u, Math.max(toe, lower - sillRim), skin));
    const upperRim = samples.map(({ u, upper, headRim }) => point(u, Math.min(crown, upper + headRim), skin));
    const innerBottom = samples.map(({ u, lower, upper }) => point(u, Math.min(lower + .13, (upper + lower) / 2), glassDepth));
    const innerTop = samples.map(({ u, lower, upper }) => point(u, Math.max(upper - .13, (upper + lower) / 2), glassDepth));

    strip('shadow', samples.map(({ u }) => point(u, toe, skin)), lowerRim);
    strip('shadow', upperRim, samples.map(({ u }) => point(u, crown, skin)));
    strip('silver', lowerRim, bottom);
    strip('silver', top, upperRim);
    strip('shell', bottom, innerBottom);
    strip('silver', innerTop, top);
    if (tier === 0 && entrance > a && entrance < b) {
      let firstDoorSegment = 0, lastDoorSegment = segments;
      while (samples[firstDoorSegment].u < entrance - 2.45) firstDoorSegment++;
      while (samples[lastDoorSegment].u > entrance + 2.45) lastDoorSegment--;
      strip('glass', innerBottom.slice(0, firstDoorSegment + 1), innerTop.slice(0, firstDoorSegment + 1));
      strip('glass', samples.slice(firstDoorSegment, lastDoorSegment + 1).map(({ u }) => point(u, 4.35, glassDepth)),
        innerTop.slice(firstDoorSegment, lastDoorSegment + 1));
      strip('glass', innerBottom.slice(lastDoorSegment), innerTop.slice(lastDoorSegment));
      for (const { u } of [samples[firstDoorSegment], samples[lastDoorSegment]]) {
        bar('shadow', point(u, 1, glassDepth), point(u, 4.35, glassDepth), .21, .28);
      }
    } else strip('glass', innerBottom, innerTop);

    for (let i = 4; i < segments; i += 4) {
      const { u, lower, upper } = samples[i];
      const base = tier === 0 && Math.abs(u - entrance) < 2.45 ? 4.35 : lower;
      bar('shadow', point(u, base, glassDepth + .035), point(u, upper, glassDepth + .035), .17, .23);
    }

    // Ceiling wash and pale mezzanines sit behind the panes, with unlit rooms between them.
    for (let i = 1; i <= panes; i++) {
      const row = samples.slice((i - 1) * 4, i * 4 + 1);
      const dark = kind === 'screen' ? (i + tier) % 5 > 1 : (i + tier * 5 + Math.round(a)) % 7 < 2;
      strip(dark ? 'shadow' : 'cove',
        row.map(({ u, lower }) => point(u, lower, backDepth)),
        row.map(({ u, upper }) => point(u, upper, backDepth)));
      const near = row[0], far = row[4], mezzanine = 5.8;
      if (b - a > 31 && Math.min(near.upper, far.upper) > mezzanine + .6 && Math.max(near.lower, far.lower) < mezzanine - .55) {
        bar('shell', point(near.u, mezzanine, 5.75), point(far.u, mezzanine, 5.75), 3.1, .31);
      }
    }
    strip('shell', innerBottom, samples.map(({ u, lower }) => point(u, lower, backDepth)));
    strip('silver', samples.map(({ u, upper }) => point(u, upper, backDepth)), innerTop);

    if (kind === 'screen') {
      // Diamond lattice laid into selected vents, following the curves at the edge.
      const latticeDepth = .36;
      for (const [i, { u, lower, upper }] of samples.entries()) {
        const next = samples[i + 4];
        if (i % 4 !== 0 || !next) continue;
        for (let j = 0; j < 4; j++) {
          const base = (j + .04) / 4, tip = (j + 1 - .04) / 4;
          const p = (x: number, lo: number, hi: number, t: number) => point(x, T.MathUtils.lerp(lo, hi, t), latticeDepth);
          bar('silver', p(u, lower, upper, base), p(next.u, next.lower, next.upper, tip), .24, .37);
          bar('silver', p(u, lower, upper, tip), p(next.u, next.lower, next.upper, base), .24, .37);
        }
      }
    }
  }
  join(last, to, lastHeight, 6.8);
}
