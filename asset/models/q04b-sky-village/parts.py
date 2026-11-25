"""Structure parts of the Q04-B sky village: trunks and limbs, platforms, core, bridges, plaza, materials and mesh building.

Blender coordinates (z up), real metres. The z-up accumulators and lofts are reused from the Q04-A builder
(../q04a-suspended-pod-tower/parts.py, loaded as K) and the library modules (city-kit) through K.ctx / K.Three.
Platform-local frame: u narrow end -> wide end, v left of u, z 0 = finished garden level.
"""
import importlib.util
import math
import os
import random
import sys

import bmesh
import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)
sys.path.insert(0, HERE)
_spec = importlib.util.spec_from_file_location("q04a_parts", os.path.join(MODELS, "q04a-suspended-pod-tower", "parts.py"))
K = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(K)
G, M = K.G, K.M
Acc, Accs, box, obox, loft, lathe, ring, skin, sector, pipe, slab = K.Acc, K.Accs, K.box, K.obox, K.loft, K.lathe, K.ring, K.skin, K.sector, K.pipe, K.slab
srgb, cut_path = K.srgb, K.cut_path
import layout as LY  # noqa: E402

RIM, FLOOR = LY.RIM, .04                     # platform edge thickness; paving, bridge decks and house floors above the lawn


def offset(path, d):
    """K.offset, with the inside of a tight bend gathered to one point instead of folding back over itself."""
    o = K.offset(path, d)
    back = [(b[0] - a[0]) * (q[0] - p[0]) + (b[1] - a[1]) * (q[1] - p[1]) <= 0 for a, b, p, q in zip(o, o[1:], path, path[1:])]
    i = 0
    while i < len(back):
        if back[i]:
            j = i
            while j + 1 < len(back) and back[j + 1]:
                j += 1
            i0, i1 = max(i - 1, 0), min(j + 2, len(o) - 1)                         # one point either side of the fold joins in
            i0, i1 = (i0 if i0 > 0 else i), (i1 if i1 < len(o) - 1 else j + 1)
            c = (sum(q[0] for q in o[i0:i1 + 1]) / (i1 - i0 + 1), sum(q[1] for q in o[i0:i1 + 1]) / (i1 - i0 + 1))
            for k in range(i0, i1 + 1):
                o[k] = c
            i = i1
        i += 1
    return o


def ribbon(acc, path, d0, d1, z0, z1):
    """Bar following a plan polyline between offsets d0 < d1 and heights z0 < z1."""
    a, b = offset(path, d0), offset(path, d1)
    loft(acc, [[(*p, z0), (*q, z0), (*q, z1), (*p, z1)] for p, q in zip(a, b)])


def curve_frames(pts):
    """(point, side, up) along a path; the side stays horizontal, kept from before where the path is vertical."""
    out, side = [], None
    for i, p in enumerate(pts):
        t = K.tangent(pts, i)
        if math.hypot(t[0], t[1]) > .12 or side is None:
            side = K._n((t[1], -t[0], 0.0))
        out.append((p, side, K._x(side, t)))
    return out


def limb(acc, pts, rad, wide, n=22):
    """Tube with an elliptical section: radius rad[i], widened sideways by wide[i]."""
    secs = []
    for (p, s, u), r, w in zip(curve_frames(pts), rad, wide):
        secs.append([K._at(p, s, r * w * math.cos(2 * math.pi * k / n), u, r * math.sin(2 * math.pi * k / n)) for k in range(n)])
    loft(acc, secs)


