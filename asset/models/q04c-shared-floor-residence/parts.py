"""Structure, roof, stair and materials of the Q04-C shared-floor residence, and mesh building.

Blender coordinates (z up), real metres. The z-up accumulators and lofts are reused from the Q04-A builder
(../q04a-suspended-pod-tower/parts.py, loaded as K), planting from city-kit modules.
Level-local frame: z 0 = finished floor of that level.
"""
import importlib.util
import math
import os
import random
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)
sys.path.insert(0, HERE)
_spec = importlib.util.spec_from_file_location("q04a_parts", os.path.join(MODELS, "q04a-suspended-pod-tower", "parts.py"))
K = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(K)
G, M = K.G, K.M
Acc, Accs, box, obox, loft, lathe, ring, sector, pipe, slab, beam = K.Acc, K.Accs, K.box, K.obox, K.loft, K.lathe, K.ring, K.sector, K.pipe, K.slab, K.beam
srgb = K.srgb
import layout as LY  # noqa: E402


def pol(r, deg, z=None):
    a = math.radians(deg)
    return (r * math.cos(a), r * math.sin(a)) if z is None else (r * math.cos(a), r * math.sin(a), z)


def strip(acc, pts, t, dz0, dz1, floor=-99.0):
    """Upright plate of thickness t following 3D points, from z + dz0 (never below floor) to z + dz1."""
    secs = []
    for i, p in enumerate(pts):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
        n = K._n((b[1] - a[1], a[0] - b[0], 0.0))
        l, r = (p[0] + n[0] * t / 2, p[1] + n[1] * t / 2), (p[0] - n[0] * t / 2, p[1] - n[1] * t / 2)
        lo = max(p[2] + dz0, floor)
        secs.append([(*l, lo), (*r, lo), (*r, p[2] + dz1), (*l, p[2] + dz1)])
    loft(acc, secs)


def prism(acc, poly, z0, z1):
    loft(acc, [[(x, y, z) for x, y in poly] for z in (z0, z1)])


def holed(acc, outer, holes, z, up):
    """Flat polygon with holes."""
    rings = [outer] + holes
    flat = [p for r in rings for p in r]
    tri = tessellate_polygon([[Vector((x, y, 0)) for x, y in r] for r in rings])
    acc.facing([(x, y, z) for x, y in flat], [tuple(t) for t in tri], lambda c: (0, 0, 1 if up else -1))


# --- storeys -------------------------------------------------------------------------------------------------------------------
N = 144


def disc(floor_role):
    """One floor disc with the lift opening: white edge, warm grey soffit, finish on top. z 0 = finished floor."""
    a = Accs()
    x0, x1, y0, y1 = LY.SHAFT
    hole = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    R, T = LY.R_SLAB, LY.T_SLAB

    def circ(r):
        return [pol(r, 360 * i / N) for i in range(N)]
    prof = [(R - .34, .0), (R - .30, .09), (R - .06, .09), (R, .03), (R, -T + .20), (R - .10, -T + .06), (R - .34, -T)]
    rows = [K.circle(r, z, N) for r, z in prof]
    verts = [p for r in rows for p in r]
    cr, cz = R - .25, -T / 2
    a["edge"].facing(verts, [(i * N + k, i * N + (k + 1) % N, (i + 1) * N + (k + 1) % N, (i + 1) * N + k) for i in range(len(rows) - 1) for k in range(N)],
                     lambda c: ((math.hypot(c[0], c[1]) - cr) * c[0], (math.hypot(c[0], c[1]) - cr) * c[1], (c[2] - cz) * math.hypot(c[0], c[1]) * .5))
    holed(a[floor_role], circ(R - .34), [hole], 0.0, True)
    holed(a["soffit"], circ(R - .34), [hole], -T, False)
    for (xa, ya), (xb, yb) in zip(hole, hole[1:] + hole[:1]):
        a["edge"].facing([(xa, ya, -T), (xb, yb, -T), (xb, yb, 0), (xa, ya, 0)], [(0, 1, 2, 3)], lambda c: ((x0 + x1) / 2 - c[0], (y0 + y1) / 2 - c[1], 0))
    for d in LY.COLS:                                                             # column joints: a collar above and a shadow ring below
        x, y = pol(LY.R_COL, d)
        lathe(a["edge"], [(LY.COL_R + .22, -.01), (LY.COL_R + .22, .05), (LY.COL_R + .10, .10), (LY.COL_R - .1, .10)], 32, x, y)
        lathe(a["grey"], [(LY.COL_R + .04, -T - .06), (LY.COL_R + .04, -T + .01)], 32, x, y)
        lathe(a["edge"], [(LY.COL_R + .20, -T - .20), (LY.COL_R + .26, -T - .12), (LY.COL_R + .26, -T - .05)], 32, x, y)
    return a


