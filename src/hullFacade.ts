import * as T from 'three';

type Opening = readonly [
  start: number, end: number, fromHeight: number, toHeight: number, below: number, above: number,
  kind?: 'screen' | 'west-frame' | 'east-frame' | 'lobby' | 'terrace',
];

export const hullLobby = { start: .65, end: .99, glass: 3.45, back: 17.2 };
const rakeFoot = 1.61, rakeHead = 13.61;

// Heights are measured from the tier's toe, spans as fractions of its frontage.
// Stagger the high ends and low ends along the stack to carry the sweeps across tiers.
const openings: readonly (readonly Opening[])[] = [
  [[.018, .33, 5, 8.2, 3.8, 4.8], [.35, .63, 8.7, 4.2, 3.5, 4.5, 'screen'], [hullLobby.start, hullLobby.end, 6.2, 6.55, 5.3, 9, 'lobby']],
  [[.012, .24, 4, 8.2, 3.3, 6], [.25, .54, 8.7, 4.7, 3, 5.8], [.55, .77, 4.4, 8.8, 3, 6.3], [.78, .983, 9.1, 5, 4.5, 3.7, 'screen']],
  [[.016, .17, rakeFoot, rakeHead, 4.8, 2.2, 'west-frame'], [.18, .34, 13.1, 2.4, 5.9, 3.3, 'screen'],
    [.35, .485, rakeFoot, rakeHead, 4.9, 1.9, 'east-frame'], [.495, .82, 13, 4.8, 5.5, 4.1], [.83, .986, 4.6, 7.4, 3.5, 5.7]],
  [[.025, .118, rakeFoot, rakeHead, 4.2, 1.8, 'west-frame'], [.128, .38, 13, 2.4, 6.3, 3.4, 'screen'],
    [.395, .505, rakeFoot, rakeHead, 4.2, 1.9, 'east-frame'], [.516, .985, 13.1, 4.5, 5.9, 4.6]],
  [[.012, .30, 5.2, 6.8, 4.4, 6.8, 'terrace'], [.31, .39, 6.7, 2.4, 3.1, 3.4],
    [.40, .59, rakeFoot, rakeHead, 5.3, 2.4, 'east-frame'], [.60, .758, 13, 8.3, 7, 2.8, 'screen'], [.77, .988, 8.1, 4.4, 3.5, 5.4]],
  [[.013, .31, 4, 9.4, 3.5, 6.2], [.32, .57, 9.6, 4.5, 3.9, 3.4, 'screen'], [.58, .987, 4.3, 8.2, 3.4, 7]],
  [[.014, .29, 7.9, 4.7, 3.5, 4, 'screen'], [.30, .585, 4.5, 8.5, 3.6, 6.7], [.597, .985, 8.8, 5, 4.7, 4.7]],
  [[.015, .41, 4.1, 8.5, 3, 6.7], [.425, .984, 8.8, 5.2, 4.7, 5.2]],
];

