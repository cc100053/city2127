"""Q02-B bay flower: space-solar receiver floating in Odaiba bay (owner PDF p.3, middle image; references/q02-b.jpg).

blender -b --factory-startup --python-exit-code 1 -P build_flower.py
Writes bay-flower-receiver.blend and .glb next to this file and prints the metrics as one JSON line.

Real metres, three.js coordinates in this file (y up; geo_helpers.B maps them to Blender). Origin: flower centre at the
design waterline y = 0. The shore station sits to -x/+z (SHORE). Exported hierarchy (stable names for the app):
  Q02B_Root
    Q02B_Receiver     petals, frame, dome, floating base, lights
    Q02B_SubseaLink   glass stem under the base and the sea-bed duct to the shore
    Q02B_ShoreStation arched glass landing pavilion where the duct comes ashore
    Q02B_LightBeam    the beam from orbit and its flare: hide or delete it on its own
"""
import json
import math
import os
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import Acc, B, circle_pts, cyl, finish_mesh, material, newell, obox, sweep  # noqa: E402

ID = "bay-flower-receiver"
SHORE = (-95.0, 56.0)       # shore station centre (x, z)
BEAM_TOP = 900.0            # beam height; the app may scale Q02B_LightBeam in y
S = 1.5                     # receiver scale; people by the pavilion in the image make the flower ≈ 120–130 m across
# petal rings: count, angular offset (fraction of a step), hinge radius, hinge height, length, start/end pitch (deg from
# horizontal), max width, cup depth (fraction of width); lengths in units of S
RINGS = tuple((n, o, r * S, y * S, L * S, a0, a1, W * S, c) for n, o, r, y, L, a0, a1, W, c in (
    (18, 0.0, 15.5, 4.6, 29.0, 20, 44, 14.0, .08),
    (16, .5, 13.0, 5.8, 23.0, 40, 66, 12.0, .09),
    (12, .25, 10.5, 7.0, 23.0, 56, 82, 10.0, .1),
))
PANEL_UV = (4.0, 8.0)       # texture tiles across / along each petal: 8 x 16 cells, ≈ 2.6 m on the outer ring
PANEL_TEX = 256             # px per tile; 2 x 2 cells with thin silver frames
SEAM_TEX = 256              # px per guard-plate / pontoon tile: seams on the tile edges, fastener dots along them
SEGS = 24                   # pontoon segments
DRUM_R, DECK_Y = 17.5 * S, 2.4 * S
DOME_R, DOME_Y = 8.0 * S, 15.0 * S


def add(a, b, s=1.0):
    return tuple(x + s * y for x, y in zip(a, b))


def norm(a):
    n = math.sqrt(sum(x * x for x in a)) or 1.0
    return tuple(x / n for x in a)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


class UAcc(Acc):
    """Acc that also carries one UV per vertex; geometry pushed without UVs sits mid-tile (plain, no seam)."""

    def __init__(self):
        super().__init__()
        self.uv = []

    def _push(self, vs, fs):
        super()._push(vs, fs)
        self.uv += [(.5, .5)] * (len(self.v) - len(self.uv))


def surf(acc, verts, faces, wants, uvs=None):
    """Open surface: face i is wound to look along wants[i] (three coords). Only vertices the faces use are kept.
    uvs (one per vertex) go to acc.uv, which only the textured panel accumulator has."""
    used = sorted({i for f in faces for i in f})
    remap = {old: new for new, old in enumerate(used)}
    vs = [B(verts[i]) for i in used]
    if uvs is not None:
        acc.uv += [uvs[i] for i in used]
    out = []
    for f, w in zip(faces, wants):
        f = tuple(remap[i] for i in f)
        n = newell([vs[i] for i in f])
        out.append(f if sum(a * b for a, b in zip(n, B(w))) >= 0 else tuple(reversed(f)))
    acc._push(vs, out)


