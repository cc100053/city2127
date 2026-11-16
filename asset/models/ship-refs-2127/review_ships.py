"""Re-import the six ship GLBs into an empty scene (the load check).

blender -b --factory-startup --python-exit-code 1 -P review_ships.py
Prints @@CHECK@@ lines and fails (exit 1) when a ship does not straddle the waterline (z = 0), its stem is not at -Y
Blender (= +Z three.js) with the transom behind, or a mesh lost its materials.
"""
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_ships import SHIPS  # noqa: E402

failures = []
for name in SHIPS:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, f"{name}.glb"))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    pts = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    lo = [min(p[i] for p in pts) for i in range(3)]
    hi = [max(p[i] for p in pts) for i in range(3)]
    hull = next(o for o in meshes if o.name.endswith("_hull"))
    hp = [hull.matrix_world @ v.co for v in hull.data.vertices]
    y0, y1 = min(p.y for p in hp), max(p.y for p in hp)
    near = lambda y: max(abs(p.x) for p in hp if abs(p.y - y) < 1.0 and p.z > 0)  # noqa: E731
    stem, transom = near(y0), near(y1)
    no_mat = [o.name for o in meshes if not o.data.materials]
    tris = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
    ok = lo[2] < 0 < hi[2] and stem < .5 * transom and not no_mat
    print("@@CHECK@@", name, "OK" if ok else "FAIL", "meshes", len(meshes), "tris", tris,
          "size %.2f x %.2f x %.2f" % tuple(h - l for h, l in zip(hi, lo)), "z %.2f..%.2f" % (lo[2], hi[2]),
          "stem half-width %.2f at -Y, transom %.2f at +Y" % (stem, transom), "no-material", no_mat)
    if not ok:
        failures.append(name)
if failures:
    sys.exit(f"review failed: {failures}")
