"""Q09-A 光翼海灣自在館 / 光の翼のウェルネステラス (design document Q09-A_Afterwork; reference: Q09_Afterwork sheet p.2,
left image A, `.dream-loop/q09a/target.png`).

Run:  blender -b --factory-startup --python-exit-code 1 -P build_wing_wellness.py [-- --massing] [--no-export]
Writes q09a-wing-wellness.blend (asset + preview staging), the city GLB q09a-wing-wellness.glb (asset only) and
report.json beside this file. --massing builds the grey model (tiers, eaves, glass, the wings with their ribs and struts,
the main equipment blocks) into q09a-wing-wellness-massing.blend for locking the main camera.

Blender coordinates, real metres; every layout number lives in pavilion.py. Origin = main entrance floor level at the
centre of the front facade line, z up, front (sea-side walkway) toward -y. Three rounded terraced tiers (30 x 18 m,
stepping back 3 m per floor, floors 0 / 4.2 / 8.0 m) with thick white eaves, warm wood soffits and fine edge lights.
Ground floor: gym (left: cable machine with weight stacks, dumbbell rack, spin bikes, treadmills on a damped rubber
floor, mirror wall) and a separate yoga room (right: oak floor, mats, mat cabinet, adjustable fins, slatted lit wall),
each with its own door; storage band between; side hall and back core for the upper floors. 2F reading room and
reading terrace, 3F garden lounge, planted terrace edges, roof planters draining to the service side. Six fixed
iridescent wings (membrane sandwich, champagne edge and spine ribs, edge lights, light slots between them) root on a
steel ridge beam on the top roof (posts over the core and walls) and are propped by struts down to the roof slab.

Nodes: Q09A_WingWellness > TIERS (TIER_1..3 shells, GLASS), GROUND (GYM_EQUIPMENT, YOGA_ROOM, ROOMS), UPPER (READING,
GARDENS), WINGS (RIDGE, WING_1..6), SITE. Preview staging (sky, sea, far shore, figures, light) is never exported.
"""
import importlib.util
import json
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)
sys.path.insert(0, HERE)


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


K = _load("q04a_parts", os.path.join(MODELS, "q04a-suspended-pod-tower", "parts.py"))
import pavilion as L  # noqa: E402

G, M = K.G, K.M
Accs, loft, lathe, ring, pipe, beam, srgb = K.Accs, K.loft, K.lathe, K.ring, K.pipe, K.beam, K.srgb

ASSET = "q09a-wing-wellness"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MASSING = "--massing" in ARGS


def box(acc, x0, x1, y0, y1, z0, z1):
    K.box(acc, min(x0, x1), max(x0, x1), min(y0, y1), max(y0, y1), z0, z1)


def kit_yaw(fx, fy):
    """Yaw for a kit prop / figure so its front faces the world direction (fx, fy)."""
    return math.atan2(fx, -fy)


def kit(a, rng, name, x, y, z, face=(0, -1)):
    M.kit_prop(K.ctx(a, rng, x, y, z, kit_yaw(*face)), name, 0, 0, 0)


class Frame:
    """Local frame for a prop: origin (x, y, z), local +y = facing direction (fx, fy)."""

    def __init__(self, x, y, z, face=(0, -1)):
        ang = math.atan2(face[1], face[0]) - math.pi / 2
        self.T = Matrix.Translation((x, y, z)) @ Matrix.Rotation(ang, 4, "Z")

    def p(self, x, y, z):
        return tuple(self.T @ Vector((x, y, z)))

    def box(self, acc, x0, x1, y0, y1, z0, z1):
        loft(acc, [[self.p(x, y, z) for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))] for z in (z0, z1)])

    def tube(self, acc, pts, r, n=8):
        pipe(acc, [self.p(*q) for q in pts], r, n=n)

    def disc(self, acc, c, axis, r, t, n=20):
        """Disc of radius r and thickness t centred c, its axis along local 'x' or 'y'."""
        secs = []
        for s in (-t / 2, t / 2):
            ring_pts = []
            for i in range(n):
                a = 2 * math.pi * i / n
                u, v = r * math.cos(a), r * math.sin(a)
                q = (c[0] + s, c[1] + u, c[2] + v) if axis == "x" else (c[0] + u, c[1] + s, c[2] + v)
                ring_pts.append(self.p(*q))
            secs.append(ring_pts)
        loft(acc, secs)


# --- plan helpers --------------------------------------------------------------------------------------------------------------
def prism(acc, poly, z0, z1):
    loft(acc, [[(x, y, z0) for x, y in poly], [(x, y, z1) for x, y in poly]])


def wall_along(acc, path, nrm, d0, d1, z0, z1):
    """Solid wall along an open path of outline points; d0..d1 = offsets along each point's outward normal."""
    if len(path) < 2:
        return
    secs = []
    for (x, y), (nx, ny) in zip(path, nrm):
        secs.append([(x + nx * d0, y + ny * d0, z0), (x + nx * d1, y + ny * d1, z0), (x + nx * d1, y + ny * d1, z1), (x + nx * d0, y + ny * d0, z1)])
    loft(acc, secs)


def outline_runs(k, inset, keep, step=.4):
    pts = L.tier_outline(k, inset, step)
    nrm = dict(zip(pts, L.normals(pts)))
    return [(r, [nrm[p] for p in r]) for r in L.runs(pts, keep)]


def glass_run(a, path, nrm, z0, z1, mul_step=2.2, frame="frame"):
    """Curved glass ribbon (thin solid) with slim mullions, sill and head along an open outline path."""
    wall_along(a["glass"], path, nrm, -.015, .015, z0, z1)
    if MASSING:
        return
    acc = 0.0
    last = None
    for i, (p, n) in enumerate(zip(path, nrm)):
        if last is not None:
            acc += math.dist(p, last)
        last = p
        if i == 0 or i == len(path) - 1 or acc >= mul_step:
            acc = 0.0
            box(a[frame], p[0] - .035, p[0] + .035, p[1] - .035, p[1] + .035, z0, z1)
    wall_along(a[frame], path, nrm, -.05, .05, z0, z0 + .06)
    wall_along(a[frame], path, nrm, -.05, .05, z1 - .06, z1)


# --- tiers: slabs, eaves, soffits, edge lights ----------------------------------------------------------------------------------
def eave(a, k):
    """The roof slab of tier k: a thick white rounded eave (bullnose fascia) with a warm wood soffit ring and an edge light."""
    z, y0, y1, rf, rb, top = L.TIERS[k]
    d = L.SLAB[k]
    pts = L.tier_outline(k, 0.0, .4)
    nrm = L.normals(pts)

    def off(o, zz):
        return [(x - nx * o, y - ny * o, zz) for (x, y), (nx, ny) in zip(pts, nrm)]
    prof = [(.45, top - d), (.18, top - d + .06), (.04, top - d + .22), (0.0, top - d * .55), (.02, top - .14), (.12, top - .03), (.3, top)]
    loft(a["eave"], [off(o, zz) for o, zz in prof])
    if not MASSING:
        loft(a["soffit"], [off(.45, top - d - .02), off(L.GLASS_IN - .02, top - d - .02), off(L.GLASS_IN - .02, top - d), off(.45, top - d)],
             wrap=True, caps=False)
        loft(a["edge_light"], [off(.17, top - d + .045), off(.12, top - d + .07), off(.08, top - d + .035), off(.14, top - d + .01)],
             wrap=True, caps=False)
    if k == 0:                                                                  # ground-floor finish (upper floors: tier_shell)
        prism(a["floor_in"], L.tier_outline(0, L.GLASS_IN, .4), 0.0, .03)


