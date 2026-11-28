"""Q11-B 水に合わせて浮き上がる建物: a five-storey public building on a thick white float in a round shore basin, held by
four fixed guide pillars and reached by a telescoping bridge (reference: Q04・Q10・Q11 一覧 PDF p.7, image B; dimensions:
Q11-B_Design.md). No human figures: doors, seats and railings give the scale.

Run:  blender -b --factory-startup --python-exit-code 1 -P build_floating_civic.py [-- --no-export]
Writes q11b-floating-civic.blend (asset, both water states, preview staging), .glb (asset, high-tide state) and report.json.

Blender coordinates, real metres; normal water z 0, shore on -y, sea on +y; origin at the float centre.
- Fixed (SITE, PILLARS): basin (quay r 65, floor z -5, channel to the sea between bearings 55 and 125), shore walk z 4.5,
  a stepped plaza on the bridge side (wide landings at z 0.5 / 1.5 / 2.5 / 3.5 / 4.5 joined by short stairs, continuing
  under water), the shore abutment (z 4, hinge at (0, -82, 4)) with side ramps up to the walk, four guide pillars
  (r 42 on the diagonals, 1.6 m, tops z 38) with guide rails, a scale on the side facing the main view and the stain of
  the normal water line.
- Floating (FLOAT, one parent; normal z 0, high tide z +3): the float (r 40, top +4, bottom -3, rounded edge, panel
  seams, a light line), five storeys of 4.2 m (outer r 35 / 31 / 27 / 22.5 / 17) with glazed fronts set back by a varying
  depth, floors, beams, columns, doors, furniture, a central atrium with a spiral stair, terraces (glass doors, walk,
  planters, partial rails, trees), a roof court with skylight and low shade canopy, the land-side entrance with a porch,
  four arms with slide carriages (pin joint, two roller sets on the pillar rails) and the float-end bridge seat.
- Bridge (BRIDGE): three nested truss segments with glass rails and roof, turned about the shore hinge and telescoped so
  both ends stay seated; joint plates at the overlaps.
- Water (WATER): one transparent surface, an annulus round the float, moved to the water level.
Both states share one geometry: frame 1 = normal water, frame 2 = high tide (constant keys on FLOAT, WATER and the three
bridge segments). The GLB is exported at frame 2. Preview staging (land, sea, far shore, bridge, storm band, trees) is
collection Q11B_Preview and is never exported. Primitives and kit props come through the Q04-A builder's parts.py.
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
_spec = importlib.util.spec_from_file_location("q04a_parts", os.path.join(MODELS, "q04a-suspended-pod-tower", "parts.py"))
K = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(K)
G, M = K.G, K.M
Accs, loft, obox, lathe, ring, sector, srgb = K.Accs, K.loft, K.obox, K.lathe, K.ring, K.sector, K.srgb

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ASSET = "q11b-floating-civic"
ROOT = "Q11B_FloatingCivic"

STATES = {"normal": (1, 0.0), "high": (2, 3.0)}      # frame, water level (= float lift)
DISC_R, DISC_TOP, DISC_BOT = 40.0, 4.0, -3.0
FLOOR_H, SLAB = 4.2, .45
TIERS = (35.0, 31.0, 27.0, 22.5, 17.0)                # outer radius of storeys 1..5
ATRIUM = 7.0
PILLAR_R, PILLAR_RAD, PILLAR_TOP, PILLAR_BOT = 42.0, .8, 38.0, -5.0
PILLARS = (("NE", 45.0), ("NW", 135.0), ("SW", 225.0), ("SE", 315.0))
BAY_R, POOL_Z, WALK_Z, SITE_R = 65.0, -5.0, 4.5, 115.0
SEA_OPEN = (55.0, 125.0)
PLAZA = (232.0, 308.0)
HINGE = Vector((0.0, -82.0, 4.0))
SEAT = Vector((0.0, -40.0, 4.0))                      # float-end bridge seat at normal water
SEG_LEN = 15.0
SEGS = ((6.0, 3.05), (5.6, 2.9), (5.2, 2.75))        # (outer width, roof height) shore -> float, nested
ABUT = (82.0, 88.0, 3.5)                              # abutment r0, r1, half width
RAMP_W = 2.4
MAIN_CAM = (114.0, 298.0)                             # main view: distance and bearing (scale marks face it)
RAIL_H = 1.1
STEP_R, STEP_T = .143, .3


def pol(r, deg, z=0.0):
    a = math.radians(deg)
    return Vector((r * math.cos(a), r * math.sin(a), z))


def radial_box(acc, b, r, z, size):
    """Box centred at bearing b, radius r, height z; size = (radial, tangential, up)."""
    obox(acc, tuple(pol(r, b, z)), size, math.radians(b))


def gaps(a0, a1, holes, half=.5):
    """Arcs of a0..a1 (degrees) left after cutting out each (start, end) hole."""
    cuts = sorted(((s % 360), (s % 360) + (e - s)) for s, e in holes)
    out, cur = [], a0 % 360
    end = cur + (a1 - a0)
    for s, e in cuts + [(s + 360, e + 360) for s, e in cuts]:
        if e <= cur or s >= end:
            continue
        if s > cur + half:
            out.append((cur, s))
        cur = max(cur, e)
    if end > cur + half:
        out.append((cur, end))
    return out


def rail_arc(a, r, z, a0, a1, step=2.5, glass=True):
    """Balustrade on an arc: glass panel, round handrail, posts."""
    n = max(2, int(abs(a1 - a0) * r * math.radians(1) / 1.2))
    if glass:
        rows = [[tuple(pol(r, a0 + (a1 - a0) * i / n, zz)) for i in range(n + 1)] for zz in (z + .08, z + RAIL_H - .05)]
        m = n + 1
        a["glass"]._push(rows[0] + rows[1], [(i, i + 1, m + i + 1, m + i) for i in range(n)])
    K.pipe(a["rail"], [tuple(pol(r, a0 + (a1 - a0) * i / n, z + RAIL_H)) for i in range(n + 1)], .045, None, 6)
    k = max(1, int(abs(a1 - a0) * math.radians(1) * r / step))
    for i in range(k + 1):
        radial_box(a["rail"], a0 + (a1 - a0) * i / k, r, z + RAIL_H / 2, (.07, .07, RAIL_H))


def rail_line(a, p0, p1, z0, z1=None, glass=False, step=2.0):
    z1 = z0 if z1 is None else z1
    n = max(1, int((p1 - p0).length / step))
    pts = [p0.lerp(p1, i / n) for i in range(n + 1)]
    zs = [z0 + (z1 - z0) * i / n for i in range(n + 1)]
    K.pipe(a["rail"], [(p.x, p.y, z + RAIL_H) for p, z in zip(pts, zs)], .045, None, 6)
    for p, z in zip(pts, zs):
        obox(a["rail"], (p.x, p.y, z + RAIL_H / 2), (.07, .07, RAIL_H), 0)
    if glass:
        vs = [(p.x, p.y, z + .08) for p, z in zip(pts, zs)] + [(p.x, p.y, z + RAIL_H - .05) for p, z in zip(pts, zs)]
        m = n + 1
        a["glass"]._push(vs, [(i, i + 1, m + i + 1, m + i) for i in range(n)])


def band(acc, rfun, z0, z1, a0=0.0, a1=360.0, step=2.0, want=None):
    """Vertical surface following r = rfun(bearing) between z0 and z1 (glass fronts, stains)."""
    n = max(2, int(abs(a1 - a0) / step))
    bs = [a0 + (a1 - a0) * i / n for i in range(n + 1)]
    vs = [tuple(pol(rfun(b), b, z0)) for b in bs] + [tuple(pol(rfun(b), b, z1)) for b in bs]
    m = n + 1
    fs = [(i, i + 1, m + i + 1, m + i) for i in range(n)]
    if want:
        acc.facing(vs, fs, want)
    else:
        acc._push(vs, fs)


def flat(acc, rin, rout, z, a0=0.0, a1=360.0, step=2.0, up=True):
    """Horizontal surface between r = rin(b) and r = rout(b) (floor finishes, terrace paving)."""
    n = max(2, int(abs(a1 - a0) / step))
    bs = [a0 + (a1 - a0) * i / n for i in range(n + 1)]
    f = lambda r: (lambda b: r)  # noqa: E731
    ri = rin if callable(rin) else f(rin)
    ro = rout if callable(rout) else f(rout)
    vs = [tuple(pol(ri(b), b, z)) for b in bs] + [tuple(pol(ro(b), b, z)) for b in bs]
    m = n + 1
    acc.facing(vs, [(i, i + 1, m + i + 1, m + i) for i in range(n)], lambda c: (0, 0, 1 if up else -1))


# --- fixed site --------------------------------------------------------------------------------------------------------------
PLAZA_LEVELS = (4.5, 3.5, 2.5, 1.5, .5)
PLAZA_TOP_R = 88.0                    # the walk (z 4.5) starts here on the plaza side
LANDING = 3.0


def plaza_bands():
    """(r_in, r_out, z) of the plaza: landings and the short stairs between them, top (walk) to water; then steps on
    down under the water and a slope to the floor."""
    out, r = [], PLAZA_TOP_R
    run = 7 * STEP_T
    for i, z in enumerate(PLAZA_LEVELS):
        if i:
            for s in range(7):                                                            # 7 risers of 0.143 m
                out.append((r - STEP_T, r, z + 1.0 - (s + 1) * STEP_R))
                r -= STEP_T
            out.append((r - LANDING, r, z))
            r -= LANDING
    for s in range(14):                                                                   # steps on down into the water
        out.append((r - STEP_T * 1.4, r, .5 - (s + 1) * .2))
        r -= STEP_T * 1.4
    return out, r


def site(rng):
    a = Accs()
    lathe(a["poolfloor"], [(.001, POOL_Z - .6), (SITE_R, POOL_Z - .6), (SITE_R, POOL_Z), (.001, POOL_Z)], 160)
    for i in range(1, 7):                                                                  # floor tile joints
        ring(a["poolseam"], i * 15.0, i * 15.0 + .12, POOL_Z, POOL_Z + .02, 120)
    quay = gaps(0, 360, [SEA_OPEN, PLAZA], .5)
    for a0, a1 in quay:
        sector(a["quay"], BAY_R, SITE_R, a0, a1, POOL_Z, WALK_Z - .05, 1.5)
        sector(a["paving"], BAY_R, 80.0, a0, a1, WALK_Z - .05, WALK_Z, 1.5)
        sector(a["lawn"], 80.0, SITE_R, a0, a1, WALK_Z - .05, WALK_Z + .04, 1.5)
        sector(a["stain"], BAY_R - .03, BAY_R, a0, a1, -.3, .12, 1.5)                       # normal-water line on the quay
        sector(a["coping"], BAY_R, BAY_R + .5, a0, a1, WALK_Z - .05, WALK_Z + .08, 1.5)
        rail_arc(a, BAY_R + .3, WALK_Z, a0 + .3, a1 - .3, glass=False)
    bands, r_low = plaza_bands()
    for r0, r1, z in bands:
        sector(a["step" if (r1 - r0) < 1 else "landing"], r0, r1, PLAZA[0], PLAZA[1], POOL_Z, z, 1.0)
    sector(a["landing"], r_low - 9.0, r_low, PLAZA[0], PLAZA[1], POOL_Z, POOL_Z + .4, 1.0)   # foot of the steps
    sector(a["paving"], PLAZA_TOP_R, SITE_R, PLAZA[0], PLAZA[1], POOL_Z, WALK_Z, 1.0)
    abutment(a)
    for b in range(0, 360, 12):                                                            # benches on the shore walk
        if any(abs(math.remainder(b - x, 360)) < 4 for x in (SEA_OPEN + PLAZA)):
            continue
        if SEA_OPEN[0] < b % 360 < SEA_OPEN[1] or PLAZA[0] < b % 360 < PLAZA[1]:
            continue
        M.kit_prop(K.ctx(a, rng, *pol(78.5, b, WALK_Z), math.radians(b) - math.pi / 2), "bench", 0, 0, 0)
    for s in (-1, 1):                                                                      # benches and planters on the plaza top
        for k in range(3):
            b = 270 + s * (12 + k * 4.5)
            M.kit_prop(K.ctx(a, rng, *pol(PLAZA_TOP_R + 2.0, b, WALK_Z), math.radians(b) + math.pi / 2), "bench", 0, 0, 0)
        p = pol(PLAZA_TOP_R + 5, 270 + s * 9.5)
        sector(a["coping"], PLAZA_TOP_R + 3.6, PLAZA_TOP_R + 6.4, 270 + s * 7 - 1.6, 270 + s * 7 + 1.6, WALK_Z, WALK_Z + .55, 1)
        M.leaf_clump(K.ctx(a, rng, p.x, p.y, WALK_Z + .55), (0, .4, 0), (1.3, .5, 1.3), ("leaf_l", "green"), "green", 36, .35, .3, 3)
    return a


def abutment(a):
    """Shore end of the bridge: a fixed deck at z 4 round the hinge, side ramps (1:12) up to the walk, hinge blocks, the
    shore joint plate."""
    r0, r1, hw = ABUT
    obox(a["abut"], (0, -(r0 + r1) / 2, (POOL_Z + HINGE.z) / 2), (2 * hw, r1 - r0, HINGE.z - POOL_Z), 0)
    for s in (-1, 1):                                                                      # side ramps beside the deck
        x = s * (hw + RAMP_W / 2)
        n = 12
        secs = []
        for i in range(n + 1):
            y = -(r0 + (r1 - r0) * i / n)
            z = HINGE.z + (WALK_Z - HINGE.z) * i / n
            secs.append([(x - RAMP_W / 2, y, POOL_Z), (x + RAMP_W / 2, y, POOL_Z), (x + RAMP_W / 2, y, z), (x - RAMP_W / 2, y, z)])
        loft(a["ramp"], secs)
        xo = s * (hw + RAMP_W + .1)
        rail_line(a, Vector((xo, -r0, 0)), Vector((xo, -r1, 0)), HINGE.z, WALK_Z, glass=True)
        obox(a["abut"], (s * (hw + RAMP_W + .4), -(r0 + r1) / 2, (POOL_Z + WALK_Z) / 2), (.6, r1 - r0, WALK_Z - POOL_Z), 0)
    obox(a["abut"], (0, -(r1 + .4), (HINGE.z + WALK_Z) / 2), (2 * hw, .8, WALK_Z - HINGE.z), 0)     # step up to the walk
    rail_line(a, Vector((-hw, -r1 + .2, 0)), Vector((hw, -r1 + .2, 0)), HINGE.z)
    obox(a["joint"], (0, -(r0 + 1.1), HINGE.z + .05), (4.6, 2.2, .1), 0)                  # shore joint plate
    for s in (-1, 1):                                                                      # hinge blocks and pin
        obox(a["hinge"], (s * 2.4, -r0 - .2, HINGE.z - .45), (.6, .9, .9), 0)
    K.pipe(a["hinge"], [(-2.8, -r0, HINGE.z - .35), (2.8, -r0, HINGE.z - .35)], .16, None, 12)
    obox(a["glowline"], (0, -r0 + .02, HINGE.z - .9), (2 * hw, .04, .08), 0)


def pillar(name, b):
    """One fixed guide pillar: shaft, plinth, cap, two guide rails facing the float, the scale on the side facing the
    main view, and the stained band of the normal water line."""
    a = Accs()
    c = pol(PILLAR_R, b)
    lathe(a["pillar"], [(.001, PILLAR_BOT), (PILLAR_RAD, PILLAR_BOT), (PILLAR_RAD, PILLAR_TOP - .3), (PILLAR_RAD - .15, PILLAR_TOP), (.001, PILLAR_TOP)], 40, c.x, c.y)
    lathe(a["plinth"], [(.001, POOL_Z), (1.6, POOL_Z), (1.6, POOL_Z + .5), (1.1, POOL_Z + .8), (.001, POOL_Z + .8)], 32, c.x, c.y)
    lathe(a["cap"], [(.001, PILLAR_TOP - .5), (1.0, PILLAR_TOP - .5), (1.0, PILLAR_TOP + .2), (.4, PILLAR_TOP + .5), (.001, PILLAR_TOP + .5)], 32, c.x, c.y)
    lathe(a["glowline"], [(.15, PILLAR_TOP + .5), (.15, PILLAR_TOP + 1.0)], 12, c.x, c.y)
    for z in (16.0, 22.0, 28.0, 34.0):                                                     # pale light rings up the shaft
        lathe(a["glowline"], [(PILLAR_RAD + .02, z), (PILLAR_RAD + .02, z + .25)], 40, c.x, c.y)
    inward = b + 180.0
    t = pol(1, inward + 90)
    for s in (-1, 1):                                                                      # guide rails (T section) facing the float
        p = c + pol(PILLAR_RAD - .05, inward) + t * (s * .35)
        q = p + pol(.17, inward)
        obox(a["rail_guide"], ((p.x + q.x) / 2, (p.y + q.y) / 2, (POOL_Z + 1 + PILLAR_TOP - 3) / 2), (.34, .1, PILLAR_TOP - 4 - POOL_Z), math.radians(inward))
        r = c + pol(PILLAR_RAD + .3, inward) + t * (s * .35)
        obox(a["rail_guide"], (r.x, r.y, (POOL_Z + 1 + PILLAR_TOP - 3) / 2), (.08, .26, PILLAR_TOP - 4 - POOL_Z), math.radians(inward))
    cam = pol(MAIN_CAM[0], MAIN_CAM[1])
    face = math.degrees(math.atan2(cam.y - c.y, cam.x - c.x))
    for i in range(int((14 - (-3)) / .5) + 1):                                             # scale: 0.5 m ticks, metre bands
        z = -3 + i * .5
        major = abs(z - round(z)) < 1e-6
        w = 50 if major else 26
        h = .08 if major else .04
        role = "scale" if major else "scale_minor"
        k = 10
        rows = [[tuple(c + pol(PILLAR_RAD + .015, face - w / 2 + w * j / k, z + dz)) for j in range(k + 1)] for dz in (-h / 2, h / 2)]
        a[role]._push(rows[0] + rows[1], [(j, j + 1, k + 2 + j, k + 1 + j) for j in range(k)])
        if major and int(round(z)) % 5 == 0:                                               # every 5 m a wider band
            rows = [[tuple(c + pol(PILLAR_RAD + .02, face - 40 + 80 * j / k, z + dz)) for j in range(k + 1)] for dz in (-.12, .12)]
            a["scale"]._push(rows[0] + rows[1], [(j, j + 1, k + 2 + j, k + 1 + j) for j in range(k)])
    lathe(a["stain"], [(PILLAR_RAD + .008, -.35), (PILLAR_RAD + .008, .12)], 40, c.x, c.y)   # normal-water line (history)
    lathe(a["stain_low"], [(PILLAR_RAD + .005, PILLAR_BOT + .8), (PILLAR_RAD + .005, -.35)], 40, c.x, c.y)
    return a


# --- the float and its building ---------------------------------------------------------------------------------------------
def zf(k):
    """Floor level of storey k (0 = ground storey on the float deck), normal water."""
    return DISC_TOP + FLOOR_H * k


def glass_r(k, b):
    """Glass line of storey k at bearing b: set back 1.2-3.2 m behind the slab edge, varying round the plan (arched
    openings and deeper terraces); the ground storey is a plain circle behind the deck."""
    if k == 0:
        return TIERS[0] - 1.6
    ph = (40, 95, 150, 210)[k - 1]
    s = 1.2 + 2.0 * (.5 + .5 * math.sin(math.radians(3 * b + ph))) ** 1.5
    return TIERS[k] - s


def hull():
    a = Accs()
    lathe(a["hull"], [(.001, DISC_BOT), (DISC_R - 1.0, DISC_BOT), (DISC_R - .3, DISC_BOT + .25), (DISC_R, DISC_BOT + 1.0),
                      (DISC_R, DISC_TOP - .55), (DISC_R - .2, DISC_TOP - .12), (DISC_R - .7, DISC_TOP), (.001, DISC_TOP)], 200)
    for i in range(48):                                                                    # panel seams
        radial_box(a["seam"], i * 7.5 + 3.75, DISC_R + .01, (DISC_BOT + DISC_TOP) / 2 + .2, (.04, .06, DISC_TOP - DISC_BOT - 1.4))
    ring(a["seam"], DISC_R - .01, DISC_R + .02, -.9, -.82, 200)
    ring(a["glowline"], DISC_R - .01, DISC_R + .03, 1.9, 2.02, 200)
    ring(a["hull_low"], DISC_R - .005, DISC_R + .005, DISC_BOT + .9, -.95, 200)               # anti-fouling below the seam
    # deck: paving, rail with an opening at the bridge seat
    flat(a["deck"], glass_r(0, 0) + .05, DISC_R - .7, DISC_TOP + .01)
    holes = [(266.0, 274.0)] + [(b - 2.0, b + 2.0) for _n, b in PILLARS]
    for a0, a1 in gaps(0, 360, holes):
        rail_arc(a, DISC_R - .45, DISC_TOP, a0, a1)
    for a0, a1 in planter_arcs(0):                                                          # deck planters between the arms
        sector(a["planter"], DISC_R - 3.6, DISC_R - 1.6, a0, a1, DISC_TOP, DISC_TOP + .75, 2)
        sector(a["hedge"], DISC_R - 3.4, DISC_R - 1.8, a0 + .4, a1 - .4, DISC_TOP + .75, DISC_TOP + 1.25, 2)
    # bridge seat: joint plate on the deck and the end pin
    obox(a["joint"], (0, -(DISC_R - 1.4), DISC_TOP + .05), (4.6, 2.4, .1), 0)
    for s in (-1, 1):
        obox(a["hinge"], (s * 2.4, -(DISC_R - .5), DISC_TOP + .3), (.5, .8, .6), 0)
    return a


def storey(k, rng):
    """Storey k: slab (with the atrium hole) under it unless k == 0, glass front with mullions, doors and a head band,
    columns, beams under the slab above, floor finish, ceiling lights, furniture; and the terrace on its own slab
    outside the glass (walk, planters, partial rails)."""
    a = Accs()
    z0 = zf(k)
    z1 = z0 + FLOOR_H
    R = TIERS[k]
    gr = lambda b: glass_r(k, b)  # noqa: E731
    if k:
        lathe(a["slab"], [(ATRIUM, z0 - SLAB), (TIERS[k - 1], z0 - SLAB), (TIERS[k - 1], z0), (ATRIUM, z0)], 160, wrap=True)
        ring(a["fascia"], TIERS[k - 1] - .02, TIERS[k - 1] + .06, z0 - SLAB - .05, z0 + .02, 160)
        end = (90.0 * (k - 1) + 300.0) % 360                                               # where the stair from below lands
        for a0, a1 in gaps(0, 360, [(end - 3, end + 16)]):
            rail_arc(a, ATRIUM + .1, z0, a0, a1)
    # glass front, mullions, head band, doors
    band(a["glass_front"], gr, z0, z1 - SLAB, step=1.5)
    for i in range(int(360 / 3.5)):
        b = i * 3.5
        radial_box(a["mullion"], b, gr(b) + .04, (z0 + z1 - SLAB) / 2, (.14, .08, z1 - SLAB - z0))
    band(a["mullion"], lambda b: gr(b) + .06, z1 - SLAB - .35, z1 - SLAB, step=1.5, want=lambda c: (c[0], c[1], 0))
    band(a["mullion"], lambda b: gr(b) + .06, z0 + 2.75, z0 + 2.85, step=1.5, want=lambda c: (c[0], c[1], 0))
    doors = [b for b in range(15, 360, 45) if not (k == 0 and abs(math.remainder(b - 270, 360)) < 30)]
    for b in doors:                                                                        # glass doors to the terrace
        r = gr(b) + .1
        t = pol(1, b + 90)
        for s in (-1, 1):
            p = pol(r, b) + t * (s * 1.2)
            obox(a["doorframe"], (p.x, p.y, z0 + 1.35), (.14, .14, 2.7), math.radians(b))
        p = pol(r, b)
        obox(a["doorframe"], (p.x, p.y, z0 + 2.72), (.14, 2.54, .14), math.radians(b))
        obox(a["doorframe"], (p.x, p.y, z0 + 1.35), (.12, .08, 2.6), math.radians(b))
        for s in (-1, 1):
            q = p + t * (s * .35)
            obox(a["handle"], (q.x, q.y, z0 + 1.05), (.2, .04, .5), math.radians(b))
    # structure inside: columns, beams, floor finish, ceiling lights
    for i in range(12):
        b = i * 30.0 + 15
        lathe(a["column"], [(.25, z0), (.25, z1 - SLAB)], 12, *pol(min(gr(b) - 1.4, R - 3.0), b).xy)
        lathe(a["column"], [(.22, z0), (.22, z1 - SLAB)], 12, *pol(ATRIUM + 1.4, b).xy)
        p0, p1 = pol(ATRIUM + 1.4, b), pol(gr(b) - .3, b)
        obox(a["beam"], (((p0 + p1) / 2).x, ((p0 + p1) / 2).y, z1 - SLAB - .22), (p1.xy.length - p0.xy.length, .3, .45), math.radians(b))
    ring(a["beam"], ATRIUM + 1.25, ATRIUM + 1.55, z1 - SLAB - .45, z1 - SLAB, 96)
    flat(a["floor"], ATRIUM if k else .0, lambda b: gr(b) - .03, z0 + .015)
    for rr in (ATRIUM + 3.0, ATRIUM + 7.5, ATRIUM + 12.0, ATRIUM + 17.0):
        if rr + .5 < R - 3.2:
            flat(a["ceiling_light"], rr, rr + .5, z1 - SLAB - .02, up=False)
    furniture(a, k, rng)
    if k < 4:
        for rs, b0, b1 in ext_stairs(k):
            ext_stair(a, k, rs, b0, b1)
    # terrace on this storey's slab outside the glass: walk, planters in places, rails elsewhere; ground storey: deck
    if k:
        Ro = TIERS[k - 1]
        flat(a["terrace"], lambda b: gr(b) + .03, Ro - .05, z0 + .02)
        on = planter_arcs(k)
        for a0, a1 in on:
            sector(a["planter"], Ro - 1.9, Ro - .3, a0, a1, z0, z0 + .85, 1.5)
            sector(a["soil"], Ro - 1.75, Ro - .45, a0 + .1, a1 - .1, z0 + .85, z0 + .92, 1.5)
            sector(a["hedge"], Ro - 1.6, Ro - .6, a0 + .3, a1 - .3, z0 + .9, z0 + 1.35, 1.5)
            n = max(1, int((a1 - a0) * Ro * math.radians(1) / 2.2))
            for j in range(n):
                b = a0 + (a1 - a0) * (j + .5) / n
                p = pol(Ro - 1.1, b, z0 + 1.2)
                M.leaf_clump(K.ctx(a, rng, p.x, p.y, p.z), (0, .3, 0), (1.15, .7, 1.15), ("leaf_l", "green"), "green", 26, .34, .3, 2)
        tops = [(b1 - .5, b1 + 3.5) for _rs, _b0, b1 in ext_stairs(k - 1)]
        for a0, a1 in gaps(0, 360, on + tops, 1):
            rail_arc(a, Ro - .3, z0, a0 + .3, a1 - .3)
        for j, b in enumerate(range(25 + 30 * k, 385 + 30 * k, 90)):                         # terrace seating
            if not any(x0 <= b % 360 <= x1 for x0, x1 in on):
                r = (gr(b) + Ro - .5) / 2
                M.kit_prop(K.ctx(a, rng, *pol(r, b, z0 + .02), math.radians(b) + math.pi / 2), "bench", 0, 0, 0)
    return a


def planter_arcs(k):
    """Planter runs on terrace k (0 = the float deck): about 60 % of the edge, with gaps facing the bay; the deck keeps
    the entrance axis clear."""
    if k == 0:
        return [(b + 6, b + 26) for b in range(0, 360, 45) if abs(math.remainder(b + 16 - 270, 360)) >= 22]
    ph = (10, 55, 100, 150)[k - 1]
    out = []
    for j in range(6):
        a0 = ph + j * 60
        out.append((a0, a0 + 36))
    return out


EXT_RISERS, EXT_W = 28, 2.2


def ext_stairs(k):
    """Outdoor stairs from terrace k (0 = deck) up to terrace k+1: (centre radius, start bearing, end bearing), two per
    level, rising counter-clockwise just outside the upper slab edge; each runs in a gap between planters, its top lands
    in a gap of the terrace above, clear of the entrance axis and the pillars."""
    if k > 3:
        return []
    rs = TIERS[k] + .2 + EXT_W / 2
    db = math.degrees(EXT_RISERS * STEP_T / rs)
    lo, hi = planter_arcs(k), planter_arcs(k + 1)
    inside = lambda b, arcs, pad: any((x0 - pad) <= (b % 360) <= (x1 + pad) or (x0 - pad) <= (b % 360) + 360 <= (x1 + pad) for x0, x1 in arcs)  # noqa: E731
    ok = []
    for b0 in range(0, 360):
        b1 = b0 + db
        if any(inside(b0 + db * j / 8, lo, 1.5) for j in range(9)) or inside(b1 + 1.5, hi, 2.0):
            continue
        if any(abs(math.remainder(b - x, 360)) < 10 for x in [270] + [p for _n, p in PILLARS] for b in (b0, b1)):
            continue
        ok.append(b0)
    out = []
    for b0 in ok:
        if all(abs(math.remainder(b0 - c, 360)) > 120 for _r, c, _e in out):
            out.append((rs, float(b0), b0 + db))
        if len(out) == 2:
            break
    return out


def ext_stair(a, k, rs, b0, b1):
    """One outdoor stair: steps, closed white stringers, handrails both sides, a landing onto the terrace above."""
    z0 = zf(k)
    n = EXT_RISERS
    rise = FLOOR_H / n
    for i in range(n):
        ba, bb = b0 + (b1 - b0) * i / n, b0 + (b1 - b0) * (i + 1) / n
        sector(a["ext_step"], rs - EXT_W / 2, rs + EXT_W / 2, ba, bb + .05, z0, z0 + (i + 1) * rise, 4)
    for side in (-1, 1):
        r = rs + side * (EXT_W / 2 + .1)
        secs = []
        for i in range(n + 1):
            b = b0 + (b1 - b0) * i / n
            zt = z0 + i * rise + .35
            secs.append([tuple(pol(r - .1, b, z0)), tuple(pol(r + .1, b, z0)), tuple(pol(r + .1, b, zt)), tuple(pol(r - .1, b, zt))])
        loft(a["fascia"], secs)
        K.pipe(a["rail"], [tuple(pol(r, b0 + (b1 - b0) * i / n, z0 + i * rise + RAIL_H)) for i in range(0, n + 1, 2)], .045, None, 6)
    sector(a["ext_step"], TIERS[k] - .6, rs + EXT_W / 2, b1, b1 + 3.0, zf(k + 1) - .3, zf(k + 1), 1)


def furniture(a, k, rng):
    """Furniture behind the glass: reading and meeting tables, sofas facing out, shelves, plants; reception and lounge on
    the ground storey, a viewing lounge on the top storey."""
    z = zf(k) + .02
    for i in range(10):
        b = i * 36.0 + 8 + 11 * k
        r = glass_r(k, b) - 2.2
        if r < ATRIUM + 3:
            continue
        yaw = math.radians(b) - math.pi / 2
        if k == 0 and abs(math.remainder(b - 270, 360)) < 22:
            continue
        kind = ("sofa", "cafe_set", "meeting_table", "sofa", "cafe_set")[(i + k) % 5] if k < 4 else "sofa"
        M.kit_prop(K.ctx(a, rng, *pol(r, b, z), yaw + (math.pi if kind == "sofa" else 0)), kind, 0, 0, 0)
        M.kit_prop(K.ctx(a, rng, *pol(r - .3, b + 9, z), yaw), "potted_plant", 0, 0, 0)
        if k < 4 and i % 2 == 0:
            M.kit_prop(K.ctx(a, rng, *pol(ATRIUM + 2.4, b + 14, z), math.radians(b + 14) + math.pi / 2), "bookshelf", 0, 0, 0)
    if k == 0:                                                                             # reception desk facing the doors
        p = pol(26.5, 270, z)
        obox(a["desk"], (p.x, p.y, z + .55), (1.0, 5.0, 1.1), math.radians(270))
        obox(a["desk_top"], (p.x, p.y, z + 1.12), (1.2, 5.2, .06), math.radians(270))
        for s in (-1, 1):
            M.kit_prop(K.ctx(a, rng, *(pol(25.4, 270, z) + pol(1, 0) * (s * 1.3)), math.radians(90)), "chair_office", 0, 0, 0)


def atrium(rng):
    """Central atrium: spiral stair round a column (storeys 1-5), the stair landings, a skylight court."""
    a = Accs()
    lathe(a["column"], [(.9, DISC_TOP), (.9, zf(5))], 24)
    for k in range(4):
        z0 = zf(k)
        base = 90.0 * k
        for s in range(24):
            b = base + s * 12.5
            z = z0 + FLOOR_H * (s + 1) / 24
            sector(a["stair"], 1.0, 5.4, b, b + 13.5, z - .2, z, 4)
        end = base + 24 * 12.5
        sector(a["stair"], 1.0, ATRIUM + .3, end - 2, end + 14, zf(k + 1) - .2, zf(k + 1), 4)   # landing to the floor
        pts = [tuple(pol(5.3, base + s * 12.5, z0 + FLOOR_H * s / 24 + RAIL_H)) for s in range(25)]
        K.pipe(a["rail"], pts, .045, None, 6)
        for s in range(0, 25, 3):
            p = Vector(pts[s])
            obox(a["rail"], (p.x, p.y, p.z - RAIL_H / 2), (.06, .06, RAIL_H), 0)
    return a


def roof(rng):
    """Roof court on storey 5: paving, skylight dome over the atrium, a low ring canopy on slim posts, edge planters and
    rail, benches round the skylight."""
    a = Accs()
    z = zf(5)
    R = TIERS[4]
    lathe(a["slab"], [(ATRIUM, z - SLAB), (R, z - SLAB), (R, z), (ATRIUM, z)], 140, wrap=True)
    ring(a["fascia"], R - .02, R + .06, z - SLAB - .05, z + .02, 140)
    flat(a["terrace"], ATRIUM + .6, R - .05, z + .02)
    prof = [(ATRIUM + .5, z + .05), (ATRIUM - .2, z + .7), (5.6, z + 1.35), (3.6, z + 1.8), (.01, z + 2.0)]
    K.skin(a["skylight"], prof, 64)
    lathe(a["frame"], [(ATRIUM + .2, z), (ATRIUM + .7, z), (ATRIUM + .7, z + .3), (ATRIUM + .2, z + .3)], 96, wrap=True)
    for i in range(16):
        b = i * 22.5
        K.pipe(a["frame"], [tuple(pol(r, b, zz + .02)) for r, zz in prof], .06, None, 6)
    for i in range(12):                                                                    # low ring canopy
        b = i * 30.0
        for rr in (9.6, 12.6):
            lathe(a["frame"], [(.08, z), (.08, z + 2.5)], 8, *pol(rr, b).xy)
    lathe(a["canopy"], [(9.2, z + 2.5), (13.0, z + 2.5), (13.0, z + 2.65), (9.2, z + 2.65)], 120, wrap=True)
    for j in range(8):                                                                     # benches round the skylight
        b = j * 45.0 + 22.5
        M.kit_prop(K.ctx(a, rng, *pol(ATRIUM + 1.9, b, z + .02), math.radians(b) + math.pi / 2), "bench", 0, 0, 0)
    on = [(b, b + 40) for b in range(5, 365, 72)]
    for a0, a1 in on:
        sector(a["planter"], R - 1.6, R - .3, a0, a1, z, z + .8, 2)
        sector(a["hedge"], R - 1.4, R - .5, a0 + .5, a1 - .5, z + .8, z + 1.25, 2)
    for a0, a1 in gaps(0, 360, on, 1):
        rail_arc(a, R - .3, z, a0 + .3, a1 - .3)
    return a


def porch():
    """Land-side entrance on the bridge axis: glass doors in a white frame and a roofed porch on two columns."""
    a = Accs()
    z = DISC_TOP
    r = glass_r(0, 270)
    for s in (-1, 1):
        obox(a["portal"], (s * 3.2, -(r + .1), z + 1.8), (.5, .5, 3.6), 0)
    obox(a["portal"], (0, -(r + .1), z + 3.45), (6.9, .5, .3), 0)
    for s in (-1, 1):
        obox(a["doorframe"], (s * 1.45, -(r + .2), z + 1.35), (.12, .12, 2.7), 0)
        obox(a["doorframe"], (s * .05, -(r + .2), z + 1.35), (.1, .12, 2.7), 0)
    obox(a["doorframe"], (0, -(r + .2), z + 2.75), (3.0, .12, .12), 0)
    obox(a["canopy"], (0, -(r + 2.3), z + 3.75), (8.2, 4.6, .28), 0)
    obox(a["glowline"], (0, -(r + 2.3), z + 3.6), (7.4, 3.8, .03), 0)
    for s in (-1, 1):
        lathe(a["column"], [(.16, z), (.16, z + 3.62)], 12, s * 3.6, -(r + 4.2))
    return a


def sliders():
    """Four arms from the float wall, each a pin joint into a carriage that rides the pillar's two guide rails on an upper
    and a lower roller set (two wheels each), with a strap closing the yoke behind the pillar."""
    a = Accs()
    for _n, b in PILLARS:
        c = pol(PILLAR_R, b)
        inward = b + 180
        t = pol(1, b + 90)
        ang = math.radians(b)
        rf = PILLAR_R - PILLAR_RAD - .3                                                    # rail face (radius from the origin)
        zc = (DISC_BOT + DISC_TOP) / 2 + .4
        hh = 3.7                                                                           # carriage half height (-2.8 .. 4.6)
        radial_box(a["arm"], b, DISC_R + .06, zc - .6, (.14, 2.6, 4.6))                    # wall plate
        p0, p1 = pol(37.4, b, DISC_TOP + .45), pol(rf - .74, b, DISC_TOP + .45)            # upper arm out over the deck edge
        obox(a["arm"], tuple((p0 + p1) / 2), ((p1 - p0).length, .8, .8), ang)
        radial_box(a["arm"], b, 37.8, DISC_TOP + .04, (1.4, 1.8, .08))                    # its base plate on the deck
        q = pol(rf - .7, b, DISC_TOP + .45)
        K.pipe(a["pin"], [tuple(q - t * .62), tuple(q + t * .62)], .22, None, 16)
        for z in (zc - 1.6,):                                                              # lower arm from the wall
            p0, p1 = pol(DISC_R + .1, b, z), pol(rf - .72, b, z)
            obox(a["arm"], tuple((p0 + p1) / 2), ((p1 - p0).length, .9, .7), ang)
            q = pol(rf - .72, b, z)
            K.pipe(a["pin"], [tuple(q - t * .6), tuple(q + t * .6)], .2, None, 16)          # pin joint (tangential axis)
            radial_box(a["arm"], b, rf - .55, z, (.3, 1.3, .9))
        back = rf - .6
        radial_box(a["carriage"], b, back, zc, (.16, 2.36, 2 * hh))                         # carriage back plate
        radial_box(a["carriage"], b, back - .2, DISC_TOP + .45, (.4, 1.4, .9))             # lug for the upper pin
        far = PILLAR_R + PILLAR_RAD + .3
        for s in (-1, 1):                                                                  # open yoke: corner posts and straps
            for r in (back, far):
                p = pol(r, b) + t * (s * 1.1)
                obox(a["carriage"], (p.x, p.y, zc), (.18, .18, 2 * hh), ang)
        for zz in (zc - hh + .15, zc + hh - .15):
            for s in (-1, 1):
                p = pol((back + far) / 2, b) + t * (s * 1.1)
                obox(a["carriage"], (p.x, p.y, zz), (far - back, .16, .22), ang)
            radial_box(a["carriage"], b, far, zz, (.16, 2.36, .22))
        for zr in (zc - hh + .8, zc + hh - 1.3):                                         # roller sets: upper and lower
            for s in (-1, 1):
                w = pol(rf - .27, b, zr) + t * (s * .35)
                K.pipe(a["wheel"], [tuple(w - t * .08), tuple(w + t * .08)], .26, None, 20)
                K.pipe(a["pin"], [tuple(w - t * .28), tuple(w + t * .28)], .06, None, 8)
                for sx in (-1, 1):
                    f = w + t * (sx * .22) + pol(-.2, b)
                    obox(a["carriage"], (f.x, f.y, zr), (.5, .05, .5), ang)
            rear = pol(PILLAR_R + PILLAR_RAD + .18, b, zr)
            K.pipe(a["wheel"], [tuple(rear - t * .5), tuple(rear + t * .5)], .17, None, 16)
        radial_box(a["glowline"], b, back - .11, zc + hh - .5, (.03, 1.6, .06))
    return a


# --- bridge -------------------------------------------------------------------------------------------------------------------
def bridge_segment(i):
    """Segment i in its own frame: origin at its shore end on the deck line, +y towards the float, deck top z 0.
    Deck, two Warren side trusses, glass rails, a glass roof on posts; the inner segments are narrower and lower so each
    slides inside the one before; a comb joint plate at the shore end of the inner ones."""
    a = Accs()
    w, h = SEGS[i]
    L = SEG_LEN
    hw = w / 2
    obox(a["bdeck"], (0, L / 2, -.18), (w - .3, L, .36), 0)
    flat_y = [(x, y, .005) for x, y in ((-hw + .3, 0), (hw - .3, 0), (hw - .3, L), (-hw + .3, L))]
    a["bwalk"].facing(flat_y, [(0, 1, 2, 3)], lambda c: (0, 0, 1))
    n = 6
    for s in (-1, 1):
        x = s * hw
        for z in (-.45, 1.15):                                                             # chords
            obox(a["truss"], (x, L / 2, z), (.18, L, .2), 0)
        for j in range(n + 1):
            obox(a["truss"], (x, L * j / n, .35), (.16, .14, 1.6), 0)
        for j in range(n):                                                                 # diagonals
            y0, y1 = L * j / n, L * (j + 1) / n
            p, q = (Vector((x, y0, -.4)), Vector((x, y1, 1.1))) if j % 2 == 0 else (Vector((x, y0, 1.1)), Vector((x, y1, -.4)))
            K.pipe(a["truss"], [tuple(p), tuple(q)], .06, None, 6)
        vs = [(x - s * .1, y, z) for z in (.05, 1.05) for y in (0, L)]
        a["glass"]._push(vs, [(0, 1, 3, 2)])
        for j in range(n + 1):                                                             # roof posts
            obox(a["truss"], (x, L * j / n, (1.15 + h) / 2), (.1, .1, h - 1.15), 0)
        obox(a["truss"], (x, L / 2, h), (.14, L, .14), 0)
    for j in range(n + 1):
        obox(a["truss"], (0, L * j / n, h + .02), (w, .12, .12), 0)
    vs = [(-hw, 0, h + .1), (hw, 0, h + .1), (hw, L, h + .1), (-hw, L, h + .1)]
    a["glass"]._push(vs, [(0, 1, 2, 3)])
    obox(a["glowline"], (0, L / 2, h - .08), (.12, L - .4, .04), 0)
    if i:                                                                                  # comb joint plate at the overlap
        obox(a["joint"], (0, .6, .04), (w - .5, 1.2, .08), 0)
        for j in range(9):
            obox(a["joint_dark"], (-hw + .6 + j * (w - 1.2) / 8, .6, .085), (.06, 1.1, .02), 0)
    return a


def bridge_pose(dz):
    """Pose of the three segments for a float lift dz: turned about the shore hinge, telescoped so the float end
    lands on the seat. Returns (length, pitch_deg, [segment matrices])."""
    e = SEAT + Vector((0, 0, dz))
    d = e - HINGE
    L = d.length
    th = math.atan2(d.z, d.y)
    rot = Matrix.Rotation(th, 4, "X")
    starts = (0.0, (L - SEG_LEN) / 2, L - SEG_LEN)
    return L, math.degrees(th), [Matrix.Translation(HINGE) @ rot @ Matrix.Translation((0, s, 0)) for s in starts]


# --- water ----------------------------------------------------------------------------------------------------------------------
def water():
    a = Accs()
    flat(a["water"], DISC_R + .03, SITE_R, 0.0, step=1.5)
    return a


# --- materials ------------------------------------------------------------------------------------------------------------------
def mat(name, hexc, rough=.6, metal=0.0, alpha=1.0, emit=None, strength=1.0, culling=True):
    m = G.material("q11b_" + name, srgb(hexc, alpha), rough, srgb(emit) if emit else None, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


def inner(name, hexc, rough, lit):
    return mat(name, hexc, rough, emit=hexc, strength=lit)


def make_materials():
    K.MATS.clear()
    K.MATS.update({
        "hull": mat("float_white", "EEEAE3", .45, .05), "hull_low": mat("float_low", "B9BDB8", .6),
        "seam": mat("seam_grey", "A5A9A8", .5, .2), "deck": mat("deck_paving", "DCD6CB", .8),
        "glowline": mat("pale_light", "D5F1FF", .4, emit="A9E2FF", strength=2.2),
        "slab": mat("slab_white", "F1EFEA", .45), "fascia": mat("slab_fascia", "F7F6F2", .35, .05),
        "glass_front": mat("front_glass", "C3E0E8", .04, .1, alpha=.2, culling=False),
        "glass": mat("rail_glass", "CBE6EC", .05, alpha=.22, culling=False),
        "mullion": mat("mullion_silver", "D7DCDD", .3, .6), "doorframe": mat("door_frame", "6B767C", .35, .6),
        "handle": mat("door_handle", "B8BEC0", .25, .9), "column": mat("column_white", "F3F2EE", .4),
        "beam": mat("beam_white", "E7E4DD", .5),
        "floor": inner("floor_oak", "8E6A48", .55, .16), "ceiling_light": mat("ceiling_light", "FFF1D8", .5, emit="FFE7C2", strength=3.0),
        "desk": inner("desk_oak", "B78F62", .5, .25), "desk_top": inner("desk_top", "EFE9DF", .4, .3),
        "terrace": mat("terrace_paving", "D3CCBF", .8), "ext_step": mat("ext_step", "E9E4DA", .7), "planter": mat("planter_white", "ECE9E2", .55),
        "soil": mat("soil", "6B5138", .95), "hedge": mat("hedge", "5E8C3D", .9),
        "rail": mat("rail_steel", "D9DDDE", .3, .6), "stair": mat("stair_oak", "D8C3A0", .55),
        "skylight": mat("skylight_glass", "CBE8F0", .04, alpha=.3, culling=False), "frame": mat("frame_silver", "DDE2E3", .3, .6),
        "canopy": mat("canopy_white", "F5F4F0", .4), "portal": mat("portal_white", "F2F1EC", .4),
        "arm": mat("arm_white", "E4E2DC", .4, .2), "carriage": mat("carriage_steel", "A9B3B8", .3, .8),
        "wheel": mat("roller", "3E4649", .5, .3), "pin": mat("pin_steel", "C9CFD1", .2, .9),
        "pillar": mat("pillar_metal", "D3D9DC", .25, .85), "plinth": mat("pillar_plinth", "BFC3C1", .7),
        "cap": mat("pillar_cap", "E6EAEB", .25, .8), "rail_guide": mat("guide_rail", "9DA8AE", .25, .9),
        "scale": mat("scale_mark", "E6F3FA", .4, emit="CFEAFF", strength=1.2), "scale_minor": mat("scale_minor", "D2E6F0", .4, emit="BFE0F5", strength=.6),
        "stain": mat("water_line_stain", "7E8A7E", .9), "stain_low": mat("submerged_film", "A9B5A6", .9),
        "bdeck": mat("bridge_deck", "C9CDCD", .6, .3), "bwalk": mat("bridge_walk", "D8D4CB", .8),
        "truss": mat("bridge_truss", "E3E7E8", .3, .7), "joint": mat("joint_plate", "8E989C", .4, .8),
        "joint_dark": mat("joint_comb", "4F575B", .5, .6), "hinge": mat("hinge_steel", "8E989C", .35, .8),
        "abut": mat("abutment", "E2DED6", .7), "ramp": mat("ramp_stone", "DCD7CE", .75),
        "poolfloor": mat("pool_floor", "B7DCD3", .85), "poolseam": mat("pool_seam", "8FBDB5", .85),
        "quay": mat("quay_stone", "E1DDD5", .7), "paving": mat("shore_paving", "D9D3C8", .85), "lawn": mat("lawn", "7FA650", .9),
        "coping": mat("coping", "EEEBE4", .55), "step": mat("plaza_step", "E8E4DC", .7), "landing": mat("plaza_landing", "DED8CD", .75),
        "water": mat("water", "4DB5C6", .02, .0, alpha=.36, culling=False),
    })
    for role, (rgba, emit, strength) in M.ROLES.items():
        leafy = role in ("leaf_l", "green")
        m = G.material("q11b_in_" + role, rgba, .6, emit, strength)
        m.use_backface_culling = not leafy and rgba[3] >= 1
        K.MATS["in_" + role] = m
    return K.MATS


# --- trees ------------------------------------------------------------------------------------------------------------------------
def tree_mesh(seed, h=None):
    a, rng = Accs(), random.Random(seed)
    h = h or (5.5, 6.8, 4.8)[seed % 3]
    cr = h * .40
    M.leafy_tree(K.ctx(a, rng), (0, 0, 0), h=h, crown=cr * .9, trunk="wood", roles=("leaf_l", "green"), core="green", n=40, size=.4, branches=5)
    for i in range(5):
        t, rr = i * 2.4 + rng.uniform(-.3, .3), (0 if i == 0 else cr * rng.uniform(.45, .62))
        c = (rr * math.cos(t), h * (.84 if i == 0 else rng.uniform(.62, .78)), rr * math.sin(t))
        q = cr * rng.uniform(.46, .60)
        G.blob(K.Three(a["in_green" if i % 2 else "in_leaf_l"]), c, (q, q * .8, q), sub=2, seed=seed * 7 + i, noise=.30, flat=.8)
        M.leaf_clump(K.ctx(a, rng), c, (q * 1.08, q * .9, q * 1.08), ("leaf_l", "green"), None, 40, .42, .3, 1)
    return K.build_mesh("q11b_tree_%d" % seed, a, 180)


def terrace_tree_spots():
    """Trees on the deeper parts of the terraces (inside planter runs, where the glass sits furthest back)."""
    out = []
    for k in range(1, 5):
        Ro = TIERS[k - 1]
        for a0, a1 in planter_arcs(k):
            for b in (a0 + 6, (a0 + a1) / 2, a1 - 6):
                if TIERS[k] - glass_r(k, b) > 1.8 or b == (a0 + a1) / 2:
                    out.append((k, pol(Ro - 1.1, b, zf(k) + .9)))
    for b in range(0, 360, 45):                                                            # float deck planters
        if abs(math.remainder(b + 16 - 270, 360)) >= 22:
            out.append((0, pol(DISC_R - 2.6, b + 16, DISC_TOP + .8)))
    return out


# --- preview staging ------------------------------------------------------------------------------------------------------------
def preview(col, trees, rng):
    mk = lambda n, h, r=.8, **k: K.MATS.setdefault("pv_" + n, mat("pv_" + n, h, r, **k))  # noqa: E731
    mk("sea", "2F86A8", .04)
    mk("land", "9DB07A", .95)
    mk("walk", "D6D0C4", .85)
    mk("far", "BDCBD6", .9)
    mk("farw", "E3E9EC", .8)
    mk("storm", "7D8896", 1.0)
    a = Accs()
    loft(a["pv_sea"], [[(-7000, -200, z), (7000, -200, z), (7000, 9000, z), (-7000, 9000, z)] for z in (-6, -.06)])
    for a0, a1 in gaps(0, 360, [SEA_OPEN]):                                                 # land round the site
        for i in range(int((a1 - a0) / 4)):
            b0, b1 = a0 + i * (a1 - a0) / int((a1 - a0) / 4), a0 + (i + 1) * (a1 - a0) / int((a1 - a0) / 4)
            sector(a["pv_land"], SITE_R, 600 if 200 < (b0 + b1) / 2 % 360 < 340 else 260, b0, b1, POOL_Z, WALK_Z - .02, 4)
    for s in (-1, 1):                                                                      # piers along the channel
        b = SEA_OPEN[0] if s < 0 else SEA_OPEN[1]
        sector(a["pv_walk"], SITE_R, 260, b - 2, b, POOL_Z, WALK_Z, 1)
    for i in range(240):
        x = rng.uniform(-4500, 4500)
        y = rng.uniform(2300, 3100)
        h = rng.uniform(15, 70) * (2.4 if rng.random() < .1 else 1)
        w = rng.uniform(20, 50)
        K.box(a["pv_far"], x, x + w, y, y + w, -2, h)
    loft(a["pv_far"], [[(-6500, 2400, z), (6500, 2400, z), (6500, 3500, z), (-6500, 3500, z)] for z in (-2.2, 5)])
    bx, by = Vector((-2600.0, 2200.0)), Vector((-900.0, 2500.0))                            # suspension bridge, left
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
        K.pipe(a["pv_farw"], [Vector(along(.15 + .7 * i / 24, 34 + 72 * (2 * i / 24 - 1) ** 2, s)) for i in range(25)], 1.0, 1.0, 5)
    for i in range(12):                                                                    # storm band low on the far horizon, right
        x = rng.uniform(2500, 7500)
        G.blob(a["pv_storm"], (x, rng.uniform(10500, 12000), rng.uniform(120, 240)), (rng.uniform(700, 1200), 350, rng.uniform(110, 200)),
               sub=4, seed=i, noise=.14, flat=.5)
    ob = bpy.data.objects.new("PV_Context", K.build_mesh("pv_context", a))
    col.objects.link(ob)
    n = 0
    while n < 220:
        r, d = rng.uniform(SITE_R + 4, 250), rng.uniform(0, 360)
        if SEA_OPEN[0] - 4 < d < SEA_OPEN[1] + 4 or abs(math.remainder(d - 270, 360)) < 8:
            continue
        t = bpy.data.objects.new("PV_Tree_%03d" % n, trees[n % 3])
        t.location = tuple(pol(r, d, WALK_Z))
        t.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        t.scale = (rng.uniform(1.0, 1.5),) * 3
        col.objects.link(t)
        n += 1


# --- checks -------------------------------------------------------------------------------------------------------------------------
def state_checks():
    out = {}
    for name, (frame, dz) in STATES.items():
        L, pitch, ms = bridge_pose(dz)
        shore_end = ms[0] @ Vector((0, 0, 0))
        float_end = ms[2] @ Vector((0, SEG_LEN, 0))
        seat = SEAT + Vector((0, 0, dz))
        overl = [round(SEG_LEN - ((L - SEG_LEN) / 2), 3), round(((L - SEG_LEN) / 2 + SEG_LEN) - (L - SEG_LEN), 3)]
        out[name] = {
            "water_z": dz, "float_top_z": DISC_TOP + dz, "float_bottom_z": DISC_BOT + dz,
            "freeboard_m": DISC_TOP + dz - dz, "ground_storey_floor_above_water_m": round(DISC_TOP + dz - dz, 2),
            "bridge_length_m": round(L, 3), "bridge_pitch_deg": round(pitch, 2),
            "shore_end_gap_m": round((shore_end - HINGE).length, 4), "float_end_gap_m": round((float_end - seat).length, 4),
            "segment_overlaps_m": overl,
            "hinge_clear_above_water_m": round(HINGE.z - dz, 2),
            "plaza_levels_under_water": [z for z in PLAZA_LEVELS if z < dz], "plaza_levels_dry": [z for z in PLAZA_LEVELS if z >= dz],
            "roof_z": zf(5) + dz,
        }
    out["pillar_top_above_roof_high_m"] = round(PILLAR_TOP - out["high"]["roof_z"], 2)
    out["pillars"] = {n: [round(v, 2) for v in pol(PILLAR_R, b).xy] for n, b in PILLARS}
    out["slider_rail_face_r_m"] = PILLAR_R - PILLAR_RAD - .3
    return out


# --- assembly -----------------------------------------------------------------------------------------------------------------------
def constant_keys(ob):
    act = ob.animation_data.action if ob.animation_data else None
    if act is None:
        return
    curves = []
    if hasattr(act, "fcurves"):
        curves = list(act.fcurves)
    else:                                                                                  # layered actions (Blender 4.4+)
        for layer in act.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    curves += list(bag.fcurves)
    for fc in curves:
        for kp in fc.keyframe_points:
            kp.interpolation = "CONSTANT"


def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    rng = random.Random(2127)
    col = bpy.data.collections.new("Q11B_Asset")
    prev = bpy.data.collections.new("Q11B_Preview")
    scene.collection.children.link(col)
    scene.collection.children.link(prev)
    root = bpy.data.objects.new(ROOT, None)
    col.objects.link(root)
    groups = {}
    for g in ("SITE", "PILLARS", "WATER", "FLOAT", "BRIDGE"):
        e = bpy.data.objects.new(g, None)
        c = bpy.data.collections.new("Q11B_" + g)
        col.children.link(c)
        c.objects.link(e)
        e.parent = root
        groups[g] = (e, c)

    def add(name, accs, g, smooth_deg=30, mw=None, data=None):
        ob = bpy.data.objects.new(name, data or K.build_mesh("q11b_" + name.lower(), accs, smooth_deg))
        groups[g][1].objects.link(ob)
        ob.parent = groups[g][0]
        if mw is not None:
            ob.matrix_local = mw
        return ob

    add("SITE_GROUND", site(rng), "SITE")
    for n, b in PILLARS:
        add("PILLAR_" + n, pillar(n, b), "PILLARS", 40)
    add("WATER_SURFACE", water(), "WATER")
    add("FLOAT_HULL", hull(), "FLOAT", 40)
    for k in range(5):
        add("FLOAT_STOREY_%d" % (k + 1), storey(k, rng), "FLOAT")
    add("FLOAT_ATRIUM", atrium(rng), "FLOAT")
    add("FLOAT_ROOF", roof(rng), "FLOAT")
    add("FLOAT_PORCH", porch(), "FLOAT")
    add("FLOAT_SLIDERS", sliders(), "FLOAT", 40)
    trees = [tree_mesh(s) for s in range(3)]
    small = [tree_mesh(10 + s, 3.6 + s * .5) for s in range(3)]
    for i, (k, p) in enumerate(terrace_tree_spots()):
        add("FLOAT_TREE_%02d" % (i + 1), None, "FLOAT", data=small[i % 3],
            mw=Matrix.Translation(p) @ Matrix.Rotation(rng.uniform(0, 6.28), 4, "Z") @ Matrix.Scale(rng.uniform(.9, 1.15), 4))
    n = 0
    while n < 30:                                                                          # shore trees
        r, d = rng.uniform(84, SITE_R - 3), rng.uniform(0, 360)
        if SEA_OPEN[0] - 3 < d < SEA_OPEN[1] + 3 or (PLAZA[0] - 2 < d < PLAZA[1] + 2 and r < 100) or abs(math.remainder(d - 270, 360)) < 10:
            continue
        add("SITE_TREE_%02d" % (n + 1), None, "SITE", data=trees[n % 3],
            mw=Matrix.Translation(pol(r, d, WALK_Z)) @ Matrix.Rotation(rng.uniform(0, 6.28), 4, "Z") @ Matrix.Scale(rng.uniform(1.1, 1.4), 4))
        n += 1
    m = 0
    for a0, a1 in gaps(0, 360, [SEA_OPEN, (PLAZA[0] - 3, PLAZA[1] + 3)]):                    # a row of trees along the shore walk
        for j in range(int((a1 - a0) / 7.5)):
            m += 1
            add("SITE_WALK_TREE_%02d" % m, None, "SITE", data=trees[m % 3],
                mw=Matrix.Translation(pol(74.5, a0 + 3.75 + j * 7.5, WALK_Z)) @ Matrix.Rotation(rng.uniform(0, 6.28), 4, "Z") @ Matrix.Scale(1.05, 4))
    segs = [add("BRIDGE_SEG_%d" % (i + 1), bridge_segment(i), "BRIDGE") for i in range(3)]
    preview(prev, trees, rng)

    # the two water states on frames 1 (normal) and 2 (high tide)
    fl, wa = groups["FLOAT"][0], bpy.data.objects["WATER_SURFACE"]
    for name, (frame, dz) in STATES.items():
        fl.location = (0, 0, dz)
        fl.keyframe_insert("location", frame=frame)
        wa.location = (0, 0, dz)
        wa.keyframe_insert("location", frame=frame)
        for ob, mw in zip(segs, bridge_pose(dz)[2]):
            ob.matrix_basis = mw
            ob.keyframe_insert("location", frame=frame)
            ob.keyframe_insert("rotation_euler", frame=frame)
    for ob in [fl, wa] + segs:
        constant_keys(ob)
    scene.frame_start, scene.frame_end = 1, 2
    for name, (frame, _dz) in STATES.items():
        scene.timeline_markers.new("NORMAL_WATER" if name == "normal" else "HIGH_TIDE", frame=frame)
    scene.frame_set(STATES["high"][0])
    bpy.context.view_layer.update()

    asset = [o for o in col.all_objects]
    by_group = {g: sum(K.tris(o.data) for o in groups[g][1].objects if o.type == "MESH") for g in groups}
    report = {"tris_by_group": by_group, "tris_total": sum(by_group.values()),
              "unique_mesh_tris": sum(K.tris(m) for m in {o.data for o in asset if o.type == "MESH"}),
              "objects": len(asset), "unique_meshes": len({o.data.name for o in asset if o.type == "MESH"}),
              "materials": len({m.name for o in asset if o.type == "MESH" for m in o.data.materials})}
    import review_floating_civic as RV
    RV.stage(scene, prev)
    scene.frame_set(STATES["high"][0])
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, ASSET + ".blend"), compress=True)
    if "--no-export" not in ARGS:
        glb = os.path.join(HERE, ASSET + ".glb")
        for ob in bpy.data.objects:
            ob.select_set(False)
        for ob in asset:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = root
        bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                                  export_animations=False, export_cameras=False, export_lights=False, export_extras=True,
                                  export_materials="EXPORT", export_current_frame=True)   # frame 2: high tide
        report["glb_bytes"] = os.path.getsize(glb)
    report["states"] = state_checks()
    with open(os.path.join(HERE, "report.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps(report))


if __name__ == "__main__":
    main()
