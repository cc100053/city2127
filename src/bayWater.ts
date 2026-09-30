import * as T from 'three';
import { curveBeyondPlate } from './bayContext.ts';

/** One world-scaled ripple finish for both the surveyed bay plate and the open sea. */
export function bayWater() {
  const normal = new T.TextureLoader().load(new URL('../asset/textures/bay-ripple-normal.png', import.meta.url).href);
  normal.wrapS = normal.wrapT = T.RepeatWrapping;
  normal.anisotropy = 8;
  const material = new T.MeshPhysicalMaterial({color:'#1d4a68',roughness:.18,metalness:.12,normalMap:normal,normalScale:new T.Vector2(.65,.65),clearcoat:.4,clearcoatRoughness:.2});
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 bayUv;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nbayUv=(modelMatrix*vec4(transformed,1.)).xz/65.;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 bayUv;')
      .replace('#include <normal_fragment_maps>', '#undef USE_NORMALMAP_TANGENTSPACE\n#include <normal_fragment_maps>\nvec2 ripple=(texture2D(normalMap,bayUv).xy*2.-1.)*.65+(texture2D(normalMap,bayUv*.37+vec2(.17,.31)).yx*2.-1.)*.35;\nnormal=normalize(normal+mat3(viewMatrix)*vec3(ripple.x,0.,ripple.y)*.65);');
  };
  material.customProgramCacheKey = () => 'bay-world-ripples';
  // The open sea falls away to the horizon beyond the plate.
  curveBeyondPlate(material);
  return material;
}