def tier_shell(rng, k):
    a = Accs()
    eave(a, k)
    z, y0, y1, rf, rb, top = L.TIERS[k]
    zc = top - L.SLAB[k]
    gi = L.GLASS_IN
    if k == 0:
        # front: gym glass and yoga glass (doors open), white storage-band pier between, opaque back half
        for keep, opening in ((lambda p: p[0] <= L.BAND[0] and p[1] <= L.ROOM_BACK, L.GYM_DOOR),
                              (lambda p: p[0] >= L.BAND[1] and p[1] <= L.ROOM_BACK, L.YOGA_DOOR)):
            for path, nrm in outline_runs(0, gi, lambda p, kp=keep, dr=opening:kp(p) and not (dr[0] - .02 < p[0] < dr[1] + .02 and p[1] < 2)):
                glass_run(a, path, nrm, z, zc)
        for path, nrm in outline_runs(0, gi, lambda p: p[1] > L.ROOM_BACK - .2 and not (p[0] > 14 and L.SIDE_DOOR[0] < p[1] < L.SIDE_DOOR[1])):
            wall_along(a["cladding"], path, nrm, -.15, .15, z, zc)
        fy = L.front_glass_y()
        # pier: rounded white column-wall between the rooms, full height, slightly proud of the glass
        prof = [(L.BAND[0], L.ROOM_BACK)]
        for i in range(9):
            t = math.pi * i / 8
            prof.append((-1.5 * math.cos(t), fy - .25 + .9 - .9 * math.sin(t)))
        prof.append((L.BAND[1], L.ROOM_BACK))
        prism(a["cladding"], prof, z, zc)
        if not MASSING:
            for x in (L.BAND[0] + .02, L.BAND[1] - .02):                         # warm light slots up the pier sides
                box(a["edge_light"], x - .02, x + .02, fy + .2, fy + .3, .1, zc - .1)
        # side-hall door on the right end face: frame, glass leaf slid open, canopy light
        s0, s1 = L.SIDE_DOOR
        xr = L.X1 - gi
        box(a["frame"], xr - .1, xr + .1, s0 - .12, s0, 0, 2.6)
        box(a["frame"], xr - .1, xr + .1, s1, s1 + .12, 0, 2.6)
        box(a["frame"], xr - .1, xr + .1, s0 - .12, s1 + .12, 2.6, 2.75)
        box(a["glass"], xr - .03, xr + .03, s1 + .1, s1 + 1.5, 0, 2.6)
        box(a["edge_light"], xr + .2, xr + .25, s0, s1, 2.9, 2.95)
        for dr in (L.GYM_DOOR, L.YOGA_DOOR):
            door(a, dr, fy, zc)
    else:
        # upper tiers: glass all round the front half, cladding behind
        for path, nrm in outline_runs(k, gi, lambda p: p[1] <= L.ROOM_BACK + (1.5 if k == 2 else 0)):
            glass_run(a, path, nrm, z + .05, zc, 1.8)
        for path, nrm in outline_runs(k, gi, lambda p: p[1] > L.ROOM_BACK + (1.3 if k == 2 else -.2)):
            wall_along(a["cladding"], path, nrm, -.15, .15, z, zc)
        prism(a["floor_wood"] if k == 1 else a["floor_in"], L.tier_outline(k, gi, .4), z, z + .04)
    # interior ceiling
    if not MASSING:
        prism(a["ceiling"], L.tier_outline(k, gi - .02, .5), zc - .04, zc - .02)
    return a


def door(a, dr, fy, zc):
    """Front entrance: bronze frame, two sliding glass leaves parked open behind the fixed glass, sign light, mat."""
    x0, x1 = dr
    h = 2.7
    box(a["frame"], x0 - .12, x0, fy - .08, fy + .08, 0, h)
    box(a["frame"], x1, x1 + .12, fy - .08, fy + .08, 0, h)
    box(a["frame"], x0 - .12, x1 + .12, fy - .08, fy + .08, h, h + .14)
    box(a["glass"], x0 - .12, x1 + .12, fy - .02, fy + .02, h + .14, zc)          # transom glass
    if MASSING:
        return
    for sgn, xx in ((-1, x0), (1, x1)):                                           # leaves parked open
        xa, xb = (xx - .92, xx - .02) if sgn < 0 else (xx + .02, xx + .92)
        box(a["glass"], xa, xb, fy + .1, fy + .13, .02, h - .02)
        box(a["frame"], xa, xb, fy + .09, fy + .14, .02, .08)
        box(a["frame"], xa, xb, fy + .09, fy + .14, h - .08, h - .02)
    box(a["door_mat"], x0, x1, fy - 1.2, fy + 1.0, 0, .015)
    box(a["edge_light"], x0 + .2, x1 - .2, fy - .12, fy - .09, h + .02, h + .1)


# --- ground floor: gym ---------------------------------------------------------------------------------------------------------
def room_poly(x_lo, x_hi):
    poly = L.tier_outline(0, L.GLASS_IN + .02, .4)
    poly = L.clip(poly, 1, L.ROOM_BACK, True)
    poly = L.clip(poly, 0, x_lo, False)
    return L.clip(poly, 0, x_hi, True)


def spin_bike(a, F):
    f = a["machine_dark"]
    F.tube(f, [(-.35, -.45, .04), (.35, -.45, .04)], .035)                  # front foot
    F.tube(f, [(-.3, .5, .04), (.3, .5, .04)], .035)                        # rear foot
    F.tube(f, [(0, -.45, .05), (0, .5, .05)], .04)
    F.tube(f, [(0, -.3, .05), (0, -.18, .95)], .045)                        # head tube
    F.tube(f, [(0, .38, .05), (0, .12, .8)], .045)                          # seat tube
    F.tube(f, [(0, .12, .8), (0, .2, 1.02)], .025)
    F.tube(f, [(0, -.18, .95), (0, -.3, 1.15)], .025)
    F.box(a["machine_seat"], -.09, .09, .1, .34, 1.02, 1.08)                # saddle
    F.tube(a["grip"], [(-.24, -.36, 1.15), (.24, -.36, 1.15)], .022)        # handlebar
    F.disc(a["flywheel"], (0, -.32, .45), "x", .25, .06)                    # flywheel
    F.box(a["screen_g"], -.07, .07, -.36, -.3, 1.18, 1.3)
    F.disc(a["machine_dark"], (0, .0, .4), "x", .1, .1, 10)                 # crank
    F.tube(a["machine_dark"], [(-.12, 0, .4), (.12, 0, .4)], .015)


def cable_machine(a, F):
    """Functional trainer: two weight-stack towers with guide rods, top crossbar, pulleys and cables, pull-up bar."""
    w = 1.9
    for sx in (-1, 1):
        x = sx * (w / 2 - .25)
        for dx in (-.22, .22):
            F.box(a["machine_dark"], x + dx - .04, x + dx + .04, -.25, -.17, 0, 2.3)
            F.box(a["machine_dark"], x + dx - .04, x + dx + .04, .17, .25, 0, 2.3)
        F.box(a["machine_dark"], x - .3, x + .3, -.3, .3, 0, .08)               # base
        F.box(a["machine_dark"], x - .3, x + .3, -.3, .3, 2.22, 2.3)
        for k in range(14):                                                    # weight stack: plates with one pinned
            z = .1 + k * .055
            F.box(a["plate_stack"] if k != 6 else a["plate_pin"], x - .17, x + .17, -.1, .1, z, z + .045)
        for dx in (-.12, .12):                                                 # guide rods
            F.tube(a["chrome"], [(x + dx, 0, .1), (x + dx, 0, 2.2)], .012, 6)
        F.box(a["plate_stack"], x - .17, x + .17, -.1, .1, 1.95, 2.0)          # top plate
        F.disc(a["pulley"], (x + sx * .32, -.2, 1.6), "x", .07, .04, 12)        # adjustable pulley carriage
        F.box(a["machine_dark"], x + sx * .26, x + sx * .38, -.24, -.16, .2, 2.2)
        F.tube(a["cable"], [(x + sx * .32, -.24, 1.6), (x + sx * .1, -1.15, 1.35)], .008, 4)
        F.box(a["grip"], x + sx * .1 - .06, x + sx * .1 + .06, -1.2, -1.1, 1.3, 1.4)
    F.box(a["machine_dark"], -w / 2, w / 2, -.25, -.15, 2.22, 2.32)              # top crossbar
    F.tube(a["grip"], [(-.55, -.32, 2.25), (.55, -.32, 2.25)], .02)             # pull-up bar
    F.box(a["machine_seat"], -.3, .3, -.05, .55, .42, .5)                       # bench between the towers
    F.box(a["machine_dark"], -.05, .05, .1, .45, 0, .42)


