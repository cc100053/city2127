import * as T from 'three';
import { HOLOGRAMS } from './layout.ts';
import { glowTexture } from './glowTexture.ts';
import { METER_COLORS } from './districtMeters.ts';
import { LOT_SOCKET_IDS, type LotSocketId } from './surveyView.ts';

// Hero holograms (artifacts/hero-holograms/spec.md): 13 floating information panels and fictional 2127 adverts over the hero panorama, made of light
// like the owner's reference (hologram-style.webp): a near-clear pale glass pane, thin glowing edges with corner brackets, line-art content, soft halo.
// Placement is measured once (layout.ts HOLOGRAMS); each panel faces the hero eye once and never billboards. Only `voices` is live (proposal count and the
// four Meter rungs); every canvas is drawn once and redrawn only when its data changes. All visible text is Japanese or numerals.
const FONT = "'Hiragino Sans','Noto Sans JP',sans-serif", CYAN = '#bff6ff', INK = '#e9fdff', VIOLET = '#c9a8ff', VIOLET_INK = '#f3eaff', GLOW = '#5fd8ff';
const PANE_DAY = new T.Color('#0f6a86'), PANE_NIGHT = new T.Color('#0b4558'), LONG = 1024;
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
type Draw = { g: Ctx; W: number; H: number; k: number; tint: string; ink: string; rec: string[]; s: State };
type Panel = { id: string; violet: boolean; hud: boolean; draw: (d: Draw) => void };

