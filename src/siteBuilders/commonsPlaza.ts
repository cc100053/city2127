import * as T from 'three';
import { arc, bake, box, futureLight, glass, leaf, membrane, pink, shrubs, sign, stone, trim, type Kit } from '../cityRig.ts';
import { siteLayerDefinition } from '../changeCatalog.ts';
import { createGuestMarker, createSiteLayer, createSiteRoot, SITE_TRANSITION_SECONDS, type BuiltSite } from './siteRuntime.ts';
import type { ExhibitionLayout } from '../surveyView.ts';

const SEAT_COUNT = 8;
const HIDDEN = 1e-3;
const DEFAULT_TARGET = { band: 'mixed', sharedSeats: 4 } as const;

export type CommonsPlazaTarget = {
  readonly band: ExhibitionLayout['bands']['sw'];
  readonly sharedSeats: number;
};

export interface CommonsPlazaDiagnostics {
  readonly band: CommonsPlazaTarget['band'];
  readonly targetSharedSeats: number;
  readonly visibleSharedSeats: number;
  readonly targetScreenedSeats: number;
  readonly visibleScreenedSeats: number;
}

export interface CommonsPlazaRuntime {
  setTarget(target: CommonsPlazaTarget, now: number, immediate: boolean): boolean;
  update(now: number): void;
  restoreLegacy(): void;
  getDiagnostics(): CommonsPlazaDiagnostics;
}

type CommonsPlazaSite = BuiltSite & { readonly commonsPlaza: CommonsPlazaRuntime };

function createInstancedBox(parent: T.Object3D, name: string, size: [number, number, number], material: T.Material): T.InstancedMesh {
  const template = box(new T.Group(), size, [0, 0, 0], material, .08);
  const mesh = new T.InstancedMesh(template.geometry, material, SEAT_COUNT);
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}

function sharedSlotLevels(sharedSeats: number): Float32Array {
  const levels = new Float32Array(SEAT_COUNT);
  for (let seat = 0; seat < sharedSeats; seat++) levels[Math.floor(seat * SEAT_COUNT / sharedSeats)] = 1;
  return levels;
}

