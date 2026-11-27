"""Q05-B breathing giant leaf (owner-accepted target artifacts/q05-targets/q05b-breathing-leaf.jpg, 2026-11-26): a cultivated
giant plant whose five heart-shaped leaves are larger than a roof. Bay water enters through a white root ring, rises up glowing
aqua lines inside the clear glass-green stems, spreads through the lit leaf veins and falls from the leaf edges as fine mist curtains. Under
the leaves: a round lawn with a curved bench wall, benches, residents, ferns, stepping stones, a small stream, water mains
from the ring and a dense grove round the rim.
R2 (owner B-R1 verdict, 2026-11-27): matte deep-green leaves (runtime dims the sky reflection), deeper heart lobes and two
tiers of leaves tipped toward the close-up, thinner translucent stems spread apart, the stream moved to the near left clear of
the trees, and the grove rebuilt from the library facet_tree (low-poly faceted crowns, as in the target).
R3 (owner B-R2 «主力做嗰塊巨型嘅葉…近返 target…有細緻感…有厚度嘅感覺»): five leaves at five heights and sizes (no mirror
pairs), ovate blades on a fine grid with a three-level vein hierarchy, quilting, a wavy margin and a real slab with a light
rim band, a dark underside and keel, and a margin curling down.
R4 (owner B-R3): a thin blade with a soft vertex-colour vein glow, and the stems gathered in one bundle that fans out.
R5 (owner B-R4 «霧…唔似霧水»): the mist as wide overlapping veils with UVs, frayed at runtime into soft falling threads.

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_breathing_leaf.py
Writes q05b-breathing-leaf-2127.blend and .glb next to this file (glTF, no Meshopt/Draco).

Units are METRES, three.js axes (x, y up, z), ground-contact centre at the origin. Lot: NE PARK `LOTS['ne-park']` (48 x 48 m,
shared with Q05-A); the plinth is 24 m in radius, the leaves stay inside the lot + 2.5 m and reach ~22 m up. One node Q05B_BREATHING_LEAF, one
mesh per role named q05b_<role>; the runtime (src/breathingLeaf.ts) animates the emissive glow of six of them: q05b_pulse_a/b/c
(water dashes climbing the stems, lit in turn), q05b_vein (the leaf veins breathing) and q05b_mist_a/b (the mist curtains,
alpha-blended, breathing in antiphase). The mist hangs only from the leaf rims (owner: never a cloud, which is Q05-C).
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'city-kit-2127'))
from geo_helpers import Acc, circle_pts, cyl, obox, sweep  # noqa: E402
import modules as M  # noqa: E402

TAU = math.pi * 2
LAWN_R, PLINTH_R = 22.6, 24.0
CAM = -2.22                                     # azimuth of the q05 close-up cameras (model frame), as Q05-A
RING_R0, RING_R1, RING_H = 6.8, 4.1, 1.9         # root ring: outer, inner radius, height
BUNDLE = .8                                      # R4: stem bases this far from the centre, one bundle
WALL_R = 13.6                                    # curved bench wall
# Screen left of the close-up is +azimuth. R2 (owner «小溪…大半俾樹同霧遮住»): the stream runs across the near left, in front of
# the leaves and clear of the grove; the path and the water mains move to the near right, as in the target.
PATHS = [CAM - .35, CAM - .35 + math.pi]          # paved paths in from the rim (the near one beside the water mains)
MAINS = CAM - .12                                # water mains azimuth
STONES = CAM + .55                               # stepping-stone path azimuth (crosses the stream)
STREAM = (CAM + .12, CAM + 1.12)                 # stream arc between the wall and the rim, near left
STREAM_R = 17.0

# Five leaves: (azimuth offset from the camera azimuth, stem-top height, leaf length, attach radius, yaw twist, pitch, tilt toward
# the camera per metre, tip droop). Screen left of the close-up is +azimuth.
# R3 (owner B-R2 «近返 target 嘅圖片»): five distinct heights and sizes, no mirror pairs, as in the target: two high leaves at the
# back pointing up-left and up-right, a small low one between the stems behind, a broad mid leaf out to the left and the
# largest, lowest leaf drooping out to the near right. Each blade has its own tilt toward the camera (R2's single TILT shear
# turned the five into a flat four-leaf clover).
LEAVES = [(2.25, 22.0, 14.0, 7.6, -.15, .10, .32, .30),    # back left, highest
          (-2.35, 20.0, 13.5, 7.2, .20, .12, .34, .30),    # back right
          (3.05, 13.5, 10.5, 5.6, .10, .14, .30, .28),     # behind, low, small (between the stems)
          (1.30, 15.5, 15.0, 8.4, .12, .08, .24, .32),     # mid left, broad
          (-1.10, 10.5, 16.0, 8.6, -.10, .05, .24, .44)]   # near right, lowest and largest, drooping

Q05B_ROLES = {                                                    # build-only roles (shared ROLES untouched)
    'leaf': ((1, 1, 1, 1), None, .5),                               # leaf blade: white x vertex colours (R4, leaf_colour)
    'leaf_u': ((.07, .22, .08, 1), None, .5),                     # leaf underside and keel, darker (R3)
    'leaf_rim': ((.16, .40, .11, 1), None, .5),                   # the thin blade edge, a lighter line (R4: 0.10 m)
    'vein': ((.62, 1, .36, 1), (.50, 1, .28, 1), 1.6),            # lit veins (runtime breathes the glow)
    'stem': ((.26, .58, .26, .66), (.12, .34, .15, 1), .3),     # R4: denser glass green so the thick bundle reads       # stems: translucent glass green, the water core shows through
    'root': ((.30, .52, .28, 1), None, .5),                        # roots over the soil, opaque
    'water': ((.40, .95, .88, 1), (.30, .95, .85, 1), 1.4),        # aqua water line up each stem (not the concept #5fdcff)
    'pulse_a': ((.75, 1, .96, 1), (.55, 1, .92, 1), 2.0),          # water dashes, three phases lit in turn at runtime
    'pulse_b': ((.75, 1, .96, 1), (.55, 1, .92, 1), 2.0),
    'pulse_c': ((.75, 1, .96, 1), (.55, 1, .92, 1), 2.0),
    'mist_a': ((.94, .98, 1, .45), (.80, .90, .95, 1), .25),        # mist veils (runtime: soft thread alpha map, no depth write)
    'mist_b': ((.94, .98, 1, .45), (.80, .90, .95, 1), .25),
    'ring': ((.95, .96, .96, 1), None, .5),                        # root ring and water mains, white
    'aqua': ((.40, .95, .88, 1), (.30, .95, .85, 1), 2.4),         # ring and main light bands
    'stream': ((.42, .76, .86, 1), (.20, .48, .58, 1), .5),        # stream and pool water
    'rock': ((.78, .78, .74, 1), None, .5),
    'lawn': ((.20, .40, .12, 1), None, .5),
    'plinth': ((.90, .90, .87, 1), None, .5),
}
ROUGH = {'leaf': .85, 'leaf_u': .85, 'leaf_rim': .85, 'stem': .3, 'crown': .9, 'crown_l': .9, 'ring': .4, 'stream': .1, 'mist_a': .9, 'mist_b': .9, 'lawn': .9, 'plinth': .6,
         'rock': .8}
SMOOTH = {'leaf': 60, 'leaf_u': 60, 'leaf_rim': 60, 'vein': 50, 'stem': 60, 'water': 60, 'pulse_a': 60, 'pulse_b': 60, 'pulse_c': 60, 'ring': 40,
          'aqua': 40, 'green': 80, 'leaf_l': 80, 'rock': 35, 'root': 60, 'crown': 1, 'crown_l': 1}
DOUBLE = ('green', 'leaf_l', 'mist_a', 'mist_b', 'stem')                   # drawn from both sides


def ring_band(acc, section, n=72, r0=None):
    """Solid of revolution of a closed (r, y) section."""
    rmax = r0 or max(r for r, _ in section)
    sweep(acc, lambda k: circle_pts(0, 0, rmax - k, n), [(rmax - r, y) for r, y in section], closed=True, caps=(False, False))


def ground(ctx):
    a = ctx.a
    cyl(a['plinth'], 0, 0, PLINTH_R, 0, .35, 96)
    cyl(a['lawn'], 0, 0, LAWN_R, .35, .48, 96)
    ring_band(a['plinth'], [(LAWN_R + .9, .35), (LAWN_R + .9, .55), (LAWN_R - .1, .55), (LAWN_R - .1, .35)], 112)  # rim kerb
    ring_band(a['plinth'], [(RING_R0 + 2.0, .35), (RING_R0 + 2.0, .55), (RING_R0 - .1, .55), (RING_R0 - .1, .35)], 72)  # paving
    for ang in PATHS:                                                        # paved paths from the rim to the ring paving
        c, s = math.cos(ang), math.sin(ang)
        r0, r1 = RING_R0 + 1.8, LAWN_R
        obox(a['plinth'], ((r0 + r1) / 2 * c, .51, (r0 + r1) / 2 * s), (r1 - r0, .08, 2.4), (c, s), (-s, c))
    rng = ctx.rng
    for i in range(9):                                                       # stepping stones across the lawn
        r = RING_R0 + 2.6 + i * 1.45
        ang = STONES + .05 * math.sin(i * 1.3)
        x, z = r * math.cos(ang), r * math.sin(ang)
        M.ell(a['rock'], (x, .5, z), (.62 + rng.uniform(0, .12), 0, 0), (0, .09, 0), (0, 0, .48 + rng.uniform(0, .1)), 10, 3)


def stream(ctx):
    """A small stream between the bench wall and the grove, ending in a pool, edged with low rocks."""
    a, rng = ctx.a, ctx.rng
    a0, a1 = STREAM
    rows, rm = 40, STREAM_R
    verts = []
    for j in range(rows + 1):
        t = j / rows
        ang = a0 + (a1 - a0) * t
        w = .7 + .18 * math.sin(t * 7) + (1.4 * (t - .8) / .2 if t > .8 else 0)
        r = rm + .5 * math.sin(t * 5)
        c, s = math.cos(ang), math.sin(ang)
        verts += [((r - w) * c, .53, (r - w) * s), ((r + w) * c, .53, (r + w) * s)]
    a['stream'].surface(verts, [(j * 2, j * 2 + 1, j * 2 + 3, j * 2 + 2) for j in range(rows)], lambda c: (0, 1, 0))
    for j in range(0, rows + 1, 2):
        t = j / rows
        ang = a0 + (a1 - a0) * t
        for side in (-1, 1):
            w = .7 + .18 * math.sin(t * 7) + (1.4 * (t - .8) / .2 if t > .8 else 0) + .35
            r = rm + .5 * math.sin(t * 5) + side * w
            sz = rng.uniform(.35, .6)
            M.ell(a['rock'], (r * math.cos(ang), .5, r * math.sin(ang)), (sz, 0, 0), (0, sz * .55, 0), (0, 0, sz * .8), 8, 4)
            if side > 0 and j % 6 == 3:                                     # low ferns on the outer bank, never a screen
                ro = r + .9
                M.leaf_clump(ctx, (ro * math.cos(ang), .9, ro * math.sin(ang)), (.9, .5, .9), roles=('leaf_l', 'green'),
                             core='green', n=30, size=.4, droop=.55, lobes=2)


def in_stream(ang, pad=.1):
    """Whether an azimuth falls over the stream arc (plus pad), so nothing tall stands between it and the close-up."""
    d = (ang - STREAM[0] + math.pi) % TAU - math.pi
    return -pad < d < STREAM[1] - STREAM[0] + pad


def bench_wall(ctx):
    """Low curved wall with a wooden seat top, open at the paths and the stepping stones; benches inside facing the plant;
    ferns behind it."""
    a, rng = ctx.a, ctx.rng
    gaps = [*PATHS, STONES]

    def open_at(ang, gap=.22):
        return any(abs((ang - g + math.pi) % TAU - math.pi) < gap for g in gaps)

    n = 120
    for i in range(n):
        ang = (i + .5) * TAU / n
        if open_at(ang):
            continue
        c, s = math.cos(ang), math.sin(ang)
        seg = WALL_R * TAU / n + .02
        obox(a['white'], (WALL_R * c, .9, WALL_R * s), (.8, .8, seg), (c, s), (-s, c))
        obox(a['wood'], ((WALL_R - .1) * c, 1.33, (WALL_R - .1) * s), (.62, .08, seg), (c, s), (-s, c))
    for i in range(10):
        ang = CAM + (i + .5) * TAU / 10
        if open_at(ang, .3):
            continue
        r = WALL_R - 1.6
        x, z = r * math.cos(ang), r * math.sin(ang)
        yaw = math.atan2(-x, -z)
        M.kit_prop(ctx, 'bench', x, .48, z, yaw + math.pi)
        if i % 2 == 0:
            M.seated_person(ctx, x + .35 * math.cos(ang + math.pi / 2), .48 + .45, z + .35 * math.sin(ang + math.pi / 2), yaw)
    for i in range(26):                                                      # ferns behind the wall
        ang = (i + rng.uniform(-.3, .3)) * TAU / 26
        if open_at(ang, .3):
            continue
        if in_stream(ang, .02):
            continue
        r = WALL_R + rng.uniform(.9, 1.8)
        sz = rng.uniform(.9, 1.3)
        M.leaf_clump(ctx, (r * math.cos(ang), 1.0, r * math.sin(ang)), (sz, sz * .6, sz), roles=('leaf_l', 'green'),
                     core='green', n=40, size=.42, droop=.55, lobes=2)


def root_ring(ctx):
    """White root ring (bolted panels, an aqua light band), dark soil inside, roots spreading over it."""
    a = ctx.a
    ring_band(a['ring'], [(RING_R0, .35), (RING_R0, 1.15), (RING_R0 - .35, RING_H), (RING_R1 + .2, RING_H), (RING_R1, RING_H - .3),
                          (RING_R1, .35)], 96)
    ring_band(a['aqua'], [(RING_R0 + .06, .95), (RING_R0 + .06, 1.18), (RING_R0 - .05, 1.18), (RING_R0 - .05, .95)], 96)
    for i in range(16):                                                      # panel seams
        ang = (i + .5) * TAU / 16
        c, s = math.cos(ang), math.sin(ang)
        obox(a['slate'], ((RING_R0 + .01) * c, .75, (RING_R0 + .01) * s), (.05, .7, .07), (c, s), (-s, c))
    cyl(a['soil'], 0, 0, RING_R1 + .05, 1.2, RING_H - .2, 48)


def stem_path(az, top, rad):
    """Stem centreline from the soil to the leaf attachment. R4 (owner B-R3 «聚集喺同一點，然後再散出嚟»): the five stems rise
    from one bundle at the ring centre (bases 0.8 m from the centre, merged), stay together to ≈ 3–4 m, then fan out."""
    c, s = math.cos(az), math.sin(az)
    ctrl = [(BUNDLE, RING_H - .4), (1.0, top * .34), (rad * .42, top * .78), (rad, top)]
    pts = []
    for j in range(29):
        t = j / 28
        b = ((1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3)
        r = sum(w * q[0] for w, q in zip(b, ctrl))
        y = sum(w * q[1] for w, q in zip(b, ctrl))
        pts.append((r * c, y, r * s))
    return pts


def along(pts, t):
    """Point at fraction t of a polyline's vertex sequence (linear between vertices)."""
    f = t * (len(pts) - 1)
    i = min(int(f), len(pts) - 2)
    u = f - i
    return tuple(pts[i][k] + (pts[i + 1][k] - pts[i][k]) * u for k in range(3))


