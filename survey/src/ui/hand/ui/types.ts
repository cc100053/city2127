// Interface between the guest page (guestDebugView.ts, which owns flow, server calls and timers) and the
// 住民の窓 hand UI. The page tells the hand UI what it shows; the hand UI acts through the page's own controls.

export type GuestScreen = 'welcome' | 'starting' | 'question' | 'review' | 'submitting' | 'waiting' | 'result' | 'handoff' | 'abandoned';

export type HandQuestion = {
  /** 0-based position among the drawn questions. */
  index: number;
  total: number;
  id: string;
  text: string;
  background?: string;
  options: { id: string; label: string }[];
  /** The draft answer of this question, if any. */
  chosen?: string;
  /** Opened from the review screen's 変更. */
  editing: boolean;
};

export type HandView = {
  screen: GuestScreen;
  busy: boolean;
  stationId?: 'A' | 'B';
  /** Latest public head count; the resident number is this + 1 (display only). */
  cityGuestCount?: number;
  notice?: { text: string; role: 'status' | 'alert' };
  idleWarning: boolean;
  /** A session error offers 新しい予約で草稿を続ける: the page's own screen stays in charge. */
  needsPage: boolean;
  question?: HandQuestion;
  /** The drawn questions in order with each draft answer (HUD progress slots). */
  slots: { id: string; chosen?: string }[];
};
