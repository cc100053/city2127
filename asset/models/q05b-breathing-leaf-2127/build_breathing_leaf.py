"""Q05-B breathing giant leaf (owner-accepted target artifacts/q05-targets/q05b-breathing-leaf.jpg, 2026-11-26): a cultivated
giant plant whose five heart-shaped leaves are larger than a roof. Bay water enters through a white root ring, rises up glowing
aqua lines inside the clear glass-green stems, spreads through the lit leaf veins and falls from the leaf edges as fine mist curtains. Under
the leaves: a round lawn with a curved bench wall, benches, residents, ferns, stepping stones, a small stream, water mains
from the ring and a dense grove round the rim.
R2 (owner B-R1 verdict, 2026-11-27): matte deep-green leaves (runtime dims the sky reflection), deeper heart lobes and two
tiers of leaves tipped toward the close-up, thinner translucent stems spread apart, the stream moved to the near left clear of
the trees, and the grove rebuilt from the library facet_tree (low-poly faceted crowns, as in the target).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_breathing_leaf.py
Writes q05b-breathing-leaf-2127.blend and .glb next to this file (glTF, no Meshopt/Draco).

Units are METRES, three.js axes (x, y up, z), ground-contact centre at the origin. Lot: NE PARK `LOTS['ne-park']` (48 x 48 m,
shared with Q05-A); the plinth is 24 m in radius, the leaves reach ~23.5 m out and ~22 m up. One node Q05B_BREATHING_LEAF, one
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
WALL_R = 13.6                                    # curved bench wall
# Screen left of the close-up is +azimuth. R2 (owner «小溪…大半俾樹同霧遮住»): the stream runs across the near left, in front of
# the leaves and clear of the grove; the path and the water mains move to the near right, as in the target.
PATHS = [CAM - .35, CAM - .35 + math.pi]          # paved paths in from the rim (the near one beside the water mains)
MAINS = CAM - .12                                # water mains azimuth
STONES = CAM + .55                               # stepping-stone path azimuth (crosses the stream)
STREAM = (CAM + .12, CAM + 1.12)                 # stream arc between the wall and the rim, near left
STREAM_R = 17.0

# Five leaves: (azimuth offset from the camera azimuth, stem-top height, leaf length, attach radius, yaw twist, pitch).
# Laid out like the target: a low leaf out to the near right, a broad one to the left, two high at the back, one behind.
# R2 (owner «後面三片葉似平頂傘»): as in the target, the leaves point out to the close-up's left and right in two tiers (lower
# pair front, upper pair back, one behind), and every blade tips its top face to the camera (TILT), so all five show the heart.
LEAVES = [(1.25, 11.5, 14.5, 8.6, 0, .12), (-1.20, 12.5, 15.0, 8.6, 0, .12), (2.00, 21.5, 14.5, 7.4, 0, .16),
          (-2.00, 22.5, 15.0, 7.4, 0, .16), (3.14, 17.0, 13.0, 6.4, 0, .14)]
TILT = .55                                       # blade drop per metre toward the camera (≈ 29°)

Q05B_ROLES = {                                                    # build-only roles (shared ROLES untouched)
    'leaf': ((.025, .16, .05, 1), None, .5),                        # leaf blade, deep green (runtime dims the sky reflection)
    'leaf_u': ((.12, .32, .12, 1), None, .5),                     # leaf underside and rim, lighter
    'vein': ((.62, 1, .36, 1), (.50, 1, .28, 1), 1.6),            # lit veins (runtime breathes the glow)
    'stem': ((.40, .72, .40, .5), (.16, .40, .20, 1), .3),       # stems: translucent glass green, the water core shows through
    'root': ((.30, .52, .28, 1), None, .5),                        # roots over the soil, opaque
    'water': ((.40, .95, .88, 1), (.30, .95, .85, 1), 1.4),        # aqua water line up each stem (not the concept #5fdcff)
    'pulse_a': ((.75, 1, .96, 1), (.55, 1, .92, 1), 2.0),          # water dashes, three phases lit in turn at runtime
    'pulse_b': ((.75, 1, .96, 1), (.55, 1, .92, 1), 2.0),
    'pulse_c': ((.75, 1, .96, 1), (.55, 1, .92, 1), 2.0),
    'mist_a': ((.94, .98, 1, .34), (.80, .90, .95, 1), .25),        # mist curtains (runtime: alpha, no depth write)
    'mist_b': ((.94, .98, 1, .34), (.80, .90, .95, 1), .25),
    'ring': ((.95, .96, .96, 1), None, .5),                        # root ring and water mains, white
    'aqua': ((.40, .95, .88, 1), (.30, .95, .85, 1), 2.4),         # ring and main light bands
    'stream': ((.42, .76, .86, 1), (.20, .48, .58, 1), .5),        # stream and pool water
    'rock': ((.78, .78, .74, 1), None, .5),
    'lawn': ((.20, .40, .12, 1), None, .5),
    'plinth': ((.90, .90, .87, 1), None, .5),
}
ROUGH = {'leaf': .85, 'leaf_u': .85, 'stem': .3, 'crown': .9, 'crown_l': .9, 'ring': .4, 'stream': .1, 'mist_a': .9, 'mist_b': .9, 'lawn': .9, 'plinth': .6,
         'rock': .8}
SMOOTH = {'leaf': 60, 'leaf_u': 60, 'vein': 50, 'stem': 60, 'water': 60, 'pulse_a': 60, 'pulse_b': 60, 'pulse_c': 60, 'ring': 40,
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
    """Stem centreline from the soil to the leaf attachment: rises near the centre, leans out at the top."""
    c, s = math.cos(az), math.sin(az)
    p0 = (2.7 * c, RING_H - .3, 2.7 * s)
    p1 = (rad * .35 * c, top * .55, rad * .35 * s)
    p2 = (rad * c, top, rad * s)
    pts = []
    for j in range(25):
        t = j / 24
        pts.append(tuple((1 - t) ** 2 * p0[k] + 2 * (1 - t) * t * p1[k] + t * t * p2[k] for k in range(3)))
    return pts


def along(pts, t):
    """Point at fraction t of a polyline's vertex sequence (linear between vertices)."""
    f = t * (len(pts) - 1)
    i = min(int(f), len(pts) - 2)
    u = f - i
    return tuple(pts[i][k] + (pts[i + 1][k] - pts[i][k]) * u for k in range(3))


