"""car-candidates-2127 round 2: car_green and car_tech redrawn from the Odaiba reference models (draft, not placed).

Re-run headless (Blender 5.2):
  blender -b --factory-startup --python-exit-code 1 -P build_candidates_r2.py
Writes car-green-2127-r2.blend/.glb and car-tech-2127-r2.blend/.glb next to this file; round 1's files stay as they are.

Contract as car_human (build_car.py) and round 1: real metres, 4.6 m long, ground contact at y = 0, front = +Z three.js
(-Y Blender), wheels at z = +-1.42, the roles car_body / car_interior (colour attribute), car_glass, car_seam, car_head,
car_tail, car_shadow; variants car_green / car_tech under ROOT_CAR_GREEN_2127_R2 / ROOT_CAR_TECH_2127_R2.
Round 2 targets (owner 2026-11-14): <= 6,000 triangles each, <= 1.90 m wide with the camera pods (the lane probe is +-0.95 m).

  car_green  warm and round, after the SW event modules (box + 0.55 m round corners, round-cornered windows in thick frames),
             the kiosk's warm off-white and clear glass with warm light behind it: one continuous arc nose-roof-tail, warm
             beige-white over a muted sage lower band, inset clear glass, a solar roof of cells following the roof curve,
             capsule lamp units (housing, lens, LED dots, DRL bar), aero discs with dark openings over a layered tyre.
  car_tech   cool and angular, after Fuji TV's brushed aluminium, titanium, blue smoked glass and dark joints: a faceted
             section (rocker fold, a sharp shoulder crease at the widest point, a leaning glasshouse, a roof edge fold),
             raked flat fascias, hexagonal arches with black lips, cool blue-grey metal over graphite, blue smoked glass,
             black pillars under a floating roof, ice-blue projector units under a hairline bar, a segmented red tail bar.

Shell: round 1's loft (t tail 0 .. nose 1, rows bottom centre .. top centre, mirrored); window openings are inset by a few
millimetres behind a dark frame return, so glass sits inside a real reveal. Creases come from the section points and edges
sharper than SHARP_DEG. Coordinates are three.js; geo_helpers.B maps them.
"""
import math
import os
import sys

import bmesh
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)
sys.path.insert(0, MODELS)
sys.path.insert(0, os.path.join(MODELS, "car-family-2127"))
sys.path.insert(0, HERE)
from geo_helpers import B, material, newell, rrect_pts  # noqa: E402
from build_car import Mesh, box, ground  # noqa: E402
import build_candidates as r1  # noqa: E402

L, Z0, WHEEL_Z = r1.L, r1.Z0, r1.WHEEL_Z
D_EDGE, E_EDGE = .004, .006  # window edge: frame station -> inset station; colour guard outside screen edges


def rgb(r, g, b):
    return (r, g, b, 1)


GREEN = dict(
    name="car_green", stem="car-green-2127-r2",
    # One arc from the nose over the roof to the tail: the crown at 45 %, the roof falling away both ways, a low round nose.
    TOP=[(0, .72), (.004, .82), (.012, .91), (.03, 1.0), (.08, 1.13), (.15, 1.29), (.23, 1.41), (.32, 1.5), (.42, 1.55), (.5, 1.555),
         (.57, 1.52), (.63, 1.44), (.69, 1.32), (.75, 1.16), (.81, 1.0), (.87, .885), (.92, .81), (.96, .75), (.985, .7), (.997, .665),
         (1, .62)],
    BOT=[(0, .5), (.004, .43), (.015, .36), (.04, .3), (.08, .27), (.5, .25), (.93, .27), (.98, .33), (.995, .39), (1, .45)],
    WID=[(0, .3), (.003, .46), (.01, .58), (.03, .72), (.07, .82), (.12, .88), (.25, .9), (.68, .9), (.82, .87), (.9, .8),
         (.95, .7), (.98, .58), (.995, .45), (1, .3)],
    SQR=[(0, 2.4), (.15, 2.7), (.85, 2.7), (1, 2.4)],
    TUMBLE=.27,
    BELLY=[(0, .5), (.06, .36), (.5, .33), (.94, .36), (1, .48)],
    CLAD=[(0, .6), (.06, .53), (.2, .47), (.8, .47), (.94, .53), (1, .55)],
    BELT=[(0, .84), (.5, .8), (1, .72)],
    SILL=[(0, .9), (.1, .93), (.3, .92), (.6, .92), (.75, .97), (.82, .99), (1, .99)],
    RAIL_DROP=[(0, .06), (.2, .14), (.45, .15), (.62, .11), (1, .06)],
    SIDE=[(.19, .38), (.405, .57)],
    SCREENS=[(.062, .17), (.585, .82)],  # the rear glass starts past the tail's row blend (t < .06)
    INSET=.012,
    ARCH=dict(r=.43, sides=0),
    WHEEL=dict(r=.345, w=.21, x=.78, style="disc"),
    BODY=rgb(.92, .87, .78), LOWER=rgb(.26, .36, .29), FRAME=rgb(.12, .13, .12), ROOF=None, CAP_TAIL=None,
    SEAM_C=rgb(.36, .35, .33),
    DOORS=[(.6, None), (.383, None), (.29, .84)],  # t, y0 (None: just above the lower band) .. sill
    INTERIOR=dict(dy=0, front=.45, rear=-.45, dash=1.15, seat=rgb(.72, .66, .56), trim=rgb(.26, .36, .29)),
    MATS=dict(body=dict(rough=.5, metal=0.0), glass=((.8, .9, .92, .25), .0), interior_rough=.7,
              seam=((.66, .95, .86, 1), (.62, .95, .84, 1), 1.5), head=((1, .97, .9, 1), (1, .9, .72, 1), 4.0),
              tail=((.9, .42, .36, 1), (1, .32, .18, 1), 3.5)),
    SHARP_DEG=42,
)

