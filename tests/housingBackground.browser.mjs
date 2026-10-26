// Formal A acceptance: production scene, real scratch survey, fixed housing identity across recovery.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createContext, createSurveyServer } from '../survey/src/server/server.ts';
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH ?? '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs').href);
const out = process.env.CITY2127_EVIDENCE_DIR ?? 'artifacts/housing-background/final';
assert.ok(!existsSync(join(out, 'browser.json')), 'Preserve prior evidence'); mkdirSync(out, { recursive: true });
const base = process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5189';
const scratch = mkdtempSync(join(tmpdir(), 'housing-background-'));
const ctx = createContext({ dbPath: join(scratch, 'scratch.sqlite'), questionsPath: new URL('../survey/src/survey/questions.exhibition.json', import.meta.url).pathname });
const { server, realtime } = createSurveyServer({ ctx, staticDir: new URL('../survey/dist', import.meta.url).pathname });
const sockets = new Set(); server.on('upgrade', (_, socket) => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
const report = { startedAt: new Date().toISOString(), mode: 'production preview + real scratch survey', errors: [], warnings: [], expectedWarnings: [], failures: [], badResponses: [], shots: [], recovery: [], performance: [],
  hashes: Object.fromEntries(['src/main.ts', 'src/housingPrototype.ts', 'src/districtMeters.ts', 'tests/housingBackground.browser.mjs'].map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')])) };
let browser;
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const survey = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true }); report.browser = browser.version(); report.platform = process.platform;
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  // Three's native devtools observer inspects the built scene without modifying application source or bundles.
  await context.addInitScript(() => { window.observedThree = []; window.__THREE_DEVTOOLS__ = { dispatchEvent: e => window.observedThree.push(e.detail) }; });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on('pageerror', e => report.errors.push(e.message));
  let injectingDisconnect = false;
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) {
    const expected = m.location().url.endsWith('/favicon.ico') || (injectingDisconnect && m.text().includes('ERR_INTERNET_DISCONNECTED'));
    (expected ? report.expectedWarnings : report.warnings).push({ text: m.text(), url: m.location().url });
  } });
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) report.badResponses.push({ url: r.url(), status: r.status() }); });
  page.on('requestfailed', r => report.failures.push({ url: r.url(), error: r.failure()?.errorText }));
  const read = async path => (await (await context.request.get(survey + path)).json()).data;
  const post = async (path, data) => { const response = await context.request.post(survey + path, { data }); const body = await response.json(); assert.ok(response.ok() && body.ok, JSON.stringify(body)); return body.data; };
  async function lifecycle(command, extra = {}) { const run = await read('/api/admin/current-run'); return post('/api/admin/lifecycle', { command, expectedRevision: run.lifecycle.revision, ...extra }); }
  async function open(query) {
    await page.goto(`${base}/?${new URLSearchParams(query)}`); await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.time && window.observedThree.some(o => o.isScene && o.getObjectByName('housing-background')));
    assert.equal(await page.locator('.error,.housing-review,.energy-review').count(), 0);
  }
  const pose = () => page.evaluate(() => {
    const scene = window.observedThree.find(o => o.isScene && o.getObjectByName('housing-background')), root = scene.getObjectByName('housing-background');
    const rows = []; root.traverse(o => { o.updateMatrix(); rows.push({ name: o.name, visible: o.visible, matrix: o.matrix.toArray(), geometry: o.geometry?.uuid, material: o.material?.uuid }); });
    return { rows, parts: root.children.map(o => [o.name, o.visible]), home: root.getObjectByName('housing-whole-home').position.toArray() };
  });
  async function stable(expected, label) { assert.deepEqual(await pose(), expected, label); report.recovery.push(label); }
  async function shot(name) { const png = await page.screenshot({ path: join(out, `${name}.png`), timeout: 30000 }); report.shots.push({ name, url: page.url(), sha256: createHash('sha256').update(png).digest('hex'), canvas: await page.locator('canvas').evaluate(c => ({ ...c.dataset })) }); }
  const query = { survey: survey.replace('http', 'ws') + '/ws', hour: 12, quality: 'low' };
  await open(query); const fixed = await pose(); assert.equal(fixed.parts.length, 3); assert.ok(fixed.parts.every(p => p[1])); assert.deepEqual(fixed.home, [-5.2, 5.14, -4.4]);
  await page.getByText('サーバー: 接続済み', { exact: true }).waitFor();
  const submit = async (id, choice) => {
    const session = await post('/api/proposal-sessions', {});
    return post('/api/proposals', { submissionId: id, guestSessionId: session.session.id, expectedRevision: session.state.revision,
      answers: session.questions.map(q => ({ questionId: q.id, optionId: q.options[choice].id })) });
  };
  const saved = await submit('housing-fixed-1', 2);
  for (const age of [500, 2300, 1500, 2000]) { await page.waitForTimeout(age); await stable(fixed, `live fixed pose after ${age}ms`); }
  await page.waitForFunction(() => document.querySelector('.causal-panel')?.dataset.presentation === 'result');
  assert.ok(!/住宅|生活艙|藻類|housing|搬遷/.test(await page.locator('.resident-card-copy').textContent()), 'Result must not claim housing changes');
  await shot('live-result');
  await lifecycle('undo-proposal', { proposalId: saved.proposal.id }); await page.waitForTimeout(1000); await stable(fixed, 'Undo preserves housing');
  const beforeConnections = sockets.size; assert.ok(beforeConnections > 0); injectingDisconnect = true; await context.setOffline(true); for (const socket of sockets) socket.destroy();
  await page.waitForTimeout(1000); await context.setOffline(false); await page.getByText('サーバー: 接続済み', { exact: true }).waitFor(); await stable(fixed, 'TCP reconnect preserves housing'); injectingDisconnect = false;
  await lifecycle('reset-city', { confirmation: 'RESET' });
  await post('/api/proposal-sessions', {}); await page.waitForTimeout(1000); await stable(fixed, 'Queued city reset and next Start preserve housing');
  await lifecycle('guest-left');
  await lifecycle('full-reset', { confirmation: 'FULL RESET' }); await page.waitForTimeout(1000); await stable(fixed, 'Full reset preserves housing');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await submit('housing-fixed-reduced', 0); await page.waitForTimeout(1000); await stable(fixed, 'Reduced-motion snapshot preserves housing');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(300); assert.deepEqual(await page.locator('canvas').evaluate(c => [c.width, c.height]), [1280, 720]); await stable(fixed, 'Ordinary resize preserves housing');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.reload(); await page.waitForLoadState('networkidle'); await page.waitForFunction(() => document.querySelector('canvas')?.dataset.time);
  const reloaded = await pose(); const withoutIds = p => ({ ...p, rows: p.rows.map(({ geometry, material, ...row }) => row) }); assert.deepEqual(withoutIds(reloaded), withoutIds(fixed)); report.recovery.push('Reload restores identical visible geometry and A pose');
  for (const hour of [12, 17, 21]) { await open({ ...query, hour, quality: 'default' }); await shot(`hero-${hour}`); }
  for (const quality of ['low', 'default']) {
    console.log('Measuring', quality);
    await open({ ...query, quality }); await page.waitForTimeout(3000); const initial = await pose();
    const result = await Promise.race([page.evaluate(() => new Promise(resolve => { const intervals = []; let last = performance.now(), start = last;
      const tick = t => { intervals.push(t - last); last = t; if (t - start >= 30000) resolve({ intervals, canvas: { ...document.querySelector('canvas').dataset } }); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })), new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Frame capture stalled')), 45000); timer.unref(); })]);
    const duration = result.intervals.reduce((a,b) => a+b,0); report.performance.push({ quality, seconds: duration/1000, fps: result.intervals.length * 1000 / duration, ...result }); await stable(initial, `30s ${quality}: A pose and housing resources stable`);
  }
  report.gpu = await page.locator('canvas').evaluate(c => { const gl = c.getContext('webgl2'), ext = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER); });
  assert.deepEqual(report.badResponses, []); assert.deepEqual(report.errors, []); assert.deepEqual(report.failures, []); assert.deepEqual(report.warnings, []); assert.ok(report.performance.find(p => p.quality === 'low').fps >= 50);
  // Same source, fixed actor clock and camera: only M's translation differs in each comparison pair.
  for (const detail of [false, true]) {
    const params = new URLSearchParams({ meters: 'nw:low,ne:high,sw:mixed,se:mixed', hour: '12', reviewTime: '20', quality: 'low' });
    if (detail) { params.set('review', 'street'); params.set('cam', '-215,50,-245'); params.set('at', '-150,17,-165'); }
    await page.goto(`${process.env.CITY2127_DEV_URL ?? 'http://127.0.0.1:5188'}/?${params}`);
    await page.waitForLoadState('networkidle'); await page.waitForFunction(() => document.querySelector('canvas')?.dataset.time);
    for (const [name, x, z] of [['before', -135, -175], ['after', -165, -165]]) {
      await page.evaluate(([x, z]) => {
        const scene = window.observedThree.find(o => o.isScene && o.getObjectByName('housing-background'));
        scene.getObjectByName('housing-material').position.set(x, 0, z);
      }, [x, z]);
      await page.waitForTimeout(200); await shot(`${name}-${detail ? 'detail' : 'hero'}`);
    }
  }
  report.comparison = { before: [-135, -175], after: [-165, -165], metres: Math.hypot(30, 10), method: 'inspection-only translation; otherwise identical source, camera, hour, reviewTime and Meter layout' };
  await page.goto(`${process.env.CITY2127_DEV_URL ?? 'http://127.0.0.1:5188'}/?housing=mixed&hour=12&reviewTime=24&quality=low`);
  await page.waitForFunction(() => document.querySelector('.housing-review')?.dataset.phase === 'transport');
  const devHome = () => page.evaluate(() => {
    const scene = window.observedThree.find(o => o.isScene && o.getObjectByName('housing-prototype'));
    if (scene.getObjectByName('housing-background')) throw new Error('Duplicate formal housing in DEV study');
    return scene.getObjectByName('housing-whole-home').position.toArray();
  });
  assert.deepEqual(await devHome(), [0, 5.14, -4.4]);
  await page.getByLabel('住宅靜態閱讀').check(); await page.waitForTimeout(100); assert.deepEqual(await devHome(), [-5.2, 5.14, -4.4]);
  await page.getByRole('button', { name: '重播90秒' }).click(); await page.getByRole('button', { name: '重設／停泊' }).click(); await page.waitForTimeout(100); assert.deepEqual(await devHome(), [-5.2, 5.14, -4.4]);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(100); assert.deepEqual(await devHome(), [-5.2, 5.14, -4.4]);
  report.devCycle = '24s transport, static/replay/reset/reduced-motion A, no duplicated formal background';

  assert.deepEqual(report.errors, []); assert.deepEqual(report.badResponses, []); assert.deepEqual(report.warnings, []);
  report.passed = true; console.log('PASS housing A production: fixed mixed background, live evidence, Undo/reset/reconnect/reload/reduced motion/resize and resources.', report.performance.map(p => [p.quality, p.fps]));
} finally {
  writeFileSync(join(out, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close(); realtime.close(); await new Promise(resolve => server.close(resolve)); ctx.db.close(); rmSync(scratch, { recursive: true, force: true });
}
