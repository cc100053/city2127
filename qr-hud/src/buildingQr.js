import * as T from 'three';
import qrcode from 'qrcode-generator';
import odaiba from './odaiba-qr-models.json';
import './buildingQr.css';

// Generated from the team's Odaiba GLBs; retain spheres/arches and original colors.
function template(model) {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(model.positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(model.colors, 3));
  geometry.setIndex(model.indices);
  if (model.normals) geometry.setAttribute('normal', new T.Float32BufferAttribute(model.normals, 3));
  else geometry.computeVertexNormals();
  return geometry;
}

export function createBuildingQr(host) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor('#ecf2ed');
  renderer.domElement.setAttribute('aria-label', 'フジテレビ本社ビルから変化するQRコード');
  host.dataset.landmarks = 'fuji-tv';
  const scene = new T.Scene(), city = new T.Group();
  scene.add(city, new T.HemisphereLight('#ffffff', '#536a7c', 2.5));
  const sun = new T.DirectionalLight('#fff2da', 2.4); sun.position.set(-20, 45, 30); scene.add(sun);
  const camera = new T.OrthographicCamera(-25, 25, 25, -25, .1, 500);
  const buildingGeometry = template(odaiba.models.find(model => model.id === 'fuji-tv'));
  const facade = new T.MeshStandardMaterial({ vertexColors: true, roughness: .65 });
  const ink = new T.MeshBasicMaterial({ color: '#102331' });
  const scan = { mask: { value: null }, count: { value: 1 }, progress: { value: 0 }, color: { value: new T.Color('#102331') } };
  // One complete landmark in presentation view; QR columns cut through the
  // same mesh during the top-view transition. Dark plinths complete its footprint.
  facade.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { qrMask: scan.mask, qrCount: scan.count, qrProgress: scan.progress, qrInk: scan.color });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 qrWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nqrWorld = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 qrWorld;\nuniform sampler2D qrMask;\nuniform float qrCount;\nuniform float qrProgress;\nuniform vec3 qrInk;')
      .replace('#include <opaque_fragment>', `
        vec2 qrCell = qrWorld + vec2(qrCount * 0.5);
        vec2 qrUV = (floor(qrCell) + 0.5) / qrCount;
        float dark = texture2D(qrMask, qrUV).r;
        float cut = max(abs(fract(qrCell).x - 0.5), abs(fract(qrCell).y - 0.5));
        if (qrProgress > 0.0 && dark < 0.5 && cut <= qrProgress * 0.501) discard;
        outgoingLight = mix(outgoingLight, qrInk, qrProgress);
        #include <opaque_fragment>
      `);
  };
  const ground = new T.MeshBasicMaterial({ color: '#ecf2ed' });
  const tileGeometry = new T.BoxGeometry(1, .025, 1);
  let meshes = [], count = 0, radius = 24, frame, timer, revealAt = 0, mask;
  let mode = 'city', from = 1, to = 1, changedAt = 0, growth = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const controls = document.createElement('div'); controls.className = 'building-qr-controls';
  controls.innerHTML = '<button type="button" data-view="city">フジテレビを見る</button><button type="button" data-view="scan">真上からスキャン</button><span role="status"></span>';
  host.parentElement.parentElement.appendChild(controls);
  controls.querySelectorAll('button').forEach(button => button.addEventListener('click', () => { clearTimeout(timer); setView(button.dataset.view); }));
  function setView(next) {
    from = currentAngle(performance.now()); to = next === 'scan' ? 0 : 1; mode = next; changedAt = performance.now();
    host.dataset.cityView = 'transition';
    controls.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === next)));
    controls.querySelector('span').textContent = next === 'scan' ? 'スマートフォンのカメラで読み取ってください' : 'フジテレビ本社ビル · ODAIBA';
  }
  function currentAngle(now) {
    const p = reduced ? 1 : Math.min(1, (now - changedAt) / 850);
    return T.MathUtils.lerp(from, to, p * p * (3 - 2 * p));
  }
  function clear() {
    clearTimeout(timer);
    meshes.forEach(mesh => { city.remove(mesh); if (mesh.isInstancedMesh) mesh.dispose(); else if (mesh.geometry !== buildingGeometry) mesh.geometry.dispose(); }); meshes = [];
    mask?.dispose(); mask = undefined;
  }
  function build(url) {
    clear();
    const qr = qrcode(0, 'H'); qr.addData(url, 'Byte'); qr.make(); count = qr.getModuleCount();
    radius = (count + 10) / 2;
    const lots = [], pixels = new Uint8Array(count * count * 4);
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
      const dark = qr.isDark(row, col);
      if (dark) lots.push({ row, col });
      const offset = (row * count + col) * 4;
      pixels.fill(dark ? 255 : 0, offset, offset + 3); pixels[offset + 3] = 255;
    }
    mask = new T.DataTexture(pixels, count, count, T.RGBAFormat);
    mask.magFilter = mask.minFilter = T.NearestFilter; mask.needsUpdate = true;
    scan.mask.value = mask; scan.count.value = count;
    const plate = new T.Mesh(new T.BoxGeometry(count + 10, .15, count + 10), ground); plate.position.y = -.1; meshes.push(plate); city.add(plate);
    const tiles = new T.InstancedMesh(tileGeometry, ink, lots.length), dummy = new T.Object3D();
    lots.forEach(({ row, col }, index) => {
      dummy.position.set(col - (count - 1) / 2, 0, row - (count - 1) / 2); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); tiles.setMatrixAt(index, dummy.matrix);
    });
    meshes.push(tiles); city.add(tiles);
    const building = new T.Mesh(buildingGeometry, facade);
    building.position.y = .025; building.scale.setScalar(count * 1.08);
    building.userData.buildings = true; meshes.push(building); city.add(building);
    host.replaceChildren(renderer.domElement); host.dataset.payload = url; host.dataset.buildings = '1';
    growth = false; city.scale.y = 1; from = to = 1; setView('city'); resize();
  }
  function resize() { const size = Math.max(1, host.clientWidth); renderer.setSize(size, size, false); }
  const observer = new ResizeObserver(resize); observer.observe(host);
  let last = 0;
  function animate(now) {
    frame = requestAnimationFrame(animate);
    if (document.hidden || now - last < 1000 / 30) return; last = now;
    const angle = currentAngle(now), tilt = angle * .95;
    const extent = radius * (1 + angle * .18);
    camera.left = camera.bottom = -extent; camera.right = camera.top = extent; camera.updateProjectionMatrix();
    const targetY = angle * count * .12;
    camera.position.set(angle * 34, targetY + Math.cos(tilt) * 110, Math.sin(tilt) * 110); camera.up.set(0, 0, -1); camera.lookAt(0, targetY, 0);
    scan.progress.value = 1 - angle;
    ink.color.set(angle < .001 ? '#102331' : '#c3d4d5');
    if (growth) city.scale.y = reduced ? 1 : Math.max(.01, Math.min(1, (now - revealAt) / 1200));
    if (Math.abs(angle - to) < .001) host.dataset.cityView = mode;
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(animate);
  return {
    build,
    reveal() { growth = true; revealAt = performance.now(); setView('city'); timer = setTimeout(() => setView('scan'), reduced ? 0 : 3500); },
    reset() { clearTimeout(timer); controls.hidden = true; },
    showControls() { controls.hidden = false; },
    dispose() {
      clear(); cancelAnimationFrame(frame); observer.disconnect();
      buildingGeometry.dispose(); tileGeometry.dispose(); facade.dispose(); ink.dispose(); ground.dispose();
      renderer.dispose(); renderer.domElement.remove(); controls.remove();
    },
  };
}