TECH = dict(
    name="car_tech", stem="car-tech-2127-r2",
    TOP=[(0, .86), (.03, .93), (.08, .99), (.14, 1.08), (.22, 1.2), (.3, 1.31), (.38, 1.36), (.48, 1.36), (.54, 1.32), (.6, 1.22),
         (.66, 1.08), (.72, .97), (.8, .9), (.88, .84), (.95, .77), (1, .7)],
    BOT=[(0, .3), (.03, .24), (.07, .21), (.5, .2), (.93, .21), (.97, .24), (1, .28)],
    WID=[(0, .8), (.025, .9), (.07, .92), (.93, .92), (.975, .9), (1, .8)],  # chamfered plan corners
    CREASE=[(0, .7), (.1, .74), (.5, .76), (.9, .72), (1, .68)],
    SILL=[(0, .84), (.15, .86), (.3, .87), (.55, .86), (.7, .88), (.75, .9), (1, .9)],
    RAIL_DROP=[(0, .05), (.2, .08), (.5, .09), (.62, .07), (1, .05)],
    TUM=.26,
    SIDE=[(.3, .45), (.468, .57)],
    SCREENS=[(.06, .285), (.585, .74)],
    INSET=.008,
    ARCH=dict(r=.41, sides=6),
    WHEEL=dict(r=.35, w=.235, x=.79, style="spoke"),
    BODY=rgb(.5, .56, .62), LOWER=rgb(.12, .13, .15), FRAME=rgb(.025, .03, .035), ROOF=None, CAP_TAIL=None,
    SEAM_C=rgb(.05, .055, .06),
    DOORS=[(.582, None), (.459, None), (.29, .8)],
    INTERIOR=dict(dy=-.16, front=.1, rear=-.72, dash=.9, seat=rgb(.14, .15, .17), trim=rgb(.3, .5, .62)),
    MATS=dict(body=dict(rough=.3, metal=.8), glass=((.05, .1, .13, .72), .3), interior_rough=.6,
              seam=((.62, .85, 1, 1), (.55, .82, 1, 1), 3.0), head=((.75, .9, 1, 1), (.6, .85, 1, 1), 5.0),
              tail=((.6, .1, .1, 1), (1, .1, .08, 1), 4.0)),
    SHARP_DEG=28,
)
for spec in (GREEN, TECH):
    spec.setdefault("SCREENS_GLASS_ROOF", None)


class Mesh2(Mesh):
    """build_car's Mesh plus a per-face flag: loft faces keep their topological winding (their reveals are near-tangent)."""

    def __init__(self):
        super().__init__()
        self.fixed = []

    def face(self, idx, role, fixed=False):
        super().face(idx, role)
        self.fixed.append(fixed)


def finalize_rows(out, belt, t, n_rows):
    for k in range(1, n_rows):  # strictly increasing; the ends squeeze the upper rows together
        out[k] = max(out[k], out[k - 1] + 2e-3)
    if out[-1] > 1:
        lo = out[belt]
        for k in range(belt + 1, n_rows):
            out[k] = lo + (out[k] - lo) * (1 - lo) / (out[-1] - lo)
    out[-1] = 1.0
    e = min(t, 1 - t)  # toward the rounded ends the rows ease into an even spread
    w = 1 - min(e / .06, 1)
    w = w * w * (3 - 2 * w)
    if w > 0:
        out = [(1 - w) * s + w * (-1 + 2 * k / (n_rows - 1)) for k, s in enumerate(out)]
    return out


class GreenBody(r1.Car):
    """Round 1's superellipse surface with round 2's rows: a 22 mm frame return above the sill and below the rail."""
    KEYS = ["b0", "belly", "clad", "clad2", "belt", "sill0", "sill", "sill_in", "rail_in", "rail", "rail0", "r1", "r2", "top"]
    LOWER_TOP = "clad"

    def rows_at(self, t):
        y = self.row_y(t)
        top = self.tab("TOP", t)
        ys = {"belly": y["belly"], "clad": y["clad"], "clad2": y["clad"] + .012, "belt": y["belt"], "sill0": y["sill"] - .012,
              "sill": y["sill"], "sill_in": y["sill"] + .022, "rail_in": y["rail"] - .022, "rail": y["rail"], "rail0": y["rail"] + .012}
        for k, frac in (("sill0", .3), ("sill", .34), ("sill_in", .4), ("rail_in", .8), ("rail", .86), ("rail0", .9)):
            ys[k] = min(ys[k], ys["belt"] + (top - ys["belt"]) * frac)
        s = {k: self.s_of_y(t, v) for k, v in ys.items()}
        s["b0"], s["top"] = -1.0, 1.0
        for j, k in enumerate(("r1", "r2")):
            s[k] = s["rail0"] + (1 - s["rail0"]) * (1 - math.cos((j + 1) / 3 * math.pi / 2)) ** .9
        return finalize_rows([s[k] for k in self.KEYS], self.KEYS.index("belt"), t, len(self.KEYS))

    def arch_outline(self, zw, n=8):
        return super().arch_outline(zw, n)