def railing(gate=True):
    """Posts, handrail and five wires along the edge, open at the stair landing (no glass: the life inside stays readable)."""
    a = Accs()
    g0, g1 = LY.GATE
    span = 360 - (g1 - g0)
    n = 110
    path = [pol(LY.R_RAIL, g1 + span * i / n) for i in range(n + 1)]
    strip(a["rail"], [(*p, 0) for p in path], .07, 1.06, 1.10)
    for z in (.20, .37, .54, .71, .88):
        strip(a["wire"], [(*p, z) for p in path], .014, -.007, .007)
    for i in range(0, n + 1):
        x, y = path[i]
        obox(a["rail"], (x, y, .53), (.05, .02, 1.06), math.radians(g1 + span * i / n))
    for d in LY.GATE:                                                             # newels at the opening
        x, y = pol(LY.R_RAIL, d)
        lathe(a["rail"], [(.045, 0), (.045, 1.14)], 10, x, y)
    return a


# --- columns --------------------------------------------------------------------------------------------------------------------
def column_base():
    """Plaza to L1 floor: flared foot."""
    a = Accs()
    z1 = LY.LEVELS[0]
    lathe(a["frame"], [(LY.COL_R + 1.05 * (1 - min(z / 5.0, 1)) ** 2.1, z) for z in [z1 * i / 18 for i in range(19)]], 36)
    lathe(a["edge"], [(2.28, -.05), (2.28, .05), (2.15, .10), (1.9, .10)], 36)
    return a


def column_mid():
    a = Accs()
    lathe(a["frame"], [(LY.COL_R, 0), (LY.COL_R, 5.0)], 36)
    return a


def column_head(voxel=.10):
    """L5 floor to roof: the shaft forks along the ring beam and in / out under the radial beams. +x = outward."""
    a = Acc()
    z0 = LY.LEVELS[-1]
    lathe(a, [(LY.COL_R, -.7), (LY.COL_R, 2.0), (.86, 2.8), (.6, 3.4)], 30)
    R = LY.R_COL

    def arm(pts, r0, r1):
        pts = [K.bez(pts[0], pts[1], pts[2], 14)[i] for i in range(15)]
        pipe(a, pts, r0, r1, 16)
    top = LY.roof_z(R) - z0 + .10
    for s in (-1, 1):
        d = s * 12.5
        x, y = R * math.cos(math.radians(d)) - R, R * math.sin(math.radians(d))
        arm([(0, s * .18, 1.3), (x * .1, y * .22, top - .55), (x, y, top)], .70, .24)
    arm([(-.15, 0, 1.5), (-.95, 0, top - .5), (-5.6, 0, LY.roof_z(R - 5.6) - z0 + .10)], .62, .20)
    arm([(.15, 0, 1.5), (.95, 0, top - .5), (4.4, 0, LY.roof_z(R + 4.4) - z0 + .10)], .58, .18)
    me = bpy.data.meshes.new("_head")
    me.from_pydata(a.v, [], a.f)
    ob = bpy.data.objects.new("_head", me)
    bpy.context.scene.collection.objects.link(ob)
    md = ob.modifiers.new("r", "REMESH")
    md.mode, md.voxel_size = "VOXEL", voxel
    sm = ob.modifiers.new("s", "SMOOTH")
    sm.factor, sm.iterations = .5, 22
    dc = ob.modifiers.new("d", "DECIMATE")
    dc.ratio = .14
    m2 = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    m2.name = "q04c_column_head"
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
    m2.materials.clear()
    m2.materials.append(make_materials()["frame"])
    for p in m2.polygons:
        p.use_smooth, p.material_index = True, 0
    return m2


