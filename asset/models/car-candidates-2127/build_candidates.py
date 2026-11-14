"""car-candidates-2127: two human-driven street-car candidates beside car-family-2127's `car_human` (draft, not placed).

Re-run headless (Blender 5.2):
  blender -b --factory-startup --python-exit-code 1 -P build_candidates.py
Writes car-green-2127.blend/.glb and car-tech-2127.blend/.glb next to this file (glTF preset, no Meshopt/Draco).

Same contract as car_human (build_car.py): real metres, 4.6 m long, ground contact at y = 0, front = +Z three.js (-Y Blender),
wheels at z = +-1.42, the same material roles (car_body and car_interior carry the colour attribute, car_glass, car_seam,
car_head, car_tail, car_shadow), so a later swap only changes the asset id and the variant name. Roots ROOT_CAR_GREEN_2127 /
ROOT_CAR_TECH_2127 hold the empties car_green / car_tech.

  car_green  future green: rounded, tall open glasshouse, warm white over a muted teal lower band, a solar roof built from
             cells over the roof shell, soft wrap-round lamps, disc wheels.
  car_tech   future tech: low and wide, flat fascias, octagonal wheel arches, deep grey metal, smoked glass under a black
             floating roof, hairline cool light bars front and side, a thin red tail bar, spoked dark wheels.

The shell is build_car's loft (t tail 0 .. nose 1, rows from bottom centre to top centre, mirrored) driven by per-car
tables; rows sit on designed heights so window surrounds, cladding edges and the crease are mesh rows. Lamps, door cuts,
solar cells and arch lips are thin strips lifted off the analytic surface. Coordinates are three.js; geo_helpers.B maps them.
"""
import math
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)
sys.path.insert(0, MODELS)
sys.path.insert(0, os.path.join(MODELS, "car-family-2127"))
from geo_helpers import material  # noqa: E402
from build_car import Mesh, box, lerp_table, person, seat, ground, to_object  # noqa: E402

L, Z0 = 4.6, -2.3
WHEEL_Z = 1.42


def rgb(r, g, b):
    return (r, g, b, 1)


GREEN = dict(
    name="car_green",
    # Both ends close down to a small round tip (width falls steeply over the last centimetres), so nose and tail read as
    # rounded volumes rather than a flat panel.
    TOP=[(0, .74), (.004, .84), (.012, .95), (.03, 1.1), (.07, 1.28), (.13, 1.44), (.2, 1.54), (.3, 1.6), (.42, 1.62), (.52, 1.6),
         (.6, 1.52), (.67, 1.38), (.74, 1.2), (.8, 1.04), (.85, .94), (.9, .86), (.95, .79), (.98, .74), (.995, .7), (1, .64)],
    BOT=[(0, .5), (.004, .43), (.015, .36), (.04, .3), (.08, .27), (.5, .25), (.93, .27), (.98, .33), (.995, .39), (1, .45)],
    WID=[(0, .34), (.003, .5), (.01, .62), (.03, .76), (.07, .86), (.12, .91), (.25, .93), (.7, .93), (.86, .9), (.93, .82),
         (.965, .72), (.99, .57), (.997, .45), (1, .3)],
    SQR=[(0, 2.4), (.15, 2.9), (.85, 2.9), (1, 2.4)],
    TUMBLE=.2,
    BELLY=[(0, .5), (.06, .36), (.5, .33), (.94, .36), (1, .48)],
    CLAD=[(0, .6), (.06, .53), (.2, .47), (.8, .47), (.94, .53), (1, .55)],
    BELT=[(0, .84), (.5, .8), (1, .72)],
    SILL=[(0, .9), (.1, .93), (.3, .92), (.6, .92), (.75, .97), (.82, .99), (1, .99)],
    RAIL_DROP=[(0, .06), (.2, .12), (.5, .13), (.62, .1), (1, .06)],
    SIDE=[(.15, .37), (.395, .565)],
    SCREENS=[(.045, .135), (.58, .82)],  # rear glass, windscreen: glass from the frame row to the top centre
    ROOF_GLASS=None,
    ARCH=dict(r=.44, sides=0),  # round
    WHEEL=dict(r=.36, w=.2, x=.79, style="disc"),
    HEAD=dict(y=(.52, .6), t=.9), TAIL=dict(y=(.6, .68), t=.07),
    BODY=rgb(.86, .84, .79), LOWER=rgb(.42, .57, .55), FRAME=rgb(.16, .2, .21), ROOF=None, CAP_TAIL=None,
    SEAM=dict(y=None, t=(.1, .88), lift=.004, h=.014),  # y None: on the belt row
    DOORS=[(.6, .3, None), (.38, .3, None), (.29, .84, None)],  # t, y0, y1 (None: sill)
    DOOR_C=rgb(.5, .5, .48),
    INTERIOR=dict(dy=0, front=.45, rear=-.45, dash=1.15, seat=rgb(.72, .66, .56), trim=rgb(.36, .5, .48)),
    MATS=dict(body=dict(rough=.42, metal=.08), glass=(.72, .86, .86, .28),
              seam=((.66, .95, .86, 1), (.62, .95, .84, 1), 1.6), head=((1, .98, .93, 1), (1, .95, .84, 1), 1.2),
              tail=((.9, .5, .44, 1), (1, .3, .22, 1), 1.0)),
)