class TechBody(r1.Car):
    """A faceted section: bottom centre, floor edge, rocker fold, shoulder crease (widest), sill fold, rail fold, roof edge,
    roof crown, top centre; s runs along it by arc length (-1 bottom centre .. 1 top centre). Raked flat fascias."""
    KEYS = ["b0", "floor", "rock", "rock2", "crease", "sill0", "sill", "sill_in", "rail_in", "rail", "redge", "rmid", "top"]
    LOWER_TOP = "rock"

    def __init__(self, spec):
        super().__init__(spec)
        self._poly = {}

    def poly(self, t):
        hit = self._poly.get(t)
        if hit:
            return hit
        W, bot, top = self.tab("WID", t), self.tab("BOT", t), self.tab("TOP", t)
        yrock, yc, ys = bot + .11, self.tab("CREASE", t), self.tab("SILL", t)
        yr = top - self.tab("RAIL_DROP", t)
        yc, ys = max(yc, yrock + .04), max(ys, yc + .05) if ys < yc + .05 else ys
        ys = max(ys, yc + .05)
        yr = max(yr, ys + .06)
        if yr > top - .03:  # hood and boot: fold lines squeeze toward the top, in order
            seq = [yrock, yc, ys, yr]
            k = (top - .03 - bot) / (yr - bot)
            yrock, yc, ys, yr = [bot + (v - bot) * k for v in seq]
        xs = W - .045
        xr = xs - self.p["TUM"]
        xe = max(xr - .1, .06)
        pts = [(0, bot), (W - .12, bot), (W - .035, yrock), (W, yc), (xs, ys), (xr, yr), (xe, top - .012), (xe * .5, top - .003), (0, top)]
        acc = [0.0]
        for a, b in zip(pts, pts[1:]):
            acc.append(acc[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
        out = (pts, acc, dict(floor=1, rock=2, crease=3, sill=4, rail=5, redge=6, rmid=7))
        self._poly[t] = out
        return out

    def sec(self, t):
        top, bot = self.tab("TOP", t), self.tab("BOT", t)
        return (top + bot) / 2, (top - bot) / 2, self.tab("WID", t), 4

    def arch_poly(self):
        """Trapezoid arch with chamfered shoulders, (dz, dy) from the axle: vertical sides, a flat top."""
        R = self.p["ARCH"]["r"]
        H, c = R * .93, .13
        return [(R, 0), (R, H - c), (R - c, H), (-(R - c), H), (-R, H - c), (-R, 0)]

    def arch_r(self, ang):
        d = (math.cos(ang), math.sin(ang))
        best = None
        poly = self.arch_poly()
        for (ax, ay), (bx, by) in zip(poly, poly[1:]):
            ex, ey = bx - ax, by - ay
            den = d[0] * ey - d[1] * ex
            if abs(den) < 1e-9:
                continue
            tt = (ax * ey - ay * ex) / den
            u = (ax * d[1] - ay * d[0]) / den
            if tt > 0 and -1e-6 <= u <= 1 + 1e-6:
                best = tt if best is None else min(best, tt)
        return best or self.p["ARCH"]["r"]

    def arch_outline(self, zw, n=0):
        r0, poly = self.p["WHEEL"]["r"], self.arch_poly()
        pts = [(zw + poly[0][0], self.tab("BOT", (zw + poly[0][0] - Z0) / L) + .01)]
        for (ax, ay), (bx, by) in zip(poly, poly[1:]):
            steps = 2 if abs(ay - by) < 1e-6 else 1
            for j in range(steps):
                pts.append((zw + ax + (bx - ax) * j / steps, r0 + ay + (by - ay) * j / steps))
        pts.append((zw + poly[-1][0], r0 + poly[-1][1]))
        pts.append((zw + poly[-1][0], self.tab("BOT", (zw + poly[-1][0] - Z0) / L) + .01))
        return pts

    def rake(self, t, y):
        """The fascias lean: top pulled back over the lamps, chin pulled back under the intake."""
        if .05 < t < .95:
            return 0
        w = (t - .95) / .05 if t >= .95 else (.05 - t) / .05
        w = w * w
        d = .3 * max(y - .6, 0) + .5 * max(.38 - y, 0)
        return -d * w if t >= .95 else d * w

    def at(self, t, s):
        pts, acc, _ = self.poly(t)
        u = (s + 1) / 2 * acc[-1]
        for i in range(len(pts) - 1):
            if u <= acc[i + 1] or i == len(pts) - 2:
                f = (u - acc[i]) / max(acc[i + 1] - acc[i], 1e-9)
                x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f
                y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f
                return x, y, Z0 + t * L + self.rake(t, y)

    def s_of_y(self, t, y):
        pts, acc, _ = self.poly(t)
        for i in range(1, len(pts) - 1):
            y0, y1 = pts[i][1], pts[i + 1][1]
            if y0 <= y <= y1 and y1 > y0:
                u = acc[i] + (acc[i + 1] - acc[i]) * (y - y0) / (y1 - y0)
                return u / acc[-1] * 2 - 1
        return -1.0 if y < pts[1][1] else 1.0

    def s_vertex(self, t, i):
        _, acc, _ = self.poly(t)
        return acc[i] / acc[-1] * 2 - 1

    def rows_at(self, t):
        pts, acc, idx = self.poly(t)
        ys, yr = pts[idx["sill"]][1], pts[idx["rail"]][1]
        s = {"b0": -1.0, "top": 1.0}
        for k in ("floor", "rock", "crease", "sill", "rail", "redge", "rmid"):
            s[k] = self.s_vertex(t, idx[k])
        s["rock2"] = self.s_of_y(t, pts[idx["rock"]][1] + .012)
        s["sill0"] = self.s_of_y(t, ys - .012)
        s["sill_in"] = self.s_of_y(t, ys + min(.02, (yr - ys) / 4))
        s["rail_in"] = self.s_of_y(t, yr - min(.02, (yr - ys) / 4))
        out = [s[k] for k in self.KEYS]
        for k in range(1, len(out)):
            out[k] = max(out[k], out[k - 1] + 1e-4)
        return out


# --- shell ---------------------------------------------------------------------------------------------------------
def interior_of(t, ranges):
    return any(a + D_EDGE - 1e-6 <= t <= b - D_EDGE + 1e-6 for a, b in ranges)


def stations(car):
    p = car.p
    feats = {0.0, 1.0}
    for a, b in p["SIDE"] + p["SCREENS"]:
        feats |= {a, a + D_EDGE, b - D_EDGE, b}
    for a, b in p["SCREENS"]:
        feats |= {a - E_EDGE, b + E_EDGE}
    for zw in (-WHEEL_Z, WHEEL_Z):
        for dz in (-1, -.68, 0, .68, 1):  # .68: the tech arch's chamfer corners
            feats.add((zw + dz * p["ARCH"]["r"] - Z0) / L)
    feats |= {.003, .01, .025, .05, .95, .975, .99, .997}
    feats = sorted(round(min(max(t, 0), 1), 5) for t in feats)
    grid = [i / 14 for i in range(15)]
    out = sorted(set(feats + [g for g in grid if min(abs(g - f) for f in feats) > .03]))
    return out


def shell(car, mesh):
    p, keys = car.p, car.KEYS
    K = {k: i for i, k in enumerate(keys)}
    n = len(keys)
    st = stations(car)
    zone = (min(a for a, _ in p["SIDE"] + p["SCREENS"]), max(b for _, b in p["SIDE"] + p["SCREENS"]))

    def color(t, k):
        if k <= K[car.LOWER_TOP]:
            return p["LOWER"]
        if zone[0] <= t <= zone[1] and K["sill"] <= k <= K["rail"]:
            return p["FRAME"]
        if k > K["rail"] and any(a <= t <= b for a, b in p["SCREENS"]):
            return p["FRAME"]
        return p["BODY"]

    grid = {}
    for i, t in enumerate(st):
        rows = car.rows_at(t)
        side_open, screen_open = interior_of(t, p["SIDE"]), interior_of(t, p["SCREENS"])
        for k, s in enumerate(rows):
            q, nn = car.at(t, s), car.normal(t, s)
            inset = (side_open and K["sill_in"] <= k <= K["rail_in"]) or (screen_open and k >= K["sill_in"])
            if inset:
                q = tuple(q[a] - nn[a] * p["INSET"] for a in range(3))
            q, cut = car.arch_cut(q)
            for side in (1, -1):
                if side < 0 and k in (0, n - 1):
                    grid[(i, k, side)] = grid[(i, k, 1)]
                    continue
                v = mesh.vert((q[0] * side, q[1], q[2]), color(t, k), (nn[0] * side, nn[1], nn[2]))
                grid[(i, k, side)] = (v, cut, inset)
    for i in range(len(st) - 1):
        for k in range(n - 1):
            for side in (1, -1):
                qd = [grid[(i, k, side)], grid[(i, k + 1, side)], grid[(i + 1, k + 1, side)], grid[(i + 1, k, side)]]
                if all(c for _, c, _ in qd):
                    continue
                idx = [v for v, _, _ in qd]
                role = "car_glass" if all(g for _, _, g in qd) else "car_body"
                mesh.face(idx if side > 0 else idx[::-1], role, fixed=True)
    # End panels: own ring and a fan from the centre (star-shaped, not always convex).
    for i, nz in ((0, -1), (len(st) - 1, 1)):
        ring = list(range(n)) + list(range(n - 2, 0, -1))
        sides = [1] * n + [-1] * (n - 2)
        vs, pts = [], []
        for k, side in zip(ring, sides):
            v = mesh.v[grid[(i, k, side)][0]]
            q = (v[0], v[2], -v[1])
            pts.append(q)
            vs.append(mesh.vert(q, p["LOWER"] if k <= K[car.LOWER_TOP] else p["BODY"], (0, 0, nz)))
        c = mesh.vert(tuple(sum(q[a] for q in pts) / len(pts) for a in range(3)), p["BODY"], (0, 0, nz))
        for a in range(len(vs)):
            mesh.face((vs[a], vs[(a + 1) % len(vs)], c), "car_body")


# --- small parts ---------------------------------------------------------------------------------------------------
def frame_on(p, nrm):
    """Local axes on a surface point: u horizontal across the surface, v up the surface, n out."""
    up = (0, 1, 0)
    u = (up[1] * nrm[2] - up[2] * nrm[1], up[2] * nrm[0] - up[0] * nrm[2], up[0] * nrm[1] - up[1] * nrm[0])
    lu = math.sqrt(sum(c * c for c in u)) or 1
    u = tuple(c / lu for c in u)
    v = (nrm[1] * u[2] - nrm[2] * u[1], nrm[2] * u[0] - nrm[0] * u[2], nrm[0] * u[1] - nrm[1] * u[0])
    return p, nrm, u, v


def prism(mesh, fr, w, h, r, d0, d1, color, role, ox=0.0, oy=0.0, seg=2):
    """Closed rounded-rect plate on frame fr: w x h, corner radius r, from depth d0 to d1 along the normal."""
    p, nrm, u, v = fr
    r = min(r, w / 2 - 1e-4, h / 2 - 1e-4)
    outline = rrect_pts(ox, oy, w / 2, h / 2, (r,) * 4, seg) if r > 1e-4 else rrect_pts(ox, oy, w / 2, h / 2, (0,) * 4, 1)
    rings = []
    for d in (d0, d1):
        rings.append([mesh.vert(tuple(p[a] + nrm[a] * d + u[a] * a2 + v[a] * b2 for a in range(3)), color) for a2, b2 in outline])
    m = len(outline)
    for i in range(m):
        j = (i + 1) % m
        mesh.face((rings[0][i], rings[0][j], rings[1][j], rings[1][i]), role)
    mesh.face(rings[1], role)
    mesh.face(rings[0][::-1], role)


def surface_frame(car, t, y, side, lift=0.0):
    q, nn = car.lifted(t, car.s_of_y(t, y), lift, side)
    return frame_on(q, nn)


def end_frame(car, front, x, y):
    """A frame on a flat end panel (tech fascias): the panel's own lean from two points of the end ring."""
    t = 1.0 if front else 0.0
    a = car.at(t, car.s_of_y(t, y - .03))
    b = car.at(t, car.s_of_y(t, y + .03))
    dz, dy = b[2] - a[2], b[1] - a[1]
    sgn = 1 if front else -1
    nrm = (0.0, -dz * sgn, dy * sgn)
    ln = math.hypot(nrm[1], nrm[2]) or 1
    nrm = (0.0, nrm[1] / ln, nrm[2] / ln)
    z = (a[2] + b[2]) / 2
    return frame_on((x, y, z), nrm)


def lamps_green(car, parts, shell_mesh):
    p = car.p
    dark, warm_white = p["FRAME"], p["BODY"]
    for side in (1, -1):
        # Head: a capsule unit at each nose corner - dark housing, three LED dots, a DRL bar along its lower edge, clear lens.
        fr = surface_frame(car, .962, .575, side, -.006)  # sunk: the curved nose closes round the unit's ends
        prism(parts, fr, .23, .08, .04, -.05, .006, dark, "car_body")
        for ox in (-.062, 0, .062):
            prism(parts, fr, .032, .032, .016, .004, .012, warm_white, "car_head", ox=ox, oy=.008, seg=1)
        prism(parts, fr, .17, .011, .005, .004, .011, warm_white, "car_head", oy=-.026, seg=1)
        prism(parts, fr, .222, .073, .036, .013, .018, warm_white, "car_glass", seg=1)
        # Tail: a capsule unit at each tail corner with a long lit bar inside the lens.
        fr = surface_frame(car, .03, .665, side, .0)
        prism(parts, fr, .25, .075, .036, -.05, .006, dark, "car_body")
        prism(parts, fr, .19, .026, .013, .004, .012, warm_white, "car_tail", oy=.006)
        prism(parts, fr, .12, .008, .004, .004, .011, warm_white, "car_tail", ox=-.02, oy=-.022, seg=1)
        prism(parts, fr, .242, .068, .033, .013, .018, warm_white, "car_glass", seg=1)
    # A thin lit line joins the two tail units across the round tail.
    ts = [.03 * (1 - math.sin(j / 10 * math.pi / 2)) for j in range(11)]
    r1.strip_y(car, shell_mesh, ts, .652, .662, "car_tail", warm_white, lift=.01, wrap=True)


def lamps_tech(car, parts, shell_mesh):
    p = car.p
    dark, ice = p["FRAME"], p["BODY"]
    # Front: a black lamp band across the fascia, the hairline bar on top of it, two projector units of three lenses below.
    fr = end_frame(car, True, 0, .6)
    prism(parts, fr, 1.42, .1, .012, -.04, .004, dark, "car_body", seg=1)
    prism(parts, fr, 1.36, .012, .005, .003, .01, ice, "car_head", oy=.03, seg=1)
    for side in (1, -1):
        for ox in (-.06, 0, .06):
            prism(parts, fr, .036, .036, .018, .003, .012, ice, "car_head", ox=side * .5 + ox, oy=-.012, seg=1)
        prism(parts, fr, .22, .055, .01, .012, .016, ice, "car_glass", ox=side * .5, oy=-.012, seg=1)
    fr = end_frame(car, True, 0, .4)
    prism(parts, fr, 1.12, .07, .02, -.04, .006, dark, "car_body", seg=1)  # intake
    # Rear: a black panel, a segmented red bar with an ice-blue reverse segment in the middle, a diffuser blade.
    fr = end_frame(car, False, 0, .74)
    prism(parts, fr, 1.44, .15, .014, -.04, .004, dark, "car_body", seg=1)
    for j in range(-5, 6):
        role = "car_head" if j == 0 else "car_tail"
        prism(parts, fr, .112, .022, 0, .003, .012, ice, role, ox=j * .125, oy=.035)
    fr = end_frame(car, False, 0, .38)
    prism(parts, fr, 1.0, .05, .01, -.04, .006, dark, "car_body", seg=1)
    # Side markers: the hairline bar turns the front corners.
    for side in (1, -1):
        prism(parts, surface_frame(car, .985, .625, side), .1, .012, 0, -.004, .006, ice, "car_head")
        prism(parts, surface_frame(car, .015, .76, side), .1, .016, 0, -.004, .006, ice, "car_tail")


def doors(car, shell_mesh, parts):
    """Door cuts and a cut along the door bottoms (thin dark strips on the surface) and flush handles (parts)."""
    p = car.p

    def yb(t):  # the door bottoms: just above the lower band
        if "CLAD" in p:
            return car.tab("CLAD", t) + .03
        return car.at(t, car.rows_at(t)[car.KEYS.index("rock2")])[1] + .02

    cuts = []
    for t, y_start in p["DOORS"]:  # y_start: the rear cut begins above the rear arch
        r1.strip_t(car, shell_mesh, t, y_start or yb(t), car.tab("SILL", t) - .015, .0016, "car_body", p["SEAM_C"], lift=.0025, steps=5)
        cuts.append(t)
    lo, hi = min(cuts), max(cuts)
    ts = [lo + (hi - lo) * j / 12 for j in range(13)]
    ts = [t for t in ts if not car.arch_cut(car.at(t, car.s_of_y(t, yb(t))))[1]]
    for side in (1, -1):
        prev = None
        for t in ts:
            pair = []
            for y in (yb(t), yb(t) + .0035):
                q, nn = car.lifted(t, car.s_of_y(t, y), .0025, side)
                pair.append(shell_mesh.vert(q, p["SEAM_C"], nn))
            if prev:
                shell_mesh.face((prev[0], prev[1], pair[1], pair[0]), "car_body")
            prev = pair
    handle = p["BODY"] if p["name"] == "car_green" else p["FRAME"]
    for t0 in (cuts[1], cuts[2]):  # each handle near its door's rear edge
        t = t0 + .05
        y = car.tab("SILL", t) - .075
        for side in (1, -1):
            fr = surface_frame(car, t, y, side)
            prism(parts, fr, .17, .036, 0, -.01, .002, p["FRAME"], "car_body")
            prism(parts, fr, .13, .014, 0, -.01, .006, handle, "car_body")


def pods(car, parts):
    """Camera pods (the mirrors' successor) at the A-pillar base, kept inside the 1.90 m lane envelope."""
    p = car.p
    t = p["SIDE"][-1][1] + .006
    y = car.tab("SILL", t) + .045
    for side in (1, -1):
        fr = surface_frame(car, t, y, side, .025)
        x = fr[0][0]
        reach = .04 * abs(fr[1][0]) + .055 * abs(fr[2][0])  # the pod's depth and half length, as far as they point out
        if abs(x) + reach > .945:  # clamp: the pod's outer face at most 0.945 m out (lane probe 0.95 m)
            fr = ((side * (.945 - reach), fr[0][1], fr[0][2]),) + fr[1:]
        col = p["BODY"] if p["name"] == "car_green" else p["FRAME"]
        prism(parts, fr, .11, .05, .02, -.03, .04, col, "car_body", seg=1)


def solar_roof(car, mesh):
    """Green: cells following the roof curve between the rails, the warm white shell showing as their frame; a slate tray
    edge round the field, and a thin mint charge line at its front edge."""
    p = car.p
    cells_t, cells_s, t0, t1 = 6, 3, .21, .55
    cell, tray = (.07, .16, .19, 1), p["FRAME"]
    k_rail0 = car.KEYS.index("rail0")
    s_lo = lambda t: car.rows_at(t)[k_rail0] + .05
    for side in (1, -1):
        for i in range(cells_t):
            a = t0 + (t1 - t0) * i / cells_t + .004
            b = t0 + (t1 - t0) * (i + 1) / cells_t - .004
            for j in range(cells_s):
                quad = []
                for t in (a, b):
                    lo = s_lo(t)
                    s0 = lo + (1 - lo) * j / cells_s + .012
                    s1 = lo + (1 - lo) * (j + 1) / cells_s - (.012 if j < cells_s - 1 else 0)
                    quad.append((t, s0, s1))
                (ta, la, ha), (tb, lb, hb) = quad
                vs = []
                for t, s in ((ta, la), (ta, ha), (tb, hb), (tb, lb)):
                    q, nn = car.lifted(t, s, .006, side)
                    if s >= .999:
                        q = (side * .008, q[1], q[2])
                    vs.append(mesh.vert(q, cell, nn))
                mesh.face(vs, "car_body")
        # Tray edge along the outer side of the field.
        prev = None
        for i in range(cells_t + 1):
            t = t0 + (t1 - t0) * i / cells_t
            pair = []
            for ds in (-.012, 0):
                q, nn = car.lifted(t, s_lo(t) + ds, .004, side)
                pair.append(mesh.vert(q, tray, nn))
            if prev:
                mesh.face((prev[0], prev[1], pair[1], pair[0]), "car_body")
            prev = pair
    s0 = s_lo(t1 + .01)
    for side in (1, -1):
        prev = None
        for j in range(5):
            s = s0 + (1 - s0) * j / 4
            pair = []
            for t in (t1 + .004, t1 + .008):
                q, nn = car.lifted(t, s, .006, side)
                if s >= .999:
                    q = (side * .004, q[1], q[2])
                pair.append(mesh.vert(q, p["BODY"], nn))
            if prev:
                mesh.face((prev[0], prev[1], pair[1], pair[0]), "car_seam")
            prev = pair


def lathe(mesh, cx, cy, cz, side, profile, color, n, role="car_body"):
    r1.lathe(mesh, cx, cy, cz, side, profile, color, n=n, role=role)


def wheel(car, mesh, x, z):
    w = car.p["WHEEL"]
    r, wd = w["r"], w["w"]
    side = 1 if x > 0 else -1
    o, i = wd / 2, -wd / 2
    tyre = (.03, .03, .033, 1)
    if w["style"] == "disc":
        # Balloon tyre: bead, bulging sidewall, round shoulder, tread; an aero cover with five dark openings onto the barrel.
        lathe(mesh, x, r, z, side, [(r * .66, i + .012), (r * .92, i), (r, i + .035), (r, o - .035), (r * .92, o), (r * .66, o - .012)],
              tyre, 18)
        lathe(mesh, x, r, z, side, [(0, o - .07), (r * .68, o - .07), (r * .68, o - .03), (0, o - .03)], (.05, .05, .055, 1), 10)
        lathe(mesh, x, r, z, side, [(0, o - .028), (r * .67, o - .028), (r * .66, o - .004), (r * .32, o + .01), (0, o + .012)],
              (.88, .84, .76, 1), 14)
        for k in range(5):  # five dark openings onto the barrel (radial u, tangential v)
            a = 2 * math.pi * (k + .5) / 5
            fr = ((x + side * (o + .002), r + math.cos(a) * r * .5, z + math.sin(a) * r * .5), (side, 0, 0),
                  (0, math.cos(a), math.sin(a)), (0, -math.sin(a), math.cos(a)))
            prism(mesh, fr, .075, .042, 0, -.012, .004, (.04, .045, .045, 1), "car_body")
        lathe(mesh, x, r, z, side, [(0, o + .008), (r * .2, o + .008), (r * .19, o + .02), (0, o + .022)], car.p["LOWER"], 8)
    else:
        # Low-profile tyre, a dark barrel and brake disc behind seven split spokes, an ice-blue centre ring.
        lathe(mesh, x, r, z, side, [(r * .76, i + .01), (r * .94, i), (r, i + .022), (r, o - .022), (r * .94, o), (r * .76, o - .012)],
              tyre, 18)
        lathe(mesh, x, r, z, side, [(0, o - .08), (r * .77, o - .08), (r * .77, o - .006), (r * .72, o - .01), (0, o - .06)],
              (.04, .045, .05, 1), 16)
        lathe(mesh, x, r, z, side, [(0, o - .07), (r * .5, o - .07), (r * .5, o - .055), (0, o - .055)], (.32, .33, .34, 1), 10)
        for k in range(7):  # seven blade spokes, each a flat bar turned a little off radial (turbine)
            a = 2 * math.pi * k / 7
            c = (x + side * (o - .022), r + math.cos(a) * r * .46, z + math.sin(a) * r * .46)
            r1.mesh_box_rot(mesh, c, (.024, r * .52, .034), a + .18, (.2, .22, .25, 1))
        lathe(mesh, x, r, z, side, [(0, o - .03), (r * .16, o - .03), (r * .15, o - .008), (0, o - .006)], (.2, .22, .25, 1), 8)
        lathe(mesh, x, r, z, side, [(r * .11, o - .01), (r * .15, o - .01), (r * .15, o - .004), (r * .11, o - .004)], (.6, .85, 1, 1), 8,
              role="car_head")


# --- objects ---------------------------------------------------------------------------------------------------------
COLOUR_ROLES = ("car_body", "car_interior", "car_shadow")  # the roles whose material reads the colour attribute


def subset(mesh, keep):
    """The faces whose role passes keep(role), with their vertices re-indexed."""
    out, remap = Mesh2(), {}
    for f, role, fixed in zip(mesh.f, mesh.roles, mesh.fixed):
        if not keep(role):
            continue
        idx = []
        for i in f:
            if i not in remap:
                remap[i] = len(out.v)
                out.v.append(mesh.v[i])
                out.c.append(mesh.c[i])
                out.n.append(mesh.n[i])
            idx.append(remap[i])
        out.f.append(tuple(idx))
        out.roles.append(role)
        out.fixed.append(fixed)
    return out


def to_objects(name, mesh, mats, parent, sharp_deg, recalc):
    """Two objects: the coloured roles with the colour attribute, the glass and lamps without one, so the glTF export gives
    COLOR_0 only to materials that use it (a viewer would otherwise tint the glass by the body colour)."""
    to_object(name, subset(mesh, lambda r: r in COLOUR_ROLES), mats, parent, sharp_deg, recalc, True)
    lit = subset(mesh, lambda r: r not in COLOUR_ROLES)
    if lit.f:
        to_object(name + "_lit", lit, mats, parent, sharp_deg, recalc, False)


def to_object(name, mesh, mats, parent, sharp_deg, recalc, colours=True):
    faces = []
    for f, fixed in zip(mesh.f, mesh.fixed if hasattr(mesh, "fixed") else [False] * len(mesh.f)):
        if not fixed and not recalc:
            nv = newell([mesh.v[i] for i in f])
            want = [sum(B(mesh.n[i])[a] for i in f if mesh.n[i]) for a in range(3)]
            if sum(nv[a] * want[a] for a in range(3)) < 0:
                f = f[::-1]
        faces.append(f)
    me = bpy.data.meshes.new(name)
    me.from_pydata(mesh.v, [], faces)
    order = [r for r in mats if r in mesh.roles]
    for r in order:
        me.materials.append(mats[r])
    me.polygons.foreach_set("material_index", [order.index(r) for r in mesh.roles])
    if colours:
        attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        attr.data.foreach_set("color", [c for rgba in mesh.c for c in rgba])
    me.update()
    bm = bmesh.new()
    bm.from_mesh(me)
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces:
            if order[f.material_index] == "car_shadow" and f.normal.z < 0:
                f.normal_flip()
    for f in bm.faces:
        f.smooth = True
    thr = math.radians(sharp_deg)
    for e in bm.edges:
        if len(e.link_faces) != 2 or e.calc_face_angle(0) > thr:
            e.smooth = False
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    obj.parent = parent
    bpy.context.collection.objects.link(obj)
    return obj


def make_materials(spec):
    m = spec["MATS"]
    glass_rgba, glass_metal = m["glass"]
    mats = {
        "car_body": material("car_body", (1, 1, 1, 1), rough=m["body"]["rough"]),
        "car_interior": material("car_interior", (1, 1, 1, 1), rough=m["interior_rough"]),
        "car_glass": material("car_glass", glass_rgba, rough=.06),
        "car_seam": material("car_seam", m["seam"][0], rough=.3, emit=m["seam"][1], emit_strength=m["seam"][2]),
        "car_head": material("car_head", m["head"][0], rough=.25, emit=m["head"][1], emit_strength=m["head"][2]),
        "car_tail": material("car_tail", m["tail"][0], rough=.3, emit=m["tail"][1], emit_strength=m["tail"][2]),
        "car_shadow": material("car_shadow", (0, 0, 0, .4), rough=1),
    }
    bsdf = lambda name: next(n for n in mats[name].node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf("car_body").inputs["Metallic"].default_value = m["body"]["metal"]
    bsdf("car_glass").inputs["Metallic"].default_value = glass_metal
    # Material Preview shows the design colours: body, interior and the contact shadow read the colour attribute.
    for name in ("car_body", "car_interior", "car_shadow"):
        t = mats[name].node_tree
        node = t.nodes.new("ShaderNodeVertexColor")
        node.layer_name = "Col"
        node.location = (-400, 200)
        t.links.new(node.outputs["Color"], bsdf(name).inputs["Base Color"])
        if name == "car_shadow":
            t.links.new(node.outputs["Alpha"], bsdf(name).inputs["Alpha"])
            mats[name].surface_render_method = "BLENDED"
        mats[name].diffuse_color = (spec["BODY"] if name == "car_body" else (.6, .6, .6, 1))
    return mats


def build(spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    car = (GreenBody if spec["name"] == "car_green" else TechBody)(spec)
    mats = make_materials(spec)
    root = bpy.data.objects.new("ROOT_" + spec["name"].upper() + "_2127_R2", None)
    bpy.context.collection.objects.link(root)
    empty = bpy.data.objects.new(spec["name"], None)
    empty.parent = root
    bpy.context.collection.objects.link(empty)
    body, parts = Mesh2(), Mesh2()
    counts = {}

    def step(label, fn, *a):
        nb, npt = sum(len(f) - 2 for f in body.f), sum(len(f) - 2 for f in parts.f)
        fn(*a)
        counts[label] = sum(len(f) - 2 for f in body.f) + sum(len(f) - 2 for f in parts.f) - nb - npt

    step("shell", shell, car, body)
    if spec["name"] == "car_green":
        step("arches", r1.arch_trim, car, body)
    else:  # a slim graphite lip: the angular arch reads from the body edge, not from a black outline
        step("arches", r1.arch_trim, car, body, .025, spec["LOWER"])
    step("doors", doors, car, body, parts)
    if spec["name"] == "car_green":
        step("solar roof", solar_roof, car, body)
        step("lamps", lamps_green, car, parts, body)
    else:
        step("lamps", lamps_tech, car, parts, body)
    step("pods", pods, car, parts)
    step("interior", r1.interior, car, parts, True)
    step("shadow", ground, parts, True)

    def wheels():
        for wz in (-WHEEL_Z, WHEEL_Z):
            for x in (-spec["WHEEL"]["x"], spec["WHEEL"]["x"]):
                wheel(car, parts, x, wz)
    step("wheels", wheels)
    to_objects(spec["name"] + "_shell", body, mats, empty, spec["SHARP_DEG"], False)
    to_objects(spec["name"] + "_parts", parts, mats, empty, 35, True)
    tris = sum(len(f) - 2 for f in body.f + parts.f)
    blend, glb = os.path.join(HERE, spec["stem"] + ".blend"), os.path.join(HERE, spec["stem"] + ".glb")
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials="EXPORT", export_animations=False, export_cameras=False,
                              export_lights=False, export_extras=False, export_vertex_color="MATERIAL")
    print("@@CAR@@", spec["name"], "tris", tris, "bytes", os.path.getsize(glb), counts)


def main():
    for spec in (GREEN, TECH):
        build(spec)


if __name__ == "__main__":
    main()
