"""Q04-A suspended single-room tower, v2 (design document Q04-A v1.0, owner reference image Q04 left, A).

Run:  blender -b --factory-startup --python-exit-code 1 -P build_suspended_pod_tower.py [-- --no-export]
Writes q04a-suspended-pod-tower-v2.blend (asset + preview staging), -v2.glb (asset only) and report-v2.json beside this file;
the v1 .blend / .glb stay as they were. v2 (2026-11-25): no human figures anywhere, furnished single rooms behind the open
windows, ivory / titanium / silver finishes and one accent colour per dwelling.
layout.json (pod table + solved bridge lines) comes from layout.py; run that first only if the table changes.

Blender coordinates, real metres, origin = core axis on the plaza (z 0), sea on +y, main view from the south-east.
Nodes: Q04A_SuspendedPodTower > CORE, CROWN, PODS, ACCESS, PLAZA. Per dwelling: POD_<ring>_<nn> (one shared shell mesh,
custom properties ring, number, window, accent, layout), its SHUTTER_, ACCENT_, ROOM_ and furniture children, HANGER_ (rod), ARM_ and BRIDGE_ with the same
code. Sea, distant city and bridge are preview only (collection Q04A_Preview).
"""
import json
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import layout as LY  # noqa: E402
import parts as P  # noqa: E402
from parts import Accs, M, bez, beam, box, build_mesh, lathe, loft, obox, pipe, ring, sector, skin  # noqa: E402

ASSET = "q04a-suspended-pod-tower-v2"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
STATES = ("closed", "open", "half")
LAYOUT_CYCLE = ("desk", "bed", "plant")
ACCENT_CYCLE = ("white", "blue", "sage", "white", "sand")                        # five long: never in step with heights or windows
VIEW = -45.0                                                                  # bearing of the main view: which way a room is mirrored
TUBE_A = [i * 360.0 / LY.TUBES for i in range(LY.TUBES)]


def pol(r, deg, z=None):
    a = math.radians(deg)
    return (r * math.cos(a), r * math.sin(a)) if z is None else (r * math.cos(a), r * math.sin(a), z)


# --- CORE -----------------------------------------------------------------------------------------------------------------
def core_structure():
    a = Accs()
    lathe(a["metal_light"], [(1.2, 0), (1.2, 54)], 40)
    for z in range(8, 49, 5):                                                  # joint bands on the column
        ring(a["seam"], 1.19, 1.215, z - .04, z + .04, 40)
    for d in TUBE_A:
        x, y = pol(LY.TUBE_RING, d)
        for q in (60, 180, 300):
            px, py = pol(LY.TUBE_R, d + q)
            obox(a["metal_light"], (x + px, y + py, 27.2), (.05, .07, 44.0), math.radians(d + q))
        for z in [5.6 + 4.0 * i for i in range(12)]:
            ring(a["metal_light"], LY.TUBE_R - .02, LY.TUBE_R + .035, z, z + .09, 16, x, y)
    for z in [9.6 + 8.0 * i for i in range(5)]:                                 # tie frames: column to tubes, kept thin
        for d in TUBE_A:
            c = pol((1.15 + LY.TUBE_RING - LY.TUBE_R) / 2, d, z)
            obox(a["trim"], c, (LY.TUBE_RING - LY.TUBE_R - 1.15 + .1, .10, .16), math.radians(d))
        ring(a["trim"], 2.62, 2.74, z - .07, z + .07, 60)
    ring(a["trim"], 3.80, 4.25, 14.5, 15.5, 72)                                  # collar the legs reach
    ring(a["seam"], 4.24, 4.27, 14.95, 15.05, 72)
    return a


def core_glass():
    a = Accs()
    for d in TUBE_A:
        skin(a["glass"], [(LY.TUBE_R, 5.2), (LY.TUBE_R, 49.2)], 20, *pol(LY.TUBE_RING, d))
    return a