TECH = dict(
    name="car_tech",
    TOP=[(0, .84), (.012, .92), (.05, .99), (.12, 1.08), (.2, 1.18), (.3, 1.29), (.38, 1.33), (.48, 1.33), (.54, 1.29), (.6, 1.18),
         (.66, 1.04), (.72, .93), (.8, .86), (.88, .8), (.95, .73), (1, .66)],
    BOT=[(0, .34), (.02, .26), (.06, .21), (.5, .2), (.94, .21), (.98, .26), (1, .3)],
    WID=[(0, .78), (.012, .85), (.05, .92), (.18, .95), (.82, .95), (.95, .9), (.99, .83), (1, .78)],
    SQR=[(0, 4), (.08, 4.6), (.92, 4.6), (1, 4)],
    TUMBLE=.34,
    BELLY=[(0, .42), (.05, .3), (.5, .29), (.95, .3), (1, .38)],
    CLAD=[(0, .5), (.06, .42), (.2, .36), (.8, .36), (.94, .42), (1, .44)],
    BELT=[(0, .74), (.5, .7), (1, .62)],
    SILL=[(0, .82), (.15, .86), (.3, .88), (.55, .86), (.7, .88), (.75, .9), (1, .9)],
    RAIL_DROP=[(0, .05), (.2, .08), (.5, .09), (.62, .07), (1, .05)],
    SIDE=[(.3, .45), (.47, .57)],
    SCREENS=[(.06, .285), (.585, .74)],
    ROOF_GLASS=(.31, .55),
    ARCH=dict(r=.41, sides=8),  # octagonal
    WHEEL=dict(r=.36, w=.24, x=.81, style="spoke"),
    HEAD=dict(y=(.6, .622), t=.955), TAIL=dict(y=(.78, .8), t=.035),
    BODY=rgb(.2, .21, .23), LOWER=rgb(.075, .08, .085), FRAME=rgb(.03, .03, .035), ROOF=rgb(.03, .03, .035), CAP_TAIL=rgb(.05, .05, .055),
    SEAM=dict(y=None, t=(.06, .74), lift=.004, h=.01),
    DOORS=[(.6, .3, None), (.45, .3, None), (.29, .82, None)],
    DOOR_C=rgb(.05, .05, .055),
    INTERIOR=dict(dy=-.16, front=.1, rear=-.72, dash=.9, seat=rgb(.14, .15, .17), trim=rgb(.3, .5, .62)),
    MATS=dict(body=dict(rough=.26, metal=.75), glass=(.1, .12, .15, .62),
              seam=((.62, .85, 1, 1), (.55, .82, 1, 1), 3.0), head=((.86, .94, 1, 1), (.82, .92, 1, 1), 2.2),
              tail=((.6, .12, .12, 1), (1, .12, .1, 1), 1.6)),
)

ROW_KEYS = ["b0", "b1", "belly", "clad", "clad2", "f1", "f2", "belt", "sill0", "sill", "frame", "rail0", "rail", "rail2", "r1", "r2", "r3", "top"]
R = {k: i for i, k in enumerate(ROW_KEYS)}
ROWS = len(ROW_KEYS)
DARK_KEYS = ("sill", "frame", "rail0", "rail")


