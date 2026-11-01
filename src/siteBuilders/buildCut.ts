import * as T from 'three';

const VERTEX_HEAD = '#include <common>\nuniform vec4 uBuildAxis;\nvarying float vBuildY;';
const VERTEX_BODY = `#include <project_vertex>
vec4 buildPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
buildPosition = instanceMatrix * buildPosition;
#endif
vBuildY = dot(uBuildAxis, modelMatrix * buildPosition);`;
const FRAGMENT_HEAD = '#include <common>\nuniform float uBuildCut;\nuniform float uBuildBand;\nuniform vec3 uBuildGlow;\nvarying float vBuildY;';
const DISCARD = '#include <clipping_planes_fragment>\nif (vBuildY > uBuildCut) discard;';
const GLOW = '#include <emissivemap_fragment>\nfloat buildDepth = uBuildCut - vBuildY;\ntotalEmissiveRadiance += uBuildGlow * ((1.0 - smoothstep(0.0, uBuildBand, buildDepth)) + 2.0 * (1.0 - step(uBuildBand * .15, buildDepth)));';

/**
 * "Print" reveal for one building group: geometry above a height cut (in the group's own frame) is discarded (in its shadow too) and a glowing
 * band rides the cut, so the building rises from the ground (or comes down from the top) instead of scaling from its origin.
 * The group's own scale stays 1; `set(level)` moves the cut from its lowest (0) to above its highest (1) point.
 */
export class BuildCut {
  /** Groups whose cut is mid-way: override-material passes (GTAO's normal prepass) cannot discard, so they skip these. */
  static readonly building = new Set<T.Object3D>();
  level = 1;
  private readonly bottom: number;
  private readonly top: number;
  private readonly glow: T.Color;
  private readonly group: T.Object3D;
  private readonly uniforms = { uBuildCut: { value: 1e9 }, uBuildBand: { value: 1 }, uBuildGlow: { value: new T.Color(0) }, uBuildAxis: { value: new T.Vector4(0, 1, 0, 0) } };

  /** `inPlace` materials already belong to this group alone (e.g. canvas signs whose glow the day cycle drives), so they are patched rather than cloned. */
  constructor(group: T.Object3D, glow: T.ColorRepresentation, inPlace: ReadonlySet<T.Material> = new Set()) {
    this.group = group;
    group.scale.set(1, 1, 1);
    group.updateWorldMatrix(true, true);
    // Measured in the group's frame: an ancestor layer may still be collapsed to its hidden scale here.
    const bounds = new T.Box3().setFromObject(group).applyMatrix4(group.matrixWorld.clone().invert());
    this.bottom = bounds.min.y;
    this.top = bounds.max.y;
    // A white-hot leading edge over the Meter colour, so the cut reads against the warm-lit floors below it.
    this.glow = new T.Color(glow).lerp(new T.Color('#fff4dc'), .35);
    this.uniforms.uBuildBand.value = Math.max(.2, (this.top - this.bottom) * .03);
    const depth = this.patch(new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }));
    const clones = new Map<T.Material, T.Material>();
    group.traverse(object => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const source = mesh.material;
      if (!clones.has(source)) clones.set(source, this.patch(inPlace.has(source) ? source : source.clone()));
      mesh.material = clones.get(source)!;
      mesh.customDepthMaterial = depth;
    });
  }

  set(level: number): void {
    this.level = level;
    // Row 1 of world → group: the shader's height is the group's own y, whatever its ancestors' scale.
    this.group.updateWorldMatrix(true, false);
    const e = this.group.matrixWorld.clone().invert().elements;
    this.uniforms.uBuildAxis.value.set(e[1], e[5], e[9], e[13]);
    const building = level < 1 - 1e-4;
    if (building) BuildCut.building.add(this.group); else BuildCut.building.delete(this.group);
    this.uniforms.uBuildCut.value = building ? this.bottom + (this.top - this.bottom) * level : 1e9;
    // Fade the band in the last eighth so the finished crown does not snap from glowing to plain.
    this.uniforms.uBuildGlow.value.copy(this.glow).multiplyScalar(building ? 3 * Math.min(1, (1 - level) * 8) : 0);
  }

  private patch<M extends T.Material>(material: M): M {
    const uniforms = this.uniforms;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', VERTEX_HEAD).replace('#include <project_vertex>', VERTEX_BODY);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', FRAGMENT_HEAD)
        .replace('#include <clipping_planes_fragment>', DISCARD).replace('#include <emissivemap_fragment>', GLOW);
    };
    // One program per material type for every cut; each material keeps its own uniform references.
    material.customProgramCacheKey = () => 'build-cut';
    return material;
  }
}
