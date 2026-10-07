import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { selectQrLandmark } from '../src/landmarkSelection.js';

const base = process.env.QR_TEST_URL || 'http://127.0.0.1:5198';
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/config', route => route.fulfill({ json: { configured: false } }));
async function decode(url) {
  await page.locator('#qr[data-city-view=scan]').waitFor({ timeout: 20000 });
  const png = PNG.sync.read(await page.locator('#qr canvas').screenshot());
  assert.equal(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data, url);
}
try {
  await page.goto(base);
  await page.locator('#terminal[data-state=ready]').waitFor();
  const landmark = selectQrLandmark('');
  await page.getByRole('button', { name: `${landmark.label}を見る`, exact: true }).click();
  await page.locator('#qr[data-city-view=city]').waitFor();
  await page.waitForTimeout(1400); // Capture the completed growth, not its first frame.
  assert.equal(Number(await page.locator('#qr').getAttribute('data-buildings')), 1);
  assert.equal(await page.locator('#qr').getAttribute('data-landmarks'), landmark.id);
  assert.match(await page.locator('.brand-copy').textContent(), /台場/);
  await page.screenshot({ path: 'test-results/building-qr-city.png', fullPage: true });
  await page.getByRole('button', { name: '真上からスキャン', exact: true }).click();
  await decode('https://www.hal.ac.jp/tokyo');
  await page.screenshot({ path: 'test-results/building-qr-scan.png', fullPage: true });
  const url = 'http://10.192.129.43:8787/city/0123456789abcdef0123456789abcdef';
  await page.locator('.dev-panel summary').click();
  await page.locator('#url-input').fill(url);
  await page.locator('#dev-form button').click();
  await page.locator('.dev-panel summary').click();
  await decode(url);
  await page.setViewportSize({ width: 750, height: 620 });
  await page.evaluate(() => document.body.classList.add('integrated-qr'));
  await decode(url);
  await page.screenshot({ path: 'test-results/building-qr-embedded.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, 'embedded view fits');
  await page.getByRole('button', { name: `${landmark.label}を見る`, exact: true }).click();
  await page.locator('#qr[data-city-view=city]').waitFor();
  await page.getByRole('button', { name: '真上からスキャン', exact: true }).click();
  await decode(url);
  assert.deepEqual(errors, []);
  const fallback = await browser.newPage();
  await fallback.route('**/api/config', route => route.fulfill({ json: { configured: false } }));
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (type.startsWith('webgl')) return null;
      return original.call(this, type, ...args);
    };
  });
  await fallback.goto(base);
  await fallback.locator('#terminal[data-state=ready]').waitFor();
  await fallback.waitForTimeout(500);
  const backup = PNG.sync.read(await fallback.locator('#qr canvas').screenshot());
  assert.equal(jsQR(new Uint8ClampedArray(backup.data), backup.width, backup.height, { inversionAttempts: 'attemptBoth' })?.data, 'https://www.hal.ac.jp/tokyo');
  console.log(`PASS: deterministic ${landmark.id} selection, building/scan controls, top-down QR decoding, changed personal URL, embedded layout, repeat scan and WebGL fallback.`);
} finally { await browser.close(); }
