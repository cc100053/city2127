"""Q02-B bay flower: space-solar receiver floating in Odaiba bay (owner PDF p.3, middle image; references/q02-b.jpg).

blender -b --factory-startup --python-exit-code 1 -P build_flower.py
Writes bay-flower-receiver.blend/.glb (with the light beam) and bay-flower-receiver-nobeam.blend/.glb (without it)
next to this file and prints the metrics as one JSON line.

Real metres, three.js coordinates in this file (y up; geo_helpers.B maps them to Blender). Origin: flower centre at the
design waterline y = 0. The shore station sits to -x/+z (SHORE). Exported hierarchy (stable names for the app):
  Q02B_Root
    Q02B_Receiver     petals, frame, dome, floating base, lights
    Q02B_SubseaLink   glass stem under the base and the sea-bed duct to the shore
    Q02B_ShoreStation machine room on a short platform off the promenade, its arched pipe end facing along the shore
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
from geo_helpers import Acc, B, blob, circle_pts, cyl, finish_mesh, material, newell, obox, sweep  # noqa: E402

ID = "bay-flower-receiver"
SHORE = (-95.0, 56.0)       # shore station centre (x, z)
BEAM_TOP = 900.0            # beam height; the app may scale Q02B_LightBeam in y
S = 1.5                     # receiver scale; people by the pavilion in the image make the flower ≈ 120–130 m across
# petal rings: count, angular offset (fraction of a step), hinge radius, hinge height, length, start/end pitch (deg from
# horizontal), max width, cup depth (fraction of width); lengths in units of S
# OPEN: bloom (owner 2026-11-18), degrees each ring's petals tilt outward about their hinge. Both pitches drop by the
# same angle, so the petal keeps its curvature; seats, arms, ribs, shoes and ring beams sample the petal and follow.
OPEN = (3.0, 10.0, 17.5)    # outer / middle / inner ring, mean opening
# Neighbours in a ring overlap sideways and are cupped alike, so identical petals cross at the overlap. Even petals open
# LAYER degrees less and odd ones LAYER more (every ring has an even count): each even petal lies wholly over both
# neighbours, an inner and an outer layer as in a lotus. Openings per ring: outer 0.5–5.5°, middle 7.5–12.5°, inner
# 15–20°. 2.5° is the smallest tried that keeps shells, rims, spine ribs and root shoes apart (the middle ring's rims
# still touched at 2.2°).
LAYER = (2.5, 2.5, 2.5)
RINGS = tuple((n, o, r * S, y * S, L * S, a0 - op, a1 - op, W * S, c) for (n, o, r, y, L, a0, a1, W, c), op in zip((
    (18, 0.0, 15.5, 4.6, 29.0, 20, 44, 14.0, .08),
    (16, .5, 13.0, 5.8, 23.0, 40, 66, 12.0, .09),
    (12, .25, 10.5, 7.0, 23.0, 56, 82, 10.0, .1),
), OPEN))


def petal_ring(ri, k):
    """Ring parameters for petal k of ring ri, with its layer offset applied to both pitches."""
    ring, d = RINGS[ri], LAYER[ri] * (1 if k % 2 == 0 else -1)
    return ring[:5] + (ring[5] + d, ring[6] + d) + ring[7:]
PANEL_UV = (4.0, 8.0)       # texture tiles across / along each petal: 8 x 16 cells, ≈ 2.6 m on the outer ring
PANEL_TEX = 256             # px per tile; 2 x 2 cells with thin silver frames
SEAM_TEX = 256              # px per guard-plate / pontoon tile: seams on the tile edges, fastener dots along them
SEGS = 24                   # pontoon segments
JUNCTION_A = math.radians(142.5)  # collar pipe junction: toward the shore duct, between two inner petals
PIPE_R, PIPE_Y = 1.5, 4.4   # duct radius; its axis height where it runs level out of the machine-room front
SKIRT = .45                 # machine-room kick band height
# shore platform (shore frame: f seaward, s along the shore toward the reference camera; the promenade edge is f -6).
# The machine room's long axis runs along +s, so the reference camera sees its landward side and its arched pipe end.
QY = 1.5                    # platform top, level with the promenade
PLAT_F, PLAT_S = (-6.0, 12.0), (-10.0, 14.0)   # platform extent: promenade edge to the seaward rail, back end to pipe end
ROOM_F, ROOM_S = 3.0, -3.0  # machine-room axis line (f) and its local origin along the shore (room spans s -7…7)
DROP_S, RUN_Y = 18.5, -5.0  # the duct turns down past the platform end at s DROP_S and runs along the shore at RUN_Y
TURN_S = 34.0               # where the shore run bends toward the flower base
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
    """Polyline with each inner corner replaced by an n-step fillet of radius ~rad (one value, or one per corner)."""
    out = [pts[0]]
    rads = rad if isinstance(rad, (list, tuple)) else [rad] * (len(pts) - 2)
    for a, b, c, rad in zip(pts, pts[1:], pts[2:], rads):
        d0, d1 = norm(tuple(y - x for x, y in zip(a, b))), norm(tuple(y - x for x, y in zip(b, c)))
        p0, p1 = add(b, d0, -rad), add(b, d1, rad)
        for i in range(n + 1):  # quadratic Bezier through the corner
            t = i / n
            out.append(tuple((1 - t) ** 2 * x + 2 * t * (1 - t) * y + t * t * z for x, y, z in zip(p0, b, p1)))
    out.append(pts[-1])
    # drop repeated points (a fillet as long as its segment): pipe() frames collapse on a zero-length segment
    return [p for i, p in enumerate(out) if i == 0 or math.dist(p, out[i - 1]) > 1e-6]


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
    # outer guard plates follow the petal grid: 2 plates across (seam on the spine), 4 along; one texture tile holds
    # 2 x 2 plates with slightly different silver-grey tones, so the tile repeats 1 across and 2 along
    suv = [(j / nv, i / nu * 2) for i in range(nu + 1) for j in range(nv + 1)]
    surf(skin, verts, faces, wants, suv + suv)
    return (lambda u, v: at(u, v, 1)[0]), (lambda u, v: at(u, v, -1)[0])


def petal_back_details(A, topf, botf):
    """Outer face of a petal: a low stiffening rib along the spine, and a root shoe bolted down where the petal sits on
    its hinge seat."""
    out = lambda u, v: norm(tuple(b - t for b, t in zip(botf(u, v), topf(u, v))))   # outward from the guard plates
    rib = [add(botf(u, 0), out(u, 0), .1) for u in [.04 + .88 * k / 14 for k in range(15)]]
    pipe(A["petal_rib"], rib, .16, 6)
    # root shoe: a blue-grey plate 0.35 m proud of the guard plates over the first 12 % of the petal, a little wider
    # than the root (v ±1.15), sitting between the hinge-seat cheeks
    corners = [(u, v) for u in (0.0, .12) for v in (-1.15, 1.15)]
    inner = [add(botf(u, v), out(u, v), -.05) for u, v in corners]
    outer = [add(botf(u, v), out(u, v), .35) for u, v in corners]
    vs = inner + outer                                  # 0..3 inner (u0v-, u0v+, u1v-, u1v+), 4..7 outer
    A["petal_shoe"].solid(vs, [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)])
    for u in (.03, .09):                                # four bolt heads standing off the shoe
        for v in (-.7, .7):
            p, o = botf(u, v), out(u, v)
            pipe(A["piston"], [p, add(p, o, .55)], .1, 6)  # from the plate surface, through the shoe


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


def arc_slab(acc, r0, r1, a0, a1, y0, y1, segs=6):
    """Curved slab between radii r0 < r1, angles a0..a1 (rad), heights y0..y1."""
    ring = lambda a: [(r * math.cos(a), y, r * math.sin(a)) for r, y in ((r0, y0), (r1, y0), (r1, y1), (r0, y1))]
    verts = [p for s in range(segs + 1) for p in ring(a0 + (a1 - a0) * s / segs)]
    faces = [(4 * s + i, 4 * s + (i + 1) % 4, 4 * (s + 1) + (i + 1) % 4, 4 * (s + 1) + i) for s in range(segs) for i in range(4)]
    faces += [(3, 2, 1, 0), tuple(4 * segs + i for i in range(4))]
    acc.solid(verts, faces)


def receiver_base(A):
    """Collar under the dome: bearing ring with braced shoes, 8 equipment bays (recessed louvred grilles alternating with
    seamed access covers), a narrow service walkway with railing, and a pipe junction facing the shore duct."""
    rc = DOME_R + .6                                     # collar face radius
    y_low, y_mid0, y_mid1, y_top = DECK_Y - .2, 9.5, 17.5, DOME_Y - 1.2
    rb = rc - .7                                         # recess back: bays sit 0.7 m deep
    cyl(A["collar"], 0, 0, rc, y_low, y_mid0, 64)        # lower band (junction, walkway): blue-grey silver
    cyl(A["collar"], 0, 0, rc, y_mid1, y_top, 64)        # upper band (brace plates)
    cyl(A["recess"], 0, 0, rb, y_mid0 - .05, y_mid1 + .05, 64)
    # bearing ring on top: deeper and taller than before, bevelled
    r_out, depth, y0, y1 = DOME_R + 2.2, 2.8, y_top, DOME_Y + .8
    sweep(A["frame"], lambda k: circle_pts(0, 0, r_out, 64, k),
          [(0, y0 + .3), (.3, y0), (depth, y0), (depth, y1), (.3, y1), (0, y1 - .3)], caps=(False, False), closed=True)
    for i in range(16):  # diagonal braces: base plate on the upper band, strut, shoe under the ring
        a = 2 * math.pi * (i + .5) / 16
        t, n = (-math.sin(a), math.cos(a)), (math.cos(a), math.sin(a))
        yp = y_mid1 + .7
        obox(A["frame"], ((rc + .14) * n[0], yp, (rc + .14) * n[1]), (1.8, 2.0, .28), t, n)
        shoe = ((r_out - .35) * n[0], y0 - .25, (r_out - .35) * n[1])
        obox(A["frame"], shoe, (1.2, .5, 1.2), t, n)
        pipe(A["frame"], [((rc + .3) * n[0], yp - .4, (rc + .3) * n[1]), (shoe[0], shoe[1] - .2, shoe[2])], .34, 8)
    # equipment bays: sector k even = access covers, odd = louvred grille; pilasters between them
    phi = JUNCTION_A
    pil = .5 / rc                                        # pilaster half width (rad)
    gap = .08 / rc                                       # cover seam (rad)
    for k in range(8):
        a0, a1 = phi + (k - .5) * math.pi / 4, phi + (k + .5) * math.pi / 4
        arc_slab(A["collar"], rb, rc + .05, a1 - pil, a1 + pil, y_mid0, y_mid1, 1)
        b0, b1 = a0 + pil, a1 - pil
        if k % 2 == 0:
            for c in range(3):
                c0, c1 = b0 + (b1 - b0) * c / 3 + gap / 2, b0 + (b1 - b0) * (c + 1) / 3 - gap / 2
                for ya, yb in ((y_mid0, 13.5), (13.5, y_mid1)):
                    arc_slab(A["frame"], rb - .03, rc + .02, c0, c1, ya + .04, yb - .04, 3)  # seated in the back wall
        else:
            for s in range(14):
                ys = y_mid0 + .45 + s * (y_mid1 - y_mid0 - .9) / 13
                arc_slab(A["grille"], rb, rb + .4, b0, b1, ys - .08, ys + .08, 6)
            am = (b0 + b1) / 2
            arc_slab(A["grille"], rb, rb + .45, am - .15 / rc, am + .15 / rc, y_mid0, y_mid1, 1)
    # narrow service walkway on the lower band, brackets under it, two-rail railing
    w_in, w_out, wy = rc, rc + 1.2, 5.8
    sweep(A["frame"], lambda k: circle_pts(0, 0, w_out, 96, k), [(0, wy), (1.2, wy), (1.2, wy + .3), (0, wy + .3)],
          caps=(False, False), closed=True)
    for i in range(24):
        a = 2 * math.pi * i / 24
        pipe(A["frame"], [(w_in * math.cos(a), wy - 1.4, w_in * math.sin(a)),
                          ((w_out - .15) * math.cos(a), wy, (w_out - .15) * math.sin(a))], .1, 4)
    rr = w_out - .08
    for i in range(48):
        a = 2 * math.pi * i / 48
        pipe(A["frame"], [(rr * math.cos(a), wy + .3, rr * math.sin(a)), (rr * math.cos(a), wy + 1.4, rr * math.sin(a))], .05, 4)
    for yy in (wy + .85, wy + 1.4):
        pipe(A["frame"], [(rr * math.cos(2 * math.pi * i / 96), yy, rr * math.sin(2 * math.pi * i / 96)) for i in range(97)],
             .05, 4)
    # pipe junction facing the shore duct: wall plate, three flanged pipes over the walkway, manifold on the deck
    R, L = (math.cos(phi), math.sin(phi)), (-math.sin(phi), math.cos(phi))
    P = lambda r, y, l: (R[0] * r + L[0] * l, y, R[1] * r + L[1] * l)
    obox(A["frame"], P(rc + .15, 8.0, 0), (4.2, 2.8, .3), L, R)
    yj, rd = 8.2, rc + 2.4
    for l in (-1.25, 0.0, 1.25):
        pipe(A["frame"], arc_path([P(rc + .2, yj, l), P(rd, yj, l), P(rd, DECK_Y + 1.0, l)], .9), .38, 10)
        pipe(A["frame"], [P(rc + .3, yj, l), P(rc + .65, yj, l)], .62, 12)           # wall flange
        pipe(A["frame"], [P(rd, 6.3, l), P(rd, 6.65, l)], .62, 12)                   # riser flange
        obox(A["glow"], P(rc + .32, yj + .95, l + .45), (.22, .22, .12), L, R)       # lights by the flanges
        obox(A["glow"], P(rd + .66, 6.47, l), (.22, .22, .1), L, R)
    obox(A["frame"], P(rd, DECK_Y + .5, 0), (4.2, 1.0, 1.6), L, R)                   # manifold box
    for l in (-1.6, 1.6):
        obox(A["glow"], P(rd + .84, DECK_Y + .65, l), (.25, .25, .1), L, R)


def frame_at(ox, oz, F):
    """Local frame at (ox, oz) on the waterline: Lp(f, y, s) -> three.js point, f along F, s = F turned 90° (xz)."""
    Sv = (-F[1], F[0])
    return (lambda f, y, s: (ox + F[0] * f + Sv[0] * s, y, oz + F[1] * f + Sv[1] * s)), F, Sv


def shore_frame():
    """Shore-station frame: f seaward (toward the flower), s along the shore, origin at SHORE on the waterline.
    Returns Lp(f, y, s) -> three.js point, and the f / s unit vectors in the xz plane."""
    sx, sz = SHORE
    d = norm((sx, 0, sz))
    return frame_at(sx, sz, (-d[0], -d[2]))


def room_frame(Lp, Sv):
    """Machine-room frame: its f runs along the shore (+s, toward the pipe end), its s points landward."""
    o = Lp(ROOM_F, 0, ROOM_S)
    return frame_at(o[0], o[2], Sv)


def duct(A, Lp, Lr):
    """Cyan-blue duct: up out of the stem foot, along the bay floor to the shore, along the shore under the water,
    up past the platform end and level into the flange on the machine room's arched front (Lr: room frame).
    Joint collars every ~7 m and at the two drop elbows, thin dark seams between collars."""
    corners = [(0, -6.0, 0), (0, -10.0, 0), Lp(ROOM_F, RUN_Y, TURN_S), Lp(ROOM_F, RUN_Y, DROP_S),
               Lp(ROOM_F, PIPE_Y, DROP_S), Lr(4.0, PIPE_Y, 0)]
    path = arc_path(corners, [4.0, 14.0, 4.5, 4.5], 10)
    pipe(A["duct"], path, PIPE_R, 20)
    run, total, marks = 0.0, 0.0, []
    for a, b in zip(path, path[1:]):
        ln = math.dist(a, b)
        u = norm(tuple(y - x for x, y in zip(a, b)))
        while run < ln:
            marks.append((add(a, u, run), u, total + run))
            run += 3.5
        run -= ln
        total += ln
    for i, (c, u, at) in enumerate(marks):
        if at < 8 or at > total - 9:      # inside the stem / inside the room
            continue
        if i % 2 == 0:                    # joint collar every 7 m
            pipe(A["sub_frame"], [add(c, u, -.35), add(c, u, .35)], PIPE_R + .25, 20)
        else:                             # seam between collars
            pipe(A["duct_seam"], [add(c, u, -.05), add(c, u, .05)], PIPE_R + .03, 20)
    for k in (3, 4):                      # collars at both ends of the two drop elbows
        cnr, prev, nxt = corners[k], corners[k - 1], corners[k + 1]
        for o in (prev, nxt):
            u = norm(tuple(x - y for x, y in zip(o, cnr)))
            c = add(cnr, u, 4.9)
            pipe(A["sub_frame"], [add(c, u, -.4), add(c, u, .4)], PIPE_R + .3, 20)


def wheel(acc, P, r):
    """Valve handwheel: rim of radius r and two spokes in the plane P(u, v) (P maps plane offsets to a point)."""
    rim = [P(r * math.cos(2 * math.pi * k / 12), r * math.sin(2 * math.pi * k / 12)) for k in range(13)]
    pipe(acc, rim, .05, 4)
    for du, dv in ((r, 0), (0, r)):
        pipe(acc, [P(-du, -dv), P(du, dv)], .035, 4)


def side_elevation(A, box, sg, hw, FY, WT, bays):
    """One side wall of the machine room, bay by bay between the columns. Every bay is a dark backing with seamed wall
    panels round one opening: 'window' (deep frame, mullions, transom, glass, sill), 'door' (frame, blue-grey leaf,
    handle, kick plate, light) or 'louvre' (frame and blades). sg picks the side (s = sg * hw)."""
    sw = lambda depth: sg * (hw + depth)              # s of a layer depth metres outside the wall line

    def panels(fl, fh, yl, yh):
        if fh - fl < .05 or yh - yl < .05:
            return
        box(A["pav_core"], (fl + fh) / 2, (yl + yh) / 2, sw(-.1), fh - fl, yh - yl, .08)       # backing
        nf, ny = max(1, round((fh - fl) / 1.25)), max(1, round((yh - yl) / 2.0))
        for i in range(nf):
            for j in range(ny):
                a, b = fl + (fh - fl) * i / nf, fl + (fh - fl) * (i + 1) / nf
                c, d = yl + (yh - yl) * j / ny, yl + (yh - yl) * (j + 1) / ny
                box(A["pav_wall"], (a + b) / 2, (c + d) / 2, sw(.05), b - a - .04, d - c - .04, .22)  # warm, 4 cm seams

    def skirting(fl, fh):                              # dark blue-grey kick band proud of the panels
        if fh - fl > .05:
            box(A["pav_trim"], (fl + fh) / 2, FY + SKIRT / 2, sw(.2), fh - fl, SKIRT, .12)

    m, dp = .18, .5                                    # frame member width and depth (through the wall)

    def frame(o0, o1, y0, y1, sill=True):
        box(A["pav_trim"], o0 + m / 2, (y0 + y1) / 2, sw(0), m, y1 - y0, dp)
        box(A["pav_trim"], o1 - m / 2, (y0 + y1) / 2, sw(0), m, y1 - y0, dp)
        box(A["pav_trim"], (o0 + o1) / 2, y1 - m / 2, sw(0), o1 - o0, m, dp)
        if sill:
            box(A["pav_trim"], (o0 + o1) / 2, y0 + m / 2, sw(.08), o1 - o0 + .2, m, dp + .16)   # projecting sill

    for fa, fb, kind in bays:
        fl, fh = fa + .275, fb - .275
        if kind == "window":
            o0, o1, y0, y1 = fl + .2, fh - .2, 3.4, 6.6
        elif kind == "door":
            c = (fl + fh) / 2
            o0, o1, y0, y1 = c - .8, c + .8, FY, 4.4
        else:
            o0, o1, y0, y1 = fl + .25, fh - .25, 2.6, 6.8
        if kind == "window":
            # wall under the window: seamed warm panels, a recessed service hatch at the end next to the interior
            # cabinets (low-f end), clean wall toward the pipe-end corner
            h0, h1, hy0, hy1 = fl + .3, fl + 1.2, FY + SKIRT + .1, FY + SKIRT + 1.05
            panels(fl, h0, FY, y0)
            panels(h1, fh, FY, y0)
            panels(h0, h1, FY, hy0)
            panels(h0, h1, hy1, y0)
            box(A["pav_core"], (h0 + h1) / 2, (hy0 + hy1) / 2, sw(-.22), h1 - h0, hy1 - hy0, .06)  # recess back
            box(A["pav_door"], (h0 + h1) / 2, (hy0 + hy1) / 2, sw(-.12), h1 - h0 - .16, hy1 - hy0 - .16, .06)
            frame(h0, h1, hy0, hy1, sill=False)
            box(A["pav_trim"], (h0 + h1) / 2, hy0 + .05, sw(0), h1 - h0, .1, dp)
            for k in range(4):                         # small louvre in the hatch leaf
                box(A["pav_trim"], (h0 + h1) / 2, hy1 - .25 - .1 * k, sw(-.07), h1 - h0 - .4, .04, .06)
            box(A["pav_core"], h1 - .25, (hy0 + hy1) / 2 - .1, sw(-.05), .06, .2, .08)    # handle
            skirting(fl, fh)
        else:
            panels(fl, fh, FY, y0)
            if kind == "door":
                skirting(fl, o0)
                skirting(o1, fh)
            else:
                skirting(fl, fh)
        panels(fl, o0, y0, y1)
        panels(o1, fh, y0, y1)
        panels(fl, fh, y1, WT)
        frame(o0, o1, y0, y1, sill=kind != "door")
        w = o1 - o0 - 2 * m
        if kind == "window":
            box(A["pav_glass"], (o0 + o1) / 2, (y0 + y1) / 2, sw(-.05), w, y1 - y0 - 2 * m, .03)
            for q in (1 / 3, 2 / 3):
                box(A["pav_trim"], o0 + m + w * q, (y0 + y1) / 2, sw(0), .12, y1 - y0 - 2 * m, .32)
            box(A["pav_trim"], (o0 + o1) / 2, 5.6, sw(0), w, .12, .32)                     # transom
        elif kind == "door":
            box(A["pav_door"], (o0 + o1) / 2, (y0 + y1 - m) / 2, sw(-.12), w, y1 - y0 - m, .08)
            box(A["pav_core"], o1 - m - .3, 3.0, sw(-.04), .08, .35, .1)                  # handle
            box(A["pav_trim"], (o0 + o1) / 2, y0 + .15, sw(-.07), w, .3, .02)              # kick plate
            box(A["pav_glow"], (o0 + o1) / 2, y1 + .25, sw(.2), .5, .12, .1)              # door light, on the panel face
        else:
            nb = int((y1 - y0 - 2 * m) / .3)
            for k in range(nb):
                box(A["pav_louvre"], (o0 + o1) / 2, y0 + m + .15 + .3 * k, sw(0), w, .07, .42)
            box(A["pav_trim"], (o0 + o1) / 2, (y0 + y1) / 2, sw(0), .12, y1 - y0 - 2 * m, .45)


def shore_station(A, Lp, F, Sv):
    """Shore machine room (room frame: f along its long axis toward the pipe end, s across): floor plate, columns, low
    walls, arched silver roof with glazed crown, exposed ribs; pipe-entry wall with a three-layer flange and saddles;
    standing pipe sets inside; service steps up to both side doors."""
    t, n = F, Sv                                   # obox axes: size = (along f, height, along s)
    box = lambda acc, f, y, s, sf, sy, ss: obox(acc, Lp(f, y, s), (sf, sy, ss), t, n)
    FY = 1.8                                       # room floor (platform top QY)
    f0, f1, hw = -4.0, 10.0, 5.5                   # room back / front face, half width
    # room floor plate (a 1 m apron round the walls) and a service step up to each side door
    box(A["pav_frame"], (f0 + f1) / 2, (QY + FY) / 2, 0, f1 - f0 + 2.0, FY - QY, 2 * hw + 2.0)
    for sg in (-1, 1):
        box(A["pav_frame"], 4.75, QY + .075, sg * (hw + 1.45), 2.6, .15, .9)                 # lower tread
        box(A["pav_trim"], 4.75, QY + .155, sg * (hw + 1.88), 2.6, .02, .05)                  # tread nosing
        box(A["pav_trim"], 4.75, FY - .005, sg * (hw + .97), 2.0, .02, .05)                   # apron nosing
        for fs in (3.35, 6.15):                                                                # short grab rails
            pts = [Lp(fs, QY + .15, sg * (hw + 1.75)), Lp(fs, FY, sg * (hw + .85))]
            for p in pts:
                pipe(A["pav_frame"], [p, (p[0], p[1] + .95, p[2])], .04, 6)
            pipe(A["pav_frame"], [(p[0], p[1] + .95, p[2]) for p in pts], .04, 6)
    # columns with feet and capitals (the ribs bear on the capitals), wall plates, side elevations
    cols = [f0, -.5, 3.0, 6.5, f1]
    spring, WT, CT = 6.6, 8.0, 8.45                # gable spring, side-wall top, column top under the rib
    for f in cols:
        for s in (-hw, hw):
            box(A["pav_frame"], f, (FY + CT) / 2, s, .55, CT - FY, .55)
            box(A["pav_frame"], f, FY + .12, s, 1.0, .24, 1.0)              # foot plate
            box(A["pav_frame"], f, FY + .39, s, .75, .3, .75)               # plinth
            box(A["pav_frame"], f, CT + .11, s, .85, .22, .85)              # capital
            sg = 1 if s > 0 else -1                                          # bracket out to the rib's eave leg
            box(A["pav_frame"], f, 7.25, sg * (hw + .6), .3, .35, 1.3)
    for sg in (-1, 1):
        box(A["pav_frame"], (f0 + f1) / 2, WT + .15, sg * hw, f1 - f0 + .55, .3, .45)  # wall plate
        side_elevation(A, box, sg, hw, FY, WT,
                       [(f0, -.5, "louvre"), (-.5, 3.0, "louvre"), (3.0, 6.5, "door"), (6.5, f1, "window")])
    # back wall with glazed tympanum
    box(A["pav_frame"], f0 - .1, (FY + spring) / 2, 0, .3, spring - FY, 2 * hw)
    arch = lambda a, f, inset=0.0: Lp(f, 6.4 + (3.8 - inset) * math.sin(math.pi * a), -(6.5 - inset) * math.cos(math.pi * a))
    tym = [arch(k / 12, f0 - .1, .9) for k in range(13)]
    surf(A["pav_glass"], tym, [tuple(range(13))], [(-F[0], 0, -F[1])])
    # front: pipe-entry wall with a square cut-out the flange covers, flange, bolts, saddles
    cut, jamb = 1.8, .8                                 # pipe portal: jambs and lintel round the cut-out
    for sg in (-1, 1):
        box(A["pav_frame"], f1, (FY + spring) / 2, sg * (cut + jamb / 2), .4, spring - FY, jamb)
        box(A["pav_frame"], f1, FY + .6, sg * (cut + jamb + hw) / 2, .3, 1.2, hw - cut - jamb)   # low parapet, open above
    box(A["pav_frame"], f1, (PIPE_Y + cut + spring) / 2, 0, .4, spring - PIPE_Y - cut, 2 * cut)
    ax = lambda f: Lp(f, PIPE_Y, 0)
    for fa, fb, r in ((f1 + .2, f1 + .6, PIPE_R + 1.1), (f1 + .6, f1 + .95, PIPE_R + .75), (f1 + .95, f1 + 1.25, PIPE_R + .45)):
        pipe(A["pav_frame"], [ax(fa), ax(fb)], r, 28)
    for cnt, rr, fa in ((16, PIPE_R + .9, f1 + .6), (12, PIPE_R + .6, f1 + .95)):  # two hex bolt circles
        for k in range(cnt):
            a = 2 * math.pi * (k + .5) / cnt
            pipe(A["pav_core"], [Lp(fa - .05, PIPE_Y + rr * math.sin(a), rr * math.cos(a)),
                                 Lp(fa + .17, PIPE_Y + rr * math.sin(a), rr * math.cos(a))], .13, 6)
    pipe(A["pav_frame"], [ax(f1 - .7), ax(f1 - .15)], PIPE_R + .45, 28)  # wall sleeve on the inside face
    for sg in (-1, 1):                                  # flange support: side gussets and raking struts to the quay
        box(A["pav_frame"], f1 + .9, (FY + PIPE_Y) / 2, sg * (PIPE_R + 1.2), 1.4, PIPE_Y - FY, .25)
        pipe(A["pav_frame"], [Lp(f1 + 2.4, QY, sg * (PIPE_R + 1.2)), Lp(f1 + 1.4, PIPE_Y - .5, sg * (PIPE_R + 1.2))], .14, 6)
        box(A["pav_frame"], f1 + 2.4, QY + .1, sg * (PIPE_R + 1.2), .6, .2, .6)
    bot = PIPE_Y - PIPE_R
    for f, y0 in ((f1 + 2.6, QY), (7.0, FY)):          # saddle outside on the quay, and inside on the floor
        box(A["pav_frame"], f, y0 + .1, 0, 1.6, .2, 3.6)
        box(A["pav_frame"], f, (y0 + .2 + bot) / 2, 0, .9, bot - y0 - .2 + .05, 3.2)
        for s in (-PIPE_R - .05, PIPE_R + .05):         # cheeks bite into the pipe and stand on the cradle
            box(A["pav_frame"], f, (bot + PIPE_Y) / 2, s, .9, PIPE_Y - bot + .2, .3)
    for s in (-cut - jamb / 2, cut + jamb / 2):         # entry lights on the portal jambs
        box(A["pav_glow"], f1 + .25, PIPE_Y + 1.2, s, .1, .3, .3)
    # roof: solid bays alternate with translucent skylight bands (eave strips stay solid); exposed ribs on every
    # column line and both ends; purlins; eave fascia trims
    rf0, rf1, segs = f0 - 1.0, f1 + 1.0, 12
    stops = [rf0] + cols + [rf1]
    for b, (fa, fb) in enumerate(zip(stops, stops[1:])):
        for k in range(segs):
            a0, a1 = k / segs, (k + 1) / segs
            acc = A["pav_glass"] if b in (2, 4) and 2 <= k < 10 else A["pav_roof"]
            out = [arch(a0, fa), arch(a1, fa), arch(a1, fb), arch(a0, fb)]
            inn = [arch(a0, fa, .25), arch(a1, fa, .25), arch(a1, fb, .25), arch(a0, fb, .25)]
            acc.solid(out + inn, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])
    for f in cols + [rf0, rf1]:                                                       # matte silver ribs
        pipe(A["pav_rib"], [arch(k / 16, f, -.3) for k in range(17)], .3, 6)
    for a in (3 / 12, .5, 9 / 12):
        pipe(A["pav_rib"], [arch(a, rf0, -.15), arch(a, rf1, -.15)], .18, 6)
    for sg in (-1, 1):
        box(A["pav_rib"], (rf0 + rf1) / 2, 6.3, sg * 6.55, rf1 - rf0 + .1, .5, .3)      # eave fascia
    # dark blue-grey skirting on the front parapets and the back wall (the side walls get theirs per bay)
    for sg in (-1, 1):
        box(A["pav_trim"], f1 + .2, FY + SKIRT / 2, sg * (cut + jamb + hw) / 2, .12, SKIRT, hw - cut - jamb)
    box(A["pav_trim"], f0 - .3, FY + SKIRT / 2, 0, .12, SKIRT, 2 * hw)
    # behind the big windows: branch take-offs from the trunk with valves, floor flanges and control cabinets
    pipe(A["pav_frame"], [ax(7.7), ax(8.7)], PIPE_R + .25, 28)                       # tee body on the trunk
    for sg in (-1, 1):
        sb, sv = sg * 3.7, sg * 2.8                    # vertical leg (front layer), inline valve
        pipe(A["pav_pipe"], arc_path([Lp(8.2, PIPE_Y, sg * 1.2), Lp(8.2, PIPE_Y, sb), Lp(8.2, FY, sb)], .8, 6), .42, 14)
        pipe(A["pav_frame"], [Lp(8.2, PIPE_Y, sg * 1.85), Lp(8.2, PIPE_Y, sg * 2.05)], .65, 14)
        pipe(A["pav_frame"], [Lp(8.2, FY, sb), Lp(8.2, FY + .22, sb)], .7, 14)          # floor flange
        box(A["pav_core"], 8.2, PIPE_Y, sv, .8, .8, .6)                                  # gate valve body
        pipe(A["pav_core"], [Lp(8.2, PIPE_Y + .3, sv), Lp(8.2, 5.65, sv)], .08, 6)
        wheel(A["pav_core"], lambda u, v: Lp(8.2 + u, 5.65, sv + v), .42)
        box(A["pav_core"], 8.2, 3.0, sb, .7, .7, .7)                                     # valve on the vertical leg
        pipe(A["pav_core"], [Lp(8.2, 3.0, sb), Lp(8.2, 3.0, sb + sg * .75)], .07, 6)
        wheel(A["pav_core"], lambda u, v: Lp(8.2 + u, 3.0 + v, sb + sg * .75), .32)
        for fc in (6.95, 9.3):                                                           # control cabinets (back layer)
            box(A["pav_door"], fc, FY + 1.1, sg * 2.55, .9, 2.2, .6)
            box(A["pav_core"], fc, FY + 1.1, sg * 2.86, .03, 1.9, .03)                    # door seam
            box(A["pav_core"], fc + .2, FY + 1.1, sg * 2.88, .05, .3, .06)                # handle
            for i, dy in enumerate((.85, .7, .55)):
                box(A["pav_glow"], fc - .25 + .12 * i, FY + 1.1 + dy, sg * 2.875, .07, .07, .05)  # proud of the seam
    # inside: the duct ends in a header box; four standing pipe sets with flanges and valve wheels; top header; tanks
    box(A["pav_core"], 3.0, (FY + PIPE_Y + PIPE_R + .3) / 2, 0, 2.2, PIPE_Y + PIPE_R + .3 - FY, 3.8)
    for s in (-3.3, -1.1, 1.1, 3.3):
        base = 1.2
        pipe(A["pav_pipe"], arc_path([Lp(base, FY, s), Lp(base, 6.0, s), Lp(base + 1.5, 6.0, s)], .6, 6), .4, 12)
        for y in (3.0, 5.0):
            pipe(A["pav_frame"], [Lp(base, y, s), Lp(base, y + .18, s)], .62, 12)
        rim = [Lp(base + .75 + .0, 4.1 + .45 * math.sin(2 * math.pi * k / 12), s + .45 * math.cos(2 * math.pi * k / 12))
               for k in range(13)]
        pipe(A["pav_core"], rim, .06, 4)
        pipe(A["pav_core"], [Lp(base + .3, 4.1, s), Lp(base + .78, 4.1, s)], .08, 4)          # stem into the pipe
        for ds, dy in ((.47, 0), (0, .47)):                                                     # spokes to the rim
            pipe(A["pav_core"], [Lp(base + .75, 4.1 - dy, s - ds), Lp(base + .75, 4.1 + dy, s + ds)], .04, 4)
    pipe(A["pav_pipe"], [Lp(2.7, 6.0, -3.9), Lp(2.7, 6.0, 3.9)], .5, 12)
    for s in (-3.0, 3.0):
        cyl(A["pav_frame"], *(lambda p: (p[0], p[2]))(Lp(-2.4, 0, s)), 1.0, FY, FY + 3.2, 16)
        cyl(A["pav_glow"], *(lambda p: (p[0], p[2]))(Lp(-2.4, 0, s)), 1.03, FY + 2.2, FY + 2.4, 16)


def platform(A, Lp):
    """Short platform jutting from the promenade into the water (shore frame). Light-grey paving tiles on a grout
    bed, a coping kerb with a dark drip fascia on the three water edges, a slim rail with low bollard lights along
    them (open where the duct drops past the pipe end), a small planter on the promenade side, and the rock
    revetment at the old spacing (≈1.75 m per rock, three rows), kept clear of the duct drop."""
    import random
    rnd = random.Random(7)
    (fa, fb), (sa, sb) = PLAT_F, PLAT_S
    _, F_, S_ = shore_frame()
    box = lambda acc, f, y, s, sf, sy, ss: obox(acc, Lp(f, y, s), (sf, sy, ss), F_, S_)
    cp = .45                                            # coping width on the water edges
    box(A["pav_base"], (fa + fb) / 2, (QY - .04 - 3.5) / 2, (sa + sb) / 2, fb - fa, QY - .04 + 3.5, sb - sa)  # body
    # paving: 1.2 m tiles, 3 cm grout joints, none under the room's floor plate or the planter
    room_f, room_s = (ROOM_F - 6.5, ROOM_F + 6.5), (ROOM_S - 5.0, ROOM_S + 11.0)
    plant_f, plant_s = (fa + .3, fa + 2.2), (sa + 1.2, sa + 7.2)
    inside = lambda f, s, r_f, r_s: r_f[0] < f < r_f[1] and r_s[0] < s < r_s[1]
    nf, ns = round((fb - cp - fa) / 1.2), round((sb - sa - 2 * cp) / 1.2)
    tf, ts = (fb - cp - fa) / nf, (sb - sa - 2 * cp) / ns
    for i in range(nf):
        for j in range(ns):
            f, s = fa + tf * (i + .5), sa + cp + ts * (j + .5)
            if inside(f, s, room_f, room_s) or inside(f, s, plant_f, plant_s):
                continue
            box(A["pav_tile"], f, QY - .02, s, tf - .03, .04, ts - .03)
    # coping kerb on the three water edges, dark drip fascia below it
    for f, s, lf, ls in ((fb - cp / 2, (sa + sb) / 2, cp, sb - sa), ((fa + fb) / 2, sa + cp / 2, fb - fa, cp),
                         ((fa + fb) / 2, sb - cp / 2, fb - fa, cp)):
        box(A["pav_tile"], f, QY + .02, s, lf, .12, ls)
    box(A["pav_trim"], fb + .03, QY - .3, (sa + sb) / 2, .06, .4, sb - sa + .06)
    for s in (sa - .03, sb + .03):
        box(A["pav_trim"], (fa + fb) / 2, QY - .3, s, fb - fa, .4, .06)
    # slim rail on the coping: posts every ~1.5 m, a top rail and two thin rails; gap at the pipe end for the duct
    gap = (ROOM_F - 3.0, ROOM_F + 3.0)

    def rail(pts):
        for p in pts:
            pipe(A["pav_frame"], [p, (p[0], p[1] + 1.1, p[2])], .035, 6)
        for h, r in ((1.1, .045), (.7, .02), (.35, .02)):
            pipe(A["pav_frame"], [(p[0], p[1] + h, p[2]) for p in pts], r, 6)
    y0, ef, es0, es1 = QY + .08, fb - cp / 2, sa + cp / 2, sb - cp / 2
    rail([Lp(fa + .2 + (ef - fa - .2) * k / 12, y0, es0) for k in range(13)])
    rail([Lp(ef, y0, es0 + (es1 - es0) * k / 16) for k in range(17)])
    rail([Lp(ef - (ef - gap[1]) * k / 4, y0, es1) for k in range(5)])
    rail([Lp(gap[0] - (gap[0] - fa - .2) * k / 6, y0, es1) for k in range(7)])
    # low bollard lights just inside the rail: corners, mid-edge and both sides of the pipe gap
    for f, s in ((ef - .7, es0 + .7), (ef - .7, (es0 + es1) / 2), (ef - .7, es1 - .7), (fa + 1.0, es0 + .7),
                 (gap[0] - .6, es1 - .7), (gap[1] + .6, es1 - .7), (fa + 1.0, es1 - .7)):
        cyl(A["pav_frame"], *(lambda p: (p[0], p[2]))(Lp(f, 0, s)), .14, QY, QY + .8, 12)
        cyl(A["pav_glow"], *(lambda p: (p[0], p[2]))(Lp(f, 0, s)), .15, QY + .62, QY + .74, 12)
        cyl(A["pav_frame"], *(lambda p: (p[0], p[2]))(Lp(f, 0, s)), .2, QY + .8, QY + .86, 12)   # cap
    # planter on the promenade side, by the room's back end: kerb, soil, shrubs and one small tree
    (pa, pb), (qa, qb) = plant_f, plant_s
    for f, s, lf, ls in (((pa + pb) / 2, qa, pb - pa, .2), ((pa + pb) / 2, qb, pb - pa, .2),
                         (pa, (qa + qb) / 2, .2, qb - qa), (pb, (qa + qb) / 2, .2, qb - qa)):
        box(A["pav_frame"], f, QY + .2, s, lf, .4, ls)
    box(A["pav_soil"], (pa + pb) / 2, QY + .3, (qa + qb) / 2, pb - pa - .2, .1, qb - qa - .2)
    for k in range(7):
        c = Lp(pa + .6 + (pb - pa - 1.2) * (k % 2), QY + .6, qa + .7 + (qb - qa - 1.4) * k / 6)
        blob(A["pav_plant"], c, (rnd.uniform(.55, .75), rnd.uniform(.45, .6), rnd.uniform(.55, .75)), 1,
             rnd.uniform(0, 9), .2)
    tc = Lp((pa + pb) / 2, 0, (qa + qb) / 2)
    cyl(A["pav_soil"], tc[0], tc[2], .11, QY + .3, QY + 2.3, 8)
    blob(A["pav_plant"], (tc[0], QY + 2.9, tc[2]), (1.0, .9, 1.0), 2, 3.0, .2)
    # rock revetment on the three water edges (three rows stepping down), clear of the duct drop at the pipe end
    def rocks(k, f, s):
        c = Lp(f, .5 - 1.4 * k, s)
        blob(A["rock"], c, (rnd.uniform(.9, 1.3), rnd.uniform(.7, 1.0), rnd.uniform(.9, 1.3)), 2 if k == 0 else 1,
             rnd.uniform(0, 9), .22)  # rows above water (k 0) get the finer mesh
    for k in range(3):
        out = .9 + 1.6 * k + rnd.uniform(-.3, .3)
        for j in range(15):                              # seaward edge
            rocks(k, fb + out, sa - 1.0 + (sb - sa + 2.0) * j / 14 + rnd.uniform(-.4, .4))
        for s_edge, sg in ((sa, -1), (sb, 1)):           # both ends
            for j in range(11):
                f = fa + .5 + (fb - fa - .5) * j / 10 + rnd.uniform(-.4, .4)
                if sg > 0 and abs(f - ROOM_F) < 3.0:
                    continue
                rocks(k, f, s_edge + sg * (.9 + 1.6 * k + rnd.uniform(-.3, .3)))


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
    receiver_base(A)
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
            topf, botf = petal(A["panel"], A["shell"], petal_ring(ri, k), th)
            for v in (-1, 1):
                pipe(A["frame"], [topf(u / 12, v * .98) for u in range(13)], .2, 5)
            petal_back_details(A, topf, botf)
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
    Lp, F, Sv = shore_frame()
    Lr, Fr, Sr = room_frame(Lp, Sv)
    duct(A, Lp, Lr)
    platform(A, Lp)
    shore_station(A, Lr, Fr, Sr)
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
    edge = (x % c < 3) | (x % c > c - 4)                    # 6 px silver frame between cells (≈ 6 cm), material round 1
    bus = (x % (c // 4) == 0) & ~edge                       # faint busbars, 4 per cell each way
    line = edge[None, :] | edge[:, None]
    busm = (bus[None, :] | bus[:, None]) & ~line
    cell = (x // c)[None, :] + 2 * (x // c)[:, None]        # cell id 0..3 for a slight tone variation
    blue = np.array([.33, .42, .52])                         # sRGB blue-grey
    tone = np.array([1.0, .96, 1.03, .98])[cell][..., None]
    col = blue * tone
    # owner 2026-11-18: keep the material-round-1 grid (width and contrast), not the toned-down detail-round grid
    col = np.where(busm[..., None], col * .85 + .15 * np.array([.62, .68, .75]), col)
    col = np.where(line[..., None], np.array([.84, .86, .88]), col)
    rough = np.where(line, .22, .30)
    metal = np.where(line, .95, .35)
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


def petal_plate_image():
    """Outer guard plates, 2 x 2 per 512 px tile: slightly different silver-grey tones, recessed-looking seams (dark
    groove with a lit edge on one side and a shade line on the other) and fastener dots along every seam."""
    n, h = 512, 256
    y, x = np.mgrid[0:n, 0:n]
    tones = np.array([[.86, .87, .89], [.79, .81, .84], [.82, .83, .86], [.76, .78, .82]])
    col = tones[(x // h) + 2 * (y // h)].astype(float)
    dx, dy = np.minimum(x % h, h - 1 - x % h), np.minimum(y % h, h - 1 - y % h)
    d = np.minimum(dx, dy)
    groove = d < 2
    lit = ((x % h == 2) & (dx <= dy)) | ((y % h == 2) & (dy <= dx))
    shade = ((x % h == h - 3) & (dx <= dy)) | ((y % h == h - 3) & (dy <= dx))
    col = np.where(shade[..., None], col * .8, col)
    col = np.where(lit[..., None], np.minimum(col * 1.12, 1.0), col)
    col = np.where(groove[..., None], np.array([.32, .35, .40]), col)
    dots = np.zeros((n, n), bool)
    for c in range(16, n, 32):
        for e in (8, h - 9, h + 8, n - 9):
            dots |= (x - c) ** 2 + (y - e) ** 2 <= 3
            dots |= (y - c) ** 2 + (x - e) ** 2 <= 3
    col = np.where(dots[..., None], np.array([.52, .55, .60]), col)
    return packed("q02b_petal_plates", col, "sRGB")


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
        "shell": textured("q02b_petal_back_silver", petal_plate_image(), .3, .6),  # outer guard plates, grooved seams
        "frame": m("frame_silver", (.90, .90, .91, 1), .25, .7),         # rims, seats, arms, truss, rings, collars
        "dome": m("dome_silver_blue", (.70, .82, .97, 1), .1, .9, (.55, .72, 1, 1), .15),
        "base": textured("q02b_pontoon_segments", seams, .5, .15),      # 24 segments, seams and fasteners
        "plain": m("base_white", (.80, .81, .82, 1), .55),
        "collar": m("collar_bluegrey", (.50, .56, .64, 1), .32, .6),      # collar bands and bay pilasters
        "duct": m("duct_cyan", (.36, .66, .76, 1), .22, .55),            # sea-bed duct and the pipes in the room
        "duct_ring": m("duct_ring", (.55, .72, .80, 1), .25, .8),        # duct joint collars
        "duct_seam": m("duct_seam", (.06, .10, .13, 1), .4),             # thin seams between collars
        "quay": m("quay_stone", (.50, .49, .47, 1), .85),                # shore platform body, read as grout joints
        "pav_tile": m("paving_lightgrey", (.74, .74, .72, 1), .8),       # platform paving tiles and coping
        "pav_plant": m("planting_green", (.16, .34, .12, 1), .9),        # planter shrubs and tree crown
        "pav_soil": m("planter_soil", (.20, .15, .11, 1), .95),          # planter soil and tree trunk
        "rock": m("revetment_rock", (.46, .45, .42, 1), .95),            # revetment boulders
        "pav_roof": m("roof_white", (.92, .93, .94, 1), .35, .3),        # machine-room roof eaves
        "pav_rib": m("rib_matte_silver", (.80, .82, .85, 1), .5, .75),   # roof ribs, purlins, fascias; petal spine ribs
        "pav_wall": m("wall_warm_white", (.93, .90, .84, 1), .55),       # machine-room wall panels
        "pav_trim": m("trim_dark_bluegrey", (.17, .23, .29, 1), .45, .4),  # window frames, louvres, skirting
        "grille": m("grille_dark", (.09, .10, .12, 1), .45, .5),          # louvre slats in the collar bays
        "recess": m("recess_bluegrey", (.16, .22, .30, 1), .5, .3),        # recessed bay back wall
        "dark": m("window_band", (.04, .06, .08, 1), .25),
        "glow": m("light_cyan", (.25, .7, 1, 1), .4, 0, (.3, .78, 1, 1), 6.0),
        "aperture": m("aperture", (.85, .95, 1, 1), .2, 0, (.7, .9, 1, 1), 3.0),
        "sleeve": m("subsea_glass", (.6, .88, .9, .55), .06),
        "core": m("core_metal", (.26, .30, .33, 1), .35, .7),
        "pav_glass": m("pavilion_glass", (.62, .90, .92, .35), .05),    # pale cyan glazing
        "pav_frame": m("pavilion_frame", (.92, .92, .9, 1), .4),
        "beam_core": m("beam_core", (.85, .95, 1, 1), .5, 0, (.75, .9, 1, 1), 40.0),
        "beam_glow": m("beam_glow", (.5, .78, 1, .1), .5, 0, (.45, .72, 1, 1), 2.0),
    }


GROUPS = {
    "Q02B_Receiver": ("panel", "shell", "frame", "petal_rib", "petal_shoe", "piston", "collar", "grille", "recess", "dome", "base", "dark", "glow", "aperture"),
    "Q02B_SubseaLink": ("sleeve", "core", "sub_glow", "duct", "sub_frame", "duct_seam"),
    "Q02B_ShoreStation": ("pav_glass", "pav_frame", "pav_rib", "pav_roof", "pav_wall", "pav_trim", "pav_base", "pav_core",
                          "pav_pipe", "pav_door", "pav_louvre", "pav_glow", "pav_tile", "pav_plant", "pav_soil", "rock"),
    "Q02B_LightBeam": ("beam_core", "beam_glow"),
}
SHARED = {"sub_frame": "duct_ring", "sub_glow": "glow", "pav_base": "quay", "pav_core": "core", "pav_glow": "glow",
          "pav_pipe": "duct", "piston": "core", "pav_door": "collar", "pav_louvre": "pav_trim", "petal_rib": "pav_rib", "petal_shoe": "collar"}
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
            ob = finish_mesh(f"{gname}_{role}", A[role], M[SHARED.get(role, role)], 70 if role == "rock" else 25)
            if hasattr(A[role], "uv"):  # finish_mesh keeps vertex order, so per-vertex UVs map straight onto loops
                layer = ob.data.uv_layers.new(name="UVMap")
                for lp in ob.data.loops:
                    layer.data[lp.index].uv = A[role].uv[lp.vertex_index]
            bpy.context.scene.collection.objects.link(ob)
            ob.parent = g
            objs.append(ob)
    tris = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs}
    out = {"tris_total": sum(tris.values()), "tris_beam": sum(v for k, v in tris.items() if k.startswith("Q02B_LightBeam")),
           "objects": len(objs), "tris": tris}
    # two deliverables: with the beam (ID) and without it (ID-nobeam: the Q02B_LightBeam node and its meshes removed)
    for suffix in ("", "-nobeam"):
        if suffix:
            beam = bpy.data.objects["Q02B_LightBeam"]
            for o in list(beam.children) + [beam]:
                bpy.data.objects.remove(o, do_unlink=True)
        blend, glb = os.path.join(HERE, ID + suffix + ".blend"), os.path.join(HERE, ID + suffix + ".glb")
        bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
        for o in bpy.context.scene.objects:
            o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True,
                                  export_apply=True, export_animations=False, export_cameras=False, export_lights=False,
                                  export_extras=False)
        out["glb_bytes" + suffix.replace("-", "_")] = os.path.getsize(glb)
    print("@@JSON@@" + json.dumps(out))


main()
