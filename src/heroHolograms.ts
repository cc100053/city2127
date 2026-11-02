import * as T from 'three';
import { HOLOGRAMS } from './layout.ts';
import { glowTexture } from './glowTexture.ts';
import { METER_COLORS } from './districtMeters.ts';
import { LOT_SOCKET_IDS, type LotSocketId } from './surveyView.ts';

// Hero holograms (artifacts/hero-holograms/spec.md, R2): 13 floating information panels and fictional 2127 adverts over the hero panorama, made of light
// like the owner's reference (hologram-style.webp): a near-clear glass pane, thin glowing edges with corner brackets, line-art content, soft halo.
// Placement is measured once (layout.ts HOLOGRAMS); each panel faces the hero eye once and never billboards. Only `voices` is live (proposal count and the
// four Meter rungs); every canvas is drawn once and redrawn only when its data changes. All visible text is Japanese or numerals.
// Every size below is in SCREEN px of the 1600 × 900 hero frame (`d.sc` converts to canvas px): no glyph is smaller than 12 px and titles are at least 18 px.
const FONT = "'Hiragino Sans','Noto Sans JP',sans-serif", NUM = "'SF Mono','Menlo','Consolas',monospace";
const CYAN = '#bff6ff', INK = '#e9fdff', VIOLET = '#c9a8ff', VIOLET_INK = '#f3eaff', GLOW = '#5fd8ff';
const PANE_DAY = new T.Color('#083f50'), PANE_NIGHT = new T.Color('#0b4558');
/** Meter row order and short public labels (RESIDENT_COPY has no short axis words; these are the four question pairs). */
export const HOLOGRAM_AXES = [
  { axis: 'automation', socket: 'nw', label: '人と自律' },
  { axis: 'publicSharing', socket: 'sw', label: '私と共有' },
  { axis: 'environmentalPriority', socket: 'ne', label: '設備と植栽' },
  { axis: 'urbanConcentration', socket: 'se', label: '分散と集中' },
] as const satisfies readonly { axis: keyof typeof METER_COLORS; socket: LotSocketId; label: string }[];
/** Bar length of a ladder rung −3..3 (clamped): 0 … 1. */
export const tierBar = (tier: number) => (Math.min(3, Math.max(-3, tier)) + 3) / 6;

type Ctx = CanvasRenderingContext2D;
type State = { voices: number; tiers: Record<LotSocketId, number> };
/** One drawn string: its on-screen glyph height at the 1600 × 900 hero frame and whether it is a title. */
export type Glyphs = { str: string; px: number; title: boolean };
/** Where text sits on the canvas (x, y, w, h): the glass is made denser under it so small copy keeps its contrast in daylight. */
type Zone = readonly [number, number, number, number];
type Draw = { g: Ctx; W: number; H: number; sc: (screenPx: number) => number; tint: string; ink: string; rec: Glyphs[]; zones: Zone[]; s: State };
type Panel = { id: string; sw: number; long: number; violet: boolean; hud: boolean; draw: (d: Draw) => void };
type Say = { weight?: number; align?: CanvasTextAlign; alpha?: number; num?: boolean; title?: boolean; part?: boolean };

