"""Reimport check of q11b-floating-civic.glb (high-tide state; nothing is written into the model).

blender -b q11b-floating-civic.blend --python-exit-code 1 -P check_glb.py
Removes the authored asset, imports the GLB and writes check.json: triangle / mesh / material counts, bounds, named
nodes, the bridge ends (shore hinge and float seat, from the imported segment transforms), the bridge pitch and length,
the float lift (float and water nodes), measured float top, water surface level and its transparency, the four pillars
(position, top, the slider carriages round them), the five storeys and the roof level, the plaza levels under water and
dry (rays down through the water), and that no people are in the file.
"""
import json
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.join(HERE, "q11b-floating-civic.glb")
ROOT = "Q11B_FloatingCivic"
HINGE, SEAT_HIGH, SEG_LEN = Vector((0, -82, 4)), Vector((0, -40, 7)), 15.0
PILLARS = {"PILLAR_NE": 45.0, "PILLAR_NW": 135.0, "PILLAR_SW": 225.0, "PILLAR_SE": 315.0}
NODES = ["SITE", "PILLARS", "WATER", "FLOAT", "BRIDGE", "SITE_GROUND", "WATER_SURFACE", "FLOAT_HULL", "FLOAT_ROOF",
         "FLOAT_PORCH", "FLOAT_SLIDERS", "FLOAT_ATRIUM", "BRIDGE_SEG_1", "BRIDGE_SEG_2", "BRIDGE_SEG_3"] + \
        ["FLOAT_STOREY_%d" % k for k in range(1, 6)] + list(PILLARS)


def alpha(m):
    b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m and m.node_tree else None
    return 1.0 if b is None else (0.5 if b.inputs["Alpha"].is_linked else b.inputs["Alpha"].default_value)


def world_verts(o):
    return [o.matrix_world @ v.co for v in o.data.vertices]


def main():
    for o in list(bpy.data.collections["Q11B_Asset"].all_objects):
        bpy.data.objects.remove(o)
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
    # bridge: shore end of segment 1 and float end of segment 3, from the node transforms
    s1, s3 = by["BRIDGE_SEG_1"].matrix_world, by["BRIDGE_SEG_3"].matrix_world
    shore_end, float_end = s1 @ Vector((0, 0, 0)), s3 @ Vector((0, SEG_LEN, 0))
    d = float_end - shore_end
    bridge = {"shore_end": [round(v, 3) for v in shore_end], "float_end": [round(v, 3) for v in float_end],
              "shore_gap_m": round((shore_end - HINGE).length, 4), "seat_gap_m": round((float_end - SEAT_HIGH).length, 4),
              "length_m": round(d.length, 3), "pitch_deg": round(math.degrees(math.atan2(d.z, d.y)), 2)}
    # float and water
    hull = world_verts(by["FLOAT_HULL"])
    hull_top = max(v.z for v in hull if v.xy.length < 30)
    hull_bot = min(v.z for v in hull)
    wv = world_verts(by["WATER_SURFACE"])
    wm = by["WATER_SURFACE"].material_slots[0].material
    water = {"z": round(sum(v.z for v in wv) / len(wv), 3), "alpha": round(alpha(wm), 3), "method": wm.surface_render_method,
             "inner_r": round(min(v.xy.length for v in wv), 2), "outer_r": round(max(v.xy.length for v in wv), 2)}
    float_ = {"node_z": round(by["FLOAT"].matrix_world.translation.z, 3), "top_z": round(hull_top, 3), "bottom_z": round(hull_bot, 3),
              "freeboard_m": round(hull_top - water["z"], 3),
              "radius_m": round(max(v.xy.length for v in hull), 2)}
    # pillars and the carriages round them
    sl = world_verts(by["FLOAT_SLIDERS"])
    pillars = {}
    for n, b in PILLARS.items():
        ws = world_verts(by[n])
        shaft = [v for v in ws if v.z > 20]
        c = Vector((sum(v.x for v in shaft) / len(shaft), sum(v.y for v in shaft) / len(shaft)))
        near = [v for v in sl if (v.xy - c).length < 3.0]
        pillars[n] = {"centre": [round(c.x, 2), round(c.y, 2)], "r": round(c.length, 2), "top_z": round(max(v.z for v in ws), 2),
                      "bottom_z": round(min(v.z for v in ws), 2),
                      "carriage_z": [round(min(v.z for v in near), 2), round(max(v.z for v in near), 2)] if near else None,
                      "carriage_wraps_pillar": bool(near) and min((v.xy - c).length for v in near) < 1.0 and
                      max((v.xy - c).dot(Vector((math.cos(math.radians(b)), math.sin(math.radians(b))))) for v in near) > .8}
    storeys = {}
    for k in range(1, 6):
        ws = world_verts(by["FLOAT_STOREY_%d" % k])
        storeys[k] = {"z": [round(min(v.z for v in ws), 2), round(max(v.z for v in ws), 2)], "outer_r": round(max(v.xy.length for v in ws), 2)}
    roof_z = round(max(v.z for v in world_verts(by["FLOAT_ROOF"])), 2)
    # plaza: rays down at the plaza landings on the bridge side (x = 14, beside the bridge)
    plaza = []
    for r in (69.0, 74.0, 79.0, 84.0, 92.0):
        o = Vector((14.0, -r, 30.0))
        hits = []
        for _ in range(6):
            ok, loc, _n, idx, ob, _mw = sc.ray_cast(dg, o, Vector((0, 0, -1)))
            if not ok:
                break
            m = ob.material_slots[ob.data.polygons[idx].material_index].material if ob.material_slots else None
            hits.append((m.name.split(".")[0] if m else "?", round(loc.z, 2)))
            if alpha(m) >= .99:
                break
            o = loc + Vector((0, 0, -1e-3))
        ground = hits[-1][1] if hits else None
        plaza.append({"r": r, "ground_z": ground, "under_water": bool(hits) and hits[0][0].endswith("water"), "hits": hits})
    names = {o.name for o in imported}
    report = {
        "glb": os.path.basename(GLB), "glb_bytes": os.path.getsize(GLB), "objects": len(imported), "meshes": len(meshes),
        "unique_meshes": len({o.data.name for o in meshes}), "triangles": tris,
        "materials": len({s.material.name for o in meshes for s in o.material_slots if s.material}),
        "bounds_min": [round(v, 2) for v in lo], "bounds_max": [round(v, 2) for v in hi],
        "roots": sorted(o.name for o in imported if o.parent is None),
        "nodes": {n: n in by for n in NODES},
        "bridge": bridge, "float": float_, "water": water, "pillars": pillars, "storeys": storeys, "roof_z": roof_z,
        "plaza": plaza,
        "people_nodes": sorted(n for n in names if any(w in n.lower() for w in ("person", "resident", "figure", "people"))),
    }
    with open(os.path.join(HERE, "check.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("CHECK", json.dumps(report))


if __name__ == "__main__":
    main()