class Car:
    def __init__(self, spec):
        self.p = spec
        self.tab = lambda key, t: lerp_table(spec[key], t)
        zone = [a for a, _ in spec["SIDE"] + spec["SCREENS"]], [b for _, b in spec["SIDE"] + spec["SCREENS"]]
        self.zone = (min(zone[0]), max(zone[1]))

    # --- analytic surface ---------------------------------------------------------------------------------
    def sec(self, t):
        top, bot = self.tab("TOP", t), self.tab("BOT", t)
        return (top + bot) / 2, (top - bot) / 2, self.tab("WID", t), self.tab("SQR", t)

    def at(self, t, s):
        yc, h, w, n = self.sec(t)
        a = s * math.pi / 2
        sa, ca = math.sin(a), max(math.cos(a), 0)
        x = w * ca ** (2 / n)
        if s > .05:  # the glasshouse leans in
            x *= 1 - self.p["TUMBLE"] * ((s - .05) / .95) ** 1.6
        y = yc + h * math.copysign(abs(sa) ** (2 / n), sa)
        return x, y, Z0 + t * L

    def s_of_y(self, t, y):
        yc, h, _, n = self.sec(t)
        v = max(min((y - yc) / h, .999), -.999)
        return math.asin(math.copysign(abs(v) ** (n / 2), v)) * 2 / math.pi

    def normal(self, t, s):
        e = 1e-3
        a, b = self.at(min(t + e, 1), s), self.at(max(t - e, 0), s)
        c, d = self.at(t, min(s + e, 1)), self.at(t, max(s - e, -1))
        u = [a[i] - b[i] for i in range(3)]
        v = [c[i] - d[i] for i in range(3)]
        n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
        r = math.sqrt(sum(q * q for q in n)) or 1
        n = [q / r for q in n]
        p, yc = self.at(t, s), self.sec(t)[0]
        if n[0] * p[0] + n[1] * (p[1] - yc) + n[2] * (t - .5) * 3 < 0:
            n = [-q for q in n]
        return n

    def lifted(self, t, s, lift, side=1):
        p, n = self.at(t, s), self.normal(t, s)
        q = [p[i] + n[i] * lift for i in range(3)]
        return (q[0] * side, q[1], q[2]), (n[0] * side, n[1], n[2])

    # --- rows and roles ---------------------------------------------------------------------------------------
    def row_y(self, t):
        top = self.tab("TOP", t)
        y = {"belly": self.tab("BELLY", t), "clad": self.tab("CLAD", t), "belt": self.tab("BELT", t), "sill": self.tab("SILL", t)}
        y["rail"] = top - self.tab("RAIL_DROP", t)
        return y

    def rows_at(self, t):
        y = self.row_y(t)
        bot = self.tab("BOT", t)
        ys = {"b1": (bot + y["belly"]) / 2, "belly": y["belly"], "clad": y["clad"], "clad2": y["clad"] + .012, "belt": y["belt"],
              "sill0": y["sill"] - .012, "sill": y["sill"], "frame": y["sill"] + .035, "rail0": y["rail"] - .035, "rail": y["rail"],
              "rail2": y["rail"] + .012}
        # Over the hood and the tail the glasshouse rows have no window to frame: spread them between the belt and the top
        # instead of letting them pile up at the crown (which faceted the hood).
        top = self.tab("TOP", t)
        for k, frac in (("sill0", .3), ("sill", .36), ("frame", .45), ("rail0", .84), ("rail", .88), ("rail2", .92)):
            ys[k] = min(ys[k], ys["belt"] + (top - ys["belt"]) * frac)
        s = {"b0": -1.0}
        for k in ("b1", "belly", "clad", "clad2"):
            s[k] = self.s_of_y(t, ys[k])
        for k in ("belt", "sill0", "sill", "frame", "rail0", "rail", "rail2"):
            s[k] = self.s_of_y(t, ys[k])
        s["f1"] = s["clad2"] + (s["belt"] - s["clad2"]) / 3
        s["f2"] = s["clad2"] + (s["belt"] - s["clad2"]) * 2 / 3
        out = [s[k] if k in s else None for k in ROW_KEYS]
        top = out[R["rail2"]]
        for j, k in enumerate(("r1", "r2", "r3")):
            out[R[k]] = top + (1 - top) * (1 - math.cos((j + 1) / 4 * math.pi / 2)) ** .9
        out[-1] = 1.0
        for k in range(1, ROWS):  # forced strictly increasing (the ends squeeze the upper rows together)
            out[k] = max(out[k], out[k - 1] + 2e-3)
        over = out[-1] - 1
        if over > 0:  # squeezed past the top: compress everything above the belt into the room left
            b = R["belt"]
            lo = out[b]
            for k in range(b + 1, ROWS):
                out[k] = lo + (out[k] - lo) * (1 - lo) / (out[-1] - lo)
        # Toward the end panels the rows ease into an even spread, so the rounded ends do not crease where rows bunch up.
        e = min(t, 1 - t)
        w = 1 - min(e / .06, 1)
        w = w * w * (3 - 2 * w)
        if w > 0:
            out = [(1 - w) * s + w * (-1 + 2 * k / (ROWS - 1)) for k, s in enumerate(out)]
        return out

    def in_any(self, t, ranges):
        return any(a < t < b for a, b in ranges)

    def role(self, tm, k):
        p = self.p
        if R["frame"] <= k < R["rail0"] and self.in_any(tm, p["SIDE"]):
            return "car_glass"
        if k >= R["frame"] and self.in_any(tm, p["SCREENS"]):
            return "car_glass"
        if p["ROOF_GLASS"] and k >= R["rail2"] and p["ROOF_GLASS"][0] < tm < p["ROOF_GLASS"][1]:
            return "car_glass"
        return "car_body"

    def color(self, t, k):
        p = self.p
        a, b = self.zone
        inside = a - .004 <= t <= b + .004
        if k <= R["clad"]:
            return p["LOWER"]
        if inside and ROW_KEYS[k] in DARK_KEYS:
            return p["FRAME"]
        if p["ROOF"] and inside and k >= R["rail"]:
            return p["ROOF"]
        return p["BODY"]

    def stations(self):
        p = self.p
        feats = [0, 1]
        for a, b in p["SIDE"] + p["SCREENS"] + ([p["ROOF_GLASS"]] if p["ROOF_GLASS"] else []):
            feats += [a, b]
        a, b = self.zone
        feats += [a - .004, b + .004]
        for zw in (-WHEEL_Z, WHEEL_Z):
            r = p["ARCH"]["r"]
            for dz in (-1, -.9, -.6, -.3, 0, .3, .6, .9, 1):
                feats.append((zw + dz * r - Z0) / L)
        feats += [.002, .006, .012, .025, .045, .07, .1, .93, .955, .975, .988, .994, .998]
        ts = sorted(set(round(min(max(t, 0), 1), 4) for t in feats + [i / 30 for i in range(31)]))
        out = []
        for t in ts:  # drop near-duplicates, keeping feature lines
            if out and t - out[-1] < .005 and t not in (0, 1) and t not in feats:
                continue
            out.append(t)
        return out

    # --- wheel arches -------------------------------------------------------------------------------------------
    def arch_r(self, ang):
        a = self.p["ARCH"]
        if not a["sides"]:
            return a["r"]
        k = math.pi / a["sides"]
        return a["r"] * math.cos(k) / math.cos(((ang + k) % (2 * k)) - k)

    def arch_cut(self, p):
        r0 = self.p["WHEEL"]["r"]
        for zw in (-WHEEL_Z, WHEEL_Z):
            dz, dy = p[2] - zw, p[1] - r0
            side = self.arch_r(0)
            if dy <= 0:  # below the axle the opening is two vertical walls
                if abs(dz) < side:
                    return (p[0], p[1], zw + math.copysign(side, dz or 1)), True
                continue
            ang = math.atan2(dy, dz)
            d, r = math.hypot(dz, dy), self.arch_r(ang)
            if d < r:
                return (p[0], r0 + math.sin(ang) * r, zw + math.cos(ang) * r), True
        return p, False

    def arch_outline(self, zw, n=16):
        r0, side = self.p["WHEEL"]["r"], self.arch_r(0)
        pts = [(zw + side, self.tab("BOT", (zw + side - Z0) / L) + .01)]
        for i in range(n + 1):
            ang = math.pi * i / n
            r = self.arch_r(ang)
            pts.append((zw + math.cos(ang) * r, r0 + math.sin(ang) * r))
        pts.append((zw - side, self.tab("BOT", (zw - side - Z0) / L) + .01))
        return pts