def dumbbell_rack(a, F, n=10):
    L_ = 2.2
    for x in (-L_ / 2, L_ / 2):
        F.box(a["machine_dark"], x - .04, x + .04, -.25, .25, 0, .95)
    for tier, (yy, zz) in enumerate(((.12, .5), (-.12, .85))):                  # low tier at the front (local +y)
        F.box(a["machine_dark"], -L_ / 2, L_ / 2, yy - .14, yy + .14, zz - .04, zz)
        for i in range(n):
            x = -L_ / 2 + .12 + i * (L_ - .24) / (n - 1)
            r = .055 + .006 * i + .02 * tier
            for side in (-1, 1):                                            # hexagonal heads on a chrome handle
                hx = side * .1
                K.loft(a["dumbbell"], [[F.p(x + r * math.cos(2 * math.pi * j / 6), yy + hx + s * .04, zz + r + r * math.sin(2 * math.pi * j / 6))
                                        for j in range(6)] for s in (-1, 1)])
            F.tube(a["chrome"], [(x, yy - .07, zz + r), (x, yy + .07, zz + r)], .014, 6)


def gym(rng):
    a = Accs()
    zc = L.TIERS[0][5] - L.SLAB[0]
    prism(a["rubber"], room_poly(*L.GYM), .03, .07)                         # damped rubber floor, 40 mm
    if not MASSING:
        for x in range(-13, -1, 1):                                          # tile joints
            box(a["seam"], x - .006, x + .006, .9, L.ROOM_BACK - .1, .07, .072)
    # back wall: mirror and light, partition to the band
    box(a["wall_in"], L.GYM[0], L.BAND[0], L.ROOM_BACK - .15, L.ROOM_BACK, 0, zc)
    box(a["mirror"], L.GYM[0] + .5, L.BAND[0] - .4, L.ROOM_BACK - .17, L.ROOM_BACK - .15, .3, 2.5)
    box(a["cladding"], L.BAND[0] - .15, L.BAND[0], L.front_glass_y() + .6, L.ROOM_BACK, 0, zc)
    cable_machine(a, Frame(-7.0, 6.9, .07, (0, -1)))
    dumbbell_rack(a, Frame(-3.6, 7.6, .07, (0, -1)))
    for i, x in enumerate((-12.1, -10.8, -9.5)):                             # spin bikes, side-on to the sea glass
        spin_bike(a, Frame(x, 4.6 + .25 * i, .07, (-1, -.15)))
    if MASSING:
        return a
    kit(a, rng, "treadmill", -11.8, 8.2, .07, (0, -1))
    kit(a, rng, "treadmill", -10.6, 8.2, .07, (0, -1))
    for x, y in ((-5.0, 3.6), (-3.1, 2.7)):                                # floor mats, kettlebells
        box(a["mat_gym"], x - .5, x + .5, y - .9, y + .9, .07, .085)
    for i in range(5):
        c = (-4.2 + i * .28, 5.2)
        lathe(a["machine_dark"], [(0, .07), (.09, .09), (.11, .17), (.08, .25), (.03, .3), (0, .3)], 10, *c)
    for r, (cx, cy) in ((2.4, (-7.6, 5.0)), (1.6, (-7.6, 5.0)), (1.2, (-11.0, 4.6))):   # ring lights
        ring(a["ring_light"], r - .05, r, zc - .32, zc - .26, 40, cx, cy)
        for t in (0, 2.1, 4.2):
            pipe(a["frame"], [(cx + r * math.cos(t), cy + r * math.sin(t), zc - .26), (cx + r * math.cos(t), cy + r * math.sin(t), zc - .04)], .006, n=4)
    # shoe cabinet and towel shelf inside the door
    shoe_cabinet(a, Frame(-1.88, 2.4, .07, (1, 0)), 1.6)                       # cubbies open on local -y: into the gym
    kit(a, rng, "potted_plant", -13.0, 2.6, .07)
    kit(a, rng, "potted_plant", -2.2, 9.2, .07)
    return a


def shoe_cabinet(a, F, length):
    F.box(a["oak"], -length / 2, length / 2, -.18, .18, 0, 1.0)
    n = int(length / .4)
    for i in range(n):
        for j in range(3):
            x0 = -length / 2 + .04 + i * (length - .08) / n
            x1 = x0 + (length - .08) / n - .04
            z0 = .06 + j * .31
            F.box(a["shadow"], x0, x1, -.19, -.17, z0, z0 + .26)
            F.box(a["shoe"], x0 + .05, x1 - .05, -.17, .05, z0, z0 + .1)


# --- ground floor: yoga room ---------------------------------------------------------------------------------------------------
def yoga(rng):
    a = Accs()
    zc = L.TIERS[0][5] - L.SLAB[0]
    prism(a["floor_oak"], room_poly(L.YOGA[0], L.X1), .03, .06)
    box(a["cladding"], L.BAND[1], L.BAND[1] + .15, L.front_glass_y() + .6, L.ROOM_BACK, 0, zc)
    # slatted oak back wall with a warm grazing light
    box(a["wall_in"], L.BAND[1], L.YOGA[1], L.ROOM_BACK - .15, L.ROOM_BACK, 0, zc)
    if not MASSING:
        for i in range(int((L.YOGA[1] - L.BAND[1] - .3) / .16)):
            x = L.BAND[1] + .25 + i * .16
            box(a["slat"], x - .04, x + .04, L.ROOM_BACK - .3, L.ROOM_BACK - .15, .1, zc - .1)
        box(a["edge_light"], L.BAND[1] + .2, L.YOGA[1] - .2, L.ROOM_BACK - .35, L.ROOM_BACK - .3, .08, .12)
        box(a["edge_light"], L.BAND[1] + .2, L.YOGA[1] - .2, L.ROOM_BACK - .35, L.ROOM_BACK - .3, zc - .14, zc - .1)
    # partition to the mat store (x 11.5) with an opening
    box(a["wall_in"], L.YOGA[1], L.YOGA[1] + .15, 4.2, L.ROOM_BACK, 0, zc)
    # mats: two rows facing the sea, blocks and straps, one mat half rolled
    cols = ("mat_mauve", "mat_teal", "mat_sand", "mat_lilac", "mat_teal", "mat_mauve")
    i = 0
    for y in (4.2, 6.9):
        for x in (3.4, 5.9, 8.4):
            mw, ml = .66, 1.85
            box(a[cols[i]], x - mw / 2, x + mw / 2, y - ml / 2, y + ml / 2, .06, .085)
            if not MASSING:
                box(a["cork"], x + mw / 2 + .08, x + mw / 2 + .31, y + .5, y + .65, .06, .18)
            i += 1
    if not MASSING:
        pipe(a["mat_lilac"], [(9.9, 2.4, .16), (9.9, 3.1, .16)], .1, n=14)          # a rolled mat waiting by the door
        box(a["mat_lilac"], 9.57, 10.23, 3.1, 4.4, .06, .072)
        # mat cabinet against the partition: oak cubbies with rolled mats
        Fc = Frame(L.YOGA[1] - .25, 7.0, .06, (1, 0))                           # cubbies (local -y) open into the room
        Fc.box(a["oak"], -1.4, 1.4, -.25, .2, 0, 1.9)
        for r_ in range(4):
            for c_ in range(5):
                x0 = -1.35 + c_ * .55
                z0 = .08 + r_ * .45
                Fc.box(a["shadow"], x0, x0 + .5, -.26, -.2, z0, z0 + .4)
                col = (cols[(r_ + c_) % len(cols)])
                Fc.tube(a[col], [(x0 + .25, -.24, z0 + .14), (x0 + .25, .15, z0 + .14)], .12, 12)
        shoe_cabinet(a, Frame(1.88, 2.4, .06, (-1, 0)), 1.6)                    # against the band wall, out of the mats' sightline
        kit(a, rng, "potted_plant", 2.2, 2.6, .06)
        kit(a, rng, "potted_plant", 10.8, 2.4, .06)
        ring(a["ring_light"], 1.75, 1.8, zc - .28, zc - .22, 40, 5.9, 5.5)
        # adjustable fins outside the curved east end of the yoga glass (turned 40 deg, open)
        pts = L.tier_outline(0, L.GLASS_IN - .35, .3)
        fins = [p for p in pts if p[0] > 9.0 and p[1] < L.ROOM_BACK - .2]
        nrm = dict(zip(pts, L.normals(pts)))
        for p in fins[::3]:
            nx, ny = nrm[p]
            t = math.atan2(ny, nx) + math.radians(90 + 40)
            c, s = math.cos(t), math.sin(t)
            loft(a["fin"], [[(p[0] + c * u - s * v, p[1] + s * u + c * v, z) for u, v in ((-.2, -.02), (.2, -.02), (.2, .02), (-.2, .02))]
                            for z in (.25, zc - .2)])
            pipe(a["frame"], [(p[0], p[1], .1), (p[0], p[1], zc - .05)], .015, n=5)
    return a