# --- roof -----------------------------------------------------------------------------------------------------------------------
def roof():
    """Radial beams, purlins, thin eave ring, open centre with a light lattice; frosted panes and slat bays between the beams."""
    a, g = Accs(), Accs()
    zr, bay = LY.roof_z, 360 / LY.BAYS

    def depth(r):
        return .55 - .34 * abs(r - LY.R_COL) / (LY.R_COL - LY.R_OCULUS)

    def top(r):
        return zr(r) + depth(r)
    rs = [8.0, 11, 14, 17, 19, 21, 23, 25, 26.7]
    for i in range(LY.BAYS):
        d = i * bay
        main = i % 8 == 0
        t = math.radians(d)
        w = .17 if main else .085
        secs = []
        for r in rs:
            c, s = math.cos(t), math.sin(t)
            secs.append([(r * c - v * s, r * s + v * c, z) for v, z in ((-w, zr(r)), (w, zr(r)), (w, top(r)), (-w, top(r)))])
        loft(a["frame"], secs)
    for r, w, h in ((11.5, .05, .16), (15, .05, .16), (18.2, .05, .16), (24.3, .06, .18)):
        ring(a["frame"], r - w, r + w, top(r) - h, top(r), N)
    ring(a["frame"], LY.R_COL - .24, LY.R_COL + .24, zr(LY.R_COL) - .05, top(LY.R_COL), N)   # ring beam on the column heads
    R, z = LY.R_ROOF, zr(LY.R_ROOF)
    lathe(a["edge"], [(R - .75, z + .02), (R - .12, z + .0), (R, z + .10), (R, z + .20), (R - .12, z + .30), (R - .75, z + .30)], N, wrap=True)
    r0, zc = LY.R_OCULUS, zr(LY.R_OCULUS)
    lathe(a["edge"], [(r0 - .22, zc - .08), (r0 + .22, zc - .08), (r0 + .22, zc + .34), (r0 - .22, zc + .34)], N, wrap=True)
    for i in range(16):                                                           # oculus: open lattice, no panes
        d = i * 22.5
        pipe(a["frame"], [pol(r, d, zc + .12 + .85 * (1 - (r / r0) ** 2)) for r in (r0, 6.2, 4.4, 2.4)], .055, .045, 6)
    for r in (5.3, 2.4):
        zz = zc + .12 + .85 * (1 - (r / r0) ** 2)
        ring(a["frame"], r - .06, r + .06, zz - .06, zz + .06, 72)
    bands = ((8.25, 11.5, "pane_clear"), (11.5, 15, "pane_clear"), (15, 18.2, "pane_frost"), (18.2, 21, "pane_frost"), (21, 24.3, "pane_frost"), (24.3, 26.35, "pane_frost"))
    for i in range(LY.BAYS):
        d0, d1 = i * bay + .28, (i + 1) * bay - .28
        for k, (ra, rb, role) in enumerate(bands):
            if i % 4 == 2 and 1 <= k <= 4:                                          # shading bay: timber-toned slats, open between
                m = int((rb - ra) / .40)
                for j in range(m):
                    r = ra + .2 + j * (rb - ra - .2) / m
                    p = [pol(r, d0, top(r) - .10), pol(r, (d0 + d1) / 2, top(r) - .10), pol(r, d1, top(r) - .10)]
                    strip(a["slat"], p, .05, -.09, .07)
                continue
            q = [pol(r, d, top(r) + .02) for r in (ra + .05, rb - .05) for d in (d0, (d0 + d1) / 2, d1)]
            g[role].facing(q, [(0, 1, 4, 3), (1, 2, 5, 4)], lambda c: (0, 0, 1))
    return a, g


# --- main stair --------------------------------------------------------------------------------------------------------------------
def sr(A, s, r):
    """Point s metres (on the mean line) right of bearing A, at radius r."""
    return pol(r, A + LY.turn_deg(s))