# --- the shell ------------------------------------------------------------------------------------------------
def shell(car, mesh):
    st = car.stations()
    grid = {}
    for i, t in enumerate(st):
        rows = car.rows_at(t)
        for k, s in enumerate(rows):
            for side in (1, -1):
                if side < 0 and k in (0, ROWS - 1):
                    grid[(i, k, side)] = grid[(i, k, 1)]
                    continue
                p, n = car.at(t, s), car.normal(t, s)
                p, cut = car.arch_cut(p)
                grid[(i, k, side)] = (mesh.vert((p[0] * side, p[1], p[2]), car.color(t, k), (n[0] * side, n[1], n[2])), cut)
    for i in range(len(st) - 1):
        tm = (st[i] + st[i + 1]) / 2
        for k in range(ROWS - 1):
            for side in (1, -1):
                q = [grid[(i, k, side)], grid[(i, k + 1, side)], grid[(i + 1, k + 1, side)], grid[(i + 1, k, side)]]
                if all(c for _, c in q):
                    continue
                idx = [v for v, _ in q]
                mesh.face(idx if side > 0 else idx[::-1], car.role(tm, k))
    # Flat end panels: their own ring, so the fascia shades flat and meets the flank at the rounded section edge.
    for i, nz, col in ((0, -1, car.p["CAP_TAIL"] or car.p["BODY"]), (len(st) - 1, 1, car.p["BODY"])):
        ring = [k for k in range(ROWS)] + [k for k in range(ROWS - 2, 0, -1)]
        sides = [1] * ROWS + [-1] * (ROWS - 2)
        vs, pts = [], []
        for k, side in zip(ring, sides):
            v = mesh.v[grid[(i, k, side)][0]]
            x, y, z = v[0], v[2], -v[1]  # back to three.js
            pts.append((x, y, z))
            vs.append(mesh.vert((x, y, z), col if k > R["clad"] else car.p["LOWER"], (0, 0, nz)))
        # A fan from the centre: the outline is star-shaped but not always convex, and an n-gon triangulated past its edge.
        c = mesh.vert(tuple(sum(q[a] for q in pts) / len(pts) for a in range(3)), col, (0, 0, nz))
        for a in range(len(vs)):
            mesh.face((vs[a], vs[(a + 1) % len(vs)], c), "car_body")


