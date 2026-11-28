"""Reimport check of q11c-vortex-power-station.glb (nothing is written into the model).

blender -b q11c-vortex-power-station.blend --python-exit-code 1 -P check_glb.py
Removes the authored asset, imports the GLB and writes check.json: triangle / mesh / material / texture counts, bounds, the
named nodes, the number of rings and their clearance to the vortex (every imported vortex vertex near each ring), the
rotors on their duct axes, the vortex textures still wired in (so the spiral cloud pattern survives the export), the
entrance walk (rays at walking height from the stair head to the doors meet nothing but the door glass), transparent
materials and their blend mode, and how much of the main view the vortex and the cloud take (rays from CAM_MAIN pass
through transparent surfaces and record every material until the first opaque one).
"""
import json
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.join(HERE, "q11c-vortex-power-station.glb")
ROOT = "Q11C_VortexPowerStation"
RINGS = {"RING_LOW": (25.0, 57.0), "RING_MID": (28.0, 83.0), "RING_HIGH": (32.0, 109.0)}
TURB_R, TURB_Z, TURB_OFF, TURB_YAW = 52.0, 7.0, 6.8, 12.0
PODIUM_Z, ENTRY_AX = 3.0, 271.0
VORTEX = ["VORTEX_CORE", "VORTEX_ROPES", "VORTEX_BANDS", "VORTEX_MIST", "VORTEX_SKIRT", "CLOUD_DISC", "CLOUD_WISP"]
NODES = VORTEX + list(RINGS) + ["STATION", "ROTORS", "RINGS", "VORTEX", "CLOUD", "PLAZA", "STATION_PODIUM", "STATION_DRUM",
                                "STATION_ROOF", "STATION_DECK", "STATION_ENTRANCE", "PLAZA_GROUND"]


def pol(r, deg, z=0.0):
    return Vector((r * math.cos(math.radians(deg)), r * math.sin(math.radians(deg)), z))


def alpha(m):
    b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m and m.node_tree else None
    if b is None:
        return 1.0
    a = b.inputs["Alpha"]
    return 0.5 if a.is_linked else a.default_value


def mat_at(ob, idx):
    return ob.material_slots[ob.data.polygons[idx].material_index].material if ob.material_slots else None


def trace(scene, dg, o, d, limit=80):
    hits = []
    for _ in range(limit):
        ok, loc, _n, idx, ob, _mw = scene.ray_cast(dg, o, d)
        if not ok:
            break
        m = mat_at(ob, idx)
        hits.append((m.name if m else "?", (loc - o).length))
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
    vortex = cloud = turbine = 0
    for o, d in rays(cam, nx, ny):
        h = [x for x, _ in trace(scene, dg, o, d)]
        vortex += any("vortex" in x for x in h)
        cloud += any("cloud" in x for x in h)
        turbine += bool(h) and ("turbine_blade" in h[-1] or "turbine_hub" in h[-1])
    return {"vortex_share": round(vortex / n, 3), "cloud_share": round(cloud / n, 3), "turbine_share": round(turbine / n, 4)}


def textured(m):
    """Image wired into Base Color (the cloud strands), and into Alpha when the material is blended."""
    b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    out = {}
    for sock in ("Base Color", "Alpha"):
        link = b.inputs[sock].links[0] if b.inputs[sock].is_linked else None
        node = link.from_node if link else None
        while node is not None and node.type != "TEX_IMAGE" and node.inputs and node.inputs[0].is_linked:
            node = node.inputs[0].links[0].from_node
        out[sock] = list(node.image.size) if node is not None and node.type == "TEX_IMAGE" and node.image else None
    return out


