"""Reimports the exported GLB into an empty scene and measures it against the design document (Q04-C v1.0).

blender -b --factory-startup --python-exit-code 1 -P check_glb.py      -> check.json, exit 1 on a failed check
Walking widths are measured on the real geometry of all five floors: every triangle between 0.25 and 1.90 m above the floor is drawn into a 5 cm grid,
and a path's clear width is the widest disc that still gets through.
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import layout as LY  # noqa: E402

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, "q04c-shared-floor-residence.glb"))
bpy.context.view_layer.update()
OB = {o.name: o for o in bpy.data.objects}
res, fails = {}, []


def check(name, ok, value):
    res[name] = {"ok": bool(ok), "value": value}
    if not ok:
        fails.append(name)


def count(prefix):
    return sum(n.startswith(prefix) for n in OB)


def world(o):
    n = len(o.data.vertices)
    co = np.empty(n * 3, np.float32)
    o.data.vertices.foreach_get("co", co)
    m = np.array(o.matrix_world)
    return co.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3]


def tri_array(o):
    o.data.calc_loop_triangles()
    t = np.empty(len(o.data.loop_triangles) * 3, np.int32)
    o.data.loop_triangles.foreach_get("vertices", t)
    return world(o)[t.reshape(-1, 3)]


MESH = [o for o in OB.values() if o.type == "MESH"]
# --- counts and bounds -------------------------------------------------------------------------------------------------------
for kind, want in (("BED_", 32), ("CURTAIN_", 32), ("CHAIR_", 32), ("TABLE_", 2)):
    got = [count("L%d_%s" % (n, kind)) for n in range(1, 6)]
    check("per_floor_" + kind.strip("_").lower(), got == [want] * 5, got)
check("total_seats_and_beds", sum(count("L%d_CHAIR_" % n) for n in range(1, 6)) == 160 == sum(count("L%d_BED_" % n) for n in range(1, 6)), 160)
check("discs", count("DISC_") == 5, count("DISC_"))
tops, rad = [], []
for i, z in enumerate(LY.LEVELS):
    v = world(OB["DISC_%d" % (i + 1)])
    v = v[np.hypot(v[:, 0], v[:, 1]) > 23.6]
    tops.append(round(float(OB["DISC_%d" % (i + 1)].matrix_world.translation.z), 3))
    rad.append(round(float(np.hypot(v[:, 0], v[:, 1]).max()), 3))
check("disc_levels", tops == list(LY.LEVELS), tops)
check("disc_radius", all(abs(r - 24) < .01 for r in rad), rad)
v = world(OB["ROOF_FRAME"])
check("roof_radius", abs(float(np.hypot(v[:, 0], v[:, 1]).max()) - 27) < .02, round(float(np.hypot(v[:, 0], v[:, 1]).max()), 3))
eave = v[np.hypot(v[:, 0], v[:, 1]) > 26.8]
check("eave_height", 31.8 < float(eave[:, 2].mean()) < 32.4, [round(float(eave[:, 2].min()), 2), round(float(eave[:, 2].max()), 2)])
v = world(OB["STAIR_0"])
check("stair_front_right", float(v[:, 0].min()) > 0 and float(v[:, 1].max()) < 0, [round(float(v[:, 0].min()), 2), round(float(v[:, 1].max()), 2)])
st = np.vstack([world(OB["STAIR_%d" % i]) for i in range(5)])
check("stair_bottom_top", abs(float(st[:, 2].min())) < .2 and float(st[:, 2].max()) > 26.9, [round(float(st[:, 2].min()), 2), round(float(st[:, 2].max()), 2)])
res["stair_radius_range"] = [round(LY.RI - LY.HALF, 2), round(LY.RO + LY.HALF, 2)]
res["risers"] = [2 * s[2] for s in LY.storeys()]
res["tread_going_inner_outer"] = [round(LY.RI * math.radians(LY.DA), 3), round(LY.RO * math.radians(LY.DA), 3)]
ds = [m.name for m in bpy.data.materials if m.name.startswith(("q04c_curtain",)) and "track" not in m.name]
check("curtain_double_sided", ds and all(not bpy.data.materials[n].use_backface_culling for n in ds), ds)
check("roof_panes_transparent", any(next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Alpha"].default_value < .9
                                    for m in OB["ROOF_PANES"].data.materials), [m.name for m in OB["ROOF_PANES"].data.materials])

# --- walking lines on every floor -------------------------------------------------------------------------------------------------
S, HALF = .05, 30.0
NG = int(2 * HALF / S)
gx = (np.arange(NG) + .5) * S - HALF
X, Y = np.meshgrid(gx, gx, indexing="ij")
Rg, Bg = np.hypot(X, Y), np.degrees(np.arctan2(Y, X)) % 360
land = (Rg < LY.RO + 1.0) & (Bg > LY.A0 - LY.turn_deg(LY.L_FLOOR)) & (Bg < LY.A0)
edge = ~((Rg < LY.R_SLAB) | land)                                                # past the edge there is no floor


def rasterise(occ, Z0, o, lo=.25, hi=1.90):
    t = tri_array(o)
    t = t[(t[:, :, 2].min(1) < Z0 + hi) & (t[:, :, 2].max(1) > Z0 + lo)]
    for tr in t:
        e = max(np.linalg.norm(tr[1] - tr[0]), np.linalg.norm(tr[2] - tr[0]), np.linalg.norm(tr[2] - tr[1]))
        n = max(2, int(e / (S * .7)) + 1)
        u, w = np.meshgrid(np.linspace(0, 1, n), np.linspace(0, 1, n))
        k = u + w <= 1.0001
        u, w = u[k][:, None], w[k][:, None]
        p = tr[0] + (tr[1] - tr[0]) * u + (tr[2] - tr[0]) * w
        p = p[(p[:, 2] > Z0 + lo) & (p[:, 2] < Z0 + hi)]
        ij = ((p[:, :2] + HALF) / S).astype(int)
        ij = ij[(ij >= 0).all(1) & (ij < NG).all(1)]
        occ[ij[:, 0], ij[:, 1]] = True


def in_level(o, n):
    p = o
    while p:
        if p.name == "LEVEL_%d" % n:
            return True
        p = p.parent
    return False


blocked0 = edge
_lv = {}


def blocked(r):
    n = int(round(r / S))
    if n not in _lv:
        b = blocked0.copy()
        for dx in range(-n, n + 1):
            w = int(math.sqrt(n * n - dx * dx))
            src = blocked0
            col = np.zeros_like(b)
            sl = slice(max(0, dx), NG + min(0, dx)), slice(max(0, -dx), NG + min(0, -dx))
            col[sl[0]] = src[sl[1]]
            c = np.cumsum(np.pad(col.astype(np.int32), ((0, 0), (w + 1, w))), axis=1)
            b |= (c[:, 2 * w + 1:] - c[:, :-(2 * w + 1)])[:, :NG] > 0
        _lv[n] = label(~b)
    return _lv[n]


def label(free):
    """Connected regions by flood fill from each target (run-length union)."""
    lab = np.zeros((NG, NG), np.int32)
    parent = [0]

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    prev = []
    for i in range(NG):
        row = free[i]
        d = np.diff(np.concatenate(([0], row.view(np.int8), [0])))
        runs = list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))
        cur, j = [], 0
        for a, b in runs:
            ids = [find(k) for (c, e, k) in prev if c < b and e > a]
            if ids:
                k = min(ids)
                for q in ids:
                    parent[q] = k
            else:
                k = len(parent)
                parent.append(k)
            cur.append((a, b, k))
            lab[i, a:b] = k
        prev = cur
    root = np.array([find(i) for i in range(len(parent))])
    return root[lab]


def near(lab, p, reach):
    i, j = int((p[0] + HALF) / S), int((p[1] + HALF) / S)
    n = int(reach / S)
    w = lab[max(i - n, 0):i + n + 1, max(j - n, 0):j + n + 1]
    return {int(k) for k in np.unique(w) if k}


def width(a, b, reach=.45):
    """Clear width (m) of the best path between two points."""
    best = 0.0
    for k in range(6, 34):
        r = k * .05
        lab = blocked(r)
        if near(lab, a, reach) & near(lab, b, reach):
            best = 2 * r
        else:
            break
    return round(best, 2)


def pol(r, d):
    return r * math.cos(math.radians(d)), r * math.sin(math.radians(d))


lift = (-9.3, 0.0)
stairp = pol(25.0, LY.A0 - LY.turn_deg(1.05))
gate_in = pol(22.6, LY.A0 - LY.turn_deg(1.05))
paths = {
    "lift_to_ring": (lift, pol(6.0, 180), .6), "ring_half_turn": (pol(6.0, 180), pol(6.0, 0), .6), "stair_landing_to_tables": (stairp, (0, -10), .25),
    "lift_to_stair": (lift, stairp, .25), "stair_gate": (stairp, gate_in, .25), "between_tables": ((0, -5.9), (0, -14.5), .6), "behind_table_A_west": ((-7.6, -6.0), (-7.6, -14.0), .6),
    "behind_table_B_east": ((7.6, -6.0), (7.6, -14.0), .6), "centre_aisle": (pol(8.5, 90), pol(15.5, 90), .5), "middle_aisle_whole": (pol(15.5, 19), pol(15.5, 161), .5),
    "aisle_east_end_to_ring": (pol(15.5, 19), (8.3, 2.6), .5), "aisle_west_end_to_ring": (pol(15.5, 161), (-8.3, 2.6), .5),
    "outer_walk_at_column_60": (pol(22.6, 44), pol(22.6, 76), .5), "wash_right_door": ((11.0, 3.0), (11.0, 1.2), .3), "wash_left_door": ((-13.5, 3.0), (-13.4, 1.4), .3),
    "lift_to_wash_right": (lift, (11.0, 3.0), .4),
}
need = {"wash_right_door": .8, "wash_left_door": .8, "outer_walk_at_column_60": 1.0}
res["clear_width_m"], gaps, states = {}, {}, {}
for n in range(1, 6):
    Z0 = LY.LEVELS[n - 1]
    occ = np.zeros((NG, NG), bool)
    for o in MESH:
        if (in_level(o, n) and not o.name.startswith(("DISC_", "L%d_CEILING" % n, "L%d_PENDANT" % n))) or o.name in ("STAIR_%d" % (n - 1), "STAIR_%d" % n):
            rasterise(occ, Z0, o)
    blocked0 = occ | edge
    _lv.clear()
    pre = "L%d_" % n
    w = {k: width(*v) for k, v in paths.items()}
    res["clear_width_m"]["L%d" % n] = w
    for k, v in w.items():
        check(pre + "width_" + k, v >= need.get(k, 1.2) - 1e-6, v)
    lab = blocked(.45)                                                           # a 0.9 m passage to every entrance and seat
    home = near(lab, lift, .3)
    miss = []
    for code, row, a, x, y, yaw, stt in LY.beds(n):
        e = (x - math.sin(yaw) * (LY.CELL_Y[1] + .65), y + math.cos(yaw) * (LY.CELL_Y[1] + .65))
        if not near(lab, e, .15) & home:
            miss.append(code)
    check(pre + "every_bed_entrance_reached", not miss, miss)
    miss = []
    for code, x, y, yaw in LY.chairs():
        p = (x + math.sin(yaw) * .95, y - math.cos(yaw) * .95)
        if not near(lab, p, .15) & home:
            miss.append(code)
    check(pre + "every_seat_reached", not miss, miss)
    bad = [c for c, row, a, x, y, yaw, s in LY.beds(n) if (math.hypot(x - math.sin(yaw), y + math.cos(yaw)) - LY.ROWS[row]) * (1 if row == "inner" else -1) < .9]
    check(pre + "entrances_face_middle_aisle", not bad, bad)
    gap = 9.0
    for name, o in OB.items():
        if name.startswith(tuple(pre + k for k in ("BED_", "CURTAIN_", "CHAIR_", "SOFA", "TREE_SEAT"))):
            p = world(o)[:, :2]
            for d in LY.COLS:
                c = np.array(pol(LY.R_COL, d))
                gap = min(gap, float(np.hypot(*(p - c).T).min()) - LY.COL_R)
    check(pre + "column_to_furniture_gap", gap > .5, round(gap, 2))
    off = []
    for code, *_ in LY.beds(n):
        if (OB[pre + "BED_" + code].matrix_world.translation - OB[pre + "CURTAIN_" + code].matrix_world.translation).length > .001:
            off.append(code)
    check(pre + "curtain_on_its_bed", not off, off)
    states[n] = "".join(b[6][0] for b in LY.beds(n))
    sig = tuple(sorted(tuple(round(v, 2) for v in OB[k].matrix_world.translation[:2]) for k in OB if k.startswith(pre + "POT_TREE_")))
    gaps[n] = sig
check("curtain_patterns_differ", len(set(states.values())) == 5, states)
check("planting_differs", len(set(gaps.values())) == 5, len(set(gaps.values())))
# L5: each hanger rod, pendant and light arm meets something above it
top = [tri_array(o) for o in MESH if o.name in ("ROOF_FRAME", "L5_CEILING", "RISER_5")]
vs = np.vstack([t.reshape(-1, 3) for t in top])
bt = BVHTree.FromPolygons(vs.tolist(), [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(len(vs) // 3)])
loose = []
for name, o in OB.items():
    if name.startswith(("L5_CURTAIN_", "L5_PENDANT_", "L5_ISLAND")):
        v = world(o)
        for p in v[v[:, 2] > v[:, 2].max() - .002]:
            near_p = bt.find_nearest(Vector(p))
            if near_p[3] > .06:
                loose.append([name, round(near_p[3], 2)])
                break
check("l5_hangers_supported", not loose, loose[:6])
rods = world(OB["L5_CEILING"])
rods = rods[rods[:, 2] > LY.LEVELS[-1] + 5.0]
roof_t = tri_array(OB["ROOF_FRAME"]).reshape(-1, 3)
rb = BVHTree.FromPolygons(roof_t.tolist(), [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(len(roof_t) // 3)])
far = [round(rb.find_nearest(Vector(p))[3], 2) for p in rods if rb.find_nearest(Vector(p))[3] > .08]
check("l5_rods_reach_roof_beams", len(rods) > 0 and not far, [len(rods), far[:5]])

# --- stair headroom, lift opening ----------------------------------------------------------------------------------------------
vs, fs = [], []
for o in MESH:
    if o.name.startswith(("STAIR_", "DISC_", "COLUMN_", "ROOF_FRAME", "RAILING_")):
        t = tri_array(o)
        b = len(vs)
        vs += t.reshape(-1, 3).tolist()
        fs += [(b + 3 * i, b + 3 * i + 1, b + 3 * i + 2) for i in range(len(t))]
bvh = BVHTree.FromPolygons(vs, fs)
low, clash = 99.0, []
for i, (z0, z1, n, A1) in enumerate(LY.storeys()):
    for A, sgn, rc, zb in ((LY.A0, 1, LY.RI, z0), (A1, -1, LY.RO, (z0 + z1) / 2)):
        for j in range(n - 1):
            for dr in (-.75, 0, .75):
                x, y = pol(rc + dr, A + sgn * (j + .5) * LY.DA)
                hit = bvh.ray_cast(Vector((x, y, zb + (j + 1) * LY.RISE + .06)), Vector((0, 0, 1)), 30)
                if hit[0] is not None:
                    low = min(low, hit[3] + .06)
                    if hit[3] + .06 < 2.1:
                        clash.append([i, j, dr, round(hit[3] + .06, 2)])
check("stair_headroom_min", low >= 2.1, round(low, 2))
res["stair_headroom_clashes"] = clash[:8]
x, y = pol(22.9, 299.8)
under = []
for z in LY.LEVELS[:4]:
    hit = bvh.ray_cast(Vector((x, y, z + .2)), Vector((0, 0, 1)), 10)
    under.append(round(hit[3] + .2, 2))
check("headroom_under_stair_arm", min(under) >= 2.1, under)
door = {}
for n, z in enumerate((0.0,) + LY.LEVELS):                                        # distance from 1 m in front of the wall: past it = a real opening
    ts = [tri_array(OB[k]) for k in ("SHAFT_%d" % n, "LIFT_CAR_1" if n == 0 else "LIFT_CAR_2") if k in OB]
    t = np.vstack(ts).reshape(-1, 3)
    b = BVHTree.FromPolygons(t.tolist(), [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(len(t) // 3)])
    door[n] = [round(b.ray_cast(Vector((-9.2, y + .1, z + 1.2)), Vector((-1, 0, 0)), 10)[3] or 99, 2) for y in LY.LIFT_Y]
check("lift_openings_cut_on_every_floor", all(v > 1.1 for d in door.values() for v in d), door)
check("lift_door_open_where_a_car_stands", door[0][0] > 2.5 and door[2][1] > 2.5, [door[0][0], door[2][1]])

res["tris_drawn"] = int(sum(len(tri_array(o)) for o in MESH))
res["glb_bytes"] = os.path.getsize(os.path.join(HERE, "q04c-shared-floor-residence.glb"))
res["failed"] = fails
with open(os.path.join(HERE, "check.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(res, f, indent=1)
print("CHECK", json.dumps({k: (v["value"] if isinstance(v, dict) and "ok" in v else v) for k, v in res.items()}))
print("FAILED" if fails else "ALL PASS", fails)
sys.exit(1 if fails else 0)
