import * as T from 'three';

/** Soft white radial glow (64 px): tint it with a material colour; shared by the vote journey's orbs and the hero holograms' halos. */
export function glowTexture(): T.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, '#fff'); r.addColorStop(.25, '#ffffffcc'); r.addColorStop(1, '#fff0');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}