def main():
    for o in list(bpy.data.collections["Q11C_Asset"].all_objects):
        bpy.data.objects.remove(o)
    before = {m.name for m in bpy.data.materials}
    imgs_before = {i.name for i in bpy.data.images}
    bpy.ops.import_scene.gltf(filepath=GLB)
    imported = [o for o in bpy.context.scene.objects if o.select_get()]
    meshes = [o for o in imported if o.type == "MESH"]
    bpy.context.view_layer.update()
    sc = bpy.context.scene
    dg = bpy.context.evaluated_depsgraph_get()
    by = {o.name.split(".")[0]: o for o in imported}
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo, hi = Vector(map(min, lo, w)), Vector(map(max, hi, w))
    station = [o for o in meshes if not o.name.startswith(("VORTEX_", "CLOUD_", "RING_", "TREE_", "PLAZA_"))]
    slo, shi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in station:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            slo, shi = Vector(map(min, slo, w)), Vector(map(max, shi, w))
    # rings: count, level, inner radius, clearance to every vortex vertex near the ring
    vx = [o.matrix_world @ v.co for o in meshes if o.name.startswith("VORTEX_") for v in o.data.vertices]
    rings = {}
    for n in sorted(x for x in by if x.startswith("RING_")):
        o = by[n]
        ws = [o.matrix_world @ v.co for v in o.data.vertices]
        z = sum(w.z for w in ws) / len(ws)
        r_in = min(w.xy.length for w in ws)
        near = [w.xy.length for w in vx if abs(w.z - z) < 1.3]
        rings[n] = {"z": round(z, 2), "inner_r": round(r_in, 2), "tube_m": round(max(w.z for w in ws) - min(w.z for w in ws), 2),
                    "vortex_max_r_near": round(max(near), 2), "clearance_m": round(r_in - max(near), 2)}
    # rotors: on their duct axis, local +x along it
    rotors = sorted(n for n in by if n.startswith("TURBINE_ROTOR_"))
    worst_pos = worst_axis = 0.0
    for n in rotors:
        b = int(n.rsplit("_", 1)[1]) + TURB_OFF
        mw = by[n].matrix_world
        worst_pos = max(worst_pos, (mw.translation - pol(TURB_R, b, TURB_Z)).length)
        x = (mw.to_3x3() @ Vector((1, 0, 0))).normalized()
        worst_axis = max(worst_axis, 1 - x.dot(pol(1, b - TURB_YAW)))
    # entrance walk: rays at walking height from the stair head to the door line
    walk = []
    for off in (-3.0, 0.0, 3.0):
        for h in (1.0, 1.8):
            o = pol(60.5, ENTRY_AX) + pol(1, ENTRY_AX + 90) * off + Vector((0, 0, PODIUM_Z + h))
            d = -pol(1, ENTRY_AX)
            hit = trace(sc, dg, o, d, 4)
            walk.append({"offset_m": off, "h": h, "first": hit[0][0] if hit else None, "dist_m": round(hit[0][1], 2) if hit else None})
    stair = []
    for r in (61.0, 63.0, 65.5, 67.5):                                                     # stair treads under the axis
        ok, loc, *_ = sc.ray_cast(dg, pol(r, ENTRY_AX, 6.5), Vector((0, 0, -1)))                 # from under the canopy
        stair.append(round(loc.z, 2) if ok else None)
    mats = sorted({s.material.name for o in meshes for s in o.material_slots if s.material})
    trans = {m: {"alpha": round(alpha(bpy.data.materials[m]), 3), "method": bpy.data.materials[m].surface_render_method}
             for m in mats if alpha(bpy.data.materials[m]) < 1}
    vtex = {}
    for n in VORTEX:
        if n in by:
            m = by[n].material_slots[0].material
            vtex[n] = {"material": m.name, **textured(m)}
    names = {o.name for o in imported}
    report = {
        "glb": os.path.basename(GLB), "glb_bytes": os.path.getsize(GLB), "objects": len(imported), "meshes": len(meshes),
        "unique_meshes": len({o.data.name for o in meshes}), "triangles": tris, "materials": len(mats),
        "new_materials_on_import": len({m.name for m in bpy.data.materials} - before),
        "images": {i.name: list(i.size) for i in bpy.data.images if i.name not in imgs_before},
        "bounds_min": [round(v, 2) for v in lo], "bounds_max": [round(v, 2) for v in hi],
        "station_bounds_min": [round(v, 2) for v in slo], "station_bounds_max": [round(v, 2) for v in shi],
        "roots": sorted(o.name for o in imported if o.parent is None),
        "nodes": {n: n in by for n in NODES},
        "vanes": len([n for n in by if n.startswith("VANE_")]),
        "ring_count": len(rings), "rings": rings,
        "rotors": {"count": len(rotors), "worst_offset_m": round(worst_pos, 4), "worst_axis_error": round(worst_axis, 6)},
        "vortex_textures": vtex,
        "entrance_walk": walk, "stair_tread_z": stair,
        "people_nodes": sorted(n for n in names if "person" in n.lower() or "resident" in n.lower() or "figure" in n.lower()),
        "transparent_materials": trans,
        "main_view": coverage(sc, dg, bpy.data.objects["CAM_MAIN"]),
    }
    with open(os.path.join(HERE, "check.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("CHECK", json.dumps(report))


if __name__ == "__main__":
    main()
