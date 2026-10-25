import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';
const evidence = resolve(process.argv[2]);
assert.ok(!existsSync(join(evidence, 'browser.json')), 'Keep previous evidence intact');
mkdirSync(evidence, { recursive: true });
const base = process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5187';
const sourceHash = createHash('sha256').update(readFileSync('src/energyPrototype.ts')).digest('hex');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(60000);
const exceptions = [], consoleMessages = [], responses = [], failures = [], shots = [];
page.on('pageerror', e => exceptions.push(e.message));
page.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMessages.push({ type: m.type(), text: m.text(), url: m.location().url }); });
page.on('response', r => { if (r.status() >= 400) responses.push({ url: r.url(), status: r.status() }); });
page.on('requestfailed', r => failures.push({ url: r.url(), error: r.failure()?.errorText }));
function url(hour, detail, time = 50) {
 const u = new URL(base); u.searchParams.set('energy', 'mixed'); u.searchParams.set('hour', hour);
 if (time !== null) u.searchParams.set('reviewTime', time);
 if (detail) { u.searchParams.set('review', 'street'); u.searchParams.set('cam', '125,85,-290'); u.searchParams.set('at', '125,60,-360'); }
 return u.href;
}
async function open(hour, detail, time = 50) {
 await page.goto(url(hour, detail, time));
 await page.getByLabel('能源比較配置').waitFor();
 await page.waitForFunction(() => !!document.querySelector('canvas')?.dataset.time);
 await page.waitForLoadState('networkidle');
 assert.equal(await page.locator('.error').count(), 0);
}
async function shot(name) {
 await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
 const bytes = await page.screenshot({ path: join(evidence, name + '.png') });
 const data = await page.locator('canvas').evaluate(c => ({ time: c.dataset.time, width: c.width, height: c.height, hour: c.dataset.hour }));
 assert.deepEqual([data.width, data.height], [1920, 1080]);
 shots.push({ name, url: page.url(), capturedAt: new Date().toISOString(), ...data, sha256: createHash('sha256').update(bytes).digest('hex'), cycle: await page.locator('[data-cycle]').textContent() });
 console.log('captured', name);
}
let gpu;
try {
 for (const [period, hour] of [['day',12], ['dusk',18.5], ['night',22]]) {
  for (const detail of [false, true]) {
   await open(hour, detail);
   for (const option of ['mixed', 'a', 'b', 'baseline']) {
    await page.getByLabel('能源比較配置').selectOption(option);
    assert.equal(new URL(page.url()).searchParams.get('energy'), option);
    await shot(`${detail ? 'detail' : 'hero'}-${period}-${option}`);
   }
  }
 }
 for (const [phase, time, text] of [['charge',10,'充能'],['hold',30,'暫存'],['release',50,'釋能']]) {
  await open(12, true, time); assert.ok((await page.locator('[data-cycle]').textContent()).includes(text));
  await shot('detail-' + phase);
 }
 await page.getByLabel('靜態閱讀').check();
 await page.waitForFunction(() => document.querySelector('[data-cycle]')?.textContent.includes('靜態閱讀'));
 await shot('static-a'); await page.waitForTimeout(1200); await shot('static-b');
 await open(12, true, null); await shot('live-a');
 const t = Number(await page.locator('canvas').getAttribute('data-time'));
 await page.waitForFunction(t => Number(document.querySelector('canvas')?.dataset.time) >= t + 5, t);
 await shot('live-b');
 await page.getByLabel('靜態閱讀').check(); await shot('live-static-a');
 await page.waitForTimeout(1500); await shot('live-static-b');
 gpu = await page.locator('canvas').evaluate(c => { const gl=c.getContext('webgl2'), e=gl.getExtension('WEBGL_debug_renderer_info'); return { renderer:e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), version:gl.getParameter(gl.VERSION) }; });
 assert.deepEqual(exceptions, []);
 assert.deepEqual(consoleMessages.filter(m => !m.url.endsWith('/favicon.ico')), []);
 assert.deepEqual(responses.filter(r => !r.url.endsWith('/favicon.ico')), []);
 assert.deepEqual(failures, []);
 console.log('PASS receiver browser matrix: 33 full-resolution screenshots; native selector/static, fixed phases, live elapsed time, no unexpected errors');
} catch (error) {
 console.error(error.stack); throw error;
} finally {
 writeFileSync(join(evidence, 'browser.json'), JSON.stringify({ sourceHash, browser: browser.version(), platform: process.platform, viewport: {width:1920,height:1080}, dpr:1, quality:'default', gpu, exceptions, consoleMessages, responses, failures, shots, limitation:'Static geometry/transforms are asserted by native tests; live/static screenshots retain other city actors. No FPS claim.' }, null, 2)+'\n');
 await browser.close();
}