def arc_half(A, sgn, rad, n=16):
    """Half circle of radius rad on the mean line at bearing A: inner lane edge -> outer lane edge."""
    return [sr(A, sgn * rad * math.cos(-math.pi / 2 + math.pi * i / n), LY.RM + rad * math.sin(-math.pi / 2 + math.pi * i / n)) for i in range(n + 1)]


def flight(a, A, sgn, rc, z0, n):
    """n risers from bearing A in direction sgn on lane centre rc: closed risers, timber treads, continuous soffit."""
    r0, r1 = rc - LY.HALF + .06, rc + LY.HALF - .06                                  # inside the fascia plates
    h, c = LY.RISE, .36
    for j in range(n - 1):
        aa, ab = A + sgn * j * LY.DA, A + sgn * (j + 1) * LY.DA
        z = z0 + (j + 1) * h
        zb0, zb1 = z - c, z + h - c
        zb0 = max(zb0, z0 - .02) if z0 == 0 else zb0
        zb1 = max(zb1, -.02) if z0 == 0 else zb1
        loft(a["frame"], [[pol(r0, d, zb), pol(r1, d, zb), pol(r1, d, z - .04), pol(r0, d, z - .04)] for d, zb in ((aa, zb0), (ab, zb1))])
        sector(a["tread"], rc - LY.LANE / 2, rc + LY.LANE / 2, aa - sgn * LY.DA * .07, ab, z - .04, z, 9)
    return [(A + sgn * j * LY.DA, z0 + (j + 1) * h) for j in range(n)]


def eased(pts, step=.16, win=.75):
    """The polyline resampled, its heights averaged over +-win metres: the fascia and handrail flow through the landings as one S."""
    ln = [0.0]
    for p, q in zip(pts, pts[1:]):
        ln.append(ln[-1] + math.hypot(q[0] - p[0], q[1] - p[1]))
    n = max(2, round(ln[-1] / step))
    s = np.linspace(0, ln[-1], n + 1)
    x, y, z = (np.interp(s, ln, [p[k] for p in pts]) for k in range(3))
    zs = [float(np.interp(np.linspace(v - min(win, v, ln[-1] - v), v + min(win, v, ln[-1] - v), 9), s, z).mean()) for v in s]
    return list(zip(x.tolist(), y.tolist(), zs))


def balustrade(a, pts):
    """Stringer plate, balusters and a round handrail along 3D points (walking line heights)."""
    pts = eased(pts)
    strip(a["frame"], pts, .07, -.50, .16, -.02)
    run = 0.0
    for p, q in zip(pts, pts[1:]):
        ln = math.hypot(q[0] - p[0], q[1] - p[1])
        while run < ln:
            f = run / ln
            x, y, z = (p[k] + (q[k] - p[k]) * f for k in range(3))
            box(a["rail"], x - .011, x + .011, y - .011, y + .011, z + .1, z + .99)
            run += .28
        run -= ln
    pipe(a["rail"], [(x, y, z + 1.0) for x, y, z in pts], .034, .034, 6)


