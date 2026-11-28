"""Reimport check of the Q09-C city GLB in an empty scene; writes check.json beside this file.

blender -b --factory-startup --python-exit-code 1 -P check_glb.py

Measures what the GLB itself holds: one root at the origin, size inside the 54 x 36 m block, triangles, materials
(every slot filled; glass see-through, pearl cladding with iridescence); then, by ray casts against the imported meshes:
- levels: the stair's top tread against the landing, each skywalk's first tread against the landing (one riser up), its
  level deck and its far end against the canopy courtyard's deck, the lift car's floor against the deck;
- clearance under the skywalks: deck underside to the ground along the level part, the least over the lanes and over
  the planting;
- ground passage: the entrance street, both lanes (three lines across each), the rejoin and the exit street clear from
  0.1 to 2.2 m above the paving (no column, stall, planter or stair in the way).
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import market as L  # noqa: E402

MODEL = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv and len(sys.argv) > sys.argv.index("--") + 1 else "q09c-skywalk-market"
GLB = os.path.join(HERE, MODEL + ".glb")


def principled(m):
    if m is None or not m.node_tree:
        return None
    return next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)


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
    out["inside_block_plan"] = lo[0] >= L.BLOCK[0] - .05 and hi[0] <= L.BLOCK[1] + .05 and lo[1] >= L.BLOCK[2] - .05 and hi[1] <= L.BLOCK[3] + .3
    out["triangles"] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    out["triangles_by_object"] = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes}
    mats = {m for o in meshes for m in o.data.materials}
    out["materials"] = len(mats)
    out["empty_slots"] = sum(1 for o in meshes for m in o.data.materials if m is None)
    look = {}
    for m in mats:
        b = principled(m)
        if b is None:
            continue
        a = b.inputs["Alpha"].default_value
        film = b.inputs["Thin Film Thickness"].default_value if "Thin Film Thickness" in b.inputs else 0
        if a < 1 or film > 0:
            look[m.name] = {"alpha": round(a, 2), "thin_film_nm": round(film, 1)}
    out["glass_and_pearl"] = dict(sorted(look.items()))

    def down(x, y, z0=20.0, skip=()):
        """Top surface z at (x, y) from above, passing see-through hits and names in skip."""
        p = Vector((x, y, z0))
        for _ in range(12):
            hit, loc, nrm, idx, ob, _m = sc.ray_cast(dg, p, Vector((0, 0, -1)), distance=40)
            if not hit:
                return None, None
            m = ob.material_slots[ob.data.polygons[idx].material_index].material if ob.material_slots else None
            b = principled(m)
            if (b is not None and b.inputs["Alpha"].default_value < 1) or ob.name.startswith(skip):
                p = loc + Vector((0, 0, -.01))
                continue
            return round(loc.z, 3), ob.name
        return None, None

    skip_up = ("CANOPY_COURTYARD",)
    lv = {}
    ty = L.stair_top_y()
    lv["stair_top_tread_z"] = down(0.0, ty - .15, 4.0)[0]
    ly0, ly1 = L.landing_y()
    lv["landing_z"] = down(0.0, (ly0 + ly1) / 2, 4.0)[0]
    lv["stair_to_landing_step_m"] = round(abs(lv["landing_z"] - lv["stair_top_tread_z"]), 3) if lv["landing_z"] is not None and lv["stair_top_tread_z"] is not None else None
    sk = {}
    for s, tag in ((-1, "L"), (1, "R")):
        path = L.bridge_path(s, L.BRIDGE_N)
        n = len(path) - 1
        first = ((path[0][0] + path[1][0]) / 2, (path[0][1] + path[1][1]) / 2)     # middle of the first tread's first segment
        z_first, _ = down(first[0], first[1], 4.5)
        tread_depth = sum(math.dist(path[i], path[i + 1]) for i in range(3))
        mid = path[int(.7 * n)]
        z_mid, _ = down(mid[0], mid[1], 8.0)
        end = path[n - 1]
        z_end, _ = down(end[0], end[1], 8.0)
        pc = L.platform_point(180.0 if s < 0 else 0.0, .8)
        z_plat, _ = down(pc[0], pc[1] - 1.2, 8.0, skip=())
        # clearance under the level part: underside (first hit going up from the ground) over lanes / planting
        over_lane, over_plant = 99.0, 99.0
        for i in range(int(.45 * n), n - 1):
            x, y = path[i]
            for off in (-1.2, 0.0, 1.2):
                a_, b_ = path[max(i - 1, 0)], path[min(i + 1, n)]
                tx, ty_ = b_[0] - a_[0], b_[1] - a_[1]
                ln = math.hypot(tx, ty_) or 1
                px, py = x - ty_ / ln * off, y + tx / ln * off
                g = Vector((px, py, .1))
                hit, loc, nrm, idx, ob, _m = sc.ray_cast(dg, g, Vector((0, 0, 1)), distance=10)
                if hit and loc.z < 2.0:                                        # a column foot: look past it
                    hit, loc, nrm, idx, ob, _m = sc.ray_cast(dg, Vector((px, py, 2.0)), Vector((0, 0, 1)), distance=8)
                if not hit or not ob.name.startswith("SKYWALK") or loc.z < 3.0:     # still a column body: skip this probe
                    continue
                ex, ey = px - L.LANE_C[0], py - L.LANE_C[1]
                ri = math.hypot(ex / (L.LANE_AB[0] - L.LANE_W / 2), ey / (L.LANE_AB[1] - L.LANE_W / 2))
                ro = math.hypot(ex / (L.LANE_AB[0] + L.LANE_W / 2), ey / (L.LANE_AB[1] + L.LANE_W / 2))
                on_lane = ri >= 1.0 and ro <= 1.0
                clear = loc.z
                if on_lane:
                    over_lane = min(over_lane, clear)
                else:
                    over_plant = min(over_plant, clear - .45)                # above the planting ring's top
        sk[tag] = {"first_tread_z": z_first, "riser_from_landing_m": round(z_first - lv["landing_z"], 3) if z_first and lv["landing_z"] else None,
                   "design_riser_m": round(L.RISER_B, 3), "tread_depth_m": round(tread_depth, 3),
                   "level_deck_z": z_mid, "end_deck_z": z_end, "courtyard_deck_z": z_plat,
                   "end_to_courtyard_step_m": round(abs(z_end - z_plat), 3) if z_end is not None and z_plat is not None else None,
                   "min_clear_under_over_lane_m": round(over_lane, 2) if over_lane < 99 else None,
                   "min_clear_under_over_planting_m": round(over_plant, 2) if over_plant < 99 else None}
    lv["skywalks"] = sk
    car = down(sum(L.LIFT[:2]) / 2, sum(L.LIFT[2:]) / 2, 7.0)                 # from inside the car, down to its floor
    lv["lift_car_floor_z"] = car[0]
    lv["courtyard_deck_z"] = down(L.PLATFORM_C[0] + 5.8, L.PLATFORM_C[1] + 1.5, 9.0, skip=())[0]   # open deck, clear of planters
    lv["stair_note"] = "the top tread is one riser below the landing (14 risers, 13 treads + landing)"
    out["levels"] = lv
    # ground passage
    lines = {"entrance_street": [[(x, y) for y in [.3 + .5 * i for i in range(16)]] for x in (-2.2, 0.0, 2.2)],
             "exit_street": [[(x, y) for y in [33.6 + .25 * i for i in range(9)]] for x in (-2.2, 0.0, 2.2)]}
    for s, tag in ((-1, "left_lane"), (1, "right_lane")):
        lines[tag] = [[L.lane_point(s, t, off) for t in range(-84, 85, 3)] for off in (-1.3, 0.0, 1.3)]
    blocked = {}
    for name, ls in lines.items():
        hits = []
        for line in ls:
            for (x0, y0), (x1, y1) in zip(line, line[1:]):
                for z in (.1, 1.0, 2.2):
                    p0, p1 = Vector((x0, y0, z)), Vector((x1, y1, z))
                    hit, loc, nrm, idx, ob, _m = sc.ray_cast(dg, p0, (p1 - p0).normalized(), distance=(p1 - p0).length)
                    if hit:
                        hits.append({"at": [round(loc.x, 2), round(loc.y, 2), z], "hit": ob.name})
        blocked[name] = {"clear": not hits, "hits": hits[:6]}
    out["ground_passage"] = blocked
    # v2: signs (texture on each face, the picture's left-to-right running to the viewer's right), the teal band
    so = next((o for o in meshes if o.name.startswith("SIGNS")), None)
    if so is not None:
        me = so.data
        uv = me.uv_layers.active.data
        faces = []
        for p in me.polygons:
            m = so.material_slots[p.material_index].material
            img = next((nd.image.name for nd in m.node_tree.nodes if nd.type == "TEX_IMAGE" and nd.image), None) if m else None
            n = so.matrix_world.to_3x3() @ p.normal
            right = Vector((-n.y, n.x, 0)).normalized()                         # the viewer's right, facing the sign
            loops = list(p.loop_indices)
            pts_uv = [(so.matrix_world @ me.vertices[me.loops[li].vertex_index].co, uv[li].uv.copy()) for li in loops]
            u_min = min(pts_uv, key=lambda q: q[1].x)[0]
            u_max = max(pts_uv, key=lambda q: q[1].x)[0]
            v_min = min(pts_uv, key=lambda q: q[1].y)[0]
            v_max = max(pts_uv, key=lambda q: q[1].y)[0]
            faces.append({"material": m.name if m else None, "image": img, "facing": [round(n.x, 2), round(n.y, 2)],
                          "reads_left_to_right": (u_max - u_min).dot(right) > 0, "upright": v_max.z > v_min.z,
                          "alpha": ("from texture" if principled(m).inputs["Alpha"].is_linked
                                    else round(principled(m).inputs["Alpha"].default_value, 2)) if m else None})
        out["signs"] = {"faces": len(faces), "all_read_correctly": all(f["reads_left_to_right"] and f["upright"] for f in faces),
                        "all_textured": all(f["image"] for f in faces), "detail": faces}
    band = {}
    for o in meshes:
        idx = [i for i, s in enumerate(o.material_slots) if s.material and s.material.name.startswith("q09c_teal_band")]
        if not idx:
            continue
        zs = [(o.matrix_world @ o.data.vertices[v].co).z for p in o.data.polygons if p.material_index in idx for v in p.vertices]
        b = principled(o.material_slots[idx[0]].material)
        band[o.name] = {"z_range": [round(min(zs), 2), round(max(zs), 2)], "emission": round(b.inputs["Emission Strength"].default_value, 1)}
    if band:
        out["teal_band"] = band
    with open(os.path.join(HERE, "check%s.json" % MODEL[len("q09c-skywalk-market"):]), "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, indent=1)
    print("CHECK", json.dumps({k: v for k, v in out.items() if k not in ("triangles_by_object", "glass_and_pearl")}))


if __name__ == "__main__":
    main()
