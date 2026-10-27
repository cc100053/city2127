import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { arc, bake, box, futureLight, leaf, leafyCrown, membrane, paint, pink, publicLight, shrubs, stone, trim, type Kit } from '../cityRig.ts';
import { siteLayerDefinition, type EnvironmentParkTarget } from '../changeCatalog.ts';
import { EnvironmentDistrict } from '../districtMeters.ts';
import { changeSites } from '../layout.ts';
import type { SiteAssetLoaderCache } from '../siteAssets/assetLoader.ts';
import { SITE_TRANSITION_SECONDS, createGuestMarker, createSiteLayer, createSiteRoot, type BuiltSite, type EnvironmentParkDiagnostics, type EnvironmentParkRuntime } from './siteRuntime.ts';

const lawn = paint('#9fbf8a', .9);
const water = new T.MeshStandardMaterial({ color: '#7fb4c4', roughness: .05, metalness: .3 });
const treeTrunk = paint('#62756b', .88);
const photovoltaicFoliage = paint('#728c61', .82, .08);
photovoltaicFoliage.name = 'park-photovoltaic-foliage';
const TREE_SLOTS = [
  { x: -2.9, z: -1.9, height: 7 }, { x: 2.4, z: -2.9, height: 5.5 }, { x: -2, z: 3.1, height: 5 },
  { x: 3.3, z: 1.2, height: 6.5 }, { x: .4, z: 3.6, height: 4 }, { x: -1.4, z: -.5, height: 4.2 },
  { x: 1.1, z: .8, height: 4.4 }, { x: -.7, z: 2, height: 4.1 },
  { x: 1.6, z: -1.1, height: 3.8 }, { x: -1.9, z: 1.8, height: 3.9 }, { x: .4, z: -2.1, height: 4 },
  { x: 1.9, z: 2.5, height: 3.7 },
] as const;
const DEFAULT_TARGET: EnvironmentParkTarget = { band: 'mixed', treeCount: 5, plantedFraction: .5, coolingFins: 0 };
const HIDDEN = 1e-4;

type GroveInstance = { readonly mesh: T.InstancedMesh; readonly relative: T.Matrix4 };

class ParkRuntime implements EnvironmentParkRuntime {
  private readonly plantedArea: T.Group;
  private readonly fallback: T.Group;
  private readonly fallbackTrunks: T.InstancedMesh;
  private readonly fallbackCrowns: T.InstancedMesh;
  private readonly glb: T.Group;
  private readonly fins: T.InstancedMesh;
  private readonly transform = new T.Object3D();
  private readonly matrix = new T.Matrix4();
  private readonly treeFrom = new Float32Array(TREE_SLOTS.length);
  private readonly treeTo = new Float32Array(TREE_SLOTS.length);
  private readonly treeLevels = new Float32Array(TREE_SLOTS.length);
  private readonly treeHorizontalFit = new Float32Array(TREE_SLOTS.length);
  private readonly finFrom = new Float32Array(6);
  private readonly finTo = new Float32Array(6);
  private readonly finLevels = new Float32Array(6);
  private glbInstances: GroveInstance[] = [];
  private target: EnvironmentParkTarget = DEFAULT_TARGET;
  private plantedFrom = .5;
  private plantedTo = .5;
  private planted = .5;
  private start = -Infinity;
  private active = false;
  private representation: 'fallback' | 'glb' = 'fallback';
  private exhibitionTargetApplied = false;
  private assetHeight = 1;
  private assetHalfWidth = .5;
  private assetHalfDepth = .5;
  private fallbackHalfWidth = 1;
  private fallbackHalfDepth = 1;