def capsules(rng):
    """Single-rider lift capsules (empty), seen through the tubes at different heights."""
    a = Accs()
    for i, d in enumerate(TUBE_A):
        z = (36.2, 9.5, 24.9, 43.4, 17.0, 30.4, 12.6, 40.0, 20.2, 33.0, 27.6, 38.9, 14.8, 22.4)[i]
        x, y = pol(LY.TUBE_RING, d)
        r = LY.TUBE_R - .06
        lathe(a["trim"], [(.28, z - .28), (r - .04, z - .12), (r, z), (r, z + .06)], 20, x, y)
        lathe(a["trim"], [(r, z + 2.12), (r, z + 2.2), (r - .09, z + 2.34), (.16, z + 2.42)], 20, x, y)
        ring(a["cyan"], r - .02, r + .012, z + 2.06, z + 2.13, 20, x, y)
        ring(a["cyan"], r - .02, r + .012, z + .05, z + .11, 20, x, y)
        lathe(a["glow"], [(.40, z + 2.10), (.40, z + 2.115)], 16, x, y)
        skin(a["glass"], [(r - .01, z + .08), (r - .01, z + 2.1)], 20, x, y)
        rng.uniform(.93, 1.08)                                                  # the draws v1 spent here, so the planting stays put
        for n in (5, 5, 3, 3):
            rng.choice(range(n))
    return a


def base_structure(rng):
    a = Accs()
    lathe(a["curb"], [(6.5, -.02), (6.5, .12), (6.44, .15), (1, .15)], 72)
    ring(a["trim"], 5.84, 6.16, .15, .38, 72)
    ring(a["trim"], 5.80, 6.20, 4.55, 4.80, 72)
    ring(a["cyan"], 6.19, 6.23, 4.62, 4.74, 72)
    ring(a["trim"], 4.05, 4.42, 5.88, 6.14, 72)
    for i in range(32):
        d = i * 360 / 32 + 360 / 64
        if abs(math.remainder(d + 45, 360)) < 9:
            continue
        obox(a["trim"], pol(6.0, d, 2.45), (.09, .07, 4.2), math.radians(d))
    for i in range(32):
        d = i * 360 / 32 + 360 / 64
        pipe(a["trim"], [pol(6.0, d, 4.75), pol(4.24, d, 5.95)], .045, .045, 6)
    lathe(a["floor"], [(5.8, .15), (5.8, .17)], 48)
    ring(a["glow"], 4.3, 5.2, 4.40, 4.44, 48)
    ring(a["trim"], 1.2, 5.8, 4.45, 4.6, 48)
    # entrance toward the main view (south-east)
    ang = math.radians(-45)
    ca, sa = math.cos(ang), math.sin(ang)

    def at(r, t, z):
        return (r * ca - t * sa, r * sa + t * ca, z)
    for s in (-1, 1):
        pipe(a["trim"], [at(6.0, s * 1.5, .15), at(6.0, s * 1.5, 2.6), at(6.0, s * 1.2, 3.1)], .16, .14, 10)
        pipe(a["trim"], [at(7.5, s * 1.5, .0), at(7.5, s * 1.5, 2.9)], .07, .07, 10)
    obox(a["trim"], at(6.85, 0, 3.05), (2.0, 3.6, .18), ang)
    obox(a["glow"], at(6.85, 0, 2.95), (1.4, 2.8, .03), ang)
    obox(a["door"], at(5.95, 0, 1.35), (.08, 2.6, 2.4), ang)
    obox(a["glow"], at(6.0, 0, 1.45), (.02, 1.7, 1.9), ang)
    return a


def base_glass():
    a = Accs()
    skin(a["glass_lobby"], [(6.0, .38), (6.0, 4.6)], 72)
    skin(a["glass_lobby"], [(6.0, 4.8), (4.24, 5.92)], 72)
    return a


def legs():
    """Four groups of white raking legs: one foot, a fork, two heads on the core's collar."""
    a = Accs()
    for d in (0, 90, 180, 270):
        foot, knee = pol(11.2, d, -.1), pol(7.1, d, 8.2)
        pipe(a["trim"], bez(foot, pol(9.0, d, 4.4), knee, 10), .62, .46, 14)
        for s in (-1, 1):
            head = pol(4.15, d + s * 24, 15.0)
            pipe(a["trim"], bez(_lower(knee, foot, .6), pol(6.4, d + s * 6, 9.8), head, 10), .44, .30, 12)
        M.ell(a["trim"], knee, (.52, 0, 0), (0, .52, 0), (0, 0, .62), 12, 8)
        lathe(a["trim"], [(1.15, -.02), (1.15, .22), (1.05, .30), (.5, .34)], 28, *pol(11.2, d))
    return a


def _lower(p, q, m):
    ln = math.dist(p, q)
    return tuple(u + (v - u) * m / ln for u, v in zip(p, q))


