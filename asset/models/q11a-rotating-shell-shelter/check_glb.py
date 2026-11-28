"""Reimport check of q11a-rotating-shell-shelter.glb in an empty scene (nothing is written into the model).

blender -b --factory-startup --python-exit-code 1 -P check_glb.py
Imports the GLB (standby state 90) into an empty scene and writes check.json:
- counts, bounds, nodes (12 bogies, 6 roof panels, the MOVING pivot), transparent materials;
- shell sweep: the moving parts turn about the vertical axis, so a full turn sweeps their (radius, height) profile. Moving
  and fixed vertices are binned in (r, z); reported are the smallest horizontal gap from the fixed building to anything
  moving (per 0.5 m height band), the gap from the moving parts out to the fixed guard fence, the vertical gap from the
  roof frame and panels down to the building, and the count of fixed vertices inside the swept moving profile (track
  parts the wheels, rollers, claws and lock pins act on are left out: they are checked below);
- wheels on rails: every load wheel's tread (48 expected) found by clustering, its lowest point against the rail head top
  and its centre against the rail radius;
- passages: along each passage axis every 0.5 m from the basement (r 35) to the plaza (r 123), the floor under a downward
  ray from 2 m above the expected floor, the largest step between samples, the floor at both ends, and the clear height
  over the floor (first opaque surface above);
- roof travel: the six panels slid through the whole travel (0 .. 65 m, 0.5 m steps): rollers kept within their rails,
  no two panels' bodies overlapping, panels clear of the building's top and the stowage bay's roof.
"""
import json
import math
import os
import sys
from collections import defaultdict

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import shelter as L  # noqa: E402

GLB = os.path.join(HERE, "q11a-rotating-shell-shelter.glb")
CONTACT = ("rail_steel", "grout", "steel_dark", "parking_lock", "drain_grating")   # what wheels, rollers, claws and lock pins act on


def base(name):
    return name.split(".")[0]


def alpha(m):
    b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m and m.node_tree else None
    if b is None:
        return 1.0
    a = b.inputs["Alpha"]
    return .5 if a.is_linked else a.default_value


def verts_by_mat(o):
    """World vertices of object o grouped by material name (without the q11a_ prefix)."""
    out = defaultdict(list)
    mw = o.matrix_world
    me = o.data
    for p in me.polygons:
        m = o.material_slots[p.material_index].material if o.material_slots else None
        key = (m.name if m else "?").replace("q11a_", "").split(".")[0]
        for i in p.vertices:
            out[key].append(i)
    return {k: [mw @ me.vertices[i].co for i in set(v)] for k, v in out.items()}


def sweep(moving, fixed):
    dz = .5
    mov = defaultdict(lambda: [1e9, -1e9])
    occ = set()
    for o in moving:
        for k, vs in verts_by_mat(o).items():
            for v in vs:
                r = math.hypot(v.x, v.y)
                b = int(math.floor(v.z / dz))
                mov[b][0] = min(mov[b][0], r)
                mov[b][1] = max(mov[b][1], r)
                occ.add((int(r / .25), int(math.floor(v.z / .25))))
    bld, out_min = defaultdict(lambda: -1e9), defaultdict(lambda: 1e9)
    intr = []
    for o in fixed:
        for k, vs in verts_by_mat(o).items():
            if k in CONTACT:
                continue
            for v in vs:
                r = math.hypot(v.x, v.y)
                b = int(math.floor(v.z / dz))
                if o.name.startswith("BUILDING"):
                    bld[b] = max(bld[b], r)
                elif r > L.RAILS[1]:
                    out_min[b] = min(out_min[b], r)
                if (int(r / .25), int(math.floor(v.z / .25))) in occ and b in mov and mov[b][0] - .05 < r < mov[b][1] + .05:
                    intr.append((base(o.name), k, round(r, 2), round(v.z, 2)))
    inner = min(((mov[b][0] - bld[b], b * dz) for b in mov if b in bld and mov[b][1] < 1e8), default=(None, None))
    outer = min(((out_min[b] - mov[b][1], b * dz) for b in mov if b in out_min), default=(None, None))
    return {"building_to_moving_min_gap_m": round(inner[0], 3), "at_z_m": inner[1],
            "moving_to_outer_fixed_min_gap_m": round(outer[0], 3), "outer_at_z_m": outer[1],
            "fixed_vertices_in_swept_profile": len(intr), "examples": intr[:6]}


def roof_gap(moving, fixed):
    lo = min(v.z for o in moving if base(o.name).startswith("ROOF") for vs in verts_by_mat(o).values() for v in vs
             if math.hypot(v.x, v.y) < L.R_IN)
    hi = max(v.z for o in fixed if base(o.name).startswith("BUILDING") for vs in verts_by_mat(o).values() for v in vs)
    trees = max((v.z for o in fixed if base(o.name).startswith("BUILDING") for k, vs in verts_by_mat(o).items()
                 if k.startswith("in_") for v in vs), default=None)
    return {"roof_lowest_over_building_m": round(lo, 3), "building_highest_m": round(hi, 3), "vertical_gap_m": round(lo - hi, 3),
            "highest_terrace_planting_m": round(trees, 3) if trees else None}


