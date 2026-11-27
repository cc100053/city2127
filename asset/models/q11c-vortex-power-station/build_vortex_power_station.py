"""Q11-C 台場白渦發電所 (Odaiba white-vortex power station): a low round station whose curved white guide walls turn
typhoon wind into a standing white vortex (reference: Q04・Q10・Q11 一覧 PDF p.7, image C; dimensions: Q11-C_Design.md).

Run:  blender -b --factory-startup --python-exit-code 1 -P build_vortex_power_station.py [-- --no-export]
Writes q11c-vortex-power-station.blend (asset + preview staging), .glb (asset only) and report.json beside this file.
No human figures: stairs, rails, doors, benches and lift heads give the scale.

Blender coordinates, real metres, origin = building centre on the ground (z 0), +y towards the sea, main view from the
land side (-y). Bearings in degrees, counter-clockwise from +x; seen from above the wind and the vortex both turn
counter-clockwise (the reference's vane tips and cloud streaks rise to the right on the land side).
- Podium r 60, deck z 3. Turbine gallery z 3-12 (blue-grey back wall r 48.5 with blue light strips, soffit to r 51); above it the drum face leans in
  from r 51 to the rim r 47.4 at z 35.9.
- 36 guide walls, one every 10 deg: a cambered wing section (round leading edge outside, sharp trailing edge on the drum),
  foot outer edge r 58.5, tip r 48 at z 40, turned half a bay (+5 deg) counter-clockwise from foot to tip. Below z 9 the
  foot stands free in front of the gallery (3.2 m deep), so the turbine behind it shows; walls thin from 3.5 m at the
  foot to 0.35 m at the tip.
- 34 ducted turbines (r 52, z 7, 6 m rotor) on the channel line between two walls, axis turned 12 deg into the incoming
  flow; the main entrance on the land side (bearing 271) takes two bays: portal walls, canopy, door frame and the stair
  hall behind it; its wall (bearing 270) starts on the portal roof.
- Roof: viewing walkway r 34-41 at z 35 with a continuous rail on the centre side, an outer band to the rim with three
  stair/lift cores (271, 30, 150); inside the walkway the roof steps down in five spiral-ribbed rings to a nozzle collar
  whose lip (z 37) rings the 40 m throat (clear r 20) over a dark vortex chamber.
- Vortex from the throat (r 20 at z 37), narrow low down and widening to r 29 at z 126 (a trumpet), into a thin disc
  cloud (dense r 36, wisps fading out to r 57, inside the 60 m building radius); three level metal rings (inner r 25 / 28 /
  32 at z 57 / 83 / 109, 0.6 m tube). Its body is nine cloud ropes of unequal, swelling thickness round a bluish core, under
  translucent bands and a faint mist shell; every part carries a generated, UV-mapped strand texture (the disc cloud a
  counter-clockwise log spiral), so the spiral reads in the GLB without any Blender volume.
- Plaza: entrance stair with a parallel ramp to the same landing, planters, paved ring, lawn with a ring path on the sea
  side; benches and planters only beside the entrance.

Nodes (Q11C_VortexPowerStation > STATION, ROTORS, RINGS, VORTEX, CLOUD, PLAZA): VANE_### and TURBINE_HOUSING_### /
TURBINE_ROTOR_### (### = bearing of the bay's wall) share one mesh each (linked duplicates); a rotor spins about its local
+x (its duct axis); RING_LOW / MID / HIGH and the vortex parts have their origin on the axis. Preview staging (sea, far
shore, bridge, storm band, park trees) is collection Q11C_Preview and is never exported. Primitives and the library hook
(kit bench, leafy_tree) come from the Q04-A builder's parts.py, as Q10-A and Q11-C R1 do.
"""
import importlib.util
import json
import math
import os
import random
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True       # Q04-A's __pycache__ is tracked: loading its parts.py must not rewrite it
HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)
sys.path.insert(0, HERE)
_spec = importlib.util.spec_from_file_location("q04a_parts", os.path.join(MODELS, "q04a-suspended-pod-tower", "parts.py"))
K = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(K)
G, M = K.G, K.M
Accs, loft, obox, lathe, ring, sector, beam, srgb = K.Accs, K.loft, K.obox, K.lathe, K.ring, K.sector, K.beam, K.srgb

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ASSET = "q11c-vortex-power-station"
ROOT = "Q11C_VortexPowerStation"

N, STEP = 36, 10.0                    # guide walls / bays
SITE_R, PODIUM_Z = 60.0, 3.0          # podium edge and deck level
GAL_TOP, GAL_BACK, SOFFIT_R = 12.0, 48.5, 51.0
RIM_R, RIM_Z = 47.4, 35.9             # drum rim (outer parapet)
DECK_Z = 35.0                         # roof walkway level
WALK_IN, WALK_OUT = 34.0, 41.0
THROAT_R, LIP_Z = 20.0, 37.0
DISH_IN, DISH_LOW = 23.8, 33.0        # roof rings step down from the walkway to the collar foot
VANE_Z0, VANE_TOP = PODIUM_Z - .1, 40.0
VANE_FOOT_R, VANE_TOP_R = 58.5, 48.0
VANE_ALPHA, VANE_TWIST = 47.0, 5.0    # wing angle off radial (inner end leads counter-clockwise); turn foot -> tip
FOOT_DEPTH = 3.2                      # radial depth of the free foot (below z 9)
TURB_R, TURB_Z, TURB_RAD = 52.0, 7.0, 3.0
TURB_OFF, TURB_YAW = 6.8, 12.0        # turbine bearing inside the bay; axis turned clockwise, facing the inflow
ENTRY = 270.0                         # the wall over the portal; bays 260 and 270 are the entrance
PORTAL = (262.8, 279.3)               # portal side walls (bearings)
ENTRY_AX = 271.0                      # entrance axis: stair, canopy, roof exit
V_Z0, V_Z1, V_R0, V_R1 = 37.0, 126.0, 20.0, 29.0
RINGS = (("LOW", 25.0, 57.0), ("MID", 28.0, 83.0), ("HIGH", 32.0, 109.0))   # (name, inner radius, height)
RING_TUBE = .3                        # tube radius (0.6 m section)
CLOUD_R, CLOUD_Z, WISP_R = 36.0, 126.5, 57.0   # dense disc (72 m), fading wisps (< building diameter)
CORES = (ENTRY_AX, 30.0, 150.0)       # roof stair/lift cores
STAIR_W, RISE, TREAD = 12.0, .15, .32
RAMP = (315.5, 284.5, 66.4, 69.8)     # foot bearing, top bearing, inner and outer radius
LANDING = (277.4, 286.5)
PLANTER = (60.6, 64.6)
PAVE_R, LAWN_R = 76.0, 140.0
PATHS = (ENTRY_AX, 211.0, 331.0, 31.0, 91.0, 151.0)
RAIL_H = 1.1


def pol(r, deg, z=0.0):
    a = math.radians(deg)
    return Vector((r * math.cos(a), r * math.sin(a), z))


