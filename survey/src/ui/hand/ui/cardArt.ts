/// <reference types="vite/client" />
// Option-card art for 住民の窓 page 2. Options with an owner image use its pre-built hologram picture and Sobel
// wireframe (scripts/buildHandCards.mjs → ../assets/<question>-<option>.webp, -wire.webp); every other option
// falls back to a blueprint line drawing chosen by option position.
const files = import.meta.glob('../assets/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const byName = new Map(Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -5), url]));

export function cardArt(questionId: string, optionId: string): { pic: string; wire: string } | undefined {
  const pic = byName.get(`${questionId}-${optionId}`), wire = byName.get(`${questionId}-${optionId}-wire`);
  return pic && wire ? { pic, wire } : undefined;
}

/** Blueprint fallbacks (viewBox 0 0 200 200): a tower, a dial with a check, a house under a ring. */
export const BLUEPRINTS = [
  '<rect x="60" y="40" width="80" height="140"/><line x1="60" y1="75" x2="140" y2="75"/><line x1="60" y1="110" x2="140" y2="110"/><line x1="60" y1="145" x2="140" y2="145"/><ellipse cx="100" cy="40" rx="60" ry="14"/><line x1="100" y1="0" x2="100" y2="26"/>',
  '<circle cx="100" cy="100" r="62"/><circle cx="100" cy="100" r="34"/><path d="M38 100h-26M188 100h-26M100 38V12M100 188v-26"/><path d="M78 100l14 14 30-30"/>',
  '<path d="M20 170h160"/><path d="M40 170V90l60-50 60 50v80"/><rect x="80" y="120" width="40" height="50"/><ellipse cx="100" cy="30" rx="70" ry="12"/>',
];