/** Glowing text in two passes: a soft glow underlay, then a crisp unshadowed fill. Every string is recorded so tests can check the copy and its size. */
function say(d: Draw, str: string, x: number, y: number, px: number, o: Say = {}) {
  const { g } = d;
  for (const crisp of [false, true]) {
    g.save(); g.font = `${o.weight ?? (px <= 13 ? 600 : 500)} ${d.sc(px)}px ${o.num ? NUM : FONT}`; g.textAlign = o.align ?? 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = d.ink;
    g.globalAlpha = (o.alpha ?? 1) * (crisp ? 1 : .4);
    if (!crisp) { g.shadowColor = d.tint; g.shadowBlur = d.sc(2.4); }
    g.fillText(str, x, y); g.restore();
  }
  if (!o.part) d.rec.push({ str, px, title: !!o.title });
  const size = d.sc(px), w = g.measureText(str)?.width ?? 0, left = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
  d.zones.push([left - size * .45, y - size * 1, w + size * .9, size * 1.4]);
}
/** Stroked line-art (no fills) in two passes like `say`; `lw` is in screen px and `build` makes the path. */
function line(d: Draw, lw: number, build: (g: Ctx) => void, o: { color?: string; alpha?: number } = {}) {
  const { g } = d;
  for (const crisp of [false, true]) {
    g.save(); g.strokeStyle = o.color ?? d.ink; g.lineWidth = d.sc(lw); g.lineJoin = 'round'; g.lineCap = 'round'; g.globalAlpha = (o.alpha ?? 1) * (crisp ? 1 : .4);
    if (!crisp) { g.shadowColor = d.tint; g.shadowBlur = d.sc(2.4); }
    g.beginPath(); build(g); g.stroke(); g.restore();
  }
}
const arcAt = (g: Ctx, x: number, y: number, r: number, a0: number, a1: number) => { g.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r); g.arc(x, y, r, a0, a1); };
const leaf = (g: Ctx, x: number, y: number, s: number) => {
  g.moveTo(x - .8 * s, y + .8 * s); g.bezierCurveTo(x - .9 * s, y - .4 * s, x + .2 * s, y - .9 * s, x + .9 * s, y - .9 * s);
  g.bezierCurveTo(x + .9 * s, y - .1 * s, x + .3 * s, y + .9 * s, x - .8 * s, y + .8 * s); g.moveTo(x - .8 * s, y + .8 * s); g.lineTo(x + .5 * s, y - .5 * s);
};
const bus = (g: Ctx, x: number, y: number, s: number) => {
  g.roundRect(x - s, y - .6 * s, 2 * s, 1.3 * s, .18 * s); g.moveTo(x - s, y + .05 * s); g.lineTo(x + s, y + .05 * s);
  for (const f of [-.55, 0, .55]) { g.moveTo(x + f * s, y - .6 * s); g.lineTo(x + f * s, y + .05 * s); }
  for (const f of [-.55, .55]) { g.moveTo(x + f * s + .2 * s, y + .8 * s); g.arc(x + f * s, y + .8 * s, .2 * s, 0, Math.PI * 2); }
};
/** The Yurikamome's rounded front: body, wide window band, two lamps and a skirt line. */
const train = (g: Ctx, x: number, y: number, s: number) => {
  g.roundRect(x - s, y - .7 * s, 2 * s, 1.5 * s, .35 * s); g.roundRect(x - .8 * s, y - .5 * s, 1.6 * s, .65 * s, .18 * s);
  for (const f of [-.5, .5]) { g.moveTo(x + f * s + .13 * s, y + .45 * s); g.arc(x + f * s, y + .45 * s, .13 * s, 0, Math.PI * 2); }
  g.moveTo(x - .6 * s, y + 1.05 * s); g.lineTo(x + .6 * s, y + 1.05 * s);
};
const phone = (g: Ctx, x: number, y: number, s: number) => {
  g.roundRect(x - .5 * s, y - s, s, 2 * s, .14 * s); g.roundRect(x - .4 * s, y - .8 * s, .8 * s, 1.5 * s, .05 * s); g.moveTo(x - .12 * s, y + .86 * s); g.lineTo(x + .12 * s, y + .86 * s);
};
const cube = (g: Ctx, x: number, y: number, s: number) => {
  const p = (a: number) => [x + Math.cos(a) * s, y + Math.sin(a) * s] as const, v = Array.from({ length: 6 }, (_, i) => p(-Math.PI / 2 + i * Math.PI / 3));
  g.moveTo(...v[0]); for (const q of v.slice(1)) g.lineTo(...q); g.closePath(); g.moveTo(x, y); g.lineTo(...v[2]); g.moveTo(x, y); g.lineTo(...v[4]); g.moveTo(x, y); g.lineTo(...v[0]);
};
/** The Fuji TV sphere observatory on its frame, with three broadcast arcs to each side that fade outwards. */
function observatory(d: Draw, cx: number, cy: number) {
  const r = d.sc(21), s = d.sc;
  line(d, 1.4, g => {
    g.moveTo(cx + r, cy); g.arc(cx, cy, r, 0, Math.PI * 2);
    for (const y of [-.5, 0, .5]) { const rx = Math.sqrt(1 - y * y) * r; g.moveTo(cx + rx, cy + y * r); g.ellipse(cx, cy + y * r, rx, rx * .22, 0, 0, Math.PI * 2); }
    for (const f of [.4, .75]) { g.moveTo(cx + f * r, cy); g.ellipse(cx, cy, f * r, r, 0, 0, Math.PI * 2); }
    g.moveTo(cx, cy - r); g.lineTo(cx, cy + r);
  });
  const top = cy + r + s(5), w = s(40), h = s(26);
  line(d, 1.4, g => {
    g.moveTo(cx - s(9), cy + r * .93); g.lineTo(cx - s(9), top); g.moveTo(cx + s(9), cy + r * .93); g.lineTo(cx + s(9), top);
    g.rect(cx - w / 2, top, w, h); g.moveTo(cx - w / 2, top + h / 2); g.lineTo(cx + w / 2, top + h / 2);
    for (const f of [-1 / 6, 1 / 6]) { g.moveTo(cx + f * w, top); g.lineTo(cx + f * w, top + h); }
  });
  [.9, .6, .35].forEach((alpha, i) => line(d, 1.4, g => { const R = r + s(8 + 7 * i); arcAt(g, cx, cy, R, -.7, .7); arcAt(g, cx, cy, R, Math.PI - .7, Math.PI + .7); }, { alpha }));
}
/** Characters stacked top to bottom (vertical advert text), sized to the column and the available height; the long vowel mark is turned upright. Recorded as one string. */
function stacked(d: Draw, str: string, cx: number, top: number, height: number, width: number) {
  const { g } = d, size = Math.min(width * .7, height / (str.length * 1.08)), step = size * 1.08, px = size / d.sc(1);
  [...str].forEach((c, i) => {
    const y = top + step * (i + .85);
    if (c !== 'ー') { say(d, c, cx, y, px, { weight: 600, align: 'center', part: true }); return; }
    g.save(); g.translate(cx, y - size * .35); g.rotate(Math.PI / 2); say(d, c, 0, size * .35, px, { weight: 600, align: 'center', part: true }); g.restore();
  });
  d.rec.push({ str, px, title: true });
}

