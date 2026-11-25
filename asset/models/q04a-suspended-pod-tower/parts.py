"""Geometry parts and materials of the Q04-A suspended single-room tower (build_suspended_pod_tower.py).

Everything here is in Blender coordinates (z up, real metres), unlike the other builders, because the design document
is. Library parts (city-kit modules: kit_prop, leafy_tree, leaf_clump, ell) are reused through Three(), which
turns their three.js coordinates into ours. Pod local frame: origin under the envelope's centre, +y out to the window.
"""
import math
import os
import random
import sys

import bmesh
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)
for p in (MODELS, os.path.join(MODELS, "city-kit-2127")):
    if p not in sys.path:
        sys.path.insert(0, p)
import geo_helpers as G  # noqa: E402
import modules as M  # noqa: E402


# --- accumulators ------------------------------------------------------------------------------------------------------
class Acc(G.Acc):
    """geo_helpers.Acc without the three.js conversion."""

    def solid(self, verts, faces):
        vs, fs = [tuple(p) for p in verts], [tuple(f) for f in faces]
        if G.volume(vs, fs) < 0:
            fs = [f[::-1] for f in fs]
        self._push(vs, fs)

    def facing(self, verts, faces, want):
        """Open surface; every face is turned to look along want(centroid)."""
        vs, out = [tuple(p) for p in verts], []
        for f in faces:
            c = [sum(vs[i][k] for i in f) / len(f) for k in range(3)]
            n, w = G.newell([vs[i] for i in f]), want(c)
            out.append(tuple(f) if sum(a * b for a, b in zip(n, w)) >= 0 else tuple(f)[::-1])
        self._push(vs, out)


class Accs(dict):
    def __missing__(self, k):
        self[k] = Acc()
        return self[k]


class Three:
    """Writes library geometry (three.js coordinates) into an Acc at (x, y, z), turned by yaw about the vertical."""

    def __init__(self, acc, x=0.0, y=0.0, z=0.0, yaw=0.0, k=1.0):
        self.acc, self.o, self.c, self.s, self.k = acc, (x, y, z), math.cos(yaw), math.sin(yaw), k

    def d(self, p):
        x, y, z = (self.k * q for q in G.B(p))
        return x * self.c - y * self.s, x * self.s + y * self.c, z

    def tf(self, p):
        return tuple(a + b for a, b in zip(self.d(p), self.o))

    def solid(self, verts, faces):
        self.acc.solid([self.tf(p) for p in verts], faces)

    def surface(self, verts, faces, want):
        for f in faces:
            vs = [verts[i] for i in f]
            c = [sum(v[k] for v in vs) / len(vs) for k in range(3)]
            w = self.d(want(c))
            self.acc.facing([self.tf(v) for v in vs], [tuple(range(len(vs)))], lambda _c: w)


def ctx(accs, rng, x=0.0, y=0.0, z=0.0, yaw=0.0, k=1.0):
    return M.Ctx({r: Three(accs["in_" + r], x, y, z, yaw, k) for r in M.ROLES}, rng)


# --- shapes --------------------------------------------------------------------------------------------------------------
def loft(acc, sections, wrap=False, caps=True):
    verts, idx = [], []
    for s in sections:
        idx.append(list(range(len(verts), len(verts) + len(s))))
        verts += s
    m, n, faces = len(sections[0]), len(sections), []
    for i in range(n if wrap else n - 1):
        a, b = idx[i], idx[(i + 1) % n]
        faces += [(a[k], a[(k + 1) % m], b[(k + 1) % m], b[k]) for k in range(m)]
    if not wrap and caps:
        faces += [tuple(reversed(idx[0])), tuple(idx[-1])]
    acc.solid(verts, faces)


def box(acc, x0, x1, y0, y1, z0, z1):
    loft(acc, [[(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)] for z in (z0, z1)])


def obox(acc, c, size, ang=0.0):
    """Box centred c, size (along, across, up), turned ang radians about z."""
    ca, sa = math.cos(ang), math.sin(ang)
    hx, hy, hz = (s / 2 for s in size)
    loft(acc, [[(c[0] + u * ca - v * sa, c[1] + u * sa + v * ca, c[2] + w) for u, v in ((-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy))] for w in (-hz, hz)])


def circle(r, z, n, cx=0.0, cy=0.0):
    return [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n), z) for i in range(n)]


def lathe(acc, prof, n=48, cx=0.0, cy=0.0, wrap=False):
    """Solid of revolution of (r, z) points (wrap=True: a closed section, i.e. a ring)."""
    loft(acc, [circle(max(r, 1e-4), z, n, cx, cy) for r, z in prof], wrap=wrap)


def ring(acc, r0, r1, z0, z1, n=48, cx=0.0, cy=0.0):
    lathe(acc, [(r0, z0), (r1, z0), (r1, z1), (r0, z1)], n, cx, cy, wrap=True)


def skin(acc, prof, n=48, cx=0.0, cy=0.0):
    """Open surface of revolution looking outward (glass)."""
    rows = [circle(r, z, n, cx, cy) for r, z in prof]
    verts = [p for r in rows for p in r]
    faces = [(i * n + k, i * n + (k + 1) % n, (i + 1) * n + (k + 1) % n, (i + 1) * n + k) for i in range(len(rows) - 1) for k in range(n)]
    acc.facing(verts, faces, lambda c: (c[0] - cx, c[1] - cy, 0))