def stems(ctx):
    a = ctx.a
    for k, (daz, top, ln, rad, *_) in enumerate(LEAVES):
        az = CAM + daz
        pts = stem_path(az, top, rad)
        M.limb(a['stem'], pts[:3], 1.10, .95, 14)                           # R4: swollen foot of the bundle
        M.limb(a['stem'], pts, .95, .36, 14)
        line = pts                                                           # aqua water core inside the clear stem
        M.limb(a['water'], line, .18, .09, 8)
        for d in range(18):                                                  # dashes: phase d % 3 of 18 along the stem
            t0, t1 = (d + .15) / 18, (d + .75) / 18
            M.limb(a['pulse_' + 'abc'[d % 3]], [along(line, t0 + (t1 - t0) * q / 3) for q in range(4)], .2, .16, 8)
        for r in range(3):                                                   # roots over the soil to the ring rim
            ra = az + (r - 1) * .55
            c, s = math.cos(ra), math.sin(ra)
            b = (math.cos(az) * BUNDLE, RING_H - .1, math.sin(az) * BUNDLE)  # R4: roots splay from the bundle foot
            M.limb(a['root'], [b, (1.6 * c, RING_H - .05, 1.6 * s), (3.0 * c, RING_H - .1, 3.0 * s), (3.9 * c, RING_H - .12, 3.9 * s)],
                   .42, .12, 8)