# --- CROWN ----------------------------------------------------------------------------------------------------------------
def crown_hub(rng):
    a = Accs()
    lathe(a["trim"], [(2.0, 48.3), (4.1, 48.75), (5.3, 49.4), (5.85, 50.1), (6.0, 50.8), (6.0, 52.2), (5.7, 52.45), (5.7, 53.1), (6.3, 53.25),
                      (6.75, 53.5), (6.8, 53.75), (6.65, 53.95), (6.4, 54.0), (1, 54.0)], 80)
    ring(a["cyan"], 5.69, 5.74, 52.6, 52.95, 80)
    ring(a["seam"], 5.99, 6.02, 51.46, 51.52, 80)
    ring(a["rail"], 6.50, 6.56, 55.0, 55.05, 80)
    for i in range(40):
        obox(a["rail"], pol(6.53, i * 9, 54.5), (.04, .04, 1.05), 0)
    ring(a["curb"], 5.0, 5.1, 53.95, 54.3, 64)                                   # planted ring on the deck
    ring(a["curb"], 6.05, 6.15, 53.95, 54.3, 64)
    ring(a["soil"], 5.05, 6.1, 53.95, 54.22, 64)
    for i in range(12):
        M.kit_prop(P.ctx(a, rng, *pol(5.58, i * 30, 54.2), math.radians(i * 30 + 90)), "shrub_cluster", 0, 0, 0)
    lathe(a["trim"], [(2.0, 54.0), (2.0, 54.25), (1.6, 54.3), (1.6, 55.95)], 48)  # equipment crown
    ring(a["trim"], 3.1, 3.3, 55.75, 56.0, 64)
    for i in range(16):
        pipe(a["trim"], [pol(2.05, i * 22.5, 54.2), pol(3.15, i * 22.5, 55.85)], .05, .05, 6)
    lathe(a["trim"], [(2.2, 55.95), (3.6, 56.02), (3.75, 56.15), (3.6, 56.32), (1.5, 56.6), (.95, 56.85), (.8, 57.3), (.55, 57.5), (.2, 57.65)], 64)
    ring(a["cyan"], 3.60, 3.77, 56.10, 56.18, 64)
    pipe(a["metal_light"], [(0, 0, 57.4), (0, 0, 58.9)], .20, .13, 12)
    pipe(a["metal_light"], [(0, 0, 58.8), (0, 0, 60.0)], .09, .03, 10)
    return a


def crown_glass():
    a = Accs()
    skin(a["glass_lobby"], [(2.1, 54.25), (3.2, 55.8)], 48)
    skin(a["glass"], [(6.53, 54.1), (6.53, 55.0)], 80)
    return a


ROOT_R = 5.4


def outer_z(r):
    t = (r - ROOT_R) / (24.4 - ROOT_R)
    return 51.75 + (49.25 - 51.75) * t + 1.3 * t * (1 - t)


def elbow(R, deg, z, rad=.6, drop=.35):
    """Quarter bend from a level arm end down to the hanger: points from (R - rad) to the stub's foot."""
    pts = []
    for j in range(1, 7):
        a = math.pi / 2 * j / 6
        pts.append(pol(R - rad + rad * math.sin(a), deg, z - rad * (1 - math.cos(a))))
    pts.append(pol(R, deg, z - rad - drop))
    return pts


def stub_z(ring_name):
    return {"OUTER": 49.25 - .95, "MID": 50.15 - .85, "INNER": 49.9 - .75}[ring_name]


def arms(pods):
    out = {}
    outer = [p for p in pods if p["ring"] == "OUTER"]
    for p in pods:
        a, R, d = Accs(), p["R"], p["angle"]
        if p["ring"] == "OUTER":
            pts = [pol(ROOT_R + (24.4 - ROOT_R) * i / 18, d, outer_z(ROOT_R + (24.4 - ROOT_R) * i / 18)) for i in range(19)]
            beam(a["trim"], pts + elbow(R, d, 49.25), .72, 1.10, .42, .45)
        elif p["ring"] == "MID":                                                # forks off the nearest outer arm
            near = min(outer, key=lambda q: abs(math.remainder(q["angle"] - d, 360)))["angle"]
            r0 = 7.6
            p0, c, p1 = pol(r0, near, outer_z(r0) - .12), pol(12.2, near, outer_z(12.2) - .35), pol(R - .55, d, 50.15)
            beam(a["trim"], bez(p0, c, p1, 14) + elbow(R, d, 50.15, .55, .30), .50, .92, .38, .43)
        else:
            pts = [(ROOT_R + (10.5 - ROOT_R) * i / 8) for i in range(9)]
            beam(a["trim"], [pol(r, d, 50.55 + (49.9 - 50.55) * (r - ROOT_R) / (10.5 - ROOT_R) + .12 * math.sin(math.pi * (r - ROOT_R) / (10.5 - ROOT_R))) for r in pts]
                 + elbow(R, d, 49.9, .5, .25), .48, .88, .38, .43)
        x, y = pol(R, d)
        z = stub_z(p["ring"])
        lathe(a["trim"], [(.27, z + .02), (.30, z + .06), (.30, z + .22), (.24, z + .28)], 20, x, y)
        lathe(a["metal"], [(.20, z - .10), (.20, z + .05)], 18, x, y)
        out[p["name"]] = a
    return out