def sector(acc, r0, r1, a0, a1, z0, z1, step=4.0):
    """Annular sector slab (degrees)."""
    n = max(1, int(abs(a1 - a0) / step))
    secs = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        c, s = math.cos(a), math.sin(a)
        secs.append([(r0 * c, r0 * s, z0), (r1 * c, r1 * s, z0), (r1 * c, r1 * s, z1), (r0 * c, r0 * s, z1)])
    loft(acc, secs)


def _n(v):
    ln = math.sqrt(sum(c * c for c in v)) or 1.0
    return tuple(c / ln for c in v)


def _x(a, b):
    return a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]


def _at(p, u, a, w=(0, 0, 0), b=0.0):
    return tuple(p[k] + u[k] * a + w[k] * b for k in range(3))


def tangent(pts, i):
    a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
    return _n(tuple(b[k] - a[k] for k in range(3)))


def pipe(acc, pts, r0, r1=None, n=8):
    """Round tube along a polyline, parallel-transported so it never twists."""
    r1 = r0 if r1 is None else r1
    t = tangent(pts, 0)
    u = _n(_x(t, (0, 0, 1) if abs(t[2]) < .9 else (1, 0, 0)))
    secs = []
    for i, p in enumerate(pts):
        t = tangent(pts, i)
        k = sum(a * b for a, b in zip(u, t))
        u = _n(tuple(a - k * b for a, b in zip(u, t)))
        w = _x(t, u)
        r = r0 + (r1 - r0) * i / (len(pts) - 1)
        secs.append([_at(p, u, r * math.cos(2 * math.pi * j / n), w, r * math.sin(2 * math.pi * j / n)) for j in range(n)])
    loft(acc, secs)


def beam(acc, pts, w0, h0, w1, h1):
    """Chamfered box section along a path: the radial arms (the section stays upright, elbows included)."""
    d = [0.0]
    for a, b in zip(pts, pts[1:]):
        d.append(d[-1] + math.dist(a, b))
    secs, side = [], None
    for i, p in enumerate(pts):
        t = tangent(pts, i)
        if math.hypot(t[0], t[1]) > .25 or side is None:
            side = _n((t[1], -t[0], 0.0))
        up = _x(side, t)
        f = d[i] / d[-1]
        hw, hh = (w0 + (w1 - w0) * f) / 2, (h0 + (h1 - h0) * f) / 2
        c = .28 * min(hw, hh) + .02
        secs.append([_at(p, side, a, up, b) for a, b in ((hw, -hh + c), (hw, hh - c), (hw - c, hh), (-hw + c, hh), (-hw, hh - c), (-hw, -hh + c), (-hw + c, -hh), (hw - c, -hh))])
    loft(acc, secs)


def bez(p0, c, p1, n):
    return [tuple((1 - t) ** 2 * p0[k] + 2 * (1 - t) * t * c[k] + t * t * p1[k] for k in range(len(p0))) for t in (j / n for j in range(n + 1))]


def rr(hw, z0, z1, r, n=4):
    """Rounded rectangle outline in the x-z plane."""
    out = []
    for q, (sx, sz) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1))):
        for j in range(n + 1):
            a = math.radians(q * 90 + 90 * j / n)
            out.append((sx * (hw - r) + r * math.cos(a), (z0 + z1) / 2 + sz * ((z1 - z0) / 2 - r) + r * math.sin(a)))
    return out


def frame_y(acc, hw, z0, z1, wide, ya, yb, r_in=.10, bev=.045, side=1, n=4, flat_back=False):
    """Hard rounded frame round an opening (|x| < hw, z0..z1), `wide` across, from depth ya out to face yb."""
    def o(k, y):
        return [(x, side * y, z) for x, z in rr(hw + k, z0 - k, z1 + k, max(r_in + k * .8, .03), n)]
    if flat_back:                                                                # inner edge hidden by another frame: no inner bevel
        loft(acc, [o(wide, ya), o(wide, yb - bev), o(wide - bev, yb), o(0, yb)], wrap=True)
        return
    loft(acc, [o(wide, ya), o(wide, yb - bev), o(wide - bev, yb), o(bev, yb), o(0, yb - bev), o(0, ya)], wrap=True)


def slab(acc, x0, x1, y0, y1, z0, z1, r=.05, b=.03):
    """Soft horizontal slab: rounded in plan, bevelled top and bottom (mattress, pillow, seat)."""
    cx, hw = (x0 + x1) / 2, (x1 - x0) / 2

    def o(k, z):
        return [(cx + x, y, z) for x, y in rr(hw - k, y0 + k, y1 - k, r, 1 if r < .05 else 2)]
    loft(acc, [o(b, z0), o(0, z0 + b), o(0, z1 - b), o(b, z1)])


def panel_y(acc, x0, x1, z0, z1, ya, yb, r=.06, bev=.025):
    """Rounded slab in the x-z plane between depths ya < yb, outer edges bevelled."""
    cx, hw = (x0 + x1) / 2, (x1 - x0) / 2

    def o(k, y):
        return [(cx + x, y, z) for x, z in rr(hw - k, z0 + k, z1 - k, r, 3)]
    loft(acc, [o(0, ya), o(0, yb - bev), o(bev, yb)])


# --- the standard pod ------------------------------------------------------------------------------------------------------
HW, R, ZB, ZT = 2.5, .80, .20, 5.0          # shell: half width, plan corner radius, underside, top (wedges add 0.2 all round)
RB, RT = .80, 1.15                          # bottom and top edge radius (rounder than the plan, as the reference)
PITCH, PROTRUDE = .40, .195
WIN = (.90, 1.10, 2.75)                     # window opening: half width, sill, head
DOOR = (.475, .35, 2.50)
WIN_W, DOOR_W = .35, .20                    # frame widths (the window's: FRAME_W titanium + the accent band round it)
FRAME_W = .15
SPRING = (5.54, 7.19)                       # coil, 1.65 m
ROD_Z = 7.42                                # where the hanger rod starts, above the pod underside
LB, LT, WALL = math.pi * RB / 2, math.pi * RT / 2, ZT - ZB - RB - RT