// Detail-line kit (spec R3 B): fine sci-fi linework, about 1 screen px wide, shared by every panel. Coordinates and sizes are screen px of the 1600 × 900 hero frame.
// Alpha hierarchy: main word 1 → main line-art .9 → detail lines .35–.55 → background grids and dot fields .15–.25.
const ICON = .9, DETAIL = .45, GRID = .2;
/** Right-angle run with chamfered corners (give the 45° bends in `pts`) ending in a small dot. */
function circuit(d: Draw, pts: readonly (readonly [number, number])[], alpha = DETAIL) {
  const s = d.sc, [x, y] = pts[pts.length - 1];
  line(d, 1, g => { pts.forEach(([px, py], i) => i ? g.lineTo(s(px), s(py)) : g.moveTo(s(px), s(py))); g.moveTo(s(x) + s(2), s(y)); g.arc(s(x), s(y), s(2), 0, Math.PI * 2); }, { alpha });
}
/** Gauge: an outer arc with a tick every 6°, an inner hairline arc, and a bright band for `value` (0…1) on the middle ring. */
function arcGauge(d: Draw, cx: number, cy: number, r: number, value: number, alpha = DETAIL) {
  const s = d.sc, a0 = .75 * Math.PI, sweep = 1.5 * Math.PI, X = s(cx), Y = s(cy);
  line(d, 1, g => { arcAt(g, X, Y, s(r), a0, a0 + sweep); arcAt(g, X, Y, s(r * .74), a0, a0 + sweep); for (let a = 0; a <= sweep + 1e-6; a += Math.PI / 30) { g.moveTo(X + Math.cos(a0 + a) * s(r), Y + Math.sin(a0 + a) * s(r)); g.lineTo(X + Math.cos(a0 + a) * s(r + 2.5), Y + Math.sin(a0 + a) * s(r + 2.5)); } }, { alpha });
  line(d, 2, g => arcAt(g, X, Y, s(r * .87), a0, a0 + sweep * value), { alpha: ICON });
}
/** Ruler along a line with long and short ticks alternating on one side and an optional small arrowhead at each end. */
function ticks(d: Draw, x0: number, y0: number, x1: number, y1: number, o: { arrows?: boolean; alpha?: number; flip?: boolean } = {}) {
  const s = d.sc, len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len, nx = -uy * (o.flip ? -1 : 1), ny = ux * (o.flip ? -1 : 1);
  line(d, 1, g => {
    g.moveTo(s(x0), s(y0)); g.lineTo(s(x1), s(y1));
    for (let t = 0, i = 0; t <= len; t += 4, i++) { const L = i % 4 ? 3 : 6; g.moveTo(s(x0 + ux * t), s(y0 + uy * t)); g.lineTo(s(x0 + ux * t + nx * L), s(y0 + uy * t + ny * L)); }
    if (o.arrows) for (const [x, y, f] of [[x0, y0, -1], [x1, y1, 1]] as const) { g.moveTo(s(x + nx * 3), s(y + ny * 3)); g.lineTo(s(x + ux * f * 4 + nx * 0), s(y + uy * f * 4)); g.lineTo(s(x - nx * 3), s(y - ny * 3)); }
  }, { alpha: o.alpha ?? DETAIL });
}
/** A small field of dots (cols × rows, `step` px apart). */
function dotGrid(d: Draw, x: number, y: number, cols = 6, rows = 4, step = 4, alpha = GRID) {
  const s = d.sc; line(d, 1.5, g => { for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { g.moveTo(s(x + i * step), s(y + j * step)); g.lineTo(s(x + i * step + .01), s(y + j * step)); } }, { alpha });
}
/** A row of thin vertical blocks of uneven height, like a level meter; no text. */
function dataBlocks(d: Draw, x: number, y: number, n: number, height: number, step = 4, alpha = DETAIL) {
  const s = d.sc; line(d, 2, g => { for (let i = 0; i < n; i++) { const h = height * (.3 + .7 * Math.abs(Math.sin(i * 2.3 + 1))); g.moveTo(s(x + i * step), s(y + height)); g.lineTo(s(x + i * step), s(y + height - h)); } }, { alpha });
}
/** Cross hairs with a gap at the centre and a small circle. */
function crosshair(d: Draw, cx: number, cy: number, r: number, alpha = DETAIL) {
  const s = d.sc, X = s(cx), Y = s(cy);
  line(d, 1, g => { g.moveTo(X + s(r), Y); g.arc(X, Y, s(r), 0, Math.PI * 2); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(X + dx * s(r * 1.5), Y + dy * s(r * 1.5)); g.lineTo(X + dx * s(r * 2.6), Y + dy * s(r * 2.6)); } }, { alpha });
}
/** Fine square brackets at both ends of a span (`x0` … `x1`, `h` tall from `y`) plus a long divider under it ending in a dot. */
function bracketLines(d: Draw, x0: number, x1: number, y: number, h: number, alpha = DETAIL) {
  const s = d.sc;
  line(d, 1, g => {
    g.moveTo(s(x0 + 4), s(y)); g.lineTo(s(x0), s(y)); g.lineTo(s(x0), s(y + h)); g.lineTo(s(x0 + 4), s(y + h));
    g.moveTo(s(x1 - 4), s(y)); g.lineTo(s(x1), s(y)); g.lineTo(s(x1), s(y + h)); g.lineTo(s(x1 - 4), s(y + h));
    g.moveTo(s(x0), s(y + h + 6)); g.lineTo(s(x1 - 8), s(y + h + 6)); g.moveTo(s(x1 - 5), s(y + h + 6)); g.arc(s(x1 - 7), s(y + h + 6), s(2), 0, Math.PI * 2);
  }, { alpha });
}