def skeleton(plats, branches, voxel=.20):
    """Three rooted trunks and the twenty limbs, fused into one skin: union by voxel remesh, then smoothed so every fork
    turns into a web. The platforms' own bellies are lofted separately and swallow the limb ends."""
    a = Acc()
    tops = [max([b["z0"] for b in branches.values() if b["trunk"] == t]) for t in range(3)]
    for t in range(3):
        zs = [-.6 + (tops[t] + .9) * i / 40 for i in range(41)]
        pts = [(*LY.trunk_xy(t, max(z, 0)), z) for z in zs]
        rad = [LY.trunk_r(max(z, 0)) * (1.0 if z < tops[t] - 1 else .9) for z in zs]
        wide = [1 + .28 * math.exp(-max(z, 0) / 3) for z in zs]
        limb(a, pts, rad, wide, 26)
    for p in plats:
        b = branches[p["no"]]
        c = b["path"]
        m = len(c)
        rad = [LY.radii(p, i / (m - 1)) for i in range(m)]
        wide = [1 + .30 * max(0, 1 - i / (m * .45)) + .22 * max(0, (i / (m - 1) - .7) / .3) for i in range(m)]
        e, z0, t = c[-1], c[0][2], b["trunk"]
        low = [(*LY.trunk_xy(t, max(z0 - h, 0)), z0 - h) for h in (4.2, 3.4, 2.6, 1.8, 1.0)]   # the limb rises inside its trunk first,
        pts = low + [tuple(q) for q in c[2:]]                                                  # then swings out: a web, not a T-joint
        rad = [LY.trunk_r(max(z0 - 3, 0)) * .55 + (rad[0] - LY.trunk_r(max(z0 - 3, 0)) * .55) * i / 4 for i in range(5)] + rad[2:]
        wide = [1.0] * 5 + wide[2:]
        for _ in range(5):                                                                   # round the turn off
            pts = pts[:1] + [tuple((pts[i - 1][k] + 2 * pts[i][k] + pts[i + 1][k]) / 4 for k in range(3)) for i in range(1, 12)] + pts[12:]
        limb(a, pts + [(e[0], e[1], e[2] + .5)], rad + [rad[-1] * 1.15], wide + [wide[-1]], 22)
    me = bpy.data.meshes.new("_skeleton")
    me.from_pydata(a.v, [], a.f)
    ob = bpy.data.objects.new("_skeleton", me)
    bpy.context.scene.collection.objects.link(ob)
    md = ob.modifiers.new("r", "REMESH")
    md.mode, md.voxel_size, md.use_smooth_shade = "VOXEL", voxel, True
    sm = ob.modifiers.new("s", "SMOOTH")
    sm.factor, sm.iterations = .5, 26
    dc = ob.modifiers.new("d", "DECIMATE")
    dc.ratio = .22
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    m2 = bpy.data.meshes.new_from_object(ev)
    m2.name = "q04b_skeleton"
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
    m2.materials.clear()
    m2.materials.append(make_materials()["pearl"])
    for p in m2.polygons:
        p.use_smooth, p.material_index = True, 0
    return m2


def G_ell(a, c, rx, ry, rz, n=14, m=9):
    M.ell(a, c, (rx, 0, 0), (0, ry, 0), (0, 0, rz), n, m)


# --- platforms ---------------------------------------------------------------------------------------------------------------
NT = 120


def outline(p, inset=0.0, n=NT):
    return [LY.egg_local(p, 2 * math.pi * i / n, inset) for i in range(n)]


def arc_points(p, inset, step, t0=0.0, t1=2 * math.pi):
    """Points about `step` apart along the outline between parameters t0 and t1: (u, v, t)."""
    n = 400
    pts = [(*LY.egg_local(p, t0 + (t1 - t0) * i / n, inset), t0 + (t1 - t0) * i / n) for i in range(n + 1)]
    out, acc = [pts[0]], 0.0
    total = sum(math.dist(a[:2], b[:2]) for a, b in zip(pts, pts[1:]))
    k = max(1, round(total / step))
    for a, b in zip(pts, pts[1:]):
        acc += math.dist(a[:2], b[:2])
        if acc >= total / k * len(out) - 1e-6 and len(out) < k:
            out.append(b)
    return out + [pts[-1]]


def gate_t(p, half):
    """Outline parameter half-width round t = pi that spans `half` metres each side of the bridge."""
    return math.asin(min(half / (p["W"] / 2 * (1 - LY.EGG)), .9))


def platform(p, branch):
    """Tray: rim, soft belly running into the limb, lawn. Local coordinates."""
    a = Accs()
    (ux, uy), (vx, vy) = LY.axes(p)
    f = branch["path"][-1]
    dx, dy = f[0] - p["x"], f[1] - p["y"]
    fu, fv = dx * ux + dy * uy, dx * vx + dy * vy
    depth = p["z"] - f[2]
    r_end = LY.radii(p, 1.0) * 1.02
    wide = 1.22
    flush = gate_t(p, 1.0)                                                        # the kerb drops level with the path at the bridge

    def lip(inset, z):
        return [(u, v, min(z, FLOOR - .012) if abs(2 * math.pi * i / NT - math.pi) < flush else z) for i, (u, v) in enumerate(outline(p, inset))]
    secs = [[(u, v, -.03) for u, v in outline(p, .42)], lip(.36, .12), lip(.08, .12), lip(0, .05),
            [(u, v, -RIM + .10) for u, v in outline(p, 0)], [(u, v, -RIM) for u, v in outline(p, .12)]]
    base = outline(p, .12)
    cs = [(fu + r_end * wide * math.cos(2 * math.pi * i / NT), fv + r_end * wide * math.sin(2 * math.pi * i / NT)) for i in range(NT)]
    for j in range(1, 17):
        q = j / 16
        g = 1 - (1 - q) ** 1.35
        z = -RIM - (p["belly"] - RIM) * q ** 1.35 - (depth - p["belly"]) * q ** 6
        secs.append([(u + (cu - u) * g, v + (cv - v) * g, z) for (u, v), (cu, cv) in zip(base, cs)])
    loft(a["pearl"], secs)
    lawn = outline(p, .40)
    a["lawn"].facing([(u, v, 0.0) for u, v in lawn], [tuple(range(NT))], lambda c: (0, 0, 1))
    return a