// Fractions of the lower and upper frontages where a frame folds over a deck.
export function hullFrameReturns(tier: number) {
  return openings[tier].flatMap(([, head, , , , , kind]) => {
    if (kind !== 'west-frame' && kind !== 'east-frame') return [];
    const foot = openings[tier + 1]?.find(opening => opening[6] === kind)?.[0];
    return [{ head, foot }];
  });
}

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
  const toe = .72, crown = height - .5, skin = -.85;
  const strip = (finish: Finish, lower: T.Vector3[], upper: T.Vector3[], lighting: 'room' | 'focus' | 'soffit' | 'bounce' | 'lobby-back' = 'room') => {
    const light = { room: 0, focus: 1, soffit: 2, bounce: 3, 'lobby-back': 4 }[lighting];
    const positions: number[] = [], uv: number[] = [];
    for (let i = 1; i < lower.length; i++) {
      for (const p of [lower[i - 1], upper[i - 1], lower[i], lower[i], upper[i - 1], upper[i]]) {
        positions.push(p.x, p.y, p.z);
      }
      if (finish === 'cove') uv.push(light, 0, light, 1, light, 0, light, 0, light, 1, light, 1);
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
    const isLobby = kind === 'lobby', focused = isLobby || kind === 'terrace';
    const rake = kind === 'west-frame' || kind === 'east-frame';
    const glassDepth = isLobby ? hullLobby.glass : 1.42, backDepth = isLobby ? hullLobby.back : 7.6;
    // Sample the apex and the mullions on the same curve so none cross a curved reveal.
    const panes = Math.ceil((b - a) / 3.4), segments = panes * 4;
    const profile = (t: number) => {
      const taper = Math.pow(Math.sin(Math.PI * t), .82);
      const rise = rake ? t + .09 * Math.sin(t * Math.PI * 2) : T.MathUtils.smoothstep(t, 0, 1);
      const centre = T.MathUtils.lerp(fromHeight, toHeight, rise);
      const u = T.MathUtils.lerp(a, b, t);
      const entry = isLobby ? 1 - T.MathUtils.smoothstep(Math.abs(u - entrance), 2.45, 6.5) : 0;
      return {
        u,
        lower: T.MathUtils.lerp(Math.max(toe + .48, centre - below * taper * (1.26 - .52 * t)), toe + .08, entry),
        upper: Math.min(crown - .48, centre + above * taper * (.68 + .64 * t)),
        sillRim: tipRim + 1.16 * taper * (1 - t),
        headRim: tipRim + (rake ? (2.9 + 1.8 * t) * Math.sin(Math.PI * t) : 1.71 * taper * t),
      };
    };
    const samples = Array.from({ length: segments + 1 }, (_, i) => profile(i / segments));
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
    if (isLobby) {
      let firstDoorSegment = 0, lastDoorSegment = segments;
      while (samples[firstDoorSegment].u < entrance - 2.45) firstDoorSegment++;
      while (samples[lastDoorSegment].u > entrance + 2.45) lastDoorSegment--;
      strip('glass', innerBottom.slice(0, firstDoorSegment + 1), innerTop.slice(0, firstDoorSegment + 1));
      strip('glass', samples.slice(firstDoorSegment, lastDoorSegment + 1).map(({ u }) => point(u, 4.35, glassDepth)),
        innerTop.slice(firstDoorSegment, lastDoorSegment + 1));
      strip('glass', innerBottom.slice(lastDoorSegment), innerTop.slice(lastDoorSegment));
      const door = samples.slice(firstDoorSegment, lastDoorSegment + 1);
      for (const { u } of [door[0], door[door.length - 1]]) {
        bar('silver', point(u, .88, glassDepth - .12), point(u, 4.44, glassDepth - .12), .3, .28);
      }
      strip('silver', door.map(({ u }) => point(u, 4.26, glassDepth - .27)),
        door.map(({ u }) => point(u, 4.56, glassDepth - .27)));
    } else strip('glass', innerBottom, innerTop);

    for (let i = 4; i < segments; i += 4) {
      const { u, lower, upper } = samples[i];
      const base = isLobby && Math.abs(u - entrance) < 2.45 ? 4.35 : lower;
      bar('shadow', point(u, base, glassDepth + .035), point(u, upper, glassDepth + .035), .17, .23);
    }

    // Ceiling wash and pale mezzanines sit behind the panes, with unlit rooms between them.
    for (let i = 1; i <= panes; i++) {
      const row = samples.slice((i - 1) * 4, i * 4 + 1);
      const dark = !focused && (kind === 'screen' ? (i + tier) % 5 > 1 : (i + tier * 5 + Math.round(a)) % 7 < 2);
      strip(dark ? 'shadow' : 'cove',
        row.map(({ u, lower }) => point(u, lower, backDepth)),
        row.map(({ u, upper }) => point(u, upper, backDepth)), isLobby ? 'lobby-back' : focused ? 'focus' : 'room');
      const near = row[0], far = row[4], mezzanine = 5.8;
      if (!isLobby && b - a > 31 && Math.min(near.upper, far.upper) > mezzanine + .6 && Math.max(near.lower, far.lower) < mezzanine - .55) {
        bar('shell', point(near.u, mezzanine, 5.75), point(far.u, mezzanine, 5.75), 3.1, .31);
      }
    }
    strip(isLobby ? 'cove' : 'shell', innerBottom, samples.map(({ u, lower }) => point(u, lower, backDepth)), isLobby ? 'bounce' : 'room');
    if (isLobby) {
      // Step the ceiling behind the glass head, leaving a dark reveal at each edge of the warm panel.
      const ceilingAt = (inset: number, drop: number) =>
        samples.map(({ u, upper }) => point(u, upper - drop, inset));
      const nearReveal = ceilingAt(6.25, .12), nearPanel = ceilingAt(6.25, .46);
      const farReveal = ceilingAt(13.6, .12), farPanel = ceilingAt(13.6, .46);
      strip('silver', nearReveal, innerTop);
      strip('shadow', nearPanel, nearReveal);
      strip('cove', farPanel, nearPanel, 'soffit');
      strip('shadow', farReveal, farPanel);
      strip('silver', ceilingAt(backDepth, 0), farReveal);

      // The mezzanine wings leave a full-height view through the middle of the entry.
      for (const [start, end] of [[entrance - 20, entrance - 6], [entrance + 7, entrance + 22]]) {
        bar('shell', point(start, 5.4, 12.8), point(end, 5.4, 12.8), 7.6, .57);
        bar('shadow', point(start, 5.48, 8.94), point(end, 5.48, 8.94), .34, .36);
        strip('cove', [point(start, 5.10, 10), point(end, 5.10, 10)],
          [point(start, 5.10, 9.15), point(end, 5.10, 9.15)], 'soffit');
        strip('cove', [point(start, 5.17, 8.88), point(end, 5.17, 8.88)],
          [point(start, 5.32, 8.88), point(end, 5.32, 8.88)], 'focus');
      }
      for (const offset of [-17, -8.5, 8.5, 17]) {
        const u = entrance + offset;
        const { lower, upper } = profile((u - a) / (b - a));
        bar('shell', point(u, lower, 7.6), point(u, upper, 7.6), .66, .74);
      }
    } else strip('silver', samples.map(({ u, upper }) => point(u, upper, backDepth)), innerTop);

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