# Leaf outline control points (right half, normalised to length 1): tip at u = 1, petiole sinus near u = 0, two basal lobes.
# R3 (owner B-R2 «有細緻感，同埋有厚度嘅感覺»): the blade is resampled smooth (≈ 100 outline points, 22 rings) so it can carry
# relief; a three-level vein hierarchy (raised midrib, swept secondaries, tertiaries and a marginal vein) with a lighter halo
# under the main veins; quilted panels between the secondaries; a wavy margin; a real 0.42–0.60 m slab with a lighter rim
# band, a keel under the midrib, the halves falling away from the midrib and the margin curling down so the thickness shows.
# R4 (owner B-R3 «太厚，唔似一塊葉…紋理唔夠靚»): a thin 0.10–0.20 m blade with a light edge line; five secondaries per side
# fading before the margin; tertiaries and hard halo strips gone, the glow and the light-to-dark gradient are vertex colours.
OUTLINE = [(1.0, 0), (.90, .12), (.76, .27), (.58, .40), (.38, .48), (.18, .50), (.0, .48), (-.15, .43), (-.28, .34),
           (-.37, .22), (-.37, .11), (-.26, .05), (-.08, 0)]
CENTRE = (.30, 0)
RINGS = 22
SPAN = 4                                         # resampled points per outline span
NARROW = .80                                     # R3: blade width .8 of R2's (ovate like the target, not round)
SP = .16                                         # secondary vein spacing along the midrib (normalised)