def wheels(bogies, rails_obj):
    head = max(v.z for v in verts_by_mat(rails_obj)["rail_steel"])
    out, n = [], 0
    for o in bogies:
        vs = verts_by_mat(o).get("wheel_steel", [])
        for rr in L.RAILS:
            near = [v for v in vs if abs(math.hypot(v.x, v.y) - rr) < .3]
            groups = defaultdict(list)                                         # front / back wheel: split by bearing
            ang = [math.atan2(v.y, v.x) for v in near]
            mid = math.atan2(sum(math.sin(a) for a in ang), sum(math.cos(a) for a in ang))
            for v, a in zip(near, ang):
                groups[math.remainder(a - mid, 2 * math.pi) > 0].append(v)
            for g in groups.values():
                c = sum(g, Vector()) / len(g)                                   # wheel centre (tread and flange are symmetric)
                t = Vector((-c.y, c.x, 0)).normalized()
                tread = [v for v in g if abs(math.hypot((v - c).dot(t), v.z - c.z) - L.WHEEL_R) < .02]   # not the flange
                n += 1
                low = min(v.z for v in tread)
                rc = sum(math.hypot(v.x, v.y) for v in tread) / len(tread)
                out.append((low - head, rc - rr))
    return {"rail_head_top_z": round(head, 4), "wheels_found": n,
            "tread_lowest_minus_rail_top_m": [round(min(d for d, _ in out), 4), round(max(d for d, _ in out), 4)],
            "tread_centre_minus_rail_radius_m": [round(min(e for _, e in out), 4), round(max(e for _, e in out), 4)]}


def passages(sc, dg):
    out = {}
    for p in L.PASSAGES:
        prof, clear = [], []
        r = 35.0
        while r <= 123.0:
            if r < L.RAMP_R[0]:
                ez = L.PASS_FLOOR
            else:
                ez = min(0.0, L.PASS_FLOOR * (1 - (r - L.RAMP_R[0]) / (L.RAMP_R[1] - L.RAMP_R[0])))
            o = Vector(L.pol(r, p, ez + 2.0))
            ok, loc, *_ = sc.ray_cast(dg, o, Vector((0, 0, -1)))
            fz = loc.z if ok else None
            prof.append((r, fz))
            if ok and r < L.RAMP_R[1]:
                q = loc + Vector((0, 0, .1))
                h = None
                for _ in range(20):
                    ok2, l2, _n, idx, ob, _m = sc.ray_cast(dg, q, Vector((0, 0, 1)))
                    if not ok2:
                        break
                    m = ob.material_slots[ob.data.polygons[idx].material_index].material
                    if alpha(m) >= .99:
                        h = l2.z - loc.z
                        break
                    q = l2 + Vector((0, 0, .01))
                clear.append((r, h))
            r += .5
        zs = [z for _, z in prof if z is not None]
        steps = [abs(b - a) for (_, a), (_, b) in zip(prof, prof[1:]) if a is not None and b is not None]
        cl = [h for _, h in clear if h is not None]
        out["%d" % p] = {"samples": len(prof), "misses": sum(1 for _, z in prof if z is None),
                         "floor_at_basement_z": round(prof[0][1], 3), "floor_at_plaza_end_z": round(prof[-1][1], 3),
                         "max_step_m": round(max(steps), 3), "floor_range": [round(min(zs), 3), round(max(zs), 3)],
                         "min_clear_height_m": round(min(cl), 3) if cl else None, "open_to_sky_samples": sum(1 for _, h in clear if h is None)}
    return out


def ground(sc, dg, step=.5, rmax=130.0):
    """Straight-down rays every 0.5 m over the whole site: each must stop on something above the deepest floor (-6.5 m);
    a miss is a hole in the ground (where a paving cut meets a ramp, a curb or a glass roof)."""
    n = miss = 0
    first = []
    k = int(rmax / step)
    for i in range(-k, k + 1):
        for j in range(-k, k + 1):
            x, y = i * step, j * step
            if math.hypot(x, y) > rmax:
                continue
            n += 1
            ok, loc, *_ = sc.ray_cast(dg, Vector((x, y, 120)), Vector((0, 0, -1)))
            if not ok or loc.z < -6.6:
                around = [sc.ray_cast(dg, Vector((x + dx, y + dy, 120)), Vector((0, 0, -1))) for dx, dy in ((.02, 0), (-.02, 0), (0, .02), (0, -.02))]
                if all(r[0] and r[1].z >= -6.6 for r in around):
                    continue                                                    # a ray grazing an edge two solids share
                miss += 1
                if len(first) < 8:
                    first.append([x, y])
    return {"down_rays": n, "holes": miss, "first_holes": first}


