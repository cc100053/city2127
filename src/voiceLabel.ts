import * as T from 'three';

// "暮らしの声 #N" at the site the headline camera closes in on (2026-11-10): the resident card says what changed,
// this label says where, in the guest's own number. A DOM tag projected from a world point, so Japanese text
// stays crisp without a font atlas.
// 2026-11-11: with wide district stage shots and the build choreography, the tag waits until the build has finished
// and sits like a nameplate just below the changed slots' ground point, so it never covers a mass rising from there.

export const LABEL_FADE = .45;
/** CSS pixels between the anchor and the top of the tag, and the margin kept from the bottom of the screen. */
export const LABEL_GAP = 16, LABEL_MARGIN = 64;

type SlotPoint = { x: number; y: number; z: number; slot: string };

/** Ground anchor for the tag: the centre of the changed slots this shot frames, else every changed slot, else the shot's target. */
export function labelAnchor(target: readonly [number, number, number], points?: readonly SlotPoint[], covers?: readonly string[]): [number, number, number] {
  const framed = covers ? points?.filter(point => covers.includes(point.slot)) : undefined;
  const chosen = framed?.length ? framed : points ?? [];
  if (!chosen.length) return [target[0], target[1], target[2]];
  const sum = chosen.reduce((acc, point) => [acc[0] + point.x, acc[1] + point.y, acc[2] + point.z], [0, 0, 0]);
  return [sum[0] / chosen.length, sum[1] / chosen.length, sum[2] / chosen.length];
}

/** Screen position in CSS pixels for a world point; `visible` is false behind the camera or well off-frame. */
export function labelScreenPosition(point: T.Vector3, camera: T.Camera, width: number, height: number, into = new T.Vector3()) {
  into.copy(point).project(camera);
  const visible = into.z > -1 && into.z < 1 && Math.abs(into.x) <= 1.1 && Math.abs(into.y) <= 1.1;
  return { x: (into.x + 1) / 2 * width, y: (1 - into.y) / 2 * height, visible };
}

/** 0 → 1 → 0 opacity over [from, until] with LABEL_FADE-second ramps. */
export function labelOpacity(now: number, from: number, until: number) {
  if (now <= from || now >= until) return 0;
  return Math.min(1, (now - from) / LABEL_FADE, (until - now) / LABEL_FADE);
}

export class VoiceLabel {
  private readonly element = document.createElement('div');
  private readonly point = new T.Vector3();
  private readonly scratch = new T.Vector3();
  private from = 0;
  private until = 0;
  private active = false;

  constructor(parent: HTMLElement = document.body) {
    this.element.className = 'voice-label';
    // The resident card already announces the same identity to assistive tech.
    this.element.setAttribute('aria-hidden', 'true');
    this.element.hidden = true;
    parent.append(this.element);
  }

  show(text: string, anchor: readonly [number, number, number], from: number, until: number) {
    this.element.textContent = text;
    this.point.set(anchor[0], anchor[1], anchor[2]);
    this.from = from; this.until = until; this.active = true;
  }

  hide() {
    this.active = false;
    this.element.hidden = true;
  }

  update(camera: T.Camera, now: number, width = innerWidth, height = innerHeight) {
    if (!this.active) return;
    if (now >= this.until) { this.hide(); return; }
    const opacity = labelOpacity(now, this.from, this.until);
    const { x, y, visible } = labelScreenPosition(this.point, camera, width, height, this.scratch);
    this.element.hidden = opacity <= 0 || !visible;
    if (this.element.hidden) return;
    this.element.style.opacity = opacity.toFixed(3);
    // Below the anchor, but kept on screen when the slots sit low in the frame.
    const top = Math.min(y + LABEL_GAP, height - LABEL_MARGIN);
    this.element.style.transform = `translate(${x.toFixed(1)}px, ${top.toFixed(1)}px) translate(-50%, 0)`;
  }
}