  constructor(plantedArea: T.Group, fallback: T.Group, fallbackTrunks: T.InstancedMesh, fallbackCrowns: T.InstancedMesh, glb: T.Group, fins: T.InstancedMesh) {
    this.plantedArea = plantedArea;
    this.fallback = fallback;
    this.fallbackTrunks = fallbackTrunks;
    this.fallbackCrowns = fallbackCrowns;
    this.glb = glb;
    this.fins = fins;
    fallbackCrowns.geometry.computeBoundingBox();
    if (fallbackCrowns.geometry.boundingBox) {
      const bounds = fallbackCrowns.geometry.boundingBox;
      this.fallbackHalfWidth = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
      this.fallbackHalfDepth = Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z));
    }
    this.treeHorizontalFit.fill(1);
    for (let i = 0; i < DEFAULT_TARGET.treeCount; i++) this.treeLevels[i] = this.treeTo[i] = 1;
    this.writeInstances();
  }

  setTarget(target: EnvironmentParkTarget, now: number, immediate: boolean): boolean {
    this.update(now);
    const enteringExhibition = !this.exhibitionTargetApplied;
    const changed = !this.exhibitionTargetApplied
      || target.treeCount !== this.target.treeCount
      || target.plantedFraction !== this.target.plantedFraction
      || target.coolingFins !== this.target.coolingFins;
    this.target = target;
    this.exhibitionTargetApplied = true;
    if (enteringExhibition) this.updateTreeHorizontalFit();
    if (!changed) {
      if (immediate) {
        this.treeLevels.set(this.treeTo);
        this.finLevels.set(this.finTo);
        this.planted = this.plantedTo = target.plantedFraction;
        this.active = false;
        this.writeInstances();
      }
      return false;
    }
    for (let i = 0; i < this.treeLevels.length; i++) {
      this.treeFrom[i] = this.treeLevels[i];
      this.treeTo[i] = i < target.treeCount ? 1 : 0;
    }
    for (let i = 0; i < this.finLevels.length; i++) {
      this.finFrom[i] = this.finLevels[i];
      this.finTo[i] = i < target.coolingFins ? 1 : 0;
    }
    this.plantedFrom = this.planted;
    this.plantedTo = target.plantedFraction;
    this.start = now;
    this.active = !immediate;
    if (immediate) {
      this.treeLevels.set(this.treeTo);
      this.finLevels.set(this.finTo);
      this.planted = this.plantedTo;
    }
    this.writeInstances();
    return true;
  }

  update(now: number): void {
    if (!this.active) return;
    const raw = Math.min(1, Math.max(0, (now - this.start) / SITE_TRANSITION_SECONDS));
    const progress = raw * raw * (3 - 2 * raw);
    for (let i = 0; i < this.treeLevels.length; i++) this.treeLevels[i] = this.treeFrom[i] + (this.treeTo[i] - this.treeFrom[i]) * progress;
    for (let i = 0; i < this.finLevels.length; i++) this.finLevels[i] = this.finFrom[i] + (this.finTo[i] - this.finFrom[i]) * progress;
    this.planted = this.plantedFrom + (this.plantedTo - this.plantedFrom) * progress;
    this.active = raw < 1;
    this.writeInstances();
  }

  getDiagnostics(): EnvironmentParkDiagnostics {
    let visibleTreeCount = 0, visibleCoolingFins = 0;
    for (const level of this.treeLevels) if (level > HIDDEN) visibleTreeCount++;
    for (const level of this.finLevels) if (level > HIDDEN) visibleCoolingFins++;
    return {
      band: this.target.band,
      targetTreeCount: this.target.treeCount,
      visibleTreeCount,
      targetPlantedFraction: this.target.plantedFraction,
      plantedFraction: this.planted,
      targetCoolingFins: this.target.coolingFins,
      visibleCoolingFins,
      representation: this.representation,
    };
  }

  restoreLegacy(): void {
    this.target = DEFAULT_TARGET;
    this.exhibitionTargetApplied = false;
    this.active = false;
    this.planted = this.plantedFrom = this.plantedTo = .5;
    this.treeLevels.fill(0); this.treeFrom.fill(0); this.treeTo.fill(0);
    this.finLevels.fill(0); this.finFrom.fill(0); this.finTo.fill(0);
    this.updateTreeHorizontalFit();
    for (let i = 0; i < DEFAULT_TARGET.treeCount; i++) this.treeLevels[i] = this.treeTo[i] = 1;
    this.writeInstances();
  }

  attachGlb(root: T.Object3D): void {
    const assetBounds = new T.Box3().setFromObject(root);
    const assetSize = assetBounds.getSize(new T.Vector3());
    this.assetHeight = assetSize.y || 1;
    this.assetHalfWidth = Math.max(Math.abs(assetBounds.min.x), Math.abs(assetBounds.max.x));
    this.assetHalfDepth = Math.max(Math.abs(assetBounds.min.z), Math.abs(assetBounds.max.z));
    let hasMaterialArray = false;
    const clusters = [
      leafyCrown(3).scale(.75, .8, .85).translate(-.22, .12, 0),
      leafyCrown(3).scale(.65, .7, .7).translate(.35, -.2, .12),
      leafyCrown(3).scale(.6, .65, .75).translate(.05, .45, -.2),
    ];
    const crown = mergeGeometries(clusters);
    clusters.forEach(geometry => geometry.dispose());
    crown.computeBoundingBox();
    const crownSize = crown.boundingBox!.getSize(new T.Vector3()), crownCenter = crown.boundingBox!.getCenter(new T.Vector3());
    root.traverse(object => {
      if (!(object instanceof T.Mesh)) return;
      if (Array.isArray(object.material)) { hasMaterialArray = true; return; }
      if (object.name.startsWith('Photovoltaic_crown')) {
        // Keep each imported frond's envelope and branch attachment; only soften its faceted foliage.
        object.geometry.computeBoundingBox();
        const bounds = object.geometry.boundingBox!, size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
        object.geometry = crown.clone().translate(-crownCenter.x, -crownCenter.y, -crownCenter.z)
          .scale(size.x / crownSize.x, size.y / crownSize.y, size.z / crownSize.z).translate(center.x, center.y, center.z);
        object.material = photovoltaicFoliage;
      } else if (object.material.name === 'Cyan bioluminescent veins') object.material = publicLight;
      else if (object.material.name === 'Ceramic bark') object.material = treeTrunk;
      else if (object.material.name === 'Brushed titanium') object.material = trim;
    });
    crown.dispose();
    if (!hasMaterialArray) root.add(...bake(root));
    root.updateWorldMatrix(true, true);
    const inverseRoot = new T.Matrix4().copy(root.matrixWorld).invert();
    const replacement = new T.Group();
    const instances: GroveInstance[] = [];
    root.traverse(object => {
      if (!(object instanceof T.Mesh)) return;
      const relative = new T.Matrix4().multiplyMatrices(inverseRoot, object.matrixWorld);
      const mesh = new T.InstancedMesh(object.geometry, object.material, TREE_SLOTS.length);
      mesh.name = 'park-tree-glb-instances';
      mesh.count = TREE_SLOTS.length;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      replacement.add(mesh);
      instances.push({ mesh, relative });
    });
    if (!instances.length) throw new Error('future-tree-2127 has no mesh instances.');
    this.glb.add(replacement);
    this.glbInstances = instances;
    this.representation = 'glb';
    this.updateTreeHorizontalFit();
    this.writeInstances();
    this.glb.visible = true;
    this.fallback.visible = false;
    this.fallbackTrunks.geometry.dispose();
    this.fallbackCrowns.geometry.dispose();
  }

  private writeInstances(): void {
    const plantingScale = this.exhibitionTargetApplied ? 1.1 * Math.sqrt(this.planted / .8) : 1;
    this.plantedArea.scale.set(plantingScale, 1, plantingScale);
    for (let i = 0; i < TREE_SLOTS.length; i++) {
      const slot = TREE_SLOTS[i], level = this.treeLevels[i], trunkHeight = slot.height * .48, horizontalFit = this.treeHorizontalFit[i];
      this.transform.position.set(slot.x, .7 + trunkHeight * level / 2, slot.z);
      this.transform.rotation.set(0, slot.x * slot.z, 0);
      this.transform.scale.set(horizontalFit, trunkHeight * level, horizontalFit);
      this.transform.updateMatrix();
      this.fallbackTrunks.setMatrixAt(i, this.transform.matrix);
      this.transform.position.set(slot.x, .7 + slot.height * .7 * level, slot.z);
      this.transform.scale.set(slot.height * .18 * level * horizontalFit, slot.height * .25 * level, slot.height * .18 * level * horizontalFit);
      this.transform.updateMatrix();
      this.fallbackCrowns.setMatrixAt(i, this.transform.matrix);
      if (this.glbInstances.length) {
        this.transform.position.set(slot.x, .7, slot.z);
        const heightScale = slot.height / this.assetHeight * level;
        this.transform.scale.set(heightScale * horizontalFit, heightScale, heightScale * horizontalFit);
        this.transform.updateMatrix();
        for (const part of this.glbInstances) {
          this.matrix.multiplyMatrices(this.transform.matrix, part.relative);
          part.mesh.setMatrixAt(i, this.matrix);
        }
      }
    }
    for (let i = 0; i < this.finLevels.length; i++) {
      const angle = i * Math.PI / 3, level = this.finLevels[i];
      this.transform.position.set(Math.cos(angle) * 4.05, .7 + 1.1 * level, -Math.sin(angle) * 4.05);
      this.transform.rotation.set(0, angle, 0);
      this.transform.scale.set(1, level, 1);
      this.transform.updateMatrix();
      this.fins.setMatrixAt(i, this.transform.matrix);
    }
    this.fallbackTrunks.instanceMatrix.needsUpdate = true;
    this.fallbackCrowns.instanceMatrix.needsUpdate = true;
    this.fins.instanceMatrix.needsUpdate = true;
    for (const part of this.glbInstances) part.mesh.instanceMatrix.needsUpdate = true;
  }

  private updateTreeHorizontalFit(): void {
    if (!this.exhibitionTargetApplied) {
      this.treeHorizontalFit.fill(1);
      return;
    }
    const halfWidth = this.representation === 'glb' ? this.assetHalfWidth : this.fallbackHalfWidth;
    const halfDepth = this.representation === 'glb' ? this.assetHalfDepth : this.fallbackHalfDepth;
    const siteHalfWidth = changeSites.ne.w / 2, siteHalfDepth = changeSites.ne.d / 2;
    for (let i = 0; i < TREE_SLOTS.length; i++) {
      const slot = TREE_SLOTS[i];
      const baseScale = this.representation === 'glb' ? slot.height / this.assetHeight : slot.height * .18;
      const cosine = Math.abs(Math.cos(slot.x * slot.z)), sine = Math.abs(Math.sin(slot.x * slot.z));
      const extentX = (cosine * halfWidth + sine * halfDepth) * baseScale;
      const extentZ = (sine * halfWidth + cosine * halfDepth) * baseScale;
      this.treeHorizontalFit[i] = Math.max(0, Math.min(1,
        (siteHalfWidth - Math.abs(slot.x)) / extentX,
        (siteHalfDepth - Math.abs(slot.z)) / extentZ,
      ));
    }
  }
}