def roof_travel(panels, frame):
    rails = verts_by_mat(frame)["roof_rail"]
    R = next(o for o in bpy.data.objects if base(o.name) == "MOVING").matrix_world.inverted()
    loc_rails = [R @ v for v in rails]
    ry0, ry1 = min(v.y for v in loc_rails), max(v.y for v in loc_rails)
    stow = [R @ v for v in verts_by_mat(frame)["stowage_bay"]]
    stow_roof = min(v.z for v in stow if v.z > L.STOW_TOP - .1)
    body = {}
    for o in panels:
        k = int(base(o.name)[-1])
        vs = verts_by_mat(o)
        lv = {m: [R @ v for v in x] for m, x in vs.items()}
        cur = L.panel_offsets(L.STATES[L.DEFAULT_STATE])[k]
        rol = [v - Vector((0, cur, 0)) for v in lv["roller"]]
        bod = [v - Vector((0, cur, 0)) for m, x in lv.items() if m != "roller" for v in x]
        body[k] = (min(v.y for v in rol), max(v.y for v in rol),
                   min(v.y for v in bod), max(v.y for v in bod), min(v.z for v in bod), max(v.z for v in bod), min(v.x for v in bod), max(v.x for v in bod))
    worst_rail, overlaps, worst_top = 1e9, 0, 1e9
    s = 0.0
    while s <= L.TRAVEL + 1e-6:
        offs = L.panel_offsets(s)
        for k, (r0, r1, b0, b1, z0, z1, _x0, _x1) in body.items():
            worst_rail = min(worst_rail, (r0 + offs[k]) - ry0, ry1 - (r1 + offs[k]))
            worst_top = min(worst_top, stow_roof - z1)
        for i in body:
            for j in body:
                if i < j:
                    a, b = body[i], body[j]
                    ya = (a[2] + offs[i], a[3] + offs[i])
                    yb = (b[2] + offs[j], b[3] + offs[j])
                    if ya[0] < yb[1] and yb[0] < ya[1] and a[4] < b[5] and b[4] < a[5]:
                        overlaps += 1
        s += .5
    return {"rail_y_range_local": [round(ry0, 2), round(ry1, 2)], "roller_on_rail_min_margin_m": round(worst_rail, 3),
            "panel_pairs_overlapping_during_travel": overlaps, "panel_top_under_stowage_roof_min_m": round(worst_top, 3),
            "panel_z_ranges": {k: [round(v[4], 2), round(v[5], 2)] for k, v in sorted(body.items())},
            "standby_offsets_m": [round(v, 2) for v in L.panel_offsets(L.STATES[L.DEFAULT_STATE])]}


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    before = {m.name for m in bpy.data.materials}
    bpy.ops.import_scene.gltf(filepath=GLB)
    imported = [o for o in bpy.context.scene.objects if o.select_get()]
    meshes = [o for o in imported if o.type == "MESH"]
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    sc = bpy.context.scene
    names = [base(o.name) for o in imported]
    moving = [o for o in meshes if base(o.name).startswith(("SHELL", "BOGIE", "ROOF"))]
    fixed = [o for o in meshes if o not in moving]
    mats = sorted({s.material.name for o in meshes for s in o.material_slots if s.material})
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo, hi = Vector(map(min, lo, w)), Vector(map(max, hi, w))
    piv = next(o for o in imported if base(o.name) == "MOVING")
    report = {
        "glb": os.path.basename(GLB), "glb_bytes": os.path.getsize(GLB), "objects": len(imported), "meshes": len(meshes),
        "unique_meshes": len({o.data.name for o in meshes}),
        "triangles": sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes), "materials": len(mats),
        "new_materials_on_import": len({m.name for m in bpy.data.materials} - before),
        "bounds_min": [round(v, 2) for v in lo], "bounds_max": [round(v, 2) for v in hi],
        "moving_pivot_rotation_deg": round(-math.degrees(piv.rotation_euler.z if piv.rotation_mode != "QUATERNION" else piv.rotation_quaternion.to_euler().z), 2),
        "bogies": sum(1 for n in names if n.startswith("BOGIE_")), "roof_panels": sum(1 for n in names if n.startswith("ROOF_PANEL_")),
        "people_nodes": [n for n in names if "person" in n.lower() or "resident" in n.lower()],
        "transparent_materials": {m: {"alpha": round(alpha(bpy.data.materials[m]), 3), "method": bpy.data.materials[m].surface_render_method}
                                  for m in mats if alpha(bpy.data.materials[m]) < 1},
        "shell_sweep": sweep(moving, fixed),
        "roof_over_building": roof_gap(moving, fixed),
        "wheels_on_rails": wheels([o for o in moving if base(o.name).startswith("BOGIE")], next(o for o in fixed if base(o.name) == "TRACK_RAILS")),
        "passages": passages(sc, dg),
        "ground": ground(sc, dg),
        "roof_travel": roof_travel([o for o in moving if base(o.name).startswith("ROOF_PANEL")], next(o for o in moving if base(o.name) == "ROOF_FRAME")),
    }
    with open(os.path.join(HERE, "check.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("CHECK", json.dumps(report))


if __name__ == "__main__":
    main()
