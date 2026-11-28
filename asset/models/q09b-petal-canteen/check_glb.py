"""Reimport check of the Q09-B city GLB in an empty scene; writes check.json beside this file.

blender -b --factory-startup --python-exit-code 1 -P check_glb.py

Measures what the GLB itself holds: one root at the origin, size, triangles, materials (every slot filled), the petal
glass (alpha, base colour, iridescence), the petal heights and the exhaust outlet, the hood kept as its own object; then,
by ray casts against the imported meshes:
- petal layering: vertical rays up from 2 m on a grid under the roof, counting how many petal panels each crosses
  (coverage, and the share where two layers overlap);
- dining: each TABLE_k object present with its table and chair materials;
- circulation: the 2.5 m serving ring walkable all round (vertical probes across it find only floor), each passage
  between the tables clear from the serving ring to the outer columns (0.1 .. 2.0 m), the service route from the
  kitchen gap to the back-of-house door clear 1.8 m wide, and 1.5 m clear past the outer end of every table.
"""
import json
import math
import os
import random
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hall as L  # noqa: E402

MODEL = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 1 else "q09b-petal-canteen"
GLB = os.path.join(HERE, MODEL + ".glb")
CX, CY = L.C


def principled(m):
    if m is None or not m.node_tree:
        return None
    return next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)


def alpha_of(m):
    b = principled(m)
    return b.inputs["Alpha"].default_value if b else 1.0


