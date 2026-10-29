/** Reading slot is independent of the renderer's three-second transition. */
// 13 s (owner 2026-10-29, was 10 s): room for the energy close-up narration's three steps.
export const DISPLAY_MS = 13_000;
export const HANDOFF_MS = 5_000;
export const RESULT_LEASE_MS = DISPLAY_MS + HANDOFF_MS;