def hanger(p):
    """Rod from the arm's socket to the spring's upper seat; its length takes up the height differences."""
    a = Accs()
    x, y = pol(p["R"], p["angle"])
    z0, z1 = p["z"] + P.ROD_Z, stub_z(p["ring"])
    lathe(a["metal"], [(.085, z0 - .04), (.085, z1)], 14, x, y)
    lathe(a["metal"], [(.14, z1 - .42), (.16, z1 - .36), (.16, z1 - .1), (.14, z1 - .06)], 16, x, y)
    lathe(a["metal"], [(.13, z0 + .02), (.15, z0 + .06), (.15, z0 + .34), (.12, z0 + .40)], 16, x, y)
    if z1 - z0 > 8:                                                             # turnbuckle on the long rods
        zm = (z0 + z1) / 2
        lathe(a["metal"], [(.10, zm - .35), (.13, zm - .28), (.13, zm + .28), (.10, zm + .35)], 14, x, y)
    return a


# --- PLAZA -----------------------------------------------------------------------------------------------------------------
PATHS = (-45, 45, 135, 225)
PATH_HALF = {-45: 13.0, 45: 7.0, 135: 7.0, 225: 7.0}


def plaza(rng):
    a = Accs()
    lathe(a["paving"], [(40, -.5), (40, 0), (1, 0)], 120)
    for r in (7.4, 15.2, 25.6):
        ring(a["paving_b"], r, r + .35, -.1, .012, 120)
    ring(a["curb"], 39.4, 40.0, -.1, .25, 120)
    for i in range(24):
        d = i * 15 + 7.5
        c = pol(20.5, d, .006)
        obox(a["paving_b"], c, (9.4, .12, .012), math.radians(d))
    for q in (0, 90, 180, 270):                                                # planters round the legs' feet
        sector(a["curb"], 8.6, 14.0, q - 30, q + 30, 0, .42, 3)
        sector(a["grass"], 8.9, 13.7, q - 28.6, q + 28.6, .3, .50, 3)
        for i in range(9):
            d = q - 25 + i * 50 / 8
            for r in (9.6, 12.8):
                if abs(d - q) > 7 and (i + (r > 10)) % 2:
                    M.kit_prop(P.ctx(a, rng, *pol(r, d, .48), rng.uniform(0, 6.28)), "shrub_cluster", 0, 0, 0)
    for i, p in enumerate(PATHS):                                               # tree lawns, open at the four paths
        n = PATHS[(i + 1) % 4]
        a0, a1 = p + PATH_HALF[p], (n if n > p else n + 360) - PATH_HALF[n]
        sector(a["curb"], 29.0, 38.6, a0, a1, 0, .30, 2)
        sector(a["grass"], 29.25, 38.35, a0 + .5, a1 - .5, .2, .38, 2)
        m = int((a1 - a0) / 18)
        for k in range(m):
            M.kit_prop(P.ctx(a, rng, *pol(30.2, a0 + 5 + k * (a1 - a0 - 10) / max(m - 1, 1), .36), rng.uniform(0, 6.28)), "shrub_cluster", 0, 0, 0)
        for f in (.25, .75):
            d = a0 + (a1 - a0) * f
            M.kit_prop(P.ctx(a, rng, *pol(27.6, d, 0), math.radians(d) - math.pi / 2), "bench", 0, 0, 0)
    for i in range(16):                                                        # low light posts
        d = i * 22.5 + 11
        x, y = pol(26.4, d)
        lathe(a["trim"], [(.09, 0), (.09, .85)], 10, x, y)
        lathe(a["cyan"], [(.10, .85), (.10, 1.05)], 10, x, y)
    return a