def pipe(acc, pts, r, sides=6, caps=True):
    """Closed tube of radius r along a 3D polyline (parallel-transport frames)."""
    tans = []
    for i in range(len(pts)):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
        tans.append(norm(tuple(y - x for x, y in zip(a, b))))
    ref = (0, 1, 0) if abs(tans[0][1]) < .9 else (1, 0, 0)
    u = norm(cross(tans[0], ref))
    verts, rings = [], []
    for p, t in zip(pts, tans):
        u = norm(add(u, t, -sum(x * y for x, y in zip(u, t))))
        v = cross(t, u)
        rings.append(list(range(len(verts), len(verts) + sides)))
        for k in range(sides):
            a = 2 * math.pi * (k + .5) / sides
            verts.append(add(add(p, u, r * math.cos(a)), v, r * math.sin(a)))
    faces = []
    for r0, r1 in zip(rings, rings[1:]):
        faces += [(r0[i], r0[(i + 1) % sides], r1[(i + 1) % sides], r1[i]) for i in range(sides)]
    if caps:
        faces += [tuple(reversed(rings[0])), tuple(rings[-1])]
    acc.solid(verts, faces)


def arc_path(pts, rad, n=6):
    """Polyline with each inner corner replaced by an n-step fillet of radius ~rad."""
    out = [pts[0]]
    for a, b, c in zip(pts, pts[1:], pts[2:]):
        d0, d1 = norm(tuple(y - x for x, y in zip(a, b))), norm(tuple(y - x for x, y in zip(b, c)))
        p0, p1 = add(b, d0, -rad), add(b, d1, rad)
        for i in range(n + 1):  # quadratic Bezier through the corner
            t = i / n
            out.append(tuple((1 - t) ** 2 * x + 2 * t * (1 - t) * y + t * t * z for x, y, z in zip(p0, b, p1)))
    out.append(pts[-1])
    return out


def petal(acc, skin, ring, theta, nu=10, nv=6):
    """One cupped, pointed petal: inner face into acc (panels), outer face and edges into skin (white shell).
    Returns (top(u, v), bottom(u, v)) samplers for frame and struts."""
    _, _, r0, y0, L, a0, a1, W, cup = ring
    R, Lt = (math.cos(theta), 0, math.sin(theta)), (-math.sin(theta), 0, math.cos(theta))
    spine, r, y = [], r0, y0
    for i in range(nu + 1):  # integrate the spine in the (radial, up) plane
        u = i / nu
        a = math.radians(a0 + (a1 - a0) * u ** 1.4)
        spine.append((r, y, a))
        r, y = r + L / nu * math.cos(a), y + L / nu * math.sin(a)

    def at(u, v, side):
        i = min(int(u * nu), nu - 1)
        f = u * nu - i
        (ra, ya, aa), (rb, yb, ab) = spine[i], spine[i + 1]
        rr, yy, aa = ra + (rb - ra) * f, ya + (yb - ya) * f, aa + (ab - aa) * f
        w = max(W * (math.sin(math.pi * min(u, 1) ** .7) ** .5 + .15 * (1 - u) ** 2), .12)  # almond: full to near the tip
        w *= .25 + .75 * min(1.0, u / .5) ** 1.2  # tapered root: gaps between neighbours over the lowest quarter
        N = (-math.sin(aa) * R[0], math.cos(aa), -math.sin(aa) * R[2])
        p = (R[0] * rr + Lt[0] * v * w / 2, yy, R[2] * rr + Lt[2] * v * w / 2)
        p = add(p, N, cup * w * v * v)
        if side < 0:
            p = add(p, N, -(.42 * (1 - u) + .1))
        return p, N

    grid = lambda side: [at(i / nu, -1 + 2 * j / nv, side) for i in range(nu + 1) for j in range(nv + 1)]
    top, bot = grid(1), grid(-1)
    verts = [p for p, _ in top] + [p for p, _ in bot]
    nb = len(top)
    idx = lambda i, j: i * (nv + 1) + j
    tf, tw, faces, wants = [], [], [], []
    for i in range(nu):
        for j in range(nv):
            q = (idx(i, j), idx(i, j + 1), idx(i + 1, j + 1), idx(i + 1, j))
            n = top[idx(i, j)][1]
            tf.append(q)
            tw.append(n)
            faces.append(tuple(nb + k for k in q))
            wants.append(tuple(-x for x in n))
        for j, s in ((0, -1), (nv, 1)):  # side strips
            faces.append((idx(i, j), idx(i + 1, j), nb + idx(i + 1, j), nb + idx(i, j)))
            wants.append(tuple(s * x for x in Lt))
    for j in range(nv):  # hinge edge
        faces.append((idx(0, j), idx(0, j + 1), nb + idx(0, j + 1), nb + idx(0, j)))
        wants.append((-R[0], 0, -R[2]))
    # panel UVs: across the petal 0..PANEL_UV[0], along it 0..PANEL_UV[1] texture tiles (2 x 2 cells per tile)
    uvs = [(j / nv * PANEL_UV[0], i / nu * PANEL_UV[1]) for i in range(nu + 1) for j in range(nv + 1)] + [(0, 0)] * nb
    surf(acc, verts, tf, tw, uvs)
    # outer guard-plate seams follow the petal grid: 2 plates across (seam on the spine), 4 along
    suv = [(j / nv * 2, i / nu * 4) for i in range(nu + 1) for j in range(nv + 1)]
    surf(skin, verts, faces, wants, suv + suv)
    return (lambda u, v: at(u, v, 1)[0]), (lambda u, v: at(u, v, -1)[0])