function createCommonsPlazaRuntime(plaza: T.Group): CommonsPlazaRuntime {
  const sharedSeats = createInstancedBox(plaza, 'commons-shared-seats', [1.35, .34, .48], leaf);
  const sharedBacks = createInstancedBox(plaza, 'commons-shared-backs', [1.35, .4, .12], trim);
  const screenedSeats = createInstancedBox(plaza, 'commons-screened-seats', [.82, .34, .48], leaf);
  const screenGeometry = new T.CylinderGeometry(.62, .62, 1.45, 24, 1, true, Math.PI / 4, Math.PI * 1.5).translate(0, .85, 0);
  const curvedScreens = new T.InstancedMesh(screenGeometry, glass, SEAT_COUNT);
  curvedScreens.name = 'commons-curved-screens';
  curvedScreens.castShadow = curvedScreens.receiveShadow = true;
  curvedScreens.frustumCulled = false;
  plaza.add(curvedScreens);

  const meshes = [sharedSeats, sharedBacks, screenedSeats, curvedScreens];
  for (const mesh of meshes) mesh.visible = false;

  const levels = sharedSlotLevels(DEFAULT_TARGET.sharedSeats);
  const from = new Float32Array(levels);
  const to = new Float32Array(levels);
  const transform = new T.Object3D();
  let target: CommonsPlazaTarget = DEFAULT_TARGET;
  let exhibitionTargetApplied = false;
  let active = false;
  let start = 0;

  const writeInstances = () => {
    for (let i = 0; i < SEAT_COUNT; i++) {
      const angle = i / SEAT_COUNT * Math.PI * 2;
      const x = Math.cos(angle) * 3.1, z = -Math.sin(angle) * 3.1;
      const yaw = angle - Math.PI / 2;
      const shared = levels[i], screened = 1 - shared;

      transform.position.set(x, .78, z);
      transform.rotation.set(0, yaw, 0);
      transform.scale.set(1, Math.max(HIDDEN, shared), 1);
      transform.updateMatrix();
      sharedSeats.setMatrixAt(i, transform.matrix);
      transform.position.y = 1.12;
      transform.position.x = x - Math.sin(yaw) * .17;
      transform.position.z = z - Math.cos(yaw) * .17;
      transform.scale.y = Math.max(HIDDEN, shared);
      transform.updateMatrix();
      sharedBacks.setMatrixAt(i, transform.matrix);

      transform.position.set(x, .78, z);
      transform.rotation.set(0, yaw, 0);
      transform.scale.set(1, Math.max(HIDDEN, screened), 1);
      transform.updateMatrix();
      screenedSeats.setMatrixAt(i, transform.matrix);

      // The open side faces the plaza; its rear arc folds flat as the unit becomes shared.
      transform.position.set(x, .12, z);
      transform.rotation.set(-shared * Math.PI / 2, yaw, 0, 'YXZ');
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      curvedScreens.setMatrixAt(i, transform.matrix);
    }
    for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
  };

  writeInstances();

  const runtime: CommonsPlazaRuntime = {
    setTarget(next, now, immediate) {
      if (!Number.isInteger(next.sharedSeats) || next.sharedSeats < 0 || next.sharedSeats > SEAT_COUNT) {
        throw new RangeError(`sharedSeats must be an integer from 0 to ${SEAT_COUNT}.`);
      }
      runtime.update(now);
      const enteringExhibition = !exhibitionTargetApplied;
      const changed = enteringExhibition || next.band !== target.band || next.sharedSeats !== target.sharedSeats;
      target = { band: next.band, sharedSeats: next.sharedSeats };
      exhibitionTargetApplied = true;
      for (const mesh of meshes) mesh.visible = true;

      if (!changed) {
        if (immediate) {
          levels.set(to);
          active = false;
          writeInstances();
        }
        return false;
      }

      from.set(levels);
      to.set(sharedSlotLevels(next.sharedSeats));
      start = now;
      active = !immediate;
      if (immediate) levels.set(to);
      writeInstances();
      return true;
    },
    update(now) {
      if (!active) return;
      const raw = Math.min(1, Math.max(0, (now - start) / SITE_TRANSITION_SECONDS));
      const progress = raw * raw * (3 - 2 * raw);
      for (let i = 0; i < SEAT_COUNT; i++) levels[i] = from[i] + (to[i] - from[i]) * progress;
      active = raw < 1;
      writeInstances();
    },
    restoreLegacy() {
      target = DEFAULT_TARGET;
      exhibitionTargetApplied = false;
      active = false;
      levels.set(sharedSlotLevels(DEFAULT_TARGET.sharedSeats));
      from.set(levels);
      to.set(levels);
      for (const mesh of meshes) mesh.visible = false;
      writeInstances();
    },
    getDiagnostics() {
      let visibleSharedSeats = 0, visibleScreenedSeats = 0;
      if (exhibitionTargetApplied) {
        for (const level of levels) {
          if (level > HIDDEN) visibleSharedSeats++;
          if (1 - level > HIDDEN) visibleScreenedSeats++;
        }
      }
      return {
        band: target.band,
        targetSharedSeats: target.sharedSeats,
        visibleSharedSeats,
        targetScreenedSeats: SEAT_COUNT - target.sharedSeats,
        visibleScreenedSeats,
      };
    },
  };

  return runtime;
}

export function buildCommonsPlaza(scene: T.Scene, kit: Kit): CommonsPlazaSite {
  const root = createSiteRoot(scene, 'sw');
  const plazaLayer = createSiteLayer(root, siteLayerDefinition('dogenzakaSouth', 'plaza'));
  const neutralPropsLayer = createSiteLayer(root, siteLayerDefinition('dogenzakaSouth', 'commonsNeutralProps'));
  const plaza = plazaLayer.group;
  arc(plaza, 0, 5, .2, [0, .42, 0], stone);
  arc(plaza, 2.05, 2.15, .02, [0, .62, 0], futureLight);
  arc(plaza, 4.3, 5, .5, [0, .62, 0], trim, 1.2, 3.6);
  arc(plaza, 4.4, 4.9, .08, [0, 1.12, 0], leaf, 1.2, 3.6);
  shrubs(plaza, 4.65, 1.15, 1.2, 3.6, 23);
  for (const [start, length] of [[.35, 1.2], [2.45, 1.2], [4.55, 1.2]]) arc(plaza, 2.6, 3, .42, [0, .62, 0], pink, start, length);
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2 + .26;
    box(plaza, [.2, 4.3, .2], [Math.cos(angle) * 3.8, 2.8, -Math.sin(angle) * 3.8], trim, .05);
  }
  arc(plaza, 3.1, 4.5, .22, [0, 4.95, 0], trim);
  arc(plaza, 0, 3.1, .06, [0, 5.03, 0], membrane);
  sign(plaza, kit, '公共広場 / COMMONS', 2.2, 2.1, 4, 4, .55, '#536f66');
  plaza.add(...bake(plaza));

  // Shared and screened seats live on the common v2 plaza layer, hidden until its target is applied.
  const commonsPlaza = createCommonsPlazaRuntime(plaza);
  return {
    id: 'dogenzakaSouth', root,
    layers: { plaza: plazaLayer, commonsNeutralProps: neutralPropsLayer },
    marker: createGuestMarker(root, 'sw'),
    commonsPlaza,
  };
}