/** Common frame: faint glass edge, four corner brackets and scanlines; `hud` adds a tick row in the bottom 10 %. */
function chrome(d: Draw, hud: boolean) {
  const { g, W, H, sc } = d, m = sc(2.5), b = Math.min(W, H) * .1;
  g.save(); g.strokeStyle = d.tint; g.shadowColor = d.tint; g.shadowBlur = sc(2.4); g.globalAlpha = .5; g.lineWidth = sc(1); g.strokeRect(m, m, W - 2 * m, H - 2 * m);
  g.globalAlpha = 1; g.lineWidth = sc(1.8); g.lineCap = 'square'; g.beginPath();
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { g.moveTo(x, y + sy * b); g.lineTo(x, y); g.lineTo(x + sx * b, y); }
  g.stroke(); g.restore();
  if (hud) line(d, 1, g => { let i = 0; for (let x = W * .06; x <= W * .94; x += sc(4), i++) { g.moveTo(x, H * .965); g.lineTo(x, H * .965 - sc(i % 5 ? 2 : 4)); } }, { alpha: .4 });
  g.save(); g.fillStyle = '#fff'; g.globalAlpha = .012; for (let y = 0; y < H; y += sc(3)) g.fillRect(0, y, W, sc(.7)); g.restore();
}