def drum(acc):
    """Pontoon ring with UVs: one seam-texture tile per segment around, one per 3 m up; plain deck and hull caps."""
    nc = SEGS * 3
    sec = [(5.0, -4.0), (1.2, -1.6), (0.0, -.6), (0.0, DECK_Y - .5), (.5, DECK_Y)]
    verts, uvs, faces, wants, v = [], [], [], [], 0.0
    for si, (k, y) in enumerate(sec):
        if si:
            v += math.hypot(k - sec[si - 1][0], y - sec[si - 1][1]) / 3.0
        for c in range(nc + 1):
            a = 2 * math.pi * c / nc
            verts.append(((DRUM_R - k) * math.cos(a), y, (DRUM_R - k) * math.sin(a)))
            uvs.append((c / nc * SEGS, v))
    for si in range(len(sec) - 1):
        for c in range(nc):
            a, b = si * (nc + 1) + c, (si + 1) * (nc + 1) + c
            faces.append((a, a + 1, b + 1, b))
            p = verts[a]
            wants.append((p[0], 0, p[2]))
    for (k, y), up in ((sec[0], -1), (sec[-1], 1)):  # caps on their own vertices, mid-tile UVs
        base = len(verts)
        verts += [((DRUM_R - k) * math.cos(2 * math.pi * c / nc), y, (DRUM_R - k) * math.sin(2 * math.pi * c / nc))
                  for c in range(nc)]
        uvs += [(.5, .5)] * nc
        faces.append(tuple(range(base, base + nc)))
        wants.append((0, up, 0))
    surf(acc, verts, faces, wants, uvs)


def hinge_seat(A, hp, th):
    """Hinge seat under a petal root at hp: deck plate, column, two cheek plates and a dark pin across the petal."""
    t, n = (math.cos(th), math.sin(th)), (-math.sin(th), math.cos(th))  # radial, lateral
    cx, cz = hp[0] * .985, hp[2] * .985
    top = hp[1] - 1.0
    obox(A["frame"], (cx, DECK_Y + .15, cz), (2.6, .3, 2.6), t, n)
    if top - DECK_Y > .3:
        obox(A["frame"], (cx, (DECK_Y + top) / 2, cz), (1.3, top - DECK_Y, 1.3), t, n)
    for s in (-.85, .85):
        obox(A["frame"], (cx + n[0] * s, top + .55, cz + n[1] * s), (1.8, 1.7, .28), t, n)
    pin_y = top + .75
    pipe(A["piston"], [(cx - n[0] * 1.15, pin_y, cz - n[1] * 1.15), (cx + n[0] * 1.15, pin_y, cz + n[1] * 1.15)], .32, 10)


