import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH ?? '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs').href);
const output = process.env.CITY2127_BUDGET_OUT ?? 'artifacts/housing-city-h2/renderer-budget.json';
assert.ok(!existsSync(output), 'Preserve evidence');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const report = { browser: browser.version(), errors: [], warnings: [], failedRequests: [], sourceHashes: Object.fromEntries(['src/housingPrototype.ts', 'src/main.ts', 'src/devHousing.ts', 'artifacts/housing-city-h2/renderer-budget.mjs'].map(f => [f, createHash('sha256').update(readFileSync(f)).digest('hex')])) };
page.on('pageerror', e => report.errors.push(e.message));
page.on('console', m => { if (['error', 'warning'].includes(m.type())) report.warnings.push(m.text()); });
page.on('requestfailed', r => report.failedRequests.push(r.url()));
await page.route('**/src/main.ts*', async route => {
  const response = await route.fetch(); const body = (await response.text()).replace('const start = performance.now();', 'window.budget = { renderer, composer, scene, camera }; const start = performance.now();');
  assert.ok(body.includes('window.budget')); await route.fulfill({ response, body });
});
await page.route('**/src/devHousing.ts*', async route => {
  const response = await route.fetch(); const body = (await response.text()).replace('const motion = matchMedia', 'window.housingStudy = study; const motion = matchMedia');
  assert.ok(body.includes('window.housingStudy')); await route.fulfill({ response, body });
});
try {
  await page.goto(`${process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5188'}/?housing=baseline&hour=12&reviewTime=24&quality=low`);
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.time, { timeout: 90000 });
  await page.waitForLoadState('networkidle');
  report.freshBaseline = await page.evaluate(() => { const r = window.budget.renderer.info; return { geometries: r.memory.geometries, textures: r.memory.textures, drawCalls: r.render.calls, triangles: r.render.triangles }; });
  await page.getByLabel('住宅比較配置').selectOption('mixed'); await page.waitForTimeout(3000);
  report.phases = await page.evaluate(() => {
    const { renderer, composer } = window.budget, study = window.housingStudy;
    const render = visible => { study.root.visible = visible; renderer.info.reset(); composer.render(); const r = renderer.info; return { geometries: r.memory.geometries, textures: r.memory.textures, drawCalls: r.render.calls, triangles: r.render.triangles }; };
    // Synchronous comparison: camera, city actors, energy and lights cannot advance between these paired renders.
    const phases = [0, 12, 20, 24, 28, 40, 64, 76].map(time => {
      study.update(time); const baseline = render(false), mixed = render(true);
      return { time, baseline, mixed, delta: { drawCalls: mixed.drawCalls - baseline.drawCalls, triangles: mixed.triangles - baseline.triangles } };
    });
    study.root.visible = true; return phases;
  });
  report.delta = { geometries: report.phases[0].mixed.geometries - report.freshBaseline.geometries, textures: report.phases[0].mixed.textures - report.freshBaseline.textures,
    drawCalls: Math.max(...report.phases.map(p => p.delta.drawCalls)), triangles: Math.max(...report.phases.map(p => p.delta.triangles)) };
  assert.ok(report.delta.geometries <= 36 && report.delta.textures === 0 && report.delta.drawCalls <= 80 && report.delta.triangles <= 150000, JSON.stringify(report.delta));
  assert.deepEqual(report.errors, []); assert.deepEqual(report.warnings, []); assert.deepEqual(report.failedRequests, []); report.passed = true;
} finally { writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
