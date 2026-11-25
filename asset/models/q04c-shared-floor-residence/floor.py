"""Furniture of one shared floor (Q04-C): tables, chairs, curtained beds, island, service rooms, planting.

Level-local frame, z 0 = finished floor. Every repeated piece is one mesh placed by a matrix, so all five floors reuse it.
What differs per floor is listed in layout.VARY.
Bed frame: origin under the bed's centre, +y to the entrance (the aisle side), -y the head. Chair frame: looks along +y.
"""
import math
import random

from mathutils import Matrix

import layout as LY
import parts as P
from parts import Accs, K, M, box, lathe, loft, obox, pipe, pol, ring, sector, slab, strip


# --- dining -----------------------------------------------------------------------------------------------------------------
def table():
    """Long axis along x (turned to y on site)."""
    a = Accs()
    L, W, H = LY.TABLE
    slab(a["table_wood"], -L / 2, L / 2, -W / 2, W / 2, H - .055, H, .06, .012)
    for x in (-3.05, -1.02, 1.02, 3.05):
        for s in (-1, 1):
            obox(a["wood_dark"], (x, s * .34, (H - .055) / 2), (.07, .09, H - .055))
        obox(a["wood_dark"], (x, 0, .09), (.08, .72, .07))
        obox(a["wood_dark"], (x, 0, H - .10), (.08, .80, .08))
    obox(a["wood_dark"], (0, 0, .20), (6.1, .06, .08))
    return a


def tableware(seed):
    """Sixteen places plus shared jugs, bread and salad down the middle; some places already cleared."""
    a, rng = Accs(), random.Random(seed)
    z = LY.TABLE[2]
    for s in (-1, 1):
        for i in range(LY.SEATS):
            x = (i - (LY.SEATS - 1) / 2) * LY.SEAT_PITCH
            if rng.random() < .22:
                continue
            lathe(a["ceramic"], [(.06, z), (.13, z + .016), (.12, z + .020), (.05, z + .010)], 16, x, s * .34)
            lathe(a["cup_b" if rng.random() < .4 else "ceramic"], [(.032, z), (.038, z + .085), (.033, z + .083), (.028, z + .02)], 10, x + .18, s * .24)
            obox(a["steel"], (x - .19, s * .34, z + .004), (.018, .17, .006))
    for x, kind in ((-2.9, "jug"), (-2.0, "bread"), (-1.1, "bowl"), (-.2, "jug"), (.75, "bread"), (1.6, "bowl"), (2.6, "jug"), (3.15, "vase")):
        y = rng.uniform(-.05, .05)
        if kind == "jug":
            lathe(a["ceramic"], [(.06, z), (.08, z + .08), (.05, z + .2), (.06, z + .24), (.045, z + .23)], 14, x, y)
        elif kind == "bowl":
            lathe(a["wood_dark"], [(.07, z), (.17, z + .09), (.155, z + .085), (.06, z + .03)], 18, x, y)
            M.ell(K.Three(a["food"], x, y, z + .075), (0, 0, 0), (.13, 0, 0), (0, .05, 0), (0, 0, .13), 10, 5)
        elif kind == "bread":
            slab(a["wood_dark"], x - .20, x + .20, y - .11, y + .11, z, z + .02, .04, .006)
            for q in (-.1, .06):
                M.ell(K.Three(a["bread"], x + q, y, z + .06), (0, 0, 0), (.075, 0, 0), (0, .045, 0), (0, 0, .06), 10, 5)
        else:
            lathe(a["cup_b"], [(.04, z), (.055, z + .1), (.03, z + .18)], 12, x, y)
            M.leaf_clump(K.ctx(a, rng, x, y, z + .28), (0, 0, 0), (.13, .12, .13), ("leaf_l",), None, 14, .12, .2, 1)
    return a


