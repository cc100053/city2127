import * as T from 'three';

// Half-open triangle edges count a quad's shared diagonal once, while allowing
// distinct overlapping architectural solids to retain separate crossings.
const ownsEdge = (from, to) => to.z > from.z || (to.z === from.z && to.x < from.x);

/** Sample the actual city mesh on QR columns, keeping white columns completely empty.
 * This is a deterministic building sculpture, not QR-Bloom's tree model or its licensed generator.
 */
export function sampleBuildingVoxels(building, qr) {
  // ponytail: sub-module details can disappear at cell centres; this is a QR sculpture,
  // not a lossless replacement for the original model (which stays unchanged in the city).
  building.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(building);
  const size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
  const count = qr.getModuleCount(), half = (count - 1) / 2;
  const scale = count * .84 / Math.max(size.x, size.z);
  if (!Number.isFinite(scale) || size.y <= 0) throw new Error('Empty building geometry');
  const normalization = new T.Matrix4().makeScale(scale, scale, scale);
  normalization.setPosition(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  const voxels = new Map(), a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  const instance = new T.Matrix4(), matrix = new T.Matrix4(), tint = new T.Color();
  building.traverseVisible(object => {
    if (!object.isMesh) return;
    const geometry = object.geometry, position = geometry.getAttribute('position'), index = geometry.index;
    const materials = [object.material].flat();
    for (let slot = 0; slot < (object.isInstancedMesh ? object.count : 1); slot++) {
      matrix.multiplyMatrices(normalization, object.matrixWorld); tint.set(0xffffff);
      if (object.isInstancedMesh) {
        object.getMatrixAt(slot, instance); matrix.multiply(instance);
        if (object.instanceColor) object.getColorAt(slot, tint);
      }
      const columns = new Map();
      for (let i = 0; i < (index?.count ?? position.count); i += 3) {
        a.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(matrix);
        b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1).applyMatrix4(matrix);
        c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2).applyMatrix4(matrix);
        const determinant = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
        if (Math.abs(determinant) < 1e-8) continue;
        const materialIndex = geometry.groups.find(group => i >= group.start && i < group.start + group.count)?.materialIndex ?? 0;
        const material = materials[materialIndex] ?? materials[0];
        const color = (material.color ?? new T.Color(0xffffff)).clone().multiply(tint);
        const minCol = Math.max(0, Math.ceil(Math.min(a.x, b.x, c.x) + half));
        const maxCol = Math.min(count - 1, Math.floor(Math.max(a.x, b.x, c.x) + half));
        const minRow = Math.max(0, Math.ceil(Math.min(a.z, b.z, c.z) + half));
        const maxRow = Math.min(count - 1, Math.floor(Math.max(a.z, b.z, c.z) + half));
        for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
          if (!qr.isDark(row, col)) continue;
          const x = col - half - a.x, z = row - half - a.z;
          const u = (x * (c.z - a.z) - z * (c.x - a.x)) / determinant;
          const v = ((b.x - a.x) * z - (b.z - a.z) * x) / determinant;
          if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
          const positive = determinant > 0;
          if (Math.abs(v) <= 1e-6 && !(positive ? ownsEdge(a, b) : ownsEdge(b, a))) continue;
          if (Math.abs(u) <= 1e-6 && !(positive ? ownsEdge(c, a) : ownsEdge(a, c))) continue;
          if (Math.abs(1 - u - v) <= 1e-6 && !(positive ? ownsEdge(b, c) : ownsEdge(c, b))) continue;
          const key = row * count + col;
          if (!columns.has(key)) columns.set(key, []);
          columns.get(key).push({ y: a.y + u * (b.y - a.y) + v * (c.y - a.y), direction: Math.sign(determinant), color, roughness: material.roughness ?? .5, metalness: material.metalness ?? 0 });
        }
      }
      for (const [key, hits] of columns) {
        hits.sort((left, right) => left.y - right.y);
        let winding = 0;
        for (let i = 0; i < hits.length; i++) {
          const hit = hits[i]; winding += hit.direction;
          const low = Math.max(0, Math.floor(hit.y));
          const high = winding && hits[i + 1] ? Math.max(low, Math.ceil(hits[i + 1].y) - 1) : low;
          for (let y = low; y <= high; y++) voxels.set(`${key}:${y}`, { row: Math.floor(key / count), col: key % count, y, color: hit.color, roughness: hit.roughness, metalness: hit.metalness });
        }
      }
    }
  });
  if (!voxels.size) throw new Error('Building cannot be sampled on this QR grid');
  return { voxels: [...voxels.values()], count, sourceHeight: size.y * scale };
}

export function createQrSculpture(building, qr) {
  const sampled = sampleBuildingVoxels(building, qr), { count, voxels } = sampled;
  const root = new T.Group(); root.name = 'linked-building-qr';
  const geometry = new T.BoxGeometry(1, 1, 1), ink = new T.Color('#102331');
  const scan = { value: 0 };
  const material = new T.MeshStandardMaterial();
  material.onBeforeCompile = shader => {
    shader.uniforms.qrScan = scan;
    shader.vertexShader = 'attribute vec2 qrFinish; varying vec2 voxelFinish;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvoxelFinish = qrFinish;');
    shader.fragmentShader = 'uniform float qrScan; varying vec2 voxelFinish;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = voxelFinish.x;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = voxelFinish.y;');
    // Blend colour only: the very same cubes retain their height, position and visibility.
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
      `outgoingLight = mix(outgoingLight, vec3(${ink.r}, ${ink.g}, ${ink.b}), qrScan);\n#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'linked-building-qr-v2';
  const baseMaterial = new T.MeshBasicMaterial({ color: ink, toneMapped: false });
  const white = new T.MeshBasicMaterial({ color: '#ecf2ed', toneMapped: false });
  const plateGeometry = new T.BoxGeometry(count + 10, .2, count + 10);
  const plate = new T.Mesh(plateGeometry, white); plate.position.y = -.12; root.add(plate);
  const dark = [];
  for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (qr.isDark(row, col)) dark.push({ row, col });
  const base = new T.InstancedMesh(geometry, baseMaterial, dark.length), dummy = new T.Object3D();
  dark.forEach(({ row, col }, i) => {
    dummy.position.set(col - (count - 1) / 2, .12, row - (count - 1) / 2); dummy.scale.set(1, .28, 1); dummy.updateMatrix(); base.setMatrixAt(i, dummy.matrix);
  });
  const sculpture = new T.InstancedMesh(geometry, material, voxels.length);
  sculpture.name = 'city-building-voxels'; sculpture.castShadow = true;
  const finishes = new Float32Array(voxels.length * 2);
  dummy.scale.set(1, 1, 1);
  voxels.forEach(({ row, col, y, color, roughness, metalness }, i) => {
    dummy.position.set(col - (count - 1) / 2, y + .5, row - (count - 1) / 2); dummy.updateMatrix();
    sculpture.setMatrixAt(i, dummy.matrix); sculpture.setColorAt(i, color);
    // Cube faces need broader highlights than smooth source glass to avoid white glare.
    finishes[i * 2] = Math.max(.35, roughness); finishes[i * 2 + 1] = metalness;
  });
  geometry.setAttribute('qrFinish', new T.InstancedBufferAttribute(finishes, 2));
  root.add(base, sculpture);
  return {
    root, voxelCount: voxels.length, sourceHeight: sampled.sourceHeight,
    setScanBlend(value) { scan.value = value; },
    dispose() { base.dispose(); sculpture.dispose(); geometry.dispose(); plateGeometry.dispose(); material.dispose(); baseMaterial.dispose(); white.dispose(); },
  };
}