def _crspan(p0, p1, p2, p3, t):
    return tuple(.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t
                       + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t ** 3) for k in range(2))


def _right_half():
    """Smooth right half from the tip to the sinus (Catmull-Rom through OUTLINE), the margin gently wavy."""
    c = [OUTLINE[0]] + OUTLINE + [OUTLINE[-1]]
    pts = []
    for i in range(len(OUTLINE) - 1):
        for j in range(SPAN):
            pts.append(_crspan(c[i], c[i + 1], c[i + 2], c[i + 3], j / SPAN))
    pts.append(OUTLINE[-1])
    out = []
    for i, (u, v) in enumerate(pts):                                     # undulate across the blade, never at tip or sinus
        f = math.sin(math.pi * i / (len(pts) - 1))
        k = 1 + .018 * f * math.sin(i * .62)
        out.append((CENTRE[0] + (u - CENTRE[0]) * k, v * k * NARROW))
    out[0], out[-1] = OUTLINE[0], OUTLINE[-1]
    return out


RIGHT = _right_half()
FULL = RIGHT + [(u, -v) for u, v in reversed(RIGHT[1:-1])]


def half_width(u):
    """Outer half-width of the blade at u (largest v of the right half where it crosses u)."""
    best = 0.0
    for (ua, va), (ub, vb) in zip(RIGHT, RIGHT[1:]):
        if min(ua, ub) <= u <= max(ua, ub) and ua != ub:
            best = max(best, va + (vb - va) * (u - ua) / (ub - ua))
    return best or 1e-3


