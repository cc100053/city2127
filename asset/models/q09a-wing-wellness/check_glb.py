"""Reimport check of the Q09-A city GLB in an empty scene; writes check.json beside this file.

blender -b --factory-startup --python-exit-code 1 -P check_glb.py

Measures what the GLB itself holds: one root at the origin, size, triangles, materials (every slot filled; which are
see-through, which carry iridescence), no preview or figure nodes. Then, by ray casts against the imported meshes:
- each entrance: clear width between the jambs at 1.0 m, and a 1.8 m approach band from the walkway to the door line
  free of obstacles (0.1 .. 2.0 m above the paving);
- visibility through the glass: from the main, gym and yoga camera points, rays to sample points on the gym equipment
  and on the yoga mats; a ray may pass any see-through surface (glass, guard glass, wing film) and counts as seeing the
  target when the first opaque hit is the target object; also how many glass layers it crossed;
- the highest wing tip and the clearance between each wing's underside and the building below it.
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
import pavilion as L  # noqa: E402
import review_wing_wellness as RV  # noqa: E402

GLB = os.path.join(HERE, "q09a-wing-wellness.glb")


def alpha_of(m):
    if m is None or not m.node_tree:
        return 1.0
    b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if b is None:
        return 1.0
    return b.inputs["Alpha"].default_value


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB)
    sc = bpy.context.scene
    objs = list(sc.objects)
    meshes = [o for o in objs if o.type == "MESH"]
    dg = bpy.context.evaluated_depsgraph_get()
    out = {"glb": GLB, "glb_bytes": os.path.getsize(GLB), "objects": len(objs), "meshes": len(meshes)}
    roots = [o for o in objs if o.parent is None]
    out["roots"] = [o.name for o in roots]
    out["root_location"] = [round(v, 4) for v in roots[0].location] if len(roots) == 1 else None
    out["preview_or_figure_nodes"] = [o.name for o in objs if o.name.startswith(("PV_", "CAM_"))]
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = [min(p[i] for p in pts) for i in range(3)]
    hi = [max(p[i] for p in pts) for i in range(3)]
    out["bbox_min_m"], out["bbox_max_m"] = [round(v, 3) for v in lo], [round(v, 3) for v in hi]
    bpts = [o.matrix_world @ Vector(c) for o in meshes if not o.name.startswith("SITE") for c in o.bound_box]
    out["building_size_m"] = [round(max(p[i] for p in bpts) - min(p[i] for p in bpts), 2) for i in range(3)]
    out["triangles"] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    out["triangles_by_object"] = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes}
    mats = {m for o in meshes for m in o.data.materials}
    out["materials"] = len(mats)
    out["empty_slots"] = sum(1 for o in meshes for m in o.data.materials if m is None)
    out["see_through"] = {m.name: round(alpha_of(m), 2) for m in mats if m and alpha_of(m) < 1}
    irid = {}
    for m in mats:
        b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m and m.node_tree else None
        if b is not None and "Thin Film Thickness" in b.inputs and b.inputs["Thin Film Thickness"].default_value > 0:
            irid[m.name] = round(b.inputs["Thin Film Thickness"].default_value, 1)
    out["iridescent_thin_film_nm"] = irid

    def ray(o, d, dist=200.0):
        """First hit along a ray: (distance, object name, material alpha, location) or None."""
        d = Vector(d).normalized()
        hit, loc, nrm, idx, ob, _ = sc.ray_cast(dg, Vector(o), d, distance=dist)
        if not hit:
            return None
        m = ob.material_slots[ob.data.polygons[idx].material_index].material if ob.material_slots else None
        return ((loc - Vector(o)).length, ob.name, alpha_of(m), loc)

    def see(o, target_obj, tp, max_layers=12):
        """Walk a ray through see-through hits; returns (sees target, glass layers crossed)."""
        o = Vector(o)
        d = (tp - o).normalized()
        total = (tp - o).length
        p, layers = o, 0
        for _ in range(max_layers):
            h = ray(p, d, total - (p - o).length + .05)
            if h is None:                                                   # nothing opaque before the target point
                return True, layers
            dist, name, a, loc = h
            if a < 1:
                layers += 1
                p = loc + d * .01
                continue
            return name == target_obj and (loc - tp).length < .3, layers
        return False, layers

    # entrances: clear width between the jambs and a free approach band
    fy = L.front_glass_y()
    ents = []
    for name, (x0, x1) in (("gym", L.GYM_DOOR), ("yoga", L.YOGA_DOOR)):
        xc = (x0 + x1) / 2
        hl = ray((xc, fy, 1.0), (-1, 0, 0), 3.0)
        hr = ray((xc, fy, 1.0), (1, 0, 0), 3.0)
        width = (hl[0] if hl else 3.0) + (hr[0] if hr else 3.0)
        blocked = []
        for dx in [-.9 + .15 * i for i in range(13)]:
            for z in (.1, .6, 1.2, 2.0):
                h = ray((xc + dx, L.WALK_Y[0], z), (0, 1, 0), fy - .3 - L.WALK_Y[0])
                if h is not None:
                    blocked.append({"dx": round(dx, 2), "z": z, "hit": h[1], "y": round(h[3].y, 2)})
        inside = ray((xc, fy - .5, 1.2), (0, 1, 0), 3.5)
        ents.append({"door": name, "clear_width_m": round(width, 3), "approach_band_m": 1.8, "approach_from_y": L.WALK_Y[0],
                     "approach_blocked": blocked,
                     "clear_3m_inside_door": inside is None, "first_hit_inside": (inside[1], round(inside[0] - .5, 2)) if inside else None})
    out["entrances"] = ents
    # visibility through the glass
    rng = random.Random(9)
    by_name = {o.name: o for o in meshes}
    vis = {}
    eyes = {"main": RV.CAMERAS["main"][0], "gym": RV.CAMERAS["gym"][0], "yoga": RV.CAMERAS["yoga"][0]}
    for tname in ("GYM_EQUIPMENT", "YOGA_ROOM"):
        ob = by_name.get(tname)
        if ob is None:
            continue
        me = ob.data
        if tname == "YOGA_ROOM":                                           # only the mats (thin boxes at 0.06-0.085 m)
            cand = [ob.matrix_world @ v.co for v in me.vertices if .07 < (ob.matrix_world @ v.co).z < .09 and 2.5 < (ob.matrix_world @ v.co).x < 9.5
                    and 3 < (ob.matrix_world @ v.co).y < 8]
            cand = [c + Vector((0, 0, .002)) for c in cand]
        else:                                                              # equipment above the floor
            cand = [ob.matrix_world @ v.co for v in me.vertices if (ob.matrix_world @ v.co).z > .3]
        sample = rng.sample(cand, min(160, len(cand)))
        for ename, eye in eyes.items():
            res = [see(eye, tname, p) for p in sample]
            seen = [r for r in res if r[0]]
            vis["%s_from_%s" % (tname, ename)] = {"samples": len(sample), "visible": len(seen),
                                                 "share": round(len(seen) / max(1, len(sample)), 2),
                                                 "glass_layers_crossed": sorted({r[1] for r in seen})}
    out["visibility_through_glass"] = vis
    # wings: highest tip, underside clearance to the building beneath
    wings = []
    for o in meshes:
        if not o.name.startswith("WING_"):
            continue
        vs = [o.matrix_world @ v.co for v in o.data.vertices]
        top = max(v.z for v in vs)
        film = {i for i, s in enumerate(o.material_slots) if s.material and "wing_film" in s.material.name}
        fv = sorted({i for p in o.data.polygons if p.material_index in film for i in p.vertices})
        clear = 99.0
        for v in [o.matrix_world @ o.data.vertices[i].co for i in fv[::5]]:     # membrane only (struts stand on the roof)
            p, down = v + Vector((0, 0, -.12)), .12
            for _ in range(8):                                                 # pass other wings, stop at the building
                h = ray(p, (0, 0, -1), 40)
                if h is None or h[1].startswith("SITE"):
                    break
                if h[1].startswith(("WING_", "RIDGE")):
                    down += h[0] + .01
                    p = h[3] + Vector((0, 0, -.01))
                    continue
                clear = min(clear, down + h[0])
                break
        wings.append({"wing": o.name, "top_z": round(top, 2), "min_clear_below_m": round(clear, 2)})
    out["wings"] = sorted(wings, key=lambda w: w["wing"])
    out["wing_tip_max_z"] = max(w["top_z"] for w in wings) if wings else None
    with open(os.path.join(HERE, "check.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, indent=1)
    print("CHECK", json.dumps({k: v for k, v in out.items() if k not in ("triangles_by_object",)}))


if __name__ == "__main__":
    main()
