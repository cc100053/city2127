import * as T from 'three';
import { CONCEPT_LOT } from './layout.ts';
import { FLY_OUT } from './resultTimeline.ts';
import { SITE_TRANSITION_SECONDS } from './siteBuilders/siteRuntime.ts';

// Interim concept lot (owner 2026-11-20): until every question-rotation option has a model, a result that shows nothing new flies to one
// lawn and this lattice hologram rises there, labelled with the guest's option. Hidden except during that one result; delete this file,
// CONCEPT_LOT, the `concept:lot` shot and main.ts's branch once all 27 models stand in the city.
// Normal (not additive) blending in a deeper cyan than the hero panels, so the lattice still reads against the bright daytime lawn.
const CYAN = '#5fdcff', FLOOR = 3, BAY = 4;
const { w: W, d: D, h: H } = CONCEPT_LOT;

/** Lattice edges of the W × D × H envelope (local, ground at y 0): a ring every FLOOR m, uprights every BAY m round the perimeter, roof diagonals. */
export function latticeGeometry() {
  const v: number[] = [], seg = (a: number[], b: number[]) => v.push(...a, ...b);
  const corners = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]];
  for (let y = 0; y <= H + 1e-6; y += FLOOR) for (let i = 0; i < 4; i++) { const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4]; seg([x0, y, z0], [x1, y, z1]); }
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4], n = Math.round(Math.hypot(x1 - x0, z1 - z0) / BAY);
    for (let k = 0; k < n; k++) { const t = k / n; seg([x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t], [x0 + (x1 - x0) * t, H, z0 + (z1 - z0) * t]); }
  }
  seg([-W / 2, H, -D / 2], [W / 2, H, D / 2]); seg([W / 2, H, -D / 2], [-W / 2, H, D / 2]);
  return new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(v, 3));
}

/** The guest's option without its closing 。, as the hologram's main line. */
export const conceptText = (label: string) => label.replace(/[。.]$/, '');

/** Opacity over a result: rises with the building transition from `at`, holds, fades with the fly-out from `until`; 0 outside. */
export function conceptPhase(now: number, at: number, until: number) {
  if (now < at || now > until + FLY_OUT) return { reveal: 0, alpha: 0 };
  return { reveal: Math.min(1, (now - at) / SITE_TRANSITION_SECONDS), alpha: now > until ? 1 - (now - until) / FLY_OUT : 1 };
}

export class ConceptHologram {
  readonly root = new T.Group();
  private readonly lattice: T.ShaderMaterial;
  private readonly shell: T.MeshBasicMaterial;
  private readonly labelMaterial: T.MeshBasicMaterial;
  private readonly label: T.Mesh;
  private readonly canvas = document.createElement('canvas');
  private readonly texture: T.CanvasTexture;
  private plan: { at: number; until: number } | null = null;
  private text = '';

  /** `face`: the point the label turns to (the concept shot's camera). */
  constructor(scene: T.Scene, face: readonly [number, number, number]) {
    this.root.name = 'concept-hologram'; this.root.position.set(CONCEPT_LOT.x, CONCEPT_LOT.y, CONCEPT_LOT.z); this.root.visible = false;
    // Edges drawn up to the rising `reveal` height, brighter just under it, with slow upward scanlines.
    this.lattice = new T.ShaderMaterial({
      uniforms: { color: { value: new T.Color(CYAN) }, reveal: { value: 0 }, alpha: { value: 0 }, time: { value: 0 } },
      transparent: true, depthWrite: false,
      vertexShader: 'varying float y; void main(){ y = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform vec3 color; uniform float reveal, alpha, time; varying float y; void main(){ if (y > reveal + .01) discard;'
        + ' float edge = smoothstep(reveal - 2., reveal, y), scan = .65 + .35 * step(.5, fract(y / 1.5 - time * .4));'
        + ' gl_FragColor = vec4(color * (1. + edge * 1.5), alpha * scan * .9); }',
    });
    const lines = new T.LineSegments(latticeGeometry(), this.lattice); lines.name = 'concept-lattice';
    this.shell = new T.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide, fog: false });
    const shell = new T.Mesh(new T.BoxGeometry(W, H, D), this.shell); shell.position.y = H / 2; shell.name = 'concept-shell';
    // Ground outline a metre outside the envelope, like the lot rings.
    const pad = 1.5, outline = new T.LineLoop(new T.BufferGeometry().setFromPoints([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new T.Vector3(a * (W / 2 + pad), .15, b * (D / 2 + pad)))), this.lattice);
    this.canvas.width = 2048; this.canvas.height = 512;
    this.texture = new T.CanvasTexture(this.canvas); this.texture.colorSpace = T.SRGBColorSpace;
    this.labelMaterial = new T.MeshBasicMaterial({ map: this.texture, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false });
    this.label = new T.Mesh(new T.PlaneGeometry(26, 6.5), this.labelMaterial); this.label.name = 'concept-label';
    this.label.position.set(0, H + 5, 0); this.label.rotation.y = Math.atan2(face[0] - CONCEPT_LOT.x, face[2] - CONCEPT_LOT.z);
    this.root.add(lines, shell, outline, this.label);
    scene.add(this.root);
  }
  /** A live result: the lattice rises from `at` (the transition start) and fades out with the camera from `until` (the fly-out). */
  show(label: string, at: number, until: number) { this.draw(conceptText(label)); this.plan = { at, until }; }
  /** Snapshots, resets, Undo, reconnects and other results: gone at once. */
  hide() { this.plan = null; this.root.visible = false; }
  update(now: number) {
    if (!this.plan) return;
    const { reveal, alpha } = conceptPhase(now, this.plan.at, this.plan.until);
    if (now > this.plan.until + FLY_OUT) { this.hide(); return; }
    this.root.visible = alpha > 0;
    const u = this.lattice.uniforms; u.reveal.value = reveal * H; u.alpha.value = alpha; u.time.value = now;
    this.shell.opacity = .12 * reveal * alpha; this.labelMaterial.opacity = T.MathUtils.smoothstep(reveal, .7, 1) * alpha;
  }
  get diagnostics() { return { visible: this.root.visible, text: this.text }; }
  private draw(text: string) {
    this.text = text;
    const g = this.canvas.getContext('2d')!, w = this.canvas.width, h = this.canvas.height, font = "'Hiragino Sans','Noto Sans JP',sans-serif";
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(4,22,36,.88)'; g.fillRect(12, 12, w - 24, h - 24);
    g.strokeStyle = '#bff6ff'; g.shadowColor = '#bff6ff'; g.shadowBlur = 18; g.lineWidth = 6; g.globalAlpha = .7; g.strokeRect(12, 12, w - 24, h - 24);
    g.globalAlpha = 1; g.fillStyle = '#e9fdff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 84px ${font}`; g.fillText('構想中', w / 2, h * .27);
    let size = 150; g.font = `600 ${size}px ${font}`;
    while (size > 60 && g.measureText(text).width > w - 120) { size -= 6; g.font = `600 ${size}px ${font}`; }
    g.fillText(text, w / 2, h * .65);
    this.texture.needsUpdate = true;
  }
}