def prof(s):
    """Shell profile by arc length from the underside's edge: (plan inset, z, radial and vertical normal)."""
    if s < LB:
        a = -math.pi / 2 + s / RB
        return RB * (1 - math.cos(a)), ZB + RB + RB * math.sin(a), math.cos(a), math.sin(a)
    if s <= LB + WALL:
        return 0.0, ZB + RB + (s - LB), 1.0, 0.0
    a = (s - LB - WALL) / RT
    return RT * (1 - math.cos(a)), ZT - RT + RT * math.sin(a), math.cos(a), math.sin(a)


SIDES = (((1, 0), (0, 1)), ((0, 1), (-1, 0)), ((-1, 0), (0, -1)), ((0, -1), (1, 0)))   # (outward, along) of the 4 faces


def flat(k):
    """Half length of the straight part of a face where the outline is inset k."""
    return HW - R - k


def plan(seg, f, k):
    """Point and outward normal of the shell outline inset k; seg 0-7 = face, corner, face, ...; f 0..1 along it."""
    (ox, oy), (ax, ay) = SIDES[seg // 2]
    if seg % 2 == 0:
        t = -flat(k) + 2 * flat(k) * f
        return (ox * (HW - k) + ax * t, oy * (HW - k) + ay * t), (ox, oy)
    a = f * math.pi / 2
    nx, ny = ox * math.cos(a) + ax * math.sin(a), oy * math.cos(a) + ay * math.sin(a)
    return (flat(k) * (ox + ax) + R * nx, flat(k) * (oy + ay) + R * ny), (nx, ny)


def locate(a, k):
    """Arc length a along the outline inset k -> (seg, f)."""
    lf, lc = 2 * flat(k), R * math.pi / 2
    a %= 4 * (lf + lc)
    for seg in range(8):
        ln = lf if seg % 2 == 0 else lc
        if a < ln or seg == 7:
            return seg, min(a / ln, 1.0)
        a -= ln


def wedge(acc, base, n, top=.30, h=PROTRUDE):
    """Short wedge: base quad on the shell, truncated tip pushed out along n. Open underneath."""
    c = [sum(p[k] for p in base) / 4 for k in range(3)]
    tip = [tuple(c[k] + (p[k] - c[k]) * top + n[k] * h for k in range(3)) for p in base]
    b = [tuple(c[k] + (p[k] - c[k]) * .965 for k in range(3)) for p in base]
    core = [c[k] - n[k] * .25 for k in range(3)]
    acc.facing(b + tip, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)], lambda q: [q[k] - core[k] for k in range(3)])


def clip(lo, hi, z0, z1, hole):
    """Trim a tile (x lo..hi, z0..z1) against a frame rectangle: the largest leftover strip, or None."""
    hx0, hx1, hz0, hz1 = hole
    if hi <= hx0 or lo >= hx1 or z1 <= hz0 or z0 >= hz1:
        return lo, hi, z0, z1
    opts = [(lo, min(hi, hx0), z0, z1), (max(lo, hx1), hi, z0, z1), (lo, hi, z0, min(z1, hz0)), (lo, hi, max(z0, hz1), z1)]
    opts = [o for o in opts if o[1] - o[0] > .10 and o[3] - o[2] > .10]
    return max(opts, key=lambda o: (o[1] - o[0]) * (o[3] - o[2])) if opts else None