const glow = (g: Ctx, color: string, blur: number) => { g.shadowColor = color; g.shadowBlur = blur; };
/** Glowing text; every string is recorded so tests can check the visible copy. */
function say(d: Draw, str: string, x: number, y: number, size: number, o: { weight?: number; align?: CanvasTextAlign; alpha?: number } = {}) {
  const { g } = d; g.save(); g.font = `${o.weight ?? 500} ${size}px ${FONT}`; g.textAlign = o.align ?? 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = d.ink; g.globalAlpha = o.alpha ?? 1; glow(g, d.tint, 22 * d.k); g.fillText(str, x, y); g.restore(); d.rec.push(str);
}
/** Stroked line-art path (no fills): `draw` builds the path. */
function ink(d: Draw, lw: number, draw: (g: Ctx) => void, color = d.ink) {
  const { g } = d; g.save(); g.strokeStyle = color; g.lineWidth = lw * 2 * d.k; g.lineJoin = 'round'; g.lineCap = 'round'; glow(g, d.tint, 12 * d.k); g.beginPath(); draw(g); g.stroke(); g.restore();
}
const leaf = (g: Ctx, x: number, y: number, s: number) => {
  g.moveTo(x - .8 * s, y + .8 * s); g.bezierCurveTo(x - .9 * s, y - .4 * s, x + .2 * s, y - .9 * s, x + .9 * s, y - .9 * s);
  g.bezierCurveTo(x + .9 * s, y - .1 * s, x + .3 * s, y + .9 * s, x - .8 * s, y + .8 * s); g.moveTo(x - .8 * s, y + .8 * s); g.lineTo(x + .5 * s, y - .5 * s);
};
const bus = (g: Ctx, x: number, y: number, s: number) => {
  g.roundRect(x - s, y - .6 * s, 2 * s, 1.3 * s, .18 * s); g.moveTo(x - s, y + .05 * s); g.lineTo(x + s, y + .05 * s);
  for (const f of [-.55, 0, .55]) { g.moveTo(x + f * s, y - .6 * s); g.lineTo(x + f * s, y + .05 * s); }
  for (const f of [-.55, .55]) { g.moveTo(x + f * s + .2 * s, y + .8 * s); g.arc(x + f * s, y + .8 * s, .2 * s, 0, Math.PI * 2); }
};
const phone = (g: Ctx, x: number, y: number, s: number) => {
  g.roundRect(x - .5 * s, y - s, s, 2 * s, .14 * s); g.roundRect(x - .4 * s, y - .8 * s, .8 * s, 1.5 * s, .05 * s); g.moveTo(x - .12 * s, y + .86 * s); g.lineTo(x + .12 * s, y + .86 * s);
};
const cube = (g: Ctx, x: number, y: number, s: number) => {
  const p = (a: number) => [x + Math.cos(a) * s, y + Math.sin(a) * s] as const, v = Array.from({ length: 6 }, (_, i) => p(-Math.PI / 2 + i * Math.PI / 3));
  g.moveTo(...v[0]); for (const q of v.slice(1)) g.lineTo(...q); g.closePath(); g.moveTo(x, y); g.lineTo(...v[2]); g.moveTo(x, y); g.lineTo(...v[4]); g.moveTo(x, y); g.lineTo(...v[0]);
};
/** Wireframe performer: head, shoulders, torso and a raised microphone arm. */
const performer = (g: Ctx, x: number, y: number, s: number) => {
  g.moveTo(x + .22 * s, y - .62 * s); g.arc(x, y - .62 * s, .22 * s, 0, Math.PI * 2);
  g.moveTo(x - .12 * s, y - .4 * s); g.lineTo(x - .16 * s, y - .3 * s); g.bezierCurveTo(x - .6 * s, y - .25 * s, x - .5 * s, y + .3 * s, x - .4 * s, y + .62 * s);
  g.lineTo(x + .4 * s, y + .62 * s); g.bezierCurveTo(x + .5 * s, y + .3 * s, x + .6 * s, y - .25 * s, x + .16 * s, y - .3 * s); g.lineTo(x + .12 * s, y - .4 * s);
  g.moveTo(x + .45 * s, y - .12 * s); g.lineTo(x + .66 * s, y - .5 * s); g.moveTo(x + .72 * s, y - .56 * s); g.arc(x + .68 * s, y - .54 * s, .07 * s, 0, Math.PI * 2);
  g.moveTo(x - .22 * s, y - .1 * s); g.lineTo(x + .22 * s, y - .1 * s); g.moveTo(x - .3 * s, y + .22 * s); g.lineTo(x + .3 * s, y + .22 * s);
};
/** Characters stacked top to bottom (vertical advert text); the long vowel mark is turned upright. */
function stacked(d: Draw, str: string, cx: number, top: number, size: number, weight = 600) {
  const { g } = d, step = size * 1.08;
  [...str].forEach((c, i) => {
    const y = top + step * (i + .85);
    if (c !== 'ー') { say(d, c, cx, y, size, { weight, align: 'center' }); return; }
    g.save(); g.translate(cx, y - size * .35); g.rotate(Math.PI / 2); say(d, c, 0, size * .35, size, { weight, align: 'center' }); g.restore();
  });
}

/** Common frame: faint glass edge, four corner brackets, scanlines, and (on larger panels) the HUD row of dots, digits and ticks. */
function chrome(d: Draw, hud: boolean, digits: string) {
  const { g, W, H, k } = d, m = 6 * k, b = Math.min(W, H) * .1;
  g.save(); g.strokeStyle = d.tint; glow(g, d.tint, 10 * k); g.globalAlpha = .55; g.lineWidth = 6 * k; g.strokeRect(m, m, W - 2 * m, H - 2 * m);
  g.globalAlpha = 1; g.lineWidth = 15 * k; g.lineCap = 'square'; g.beginPath();
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { g.moveTo(x, y + sy * b); g.lineTo(x, y); g.lineTo(x + sx * b, y); }
  g.stroke(); g.restore();
  if (hud) {
    ink(d, 2, g => { for (let x = 36 * k; x < W - 36 * k; x += 14 * k) { g.moveTo(x, H - 26 * k); g.lineTo(x, H - 26 * k - (x / k % 56 < 14 ? 14 : 7) * k); } });
    g.save(); g.fillStyle = d.ink; glow(g, d.tint, 8 * k); for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(W - 44 * k - i * 20 * k, 40 * k, 4.5 * k, 0, Math.PI * 2); g.fill(); } g.restore();
    say(d, digits, 40 * k, 50 * k, 18 * k, { alpha: .75 });
  }
  g.save(); g.fillStyle = '#fff'; g.globalAlpha = .05; for (let y = 0; y < H; y += 6 * k) g.fillRect(0, y, W, 1.6 * k); g.restore();
}

