import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { nightLit } from './cityRig.ts';

/** P5: each Meter's change-moment colour (the visual language of its district layer). */
export const METER_COLORS = { automation: '#3fa9ff', publicSharing: '#ff6f91', environmentalPriority: '#5fe08a', urbanConcentration: '#ffb347' } as const;
/** The one saturated accent of the automation hub and its bays: emissive and instance-colour-free, so it reads day and night. */
export const automationBlue = new T.MeshStandardMaterial({ color: METER_COLORS.automation, emissive: METER_COLORS.automation, emissiveIntensity: .9, roughness: .5 });

// Shared language of the automation hub (siteBuilders/automationHub.ts) and its district bays (districtMeters.ts AutomationDistrict).
// Pure white structure: the shared `trim` (#eee9df, metallic) reads beige in shade, which the rubric's fl-material rejects.
export const white = new T.MeshStandardMaterial({ color: '#f8f9fb', roughness: .42, metalness: .08 });
// Room light: warm-white walls with a moderate warm emissive by day (clearly warmer and brighter than the white shell, peach near the floor), amber at night (`nightLit` follows the night rig);
// the back wall's vertex colours grade from peach below to near-white above.
export const roomLight = (color: T.ColorRepresentation, emissive: string, day: number, night: number, nightColor: string) => nightLit(new T.MeshStandardMaterial({ color, emissive, emissiveIntensity: day, roughness: 1 }), night, nightColor);
export const wallLight = nightLit(new T.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, emissive: '#ffb878', emissiveIntensity: .48, roughness: 1 }), .85, '#ff9a3c');
export const glowMid = roomLight('#f6e0c4', '#ffb878', .42, .8, '#ff9a3c');
export const glowFloor = roomLight('#f0d2b0', '#ffae6c', .4, .7, '#ff9a3c'), glowCeil = roomLight('#fff3dc', '#ffd9a0', 1.3, 1.7, '#ffb860');
/** The autonomous lobby's cool counterpart of the warm rooms. */
export const roomCool = roomLight('#8cc3ff', '#4f9dff', .95, 1.5, '#4aa0ff');
// A cool, faint pane across the glazing, so the room reads behind glass.
export const glassPane = new T.MeshBasicMaterial({ color: '#cfe6f5', transparent: true, opacity: .13, depthWrite: false });
export const shade = new T.MeshBasicMaterial({ color: '#1b2430', transparent: true, opacity: .2, depthWrite: false });
export const parcel = new T.MeshStandardMaterial({ color: '#e9a24f', roughness: .6 });
export const amberInlay = new T.MeshStandardMaterial({ color: '#ff9f1c', emissive: '#ff9f1c', emissiveIntensity: .7, roughness: .5 });
export const rotorMat = new T.MeshStandardMaterial({ color: '#2b3a47', roughness: .5 });
/** Bay residents, joints and small props: one material, the colour carried by each piece's vertex colours (see `tint`). */
export const painted = new T.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .72 });
export const glow = new T.MeshBasicMaterial({ color: new T.Color('#d8f8ff').multiplyScalar(2.5), toneMapped: false });

/** Colours `geometry` in place for `painted`, so that every painted piece shares its vertex-colour attribute. */
export const tint = <G extends T.BufferGeometry>(geometry: G, color: T.ColorRepresentation): G => {
  const c = new T.Color(color), data = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < data.length; i += 3) c.toArray(data, i);
  geometry.setAttribute('color', new T.BufferAttribute(data, 3));
  return geometry;
};

/** Hub drones: a white body on an X frame, four dark rotor rings and a blue underside light, so they read as quads against sky and tower (5.6 m across at scale 1, like the district mesh). */
export function quadFleet(parent: T.Object3D, count: number, name = 'hub-drones') {
  const frame = mergeGeometries([new T.BoxGeometry(1.6, .7, 1.6), ...[Math.PI / 4, -Math.PI / 4].map(a => new T.BoxGeometry(5.4, .2, .32).rotateY(a))].map(g => g.toNonIndexed()))!;
  const rotors = mergeGeometries([[1.9, 1.9], [-1.9, 1.9], [1.9, -1.9], [-1.9, -1.9]].map(([x, z]) => new T.TorusGeometry(1.15, .17, 6, 16).rotateX(Math.PI / 2).translate(x, .35, z).toNonIndexed()))!;
  const light = new T.BoxGeometry(.9, .12, .9).translate(0, -.42, 0);
  const meshes = ([[frame, white], [rotors, rotorMat], [light, automationBlue]] as const).map(([geometry, material]) => {
    const mesh = new T.InstancedMesh(geometry, material, count);
    mesh.name = name;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    parent.add(mesh);
    return mesh;
  });
  return {
    set(index: number, pose: T.Object3D) { pose.updateMatrix(); meshes.forEach(m => m.setMatrixAt(index, pose.matrix)); },
    flush() { meshes.forEach(m => { m.instanceMatrix.needsUpdate = true; }); },
    show(visible: boolean) { meshes.forEach(m => { m.visible = visible; }); },
  };
}
