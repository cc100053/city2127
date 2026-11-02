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
type Say = { weight?: number; align?: CanvasTextAlign; alpha?: number; num?: boolean; title?: boolean };

/** Glowing text in two passes: a soft glow underlay, then a crisp unshadowed fill. Every string is recorded so tests can check the copy and its size. */
function say(d: Draw, str: string, x: number, y: number, px: number, o: Say = {}) {
  const { g } = d;
  for (const crisp of [false, true]) {
    g.save(); g.font = `${o.weight ?? (px <= 13 ? 600 : 500)} ${d.sc(px)}px ${o.num ? NUM : FONT}`; g.textAlign = o.align ?? 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = d.ink;
    g.globalAlpha = (o.alpha ?? 1) * (crisp ? 1 : .4);
    if (!crisp) { g.shadowColor = d.tint; g.shadowBlur = d.sc(2.4); }
    g.fillText(str, x, y); g.restore();
  }
  d.rec.push({ str, px, title: !!o.title });
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
/** Characters stacked top to bottom (vertical advert text), sized to the column and the available height; the long vowel mark is turned upright. */
function stacked(d: Draw, str: string, cx: number, top: number, height: number, width: number) {
  const { g } = d, size = Math.min(width * .7, height / (str.length * 1.08)), step = size * 1.08;
  [...str].forEach((c, i) => {
    const y = top + step * (i + .85), px = size / d.sc(1);
    if (c !== 'ー') { say(d, c, cx, y, px, { weight: 600, align: 'center', title: true }); return; }
    g.save(); g.translate(cx, y - size * .35); g.rotate(Math.PI / 2); say(d, c, 0, size * .35, px, { weight: 600, align: 'center', title: true }); g.restore();
  });
}

/** Common frame: faint glass edge, four corner brackets and scanlines; `hud` adds a tick row in the bottom 10 %. */
function chrome(d: Draw, hud: boolean) {
  const { g, W, H, sc } = d, m = sc(2.5), b = Math.min(W, H) * .1;
  g.save(); g.strokeStyle = d.tint; g.shadowColor = d.tint; g.shadowBlur = sc(2.4); g.globalAlpha = .5; g.lineWidth = sc(1); g.strokeRect(m, m, W - 2 * m, H - 2 * m);
  g.globalAlpha = 1; g.lineWidth = sc(1.8); g.lineCap = 'square'; g.beginPath();
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { g.moveTo(x, y + sy * b); g.lineTo(x, y); g.lineTo(x + sx * b, y); }
  g.stroke(); g.restore();
  if (hud) line(d, 1, g => { let i = 0; for (let x = W * .06; x <= W * .94; x += sc(4), i++) { g.moveTo(x, H * .965); g.lineTo(x, H * .965 - sc(i % 5 ? 2 : 4)); } }, { alpha: .8 });
  g.save(); g.fillStyle = '#fff'; g.globalAlpha = .012; for (let y = 0; y < H; y += sc(3)) g.fillRect(0, y, W, sc(.7)); g.restore();
}

const PANELS: readonly Panel[] = [
  // Left 48 %: the 3D globe (a separate mesh). Right 52 %: title, year, rule, two coordinate rows.
  { id: 'district', sw: 224, long: 2048, violet: false, hud: true, draw(d) {
    const { W, H } = d, x = W * .54; say(d, '台場', x, H * .31, 22, { weight: 600, title: true }); say(d, '2127', x, H * .55, 32, { weight: 600, num: true, title: true });
    line(d, 1, g => { g.moveTo(x, H * .62); g.lineTo(W * .94, H * .62); }); say(d, '北緯35.62', x, H * .74, 12, { alpha: .9 }); say(d, '東経139.77', x, H * .85, 12, { alpha: .9 });
  } },
  // Two table rows split by a rule: icon, name, and a large arrow / minutes on the right.
  { id: 'transit', sw: 192, long: 1024, violet: false, hud: true, draw(d) {
    const { W, H, sc } = d; line(d, 1.4, g => train(g, W * .12, H * .27, sc(10))); say(d, 'ゆりかもめ 台場駅', W * .24, H * .27 + sc(4), 12, { weight: 600 }); say(d, '→', W * .94, H * .27 + sc(5), 16, { align: 'right', weight: 600 });
    line(d, 1, g => { g.moveTo(W * .06, H * .47); g.lineTo(W * .94, H * .47); });
    line(d, 1.4, g => bus(g, W * .12, H * .65, sc(9))); say(d, '空港シャトル', W * .24, H * .65 + sc(4), 12, { weight: 600 }); say(d, '3分', W * .94, H * .65 + sc(6), 18, { align: 'right', weight: 600, title: true });
  } },
  { id: 'smartlife', sw: 48, long: 1024, violet: true, hud: false, draw(d) {
    const { W, H } = d; stacked(d, 'スマートライフ', W / 2, H * .1, H * .8, W);
    line(d, 1, g => { for (const y of [.03, .05, .07, .93, .95, .97]) { g.moveTo(W * .35, H * y); g.lineTo(W * .65, H * y); } });
  } },
  // Left 30 %: leaf. Right 70 %: label, big figure, sparkline.
  { id: 'air', sw: 152, long: 1024, violet: false, hud: true, draw(d) {
    const { W, H, sc } = d; line(d, 1.6, g => leaf(g, W * .17, H * .5, sc(13))); say(d, '空気清浄度', W * .34, H * .3, 12, { weight: 600 }); say(d, '98.7%', W * .34, H * .66, 26, { weight: 600, num: true, title: true });
    line(d, 1, g => { for (let i = 0; i <= 12; i++) { const x = W * (.34 + .6 * i / 12), y = H * (.8 - .035 * Math.sin(i * 1.3) - .02 * i / 12); i ? g.lineTo(x, y) : g.moveTo(x, y); } });
  } },
  { id: 'newgen', sw: 120, long: 1024, violet: true, hud: false, draw(d) {
    const { W, H, sc } = d; line(d, 1.6, g => phone(g, W * .2, H * .5, sc(22))); say(d, '新世代', W * .4, H * .46, 18, { weight: 600, title: true }); say(d, '登場', W * .4, H * .8, 18, { weight: 600, title: true });
  } },
  { id: 'release', sw: 64, long: 1024, violet: true, hud: false, draw(d) {
    const { W, H, sc } = d; line(d, 1.6, g => cube(g, W * .5, H * .32, sc(11))); say(d, '新発売', W * .5, H * .9, 18, { weight: 600, align: 'center', title: true });
  } },
  // Header: title left, count right. Four rows: label (left 40 %), Meter-colour bar with a bright end dot (right).
  { id: 'voices', sw: 176, long: 2048, violet: false, hud: true, draw(d) {
    const { g, W, H, s, sc } = d; say(d, '住民の声', W * .06, H * .2, 18, { weight: 600, title: true }); say(d, `提案 ${s.voices.toLocaleString('ja-JP')}件`, W * .94, H * .2, 12, { align: 'right', weight: 600 });
    HOLOGRAM_AXES.forEach((a, i) => {
      const cy = H * (.38 + i * .14), x0 = W * .46, len = W * .48, bar = tierBar(s.tiers[a.socket]), th = sc(8);
      say(d, a.label, W * .06, cy + sc(4), 12);
      line(d, 1, g => { g.roundRect(x0, cy - th / 2, len, th, th / 2); });
      const w = Math.max(th, (len - sc(2)) * bar);
      g.save(); g.fillStyle = METER_COLORS[a.axis]; g.shadowColor = METER_COLORS[a.axis]; g.shadowBlur = sc(3); g.beginPath(); g.roundRect(x0 + sc(1), cy - th / 2 + sc(1), w - sc(1), th - sc(2), th / 2); g.fill(); g.restore();
      g.save(); g.fillStyle = '#fff'; g.shadowColor = METER_COLORS[a.axis]; g.shadowBlur = sc(3); g.beginPath(); g.arc(x0 + w - th * .45, cy, sc(1.8), 0, Math.PI * 2); g.fill(); g.restore();
    });
  } },
  { id: 'daily', sw: 40, long: 1024, violet: true, hud: false, draw(d) {
    const { W, H } = d; stacked(d, '未来の日常', W / 2, H * .1, H * .8, W);
    line(d, 1, g => { for (const y of [.03, .05, .07, .93, .95, .97]) { g.moveTo(W * .35, H * y); g.lineTo(W * .65, H * y); } });
  } },
  // Left 50 %: sphere observatory and broadcast arcs. Right 50 %: station name and the evening event.
  { id: 'culture', sw: 240, long: 2048, violet: true, hud: true, draw(d) {
    const { W, H } = d, x = W * .56; observatory(d, W * .27, H * .36);
    say(d, 'フジ', x, H * .3, 30, { weight: 700, title: true }); say(d, '文化放送', x, H * .5, 18, { weight: 600, title: true });
    line(d, 1, g => { g.moveTo(x, H * .6); g.lineTo(W * .94, H * .6); }); say(d, '今夜 20:00', x, H * .73, 12, { alpha: .95 }); say(d, '湾岸フェス', x, H * .85, 12, { alpha: .95 });
  } },
  // Left 35 %: two big words. Right 65 %: a faint grid with a tag; the scrolling wave is a separate mesh over this zone.
  { id: 'tide', sw: 224, long: 2048, violet: false, hud: true, draw(d) {
    const { W, H } = d; say(d, '水位', W * .07, H * .46, 22, { weight: 600, title: true }); say(d, '安定', W * .07, H * .82, 22, { weight: 600, title: true });
    say(d, '潮位 +12', W * .94, H * .22, 12, { align: 'right', alpha: .9 });
    line(d, 1, g => { g.rect(W * .42, H * .3, W * .52, H * .52); for (const f of [.25, .5, .75]) { g.moveTo(W * .42, H * (.3 + .52 * f)); g.lineTo(W * .94, H * (.3 + .52 * f)); } }, { alpha: .45 });
  } },
  ...(['a', 'b', 'c'] as const).map((n, i): Panel => ({ id: `tag-${n}`, sw: 56, long: 1024, violet: false, hud: false, draw(d) {
    const { W, H, sc } = d; line(d, 1.2, g => { g.moveTo(W * .1, H * .3); g.lineTo(W * .1 + sc(9), H * .3); g.lineTo(W * .1 + sc(4.5), H * .3 + sc(8)); g.closePath(); });
    say(d, ['04.12', '17.40', '09.66'][i], W * .27, H * .5 + sc(4.2), 12, { num: true, weight: 600 });
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
      const m = additive(waves, '#ffffff'), mesh = new T.Mesh(unit, m); mesh.scale.set(place.w * .5, place.h * .44, 1); mesh.position.set(.18 * place.w, -.06 * place.h, .25); mesh.renderOrder = 11; group.add(mesh); inks.push(m);
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
        dark = darkness; for (const m of paneMaterials) { m.opacity = d(.95, .35, darkness); m.color.lerpColors(PANE_DAY, PANE_NIGHT, darkness); } for (const m of haloMaterials) m.opacity = d(.06, .28, darkness);
      }
      inks.forEach((m, i) => m.color.setScalar(bright * (1 + .04 * Math.sin(now * .9 + i * 2.1))));
      for (const b of bob) b.group.position.y = b.y + .4 * Math.sin(now * Math.PI * 2 / b.period + b.phase);
      if (globe) globe.rotation.y = now * .15; if (waves) waves.offset.x = (now * .03) % 1;
    },
  };
}
