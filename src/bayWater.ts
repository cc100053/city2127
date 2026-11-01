import * as T from 'three';
import { curveBeyondPlate } from './bayContext.ts';

/** Night light columns: main.ts fills `frame` with a quarter-res copy of the lit scene (water masked out by its zero alpha) and `size` with
 *  the composer buffer size; each water pixel gathers the bright pixels above it on screen, wobbled by the ripples. */
export const waterLights = { frame: { value: null as T.Texture | null }, size: { value: new T.Vector2(1, 1) }, night: { value: 0 } };

/** One world-scaled ripple finish for both the surveyed bay plate and the open sea. */
export function bayWater() {
  const normal = new T.TextureLoader().load(new URL('../asset/textures/bay-ripple-normal.png', import.meta.url).href);
  normal.wrapS = normal.wrapT = T.RepeatWrapping;
  normal.anisotropy = 8;
  const material = new T.MeshPhysicalMaterial({color:'#2c6e98',roughness:.1,metalness:.15,normalMap:normal,normalScale:new T.Vector2(.65,.65),clearcoat:.4,clearcoatRoughness:.2});
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { waterFrame: waterLights.frame, waterSize: waterLights.size, waterNight: waterLights.night });
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 bayUv;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nbayUv=(modelMatrix*vec4(transformed,1.)).xz/65.;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 bayUv;\nuniform sampler2D waterFrame;\nuniform vec2 waterSize;\nuniform float waterNight;')
      .replace('#include <normal_fragment_maps>', '#undef USE_NORMALMAP_TANGENTSPACE\n#include <normal_fragment_maps>\nvec2 ripple=(texture2D(normalMap,bayUv).xy*2.-1.)*.65+(texture2D(normalMap,bayUv*.37+vec2(.17,.31)).yx*2.-1.)*.35;\nnormal=normalize(normal+mat3(viewMatrix)*vec3(ripple.x,0.,ripple.y)*.65);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if (waterNight > 0.) {
        vec2 screen = gl_FragCoord.xy / waterSize; vec3 column = vec3(0.);
        for (int i = 1; i <= 24; i++) { float t = float(i) / 24.; column += max(texture2D(waterFrame, screen + vec2(ripple.x * .015 * t, t * .2)).rgb - .3, 0.) * (1. - t); }
        totalEmissiveRadiance += column * waterNight * .14;
      }`)
      // Zero alpha marks water in the scene buffer, so the light copy never reflects the water itself (main.ts restores alpha right after).
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a = 0.;');
  };
  material.customProgramCacheKey = () => 'bay-world-ripples';
  // The open sea falls away to the horizon beyond the plate.
  curveBeyondPlate(material);
  return material;
}