def inside(u, v, shrink=1.0):
    """Point-in-outline test, the outline scaled by `shrink` about CENTRE."""
    poly = [(CENTRE[0] + (a - CENTRE[0]) * shrink, b * shrink) for a, b in FULL]
    hit = False
    for (ua, va), (ub, vb) in zip(poly, poly[1:] + poly[:1]):
        if (va > v) != (vb > v) and u < ua + (v - va) * (ub - ua) / (vb - va):
            hit = not hit
    return hit


def _smooth(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def sweep_g(s):
    """How far a secondary vein has run toward the tip once it is s out from the midrib (they sweep forward)."""
    return .30 * s + 2.0 * s * s


def relief(u, s, w):
    """Quilted panels between the veins (normalised height): secondaries swept from the midrib, basal veins fanning into
    the lobes from the petiole; zero at the midrib and along the margin."""
    phi = (u - sweep_g(s) - .02) / SP
    sec = math.sin(math.pi * phi) ** 2
    th = math.atan2(s, .06 - u + 1e-6)
    lobe = math.sin(math.pi * th / .36) ** 2
    b = _smooth(.06, -.06, u)
    return .005 * ((1 - b) * sec + b * lobe) * _smooth(.02, .08, s) * (1 - _smooth(.82, 1, w))


LEAF_LIGHT, LEAF_DARK, LEAF_GLOW = (.06, .25, .065, 1), (.012, .085, .03, 1), (.26, .66, .14, 1)


def leaf_colour(u, v):
    """Top-face vertex colour (linear): lighter green at the midrib and the petiole, deepening toward the margin, with a soft
    glow either side of the midrib and of each secondary (and the lobe veins) that fades out toward the margin."""
    s = abs(v)
    w = min(1.0, s / half_width(u))
    near = 1 - _smooth(0, .95, w)
    phi = (u - sweep_g(s) - .05) / SP
    d_sec = abs(phi - round(phi)) * SP if -.5 < phi < 4.5 else 1
    th = math.atan2(s, .06 - u + 1e-6)
    d_lobe = abs(th - .36) * math.hypot(s, .06 - u) if u < .1 else 1
    glow = max(math.exp(-(s / .030) ** 2), math.exp(-(d_sec / .022) ** 2) * .8, math.exp(-(d_lobe / .022) ** 2) * .8) * (.25 + .75 * near)
    base = [LEAF_DARK[k] + (LEAF_LIGHT[k] - LEAF_DARK[k]) * (.25 + .75 * near) ** 1.4 for k in range(3)]
    return tuple([base[k] + (LEAF_GLOW[k] - base[k]) * .55 * glow for k in range(3)] + [1])


def leaf_frame(spec):
    daz, top, ln, rad, twist, pitch, tilt, droop = spec
    az = CAM + daz
    head = az + twist
    return {'o': (rad * math.cos(az), top, rad * math.sin(az)), 'd': (math.cos(head), 0, math.sin(head)),
            's': (-math.sin(head), 0, math.cos(head)), 'ln': ln, 'pitch': pitch, 'tilt': tilt, 'droop': droop}


CAM_DIR = (math.cos(CAM), math.sin(CAM))


def leaf_point(L, u, v, lift=0.0, under=False):
    """A point on the leaf's top face (or, `under`, the smooth face the slab hangs from): the midrib arches then the tip
    droops, the halves fall away from the midrib, the margin curls down, panels quilt between the veins, a ridge runs
    along the midrib, and the whole blade tips toward the close-up camera by the leaf's tilt so its top face shows."""
    o, d, sd, ln = L['o'], L['d'], L['s'], L['ln']
    s = abs(v)
    w = min(1.0, s / half_width(u))
    toward = (u * d[0] + v * sd[0]) * CAM_DIR[0] + (u * d[2] + v * sd[2]) * CAM_DIR[1]
    y = (L['pitch'] * u - L['droop'] * max(0, u) ** 2 - .10 * s - .25 * s * s - .018 * _smooth(.78, 1, w)
         - L['tilt'] * toward + .008 * w ** 3 * math.sin(17 * u + 11 * s))
    if not under:
        y += relief(u, s, w) + .006 * math.exp(-(s / .028) ** 2) * (1 - .6 * max(0, min(1, u)))
    return (o[0] + ln * (u * d[0] + v * sd[0]), o[1] + ln * y + lift, o[2] + ln * (u * d[2] + v * sd[2]))


def _trace(u0, step, shrink=.92):
    """Normalised (u, v) points of a vein starting on the midrib at u0, swept toward the tip, until it nears the margin."""
    pts, s = [], .012
    while True:
        u = u0 + sweep_g(s)
        if u > .97 or not inside(u, s, shrink):
            break
        pts.append((u, s))
        s += step
    return pts


def _fan(theta, step=.02, shrink=.92):
    """Basal vein fanning from the petiole into a lobe at angle theta from the backward midline."""
    pts, r = [], .02
    while True:
        u, s = .06 - r * math.cos(theta), r * math.sin(theta)
        if not inside(u, s, shrink):
            break
        pts.append((u, s))
        r += step
    return pts


def _vein(acc, L, uv, r0, r1, lift, flat=.6, n=6):
    if len(uv) >= 2:
        M.limb(acc, [leaf_point(L, u, v, lift) for u, v in uv], r0, r1, n, flat)


def leaves(ctx):
    a = ctx.a
    rims = []
    m = len(FULL)
    for spec in LEAVES:
        L = leaf_frame(spec)
        ln = L['ln']
        grid = [[(CENTRE[0] + (u - CENTRE[0]) * r / RINGS, v * r / RINGS) for u, v in FULL] for r in range(RINGS + 1)]
        top_v = [leaf_point(L, u, v) for row in grid for u, v in row]
        bot_v = []
        for row in grid:
            for u, v in row:
                p = leaf_point(L, u, v, under=True)
                w = min(1.0, abs(v) / half_width(u))
                bot_v.append((p[0], p[1] - (.10 + .10 * (1 - w)), p[2]))       # R4: a thin blade, 0.10–0.20 m
        nv = len(top_v)
        faces_t, faces_b = [], []
        for r in range(RINGS):
            for i in range(m):
                q = (r * m + i, r * m + (i + 1) % m, (r + 1) * m + (i + 1) % m, (r + 1) * m + i)
                faces_t.append(q)
                faces_b.append(tuple(nv + x for x in reversed(q)))
        rim = [(RINGS * m + i, RINGS * m + (i + 1) % m, nv + RINGS * m + (i + 1) % m, nv + RINGS * m + i) for i in range(m)]
        verts = top_v + bot_v
        cen = leaf_point(L, *CENTRE)
        a['leaf'].surface(verts, faces_t, lambda c: (0, 1, 0))
        a['leaf'].c += [leaf_colour(u, v) for row in grid for u, v in row] + [LEAF_DARK] * nv
        a['leaf_u'].surface(verts, faces_b, lambda c: (0, -1, 0))
        a['leaf_rim'].surface(verts, rim, lambda c, cen=cen: (c[0] - cen[0], 0, c[2] - cen[2]))   # the slab edge, outward
        # Keel under the midrib.
        M.limb(a['leaf_u'], [(p[0], p[1] - .2, p[2]) for p in (leaf_point(L, u, 0, under=True) for u in
                                                                 [-.04 + i * .07 for i in range(13)])], ln * .010, ln * .003, 8, .7)
        # R4 (owner B-R3 «紋理唔夠靚»): as in the target, a lit midrib and five secondaries per side sweeping to the tip, each
        # thinning to nothing before the margin, plus the two basal lobe veins; the soft glow beside them and the light-to-dark
        # blade gradient are vertex colours on the top face (leaf_colour), not hard strips.
        mid = [(-.05 + i * .085, 0) for i in range(12)]
        _vein(a['vein'], L, mid, ln * .010, ln * .002, .04, .5, 8)
        for i in range(5):
            for sg in (-1, 1):
                uv = [(u, sg * s) for u, s in _trace(.05 + i * SP, .016, .80)]
                _vein(a['vein'], L, uv, ln * .0055, ln * .0008, .03, .5)
        for sg in (-1, 1):
            _vein(a['vein'], L, [(u, sg * s) for u, s in _fan(.36, .02, .80)], ln * .0055, ln * .0008, .03, .5)
        rims.append((L, [p for p in full_control()]))
    return rims


def full_control():
    """Coarse closed outline (the control points) the mist hangs from, so ribbon density stays as in R2."""
    return OUTLINE + [(u, -v) for u, v in reversed(OUTLINE[1:-1])]


def mist(ctx, rims):
    """Mist curtains from the leaf rims only, split between two meshes that breathe in antiphase.
    R5 (owner B-R4 «霧…似一條條光，唔似霧水»): wide overlapping veils (2.2–3.4 m, one every ~1.1 m of rim) that hang most of
    the way to the lawn and follow the rim's own direction; each carries UVs (u across 0→1, v down 0→1) so the runtime soft
    alpha map (src/breathingLeaf.ts) frays them into fine falling threads that fade at the sides and toward the ground."""
    rng = ctx.rng
    k = 0
    for L, out in rims:
        m = len(out)
        pts = [leaf_point(L, u, v, -.1) for u, v in out]
        cen = leaf_point(L, *CENTRE)
        for i in range(m):
            p, q = pts[i], pts[(i + 1) % m]
            u_mid = (out[i][0] + out[(i + 1) % m][0]) / 2
            if u_mid < .12:                                                  # the outer rim only, not over the stems
                continue
            seg = math.dist(p, q)
            tx, tz = q[0] - p[0], q[2] - p[2]
            tl = math.hypot(tx, tz) or 1
            tx, tz = tx / tl, tz / tl                                        # along the rim
            nx, nz = tz, -tx                                                 # outward from the leaf centre
            mx, mz = (p[0] + q[0]) / 2 - cen[0], (p[2] + q[2]) / 2 - cen[2]
            if nx * mx + nz * mz < 0:
                nx, nz = -nx, -nz
            n_here = max(1, round(seg / 1.1))
            for j in range(n_here):
                t = (j + rng.uniform(.3, .7)) / n_here
                x, y, z = (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t)
                drop = (y - 1.2) * rng.uniform(.55, .85)
                w0 = rng.uniform(2.2, 3.4)
                flip = rng.random() < .5                                     # mirrored threads, so neighbours differ
                rows, cols = 6, 3
                verts, uvs = [], []
                for r in range(rows + 1):
                    f = r / rows
                    w = w0 * (1 + .25 * f) / 2                               # the veil spreads a little as it falls
                    yy = y - drop * f
                    sway = .6 * f * f
                    for c in range(cols + 1):
                        g = c / cols
                        s = (g * 2 - 1) * w
                        bow = .15 * (1 - (g * 2 - 1) ** 2)                   # a slight outward bow across the veil
                        verts.append((x + tx * s + nx * (sway + bow), yy, z + tz * s + nz * (sway + bow)))
                        uvs.append((1 - g if flip else g, f))
                acc = ctx.a['mist_a' if k % 2 == 0 else 'mist_b']
                acc.uv = getattr(acc, 'uv', [])
                acc.uv += uvs
                W = cols + 1
                acc.surface(verts, [(r * W + c, r * W + c + 1, (r + 1) * W + c + 1, (r + 1) * W + c)
                                    for r in range(rows) for c in range(cols)],
                            lambda c_, nx=nx, nz=nz: (nx, 0, nz))
                k += 1
    return k


def mains(ctx):
    """Water mains from the bay: two white pipes (and a thin one) from the root ring out under the near path's side, with
    aqua bands, diving into a service hatch at the plinth rim."""
    a = ctx.a
    base = MAINS
    for off, r in ((-.9, .42), (.0, .5), (1.0, .22)):
        c, s = math.cos(base), math.sin(base)
        px, pz = -s * off, c * off
        p0 = (RING_R0 * c + px, .78, RING_R0 * s + pz)
        p1 = ((PLINTH_R - .6) * c + px, .78, (PLINTH_R - .6) * s + pz)
        M.limb(a['ring'], [p0, p1], r, r, 14)
        for t in (.15, .5, .85):
            q = (p0[0] + (p1[0] - p0[0]) * t, .78, p0[2] + (p1[2] - p0[2]) * t)
            M.limb(a['aqua'] if r > .3 else a['ring'], [(q[0] - c * .12, q[1], q[2] - s * .12), (q[0] + c * .12, q[1], q[2] + s * .12)],
                   r + .07, r + .07, 14)
    c, s = math.cos(base), math.sin(base)
    obox(a['ring'], ((PLINTH_R - .5) * c, .5, (PLINTH_R - .5) * s), (1.4, .5, 3.4), (c, s), (-s, c))


def park(ctx):
    """Grove round the rim (clear of the paths, the mains and the stream's pool), residents under the leaves."""
    rng = ctx.rng
    keep = [*PATHS, MAINS, STONES]

    def clear(ang, gap):
        return all(abs((ang - p + math.pi) % TAU - math.pi) > gap for p in keep)

    trees = 0
    for row, (count, r0, r1, h0, h1, c0, c1, gap) in enumerate(((30, 20.2, 21.2, 6.5, 9.0, 3.0, 3.8, .2),
                                                                 (18, 17.8, 18.6, 5.2, 7.0, 2.5, 3.1, .28))):
        for i in range(count):
            ang = (i + .5 * row) * TAU / count + rng.uniform(-.08, .08)
            if not clear(ang, gap):
                continue
            if in_stream(ang, .12):
                continue
            r = rng.uniform(r0, r1)
            M.facet_tree(ctx, (r * math.cos(ang), .48, r * math.sin(ang)), rng.uniform(h0, h1), rng.uniform(c0, c1),
                         blobs=rng.randint(8, 11))
            trees += 1
    for i in range(16):                                                      # residents on the lawn under the leaves
        ang = rng.uniform(0, TAU)
        r = rng.uniform(8.6, 12.4)
        M.person(ctx, r * math.cos(ang), .48, r * math.sin(ang))
    return trees


def build(ctx):
    ground(ctx)
    stream(ctx)
    bench_wall(ctx)
    root_ring(ctx)
    stems(ctx)
    rims = leaves(ctx)
    ribbons = mist(ctx, rims)
    mains(ctx)
    trees = park(ctx)
    return {'ribbons': ribbons, 'trees': trees}


def main():
    import bpy
    from geo_helpers import finish_mesh, material
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = bpy.data.objects.new('Q05B_BREATHING_LEAF', None)
    bpy.context.scene.collection.objects.link(root)
    ctx = M.Ctx({k: Acc() for k in [*M.ROLES, *Q05B_ROLES]}, random.Random(2127))
    ctx.a['leaf'].c = []
    info = build(ctx)
    tris, per = 0, {}
    for role, acc in ctx.a.items():
        if not acc.v:
            continue
        rgba, emit, strength = Q05B_ROLES[role] if role in Q05B_ROLES else M.ROLES[role]
        mat = material('q05b_' + role, rgba, ROUGH.get(role, .6), emit=emit, emit_strength=strength)
        if role in DOUBLE:
            mat.use_backface_culling = False
        if getattr(acc, 'c', None):                                          # R4: the leaf top's vertex colours
            colour_node = mat.node_tree.nodes.new('ShaderNodeVertexColor')
            colour_node.layer_name = 'Col'
            bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
            mat.node_tree.links.new(colour_node.outputs['Color'], bsdf.inputs['Base Color'])
        ob = finish_mesh('q05b_' + role, acc, mat, SMOOTH.get(role, 25))
        if getattr(acc, 'c', None):
            assert len(acc.c) == len(acc.v)
            attr = ob.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
            attr.data.foreach_set('color', [x for rgba in acc.c for x in rgba])
        if getattr(acc, 'uv', None):                                         # R5: mist veil UVs (glTF v = 1 - Blender v)
            assert len(acc.uv) == len(acc.v)
            layer = ob.data.uv_layers.new(name='UVMap')
            layer.data.foreach_set('uv', [x for lp in ob.data.loops for x in (acc.uv[lp.vertex_index][0],
                                                                              1 - acc.uv[lp.vertex_index][1])])
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = root
        per[role] = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        tris += per[role]
    blend = os.path.join(HERE, 'q05b-breathing-leaf-2127.blend')
    glb = os.path.join(HERE, 'q05b-breathing-leaf-2127.glb')
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in [root, *root.children_recursive]:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials='EXPORT', export_animations=False,
                              export_cameras=False, export_lights=False, export_extras=False,
                              export_vertex_color='MATERIAL')
    print('@@BUILD@@', {'tris': tris, **info, 'glb_bytes': os.path.getsize(glb),
                        'top': dict(sorted(per.items(), key=lambda kv: -kv[1])[:12])})


if __name__ == '__main__':
    main()