def acoustic_skin(a):
    nb, nw, nt = 3, round(WALL / .39), round(LT / .40)
    rows = [LB * i / nb for i in range(nb)] + [LB + WALL * i / nw for i in range(nw)] + [LB + WALL + LT * i / nt for i in range(nt + 1)]
    w = a["acoustic"]
    holes = {2: (-WIN[0] - WIN_W, WIN[0] + WIN_W, WIN[1] - WIN_W, WIN[2] + WIN_W),           # +y face
             6: (-DOOR[0] - DOOR_W, DOOR[0] + DOOR_W, ZB - .1, DOOR[2] + DOOR_W)}            # -y face
    for i, (s0, s1) in enumerate(zip(rows, rows[1:])):
        k0, z0, _, _ = prof(s0)
        k1, z1, _, _ = prof(s1)
        km, _, nr, nz = prof((s0 + s1) / 2)
        tot = 4 * (2 * flat(km) + R * math.pi / 2)
        m = 4 * round(tot / PITCH / 4)
        off = (.5 if i % 2 else 0.0) * tot / m
        for j in range(m):
            p0, p1, pm = (locate(off + tot * (j + q) / m, km) for q in (0, 1 - 1e-6, .5))
            if pm[0] in holes and p0[0] == p1[0] == pm[0]:
                (_, oy), (ax, _) = SIDES[pm[0] // 2]
                x0, x1 = sorted(ax * flat(km) * (2 * p[1] - 1) for p in (p0, p1))
                cut = clip(x0, x1, z0, z1, holes[pm[0]])
                if cut is None:
                    continue
                if cut != (x0, x1, z0, z1):
                    def at(x, z):
                        kk = k0 + (k1 - k0) * (z - z0) / max(z1 - z0, 1e-6)
                        return (x, oy * (HW - kk), z)
                    c0, c1, d0, d1 = cut
                    wedge(w, [at(c0, d0), at(c1, d0), at(c1, d1), at(c0, d1)], (0, oy * nr, nz))
                    continue
            (b00, _), (b10, _) = plan(*p0, k0), plan(*p1, k0)
            (b01, _), (b11, _) = plan(*p0, k1), plan(*p1, k1)
            _, (nx, ny) = plan(*pm, km)
            wedge(w, [(*b00, z0), (*b10, z0), (*b11, z1), (*b01, z1)], (nx * nr, ny * nr, nz))
    half = HW - RB                                                              # flat underside
    cell = 2 * half / 8
    for j in range(8):
        y = -half + cell * (j + .5)
        for q in range(8 if j % 2 else 7):
            x = -half + cell * (q + (.5 if j % 2 else 1.0))
            fx, fy = abs(x) + cell / 2 - flat(RB), abs(y) + cell / 2 - flat(RB)
            if math.hypot(max(fx, 0), max(fy, 0)) > R + .03 or math.hypot(x, y) < .62:
                continue
            if abs(x) - cell / 2 < DOOR[0] + DOOR_W and y - cell / 2 < -2.02:
                continue
            h = cell / 2
            wedge(w, [(x - h, y - h, ZB), (x + h, y - h, ZB), (x + h, y + h, ZB), (x - h, y + h, ZB)], (0, 0, -1))


def shell_hull(a):
    """The smooth shell under the wedges, open at the window and the door."""
    xs = [-1.0, -.55, .55, 1.0]
    sl = [LB * i / 3 for i in range(4)] + [LB + z - ZB - RB for z in (2.55, 2.85)] + [LB + WALL + LT * i / 3 for i in range(4)]
    sl += [RB * (math.pi / 2 + math.asin((z - ZB - RB) / RB)) for z in (.32, .985)]
    sl.sort()
    rows = []
    for s in sl:
        k, z, _, _ = prof(s)
        row = []
        for seg in range(8):
            if seg % 2 == 0:
                fl = flat(k)
                row += [(*plan(seg, f, k)[0], z) for f in [0.0] + [min(max((x + fl) / (2 * fl), 0.0), 1.0) for x in xs]]
            else:
                row += [(*plan(seg, j / 3, k)[0], z) for j in range(3)]
        rows.append(row)
    m = len(rows[0])
    verts = [p for r in rows for p in r]
    faces = []
    for i in range(len(rows) - 1):
        for k in range(m):
            f = (i * m + k, i * m + (k + 1) % m, (i + 1) * m + (k + 1) % m, (i + 1) * m + k)
            x, y, z = (sum(verts[j][q] for j in f) / 4 for q in range(3))
            if y > 2.3 and abs(x) < 1.0 and .985 < z < 2.85:
                continue
            if y < -1.7 and abs(x) < .55 and .30 < z < 2.55:
                continue
            if math.sqrt(sum(c * c for c in G.newell([verts[j] for j in f]))) > 1e-6:
                faces.append(f)
    faces += [tuple(range(m)), tuple(range((len(rows) - 1) * m, len(rows) * m))]
    a["acoustic_base"].facing(verts, faces, lambda c: (c[0], c[1], c[2] - 2.6))


def coil(acc, r=.51, wire=.065, turns=5, z0=SPRING[0], z1=SPRING[1], seg=16, n=6):
    secs, m = [], turns * seg
    lo, hi = z0 + wire, z1 - wire
    for i in range(m + 1):
        t = i / m
        a = 2 * math.pi * turns * t
        z = lo + (hi - lo) * t
        c, s = math.cos(a), math.sin(a)
        secs.append([((r + wire * math.cos(q)) * c, (r + wire * math.cos(q)) * s, z + wire * math.sin(q)) for q in (2 * math.pi * j / n for j in range(n))])
    loft(acc, secs)


def spring_unit(a):
    """Roof plate, posts, pale ring, lower seat, coil round a dark damper, upper seat, rod socket."""
    lathe(a["titan"], [(1.34, 4.9), (1.34, 5.06), (1.28, 5.12), (1.04, 5.13), (1.0, 5.18), (.2, 5.18)], 36)
    lathe(a["damper"], [(.50, 5.16), (.50, 5.40)], 20)
    for i in range(12):
        t = 2 * math.pi * i / 12
        lathe(a["metal"], [(.055, 5.16), (.055, 5.38)], 6, .72 * math.cos(t), .72 * math.sin(t))
    lathe(a["ring"], [(.78, 5.34), (.85, 5.38), (.85, 5.47), (.78, 5.51), (.3, 5.51)], 32)
    lathe(a["metal"], [(.74, 5.49), (.74, 5.54), (.70, 5.57), (.2, 5.57)], 32)
    coil(a["metal"])
    lathe(a["damper"], [(.21, 5.5), (.21, 6.50), (.17, 6.56)], 18)
    lathe(a["damper"], [(.25, 5.5), (.25, 5.75)], 18)
    lathe(a["metal"], [(.095, 6.5), (.095, 7.25)], 12)
    lathe(a["metal"], [(.64, 7.15), (.68, 7.18), (.68, 7.28), (.62, 7.31), (.34, 7.31), (.16, 7.42), (.13, ROD_Z + .02)], 32)


def window_and_door(a):
    hw, z0, z1 = WIN
    frame_y(a["titan"], hw, z0, z1, FRAME_W, 2.40, 2.70)
    frame_y(a["seal"], hw - .030, z0 + .030, z1 - .030, .034, 2.52, 2.575, r_in=.075, n=2, flat_back=True, bev=.006)      # dark weather strip
    frame_y(a["seal"], hw - .040, z0 + .040, z1 - .040, .045, 1.735, 1.80, r_in=.03, n=1, flat_back=True, bev=.006)      # gasket round the glass
    t = a["reveal"]                                                              # reveal: head, sill and jambs back to the glass
    box(t, -1.0, 1.0, 1.70, 2.44, z1, z1 + .1)
    box(a["reveal"], -1.0, 1.0, 1.70, 2.44, z0 - .1, z0)
    for s in (-1, 1):
        x0, x1 = sorted((s * hw, s * (hw + .1)))
        box(t, x0, x1, 1.70, 2.23, z0, z1)
        box(a["seam"], *sorted((s * (hw + .02), s * (hw + .06))), 2.23, 2.245, z0, z1)
    for zz in (z0 + .012, z1 - .012):                                           # shutter tracks
        box(a["seam"], -hw, hw, 2.31, 2.36, zz - .012, zz + .012)
    hw, z0, z1 = DOOR
    frame_y(a["titan"], hw, z0, z1, DOOR_W, 2.02, 2.70, r_in=.04, side=-1)
    box(a["seam"], -hw + .01, hw - .01, -2.699, -2.05, z0 - .06, z0)               # threshold, flush with the floor
    for s in (-1, 1):                                                            # doorway lining
        box(a["reveal"], *sorted((s * hw, s * (hw + .04))), -2.1, -1.88, z0, z1)
    box(a["reveal"], -hw, hw, -2.1, -1.88, z1, z1 + .04)
    panel_back(a, -hw, hw, z0, z1)


def panel_back(a, x0, x1, z0, z1):
    """The entrance leaf, 0.5 m inside the portal, with a lit side window and a handle; a lamp in the portal head."""
    box(a["door"], x0, x1 - .26, -2.20, -2.12, z0, z1)
    box(a["glow"], x1 - .26, x1, -2.17, -2.13, z0, z1)
    box(a["door"], x1 - .28, x1 - .24, -2.21, -2.11, z0, z1)
    box(a["metal"], x1 - .40, x1 - .36, -2.26, -2.20, z0 + .85, z0 + 1.25)
    box(a["glow"], -.30, .30, -2.60, -2.30, z1 - .02, z1 - .003)


def pod_shell():
    a = Accs()
    shell_hull(a)
    acoustic_skin(a)
    window_and_door(a)
    spring_unit(a)
    lathe(a["trim"], [(.40, .06), (.46, .10), (.46, .25)], 20)                   # service port under the floor
    return a


ACCENTS = ("white", "blue", "sage", "sand")


def accent_band(colour):
    """The one colour a dwelling carries: a low-chroma band round its titanium window frame."""
    a = Accs()
    frame_y(a["accent_" + colour], WIN[0] + FRAME_W, WIN[1] - FRAME_W, WIN[2] + FRAME_W, WIN_W - FRAME_W, 2.36, 2.672, r_in=.22, bev=.05, flat_back=True)
    return a


def shutter(state):
    """Two thick leaves behind the window frame, outside the glass; they slide sideways into the wall pockets."""
    a = Accs()
    z0, z1 = WIN[1] + .015, WIN[2] - .015
    shift = {"closed": (0, 0), "open": (.902, .902), "half": (0, .902)}[state]
    for s, d in zip((-1, 1), shift):
        x0, x1 = sorted((s * (.004 + d), s * (.945 + d)))
        panel_y(a["shutter"], x0, x1, z0, z1, 2.25, 2.41)
        xi = s * (.004 + d + .09)                                                # a grip slot near the meeting edge
        box(a["seam"], xi - .022, xi + .022, 2.405, 2.416, 1.70, 2.15)
        if d == 0:                                                               # meeting edge of a closed leaf
            box(a["seam"], *sorted((s * .0005, s * .004)), 2.29, 2.38, z0, z1)
    return a


ROOM = (2.0, -1.88, 1.70, .35, 3.15)


def room():
    """Lit room behind an open window (walls face inward, real doorway at the back) and its glass; no furniture."""
    a = Accs()
    hx, y0, y1, z0, z1 = ROOM
    dw, dz = DOOR[0], DOOR[2]
    c = (0, 0, 1.7)

    def quad(role, pts):
        a[role].facing(pts, [(0, 1, 2, 3)], lambda q: [c[k] - q[k] for k in range(3)])

    def wall(y, xa, xb, za, zb):
        quad("room", [(xa, y, za), (xb, y, za), (xb, y, zb), (xa, y, zb)])
    quad("floor", [(-hx, y0, z0), (hx, y0, z0), (hx, y1, z0), (-hx, y1, z0)])
    quad("room", [(-hx, y0, z1), (hx, y0, z1), (hx, y1, z1), (-hx, y1, z1)])
    for s in (-1, 1):
        quad("room", [(s * hx, y0, z0), (s * hx, y1, z0), (s * hx, y1, z1), (s * hx, y0, z1)])
        wall(y1, *sorted((s * .98, s * hx)), z0, z1)
        wall(y0, *sorted((s * dw, s * hx)), z0, z1)
    wall(y1, -.98, .98, z0, WIN[1] - .05)
    wall(y1, -.98, .98, WIN[2] + .05, z1)
    wall(y0, -dw, dw, dz, z1)
    quad("floor", [(-dw, -2.12, z0), (dw, -2.12, z0), (dw, y0, z0), (-dw, y0, z0)])
    for s in (-1, 1):                                                            # warm light coves along the side walls
        box(a["glow"], *sorted((s * 1.90, s * 1.97)), -1.4, 1.4, z1 - .10, z1 - .05)
    box(a["rug"], -.75, .85, -1.0, .55, z0, z0 + .015)
    a["glass_room"].facing([(-.9, 1.77, WIN[1]), (.9, 1.77, WIN[1]), (.9, 1.77, WIN[2]), (-.9, 1.77, WIN[2])], [(0, 1, 2, 3)], lambda q: (0, 1, 0))
    return a


# --- furniture: one mesh each, origin on the floor; shared by every dwelling that shows its room --------------------------------
def bed():
    """Single bed, 0.96 x 2.02 m, head at -y, drawers below, mattress top 0.57 m."""
    a = Accs()
    box(a["oak"], -.48, .48, -1.0, 1.0, .05, .35)
    for s in (-1, 1):
        for y in (-.5, .5):
            box(a["oak_dark"], *sorted((s * .478, s * .486)), y - .42, y + .42, .10, .115)
            box(a["oak_dark"], *sorted((s * .478, s * .492)), y - .09, y + .09, .24, .262)
    box(a["oak"], -.49, .49, -1.05, -.99, 0, .98)
    slab(a["linen"], -.46, .46, -.98, .98, .35, .57, .06, .04)
    slab(a["blanket"], -.485, .485, -.22, 1.0, .40, .60, .06, .03)
    slab(a["linen"], -.485, .485, -.40, -.20, .55, .615, .03, .02)
    slab(a["linen"], -.33, .33, -.93, -.50, .56, .69, .10, .05)
    return a


def desk():
    """Light-wood writing desk 1.30 x 0.56 m, top 0.70 m (under the 0.75 m window sill), legs to the floor, one drawer."""
    a = Accs()
    box(a["oak"], -.65, .65, -.28, .28, .66, .70)
    for x in (-.61, .61):
        for y in (-.24, .24):
            box(a["oak"], x - .025, x + .025, y - .025, y + .025, 0, .66)
    box(a["oak"], .10, .58, -.24, .20, .56, .66)
    box(a["oak_dark"], .28, .40, -.252, -.24, .605, .62)
    return a


def chair():
    """Wood chair with a fabric seat and back, facing +y."""
    a = Accs()
    for x in (-.19, .19):
        box(a["oak"], x - .02, x + .02, .16, .20, 0, .42)
        box(a["oak"], x - .02, x + .02, -.21, -.17, 0, .86)
    box(a["oak"], -.22, .22, -.21, .21, .40, .43)
    slab(a["cushion"], -.21, .21, -.18, .20, .43, .48, .06, .02)
    box(a["oak"], -.21, .21, -.21, -.18, .80, .86)
    box(a["cushion"], -.17, .17, -.205, -.17, .56, .78)
    return a


def cabinet():
    """Storage beside the entrance, 1.20 x 0.56 x 2.10 m, front +y: two doors and an open shelf bay."""
    a = Accs()
    box(a["oak"], -.60, .60, -.28, .24, 0, 2.10)
    for x0, x1 in ((-.59, -.20), (-.18, .21)):
        box(a["cabinet"], x0, x1, .24, .26, .06, 2.05)
        box(a["oak_dark"], x1 - .06, x1 - .04, .26, .28, .95, 1.25)
    box(a["oak_dark"], .235, .575, .238, .244, .06, 2.05)
    for z in (.5, 1.0, 1.5):
        box(a["oak"], .235, .575, .242, .265, z, z + .03)
        for i, h in enumerate((.26, .22, .28)):
            box(a[("blanket", "linen", "cushion")[i]], .26 + i * .07, .31 + i * .07, .243, .262, z + .03, z + .03 + h)
    return a


def desk_lamp():
    a = Accs()
    lathe(a["seal"], [(.085, 0), (.085, .02), (.02, .03)], 14)
    pipe(a["seal"], [(0, 0, .02), (0, 0, .34), (.05, 0, .40)], .010, .010, 6)
    lathe(a["glow"], [(.115, .30), (.06, .43), (.02, .44)], 16)
    return a


def book():
    a = Accs()
    for s in (-1, 1):
        loft(a["linen"], [[(s * .005, y, .004), (s * .19, y, .004), (s * .19, y, .018), (s * .10, y, .034), (s * .005, y, .022)] for y in (-.13, .13)])
        box(a["accent_blue"], *sorted((s * .0, s * .20)), -.135, .135, 0, .005)
    return a


def shelf():
    """Low light-wood shelf along the window, for one plant."""
    a = Accs()
    box(a["oak"], -.60, .60, -.18, .18, .60, .64)
    for x in (-.58, 0, .58):
        box(a["oak"], x - .02, x + .02, -.17, .17, 0, .60)
    box(a["oak"], -.58, .58, -.17, .17, .20, .23)
    return a


def plant():
    a = Accs()
    M.kit_prop(ctx(a, random.Random(3), k=.85), "potted_plant", 0, 0, 0)
    return a


FURNITURE = {"BED": bed, "DESK": desk, "CHAIR": chair, "CABINET": cabinet, "LAMP": desk_lamp, "BOOK": book, "SHELF": shelf, "PLANT": plant}
# layout -> (piece, x, y, height above the floor, yaw deg), written for a viewer on the dwelling's -x side (bed on +x);
# mirrored in x for the others. Exactly one small thing stands at each window: a lamp, a book or a plant.
LAYOUTS = {
    "desk": (("DESK", .25, 1.38, 0, 0), ("CHAIR", .44, .78, 0, 0), ("LAMP", .74, 1.46, .70, 0), ("BED", 1.48, -.42, 0, 0), ("CABINET", -1.36, -1.56, 0, 0)),
    "bed": (("BED", .02, 1.17, 0, 90), ("BOOK", .10, .98, .60, 70), ("DESK", 1.70, -.50, 0, -90), ("CHAIR", 1.12, -.50, 0, -90), ("CABINET", -1.36, -1.56, 0, 0)),
    "plant": (("SHELF", .25, 1.42, 0, 0), ("PLANT", .60, 1.38, .64, 0), ("BED", 1.48, -.42, 0, 0), ("DESK", -1.70, .50, 0, 90), ("CHAIR", -1.12, .50, 0, 90), ("CABINET", -1.36, -1.56, 0, 0)),
}


# --- bridges -----------------------------------------------------------------------------------------------------------------
DECK_HW, JOINT = .63, .30


def offset(path, d):
    """Mitred offset of a plan polyline (positive = left)."""
    out = []
    for i, p in enumerate(path):
        dirs = [_n((b[0] - a[0], b[1] - a[1], 0)) for a, b in zip(path[max(i - 1, 0):i + 1], path[max(i - 1, 0) + 1:i + 2])]
        ns = [(-t[1], t[0]) for t in dirs]
        nx, ny = sum(n[0] for n in ns), sum(n[1] for n in ns)
        ln = math.hypot(nx, ny) or 1.0
        nx, ny = nx / ln, ny / ln
        k = 1.0 / max(nx * ns[0][0] + ny * ns[0][1], .5)
        out.append((p[0] + nx * d * k, p[1] + ny * d * k))
    return out


def ribbon(acc, path, d0, d1, z0, z1):
    """Bar following a plan polyline between offsets d0 < d1 and heights z0 < z1."""
    a, b = offset(path, d0), offset(path, d1)
    loft(acc, [[(*p, z0), (*q, z0), (*q, z1), (*p, z1)] for p, q in zip(a, b)])


def cut_path(path, d0=0.0, d1=0.0):
    """Shorten a polyline by d0 at its start and d1 at its end."""
    def trim(pts, d):
        pts = list(pts)
        while d > 1e-9 and len(pts) > 1:
            ln = math.dist(pts[0], pts[1])
            if ln > d:
                f = d / ln
                pts[0] = tuple(u + (v - u) * f for u, v in zip(pts[0], pts[1]))
                break
            d -= ln
            pts.pop(0)
        return pts
    return trim(trim(path, d0)[::-1], d1)[::-1]


def bridge(path, deck, tube_deg):
    a = Accs()
    path = [tuple(p) for p in path]
    main = cut_path(path, 0, JOINT)
    ribbon(a["deck"], main, -DECK_HW, DECK_HW, deck - .14, deck)
    ribbon(a["trim"], main, -.14, .14, deck - .32, deck - .13)
    start = math.degrees(math.atan2(path[0][1], path[0][0]))
    side = math.remainder(tube_deg - start, 360.0)
    for s in (-1, 1):
        rp = cut_path(path, 1.15 if side * s > 1 else .12, JOINT + .02)        # open toward the tube's door on that side
        d0, d1 = sorted((s * (DECK_HW - .06), s * (DECK_HW - .015)))
        ribbon(a["rail"], rp, d0, d1, deck + 1.04, deck + 1.09)
        ribbon(a["rail"], rp, d0, d1, deck + .56, deck + .585)
        ribbon(a["trim"], rp, d0, d1, deck, deck + .07)
        line = offset(rp, s * (DECK_HW - .0375))
        for p, q in zip(line, line[1:]):
            ln = math.dist(p, q)
            k = max(1, math.ceil(ln / 1.5))
            for i in range(k + 1):
                f = i / k
                obox(a["rail"], (p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, deck + .53), (.035, .035, 1.06), math.atan2(q[1] - p[1], q[0] - p[0]))
    # flexible joint: dark bellows between the bridge end and the pod's threshold, flush with both
    e, d = main[-1], path[-1]
    t = _n((d[0] - e[0], d[1] - e[1], 0))
    ang = math.atan2(t[1], t[0])
    gap = math.dist(e, d)
    at = lambda f: (e[0] + t[0] * f, e[1] + t[1] * f)  # noqa: E731
    obox(a["rubber"], (*at(gap / 2 - .002), deck - .05), (gap - .004, .96, .10), ang)
    for i in range(4):
        obox(a["rubber"], (*at(.035 + i * (gap - .07) / 3), deck - .02), (.04, 1.16, .24), ang)
        for s in (-1, 1):
            c = at(.035 + i * (gap - .07) / 3)
            obox(a["rubber"], (c[0] - t[1] * s * .58, c[1] + t[0] * s * .58, deck + .52), (.05, .06, 1.05), ang)
    # landing: from the tube's door round to the bridge, and the door itself
    lo, hi = min(start, start + side), max(start, start + side)
    sector(a["deck"], 3.94, 5.0, lo - 9, hi + 9, deck - .14, deck - .004, 3)
    if abs(side) > 1:
        edge = math.radians(hi + 8.3 if side > 0 else lo - 8.3)
        c, s = math.cos(edge), math.sin(edge)
        obox(a["rail"], (4.47 * c, 4.47 * s, deck + 1.065), (.95, .045, .05), edge)
        obox(a["rail"], (4.47 * c, 4.47 * s, deck + .57), (.95, .045, .025), edge)
        for r in (4.02, 4.92):
            obox(a["rail"], (r * c, r * s, deck + .53), (.04, .04, 1.06), edge)
        n = 4
        for zz, th in ((1.04, .05), (.56, .025)):
            g0, g1 = (start + 8.2, hi + 8.3) if side > 0 else (lo - 8.3, start - 8.2)
            sector(a["rail"], 4.94, 4.98, g0, g1, deck + zz, deck + zz + th, abs(g1 - g0) / n)
    ta = math.radians(tube_deg)
    c, s = math.cos(ta), math.sin(ta)
    for q in (-1, 1):
        obox(a["metal_light"], (3.93 * c - q * .42 * s, 3.93 * s + q * .42 * c, deck + 1.05), (.10, .07, 2.1), ta)
    obox(a["metal_light"], (3.93 * c, 3.93 * s, deck + 2.10), (.12, .91, .10), ta)
    obox(a["glow"], (3.99 * c, 3.99 * s, deck + 2.04), (.02, .5, .03), ta)
    return a


# --- materials -------------------------------------------------------------------------------------------------------------
MATS = {}


def srgb(h, alpha=1.0):
    v = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in v) + (alpha,)