# --- ground floor: band, back rooms, side hall, core ----------------------------------------------------------------------------
def rooms(rng):
    a = Accs()
    zc = L.TIERS[0][5] - L.SLAB[0]
    # back zone partitions: changing rooms / showers (gym, yoga), plant room, side-hall corridor to the core
    box(a["wall_in"], L.GYM[0], L.CORE[0], 12.4, 12.55, 0, zc)
    box(a["wall_in"], L.CORE[1], L.SIDE_HALL[0], 12.4, 12.55, 0, zc)
    box(a["wall_in"], L.SIDE_HALL[0], L.SIDE_HALL[0] + .15, L.ROOM_BACK, 17.5, 0, zc)
    x0, x1, y0, y1 = L.CORE
    box(a["concrete"], x0, x1, y0, y1, 0, L.CORE_TOP)                          # stair / lift core, to the lift overrun
    box(a["concrete_cap"], x0 - .1, x1 + .1, y0 - .1, y1 + .1, L.CORE_TOP, L.CORE_TOP + .15)
    if not MASSING:
        for z in (0.0, 4.2, 8.0):                                              # lift doors onto each level's hall
            box(a["frame"], -.7, .7, y0 - .04, y0, z, z + 2.3)
            box(a["lift_door"], -.6, .6, y0 - .05, y0 - .04, z + .05, z + 2.2)
        box(a["floor_in"], L.SIDE_HALL[0], L.X1 - 1, L.ROOM_BACK, 17.5, .03, .05)
        kit(a, rng, "bench", 13.6, 15.4, .05, (-1, 0))
        box(a["sign"], L.X1 - L.GLASS_IN + .16, L.X1 - L.GLASS_IN + .2, L.SIDE_DOOR[0], L.SIDE_DOOR[1], 2.85, 3.15)
    return a


# --- upper floors ---------------------------------------------------------------------------------------------------------------
def reading(rng):
    """2F reading room behind the glass and the reading terrace on the ground tier's roof."""
    a = Accs()
    z = L.TIERS[1][0]
    zc = L.TIERS[1][5] - L.SLAB[1]
    box(a["wall_warm"], -13.0, 13.0, L.ROOM_BACK + .3, L.ROOM_BACK + .45, z, zc)  # shelf wall
    if MASSING:
        return a
    for i in range(24):                                                         # bookshelves along the back wall
        x = -12.5 + i * 1.05
        if -3.3 < x < 3.3 and i % 2:
            continue
        kit(a, rng, "bookshelf", x, L.ROOM_BACK + .1, z + .04, (0, -1))
    for x in (-10.0, -6.0, -2.0, 2.0, 6.0, 10.0):                               # reading chairs facing the sea, lamps
        kit(a, rng, "sofa", x, 6.6, z + .04, (0, -1))
        kit(a, rng, "floor_lamp", x + 1.1, 6.9, z + .04)
    for x in (-8.0, 0.0, 8.0):
        box(a["oak"], x - .9, x + .9, 8.3, 9.1, z + .72, z + .76)                # reading tables
        box(a["frame"], x - .04, x + .04, 8.66, 8.74, z, z + .72)
        box(a["lamp_glow"], x - .08, x + .08, 8.62, 8.78, z + .76, z + 1.1)
    for x in (-11.5, -4.0, 4.0, 11.5):
        ring(a["ring_light"], 1.0, 1.04, zc - .25, zc - .2, 32, x, 6.0)
    # terrace on the ground tier's roof: planted edge, glass guard, reading chairs and side tables
    zt = L.TIERS[0][5]
    for path, nrm in outline_runs(0, .25, lambda p: p[1] <= 11.5, .4):
        wall_along(a["planter"], path, nrm, -1.25, 0, zt, zt + .6)
        wall_along(a["soil"], path, nrm, -1.15, -.1, zt + .55, zt + .62)
        wall_along(a["guard_glass"], path, nrm, -1.3, -1.27, zt + .6, zt + 1.2)
        wall_along(a["champagne"], path, nrm, -1.32, -1.25, zt + 1.18, zt + 1.24)
        for k, (p, n) in enumerate(zip(path, nrm)):
            if k % 3:
                continue
            c = (p[0] - n[0] * .7, p[1] - n[1] * .7, zt + .6)
            sz = rng.uniform(.35, .55)
            roles = ("pod_p", "leaf_l") if k % 2 else ("leaf_l", "green")
            M.leaf_clump(K.ctx(a, rng, *c), (0, sz * .5, 0), (sz, sz * .8, sz), roles, "green", 16, .22, .4, 2)
    box(a["deck"], -9.0, 9.0, 1.4, 3.7, zt, zt + .04)
    for x in (-8.0, -3.5, 1.5, 6.0):
        kit(a, rng, "cafe_set", x, 2.5, zt + .04)
    return a