def strip_y(car, mesh, ts, y0, y1, role, color, lift=.006, wrap=False):
    """A band hugging the surface between heights y0..y1 over stations ts; wrap: across the end panel to the other side."""
    paths = [[(t, 1) for t in ts] + [(t, -1) for t in ts[::-1]]] if wrap else [[(t, 1) for t in ts], [(t, -1) for t in ts]]
    for path in paths:
        prev = None
        for t, side in path:
            pair = []
            for y in (y0, y1):
                p, n = car.lifted(t, car.s_of_y(t, y), lift, side)
                if wrap and t in (0, 1):
                    n = (n[0] * .3, n[1] * .3, (1 if t == 1 else -1))
                    p = (p[0], p[1], Z0 + t * L + (lift if t == 1 else -lift))
                pair.append(mesh.vert(p, color, n))
            if prev:
                mesh.face((prev[0], prev[1], pair[1], pair[0]), role)
            prev = pair


def strip_t(car, mesh, t, y0, y1, w, role, color, lift=.003, steps=6):
    """A thin vertical line (door cut) at station t from y0 up to y1, both sides."""
    for side in (1, -1):
        prev = None
        for j in range(steps + 1):
            y = y0 + (y1 - y0) * j / steps
            pair = []
            for tt in (t - w / 2, t + w / 2):
                p, n = car.lifted(tt, car.s_of_y(tt, y), lift, side)
                p, cut = car.arch_cut(p)
                pair.append(mesh.vert(p, color, n))
            if prev:
                mesh.face((prev[0], prev[1], pair[1], pair[0]), role)
            prev = pair


def lamps(car, mesh):
    p = car.p
    h, tl = p["HEAD"], p["TAIL"]
    # Dense enough that the strip's chords stay outside the curved nose and tail (6 samples let the shell poke through).
    head_ts = [h["t"] + (1 - h["t"]) * math.sin(j / 16 * math.pi / 2) for j in range(17)]
    tail_ts = [tl["t"] * (1 - math.sin(j / 16 * math.pi / 2)) for j in range(17)]
    # Each lamp sits in a slightly taller dark lens band, so a pale lamp still reads on a pale body by day.
    for ts, (y0, y1), role in ((head_ts, h["y"], "car_head"), (tail_ts, tl["y"], "car_tail")):
        pad = max((y1 - y0) * .45, .012)
        strip_y(car, mesh, ts, y0 - pad, y1 + pad, "car_body", p["FRAME"], lift=.013, wrap=True)
        strip_y(car, mesh, ts, y0, y1, role, p["BODY"], lift=.017, wrap=True)
    sm = p["SEAM"]
    ts = [sm["t"][0] + (sm["t"][1] - sm["t"][0]) * j / 24 for j in range(25)]
    for t in ts[:]:
        _, cut = car.arch_cut(car.at(t, car.s_of_y(t, car.tab("BELT", t))))
        if cut:
            ts.remove(t)
    strip_y_rows(car, mesh, ts, sm["h"], sm["lift"])
    for t, y0, y1 in p["DOORS"]:
        strip_t(car, mesh, t, y0 if y0 > car.tab("BELLY", t) else car.tab("CLAD", t) + .02, y1 or car.tab("SILL", t) - .02, .0022, "car_body", p["DOOR_C"])