def stems(ctx):
    a = ctx.a
    for k, (daz, top, ln, rad, _, _) in enumerate(LEAVES):
        az = CAM + daz
        pts = stem_path(az, top, rad)
        M.limb(a['stem'], pts, .50, .28, 14)
        line = pts                                                           # aqua water core inside the clear stem
        M.limb(a['water'], line, .15, .09, 8)
        for d in range(18):                                                  # dashes: phase d % 3 of 18 along the stem
            t0, t1 = (d + .15) / 18, (d + .75) / 18
            M.limb(a['pulse_' + 'abc'[d % 3]], [along(line, t0 + (t1 - t0) * q / 3) for q in range(4)], .2, .16, 8)
        for r in range(3):                                                   # roots over the soil to the ring rim
            ra = az + (r - 1) * .55
            c, s = math.cos(ra), math.sin(ra)
            b = (math.cos(az) * 2.7, RING_H - .2, math.sin(az) * 2.7)
            M.limb(a['root'], [b, (2.4 * c, RING_H - .1, 2.4 * s), (3.9 * c, RING_H - .12, 3.9 * s)], .38, .14, 8)


# Leaf outline (right half, normalised to length 1): tip at u = 1, petiole sinus at u = 0, two basal lobes behind it.
OUTLINE = [(1.0, 0), (.90, .12), (.76, .27), (.58, .40), (.38, .48), (.18, .50), (.0, .48), (-.15, .43), (-.28, .34),
           (-.37, .22), (-.37, .11), (-.26, .05), (-.08, 0)]    # R2: deeper basal lobes and sinus (heart reads from afar)
CENTRE = (.33, 0)
RINGS = 7


def leaf_frame(daz, top, rad, twist, pitch):
    az = CAM + daz
    origin = (rad * math.cos(az), top, rad * math.sin(az))
    head = az + twist
    d = (math.cos(head), 0, math.sin(head))
    side = (-math.sin(head), 0, math.cos(head))
    return origin, d, side, pitch


CAM_DIR = (math.cos(CAM), math.sin(CAM))


def leaf_point(frame, ln, u, v, lift=0.0):
    """A point on the leaf: midrib along d, width along side; arched (rises then the tip droops), edges droop; the whole
    blade tipped down toward the close-up camera by TILT so its top face shows."""
    origin, d, side, pitch = frame
    w = abs(v) / .50
    toward = (u * d[0] + v * side[0]) * CAM_DIR[0] + (u * d[2] + v * side[2]) * CAM_DIR[1]
    y = ln * (pitch * u - .34 * max(0, u) ** 2 - .06 * w ** 2 - TILT * toward) + lift
    return (origin[0] + ln * (u * d[0] + v * side[0]), origin[1] + y, origin[2] + ln * (u * d[2] + v * side[2]))


def full_outline():
    """Closed outline: the right half from the tip to the sinus, then the left half back toward the tip."""
    return OUTLINE + [(u, -v) for u, v in reversed(OUTLINE[1:-1])]