def stair(i):
    """Run i (0 = plaza to L1): inner flight, half-disc mid landing, outer flight, floor landing joined to the slab edge."""
    a = Accs()
    z0, z1, n, A1 = LY.storeys()[i]
    zm = (z0 + z1) / 2
    A0, RM = LY.A0, LY.RM
    up = flight(a, A0, 1, LY.RI, z0, n)
    dn = flight(a, A1, -1, LY.RO, zm, n)
    half = arc_half(A1, 1, LY.R_TURN - .06)
    prism(a["frame"], half, zm - .26, zm - .04)
    prism(a["tread"], arc_half(A1, 1, LY.R_TURN - .10), zm - .04, zm)
    q = [sr(A0, -(LY.R_TURN - .06) * math.cos(t), RM + (LY.R_TURN - .06) * math.sin(t)) for t in [math.pi / 2 * k / 8 for k in range(8, -1, -1)]]
    L = LY.L_FLOOR
    floor_edge = [sr(A0, -L, RM)] + [sr(A0, -L * k / 4, LY.R_SLAB - .12) for k in range(4, -1, -1)]
    prism(a["frame"], [sr(A0, 0, LY.RO + LY.HALF - .06)] + q[1:] + floor_edge, z1 - .26, z1 - .04)
    prism(a["tread"], [sr(A0, 0, LY.RO + LY.HALF - .1)] + [sr(A0, -(LY.R_TURN - .1) * math.cos(t), RM + (LY.R_TURN - .1) * math.sin(t)) for t in [math.pi / 2 * k / 8 for k in range(7, -1, -1)]]
          + [sr(A0, -L + .10, RM)] + [sr(A0, -(L - .10) * k / 4, LY.R_SLAB - .33) for k in range(4, -1, -1)], z1 - .04, z1 + .004)
    for s in (-1.7, -.3):                                                          # brackets from the slab edge
        ang = A0 + LY.turn_deg(s)
        beam(a["frame"], [pol(23.6, ang, z1 - .40), pol(25.4, ang, z1 - .36), pol(27.0, ang, z1 - .30)], .22, .34, .16, .14)
    ang = A1 + LY.turn_deg(1.1)                                                     # arm from the column to the mid landing
    cx, cy = pol(LY.R_COL, 300)
    ex, ey = pol(RM + 1.1, ang)
    K.beam(a["frame"], [(cx, cy, zm - .17), ((cx + ex) / 2, (cy + ey) / 2, zm - .17), (ex, ey, zm - .20)], .46, .24, .24, .14)

    # balustrades: outside of the loop, then the eye
    e = .05
    rin, rout = LY.RI - LY.HALF + e, LY.RO + LY.HALF - e
    first = [(*pol(rin, A0 - (0 if i else .5)), z0 + LY.RISE * .5)] if i == 0 else [(*pol(rin, A0), z0 + LY.RISE)]
    outer = first + [(*pol(rin, d), z) for d, z in up[1:]]
    outer += [(*p, zm) for p in arc_half(A1, 1, LY.R_TURN - e)[1:-1]]
    outer += [(*pol(rout, d), z) for d, z in dn]
    outer += [(*sr(A0, -(LY.R_TURN - e) * math.cos(t), RM + (LY.R_TURN - e) * math.sin(t)), z1) for t in [math.pi / 2 * k / 8 for k in range(7, -1, -1)]]
    outer += [(*sr(A0, -L + e, RM - .2), z1), (*sr(A0, -L + e, LY.R_SLAB + .05), z1)]
    balustrade(a, outer)
    inner = [(*pol(RM - e, d), z) for d, z in up] + [(*sr(A1, .08, RM), zm)] + [(*pol(RM + e, d), z) for d, z in dn] + [(*sr(A0, -.08, RM), z1)]
    if i < 4:
        inner += [(*pol(RM - e, A0 + .02), z1 + LY.RISE * .6)]
    balustrade(a, inner)
    if i == 4:                                                                      # L5: the inner lane has no flight to go to
        balustrade(a, [(*pol(r, A0), z1) for r in (LY.R_SLAB + .02, 25, RM - e)])
    if i == 0:
        for r in (rin, RM - e):
            lathe(a["frame"], [(.07, 0), (.07, 1.1), (.04, 1.15)], 12, *pol(r, A0 - .5 if r == rin else A0))
        sector(a["edge"], LY.RI - LY.HALF - .1, LY.RI + LY.HALF, A0 - 2.4, A0, -.1, .012, 3)
    return a


