import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Run ONLY against an isolated scratch survey database. Creates two proposals and resets it.
const base = process.env.INTEGRATION_URL;
const cityTimeout = Number(process.env.INTEGRATION_CITY_TIMEOUT_MS || 45000);
if (!base || process.env.INTEGRATION_ALLOW_RESET !== 'yes') throw new Error('Set INTEGRATION_URL and INTEGRATION_ALLOW_RESET=yes for an isolated test server.');
const api = async (path, body) => {
  const response = await fetch(base + path, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.ok(response.ok, `${path}: ${response.status}`);
  const json = await response.json();
  return json.data ?? json;
};
const staff = async (command, confirmation) => {
  const run = await api('/api/admin/current-run');
  return api('/api/admin/lifecycle', { command, confirmation, expectedRevision: run.lifecycle.revision });
};
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
try {
  const display = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  display.on('pageerror', e => errors.push(e.message));
  await display.goto(`${base}/display/?survey`);
  const guest = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  guest.on('pageerror', e => errors.push(e.message));
  await guest.goto(`${base}/guest`);
  await guest.getByRole('button', { name: 'はじめる', exact: true }).click();
  for (let i = 0; i < 4; i++) {
    await guest.locator('input[type=radio]').last().check();
    await guest.getByRole('button', { name: i === 3 ? '回答を確認する' : '次へ', exact: true }).click();
  }
  const savedResponse = guest.waitForResponse(r => r.url() === `${base}/api/proposals` && r.request().method() === 'POST');
  await guest.getByRole('button', { name: '回答を終える', exact: true }).click();
  const saved = (await (await savedResponse).json()).data;
  const id = saved.proposal.id;
  const qrFrame = guest.frameLocator('.guest-archive-frame');
  await qrFrame.locator('#terminal[data-state=ready]').waitFor({ timeout: 45000 });
  assert.equal(await qrFrame.locator('#qr').getAttribute('data-source'), 'city-district');
  assert.match(await qrFrame.locator('#qr').getAttribute('data-landmarks'), /^future-tower-/);
  assert.equal(Number(await qrFrame.locator('#qr').getAttribute('data-revision')), saved.proposal.revisionAfter);
  await qrFrame.locator('#qr[data-city-view=scan]').waitFor({ timeout: 20000 });
  await guest.waitForTimeout(600); // Let the existing 400 ms QR fade-in complete.
  const png = PNG.sync.read(await qrFrame.locator('#qr canvas').screenshot());
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, { inversionAttempts: 'attemptBoth' });
  assert.equal(decoded?.data, `${base}/city/${id}`);
  await guest.screenshot({ path: 'test-results/integration-guest-qr.png', fullPage: true });
  assert.equal(await qrFrame.locator('body').evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, 'embedded QR must fit its frame');
  const first = await api(`/api/archives/${id}`);
  assert.deepEqual(first.view.layout, saved.proposal.afterLayout);
  // The shared display may be background-throttled while the guest tab is active; canvas presence is enough here.
  await display.locator('canvas').waitFor({ timeout: cityTimeout });
  await display.screenshot({ path: 'test-results/integration-display.png' });
  await display.close(); // Release its large GPU scene before the independent phone checks.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const phone = await context.newPage();
  phone.on('pageerror', e => errors.push(e.message));
  let sockets = 0;
  phone.on('websocket', () => sockets++);
  await phone.goto(`${decoded.data}?survey`, { waitUntil: 'domcontentloaded', timeout: cityTimeout }); // Appended survey flag must not subscribe to live updates.
  // Wait for archive initialization first; "loading detached" can pass before its script even starts.
  await phone.locator('canvas[data-archive-id]').waitFor({ timeout: cityTimeout });
  await phone.locator('.personal-loading').waitFor({ state: 'detached', timeout: cityTimeout });
  assert.equal(await phone.locator('canvas').getAttribute('data-archive-id'), id);
  assert.deepEqual(JSON.parse(await phone.locator('canvas').getAttribute('data-layout')), first.view.layout);
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const before = await phone.locator('canvas').getAttribute('data-camera');
  await phone.getByRole('button', { name: '拡大', exact: true }).click();
  await phone.waitForFunction(old => document.querySelector('canvas')?.dataset.camera !== old, before);
  const zoomed = await phone.locator('canvas').getAttribute('data-camera');
  const cdp = await context.newCDPSession(phone);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 160, y: 380 }] });
  for (let x = 170; x <= 260; x += 15) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 400 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await phone.waitForFunction(old => document.querySelector('canvas')?.dataset.camera !== old, zoomed);
  await phone.getByRole('button', { name: '最初の視点', exact: true }).click();
  await phone.waitForTimeout(700);
  await phone.screenshot({ path: 'test-results/integration-phone-3d.png' });
  assert.equal(sockets, 0);
  const session = await api('/api/proposal-sessions', {});
  await api('/api/proposals', { submissionId: crypto.randomUUID(), guestSessionId: session.session.id, expectedRevision: session.state.revision,
    answers: session.questions.map(q => ({ questionId: q.id, optionId: q.options[0].id })) });
  assert.deepEqual((await api(`/api/archives/${id}`)).view, first.view);
  assert.notDeepEqual((await api('/api/city-view')).layout, first.view.layout);
  await phone.reload({ waitUntil: 'domcontentloaded', timeout: cityTimeout });
  await phone.locator('canvas[data-archive-id]').waitFor({ timeout: cityTimeout });
  await phone.locator('.personal-loading').waitFor({ state: 'detached', timeout: cityTimeout });
  assert.deepEqual(JSON.parse(await phone.locator('canvas').getAttribute('data-layout')), first.view.layout);
  assert.equal(sockets, 0);
  await phone.goto(`${base}/city/unknown`, { waitUntil: 'domcontentloaded', timeout: cityTimeout });
  await phone.locator('.error').waitFor({ timeout: cityTimeout });
  assert.equal(await phone.locator('canvas').count(), 0);
  assert.deepEqual(errors, []);
  console.log(`PASS: questionnaire -> actual QR decode -> interactive phone 3D; touch rotation, zoom, no live WebSocket, later guest/reset isolation. Archive: ${id}`);
} finally { await browser.close(); }
