"""Q11-A rotating-shell shelter (design document Q11-A; reference: Q11 sheet p.7, left image A, `.dream-loop/q11a/target.jpg`).

Run:  blender -b --factory-startup --python-exit-code 1 -P build_rotating_shell.py [-- --massing] [--state 0|90|180] [--no-export]
Writes q11a-rotating-shell-shelter.blend (asset + preview staging, set to --state, default 90), the city GLB
q11a-rotating-shell-shelter.glb (asset only, standby state 90) and report.json beside this file. --massing builds the
round-1 white mechanism model only (fixed building massing, shell, bogies, track, roof frame and panels) into
q11a-rotating-shell-shelter-massing.blend. No human figures: doors, seat steps, rails and planting give the scale.

Blender coordinates, real metres; every layout number and the three states live in shelter.py (shared with the review
and check scripts). Origin = plaza centre at z 0, sea on +y, city on -y. A fixed terraced building (radius 37 m, floors
at 6 / 14 / 22 / 30 / 38 m, roof plant to 43 m, two cores) stands inside a 240 deg white metal shell (radius 45 / 40.5 m,
50 m high, 120 deg opening) that rides on 12 equalised bogies (48 load wheels) over two ring rails (radius 41 and 44 m)
on a ring beam. The shell carries a top frame: two straight main trusses with six sliding roof panels stowed in a stepped
bay at its back. Two fixed passages from the city side run under the track (transfer girders over them) into the
building's waterproof basement; a glass-roofed battery room with a separate dry observation well lies in the plaza.

Nodes: Q11A_RotatingShellShelter > FIXED (BUILDING, FOUNDATION, TRACK, PASSAGES, BATTERY, PLAZA) and MOVING (pivot on
the vertical axis; rotation z = -state) > SHELL, BOGIES (BOGIE_01..12, one shared mesh), ROOF_FRAME, ROOF_PANEL_0..5
(each on its own local y offset). shelter.apply_state-equivalent code lives in set_state() here and in the review script.
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
QA = _load("q10a_build", os.path.join(MODELS, "q10a-solar-furnace", "build_solar_furnace.py"))   # tbox, frames helpers
import shelter as L  # noqa: E402

G, M = K.G, K.M
Accs, loft, obox, lathe, ring, pipe, srgb = K.Accs, K.loft, K.obox, K.lathe, K.ring, K.pipe, K.srgb

ASSET = "q11a-rotating-shell-shelter"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MASSING = "--massing" in ARGS
STATE = int(ARGS[ARGS.index("--state") + 1]) if "--state" in ARGS else L.DEFAULT_STATE


def rad(d):
    return math.radians(d)


def pol(r, deg, z=0.0):
    return Vector(L.pol(r, deg, z))


def tbox(acc, T, c, size):
    QA.tbox(acc, T, c, size)


def frame_at(bearing, r=0.0, z=0.0):
    """Frame at plan radius r on a bearing: x radial outward, y tangential (counter-clockwise), z up."""
    return Matrix.Translation(pol(r, bearing, z)) @ Matrix.Rotation(rad(bearing), 4, "Z")


def bearings(a0, a1, step):
    n = max(1, int(math.ceil(abs(a1 - a0) / step)))
    return [a0 + (a1 - a0) * i / n for i in range(n + 1)]


def arc_wall(acc, rfun, a0, a1, z0, z1, step=2.0, inward=False):
    """Open vertical surface along bearings a0..a1 at radius rfun(bearing), facing out (or in)."""
    bs = bearings(a0, a1, step)
    vs, fs = [], []
    for b in bs:
        r = rfun(b) if callable(rfun) else rfun
        vs += [tuple(pol(r, b, z0)), tuple(pol(r, b, z1))]
    for i in range(len(bs) - 1):
        fs.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    s = -1 if inward else 1
    acc.facing(vs, fs, lambda c: (s * c[0], s * c[1], 0))


def plan_solid(acc, pts, z0, z1):
    """Prism from a plan polygon."""
    loft(acc, [[(x, y, z0) for x, y in pts], [(x, y, z1) for x, y in pts]])


# --- FIXED: building -----------------------------------------------------------------------------------------------------------
WEDGE = (12.0, 78.0)                 # ground-floor amphitheatre steps (bearings) under the cut-back level-6 slab
WEDGE_R = 27.0


def slab_outline(level, n=180):
    out = []
    for i in range(n):
        b = 360.0 * i / n
        if level == 0 and WEDGE[0] - .5 <= b <= WEDGE[1] + .5:
            if WEDGE[0] < b < WEDGE[1]:
                out.append((b, WEDGE_R))
            continue
        out.append((b, L.slab_r(level, b)))
    if level == 0:                                                              # crisp wedge edges
        out += [(WEDGE[0] - .01, L.slab_r(0, WEDGE[0])), (WEDGE[0] + .01, WEDGE_R),
                (WEDGE[1] - .01, WEDGE_R), (WEDGE[1] + .01, L.slab_r(0, WEDGE[1]))]
        out.sort()
    return [(r * math.cos(rad(b)), r * math.sin(rad(b))) for b, r in out]


def facade_r(level, b):
    """Glass line of the storey above floor `level` (-1 = ground floor): under the next slab's edge."""
    if level == -1:
        return WEDGE_R - 1.0 if WEDGE[0] <= b <= WEDGE[1] else L.R_BLD - 2.2
    nxt = min(level + 1, len(L.LEVELS) - 1)
    return L.slab_r(nxt, b) - (1.4 if level < len(L.LEVELS) - 1 else 2.8)


def building(rng):
    a = Accs()
    # basement: the fixed waterproof box (shelter hall), ground slab over it
    plan_solid(a["concrete"], [(36.6 * math.cos(rad(b)), 36.6 * math.sin(rad(b))) for b in range(0, 360, 3)], L.BASEMENT - .5, L.BASEMENT)
    gaps = [(p - 5.0, p + 5.0) for p in L.PASSAGES]
    for a0, a1 in _arcs_between(gaps):
        K.sector(a["concrete"], 36.6, 37.0, a0, a1, L.BASEMENT - .5, -.5, 3.0)
    plan_solid(a["slab"], [(37.0 * math.cos(rad(b)), 37.0 * math.sin(rad(b))) for b in range(0, 360, 3)], -.5, 0.0)
    for i in range(8):                                                          # basement hall columns
        p = pol(24, i * 45 + 22.5)
        lathe(a["concrete"], [(.45, L.BASEMENT), (.45, -.5)], 12, p.x, p.y)
    # cores
    for cx, cy in L.CORES:
        K.box(a["concrete"], cx - L.CORE / 2, cx + L.CORE / 2, cy - L.CORE / 2, cy + L.CORE / 2, L.BASEMENT, L.ROOF_Z - .2)
    # floors, edges, facades, columns
    zs = list(L.LEVELS) + [L.ROOF_Z - .8]
    for i, z in enumerate(L.LEVELS):
        plan_solid(a["slab"], slab_outline(i), z - .5, z)
        arc_wall(a["edge"], lambda b, i=i: L.slab_r(i, b) if not (i == 0 and WEDGE[0] < b < WEDGE[1]) else WEDGE_R, 0, 360, z - .55, z + .3, 2.0)
    for lv in range(-1, len(L.LEVELS)):
        z0 = 0.0 if lv == -1 else L.LEVELS[lv]
        z1 = (L.LEVELS[lv + 1] - .5) if lv + 1 < len(L.LEVELS) else L.ROOF_Z - 1.2
        arc_wall(a["glass"], lambda b, lv=lv: facade_r(lv, b), 0, 360, z0, z1, 2.0)
        for b in range(0, 360, 12):
            if lv == -1 and WEDGE[0] - 2 < b < WEDGE[1] + 2:
                continue
            p = pol(facade_r(lv, b) - 1.1, b)
            lathe(a["column"], [(.35, z0), (.35, z1)], 10, p.x, p.y)
        if not MASSING:
            for b in range(0, 360, 6):                                         # mullions
                p0, p1 = pol(facade_r(lv, b) + .02, b, z0), pol(facade_r(lv, b) + .02, b, z1)
                pipe(a["mullion"], [p0, p1], .05, n=4)
            for zz in (z0 + 1.1, (z0 + z1) / 2 + .8):
                arc_wall(a["mullion"], lambda b, lv=lv: facade_r(lv, b) + .03, 0, 360, zz - .04, zz + .04, 3.0)
            interior(a, lv, z0, z1, rng)
    # roof slab and plant (highest fixed point 43 m)
    roof_r = lambda b: facade_r(len(L.LEVELS) - 1, b) + 1.0  # noqa: E731
    plan_solid(a["slab"], [(roof_r(b) * math.cos(rad(b)), roof_r(b) * math.sin(rad(b))) for b in range(0, 360, 3)], L.ROOF_Z - 1.2, L.ROOF_Z - .8)
    for (x, y, w, d, h) in ((-6, 4, 6, 4, .8), (5, 6, 5, 5, .8), (0, -2, 8, 3, .8), (-12, -3, 3, 6, .8)):
        K.box(a["plant"], x - w / 2, x + w / 2, y - d / 2, y + d / 2, L.ROOF_Z - .8, L.ROOF_Z - .8 + h)
    # amphitheatre: green seat steps from the plaza up to the level-6 terrace, aisle stairs
    n = 12
    for k in range(n):
        r0 = L.R_BLD - .2 - (L.R_BLD - .2 - WEDGE_R) * k / n
        r1 = L.R_BLD - .2 - (L.R_BLD - .2 - WEDGE_R) * (k + 1) / n
        z1 = L.LEVELS[0] * (k + 1) / n
        K.sector(a["step"], r1, r0, WEDGE[0], WEDGE[1], -.1, z1, 1.5)
        if not MASSING and k % 3 == 1:
            K.sector(a["planter_soil"], r1 + .05, r0 - .05, WEDGE[0] + 4, WEDGE[1] - 4, z1, z1 + .06, 1.5)
    for b in (30.0, 60.0):                                                      # aisle stairs (finer risers)
        for k in range(2 * n):
            r0 = L.R_BLD - .2 - (L.R_BLD - .2 - WEDGE_R) * k / (2 * n)
            r1 = L.R_BLD - .2 - (L.R_BLD - .2 - WEDGE_R) * (k + 1) / (2 * n)
            K.sector(a["stair"], r1, r0, b - 1.6, b + 1.6, -.1, L.LEVELS[0] * (k + 1) / (2 * n) + .02, .8)
    # entrances: city-side main door with canopy, accessible ramp
    T = frame_at(-90.0)
    rr = facade_r(-1, -90)
    for s in (-1, 1):
        tbox(a["door_frame"], T, (rr + .15, s * 2.6, 1.6), (.3, .3, 3.2))
    tbox(a["door_frame"], T, (rr + .15, 0, 3.3), (.3, 5.5, .3))
    tbox(a["door"], T, (rr + .1, -.65, 1.5), (.08, 1.25, 3.0))
    tbox(a["door"], T, (rr + .1, .65, 1.5), (.08, 1.25, 3.0))
    tbox(a["canopy"], T, ((rr + L.R_BLD - .2) / 2, 0, 3.7), (L.R_BLD - .2 - rr, 8.0, .25))   # stays inside R_BLD
    return a