def leaves(ctx):
    a = ctx.a
    rim_all = []
    for k, (daz, top, ln, rad, twist, pitch) in enumerate(LEAVES):
        fr = leaf_frame(daz, top, rad, twist, pitch)
        out = full_outline()
        m = len(out)
        grid = []                                                            # rings from the centre point to the outline
        for r in range(RINGS + 1):
            f = r / RINGS
            grid.append([(CENTRE[0] + (u - CENTRE[0]) * f, CENTRE[1] + (v - CENTRE[1]) * f) for u, v in out])
        th = .28
        top_v = [leaf_point(fr, ln, u, v) for row in grid for u, v in row]
        bot_v = [leaf_point(fr, ln, u, v, -th * (1 - .7 * (r / RINGS))) for r, row in enumerate(grid) for u, v in row]
        nv = len(top_v)
        faces_t, faces_b = [], []
        for r in range(RINGS):
            for i in range(m):
                q = (r * m + i, r * m + (i + 1) % m, (r + 1) * m + (i + 1) % m, (r + 1) * m + i)
                faces_t.append(q)
                faces_b.append(tuple(nv + x for x in reversed(q)))
        rim = [(RINGS * m + i, RINGS * m + (i + 1) % m, nv + RINGS * m + (i + 1) % m, nv + RINGS * m + i) for i in range(m)]
        verts = top_v + bot_v
        a['leaf'].surface(verts, faces_t, lambda c: (0, 1, 0))
        a['leaf_u'].surface(verts, faces_b + rim, lambda c: (0, -1, 0))
        # Veins: a lit midrib and seven curved laterals per side, plus a basal vein into each lobe; raised over the blade.
        lift = .07
        M.limb(a['vein'], [leaf_point(fr, ln, u, 0, lift) for u in [i / 12 * .95 - .04 for i in range(13)]], .2, .05, 6)
        for i in range(7):
            u0 = .06 + i * .12
            for sg in (-1, 1):
                pts = []
                for j in range(7):
                    t = j / 6
                    u = u0 + (.10 + .05 * (1 - u0)) * t
                    wid = half_width(u) * .88
                    pts.append(leaf_point(fr, ln, u, sg * wid * t, lift))
                M.limb(a['vein'], pts, .11, .035, 5)
        for sg in (-1, 1):
            pts = [leaf_point(fr, ln, u, sg * v, lift) for u, v in ((-.02, .02), (-.09, .10), (-.17, .18), (-.24, .25))]
            M.limb(a['vein'], pts, .1, .04, 5)
        rim_all.append((fr, ln, out))
    return rim_all


def half_width(u):
    """Leaf half-width at u along the midrib (outline, right half)."""
    pts = OUTLINE[:7]
    for (ua, va), (ub, vb) in zip(pts, pts[1:]):
        if ub <= u <= ua:
            return va + (vb - va) * (ua - u) / (ua - ub)
    return .50


def mist(ctx, rims):
    """Mist curtains from the leaf rims only: narrow hanging ribbons every ~0.7 m of rim, tapering and thinning downward,
    split between two meshes that breathe in antiphase."""
    rng = ctx.rng
    k = 0
    for fr, ln, out in rims:
        m = len(out)
        pts = [leaf_point(fr, ln, u, v, -.1) for u, v in out]
        for i in range(m):
            p, q = pts[i], pts[(i + 1) % m]
            u_mid = (out[i][0] + out[(i + 1) % m][0]) / 2
            if u_mid < .12:                                                  # the outer rim only, not over the stems
                continue
            seg = math.dist(p, q)
            for j in range(max(1, int(seg / .6))):
                t = (j + rng.uniform(.2, .8)) / max(1, int(seg / .6))
                x, y, z = (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t)
                drop = (y - 3.0) * rng.uniform(.30, .62)
                w0 = rng.uniform(.9, 1.5)
                ox, oz = x, z
                rr = math.hypot(ox, oz) or 1
                tx, tz = -oz / rr, ox / rr                                   # ribbon spans along the rim, faces outward
                rows = 4
                verts = []
                for r in range(rows + 1):
                    f = r / rows
                    w = w0 * (1 - .55 * f) / 2
                    yy = y - drop * f
                    sway = .25 * f * f
                    verts += [(ox - tx * w + ox / rr * sway, yy, oz - tz * w + oz / rr * sway),
                              (ox + tx * w + ox / rr * sway, yy, oz + tz * w + oz / rr * sway)]
                acc = ctx.a['mist_a' if k % 2 == 0 else 'mist_b']
                acc.surface(verts, [(r * 2, r * 2 + 1, r * 2 + 3, r * 2 + 2) for r in range(rows)],
                            lambda c, ox=ox, oz=oz: (ox, 0, oz))
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
    info = build(ctx)
    tris, per = 0, {}
    for role, acc in ctx.a.items():
        if not acc.v:
            continue
        rgba, emit, strength = Q05B_ROLES[role] if role in Q05B_ROLES else M.ROLES[role]
        mat = material('q05b_' + role, rgba, ROUGH.get(role, .6), emit=emit, emit_strength=strength)
        if role in DOUBLE:
            mat.use_backface_culling = False
        ob = finish_mesh('q05b_' + role, acc, mat, SMOOTH.get(role, 25))
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
                              export_cameras=False, export_lights=False, export_extras=False)
    print('@@BUILD@@', {'tris': tris, **info, 'glb_bytes': os.path.getsize(glb),
                        'top': dict(sorted(per.items(), key=lambda kv: -kv[1])[:12])})


if __name__ == '__main__':
    main()