def support_arm(A, foot, head, th):
    """Diagonal support arm: deck mount, dark hydraulic sleeve on the lower 45 %, silver rod, head block."""
    t, n = (math.cos(th), math.sin(th)), (-math.sin(th), math.cos(th))
    obox(A["frame"], (foot[0], foot[1] + .3, foot[2]), (1.6, .6, 1.6), t, n)
    base = (foot[0], foot[1] + .6, foot[2])
    mid = tuple(a + .45 * (b - a) for a, b in zip(base, head))
    pipe(A["piston"], [base, mid], .42, 8)
    rod0 = tuple(a + .12 * (b - a) for a, b in zip(base, head))  # rod starts inside the sleeve: no coplanar end caps
    pipe(A["frame"], [rod0, head], .24, 6)
    obox(A["frame"], (head[0], head[1] - .25, head[2]), (.9, .6, .9), t, n)


def build():
    A = {k: (UAcc() if k in UV_ROLES else Acc()) for roles in GROUPS.values() for k in roles}
    # ---- floating base: 24 pontoon segments (seams in the texture), joint pilasters, deck mounts, one light each
    drum(A["base"])
    sweep(A["dark"], lambda k: circle_pts(0, 0, DRUM_R + .06, 72, k), [(0, .5), (0, 1.5)], caps=(False, False),
          want=lambda c: (c[0], 0, c[2]))
    for i in range(SEGS):
        a = 2 * math.pi * i / SEGS
        t, n = (-math.sin(a), math.cos(a)), (math.cos(a), math.sin(a))  # along the rim, outward
        obox(A["frame"], ((DRUM_R + .2) * n[0], (DECK_Y - .6) / 2, (DRUM_R + .2) * n[1]), (.9, DECK_Y + .6, .55), t, n)
        obox(A["frame"], ((DRUM_R - .9) * n[0], DECK_Y + .3, (DRUM_R - .9) * n[1]), (1.4, .6, 1.8), t, n)
        am = a + math.pi / SEGS  # indicator light mid-segment, under the deck edge
        cyl(A["glow"], (DRUM_R + .1) * math.cos(am), (DRUM_R + .1) * math.sin(am), .22, 2.1, 2.35, 6)
    # ---- dome on its collar, meridian ribs, receiver aperture
    cyl(A["base"], 0, 0, DOME_R + .6, DECK_Y - .2, DOME_Y, 48)
    # thick silver bearing ring where the dome meets the collar, with 16 brackets down to the collar
    y0, y1 = DOME_Y - .9, DOME_Y + .8
    sweep(A["frame"], lambda k: circle_pts(0, 0, DOME_R + 1.8, 64, k),
          [(0, y0 + .25), (.25, y0), (2.4, y0), (2.4, y1), (.25, y1), (0, y1 - .25)], caps=(False, False), closed=True)
    for i in range(16):
        a = 2 * math.pi * i / 16
        t, n = (-math.sin(a), math.cos(a)), (math.cos(a), math.sin(a))
        obox(A["frame"], ((DOME_R + 1.2) * n[0], y0 - 1.3, (DOME_R + 1.2) * n[1]), (.45, 2.6, 1.6), t, n)
    sec = [(DOME_R * (1 - math.cos(math.radians(p))), DOME_Y + DOME_R * math.sin(math.radians(p))) for p in range(0, 86, 5)]
    sweep(A["dome"], lambda k: circle_pts(0, 0, DOME_R, 48, k), sec)
    for i in range(16):
        a = 2 * math.pi * i / 16
        pts = [((DOME_R + .1) * math.cos(math.radians(p)) * math.cos(a), DOME_Y + (DOME_R + .1) * math.sin(math.radians(p)),
                (DOME_R + .1) * math.cos(math.radians(p)) * math.sin(a)) for p in range(0, 81, 10)]
        pipe(A["frame"], pts, .12, 4)
    for p in (25, 50):
        rr, yy = (DOME_R + .1) * math.cos(math.radians(p)), DOME_Y + (DOME_R + .1) * math.sin(math.radians(p))
        pipe(A["frame"], [(rr * math.cos(a), yy, rr * math.sin(a)) for a in [2 * math.pi * k / 48 for k in range(49)]], .12, 4)
    top_y = DOME_Y + DOME_R * math.sin(math.radians(85))
    cyl(A["frame"], 0, 0, 1.9, top_y - .3, top_y + .5, 24)
    cyl(A["aperture"], 0, 0, 1.4, top_y + .5, top_y + .65, 24)
    # ---- petals with silver rims; hinge seat and two diagonal support arms under every petal
    under = []
    for ri, ring in enumerate(RINGS):
        n, off = ring[0], ring[1]
        row = []
        for k in range(n):
            th = 2 * math.pi * (k + off) / n
            topf, botf = petal(A["panel"], A["shell"], ring, th)
            for v in (-1, 1):
                pipe(A["frame"], [topf(u / 12, v * .98) for u in range(13)], .2, 5)
            hinge_seat(A, botf(.02, 0), th)
            head_u = (.38, .32, .26)[ri]
            for dv in (-.3, .3):
                foot_r = ring[2] - (2.5 if ri == 2 else 3.5)
                foot = (foot_r * math.cos(th + dv * .2), DECK_Y, foot_r * math.sin(th + dv * .2))
                support_arm(A, foot, botf(head_u, dv), th)
            row.append(botf(head_u, 0))
        under.append(row)
    for row in under[:2]:  # ring beams joining the arm heads of the outer and middle rings
        pipe(A["frame"], row + row[:1], .3, 5)
    # ring truss under the outer hinge circle: deck chord, hinge-height chord, zig-zag lacing and posts
    ro, rt = RINGS[0], 72
    lo_r, lo_y = DRUM_R - .8, DECK_Y + .3
    hi_r, hi_y = ro[2] * .98, ro[3] - 1.3
    low = [(lo_r * math.cos(2 * math.pi * i / rt), lo_y, lo_r * math.sin(2 * math.pi * i / rt)) for i in range(rt + 1)]
    high = [(hi_r * math.cos(2 * math.pi * (i + .5) / rt), hi_y, hi_r * math.sin(2 * math.pi * (i + .5) / rt))
            for i in range(rt + 1)]
    pipe(A["frame"], low, .22, 5)
    pipe(A["frame"], high, .22, 5)
    for i in range(rt):
        pipe(A["frame"], [low[i], high[i]], .13, 4)
        pipe(A["frame"], [high[i], low[i + 1]], .13, 4)
    # ---- sub-sea link: glass stem with glowing rings, elbow, duct to the shore station
    sx, sz = SHORE
    d = norm((sx, 0, sz))
    cyl(A["core"], 0, 0, 2.0, -12.5, -3.5, 16)
    cyl(A["sleeve"], 0, 0, 3.8, -12.0, -3.8, 32)
    for yy in (-5.0, -8.0, -11.0):
        sweep(A["sub_glow"], lambda k: circle_pts(0, 0, 3.95, 32, k), [(0, yy - .25), (0, yy + .25)], caps=(False, False),
              want=lambda c: (c[0], 0, c[2]))
    path = arc_path([(0, -9.0, 0), (0, -13.5, 0), (sx - d[0] * 9, -13.5, sz - d[2] * 9), (sx - d[0] * 4, -.5, sz - d[2] * 4),
                     (sx - d[0] * 3.5, 1.4, sz - d[2] * 3.5)], 4.0)
    # the core pokes 0.3 m past both sleeve ends so the end caps are not coplanar
    ext = lambda p, q: add(p, norm(tuple(x - y for x, y in zip(p, q))), .3)
    pipe(A["core"], [ext(path[0], path[1])] + path[1:-1] + [ext(path[-1], path[-2])], 1.1, 10)
    pipe(A["sleeve"], path, 2.2, 16)
    seg = [(path[i], path[i + 1]) for i in range(len(path) - 1)]
    run = 0.0
    for a, b in seg:
        ln = math.dist(a, b)
        while run < ln:
            c = add(a, norm(tuple(y - x for x, y in zip(a, b))), run)
            e = add(c, norm(tuple(y - x for x, y in zip(a, b))), .7)
            pipe(A["sub_frame"], [c, e], 2.45, 16)
            run += 9.0
        run -= ln
    # ---- shore station: arched glass pavilion, long axis along the shore
    t = (d[2], 0, -d[0])  # along shore
    PL, PW, PH, PY = 18.0, 10.0, 6.2, 1.5
    loc = lambda a, b, h: (sx + t[0] * a + d[0] * b, h, sz + t[2] * a + d[2] * b)
    quad = [loc(-PL / 2 - 1, -PW / 2 - 1, 0), loc(PL / 2 + 1, -PW / 2 - 1, 0), loc(PL / 2 + 1, PW / 2 + 1, 0), loc(-PL / 2 - 1, PW / 2 + 1, 0)]
    up = [(p[0], PY, p[2]) for p in quad]
    A["pav_base"].solid(quad + up, [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
    arch = lambda a, s: loc(a, -PW / 2 * math.cos(math.pi * s), PY + .4 + PH * math.sin(math.pi * s))
    for i in range(7):
        a = -PL / 2 + PL * i / 6
        pipe(A["pav_frame"], [arch(a, s / 12) for s in range(13)], .22, 6)
    for s in (0, .2, .4, .5, .6, .8, 1):
        pipe(A["pav_frame"], [arch(-PL / 2, s), arch(PL / 2, s)], .12, 4)
    vs, fs, ws = [], [], []
    for i in range(13):
        for a in (-PL / 2, PL / 2):
            vs.append(arch(a, i / 12))
    for i in range(12):
        fs.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
        mid = arch(0, (i + .5) / 12)
        ws.append(norm((mid[0] - loc(0, 0, 0)[0], mid[1] - PY, mid[2] - loc(0, 0, 0)[2])))
    surf(A["pav_glass"], vs, fs, ws)
    for a in (-PL / 2, PL / 2):  # glazed gable ends
        ring_ = [arch(a, s / 12) for s in range(13)]
        surf(A["pav_glass"], ring_, [tuple(range(13))], [tuple(math.copysign(1, a) * x for x in t)])
    tl = loc(0, -PW / 2 + 3.5, 0)  # terminal where the duct surfaces
    cyl(A["pav_core"], tl[0], tl[2], 1.6, PY, PY + 2.6, 16)
    cyl(A["pav_glow"], tl[0], tl[2], 1.65, PY + 1.0, PY + 1.3, 16)
    # ---- the beam from orbit (own node)
    cyl(A["beam_core"], 0, 0, .45, top_y + .6, BEAM_TOP, 12)
    cyl(A["beam_glow"], 0, 0, 1.8, top_y + .9, BEAM_TOP - 1, 16)
    sec = [(1.8 * (1 - math.cos(math.radians(p))), top_y + 1.0 + 1.8 * math.sin(math.radians(p))) for p in range(-80, 81, 20)]
    sweep(A["beam_core"], lambda k: circle_pts(0, 0, 1.8, 16, k), sec)
    sec = [(4.5 * (1 - math.cos(math.radians(p))), top_y + 1.0 + 4.5 * math.sin(math.radians(p))) for p in range(-80, 81, 20)]
    sweep(A["beam_glow"], lambda k: circle_pts(0, 0, 4.5, 24, k), sec)
    return A


def panel_images():
    """One tile of receiver panel: 2 x 2 blue-grey cells in thin silver frames, faint busbars inside each cell.
    Returns (base colour image, sRGB) and (metal-roughness image, non-colour: G roughness, B metallic), both packed."""
    n, c = PANEL_TEX, PANEL_TEX // 2
    x = np.arange(n)
    edge = (x % c < 1) | (x % c > c - 2)                    # 2 px frame between cells (≈ 2 cm), toned down
    bus = (x % (c // 4) == 0) & ~edge                       # faint busbars, 4 per cell each way
    line = edge[None, :] | edge[:, None]
    busm = (bus[None, :] | bus[:, None]) & ~line
    cell = (x // c)[None, :] + 2 * (x // c)[:, None]        # cell id 0..3 for a slight tone variation
    blue = np.array([.33, .42, .52])                         # sRGB blue-grey
    tone = np.array([1.0, .96, 1.03, .98])[cell][..., None]
    col = blue * tone
    col = np.where(busm[..., None], col * .93 + .07 * np.array([.62, .68, .75]), col)
    col = np.where(line[..., None], np.array([.53, .59, .66]), col)
    rough = np.where(line, .26, .30)
    metal = np.where(line, .7, .35)
    mr = np.stack([np.ones_like(rough), rough, metal], -1)
    return [packed(name, px, space) for name, px, space in
            (("q02b_panel_color", col, "sRGB"), ("q02b_panel_mr", mr, "Non-Color"))]


def packed(name, px, space):
    n = px.shape[0]
    img = bpy.data.images.new(name, n, n, alpha=False)
    img.colorspace_settings.name = space
    img.pixels.foreach_set(np.concatenate([px, np.ones((n, n, 1))], -1).astype(np.float32).ravel())
    img.file_format = "PNG"
    img.pack()
    return img


def seam_image():
    """Silver-white plate with a 2 px grey seam on every tile edge and small fastener dots 6 px inside the seams."""
    n = SEAM_TEX
    y, x = np.mgrid[0:n, 0:n]
    col = np.ones((n, n, 3)) * np.array([.87, .88, .90])
    seam = (x < 1) | (x > n - 2) | (y < 1) | (y > n - 2)
    dots = np.zeros((n, n), bool)
    for cx in list(range(16, n, 32)):
        for cy in (6, n - 7):
            dots |= (x - cx) ** 2 + (y - cy) ** 2 <= 2.5
            dots |= (y - cx) ** 2 + (x - cy) ** 2 <= 2.5
    col = np.where(dots[..., None], np.array([.66, .68, .72]), col)
    col = np.where(seam[..., None], np.array([.50, .53, .58]), col)
    return packed("q02b_plate_seams", col, "sRGB")


def textured(name, img, rough, metal, uvmap="UVMap"):
    """Principled material whose base colour is img on uvmap; constant roughness/metallic."""
    mt = material(name, (.87, .88, .9, 1), rough)
    nt = mt.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Metallic"].default_value = metal
    uv, tex = nt.nodes.new("ShaderNodeUVMap"), nt.nodes.new("ShaderNodeTexImage")
    uv.uv_map, tex.image = uvmap, img
    nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mt


def panel_material():
    """Blue-grey solar receiver panels with fine silver cell frames, as glTF base colour + metallic-roughness textures."""
    mt = material("q02b_petal_panel", (.18, .26, .38, 1), .3)
    nt = mt.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    col_img, mr_img = panel_images()
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "UVMap"
    tc, tm = nt.nodes.new("ShaderNodeTexImage"), nt.nodes.new("ShaderNodeTexImage")
    tc.image, tm.image = col_img, mr_img
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    for t in (tc, tm):
        nt.links.new(uv.outputs["UV"], t.inputs["Vector"])
    nt.links.new(tc.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tm.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    mt.diffuse_color = (.18, .26, .38, 1)
    return mt


def mats():
    def m(name, rgba, rough, metal=0.0, emit=None, es=1.0):
        mt = material("q02b_" + name, rgba, rough, emit, es)
        bsdf = next(n for n in mt.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Metallic"].default_value = metal
        return mt
    seams = seam_image()
    return {
        "panel": panel_material(),
        "shell": textured("q02b_petal_back_silver", seams, .25, .6),     # outer guard plates, seams along the curve
        "frame": m("frame_silver", (.90, .90, .91, 1), .25, .7),         # rims, seats, arms, truss, rings, collars
        "dome": m("dome_silver_blue", (.70, .82, .97, 1), .1, .9, (.55, .72, 1, 1), .15),
        "base": textured("q02b_pontoon_segments", seams, .5, .15),      # 24 segments, seams and fasteners
        "plain": m("base_white", (.80, .81, .82, 1), .55),
        "dark": m("window_band", (.04, .06, .08, 1), .25),
        "glow": m("light_cyan", (.25, .7, 1, 1), .4, 0, (.3, .78, 1, 1), 6.0),
        "aperture": m("aperture", (.85, .95, 1, 1), .2, 0, (.7, .9, 1, 1), 3.0),
        "sleeve": m("subsea_glass", (.6, .88, .9, .55), .06),
        "core": m("core_metal", (.26, .30, .33, 1), .35, .7),
        "pav_glass": m("pavilion_glass", (.78, .9, .96, .35), .05),
        "pav_frame": m("pavilion_frame", (.92, .92, .9, 1), .4),
        "beam_core": m("beam_core", (.85, .95, 1, 1), .5, 0, (.75, .9, 1, 1), 40.0),
        "beam_glow": m("beam_glow", (.5, .78, 1, .1), .5, 0, (.45, .72, 1, 1), 2.0),
    }


GROUPS = {
    "Q02B_Receiver": ("panel", "shell", "frame", "piston", "dome", "base", "dark", "glow", "aperture"),
    "Q02B_SubseaLink": ("sleeve", "core", "sub_frame", "sub_glow"),
    "Q02B_ShoreStation": ("pav_glass", "pav_frame", "pav_base", "pav_core", "pav_glow"),
    "Q02B_LightBeam": ("beam_core", "beam_glow"),
}
SHARED = {"sub_frame": "frame", "sub_glow": "glow", "pav_base": "plain", "pav_core": "core", "pav_glow": "glow",
          "piston": "core"}
UV_ROLES = ("panel", "shell", "base")  # accumulators with a UV map (textured materials)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    A, M = build(), mats()
    root = bpy.data.objects.new("Q02B_Root", None)
    bpy.context.scene.collection.objects.link(root)
    objs = []
    for gname, roles in GROUPS.items():
        g = bpy.data.objects.new(gname, None)
        bpy.context.scene.collection.objects.link(g)
        g.parent = root
        for role in roles:
            ob = finish_mesh(f"{gname}_{role}", A[role], M[SHARED.get(role, role)])
            if hasattr(A[role], "uv"):  # finish_mesh keeps vertex order, so per-vertex UVs map straight onto loops
                layer = ob.data.uv_layers.new(name="UVMap")
                for lp in ob.data.loops:
                    layer.data[lp.index].uv = A[role].uv[lp.vertex_index]
            bpy.context.scene.collection.objects.link(ob)
            ob.parent = g
            objs.append(ob)
    blend, glb = os.path.join(HERE, ID + ".blend"), os.path.join(HERE, ID + ".glb")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    for o in bpy.context.scene.objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_animations=False, export_cameras=False, export_lights=False, export_extras=False)
    tris = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs}
    print("@@JSON@@" + json.dumps({"tris_total": sum(tris.values()),
                                   "tris_beam": sum(v for k, v in tris.items() if k.startswith("Q02B_LightBeam")),
                                   "objects": len(objs), "glb_bytes": os.path.getsize(glb), "tris": tris}))


main()