def railing(p):
    """Slim posts, a handrail and clear glass along the edge, open at the bridge."""
    a = Accs()
    g = gate_t(p, .95)
    pts = arc_points(p, .22, 1.9, math.pi + g, 3 * math.pi - g)
    fine = arc_points(p, .22, .75, math.pi + g, 3 * math.pi - g)
    for u, v, _ in pts:
        box(a["rail"], u - .02, u + .02, v - .02, v + .02, .08, 1.08)
    path = [(u, v) for u, v, _ in fine]
    ribbon(a["rail"], path, -.025, .025, 1.06, 1.10)
    q = [(u, v) for u, v, _ in fine]
    for m, n in zip(q, q[1:]):
        a["glass_rail"].facing([(*m, .18), (*n, .18), (*n, 1.0), (*m, 1.0)], [(0, 1, 2, 3)], lambda c: (c[0], c[1], 0))
    return a


PLANTERS = ((30, 17), (150, 17), (62, 9), (118, 9), (351, 10), (189, 10))          # bearing, half width: clear of the roots


# --- core ---------------------------------------------------------------------------------------------------------------------
X0, X1, Y0, Y1 = LY.CORE
SH = (-1.6, 1.6, -3.6, -1.1)                                                     # lift shaft
TOP = 49.0
STAIR = (0.0, 1.95, 1.08)