def strip_y_rows(car, mesh, ts, h, lift):
    """The seam line rides the belt row (a little under the window line)."""
    for side in (1, -1):
        prev = None
        for t in ts:
            yb = car.tab("BELT", t) - .03
            pair = []
            for y in (yb, yb + h):
                q, n = car.lifted(t, car.s_of_y(t, y), lift, side)
                pair.append(mesh.vert(q, car.p["BODY"], n))
            if prev:
                mesh.face((prev[0], prev[1], pair[1], pair[0]), "car_seam")
            prev = pair


def arch_trim(car, mesh):
    """Dark liner inside each arch (hides the cabin floor) and a lip round its edge."""
    p = car.p
    liner, lip = (.07, .072, .075, 1), (p["LOWER"] if not p["ARCH"]["sides"] else p["FRAME"])
    for zw in (-WHEEL_Z, WHEEL_Z):
        pts = car.arch_outline(zw)
        r0 = p["WHEEL"]["r"]
        for side in (1, -1):
            rows = []
            for z, y in pts:
                t = (z - Z0) / L
                xo = car.at(t, car.s_of_y(t, y))[0]
                dz, dy = z - zw, max(y - r0, 0)
                d = math.hypot(dz, dy) or 1
                inward = (0, -dy / d, -dz / d)
                outward = (side * .6, dy / d * .8, dz / d * .8)
                rows.append([
                    mesh.vert((side * .46, y, z), liner, inward),
                    mesh.vert((side * (xo - .004), y, z), liner, inward),
                    mesh.vert((side * (xo + .012), y + dy / d * .004, z + dz / d * .004), lip, outward),
                    mesh.vert((side * (xo - .002), y + dy / d * .05, z + dz / d * .05), lip, outward),
                ])
            for a, b in zip(rows, rows[1:]):
                mesh.face((a[0], a[1], b[1], b[0]), "car_body")
                mesh.face((a[2], a[3], b[3], b[2]), "car_body")
                mesh.face((a[1], a[2], b[2], b[1]), "car_body")


def solar_roof(car, mesh):
    """Green: a grid of dark cells over the roof, inset so the warm white shell shows as their frame."""
    cells_t, cells_s, t0, t1 = 7, 3, .2, .56
    cell = (.1, .19, .22, 1)
    gap_t, gap_s = .004, .03
    for side in (1, -1):
        for i in range(cells_t):
            a, b = t0 + (t1 - t0) * i / cells_t + gap_t, t0 + (t1 - t0) * (i + 1) / cells_t - gap_t
            for j in range(cells_s):
                pts = []
                for t in (a, b):
                    s_lo = car.rows_at(t)[R["rail2"]] + .06
                    lo, hi = s_lo + (1 - s_lo) * j / cells_s + gap_s * .5, s_lo + (1 - s_lo) * (j + 1) / cells_s - (gap_s * .5 if j < cells_s - 1 else 0)
                    pts.append((t, lo, hi))
                (ta, la, ha), (tb, lb, hb) = pts
                quad = [(ta, la), (ta, ha), (tb, hb), (tb, lb)]
                vs = []
                for t, s in quad:
                    q, n = car.lifted(t, s, .008, side)
                    if s >= .999:
                        q = (side * .006, q[1], q[2])  # leave a thin centre seam between the two sides' cells
                    vs.append(mesh.vert(q, cell, n))
                mesh.face(vs, "car_body")
    # A thin mint charge line framing the panel's front edge.
    s0 = car.rows_at(t1)[R["rail2"]] + .06
    for side in (1, -1):
        prev = None
        for j in range(7):
            s = s0 + (1 - s0) * j / 6
            pair = []
            for t in (t1 + .002, t1 + .006):
                q, n = car.lifted(t, s, .008, side)
                pair.append(mesh.vert(q, car.p["BODY"], n))
            if prev:
                mesh.face((prev[0], prev[1], pair[1], pair[0]), "car_seam")
            prev = pair