def gardens(rng):
    """3F garden lounge, the 2F roof garden strip, roof planters draining to the service side (+y)."""
    a = Accs()
    z2 = L.TIERS[1][5]
    for path, nrm in outline_runs(1, .25, lambda p: p[1] <= 14.0, .4):
        wall_along(a["planter"], path, nrm, -1.1, 0, z2, z2 + .55)
        wall_along(a["soil"], path, nrm, -1.0, -.1, z2 + .5, z2 + .57)
        wall_along(a["guard_glass"], path, nrm, -1.15, -1.12, z2 + .55, z2 + 1.15)
        if MASSING:
            continue
        for k, (p, n) in enumerate(zip(path, nrm)):
            if k % 2:
                continue
            c = (p[0] - n[0] * .55, p[1] - n[1] * .55, z2 + .57)
            sz = rng.uniform(.35, .6)
            M.leaf_clump(K.ctx(a, rng, *c), (0, sz * .5, 0), (sz, sz * .8, sz), ("pod_p", "green") if k % 4 else ("leaf_l", "green"),
                         "green", 16, .22, .4, 2)
    if not MASSING:
        for x in (-12.0, -8.5, 8.5, 12.0):                                     # small trees on the 2F roof strip, under 12 m
            M.leafy_tree(K.ctx(a, rng, x, 4.9, z2), (0, 0, 0), h=rng.uniform(2.6, 3.2), crown=1.2, trunk="wood",
                         roles=("leaf_l", "green"), core="green", n=40, size=.3, branches=3)
        box(a["deck"], -10, 10, 4.1, 5.4, z2, z2 + .04)
        z3 = L.TIERS[2][0]
        for x in (-9.0, -3.0, 3.0, 9.0):                                       # garden lounge inside the 3F glass
            kit(a, rng, "potted_plant", x, 7.6, z3 + .04)
            kit(a, rng, "sofa", x + 1.3, 8.6, z3 + .04, (0, -1))
        box(a["wall_warm"], -13, 13, 12.0, 12.15, z3, L.TIERS[2][5] - L.SLAB[2])
    # roof: planter troughs falling to a back gutter, downpipes; parapet
    zr = L.TIERS[2][5]
    for row, y in enumerate((8.6, 14.2)):                                       # clear of the ridge posts at y 7.4
        for x0 in (-13.0, -5.0, 3.5):
            if row == 1 and x0 == -5.0:
                continue                                                       # the core rises there
            box(a["planter"], x0, x0 + 6.5, y, y + 1.4, zr, zr + .5)
            if not MASSING:
                box(a["soil"], x0 + .1, x0 + 6.4, y + .1, y + 1.3, zr + .45, zr + .52)
                for k in range(6):
                    c = (x0 + .6 + k * 1.05, y + .7, zr + .52)
                    M.leaf_clump(K.ctx(a, rng, *c), (0, .25, 0), (.5, .35, .5), ("leaf_l", "green"), "green", 14, .22, .4, 2)
    if not MASSING:
        box(a["gutter"], -13.5, 13.5, 17.2, 17.55, zr - .05, zr + .12)             # drains to the service side
        for x in (-13.0, 13.0):
            pipe(a["gutter"], [(x, 17.7, zr), (x, 17.7, .1)], .06, n=8)
        for path, nrm in outline_runs(2, .1, lambda p: True, .5):
            wall_along(a["guard_glass"], path, nrm, -.04, 0, zr, zr + 1.1)
    return a


# --- wings ------------------------------------------------------------------------------------------------------------------------
def wing_frame(w):
    """Span direction d (in the facade plane at angle phi, leaning toward the sea), chord side s (the upper side),
    face normal n (toward the sea, tilted up by `tilt`)."""
    rx, ry, lift, phi, lean, ln, wd, tilt = w
    p, le, t = math.radians(phi), math.radians(lean), math.radians(tilt)
    d = (Vector((math.cos(p), 0.0, math.sin(p))) * math.cos(le) + Vector((0.0, -1.0, 0.0)) * math.sin(le)).normalized()
    s0 = Vector((-math.sin(p), 0.0, math.cos(p)))
    if s0.z < 0:
        s0 = -s0
    s = (s0 - d * s0.dot(d)).normalized()
    n0 = d.cross(s).normalized()
    if n0.y > 0:
        n0 = -n0
    n = (n0 * math.cos(t) + s * math.sin(t)).normalized()
    s = (s * math.cos(t) - n0 * math.sin(t)).normalized()
    root = Vector((rx, ry, L.RIDGE_Z + lift + .25))
    return root, d, s, n, ln, wd


def wing_width(u):
    """Feather plan: narrow at the root, widest at about 40 % of the span, a pointed tip."""
    if u < .4:
        f = .22 + .78 * math.sin(math.pi / 2 * u / .4) ** .8
    else:
        f = ((1 - u) / .6) ** .7
    return max(f, 0.0)


def wing_point(fr, u, v, twist=.16, camber=.10, curl=.045, sweep=.3):
    """Point on the wing mid-surface: u along the span 0..1, v across the chord -1 (lower, fuller edge) .. +1 (upper,
    straighter edge); the tip curls up toward the upper side, the lower edge feathers back toward the root."""
    root, d, s, n, ln, wd = fr
    tw = twist * u
    su = s * math.cos(tw) + n * math.sin(tw)
    nu = n * math.cos(tw) - s * math.sin(tw)
    w = wd * wing_width(u)
    across = v * w * (.6 if v < 0 else .4)
    p = (root + d * (ln * u) + s * (curl * ln * u * u) + su * across + nu * (camber * w * (1 - v * v))
         - d * (sweep * w * max(-v, 0) ** 1.5))
    return p, nu


