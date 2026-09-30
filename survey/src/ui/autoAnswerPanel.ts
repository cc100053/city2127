import type { DevSurveyConfig } from '../shared/devSurvey.ts';
import type { ApiResponse, AdminCurrentRun, LifecycleData } from '../shared/protocol.ts';
import type { Vote } from '../shared/citySurveyState.ts';
import { api, el } from './debugApi.ts';
import { autoWait, runAutoAnswers, type AutoDriver, type AutoProfile } from './autoAnswers.ts';

function data<T>(response: ApiResponse<T>): T {
  if (!response.ok) throw new Error(`${response.error.code}: ${response.error.message}`);
  return response.data;
}

/** DEV-ONLY: isolated UI; remove it or relocate it to Admin before exhibition. */
export async function mountAutoAnswerPanel(guest: Pick<AutoDriver, 'start' | 'answer' | 'submit'>) {
  const configResponse = await api<DevSurveyConfig>('/api/admin/dev-survey-config');
  if (!configResponse.ok) {
    document.body.append(el('aside', { class: 'dev-auto-panel', role: 'status' },
      '自動回答は無効です。localhost で npm run dev:auto を使用してください。'));
    return;
  }
  const config = configResponse.data;
  document.body.classList.add('dev-auto-page');
  const profile = el('select', { 'data-dev-profile': '', 'aria-label': '回答パターン' },
    ...Object.entries({ low: '全て −1', zero: '全て 0', high: '全て +1', mixed: '混合・輪替', custom: '軸ごとに指定', random: 'シード付きランダム' })
      .map(([value, label]) => el('option', { value }, label)));
  profile.value = 'high';
  const count = el('input', { type: 'number', min: '1', max: '1000', value: '10', 'data-dev-count': '', 'aria-label': '提案数' });
  const seed = el('input', { type: 'number', step: '1', value: '2127', 'aria-label': 'シード' });
  const wait = el('input', { type: 'number', min: '0', max: '3600', value: '0', 'aria-label': '追加待ち時間（秒）' });
  const custom = new Map(config.meters.map(meter => [meter.axis, el('select', { 'aria-label': meter.axis },
    ...meter.options.map(option => el('option', { value: String(option.vote) }, `${option.vote > 0 ? '+' : ''}${option.vote}: ${option.label}`)))]));
  const customRows = el('details', {}, el('summary', {}, '軸ごとの指定'), ...config.meters.map(meter =>
    el('label', {}, meter.axis, custom.get(meter.axis)!)));
  const status = el('p', { role: 'status', 'aria-live': 'polite', 'data-dev-status': '' }, '待機中');
  const output = el('pre', { 'data-dev-output': '' });
  const start = el('button', { type: 'button', 'data-dev-start': '' }, '自動回答を開始');
  const stop = el('button', { type: 'button', disabled: '', 'data-dev-stop': '' }, '停止');
  let controller: AbortController | undefined;
  stop.addEventListener('click', () => controller?.abort(new Error('停止しました。残った草稿は手動で続けられます。')));
  start.addEventListener('click', async () => {
    controller = new AbortController();
    start.disabled = true;
    stop.disabled = false;
    status.textContent = '実行中…';
    const controls = [profile, count, seed, wait, ...custom.values()];
    controls.forEach(control => { control.disabled = true; });
    const settings = { profile: profile.value as AutoProfile, count: Number(count.value), seed: Number(seed.value),
      extraWaitMs: Number(wait.value) * 1000,
      custom: Object.fromEntries([...custom].map(([axis, select]) => [axis, Number(select.value) as Vote])) };
    try {
      await runAutoAnswers(config, settings, {
        ...guest, wait: autoWait,
        readAdmin: async () => data(await api<AdminCurrentRun>('/api/admin/current-run')),
        finish: async (_sessionId, expectedRevision) => {
          const result = data(await api<LifecycleData>('/api/admin/lifecycle', { command: 'guest-left', expectedRevision }));
          if (result.executedReset || result.lifecycle.phase !== 'ready') throw new Error('退出確認の状態が変わりました。');
        },
      }, controller.signal, (done, result) => {
        status.textContent = `${done} / ${settings.count} 記録済み · 結果と退出確認を待機中`;
        if (result) output.textContent = JSON.stringify({ answers: result.proposal.answers.map(answer => answer.optionLabel),
          meters: result.state.scores, layout: result.proposal.afterLayout }, null, 2);
      });
      status.textContent = `${settings.count} / ${settings.count} 完了・退出確認済み`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      start.disabled = false;
      stop.disabled = true;
      controls.forEach(control => { control.disabled = false; });
      controller = undefined;
    }
  });
  document.body.append(el('aside', { class: 'dev-auto-panel', 'aria-label': '開発用自動回答' },
    el('h2', {}, '開発専用・自動回答'),
    el('p', {}, 'このサーバーのDBに記録します。npm run dev:auto の独立テストDBを使ってください。記録した観客の退出を自動確認します。展示前に削除、または管理画面へ移動してください。'),
    el('p', {}, '観客の退出確認・都市のリセットは ', el('a', { href: '/admin', target: '_blank' }, '管理画面（/admin）'), ' で操作してください。'),
    el('label', {}, '回答パターン', profile), el('label', {}, '提案数', count), el('label', {}, 'シード', seed),
    el('label', {}, '追加待ち時間（秒）', wait), customRows,
    el('p', {}, '各問 0.3 秒 · 結果 10 秒 · 引継ぎ 5 秒'), start, stop, status, output));
}