# --- parts -----------------------------------------------------------------------------------------------------
def lathe(mesh, cx, cy, cz, side, profile, color, n=20, role="car_body"):
    """Revolve a closed (radius, dx) loop about the axle (x axis); points at radius 0 collapse to one vertex."""
    rings = []
    for r, dx in profile:
        x = cx + side * dx
        if r < 1e-6:
            rings.append([mesh.vert((x, cy, cz), color)] * n)
        else:
            rings.append([mesh.vert((x, cy + r * math.cos(2 * math.pi * i / n), cz + r * math.sin(2 * math.pi * i / n)), color) for i in range(n)])
    for a in range(len(rings)):
        r0, r1 = rings[a], rings[(a + 1) % len(rings)]
        for i in range(n):
            j = (i + 1) % n
            f = [r0[i], r0[j], r1[j], r1[i]]
            f = [v for k, v in enumerate(f) if v not in f[:k]]
            if len(f) >= 3:
                mesh.face(f, role)


def wheel(mesh, car, x, z):
    w = car.p["WHEEL"]
    r, wd, style = w["r"], w["w"], w["style"]
    side = 1 if x > 0 else -1
    tyre = (.035, .035, .038, 1)
    o, i = wd / 2, -wd / 2
    # Tyre: a closed rounded section from the inner bead over the tread to the outer bead.
    lathe(mesh, x, r, z, side, [(r * .7, i + .01), (r * .9, i), (r * .98, i + .015), (r, i + .04), (r, o - .04), (r * .98, o - .015),
                                (r * .9, o), (r * .72, o - .01)], tyre, n=24)
    if style == "disc":
        disc, hub = (.88, .87, .83, 1), (.42, .57, .55, 1)
        lathe(mesh, x, r, z, side, [(0, o - .03), (r * .74, o - .03), (r * .74, o - .006), (r * .6, o + .006), (r * .26, o + .014), (0, o + .016)], disc, n=24)
        lathe(mesh, x, r, z, side, [(0, o + .012), (r * .24, o + .012), (r * .22, o + .026), (0, o + .03)], hub, n=16)
        # A raised teal ring on the aero disc, echoing the lower band.
        lathe(mesh, x, r, z, side, [(r * .5, o + .008), (r * .58, o + .004), (r * .58, o + .014), (r * .5, o + .018)], hub, n=24)
    else:
        rim, spoke, cap = (.1, .105, .11, 1), (.32, .34, .36, 1), (.55, .8, .95, 1)
        lathe(mesh, x, r, z, side, [(0, o - .07), (r * .74, o - .07), (r * .74, o - .004), (r * .69, o - .004), (r * .66, o - .05), (0, o - .05)], rim, n=24)
        for k in range(10):
            a = 2 * math.pi * k / 10
            for rr, ln in ((r * .43, r * .5),):
                cyc, czc = r + math.cos(a) * rr, z + math.sin(a) * rr
                mesh_box_rot(mesh, (x + side * (o - .022), cyc, czc), (.03, ln, .028), a, spoke)
        lathe(mesh, x, r, z, side, [(0, o - .03), (r * .19, o - .03), (r * .17, o - .01), (0, o - .008)], spoke, n=12)
        lathe(mesh, x, r, z, side, [(0, o - .012), (r * .09, o - .012), (r * .09, o - .004), (0, o - .004)], cap, n=10, role="car_seam")


def mesh_box_rot(mesh, c, s, a, color):
    """Box with size (x, along the radius, tangential), turned by angle a about the x axis (a = 0 points +y)."""
    sx, sr, st = (v / 2 for v in s)
    ca, sa = math.cos(a), math.sin(a)
    pts = []
    for dr in (-1, 1):
        for dx, dt in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            rr, tt = dr * sr, dt * st
            pts.append(mesh.vert((c[0] + dx * sx, c[1] + rr * ca - tt * sa, c[2] + rr * sa + tt * ca), color))
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        mesh.face([pts[i] for i in f], "car_body")


