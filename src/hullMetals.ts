import * as T from 'three';

type MetalFinish = 'frame' | 'panel';

function makeHullMetal(finish: MetalFinish, parameters: T.MeshStandardMaterialParameters) {
  const brushed = finish === 'frame';
  const size = 256;
  const pixels = new Uint8Array(size * size * 4);
  const byte = (value: number) => Math.round(T.MathUtils.clamp(value, 0, 1) * 255);

  // Tileable value noise with a longer grain along the rolled silver strip.
  const seed = brushed ? 17 : 43;
  const noise = (u: number, v: number, columns: number, rows: number) => {
    const x = u * columns, y = v * rows;
    const left = Math.floor(x), bottom = Math.floor(y);
    const cell = (i: number, j: number) => {
      const value = Math.sin((i % columns) * 127.1 + (j % rows) * 311.7 + seed) * 43758.5453;
      return value - Math.floor(value) - .5;
    };
    const tx = T.MathUtils.smoothstep(x - left, 0, 1), ty = T.MathUtils.smoothstep(y - bottom, 0, 1);
    return T.MathUtils.lerp(
      T.MathUtils.lerp(cell(left, bottom), cell(left + 1, bottom), tx),
      T.MathUtils.lerp(cell(left, bottom + 1), cell(left + 1, bottom + 1), tx), ty,
    );
  };

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const broad = brushed ? noise(u, v, 5, 11) : noise(u, v, 5, 6);
    const grain = brushed ? noise(u, v, 10, 53) : noise(u, v, 38, 43);
    const i = (y * size + x) * 4;
    pixels[i] = byte(.5 + .3 * broad + .62 * grain); // Bump height
    pixels[i + 1] = byte(.76 + .21 * broad + .19 * grain); // Roughness multiplier
    pixels[i + 2] = byte(.94 + (brushed ? .12 : .17) * broad + .11 * grain); // Linear tone
    pixels[i + 3] = 255;
  }
  const surface = new T.DataTexture(pixels, size, size);
  surface.wrapS = surface.wrapT = T.RepeatWrapping;
  surface.magFilter = T.LinearFilter;
  surface.minFilter = T.LinearMipmapLinearFilter;
  surface.generateMipmaps = true;
  surface.anisotropy = 8;
  surface.repeat.set(brushed ? 1 / 12 : 1 / 10, brushed ? 1 / 4 : 1 / 10);
  surface.needsUpdate = true;

  const material = new T.MeshStandardMaterial({
    ...parameters, name: `hull-${finish}-metal`, roughnessMap: surface, bumpMap: surface,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.hullReflectionGain = { value: brushed ? 1.45 : 1 };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float hullReflectionGain;')
      .replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\nradiance *= hullReflectionGain;')
      .replace('#include <roughnessmap_fragment>', `
      vec3 hullFinish = texture2D(roughnessMap, vRoughnessMapUv).rgb;
      float roughnessFactor = roughness * hullFinish.g;
      diffuseColor.rgb *= hullFinish.b;`);
  };
  material.customProgramCacheKey = () => 'hull-metal';
  return material;
}

export const hullFrameMetal = makeHullMetal('frame', {
  color: '#dadddf', metalness: .69, roughness: .54, bumpScale: .017,
});
// Keep the same brushed texture where the satin-finished bow meets the original brightwork.
export const hullBowMetal = hullFrameMetal.clone();
hullBowMetal.name = 'hull-bow-metal';
hullBowMetal.roughness = .68;
hullBowMetal.bumpScale = .012;
hullBowMetal.onBeforeCompile = hullFrameMetal.onBeforeCompile;
hullBowMetal.customProgramCacheKey = hullFrameMetal.customProgramCacheKey;

export const hullPanelMetal = makeHullMetal('panel', {
  color: '#6b6d6e', metalness: .55, roughness: .83, bumpScale: .026,
});

/** Metre UVs along each strip's centreline and across its actual face width. */
export function hullFrameUv(edges: readonly (readonly [T.Vector3, T.Vector3])[]) {
  let distance = edges[0][0].x + edges[0][0].y;
  return edges.map(([left, right], i) => {
    if (i > 0) {
      const [previousLeft, previousRight] = edges[i - 1];
      distance += .5 * (left.distanceTo(previousLeft) + right.distanceTo(previousRight));
    }
    const halfWidth = .5 * left.distanceTo(right);
    return { along: distance, low: -halfWidth, high: halfWidth };
  });
}