def hexcol(rgba):
    def s(c):
        c = max(0.0, min(1.0, c))
        return c * 12.92 if c <= .0031308 else 1.055 * c ** (1 / 2.4) - .055
    return "#%02X%02X%02X" % tuple(round(s(c) * 255) for c in rgba[:3])


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB)
    sc = bpy.context.scene
    objs = list(sc.objects)
    meshes = [o for o in objs if o.type == "MESH"]
    by = {o.name: o for o in meshes}
    dg = bpy.context.evaluated_depsgraph_get()
    out = {"glb": GLB, "glb_bytes": os.path.getsize(GLB), "objects": len(objs), "meshes": len(meshes)}
    roots = [o for o in objs if o.parent is None]
    out["roots"] = [o.name for o in roots]
    out["root_location"] = [round(v, 4) for v in roots[0].location] if len(roots) == 1 else None
    out["preview_or_figure_nodes"] = [o.name for o in objs if o.name.startswith(("PV_", "CAM_"))]
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    out["bbox_min_m"] = [round(min(p[i] for p in pts), 3) for i in range(3)]
    out["bbox_max_m"] = [round(max(p[i] for p in pts), 3) for i in range(3)]
    out["triangles"] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    out["triangles_by_object"] = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes}
    mats = {m for o in meshes for m in o.data.materials}
    out["materials"] = len(mats)
    out["empty_slots"] = sum(1 for o in meshes for m in o.data.materials if m is None)
    glass = {}
    for m in mats:
        b = principled(m)
        if b is None or b.inputs["Alpha"].default_value >= 1:
            continue
        film = b.inputs["Thin Film Thickness"].default_value if "Thin Film Thickness" in b.inputs else 0
        glass[m.name] = {"alpha": round(b.inputs["Alpha"].default_value, 2), "base": hexcol(b.inputs["Base Color"].default_value),
                         "thin_film_nm": round(film, 1)}
    out["see_through"] = dict(sorted(glass.items()))
    # heights: petals, outlet; hood separate
    for name in ("PETALS_OUTER", "PETALS_INNER", "KITCHEN_HOOD"):
        o = by.get(name)
        if o:
            vs = [o.matrix_world @ v.co for v in o.data.vertices]
            out[name + "_top_z"] = round(max(v.z for v in vs), 2)
            out[name + "_max_r"] = round(max(math.hypot(v.x - CX, v.y - CY) for v in vs), 2)
    out["hood_is_own_object"] = "KITCHEN_HOOD" in by and "COLUMNS_RING_RIBS" in by

    def ray(o, d, dist=200.0):
        d = Vector(d).normalized()
        hit, loc, nrm, idx, ob, _ = sc.ray_cast(dg, Vector(o), d, distance=dist)
        if not hit:
            return None
        m = ob.material_slots[ob.data.polygons[idx].material_index].material if ob.material_slots else None
        return ((loc - Vector(o)).length, ob.name, m.name if m else None, alpha_of(m), loc)

    # petal layering under the roof
    layers = []
    for gx in range(-17, 18, 1):
        for gy in range(-17, 18, 1):
            r = math.hypot(gx, gy)
            if r > 15.4 or r < 2.0:
                continue
            p, n = Vector((CX + gx, CY + gy, 2.0)), 0
            for _ in range(10):
                h = ray(p, (0, 0, 1), 20)
                if h is None:
                    break
                if h[1].startswith("PETALS"):
                    n += 1
                p = h[4] + Vector((0, 0, .02))
            layers.append(n // 2)                                               # each panel has two faces
    covered = [n for n in layers if n >= 1]
    out["petal_layers_under_roof"] = {"probes": len(layers), "covered_share": round(len(covered) / len(layers), 3),
                                      "two_or_more_layers_share": round(sum(1 for n in layers if n >= 2) / len(layers), 3),
                                      "max_layers": max(layers)}
    # dining
    tabs = {}
    for k in range(1, 7):
        o = by.get("TABLE_%d" % k)
        names = {m.name for m in o.data.materials} if o else set()
        tabs["TABLE_%d" % k] = {"present": o is not None, "table_top": "q09b_table_oak" in names, "chairs": "q09b_chair_oak" in names,
                                "tableware": "q09b_plate_white" in names, "lamps": "q09b_table_light" in names}
    out["tables"] = tabs
    # circulation
    blocked = []
    for i in range(72):                                                         # serving ring: probes down across it
        b = 5.0 * i
        for r in (L.SERVE_R[0] + .25, sum(L.SERVE_R) / 2, L.SERVE_R[1] - .25):
            p = Vector(L.at(r, b, 2.6))
            h = ray(p, (0, 0, -1), 3.0)
            if h is None or h[4].z > .06:
                blocked.append({"bearing": b, "r": r, "hit": h[1] if h else None, "z": round(h[4].z, 2) if h else None})
    out["serving_ring_clear"] = {"probes": 216, "blocked": blocked, "clear": not blocked}
    passes = []
    for b in [30.0 + 60 * k for k in range(6)]:                                 # passages between the tables
        hits = []
        for z in (.1, .6, 1.2, 2.0):
            for off in (-.9, 0.0, .9):
                a = math.radians(b)
                t = Vector((-math.sin(a), math.cos(a), 0)) * off
                p0 = Vector(L.at(L.SERVE_R[1] + .1, b, z)) + t
                p1 = Vector(L.at(L.RING_R - .4, b, z)) + t
                h = ray(p0, p1 - p0, (p1 - p0).length)
                if h is not None:
                    hits.append({"z": z, "off": off, "hit": h[1], "at_r": round(math.hypot(h[4].x - CX, h[4].y - CY), 2)})
        passes.append({"bearing": b, "width_tested_m": 1.8, "clear": not hits, "hits": hits[:4]})
    out["table_passages"] = passes
    svc = []
    for x in (-.9, 0.0, .9):                                                    # kitchen gap -> back-of-house door
        for z in (.1, 1.0, 2.0):
            p0, p1 = Vector((x, CY + L.KITCHEN_R + .3, z)), Vector((x, L.BOH[2] - .15, z))
            h = ray(p0, p1 - p0, (p1 - p0).length)
            if h is not None:
                svc.append({"x": x, "z": z, "hit": h[1], "y": round(h[4].y, 2)})
    out["service_route"] = {"from_y": round(CY + L.KITCHEN_R + .3, 2), "to_y": L.BOH[2] - .15, "width_tested_m": 1.8, "blocked": svc, "clear": not svc}
    ends = []
    for b in L.TABLE_BEARINGS:                                                  # space past each table's outer end
        p0 = Vector(L.at(L.TABLE_R[1] + .05, b, .5))
        h = ray(p0, Vector(L.at(L.TABLE_R[1] + 5, b, .5)) - p0, 5)
        ends.append({"bearing": b, "clear_m": round(h[0], 2) if h else 5.0, "to": h[1] if h else None})
    out["table_end_clearance"] = ends
    out["petal_tip_max_z"] = max(out.get("PETALS_OUTER_top_z", 0), out.get("PETALS_INNER_top_z", 0))
    # v2: the menu ring and the lightbox carry their pictures; what the entrance and table cameras can see
    signs = {}
    for name in ("MENU_RING", "LIGHTBOX"):
        o = by.get(name)
        imgs = []
        if o:
            for m in o.data.materials:
                for nd in (m.node_tree.nodes if m and m.node_tree else []):
                    if nd.type == "TEX_IMAGE" and nd.image:
                        imgs.append({"material": m.name, "image": nd.image.name, "px": list(nd.image.size)})
        signs[name] = {"present": o is not None, "faces": len(o.data.polygons) if o else 0, "images": imgs}
    if signs["MENU_RING"]["present"] or signs["LIGHTBOX"]["present"]:
        out["signs"] = signs
        import review_petal_canteen as RV

        def sees(eye, target, tp):
            eye, tp = Vector(eye), Vector(tp)
            d = (tp - eye).normalized()
            p = eye
            for _ in range(16):
                h = ray(p, d, (tp - p).length + .05)
                if h is None:
                    return True
                if h[3] < 1:                                                    # see-through: pass on
                    p = h[4] + d * .01
                    continue
                return h[1].startswith(target) and (h[4] - tp).length < .35
            return False
        vis = {}
        for cam in ("main", "table"):
            eye = RV.CAMERAS[cam][0]
            r, z0, z1 = L.MENU
            pts = [L.at(r + .05, b, (z0 + z1) / 2) for b in range(185, 360, 10)]     # screens on the street half
            vis["menu_from_" + cam] = "%d / %d" % (sum(sees(eye, "MENU_RING", p) for p in pts), len(pts))
            tb = by.get("TABLE_5")
            tops = [tb.matrix_world @ v.co for v in tb.data.vertices if .78 < (tb.matrix_world @ v.co).z < .9][::9] if tb else []
            vis["served_table_from_" + cam] = "%d / %d" % (sum(sees(eye, "TABLE_5", p) for p in tops), len(tops))
            hp = [L.at(L.HOOD[0] + .05, b, L.HOOD[1] + .3) for b in range(200, 341, 20)]
            vis["hood_from_" + cam] = "%d / %d" % (sum(sees(eye, "KITCHEN_HOOD", p) for p in hp), len(hp))
        out["visibility_v2"] = vis
    with open(os.path.join(HERE, "check%s.json" % MODEL[len("q09b-petal-canteen"):]), "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, indent=1)
    print("CHECK", json.dumps({k: v for k, v in out.items() if k not in ("triangles_by_object", "see_through")}))


if __name__ == "__main__":
    random.seed(0)
    main()