# --- lifts, risers --------------------------------------------------------------------------------------------------------------------
def shaft(h, top=False, open_car=None):
    """One storey of the lift shaft: back, sides, divider and a front wall with two real door openings. z 0 = floor."""
    a = Accs()
    x0, x1, y0, y1 = LY.SHAFT
    t = .10
    c = a["wall"]
    box(c, x0, x0 + t, y0, y1, 0, h)
    box(c, x0 + t, x1, y0, y0 + t, 0, h)
    box(c, x0 + t, x1, y1 - t, y1, 0, h)
    box(a["grey"], x0 + t, x1 - t, -.04, .04, 0, h)
    w, dh = LY.LIFT_DOOR
    edges = [y0 + t] + [v for y in LY.LIFT_Y for v in (y - w / 2, y + w / 2)] + [y1 - t]
    for q in range(0, 6, 2):
        box(c, x1 - t, x1, edges[q], edges[q + 1], 0, h)
    for y in LY.LIFT_Y:
        box(c, x1 - t, x1, y - w / 2, y + w / 2, dh, h)
        f = a["grey"]
        box(f, x1 - t - .01, x1 + .03, y - w / 2 - .07, y - w / 2, 0, dh + .07)
        box(f, x1 - t - .01, x1 + .03, y + w / 2, y + w / 2 + .07, 0, dh + .07)
        box(f, x1 - t - .01, x1 + .03, y - w / 2, y + w / 2, dh, dh + .07)
        box(a["edge"], x1 - .2, x1, y - w / 2, y + w / 2, -.02, .006)
        shift = .50 if open_car == y else 0.0                                      # leaves slid behind the wall where a car stands
        for s in (-1, 1):
            ya, yb = sorted((y + s * (shift + .005), y + s * (shift + w / 2)))
            box(a["door"], x1 - t - .07, x1 - t - .02, ya, yb, .01, dh)
        box(a["glow"], x1 + .0, x1 + .02, y - .18, y + .18, dh + .16, dh + .22)
    box(a["glow"], x1 + .0, x1 + .02, -.05, .05, 1.0, 1.12)
    if top:
        box(a["edge"], x0 - .1, x1 + .1, y0 - .1, y1 + .1, h, h + .15)
    return a


def car():
    a = Accs()
    x0, x1, hw = LY.SHAFT[0] + .28, LY.SHAFT[1] - .24, .88
    box(a["grey"], x0, x1, -hw, hw, -.16, 0)
    box(a["wood"], x0, x1, -hw, hw, 0, .012)
    box(a["edge"], x0, x1, -hw, hw, 2.4, 2.52)
    box(a["glow"], x0 + .3, x1 - .3, -hw + .3, hw - .3, 2.385, 2.40)
    box(a["wood"], x0, x0 + .05, -hw, hw, 0, 2.4)
    for s in (-1, 1):
        box(a["wall"], x0, x1, *sorted((s * hw, s * (hw - .05))), 0, 2.4)
        box(a["rail"], x0 + .1, x1 - .1, *sorted((s * (hw - .12), s * (hw - .08))), .88, .92)
    return a


def riser(h):
    """Central wet riser, plain."""
    a = Accs()
    lathe(a["frame"], [(LY.RISER_R, 0), (LY.RISER_R, h)], 32)
    return a


# --- plaza ----------------------------------------------------------------------------------------------------------------------------
PLAZA_TREES = (212, 338, 20, 160, 190)


def plaza(rng):
    a = Accs()
    lathe(a["paving"], [(40, -.5), (40, 0), (1, 0)], 128)
    for r in (12.0, 24.0, 33.0):
        ring(a["paving_b"], r, r + .25, -.1, .008, 128)
    cx, cy = -2.5, -25.5                                                           # gathering circle in front of the open bay
    for r in (2.6, 5.2, 7.8):
        ring(a["paving_b"], r, r + .16, -.1, .010, 96, cx, cy)
    lathe(a["paving_b"], [(.55, -.1), (.55, .010)], 32, cx, cy)
    for d, w in ((35, 10), (75, 9), (105, 9), (145, 10)):                           # rear and side planting under the discs
        sector(a["curb"], 12.5, 15.5, d - w, d + w, 0, .45, 3)
        sector(a["lawn"], 12.75, 15.25, d - w + .8, d + w - .8, .3, .48, 3)
        for k in range(5):
            x, y = pol(14 + rng.uniform(-.7, .7), d - w + 2.2 + k * (2 * w - 4.4) / 4)
            M.leaf_clump(K.ctx(a, rng, x, y, .48), (0, .35, 0), (.8, .5, .8), ("leaf_l", "green"), "green", 40, .3, .3, 3)
    for d in PLAZA_TREES:
        x, y = pol(31.5, d)
        lathe(a["curb"], [(2.4, 0), (2.5, .40), (2.2, .45), (2.2, .38), (.5, .38)], 40, x, y)
        lathe(a["lawn"], [(2.2, .36), (2.2, .41)], 32, x, y)
        for k in range(6):
            M.leaf_clump(K.ctx(a, rng, x + 1.4 * math.cos(k * 1.05), y + 1.4 * math.sin(k * 1.05), .5), (0, .2, 0), (.6, .4, .6), ("leaf_l", "green"), "green", 30, .28, .3, 2)
    for d in (35, 145, 205, 335):
        x, y = pol(17.8, d)
        M.kit_prop(K.ctx(a, rng, x, y, 0, math.radians(d) + math.pi / 2), "bench", 0, 0, 0)
    x, y, r = LY.RISER2
    lathe(a["frame"], [(r, 0), (r, LY.LEVELS[0] - .3)], 24, x, y)
    return a


