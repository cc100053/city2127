import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { selectQrLandmark } from '../src/landmarkSelection.js';

const base = process.env.QR_TEST_URL || 'http://127.0.0.1:5198';
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const demoUrl = 'https://www.hal.ac.jp/tokyo';
const archiveUrl = 'http://10.192.129.43:8787/city/saved-proposal';
const high = { version: 2, bands: { nw: 'high', ne: 'high', sw: 'high', se: 'high' }, automatedPorts: 6, sharedSeats: 8, treeCount: 12, plantedFraction: .8, coolingFins: 0, functionModules: 6 };
const low = { ...high, bands: { nw: 'low', ne: 'low', sw: 'low', se: 'low' }, automatedPorts: 0, sharedSeats: 0, treeCount: 3, plantedFraction: .2, coolingFins: 6, functionModules: 2 };
const seeds = { automation: 2127, publicSharing: 2127, environmentalPriority: 2127, urbanConcentration: 2127 };
async function open(path = '/', layout, reduced = false) {
  const page = await browser.newPage({ viewport: { width: 750, height: 620 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/THREE.WebGLProgram: Shader Error/.test(message.text())) errors.push(message.text()); });
  await page.route('**/api/config', route => route.fulfill({ json: { configured: false } }));
  if (layout) {
    await page.route('**/api/archives/*', route => route.fulfill({ json: { view: { version: 2, revision: 7, layout, slotSeeds: seeds } } }));
    await page.route('**/api/sessions/*', route => route.fulfill({ json: { id: 'saved-proposal', proposal_number: 7, city_url: archiveUrl, status: 'ready' } }));
  }
  await page.goto(base + path);
  await page.locator('#terminal[data-state=ready]').waitFor({ timeout: 30000 });
  return page;
}
async function city(page, filename) {
  await page.locator('[data-view=city]').click();
  await page.locator('#qr[data-city-view=city]').waitFor();
  await page.locator('#qr[data-sky-ready=true]').waitFor();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#qr')).opacity === '1');
  const qr = page.locator('#qr');
  if (filename) await page.screenshot({ path: `test-results/${filename}.png` });
  assert.equal(await qr.getAttribute('data-source'), (await qr.getAttribute('data-landmarks')) === 'landmark-civic-core' ? 'city-landmark' : 'city-district');
  assert.equal(Number(await qr.getAttribute('data-buildings')), 1);
  assert.equal(await qr.getAttribute('data-qr-geometry'), 'linked-voxels');
  assert.ok(Number(await qr.getAttribute('data-voxel-count')) > 100);
  assert.equal(await qr.getAttribute('data-sculpture-visible'), 'true');
  const bounds = JSON.parse(await qr.getAttribute('data-projected-bounds'));
  assert.ok(bounds.every(value => Number.isFinite(value) && Math.abs(value) <= .85), 'the entire building fits with margin');
  assert.ok(Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]) > 1.6, 'the building is large enough to identify');
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, 'embedded view fits');
  if ((await qr.getAttribute('data-landmarks')).startsWith('future-tower-')) {
    const png = PNG.sync.read(await qr.locator('canvas').screenshot());
    let readableGlass = 0;
    for (let index = 0; index < png.data.length; index += 4) {
      if (png.data[index] < 140 && png.data[index + 2] > png.data[index] + 15) readableGlass++;
    }
    assert.ok(readableGlass > png.width * png.height * .01, 'blue glass is readable, not overexposed');
  }
  return qr.getAttribute('data-landmarks');
}
async function decode(page, url) {
  const before = await page.locator('#qr').evaluate(element => ({ id: element.dataset.geometryId, height: element.dataset.sculptureHeight, voxels: element.dataset.voxelCount }));
  await page.locator('[data-view=scan]').click();
  await page.locator('#qr[data-city-view=scan]').waitFor({ timeout: 20000 });
  const after = await page.locator('#qr').evaluate(element => ({ id: element.dataset.geometryId, height: element.dataset.sculptureHeight, voxels: element.dataset.voxelCount }));
  assert.deepEqual(after, before, 'same geometry and full height, not a hidden/flattened model and another QR');
  assert.equal(await page.locator('#qr').getAttribute('data-sculpture-visible'), 'true');
  const png = PNG.sync.read(await page.locator('#qr canvas').screenshot());
  assert.equal(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data, url);
}
try {
  const demo = await open();
  await demo.evaluate(() => document.body.classList.add('integrated-qr'));
  await city(demo, 'building-qr-city');
  await decode(demo, demoUrl);
  await demo.evaluate(() => document.body.classList.remove('integrated-qr'));
  await demo.locator('.dev-panel summary').click();
  await demo.locator('#url-input').fill(archiveUrl);
  await demo.locator('#dev-form button').click();
  await demo.locator('#terminal[data-state=ready]').waitFor();
  await demo.locator('.dev-panel summary').click();
  await demo.evaluate(() => document.body.classList.add('integrated-qr'));
  await decode(demo, archiveUrl);
  await city(demo);
  await decode(demo, archiveUrl);
  await demo.screenshot({ path: 'test-results/building-qr-scan.png' });
  await demo.close();

  const towerCandidates = Array.from({ length: 10 }, (_, index) => ({ id: `future-tower-${index}` }));
  const proposals = new Map();
  for (let index = 0; proposals.size < 3; index++) {
    const id = `proposal-${index}`, selected = selectQrLandmark(id, towerCandidates);
    const family = Number(selected.id.split('-').at(-1)) % 3;
    if (!proposals.has(family)) proposals.set(family, { id, selected });
  }
  for (const [family, { id, selected }] of proposals) {
    const preview = await open(`/qr/?archive=${id}`, high);
    assert.equal(await city(preview, `building-qr-tower-family-${family}`), selected.id);
    assert.equal(await preview.locator('#qr').getAttribute('data-revision'), '7');
    await decode(preview, archiveUrl);
    await preview.reload();
    await preview.locator('#terminal[data-state=ready]').waitFor();
    assert.equal(await city(preview), selected.id, 'same archived proposal, same building');
    await preview.close();
  }
  const lowPreview = await open('/qr/?archive=low-proposal', low);
  assert.equal(await city(lowPreview, 'building-qr-landmark-fallback'), 'landmark-civic-core', 'low city retains the existing central landmark, not small pavilions or invented towers');
  assert.equal(await lowPreview.locator('#qr').getAttribute('data-revision'), '7');
  await decode(lowPreview, archiveUrl);
  await lowPreview.reload();
  await lowPreview.locator('#terminal[data-state=ready]').waitFor();
  assert.equal(await city(lowPreview), 'landmark-civic-core', 'the original landmark survives reload');
  await decode(lowPreview, archiveUrl);
  await lowPreview.close();
  const reduced = await open('/qr/?archive=reduced-proposal', high, true);
  await city(reduced);
  await decode(reduced, archiveUrl);
  await reduced.close();
  assert.deepEqual(errors, []);

  const fallback = await browser.newPage();
  await fallback.route('**/api/config', route => route.fulfill({ json: { configured: false } }));
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return type.startsWith('webgl') ? null : original.call(this, type, ...args);
    };
  });
  await fallback.goto(base);
  await fallback.locator('#terminal[data-state=ready]').waitFor();
  const backup = PNG.sync.read(await fallback.locator('#qr canvas').screenshot());
  assert.equal(jsQR(new Uint8ClampedArray(backup.data), backup.width, backup.height, { inversionAttempts: 'attemptBoth' })?.data, demoUrl);
  await fallback.close();
  console.log('PASS: three archived tower families and civic landmark, linked upright geometry in both views, whole-building framing, deterministic reload, repeat QR decoding, reduced motion, embedded layout and WebGL fallback.');
} finally { await browser.close(); }
