"""Reimport check of the housing tower GLB: nodes, house extras, shared meshes, triangles, materials, glass blending.

blender -b --factory-startup --python-exit-code 1 -P check_glb.py [-- <file.glb>]   (exit code 1 on a failed check)
"""
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
glb = os.path.abspath(args[0]) if args else os.path.join(HERE, "q08c-housing-tower-2127.glb")
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)
bpy.ops.import_scene.gltf(filepath=glb)
obs = {o.name: o for o in bpy.data.objects}
fail = []
for n in ("Q08H_HousingTower", "Q08H_Frame", "Q08H_Commons", "Q08H_Rail", "Q08H_Trolley", "Q08H_Spreader", "Q08H_Houses",
          "Q08H_House_Delivery"):
    if n not in obs:
        fail.append("missing " + n)
houses = [o for o in obs.values() if o.name.startswith("Q08H_House_")]
types = {}
for o in houses:
    t = o.get("house_type")
    if not t:
        fail.append("no house_type on " + o.name)
    types.setdefault(t, set()).add(o.data.name)
if any(len(v) != 1 for v in types.values()):
    fail.append("houses of one type do not share one mesh: %s" % types)
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs.values() if o.type == "MESH")
mats = {m.name for o in obs.values() if o.type == "MESH" for m in o.data.materials if m}
glass = [m for m in bpy.data.materials if "glass" in m.name or "canopy" in m.name]
opaque = [m.name for m in glass if m.surface_render_method != "BLENDED"]
if opaque:
    fail.append("glass not blended: %s" % opaque)
pts = [o.matrix_world @ v.co for o in obs.values() if o.type == "MESH" for v in o.data.vertices]
size = [round(max(p[i] for p in pts) - min(p[i] for p in pts), 2) for i in range(3)]
print("CHECK", os.path.basename(glb), "houses", len(houses), "types", {k: len(v) for k, v in types.items()},
      "size_blender_xyz_m", size,
      "meshes", len({o.data.name for o in obs.values() if o.type == "MESH"}), "tris", tris, "materials", len(mats),
      "bytes", os.path.getsize(glb))
print("CHECK", "PASS" if not fail else "FAIL " + "; ".join(fail))
if fail:
    sys.exit(1)