def tree_mesh(seed):
    """Broadleaf: a leafy_tree's limbs, filled with lumpy crown lobes so it reads full from the main view."""
    a, rng = Accs(), random.Random(seed)
    h = (6.2, 7.4, 5.4)[seed % 3]
    cr = h * .40
    M.leafy_tree(P.ctx(a, rng), (0, 0, 0), h=h, crown=cr * .9, trunk="wood", roles=("leaf_l", "green"), core="green", n=40, size=.4, branches=5)
    for i in range(7):
        t, rr = i * 2.4 + rng.uniform(-.3, .3), (0 if i == 0 else cr * rng.uniform(.45, .62))
        c = (rr * math.cos(t), h * (.84 if i == 0 else rng.uniform(.62, .78)), rr * math.sin(t))
        q = cr * rng.uniform(.46, .60)
        P.G.blob(P.Three(a["in_green" if i % 2 else "in_leaf_l"]), c, (q, q * .8, q), sub=2, seed=seed * 7 + i, noise=.30, flat=.8)
        M.leaf_clump(P.ctx(a, rng), c, (q * 1.08, q * .9, q * 1.08), ("leaf_l", "green"), None, 46, .42, .3, 1)
    return build_mesh("q04a_tree_%d" % seed, a, 180)


def tree_spots(rng):
    out = []
    for i, p in enumerate(PATHS):
        n = PATHS[(i + 1) % 4]
        a0, a1 = p + PATH_HALF[p] + 3, (n if n > p else n + 360) - PATH_HALF[n] - 3
        m = max(2, int((a1 - a0) / 7.6))
        for k in range(m):
            out.append((*pol(32.4 if k % 2 else 36.4, a0 + (a1 - a0) * k / (m - 1) + rng.uniform(-1, 1)), .36))
    for q in (0, 90, 180, 270):
        out += [pol(11.2, q + s * 21, .48) for s in (-1, 1)]
    return out


# --- preview staging ---------------------------------------------------------------------------------------------------
def preview(col, trees, rng):
    mk = lambda n, h, r=.8, **k: P.MATS.setdefault("pv_" + n, P.mat("pv_" + n, P.srgb(h), r, **k))  # noqa: E731
    mk("water", "3F7FA8", .08)
    mk("land", "A9B58A", .95)
    mk("path", "CFC8BB", .9)
    mk("far", "B9C9D6", .9)
    mk("farw", "DDE5EA", .8)
    a = Accs()
    loft(a["pv_water"], [[(-4000, 72, z), (4000, 72, z), (4000, 6000, z), (-4000, 6000, z)] for z in (-2.5, -2)])
    loft(a["pv_land"], [[(-700, -500, z), (700, -500, z), (700, 70, z), (-700, 70, z)] for z in (-3, -.12)])
    loft(a["pv_path"], [[(-700, 66, z), (700, 66, z), (700, 72, z), (-700, 72, z)] for z in (-3, .05)])
    ring(a["pv_path"], 40.0, 46.0, -.3, -.04, 120)
    for r, e in ((62, 40), (92, 40)):
        sector(a["pv_path"], r, r + 3.2, 180 - e, 360 + e, -.3, -.05, 3)
    for d in (0, 180, 225, 270, 315):
        obox(a["pv_path"], pol(75, d, -.17), (70, 5, .26), math.radians(d))
    for d in (45, 135):
        obox(a["pv_path"], pol(64, d, -.17), (48, 5, .26), math.radians(d))
    for i in range(170):                                                       # far shore
        x = rng.uniform(-3600, 900)
        y = rng.uniform(1700, 2300)
        h = rng.uniform(15, 60) * (2.2 if rng.random() < .12 else 1)
        w = rng.uniform(18, 46)
        box(a["pv_far"], x, x + w, y, y + w, -2, h)
    loft(a["pv_far"], [[(-4000, 1880, z), (4000, 1880, z), (4000, 2700, z), (-4000, 2700, z)] for z in (-2.2, 5)])
    bx, by = (-900.0, 1250.0), (-60.0, 1180.0)                                   # a suspension bridge across the bay
    def along(t, z):
        return (bx[0] + (by[0] - bx[0]) * t, bx[1] + (by[1] - bx[1]) * t, z)
    ang = math.atan2(by[1] - bx[1], by[0] - bx[0])
    obox(a["pv_farw"], along(.5, 26), (1300, 12, 3), ang)
    for t in (.1, .9):
        for s in (-1, 1):
            c = along(t, 45)
            obox(a["pv_farw"], (c[0] - s * 8 * math.sin(ang), c[1] + s * 8 * math.cos(ang), 45), (5, 4, 94), ang)
        obox(a["pv_farw"], along(t, 86), (4, 18, 5), ang)
    for s in (-1, 1):
        def cb(t, z):
            c = along(t, z)
            return (c[0] - s * 8 * math.sin(ang), c[1] + s * 8 * math.cos(ang), z)
        pipe(a["pv_farw"], [cb(.1 + .8 * i / 24, 30 + 60 * (2 * i / 24 - 1) ** 2) for i in range(25)], .8, .8, 5)
        pipe(a["pv_farw"], [cb(-.2, 28), cb(.1, 90)], .8, .8, 5)
        pipe(a["pv_farw"], [cb(1.2, 28), cb(.9, 90)], .8, .8, 5)
    ob = bpy.data.objects.new("PV_Context", build_mesh("pv_context", a))
    col.objects.link(ob)
    n = 0
    while n < 230:
        r, d = rng.uniform(45, 125), rng.uniform(0, 360)
        x, y = pol(r, d)
        if y > 60 or min(abs(r - 63.6), abs(r - 93.6)) < 4 or min(abs(math.remainder(d - q, 360)) for q in (0, 45, 135, 180, 225, 270, 315)) * r * .0175 < 4.5:
            continue
        if abs(math.remainder(d + 42, 360)) < 16 and r > 48:                      # keep the main camera's line clear
            continue
        t = bpy.data.objects.new("PV_Tree_%03d" % n, trees[n % 3])
        t.location = (x, y, -.12)
        t.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        t.scale = (rng.uniform(.85, 1.2),) * 3
        col.objects.link(t)
        n += 1


