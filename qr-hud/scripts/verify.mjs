import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
async function ready() { await page.locator('[data-state="ready"]').waitFor(); }
async function decode() {
  const png = PNG.sync.read(await page.locator('#qr canvas').screenshot());
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, { inversionAttempts: 'attemptBoth' });
  assert.ok(result, 'Rendered QR must decode');
  assert.equal(result.data, await page.locator('#target-link').getAttribute('href'));
  return result.data;
}
try {
  await page.goto('http://localhost:4173');
  await ready();
  assert.equal(await page.locator('html').getAttribute('lang'), 'ja');
  assert.match(await page.locator('h1').textContent(), /あなたの提案が/);
  assert.equal(await decode(), 'https://www.hal.ac.jp/tokyo');
  console.log('Initial QR: https://www.hal.ac.jp/tokyo');
  console.log('Desktop layout:', await page.evaluate(() => ({ height: innerHeight, pageHeight: document.documentElement.scrollHeight, qrSize: document.querySelector('#qr').getBoundingClientRect().width })));
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, 'Desktop must fit the screen');
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.locator('.dev-panel summary').click();
  await page.locator('#session-input').fill('session_2127');
  assert.equal(await page.locator('#url-input').inputValue(), 'https://www.hal.ac.jp/tokyo');
  await page.locator('#url-input').fill('https://example.com/city/test?proposal=2127');
  await page.locator('button[type="submit"]').click();
  assert.equal(await page.locator('#terminal').getAttribute('data-state'), 'loading');
  await page.screenshot({ path: 'test-results/loading.png', fullPage: true });
  await ready();
  assert.equal(await decode(), 'https://example.com/city/test?proposal=2127');
  assert.equal(await page.locator('#archive-status').textContent(), '完了');
  await page.locator('#url-input').fill('https://a.co');
  await page.locator('button[type="submit"]').click();
  await ready();
  assert.equal(await decode(), 'https://a.co');
  await page.locator('.dev-panel summary').click();
  await page.locator('#simulate').click();
  await page.locator('#simulate').click();
  await ready();
  assert.equal(await decode(), 'https://www.hal.ac.jp/tokyo');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: 'test-results/desktop-1080.png', fullPage: true });
  console.log('16:9 layout:', await page.evaluate(() => ({ height: innerHeight, pageHeight: document.documentElement.scrollHeight, qrSize: document.querySelector('#qr').getBoundingClientRect().width })));
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, '16:9 must fit the screen');
  await page.setViewportSize({ width: 1440, height: 810 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, '1440x810 must fit the screen');
  console.log('1440x810 QR:', await decode());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log('Mobile QR:', await decode());
  assert.deepEqual(errors, []);
  console.log('PASS: QR decoding, session/URL editing, replay, repeated voting, mobile layout, browser errors.');
} finally {
  await browser.close();
}