def mat(name, rgba, rough=.6, metal=0.0, emit=None, strength=1.0, culling=True):
    m = G.material("q04a_" + name, rgba, rough, emit, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


def inner(name, h, rough, lit):
    """Interior finish: a little of its own colour as emission, so a room reads behind glass in daylight in any renderer."""
    return mat(name, srgb(h), rough, emit=srgb(h), strength=lit)


def make_materials():
    if MATS:
        return MATS
    warm = srgb("FFD9A0")
    MATS.update({
        "acoustic": mat("acoustic_wedge", srgb("F1E8D8"), .88), "acoustic_base": mat("acoustic_base", srgb("D6CCBA"), .92),
        "titan": mat("window_titanium", srgb("BDC0C0"), .45, .35), "seal": mat("seal_strip", srgb("34393C"), .75),
        "accent_white": mat("accent_white", srgb("F0EFEA"), .50), "accent_blue": mat("accent_mist_blue", srgb("718CA6"), .50),
        "accent_sage": mat("accent_sage", srgb("839B76"), .50), "accent_sand": mat("accent_sand", srgb("CDA676"), .50),
        "trim": mat("painted_trim", srgb("EFF2F1"), .35), "reveal": mat("window_reveal", srgb("E9E4DA"), .5),
        "seam": mat("seam", srgb("8F9596"), .5), "shutter": mat("shutter", srgb("B3B4B0"), .50, .10),
        "metal": mat("spring_steel", srgb("D2D6D8"), .36, .45), "damper": mat("damper", srgb("454D52"), .5, .3),
        "ring": mat("isolator_ring", srgb("A9CDE3"), .30), "metal_light": mat("core_metal", srgb("C9CFD2"), .32, .7),
        "rail": mat("handrail", srgb("DDE1E2"), .35, .3), "deck": mat("bridge_deck", srgb("D9DBD9"), .6),
        "rubber": mat("bridge_joint", srgb("26292B"), .8), "door": mat("entrance_door", srgb("B9AE9C"), .5),
        "wood": mat("light_wood", srgb("C9A678"), .5),
        "floor": inner("room_floor", "B39B7C", .6, .28), "room": inner("room_wall", "EDE3D3", .75, .42),
        "oak": inner("light_oak", "D8C2A0", .50, .30), "oak_dark": inner("oak_shadow", "7A5B3C", .6, .10),
        "cabinet": inner("cabinet_front", "E3D3B8", .55, .30), "linen": inner("linen", "F3EEE4", .9, .34),
        "blanket": inner("wool_blanket", "6F8596", .95, .30), "cushion": inner("cushion", "8A9A86", .95, .30),
        "rug": inner("rug", "CFC6B8", .95, .25),
        "glow": mat("warm_light", srgb("FFE3B3"), .5, emit=warm, strength=3.0),
        "glass": mat("lift_glass", srgb("C4E6EF", .13), .04, culling=False),
        "glass_room": mat("room_glass", srgb("D5EEF2", .10), .03, culling=False),
        "glass_lobby": mat("lobby_glass", srgb("BFE2EC", .20), .04, culling=False),
        "cyan": mat("pale_light", srgb("CFF1FA"), .4, emit=srgb("BFEFFF"), strength=1.2),
        "paving": mat("paving", srgb("D8D2C8"), .85), "paving_b": mat("paving_band", srgb("BDB6AB"), .85),
        "curb": mat("curb", srgb("EFEDE8"), .6), "grass": mat("lawn", srgb("7E9C4E"), .9), "soil": mat("soil", srgb("6B5138"), .95),
    })
    for role, (rgba, emit, strength) in M.ROLES.items():                         # library interior and planting recipe
        leafy = role in ("leaf_l", "green")
        MATS["in_" + role] = mat("in_" + role, rgba, .6, emit=emit, strength=strength, culling=not leafy and rgba[3] >= 1)
    return MATS


def build_mesh(name, accs, smooth_deg=30):
    """One mesh, one slot per role. Wedges keep only their ridges sharp, so the cut tips read as softly rounded."""
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
    bm = bmesh.new()
    bm.from_mesh(me)
    soft = {i for i, r in enumerate(mats) if r == "acoustic"}
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        if len(e.link_faces) == 2:
            thr = 63 if e.link_faces[0].material_index in soft else smooth_deg
            e.smooth = e.calc_face_angle(0) <= math.radians(thr)
    bm.to_mesh(me)
    bm.free()
    me.update()
    return me


def tris(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)
