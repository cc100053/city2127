import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs';

// H0 inspection only: expose the existing scene in this browser response; source stays unchanged.
const out = process.env.CITY2127_EVIDENCE_DIR ?? 'artifacts/housing-city-h0';
assert.ok(!existsSync(`${out}/browser.json`), 'Preserve original evidence');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [], warnings = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (['error', 'warning'].includes(m.type())) warnings.push(m.text()); });
await page.route('**/src/main.ts*', async route => {
  const response = await route.fetch();
  const body = (await response.text()).replace('const start = performance.now();', 'window.housingReview = { T, scene, camera, controls, cityChanges }; const start = performance.now();');
  assert.ok(body.includes('window.housingReview'), 'Vite main instrumentation matched');
  await route.fulfill({ response, body });
});
const shots = [];
try {
  await page.goto(`${process.env.CITY2127_CITY_URL ?? 'http://127.0.0.1:5188'}/?meters=&hour=12&reviewTime=20&quality=low`);
  await page.waitForFunction(() => window.housingReview && document.querySelector('canvas')?.dataset.time);
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    const { devLayout } = await import('/src/devMeters.ts');
    const { controls, cityChanges } = window.housingReview;
    controls.enabled = false;
    cityChanges.applyExhibitionLayout({ ...devLayout(''), energy: { waterGardens: 2, receiver: 'large', flywheel: true, island: true } }, 'city-state-snapshot', 20);
  });
  await page.waitForTimeout(3000);
  const candidates = await page.evaluate(async () => {
    const T = window.housingReview.T;
    const { MeshBVH, acceleratedRaycast } = await import('/node_modules/three-mesh-bvh/src/index.js');
    const { routes } = await import('/src/mobility.ts');
    const { scene, camera } = window.housingReview;
    scene.updateMatrixWorld(true);
    const solids = [], ground = [], rayMeshes = [], trees = new Map(), local = new T.Matrix4(), world = new T.Matrix4();
    const visible = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    scene.traverse(o => {
      if (!o.isMesh || !visible(o) || o.name === 'meter-pulse' || o.material?.side === T.BackSide || o.geometry.type === 'PlaneGeometry') return;
      // Authored mobile actors are checked separately through their complete routes in H2.
      if (o.isInstancedMesh && /people|pedestrian|walker|air|boat|car|occupant|robot|drone|wake|train/.test(o.name)) return;
      o.geometry.computeBoundingBox();
      if (/^(TERRAIN|COAST|PLAZA|PUBLIC|SIDEWALK|SERVICE)/.test(o.name)) ground.push(o);
      if (!trees.has(o.geometry)) trees.set(o.geometry, new MeshBVH(o.geometry, { indirect: true }));
      o.geometry.boundsTree = trees.get(o.geometry);
      if (!o.isInstancedMesh) { o.raycast = acceleratedRaycast; rayMeshes.push(o); }
      const count = o.isInstancedMesh ? o.count : 1;
      for (let i = 0; i < count; i++) {
        if (o.isInstancedMesh) { o.getMatrixAt(i, local); world.multiplyMatrices(o.matrixWorld, local); } else world.copy(o.matrixWorld);
        const box = o.geometry.boundingBox.clone().applyMatrix4(world);
        if (box.max.y <= 2 || box.min.y >= 45) continue;
        solids.push({ name: o.name, box, inverse: world.clone().invert(), tree: trees.get(o.geometry) });
      }
    });
    const hits = box => solids.filter(s => s.box.intersectsBox(box) && s.tree.intersectsBox(box, s.inverse)).map(s => s.name);
    const path = routes(), corridors = [];
    for (const [key, value] of Object.entries(path)) for (const curve of Array.isArray(value) ? value : [value]) {
      const radius = /air|approach|shore|ixApproach/.test(key) ? 22 : /street|guideway|tracks|water|ferry|ixBoat|sweep/.test(key) ? 8 : 4;
      for (let i = 0; i <= 400; i++) corridors.push({ point: curve.getPointAt(i / 400), radius });
    }
    const found = [];
    // Full reserved volumes, including access/utility strip, not just centre points.
    const ray = new T.Raycaster();
    for (let z = -330; z <= 280; z += 5) for (let x = -430; x <= 240; x += 5) {
      const box = new T.Box3(new T.Vector3(x - 12, 2, z - 9), new T.Vector3(x + 12, 28, z + 9));
      const p = new T.Vector3(x, 20, z).project(camera);
      if (Math.abs(p.x) > .82 || Math.abs(p.y) > .8 || hits(box).length) continue;
      let supported = true;
      for (const dx of [-12, 0, 12]) for (const dz of [-9, 0, 9]) {
        ray.set(new T.Vector3(x + dx, 2, z + dz), new T.Vector3(0, -1, 0)); ray.far = 2.5;
        if (!ray.intersectObjects(ground, false).length) supported = false;
        ray.set(new T.Vector3(x + dx, 180, z + dz), new T.Vector3(0, -1, 0)); ray.far = 178;
        if (ray.intersectObjects(rayMeshes, false).length) supported = false;
      }
      if (!supported) continue;
      if (corridors.some(c => box.distanceToPoint(c.point) < c.radius)) continue;
      const target = new T.Vector3(x, 22, z), delta = target.clone().sub(camera.position);
      ray.set(camera.position, delta.clone().normalize()); ray.far = delta.length() - .5;
      if (ray.intersectObjects(rayMeshes, false).length) continue;
      found.push({ x, z, screen: [p.x, p.y] });
    }
    return { found, solidInstances: solids.length };
  });
  writeFileSync(`${out}/candidates.json`, JSON.stringify(candidates, null, 2) + '\n');
  await page.screenshot({ path: `${out}/baseline-day.png` });
  shots.push({ name: 'baseline-day', canvas: await page.locator('canvas').evaluate(c => ({ ...c.dataset })) });
  const intervals = await page.evaluate(() => new Promise(resolve => {
    const frames = []; let previous = performance.now(), start = previous;
    const sample = now => { frames.push(now - previous); previous = now; if (now - start >= 10000) resolve(frames); else requestAnimationFrame(sample); };
    requestAnimationFrame(sample);
  }));
  const gpu = await page.locator('canvas').evaluate(c => { const gl = c.getContext('webgl2'), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });
  const selected = [{ id: 'M', x: -135, z: -175, color: '#d99c4b' }, { id: 'P', x: 45, z: -215, color: '#527f55' }, { id: 'U', x: -265, z: -60, color: '#a96f9c' }];
  for (const site of selected) assert.ok(candidates.found.some(p => p.x === site.x && p.z === site.z), `${site.id} must pass every H0 candidate check`);
  const focalClearance = await page.evaluate(async selected => {
    const { T, scene, camera } = window.housingReview;
    const { changeSites } = await import('/src/layout.ts');
    const result = [];
    for (const site of selected) {
      const box = new T.Box3(new T.Vector3(site.x - 12, 2, site.z - 9), new T.Vector3(site.x + 12, 28, site.z + 9));
      for (const [id, focal] of Object.entries(changeSites)) {
        const target = new T.Vector3(focal.x, focal.h * focal.scale * .6, focal.z), delta = target.clone().sub(camera.position);
        const hit = new T.Ray(camera.position, delta.clone().normalize()).intersectBox(box, new T.Vector3());
        result.push({ candidate: site.id, focal: id, clear: !hit || hit.distanceTo(camera.position) > delta.length() });
      }
      const marker = new T.Mesh(new T.BoxGeometry(24, 26, 18), new T.MeshBasicMaterial({ color: site.color, wireframe: true, depthTest: false }));
      marker.position.set(site.x, 15, site.z); marker.renderOrder = 100; scene.add(marker);
      const p = new T.Vector3(site.x, 28, site.z).project(camera), label = document.createElement('div');
      label.textContent = `${site.id} · ${site.x}, ${site.z} · 24×18 m / 28 m`;
      Object.assign(label.style, { position: 'fixed', left: `${(p.x + 1) * 960}px`, top: `${(1 - p.y) * 540 - 26}px`, background: '#f3eee5', color: site.color, padding: '5px 8px', font: 'bold 14px sans-serif', border: `2px solid ${site.color}`, zIndex: '100' });
      document.body.append(label);
    }
    return result;
  }, selected);
  assert.ok(focalClearance.every(r => r.clear), 'Full candidate volumes preserve four focal centre sightlines');
  await page.screenshot({ path: `${out}/candidates-day.png` });
  shots.push({ name: 'candidates-day', purpose: 'Wire volumes only; no proposed architecture is rendered' });
  writeFileSync(`${out}/browser.json`, JSON.stringify({ browser: browser.version(), platform: process.platform, gpu, viewport: [1920, 1080], dpr: 1, quality: 'low', source: '615ad98, inspection-only response instrumentation', controls: 'locked authored hero', baseline: { scores: [0, 0, 0, 0], energy: { waterGardens: 2, receiver: 'large', flywheel: true, island: true }, hour: 12, reviewTime: 20 }, selected, focalClearance, errors, warnings, shots, intervals, fps: 1000 * intervals.length / intervals.reduce((a, b) => a + b, 0) }, null, 2) + '\n');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