def core():
    """Glass lift tower toward the main view, a lobby slab and spiral stair behind it on every level."""
    a = Accs()
    s = a["silver"]
    for x in SH[:2]:
        for y in SH[2:]:
            box(s, x - .09, x + .09, y - .09, y + .09, 3.2, TOP)
    for x in (-.55, .55):
        box(s, x - .03, x + .03, SH[2] - .03, SH[2] + .03, 3.2, TOP)
    for i in range(24):
        z = 3.2 + i * (TOP - 3.3) / 23
        for y in SH[2:]:
            box(s, SH[0], SH[1], y - .05, y + .05, z, z + .10)
        for x in SH[:2]:
            box(s, x - .05, x + .05, SH[2], SH[3], z, z + .10)
    for z in (TOP - .1,):
        box(s, SH[0] - .15, SH[1] + .15, SH[2] - .15, SH[3] + .15, z, z + .1)
    box(a["grey"], -.25, .25, SH[3] - .22, SH[3] - .10, 3.2, TOP - .2)             # guide rail / counterweight line
    for x in (X0 + .1, X1 - .1):                                                # lobby columns
        for y in (-.95, Y1 - .1):
            box(a["pearl"], x - .11, x + .11, y - .11, y + .11, 0, 44.2)
    box(a["pearl"], X0 - .3, X1 + .3, -1.1, Y1 + .3, 44.1, 44.3)                    # cover over the top landing
    for lv in LY.LEVELS:
        z = lv + FLOOR
        box(a["pearl"], X0, X1, -1.1, .80, z - .24, z)
        for q in (-1, 1):
            xa, xb = sorted((q * 1.22, q * X1))
            box(a["pearl"], xa, xb, .80, Y1, z - .24, z)
        for q in (-1, 1):                                                       # lobby edge rails, open at the four bridge mouths
            for ya, yb in ((-1.1, -1.02), (.72, 1.28), (3.02, Y1)):
                box(a["rail"], q * X1 - .03, q * X1 + .03, ya, yb, z, z + 1.1)
            box(a["glass_rail"], *sorted((q * 1.6, q * X1)), -1.08, -1.06, z, z + 1.1)
            box(a["rail"], *sorted((q * 1.22, q * X1)), Y1 - .05, Y1, z + 1.04, z + 1.09)
            box(a["glass_rail"], *sorted((q * 1.22, q * X1)), Y1 - .035, Y1 - .02, z + .05, z + 1.04)
        box(a["silver"], -.95, .95, -1.14, -1.02, z + 2.2, z + 2.36)                # lift door
        for x in (-.95, .87):
            box(a["silver"], x, x + .08, -1.14, -1.02, z, z + 2.2)
        for x in (-.86, .01):
            box(a["door_metal"], x, x + .85, -1.10, -1.06, z, z + 2.2)
        box(a["warm"], -2.2, 2.2, -.2, -.1, z + 2.9, z + 2.93)
        box(a["silver"], X0 + .1, X1 - .1, -.25, -.05, z + 2.93, z + 3.0)
    cx, cy, r = STAIR
    lathe(a["pearl"], [(.16, 0), (.16, 42.2)], 14, cx, cy)
    n = 41 * 11 // 2
    hand = []
    for i in range(n):
        z = 41.04 * (i + 1) / n
        t = -math.pi / 2 + 2 * math.pi * i / 22
        c, sn = math.cos(t), math.sin(t)
        obox(a["stair"], (cx + c * .62, cy + sn * .62, z - .03), (.92, .34, .05), t)
        hand.append((cx + c * r, cy + sn * r, z + .98))
    pipe(a["rail"], hand, .025, .025, 5)
    # base: glazed ground lobby with a white portal under the tower
    box(a["pearl"], X0 - .4, X1 + .4, Y0 - .3, Y1 + .4, -.05, .10)
    box(a["pearl"], X0 - .3, X1 + .3, Y0 - .2, Y1 + .3, 3.05, 3.35)
    for x in (X0 - .05, X1 + .05):
        a["glass_lift"].facing([(x, Y0, .1), (x, Y1, .1), (x, Y1, 3.05), (x, Y0, 3.05)], [(0, 1, 2, 3)], lambda c: (c[0], 0, 0))
        for y in (Y0, -1.1, 1.0, Y1):
            box(a["silver"], x - .06, x + .06, y - .06, y + .06, .1, 3.05)
    for x in (X0, -1.05, 1.05, X1):
        box(a["pearl"], x - .14, x + .14, Y0 - .1, Y0 + .14, .1, 3.05)
    for x0, x1 in ((X0 + .1, -1.1), (1.1, X1 - .1)):
        a["glass_lift"].facing([(x0, Y0, .1), (x1, Y0, .1), (x1, Y0, 3.05), (x0, Y0, 3.05)], [(0, 1, 2, 3)], lambda c: (0, -1, 0))
    box(a["pearl"], -1.9, 1.9, Y0 - 1.7, Y0, 2.75, 2.92)                            # entrance canopy
    box(a["warm"], -1.5, 1.5, Y0 - 1.4, Y0 - .3, 2.73, 2.75)
    box(a["warm"], -2.1, 2.1, -.6, .4, 2.98, 3.02)
    box(a["wood"], X0 + .1, X1 - .1, Y0 + .1, Y1 - .1, .10, .115)
    for x in (-.86, .01):
        box(a["door_metal"], x, x + .85, -1.10, -1.06, .12, 2.4)
    return a


def core_glass():
    a = Accs()
    z0, z1 = 3.35, TOP - .1
    for y, d in ((SH[2], -1), (SH[3], 1)):
        a["glass_lift"].facing([(SH[0], y, z0), (SH[1], y, z0), (SH[1], y, z1), (SH[0], y, z1)], [(0, 1, 2, 3)], lambda c: (0, d, 0))
    for x, d in ((SH[0], -1), (SH[1], 1)):
        a["glass_lift"].facing([(x, SH[2], z0), (x, SH[3], z0), (x, SH[3], z1), (x, SH[2], z1)], [(0, 1, 2, 3)], lambda c: (d, 0, 0))
    return a


def cabin(z):
    """One lift cabin: white floor and roof bands, lit ceiling, back panel."""
    a = Accs()
    x0, x1, y0, y1 = SH[0] + .22, SH[1] - .22, SH[2] + .2, SH[3] - .28
    box(a["pearl"], x0, x1, y0, y1, z - .18, z)
    box(a["pearl"], x0, x1, y0, y1, z + 2.45, z + 2.75)
    box(a["warm"], x0 + .1, x1 - .1, y0 + .1, y1 - .1, z + 2.43, z + 2.45)
    box(a["wood"], x0 + .05, x1 - .05, y1 - .06, y1 - .02, z, z + 2.43)
    for x in (x0, x1 - .06):
        for y in (y0, y1 - .06):
            box(a["silver"], x, x + .06, y, y + .06, z, z + 2.45)
    box(a["silver"], x0, x1, y0, y0 + .04, z + .95, z + 1.0)
    return a