def tree(seed, h, crown):
    a, rng = Accs(), random.Random(seed)
    M.leafy_tree(K.ctx(a, rng), (0, 0, 0), h=h, crown=crown, trunk="wood", roles=("leaf_l", "green"), core=None, n=160, size=.40, branches=5)
    for i in range(8):
        t, rr = i * 2.4, 0 if i == 0 else crown * rng.uniform(.35, .72)
        c = (rr * math.cos(t), h * (.9 if i == 0 else rng.uniform(.6, .86)), rr * math.sin(t))
        q = crown * rng.uniform(.30, .42)
        M.leaf_clump(K.ctx(a, rng), c, (q, q * .8, q), ("leaf_l", "green"), "green", 130, .40, .25, 2)
    return a


# --- materials --------------------------------------------------------------------------------------------------------------------------
MATS = {}
UV_M = 2.4                                        # metres covered by one repeat of the plank texture


def mat(name, rgba, rough=.6, metal=0.0, emit=None, strength=1.0, culling=True):
    m = G.material("q04c_" + name, rgba, rough, emit, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


def plank_image(size=512, rows=16):
    """Tileable timber boards (0.15 m wide at UV_M), made here: no outside texture."""
    rng = np.random.default_rng(2127)
    h = size // rows
    img = np.zeros((size, size), np.float32)
    x = np.arange(size) / size * 2 * np.pi
    for r in range(rows):
        base = rng.uniform(-.07, .07)
        g = np.zeros((h, size), np.float32)
        for k in range(1, 4):
            g += (.020 / k) * np.sin(k * x + rng.uniform(0, 6.3))[None, :] * np.sin(np.arange(h)[:, None] * rng.uniform(.3, .9) + rng.uniform(0, 6))
        g += rng.normal(0, .012, (h, 1))
        j = int(rng.integers(0, size))
        band = np.where(((np.arange(size) - j) % size) < size // 2, base, rng.uniform(-.07, .07))[None, :]
        g = g + band
        g[:1, :] -= .16
        for q in (j, (j + size // 2) % size):
            g[:, q:q + 1] -= .14
        img[r * h:(r + 1) * h] = g
    rgb = np.array([.84, .75, .62], np.float32)[None, None, :] * (1 + img[:, :, None])
    px = np.ones((size, size, 4), np.float32)
    px[:, :, :3] = np.clip(rgb, 0, 1)
    im = bpy.data.images.new("q04c_planks", size, size)
    im.pixels.foreach_set(px.ravel())
    im.pack()
    return im


def make_materials():
    if MATS:
        return MATS
    warm = srgb("FFD79A")
    MATS.update({
        "frame": mat("white_frame", srgb("EFEDE8"), .55), "edge": mat("disc_edge", srgb("F4F2ED"), .5), "grey": mat("joint_grey", srgb("B8BABA"), .5, .15),
        "soffit": mat("soffit", srgb("EDE9E1"), .85), "floor_white": mat("floor_unfinished", srgb("E6E3DC"), .8),
        "rail": mat("rail", srgb("E2E1DD"), .4, .1), "wire": mat("rail_wire", srgb("C4C8C9"), .4, .4),
        "wall": mat("service_wall", srgb("EFE9DE"), .75), "wall_in": mat("partition", srgb("DCE3E2"), .6), "door": mat("door", srgb("C9CCCB"), .4, .35),
        "door_wood": mat("door_wood", srgb("B68A5B"), .55),
        "tread": mat("stair_tread", srgb("D6BE9B"), .65), "slat": mat("roof_slat", srgb("DCC9A9"), .7),
        "pane_frost": mat("roof_pane_frost", srgb("F1F5F5", .62), .4, culling=False), "pane_clear": mat("roof_pane_clear", srgb("DCEBF0", .20), .08, culling=False),
        "paving": mat("paving", srgb("DAD6CE"), .85), "paving_b": mat("paving_band", srgb("C1BCB2"), .85), "curb": mat("curb", srgb("ECEAE4"), .6), "lawn": mat("lawn", srgb("9ABD5C"), .95),
        "wood": mat("wood", srgb("C8AD88"), .55), "wood_dark": mat("wood_dark", srgb("9E8160"), .6), "chair": mat("chair_oak", srgb("B99A72"), .6), "seat": mat("chair_seat", srgb("EADFCC"), .9),
        "curtain": mat("curtain", srgb("F8F0E2"), .95, emit=srgb("FFF0DA"), strength=.10, culling=False), "curtain_b": mat("curtain_sand", srgb("F2E7D3"), .95, emit=srgb("FFEBCF"), strength=.10, culling=False), "track": mat("curtain_track", srgb("D8D8D4"), .35, .4),
        "linen": mat("linen", srgb("F4F1EA"), .95), "duvet_a": mat("duvet_sage", srgb("A9B79C"), .95), "duvet_b": mat("duvet_sand", srgb("D9BE98"), .95), "duvet_c": mat("duvet_blue", srgb("9FB2BF"), .95),
        "sofa": mat("sofa", srgb("E5DCCD"), .95), "stone": mat("counter_stone", srgb("E8E5DE"), .4), "steel": mat("steel", srgb("AEB4B6"), .3, .6), "dark": mat("hob_dark", srgb("3C4042"), .35),
        "ceramic": mat("ceramic", srgb("F7F5F0"), .25), "cup_b": mat("cup_blue", srgb("7F9DB0"), .4), "food": mat("food_green", srgb("8FA65A"), .9), "bread": mat("food_bread", srgb("C98F4E"), .9),
        "tile": mat("tile", srgb("CFDAD8"), .5), "mirror": mat("mirror", srgb("DCE6E8"), .05, .9), "soil": mat("soil", srgb("6B5138"), .95),
        "glow": mat("warm_light", srgb("FFE3B3"), .5, emit=warm, strength=4.0),
    })
    planks = plank_image()
    for name, rough in (("floor_wood", .55), ("table_wood", .5)):
        m = mat(name, (.6, .4, .22, 1), rough)
        nt = m.node_tree
        b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
        tx = nt.nodes.new("ShaderNodeTexImage")
        tx.image = planks
        nt.links.new(tx.outputs["Color"], b.inputs["Base Color"])
        MATS[name] = m
    for role, (rgba, emit, strength) in M.ROLES.items():
        MATS["in_" + role] = mat("kit_" + role, rgba, .6, emit=emit, strength=strength, culling=role not in ("leaf_l", "green") and rgba[3] >= 1)
    return MATS


TEXTURED = {"floor_wood", "table_wood"}


def build_mesh(name, accs, smooth_deg=32):
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
        me.materials.append(MATS[role])
    me.polygons.foreach_set("material_index", mi)
    if TEXTURED & set(mats):
        uv = me.uv_layers.new(name="UVMap")
        co = np.array(vs)
        idx = np.empty(len(me.loops), np.int32)
        me.loops.foreach_get("vertex_index", idx)
        uv.data.foreach_set("uv", (co[idx][:, :2] / UV_M).astype(np.float32).ravel())
    bm = bmesh.new()
    bm.from_mesh(me)
    thr = math.radians(smooth_deg)
    soft = {i for i, r in enumerate(mats) if r.startswith(("in_leaf", "in_green", "curtain"))}
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
