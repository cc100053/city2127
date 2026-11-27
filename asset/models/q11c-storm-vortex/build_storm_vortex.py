"""Q11-C storm vortex power station: a low round building that turns storm wind into a standing white tornado
(reference: Q11 sheet, image C — 嵐の風を集め、人工の竜巻で発電する建物).

Run:  blender -b --factory-startup --python-exit-code 1 -P build_storm_vortex.py [-- --no-export]
Writes q11c-storm-vortex.blend (asset + preview staging), q11c-storm-vortex.glb (asset only) and report.json (counts and
layout checks) beside this file. No human figures anywhere: stairs, ramps, railings and benches give the scale.

Blender coordinates, real metres, origin = building centre on the ground (z 0), sea on +y, main view from the land side
(-y). A 5 m podium (r 67) carries a drum (r 54, top z 31) ringed by 30 tall white guide vanes (tips z 39) that lean the
same way and sweep clockwise outward, so sea wind is turned round the building; between the vane roots sit 30 ducted
turbines (r 5) in the drum face. The roof is a shallow dish with 36 spiral ribs running in to a 43 m round opening; a
viewing walkway with glass rails rings the dish edge (z 31) and four lift heads stand on it. Out of the opening rises a
white funnel (r 17 in the opening, widening slowly, then flaring into the cap) wrapped in twisted cloud streaks and capped
by a flat disc cloud (r 57, z 114-125); three thin metal rings (r 27 / 30 / 34 at z 47 / 78 / 110) float round it.
Podium terrace planters with hedges, a grand stair to the land side and a stair to the waterfront, two ramps, a paved
ring with benches and a lawn park with trees.

Nodes: Q11C_StormVortex > STRUCTURE, TURBINES, VORTEX, RINGS, DECK, PLAZA. Moving parts are their own nodes so an
animation can drive each: TURBINE_ROTOR_006..354 (spin about the node's local +x, the radial axis), VORTEX_STREAKS
(turn about z), RING_LOW / RING_MID / RING_HIGH (origin on the axis). Preview staging (sea, far shore, bridge, park
trees) is collection Q11C_Preview and is never exported. Geometry primitives and the library hook (kit props,
leafy_tree) come from the Q04-A builder's parts.py, as Q04-B and Q10-A do.
"""
import importlib.util
import json
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True       # Q04-A's __pycache__ is tracked: loading its parts.py must not rewrite it
HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)
sys.path.insert(0, HERE)
_spec = importlib.util.spec_from_file_location("q04a_parts", os.path.join(MODELS, "q04a-suspended-pod-tower", "parts.py"))
K = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(K)
G, M = K.G, K.M
Accs, loft, obox, lathe, ring, sector, skin, beam, srgb = K.Accs, K.loft, K.obox, K.lathe, K.ring, K.sector, K.skin, K.beam, K.srgb

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ASSET = "q11c-storm-vortex"

N = 30                               # guide vanes = turbine bays
STEP = 360.0 / N
PODIUM_R, PODIUM_Z = 67.0, 5.0       # podium (promenade level 5 m)
DRUM_R, DRUM_IN, DRUM_TOP = 54.0, 50.0, 31.0
GALLERY_TOP = 17.5                   # turbine gallery: PODIUM_Z .. GALLERY_TOP in the drum face
TURB_Z, TURB_R = 11.25, 5.0          # turbine centre height and duct radius
FIN_TOP, FIN_SPAN, FIN_TH = 39.0, 10.5, 2.6   # vane tip height, radial span at the root, thickness at the root
VANE, TWIST = 45.0, 9.0              # vane angle off radial (outer edge trails clockwise); bearing gained root -> tip
FIN_IN = 53.6                        # vane inner edge (just inside the drum face); curls in to 50.5 above the roof edge
WALK_IN, WALK_OUT = 41.0, 50.0       # roof viewing walkway (z DRUM_TOP)
DISH_IN, DISH_Z = 24.5, 24.0         # dish runs down from the walkway to the opening lip
HOLE_R = 21.5                        # opening (shaft) radius
RAIL_H = 1.1
RINGS = (("LOW", 27.0, 47.0), ("MID", 30.0, 78.0), ("HIGH", 34.0, 110.0))   # (name, radius, height) of the floating rings
RING_TUBE = .55
V_BOT, V_TOP = 8.0, 118.0            # funnel from inside the shaft up to the cap cloud
PLANTER_R0, PLANTER_R1 = 67.0, 73.0  # terrace planters round the podium (z 0 .. 2.2)
RAMP_R0, RAMP_R1 = 73.6, 77.2
PAVE_R, LAWN_R = 84.0, 130.0
STAIRS = ((-90.0, 14.0), (90.0, 10.0))   # (bearing, width): grand stair to the land side, stair to the waterfront
RAMPS = ((-32.0, 16.0), (212.0, 164.0))  # (foot bearing, top bearing), rising 5 m along the outside of the planters
PAVILIONS = (45.0, 135.0, 225.0, 315.0)  # lift heads on the roof walkway
PATHS = (-90.0, 90.0, -32.0, 212.0, 30.0, 150.0)
RISE, TREAD = .1515, .38


