import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.CITY2127_PLAYWRIGHT_PATH ?? '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs').href);
const out = process.env.CITY2127_EVIDENCE_DIR ?? 'artifacts/housing-city-h2/final';
assert.ok(!existsSync(`${out}/browser.json`), 'Preserve previous evidence'); mkdirSync(out, { recursive: true });
const base = process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5188';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage(); page.setDefaultTimeout(60000);
const report = { startedAt: new Date().toISOString(), browser: browser.version(), platform: process.platform, viewport: [1920, 1080], dpr: 1,
  sourceHashes: Object.fromEntries(['src/main.ts', 'src/devHousing.ts', 'src/housingPrototype.ts', 'tests/housingH2.browser.mjs', 'tests/housingCityCheck.ts', 'tests/housingPrototype.test.ts'].map(f => [f, createHash('sha256').update(readFileSync(f)).digest('hex')])),
  errors: [], warnings: [], failures: [], badResponses: [], shots: [], performance: [] };
page.on('pageerror', e => report.errors.push(e.message));
page.on('console', m => { if (['error', 'warning'].includes(m.type())) report.warnings.push({ text: m.text(), url: m.location().url }); });
page.on('requestfailed', r => report.failures.push({ url: r.url(), error: r.failure()?.errorText }));
page.on('response', r => { if (r.status() >= 400) report.badResponses.push({ url: r.url(), status: r.status() }); });
// Inspection-only response instrumentation; not part of the application or production bundle.
await page.route('**/src/main.ts*', async route => {
  const response = await route.fetch();
  const body = (await response.text()).replace('const reviewTime =', 'let reviewTime =').replace('const start = performance.now();', 'window.housingReview = { T, scene, camera, controls, cityChanges, renderer, setReviewTime: value => reviewTime = value }; const start = performance.now();');
  assert.ok(body.includes('window.housingReview')); await route.fulfill({ response, body });
});
await page.route('**/src/devHousing.ts*', async route => {
  const response = await route.fetch();
  const body = (await response.text()).replace('const motion = matchMedia', 'window.housingStudy = study; const motion = matchMedia');
  assert.ok(body.includes('window.housingStudy')); await route.fulfill({ response, body });
});
const data = () => page.locator('canvas').evaluate(c => ({ ...c.dataset }));
async function open(query) {
  await page.goto(`${base}/?${new URLSearchParams(query)}`); await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !!document.querySelector('canvas')?.dataset.time);
  assert.equal(await page.locator('.error').count(), 0);
}
async function shot(name) {
  await page.waitForTimeout(500);
  const png = await page.screenshot({ path: `${out}/${name}.png` });
  const pose = await page.evaluate(() => { const { camera, controls } = window.housingReview; return { position: camera.position.toArray(), target: controls.target.toArray(), locked: !controls.enabled }; });
  report.shots.push({ name, url: page.url(), capturedAt: new Date().toISOString(), sha256: createHash('sha256').update(png).digest('hex'), canvas: await data(), pose });
}
try {
  await open({ housing: 'mixed', hour: 12, reviewTime: 20, quality: 'low' });
  await shot('geometry-mixed');
  report.geometry = await page.evaluate(async () => {
    const { T, scene } = window.housingReview, { MeshBVH } = await import('/node_modules/three-mesh-bvh/src/index.js');
    scene.updateMatrixWorld(true); const study = scene.getObjectByName('housing-prototype');
    const shapes = root => {
      const list = [], instance = new T.Matrix4(), world = new T.Matrix4();
      root.traverse(o => {
        if (!o.isMesh) return;
        for (let a = o; a; a = a.parent) if (!a.visible) return;
        o.geometry.computeBoundingBox();
        for (let i = 0; i < (o.isInstancedMesh ? o.count : 1); i++) {
          if (o.isInstancedMesh) { o.getMatrixAt(i, instance); world.multiplyMatrices(o.matrixWorld, instance); } else world.copy(o.matrixWorld);
          const box = o.geometry.boundingBox.clone().applyMatrix4(world);
          list.push({ o, box, matrix: world.clone() });
        }
      }); return list;
    };
    const houses = shapes(study), own = new Set(); study.traverse(o => own.add(o));
    const obstacles = shapes(scene).filter(s => !own.has(s.o)), trees = new Map(), hits = [];
    for (const h of houses) if (!trees.has(h.o.geometry)) trees.set(h.o.geometry, new MeshBVH(h.o.geometry, { indirect: true }));
    let exact = 0;
    for (const h of houses) for (const other of obstacles) if (h.box.intersectsBox(other.box)) {
      exact++;
      other.o.geometry.boundsTree ??= new MeshBVH(other.o.geometry, { indirect: true });
      const relative = h.matrix.clone().invert().multiply(other.matrix), tree = trees.get(h.o.geometry);
      let intersects = tree.intersectsGeometry(other.o.geometry, relative);
      if (intersects && /^(landscape|sidewalk|plaza|service_area|road)$/.test(other.o.material?.name)) {
        const line = new T.Line3();
        intersects = tree.bvhcast(other.o.geometry.boundsTree, relative, { intersectsTriangles: (a, b) =>
          a.intersectsTriangle(b, line) && Math.max(line.start.clone().applyMatrix4(h.matrix).y, line.end.clone().applyMatrix4(h.matrix).y) > .35 });
      }
      if (intersects)
        hits.push({ housing: h.o.parent?.name, other: other.o.name, parent: other.o.parent?.name, box: other.box.getCenter(new T.Vector3()).toArray() });
    }
    const { HOUSING_KEYFRAMES } = await import('/src/housingPrototype.ts');
    const moving = new Set(); window.housingStudy.moving.forEach(root => root.traverse(o => moving.add(o)));
    const fixed = [...obstacles, ...houses.filter(h => !moving.has(h.o))];
    let sweepChecks = 0, sweepBoxes = 0;
    for (let k = 0; k < HOUSING_KEYFRAMES.length - 1; k++) {
      window.housingStudy.update(HOUSING_KEYFRAMES[k]); study.updateMatrixWorld(true);
      const from = window.housingStudy.moving.flatMap(shapes);
      window.housingStudy.update(HOUSING_KEYFRAMES[k + 1]); study.updateMatrixWorld(true);
      const to = window.housingStudy.moving.flatMap(shapes);
      for (let i = 0; i < from.length; i++) {
        const corridor = from[i].box.clone().union(to[i].box).expandByScalar(-.001); sweepBoxes++;
        for (const other of fixed) if (corridor.intersectsBox(other.box)) {
          sweepChecks++; other.o.geometry.boundsTree ??= new MeshBVH(other.o.geometry, { indirect: true });
          if (other.o.geometry.boundsTree.intersectsBox(corridor, other.matrix.clone().invert())) hits.push({ time: HOUSING_KEYFRAMES[k], moving: from[i].o.parent?.name, other: other.o.name, parent: other.o.parent?.name });
        }
      }
    }
    return { exact, houses: houses.length, obstacles: obstacles.length, sweepBoxes, sweepChecks, hits };
  });
  writeFileSync(`${out}/geometry.json`, JSON.stringify(report.geometry, null, 2) + '\n');
  assert.deepEqual(report.geometry.hits, [], 'Housing collides with the actual rendered city');
  for (const hour of [12, 17, 21]) {
    await open({ housing: 'mixed', hour, reviewTime: 24 }); await shot(`hero-transport-${hour}`);
    assert.ok(report.shots.at(-1).pose.position.every((v, i) => Math.abs(v - [-520, 300, -620][i]) < .00001));
    assert.ok(report.shots.at(-1).pose.locked);
  }
  await open({ housing: 'mixed', hour: 12, reviewTime: 0 });
  for (const [view, time] of [['mobile', 0], ['mobile', 7], ['mobile', 16], ['mobile', 24], ['mobile', 30], ['mobile', 40], ['mobile', 56], ['mobile', 64], ['mobile', 76], ['home', 0], ['home', 24], ['home', 40]]) {
    await page.evaluate(time => { window.housingReview.setReviewTime(time); const url = new URL(location.href); url.searchParams.set('reviewTime', time); history.replaceState(null, '', url); }, time);
    await page.getByLabel('住宅比較鏡頭').selectOption(view); await shot(`${view}-${time}`);
    report.shots.at(-1).phase = await page.locator('.housing-review').getAttribute('data-phase');
  }
  await page.evaluate(() => window.housingReview.setReviewTime(24));
  await page.getByLabel('住宅比較鏡頭').selectOption('hero'); await page.waitForTimeout(100);
  const pose = () => page.evaluate(() => window.housingStudy.moving.map(o => [o.position.toArray(), o.scale.toArray()]));
  const moving = await pose();
  await page.getByLabel('住宅靜態閱讀').check(); await page.waitForTimeout(100);
  const dock = await pose(); assert.notDeepEqual(dock, moving);
  assert.equal(await page.locator('.housing-review').getAttribute('data-phase'), 'docked');
  await shot('static-docked');
  await page.getByLabel('住宅靜態閱讀').uncheck(); await page.waitForTimeout(100); assert.deepEqual(await pose(), moving);
  await page.getByRole('button', { name: '重設／停泊' }).click(); await page.waitForTimeout(100); assert.deepEqual(await pose(), dock);
  await page.getByRole('button', { name: '重播90秒' }).click(); await page.waitForTimeout(100); assert.deepEqual(await pose(), dock);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(100); assert.deepEqual(await pose(), dock); await shot('reduced-docked');
  await page.getByLabel('住宅靜態閱讀').uncheck(); await page.waitForTimeout(100); assert.deepEqual(await pose(), dock);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(500);
  assert.deepEqual(await page.locator('canvas').evaluate(c => [c.width, c.height]), [1280, 720]);
  await page.setViewportSize({ width: 1920, height: 1080 });
  report.recovery = { static: true, reducedMotion: true, reset: true, replay: true, ordinaryResize: true };

  // Fresh baseline; real clock, no held reviewTime. No collision instrumentation inside this timed rAF capture.
  await open({ housing: 'baseline', hour: 12, quality: 'low' });
  for (const option of ['baseline', 'mixed']) {
    await page.getByLabel('住宅比較配置').selectOption(option); await page.waitForTimeout(3000);
    await page.getByRole('button', { name: '重播90秒' }).click();
    const frames = await page.evaluate(duration => new Promise(resolve => {
      let previous = performance.now(), start = previous; const intervals = [], phases = {}, stats = [];
      const frame = now => {
        intervals.push(now - previous); previous = now;
        const panel = document.querySelector('.housing-review'), study = window.housingStudy;
        if (!phases[panel.dataset.phase]) phases[panel.dataset.phase] = { elapsed: (now-start)/1000, time: panel.dataset.cycleTime, cabin: study.exchangeCabin.position.toArray(), home: study.wholeHome.position.toArray() };
        if (intervals.length % 120 === 0) { const r = window.housingReview.renderer.info; stats.push({ time: panel.dataset.cycleTime, geometries: r.memory.geometries, textures: r.memory.textures, drawCalls: r.render.calls, triangles: r.render.triangles }); }
        if (now - start >= duration) resolve({ intervals, phases, stats }); else requestAnimationFrame(frame);
      }; requestAnimationFrame(frame);
    }), option === 'mixed' ? 91000 : 30000);
    const stats = await data();
    report.performance.push({ option, quality: 'low', durationSeconds: frames.intervals.reduce((a,b)=>a+b,0)/1000, ...frames, fps: 1000 * frames.intervals.length / frames.intervals.reduce((a,b)=>a+b,0), canvas: stats });
    writeFileSync(`${out}/performance.json`, JSON.stringify(report.performance, null, 2) + '\n');
  }
  const [baseline, mixed] = report.performance;
  const delta = Object.fromEntries(['geometries', 'textures', 'drawCalls', 'triangles'].map(key => [key, Math.max(...mixed.stats.map(s => s[key])) - Number(baseline.canvas[key])]));
  report.delta = delta;
  assert.ok(delta.geometries <= 36 && delta.textures === 0 && delta.drawCalls <= 80 && delta.triangles <= 150000, JSON.stringify(delta));
  assert.ok(mixed.fps >= 50, `H0 FPS floor: ${mixed.fps}`);
  assert.equal(Object.keys(mixed.phases).length, 11, 'Complete 90s loop covers all motion/utility states');
  assert.ok(mixed.stats.every(s => s.geometries === mixed.stats[0].geometries && s.textures === mixed.stats[0].textures), 'No resources grow over the cycle');
  await page.getByRole('button', { name: '重設／停泊' }).click(); await page.waitForTimeout(100); const resetA = await pose();
  await page.getByRole('button', { name: '重播90秒' }).click(); await page.waitForTimeout(5000); await page.getByRole('button', { name: '重設／停泊' }).click(); await page.waitForTimeout(100); assert.deepEqual(await pose(), resetA);
  report.resourceReuse = { entireCycle: true, deterministicLiveReset: true };
  report.gpu = await page.locator('canvas').evaluate(c => { const g = c.getContext('webgl2'), e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); });
  await page.routeWebSocket('ws://127.0.0.1:8799/ws', () => {});
  // Other review modes keep precedence; survey connection is intentionally not started in this isolated check.
  for (const query of [{ housing: 'mixed', energy: 'mixed' }, { housing: 'mixed', meters: '' }, { housing: 'mixed', scaleLab: '' }, { housing: 'mixed', survey: 'ws://127.0.0.1:8799/ws' }, {}]) {
    await open({ ...query, hour: 12, reviewTime: 20, quality: 'low' });
    assert.equal(await page.locator('.housing-review').count(), 0);
  }
  assert.deepEqual(report.errors, []); assert.deepEqual(report.failures, []);
  assert.deepEqual(report.badResponses.filter(r => !r.url.endsWith('/favicon.ico')), []);
  assert.deepEqual(report.warnings.filter(r => !r.url.endsWith('/favicon.ico')), []);
  report.passed = true;
} finally {
  writeFileSync(`${out}/browser.json`, JSON.stringify(report, null, 2) + '\n'); await browser.close();
}