# --- bridges --------------------------------------------------------------------------------------------------------------------
def bridge(path, deck, limb_pts=None):
    a = Accs()
    raw, path = [tuple(q) for q in path], []
    for q in raw[:-1]:                                                          # no slivers for the offsets to trip over
        if (not path or math.dist(q, path[-1]) > .22) and math.dist(q, raw[-1]) > .22:
            path.append(q)
    t = K._n((raw[-1][0] - raw[-2][0], raw[-1][1] - raw[-2][1], 0))
    path += [raw[-1], (raw[-1][0] + t[0] * .32, raw[-1][1] + t[1] * .32)]          # the deck laps over the curved rim
    z = deck + FLOOR
    ribbon(a["deck"], path, -LY.DECK_HW, LY.DECK_HW, z - .10, z)
    ribbon(a["pearl"], path, -LY.DECK_HW - .04, LY.DECK_HW + .04, z - .24, z - .09)
    # tapered spine, deepest at the core
    pts = offset(path, 0)
    secs, ln = [], [0.0]
    for q, r in zip(path, path[1:]):
        ln.append(ln[-1] + math.dist(q, r))
    for i, q in enumerate(path):
        f = ln[i] / ln[-1]
        d = .62 - .34 * f
        l, r = offset(path, .34)[i], offset(path, -.34)[i]
        l2, r2 = offset(path, .16)[i], offset(path, -.16)[i]
        secs.append([(*l, z - .23), (*r, z - .23), (*r2, z - .23 - d), (*l2, z - .23 - d)])
    loft(a["pearl"], secs)
    inner = cut_path(path, .12, .46)
    for s in (-1, 1):
        d0, d1 = sorted((s * (LY.DECK_HW - .08), s * (LY.DECK_HW - .035)))
        ribbon(a["rail"], inner, d0, d1, z + 1.04, z + 1.09)
        ribbon(a["pearl"], inner, s * LY.DECK_HW - .05, s * LY.DECK_HW + .03, z - .02, z + .08)
        line = offset(inner, s * (LY.DECK_HW - .057))
        for q, r in zip(line, line[1:]):
            a["glass_rail"].facing([(*q, z + .14), (*r, z + .14), (*r, z + 1.0), (*q, z + 1.0)], [(0, 1, 2, 3)], lambda c, q=q, r=r, s=s: (-s * (r[1] - q[1]), s * (r[0] - q[0]), 0))
        run = 0.0
        for q, r in zip(line, line[1:]):
            run += math.dist(q, r)
            if run > 1.7:
                run = 0.0
                obox(a["rail"], (*r, z + .52), (.035, .035, 1.04), math.atan2(r[1] - q[1], r[0] - q[0]))
    if limb_pts is not None:                                                     # props standing on the limb below
        for frac in (.45, .72):
            i = min(range(len(path)), key=lambda k: abs(ln[k] / ln[-1] - frac))
            q = path[i]
            best = min(limb_pts, key=lambda w: math.hypot(w[0] - q[0], w[1] - q[1]) + .25 * abs(w[2] - z + 2))
            if math.hypot(best[0] - q[0], best[1] - q[1]) < 3.2 and .8 < z - best[2] < 7:
                pipe(a["pearl"], [(best[0], best[1], best[2]), ((best[0] + q[0]) / 2, (best[1] + q[1]) / 2, (best[2] + z) / 2 - .2), (q[0], q[1], z - .4)], .20, .13, 10)
    return a


# --- materials ------------------------------------------------------------------------------------------------------------------
MATS = {}