def pol(r, deg, z=0.0):
    a = math.radians(deg)
    return Vector((r * math.cos(a), r * math.sin(a), z))


def smooth(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def basis(t):
    t = t.normalized()
    u = t.cross(Vector((0, 0, 1)) if abs(t.z) < .9 else Vector((1, 0, 0))).normalized()
    return t, u, t.cross(u)


def circle_ax(c, u, w, r, n):
    return [tuple(c + u * (r * math.cos(2 * math.pi * j / n)) + w * (r * math.sin(2 * math.pi * j / n))) for j in range(n)]


def collar(acc, p, t, r0, r1, h, n=32):
    """Annular band of radii r0..r1, 2h long, round axis t at p (an open-ended tube with wall thickness)."""
    t, u, w = basis(t)
    loft(acc, [circle_ax(p + t * dh, u, w, r, n) for r, dh in ((r0, -h), (r1, -h), (r1, h), (r0, h))], wrap=True)


def lathe_ax(acc, c, ax, prof, n=24):
    """Solid of revolution of (r, along) points round axis ax through c."""
    ax, u, w = basis(ax)
    loft(acc, [circle_ax(c + ax * d, u, w, max(r, 1e-4), n) for r, d in prof])


def plate_hole(acc, c, ax, t, half_w, half_h, hole_r, depth, n=36):
    """Flat plate (2 half_w along t, 2 half_h up, depth along ax) with a round hole through it, as one closed ring."""
    up = Vector((0, 0, 1))
    cs = math.atan2(half_h, half_w)
    th = sorted({round(2 * math.pi * k / n, 9) for k in range(n)} | {cs, math.pi - cs, math.pi + cs, 2 * math.pi - cs})

    def loop(rad, off, rect):
        pts = []
        for a in th:
            ca, sa = math.cos(a), math.sin(a)
            s = min(half_w / abs(ca) if abs(ca) > 1e-9 else 1e9, half_h / abs(sa) if abs(sa) > 1e-9 else 1e9) if rect else rad
            pts.append(tuple(c + ax * off + t * (ca * s) + up * (sa * s)))
        return pts
    d = depth / 2
    loft(acc, [loop(0, d, True), loop(hole_r, d, False), loop(hole_r, -d, False), loop(0, -d, True)], wrap=True)


def radial_box(acc, b, r, z, size):
    """Box centred at bearing b, radius r, height z; size = (radial, tangential, up)."""
    obox(acc, tuple(pol(r, b, z)), size, math.radians(b))


def gaps(a0, a1, holes, half):
    """Arcs of a0..a1 (degrees) left after cutting out each (bearing, half-width) hole."""
    cuts = sorted(((h - w) % 360, (h - w) % 360 + 2 * w) for h, w in holes)
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


def holes_for(r):
    """Openings in the planter ring and podium rail at radius r: the two stairs and the two ramp landings."""
    out = [(b, math.degrees((w / 2 + .6) / r)) for b, w in STAIRS]
    out += [(top, math.degrees(3.6 / r)) for _f, top in RAMPS]
    return out


def rail_arc(a, r, z, a0, a1, posts=True, step=4.0):
    """Glass balustrade on an arc: glass panel, top handrail, posts."""
    n = max(2, int(abs(a1 - a0) / 1.5))
    rows = [[tuple(pol(r, a0 + (a1 - a0) * i / n, zz)) for i in range(n + 1)] for zz in (z, z + RAIL_H)]
    vs = rows[0] + rows[1]
    m = n + 1
    a["glass"]._push(vs, [(i, i + 1, m + i + 1, m + i) for i in range(n)])
    K.pipe(a["rail"], [tuple(pol(r, a0 + (a1 - a0) * i / n, z + RAIL_H + .04)) for i in range(n + 1)], .045, None, 6)
    if posts:
        k = max(1, int(abs(a1 - a0) / step))
        for i in range(k + 1):
            radial_box(a["rail"], a0 + (a1 - a0) * i / k, r, z + RAIL_H / 2, (.08, .08, RAIL_H))


# --- STRUCTURE: podium, drum, vanes, roof --------------------------------------------------------------------------------
def podium():
    a = Accs()
    lathe(a["podium"], [(.001, 0), (PODIUM_R, 0), (PODIUM_R, PODIUM_Z - .25), (PODIUM_R - .25, PODIUM_Z), (.001, PODIUM_Z)], 160)
    ring(a["walk"], DRUM_R, PODIUM_R - .3, PODIUM_Z, PODIUM_Z + .03, 160)
    ring(a["glass_band"], PODIUM_R, PODIUM_R + .04, 2.6, 4.2, 160)                       # dark glass band above the planters
    ring(a["glowline"], PODIUM_R, PODIUM_R + .08, 4.42, 4.55, 160)
    for i in range(120):
        radial_box(a["frame"], i * 3.0, PODIUM_R + .06, 3.4, (.12, .14, 1.6))
    ring(a["vortex_floor"], 0.0, HOLE_R, PODIUM_Z, PODIUM_Z + .05, 96)               # floor of the vortex chamber
    ring(a["glowline"], 9.0, 9.6, PODIUM_Z + .05, PODIUM_Z + .1, 96)
    return a


def drum():
    a = Accs()
    ring(a["drum"], DRUM_IN, DRUM_R, GALLERY_TOP, DRUM_TOP, 160)
    ring(a["glowline"], DRUM_R - .02, DRUM_R + .1, GALLERY_TOP, GALLERY_TOP + .22, 160)
    for z in (20.5, 24.5, 28.0):
        ring(a["seam"], DRUM_R - .02, DRUM_R + .04, z, z + .1, 160)
    ring(a["hall"], 47.4, 48.0, PODIUM_Z, GALLERY_TOP, 160)                        # dark hall wall behind the ducts
    ring(a["hall"], 47.4, DRUM_IN + .02, GALLERY_TOP - .2, GALLERY_TOP, 160)
    for i in range(N):
        c = i * STEP + STEP / 2
        hw = DRUM_R * math.sin(math.radians(STEP / 2)) + .06
        plate_hole(a["drum"], pol(DRUM_R - .4, c, TURB_Z), pol(1, c), pol(1, c + 90), hw, (GALLERY_TOP - PODIUM_Z) / 2, TURB_R, .8)
    return a


def housings():
    """The static half of each turbine: duct, front cowl lip, nacelle and four stator struts."""
    a = Accs()
    for i in range(N):
        c = i * STEP + STEP / 2
        ax, t = pol(1, c), pol(1, c + 90)
        collar(a["duct"], pol(50.6, c, TURB_Z), ax, TURB_R, TURB_R + .35, 2.6, 40)
        collar(a["cowl"], pol(DRUM_R + .2, c, TURB_Z), ax, TURB_R - .15, TURB_R + .45, .35, 40)
        lathe_ax(a["hub"], pol(48.4, c, TURB_Z), ax, [(.001, 0), (1.05, .1), (1.05, 3.1), (.9, 3.5)], 20)
        for k in range(4):
            q = math.radians(45 + 90 * k)
            d = t * math.cos(q) + Vector((0, 0, 1)) * math.sin(q)
            o = pol(50.9, c, TURB_Z)
            K.pipe(a["hub"], [tuple(o + d * .9), tuple(o + d * (TURB_R + .1))], .14, None, 6)
    return a


def fin_section(f, z, u):
    """Horizontal section of the vane rooted at bearing f, at height z (u = 0 root .. 1 tip): a curved lens."""
    span = max(.35, FIN_SPAN * (1 - u ** 2.2) ** .75)
    r_in = FIN_IN - 3.1 * smooth(.8, 1, u)
    tw = TWIST * u ** 1.2
    th0 = FIN_TH * (1 - .6 * u)
    m = 10
    cl = []
    for j in range(m):
        s = j / (m - 1)
        r = r_in + span * s
        off = span * math.tan(math.radians(VANE)) * s ** 1.25
        cl.append(pol(r, f + tw - math.degrees(off / r), z))
    side, back = [], []
    for j, p in enumerate(cl):
        s = j / (m - 1)
        d = (cl[min(j + 1, m - 1)] - cl[max(j - 1, 0)]).normalized()
        n = Vector((-d.y, d.x, 0))
        th = th0 * (.35 + .65 * math.sin(math.pi * (.12 + .88 * s)))
        side.append(tuple(p + n * th / 2))
        back.append(tuple(p - n * th / 2))
    return side + back[::-1]


def fins():
    a = Accs()
    k = 30
    for i in range(N):
        f = i * STEP
        secs = []
        for j in range(k + 1):
            u = 1 - (1 - j / k) ** 1.3
            z = PODIUM_Z - .2 + (FIN_TOP - PODIUM_Z + .2) * u
            secs.append(fin_section(f, z, u))
        loft(a["fin"], secs)
    return a


def dish_z(r):
    return DISH_Z + (DRUM_TOP - DISH_Z) * ((r - DISH_IN) / (WALK_IN - DISH_IN)) ** 1.5


def roof():
    a = Accs()
    rs = [DISH_IN + (WALK_IN - DISH_IN) * i / 14 for i in range(15)]
    top = [(r, dish_z(r)) for r in reversed(rs)]
    lathe(a["roof"], top + [(r, z - 1.2) for r, z in reversed(top)], 160, wrap=True)
    lip = [(23.0 + 1.55 * math.cos(math.radians(q)), 24.0 + .75 * math.sin(math.radians(q))) for q in range(0, 360, 20)]
    lathe(a["lip"], lip, 160, wrap=True)
    ring(a["glowline"], HOLE_R + .05, HOLE_R + .2, 23.55, 23.95, 160)
    ring(a["shaft"], HOLE_R, HOLE_R + .6, PODIUM_Z, 23.7, 128)
    for i in range(6):                                                              # light lines down the shaft
        ring(a["glowline"], HOLE_R - .04, HOLE_R, 7.0 + i * 2.7, 7.12 + i * 2.7, 128)
    for j in range(36):                                                             # spiral ribs, turning inwards
        a0 = j * 10.0
        pts = []
        for q in range(15):
            u = q / 14
            r = WALK_IN - .4 - (WALK_IN - DISH_IN - 2.0) * u
            pts.append(tuple(pol(r, a0 + 62.0 * u ** 1.1, dish_z(r) + .25 - .2 * u)))
        beam(a["rib"], pts, 1.4, 1.1, .55, .45)
    return a


# --- TURBINES ------------------------------------------------------------------------------------------------------------
def rotor():
    """One ducted-fan rotor in its own frame: axis = local +x (pointing out of the drum), spinner nose forward."""
    a = Accs()
    X = Vector((1, 0, 0))
    lathe_ax(a["hub"], Vector((-.7, 0, 0)), X, [(.001, -.05), (.95, 0), (1.0, .6), (.85, 1.05), (.45, 1.35), (.001, 1.45)], 24)
    nb = 9
    for k in range(nb):
        phi = 2 * math.pi * k / nb
        er, et = Vector((0, math.cos(phi), math.sin(phi))), Vector((0, -math.sin(phi), math.cos(phi)))
        secs = []
        for q in range(6):
            u = q / 5
            s = .9 + (TURB_R - .25 - .9) * u
            ch, p = 1.5 - .55 * u, math.radians(40 - 22 * u)
            cd, nd = et * math.cos(p) + X * math.sin(p), -et * math.sin(p) + X * math.cos(p)
            c = er * s + X * .1
            secs.append([tuple(c + cd * (sx * ch / 2) + nd * (sy * .06)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
        loft(a["blade"], secs)
    return a


# --- DECK: roof walkway, rails, lift heads -------------------------------------------------------------------------------
def deck(rng):
    a = Accs()
    ring(a["walk"], WALK_IN, DRUM_IN + .02, DRUM_TOP - .4, DRUM_TOP + .03, 160)
    ring(a["glowline"], WALK_IN + .3, WALK_IN + .45, DRUM_TOP + .03, DRUM_TOP + .05, 160)
    rail_arc(a, WALK_IN + .1, DRUM_TOP + .03, 0, 360)
    for a0, a1 in gaps(0, 360, [(p, 0.0) for p in PAVILIONS], .5):
        rail_arc(a, WALK_OUT - .15, DRUM_TOP + .03, a0, a1)
    for b in PAVILIONS:
        r = WALK_OUT - 1.9
        radial_box(a["glass"], b, r, DRUM_TOP + 1.55, (3.4, 6.0, 3.0))
        radial_box(a["roof"], b, r + .1, DRUM_TOP + 3.2, (4.0, 6.8, .35))
        radial_box(a["glowline"], b, r + .1, DRUM_TOP + 2.98, (3.7, 6.5, .08))
        for sr in (-1, 1):
            for st in (-1, 1):
                p = pol(r + sr * 1.65, b) + pol(1, b + 90) * (st * 2.95)
                obox(a["frame"], (p.x, p.y, DRUM_TOP + 1.55), (.18, .18, 3.1), math.radians(b))
        radial_box(a["door"], b, r - 1.72, DRUM_TOP + 1.25, (.05, 1.8, 2.4))
    for a0, a1 in gaps(0, 360, holes_for(PODIUM_R), .5):                           # promenade rail on the podium
        rail_arc(a, PODIUM_R - .45, PODIUM_Z + .03, a0, a1)
    return a


# --- VORTEX --------------------------------------------------------------------------------------------------------------
def v_r(z):
    """Funnel radius: r 17 in the opening, widening slowly, then flaring into the underside of the cap cloud."""
    u = min(max((z - V_BOT) / (V_TOP - V_BOT), 0.0), 1.0)
    return 17.0 + 9.0 * u ** 1.6 + 14.0 * smooth(.85, 1, u) ** 2


def funnel():
    a = Accs()
    zs = [V_BOT + (V_TOP - V_BOT) * i / 40 for i in range(41)]
    skin(a["vortex_core"], [(v_r(z) * .7, z) for z in zs], 72)
    skin(a["vortex_shell"], [(v_r(z), z) for z in zs], 72)
    return a


def streaks(rng):
    """Twisted cloud streaks: ribbons on helices round the funnel (about one turn per 55 m of rise, each its own pitch),
    pointed at both ends; a few run just inside the outer shell for depth."""
    a = Accs()
    for q in range(84):
        th0 = rng.uniform(0, 2 * math.pi)
        z0 = rng.uniform(V_BOT + 8, 96)
        z1 = min(V_TOP - 2, z0 + rng.uniform(22, 64))
        f = rng.uniform(.9, .99) if q % 5 == 0 else rng.uniform(1.0, 1.05)
        w = rng.uniform(1.2, 4.0)
        pitch = rng.uniform(48, 64)
        n = max(8, int((z1 - z0) / 1.0))
        pts = []
        for i in range(n + 1):
            z = z0 + (z1 - z0) * i / n
            ang = th0 + 2 * math.pi * z / pitch
            pts.append(Vector((v_r(z) * f * math.cos(ang), v_r(z) * f * math.sin(ang), z)))
        vs, fs = [], []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, n)] - pts[max(i - 1, 0)]).normalized()
            er = Vector((p.x, p.y, 0)).normalized()
            wd = er.cross(t).normalized()
            hw = w / 2 * max(0.0, math.sin(math.pi * i / n)) ** .6 + .02
            vs += [tuple(p - wd * hw), tuple(p + wd * hw)]
        fs = [(2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1) for i in range(n)]
        a[("streak", "streak_b", "streak_shade")[q % 3]]._push(vs, fs)
    return a


def cap():
    """The flat disc cloud the vortex makes at its top: a lumpy lens."""
    a = Accs()
    prof = [(.6, 114.0), (26, 114.2), (40, 115.4), (50, 117.2), (56, 119.4), (57.5, 121.0), (53, 122.6), (41, 124.0),
            (25, 125.0), (.6, 125.4)]
    n = 96
    secs = []
    for k, (r, z) in enumerate(prof):
        row = []
        for j in range(n):
            t = 2 * math.pi * j / n
            rr = r * (1 + .03 * math.sin(3 * t + k) + .02 * math.sin(7 * t + 2 * k) + .01 * math.sin(13 * t + k * 3))
            row.append((rr * math.cos(t), rr * math.sin(t), z + .3 * math.sin(5 * t + k)))
        secs.append(row)
    loft(a["cloud"], secs)
    return a


def ring_mesh(R):
    a = Accs()
    lathe(a["ring"], [(R + RING_TUBE * math.cos(math.radians(q)), RING_TUBE * math.sin(math.radians(q))) for q in range(0, 360, 30)], 192, wrap=True)
    lathe(a["ring_glow"], [(R - RING_TUBE - .02 + .16 * math.cos(math.radians(q)), .16 * math.sin(math.radians(q))) for q in range(0, 360, 45)], 192, wrap=True)
    for k in range(6):                                                              # six thin collars, so the ring reads as made
        b = k * 60.0
        collar(a["ring"], pol(R, b), pol(1, b + 90), RING_TUBE - .05, RING_TUBE + .18, .5, 16)
    return a


# --- PLAZA ---------------------------------------------------------------------------------------------------------------
def stairs(a):
    for b, w in STAIRS:
        n = int(PODIUM_Z / RISE + .5)
        for k in range(n):
            h = PODIUM_Z - k * RISE
            radial_box(a["step"], b, PODIUM_R + (k + .5) * TREAD - .02, h / 2, (TREAD + .04, w, h))
        run = n * TREAD
        for s in (-1, 1):                                                           # cheek walls following the slope
            off = pol(1, b + 90) * (s * (w / 2 + .35))
            prof = [(PODIUM_R - .3, 0), (PODIUM_R + run + .4, 0), (PODIUM_R + run + .4, .55), (PODIUM_R - .3, PODIUM_Z + .55)]
            secs = [[tuple(pol(r, b, z) + off + pol(1, b + 90) * (d * .35)) for r, z in prof] for d in (-1, 1)]
            loft(a["coping"], secs)
            K.pipe(a["rail"], [tuple(pol(r, b, z + RAIL_H) + off) for r, z in ((PODIUM_R - .3, PODIUM_Z + .55), (PODIUM_R + run + .4, .55))], .05, None, 6)
        for k in range(3):                                                          # mid handrails on the wide stair
            if w < 12:
                break
            off = pol(1, b + 90) * ((k - 1) * w / 3.2)
            K.pipe(a["rail"], [tuple(pol(r, b, z) + off) for r, z in ((PODIUM_R + .2, PODIUM_Z + .95), (PODIUM_R + run - .2, 1.0))], .04, None, 6)


def ramps(a):
    for foot, top in RAMPS:
        n = int(abs(top - foot) / 1.5)
        secs = []
        for i in range(n + 1):
            b = foot + (top - foot) * i / n
            z = PODIUM_Z * i / n
            secs.append([tuple(pol(r, b, zz)) for r, zz in ((RAMP_R0, -.05), (RAMP_R1, -.05), (RAMP_R1, z + .05), (RAMP_R0, z + .05))])
        loft(a["ramp"], secs)
        for r in (RAMP_R0 + .15, RAMP_R1 - .15):                                    # rails up both edges
            pts = [tuple(pol(r, foot + (top - foot) * i / n, PODIUM_Z * i / n + .05 + RAIL_H)) for i in range(n + 1)]
            K.pipe(a["rail"], pts, .045, None, 6)
            for i in range(0, n + 1, 2):
                p = Vector(pts[i])
                obox(a["rail"], (p.x, p.y, p.z - RAIL_H / 2), (.08, .08, RAIL_H), 0)
        hw = math.degrees(3.4 / PLANTER_R1)                                         # landing across the planters
        sector(a["ramp"], PODIUM_R - .5, RAMP_R1, top - hw, top + hw, -.05, PODIUM_Z + .05, 1)


def plaza(rng):
    a = Accs()
    ring(a["paving"], PODIUM_R, PAVE_R, -.3, .0, 160)
    ring(a["glowline"], PAVE_R - .25, PAVE_R - .12, .0, .02, 160)
    ring(a["grass"], PAVE_R, LAWN_R, -.3, .04, 160)
    ring(a["paving_b"], 106.0, 110.0, .0, .07, 160)                                 # loop path through the lawn
    for b in PATHS:
        w = 12.0 if b == -90 else 6.0
        radial_box(a["paving_b"], b, (PAVE_R - 1 + LAWN_R - .5) / 2, .04, (LAWN_R - PAVE_R + .5, w, .08))
    for a0, a1 in gaps(0, 360, holes_for(PLANTER_R1), .5):                         # terrace planters with hedges
        sector(a["coping"], PLANTER_R0, PLANTER_R1, a0, a1, -.1, 2.2, 1.5)
        sector(a["soil"], PLANTER_R0 + .3, PLANTER_R1 - .3, a0 + .3, a1 - .3, 2.2, 2.32, 1.5)
        sector(a["hedge"], PLANTER_R0 + .5, PLANTER_R0 + 2.1, a0 + .5, a1 - .5, 2.3, 3.2, 1.5)
        sector(a["grass"], PLANTER_R0 + 2.1, PLANTER_R1 - .4, a0 + .4, a1 - .4, 2.3, 2.45, 1.5)
    stairs(a)
    ramps(a)
    for d in range(0, 360, 12):                                                     # benches on the paved ring, facing out
        if min(abs(math.remainder(d - p, 360)) for p in PATHS) < 7 or any(abs(math.remainder(d - (f + t) / 2, 360)) < 30 for f, t in RAMPS):
            continue
        M.kit_prop(K.ctx(a, rng, *pol(PAVE_R - 1.4, d), math.radians(d) - math.pi / 2), "bench", 0, 0, 0)
    for i in range(32):                                                             # low lights round the paved ring
        p = pol(PAVE_R - .6, i * 360 / 32 + 5.6)
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
    return K.build_mesh("q11c_tree_%d" % seed, a, 180)


def tree_spots(rng):
    """Lawn trees in loose clumps, off the paths and the loop, with the main view's foreground left open."""
    out, tries = [], 0
    while len(out) < 40 and tries < 5000:
        tries += 1
        r, d = rng.uniform(112, LAWN_R - 3), rng.uniform(0, 360)
        if min(abs(math.remainder(d - p, 360)) * math.radians(1) * r for p in PATHS) < 7:
            continue
        if abs(math.remainder(d + 90, 360)) < 30 or any((pol(r, d) - q).length < 7.5 for q in out):
            continue
        out.append(pol(r, d, .04))
    return out


# --- materials -----------------------------------------------------------------------------------------------------------
def mat(name, hexc, rough=.6, metal=0.0, alpha=1.0, emit=None, strength=1.0, culling=True):
    m = G.material("q11c_" + name, srgb(hexc, alpha), rough, srgb(emit) if emit else None, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


def make_materials():
    K.MATS.clear()
    K.MATS.update({
        "fin": mat("vane_white", "F3F2EE", .32, .08), "drum": mat("drum_panel", "E8EBEA", .45, .1),
        "podium": mat("podium_stone", "E4E1DA", .7), "seam": mat("seam", "8E979B", .5, .4),
        "glass_band": mat("glass_band", "5D7C90", .12, .4), "frame": mat("frame_silver", "E2E6E7", .38, .55),
        "cowl": mat("cowl_silver", "D8DDE0", .22, .8), "duct": mat("duct_metal", "AEB6BB", .35, .7),
        "blade": mat("turbine_blade", "C9CFD3", .28, .75), "hub": mat("turbine_hub", "EDF0F1", .3, .5),
        "hall": mat("hall_dark", "2F383D", .6), "vortex_floor": mat("vortex_floor", "9AA6AD", .7),
        "roof": mat("roof_white", "EEF0EE", .5), "rib": mat("roof_rib", "F7F7F4", .35, .05),
        "lip": mat("opening_lip", "E3E8EA", .3, .5), "shaft": mat("shaft_wall", "B7C1C6", .6, .2),
        "walk": mat("walkway", "E3E0D9", .8), "rail": mat("rail_steel", "D8DCDD", .32, .6),
        "glass": mat("rail_glass", "C6E2EA", .05, alpha=.25, culling=False), "door": mat("door_dark", "3A4246", .4, .3),
        "glowline": mat("pale_light", "D7F2FB", .4, emit="C6EEFF", strength=2.0),
        "ring": mat("ring_metal", "D9DEE0", .18, .85), "ring_glow": mat("ring_light", "E4F6FF", .3, emit="CFEFFF", strength=4.0),
        "vortex_core": mat("vortex_core", "F2F6F9", .9, alpha=.78, emit="EEF4F8", strength=.5, culling=False),
        "vortex_shell": mat("vortex_shell", "F5F8FA", .9, alpha=.18, emit="F0F5F8", strength=.4, culling=False),
        "streak": mat("vortex_streak", "FFFFFF", .9, alpha=.62, emit="F6FAFC", strength=.5, culling=False),
        "streak_b": mat("vortex_streak_soft", "EEF3F7", .9, alpha=.4, emit="E8F0F6", strength=.35, culling=False),
        "streak_shade": mat("vortex_streak_shade", "D3DDE6", .9, alpha=.7, culling=False),
        "cloud": mat("cap_cloud", "F7F9FB", .95, alpha=.85, emit="F2F6F9", strength=.3, culling=False),
        "step": mat("stair_stone", "E9E6DF", .7), "ramp": mat("ramp_stone", "E1DDD5", .75),
        "coping": mat("coping_stone", "EEEBE4", .55), "soil": mat("soil", "6B5138", .95), "hedge": mat("hedge", "62853F", .9),
        "paving": mat("paving", "D9D4CA", .85), "paving_b": mat("paving_band", "C9C3B7", .85), "grass": mat("lawn", "7E9C4E", .9),
    })
    for role, (rgba, emit, strength) in M.ROLES.items():                         # library props and planting
        leafy = role in ("leaf_l", "green")
        m = G.material("q11c_in_" + role, rgba, .6, emit, strength)
        m.use_backface_culling = not leafy and rgba[3] >= 1
        K.MATS["in_" + role] = m
    return K.MATS


# --- preview staging -------------------------------------------------------------------------------------------------------
def preview(col, trees, rng):
    mk = lambda n, h, r=.8, **k: K.MATS.setdefault("pv_" + n, mat("pv_" + n, h, r, **k))  # noqa: E731
    mk("water", "4A86A8", .06)
    mk("land", "A9B58A", .95)
    mk("path", "D3CDC1", .9)
    mk("far", "BCCAD6", .9)
    mk("farw", "E1E7EB", .8)
    a = Accs()
    shore = 150.0
    loft(a["pv_water"], [[(-5000, shore, z), (5000, shore, z), (5000, 7000, z), (-5000, 7000, z)] for z in (-2.5, -2)])
    loft(a["pv_land"], [[(-900, -700, z), (900, -700, z), (900, shore, z), (-900, shore, z)] for z in (-3, -.32)])
    loft(a["pv_path"], [[(-900, shore - 9, z), (900, shore - 9, z), (900, shore + 1, z), (-900, shore + 1, z)] for z in (-3, .0)])
    for i in range(220):                                                       # far shore across the bay
        x = rng.uniform(-4200, 4200)
        y = rng.uniform(2300, 3000)
        h = rng.uniform(15, 70) * (2.4 if rng.random() < .1 else 1)
        w = rng.uniform(20, 50)
        K.box(a["pv_far"], x, x + w, y, y + w, -2, h)
    loft(a["pv_far"], [[(-6000, 2400, z), (6000, 2400, z), (6000, 3400, z), (-6000, 3400, z)] for z in (-2.2, 5)])
    bx, by = Vector((700.0, 1500.0)), Vector((2200.0, 2350.0))                   # a suspension bridge to the right
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
    ob = bpy.data.objects.new("PV_Context", K.build_mesh("pv_context", a))
    col.objects.link(ob)
    n = 0
    while n < 300:                                                             # park trees round the lawn
        r, d = rng.uniform(LAWN_R + 6, 240), rng.uniform(0, 360)
        p = pol(r, d)
        if p.y > shore - 14 or abs(math.remainder(d + 90, 360)) < 16:
            continue
        t = bpy.data.objects.new("PV_Tree_%03d" % n, trees[n % 3])
        t.location = (p.x, p.y, -.32)
        t.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        t.scale = (rng.uniform(1.1, 1.7),) * 3
        col.objects.link(t)
        n += 1


# --- layout checks (written into the report) ---------------------------------------------------------------------------------
def layout_checks():
    out = {}
    gap = 1e9                                                                   # clear gap between neighbouring vanes
    for u in (0.0, .25, .5, .75):
        z = PODIUM_Z + (FIN_TOP - PODIUM_Z) * u
        s0, s1 = fin_section(0.0, z, u), fin_section(STEP, z, u)
        gap = min(gap, min((Vector(p) - Vector(q)).length for p in s0 for q in s1))
    out["vane_gap_min_m"] = round(gap, 2)
    out["vane_outer_edge_root_r_m"] = round(max(Vector(p).xy.length for p in fin_section(0.0, PODIUM_Z, 0.0)), 2)
    out["rings"] = {n: {"radius": R, "z": z, "clear_to_streaks_m": round(R - RING_TUBE - v_r(z) * 1.07 - .5, 2)} for n, R, z in RINGS}
    out["funnel_r_at_lip_m"] = round(v_r(24.0), 2)
    out["levels"] = {"podium": PODIUM_Z, "roof_walkway": DRUM_TOP, "vane_tip": FIN_TOP, "cap_top": 125.4}
    out["stair_foot_r_m"] = round(PODIUM_R + int(PODIUM_Z / RISE + .5) * TREAD, 2)
    return out


# --- assembly ----------------------------------------------------------------------------------------------------------------
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
    root = bpy.data.objects.new("Q11C_StormVortex", None)
    col.objects.link(root)
    groups = {}
    for g in ("STRUCTURE", "TURBINES", "VORTEX", "RINGS", "DECK", "PLAZA"):
        e = bpy.data.objects.new(g, None)
        c = bpy.data.collections.new("Q11C_" + g)
        col.children.link(c)
        c.objects.link(e)
        e.parent = root
        groups[g] = (e, c)

    def add(name, accs, g, smooth_deg=30, mw=None, data=None):
        ob = bpy.data.objects.new(name, data or K.build_mesh("q11c_" + name.lower(), accs, smooth_deg))
        groups[g][1].objects.link(ob)
        ob.parent = groups[g][0]
        if mw is not None:
            ob.matrix_local = mw
        return ob

    add("STRUCTURE_PODIUM", podium(), "STRUCTURE")
    add("STRUCTURE_DRUM", drum(), "STRUCTURE")
    add("STRUCTURE_VANES", fins(), "STRUCTURE", 40)
    add("STRUCTURE_ROOF", roof(), "STRUCTURE", 40)
    add("TURBINE_HOUSINGS", housings(), "TURBINES", 40)
    rot = K.build_mesh("q11c_turbine_rotor", rotor(), 40)
    for i in range(N):
        c = i * STEP + STEP / 2
        add("TURBINE_ROTOR_%03d" % round(c), None, "TURBINES", data=rot,
            mw=Matrix.Translation(pol(52.4, c, TURB_Z)) @ Matrix.Rotation(math.radians(c), 4, "Z"))
    add("VORTEX_FUNNEL", funnel(), "VORTEX", 60)
    add("VORTEX_STREAKS", streaks(rng), "VORTEX", 60)
    add("VORTEX_CAP", cap(), "VORTEX", 60)
    for name, R, z in RINGS:
        add("RING_" + name, ring_mesh(R), "RINGS", 40, mw=Matrix.Translation((0, 0, z)))
    add("DECK_WALKWAYS", deck(rng), "DECK")
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
              "objects": len(asset), "materials": len({m.name for o in asset if o.type == "MESH" for m in o.data.materials})}
    import review_storm_vortex as RV
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
                                  export_materials="EXPORT")
        report["glb_bytes"] = os.path.getsize(glb)
    report["layout"] = layout_checks()
    with open(os.path.join(HERE, "report.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps(report))


if __name__ == "__main__":
    main()