def chair():
    a = Accs()
    c = a["chair"]
    for x in (-.19, .19):
        obox(c, (x, .17, .215), (.035, .035, .43))
        loft(c, [[(x + u, -.19 + v + dy, z) for u, v in ((-.018, -.018), (.018, -.018), (.018, .018), (-.018, .018))] for z, dy in ((0, .01), (.45, .0), (.84, -.05))])
    slab(a["seat"], -.22, .22, -.20, .22, .425, .465, .05, .012)
    obox(c, (0, -.225, .80), (.40, .03, .085))
    obox(c, (0, -.212, .63), (.38, .022, .055))
    return a


def pendant(n=5.2):
    a = Accs()
    slab(a["wood"], -n / 2, n / 2, -.07, .07, 2.30, 2.36, .03, .01)
    box(a["glow"], -n / 2 + .1, n / 2 - .1, -.045, .045, 2.285, 2.30)
    for x in (-n / 2 + .4, n / 2 - .4):
        box(a["track"], x - .006, x + .006, -.006, .006, 2.36, LY.CEIL)
    return a


# --- beds -----------------------------------------------------------------------------------------------------------------------
def bed(tone):
    a = Accs()
    hw, L = LY.BED[0] / 2, LY.BED[1]
    box(a["wood"], -hw, hw, -L / 2, L / 2, .16, .30)
    for x in (-hw + .07, hw - .07):
        for y in (-.85, .85):
            box(a["wood_dark"], x - .035, x + .035, y - .035, y + .035, 0, .16)
    slab(a["linen"], -hw + .015, hw - .015, -L / 2 + .02, L / 2 - .02, .30, .50, .08, .04)
    slab(a["duvet_" + tone], -hw - .015, hw + .015, -.42, L / 2 + .0, .38, .56, .08, .05)
    slab(a["linen"], -hw - .018, hw + .018, -.50, -.22, .42, .575, .06, .05)
    slab(a["linen"], -.33, .33, -.93, -.56, .49, .62, .08, .05)
    # bedhead with shelf, side cabinet, reading light
    box(a["wood"], -hw, hw + .30, -L / 2 - .14, -L / 2 - .11, .56, .70)
    for x in (-hw + .03, hw + .27):
        box(a["wood"], x - .03, x + .03, -L / 2 - .14, -L / 2 - .11, 0, .56)
    box(a["wood"], -hw, hw + .30, -L / 2 - .11, -L / 2, .66, .69)
    box(a["wood"], hw + .03, hw + .30, -L / 2 - .11, -.62, .10, .52)
    box(a["wood_dark"], hw + .05, hw + .28, -.625, -.615, .14, .30)
    box(a["wood_dark"], hw + .05, hw + .28, -.625, -.615, .32, .49)
    box(a["duvet_c" if tone != "c" else "bread"], hw + .07, hw + .20, -.95, -.78, .52, .545)
    box(a["cup_b"], -.30, -.12, -L / 2 - .10, -L / 2 - .02, .69, .82)
    box(a["track"], .20, .23, -L / 2 - .07, -L / 2 - .05, .69, 1.06)
    M.ell(K.Three(a["glow"], .215, -L / 2 - .0, 1.06), (0, 0, 0), (.05, 0, 0), (0, .04, 0), (0, 0, .06), 10, 6)
    return a


def track_path(hw, r=.16, n=5):
    """Closed curtain track round one bed, rounded corners, starting at the entrance's middle and going to +x."""
    y0, y1 = LY.CELL_Y
    pts = [(0, y1)]
    for cx, cy, a0 in ((hw - r, y1 - r, 90), (hw - r, y0 + r, 0), (-hw + r, y0 + r, -90), (-hw + r, y1 - r, 180)):
        for i in range(n + 1):
            t = math.radians(a0 - 90 * i / n)
            pts.append((cx + r * math.cos(t), cy + r * math.sin(t)))
    return pts + [(0, y1)]