def smooth(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


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


def rail_arc(a, r, z, a0, a1, step=3.0, glass=True):
    """Balustrade on an arc: glass panel, round handrail, posts."""
    n = max(2, int(abs(a1 - a0) / 1.0))
    if glass:
        rows = [[tuple(pol(r, a0 + (a1 - a0) * i / n, zz)) for i in range(n + 1)] for zz in (z + .08, z + RAIL_H - .05)]
        m = n + 1
        a["glass"]._push(rows[0] + rows[1], [(i, i + 1, m + i + 1, m + i) for i in range(n)])
    K.pipe(a["rail"], [tuple(pol(r, a0 + (a1 - a0) * i / n, z + RAIL_H)) for i in range(n + 1)], .045, None, 6)
    k = max(1, int(abs(a1 - a0) * math.radians(1) * r / step))
    for i in range(k + 1):
        radial_box(a["rail"], a0 + (a1 - a0) * i / k, r, z + RAIL_H / 2, (.07, .07, RAIL_H))


def rail_line(a, p0, p1, z0, z1=None, step=2.0):
    """Straight railing from p0 (at z0) to p1 (at z1): handrail and posts, no glass."""
    z1 = z0 if z1 is None else z1
    n = max(1, int((p1 - p0).length / step))
    pts = [p0.lerp(p1, i / n) for i in range(n + 1)]
    K.pipe(a["rail"], [(p.x, p.y, z0 + (z1 - z0) * i / n + RAIL_H) for i, p in enumerate(pts)], .045, None, 6)
    for i, p in enumerate(pts):
        z = z0 + (z1 - z0) * i / n
        obox(a["rail"], (p.x, p.y, z + RAIL_H / 2), (.07, .07, RAIL_H), 0)


# --- guide walls ----------------------------------------------------------------------------------------------------------
def drum_r(z):
    """Drum face radius above the gallery: leans in from the soffit edge to the rim."""
    t = min(max((z - GAL_TOP) / (RIM_Z - .4 - GAL_TOP), 0.0), 1.0)
    return SOFFIT_R - (SOFFIT_R - RIM_R) * t ** .9


def vane_z(u):
    return VANE_Z0 + (VANE_TOP - VANE_Z0) * u


def vane_section(u, base=0.0, grow=0.0):
    """Horizontal section of the wall rooted at bearing `base`, at height fraction u (0 foot .. 1 tip): a cambered wing,
    round leading edge on the outside (r_o), sharp trailing edge running into the drum (or free, at the foot); `grow`
    thickens it (base shoe, seam bands)."""
    z = vane_z(u)
    r_o = VANE_TOP_R + (VANE_FOOT_R - VANE_TOP_R) * (1 - u ** 1.7)
    attach = drum_r(z) - .6
    r_i = r_o - FOOT_DEPTH + (attach - (r_o - FOOT_DEPTH)) * smooth(10.8, 14.8, z)
    if z > RIM_Z - .4:                                                  # above the rim: a free tip curling over the deck
        r_i = r_o - max(.45, (r_o - attach) * (1 - smooth(RIM_Z - .4, VANE_TOP, z) ** .8))
    th = .35 + 3.1 * (1 - u) ** .85
    tw = base + VANE_TWIST * smooth(0, 1, u)
    m = 14
    cl = []
    for j in range(m):
        s = (j / (m - 1)) ** 1.5
        r = r_o + (r_i - r_o) * s
        off = (r_o - r_i) * math.tan(math.radians(VANE_ALPHA)) * s ** 1.25
        cl.append((s, pol(r, tw + math.degrees(off / r), z)))
    side, back = [], []
    for j, (s, p) in enumerate(cl):
        d = (cl[min(j + 1, m - 1)][1] - cl[max(j - 1, 0)][1]).normalized()
        n = Vector((-d.y, d.x, 0))
        f = max(.06, (s ** .5) * (1 - s) ** .85 / .41)
        h = th * f / 2 + grow
        side.append(tuple(p + n * h))
        back.append(tuple(p - n * h))
    return side + back[::-1]


def vane_us(z0=VANE_Z0, k=36):
    u0 = (z0 - VANE_Z0) / (VANE_TOP - VANE_Z0)
    return [u0 + (1 - u0) * (1 - (1 - j / k) ** 1.25) for j in range(k + 1)]


def vane(z0=VANE_Z0):
    """One guide wall at bearing 0 (shared by 35 walls); z0 > foot: the entrance wall, starting on the portal roof."""
    a = Accs()
    us = vane_us(z0)
    loft(a["vane"], [vane_section(u) for u in us])
    u = us[0]
    loft(a["seam"], [vane_section(u, grow=.14), vane_section(u + .012, grow=.14)])           # base shoe
    for uu in (.3, .52, .74):                                                                # panel joints
        if uu > u + .02:
            loft(a["seam"], [vane_section(uu, grow=.02), vane_section(uu + .0035, grow=.02)])
    if z0 <= VANE_Z0 + .01:                                                                  # inspection door, foot flank
        sec = vane_section(.06)
        half = len(sec) // 2
        p, q = Vector(sec[half + 5]), Vector(sec[half + 7])
        t = (q - p).normalized()
        c = (p + q) / 2
        n = Vector((t.y, -t.x, 0))
        obox(a["door"], tuple(c + n * .03 + Vector((0, 0, 1.25 - (c.z - PODIUM_Z)))), (1.0, .08, 2.2), math.atan2(t.y, t.x))
        obox(a["glowline"], tuple(c + n * .06 + Vector((0, 0, 2.5 - (c.z - PODIUM_Z)))), (1.0, .05, .07), math.atan2(t.y, t.x))
    return a


# --- turbines (turbine-local frame: origin = rotor centre, +x = axis pointing out of the duct, +z up) --------------------
def rev_x(acc, prof, n=36, wrap=False):
    """Solid of revolution of (r, x) points round the local x axis."""
    loft(acc, [[(x, max(r, 1e-4) * math.cos(2 * math.pi * j / n), max(r, 1e-4) * math.sin(2 * math.pi * j / n)) for j in range(n)]
               for r, x in prof], wrap=wrap)


def arc_band_x(acc, r0, r1, a0, a1, x0, x1, n=18):
    """Part of a tube wall (radii r0..r1, angles a0..a1 deg round +x) between x0 and x1: the hood over a duct."""
    sec = []
    for r in (r1, r0):
        angs = [a0 + (a1 - a0) * j / n for j in range(n + 1)]
        sec += [(r * math.cos(math.radians(q)), r * math.sin(math.radians(q))) for q in (angs if r == r1 else angs[::-1])]
    loft(acc, [[(x, y, z) for y, z in sec] for x in (x0, x1)])


def housing():
    """The static half of one turbine: duct lined in blue-grey metal, bell-mouth lip, hood, nacelle, stator, shaft support
    and equipment base."""
    a = Accs()
    R = TURB_RAD
    rev_x(a["duct"], [(R + .08, -3.3), (R + .4, -3.3), (R + .4, 1.4), (R + .08, 1.4)], 48, wrap=True)
    rev_x(a["cowl"], [(R + .08, 1.3), (R + .5, 1.3), (R + .78, 1.75), (R + .7, 2.05), (R + .3, 2.0), (R + .08, 1.65)], 48, wrap=True)
    rev_x(a["glowline"], [(R + .02, -.85), (R + .1, -.85), (R + .1, -.7), (R + .02, -.7)], 32, wrap=True)
    arc_band_x(a["hood"], R + .55, R + .85, 15, 165, -2.6, 2.3)
    rev_x(a["nacelle"], [(.001, -3.2), (.75, -3.15), (1.05, -2.5), (1.1, -.55), (.001, -.5)], 28)
    for k in range(4):                                                                     # stator struts
        q = math.radians(45 + 90 * k)
        d = Vector((0, math.cos(q), math.sin(q)))
        K.pipe(a["strut"], [tuple(Vector((-1.6, 0, 0)) + d * 1.0), tuple(Vector((-1.9, 0, 0)) + d * (R + .1))], .12, .09, 6)
    obox(a["strut"], (-1.8, 0, -2.1), (.8, .5, 1.9), 0)                                    # shaft support down to the duct
    zb = PODIUM_Z - TURB_Z
    obox(a["base"], (-1.0, 0, zb + .35), (5.4, 4.2, .7), 0)                               # equipment base
    for x in (-2.4, .6):                                                                   # cradles under the duct
        loft(a["base"], [[(x + dx, y, z) for y, z in ((-2.2, zb + .6), (2.2, zb + .6), (1.6, -(R + .3)), (-1.6, -(R + .3)))]
                         for dx in (-.3, .3)])
    return a


def rotor():
    """One rotor: axis = local +x, spinner forward; 11 thick twisted blades."""
    a = Accs()
    X = Vector((1, 0, 0))
    rev_x(a["hub"], [(.001, -.45), (.95, -.4), (1.0, .2), (.8, .75), (.42, 1.1), (.001, 1.2)], 28)
    nb = 11
    for k in range(nb):
        phi = 2 * math.pi * k / nb
        er, et = Vector((0, math.cos(phi), math.sin(phi))), Vector((0, -math.sin(phi), math.cos(phi)))
        secs = []
        for q in range(7):
            u = q / 6
            s = .9 + (TURB_RAD - .12 - .9) * u
            ch, p = 1.25 - .5 * u, math.radians(48 - 26 * u)
            cd, nd = et * math.cos(p) + X * math.sin(p), -et * math.sin(p) + X * math.cos(p)
            c = er * s
            tk = .09 - .04 * u
            secs.append([tuple(c + cd * (sx * ch / 2) + nd * (sy * tk * (1 if sx < 0 else .4))) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
        loft(a["blade"], secs)
    return a


def turbine_matrix(base):
    """Bay `base` (bearing of its wall) -> world matrix of its turbine frame."""
    b = base + TURB_OFF
    return Matrix.Translation(pol(TURB_R, b, TURB_Z)) @ Matrix.Rotation(math.radians(b - TURB_YAW), 4, "Z")


def gallery_bay():
    """Gallery fit-out of one bay (bay-local: wall at bearing 0): frame columns, lit lintel, louvres on the back wall."""
    a = Accs()
    for b, r in ((1.6, 50.4), (9.2, 50.4)):
        radial_box(a["frame"], b, r, (PODIUM_Z + GAL_TOP) / 2, (.45, .45, GAL_TOP - PODIUM_Z))
    K.sector(a["frame"], 50.2, 50.9, 1.6, 9.2, GAL_TOP - 1.1, GAL_TOP - .55, 1)
    K.sector(a["glowline"], 50.88, 50.95, 1.8, 9.0, GAL_TOP - .98, GAL_TOP - .86, 1)
    K.sector(a["glowline"], 50.88, 50.95, 1.8, 9.0, PODIUM_Z + .05, PODIUM_Z + .14, 1)
    for i in range(5):                                                                     # back-wall louvres
        z = PODIUM_Z + 1.2 + i * 1.6
        K.sector(a["louvre"], GAL_BACK - .02, GAL_BACK + .25, .4, 9.6, z, z + .35, 3)
    for b in (2.4, 8.4):                                                                   # blue light strips up the back wall
        radial_box(a["blue"], b, GAL_BACK + .05, (PODIUM_Z + GAL_TOP) / 2, (.1, .25, GAL_TOP - PODIUM_Z - 1.0))
    return a


# --- station: podium, drum, roof, throat ------------------------------------------------------------------------------------
def podium():
    a = Accs()
    lathe(a["podium"], [(.001, 0), (SITE_R, 0), (SITE_R, PODIUM_Z - .2), (SITE_R - .2, PODIUM_Z), (.001, PODIUM_Z)], 180)
    ring(a["deck"], GAL_BACK, SITE_R - .25, PODIUM_Z, PODIUM_Z + .03, 180)
    ring(a["glowline"], SITE_R, SITE_R + .06, PODIUM_Z - .55, PODIUM_Z - .45, 180)
    ring(a["chamber"], .0, THROAT_R + .5, PODIUM_Z, PODIUM_Z + .05, 96)                    # vortex chamber floor
    ring(a["glowline"], 8.0, 8.5, PODIUM_Z + .05, PODIUM_Z + .1, 96)
    ring(a["glowline"], 14.0, 14.3, PODIUM_Z + .05, PODIUM_Z + .1, 96)
    for a0, a1 in gaps(0, 360, [(PORTAL[0], PORTAL[1])]):                                 # dark gallery back wall (open at the entrance)
        sector(a["backwall"], GAL_BACK - .3, GAL_BACK, a0, a1, PODIUM_Z, GAL_TOP, 2)
    return a


def drum():
    a = Accs()
    zs = [GAL_TOP + (RIM_Z - .4 - GAL_TOP) * i / 16 for i in range(17)]
    prof = [(40.5, GAL_TOP), (GAL_BACK - .3, GAL_TOP)] + [(drum_r(z), z) for z in zs]
    prof += [(RIM_R - .15, RIM_Z), (RIM_R - .55, RIM_Z), (RIM_R - .55, DECK_Z), (40.5, DECK_Z)]
    lathe(a["drum"], prof, 180, wrap=True)
    ring(a["glowline"], SOFFIT_R - .05, SOFFIT_R + .03, GAL_TOP - .02, GAL_TOP + .16, 180)
    for z in (16.0, 20.0, 24.0, 28.0, 32.0):                                               # horizontal panel joints
        r = drum_r(z)
        ring(a["seam"], r - .05, r + .04, z, z + .12, 120)
    return a


def dish_z(r):
    """Roof ring level: five rings stepping down from the walkway (r 34) to the collar foot (r 24.2)."""
    k = min(4, int((WALK_IN - r) / ((WALK_IN - DISH_IN) / 5)))
    t = (WALK_IN - r) / ((WALK_IN - DISH_IN) / 5) - k
    return DECK_Z - .05 - k * .45 - .1 * t


def roof():
    a = Accs()
    w = (WALK_IN - DISH_IN) / 5
    for k in range(5):                                                                     # stepped rings
        r1, r0 = WALK_IN - k * w, WALK_IN - (k + 1) * w
        z1 = DECK_Z - .05 - k * .45
        lathe(a["roof"], [(r0, z1 - .12 - 1.2), (r1 + (.3 if k else 0), z1 - 1.2), (r1 + (.3 if k else 0), z1), (r1 - .25, z1 + .02),
                          (r0 + .05, z1 - .12)], 180, wrap=True)
        if k:
            ring(a["seam"], r1 - .3, r1 - .18, z1 - .02, z1 + .04, 120)
    for j in range(36):                                                                    # spiral ribs, turning inwards
        pts = []
        for q in range(15):
            u = q / 14
            r = WALK_IN - .6 - (WALK_IN - DISH_IN - .9) * u
            pts.append(tuple(pol(r, j * 10.0 + 4.0 + 48.0 * u ** 1.15, dish_z(r) + .2)))
        beam(a["rib"], pts, 1.1, .95, .6, .5)
    # nozzle collar: white outside, dark blue-grey throat wall inside with guide seams
    lathe(a["collar"], [(DISH_IN + .2, DISH_LOW - .3), (DISH_IN - .2, DISH_LOW + .4), (22.9, 35.9), (22.3, 36.75), (21.4, LIP_Z),
                        (20.6, LIP_Z - .15), (20.1, LIP_Z - .7), (20.6, DISH_LOW - .3)], 180, wrap=True)
    ring(a["seam"], 23.1, 23.5, 35.0, 35.12, 180)
    lathe(a["throat"], [(THROAT_R + .9, PODIUM_Z), (THROAT_R + .9, LIP_Z - .9), (THROAT_R + .05, LIP_Z - .75), (THROAT_R, LIP_Z - 1.4),
                        (THROAT_R, PODIUM_Z)], 160, wrap=True)
    ring(a["glowline"], 21.2, 21.5, LIP_Z - .03, LIP_Z + .02, 180)
    for i in range(24):                                                                    # guide seams down the throat
        b0 = i * 15.0
        pts = [tuple(pol(THROAT_R - .08, b0 + 40 * (1 - (z - 4) / 31), z)) for z in np.linspace(4.0, LIP_Z - 1.6, 14)]
        K.pipe(a["throat_seam"], pts, .09, None, 5)
    for z in (9.0, 15.0, 21.0, 27.0, 33.0):
        ring(a["glowline"], THROAT_R - .06, THROAT_R - .01, z, z + .1, 120)
    return a


def deck():
    a = Accs()
    ring(a["walk"], WALK_IN, WALK_OUT, DECK_Z - .6, DECK_Z, 180)
    ring(a["walk_b"], WALK_OUT, RIM_R - .55, DECK_Z - .6, DECK_Z + .02, 180)
    ring(a["glowline"], WALK_OUT - .05, WALK_OUT + .08, DECK_Z + .02, DECK_Z + .04, 180)
    for i in range(120):                                                                   # paving joints across the walkway
        radial_box(a["seam"], i * 3.0, (WALK_IN + WALK_OUT) / 2 + .2, DECK_Z + .005, (WALK_OUT - WALK_IN - .6, .08, .02))
    rail_arc(a, WALK_IN + .15, DECK_Z, 0, 360)                                              # centre-side rail
    rail_arc(a, RIM_R - .35, RIM_Z, 0, 360)                                                 # outer rail on the rim
    holes = [(c - 7.5, c + 7.5) for c in CORES]
    for a0, a1 in gaps(0, 360, holes, 3):                                                   # low planters on the outer band
        for s in range(int((a1 - a0) / 8)):
            b = a0 + 4 + s * 8
            sector(a["coping"], 43.6, 45.4, b - 1.4, b + 1.4, DECK_Z, DECK_Z + .45, 1)
            sector(a["hedge"], 43.75, 45.25, b - 1.25, b + 1.25, DECK_Z + .45, DECK_Z + .8, 1)
    for c in CORES:
        core(a, c)
    return a


def core(a, b):
    """Stair/lift head on the outer band: glass hall (exit facing the walkway), a white lift shaft, a stair inside."""
    r0, r1, hw, z0, h = 41.6, 46.4, 3.8, DECK_Z, 3.6
    t = pol(1, b + 90)
    rc = (r0 + r1) / 2
    radial_box(a["drum"], b, rc, z0 + h + .2, (r1 - r0 + 1.4, 2 * hw + 1.4, .4))            # roof slab, overhang over the exit
    radial_box(a["glowline"], b, rc, z0 + h - .02, (r1 - r0 + 1.0, 2 * hw + 1.0, .06))
    for sr, st in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        p = pol(rc + sr * (r1 - r0) / 2, b) + t * (st * hw)
        obox(a["frame"], (p.x, p.y, z0 + h / 2), (.22, .22, h), math.radians(b))
    for st in (-1, 1):                                                                     # glass sides
        p = pol(rc, b) + t * (st * hw)
        obox(a["glass"], (p.x, p.y, z0 + h / 2), (r1 - r0, .05, h), math.radians(b))
    for r in (r0, r1):                                                                     # glass front (to the walkway) and back
        radial_box(a["glass"], b, r, z0 + h / 2, (.05, 2 * hw, h))
    # exit: a door in the counter-clockwise side, opening along the walkway, with a lit frame and a small canopy
    p = pol(rc - .5, b) + t * hw
    ang = math.radians(b)
    obox(a["frame"], (p.x, p.y, z0 + 2.55), (2.9, .3, .22), ang)
    for sr in (-1, 1):
        q = p + pol(1, b) * (sr * 1.4)
        obox(a["frame"], (q.x, q.y, z0 + 1.3), (.16, .3, 2.6), ang)
    for sr in (-1, 1):                                                                     # door leaves (frames only, glass between)
        q = p + pol(1, b) * (sr * .66)
        obox(a["doorframe"], (q.x, q.y, z0 + 1.25), (1.2, .08, .1), ang)
        obox(a["doorframe"], (q.x, q.y, z0 + 2.4), (1.2, .08, .1), ang)
    q = p + t * .9
    obox(a["drum"], (q.x, q.y, z0 + 2.9), (3.4, 1.9, .16), ang)
    obox(a["glowline"], (q.x, q.y, z0 + 2.81), (2.8, 1.5, .03), ang)
    obox(a["inner_floor"], tuple(pol(rc, b) + Vector((0, 0, z0 + .02))), (r1 - r0 - .1, 2 * hw - .1, .04), ang)
    q = pol(rc + .4, b) + t * (-hw * .45)                                                  # lift shaft
    obox(a["drum"], (q.x, q.y, z0 + h / 2 + .3), (3.2, 2.9, h + .6), ang)
    for sr in (-1, 1):
        qq = q + t * 1.48 + pol(1, b) * (sr * .55)
        obox(a["doorframe"], (qq.x, qq.y, z0 + 1.2), (1.0, .06, 2.3), ang)
    for k in range(10):                                                                    # stair down (seen through the glass)
        q = pol(r0 + .9 + k * .36, b) + t * (hw * .35)
        obox(a["step"], (q.x, q.y, z0 - .1 - k * .15), (.36, 2.2, .2), ang)
    obox(a["inner"], tuple(pol(rc, b) + t * (hw * .35) + Vector((0, 0, z0 - 1.6))), (r1 - r0 - .2, 2.6, .1), ang)


def entrance():
    """Main entrance (land side): portal walls dividing the walk from the wind channels, roof slab carrying the wall
    above, canopy, door frame and glazed doors, the stair hall behind them."""
    a = Accs()
    w0, w1 = PORTAL
    for b in (w0, w1):                                                                     # solid side walls
        rr = (50.4 + 58.8) / 2
        radial_box(a["portal"], b, rr, (PODIUM_Z + GAL_TOP) / 2 + .3, (58.8 - 50.4, .8, GAL_TOP - PODIUM_Z + .6))
    sector(a["portal"], 50.4, 58.8, w0 - .5, w1 + .5, GAL_TOP - .3, GAL_TOP + .6, 1)       # portal roof
    sector(a["glowline"], 58.78, 58.86, w0, w1, GAL_TOP - .12, GAL_TOP + .02, 1)
    sector(a["canopy"], 54.5, 63.8, ENTRY_AX - 6.4, ENTRY_AX + 6.4, 7.35, 7.7, 1)           # canopy
    sector(a["glowline"], 54.6, 63.7, ENTRY_AX - 6.2, ENTRY_AX + 6.2, 7.31, 7.35, 1)
    for s in (-1, 1):
        p = pol(63.2, ENTRY_AX + s * 5.6)
        K.lathe(a["frame"], [(.16, PODIUM_Z - .05), (.16, 7.35)], 12, p.x, p.y)
    rd = 50.6                                                                              # door line
    hw = math.degrees(7.2 / rd)
    sector(a["portal"], rd - .6, rd + .7, ENTRY_AX - hw - 1.0, ENTRY_AX + hw + 1.0, 10.6, GAL_TOP - .3, 1)   # door frame head
    for s in (-1, 1):
        radial_box(a["portal"], ENTRY_AX + s * (hw + .5), rd + .05, (PODIUM_Z + 10.6) / 2, (1.3, .9, 10.6 - PODIUM_Z))
    sector(a["glass"], rd - .03, rd + .03, ENTRY_AX - hw, ENTRY_AX + hw, PODIUM_Z, 10.6, .5)
    for k in range(9):                                                                     # mullions
        b = ENTRY_AX - hw + 2 * hw * k / 8
        radial_box(a["frame"], b, rd + .05, (PODIUM_Z + 10.6) / 2, (.18, .14, 10.6 - PODIUM_Z))
    sector(a["frame"], rd - .05, rd + .15, ENTRY_AX - hw, ENTRY_AX + hw, 6.05, 6.25, .5)
    for s in (-1, 1):                                                                      # door leaves
        radial_box(a["doorframe"], ENTRY_AX + s * 1.4, rd + .08, PODIUM_Z + 2.65, (.12, 2.6, .12))
        radial_box(a["doorframe"], ENTRY_AX + s * 2.7, rd + .08, PODIUM_Z + 1.3, (.12, .1, 2.6))
    # stair hall behind the doors
    sector(a["inner_floor"], 41.0, rd, ENTRY_AX - hw - .5, ENTRY_AX + hw + .5, PODIUM_Z - .05, PODIUM_Z + .02, .5)
    sector(a["inner"], 41.0, rd - .5, ENTRY_AX - hw - .5, ENTRY_AX + hw + .5, 11.3, 11.5, .5)
    sector(a["inner"], 40.6, 41.0, ENTRY_AX - hw - .5, ENTRY_AX + hw + .5, PODIUM_Z, 11.5, .5)
    for s in (-1, 1):
        radial_box(a["inner"], ENTRY_AX + s * (hw + .7), 45.8, 7.25, (9.6, .4, 8.5))
    for k in range(22):                                                                    # stair flight rising along the back
        b = ENTRY_AX - hw + .8 + k * (2 * hw - 5.5) / 22
        z = PODIUM_Z + .17 * (k + 1)
        radial_box(a["wood"], b, 42.4, z / 2 + PODIUM_Z / 2, (2.2, .5, z - PODIUM_Z))
    K.pipe(a["rail"], [tuple(pol(43.5, ENTRY_AX - hw + .8 + k * (2 * hw - 5.5) / 22, PODIUM_Z + .17 * (k + 1) + 1.0)) for k in range(0, 22, 3)], .04, None, 6)
    for s in (-1, 1):                                                                      # lift doors
        radial_box(a["frame"], ENTRY_AX + hw - 2.1 + s * 1.2, 41.1, PODIUM_Z + 1.3, (.12, 1.1, 2.6))
    radial_box(a["glowline"], ENTRY_AX + hw - 2.1, 41.1, PODIUM_Z + 2.8, (.08, 2.6, .1))
    for r in (43.0, 45.5, 48.0):
        sector(a["hall_light"], r, r + .35, ENTRY_AX - hw, ENTRY_AX + hw, 11.2, 11.3, .5)
    return a


# --- vortex textures --------------------------------------------------------------------------------------------------------
def fiber(w, h, seed, freqs=(3, 5, 8, 13, 21, 34, 55, 89), drift=.06, bend=(1, 2, 3)):
    """Tileable fibrous field (values 0..1): fibres run along x and vary across y; each frequency's phase drifts slowly
    along x, so strands merge, split and kink instead of running as even lines."""
    rng = np.random.default_rng(seed)
    x = (np.arange(w) + .5) / w
    y = (np.arange(h) + .5) / h
    X, Y = np.meshgrid(x, y)
    v = np.zeros((h, w), np.float32)
    tot = 0.0
    for f in freqs:
        amp = f ** -.55 * rng.uniform(.6, 1.2)
        ph = rng.uniform(0, 1)
        d = sum(rng.uniform(-drift, drift) * np.sin(2 * np.pi * (m * X + rng.uniform(0, 1))) for m in bend)
        v += amp * np.cos(2 * np.pi * (f * (Y + d) + ph))
        tot += amp
    v = v / tot
    v = (v - v.min()) / (v.max() - v.min())
    return v


def make_image(name, rgba):
    h, w = rgba.shape[:2]
    im = bpy.data.images.new(name, w, h, alpha=True)
    im.pixels[:] = np.ascontiguousarray(rgba[::-1]).ravel()
    im.file_format = "PNG"
    im.filepath_raw = "//" + name + ".png"
    im.pack()
    return im


def textures():
    """Cloud textures (all generated, packed into the .blend and embedded in the GLB)."""
    lo = np.array([.66, .74, .83])                                                        # blue-grey between the strands
    hi = np.array([1.0, 1.0, 1.0])
    out = {}
    v = fiber(512, 512, 1) * .65 + fiber(512, 512, 2, freqs=(21, 34, 55, 89, 144), drift=.03) * .35
    t = np.clip((v - .25) / .6, 0, 1) ** .9
    col = lo * .82 * (1 - t[..., None]) + hi * .93 * t[..., None]
    out["core"] = make_image("q11c_vortex_core", np.dstack([col, np.ones_like(v)]))
    v = fiber(512, 256, 11, freqs=(3, 5, 8, 13, 21, 34, 55), drift=.07)                  # cloud ropes: x along the rope
    t = np.clip((v - .15) / .65, 0, 1) ** .7
    col = lo * (1 - t[..., None]) + hi * t[..., None]
    out["rope"] = make_image("q11c_vortex_rope", np.dstack([col, np.ones_like(v)]))
    # cloud bands: x along the band, y across it; alpha fades to irregular edges
    v = fiber(1024, 256, 3, freqs=(4, 7, 11, 17, 27, 43, 69), drift=.05)
    y = (np.arange(256) + .5) / 256
    edge = fiber(1024, 1, 4, freqs=(2, 3, 5, 8), drift=0)[0] * .22
    e = np.clip(np.minimum(y[:, None] / (.2 + edge[None, :]), (1 - y[:, None]) / (.2 + edge[None, :])), 0, 1) ** 1.2
    t = np.clip((v - .2) / .65, 0, 1)
    col = lo * .45 + .55 + (1 - lo * .45 - .55) * t[..., None]
    out["band"] = make_image("q11c_vortex_band", np.dstack([col, np.clip(e * (.3 + .7 * t), 0, 1)]))
    # mist shell: faint strands
    v = fiber(512, 512, 5, freqs=(8, 13, 21, 34, 55), drift=.05)
    t = np.clip((v - .35) / .55, 0, 1)
    out["mist"] = make_image("q11c_vortex_mist", np.dstack([np.full((512, 512, 3), .97), .02 + .16 * t ** 1.8]))
    # throat skirt: x up the skirt (fade out), y round it
    v = fiber(512, 256, 6, freqs=(5, 8, 13, 21, 34), drift=.04)                           # strands up the skirt (x)
    x = (np.arange(512) + .5) / 512
    a = (v * .7 + .3) * ((1 - x) ** 1.4 * np.clip(x / .25, 0, 1))[None, :] * .7
    out["skirt"] = make_image("q11c_vortex_skirt", np.dstack([np.full((256, 512, 3), .96), a.astype(np.float32)]))
    # disc cloud: log-spiral strands, opaque where the funnel meets it, ragged fading rim
    n = 1024
    c = (np.arange(n) + .5) / n * 2 - 1
    X, Y = np.meshgrid(c, -c)
    r = np.hypot(X, Y)
    th = np.arctan2(Y, X)
    s = th / (2 * np.pi) - np.log(np.maximum(r, .02)) / 2.6                                 # counter-clockwise inward spiral, open arms
    f = np.zeros_like(r)
    rng = np.random.default_rng(7)
    for k, amp in ((5, 1.0), (9, .7), (16, .5), (27, .35), (45, .25)):
        f += amp * np.cos(2 * np.pi * (k * s + rng.uniform(0, 1)) + .8 * np.sin(2 * np.pi * (3 * r + rng.uniform(0, 1))))
    f = (f - f.min()) / (f.max() - f.min())
    rim = .82 + .12 * (np.cos(5 * th + 1.0) * .5 + np.cos(9 * th + 2.3) * .3 + np.cos(17 * th) * .2)
    a = np.clip(1 - smooth_np(.3, rim, r), 0, 1) ** .8 * (.25 + .75 * f) + np.clip(1 - r / .7, 0, 1) ** 1.5 * .55
    a = np.clip(a, 0, 1) * (r < 1)
    t = np.clip((f - .2) / .6, 0, 1)
    col = lo * (1 - t[..., None]) * .7 + hi * (1 - (1 - t[..., None]) * .7)
    out["cloud"] = make_image("q11c_cloud_disc", np.dstack([col, a]).astype(np.float32))
    return out


def smooth_np(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def tex_mat(name, image, alpha, emit=.35, rough=.95):
    m = bpy.data.materials.new("q11cv_" + name)
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = image
    nt.links.new(tx.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tx.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = emit
    b.inputs["Roughness"].default_value = rough
    if alpha:
        nt.links.new(tx.outputs["Alpha"], b.inputs["Alpha"])
        m.surface_render_method = "BLENDED"
    m.use_backface_culling = False
    m.diffuse_color = (.95, .97, 1.0, .8 if alpha else 1)
    return m


class UVAcc:
    """Grids with per-vertex UVs (the vortex parts)."""

    def __init__(self):
        self.v, self.uv, self.f = [], [], []

    def grid(self, rows, uvs, flip=False):
        base, m = len(self.v), len(rows[0])
        for row, urow in zip(rows, uvs):
            self.v += [tuple(p) for p in row]
            self.uv += list(urow)
        for i in range(len(rows) - 1):
            for j in range(m - 1):
                q = (base + i * m + j, base + i * m + j + 1, base + (i + 1) * m + j + 1, base + (i + 1) * m + j)
                self.f.append(q[::-1] if flip else q)


def uv_mesh(name, acc, material):
    me = bpy.data.meshes.new(name)
    me.from_pydata(acc.v, [], acc.f)
    me.update()
    uv = me.uv_layers.new(name="UVMap")
    idx = np.zeros(len(me.loops), np.int64)
    me.loops.foreach_get("vertex_index", idx)
    uvs = np.array(acc.uv, np.float32)[idx]
    uv.data.foreach_set("uv", uvs.ravel())
    me.materials.append(material)
    me.shade_smooth()
    return me


# --- vortex geometry --------------------------------------------------------------------------------------------------------
def v_r(z):
    """Vortex radius: fills the throat (r 20 at z 37), widens steadily to r 29 at z 126, flaring into the disc cloud."""
    t = min(max((z - V_Z0) / (V_Z1 - V_Z0), 0.0), 1.0)
    return V_R0 + (V_R1 - 1.5 - V_R0) * t ** 2.0 + 1.5 * smooth(.88, 1.0, t) ** 2


CORE_PITCH = 125.0                    # the cloud strands climb one turn per ~125 m (counter-clockwise rising)


def vortex_core():
    acc = UVAcc()
    n = 120
    zs = [31.0 + (V_Z1 + 1.5 - 31.0) * i / 70 for i in range(71)]
    rows, uvs = [], []
    for z in zs:
        r = (min(v_r(z), V_R0 - .5) if z < V_Z0 else v_r(z)) * .8
        rows.append([pol(r, 360 * j / n, z) for j in range(n + 1)])
        uvs.append([(z / 95.0, 6 * (j / n - z / CORE_PITCH)) for j in range(n + 1)])
    acc.grid(rows, uvs)
    return acc


def vortex_mist():
    acc = UVAcc()
    n = 96
    zs = [V_Z0 + 2 + (V_Z1 - V_Z0 - 2) * i / 50 for i in range(51)]
    rows, uvs = [], []
    for z in zs:
        r = v_r(z) * 1.04
        rows.append([pol(r, 360 * j / n, z) for j in range(n + 1)])
        uvs.append([(z / 70.0, 4 * (j / n - z / (CORE_PITCH * .9))) for j in range(n + 1)])
    acc.grid(rows, uvs)
    skirt = UVAcc()                                                                        # mist welling out of the throat
    rows, uvs = [], []
    for i in range(13):
        x = i / 12
        z = V_Z0 - .6 + 12.0 * x
        r = V_R0 + .3 + 3.4 * math.sin(math.pi * x * .8) * (1 - .4 * x)
        rows.append([pol(r, 360 * j / n, z) for j in range(n + 1)])
        uvs.append([(x, 3 * (j / n - z / CORE_PITCH)) for j in range(n + 1)])
    skirt.grid(rows, uvs)
    return acc, skirt


def vortex_ropes(rng):
    """The body of the vortex: nine cloud ropes wound counter-clockwise round the core, each its own thickness (r 3-6 m),
    pitch and phase, swelling and pinching along its length, so they merge and part instead of reading as an even spring.
    Their outer edge follows the funnel radius; the bluish core shows in the gaps."""
    acc = UVAcc()
    m = 16
    for k in range(9):
        th0 = k * 40.0 + rng.uniform(-12, 12)
        z0, z1 = 31.0 + rng.uniform(0, 3), V_Z1 - rng.uniform(0, 3)
        pitch = rng.uniform(108, 132)
        base = rng.uniform(3.0, 6.0)
        lam, ph = rng.uniform(22, 40), rng.uniform(0, 2 * math.pi)
        n = int((z1 - z0) / .8)
        rows, uvs, s, prev = [], [], 0.0, None
        frame = None
        for i in range(n + 1):
            z = z0 + (z1 - z0) * i / n
            vr = v_r(z)
            rr = base * (vr / 24.0) * (1 + .32 * math.sin(2 * math.pi * z / lam + ph)) * min(1.0, (z - z0) / 6 + .05, (z1 - z) / 9 + .05)
            hr = vr - rr * .78
            c = pol(hr, th0 + 360 * (z - z0) / pitch, z)
            if prev is not None:
                s += (c - prev).length
            prev = c
            cn = pol(hr, th0 + 360 * (z + .1 - z0) / pitch, z + .1)
            t = (cn - c).normalized()
            er = Vector((c.x, c.y, 0)).normalized()
            wv = t.cross(er).normalized()
            nv = wv.cross(t).normalized()                                                  # outward, perpendicular to the rope
            rows.append([c + nv * (rr * .8 * math.cos(2 * math.pi * j / m)) + wv * (rr * math.sin(2 * math.pi * j / m)) for j in range(m + 1)])
            uvs.append([(s / 45.0 + k * .31, 2 * j / m) for j in range(m + 1)])
        acc.grid(rows, uvs)
    return acc


def vortex_bands(rng):
    """Cloud bands over the ropes: broad translucent sheets and narrow strands on helices, convex across, tapering at
    both ends and fading at their edges (texture alpha); every one climbs counter-clockwise."""
    acc = UVAcc()
    specs = []
    for q in range(6):                                                                     # broad sheets
        specs.append((rng.uniform(V_Z0 + 1, V_Z0 + 30), rng.uniform(50, 80), rng.uniform(9.0, 14.0), rng.uniform(1.0, 1.03), rng.uniform(110, 135)))
    for q in range(12):                                                                    # medium
        specs.append((rng.uniform(V_Z0 + 2, 96), rng.uniform(28, 55), rng.uniform(3.2, 6.0), rng.uniform(1.01, 1.05), rng.uniform(105, 135)))
    for q in range(28):                                                                    # fine strands
        specs.append((rng.uniform(V_Z0 + 4, 108), rng.uniform(16, 38), rng.uniform(.9, 2.2), rng.uniform(1.02, 1.065), rng.uniform(100, 130)))
    for k, (z0, ln, wd, f, pitch) in enumerate(specs):
        z1 = min(V_Z1 - 3, z0 + ln)
        th0 = rng.uniform(0, 360)
        n = max(10, int((z1 - z0) / .9))
        pts = []
        for i in range(n + 1):
            z = z0 + (z1 - z0) * i / n
            pts.append(pol(v_r(z) * f, th0 + 360 * (z - z0) / pitch, z))
        rows, uvs, s = [], [], 0.0
        for i, p in enumerate(pts):
            if i:
                s += (p - pts[i - 1]).length
            t = (pts[min(i + 1, n)] - pts[max(i - 1, 0)]).normalized()
            er = Vector((p.x, p.y, 0)).normalized()
            wv = er.cross(t).normalized()
            hw = wd / 2 * max(0.0, math.sin(math.pi * i / n)) ** .55 + .05
            bulge = min(1.4, wd * .18)
            rows.append([p - wv * hw, p + er * bulge, p + wv * hw])
            uvs.append([(s / 60.0 + k * .37, 0.0), (s / 60.0 + k * .37, .5), (s / 60.0 + k * .37, 1.0)])
        acc.grid(rows, uvs)
    return acc


def cloud():
    """Thin disc cloud: a lens (r 36) joined to the funnel top, plus a wisp layer above; both fade at a ragged rim."""
    acc = UVAcc()
    n = 120
    for top in (False, True):
        rows, uvs = [], []
        for i in range(25):
            rr = CLOUD_R * (i / 24) ** .8
            k = 1 - (rr / CLOUD_R) ** 2
            z = CLOUD_Z + (2.6 * k ** .7 if top else -1.8 * k - .3 * math.sin(math.pi * rr / CLOUD_R))
            row, urow = [], []
            for j in range(n + 1):
                th = 360 * j / n
                p = pol(rr, th, z + .35 * math.sin(math.radians(5 * th) + i * .7) * (rr / CLOUD_R))
                row.append(p)
                urow.append((.5 + p.x / (2 * CLOUD_R), .5 + p.y / (2 * CLOUD_R)))
            rows.append(row)
            uvs.append(urow)
        acc.grid(rows, uvs, flip=not top)
    wisp = UVAcc()                                                                         # thin streaky skirt fading out to r 54
    rows, uvs = [], []
    for i in range(25):
        rr = WISP_R * (i / 24) ** .8
        z = CLOUD_Z + 4.8 * (1 - (rr / WISP_R) ** 2) ** .8 - .4
        row, urow = [], []
        for j in range(n + 1):
            th = 360 * j / n
            p = pol(rr, th, z)
            row.append(p)
            c, s = math.cos(1.1), math.sin(1.1)                                            # rotate the texture so strands differ
            x, y = p.x / (2 * WISP_R), p.y / (2 * WISP_R)
            urow.append((.5 + x * c - y * s, .5 + x * s + y * c))
        rows.append(row)
        uvs.append(urow)
    wisp.grid(rows, uvs)
    return acc, wisp


def ring_mesh(r_in):
    a = Accs()
    R = r_in + RING_TUBE
    lathe(a["ring"], [(R + RING_TUBE * math.cos(math.radians(q)), RING_TUBE * math.sin(math.radians(q))) for q in range(0, 360, 30)], 240, wrap=True)
    for k in range(6):                                                                     # sleeve joints, so the ring reads as made
        b = k * 60.0 + 15
        t = pol(1, b + 90)
        c = pol(R, b)
        secs = []
        for dh in (-.45, .45):
            secs.append([tuple(c + t * dh + pol(1, b) * (RING_TUBE + .09) * math.cos(math.radians(q)) + Vector((0, 0, (RING_TUBE + .09) * math.sin(math.radians(q)))))
                         for q in range(0, 360, 30)])
        loft(a["ring_joint"], secs)
    return a


# --- plaza -------------------------------------------------------------------------------------------------------------------
STAIR_HALF = math.degrees((STAIR_W / 2) / SITE_R)


def stairs(a):
    n = int(PODIUM_Z / RISE + .5)
    t = pol(1, ENTRY_AX + 90)
    for k in range(n):
        h = PODIUM_Z - k * RISE
        radial_box(a["step"], ENTRY_AX, SITE_R + (k + .5) * TREAD - .02, h / 2, (TREAD + .04, STAIR_W, h))
    run = n * TREAD
    for s in (-1, 1):                                                                      # cheek walls following the slope
        off = t * (s * (STAIR_W / 2 + .3))
        prof = [(SITE_R - .3, 0), (SITE_R + run + .3, 0), (SITE_R + run + .3, .45), (SITE_R - .3, PODIUM_Z + .45)]
        loft(a["coping"], [[tuple(pol(r, ENTRY_AX, z) + off + t * (d * .3)) for r, z in prof] for d in (-1, 1)])
        rail_line(a, pol(SITE_R - .3, ENTRY_AX) + off, pol(SITE_R + run + .3, ENTRY_AX) + off, PODIUM_Z + .45, .45)
    for d in (-1, 1):                                                                      # mid handrails
        off = t * (d * STAIR_W / 6)
        K.pipe(a["rail"], [tuple(pol(r, ENTRY_AX, z) + off) for r, z in ((SITE_R + .1, PODIUM_Z + .95), (SITE_R + run - .1, 1.0))], .04, None, 6)


def ramp(a):
    """The parallel ramp: rises along the podium from bearing 312 to the landing beside the stair head (1:12)."""
    foot, top, r0, r1 = RAMP
    n = int(abs(top - foot) / 1.0)
    secs = []
    for i in range(n + 1):
        b = foot + (top - foot) * i / n
        z = PODIUM_Z * i / n
        secs.append([tuple(pol(r, b, zz)) for r, zz in ((r0, -.05), (r1, -.05), (r1, z + .05), (r0, z + .05))])
    loft(a["ramp"], secs)
    for r in (r0 + .12, r1 - .12):
        pts = [pol(r, foot + (top - foot) * i / n) for i in range(n + 1)]
        K.pipe(a["rail"], [(p.x, p.y, PODIUM_Z * i / n + .05 + RAIL_H) for i, p in enumerate(pts)], .045, None, 6)
        for i in range(0, n + 1, 2):
            obox(a["rail"], (pts[i].x, pts[i].y, PODIUM_Z * i / n + RAIL_H / 2), (.07, .07, RAIL_H), 0)
    sector(a["ramp"], SITE_R - .5, r1, LANDING[0], LANDING[1], -.05, PODIUM_Z + .05, 1)      # landing beside the stair head
    rail_arc(a, r1 - .12, PODIUM_Z + .05, LANDING[0] + .2, top - 1.0, glass=False)


def plaza(rng):
    a = Accs()
    ring(a["paving"], SITE_R, PAVE_R, -.3, .0, 180)
    ring(a["glowline"], PAVE_R - .25, PAVE_R - .12, .0, .02, 180)
    ring(a["grass"], PAVE_R, LAWN_R, -.3, .04, 180)
    ring(a["paving_b"], 101.5, 106.5, .0, .07, 180)                                        # ring path (sea side and round)
    for b in PATHS:
        w = 12.0 if b == ENTRY_AX else 5.0
        radial_box(a["paving_b"], b, (PAVE_R - 1 + LAWN_R - .5) / 2, .04, (LAWN_R - PAVE_R + .5, w, .08))
    holes = [(ENTRY_AX - STAIR_HALF - .8, ENTRY_AX + STAIR_HALF + .8), (LANDING[0] - .3, LANDING[1] + .3)]
    for a0, a1 in gaps(0, 360, holes, .5):                                                 # podium-edge planters
        sector(a["coping"], PLANTER[0], PLANTER[1], a0, a1, -.1, 1.6, 1.5)
        sector(a["soil"], PLANTER[0] + .3, PLANTER[1] - .3, a0 + .3, a1 - .3, 1.6, 1.72, 1.5)
        sector(a["hedge"], PLANTER[0] + .5, PLANTER[0] + 2.0, a0 + .5, a1 - .5, 1.7, 2.5, 1.5)
        sector(a["grass"], PLANTER[0] + 2.0, PLANTER[1] - .4, a0 + .4, a1 - .4, 1.7, 1.85, 1.5)
    for a0, a1 in gaps(0, 360, [(ENTRY_AX - STAIR_HALF - .3, LANDING[1] + .2)], .5):         # podium edge rail
        rail_arc(a, SITE_R - .45, PODIUM_Z + .03, a0, a1)
    stairs(a)
    ramp(a)
    for s, b in ((-1, ENTRY_AX - 13.5), (1, ENTRY_AX + 21.0)):                               # a few benches and planters by the entrance
        for k in range(3):
            d = b + s * k * 3.2
            M.kit_prop(K.ctx(a, rng, *pol(PAVE_R - 2.2, d), math.radians(d) + math.pi / 2), "bench", 0, 0, 0)
        p = pol(PAVE_R - 5.5, b + s * 4.5)
        lathe(a["coping"], [(.001, 0), (1.3, 0), (1.3, .6), (.001, .6)], 20, p.x, p.y)
        M.leaf_clump(K.ctx(a, rng, p.x, p.y, .6), (0, .45, 0), (1.05, .55, 1.05), ("leaf_l", "green"), "green", 40, .35, .3, 3)
    for i in range(36):                                                                    # low lights round the paved ring
        p = pol(PAVE_R - .6, i * 10 + 5)
        lathe(a["frame"], [(.08, 0), (.08, .9)], 10, p.x, p.y)
        lathe(a["glowline"], [(.09, .9), (.09, 1.05)], 10, p.x, p.y)
    return a


def tree_mesh(seed):
    a, rng = Accs(), random.Random(seed)
    h = (6.0, 7.2, 5.2)[seed % 3]
    cr = h * .40
    M.leafy_tree(K.ctx(a, rng), (0, 0, 0), h=h, crown=cr * .9, trunk="wood", roles=("leaf_l", "green"), core="green", n=40, size=.4, branches=5)
    for i in range(6):
        t, rr = i * 2.4 + rng.uniform(-.3, .3), (0 if i == 0 else cr * rng.uniform(.45, .62))
        c = (rr * math.cos(t), h * (.84 if i == 0 else rng.uniform(.62, .78)), rr * math.sin(t))
        q = cr * rng.uniform(.46, .60)
        G.blob(K.Three(a["in_green" if i % 2 else "in_leaf_l"]), c, (q, q * .8, q), sub=2, seed=seed * 7 + i, noise=.30, flat=.8)
        M.leaf_clump(K.ctx(a, rng), c, (q * 1.08, q * .9, q * 1.08), ("leaf_l", "green"), None, 46, .42, .3, 1)
    return K.build_mesh("q11cv_tree_%d" % seed, a, 180)


def tree_spots(rng):
    """Lawn trees in loose clumps outside the ring path, clear of the paths and of the land-side foreground."""
    out, tries = [], 0
    while len(out) < 34 and tries < 6000:
        tries += 1
        r, d = rng.uniform(111, LAWN_R - 3), rng.uniform(0, 360)
        if min(abs(math.remainder(d - p, 360)) * math.radians(1) * r for p in PATHS) < 6.5:
            continue
        if abs(math.remainder(d - ENTRY_AX, 360)) < 34 or any((pol(r, d) - q).length < 7.5 for q in out):
            continue
        out.append(pol(r, d, .04))
    return out


# --- materials ---------------------------------------------------------------------------------------------------------------
def mat(name, hexc, rough=.6, metal=0.0, alpha=1.0, emit=None, strength=1.0, culling=True):
    m = G.material("q11cv_" + name, srgb(hexc, alpha), rough, srgb(emit) if emit else None, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


def inner(name, hexc, rough, lit):
    """Interior finish: a little of its own colour as emission, so the stair hall reads behind glass in daylight."""
    return mat(name, hexc, rough, emit=hexc, strength=lit)


def make_materials():
    K.MATS.clear()
    K.MATS.update({
        "vane": mat("vane_white", "F4F4F0", .3, .06), "drum": mat("drum_panel", "D0D7DC", .45, .08),
        "podium": mat("podium_stone", "E2DFD8", .7), "deck": mat("podium_deck", "D9D6CF", .8),
        "seam": mat("seam_grey", "A3ABAF", .5, .3), "door": mat("service_door", "8C979D", .45, .4),
        "backwall": mat("gallery_back", "5B6F7E", .3, .55), "louvre": mat("louvre", "566773", .4, .6),
        "frame": mat("frame_silver", "DDE2E4", .35, .55), "duct": mat("duct_bluegrey", "9AABB8", .28, .8),
        "cowl": mat("cowl_silver", "D5DBDF", .22, .8), "hood": mat("hood_white", "EEF0EF", .35, .1),
        "nacelle": mat("nacelle", "C2CAD0", .3, .7), "strut": mat("strut", "7D8C97", .4, .7),
        "base": mat("equipment_base", "9AA4AA", .55, .3),
        "blade": mat("turbine_blade", "CFD5D9", .25, .8), "hub": mat("turbine_hub", "EEF1F2", .25, .6),
        "roof": mat("roof_white", "EDEFEC", .5), "rib": mat("roof_rib", "F8F8F5", .35, .04),
        "collar": mat("collar_white", "F1F3F2", .3, .1), "throat": mat("throat_dark", "3E4C57", .55, .4),
        "throat_seam": mat("throat_seam", "8597A5", .4, .6), "chamber": mat("chamber_floor", "2C363D", .7),
        "walk": mat("walkway", "D6CDBE", .8), "walk_b": mat("roof_band", "C3C9C8", .8),
        "rail": mat("rail_steel", "D8DCDD", .32, .6), "glass": mat("rail_glass", "C6E2EA", .05, alpha=.25, culling=False),
        "glowline": mat("pale_light", "D7F2FB", .4, emit="BDEBFF", strength=2.0),
        "blue": mat("blue_light", "8FD3FF", .4, emit="5FC0FF", strength=3.0),
        "ring": mat("ring_metal", "D3D9DC", .2, .9), "ring_joint": mat("ring_joint", "A9B2B7", .3, .85),
        "portal": mat("portal_white", "F0F1EE", .4, .05), "canopy": mat("canopy", "F5F5F2", .35, .1),
        "doorframe": mat("door_frame", "59656C", .35, .6),
        "inner": inner("hall_wall", "D9C6A8", .7, .55), "inner_floor": inner("hall_floor", "8F7356", .6, .35),
        "wood": inner("hall_wood", "9A6B3E", .55, .4), "hall_light": mat("hall_light", "FFE3B8", .5, emit="FFD9A0", strength=4.0),
        "step": mat("stair_stone", "E7E4DD", .7), "ramp": mat("ramp_stone", "DFDBD3", .75),
        "coping": mat("coping_stone", "ECE9E2", .55), "soil": mat("soil", "6B5138", .95), "hedge": mat("hedge", "5F8A3E", .9),
        "paving": mat("paving", "D8D3C9", .85), "paving_b": mat("paving_band", "C8C2B6", .85), "grass": mat("lawn", "7FA34F", .9),
    })
    for role, (rgba, emit, strength) in M.ROLES.items():                                   # library props and planting
        leafy = role in ("leaf_l", "green")
        m = G.material("q11cv_in_" + role, rgba, .6, emit, strength)
        m.use_backface_culling = not leafy and rgba[3] >= 1
        K.MATS["in_" + role] = m
    return K.MATS


# --- preview staging ---------------------------------------------------------------------------------------------------------
def preview(col, trees, rng):
    mk = lambda n, h, r=.8, **k: K.MATS.setdefault("pv_" + n, mat("pv_" + n, h, r, **k))  # noqa: E731
    mk("water", "3F7FA6", .05)
    mk("land", "9DB07A", .95)
    mk("path", "D3CDC1", .9)
    mk("far", "BAC8D4", .9)
    mk("farw", "E3E9EC", .8)
    mk("storm", "7D8896", 1.0)
    mk("cumulus", "F4F6F8", 1.0, emit="F4F6F8", strength=.25)
    a = Accs()
    shore = 158.0
    loft(a["pv_water"], [[(-6000, shore, z), (6000, shore, z), (6000, 9000, z), (-6000, 9000, z)] for z in (-2.5, -2)])
    loft(a["pv_land"], [[(-900, -800, z), (900, -800, z), (900, shore, z), (-900, shore, z)] for z in (-3, -.32)])
    loft(a["pv_path"], [[(-900, shore - 10, z), (900, shore - 10, z), (900, shore + 1, z), (-900, shore + 1, z)] for z in (-3, .0)])
    for i in range(240):                                                                   # far shore across the bay
        x = rng.uniform(-4500, 4500)
        y = rng.uniform(2300, 3100)
        h = rng.uniform(15, 70) * (2.4 if rng.random() < .1 else 1)
        w = rng.uniform(20, 50)
        K.box(a["pv_far"], x, x + w, y, y + w, -2, h)
    loft(a["pv_far"], [[(-6500, 2400, z), (6500, 2400, z), (6500, 3500, z), (-6500, 3500, z)] for z in (-2.2, 5)])
    bx, by = Vector((800.0, 1500.0)), Vector((2400.0, 2300.0))                              # a suspension bridge to the right
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
    for i in range(14):                                                                    # typhoon cloud band low on the far sea horizon
        x = rng.uniform(1800, 7500)
        G.blob(a["pv_storm"], (x, rng.uniform(10500, 12000), rng.uniform(120, 260)), (rng.uniform(700, 1200), 350, rng.uniform(120, 220)),
               sub=4, seed=i, noise=.14, flat=.5)
    for i in range(9):                                                                     # a few fair-weather clouds
        x = rng.uniform(-5000, -800)
        G.blob(a["pv_cumulus"], (x, rng.uniform(5000, 7000), rng.uniform(700, 1100)), (rng.uniform(250, 420), 160, rng.uniform(80, 130)),
               sub=3, seed=40 + i, noise=.3, flat=.4)
    ob = bpy.data.objects.new("PV_Context", K.build_mesh("pv_context", a))
    col.objects.link(ob)
    n = 0
    while n < 320:                                                                         # park trees round the lawn
        r, d = rng.uniform(LAWN_R + 8, 260), rng.uniform(0, 360)
        p = pol(r, d)
        if p.y > shore - 16 or abs(math.remainder(d - ENTRY_AX, 360)) < 12:
            continue
        t = bpy.data.objects.new("PV_Tree_%03d" % n, trees[n % 3])
        t.location = (p.x, p.y, -.32)
        t.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        t.scale = (rng.uniform(1.1, 1.7),) * 3
        col.objects.link(t)
        n += 1


# --- layout checks (into the report) -------------------------------------------------------------------------------------------
def layout_checks():
    out = {}
    gap = 1e9
    for u in (0.0, .1, .2, .35, .5, .65, .8, .9):
        s0 = [Vector(p) for p in vane_section(u, 0.0)]
        s1 = [Vector(p) for p in vane_section(u, STEP)]
        gap = min(gap, min((p - q).length for p in s0 for q in s1))
    out["vane_gap_min_m"] = round(gap, 2)
    f0 = [Vector(p) for p in vane_section(0.0)]
    out["vane_foot_r_m"] = [round(min(p.xy.length for p in f0), 2), round(max(p.xy.length for p in f0), 2)]
    tip = [Vector(p) for p in vane_section(1.0)]
    out["vane_tip_r_m"] = round(max(p.xy.length for p in tip), 2)
    out["vane_turn_deg"] = VANE_TWIST
    # duct rim (bell mouth outer edge) against the walls on either side of the bay
    mw = turbine_matrix(0.0)
    rim = [mw @ Vector((2.05, (TURB_RAD + .78) * math.cos(q), (TURB_RAD + .78) * math.sin(q))) for q in np.linspace(0, 2 * math.pi, 48, endpoint=False)]
    hood = [mw @ Vector((x, (TURB_RAD + .85) * math.cos(math.radians(q)), (TURB_RAD + .85) * math.sin(math.radians(q)))) for x in (-2.6, 0, 2.3) for q in range(15, 166, 15)]
    clear = 1e9
    for p in rim + hood:
        u = (p.z - VANE_Z0) / (VANE_TOP - VANE_Z0)
        for base in (0.0, STEP):
            sec = [Vector(q) for q in vane_section(u, base)]
            clear = min(clear, min((Vector((p.x, p.y, 0)) - Vector((q.x, q.y, 0))).length for q in sec))
    out["turbine_to_wall_clear_m"] = round(clear, 2)
    out["rings"] = {}
    for name, r_in, z in RINGS:
        band_max = v_r(z) * 1.065 + .5                                                    # finest strand radius + half its bulge
        out["rings"][name] = {"inner_r": r_in, "z": z, "vortex_r": round(v_r(z), 2), "clear_to_bands_m": round(r_in - band_max, 2)}
    out["vortex_r_at_lip_m"] = round(v_r(V_Z0), 2)
    out["vortex_r_at_top_m"] = round(v_r(V_Z1), 2)
    out["levels"] = {"podium": PODIUM_Z, "turbine_centre": TURB_Z, "roof_walkway": DECK_Z, "lip": LIP_Z, "rim": RIM_Z,
                     "vane_tip": VANE_TOP, "vortex_top": V_Z1}
    out["stair_foot_r_m"] = round(SITE_R + int(PODIUM_Z / RISE + .5) * TREAD, 2)
    out["ramp_slope"] = "1:%.1f" % ((RAMP[3] + RAMP[2]) / 2 * math.radians(abs(RAMP[1] - RAMP[0])) / PODIUM_Z)
    return out


# --- assembly ------------------------------------------------------------------------------------------------------------------
def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    rng = random.Random(2127)
    col = bpy.data.collections.new("Q11C_Asset")
    prev = bpy.data.collections.new("Q11C_Preview")
    scene.collection.children.link(col)
    scene.collection.children.link(prev)
    root = bpy.data.objects.new(ROOT, None)
    col.objects.link(root)
    groups = {}
    for g in ("STATION", "ROTORS", "RINGS", "VORTEX", "CLOUD", "PLAZA"):
        e = bpy.data.objects.new(g, None)
        c = bpy.data.collections.new("Q11C_" + g)
        col.children.link(c)
        c.objects.link(e)
        e.parent = root
        groups[g] = (e, c)

    def add(name, accs, g, smooth_deg=30, mw=None, data=None):
        ob = bpy.data.objects.new(name, data or K.build_mesh("q11cv_" + name.lower(), accs, smooth_deg))
        groups[g][1].objects.link(ob)
        ob.parent = groups[g][0]
        if mw is not None:
            ob.matrix_local = mw
        return ob

    add("STATION_PODIUM", podium(), "STATION")
    add("STATION_DRUM", drum(), "STATION")
    add("STATION_ROOF", roof(), "STATION", 40)
    add("STATION_DECK", deck(), "STATION")
    add("STATION_ENTRANCE", entrance(), "STATION")
    vane_me = K.build_mesh("q11cv_vane", vane(), 50)
    entry_me = K.build_mesh("q11cv_vane_entry", vane(GAL_TOP + .6), 50)
    house_me = K.build_mesh("q11cv_turbine_housing", housing(), 40)
    rotor_me = K.build_mesh("q11cv_turbine_rotor", rotor(), 40)
    bay_me = K.build_mesh("q11cv_gallery_bay", gallery_bay(), 30)
    rot = lambda b: Matrix.Rotation(math.radians(b), 4, "Z")  # noqa: E731
    for k in range(N):
        b = k * STEP
        add("VANE_%03d" % b, None, "STATION", data=entry_me if b == ENTRY else vane_me, mw=rot(b))
        if b in (ENTRY - STEP, ENTRY):
            continue
        add("GALLERY_BAY_%03d" % b, None, "STATION", data=bay_me, mw=rot(b))
        add("TURBINE_HOUSING_%03d" % b, None, "STATION", data=house_me, mw=turbine_matrix(b))
        add("TURBINE_ROTOR_%03d" % b, None, "ROTORS", data=rotor_me, mw=turbine_matrix(b))
    for name, r_in, z in RINGS:
        add("RING_" + name, ring_mesh(r_in), "RINGS", 40, mw=Matrix.Translation((0, 0, z)))
    tx = textures()
    mats = {"core": tex_mat("vortex_core", tx["core"], False, .3, .9), "band": tex_mat("vortex_band", tx["band"], True, .4), "rope": tex_mat("vortex_rope", tx["rope"], False, .3, .9),
            "mist": tex_mat("vortex_mist", tx["mist"], True, .4), "skirt": tex_mat("vortex_skirt", tx["skirt"], True, .4),
            "cloud": tex_mat("cloud_disc", tx["cloud"], True, .35)}
    mist, skirt = vortex_mist()
    add("VORTEX_CORE", None, "VORTEX", data=uv_mesh("q11cv_vortex_core", vortex_core(), mats["core"]))
    add("VORTEX_ROPES", None, "VORTEX", data=uv_mesh("q11cv_vortex_ropes", vortex_ropes(rng), mats["rope"]))
    add("VORTEX_BANDS", None, "VORTEX", data=uv_mesh("q11cv_vortex_bands", vortex_bands(rng), mats["band"]))
    add("VORTEX_MIST", None, "VORTEX", data=uv_mesh("q11cv_vortex_mist", mist, mats["mist"]))
    add("VORTEX_SKIRT", None, "VORTEX", data=uv_mesh("q11cv_vortex_skirt", skirt, mats["skirt"]))
    disc, wisp = cloud()
    add("CLOUD_DISC", None, "CLOUD", data=uv_mesh("q11cv_cloud_disc", disc, mats["cloud"]))
    add("CLOUD_WISP", None, "CLOUD", data=uv_mesh("q11cv_cloud_wisp", wisp, mats["cloud"]))
    add("PLAZA_GROUND", plaza(rng), "PLAZA")
    trees = [tree_mesh(s) for s in range(3)]
    for i, q in enumerate(tree_spots(rng)):
        add("TREE_%02d" % (i + 1), None, "PLAZA", data=trees[i % 3],
            mw=Matrix.Translation(q) @ Matrix.Rotation(rng.uniform(0, 6.28), 4, "Z") @ Matrix.Scale(rng.uniform(1.15, 1.55), 4))
    preview(prev, trees, rng)

    bpy.context.view_layer.update()
    asset = [o for o in col.all_objects]
    by_group = {g: sum(K.tris(o.data) for o in groups[g][1].objects if o.type == "MESH") for g in groups}
    report = {"tris_by_group": by_group, "tris_total": sum(by_group.values()),
              "unique_mesh_tris": sum(K.tris(m) for m in {o.data for o in asset if o.type == "MESH"}),
              "objects": len(asset), "unique_meshes": len({o.data.name for o in asset if o.type == "MESH"}),
              "materials": len({m.name for o in asset if o.type == "MESH" for m in o.data.materials}),
              "textures": {i.name: list(i.size) for i in bpy.data.images if i.name.startswith("q11c_")}}
    import review_vortex_power_station as RV
    RV.stage(scene, prev)
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
                                  export_materials="EXPORT", export_image_format="AUTO")
        report["glb_bytes"] = os.path.getsize(glb)
    report["layout"] = layout_checks()
    vx = np.concatenate([np.array([v.co[:] for v in o.data.vertices]) for o in groups["VORTEX"][1].objects if o.type == "MESH"])
    for name, r_in, z in RINGS:                                                            # measured: every vortex vertex near the ring
        near = vx[np.abs(vx[:, 2] - z) < RING_TUBE + 1.0]
        report["layout"]["rings"][name]["clear_measured_m"] = round(r_in - float(np.hypot(near[:, 0], near[:, 1]).max()), 2)
    with open(os.path.join(HERE, "report.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps(report))


if __name__ == "__main__":
    main()
