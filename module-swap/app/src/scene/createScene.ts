import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface SceneContext {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly controls: OrbitControls;
  readonly grid: GridHelper;
  resize(): void;
}

export function createScene(container: HTMLElement): SceneContext {
  const scene = new Scene();
  scene.background = new Color(0x526574);

  const camera = new PerspectiveCamera(45, 1, 0.1, 500);
  camera.position.set(70, 62, 70);

  const renderer = new WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 6, 0);
  controls.enableDamping = true;
  controls.minDistance = 25;
  controls.maxDistance = 180;

  scene.add(new HemisphereLight(0xddeeff, 0x52604e, 2.1));
  const sun = new DirectionalLight(0xffffff, 3.1);
  sun.position.set(-35, 60, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -55;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -55;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 150;
  scene.add(sun);

  const grid = new GridHelper(100, 20, 0x8ad7e8, 0x71818a);
  grid.position.y = -0.205;
  grid.visible = false;
  scene.add(grid);

  const resize = (): void => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  resize();
  window.addEventListener("resize", resize);
  return { scene, camera, renderer, controls, grid, resize };
}