def sample(path, s0, s1, step):
    """Points every ~step m between arc lengths s0 and s1 with the left normal."""
    ln = [0.0]
    for p, q in zip(path, path[1:]):
        ln.append(ln[-1] + math.dist(p, q))
    n = max(2, round((s1 - s0) / step))
    out, i = [], 0
    for k in range(n + 1):
        s = s0 + (s1 - s0) * k / n
        while i < len(ln) - 2 and ln[i + 1] < s:
            i += 1
        p, q = path[i], path[i + 1]
        d = ln[i + 1] - ln[i] or 1
        f = (s - ln[i]) / d
        out.append((p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, -(q[1] - p[1]) / d, (q[0] - p[0]) / d))
    return out


def cloth(acc, path, s0, s1, wave, amp, rng, rows=(LY.HEM, .55, 1.25, 1.95, LY.TRACK_Z - .02), waist=None):
    """Pleated single sheet hung from the track between arc lengths s0..s1; waist = height where it is tied."""
    pts = sample(path, s0, s1, wave / 6)
    m = len(pts)
    ph = rng.uniform(0, 6.28)
    jit = [rng.uniform(.65, 1.25) for _ in range(m // 6 + 3)]
    cx, cy = sum(p[0] for p in pts) / m, sum(p[1] for p in pts) / m
    verts = []
    for z in rows:
        u = (LY.TRACK_Z - z) / (LY.TRACK_Z - LY.HEM)                              # 0 at the track, 1 at the hem
        k = 1.0 if waist is None else max(.28, min(1.0, .28 + .72 * (abs(z - waist) / .85) ** .9))
        for i, (x, y, nx, ny) in enumerate(pts):
            j = jit[i // 6]
            f = amp * (.55 + .55 * u) * j * math.sin(ph + 2 * math.pi * i / 6 + .35 * u * math.sin(i * .37))
            f += .014 * u * math.sin(i * .21 + 2 * u)
            px, py = x + nx * f, y + ny * f
            verts.append((cx + (px - cx) * k, cy + (py - cy) * k, z))
    faces = [(r * m + i, r * m + i + 1, (r + 1) * m + i + 1, (r + 1) * m + i) for r in range(len(rows) - 1) for i in range(m - 1)]
    acc.solid(verts, faces) if False else acc._push(verts, faces)


def curtain(row, state, seed):
    """Track with hangers to the ceiling, and the cloth: closed (a finger's gap at the entrance), half, or tied back at the corners."""
    a, rng = Accs(), random.Random(seed)
    hw = LY.CELL_HW[row]
    path = track_path(hw)
    total = sum(math.dist(p, q) for p, q in zip(path, path[1:]))
    strip(a["track"], [(x, y, LY.TRACK_Z) for x, y in path], .035, -.01, .03)
    y0, y1 = LY.CELL_Y
    for x in (-hw + .2, hw - .2):
        for y in (y0, y1):
            box(a["track"], x - .008, x + .008, y - .008, y + .008, LY.TRACK_Z, LY.CEIL)
    role = "curtain" if row == "inner" else "curtain_b"
    c = a[role]
    half_front, side = hw, y1 - y0
    tall = (LY.HEM, .45, .85, 1.1, 1.35, 1.9, LY.TRACK_Z - .02)
    if state == "closed":
        cloth(c, path, .03, total - .03, .19, .040, rng)
    elif state == "half":                                                          # one leaf drawn across half the front, the other pushed to the corner
        cloth(c, path, half_front + side + hw, total - .02, .19, .040, rng)               # half the head, one side, half the front
        cloth(c, path, half_front - .34, half_front + .42, .085, .070, rng)             # gathered at the right front corner
        cloth(c, path, half_front + side - .30, half_front + side + .30, .085, .070, rng)
    else:
        corner = (half_front, half_front + side, half_front + side + 2 * hw, half_front + 2 * side + 2 * hw)
        for s in corner:
            cloth(c, path, s - .26, s + .26, .075, .075, rng, tall, 1.1)
            p = sample(path, s - .02, s + .02, .04)[1]
            b = sample(path, s - .26, s + .26, .04)
            cx, cy = sum(q[0] for q in b) / len(b), sum(q[1] for q in b) / len(b)
            ring(a["wood"], .060, .085, 1.07, 1.13, 14, cx, cy)
    return a


# --- island -----------------------------------------------------------------------------------------------------------------------
def island():
    """Shared kitchen: four counter arcs round the riser, storage against it, a ring light above."""
    a = Accs()
    (r0, r1), gaps, hg = LY.ISLAND
    for k, g in enumerate(gaps):
        d0, d1 = g + hg, g + 90 - hg
        sector(a["wall"], r0 + .08, r1 - .10, d0 + .8, d1 - .8, .08, .86, 4)
        sector(a["wood_dark"], r0 + .14, r1 - .16, d0 + 1, d1 - 1, 0, .08, 4)
        sector(a["stone"], r0, r1, d0, d1, .86, .91, 3)
        for j in range(1, 6):
            d = d0 + (d1 - d0) * j / 6
            obox(a["wood_dark"], pol(r0 + .075, d, .62), (.012, .34, .02), math.radians(d))
            obox(a["grey"], pol(r1 - .098, d, .47), (.010, .012, .74), math.radians(d))
        m = (d0 + d1) / 2
        rm = (r0 + r1) / 2
        if k % 2 == 0:                                                              # two sinks
            for q in (-12, 12):
                obox(a["steel"], pol(rm, m + q, .913), (.42, .60, .012), math.radians(m + q))
                obox(a["dark"], pol(rm, m + q, .918), (.34, .52, .006), math.radians(m + q))
                pipe(a["steel"], [pol(rm + .30, m + q, .91), pol(rm + .30, m + q, 1.20), pol(rm + .12, m + q, 1.24), pol(rm + .10, m + q, 1.17)], .014, .012, 6)
        else:                                                                       # hob
            obox(a["dark"], pol(rm, m, .915), (.56, 1.15, .014), math.radians(m))
            for u, v in ((-.13, -.34), (-.13, .34), (.13, 0)):
                c = math.radians(m)
                x, y = pol(rm, m)
                cx, cy = x + u * math.cos(c) - v * math.sin(c), y + u * math.sin(c) + v * math.cos(c)
                ring(a["steel"], .09, .10, .922, .930, 18, cx, cy)
            x, y = pol(rm, m - 5)
            lathe(a["steel"], [(.14, .93), (.15, 1.07), (.14, 1.07), (.13, .95)], 18, x, y)
        for q, role in ((-24, "ceramic"), (24, "food")):
            x, y = pol(rm + .05, m + q)
            lathe(a["ceramic"], [(.06, .91), (.14, .99), (.12, .98), (.05, .93)], 14, x, y)
    for k in range(4):                                                              # shelves against the riser
        d = k * 90
        sector(a["wood"], LY.RISER_R, LY.RISER_R + .06, d + 8, d + 82, 0, 2.1, 6)
        for z in (0, .5, 1.0, 1.5, 2.06):
            sector(a["wood"], LY.RISER_R + .06, LY.RISER_R + .36, d + 8, d + 82, z, z + .04, 6)
        for q in (8, 81):
            sector(a["wood"], LY.RISER_R + .06, LY.RISER_R + .36, d + q, d + q + 1, 0, 2.06, 6)
        for z in (.54, 1.04, 1.54):
            for j in range(6):
                x, y = pol(LY.RISER_R + .20, d + 15 + j * 12)
                lathe(a[("ceramic", "bread", "cup_b", "food")[(j + k + int(z * 2)) % 4]], [(.06, z), (.075, z + .12), (.05, z + .20)], 10, x, y)
    ring(a["wood"], 3.55, 3.95, 2.62, 2.70, 72)
    ring(a["glow"], 3.66, 3.84, 2.605, 2.62, 72)
    for d in range(0, 360, 60):
        x, y = pol(3.75, d + 30)
        box(a["track"], x - .006, x + .006, y - .006, y + .006, 2.7, LY.CEIL)
    return a


# --- service rooms -----------------------------------------------------------------------------------------------------------------
def wall_x(a, x0, x1, y, doors=(), t=.12, h=LY.WALL_H, role="wall"):
    """Wall along x with door openings (centre x, width); leaves stand ajar."""
    cuts = sorted((c - w / 2, c + w / 2) for c, w in doors)
    xs = [x0] + [v for c in cuts for v in c] + [x1]
    for k in range(0, len(xs), 2):
        box(a[role], xs[k], xs[k + 1], y - t / 2, y + t / 2, 0, h)
    for c0, c1 in cuts:
        box(a[role], c0, c1, y - t / 2, y + t / 2, 2.15, h)
        box(a["door_wood"], c0 - .05, c0, y - t / 2 - .02, y + t / 2 + .02, 0, 2.15)
        box(a["door_wood"], c1, c1 + .05, y - t / 2 - .02, y + t / 2 + .02, 0, 2.15)
        box(a["door_wood"], c0 - .05, c1 + .05, y - t / 2 - .02, y + t / 2 + .02, 2.15, 2.20)


def wall_y(a, x, y0, y1, t=.12, h=LY.WALL_H, role="wall"):
    box(a[role], x - t / 2, x + t / 2, y0, y1, 0, h)


def wc(a, x, y, yaw):
    """Toilet: back on -y before the turn."""
    def at(u, v):
        return x + u * math.cos(yaw) - v * math.sin(yaw), y + u * math.sin(yaw) + v * math.cos(yaw)
    obox(a["ceramic"], (*at(0, .10), .58), (.38, .16, .36), yaw)
    obox(a["ceramic"], (*at(0, .42), .20), (.24, .40, .40), yaw)
    lathe(a["ceramic"], [(.20, .36), (.21, .43), (.14, .44)], 16, *at(0, .44))


def basins(a, x0, x1, y, n, side):
    """Basin bench against the wall at y; side = direction into the room."""
    ya, yb = sorted((y, y + side * .55))
    box(a["wood"], x0, x1, ya, yb, .78, .85)
    box(a["wall_in"], x0 + .05, x1 - .05, ya + .05, yb - .08, .30, .78)
    ym = y + side * .05
    box(a["mirror"], x0 + .1, x1 - .1, *sorted((ym, ym + side * .02)), 1.10, 2.05)
    for i in range(n):
        x = x0 + (x1 - x0) * (i + .5) / n
        lathe(a["ceramic"], [(.10, .85), (.20, .96), (.18, .95), (.06, .87)], 16, x, y + side * .30)


def stall_row(a, x0, w, n, y0, y1, kind):
    """n cubicles of width w from x0, backs on y0, fronts at y1 (doors half open)."""
    for i in range(n + 1):
        wall_y(a, x0 + i * w, y0, y1, .05, 2.1, "wall_in")
    for i in range(n):
        x = x0 + i * w
        box(a["wall_in"], x, x + .18, y1 - .04, y1, .1, 2.1)
        obox(a["door_wood"], (x + .18 + .26 * (w - .25), y1 - .22, 1.1), (w - .30, .03, 1.95), math.radians(-50))
        if kind == "wc":
            wc(a, x + w / 2, y0 + .05, 0)
        else:
            box(a["tile"], x + .05, x + w - .05, y0 + .02, y1 - .06, 0, .03)
            pipe(a["steel"], [(x + w / 2, y0 + .03, 1.0), (x + w / 2, y0 + .03, 2.05), (x + w / 2, y0 + .25, 2.10)], .015, .015, 6)
            lathe(a["steel"], [(.10, 2.07), (.10, 2.09)], 12, x + w / 2, y0 + .27)


def service_right():
    """Washrooms: 4 WC, 4 showers, 6 basins. Doors on the bed side and from the main ring."""
    a = Accs()
    x0, x1, y0, y1 = LY.WASH_R
    wall_x(a, x0, x1, y1 - .06, ((11.0, .95), (17.5, .95)))
    wall_x(a, x0, x1, y0 + .06)
    wall_y(a, x1 - .06, y0, y1)
    wall_y(a, x0 + .06, y0, y1)
    box(a["tile"], x0 + .12, x1 - .12, y0 + .12, y1 - .12, 0, .012)
    stall_row(a, x0 + .14, .95, 4, y0 + .12, y0 + 1.65, "wc")
    stall_row(a, x0 + .14 + 3.85, 1.03, 4, y0 + .12, y0 + 1.65, "shower")
    basins(a, 12.1, 16.4, y1 - .12, 6, -1)
    return a


def service_left():
    """Behind the lifts: accessible washroom, laundry and the cleaning room."""
    a = Accs()
    x0, x1, y0, y1 = LY.WASH_L
    wall_x(a, x0, x1, y1 - .06, ((-13.5, 1.0), (-15.6, .95), (-17.55, .9)))
    wall_x(a, x0, x1, y0 + .06)
    wall_y(a, x0 + .06, y0, y1)
    wall_y(a, x1 - .06, y0, y1)
    for x in (-14.6, -16.7):
        wall_y(a, x, y0, y1, .10)
    box(a["tile"], -14.55, x1 - .12, y0 + .12, y1 - .12, 0, .012)
    wc(a, -13.4, y0 + .14, 0)
    basins(a, -14.5, -13.6, y1 - 2.2, 1, -1)
    for y in (-1.7, -.95, -.2):                                                     # laundry machines
        box(a["ceramic"], -16.62, -16.02, y - .32, y + .32, 0, .88)
        obox(a["dark"], (-16.0, y, .48), (.03, .34, .34))
    box(a["wood"], -15.0, -14.68, -2.1, .9, 0, .85)
    for z in (.1, .7, 1.3, 1.9):                                                    # cleaning shelves
        box(a["wood"], -18.24, -17.84, -2.1, 1.2, z, z + .04)
    for y in (-1.7, -1.1, -.4, .4):
        box(a["cup_b"], -18.2, -17.95, y - .12, y + .12, .74, .98)
    return a


def lids():
    a = Accs()
    for x0, x1, y0, y1 in (LY.WASH_R, LY.WASH_L):
        box(a["wall"], x0, x1, y0, y1, LY.WALL_H, LY.WALL_H + .10)
    return a


# --- lounge, planting, ceiling ------------------------------------------------------------------------------------------------------
def sofa_round():
    """Round sofa with an opening toward -x."""
    a = Accs()
    sector(a["sofa"], 1.05, 1.85, -140, 140, .14, .44, 8)
    sector(a["sofa"], 1.62, 1.88, -140, 140, .44, .80, 8)
    for k in range(1, 7):
        d = -140 + 280 * k / 7
        obox(a["wood"], pol(1.34, d, .445), (.56, .012, .006), math.radians(d))
    sector(a["wood_dark"], 1.15, 1.75, -138, 138, 0, .14, 8)
    lathe(a["wood"], [(.42, .34), (.45, .37), (.42, .39)], 24)
    lathe(a["wood_dark"], [(.06, 0), (.06, .34)], 10)
    return a


def tree_seat(seed):
    """Round bench with a planted middle."""
    a, rng = Accs(), random.Random(seed)
    ring(a["wood"], .85, 1.35, .40, .46, 40)
    ring(a["edge"], .80, 1.15, 0, .40, 40)
    lathe(a["soil"], [(.80, .30), (.80, .44)], 32)
    M.leafy_tree(K.ctx(a, rng, 0, 0, .42), (0, 0, 0), h=2.9, crown=1.15, trunk="wood", roles=("leaf_l", "green"), core=None, n=200, size=.24, branches=5)
    M.leaf_clump(K.ctx(a, rng, 0, 0, .55), (0, 0, 0), (.6, .22, .6), ("leaf_l", "green"), None, 40, .2, .3, 3)
    return a


def pot_tree(seed):
    a, rng = Accs(), random.Random(seed)
    lathe(a["edge"], [(.30, 0), (.40, .50), (.34, .50), (.34, .44)], 24)
    lathe(a["soil"], [(.34, .40), (.34, .46)], 20)
    M.leafy_tree(K.ctx(a, rng, 0, 0, .45), (0, 0, 0), h=2.3, crown=.85, trunk="wood", roles=("leaf_l", "green"), core=None, n=170, size=.22, branches=4)
    return a


def edge_planting(n):
    """Troughs beside the columns with plants spilling over the disc edge, and benches along the railing."""
    a, rng = Accs(), random.Random(3 + n)
    for d0, d1 in LY.VARY[n]["planters"]:
        sector(a["edge"], 23.12, 23.62, d0, d1, 0, .48, 2)
        sector(a["soil"], 23.18, 23.56, d0 + .2, d1 - .2, .4, .50, 2)
        m = max(3, int((d1 - d0) * 1.1))
        for i in range(m):
            d = d0 + .5 + (d1 - d0 - 1) * i / (m - 1)
            x, y = pol(23.42 + rng.uniform(-.08, .22), d)
            M.leaf_clump(K.ctx(a, rng, x, y, .62), (0, 0, 0), (.42, rng.uniform(.25, .42), .42), ("leaf_l", "green"), "green", 34, .22, .45, 3)
    for d0, d1 in LY.VARY[n]["benches"]:
        sector(a["wood"], 23.10, 23.55, d0, d1, .41, .46, 2)
        for q in (.08, .5, .92):
            d = d0 + (d1 - d0) * q
            obox(a["edge"], pol(23.32, d, .205), (.36, .10, .41), math.radians(d))
    return a


def ceiling():
    """Timber ceiling band over the dining half and round downlights (belongs to this storey, hidden in the cutaway)."""
    a = Accs()
    z = LY.CEIL
    sector(a["slat"], 8.2, 14.6, 205, 335, z - .05, z - .004, 3)
    for r, n in ((9.5, 14), (15.5, 22), (19.8, 24)):
        for i in range(n):
            x, y = pol(r, 360 * (i + .5) / n)
            lathe(a["glow"], [(.11, z - .07), (.11, z - .003)], 12, x, y)
    return a


def ceiling_top():
    """L5 has the roof over it, not a slab: arc rails at the usual ceiling height carry curtains, pendants and lights,
    hung by rods from the radial roof beams (one beam every 7.5 degrees); the island light hangs from arms on the riser."""
    a = Accs()
    z, up = LY.CEIL, lambda r: LY.roof_z(r) - LY.LEVELS[-1] + .05
    (hi, ho), (y0, y1) = (LY.ROWS["inner"], LY.ROWS["outer"]), LY.CELL_Y
    bed_rails = [math.hypot(hi + y0, LY.CELL_HW["inner"] - .2), math.hypot(hi + y1, LY.CELL_HW["inner"] - .2),
                 math.hypot(ho - y1, LY.CELL_HW["outer"] - .2), math.hypot(ho - y0, LY.CELL_HW["outer"] - .2)]
    tx, ty = LY.TABLES[1]
    arcs = [(r, 18.5, 161.5, 22.5) for r in bed_rails] + [(math.hypot(tx, ty + s * 2.2), 220, 320, 15.0) for s in (1, -1)]
    for r, d0, d1, pitch in arcs:
        sector(a["frame"], r - .07, r + .07, d0, d1, z - .02, z + .07, 2)
        d = math.ceil(d0 / pitch) * pitch
        while d < d1:
            x, y = pol(r, d)
            box(a["track"], x - .014, x + .014, y - .014, y + .014, z + .07, up(r))
            d += pitch
        n = round(math.radians(d1 - d0) * r / 2.6)
        for i in range(n):
            x, y = pol(r, d0 + (d1 - d0) * (i + .5) / n)
            lathe(a["glow"], [(.11, z - .085), (.11, z - .02)], 12, x, y)
    for d in range(30, 390, 60):
        P.beam(a["frame"], [pol(.8, d, z + .02), pol(3.9, d, z + .02)], .10, .12, .08, .06)
    lathe(a["frame"], [(LY.RISER_R, z), (LY.RISER_R, z + .12), (LY.RISER_R - .3, z + .18), (.05, z + .18)], 32)
    return a


# --- assembly -------------------------------------------------------------------------------------------------------------------------
def place(add, mesh, n):
    """Furnish level n: add(name, data, matrix), mesh(name, accs)."""
    pre = "L%d_" % n
    rot = lambda x, y, yaw: Matrix.Translation((x, y, 0)) @ Matrix.Rotation(yaw, 4, "Z")  # noqa: E731
    tb, ch, pd = mesh("q04c_table", table()), mesh("q04c_chair", chair()), mesh("q04c_pendant", pendant())
    vary = LY.VARY[n]
    ware = [mesh("q04c_tableware_%d" % (i + 1), tableware(40 + i)) for i in (0, 1)]
    for i, (x, y) in enumerate(LY.TABLES):
        add(pre + "TABLE_%d" % (i + 1), tb, rot(x, y, math.pi / 2))
        add(pre + "TABLEWARE_%d" % (i + 1), ware[(i + (n in (1, 4))) % 2], rot(x, y, math.pi / 2 + math.pi * (n in (3, 4))))
        add(pre + "PENDANT_%d" % (i + 1), pd, rot(x, y, math.pi / 2))
    rng = random.Random(6 + n)
    for code, x, y, yaw in LY.chairs():
        pull = rng.uniform(-.02, .04)
        add(pre + "CHAIR_" + code, ch, rot(x + pull * math.copysign(1, math.sin(yaw)), y, yaw + rng.uniform(-.06, .06)))
    beds = {t: mesh("q04c_bed_" + t, bed(t)) for t in "abc"}
    cur = {(r, s, v): mesh("q04c_curtain_%s_%s_%d" % (r, s, v), curtain(r, s, hash_(r, s, v))) for r in LY.ROWS for s in LY.STATES for v in (0, 1)}
    for i, (code, row, _a, x, y, yaw, st) in enumerate(LY.beds(n)):
        m = rot(x, y, yaw)
        add(pre + "BED_" + code, beds["abc"[(i * 2 + i // 16 + n - 2) % 3]], m)
        ob = add(pre + "CURTAIN_" + code, cur[(row, st, (i + n) % 2)], m)
        ob["state"], ob["bed"] = st, code
    add(pre + "ISLAND", mesh("q04c_island", island()), None)
    add(pre + "SERVICE_R", mesh("q04c_service_r", service_right()), None)
    add(pre + "SERVICE_L", mesh("q04c_service_l", service_left()), None)
    add(pre + "SERVICE_LIDS", mesh("q04c_service_lids", lids()), None)
    add(pre + "SOFA", mesh("q04c_sofa_round", sofa_round()), rot(*vary["sofa"][:2], math.radians(vary["sofa"][2])))
    add(pre + "TREE_SEAT", mesh("q04c_tree_seat", tree_seat(3)), rot(*vary["tree"][:2], math.radians(vary["tree"][2])))
    pt = mesh("q04c_pot_tree", pot_tree(11))
    for i, (r, d) in enumerate(vary["pots"]):
        add(pre + "POT_TREE_%d" % (i + 1), pt, rot(*pol(r, d), i * 1.7 + (n - 2) * .9))
    add(pre + "EDGE_PLANTING", mesh("q04c_edge_planting_%d" % n, edge_planting(n)), None)
    add(pre + "CEILING", mesh("q04c_ceiling_top", ceiling_top()) if n == 5 else mesh("q04c_ceiling", ceiling()), None)


def hash_(r, s, v):
    return {"inner": 100, "outer": 200}[r] + LY.STATES.index(s) * 10 + v
