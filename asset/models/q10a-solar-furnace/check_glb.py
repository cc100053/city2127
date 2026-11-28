"""Reimport check of q10a-solar-furnace.glb (nothing is written into the model).

blender -b q10a-solar-furnace.blend --python-exit-code 1 -P check_glb.py [-- q10a-solar-furnace-nocrown]
Removes the authored asset, imports the GLB and writes check.json: triangle / mesh / material counts, bounds, the
story-stage nodes, transparent materials and their blend mode, and ray tests from the preview cameras: rays that
reach an old chair through the feed-tube glass (poolside), and rays that reach the light core through the sphere
shell (main and furnace views). A ray passes straight through transparent surfaces and stops at the first opaque one.
"""
import json
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = (sys.argv[sys.argv.index("--") + 1:] or ["q10a-solar-furnace"])[0] if "--" in sys.argv else "q10a-solar-furnace"
GLB = os.path.join(HERE, MODEL + ".glb")
OUT = "check%s.json" % MODEL[len("q10a-solar-furnace"):]                     # check.json, or check-nocrown.json for the variant
STAGES = ("FEED_CHAIRS_315", "FURNACE_SHARDS", "FURNACE_SPARKS", "POWER_LINES", "FURNACE_CORE", "FURNACE_SHELL", "FEED_TUBE_315")


def alpha(m):
    b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m and m.node_tree else None
    if b is None:
        return 1.0
    a = b.inputs["Alpha"]
    return 0.5 if a.is_linked else a.default_value                              # linked alpha = textured cut-out: treat as see-through


def trace(scene, dg, o, d, limit=60):
    """Materials hit along the ray until the first opaque surface (inclusive)."""
    hits = []
    for _ in range(limit):
        ok, loc, _n, idx, ob, _mw = scene.ray_cast(dg, o, d)
        if not ok:
            break
        m = ob.material_slots[ob.data.polygons[idx].material_index].material if ob.material_slots else None
        name = m.name if m else "?"
        hits.append(name)
        if alpha(m) >= .99:
            break
        o = loc + d * 1e-3
    return hits


def rays(cam, nx, ny):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = nx * 10, ny * 10
    fr = cam.data.view_frame(scene=sc)
    mw = cam.matrix_world
    o = mw.translation
    for j in range(ny):
        for i in range(nx):
            u, v = (i + .5) / nx, (j + .5) / ny
            top = fr[3].lerp(fr[0], u)
            bot = fr[2].lerp(fr[1], u)
            p = mw @ top.lerp(bot, v)
            yield o, (p - o).normalized()


def through(scene, dg, cam, target, glass, nx, ny):
    total = clear = 0
    for o, d in rays(cam, nx, ny):
        h = trace(scene, dg, o, d)
        if h and target in h[-1]:
            total += 1
            if any(glass in x for x in h[:-1]):
                clear += 1
    return {"rays_on_target": total, "through_glass": clear}


def verts(o):
    return [o.matrix_world @ v.co for v in o.data.vertices]


def structure(meshes):
    """Measured on the reimported GLB (crownless cradle build): how close the cradle comes to the glass (pads must reach
    it), the column feet against the base tops and the water, and how near the bases come to the island bridge corridor
    (x = 0, y 5.6 .. 45.2, deck half-width 0.95)."""
    by = {o.name.split(".")[0]: o for o in meshes}
    c = Vector((0, 0, 54))
    cradle = [(v - c).length for v in verts(by["STRUCTURE_CRADLE"])]
    cols = verts(by["STRUCTURE_COLUMNS"])
    bases = verts(by["STRUCTURE_BASES"])
    shell = [(v - c).length for v in verts(by["FURNACE_SHELL"])]
    near = [v for v in bases if 5.6 - 4 < v.y < 45.2 + 4]
    return {
        "shell_radius_min_max": [round(min(shell), 3), round(max(shell), 3)],
        "cradle_nearest_to_centre_m": round(min(cradle), 3),
        "cradle_verts_within_glass_contact_band": sum(1 for d in cradle if 14.9 < d <= 15.0),
        "columns_lowest_z": round(min(v.z for v in cols), 3),
        "bases_highest_z": round(max(v.z for v in bases), 3),
        "bases_lowest_z": round(min(v.z for v in bases), 3),
        "bases_min_abs_x_near_bridge_m": round(min(abs(v.x) for v in near), 2) if near else None,
    }


def main():
    for o in list(bpy.data.collections["Q10A_Asset"].all_objects):
        bpy.data.objects.remove(o)
    before = {m.name for m in bpy.data.materials}
    bpy.ops.import_scene.gltf(filepath=GLB)
    imported = [o for o in bpy.context.scene.objects if o.select_get()]
    meshes = [o for o in imported if o.type == "MESH"]
    dg = bpy.context.evaluated_depsgraph_get()
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    mats = sorted({s.material.name for o in meshes for s in o.material_slots if s.material})
    trans = {m: {"alpha": round(alpha(bpy.data.materials[m]), 3), "method": bpy.data.materials[m].surface_render_method}
             for m in mats if alpha(bpy.data.materials[m]) < 1}
    names = {o.name for o in imported}
    sc = bpy.context.scene
    report = {"structure": structure(meshes)} if any(o.name.startswith("STRUCTURE_CRADLE") for o in meshes) else {}
    report.update({
        "glb": os.path.basename(GLB), "glb_bytes": os.path.getsize(GLB), "objects": len(imported), "meshes": len(meshes),
        "unique_meshes": len({o.data.name for o in meshes}), "triangles": tris, "materials": len(mats),
        "new_materials_on_import": len({m.name for m in bpy.data.materials} - before),
        "bounds_min": [round(v, 2) for v in lo], "bounds_max": [round(v, 2) for v in hi],
        "stage_nodes": {s: s in names for s in STAGES}, "people_nodes": sorted(n for n in names if "person" in n.lower() or "resident" in n.lower()),
        "transparent_materials": trans,
        "chair_through_tube_poolside": through(sc, dg, bpy.data.objects["CAM_POOLSIDE"], "old_wood", "tube_glass", 120, 150),
        "core_through_shell_main": through(sc, dg, bpy.data.objects["CAM_MAIN"], "light_core", "shell_glass", 320, 240),
        "core_through_shell_furnace": through(sc, dg, bpy.data.objects["CAM_FURNACE"], "light_core", "shell_glass", 160, 120),
    })
    with open(os.path.join(HERE, OUT), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("CHECK", json.dumps(report))


if __name__ == "__main__":
    main()