// One main word (≥ 30 px on the 1600 × 900 hero frame), at most one secondary word (≥ 20 px), the rest fine line-art; no other text.
const PANELS: readonly Panel[] = [
  // Left 48 %: the 3D globe (a separate mesh) ringed by a gauge and cross hairs. Right 52 %: 台場 over 2127 between brackets, then dots and a circuit.
  { id: 'district', sw: 224, long: 2048, violet: false, hud: true, draw(d) {
    const s = d.sc; say(d, '台場', s(122), s(46), 20, { weight: 600, title: true }); say(d, '2127', s(122), s(100), 38, { weight: 600, num: true, title: true });
    bracketLines(d, 116, 218, 70, 34); arcGauge(d, 60, 84, 54, .62); crosshair(d, 22, 148, 6); dotGrid(d, 124, 124, 6, 4, 5); circuit(d, [[214, 148], [176, 148], [168, 140], [150, 140]]); ticks(d, 14, 10, 212, 10, { arrows: true, alpha: .4 });
  } },
  // Train icon, station name and minutes; a five-station route line ending at 台場 with an arrow; a ruler.
  { id: 'transit', sw: 192, long: 1024, violet: false, hud: true, draw(d) {
    const s = d.sc; line(d, 1.6, g => train(g, s(22), s(24), s(10)), { alpha: ICON });
    say(d, '台場駅', s(44), s(36), 30, { weight: 600, title: true }); say(d, '3分', s(184), s(36), 20, { align: 'right', weight: 600, title: true });
    line(d, 1, g => { g.moveTo(s(12), s(58)); g.lineTo(s(168), s(58)); }, { alpha: .55 });
    line(d, 1.2, g => { for (const x of [12, 48, 84, 120]) { g.moveTo(s(x) + s(2), s(58)); g.arc(s(x), s(58), s(2), 0, Math.PI * 2); } }, { alpha: .6 });
    line(d, 1.6, g => { g.moveTo(s(152) + s(4.5), s(58)); g.arc(s(152), s(58), s(4.5), 0, Math.PI * 2); g.moveTo(s(170), s(53)); g.lineTo(s(180), s(58)); g.lineTo(s(170), s(63)); }, { alpha: ICON });
    ticks(d, 12, 70, 180, 70, { alpha: .4 }); circuit(d, [[12, 82], [30, 82], [36, 88], [52, 88]], .35);
  } },
  { id: 'smartlife', sw: 64, long: 1024, violet: true, hud: false, draw(d) {
    const { W } = d, s = d.sc; stacked(d, 'スマートライフ', W / 2, s(22), s(232), W);
    ticks(d, 8, 10, 56, 10, { alpha: .4 }); ticks(d, 8, 262, 56, 262, { alpha: .4, flip: true });
    circuit(d, [[6, 60], [6, 110], [12, 116], [12, 160]], .35); circuit(d, [[58, 100], [58, 170], [52, 176], [52, 214]], .35);
  } },
  // Left: leaf inside a gauge (98.7 % lit). Right: 空気 and 98.7 %, a sparkline under them, a level meter beside the label.
  { id: 'air', sw: 152, long: 1024, violet: false, hud: true, draw(d) {
    const s = d.sc; arcGauge(d, 26, 38, 22, .987); line(d, 1.6, g => leaf(g, s(26), s(38), s(9)), { alpha: ICON });
    say(d, '空気', s(54), s(26), 20, { weight: 600, title: true }); say(d, '98.7%', s(54), s(60), 30, { weight: 700, num: true, title: true });
    dataBlocks(d, 100, 10, 9, 14, 5);
    line(d, 1, g => { for (let i = 0; i <= 14; i++) { const x = s(54 + 90 * i / 14), y = s(67 - 1.8 * Math.sin(i * 1.3) - .8 * i / 14); i ? g.lineTo(x, y) : g.moveTo(x, y); } }, { alpha: .55 });
  } },
  // Top row: phone, cross hairs, level meter. Main word below.
  { id: 'newgen', sw: 120, long: 1024, violet: true, hud: false, draw(d) {
    const s = d.sc; line(d, 1.6, g => phone(g, s(20), s(22), s(14)), { alpha: ICON }); crosshair(d, 52, 22, 6); dataBlocks(d, 72, 10, 9, 24, 4);
    say(d, '新世代', s(60), s(68), 30, { weight: 600, align: 'center', title: true });
  } },
  { id: 'release', sw: 120, long: 1024, violet: true, hud: false, draw(d) {
    const s = d.sc; line(d, 1.8, g => cube(g, s(60), s(36), s(22)), { alpha: ICON }); ticks(d, 12, 72, 108, 72, { arrows: true, alpha: .4 }); dotGrid(d, 12, 14, 4, 3, 4); crosshair(d, 100, 18, 4);
    say(d, '新発売', s(60), s(106), 30, { weight: 600, align: 'center', title: true });
  } },
  // Main 住民の声 and the live 「N件」 between fine brackets; four unlabelled Meter-colour bars with a ruler beside them.
  { id: 'voices', sw: 176, long: 2048, violet: false, hud: true, draw(d) {
    const { g, s: st, sc } = d; say(d, '住民の声', sc(10), sc(34), 30, { weight: 600, title: true });
    say(d, `${st.voices.toLocaleString('ja-JP')}件`, sc(166), sc(60), 20, { align: 'right', weight: 600, title: true });
    dotGrid(d, 140, 12, 6, 3, 5); bracketLines(d, 8, 168, 40, 26);
    HOLOGRAM_AXES.forEach((a, i) => {
      const cy = sc(82 + i * 11), x0 = sc(10), len = sc(136), th = sc(6), bar = tierBar(st.tiers[a.socket]);
      line(d, 1, g => { g.roundRect(x0, cy - th / 2, len, th, th / 2); }, { alpha: .5 });
      const w = Math.max(th, (len - sc(2)) * bar);
      g.save(); g.fillStyle = METER_COLORS[a.axis]; g.shadowColor = METER_COLORS[a.axis]; g.shadowBlur = sc(3); g.beginPath(); g.roundRect(x0 + sc(1), cy - th / 2 + sc(1), w - sc(1), th - sc(2), th / 2); g.fill(); g.restore();
      g.save(); g.fillStyle = '#fff'; g.shadowColor = METER_COLORS[a.axis]; g.shadowBlur = sc(3); g.beginPath(); g.arc(x0 + w - th * .45, cy, sc(1.6), 0, Math.PI * 2); g.fill(); g.restore();
    });
    ticks(d, 158, 76, 158, 118, { alpha: .4 });
  } },
  { id: 'daily', sw: 56, long: 1024, violet: true, hud: false, draw(d) {
    const { W } = d, s = d.sc; stacked(d, '未来の日常', W / 2, s(26), s(232), W);
    ticks(d, 8, 10, 48, 10, { alpha: .4 }); ticks(d, 8, 274, 48, 274, { alpha: .4, flip: true });
    circuit(d, [[5, 60], [5, 110], [10, 115], [10, 150]], .35); circuit(d, [[51, 110], [51, 180], [46, 185], [46, 220]], .35);
  } },
  // Left: sphere observatory and broadcast arcs. Right: フジ over 文化放送, a gauge and a circuit.
  { id: 'culture', sw: 240, long: 2048, violet: true, hud: true, draw(d) {
    const s = d.sc; observatory(d, s(65), s(65));
    say(d, 'フジ', s(134), s(64), 36, { weight: 700, title: true }); say(d, '文化放送', s(134), s(92), 20, { weight: 600, title: true });
    circuit(d, [[228, 110], [190, 110], [182, 102], [150, 102]]); arcGauge(d, 176, 138, 20, .7); dataBlocks(d, 20, 146, 12, 14, 5); dotGrid(d, 196, 14, 6, 3, 5);
  } },
  // One main phrase over a scrolling wave (a separate mesh) in a faint grid, with rulers either side and a circuit.
  { id: 'tide', sw: 224, long: 2048, violet: false, hud: true, draw(d) {
    const s = d.sc; say(d, '水位 安定', s(12), s(36), 30, { weight: 600, title: true });
    dotGrid(d, 160, 10, 6, 3, 5); circuit(d, [[212, 34], [190, 34], [182, 26], [170, 26]]);
    line(d, 1, g => { g.rect(s(12), s(46), s(200), s(30)); for (const y of [53.5, 61, 68.5]) { g.moveTo(s(12), s(y)); g.lineTo(s(212), s(y)); } }, { alpha: GRID + .1 });
    ticks(d, 6, 44, 6, 78, { alpha: .4 }); ticks(d, 218, 44, 218, 78, { alpha: .4, flip: true });
  } },
  // No text: a small triangle, a level meter and one circuit run.
  ...(['a', 'b', 'c'] as const).map((n, i): Panel => ({ id: `tag-${n}`, sw: 56, long: 1024, violet: false, hud: false, draw(d) {
    const s = d.sc; line(d, 1.2, g => { g.moveTo(s(7), s(5)); g.lineTo(s(14), s(5)); g.lineTo(s(10.5), s(12)); g.closePath(); }, { alpha: ICON });
    dataBlocks(d, 20, 4, 6 + i, 11, 3); circuit(d, [[42 + i * 2, 9], [46 + i * 2, 9], [49 + i * 2, 5], [52, 5]], .4);
  } })),
];

