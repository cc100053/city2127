import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const picture = new PNG({ width: 320, height: 400 });
for (let y = 0; y < 400; y++) for (let x = 0; x < 320; x++) {
  const i = (y * 320 + x) * 4;
  picture.data[i] = 25 + x / 3; picture.data[i + 1] = 70 + y / 4; picture.data[i + 2] = 140; picture.data[i + 3] = 255;
}
const imageBytes = PNG.sync.write(picture);
const videoBytes = await readFile('tests/fixtures/sample.mp4');
const requests = new Map();
const record = (id, status, video = false) => ({
  id, status, proposal_number: 148,
  media_url: status === 'ready' ? `http://localhost:4173/fixture.${video ? 'mp4' : 'png'}` : null,
  media_type: status === 'ready' ? (video ? 'video/mp4' : 'image/png') : null,
  media_expires_at: new Date(Date.now() + 3600000).toISOString(),
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
});
try {
  await page.route('**/fixture.png', route => route.fulfill({ contentType: 'image/png', body: imageBytes }));
  await page.route('**/fixture.mp4', route => route.fulfill({ contentType: 'video/mp4', body: videoBytes, headers: { 'Accept-Ranges': 'bytes' } }));
  await page.route('**/api/sessions/*', route => {
    const id = new URL(route.request().url()).pathname.split('/').pop();
    const times = requests.get(id) || []; times.push(Date.now()); requests.set(id, times);
    if (id === 'missing') return route.fulfill({ status: 404, json: { error: 'このアーカイブは見つかりません。' } });
    if (id === 'offline' && times.length === 1) return route.abort('internetdisconnected');
    const status = id === 'image' ? ['queued', 'uploading', 'ready'][Math.min(times.length - 1, 2)] : id === 'failed' && times.length === 1 ? 'failed' : 'ready';
    return route.fulfill({ json: record(id, status, id === 'video') });
  });
  await page.goto('http://localhost:4173/city/image');
  await page.locator('#city-status[data-status="QUEUED"]').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'ja');
  assert.equal(await page.locator('#city-status').textContent(), '準備中');
  await page.screenshot({ path: 'test-results/city-waiting.png', fullPage: true });
  await page.locator('#city-media img').waitFor();
  await page.waitForFunction(() => document.querySelector('#city-media img')?.naturalWidth === 320);
  const times = requests.get('image'); assert.equal(times.length, 3);
  assert.ok(times[1] - times[0] >= 1900 && times[2] - times[1] >= 1900, 'Poll interval must be 2 seconds');
  await page.screenshot({ path: 'test-results/city-image.png', fullPage: true });
  await page.waitForTimeout(2200); assert.equal(requests.get('image').length, 3, 'Stop 2-second polling after ready');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

  await page.goto('http://localhost:4173/city/video');
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
  const videoState = await page.locator('video').evaluate(video => ({ muted: video.muted, inline: video.playsInline, controls: video.controls, width: video.videoWidth }));
  assert.deepEqual(videoState, { muted: true, inline: true, controls: true, width: 320 });
  await page.screenshot({ path: 'test-results/city-video.png', fullPage: true });

  await page.goto('http://localhost:4173/city/offline');
  await page.locator('#city-status[data-status="OFFLINE"]').waitFor();
  assert.match(await page.locator('#city-detail').textContent(), /ネットワークを確認/);
  await page.locator('#city-media img').waitFor();
  await page.goto('http://localhost:4173/city/failed');
  await page.locator('#city-status[data-status="FAILED"]').waitFor();
  await page.locator('#city-media img').waitFor();
  await page.goto('http://localhost:4173/city/missing');
  await page.locator('#city-status[data-status="NOT FOUND"]').waitFor();
  await page.waitForTimeout(2200); assert.equal(requests.get('missing').length, 1);
  await page.reload(); await page.locator('#city-status[data-status="NOT FOUND"]').waitFor();
  console.log('PASS: mobile 2s polling, image decoding, actual H.264 MP4 playback, offline/failed recovery, 404 and deep-link reload.');

  await page.unroute('**/api/sessions/*');
  await page.setViewportSize({ width: 1440, height: 900 });
  const liveId = 'session_1234567890abcdef12345678';
  let uploaded = false, retried = false;
  await page.route('**/api/config', route => route.fulfill({ json: { configured: true, authenticated: false, publicBaseUrl: 'http://localhost:4173', maxUploadBytes: 50 * 1024 ** 2 } }));
  await page.route('**/api/operator/login', route => route.fulfill({ json: { ok: true } }));
  await page.route('**/api/sessions', route => route.fulfill({ status: 201, json: { ...record(liveId, 'queued'), city_url: `http://localhost:4173/city/${liveId}` } }));
  await page.route(`**/api/sessions/${liveId}`, route => route.fulfill({ json: record(liveId, 'queued') }));
  await page.route(`**/api/sessions/${liveId}/media`, route => {
    assert.match(route.request().headers()['idempotency-key'], /^[a-f0-9-]{36}$/);
    uploaded = true;
    return route.fulfill({ status: 202, json: { id: 'upload-test', status: 'queued' } });
  });
  await page.route('**/api/uploads', route => route.fulfill({ json: { jobs: uploaded ? [{ id: 'upload-test', sessionId: liveId, status: retried ? 'queued' : 'failed', attempts: retried ? 0 : 5, nextAttemptAt: null, error: retried ? null : 'アップロードに失敗しました。ファイルは保存済みです。' }] : [] } }));
  await page.route('**/api/uploads/upload-test/retry', route => { retried = true; return route.fulfill({ status: 202, json: { ok: true } }); });
  await page.goto('http://localhost:4173');
  await page.locator('[data-state="locked"]').waitFor();
  await page.locator('#operator-launch').click();
  await page.locator('#ops-login input').fill('test-only-operator-input');
  await page.locator('#ops-login button').click();
  await page.locator('[data-state="ready"]').waitFor();
  await page.locator('#ops-file').setInputFiles({ name: 'result.png', mimeType: 'image/png', buffer: imageBytes });
  await page.locator('#ops-submit').click();
  await page.locator('#ops-jobs button').filter({ hasText: '今すぐ再試行' }).waitFor();
  assert.ok(uploaded);
  await page.screenshot({ path: 'test-results/operator-queue.png', fullPage: true });
  await page.locator('#ops-jobs button').filter({ hasText: '今すぐ再試行' }).click();
  assert.ok(retried);
  await page.locator('#ops-close').click();
  const qr = PNG.sync.read(await page.locator('#qr canvas').screenshot());
  const decoded = jsQR(new Uint8ClampedArray(qr.data), qr.width, qr.height, { inversionAttempts: 'attemptBoth' });
  assert.equal(decoded?.data, `http://localhost:4173/city/${liveId}`);
  assert.deepEqual(errors, []);
  console.log('PASS: operator login, real-session QR payload, multipart upload UI, retry queue UI, no browser exceptions.');
} finally { await browser.close(); }