export function buildEnvironmentPark(scene: T.Scene, _kit: Kit, assets: SiteAssetLoaderCache): BuiltSite {
  const root = createSiteRoot(scene, 'ne');
  const surfaceLayer = createSiteLayer(root, siteLayerDefinition('stationEastPark', 'parkSurface'));
  const treeLayer = createSiteLayer(root, siteLayerDefinition('stationEastPark', 'parkTrees'));
  const finLayer = createSiteLayer(root, siteLayerDefinition('stationEastPark', 'parkCoolingFins'));
  const park = surfaceLayer.group;
  arc(park, 0, 4.9, .2, [0, .42, 0], stone);
  // Fixed paved ground remains visible outside the authoritative planted-area footprint.
  arc(park, 0, 4.5, .12, [0, .62, 0], stone);
  arc(park, 2.7, 3.2, .02, [0, .74, 0], stone);
  arc(park, 3.2, 3.29, .025, [0, .74, 0], futureLight);
  arc(park, 0, 1.55, .08, [0, .7, 0], water);
  arc(park, 1.55, 1.8, .18, [0, .62, 0], trim);
  arc(park, 4.5, 4.95, .6, [0, .62, 0], trim, .5, 5.2);
  park.add(...bake(park));

  const plantedArea = new T.Group();
  plantedArea.name = 'park-planted-area';
  plantedArea.position.y = .02;
  arc(plantedArea, 0, 4.5, .12, [0, .62, 0], lawn);
  shrubs(plantedArea, 3.7, .72, .5, 5.2, 30);
  for (const [start, length] of [[.9, 1.6], [3.4, 1.8]]) arc(plantedArea, 2.1, 2.5, .38, [0, .62, 0], pink, start, length);
  plantedArea.add(...bake(plantedArea));
  park.add(plantedArea);

  const fallback = new T.Group();
  fallback.name = 'park-trees-procedural-fallback';
  const trunkGeometry = new T.CylinderGeometry(.18, .28, 1, 8);
  const crownGeometry = leafyCrown(3);
  const trunks = new T.InstancedMesh(trunkGeometry, treeTrunk, TREE_SLOTS.length);
  trunks.name = 'park-tree-fallback-trunks'; trunks.castShadow = true; trunks.receiveShadow = true; trunks.frustumCulled = false;
  const crowns = new T.InstancedMesh(crownGeometry, leaf, TREE_SLOTS.length);
  crowns.name = 'park-tree-fallback-crowns'; crowns.castShadow = true; crowns.receiveShadow = true; crowns.frustumCulled = false;
  fallback.add(trunks, crowns);
  treeLayer.group.add(fallback);
  const glb = new T.Group(); glb.name = 'park-trees-glb'; glb.visible = false; treeLayer.group.add(glb);

  const finGeometry = mergeGeometries([
    ...[-.365, .365].map(z => new T.BoxGeometry(.22, 2.2, .12).translate(0, 0, z)),
    ...Array.from({ length: 5 }, (_, k) => new T.BoxGeometry(.3, .16, .65).rotateZ(.28).translate(0, (k - 2) * .42, 0)),
  ]);
  const fins = new T.InstancedMesh(finGeometry, trim, 6);
  fins.name = 'park-cooling-fin-instances'; fins.castShadow = true; fins.receiveShadow = true; fins.frustumCulled = false;
  const climateFrame = new T.Group();
  const veil = membrane.clone(); veil.opacity = .3;
  const canopy = new T.Mesh(new T.RingGeometry(3.45, 4.2, 64), veil);
  canopy.name = 'park-climate-membrane'; canopy.rotation.x = -Math.PI / 2; canopy.position.y = 5.15; canopy.castShadow = true;
  climateFrame.add(canopy);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3, x = Math.cos(angle) * 4.05, z = -Math.sin(angle) * 4.05;
    arc(climateFrame, 0, .065, 4.4, [x, .75, z], trim);
    box(climateFrame, [.18, .08, .5], [x, 5.1, z], trim).rotation.y = angle;
  }
  climateFrame.add(...bake(climateFrame));
  finLayer.group.add(climateFrame, fins);

  const environmentPark = new ParkRuntime(plantedArea, fallback, trunks, crowns, glb, fins);
  treeLayer.setPreparation(async () => {
    const tree = await assets.cloneRoot('future-tree-2127', 'stationEastPark', 'parkTrees');
    environmentPark.attachGlb(tree);
  });

  const marker = createGuestMarker(root, 'ne');
  marker.material.color.set('#b7a17b');
  return {
    id: 'stationEastPark', root,
    layers: { parkSurface: surfaceLayer, parkTrees: treeLayer, parkCoolingFins: finLayer },
    marker, environmentPark,
    // The same Q3 choice also shades every promenade bay across the district (P1 meter variety).
    environmentDistrict: new EnvironmentDistrict(scene),
  };
}