def interior(car, mesh):
    """build_car's seated pair and seats, lowered by dy for the low car; a dashboard and steering wheel ahead."""
    p = car.p["INTERIOR"]
    tmp = Mesh()
    box(tmp, (0, .42, -.1), (1.2, .03, 2.6), (.3, .3, .3, 1))
    box(tmp, (0, .86, p["dash"]), (1.4, .1, .34), p["trim"])
    box(tmp, (-.38, 1.0, p["dash"] - .2), (.3, .05, .05), (.08, .08, .09, 1))
    box(tmp, (-.38, .93, p["dash"] - .12), (.05, .05, .2), (.08, .08, .09, 1))
    people = [((.34, .41, .48, 1), (.72, .55, .42, 1), (.1, .08, .07, 1), (.2, .24, .3, 1)),
              ((.62, .32, .26, 1), (.58, .4, .28, 1), (.2, .13, .08, 1), (.08, .1, .13, 1))]
    who = 0
    for x, z, sitting in ((-.38, p["front"], True), (.38, p["front"], True), (-.38, p["rear"], False), (.38, p["rear"], False)):
        seat(tmp, x, z, 1, p["seat"])
        if sitting:
            person(tmp, x, z + .02, 1, *people[who])
            who += 1
    base = len(mesh.v)
    for v, c in zip(tmp.v, tmp.c):
        mesh.v.append((v[0], v[1], v[2] + p["dy"]))
        mesh.c.append(c)
        mesh.n.append(None)
    for f, role in zip(tmp.f, tmp.roles):
        mesh.face([base + i for i in f], role)


def fascia(car, mesh):
    """Details on the flat end panels and the A-pillar camera pods."""
    p = car.p
    zf, zr = Z0 + L + .012, Z0 - .012
    if p["name"] == "car_green":
        pod_c = p["BODY"]  # the round ends carry only their lamps and the teal lower band
    else:
        box(mesh, (0, .41, zf), (1.16, .07, .02), (.03, .03, .035, 1), role="car_body")  # intake
        box(mesh, (0, .69, zr), (1.1, .12, .016), (.03, .03, .035, 1), role="car_body")  # black tail panel under the bar
        box(mesh, (0, .4, zr), (.9, .05, .016), (.03, .03, .035, 1), role="car_body")  # diffuser
        pod_c = (.03, .03, .035, 1)
    # Camera pods (the mirrors' successor) at the A-pillar base, just ahead of the front side glass.
    t = p["SIDE"][-1][1] + .006
    y = car.tab("SILL", t) + .05
    for side in (1, -1):
        q, _ = car.lifted(t, car.s_of_y(t, y), .045, side)
        box(mesh, q, (.06, .05, .12), pod_c, role="car_body")


def build(spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    car = Car(spec)
    m = spec["MATS"]
    mats = {
        "car_body": material("car_body", (1, 1, 1, 1), rough=m["body"]["rough"]),
        "car_interior": material("car_interior", (.8, .8, .8, 1), rough=.7),
        "car_glass": material("car_glass", m["glass"], rough=.05),
        "car_seam": material("car_seam", m["seam"][0], rough=.3, emit=m["seam"][1], emit_strength=m["seam"][2]),
        "car_head": material("car_head", m["head"][0], rough=.3, emit=m["head"][1], emit_strength=m["head"][2]),
        "car_tail": material("car_tail", m["tail"][0], rough=.3, emit=m["tail"][1], emit_strength=m["tail"][2]),
        "car_shadow": material("car_shadow", (0, 0, 0, .4), rough=1),
    }
    bsdf = next(n for n in mats["car_body"].node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Metallic"].default_value = m["body"]["metal"]
    root = bpy.data.objects.new("ROOT_" + spec["name"].upper() + "_2127", None)
    bpy.context.collection.objects.link(root)
    empty = bpy.data.objects.new(spec["name"], None)
    empty.parent = root
    bpy.context.collection.objects.link(empty)
    body = Mesh()
    shell(car, body)
    lamps(car, body)
    arch_trim(car, body)
    if spec["name"] == "car_green":
        solar_roof(car, body)
    to_object(spec["name"] + "_shell", body, mats, empty, True)
    parts = Mesh()
    interior(car, parts)
    fascia(car, parts)
    ground(parts, True)
    wx = spec["WHEEL"]["x"]
    for wz in (-WHEEL_Z, WHEEL_Z):
        for x in (-wx, wx):
            wheel(parts, car, x, wz)
    to_object(spec["name"] + "_parts", parts, mats, empty, False)
    tris = sum(len(f) - 2 for f in body.f + parts.f)
    stem = spec["name"].replace("_", "-") + "-2127"
    blend, glb = os.path.join(HERE, stem + ".blend"), os.path.join(HERE, stem + ".glb")
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials="EXPORT", export_animations=False, export_cameras=False,
                              export_lights=False, export_extras=False, export_vertex_color="ACTIVE")
    print("@@CAR@@", spec["name"], "tris", tris, "bytes", os.path.getsize(glb))


def main():
    for spec in (GREEN, TECH):
        build(spec)


if __name__ == "__main__":
    main()
