import type { DevSurveyConfig } from '../shared/devSurvey.ts';
import type { Vote } from '../shared/citySurveyState.ts';
import type { ProposalData, ProposalSessionData, AdminCurrentRun } from '../shared/protocol.ts';

export type AutoProfile = 'low' | 'zero' | 'high' | 'mixed' | 'custom' | 'random';
export type AutoSettings = { profile: AutoProfile; count: number; seed: number; extraWaitMs: number; custom: Record<string, Vote> };

/** Data-driven across any number of Meter descriptors; never depends on option order. */
export function selectAutoAnswers(config: DevSurveyConfig, settings: AutoSettings, ordinal: number) {
  let seed = (settings.seed + Math.imul(ordinal + 1, 0x9e3779b9)) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  return config.meters.map((meter, index) => {
    const vote = settings.profile === 'low' ? -1 : settings.profile === 'high' ? 1 : settings.profile === 'zero' ? 0
      : settings.profile === 'mixed' ? ([-1, 0, 1] as const)[(index + ordinal) % 3]
        : settings.profile === 'random' ? ([-1, 0, 1] as const)[Math.floor(random() * 3)] : settings.custom[meter.axis];
    const option = meter.options.find(option => option.vote === vote);
    if (!option) throw new Error(`No option for ${meter.axis}: ${vote}`);
    return { questionId: meter.questionId, optionId: option.id };
  });
}

export type AutoDriver = {
  readAdmin(): Promise<AdminCurrentRun>;
  /** Waits (cancellably) for the Guest result/handoff timers to reach welcome. */
  start(signal: AbortSignal): Promise<ProposalSessionData>;
  answer(questionId: string, optionId: string): void;
  submit(): Promise<ProposalData>;
  wait(ms: number, signal: AbortSignal): Promise<void>;
};

/** DEV-ONLY: run the real guest UI; the next session performs the normal handoff.
 * An uncertain submission stays in Guest's existing same-ID recovery path.
 */
export async function runAutoAnswers(config: DevSurveyConfig, settings: AutoSettings, driver: AutoDriver,
  signal: AbortSignal, progress: (done: number, result?: ProposalData) => void) {
  if (!Number.isInteger(settings.count) || settings.count < 1 || settings.count > 1000
      || !Number.isSafeInteger(settings.seed) || !Number.isFinite(settings.extraWaitMs) || settings.extraWaitMs < 0)
    throw new Error('Invalid auto-answer settings');
  const active = () => signal.throwIfAborted();
  for (let ordinal = 0; ordinal < settings.count; ordinal++) {
    active();
    const admin = await driver.readAdmin();
    active();
    const blocked = notReadyReason(admin);
    if (blocked) throw new Error(blocked);
    const session = await driver.start(signal);
    active();
    if (session.session.questionSetVersion !== config.questionSetVersion
        || session.questions.length !== config.meters.length) throw new Error('Question configuration changed');
    const assertOwnDraft = async () => {
      const current = await driver.readAdmin();
      active();
      if (current.lifecycle.phase !== 'in_experience' || current.lifecycle.pendingReset !== 'none'
          || current.reservedSessions !== 1 || current.state.runId !== session.state.runId
          || current.state.revision !== session.state.revision)
        throw new Error('別の観客またはスタッフの操作を検出しました。自動回答を停止しました。');
    };
    await assertOwnDraft();
    for (const answer of selectAutoAnswers(config, settings, ordinal)) {
      await driver.wait(300, signal);
      active();
      driver.answer(answer.questionId, answer.optionId);
    }
    await driver.wait(300, signal);
    active();
    await assertOwnDraft();
    const result = await driver.submit();
    progress(ordinal + 1, result);
    active();
    if (result.proposal.guestSessionId !== session.session.id) throw new Error('Different guest submission');
    // Preserve the normal 10 s result and 5 s handoff; these waits are cancellable.
    await driver.wait(15_100, signal);
    active();
    const after = await driver.readAdmin();
    active();
    if (after.lifecycle.phase !== 'awaiting_exit' || after.lifecycle.pendingReset !== 'none' || after.reservedSessions !== 0
        || after.state.runId !== result.state.runId || after.state.revision !== result.state.revision)
      throw new Error('都市またはスタッフの状態が変わりました。自動回答を停止しました。');
    if (ordinal + 1 < settings.count) await driver.wait(settings.extraWaitMs, signal);
  }
}

/** Explains why a batch cannot start, so the tester knows which manual step clears it. */
export function notReadyReason(admin: AdminCurrentRun): string | undefined {
  const { phase, pendingReset } = admin.lifecycle;
  if (pendingReset !== 'none') return 'リセット待ちです。通常のGuest開始で適用するか、Admin（/admin）で取り消してから開始してください。';
  if (phase === 'in_experience' || admin.reservedSessions !== 0)
    return '回答中の草稿があります。送信するか、Admin（/admin）で未完了の体験を終了して草稿を破棄してから、開始画面で開始してください。';
  return undefined;
}

export function autoWait(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