const unit = new T.PlaneGeometry(1, 1);
/** Pane alpha map (white, 256 px wide): thin glass (.55 in the middle, .35 at the rim) with denser patches under every string, so the glass thins towards its rim but keeps small copy legible. */
function drawPane(c: HTMLCanvasElement, W: number, H: number, zones: readonly Zone[]) {
  const g = c.getContext('2d')!, k = c.width / W, r = g.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, c.width * .7);
  g.clearRect(0, 0, c.width, c.height); r.addColorStop(0, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,.35)'); g.fillStyle = r; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 12; for (const [x, y, w, h] of zones) g.fillRect(x * k, y * k, w * k, h * k);
}
const additive = (map: T.Texture | null, color: string) => new T.MeshBasicMaterial({ map, color, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false });
/** Globe wireframe (unit radius): `meridians` great circles through the poles, `parallels` latitude rings. */
function globeGeometry(meridians = 12, parallels = 8, steps = 48) {
  const v: number[] = [], ring = (f: (a: number) => [number, number, number]) => { for (let i = 0; i < steps; i++) v.push(...f(i / steps * Math.PI * 2), ...f((i + 1) / steps * Math.PI * 2)); };
  for (let m = 0; m < meridians; m++) { const l = m / meridians * Math.PI; ring(a => [Math.cos(a) * Math.cos(l), Math.sin(a), Math.cos(a) * Math.sin(l)]); }
  for (let p = 0; p < parallels; p++) { const lat = (p - (parallels - 1) / 2) * 20 * Math.PI / 180; ring(a => [Math.cos(a) * Math.cos(lat), Math.sin(lat), Math.sin(a) * Math.cos(lat)]); }
  return new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(v, 3));
}
const orbitGeometry = () => new T.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => { const a = i / 48 * Math.PI, b = (i + 1) / 48 * Math.PI; return [new T.Vector3(Math.cos(a), 0, Math.sin(a)), new T.Vector3(Math.cos(b), 0, Math.sin(b))]; }).flat());

