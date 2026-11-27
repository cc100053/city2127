"""Q05-C snow-cloud fountain (owner-accepted target artifacts/q05-targets/q05c-snow-cloud.jpg, 2026-11-26): the city makes
its own weather. Pumps draw bay water up a white main into a launch ring of glowing nozzles hung 19.5 m over the park; the
ring makes a cold cloud that floats above it and lets fine snow fall onto a snowfield where children play. The meltwater runs
into a ring channel and away to the bay through a spillway at the plinth rim. Round the back a dense grove and planters.

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_snow_cloud.py
Writes q05c-snow-cloud-2127.blend and .glb next to this file (glTF, no Meshopt/Draco).

Units are METRES, three.js axes (x, y up, z), ground-contact centre at the origin. Lot: NE PARK `LOTS['ne-park']` (48 x 48 m,
shared with Q05-A and Q05-B); the plinth is 24 m in radius, the cloud reaches ~31 m. The lot is inland, so the bay main and the
spillway end in service hatches at the plinth rim (as Q05-B's mains). One node Q05C_SNOW_CLOUD, one mesh per role named
q05c_<role>; the runtime (src/snowCloud.ts) moves these: q05c_cloud and q05c_haze (the cloud turning and bobbing, the haze
shell alpha-blended), q05c_snow_a/b/c (falling snow, each a stack of identical slabs SNOW_PERIODS[k] apart, so moving it down
by (speed * t) mod period loops seamlessly: the stack's top hides in the cloud, its bottom under the plinth), q05c_nozzle_a/b
(nozzles lit in turn), q05c_arc (flickering ice arcs), q05c_flow_a/b/c (meltwater glints running to the spillway) and
q05c_fog (cold ground fog, alpha-blended, breathing).
The only floating element is the cloud (handoff); every glow is ice white, never the concept lot's #5fdcff.
R2 (2026-11-28): fluffier cumulus (smaller lumpy puffs, edge wisps) with its waist inside the ring, ice-white cloud self-light
(raised at night by the runtime), blue-shadowed snowfield and frost, larger flakes.
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
PLINTH_R = 24.0
CAM = -2.22                                     # azimuth of the q05 close-up cameras (model frame), as Q05-A/B
SNOW_R = 9.5                                    # snowfield
CHANNEL_R, CHANNEL_W = 13.5, 1.4                # meltwater ring channel
RING_R, RING_Y, RING_T = 12.0, 19.5, .55        # launch ring: radius, height, tube radius
CLOUD_BASE = 16.5
# R2: the cloud's waist stays inside the ring (tube inner edge 11.45 m, 0.85 m clear) up to WAIST_Y; only billows whose underside
# is above it may bulge out over the ring, so the ring's whole front half reads wrapped round the cloud (target).
WAIST_Y, WAIST_R = RING_Y + 1.5, RING_R - RING_T - .85
# Cloud recipe (cumulus layers, x rx = 14.5 / x h = 14.5): a squashed underside, the waist band, a solid core (hides the snow
# stacks' top), the wide billows above the ring and a cauliflower crown; puffs 1.4-3.4 m so none reads as a separate ball.
CLOUD_LAYERS = ((.24, 0.0, .48, .02, .16, .14, .21, .70),
                (.18, .38, .62, .18, .36, .10, .14, .90),
                (.10, 0.0, .32, .26, .56, .20, .24, .95),
                (.30, .42, .80, .55, .74, .16, .24, .88),
                (.18, 0.0, .48, .72, .88, .15, .23, .95))
# Screen left of the close-up is +azimuth. The pumps and the main stand at the near left (as in the target), the spillway at
# the near front, the grove round the back so the falling snow reads against dark green.
PUMP = CAM + .95
SPILL = CAM + .30
PATHS = [CAM - .55, CAM - .55 + math.pi]
# Falling snow: three stacks with their own repeat period (m) and speed (m/s); the runtime reads the same numbers.
SNOW_PERIODS = (3.1, 3.7, 4.3)
SNOW_TOP = 20.0                                 # stack top before the move: inside the cloud
FLOW = 3                                        # meltwater glint phases

Q05C_ROLES = {                                                    # build-only roles (shared ROLES untouched)
    'cloud': ((1, 1, 1, 1), (.86, .93, 1, 1), .10),                 # white x vertex colours (blue-grey underside); ice-white
                                                                    # self-light the runtime raises at night (R2)
    'haze': ((.96, .98, 1, .05), (.85, .90, .96, 1), .2),           # soft translucent shell round the cloud
    'snow_a': ((1, 1, 1, 1), (.92, .97, 1, 1), 2.2),                # flakes (runtime falls them)
    'snow_b': ((1, 1, 1, 1), (.92, .97, 1, 1), 2.2),
    'snow_c': ((1, 1, 1, 1), (.92, .97, 1, 1), 2.2),
    'nozzle_a': ((.92, .97, 1, 1), (.80, .93, 1, 1), 3.2),          # launch nozzles, two sets lit in turn
    'nozzle_b': ((.92, .97, 1, 1), (.80, .93, 1, 1), 3.2),
    'arc': ((.94, .95, 1, 1), (.86, .90, 1, 1), 3.0),               # ice arcs round the ring (flicker)
    'ice': ((.86, .95, 1, 1), (.70, .88, 1, 1), 1.8),               # ice-white light bands on pipes and ring
    'pipe': ((.95, .96, .96, 1), None, .5),                         # white pipes, ring, pumps
    'pipe_b': ((.80, .82, .84, 1), None, .5),                       # flanges, pump details
    'snowfield': ((.97, .98, 1, 1), (.80, .87, 1, 1), .04),         # snow x vertex colours: blue shadows (R2), barely self-lit
    'frost': ((.30, .44, .68, 1), None, .5),                        # blue frost halo, the cold shadow round the snow (R2)
    'fog': ((.94, .97, 1, .07), (.85, .90, .96, 1), .15),            # cold ground fog (runtime: alpha, breathing)
    'water': ((.16, .50, .70, 1), (.10, .36, .52, 1), .5),          # channel water
    'flow_a': ((.80, .98, 1, 1), (.62, .92, 1, 1), 2.0),            # meltwater glints, lit in turn toward the spillway
    'flow_b': ((.80, .98, 1, 1), (.62, .92, 1, 1), 2.0),
    'flow_c': ((.80, .98, 1, 1), (.62, .92, 1, 1), 2.0),
    'plinth': ((.76, .75, .71, 1), None, .5),
    'lawn': ((.20, .40, .12, 1), None, .5),
}
ROUGH = {'cloud': 1, 'haze': 1, 'snowfield': .95, 'frost': .9, 'fog': 1, 'pipe': .35, 'pipe_b': .4, 'water': .1, 'plinth': .6,
         'lawn': .9, 'crown': .9, 'crown_l': .9}
SMOOTH = {'cloud': 80, 'haze': 80, 'pipe': 40, 'pipe_b': 40, 'ice': 40, 'nozzle_a': 40, 'nozzle_b': 40, 'snowfield': 60,
          'crown': 1, 'crown_l': 1, 'green': 80, 'leaf_l': 80, 'arc': 1}
DOUBLE = ('green', 'leaf_l', 'fog', 'haze')


def ring_band(acc, section, n=72):
    """Solid of revolution of a closed (r, y) section."""
    rmax = max(r for r, _ in section)
    sweep(acc, lambda k: circle_pts(0, 0, rmax - k, n), [(rmax - r, y) for r, y in section], closed=True, caps=(False, False))


def annulus(acc, r0, r1, y, n=96, a0=0.0, a1=TAU):
    """Flat ring (or ring sector) at height y, facing up."""
    verts = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        verts += [(r0 * math.cos(a), y, r0 * math.sin(a)), (r1 * math.cos(a), y, r1 * math.sin(a))]
    acc.surface(verts, [(i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2) for i in range(n)], lambda c: (0, 1, 0))


def polar(r, a, y):
    return (r * math.cos(a), y, r * math.sin(a))


def ang_gap(a, b):
    return abs((a - b + math.pi) % TAU - math.pi)


def ground(ctx):
    """Plinth, paving joints, the snowfield with drifts and a blue-grey frost halo, the ring channel and the spillway."""
    a, rng = ctx.a, ctx.rng
    cyl(a['plinth'], 0, 0, PLINTH_R, 0, .48, 112)
    ring_band(a['pipe'], [(PLINTH_R + .25, 0), (PLINTH_R + .25, .62), (PLINTH_R - .6, .62), (PLINTH_R - .6, .48)], 128)  # rim kerb
    for i in range(24):                                                      # radial paving joints
        ang = (i + .5) * TAU / 24
        c, s = math.cos(ang), math.sin(ang)
        r0, r1 = CHANNEL_R + 1.2, PLINTH_R - .7
        obox(a['joint'], ((r0 + r1) / 2 * c, .49, (r0 + r1) / 2 * s), (r1 - r0, .02, .06), (c, s), (-s, c))
    annulus(a['frost'], SNOW_R - .2, CHANNEL_R - CHANNEL_W / 2 - .35, .50, 112)
    cyl(a['snowfield'], 0, 0, SNOW_R, .48, .58, 96)
    for i in range(22):                                                      # snow drifts, piled toward the edge
        ang = rng.uniform(0, TAU)
        r = rng.uniform(3.0, SNOW_R - .8)
        sz = rng.uniform(.9, 2.0)
        M.ell(a['snowfield'], polar(r, ang, .58), (sz, 0, 0), (0, sz * .22, 0), (0, 0, sz * .7), 12, 5)
    snow_shade(a['snowfield'], rng)
    # Ring channel: water between two white kerbs, broken nowhere (bridged by the paths below).
    r0, r1 = CHANNEL_R - CHANNEL_W / 2, CHANNEL_R + CHANNEL_W / 2
    annulus(a['water'], r0, r1, .44, 128)
    for rr in (r0, r1):
        ring_band(a['pipe'], [(rr + .14, .40), (rr + .14, .64), (rr - .14, .64), (rr - .14, .40)], 128)
    # Spillway from the channel out to the rim hatch (meltwater back to the bay).
    c, s = math.cos(SPILL), math.sin(SPILL)
    ln = PLINTH_R - .9 - r1
    mid = (r1 + PLINTH_R - .9) / 2
    obox(a['water'], (mid * c, .45, mid * s), (ln, .02, 1.1), (c, s), (-s, c))
    for side in (-1, 1):
        obox(a['pipe'], (mid * c - s * .69 * side, .52, mid * s + c * .69 * side), (ln, .24, .28), (c, s), (-s, c))
    r = PLINTH_R - .4                                                        # the hatch the water drops into
    obox(a['slate'], (r * c, .5, r * s), (1.2, .06, 1.6), (c, s), (-s, c))
    for path in PATHS:                                                       # paths across the channel to the snowfield
        c, s = math.cos(path), math.sin(path)
        rr0, rr1 = SNOW_R + .2, PLINTH_R - .7
        obox(a['plinth'], ((rr0 + rr1) / 2 * c, .66, (rr0 + rr1) / 2 * s), (rr1 - rr0, .12, 2.6), (c, s), (-s, c))
    # Cold ground fog: flat translucent rings over the snow only (pass 3: wider ones hid the frost halo and the channel).
    for k, (ra, rb, y) in enumerate(((0, 6.0, .95), (3.5, 9.0, .75))):
        if ra == 0:
            cyl(a['fog'], 0, 0, rb, y - .02, y, 72)
        else:
            annulus(a['fog'], ra, rb, y, 96)


def snow_shade(acc, rng):
    """Snowfield vertex colours (R2): light blue-white on the drift tops and the open middle, blue shadows in the hollows
    between drifts, toward the edge and in a few soft cloud-shadow patches, so the falling white snow reads against it."""
    light, shadow = (.80, .87, 1.0), (.34, .48, .84)
    blots = [(rng.uniform(-6, 6), rng.uniform(-6, 6), rng.uniform(2.0, 3.5)) for _ in range(5)]
    cols = []
    for x, y, z in acc.v:                                                    # Blender coords: height is z
        t = .55 + .45 * min(1, max(0, (z - .58) / .3))                       # drift tops light, the flat between them darker
        t -= .35 * min(1, max(0, (math.hypot(x, y) - 6.0) / (SNOW_R - 6.0)))  # bluer toward the edge
        for bx, by, br in blots:
            t -= .4 * max(0, 1 - math.hypot(x - bx, y - by) / br)
        t = min(1, max(0, t))
        cols.append(tuple(shadow[k] + (light[k] - shadow[k]) * t for k in range(3)) + (1,))
    acc.c = cols


def flow(ctx):
    """Meltwater glints: short bright dashes along the channel, winding toward the spillway, then down it; three phases lit
    in turn so the water reads as running to the bay."""
    a = ctx.a
    k = 0
    for side in (1, -1):                                                     # both halves of the ring run toward SPILL
        for j in range(15):
            t0 = math.pi - (j + .2) / 15 * math.pi
            for q in range(2):
                ang = SPILL + side * (t0 - q * .07)
                rr = CHANNEL_R + (.25 if q else -.25) * .5
                p0 = polar(rr, ang, .47)
                p1 = polar(rr, ang - side * .05, .47)
                M.limb(a['flow_' + 'abc'[k % FLOW]], [p0, p1], .07, .07, 6, .4)
            k += 1
    c, s = math.cos(SPILL), math.sin(SPILL)
    r1 = CHANNEL_R + CHANNEL_W / 2
    for j in range(9):
        r = r1 + .3 + j * (PLINTH_R - 1.4 - r1) / 9
        M.limb(a['flow_' + 'abc'[(k + j) % FLOW]], [(r * c, .47, r * s), ((r + .6) * c, .47, (r + .6) * s)], .08, .08, 6, .4)


def pumps(ctx):
    """Two white pumps at the near-left rim and the bay main: up out of a rim hatch, through the big pump, in to the riser,
    up 19 m and over into the launch ring; flanges and ice light bands along it. Two thin feeders hold the far side."""
    a = ctx.a
    c, s = math.cos(PUMP), math.sin(PUMP)
    tx, tz = -s, c                                                           # tangent (screen left/right at the pump)

    def at(r, side, y):
        return (r * c + tx * side, y, r * s + tz * side)

    # Rim hatch, the big pump and a smaller one beside it.
    obox(a['slate'], at(PLINTH_R - .9, 0, .5), (1.8, .08, 2.6), (c, s), (-s, c))
    for side, scale in ((0.0, 1.0), (3.4, .7)):
        r = 19.6
        base = at(r, side, .48)
        obox(a['pipe_b'], (base[0], .75, base[2]), (3.4 * scale, .55, 2.6 * scale), (c, s), (-s, c))
        m0, m1 = at(r + 1.5 * scale, side, 1.0 + 1.25 * scale), at(r - 1.5 * scale, side, 1.0 + 1.25 * scale)
        M.limb(a['pipe'], [m0, m1], 1.2 * scale, 1.2 * scale, 24)                    # motor drum (axis radial)
        for f in (.15, .85):
            q = tuple(m0[i] + (m1[i] - m0[i]) * f for i in range(3))
            M.disc(a['pipe_b'], q, (c, 0, s), 1.32 * scale, .22, 24)
        eye = at(r - 1.5 * scale - .06, side, 1.0 + 1.25 * scale)
        M.disc(a['pipe_b'], eye, (c, 0, s), .78 * scale, .12, 24)
        M.disc(a['ice'], (eye[0] - c * .08, eye[1], eye[2] - s * .08), (c, 0, s), .5 * scale, .1, 24)   # glowing eye
        # Intake from the rim hatch up into the drum's back.
        M.limb(a['pipe'], [at(PLINTH_R - .9, side * .9, .2), at(PLINTH_R - .9, side * .9, 1.6), at(r + 1.6 * scale, side, 1.0 + 1.25 * scale)],
               .55 * scale, .55 * scale, 16)
    # The main: from the big pump's face in to the riser, then up and over into the ring.
    R = .8
    riser = 15.6
    p = [at(18.0, 0, 2.25), at(17.0, 0, 2.25), at(16.2, 0, 2.1), at(riser, 0, 2.9), at(riser, 0, 4.0),
         at(riser, 0, RING_Y - 2.0), at(riser, 0, RING_Y - .6), at(riser - .6, 0, RING_Y), at(riser - 1.6, 0, RING_Y),
         at(RING_R + .2, 0, RING_Y)]
    M.limb(a['pipe'], p, R, R * .85, 24)
    M.ell(a['pipe'], at(riser, 0, 2.25), (R * 1.15, 0, 0), (0, R * 1.15, 0), (0, 0, R * 1.15), 18, 10)     # elbow hub
    for y in (4.5, 8.0, 11.5, 15.0):                                         # flanges with ice bands on the riser
        M.limb(a['pipe_b'], [at(riser, 0, y - .14), at(riser, 0, y + .14)], R + .16, R + .16, 24)
        M.limb(a['ice'], [at(riser, 0, y + .3), at(riser, 0, y + .5)], R + .06, R + .06, 24)
    M.limb(a['ice'], [at(17.6, 0, 2.25), at(17.3, 0, 2.25)], R + .08, R + .08, 24)
    obox(a['pipe_b'], at(riser, 0, .9), (2.6, .9, 2.6), (c, s), (-s, c))      # riser foot
    # A thin feed pipe beside the main (as in the target).
    M.limb(a['pipe'], [at(riser + .6, 1.3, .6), at(riser + .6, 1.3, RING_Y - 3.0), at(riser - .4, 1.3, RING_Y - 1.6),
                       at(RING_R + .4, .9, RING_Y - .5)], .18, .18, 10)
    # Two thin feeders hold the far side of the ring.
    for off in (2.2, -2.2):
        ang = PUMP + off
        cc, ss = math.cos(ang), math.sin(ang)
        r = RING_R + 1.4
        M.limb(a['pipe'], [(r * cc, .5, r * ss), (r * cc, RING_Y - 1.6, r * ss), ((RING_R + .3) * cc, RING_Y - .3, (RING_R + .3) * ss)],
               .34, .3, 12)
        obox(a['pipe_b'], (r * cc, .7, r * ss), (1.2, .5, 1.2), (cc, ss), (-ss, cc))
        for y in (5.0, 11.0):
            M.limb(a['ice'], [(r * cc, y, r * ss), (r * cc, y + .25, r * ss)], .4, .4, 12)


def launch_ring(ctx):
    """The launch ring: a white tube with an ice band under it, sixteen nozzle pods (two sets lit in turn), ice arcs round
    the outside."""
    a, rng = ctx.a, ctx.rng
    n = 160
    ring = [polar(RING_R, i * TAU / n, RING_Y) for i in range(n + 1)]
    M.limb(a['pipe'], ring, RING_T, RING_T, 20)
    M.limb(a['ice'], [polar(RING_R, i * TAU / n, RING_Y - RING_T + .04) for i in range(n + 1)], .12, .12, 8)
    for i in range(16):
        ang = (i + .5) * TAU / 16
        c, s = math.cos(ang), math.sin(ang)
        p0, p1 = polar(RING_R - .2, ang, RING_Y), polar(RING_R + .85, ang, RING_Y)
        M.limb(a['pipe'], [p0, p1], .62, .62, 20)                            # pod across the ring
        M.disc(a['pipe_b'], polar(RING_R + .88, ang, RING_Y), (c, 0, s), .6, .1, 20)
        M.disc(a['nozzle_' + 'ab'[i % 2]], polar(RING_R + .96, ang, RING_Y), (c, 0, s), .44, .08, 20)   # outward lamp
        M.disc(a['nozzle_' + 'ab'[i % 2]], polar(RING_R - .26, ang, RING_Y), (-c, 0, -s), .4, .08, 20)        # inward jet
    # Ice arcs: jagged loops hugging the ring's outer side, in a few broken runs.
    for run in range(7):
        a0 = run * TAU / 7 + rng.uniform(0, .4)
        span = rng.uniform(.45, .8)
        pts = []
        for j in range(26):
            t = j / 25
            ang = a0 + span * t
            r = RING_R + 1.25 + rng.uniform(-.25, .35)
            y = RING_Y + .15 + rng.uniform(-.45, .45) * math.sin(math.pi * t)
            pts.append(polar(r, ang, y))
        M.limb(a['arc'], pts, .045, .03, 4)


def cloud(ctx):
    """Cumulus over the ring: a flattened base inside the ring, billows above it reaching past the ring's radius and a
    cauliflower top; a translucent haze shell softens the edge. Vertex colour (cloud only): white top, blue-grey underside."""
    a, rng = ctx.a, ctx.rng
    waist = (WAIST_Y, WAIST_R)
    M.cumulus(a['cloud'], (0, CLOUD_BASE, 0), 14.5, 14.5, rng, puffs=240, n=12, m=6, layers=CLOUD_LAYERS, lumps=.2, wisps=60,
              waist=waist)
    M.cumulus(a['haze'], (0, CLOUD_BASE - .2, 0), 14.5, 14.7, random.Random(7), puffs=60, swell=1.05, n=12, m=6,
              layers=CLOUD_LAYERS, lumps=.2, waist=waist)
    lo, hi = CLOUD_BASE, CLOUD_BASE + 12.5
    under, top = (.50, .57, .70), (1, 1, 1)
    cols = []
    for v in a['cloud'].v:                                                   # Blender coords: height is v[2]
        t = min(1, max(0, (v[2] - lo) / (hi - lo))) ** .7
        cols.append(tuple(under[k] + (top[k] - under[k]) * t for k in range(3)) + (1,))
    a['cloud'].c = cols


def snow(ctx):
    """Falling snow: per stack, one slab of flakes over a period P (denser at the column's core, widening toward the ground),
    copied every P from below the plinth to SNOW_TOP inside the cloud, so the runtime can drop it by (speed t) mod P."""
    rng = ctx.rng
    count = 0
    for k, P in enumerate(SNOW_PERIODS):
        slab = []
        for i in range(int(85 * P / 3.7)):
            r = 8.6 * math.sqrt(rng.random()) ** 1.15
            flake = (r, rng.uniform(0, TAU), rng.uniform(0, P), rng.uniform(.16, .24))
            if i % 2 == 0:                                                   # owner 2026-11-28: half R2's snowfall (same draws,
                slab.append(flake)                                           # so the rest of the build keeps its layout)
        acc = ctx.a['snow_' + 'abc'[k]]
        y0 = -P
        while y0 < SNOW_TOP:
            for r, ang, dy, sz in slab:
                y = y0 + dy
                if y > SNOW_TOP:
                    continue
                rr = r * (1 + .12 * max(0, (CLOUD_BASE - y) / CLOUD_BASE))   # the column spreads a little as it falls
                x, z = rr * math.cos(ang), rr * math.sin(ang)
                M.ell(acc, (x, y, z), (sz, 0, 0), (0, sz, 0), (0, 0, sz), 4, 2)  # octahedral flake
                count += 1
            y0 += P
    return count


def greenery(ctx):
    """Grove and white-rimmed planters round the back half (a dark ground the snow reads against); low shrubs only on the
    close-up side so the snowfield stays open."""
    a, rng = ctx.a, ctx.rng
    keep = [*PATHS, PUMP, SPILL]

    def clear(ang, gap):
        return all(ang_gap(ang, p) > gap for p in keep)

    trees = 0
    for row, (count, r0, r1, h0, h1, c0, c1) in enumerate(((30, 20.6, 21.8, 6.5, 9.5, 3.0, 3.9), (20, 17.2, 18.2, 5.2, 7.2, 2.4, 3.1))):
        for i in range(count):
            ang = (i + .5 * row) * TAU / count + rng.uniform(-.07, .07)
            front = ang_gap(ang, CAM) < (1.25 if row else 1.05)
            if not clear(ang, .32 if row == 0 else .4):
                continue
            r = rng.uniform(r0, r1)
            if front:                                                        # near side: low shrubs, never a screen
                if i % 2 == 0:
                    M.leaf_clump(ctx, polar(r, ang, 1.0), (1.3, .7, 1.3), roles=('leaf_l', 'green'), core='green', n=36, size=.45,
                                 droop=.5, lobes=2)
                continue
            M.facet_tree(ctx, polar(r, ang, .48), rng.uniform(h0, h1), rng.uniform(c0, c1), blobs=rng.randint(8, 11))
            trees += 1
    # Planter beds: low white-rimmed arcs under the grove, with ground cover.
    for i in range(10):
        ang0 = CAM + math.pi + (i - 4.5) * .42
        if not clear(ang0, .3):
            continue
        c, s = math.cos(ang0), math.sin(ang0)
        obox(a['pipe'], (16.4 * c, .8, 16.4 * s), (.35, .64, 3.6), (c, s), (-s, c))
        obox(a['lawn'], (17.6 * c, 1.0, 17.6 * s), (2.3, .1, 3.6), (c, s), (-s, c))
        M.leaf_clump(ctx, polar(16.9, ang0, 1.25), (1.4, .55, 1.4), roles=('leaf_l', 'green'), core='green', n=30, size=.42,
                     droop=.5, lobes=2)
    annulus(a['lawn'], 19.4, PLINTH_R - .7, .5, 128, CAM + 1.2, CAM + TAU - 1.2)   # lawn under the back grove
    for off in (-1.0, -.62, .62):                                             # near side: low white planters with shrubs
        ang0 = CAM + off
        if not clear(ang0, .22):
            continue
        c, s = math.cos(ang0), math.sin(ang0)
        obox(a['pipe'], (21.0 * c, .85, 21.0 * s), (3.2, .74, 4.6), (c, s), (-s, c))
        obox(a['lawn'], (21.0 * c, 1.23, 21.0 * s), (2.8, .04, 4.2), (c, s), (-s, c))
        for q in (-1.2, 0, 1.2):
            M.leaf_clump(ctx, (21.0 * c - s * q, 1.6, 21.0 * s + c * q), (1.0, .7, 1.0), roles=('leaf_l', 'green'), core='green',
                         n=30, size=.42, droop=.5, lobes=2)
    return trees


def residents(ctx):
    """Children in the snow under the cloud, adults round them and along the channel, people on benches facing in."""
    rng = ctx.rng
    for i in range(14):                                                      # children, ~1.2 m
        ang = rng.uniform(0, TAU)
        r = rng.uniform(1.0, 6.5)
        M.person(ctx, r * math.cos(ang), .58, r * math.sin(ang), scale=.66)
    for i in range(10):
        ang = rng.uniform(0, TAU)
        r = rng.uniform(7.0, 11.5)
        M.person(ctx, r * math.cos(ang), .58 if r < SNOW_R else .48, r * math.sin(ang))
    for i in range(9):                                                       # benches outside the channel, facing in
        ang = CAM + (i + .5) * TAU / 9
        if any(ang_gap(ang, p) < .3 for p in (*PATHS, PUMP, SPILL)):
            continue
        r = CHANNEL_R + 2.0
        x, z = r * math.cos(ang), r * math.sin(ang)
        yaw = math.atan2(-x, -z)
        M.kit_prop(ctx, 'bench', x, .48, z, yaw + math.pi)
        if i % 2:
            M.seated_person(ctx, x, .48 + .45, z, yaw)


def build(ctx):
    ground(ctx)
    flow(ctx)
    pumps(ctx)
    launch_ring(ctx)
    cloud(ctx)
    flakes = snow(ctx)
    trees = greenery(ctx)
    residents(ctx)
    return {'flakes': flakes, 'trees': trees}


def main():
    import bpy
    from geo_helpers import finish_mesh, material
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = bpy.data.objects.new('Q05C_SNOW_CLOUD', None)
    bpy.context.scene.collection.objects.link(root)
    ctx = M.Ctx({k: Acc() for k in [*M.ROLES, *Q05C_ROLES]}, random.Random(2127))
    info = build(ctx)
    tris, per = 0, {}
    for role, acc in ctx.a.items():
        if not acc.v:
            continue
        rgba, emit, strength = Q05C_ROLES[role] if role in Q05C_ROLES else M.ROLES[role]
        mat = material('q05c_' + role, rgba, ROUGH.get(role, .6), emit=emit, emit_strength=strength)
        if role in DOUBLE:
            mat.use_backface_culling = False
        colours = getattr(acc, 'c', None)
        if colours:                                                          # the cloud's vertex colours
            node = mat.node_tree.nodes.new('ShaderNodeVertexColor')
            node.layer_name = 'Col'
            bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
            mat.node_tree.links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
        ob = finish_mesh('q05c_' + role, acc, mat, SMOOTH.get(role, 25))
        if colours:
            assert len(colours) == len(acc.v)
            attr = ob.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
            attr.data.foreach_set('color', [x for rgba in colours for x in rgba])
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = root
        per[role] = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        tris += per[role]
    blend = os.path.join(HERE, 'q05c-snow-cloud-2127.blend')
    glb = os.path.join(HERE, 'q05c-snow-cloud-2127.glb')
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
