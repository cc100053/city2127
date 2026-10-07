import * as T from 'three';
import qrcode from 'qrcode-generator';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { futureBuildingPool } from '../../src/qrFutureBuildings.ts';
import { selectQrLandmark } from './landmarkSelection.js';
import maritimeSky from '../../asset/textures/maritime-sky.png';
import './buildingQr.css';

const DEMO_LAYOUT = { version: 2, bands: { nw: 'high', ne: 'high', sw: 'high', se: 'high' }, automatedPorts: 6, sharedSeats: 8, treeCount: 12, plantedFraction: .8, coolingFins: 0, functionModules: 6 };
const TILT = 1.12, YAW = .65;

export function createBuildingQr(host, proposalId, archivedView) {
  // Fail before allocating a city when WebGL is unavailable (standard QR fallback).
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  let pool, landmark, building;
  try {
    pool = futureBuildingPool(archivedView?.layout ?? DEMO_LAYOUT, archivedView?.slotSeeds);
    landmark = selectQrLandmark(proposalId, pool.candidates);
    building = pool.create(landmark.id);
  } catch (error) { renderer.dispose(); throw error; }
  finally { pool?.dispose(); }
  // The landmark's rear gallery hides its sphere; show its bay-facing side, like the city hero view.
  const yaw = landmark.id === 'landmark-civic-core' ? YAW + Math.PI : YAW;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearColor('#ecf2ed');
  renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = .84;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', landmark.label + 'から変化するQRコード');
  Object.assign(host.dataset, { landmarks: landmark.id, source: landmark.id === 'landmark-civic-core' ? 'city-landmark' : 'city-district', sourcePosition: landmark.x + ',' + landmark.z, revision: String(archivedView?.revision ?? 'demo') });
  const scene = new T.Scene(); scene.environmentIntensity = .6;
  scene.add(new T.HemisphereLight('#e3ebee', '#8a8274', .6));
  const sun = new T.DirectionalLight('#ffe7c4', 3.15); sun.position.set(-100, 200, 120);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.normalBias = .15;
  Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 1, far: 700 }); scene.add(sun);
  const pmrem = new T.PMREMGenerator(renderer), room = new RoomEnvironment();
  let environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; room.dispose();
  let disposed = false, skyTexture;
  new T.TextureLoader().load(maritimeSky, texture => {
    if (disposed) { texture.dispose(); return; }
    skyTexture = texture;
    const canvas = document.createElement('canvas'); canvas.width = texture.image.width; canvas.height = texture.image.height;
    const context = canvas.getContext('2d'); context.filter = 'saturate(.55) sepia(.12) brightness(1.04)'; context.drawImage(texture.image, 0, 0);
    const reflected = new T.CanvasTexture(canvas); reflected.colorSpace = T.SRGBColorSpace; reflected.mapping = T.EquirectangularReflectionMapping;
    const capture = new RoomEnvironment(); capture.background = reflected;
    // Match the city: remove room walls, retain the HDR light cards around the sky.
    capture.traverse(object => { if (object.isMesh && object.material.isMeshStandardMaterial) object.visible = false; });
    environment.dispose(); environment = pmrem.fromScene(capture, .04); scene.environment = environment.texture;
    reflected.dispose(); capture.dispose();
  });
  const camera = new T.OrthographicCamera(-25, 25, 25, -25, .1, 2000);
  const renderTarget = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, renderTarget); composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, 1, 1); ao.updateGtaoMaterial({ radius: 2, distanceFallOff: .8, thickness: 2, samples: 8 }); ao.blendIntensity = .8; composer.addPass(ao);
  // A pale close-up backdrop fills the frame; city-wide bloom would wash out this small diorama.
  composer.addPass(new OutputPass());
  const presentation = new T.Group(), qrStage = new T.Group(); scene.add(presentation, qrStage);
  const bounds = new T.Box3().setFromObject(building), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
  const wrapper = new T.Group(); wrapper.add(building); presentation.add(wrapper);
  const groundMaterial = new T.MeshStandardMaterial({ color: '#ecf2ed', roughness: .9 });
  const ground = new T.Mesh(new T.PlaneGeometry(1000, 1000), groundMaterial); ground.rotation.x = -Math.PI / 2; ground.position.y = -.15; ground.receiveShadow = true; presentation.add(ground);
  const qrWhite = new T.MeshBasicMaterial({ color: '#ecf2ed', toneMapped: false });
  const ink = new T.MeshBasicMaterial({ color: '#102331', toneMapped: false }), tileGeometry = new T.BoxGeometry(1, .025, 1);
  let count = 0, radius = 24, cityExtent = 24, distance = 250, timer, frame;
  const target = new T.Vector3();
  let mode = 'city', from = 1, to = 1, changedAt = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const controls = document.createElement('div'); controls.className = 'building-qr-controls';
  controls.innerHTML = '<button type="button" data-view="city">' + landmark.label + 'を見る</button><button type="button" data-view="scan">真上からスキャン</button><span role="status"></span>';
  host.parentElement.parentElement.appendChild(controls);
  controls.querySelectorAll('button').forEach(button => button.addEventListener('click', () => { clearTimeout(timer); setView(button.dataset.view); }));
  function currentAngle(now) {
    const p = reduced ? 1 : Math.min(1, (now - changedAt) / 850);
    return T.MathUtils.lerp(from, to, p * p * (3 - 2 * p));
  }
  function setView(next) {
    from = currentAngle(performance.now()); to = next === 'scan' ? 0 : 1; mode = next; changedAt = performance.now(); host.dataset.cityView = 'transition';
    controls.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === next)));
    controls.querySelector('span').textContent = next === 'scan' ? 'スマートフォンのカメラで読み取ってください' : landmark.label + ' · 2127 ODAIBA';
  }
  function clearQr() {
    for (const mesh of [...qrStage.children]) { qrStage.remove(mesh); if (mesh.isInstancedMesh) mesh.dispose(); if (mesh.geometry !== tileGeometry) mesh.geometry.dispose(); }
  }
  function pose(angle) {
    const aim = target.clone().multiplyScalar(angle), tilt = angle * TILT;
    camera.position.set(aim.x + Math.sin(tilt) * Math.sin(yaw) * distance, aim.y + Math.cos(tilt) * distance, aim.z + Math.sin(tilt) * Math.cos(yaw) * distance);
    // Upright architecture in city view; north-up when scanning.
    camera.up.set(0, angle, -(1 - angle)); camera.lookAt(aim); camera.updateMatrixWorld(true);
    const extent = T.MathUtils.lerp(radius, cityExtent, angle);
    camera.left = camera.bottom = -extent; camera.right = camera.top = extent; camera.updateProjectionMatrix();
  }
  function build(url) {
    clearTimeout(timer); clearQr();
    const qr = qrcode(0, 'H'); qr.addData(url, 'Byte'); qr.make(); count = qr.getModuleCount(); radius = (count + 10) / 2;
    const plate = new T.Mesh(new T.BoxGeometry(count + 10, .15, count + 10), qrWhite); plate.position.y = -.1; qrStage.add(plate);
    const lots = []; for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (qr.isDark(row, col)) lots.push([row, col]);
    const tiles = new T.InstancedMesh(tileGeometry, ink, lots.length), dummy = new T.Object3D();
    lots.forEach(([row, col], index) => { dummy.position.set(col - (count - 1) / 2, 0, row - (count - 1) / 2); dummy.updateMatrix(); tiles.setMatrixAt(index, dummy.matrix); }); qrStage.add(tiles);
    const scale = count * .84 / Math.max(size.x, size.z); wrapper.scale.setScalar(scale);
    wrapper.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    const fitted = new T.Box3().setFromObject(wrapper); fitted.getCenter(target);
    distance = Math.max(250, fitted.getSize(new T.Vector3()).length() * 3); camera.far = distance * 5;
    cityExtent = 1; pose(1);
    const projected = new T.Vector3();
    for (const x of [fitted.min.x, fitted.max.x]) for (const y of [fitted.min.y, fitted.max.y]) for (const z of [fitted.min.z, fitted.max.z]) {
      projected.set(x, y, z).applyMatrix4(camera.matrixWorldInverse); cityExtent = Math.max(cityExtent, Math.abs(projected.x), Math.abs(projected.y));
    }
    cityExtent *= 1.18;
    pose(1);
    const screenBounds = [Infinity, Infinity, -Infinity, -Infinity];
    for (const x of [fitted.min.x, fitted.max.x]) for (const y of [fitted.min.y, fitted.max.y]) for (const z of [fitted.min.z, fitted.max.z]) {
      projected.set(x, y, z).project(camera);
      screenBounds[0] = Math.min(screenBounds[0], projected.x); screenBounds[1] = Math.min(screenBounds[1], projected.y);
      screenBounds[2] = Math.max(screenBounds[2], projected.x); screenBounds[3] = Math.max(screenBounds[3], projected.y);
    }
    Object.assign(host.dataset, { buildingHeight: String(size.y * scale), cityExtent: String(cityExtent), fitMargin: '1.18', projectedBounds: JSON.stringify(screenBounds), payload: url, buildings: '1' });
    host.replaceChildren(renderer.domElement); from = to = 1; setView('city'); resize();
  }
  function resize() { const side = Math.max(1, host.clientWidth); renderer.setSize(side, side, false); composer.setSize(side, side); }
  const observer = new ResizeObserver(resize); observer.observe(host);
  let last = 0;
  function animate(now) {
    frame = requestAnimationFrame(animate); if (document.hidden || now - last < 1000 / 30) return; last = now;
    const angle = currentAngle(now); pose(angle);
    presentation.visible = angle > .001; qrStage.visible = angle < .999;
    wrapper.scale.y = wrapper.scale.x * Math.max(.001, angle);
    if (Math.abs(angle - to) < .001) host.dataset.cityView = mode;
    if (angle < .001) renderer.render(scene, camera); else composer.render();
  }
  frame = requestAnimationFrame(animate);
  return {
    build,
    reveal() { setView('city'); timer = setTimeout(() => setView('scan'), 8000); },
    reset() { clearTimeout(timer); controls.hidden = true; },
    showControls() { controls.hidden = false; },
    dispose() {
      disposed = true; clearTimeout(timer); cancelAnimationFrame(frame); observer.disconnect(); clearQr();
      building.traverse(object => { if (object.isMesh) { object.geometry.dispose(); [object.material].flat().forEach(material => material.dispose()); } if (object.isInstancedMesh) object.dispose(); });
      ground.geometry.dispose(); groundMaterial.dispose(); tileGeometry.dispose(); qrWhite.dispose(); ink.dispose();
      composer.passes.forEach(pass => pass.dispose?.()); composer.dispose(); environment.dispose(); skyTexture?.dispose(); pmrem.dispose(); sun.shadow.dispose(); renderer.dispose(); renderer.domElement.remove(); controls.remove();
    },
  };
}