export function heroHolograms(scene: T.Scene, anisotropy = 8) {
  const root = new T.Group(); root.name = 'hero-holograms';
  const state: State = { voices: 0, tiers: { nw: 0, ne: 0, sw: 0, se: 0 } };
  const halo = glowTexture(), eye = new T.Vector3(...HOLOGRAMS.eye);
  const texts = new Map<string, Glyphs[]>(), live: { redraw: () => void }[] = [];
  const paneMaterials: T.MeshBasicMaterial[] = [], haloMaterials: T.MeshBasicMaterial[] = [], inks: (T.MeshBasicMaterial | T.LineBasicMaterial)[] = [];
  const bob: { group: T.Group; y: number; period: number; phase: number }[] = [];
  let waves: T.Texture | undefined, globe: T.Object3D | undefined, dark = -1;

  PANELS.forEach((p, n) => {
    const place = HOLOGRAMS.panels.find(q => q.id === p.id)!, group = new T.Group(); group.name = `hologram-${p.id}`;
    group.position.set(...place.at); group.lookAt(eye);
    const W = place.w >= place.h ? p.long : Math.round(p.long * place.w / place.h), H = place.w >= place.h ? Math.round(p.long * place.h / place.w) : p.long;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = anisotropy;
    const paneCanvas = document.createElement('canvas'); paneCanvas.width = 256; paneCanvas.height = Math.round(256 * H / W);
    const paneMap = new T.CanvasTexture(paneCanvas);
    const redraw = () => {
      const g = canvas.getContext('2d')!, rec: Glyphs[] = [], zones: Zone[] = [], d: Draw = { g, W, H, sc: n => n * W / p.sw, tint: p.violet ? VIOLET : CYAN, ink: p.violet ? VIOLET_INK : INK, rec, zones, s: state };
      g.clearRect(0, 0, W, H); p.draw(d); chrome(d, p.hud); drawPane(paneCanvas, W, H, zones);
      texts.set(p.id, rec); texture.needsUpdate = true; paneMap.needsUpdate = true;
    };
    redraw(); if (p.id === 'voices') live.push({ redraw });
    const part = (geometryScale: number, material: T.MeshBasicMaterial, z: number, order: number) => {
      const mesh = new T.Mesh(unit, material); mesh.scale.set(place.w * geometryScale, place.h * geometryScale, 1); mesh.position.z = z; mesh.renderOrder = order; group.add(mesh); return mesh;
    };
    const glass = new T.MeshBasicMaterial({ map: paneMap, color: PANE_DAY, transparent: true, depthWrite: false, toneMapped: false, fog: false }), content = additive(texture, '#ffffff'), aura = additive(halo, p.violet ? '#b99cff' : GLOW);
    part(1, glass, 0, 10); part(1.18, aura, -.2, 9); part(1, content, .2, 11);
    paneMaterials.push(glass); haloMaterials.push(aura); inks.push(content);
    if (p.id === 'district') {
      // A real 3D globe turning in front of the panel's left zone (48 %), with a tilted orbit ring that stays inside it.
      const r = place.h * .26, tilt = new T.Group(), spin = new T.Group(), wire = (g: T.BufferGeometry) => { const m = new T.LineBasicMaterial({ color: CYAN, transparent: true, opacity: .9, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false }); inks.push(m); return new T.LineSegments(g, m); };
      spin.add(wire(globeGeometry())); tilt.add(spin); const ringLine = wire(orbitGeometry()); ringLine.scale.setScalar(1.15); ringLine.rotation.z = 20 * Math.PI / 180; tilt.add(ringLine);
      tilt.rotation.z = -.35; tilt.scale.setScalar(r); tilt.position.set(-.23 * place.w, .0 * place.h, .5); group.add(tilt); globe = spin;
    }
    if (p.id === 'tide') {
      // The wave graph scrolls inside its frame: its own texture (an integer number of periods) slides sideways, so the canvas is never redrawn.
      const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d')!;
      for (const crisp of [false, true]) {
        g.save(); g.strokeStyle = INK; g.lineWidth = 5; g.globalAlpha = crisp ? 1 : .55; if (!crisp) { g.shadowColor = GLOW; g.shadowBlur = 8; } g.beginPath();
        for (let x = 0; x <= 512; x += 4) { const a = x / 512 * Math.PI * 2, y = 64 + 22 * Math.sin(a * 2) + 12 * Math.sin(a * 5 + 1); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.restore();
      }
      waves = new T.CanvasTexture(c); waves.wrapS = T.RepeatWrapping; waves.colorSpace = T.SRGBColorSpace; waves.anisotropy = anisotropy;
      const m = additive(waves, '#ffffff'), mesh = new T.Mesh(unit, m); mesh.scale.set(place.w * .875, place.h * .31, 1); mesh.position.set(0, -.178 * place.h, .25); mesh.renderOrder = 11; group.add(mesh); inks.push(m);
    }
    bob.push({ group, y: place.at[1], period: 6 + (n * 7) % 4, phase: n * 1.7 }); root.add(group);
  });
  scene.add(root);

  const apply = () => { for (const l of live) l.redraw(); };
  return {
    root,
    /** Visible copy per panel id (drawn strings, in order). */
    texts: () => new Map([...texts].map(([id, rec]) => [id, rec.map(r => r.str)])),
    /** Drawn strings with their on-screen glyph height (px at 1600 × 900) and title flag. */
    glyphs: () => new Map(texts),
    /** Meter bar lengths 0…1 in HOLOGRAM_AXES order. */
    bars: () => HOLOGRAM_AXES.map(a => tierBar(state.tiers[a.socket])),
    /** 「提案 N件」: the same proposal count that lights the Sky Ring's voices. */
    setVoices(count: number) { const n = Math.max(0, Math.floor(count)); if (n !== state.voices) { state.voices = n; apply(); } },
    /** Four ladder rungs −3..3 (survey layout.tiers); redraws only when one changed. */
    setTiers(tiers: Record<LotSocketId, number>) {
      if (LOT_SOCKET_IDS.every(id => tiers[id] === state.tiers[id])) return; for (const id of LOT_SOCKET_IDS) state.tiers[id] = tiers[id]; apply();
    },
    /** Float ±.4 m, flicker ±4 % and scroll the wave; day and night parameters blend by `darkness`. */
    update(now: number, darkness: number) {
      const d = T.MathUtils.lerp, bright = d(2.6, 1.6, darkness);
      if (Math.abs(darkness - dark) >= .005) {
        dark = darkness; for (const m of paneMaterials) { m.opacity = d(.8, .35, darkness); m.color.lerpColors(PANE_DAY, PANE_NIGHT, darkness); } for (const m of haloMaterials) m.opacity = d(.06, .28, darkness);
      }
      inks.forEach((m, i) => m.color.setScalar(bright * (1 + .04 * Math.sin(now * .9 + i * 2.1))));
      for (const b of bob) b.group.position.y = b.y + .4 * Math.sin(now * Math.PI * 2 / b.period + b.phase);
      if (globe) globe.rotation.y = now * .15; if (waves) waves.offset.x = (now * .03) % 1;
    },
  };
}
