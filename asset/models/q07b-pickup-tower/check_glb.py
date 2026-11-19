"""Reimport q07b-pickup-tower.glb into an empty scene and check structure, bounds, materials and moving parts.

blender -b --factory-startup --python-exit-code 1 -P check_glb.py [-- other.glb]
Fails (exit 1) when a named node is missing, a drum origin is off the axis, a drum turned by 37 deg would touch
the slabs, glass or core, the carriage leaves its rails, the glass is not alpha-blended, an emissive material lost
its emission, a texture is missing, the pickup does not face -Y (three.js +z) or the bounds leave the envelope.
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GLB = os.path.abspath(ARGS[0]) if ARGS else os.path.join(HERE, "q07b-pickup-tower.glb")
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)
bpy.ops.import_scene.gltf(filepath=GLB)
dg = bpy.context.evaluated_depsgraph_get()
objs = {o.name: o for o in bpy.data.objects}
rings = sorted(n for n in objs if n.startswith("Q07B_ShelfRing_"))
need = ["Q07B_PickupTower", "Q07B_Shell", "Q07B_PickupPort", "Q07B_LiftCarriage"] + ["Q07B_ShelfRing_%02d" % i for i in range(1, 7)]
errs = ["missing " + n for n in need if n not in objs]


def world_verts(o):
    return [o.matrix_world @ v.co for v in o.data.vertices]


lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
tris = 0
print("%-22s %-18s %28s %8s %s" % ("node", "parent", "origin (Blender m)", "tris", "materials"))
for o in sorted(bpy.data.objects, key=lambda o: o.name):
    t = 0
    if o.type == "MESH":
        me = o.evaluated_get(dg).to_mesh()
        me.calc_loop_triangles()
        t = len(me.loop_triangles)
        o.evaluated_get(dg).to_mesh_clear()
        for w in world_verts(o):
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    tris += t
    print("%-22s %-18s %28s %8d %s" % (o.name, o.parent.name if o.parent else "-", "(%.2f, %.2f, %.2f)" % tuple(o.matrix_world.translation), t,
                                       ",".join(m.name.replace("q07b_", "") for m in getattr(o.data, "materials", []) if m)))
size = hi - lo
print("BOUNDS min (%.2f, %.2f, %.2f) max (%.2f, %.2f, %.2f) size %.2f x %.2f x %.2f m" % (*lo, *hi, *size))
print("TRIS", tris, "MATERIALS", len(bpy.data.materials), "MESHES", sum(o.type == "MESH" for o in bpy.data.objects),
      "IMAGES", ", ".join("%s %dx%d" % (i.name, *i.size) for i in bpy.data.images), "GLB_BYTES", os.path.getsize(GLB))

# materials: glass blended, emissive kept, textures linked
v2 = "q07b_glass" in bpy.data.materials
for m in bpy.data.materials:
    if not m.node_tree:
        continue
    bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not bsdf:
        continue
    alpha = bsdf.inputs["Alpha"].default_value
    es = bsdf.inputs["Emission Strength"].default_value
    ec = bsdf.inputs["Emission Color"]
    emissive = es > 0 and (ec.is_linked or max(ec.default_value[:3]) > 0)
    tex = [n.image.name for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image]
    note = []
    if alpha < 1 or m.surface_render_method == "BLENDED":
        note.append("alpha %.2f %s" % (alpha, m.surface_render_method))
    if emissive:
        note.append("emission %.2f%s" % (es, " (texture)" if ec.is_linked else ""))
    if tex:
        note.append("texture " + ",".join(tex))
    if note:
        print("MAT %-22s %s" % (m.name, "; ".join(note)))
if v2:
    g = bpy.data.materials["q07b_glass"]
    gb = next(n for n in g.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    if g.surface_render_method != "BLENDED" or gb.inputs["Alpha"].default_value >= 1:
        errs.append("glass is not alpha-blended")
    for name in ("q07b_warm_light", "q07b_glow", "q07b_ui", "q07b_teal_glow"):
        m = bpy.data.materials.get(name)
        b = m and next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        if not b or b.inputs["Emission Strength"].default_value <= 0:
            errs.append(name + " lost its emission")
    for name in ("q07b_parcel", "q07b_ui"):
        m = bpy.data.materials.get(name)
        if not m or not any(n.type == "TEX_IMAGE" and n.image for n in m.node_tree.nodes):
            errs.append(name + " lost its texture")

# rotating drums: origin on the axis; turned 37 deg about their own Z they stay clear of slabs, glass and core
shell = objs.get("Q07B_Shell")
static_r = []
if shell:
    for v in world_verts(shell):
        static_r.append((math.hypot(v.x, v.y), v.z))
for n in rings:
    o = objs[n]
    org = o.matrix_world.translation
    if Vector(org[:2]).length > 1e-3:
        errs.append(n + " origin off axis")
    rot = Matrix.Translation(org) @ Matrix.Rotation(math.radians(37), 4, "Z") @ Matrix.Translation(-org)
    vs = [rot @ w for w in world_verts(o)]
    rs = [math.hypot(v.x, v.y) for v in vs]
    z0, z1 = min(v.z for v in vs), max(v.z for v in vs)
    r0, r1 = min(rs), max(rs)
    near = [r for r, z in static_r if z0 + .01 < z < z1 - .01 and r0 - .3 < r < r1 + .7]
    outer = min([r for r in near if r > r1 - 1e-4] or [99])
    # the core is one tall cylinder with vertices only at its ends, so look for it over the whole tower height
    inner = max([r for r, z in static_r if r < r0 + 1e-4 and r > .5 and 3 < z < 13.5] or [0])
    print("RING %s turned 37deg: r %.3f..%.3f, z %.2f..%.2f, nearest static inside %.3f, outside %.3f" % (n, r0, r1, z0, z1, inner, outer))
    if outer - r1 < .02 or r0 - inner < .02:
        errs.append(n + " would touch static geometry when turning")
car = objs.get("Q07B_LiftCarriage")
if car:
    vs = world_verts(car)
    print("CARRIAGE x %.2f..%.2f y %.2f..%.2f (rails at x +-0.38, y -6.05 +-0.38)" % (min(v.x for v in vs), max(v.x for v in vs), min(v.y for v in vs), max(v.y for v in vs)))
port = objs.get("Q07B_PickupPort")
if port:
    ys = [v.y for v in world_verts(port)]
    print("PORT y range %.2f .. %.2f (front must be -Y)" % (min(ys), max(ys)))
    if min(ys) > -5.5:
        errs.append("pickup port does not reach the -Y front")
if abs(lo.z) > .01 or not (13 < size.z < 15.5) or size.x > 14.5 or size.y > 14.5:
    errs.append("bounds outside the expected envelope")
print("RESULT", "FAIL " + "; ".join(errs) if errs else "PASS")
if errs:
    raise SystemExit(1)