def _arcs_between(gaps):
    """Bearing ranges 0..360 avoiding the given (a0, a1) gaps (negative bearings allowed)."""
    gs = sorted(((g0 % 360, g1 % 360) for g0, g1 in gaps))
    out, cur = [], 0.0
    for g0, g1 in gs:
        out.append((cur, g0))
        cur = g1
    out.append((cur, 360.0))
    return [(x, y) for x, y in out if y - x > .2]


def interior(a, lv, z0, z1, rng):
    """Behind the glass: a corridor ring wall with doors toward the cores, shelter benches, lit back wall."""
    for b in range(0, 360, 9):
        r = facade_r(lv, b) - 8.0
        if lv == -1 and WEDGE[0] - 4 < b < WEDGE[1] + 4:
            r = WEDGE_R - 8.0
        T = frame_at(b, r, z0)
        if (b // 9) % 4 in (0, 1):                                              # room fronts, open hall between
            tbox(a["room_wall"], T, (0, 0, (z1 - z0) / 2), (.2, r * rad(9) - .1, z1 - z0))
        if (b // 9) % 3 == 0:
            tbox(a["door_frame"], T, (.12, 0, 1.25), (.06, 1.3, 2.5))
            tbox(a["door"], T, (.14, 0, 1.2), (.03, 1.1, 2.4))
        if (b // 9) % 2 == 1:
            tbox(a["bench"], T, (1.6, 0, .23), (.5, 2.2, .45))


def terraces(rng):
    """Planters with shrubs and small trees on each terrace's edge (kept inside R_BLD and under the roof clearance)."""
    a = Accs()
    for i, z in enumerate(L.LEVELS):
        for b0 in range(0, 360, 3):
            b1 = b0 + 3
            r0 = L.slab_r(i, b0 + 1.5)
            if i == 0 and WEDGE[0] - 3 < b0 + 1.5 < WEDGE[1] + 3:
                continue
            terrace = r0 - facade_r(i, b0 + 1.5)
            if terrace < 2.6:
                K.sector(a["rail_glass"], r0 - .25, r0 - .15, b0, b1, z, z + 1.1, 3.0)   # glass guard on the city side
                continue
            K.sector(a["planter"], r0 - 1.3, r0 - .25, b0, b1, z, z + .75, 3.0)
            K.sector(a["planter_soil"], r0 - 1.2, r0 - .35, b0 + .1, b1 - .1, z + .7, z + .78, 3.0)
            p = pol(r0 - 1.0, b0 + 1.5, z + .78)
            sz = rng.uniform(.45, .7)
            M.leaf_clump(K.ctx(a, rng, p.x, p.y, p.z), (0, sz * .4, 0), (sz, sz * .7, sz),
                         ("leaf_l", "green") if rng.random() < .75 else ("green", "white"), "green", 18, .26, .4, 2)
            if b0 % 9 == 0 and terrace > 3.4:                                   # a small tree on the walk side of the planter
                q = pol(r0 - 2.9, b0 + 1.5, z)
                h = 3.4 if i == len(L.LEVELS) - 1 else rng.uniform(3.6, 4.6)   # top terrace: crowns stay under 43 m
                M.leafy_tree(K.ctx(a, rng, q.x, q.y, q.z), (0, 0, 0), h=h, crown=1.25, trunk="wood", roles=("leaf_l", "green"),
                             core="green", n=34, size=.32, branches=3)
    for k in range(10):                                                         # trees on the amphitheatre landing steps
        b = rng.uniform(WEDGE[0] + 6, WEDGE[1] - 6)
        if abs(b - 30) < 4 or abs(b - 60) < 4:
            continue
        r = rng.uniform(WEDGE_R + 2.0, L.R_BLD - 3.0)
        z = L.LEVELS[0] * (L.R_BLD - .2 - r) / (L.R_BLD - .2 - WEDGE_R)
        q = pol(r, b, z)
        M.leafy_tree(K.ctx(a, rng, q.x, q.y, q.z), (0, 0, 0), h=rng.uniform(4.5, 6.0), crown=1.6, trunk="wood",
                     roles=("leaf_l", "green"), core="green", n=40, size=.34, branches=4)
    return a


# --- FIXED: foundation, track, passages, battery room, plaza --------------------------------------------------------------------
def passage_gaps(r, half):
    return [(p - math.degrees(half / r), p + math.degrees(half / r)) for p in L.PASSAGES]


def foundation():
    a = Accs()
    rm = (L.RING_IN + L.RING_OUT) / 2
    for a0, a1 in _arcs_between(passage_gaps(rm, 4.2)):
        K.sector(a["concrete"], L.RING_IN, L.RING_OUT, a0, a1, -2.6, L.RING_TOP, 1.0)
    for p in L.PASSAGES:                                                        # transfer girder and two abutments per passage
        T = frame_at(p)
        tbox(a["concrete"], T, (rm, 0, (L.TRANSFER[0] + L.TRANSFER[1]) / 2), (L.RING_OUT - L.RING_IN, 9.2, L.TRANSFER[0] - L.TRANSFER[1]))
        for s in (-1, 1):
            tbox(a["concrete_dark"], T, (rm, s * 4.8, -3.8), (L.RING_OUT - L.RING_IN + .6, 1.2, 4.4))
            tbox(a["bearing_pad"], T, (rm, s * 4.4, L.TRANSFER[1] - .05), (L.RING_OUT - L.RING_IN - 1, .4, .1))
    for b in range(0, 360, 6):                                                  # piles under the ring beam (section views)
        if min(abs(math.remainder(b - p, 360)) for p in L.PASSAGES) < 8:
            continue
        p = pol(rm, b)
        lathe(a["concrete_dark"], [(.6, -16.0), (.6, -2.6)], 12, p.x, p.y)
    ring(a["paving"], L.R_BLD - .1, L.RING_IN, -.3, 0.0, 180)                  # inner apron (laps under the building's edge)
    return a


def track():
    a = Accs()
    for rr in L.RAILS:
        z = L.RING_TOP
        lathe(a["grout"], [(rr - .42, z), (rr + .42, z), (rr + .42, z + L.GROUT), (rr - .42, z + L.GROUT)], 360, wrap=True)
        z += L.GROUT
        lathe(a["steel_dark"], [(rr - .3, z), (rr + .3, z), (rr + .3, z + L.PLATE), (rr - .3, z + L.PLATE)], 360, wrap=True)
        z += L.PLATE
        h, w = L.RAIL_H, L.RAIL_HEAD_W
        prof = [(rr - .09, z), (rr + .09, z), (rr + .09, z + .025), (rr + .018, z + .04), (rr + .018, z + h - .05),
                (rr + w / 2, z + h - .045), (rr + w / 2, z + h), (rr - w / 2, z + h), (rr - w / 2, z + h - .045),
                (rr - .018, z + h - .05), (rr - .018, z + .04), (rr - .09, z + .025)]
        lathe(a["rail"], prof, 360, wrap=True)
        for b in range(0, 360, 2):                                              # rail clips on the sole plate
            for s in (-1, 1):
                T = frame_at(b, rr + s * .17, L.RING_TOP + L.GROUT + L.PLATE)
                tbox(a["steel_dark"], T, (0, 0, .02), (.09, .16, .04))
    rm = (L.RAILS[0] + L.RAILS[1]) / 2                                          # drainage channel between the rails, grating
    lathe(a["groove"], [(rm - .35, L.RING_TOP + .001), (rm + .35, L.RING_TOP + .001), (rm + .35, L.RING_TOP + .004),
                        (rm - .35, L.RING_TOP + .004)], 360, wrap=True)
    for st in (0, 180):                                                         # parking lock seats under each bogie (0 and 180)
        for b in L.bogie_bearings():
            w = b - st
            T = frame_at(w, rm, L.RING_TOP)
            tbox(a["lock"], T, (0, 0, .18), (.9, .7, .36))
            tbox(a["steel_dark"], T, (0, 0, .37), (.4, .4, .04))
    # guard fences: plaza side and apron side, gates at two maintenance doors
    for rr, gate in ((L.GUARD_R, (-30.0, 150.0)), (38.6, (120.0,))):
        for b in bearings(0, 360, 1.5):
            if any(abs(math.remainder(b - g, 360)) < 1.6 for g in gate):
                continue
            p = pol(rr, b)
            lathe(a["fence"], [(.04, 0), (.04, 1.15)], 6, p.x, p.y)
        for zz in (1.1, .55):
            lathe(a["fence"], [(rr - .03, zz - .03), (rr + .03, zz - .03), (rr + .03, zz + .03), (rr - .03, zz + .03)], 360, wrap=True)
    return a


def passages():
    a = Accs()
    for p in L.PASSAGES:
        T = frame_at(p)
        x0, x1 = 36.6, L.RAMP_R[0]
        w, h, f = L.PASS_W, L.PASS_H, L.PASS_FLOOR
        tbox(a["concrete"], T, ((x0 + x1) / 2, 0, f - .25), (x1 - x0, w + .8, .5))                # tunnel floor slab
        tbox(a["paving_in"], T, ((x0 + x1) / 2, 0, f + .01), (x1 - x0, w, .02))
        for s in (-1, 1):
            tbox(a["concrete"], T, ((x0 + x1) / 2, s * (w / 2 + .2), f + h / 2), (x1 - x0, .4, h))  # walls
            tbox(a["glowline"], T, ((x0 + x1) / 2, s * (w / 2 - .05), f + h - .15), (x1 - x0, .06, .06))
        tbox(a["concrete"], T, ((x0 + x1) / 2, 0, f + h + .2), (x1 - x0, w + .8, .4))            # tunnel roof
        tbox(a["ceiling"], T, ((x0 + x1) / 2, 0, f + h - .01), (x1 - x0, w - .1, .02))
        tbox(a["membrane"], T, ((x0 + x1) / 2, 0, f + h + .42), (x1 - x0, w + 1.0, .04))         # waterproofing over the roof
        # door into the basement shelter hall and a flood gate at the portal
        for xx, role in ((37.0, "door_frame"), (x1, "gate_frame")):
            for s in (-1, 1):
                tbox(a[role], T, (xx, s * (w / 2 - .15), f + h / 2), (.5, .3, h))
            tbox(a[role], T, (xx, 0, f + h - .15), (.5, w, .3))
        tbox(a["door"], T, (36.9, 0, f + 1.3), (.06, 2.4, 2.6))
        tbox(a["gate"], T, (x1 + .2, w / 2 + .8, f + h / 2), (.25, 1.4, h))   # gate leaf parked open against the wall
        # open ramp 1:12 from the portal up to the plaza, retaining walls with parapets, glass canopy on posts
        n = 24
        secs_f, xs = [], [x1 + (L.RAMP_R[1] - x1) * i / n for i in range(n + 1)]
        zf = lambda x: f + (0.0 - f) * (x - x1) / (L.RAMP_R[1] - x1)  # noqa: E731
        loft(a["paving_in"], [[tuple(T @ Vector((x, yy, zf(x) + dz))) for yy, dz in ((-w / 2, -.5), (w / 2, -.5), (w / 2, 0), (-w / 2, 0))] for x in xs])
        tbox(a["paving_in"], T, (xs[-1] + .75, 0, -.25), (1.5, w + 2.4, .5))   # level landing into the plaza
        for s in (-1, 1):                                                       # coping strips over the paving cut
            loft(a["curb"], [[tuple(T @ Vector((x, s * (w / 2 + yy), z))) for yy, z in ((.4, -.3), (1.3, -.3), (1.3, .02), (.4, .02))] for x in (x1 - .4, xs[-1] + 1.5)])
        for s in (-1, 1):
            loft(a["concrete"], [[tuple(T @ Vector((x, s * (w / 2 + yy), z))) for yy, z in ((0, zf(x) - .5), (.4, zf(x) - .5), (.4, 1.0), (0, 1.0))] for x in xs])
            pipe(a["fence"], [T @ Vector((x, s * (w / 2 + .2), 2.0)) for x in (xs[0], xs[-1])], .035, n=6)
            for x in xs[::2]:
                pipe(a["fence"], [T @ Vector((x, s * (w / 2 + .2), 1.0)), T @ Vector((x, s * (w / 2 + .2), 2.0))], .03, n=4)
            for x in xs[::3]:                                                   # canopy posts
                pipe(a["canopy_frame"], [T @ Vector((x, s * (w / 2 + .2), 1.0)), T @ Vector((x, s * (w / 2 + .2), 3.4))], .09, n=8)
        canopy = [[tuple(T @ Vector((x, yy, 3.45 + dz))) for yy, dz in ((-w / 2 - .7, 0), (w / 2 + .7, 0), (w / 2 + .7, .12), (-w / 2 - .7, .12))] for x in (x1 - 2.0, xs[-1])]
        loft(a["canopy_glass"], canopy)
        for x in xs[::3]:
            tbox(a["canopy_frame"], T, (x, 0, 3.4), (.15, w + 1.6, .14))
        for s in (-1, 1):
            tbox(a["canopy_frame"], T, ((x1 - 2 + xs[-1]) / 2, s * (w / 2 + .7), 3.4), (xs[-1] - x1 + 2, .14, .14))
        for x in xs[1:-1:2]:                                                    # landing lights in the ramp walls
            tbox(a["glowline"], T, (x, w / 2 - .02, zf(x) + .5), (.3, .04, .08))
    return a


def battery():
    """Glass-roofed battery room in a fixed waterproof box; a separate dry observation well beside it, with a window."""
    a = Accs()
    b, rc, ln, wd = L.BATTERY
    T = frame_at(b, rc)
    f = L.BATTERY_FLOOR
    tbox(a["concrete"], T, (0, 0, f - .3), (wd + .8, ln + .8, .6))
    for s in (-1, 1):
        tbox(a["concrete"], T, (s * (wd / 2 + .2), 0, f / 2), (.4, ln + .8, -f))
        tbox(a["concrete"], T, (0, s * (ln / 2 + .2), f / 2), (wd + .8, .4, -f))
    tbox(a["battery_wall"], T, (0, 0, f + .01), (wd, ln, .02))
    for i in range(6):                                                          # modules with indicator rings
        for j in range(3):
            x, y = -wd / 2 + 3.5 + j * 6.5, -ln / 2 + 3.0 + i * 5.6
            lathe(a["module"], [(1.05, f), (1.05, f + 3.4), (.7, f + 3.6), (0.0, f + 3.6)], 20, *(T @ Vector((x, y, 0))).xy)
            for zz in (f + 1.2, f + 2.6):
                c = T @ Vector((x, y, 0))
                ring(a["battery_glow"], 1.05, 1.09, zz, zz + .14, 20, c.x, c.y)
    for k in range(int(ln / 3.4) + 1):                                          # structural glass frames, upturned edge
        y = -ln / 2 + k * ln / int(ln / 3.4)
        tbox(a["glass_frame"], T, (0, y, -.18), (wd + .4, .14, .36))
    for k in range(7):
        x = -wd / 2 + k * wd / 6
        tbox(a["glass_frame"], T, (x, 0, -.18), (.14, ln + .4, .36))
    tbox(a["floor_glass"], T, (0, 0, -.04), (wd, ln, .06))
    for s in (-1, 1):                                                           # upturned curb, covering the paving cut
        tbox(a["curb"], T, (s * (wd / 2 + .7), 0, .02), (1.4, ln + 2.8, .16))
        tbox(a["curb"], T, (0, s * (ln / 2 + .7), .02), (wd + 2.8, 1.4, .16))
    # observation well on the city side of the room: own box, stair down, window into the room through the shared wall
    W = T @ Matrix.Translation((-wd / 2 - 4.4, 0, 0))
    tbox(a["concrete"], W, (0, 0, f + 2.6 - .3), (8.0, 8.0, .6))
    for s in (-1, 1):
        tbox(a["concrete"], W, (s * 3.8, 0, (f + 2.6) / 2), (.4, 8.0, -(f + 2.6)))
        tbox(a["concrete"], W, (0, s * 3.8, (f + 2.6) / 2), (8.0, .4, -(f + 2.6)))
    tbox(a["window"], W, (3.85, 0, f + 4.2), (.1, 4.0, 1.8))
    for k in range(12):
        tbox(a["stair"], W, (-2.6 + k * .42, -2.6, -.29 - k * .285), (.42, 1.6, .2))
    tbox(a["floor_glass"], W, (0, 1.2, -.04), (6.8, 4.6, .06))
    tbox(a["glass_frame"], W, (0, 1.2, -.18), (7.2, .14, .36))
    for s in (-1, 1):
        tbox(a["curb"], W, (s * 4.4, 0, .02), (1.2, 10.0, .16))
        tbox(a["curb"], W, (0, s * 4.4, .02), (10.0, 1.2, .16))
    return a


def plaza(rng):
    """Paving from the ring out to 135 m, with holes for the two ramps, the battery room and the well; light arcs."""
    a = Accs()
    b0, rc0, ln, wd = L.BATTERY

    def hole(x, y):
        r, b = math.hypot(x, y), math.degrees(math.atan2(y, x))
        for p in L.PASSAGES:
            u = r * math.cos(rad(b - p))
            v = r * math.sin(rad(b - p))
            if L.RAMP_R[0] - .2 < u < L.RAMP_R[1] + .2 and abs(v) < L.PASS_W / 2 + .45:
                return True
        u, v = r * math.cos(rad(b - b0)) - rc0, r * math.sin(rad(b - b0))
        if abs(u) < wd / 2 + .4 and abs(v) < ln / 2 + .4:
            return True
        if abs(u + wd / 2 + 4.4) < 4.0 and abs(v) < 4.0:
            return True
        return False
    r0, r1, dr, db = L.RING_OUT, 135.0, .75, .5
    rs = [r0 + k * dr for k in range(int((r1 - r0) / dr) + 1)]
    nb = int(360 / db)
    vs, fs, fs_b = [], [], []
    for i in range(nb + 1):
        for r in rs:
            vs.append(tuple(pol(r, i * db)))
    m = len(rs)
    for i in range(nb):
        for k in range(m - 1):
            c = pol(rs[k] + dr / 2, (i + .5) * db)
            if hole(c.x, c.y):
                continue
            f = (i * m + k, i * m + k + 1, (i + 1) * m + k + 1, (i + 1) * m + k)
            (fs_b if k % 12 == 6 else fs).append(f)                             # concentric paving bands every 9 m
    a["paving"].facing(vs, fs, lambda c: (0, 0, 1))
    a["paving_b"].facing(vs, fs_b, lambda c: (0, 0, 1))
    for a0, a1 in ((-160, -112), (-68, -20), (20, 160)):                       # pale light arcs in the walking area
        arc = [pol(53.5, b, .01) for b in bearings(a0, a1, 1.0)]
        for p, q in zip(arc, arc[1:]):
            m_ = (p + q) / 2
            obox(a["glowline"], (m_.x, m_.y, .012), ((q - p).length + .02, .14, .025), math.atan2(q.y - p.y, q.x - p.x))
    for k in range(40):                                                          # planters with trees, benches
        b = -90 + 360 * k / 40 + 4
        r = rng.uniform(92, 125)
        p = pol(r, b)
        if hole(p.x, p.y) or abs(math.remainder(b + 25, 360)) < 8:            # keep the main view's line clear
            continue
        ring(a["curb"], 0, 3.4, 0, .5, 24, p.x, p.y)
        ring(a["planter_soil"], 0, 3.2, .5, .55, 24, p.x, p.y)
        h = rng.uniform(8.0, 10.0)
        cr = h * .42
        M.leafy_tree(K.ctx(a, rng, p.x, p.y, .55), (0, 0, 0), h=h, crown=cr * .9, trunk="wood",
                     roles=("leaf_l", "green"), core="green", n=46, size=.45, branches=5)
        for i in range(6):                                                      # full crown lobes (as the Q10 park trees)
            t, rr = i * 2.4 + rng.uniform(-.3, .3), (0 if i == 0 else cr * rng.uniform(.45, .62))
            c = (rr * math.cos(t), h * (.84 if i == 0 else rng.uniform(.62, .78)), rr * math.sin(t))
            q = cr * rng.uniform(.46, .60)
            G.blob(K.Three(a["in_green" if i % 2 else "in_leaf_l"], p.x, p.y, .55), c, (q, q * .8, q), sub=2, seed=k * 7 + i, noise=.30, flat=.8)
            M.leaf_clump(K.ctx(a, rng, p.x, p.y, .55), c, (q * 1.08, q * .9, q * 1.08), ("leaf_l", "green"), None, 40, .42, .3, 1)
        M.kit_prop(K.ctx(a, rng, *pol(r - 4.2, b), rad(b) + math.pi / 2), "bench", 0, 0, 0)
    return a


# --- MOVING: shell --------------------------------------------------------------------------------------------------------------
def shell(rng):
    a = Accs()
    a0, a1 = L.SHELL_SPAN
    K.sector(a["shell_beam"], L.R_IN - .2, L.R_OUT + .2, a0, a1, L.BEAM_LOW[0], L.BEAM_LOW[1], 1.0)    # lower arc box beam
    K.sector(a["shell_beam"], L.R_IN - .2, L.R_OUT + .2, a0, a1, L.BEAM_TOP[0], L.BEAM_TOP[1], 1.0)    # upper arc box beam
    arc_wall(a["shell"], L.R_OUT, a0, a1, L.BEAM_LOW[1], L.BEAM_TOP[0], 1.0)
    arc_wall(a["shell_in"], L.R_IN, a0, a1, L.BEAM_LOW[1], L.BEAM_TOP[0], 1.0, inward=True)
    # the two end frames: outer and inner chords, horizontals, diagonals, catwalks and a ladder show the shell's depth
    for end, side in ((a0, 1), (a1, -1)):
        T = frame_at(end)
        for rr in (L.R_OUT - .5, L.R_IN + .5):
            tbox(a["shell_beam"], T, (rr, side * .45, (L.BEAM_LOW[0] + L.BEAM_TOP[1]) / 2), (1.0, .9, L.BEAM_TOP[1] - L.BEAM_LOW[0]))
        zs = [L.BEAM_LOW[1] + k * 4.1 for k in range(11)]
        for k, z in enumerate(zs):
            tbox(a["steel"], T, ((L.R_IN + L.R_OUT) / 2, side * .45, z), (L.R_OUT - L.R_IN - 1.6, .35, .35))
            if k + 1 < len(zs):
                p0 = T @ Vector((L.R_IN + 1.0, side * .45, z))
                p1 = T @ Vector((L.R_OUT - 1.0, side * .45, zs[k + 1]))
                if k % 2:
                    p0, p1 = T @ Vector((L.R_OUT - 1.0, side * .45, z)), T @ Vector((L.R_IN + 1.0, side * .45, zs[k + 1]))
                pipe(a["steel"], [p0, p1], .14, n=6)
            if not MASSING and k % 2 == 0:
                tbox(a["grating"], T, ((L.R_IN + L.R_OUT) / 2, side * 1.6, z + .2), (L.R_OUT - L.R_IN - 1.4, 2.4, .08))
        if not MASSING:
            for s in (-.35, .35):                                               # ladder up the end frame
                pipe(a["steel_y"], [T @ Vector((L.R_IN + 2.0 + s, side * 2.6, L.BEAM_LOW[1])), T @ Vector((L.R_IN + 2.0 + s, side * 2.6, L.BEAM_TOP[0]))], .04, n=4)
            for z in range(int(L.BEAM_LOW[1]) + 1, int(L.BEAM_TOP[0]), 1):
                pipe(a["steel_y"], [T @ Vector((L.R_IN + 1.65, side * 2.6, z)), T @ Vector((L.R_IN + 2.35, side * 2.6, z))], .025, n=4)
            for rr, w in ((L.R_OUT, .6), (L.R_IN, .6)):                         # white edge flashing round the end face
                tbox(a["shell"], T, (rr + (.0 if rr == L.R_OUT else 0), side * .25, (L.BEAM_LOW[1] + L.BEAM_TOP[0]) / 2), (.12, w, L.BEAM_TOP[0] - L.BEAM_LOW[1]))
    if not MASSING:
        # panel seams on the outer skin (every 4.5 m along, every 5.4 m up), a few access hatches, splice plates
        n_v = int((a1 - a0) * rad(1) * L.R_OUT / 4.5)
        for k in range(1, n_v):
            b = a0 + (a1 - a0) * k / n_v
            T = frame_at(b, L.R_OUT + .02)
            tbox(a["seam"], T, (0, 0, (L.BEAM_LOW[1] + L.BEAM_TOP[0]) / 2), (.04, .07, L.BEAM_TOP[0] - L.BEAM_LOW[1]))
        for k in range(1, 8):
            z = L.BEAM_LOW[1] + k * (L.BEAM_TOP[0] - L.BEAM_LOW[1]) / 8
            arc_wall(a["seam"], L.R_OUT + .025, a0, a1, z - .035, z + .035, 1.0)
        for b, z in ((a0 + 40, 8.0), (270.0, 8.0), (a1 - 50, 26.0)):
            T = frame_at(b, L.R_OUT + .04)
            tbox(a["seam"], T, (0, 0, z), (.05, 2.0, 2.4))
            tbox(a["shell"], T, (.03, 0, z), (.04, 1.8, 2.2))
        for k in range(1, 12):                                                  # segment splices on the lower beam
            b = a0 + (a1 - a0) * k / 12
            T = frame_at(b, L.R_OUT + .22)
            tbox(a["steel"], T, (0, 0, (L.BEAM_LOW[0] + L.BEAM_LOW[1]) / 2), (.04, 1.2, 1.2))
            for i in range(3):
                for j in range(3):
                    tbox(a["bolt"], T, (.03, -.4 + .4 * i, L.BEAM_LOW[0] + .3 + .4 * j), (.04, .07, .07))
        for b in (205.0, 250.0, 290.0, 335.0):                                  # roof downpipes on the inner skin
            p0, p1 = pol(L.R_IN - .35, b, L.BEAM_TOP[0]), pol(L.R_IN - .35, b, L.BEAM_LOW[1])
            pipe(a["steel"], [p0, p1], .16, n=8)
        arc_wall(a["glowline"], L.R_OUT + .03, a0 + 2, a1 - 2, L.BEAM_LOW[1] + .2, L.BEAM_LOW[1] + .28, 1.0)
    return a


# --- MOVING: bogie (one shared mesh, built in its own frame: x along the track, y radial outward, origin between the rails) ----
RM = (L.RAILS[0] + L.RAILS[1]) / 2


def wheel(a, x0, rr, drive=False):
    """Load wheel on rail radius rr at track position x0: centre on the rail circle, axle radial, tread on the rail head."""
    phi = -math.asin(x0 / rr)
    y = rr * math.cos(phi) - RM
    T = Matrix.Translation((x0, y, L.AXLE_Z)) @ Matrix.Rotation(phi, 4, "Z") @ Matrix.Rotation(math.pi / 2, 4, "X")
    R, Wd = L.WHEEL_R, L.WHEEL_W
    prof = [(0.0, -Wd / 2), (R, -Wd / 2), (R, Wd / 2), (0.0, Wd / 2)]           # tread
    loft(a["wheel"], [[tuple(T @ Vector((r * math.cos(t), r * math.sin(t), z))) for t in (2 * math.pi * j / 40 for j in range(40))] for r, z in ((R, -Wd / 2), (R, Wd / 2))])
    fl = -1 if rr == L.RAILS[0] else 1                                          # flange on the inside of the track gauge
    loft(a["wheel"], [[tuple(T @ Vector((r * math.cos(t), r * math.sin(t), z))) for t in (2 * math.pi * j / 40 for j in range(40))]
                      for r, z in ((R + .08, fl * (Wd / 2 + .0)), (R + .08, fl * (Wd / 2 + .05)))])
    loft(a["hub"], [[tuple(T @ Vector((r * math.cos(t), r * math.sin(t), z))) for t in (2 * math.pi * j / 16 for j in range(16))] for r, z in ((.28, -Wd / 2 - .45), (.28, Wd / 2 + .45))])
    for s in (-1, 1):                                                           # axle boxes either side (top 2.53)
        tbox(a["axlebox"], T @ Matrix.Rotation(-math.pi / 2, 4, "X"), (0, s * (Wd / 2 + .3), 0), (.62, .3, .5))
    if drive:                                                                    # drive unit outboard: gearbox and motor
        D = T @ Matrix.Rotation(-math.pi / 2, 4, "X")
        tbox(a["drive"], D, (0, (Wd / 2 + .75), .05), (.9, .5, .9))
        loft(a["drive"], [[tuple(D @ Vector((-.1 + .0, (Wd / 2 + 1.0) + z, .1)) + Vector((0, 0, 0)) + (D.to_3x3() @ Vector((.36 * math.cos(t), 0, .36 * math.sin(t)))))
                           for t in (2 * math.pi * j / 16 for j in range(16))] for z in (0.0, .9)])
    return T


def bogie():
    a = Accs()
    xb = L.WHEEL_BASE / 2
    for rr in L.RAILS:
        for x0 in (-xb, xb):
            wheel(a, x0, rr, drive=(rr == L.RAILS[1] and x0 > 0))
        yr = rr * math.cos(math.asin(xb / rr)) - RM
        y0 = rr - RM
        # equalising beam over the two axle boxes on this rail, centre pivot, springs
        tbox(a["bogie_frame"], Matrix(), (0, (y0 + yr) / 2, 2.895), (L.WHEEL_BASE + 1.0, .55, .45))   # 2.67 .. 3.12
        for x0 in (-xb, xb):
            tbox(a["spring"], Matrix(), (x0, yr, 2.6), (.4, .4, .14))          # springs on the axle boxes
        # side guide rollers on the rail head, anti-uplift claw under the head (clear of it), brackets up to the beam
        for x0 in (-xb - .75, xb + .75):
            yy = math.sqrt(rr * rr - x0 * x0) - RM
            for s in (-1, 1):
                c = Vector((x0, yy + s * (L.RAIL_HEAD_W / 2 + .14), L.RAIL_TOP - .022))
                lathe(a["roller"], [(.14, c.z - .018), (.14, c.z + .018)], 14, c.x, c.y)
                lathe(a["steel_dark"], [(.03, c.z), (.03, 2.7)], 6, c.x, c.y)
                tbox(a["bogie_frame"], Matrix(), (x0, yy + s * .32, (c.z + .3 + 2.7) / 2), (.22, .16, 2.7 - c.z - .3))
                xc = x0 - math.copysign(.5, x0)                                 # anti-uplift claw, inboard of the roller
                yc = math.sqrt(rr * rr - xc * xc) - RM
                tbox(a["claw"], Matrix(), (xc, yc + s * .07, L.RAIL_TOP - .105), (.3, .1, .05))   # tip under the head overhang
                tbox(a["claw"], Matrix(), (xc, yc + s * .16, L.RAIL_TOP - .09), (.3, .08, .08))
                tbox(a["claw"], Matrix(), (xc, yc + s * .26, L.RAIL_TOP - .03), (.3, .2, .06))   # arm out to its hanger
                tbox(a["bogie_frame"], Matrix(), (xc, yc + s * .32, (L.RAIL_TOP + 2.7) / 2), (.18, .12, 2.7 - L.RAIL_TOP))
            tbox(a["bogie_frame"], Matrix(), (x0, (y0 + yr) / 2, 2.78), (.3, .8, .2))
    # bolster across both equalisers, bearing seat with elastomer pad under the shell's lower beam
    z_top = L.BEAM_LOW[0]
    tbox(a["bogie_frame"], Matrix(), (0, 0, 3.32), (1.8, (L.RAILS[1] - L.RAILS[0]) + 1.2, .4))
    tbox(a["steel_dark"], Matrix(), (0, 0, 3.53), (1.2, 2.4, .03))
    tbox(a["pad"], Matrix(), (0, 0, z_top - .03), (1.1, 2.2, .06))
    # parking lock: pin housing down toward the lock seats between the rails
    lathe(a["lock"], [(.22, 2.2), (.22, 3.1)], 14, 0.0, 0.0)
    lathe(a["steel_dark"], [(.11, 1.62), (.11, 2.2)], 10, 0.0, 0.0)
    # machine cover (white) over the bolster ends, warning band
    for s in (-1, 1):
        tbox(a["cover"], Matrix(), (0, s * 2.15, 3.15), (2.0, .6, .8))
        tbox(a["steel_y"], Matrix(), (0, s * 2.46, 3.0), (2.0, .02, .16))
    return a


def bogie_matrix(b):
    return Matrix.Translation(pol(RM, b)) @ Matrix.Rotation(rad(b - 90), 4, "Z")


# --- MOVING: roof frame and panels (local frame) -----------------------------------------------------------------------------------
def roof_frame():
    a = Accs()
    y0, y1 = L.TRUSS_Y
    zb, zt = L.TRUSS_Z
    for s in (-1, 1):
        x = s * L.TRUSS_X
        back_y = -math.sqrt((L.R_IN - .2) ** 2 - x * x)                       # bottom chord rises over the top beam's inner edge
        bot = lambda y: zb if y > back_y + 4 else zb + (L.BEAM_TOP[1] + .3 - zb) * min(1, (back_y + 4 - y) / 4)  # noqa: E731
        ys = [y0 + (y1 - y0) * i / 40 for i in range(41)]
        pipe(a["truss"], [Vector((x, y, zt)) for y in ys], .3, n=6)
        pipe(a["truss"], [Vector((x, y, bot(y))) for y in ys], .3, n=6)
        for i, y in enumerate(ys):
            pipe(a["truss"], [Vector((x, y, bot(y))), Vector((x, y, zt))], .13, n=6)
            if i + 1 < len(ys):
                yb = ys[i + 1]
                p0, p1 = (Vector((x, y, bot(y))), Vector((x, yb, zt))) if i % 2 == 0 else (Vector((x, y, zt)), Vector((x, yb, bot(yb))))
                pipe(a["truss"], [p0, p1], .11, n=6)
        tbox(a["pad"], Matrix(), (x, y0 + .6, L.BEAM_TOP[1] + .03), (1.4, 1.4, .06))   # bearing on the top beam
        # panel rails, one per level on the inner face, full length (the panels' bearing over the whole travel)
        for k in range(L.N_PANEL):
            z = L.panel_level(k) - .12
            tbox(a["roof_rail"], Matrix(), (s * L.RAIL_IN_X, (y0 + 1.5 + y1) / 2, z), (.22, y1 - y0 - 1.5, .12))
            for yy in range(int(y0 + 2), int(y1), 4):                           # rail brackets back to the truss
                tbox(a["steel_dark"], Matrix(), (s * (L.RAIL_IN_X + L.TRUSS_X) / 2, yy, z - .02), (L.TRUSS_X - L.RAIL_IN_X, .2, .14))
            tbox(a["steel_y"], Matrix(), (s * L.RAIL_IN_X, y1 - .2, z + .12), (.22, .2, .14))        # end stop at the tip
            tbox(a["steel_y"], Matrix(), (s * L.RAIL_IN_X, y0 + 1.6, z + .12), (.22, .2, .14))       # back stop
        # side gutter along the truss into the shell downpipes
        tbox(a["gutter"], Matrix(), (s * (L.TRUSS_X - .7), (y0 + y1) / 2, L.PANEL_LEVEL0 - .35), (.5, y1 - y0 - 1, .25))
    # front portal between the end frames' tops, ties
    xe = L.R_OUT * math.cos(rad(30))
    for z in (L.BEAM_TOP[0], zt):
        pipe(a["truss"], [Vector((-xe + .8, L.PORTAL_Y, z)), Vector((xe - .8, L.PORTAL_Y, z))], .4, n=6)
    for k in range(17):
        x = -xe + .8 + (2 * xe - 1.6) * k / 16
        pipe(a["truss"], [Vector((x, L.PORTAL_Y, L.BEAM_TOP[0])), Vector((x, L.PORTAL_Y, zt))], .14, n=6)
    for k in range(9):                                                           # cross ties between the trusses (above the panels)
        y = y0 + 3 + (y1 - y0 - 6) * k / 8
        pipe(a["truss"], [Vector((-L.TRUSS_X, y, zt)), Vector((L.TRUSS_X, y, zt))], .12, n=6)
    # stepped stowage bay at the back: side walls, roof, back wall; open slot at the front (y = STOW[1])
    sy0, sy1 = L.STOW
    for s in (-1, 1):
        tbox(a["stow"], Matrix(), (s * L.STOW_X, (sy0 + sy1) / 2, (L.PANEL_LEVEL0 - .4 + L.STOW_TOP) / 2), (.25, sy1 - sy0, L.STOW_TOP - L.PANEL_LEVEL0 + .4))
    tbox(a["stow"], Matrix(), (0, (sy0 + sy1) / 2, L.STOW_TOP + .12), (2 * L.STOW_X + .25, sy1 - sy0, .24))
    tbox(a["stow"], Matrix(), (0, sy0, (L.PANEL_LEVEL0 + L.STOW_TOP) / 2), (2 * L.STOW_X, .25, L.STOW_TOP - L.PANEL_LEVEL0))
    tbox(a["seam"], Matrix(), (0, sy1, L.STOW_TOP + .05), (2 * L.STOW_X + .3, .3, .2))
    # fixed side wings over the back half (arc edges), the central band left to the panels
    for s in (-1, 1):
        pts = []
        for y in [-34.0 + (L.PORTAL_Y + 34.0) * i / 20 for i in range(21)]:
            pts.append((s * (L.TRUSS_X + .4), y))
        for y in [L.PORTAL_Y - (L.PORTAL_Y + 34.0) * i / 20 for i in range(21)]:
            pts.append((s * math.sqrt(max(0.0, (L.R_IN - .1) ** 2 - y * y)), y))
        if s < 0:
            pts.reverse()
        plan_solid(a["wing"], pts, zt + .35, zt + .55)
    return a


def panel(k):
    """Sliding panel k, stowed (y PANEL_Y0 .. +PANEL_L), on its own level: deck, ribs, rollers on both rails, front lap
    flashing (laps down over the next panel forward), side upstands into the gutters."""
    a = Accs()
    z = L.panel_level(k)
    y0, y1 = L.PANEL_Y0, L.PANEL_Y0 + L.PANEL_L
    w = L.ROOF_W
    tbox(a["panel"], Matrix(), (0, (y0 + y1) / 2, z + L.PANEL_T - .06), (w, L.PANEL_L, .12))
    for i in range(7):
        tbox(a["panel_rib"], Matrix(), (-w / 2 + w * i / 6, (y0 + y1) / 2, z + .25), (.2, L.PANEL_L - .2, .4))
    for yy in (y0 + .3, (y0 + y1) / 2, y1 - .3):
        tbox(a["panel_rib"], Matrix(), (0, yy, z + .25), (w, .25, .4))
    for s in (-1, 1):
        tbox(a["panel"], Matrix(), (s * (w / 2 - .05), (y0 + y1) / 2, z + L.PANEL_T + .08), (.1, L.PANEL_L, .2))
        for yy in (y0 + .9, (y0 + y1) / 2, y1 - .9):                           # rollers riding on the truss rail (top z - .06)
            c = Vector((s * L.RAIL_IN_X, yy, z - .06 + .18))
            loft(a["roller"], [[(c.x + dx, c.y + .18 * math.cos(t), c.z + .18 * math.sin(t)) for t in (2 * math.pi * j / 16 for j in range(16))] for dx in (-.1, .1)])
            tbox(a["panel_rib"], Matrix(), (s * (w / 2 + .05), yy, z + .2), (.3, .4, .3))
    tbox(a["seam"], Matrix(), (0, y1 + .25, z + L.PANEL_T - .2), (w, .5, .08))   # front lap flashing
    for i in range(1, 6):
        tbox(a["seam"], Matrix(), (-w / 2 + w * i / 6, (y0 + y1) / 2, z + L.PANEL_T + .002), (.05, L.PANEL_L, .01))
    return a


# --- materials -----------------------------------------------------------------------------------------------------------------
def mat(name, hexc, rough=.6, metal=0.0, alpha=1.0, emit=None, strength=1.0, culling=True):
    m = G.material("q11a_" + name, srgb(hexc, alpha), rough, srgb(emit) if emit else None, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


def make_materials():
    K.MATS.clear()
    K.MATS.update({
        "shell": mat("shell_white", "ECEEEE", .32, .25), "shell_in": mat("shell_inner", "DADDDD", .45, .2),
        "shell_beam": mat("shell_beam", "D6DADB", .4, .35), "shell_edge": mat("shell_edge", "C9CED0", .4, .3),
        "seam": mat("panel_seam", "A9B0B4", .4, .4), "bolt": mat("bolt", "6B7378", .4, .8),
        "steel": mat("steel_grey", "8E979D", .4, .7), "steel_dark": mat("steel_dark", "4A5258", .45, .7),
        "steel_y": mat("safety_yellow", "E2B93A", .5, .2), "grating": mat("grating", "707880", .5, .6),
        "wheel": mat("wheel_steel", "5E666B", .3, .9), "hub": mat("hub", "3D4448", .4, .8),
        "axlebox": mat("axle_box", "2F3539", .5, .5), "drive": mat("drive_unit", "4F6E86", .45, .4),
        "bogie_frame": mat("bogie_frame", "C7CCCF", .45, .5), "spring": mat("spring", "2B2F31", .6, .3),
        "roller": mat("roller", "3A4043", .4, .8), "claw": mat("uplift_claw", "C8562E", .5, .4),
        "pad": mat("elastomer_pad", "1E2224", .8), "lock": mat("parking_lock", "D2A23A", .45, .5),
        "cover": mat("machine_cover", "F1F2F0", .4, .2),
        "rail": mat("rail_steel", "7C8489", .25, .95), "grout": mat("grout", "8F8B84", .9),
        "groove": mat("drain_grating", "3E4346", .6, .5), "fence": mat("guard_rail", "D9DDDE", .35, .6),
        "concrete": mat("concrete", "C8C4BC", .85), "concrete_dark": mat("concrete_dark", "A19D95", .9),
        "bearing_pad": mat("girder_bearing", "2A2D2F", .8),
        "slab": mat("floor_slab", "E9E7E1", .7), "edge": mat("slab_edge", "F4F4F1", .5),
        "glass": mat("facade_glass", "BFDCE4", .05, alpha=.28, culling=False), "mullion": mat("mullion", "DADFE0", .35, .6),
        "column": mat("column_white", "F1F1EE", .5), "rail_glass": mat("guard_glass", "D2ECF2", .05, alpha=.25, culling=False),
        "planter": mat("planter", "EAE6DD", .7), "planter_soil": mat("planter_soil", "5C4632", .95),
        "step": mat("seat_step", "C9B395", .75), "stair": mat("stair", "D8D3C8", .7),
        "room_wall": mat("room_wall", "F0E8DA", .7, emit="FFE6C2", strength=.6), "door": mat("door", "B9AE9C", .5),
        "door_frame": mat("door_frame", "8C9499", .4, .6), "bench": mat("bench", "B38C62", .6),
        "canopy": mat("canopy", "F2F3F1", .4), "canopy_glass": mat("canopy_glass", "CFE6EE", .05, alpha=.3, culling=False),
        "canopy_frame": mat("canopy_frame", "E4E7E8", .35, .5), "plant": mat("roof_plant", "B9BFC2", .5, .4),
        "paving": mat("plaza_paving", "D9D5CC", .85), "paving_b": mat("plaza_band", "C6C0B4", .85),
        "paving_in": mat("passage_floor", "CFCAC0", .8), "ceiling": mat("passage_ceiling", "EFEDE8", .7, emit="FFF4E2", strength=.4),
        "membrane": mat("waterproofing", "2E3133", .8), "gate": mat("flood_gate", "6F7A80", .4, .7),
        "gate_frame": mat("gate_frame", "4C555A", .4, .7), "curb": mat("curb", "EEEBE4", .6),
        "glowline": mat("pale_light", "D7F2FB", .4, emit="BFEFFF", strength=2.5),
        "battery_wall": mat("battery_floor", "39444C", .6, emit="2A5C7A", strength=.6),
        "module": mat("battery_module", "B4C0C8", .35, .5, emit="6F9BB5", strength=.5),
        "battery_glow": mat("battery_light", "7FDBFF", .3, emit="5CCBFF", strength=30.0),
        "glass_frame": mat("glass_frame", "9AA3A8", .35, .7), "floor_glass": mat("floor_glass", "D6EEF4", .02, alpha=.14, culling=False),
        "window": mat("well_window", "BFE3EE", .03, alpha=.25, culling=False),
        "truss": mat("roof_truss", "DFE3E4", .35, .5), "roof_rail": mat("roof_rail", "6F777C", .3, .9),
        "gutter": mat("gutter", "9AA2A6", .4, .6), "stow": mat("stowage_bay", "E6E9E9", .35, .3),
        "wing": mat("fixed_wing", "E9ECEC", .35, .3),
        "panel": mat("roof_panel", "F4F5F3", .3, .3), "panel_rib": mat("panel_rib", "B4BBBE", .4, .6),
        "wood": mat("trunk", "6E5238", .8),
    })
    for role, (rgba, emit, strength) in M.ROLES.items():                         # library planting and props
        leafy = role in ("leaf_l", "green", "white")
        m = G.material("q11a_in_" + role, rgba, .6, emit, strength)
        m.use_backface_culling = not leafy and rgba[3] >= 1
        K.MATS["in_" + role] = m
    if MASSING:
        white = mat("massing_white", "E4E2DC", .8)
        for k, m in list(K.MATS.items()):
            if next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Alpha"].default_value >= 1:
                K.MATS[k] = white
    return K.MATS


# --- states ----------------------------------------------------------------------------------------------------------------------
def set_state(angle):
    """Turn the MOVING pivot to the state angle and slide the panels to the state's travel (same geometry for all states)."""
    piv = bpy.data.objects["MOVING"]
    piv.rotation_euler = (0, 0, -rad(angle))
    for k, off in enumerate(L.panel_offsets(L.STATES[angle])):
        bpy.data.objects["ROOF_PANEL_%d" % k].location = (0, off, 0)
    bpy.context.view_layer.update()


# --- preview staging (never exported) -----------------------------------------------------------------------------------------
def preview(col, rng):
    mk = lambda n, h, r=.8, **k: K.MATS.setdefault("pv_" + n, mat("pv_" + n, h, r, **k))  # noqa: E731
    mk("water", "3F7FA6", .05)
    mk("land", "A9B58A", .95)
    mk("far", "C3CFD9", .9)
    mk("farw", "E8ECEE", .8)
    mk("cloud", "8C96A0", 1.0)
    mk("cloud_l", "D9DEE3", 1.0)
    a = Accs()
    loft(a["pv_water"], [[(-6000, 160, z), (6000, 160, z), (6000, 8000, z), (-6000, 8000, z)] for z in (-3, -2.2)])
    land = Accs()                                                               # own object: hidden in the section views
    for r0, r1 in ((134.0, 158.0),):                                            # land round the site (the plaza covers r < 135)
        ring(land["pv_land"], r0, r1, -20, -.6, 180)
    loft(land["pv_land"], [[(-900, -900, z), (900, -900, z), (900, -158, z), (-900, -158, z)] for z in (-20, -.6)])
    for s in (-1, 1):
        loft(land["pv_land"], [[(s * 158, -158, z), (s * 900, -158, z), (s * 900, 158, z), (s * 158, 158, z)] for z in (-20, -.6)])
    mk("earth", "4A433B", .95)
    lathe(land["pv_earth"], [(0.0, -17.0), (134.5, -17.0), (134.5, -16.8), (0.0, -16.8)], 90)   # dark ground under the site's pits
    ob = bpy.data.objects.new("PV_Land", K.build_mesh("pv_land", land))
    col.objects.link(ob)
    for i in range(240):                                                       # far shore
        x, y = rng.uniform(-4200, 4200), rng.uniform(2400, 3100)
        h = rng.uniform(15, 80) * (2.4 if rng.random() < .1 else 1)
        w = rng.uniform(20, 55)
        K.box(a["pv_far"], x, x + w, y, y + w, -2, h)
    loft(a["pv_far"], [[(-6000, 2500, z), (6000, 2500, z), (6000, 3500, z), (-6000, 3500, z)] for z in (-2.2, 5)])
    bx, by = Vector((-2400.0, 1500.0)), Vector((-600.0, 2400.0))                # rainbow-bridge-like suspension bridge, left
    ang = math.atan2(by.y - bx.y, by.x - bx.x)

    def along(t, z, s=0):
        c = bx.lerp(by, t)
        return (c.x - s * 9 * math.sin(ang), c.y + s * 9 * math.cos(ang), z)
    obox(a["pv_farw"], along(.5, 30), ((by - bx).length * 1.3, 14, 3), ang)
    for t in (.15, .85):
        for s in (-1, 1):
            obox(a["pv_farw"], along(t, 55, s), (5, 4, 112), ang)
        obox(a["pv_farw"], along(t, 105), (4, 20, 5), ang)
    for s in (-1, 1):
        pipe(a["pv_farw"], [Vector(along(.15 + .7 * i / 24, 34 + 72 * (2 * i / 24 - 1) ** 2, s)) for i in range(25)], 1.0, 1.0, 5)
    for i in range(26):                                                        # a typhoon cloud band far out over the bay, right
        c = (rng.uniform(800, 3800), rng.uniform(3600, 5200), rng.uniform(150, 420))
        r = rng.uniform(220, 520)
        M.ell(a["pv_cloud" if i % 3 else "pv_cloud_l"], c, (r, 0, 0), (0, r * .7, 0), (0, 0, r * .35), 14, 8)
    ob = bpy.data.objects.new("PV_Context", K.build_mesh("pv_context", a))
    col.objects.link(ob)


# --- layout checks (report) -------------------------------------------------------------------------------------------------------
def layout_checks():
    out = {"shell": {"outer_r": L.R_OUT, "inner_r": L.R_IN, "height": L.SHELL_TOP, "opening_deg": L.OPEN_DEG},
           "nominal_gap_building_to_inner_skin_m": round(L.R_IN - L.R_BLD, 2),
           "bogies": L.N_BOGIE, "load_wheels": L.N_BOGIE * 4, "rail_top_z": round(L.RAIL_TOP, 3), "axle_z": round(L.AXLE_Z, 3),
           "roof": {"truss_y": [round(v, 2) for v in L.TRUSS_Y], "truss_z": L.TRUSS_Z, "panel_levels": [round(L.panel_level(k), 2) for k in range(L.N_PANEL)],
                    "lowest_panel_underside_m": round(min(L.panel_level(k) for k in range(L.N_PANEL)), 2), "building_top_m": L.ROOF_Z,
                    "travel_m": L.TRAVEL, "state_travel_m": {str(k): round(v, 2) for k, v in L.STATES.items()}},
           "passages": {"floor_z": L.PASS_FLOOR, "clear_h": L.PASS_H, "roof_top_z": round(L.PASS_FLOOR + L.PASS_H + .4, 2),
                        "transfer_girder_bottom_z": L.TRANSFER[1], "ramp": [L.RAMP_R[0], round(L.RAMP_R[1], 1)], "ramp_grade": "1:12"}}
    # stowed and fully run-out panels stay on their rails and inside the shell's top-beam inner edge
    y0, y1 = L.TRUSS_Y
    worst = []
    for s in [i * .5 for i in range(int(L.TRAVEL * 2) + 1)]:
        for k, off in enumerate(L.panel_offsets(s)):
            a, b = L.PANEL_Y0 + off, L.PANEL_Y0 + off + L.PANEL_L
            worst.append(min(a - (y0 + 1.6), (y1 - .2) - b))
    out["roof"]["panel_on_rail_min_margin_m"] = round(min(worst), 2)
    out["roof"]["stowed_corner_r_m"] = round(math.hypot(L.ROOF_W / 2, L.PANEL_Y0), 2)
    return out


# --- assembly ---------------------------------------------------------------------------------------------------------------------
def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    rng = random.Random(2127)
    col = bpy.data.collections.new("Q11A_Asset")
    prev = bpy.data.collections.new("Q11A_Preview")
    scene.collection.children.link(col)
    scene.collection.children.link(prev)
    root = bpy.data.objects.new("Q11A_RotatingShellShelter", None)
    col.objects.link(root)
    nodes = {}

    def node(name, parent, c):
        e = bpy.data.objects.new(name, None)
        c.objects.link(e)
        e.parent = parent
        nodes[name] = e
        return e
    cf, cm = bpy.data.collections.new("Q11A_FIXED"), bpy.data.collections.new("Q11A_MOVING")
    col.children.link(cf)
    col.children.link(cm)
    fixed = node("FIXED", root, cf)
    moving = node("MOVING", root, cm)
    for g in ("BUILDING", "FOUNDATION", "TRACK", "PASSAGES", "BATTERY", "PLAZA"):
        node(g, fixed, cf)
    for g in ("SHELL", "BOGIES", "ROOF"):
        node(g, moving, cm)

    def add(name, accs, g, smooth_deg=30, mw=None, data=None):
        if data is None and not any(acc.f for acc in accs.values()):
            return None
        ob = bpy.data.objects.new(name, data or K.build_mesh("q11a_" + name.lower(), accs, smooth_deg))
        (cm if g in ("SHELL", "BOGIES", "ROOF") else cf).objects.link(ob)
        ob.parent = nodes[g]
        if mw is not None:
            ob.matrix_local = mw
        return ob

    add("BUILDING_STRUCTURE", building(rng), "BUILDING")
    add("FOUNDATION_RING", foundation(), "FOUNDATION")
    add("TRACK_RAILS", track(), "TRACK")
    add("PASSAGES_FIXED", passages(), "PASSAGES")
    add("BATTERY_ROOM", battery(), "BATTERY")
    add("SHELL_BODY", shell(rng), "SHELL", 40)
    bm = K.build_mesh("q11a_bogie", bogie(), 40)
    for i, b in enumerate(L.bogie_bearings()):
        add("BOGIE_%02d" % (i + 1), None, "BOGIES", data=bm, mw=bogie_matrix(b))
    add("ROOF_FRAME", roof_frame(), "ROOF")
    for k in range(L.N_PANEL):
        add("ROOF_PANEL_%d" % k, panel(k), "ROOF")
    if not MASSING:
        add("BUILDING_TERRACES", terraces(rng), "BUILDING")
        add("PLAZA_GROUND", plaza(rng), "PLAZA")
    else:
        add("PLAZA_GROUND", plaza_massing(), "PLAZA")
    preview(prev, rng)

    set_state(L.DEFAULT_STATE)                                                  # export state
    bpy.context.view_layer.update()
    asset = [o for o in col.all_objects]
    groups = {"FIXED": [o for o in cf.objects if o.type == "MESH"], "MOVING": [o for o in cm.objects if o.type == "MESH"]}
    report = {"massing": MASSING, "tris_fixed": sum(K.tris(o.data) for o in groups["FIXED"]),
              "tris_moving": sum(K.tris(o.data) for o in groups["MOVING"]),
              "unique_mesh_tris": sum(K.tris(m) for m in {o.data for o in asset if o.type == "MESH"}),
              "objects": len(asset), "materials": len({m.name for o in asset if o.type == "MESH" for m in o.data.materials})}
    report["tris_total"] = report["tris_fixed"] + report["tris_moving"]
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
        report["glb_bytes"] = os.path.getsize(glb)
    set_state(STATE)
    import review_rotating_shell as RV
    RV.stage(scene, prev)
    scene["q11a_state"] = STATE
    blend = os.path.join(HERE, ASSET + ("-massing" if MASSING else "") + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    report["layout"] = layout_checks()
    with open(os.path.join(HERE, "report%s.json" % ("-massing" if MASSING else "")), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps(report))


def plaza_massing():
    a = Accs()
    ring(a["paving"], L.RING_OUT, 135.0, -.3, 0.0, 180)
    return a


if __name__ == "__main__":
    main()
