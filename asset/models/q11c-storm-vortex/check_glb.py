"""Reimport check of q11c-storm-vortex.glb (nothing is written into the model).

blender -b q11c-storm-vortex.blend --python-exit-code 1 -P check_glb.py
Removes the authored asset, imports the GLB and writes check.json: triangle / mesh / material counts, bounds, the
animation nodes and their pivots (each turbine rotor on its duct axis with local +x pointing radially out of the drum,
the rings and streaks centred on the vertical axis), transparent materials and their blend mode, and how much of the
main view the vortex and the turbines take (rays from CAM_MAIN; a ray passes through transparent surfaces and records
every material it meets until the first opaque one).
"""
import json
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.join(HERE, "q11c-storm-vortex.glb")
TURB_R_AXIS, TURB_Z = 52.4, 11.25
NODES = ["VORTEX_FUNNEL", "VORTEX_STREAKS", "VORTEX_CAP", "RING_LOW", "RING_MID", "RING_HIGH", "TURBINE_HOUSINGS",
         "STRUCTURE_VANES", "STRUCTURE_ROOF", "DECK_WALKWAYS", "PLAZA_GROUND"]


def alpha(m):
    b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m and m.node_tree else None
    if b is None:
        return 1.0
    a = b.inputs["Alpha"]
    return 0.5 if a.is_linked else a.default_value


def trace(scene, dg, o, d, limit=60):
    hits = []
    for _ in range(limit):
        ok, loc, _n, idx, ob, _mw = scene.ray_cast(dg, o, d)
        if not ok:
            break
        m = ob.material_slots[ob.data.polygons[idx].material_index].material if ob.material_slots else None
        hits.append(m.name if m else "?")
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
            p = mw @ fr[3].lerp(fr[0], u).lerp(fr[2].lerp(fr[1], u), v)
            yield o, (p - o).normalized()


def coverage(scene, dg, cam, nx=160, ny=120):
    n = nx * ny
    vortex = turbine = 0
    for o, d in rays(cam, nx, ny):
        h = trace(scene, dg, o, d)
        vortex += any("vortex" in x or "cap_cloud" in x for x in h)
        turbine += bool(h) and ("turbine_blade" in h[-1] or "turbine_hub" in h[-1])
    return {"vortex_share": round(vortex / n, 3), "turbine_share": round(turbine / n, 4)}


def main():
    for o in list(bpy.data.collections["Q11C_Asset"].all_objects):
        bpy.data.objects.remove(o)
    before = {m.name for m in bpy.data.materials}
    bpy.ops.import_scene.gltf(filepath=GLB)
    imported = [o for o in bpy.context.scene.objects if o.select_get()]
    meshes = [o for o in imported if o.type == "MESH"]
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    by = {o.name.split(".")[0]: o for o in imported}
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo, hi = Vector(map(min, lo, w)), Vector(map(max, hi, w))
    rotors = sorted(n for n in by if n.startswith("TURBINE_ROTOR_"))
    worst_pos = worst_axis = 0.0
    for n in rotors:
        b = math.radians(int(n.rsplit("_", 1)[1]))
        want = Vector((TURB_R_AXIS * math.cos(b), TURB_R_AXIS * math.sin(b), TURB_Z))
        mw = by[n].matrix_world
        worst_pos = max(worst_pos, (mw.translation - want).length)
        x = (mw.to_3x3() @ Vector((1, 0, 0))).normalized()
        worst_axis = max(worst_axis, 1 - x.dot(Vector((math.cos(b), math.sin(b), 0))))
    centred = {n: [round(v, 3) for v in by[n].matrix_world.translation] for n in ("RING_LOW", "RING_MID", "RING_HIGH", "VORTEX_STREAKS") if n in by}
    mats = sorted({s.material.name for o in meshes for s in o.material_slots if s.material})
    trans = {m: {"alpha": round(alpha(bpy.data.materials[m]), 3), "method": bpy.data.materials[m].surface_render_method}
             for m in mats if alpha(bpy.data.materials[m]) < 1}
    names = {o.name for o in imported}
    report = {
        "glb": os.path.basename(GLB), "glb_bytes": os.path.getsize(GLB), "objects": len(imported), "meshes": len(meshes),
        "unique_meshes": len({o.data.name for o in meshes}), "triangles": tris, "materials": len(mats),
        "new_materials_on_import": len({m.name for m in bpy.data.materials} - before),
        "bounds_min": [round(v, 2) for v in lo], "bounds_max": [round(v, 2) for v in hi],
        "roots": sorted(o.name for o in imported if o.parent is None),
        "nodes": {n: n in by for n in NODES},
        "rotors": {"count": len(rotors), "worst_offset_m": round(worst_pos, 4), "worst_axis_error": round(worst_axis, 6)},
        "centred_nodes": centred,
        "people_nodes": sorted(n for n in names if "person" in n.lower() or "resident" in n.lower()),
        "transparent_materials": trans,
        "main_view": coverage(bpy.context.scene, dg, bpy.data.objects["CAM_MAIN"]),
    }
    with open(os.path.join(HERE, "check.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("CHECK", json.dumps(report))


if __name__ == "__main__":
    main()