# --- assembly --------------------------------------------------------------------------------------------------------------
def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    P.make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    rng = random.Random(2127)
    col = bpy.data.collections.new("Q04A_Asset")
    prev = bpy.data.collections.new("Q04A_Preview")
    scene.collection.children.link(col)
    scene.collection.children.link(prev)
    root = bpy.data.objects.new("Q04A_SuspendedPodTower", None)
    col.objects.link(root)
    groups = {}
    for g in ("CORE", "CROWN", "PODS", "ACCESS", "PLAZA"):
        e = bpy.data.objects.new(g, None)
        c = bpy.data.collections.new(g)
        col.children.link(c)
        c.objects.link(e)
        e.parent = root
        groups[g] = (e, c)

    def add(name, data, g, parent=None, mw=None):
        ob = bpy.data.objects.new(name, data)
        groups[g][1].objects.link(ob)
        ob.parent = parent or groups[g][0]
        if mw is not None:
            ob.matrix_local = mw
        return ob

    pods, bridges = LY.cached()
    by = {p["name"]: p for p in pods}
    add("CORE_STRUCTURE", build_mesh("q04a_core", core_structure()), "CORE")
    add("CORE_TUBES", build_mesh("q04a_tubes", core_glass()), "CORE")
    add("CORE_BASE", build_mesh("q04a_base", base_structure(rng)), "CORE")
    add("CORE_BASE_GLASS", build_mesh("q04a_base_glass", base_glass()), "CORE")
    add("CORE_LEGS", build_mesh("q04a_legs", legs()), "CORE")
    add("CROWN_HUB", build_mesh("q04a_crown", crown_hub(rng)), "CROWN")
    add("CROWN_GLASS", build_mesh("q04a_crown_glass", crown_glass()), "CROWN")
    for name, a in arms(pods).items():
        add("ARM_" + name, build_mesh("q04a_arm_" + name, a), "CROWN")
    add("LIFT_CAPSULES", build_mesh("q04a_capsules", capsules(rng)), "ACCESS")

    shell = build_mesh("q04a_pod_shell", P.pod_shell())
    shutters = {s: build_mesh("q04a_shutter_" + s, P.shutter(s)) for s in STATES}
    accents = {c: build_mesh("q04a_accent_" + c, P.accent_band(c)) for c in P.ACCENTS}
    room = build_mesh("q04a_room", P.room())
    pieces = {k: build_mesh("q04a_" + k.lower(), f()) for k, f in P.FURNITURE.items()}
    for p in pods:
        state, colour = STATES[p["k"] % 3], ACCENT_CYCLE[p["k"] % 5]
        layout = LAYOUT_CYCLE[(p["k"] // 3 + p["k"] % 3) % 3] if state != "closed" else ""
        mw = Matrix.Translation((*pol(p["R"], p["angle"]), p["z"])) @ Matrix.Rotation(math.radians(p["angle"] - 90), 4, "Z")
        pod = add("POD_" + p["name"], shell, "PODS", mw=mw)
        pod["ring"], pod["number"], pod["window"], pod["turned_deg"] = p["ring"], p["n"], state, p["dtheta"]
        pod["accent"], pod["layout"] = colour, layout
        add("SHUTTER_" + p["name"], shutters[state], "PODS", parent=pod)
        add("ACCENT_" + p["name"], accents[colour], "PODS", parent=pod)
        if layout:                                                              # closed windows hide the room: none is built
            add("ROOM_" + p["name"], room, "PODS", parent=pod)
            m = 1 if math.remainder(p["angle"] - VIEW, 360) < 0 else -1
            for kind, x, y, h, yaw in P.LAYOUTS[layout]:
                add("%s_%s" % (kind, p["name"]), pieces[kind], "PODS", parent=pod,
                    mw=Matrix.Translation((m * x, y, P.ROOM[3] + h)) @ Matrix.Rotation(math.radians(m * yaw), 4, "Z"))
        add("HANGER_" + p["name"], build_mesh("q04a_hanger_" + p["name"], hanger(p)), "PODS")
    for b in bridges:
        add("BRIDGE_" + b["pod"], build_mesh("q04a_bridge_" + b["pod"], P.bridge(b["path"], b["deck"], TUBE_A[b["tube"]])), "ACCESS")

    add("PLAZA_GROUND", build_mesh("q04a_plaza", plaza(rng)), "PLAZA")
    trees = [tree_mesh(s) for s in range(3)]
    spots = tree_spots(rng)
    for i, q in enumerate(spots):
        s = .62 if i >= len(spots) - 8 else rng.uniform(.9, 1.1)                 # the last eight stand in the planters
        add("TREE_%02d" % (i + 1), trees[i % 3], "PLAZA", mw=Matrix.Translation(q) @ Matrix.Rotation(rng.uniform(0, 6.28), 4, "Z") @ Matrix.Scale(s, 4))
    preview(prev, trees, rng)

    bpy.context.view_layer.update()
    asset = [o for o in col.all_objects]
    by_group = {g: sum(P.tris(o.data) for o in groups[g][1].objects if o.type == "MESH") for g in groups}
    report = {"pods": len(pods), "bridges": len(bridges), "turned": {p["name"]: p["dtheta"] for p in pods if p["dtheta"]},
              "pod_shell_tris": P.tris(shell), "piece_tris": {k: P.tris(m) for k, m in {**pieces, "ROOM": room, "ACCENT": accents["white"], "SHUTTER": shutters["open"]}.items()},
              "windows": {s: sum(1 for p in pods if STATES[p["k"] % 3] == s) for s in STATES},
              "layouts": {k: sorted(o.name[4:] for o in asset if o.name.startswith("POD_") and o["layout"] == k) for k in LAYOUT_CYCLE},
              "accents": {c: sum(1 for o in asset if o.name.startswith("POD_") and o["accent"] == c) for c in P.ACCENTS}, "tris_by_group": by_group, "tris_total": sum(by_group.values()),
              "unique_mesh_tris": sum(P.tris(m) for m in {o.data for o in asset if o.type == "MESH"}),
              "objects": len(asset), "materials": len({m.name for o in asset if o.type == "MESH" for m in o.data.materials})}
    import review_suspended_pod_tower as RV
    RV.stage(scene, prev, by)
    blend = os.path.join(HERE, ASSET + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    if "--no-export" not in ARGS:
        glb = os.path.join(HERE, ASSET + ".glb")
        for ob in bpy.data.objects:
            ob.select_set(False)
        for ob in asset:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = root
        bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                                  export_animations=False, export_cameras=False, export_lights=False, export_extras=True,
                                  export_materials="EXPORT")
        report["glb_bytes"] = os.path.getsize(glb)
    with open(os.path.join(HERE, "report-v2.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps(report))


if __name__ == "__main__":
    main()