def mat(name, rgba, rough=.6, metal=0.0, emit=None, strength=1.0, culling=True):
    m = G.material("q04b_" + name, rgba, rough, emit, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


def lit(name, h, rough, s):
    return mat(name, srgb(h), rough, emit=srgb(h), strength=s)


def make_materials():
    if MATS:
        return MATS
    warm = srgb("FFD79A")
    MATS.update({
        "pearl": mat("pearl_metal", srgb("EDEDEA"), .40, .12), "silver": mat("silver_frame", srgb("AEB6BA"), .34, .55),
        "grey": mat("guide_grey", srgb("7C858A"), .5, .3), "rail": mat("rail", srgb("D7DBDC"), .35, .3),
        "door_metal": mat("lift_door", srgb("C6CCCE"), .38, .45), "deck": mat("bridge_deck", srgb("D9D5CC"), .7),
        "stair": mat("stair_tread", srgb("CFC8BB"), .65),
        "wall": mat("house_wall", srgb("F5F0E5"), .62), "wall2": mat("house_wall_grey", srgb("E2DED5"), .6),
        "roof": mat("house_roof", srgb("C9CDCE"), .42, .25), "roof2": mat("house_roof_warm", srgb("B9B2A6"), .5, .1),
        "soffit": mat("soffit_wood", srgb("C49A66"), .55), "frame": mat("window_frame", srgb("8C9296"), .4, .4),
        "door": mat("entrance_door", srgb("9B7650"), .5), "wood": mat("terrace_wood", srgb("B99468"), .65),
        "in_wall": lit("room_wall", "F3E3C6", .75, .62), "in_floor": lit("room_floor", "CDAA7C", .55, .42), "in_dark": lit("room_wood", "9A764E", .6, .22),
        "in_cloth": lit("room_fabric", "8FA3A8", .9, .25), "in_linen": lit("room_linen", "F1EBE0", .9, .32),
        "warm": mat("warm_light", srgb("FFE3B3"), .5, emit=warm, strength=3.0),
        "glass_house": mat("house_glass", srgb("CFE3E8", .14), .03, culling=False), "glass_lift": mat("lift_glass", srgb("BFE0EA", .16), .03, culling=False),
        "glass_rail": mat("rail_glass", srgb("D8ECF0", .12), .05, culling=False),
        "lawn": mat("lawn", srgb("9ABD5C"), .95), "soil": mat("soil", srgb("6B5138"), .95), "paving": mat("paving", srgb("D9D3C8"), .85),
        "paving_b": mat("paving_band", srgb("C2BBAF"), .85), "curb": mat("curb", srgb("EDEBE5"), .6),
        "leaf_a": mat("leaf_light", srgb("B4CF5C"), .85, culling=False), "leaf_b": mat("leaf_mid", srgb("8DB550"), .85, culling=False),
        "leaf_c": mat("leaf_deep", srgb("648F42"), .85, culling=False), "bark": mat("bark", srgb("7A5E45"), .9),
        "flower_p": mat("flower_pink", srgb("E3A3B8"), .85), "flower_y": mat("flower_yellow", srgb("EFCB5E"), .85), "flower_w": mat("flower_white", srgb("F2EEE6"), .85),
        "white_model": mat("white_model", srgb("E9E8E5"), .8), "label": mat("label", srgb("C0392B"), .9),
    })
    for role, (rgba, emit, strength) in M.ROLES.items():
        MATS["in_" + role] = mat("kit_" + role, rgba, .6, emit=emit, strength=strength, culling=role not in ("leaf_l", "green") and rgba[3] >= 1)
    return MATS


def mirrored(accs):
    out = Accs()
    for k, a in accs.items():
        out[k].v = [(-x, y, z) for x, y, z in a.v]
        out[k].f = [tuple(reversed(f)) for f in a.f]
    return out


def build_mesh(name, accs, smooth_deg=32, white=False):
    make_materials()
    vs, fs, mi, mats = [], [], [], []
    for role, acc in accs.items():
        if not acc.f:
            continue
        base = len(vs)
        vs += acc.v
        mats.append(role)
        fs += [tuple(base + i for i in f) for f in acc.f]
        mi += [len(mats) - 1] * len(acc.f)
    me = bpy.data.meshes.new(name)
    me.from_pydata(vs, [], fs)
    me.update()
    for role in mats:
        me.materials.append(MATS[role] if not white or role.startswith("glass") else MATS["white_model"])
    me.polygons.foreach_set("material_index", mi)
    bm = bmesh.new()
    bm.from_mesh(me)
    thr = math.radians(smooth_deg)
    soft = {i for i, r in enumerate(mats) if r.startswith(("leaf_", "flower_"))}
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        if len(e.link_faces) == 2:
            e.smooth = e.link_faces[0].material_index in soft or e.calc_face_angle(0) <= thr
    bm.to_mesh(me)
    bm.free()
    me.update()
    return me


def tris(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)