const PANELS: readonly Panel[] = [
  { id: 'district', violet: false, hud: true, draw(d) {
    const { W, H } = d; say(d, '台場', W * .5, H * .44, H * .16, { weight: 600 }); say(d, '2127', W * .5, H * .68, H * .21, { weight: 600 });
    ink(d, 3, g => { g.moveTo(W * .5, H * .76); g.lineTo(W * .93, H * .76); }); say(d, '北緯35.62 東経139.77', W * .5, H * .85, H * .05, { alpha: .85 });
  } },
  { id: 'transit', violet: false, hud: true, draw(d) {
    const { W, H } = d; say(d, 'ゆりかもめ 台場駅 →', W * .06, H * .46, H * .16, { weight: 600 });
    ink(d, 3, g => { g.moveTo(W * .06, H * .56); g.lineTo(W * .94, H * .56); }); ink(d, 4, g => bus(g, W * .13, H * .74, H * .1));
    say(d, '空港シャトル 3分', W * .25, H * .79, H * .13);
  } },
  { id: 'smartlife', violet: true, hud: false, draw(d) {
    const { W, H } = d; stacked(d, 'スマートライフ', W * .52, H * .09, W * .5); ink(d, 3, g => { for (let y = H * .06; y < H * .94; y += H * .03) { g.moveTo(W * .1, y); g.lineTo(W * .1 + (Math.round(y / (H * .03)) % 4 ? 10 : 22) * d.k, y); } });
  } },
  { id: 'air', violet: false, hud: true, draw(d) {
    const { W, H } = d; ink(d, 4, g => leaf(g, W * .17, H * .52, H * .17)); say(d, '空気清浄度', W * .34, H * .44, H * .15);
    say(d, '98.7%', W * .34, H * .8, H * .3, { weight: 600 });
  } },
  { id: 'newgen', violet: true, hud: true, draw(d) {
    const { W, H } = d; ink(d, 4, g => phone(g, W * .2, H * .54, H * .24)); say(d, '新世代', W * .4, H * .5, H * .17, { weight: 600 }); say(d, '登場', W * .4, H * .76, H * .17, { weight: 600 });
  } },
  { id: 'release', violet: true, hud: false, draw(d) {
    const { W, H } = d; ink(d, 5, g => cube(g, W * .5, H * .36, W * .22)); say(d, '新発売', W * .5, H * .83, W * .17, { weight: 600, align: 'center' });
  } },
  { id: 'voices', violet: false, hud: true, draw(d) {
    const { g, W, H, s } = d; say(d, '住民の声', W * .06, H * .27, H * .12, { weight: 600 });
    HOLOGRAM_AXES.forEach((a, i) => {
      const y = H * (.36 + i * .11), x0 = W * .38, len = W * .56, bar = tierBar(s.tiers[a.socket]);
      say(d, a.label, W * .06, y + H * .045, H * .062);
      ink(d, 3, g => { g.roundRect(x0, y, len, H * .06, H * .03); for (let t = 1; t < 6; t++) { g.moveTo(x0 + len * t / 6, y + H * .06); g.lineTo(x0 + len * t / 6, y + H * .075); } });
      g.save(); g.fillStyle = METER_COLORS[a.axis]; glow(g, METER_COLORS[a.axis], 18 * d.k); g.beginPath(); g.roundRect(x0 + 5 * d.k, y + 5 * d.k, Math.max(0, (len - 10 * d.k) * bar), H * .06 - 10 * d.k, H * .025); g.fill(); g.restore();
    });
    say(d, `提案 ${s.voices.toLocaleString('ja-JP')}件`, W * .06, H * .9, H * .085, { weight: 600 });
  } },
  { id: 'daily', violet: true, hud: false, draw(d) {
    const { W, H } = d; stacked(d, '未来の日常', W * .54, H * .12, W * .5); ink(d, 3, g => { for (let y = H * .06; y < H * .94; y += H * .03) { g.moveTo(W * .1, y); g.lineTo(W * .1 + (Math.round(y / (H * .03)) % 4 ? 10 : 22) * d.k, y); } });
  } },
  { id: 'culture', violet: true, hud: true, draw(d) {
    const { W, H } = d; ink(d, 4, g => performer(g, W * .26, H * .44, H * .34));
    ink(d, 5, g => { for (let i = 0; i < 14; i++) { const h = H * (.05 + .17 * Math.abs(Math.sin(i * 1.7 + 1) * Math.cos(i * .6))); g.moveTo(W * .5 + i * W * .034, H * .44 - h); g.lineTo(W * .5 + i * W * .034, H * .44 + h); } });
    say(d, 'フジ 文化放送', W * .06, H * .88, H * .1, { weight: 600 });
  } },
  { id: 'tide', violet: false, hud: true, draw(d) {
    const { W, H } = d; say(d, '水位', W * .07, H * .52, H * .22, { weight: 600 }); say(d, '安定', W * .07, H * .8, H * .22, { weight: 600 });
    ink(d, 2, g => { g.moveTo(W * .5, H * .22); g.lineTo(W * .5, H * .78); for (const y of [.3, .5, .7]) { g.moveTo(W * .5, H * y); g.lineTo(W * .95, H * y); } });
  } },
  ...(['a', 'b', 'c'] as const).map((n, i): Panel => ({ id: `tag-${n}`, violet: false, hud: false, draw(d) {
    const { W, H } = d; ink(d, 5, g => { g.moveTo(W * .1, H * .3); g.lineTo(W * .22, H * .3); g.lineTo(W * .16, H * .7); g.closePath(); });
    say(d, ['04.12 ▸ 0.98', '17.40 ▸ 2.31', '09.66 ▸ 0.47'][i], W * .32, H * .44, H * .26); say(d, ['3 · 12 · 7', '8 · 04 · 1', '2 · 21 · 9'][i], W * .32, H * .8, H * .24, { alpha: .8 });
  } })),
];

