import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { addCityModel } from './modelAssets';
import { placeOdaibaModel } from './odaibaPlacement';
import layout from './odaiba-layout.json';
import './odaiba.css';

const status = document.querySelector<HTMLElement>('#load-status')!;
function reportError(error: unknown) {
  status.dataset.error = 'true';
  status.textContent = 'Preview incomplete. Reload to retry. ' + (error instanceof Error ? error.message : String(error));
  console.error(error);
}

try {
  const scene = new T.Scene();
  scene.background = new T.Color('#d6e4e7');
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.domElement.setAttribute('aria-label', 'Odaiba Phase 03D. Drag to orbit, scroll to zoom, right-drag to pan.');
  document.querySelector('#app')!.appendChild(renderer.domElement);
  const pmrem = new T.PMREMGenerator(renderer), room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, .04).texture;
  scene.environmentIntensity = .45;
  room.dispose(); pmrem.dispose();
  scene.add(new T.HemisphereLight('#f3f8ff', '#858477', 1.5));
  const sun = new T.DirectionalLight('#fff0da', 2.5);
  sun.position.set(-500, 1200, -400);
  scene.add(sun);

  const perspective = new T.PerspectiveCamera(42, innerWidth / innerHeight, 1, 12000);
  const top = new T.OrthographicCamera(-1, 1, 1, -1, 1, 12000);
  const target = new T.Vector3(-25, 0, 401);
  let camera: T.PerspectiveCamera | T.OrthographicCamera = perspective;
  let controls = new OrbitControls(camera, renderer.domElement);
  const overviewButton = document.querySelector<HTMLButtonElement>('#overview')!;
  const topButton = document.querySelector<HTMLButtonElement>('#top-view')!;
  function resize() {
    perspective.aspect = innerWidth / innerHeight;
    perspective.updateProjectionMatrix();
    const halfHeight = 1100;
    top.left = -halfHeight * innerWidth / innerHeight;
    top.right = -top.left; top.top = halfHeight; top.bottom = -halfHeight;
    top.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  function setView(topView: boolean) {
    // Recreate controls for the changed camera up-axis and discard pending damping.
    controls.dispose();
    camera = topView ? top : perspective;
    camera.up.set(0, topView ? 0 : 1, topView ? -1 : 0);
    camera.position.copy(target).add(topView ? new T.Vector3(0, 2800, 0) : new T.Vector3(-1550, 1700, -1950));
    if (topView) { top.zoom = 1; top.updateProjectionMatrix(); }
    camera.lookAt(target);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.screenSpacePanning = topView;
    controls.minDistance = 80; controls.maxDistance = 6500;
    controls.minZoom = .4; controls.maxZoom = 15;
    controls.maxPolarAngle = topView ? Math.PI : Math.PI / 2 - .02;
    controls.enableRotate = !topView;
    controls.update();
    overviewButton.setAttribute('aria-pressed', String(!topView));
    topButton.setAttribute('aria-pressed', String(topView));
    renderer.domElement.dataset.view = topView ? 'top' : 'overview';
  }
  overviewButton.onclick = () => setView(false);
  topButton.onclick = () => setView(true);
  resize(); setView(false);
  window.addEventListener('resize', resize);

  const environmentUrl = new URL('../asset/models/odaiba-masterplan/odaiba_masterplan_v01_phase03d_environment.glb', import.meta.url).href;
  // Literal directory depth allows Vite to include only the eight named building GLBs.
  const buildingUrls: Record<string, string> = {
    'aqua-city-odaiba': new URL('../asset/models/aqua-city-odaiba/aqua-city-odaiba.glb', import.meta.url).href,
    'decks-tokyo-beach': new URL('../asset/models/decks-tokyo-beach/decks-tokyo-beach.glb', import.meta.url).href,
    'divercity-tokyo-plaza': new URL('../asset/models/divercity-tokyo-plaza/divercity-tokyo-plaza.glb', import.meta.url).href,
    'divercity-office-tower': new URL('../asset/models/divercity-office-tower/divercity-office-tower.glb', import.meta.url).href,
    'fuji-tv': new URL('../asset/models/fuji-tv/fuji-tv.glb', import.meta.url).href,
    'hilton-tokyo-odaiba': new URL('../asset/models/hilton-tokyo-odaiba/hilton-tokyo-odaiba.glb', import.meta.url).href,
    'grand-nikko-tokyo-daiba': new URL('../asset/models/grand-nikko-tokyo-daiba/grand-nikko-tokyo-daiba.glb', import.meta.url).href,
    'telecom-center': new URL('../asset/models/telecom-center/telecom-center.glb', import.meta.url).href,
  };
  let loaded = 0;
  const updateLoaded = () => {
    renderer.domElement.dataset.loaded = String(++loaded);
    if (!status.dataset.error) status.textContent = loaded === 9 ? 'Environment + 8 / 8 buildings loaded' : `Loading scene · ${loaded} / 9 assets`;
  };
  Promise.all([
    addCityModel(scene, environmentUrl, [0, 0, 0]).then(updateLoaded),
    ...layout.buildings.map(async placement => {
      const model = await addCityModel(scene, buildingUrls[placement.id], [0, 0, 0]);
      model.name = placement.id;
      placeOdaibaModel(model, placement);
      updateLoaded();
    }),
  ]).catch(reportError);

  renderer.setAnimationLoop(() => {
    controls.update(); renderer.render(scene, camera);
    renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
    renderer.domElement.dataset.triangles = String(renderer.info.render.triangles);
    renderer.domElement.dataset.camera = camera.position.toArray().map(v => v.toFixed(2)).join(',');
    renderer.domElement.dataset.zoom = String(camera.zoom);
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); renderer.setAnimationLoop(null);
    reportError(new Error('Graphics context lost.'));
  });
} catch (error) { reportError(error); }