def wing(k, w):
    a = Accs()
    fr = wing_frame(w)
    nu_, nv = 26, 10
    us = [i / nu_ for i in range(nu_ + 1)]
    vs = [-1 + 2 * j / nv for j in range(nv + 1)]
    t = L.WING_T / 2
    top, bot = [], []
    for u in us:
        for v in vs:
            p, nrm = wing_point(fr, u, v)
            top.append(tuple(p + nrm * t))
            bot.append(tuple(p - nrm * t))
    verts = top + bot
    off = len(top)
    faces = []
    W = nv + 1
    for i in range(nu_):
        for j in range(nv):
            q = (i * W + j, i * W + j + 1, (i + 1) * W + j + 1, (i + 1) * W + j)
            faces.append(q)
            faces.append(tuple(off + c for c in reversed(q)))
    for i in range(nu_):                                                        # leading / trailing edge strips
        for j in (0, nv):
            a0, a1 = i * W + j, (i + 1) * W + j
            faces.append((a0, a1, off + a1, off + a0) if j == 0 else (a1, a0, off + a0, off + a1))
    for j in range(nv):                                                         # root cap
        faces.append((j + 1, j, off + j, off + j + 1))
    # film colour bands along the span (rose / lilac / aqua, offset per wing): the colour shift survives in the GLB
    # even where a viewer ignores the iridescence extension
    if G.volume([tuple(v) for v in verts], faces) < 0:
        faces = [f[::-1] for f in faces]
    bands = {}
    for f in faces:
        u = max(us[(i % off) // W] for i in f)
        band = (k + (0 if u <= .36 else 1 if u <= .7 else 2)) % 3
        bands.setdefault(band, []).append(f)
    for band, fs in bands.items():
        a["wing_%d" % band]._push([tuple(v) for v in verts], fs)
    # champagne ribs: outline, spine (tapered box, underside), veins; edge lights just outside the outline
    lead = [tuple(wing_point(fr, u, -1)[0]) for u in us]
    trail = [tuple(wing_point(fr, u, 1)[0]) for u in us]
    outline = lead + trail[::-1][1:]
    pipe(a["champagne"], outline, .05, n=6)
    if not MASSING:
        for edge, sg in ((lead, -1), (trail, 1)):
            pts = []
            for u, p in zip(us, edge):
                q, nrm = wing_point(fr, u, sg)
                pts.append(tuple(Vector(p) + nrm * (L.WING_T / 2 + .02)))
            pipe(a["wing_light"], pts[1:-1], .016, n=5)
    spine = []
    for u in us[:23]:
        p, nrm = wing_point(fr, u, 0)
        spine.append(tuple(p - nrm * (L.WING_T / 2 + .12 * (1 - u))))
    beam(a["champagne"], spine, .22, .3, .05, .06)
    if not MASSING:
        for u0 in (.12, .26, .4, .54, .68):                                     # veins from the spine to both edges
            for sg, du in ((1, .14), (-1, .08)):
                pts = []
                for q in range(7):
                    f = q / 6
                    p, nrm = wing_point(fr, u0 + du * f, sg * f * .97)
                    pts.append(tuple(p - nrm * (L.WING_T / 2 + .01)))
                pipe(a["champagne"], pts, .038 * (1 - .4 * u0), n=5)
    # root: clevis plates and pin on the ridge beam
    root, d, s, n, ln, wd = fr
    base = Vector((root.x, L.RIDGE_Y, L.RIDGE_Z))
    for sg in (-1, 1):                                                          # two clevis plates, ridge top up to the pin
        c = root + s * (sg * .14)
        quad = ((-.025, -.32), (.025, -.32), (.025, .32), (-.025, .32))
        loft(a["steel"], [[tuple(base + s * (sg * .14 + o) + Vector((0, dy, 0))) for o, dy in quad],
                          [tuple(c + s * o + Vector((0, dy * .6, 0))) for o, dy in quad]])
    pipe(a["steel"], [tuple(root - s * .22), tuple(root + s * .22)], .06, n=10)
    # strut from the roof slab up to the spine at 30 % span
    p, nrm = wing_point(fr, .3, 0)
    top_pt = p - nrm * (L.WING_T / 2 + .2)
    foot = Vector((top_pt.x, max(top_pt.y, L.TIERS[2][1] + 1.2), L.TIERS[2][5]))
    pipe(a["champagne"], [tuple(foot + Vector((0, 0, .12))), tuple(top_pt)], .09, n=10)
    box(a["steel"], foot.x - .3, foot.x + .3, foot.y - .3, foot.y + .3, foot.z, foot.z + .06)
    lathe(a["steel"], [(0, foot.z + .06), (.16, foot.z + .06), (.12, foot.z + .14), (0, foot.z + .14)], 10, foot.x, foot.y)
    tip = wing_point(fr, 1.0, 0)[0]
    return a, {"root": [round(c, 2) for c in root], "tip": [round(c, 2) for c in tip], "strut_foot": [round(c, 2) for c in foot],
               "strut_len": round((top_pt - foot).length, 2)}


def ridge():
    a = Accs()
    x0, x1 = L.RIDGE_X
    zt, y = L.RIDGE_Z, L.RIDGE_Y
    beam(a["steel"], [(x0, y, zt - .35), (x1, y, zt - .35)], .45, .7, .45, .7)
    for x in L.RIDGE_POSTS:                                                     # posts down to the roof slab over walls / core
        box(a["steel"], x - .18, x + .18, y - .18, y + .18, L.TIERS[2][5], zt - .7)
        box(a["steel"], x - .35, x + .35, y - .35, y + .35, L.TIERS[2][5], L.TIERS[2][5] + .05)
    for x in L.BACK_BEAMS:                                                      # the ridge's load carried back onto the core
        beam(a["steel"], [(x, y, zt - .35), (x, L.CORE[2] + .4, zt - .35)], .3, .5, .3, .5)
    return a


# --- site --------------------------------------------------------------------------------------------------------------------------
def site(rng):
    a = Accs()
    x0, x1, y0, y1 = L.SITE
    box(a["paving"], x0, x1, y0, y1, -.3, 0)
    if MASSING:
        return a
    for x in [x0 + 1.2 * i for i in range(1, int((x1 - x0) / 1.2))]:
        box(a["paving_joint"], x - .01, x + .01, y0, y1, 0, .003)
    for y in [y0 + 1.2 * i for i in range(1, int((y1 - y0) / 1.2))]:
        box(a["paving_joint"], x0, x1, y - .01, y + .01, 0, .003)
    # the walkway's glowing line, sweeping past the two doors
    pts = [(x, -6.0 + 2.2 * math.sin(x / 9.0), .006) for x in [x0 + .5 * i for i in range(int((x1 - x0) / .5) + 1)]]
    pipe(a["path_light"], [p for p in pts], .03, n=5)
    pts2 = [(x, -1.4 + .8 * math.cos(x / 7.0), .006) for x in [-24 + .5 * i for i in range(97)] if not (-7 < x < -3.8 or 4.8 < x < 7.8)]
    for seg in _segments(pts2, .6):
        pipe(a["path_light"], seg, .02, n=5)
    # flower beds (lavender) at the front corners, clear of the door approaches
    for (bx0, bx1, by0, by1) in ((-25.0, -14.5, -13.5, -9.5), (14.0, 25.0, -13.5, -9.0), (-25.0, -17.0, -6.0, 8.0), (17.0, 25.0, -4.0, 9.0)):
        box(a["planter"], bx0, bx1, by0, by1, 0, .35)
        box(a["soil"], bx0 + .15, bx1 - .15, by0 + .15, by1 - .15, .3, .4)
        for k in range(int((bx1 - bx0) * (by1 - by0) / 2.2)):
            c = (rng.uniform(bx0 + .5, bx1 - .5), rng.uniform(by0 + .5, by1 - .5), .38)
            sz = rng.uniform(.35, .6)
            M.leaf_clump(K.ctx(a, rng, *c), (0, sz * .6, 0), (sz * .8, sz, sz * .8), ("pod_p", "leaf_l") if k % 3 else ("leaf_l", "green"),
                         "green", 14, .2, .3, 2)
    for tx, ty, h in ((-20.5, 2.0, 7.5), (-21.0, -11.0, 6.0), (20.0, 4.0, 6.5), (21.5, -11.5, 5.5)):
        M.leafy_tree(K.ctx(a, rng, tx, ty, .35), (0, 0, 0), h=h, crown=2.2, trunk="wood", roles=("leaf_l", "green"), core="green", n=70, size=.4, branches=4)
    for x in (-12.0, -9.0, 9.0, 12.0, 15.0):                                     # bollard lights along the walkway
        lathe(a["frame"], [(0, 0), (.08, 0), (.08, .7), (0, .7)], 10, x, -2.6)
        lathe(a["path_light"], [(0, .7), (.085, .7), (.085, .78), (0, .78)], 10, x, -2.6)
    kit(a, rng, "bench", -16.0, -3.0, 0, (0, -1))
    kit(a, rng, "bench", 16.5, -2.8, 0, (0, -1))
    box(a["rail"], x0, x1, -13.7, -13.6, 0, 1.05)                                 # sea rail
    for x in [x0 + 2 * i for i in range(int((x1 - x0) / 2) + 1)]:
        box(a["rail"], x - .03, x + .03, -13.68, -13.62, 0, 1.05)
    return a


def _segments(pts, gap):
    out, cur = [], [pts[0]]
    for p, q in zip(pts, pts[1:]):
        if math.dist(p, q) > gap:
            out.append(cur)
            cur = []
        cur.append(q)
    out.append(cur)
    return [s for s in out if len(s) > 1]


# --- materials ----------------------------------------------------------------------------------------------------------------------
def mat(name, hexc, rough=.6, metal=0.0, alpha=1.0, emit=None, strength=1.0, culling=True):
    m = G.material("q09a_" + name, srgb(hexc, alpha), rough, srgb(emit) if emit else None, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


def iridescent(name, hexc, film_nm):
    """Wing membrane: pearly translucent base with a thin-film layer (exported as KHR_materials_iridescence)."""
    m = mat(name, hexc, .14, .15, alpha=.5, emit=hexc, strength=.55, culling=False)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    for key, val in (("Thin Film Thickness", film_nm), ("Thin Film IOR", 1.42), ("Coat Weight", .4), ("Coat Roughness", .08)):
        if key in b.inputs:
            b.inputs[key].default_value = val
    return m


def make_materials():
    K.MATS.clear()
    K.MATS.update({
        "eave": mat("eave_white", "F1EEE8", .4, .05), "cladding": mat("cladding_white", "EEEAE3", .45),
        "soffit": mat("warm_wood_soffit", "C08F5C", .55, emit="E39A55", strength=.35),
        "edge_light": mat("edge_light", "FFE2B8", .4, emit="FFD39A", strength=8.0),
        "ceiling": mat("ceiling", "F3EEE6", .7, emit="FFF2DE", strength=.35),
        "glass": mat("glass", "D6EAF0", .03, alpha=.12, culling=False),
        "guard_glass": mat("guard_glass", "DDEFF3", .04, alpha=.2, culling=False),
        "frame": mat("bronze_frame", "6E5A48", .35, .7), "champagne": mat("champagne_rib", "C9A774", .28, .9),
        "steel": mat("ridge_steel", "B9AE9A", .35, .85),
        "wing_0": iridescent("wing_film_rose", "EFA8D8", 420.0), "wing_1": iridescent("wing_film_lilac", "B8A6F2", 520.0),
        "wing_2": iridescent("wing_film_aqua", "9EE3E6", 620.0),
        "wing_light": mat("wing_edge_light", "FFF0DA", .4, emit="FFE8C8", strength=7.0),
        "floor_in": mat("floor_stone", "DCD6CC", .6), "floor_wood": mat("floor_reading_oak", "B98D60", .5, emit="7A5530", strength=.1),
        "floor_oak": mat("yoga_oak", "C99B68", .45, emit="8A6038", strength=.12),
        "rubber": mat("damped_rubber", "3A3C3F", .9), "seam": mat("tile_seam", "26282A", .9),
        "wall_in": mat("wall_interior", "ECE8E2", .7, emit="FFF4E4", strength=.15),
        "wall_warm": mat("wall_warm", "E8D2B2", .7, emit="FFD9A6", strength=.3),
        "mirror": mat("mirror", "E9EEF0", .03, 1.0), "slat": mat("oak_slat", "B88550", .5, emit="C98A4A", strength=.25),
        "machine_dark": mat("machine_black", "2B2D30", .45, .6), "machine_seat": mat("machine_seat", "3C3F44", .7),
        "plate_stack": mat("weight_plate", "4D5257", .35, .8), "plate_pin": mat("weight_pin_plate", "C8552E", .4, .5),
        "chrome": mat("chrome", "DDE2E4", .12, 1.0), "pulley": mat("pulley", "9CA3A8", .3, .8),
        "cable": mat("cable", "1C1D1F", .5), "grip": mat("grip", "1E1F21", .8),
        "flywheel": mat("flywheel", "A7ADB2", .25, .9), "dumbbell": mat("dumbbell_head", "34373A", .5, .4),
        "screen_g": mat("bike_screen", "7FD8F0", .3, emit="6FD0F0", strength=2.5),
        "mat_gym": mat("gym_mat", "4C5A66", .9),
        "mat_mauve": mat("mat_mauve", "A0617E", .85), "mat_teal": mat("mat_teal", "3E8E8A", .85),
        "mat_sand": mat("mat_sand", "D8B98A", .85), "mat_lilac": mat("mat_lilac", "9C8FC8", .85),
        "cork": mat("cork_block", "C49A6C", .8), "oak": mat("oak", "B98B5C", .5), "shadow": mat("cubby_shadow", "4A3B2E", .8),
        "shoe": mat("shoes", "E8E4DC", .6), "fin": mat("adjustable_fin", "E7DCC8", .4, .3),
        "door_mat": mat("door_mat", "5D5650", .95), "lift_door": mat("lift_door", "C7BCA8", .3, .8),
        "concrete": mat("core_concrete", "B5B0A8", .9), "concrete_cap": mat("core_cap", "9F9A92", .9),
        "sign": mat("sign_light", "F6EEDF", .4, emit="FFE9C8", strength=3.0),
        "ring_light": mat("ring_light", "FFF6EA", .4, emit="FFF1DC", strength=9.0),
        "lamp_glow": mat("reading_lamp", "FFE2B0", .4, emit="FFD08A", strength=6.0),
        "planter": mat("planter_white", "E9E4DA", .6), "soil": mat("soil", "5A4532", .95), "deck": mat("terrace_deck", "A98563", .65),
        "gutter": mat("gutter", "9C9284", .4, .7),
        "paving": mat("paving", "C9C2B8", .8), "paving_joint": mat("paving_joint", "A59D92", .9),
        "path_light": mat("path_light", "FFE0B0", .4, emit="FFCF8A", strength=7.0),
        "rail": mat("sea_rail", "CFC6B6", .35, .8),
        "wood": mat("trunk", "6E5238", .8),
    })
    for role, (rgba, emit, strength) in M.ROLES.items():                         # library planting and props
        leafy = role in ("leaf_l", "green", "white", "pod_p")
        m = G.material("q09a_in_" + role, rgba, .6, emit, strength)
        m.use_backface_culling = not leafy and rgba[3] >= 1
        K.MATS["in_" + role] = m
    lav = mat("in_lavender", "A88AD6", .6, culling=False)                     # this site's blossoms ride the pod_p role
    K.MATS["in_pod_p"] = lav
    if MASSING:
        grey = mat("massing_grey", "CFCDC8", .8)
        for k, m in list(K.MATS.items()):
            if next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Alpha"].default_value >= 1:
                K.MATS[k] = grey
    return K.MATS


# --- preview staging (never exported) -----------------------------------------------------------------------------------------------
def preview(col, rng):
    mk = lambda n, h, r=.8, **k: K.MATS.setdefault("pv_" + n, mat("pv_" + n, h, r, **k))  # noqa: E731
    mk("water", "3D5D86", .05)
    mk("ground", "BEB7AD", .9)
    mk("far", "7E86A8", .9, emit="FFB98A", strength=.05)
    mk("farw", "DCDDE6", .6)
    mk("lit", "FFD9A0", .5, emit="FFC37A", strength=3.0)
    a = Accs()
    box(a["pv_ground"], -400, 400, -14.0, 300, -.6, -.01)
    box(a["pv_water"], -6000, 6000, -9000, -14.0, -2.6, -1.4)
    for i in range(180):                                                          # far shore toward the sea (-y)
        x, y = rng.uniform(-3000, 3000), -rng.uniform(1500, 2000)
        h = rng.uniform(15, 70) * (2.4 if rng.random() < .1 else 1)
        w = rng.uniform(20, 50)
        box(a["pv_far"], x, x + w, y, y - w, -2, h)
        if rng.random() < .5:
            box(a["pv_lit"], x + 2, x + w - 2, y + .2, y - .3, h * .3, h * .3 + 2)
    box(a["pv_far"], -6000, 6000, -1450, -2300, -2.2, 4)
    bx, by = Vector((600.0, -1000.0)), Vector((1700.0, -1300.0))              # suspension bridge, right
    ang = math.atan2(by.y - bx.y, by.x - bx.x)

    def along(t, z, s=0):
        c = bx.lerp(by, t)
        return (c.x - s * 9 * math.sin(ang), c.y + s * 9 * math.cos(ang), z)
    K.obox(a["pv_farw"], along(.5, 30), ((by - bx).length * 1.4, 16, 3), ang)
    for t in (.22, .78):
        for s in (-1, 1):
            K.obox(a["pv_farw"], along(t, 60, s), (6, 5, 120), ang)
    for s in (-1, 1):
        pipe(a["pv_farw"], [along(.22 + .56 * i / 24, 34 + 80 * (2 * i / 24 - 1) ** 2, s) for i in range(25)], 1.0, n=5)
    c = Vector((1250.0, -900.0, 75.0))                                          # a Ferris wheel by the bridge
    pts = [(c.x + 70 * math.cos(2 * math.pi * i / 48), c.y, c.z + 70 * math.sin(2 * math.pi * i / 48)) for i in range(49)]
    pipe(a["pv_lit"], pts, 1.2, n=5)
    for i in range(16):
        t = 2 * math.pi * i / 16
        pipe(a["pv_farw"], [tuple(c), (c.x + 70 * math.cos(t), c.y, c.z + 70 * math.sin(t))], .5, n=4)
    ob = bpy.data.objects.new("PV_Context", K.build_mesh("pv_context", a))
    col.objects.link(ob)
    if MASSING:
        return
    p = Accs()                                                                   # display figures: own layer, not exported
    for x, y, face in ((-7.8, 5.4, (0, -1)), (-11.3, 5.2, (-1, 0)), (6.0, 4.2, (0, -1)), (-14.0, -4.5, (1, 0)), (11.0, -5.5, (-1, .3))):
        M.person(K.ctx(p, rng, x, y, .07 if y > 0 else 0, kit_yaw(*face)), 0, 0, 0, yaw=0)
    zt = L.TIERS[0][5] + .04
    for x in (-8.0, 1.5):
        M.seated_person(K.ctx(p, rng, x + .55, 2.5, zt, 0), 0, .45, 0, kit_yaw(0, -1))
    M.seated_person(K.ctx(p, rng, -6.0, 6.6, L.TIERS[1][0] + .04, 0), 0, .42, 0, kit_yaw(0, -1))
    ob = bpy.data.objects.new("PV_People", K.build_mesh("pv_people", p))
    col.objects.link(ob)


# --- GLB post-process ----------------------------------------------------------------------------------------------------------------
FILM_NM = {"q09a_wing_film_rose": (380.0, 520.0), "q09a_wing_film_lilac": (460.0, 620.0), "q09a_wing_film_aqua": (540.0, 720.0)}


def add_iridescence(path):
    """Add KHR_materials_iridescence to the wing film materials in the exported GLB.

    ponytail: Blender 5.2's glTF exporter writes the Principled thin film of the wing materials as nothing (only the
    clear coat survives), so the builder patches the JSON chunk itself; drop this once the exporter writes it."""
    import struct
    with open(path, "rb") as f:
        data = f.read()
    magic, ver, _ = struct.unpack_from("<III", data, 0)
    jlen, jtype = struct.unpack_from("<II", data, 12)
    doc = json.loads(data[20:20 + jlen])
    rest = data[20 + jlen:]
    done = []
    for m in doc.get("materials", []):
        if m.get("name") in FILM_NM:
            lo, hi = FILM_NM[m["name"]]
            m.setdefault("extensions", {})["KHR_materials_iridescence"] = {
                "iridescenceFactor": 1.0, "iridescenceIor": 1.42, "iridescenceThicknessMinimum": lo, "iridescenceThicknessMaximum": hi}
            done.append(m["name"])
    if done:
        used = doc.setdefault("extensionsUsed", [])
        if "KHR_materials_iridescence" not in used:
            used.append("KHR_materials_iridescence")
    js = json.dumps(doc, separators=(",", ":")).encode("utf-8")
    js += b" " * (-len(js) % 4)
    out = struct.pack("<III", magic, ver, 12 + 8 + len(js) + len(rest)) + struct.pack("<II", len(js), jtype) + js + rest
    with open(path, "wb") as f:
        f.write(out)
    return done


# --- assembly ------------------------------------------------------------------------------------------------------------------------
def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    rng = random.Random(2127)
    col = bpy.data.collections.new("Q09A_Asset")
    prev = bpy.data.collections.new("Q09A_Preview")
    scene.collection.children.link(col)
    scene.collection.children.link(prev)
    root = bpy.data.objects.new("Q09A_WingWellness", None)
    col.objects.link(root)
    nodes = {}
    for g in ("TIERS", "GROUND", "UPPER", "WINGS", "SITE"):
        e = bpy.data.objects.new(g, None)
        col.objects.link(e)
        e.parent = root
        nodes[g] = e

    def add(name, accs, g, smooth_deg=30):
        if not any(acc.f for acc in accs.values()):
            return None
        ob = bpy.data.objects.new(name, K.build_mesh("q09a_" + name.lower(), accs, smooth_deg))
        col.objects.link(ob)
        ob.parent = nodes[g]
        return ob

    for k in range(3):
        add("TIER_%d" % (k + 1), tier_shell(rng, k), "TIERS", 40)
    add("GYM_EQUIPMENT", gym(rng), "GROUND")
    add("YOGA_ROOM", yoga(rng), "GROUND")
    add("ROOMS_CORE", rooms(rng), "GROUND")
    add("READING", reading(rng), "UPPER")
    add("GARDENS", gardens(rng), "UPPER")
    add("RIDGE", ridge(), "WINGS")
    wings = []
    for k, w in enumerate(L.WINGS):
        acc, info = wing(k, w)
        add("WING_%d" % (k + 1), acc, "WINGS", 50)
        wings.append(info)
    add("SITE_PAVING", site(rng), "SITE")
    preview(prev, rng)
    bpy.context.view_layer.update()

    asset = [o for o in col.all_objects]
    meshes = [o for o in asset if o.type == "MESH"]
    lo = [min(v[i] for o in meshes for v in o.bound_box) for i in range(3)]
    hi = [max(v[i] for o in meshes for v in o.bound_box) for i in range(3)]
    bld = [o for o in meshes if o.name != "SITE_PAVING"]
    blo = [min(v[i] for o in bld for v in o.bound_box) for i in range(3)]
    bhi = [max(v[i] for o in bld for v in o.bound_box) for i in range(3)]
    report = {"massing": MASSING, "tris": sum(K.tris(o.data) for o in meshes), "objects": len(asset),
              "tris_by_object": {o.name: K.tris(o.data) for o in meshes},
              "materials": len({m.name for o in meshes for m in o.data.materials}),
              "bbox_min": [round(v, 2) for v in lo], "bbox_max": [round(v, 2) for v in hi],
              "building_bbox": [[round(v, 2) for v in blo], [round(v, 2) for v in bhi]],
              "wings": wings, "wing_tip_max_z": max(w["tip"][2] for w in wings),
              "tiers": [{"floor": t[0], "plan_y": [t[1], t[2]], "size_m": [L.X1 - L.X0, t[2] - t[1]], "roof_top": t[5]} for t in L.TIERS],
              "rooms": {"gym_m": [L.GYM[1] - L.GYM[0], L.ROOM_BACK - L.front_glass_y()], "band_m": L.BAND[1] - L.BAND[0],
                        "yoga_m": [L.YOGA[1] - L.YOGA[0], L.ROOM_BACK - L.front_glass_y()], "door_clear_m": L.DOOR_W}}
    if "--no-export" not in ARGS and not MASSING:
        glb = os.path.join(HERE, ASSET + ".glb")
        for ob in bpy.data.objects:
            ob.select_set(False)
        for ob in asset:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = root
        bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                                  export_animations=False, export_cameras=False, export_lights=False, export_extras=True,
                                  export_materials="EXPORT")
        report["iridescence_patched"] = add_iridescence(glb)
        report["glb_bytes"] = os.path.getsize(glb)
    import review_wing_wellness as RV
    RV.stage(scene, prev)
    blend = os.path.join(HERE, ASSET + ("-massing" if MASSING else "") + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    with open(os.path.join(HERE, "report%s.json" % ("-massing" if MASSING else "")), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps({k: v for k, v in report.items() if k != "tris_by_object"}))


if __name__ == "__main__":
    main()