const unit = new T.PlaneGeometry(1, 1);
/** Pane texture: white with an alpha falling from 1 in the middle to .6 at the edge, so the glass thins towards its rim. */
function paneTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 90);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,.6)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c);
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

export function heroHolograms(scene: T.Scene) {
  const root = new T.Group(); root.name = 'hero-holograms';
  const state: State = { voices: 0, tiers: { nw: 0, ne: 0, sw: 0, se: 0 } };
  const pane = paneTexture(), halo = glowTexture(), eye = new T.Vector3(...HOLOGRAMS.eye);
  const texts = new Map<string, string[]>(), live: { redraw: () => void }[] = [];
  const paneMaterials: T.MeshBasicMaterial[] = [], haloMaterials: T.MeshBasicMaterial[] = [], inks: (T.MeshBasicMaterial | T.LineBasicMaterial)[] = [];
  const bob: { group: T.Group; y: number; period: number; phase: number }[] = [];
  let waves: T.Texture | undefined, globe: T.Object3D | undefined, dark = -1;

  PANELS.forEach((p, n) => {
    const place = HOLOGRAMS.panels.find(q => q.id === p.id)!, group = new T.Group(); group.name = `hologram-${p.id}`;
    group.position.set(...place.at); group.lookAt(eye);
    const W = place.w >= place.h ? LONG : Math.round(LONG * place.w / place.h), H = place.w >= place.h ? Math.round(LONG * place.h / place.w) : LONG;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 8;
    const redraw = () => {
      const g = canvas.getContext('2d')!, tint = p.violet ? VIOLET : CYAN, rec: string[] = [];
      g.clearRect(0, 0, W, H); p.draw({ g, W, H, k: Math.max(W, H) / LONG, tint, ink: p.violet ? VIOLET_INK : INK, rec, s: state });
      chrome({ g, W, H, k: Math.max(W, H) / LONG, tint, ink: p.violet ? VIOLET_INK : INK, rec, s: state }, p.hud, '04.12 ▸ 0.98');
      texts.set(p.id, rec); texture.needsUpdate = true;
    };
    redraw(); if (p.id === 'voices') live.push({ redraw });
    const part = (geometryScale: number, material: T.MeshBasicMaterial, z: number, order: number) => {
      const mesh = new T.Mesh(unit, material); mesh.scale.set(place.w * geometryScale, place.h * geometryScale, 1); mesh.position.z = z; mesh.renderOrder = order; group.add(mesh); return mesh;
    };
    const glass = new T.MeshBasicMaterial({ map: pane, color: PANE_DAY, transparent: true, depthWrite: false, toneMapped: false, fog: false }), content = additive(texture, '#ffffff'), aura = additive(halo, p.violet ? '#b99cff' : GLOW);
    part(1, glass, 0, 10); part(1.18, aura, -.2, 9); part(1, content, .2, 11);
    paneMaterials.push(glass); haloMaterials.push(aura); inks.push(content);
    if (p.id === 'district') {
      // A real 3D globe turning in front of the panel's left half, with a tilted orbit ring.
      const r = place.h * .32, tilt = new T.Group(), spin = new T.Group(), line = (g: T.BufferGeometry) => { const m = new T.LineBasicMaterial({ color: CYAN, transparent: true, opacity: .9, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false }); inks.push(m); return new T.LineSegments(g, m); };
      spin.add(line(globeGeometry())); tilt.add(spin); const ringLine = line(orbitGeometry()); ringLine.scale.setScalar(1.28); ringLine.rotation.z = 20 * Math.PI / 180; tilt.add(ringLine);
      tilt.rotation.z = -.35; tilt.scale.setScalar(r); tilt.position.set(-.21 * place.w, .02 * place.h, .5); group.add(tilt); globe = spin;
    }
    if (p.id === 'tide') {
      // The wave graph scrolls: its own texture (an integer number of periods) slides sideways, so the canvas is never redrawn.
      const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d')!;
      g.strokeStyle = INK; g.lineWidth = 5; g.shadowColor = GLOW; g.shadowBlur = 10; g.beginPath();
      for (let x = 0; x <= 512; x += 4) { const a = x / 512 * Math.PI * 2, y = 64 + 22 * Math.sin(a * 2) + 12 * Math.sin(a * 5 + 1); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      waves = new T.CanvasTexture(c); waves.wrapS = T.RepeatWrapping; waves.colorSpace = T.SRGBColorSpace;
      const m = additive(waves, '#ffffff'), mesh = new T.Mesh(unit, m); mesh.scale.set(place.w * .42, place.h * .5, 1); mesh.position.set(.24 * place.w, 0, .25); mesh.renderOrder = 11; group.add(mesh); inks.push(m);
    }
    bob.push({ group, y: place.at[1], period: 6 + (n * 7) % 4, phase: n * 1.7 }); root.add(group);
  });
  scene.add(root);

  const apply = () => { for (const l of live) l.redraw(); };
  return {
    root,
    /** Visible copy per panel id (drawn strings, in order). */
    texts: () => new Map(texts),
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
      const d = T.MathUtils.lerp, bright = d(2.2, 1.6, darkness);
      if (Math.abs(darkness - dark) >= .005) {
        dark = darkness; for (const m of paneMaterials) { m.opacity = d(.62, .16, darkness); m.color.lerpColors(PANE_DAY, PANE_NIGHT, darkness); } for (const m of haloMaterials) m.opacity = d(.1, .28, darkness);
      }
      inks.forEach((m, i) => m.color.setScalar(bright * (1 + .04 * Math.sin(now * .9 + i * 2.1))));
      for (const b of bob) b.group.position.y = b.y + .4 * Math.sin(now * Math.PI * 2 / b.period + b.phase);
      if (globe) globe.rotation.y = now * .15; if (waves) waves.offset.x = (now * .03) % 1;
    },
  };
}
