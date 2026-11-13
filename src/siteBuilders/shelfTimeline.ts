/** SW event-shelf band change timing (owner 2026-11-13): entering mixed raises the frame, slides the quiet modules in, then the headline module takes the full hoist; leaving mixed is the mirror. Seconds from the change start, no imports so camera and copy timing can share it. */
export const SHELF_TRANSITION_SECONDS = 5;
const FRAME = 1.3, SLIDE = .8, HOIST = 3.1, OTHER = 2.1;
export type ShelfWindow = readonly [from: number, to: number];
/** Where each piece of a mixed band change runs. `kind` 'frame' = frame and yard, 'modules' = quiet modules, 'other' = the low/high state that comes down / goes up beside them. */
export const shelfWindow = (kind: 'frame' | 'modules' | 'other', entering: boolean): ShelfWindow => {
  const D = SHELF_TRANSITION_SECONDS;
  const up: ShelfWindow = kind === 'frame' ? [0, FRAME] : kind === 'modules' ? [FRAME, FRAME + SLIDE] : [0, OTHER];
  return entering ? up : [D - up[1], D - up[0]];
};
/** The headline module's hoist: it starts after the quiet modules are in (entering) and ends before they slide out (leaving). */
export const shelfHoist = (entering: boolean) => ({ delay: entering ? SHELF_TRANSITION_SECONDS - HOIST : 0, seconds: HOIST });
/** Length of a headline change's building animation: the SW focal change runs the shelf sequence, everything else the 3 s default. */
export const headlineTransitionSeconds = (change: { readonly socketId: string; readonly focal?: boolean } | undefined, fallback: number) =>
  change?.socketId === 'sw' && change.focal ? SHELF_TRANSITION_SECONDS : fallback;
