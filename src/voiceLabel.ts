import * as T from 'three';

// "暮らしの声 #N" over the site the headline camera closes in on (2026-11-10): the resident card says what changed,
// this label says where, in the guest's own number. A DOM tag projected from the shot's target point, so Japanese text
// stays crisp without a font atlas; it fades in once the camera holds and out as it flies back to the hero view.

/** Metres above the shot target, so the tag floats over the roofline instead of covering the change itself. */
export const LABEL_LIFT = 24;
export const LABEL_FADE = .45;

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

  show(text: string, target: readonly [number, number, number], from: number, until: number) {
    this.element.textContent = text;
    this.point.set(target[0], target[1] + LABEL_LIFT, target[2]);
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
    this.element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
  }
}
