"""Q05-A reverse air conditioner (owner-accepted target artifacts/q05-targets/q05a-reverse-ac.jpg, 2026-11-26): a glass tower
that draws the park's hot ground air in through an ice-blue louvred skirt, lifts it as an amber spiral inside a clear core
wrapped by a pale diagonal exoskeleton, and throws it out of a gold fin crown into the sky. Three stabilising rings (one
with a docked maintenance drone); a round cooled lawn with radial cold seams, trees, benches and residents around it.

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_reverse_ac.py
Writes q05a-reverse-ac-2127.blend and .glb next to this file (glTF, no Meshopt/Draco).

Units are METRES, three.js axes (x, y up, z), ground-contact centre at the origin, front -z (no strong front: round).
Lot: NE PARK `LOTS['ne-park']` (48 x 48 m, R2: the owner's «playground expand a little»); the lawn plinth is 24 m in
radius, the crown tops out at ~46 m, the flame reaches ~78 m. One node Q05A_REVERSE_AC, one mesh per role named
q05a_<role>; the runtime animates four of them (src/reverseAc.ts): q05a_spiral (the amber heat spiral inside the glass),
q05a_flame (saturated flame tongues over the crown, alpha-blended), q05a_plume (the soft heat shimmer round them, drawn
additive) and q05a_flow (ice-blue cold-air streams spiralling over the lawn into the skirt, drawn additive).
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
Y0, Y1 = 4.2, 37.0            # exoskeleton from the skirt top to the crown band
LAWN_R, PLINTH_R = 22.6, 24.0
PATHS = [TAU / 8 + i * TAU / 4 for i in range(4)]                # four paths in from the rim, kept clear of trees
CAM = -2.22                                                      # azimuth of the q05:tower close-up camera (model frame)
SKIRT_R0, SKIRT_R1, SKIRT_Y = 8.8, 4.9, 4.6

# Exoskeleton radius along the height: wide at the skirt, a waist at ~18 m, opening into the crown (target silhouette).
PROFILE = [(Y0, 5.0), (10.0, 4.15), (18.0, 3.75), (26.0, 4.05), (33.0, 4.75), (Y1, 5.25)]


def prof(y):
    """Smooth (cosine-eased) exoskeleton radius at height y."""
    if y <= PROFILE[0][0]:
        return PROFILE[0][1]
    for (ya, ra), (yb, rb) in zip(PROFILE, PROFILE[1:]):
        if y <= yb:
            t = (y - ya) / (yb - ya)
            return ra + (rb - ra) * (1 - math.cos(math.pi * t)) / 2
    return PROFILE[-1][1]


Q05A_ROLES = {                                                  # build-only roles (shared ROLES untouched)
    'silver': ((.97, .98, .99, 1), None, .5),                   # exoskeleton, rings, skirt fins: near-white (R2: paler)
    'ice': ((.30, .80, 1, 1), (.25, .75, 1, 1), 2.6),            # cold intake glow, ring strips
    'seam': ((.45, .88, 1, 1), (.35, .85, 1, 1), 3.4),           # lawn cold seams and rim light (R2: wider, brighter)
    'flow': ((.55, .90, 1, .42), (.45, .85, 1, 1), 1.1),          # cold-air streams over the lawn (runtime: additive)
    'flame': ((1, .48, .08, .55), (1, .42, .05, 1), 1.6),         # flame tongues over the crown (runtime: alpha, no depth write)
    'drone': ((.16, .18, .21, 1), None, .5),                      # maintenance drone body: dark, so it reads on the white rings
    'heat': ((1, .62, .22, 1), (1, .55, .14, 1), 3.0),           # hot core column
    'spiral': ((1, .74, .32, 1), (1, .66, .20, 1), 4.5),         # the rising heat spiral (animated)
    'gold': ((.93, .70, .32, 1), (1, .62, .22, 1), .35),        # crown fins and band
    'core': ((.80, .90, .96, .16), None, .5),                    # clear glass core
    'plume': ((1, .62, .30, .22), (1, .55, .22, 1), .9),         # heat shimmer round the flame (runtime: additive)
    'lawn': ((.20, .40, .12, 1), None, .5),
    'plinth': ((.90, .90, .87, 1), None, .5),
}
ROUGH = {'silver': .35, 'gold': .3, 'core': .05, 'plume': .9, 'flame': .9, 'flow': .9, 'lawn': .9, 'plinth': .6, 'drone': .4}
METAL = {'silver': .05, 'gold': .8, 'drone': .3}
SMOOTH = {'silver': 40, 'gold': 35, 'core': 60, 'plume': 80, 'flame': 80, 'flow': 80, 'spiral': 70, 'heat': 60, 'green': 80,
          'leaf_l': 80, 'ice': 40, 'drone': 40}
DOUBLE = ('green', 'leaf_l', 'plume', 'flame', 'flow')                    # drawn from both sides


def ring_solid(acc, r_in, r_out, y0, y1, n=64):
    """Flat annulus band (washer) from y0 to y1."""
    sweep(acc, lambda k: circle_pts(0, 0, r_out - k, n), [(0, y0), (r_out - r_in, y0), (r_out - r_in, y1), (0, y1)], closed=True,
          caps=(False, False))


def lofted(acc, radii, n=48, caps=(True, True)):
    """Solid of revolution through (y, r) pairs."""
    r0 = max(r for _, r in radii)
    sweep(acc, lambda k: circle_pts(0, 0, r0 - k, n), [(r0 - r, y) for y, r in radii], caps=caps)


def blade(acc, pts, outs, side, h, t):
    """Thin blade along polyline pts: depth h along unit vectors outs (per point), thickness t along unit `side`
    (per point). Closed solid."""
    verts = []
    for p, o, s in zip(pts, outs, side):
        for a, b in ((0, -1), (1, -1), (1, 1), (0, 1)):
            verts.append((p[0] + o[0] * h * a + s[0] * t / 2 * b, p[1] + o[1] * h * a + s[1] * t / 2 * b,
                          p[2] + o[2] * h * a + s[2] * t / 2 * b))
    m = len(pts)
    faces = [(i * 4 + k, i * 4 + (k + 1) % 4, (i + 1) * 4 + (k + 1) % 4, (i + 1) * 4 + k) for i in range(m - 1) for k in range(4)]
    faces += [(3, 2, 1, 0), tuple((m - 1) * 4 + k for k in range(4))]
    acc.solid(verts, faces)


def ground(ctx):
    a = ctx.a
    cyl(a['plinth'], 0, 0, PLINTH_R, 0, .35, 96)
    cyl(a['lawn'], 0, 0, LAWN_R, .35, .48, 96)
    ring_solid(a['seam'], LAWN_R - .1, LAWN_R + .6, .35, .54, 112)           # cold rim light round the lawn
    ring_solid(a['plinth'], 9.0, 10.4, .35, .55, 72)                         # paved ring round the skirt
    ring_solid(a['seam'], 10.4, 10.75, .35, .56, 72)                         # cold line at the paving edge
    for i in range(16):                                                      # radial cold seams in the grass
        ang = (i + .5) * TAU / 16
        c, s = math.cos(ang), math.sin(ang)
        r0, r1 = 10.6, LAWN_R - .2
        obox(a['seam'], ((r0 + r1) / 2 * c, .5, (r0 + r1) / 2 * s), (r1 - r0, .06, .5), (c, s), (-s, c))
    rm = (10.4 + LAWN_R) / 2
    for ang in PATHS:                                                        # four paths in from the rim
        c, s = math.cos(ang), math.sin(ang)
        obox(a['plinth'], (rm * c, .5, rm * s), (LAWN_R - 10.4 + .3, .06, 1.8), (c, s), (-s, c))


def skirt(ctx):
    """Intake: a white plinth ring, a glowing ice-blue bell and 48 louvre fins standing on it."""
    a = ctx.a
    ring_solid(a['silver'], 6.0, SKIRT_R0 + .5, .35, 1.0, 96)
    prof_pts = []
    for j in range(9):                                                       # concave bell, skirt foot to shaft
        t = j / 8
        r = SKIRT_R1 + (SKIRT_R0 - SKIRT_R1) * (1 - t) ** 1.8
        prof_pts.append((r, 1.0 + (SKIRT_Y - 1.0) * t))
    lofted(a['ice'], [(1.0, SKIRT_R0 - .3)] + [(y, r - .25) for r, y in prof_pts[1:]] + [(SKIRT_Y + .3, 1.0)], 64)
    for i in range(48):
        ang = i * TAU / 48
        c, s = math.cos(ang), math.sin(ang)
        pts, outs, side = [], [], []
        for j, (r, y) in enumerate(prof_pts):
            r2, y2 = prof_pts[min(j + 1, 8)]
            r1_, y1_ = prof_pts[max(j - 1, 0)]
            tr, ty = r2 - r1_, y2 - y1_
            ln = math.hypot(tr, ty)
            nr, ny = ty / ln, -tr / ln                                       # outward normal in the (r, y) plane
            if nr < 0:
                nr, ny = -nr, -ny
            pts.append((r * c, y, r * s))
            outs.append((nr * c, ny, nr * s))
            side.append((-s, 0, c))
        blade(a['silver'], pts, outs, side, .55, .16)
    ring_solid(a['silver'], SKIRT_R1 - .4, SKIRT_R1 + .55, SKIRT_Y - .1, SKIRT_Y + .5, 64)  # collar at the shaft


def shaft(ctx):
    a = ctx.a
    ys = [Y0 - .6 + (Y1 + .4 - Y0 + .6) * j / 24 for j in range(25)]
    lofted(a['core'], [(y, prof(y) - .75) for y in ys], 40)                  # clear glass core inside the lattice
    # Hot column: ice-blue at the intake, amber above (target colour ramp cold below, warm above).
    cyl(a['ice'], 0, 0, 1.5, SKIRT_Y - .2, 11.0, 24, r_top=1.35)
    cyl(a['heat'], 0, 0, 1.35, 11.0, Y1 + .5, 24, r_top=1.9)
    # Twin amber spirals rising inside the glass (one mesh, turned at runtime).
    for k in range(2):
        pts = []
        for j in range(121):
            t = j / 120
            y = 7.0 + (Y1 - 7.0) * t
            ang = k * math.pi + t * TAU * 4.5
            rr = 1.85 + .5 * t
            pts.append((rr * math.cos(ang), y, rr * math.sin(ang)))
        M.limb(a['spiral'], pts, .22, .42, 8)
    # Near-white exoskeleton (R2, owner: like the target): 12 broad flat members, all one hand, from the skirt collar to the
    # crown band, about 0.6 of a turn each.
    for i in range(12):
        pts, outs, side = [], [], []
        for j in range(41):
            t = j / 40
            y = Y0 + (Y1 - Y0) * t
            ang = i * TAU / 12 + t * TAU * .6
            r = prof(y) + .05
            c, s = math.cos(ang), math.sin(ang)
            ty, ta = Y1 - Y0, r * TAU * .6                                   # tangent: up ty, round ta (per unit t)
            ln = math.hypot(ty, ta)
            w = (-s * ty / ln, -ta / ln, c * ty / ln)                        # across the member, in the skin
            pts.append((r * c - w[0] * .45, y - w[1] * .45, r * s - w[2] * .45))
            outs.append(w)
            side.append((c, 0, s))
        blade(a['silver'], pts, outs, side, .9, .45)
    # Thin hoops where the lattice meets the collar and the crown.
    for y in (Y0 + .2, Y1 - .3):
        ring_solid(a['silver'], prof(y) - .2, prof(y) + .3, y - .3, y + .3, 56)


def rings(ctx):
    """Three stabilising rings with an ice-blue light strip each; a maintenance drone docked on the middle one."""
    a = ctx.a
    for y in (16.5, 22.5, 28.5):
        r = prof(y)
        ring_solid(a['silver'], r + .1, r + 1.15, y - .7, y + .7, 72)
        ring_solid(a['ice'], r + 1.1, r + 1.22, y - .12, y + .12, 72)
    rd = prof(22.5) + 1.5                                                    # docked on the middle ring, facing the close-up
    drone(ctx, rd * math.cos(CAM), 23.75, rd * math.sin(CAM), CAM)
    rf = prof(28.5) + 5.5                                                    # one hovering beside the top ring
    drone(ctx, rf * math.cos(CAM + .55), 31.0, rf * math.sin(CAM + .55), CAM + .3)


def drone(ctx, x, y, z, yaw):
    """Maintenance quadcopter about 3.5 m across: dark body, white canopy, four ice-blue rotor rings (R2: readable)."""
    a = ctx.a
    M.ell(a['drone'], (x, y, z), (1.0, 0, 0), (0, .42, 0), (0, 0, .8), 12, 7)
    M.ell(a['white'], (x, y + .28, z), (.6, 0, 0), (0, .2, 0), (0, 0, .5), 10, 5)
    for dx, dz in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        ox, oz = 1.2 * dx, 1.0 * dz
        px, pz = x + ox * math.cos(yaw) + oz * math.sin(yaw), z - ox * math.sin(yaw) + oz * math.cos(yaw)
        M.limb(a['drone'], [(x, y + .05, z), (px, y + .2, pz)], .11, .09, 6)
        cyl(a['drone'], px, pz, .16, y + .05, y + .3, 10)
        sweep(a['ice'], lambda k, px=px, pz=pz: circle_pts(px, pz, .7 - k, 20), [(0, y + .22), (.14, y + .22), (.14, y + .32),
              (0, y + .32)], closed=True, caps=(False, False))
        cyl(a['dark'], px, pz, .56, y + .25, y + .29, 16)
    cyl(a['ice'], x, z, .3, y - .48, y - .36, 12)                              # belly light


def crown(ctx):
    """Gold band, a hot mouth inside it and 30 flaring radiator fins."""
    a = ctx.a
    rb = prof(Y1)
    ring_solid(a['gold'], rb - .3, rb + .55, Y1 - .5, Y1 + .9, 72)
    lofted(a['heat'], [(Y1 + .2, 1.9), (Y1 + 1.6, rb - .5), (Y1 + 1.8, rb - .5)], 40, caps=(True, False))
    for i in range(30):                                                      # rounded rods, flaring, tips curling out
        ang = (i + .5) * TAU / 30
        c, s = math.cos(ang), math.sin(ang)
        tall = 8.2 + (.9 if i % 2 else 0)
        pts = []
        for j in range(9):
            t = j / 8
            y = Y1 + .4 + tall * t
            r = rb + .1 + 2.0 * t ** 1.5 + .9 * max(0, t - .8) / .2
            pts.append((r * c, y, r * s))
        M.limb(a['gold'], pts, .34, .26, 8)
    ring_solid(a['gold'], rb + .9, rb + 1.25, Y1 + 4.6, Y1 + 5.0, 60)        # tie hoop through the rods


def flame(ctx):
    """Flame tongues over the crown (R2, owner: far more visible): 10 twisting ribbons from the crown mouth, ~4 m wide at the
    base, narrowing to points between 58 and 80 m, plus a tapering core; alpha-blended saturated orange at runtime."""
    acc, rng = ctx.a['flame'], ctx.rng
    for i in range(10):
        a0 = i * TAU / 10 + rng.uniform(-.15, .15)
        top = rng.uniform(58, 80)
        r0 = rng.uniform(1.6, 3.4)
        wid = rng.uniform(3.2, 4.6)
        ph = rng.uniform(0, TAU)
        verts, faces, rows = [], [], 16
        for j in range(rows + 1):
            t = j / rows
            y = Y1 + .6 + (top - Y1 - .6) * t
            ang = a0 + t * 1.6 + .25 * math.sin(t * 9 + ph)
            r = r0 * (1 - .55 * t) + .8 * math.sin(t * 6 + ph)
            w = wid * (1 - t) ** .8 * (1 + .25 * math.sin(t * 11 + ph)) / 2
            cx, cz = r * math.cos(ang), r * math.sin(ang)
            tx, tz = -math.sin(ang), math.cos(ang)
            verts += [(cx - tx * w, y, cz - tz * w), (cx + tx * w, y, cz + tz * w)]
        faces = [(j * 2, j * 2 + 1, j * 2 + 3, j * 2 + 2) for j in range(rows)]
        acc.surface(verts, faces, lambda c: (c[0], 0, c[2]))
    n, rows = 16, 10                                                         # hot core cone out of the mouth
    verts = []
    for j in range(rows + 1):
        t = j / rows
        y = Y1 + .4 + 30 * t
        for i in range(n):
            ang = i * TAU / n
            r = 3.4 * (1 - t) ** 1.2 * (1 + .15 * math.sin(ang * 3 + t * 8))
            verts.append((r * math.cos(ang), y, r * math.sin(ang)))
    acc.surface(verts, [(j * n + i, j * n + (i + 1) % n, (j + 1) * n + (i + 1) % n, (j + 1) * n + i)
                        for j in range(rows) for i in range(n)], lambda c: (c[0], 0, c[2]))


def flow(ctx):
    """Cold-air streams (R2, owner: make the cooled lawn read as cold air): 40 ice-blue ribbons spiralling in over the grass
    from the rim to the skirt, rising into the intake; 16 wider, higher mist wisps. Turned at runtime about y (positive
    rotation.y winds the pattern inward, so the streams read as flowing into the tower)."""
    acc, rng = ctx.a['flow'], ctx.rng
    for i in range(56):
        mist = i >= 40
        a0 = (i if not mist else (i - 40) * 2.5) * TAU / (40 if not mist else 40) + rng.uniform(-.06, .06)
        ro, ri = (LAWN_R - .6, 9.4) if not mist else (rng.uniform(17, 21), 9.8)
        h0, h1 = (.62, 1.5) if not mist else (1.1, 2.6)
        wid = .42 if not mist else 1.3
        rows = 18
        verts = []
        for j in range(rows + 1):
            t = j / rows
            r = ro + (ri - ro) * t
            ang = a0 + (ro - r) * .075
            y = h0 + (h1 - h0) * t ** 2.2 + (.12 if not mist else .3) * math.sin(t * math.pi)
            w = wid * (.35 + .65 * math.sin(math.pi * min(1, t * 1.15)) ** .6) / 2
            c, s = math.cos(ang), math.sin(ang)
            tx, tz = -s, c
            verts += [(r * c - tx * w, y, r * s - tz * w), (r * c + tx * w, y, r * s + tz * w)]
        acc.surface(verts, [(j * 2, j * 2 + 1, j * 2 + 3, j * 2 + 2) for j in range(rows)], lambda c: (0, 1, 0))


def plume(ctx):
    """Soft heat shimmer: three wavy open tubes nested round the flame (runtime draws them additive)."""
    acc = ctx.a['plume']
    for k, (r0, r1, top) in enumerate(((3.6, 7.5, 80.0), (2.6, 5.6, 72.0), (1.6, 3.8, 64.0))):
        n, rows = 28, 12
        verts, faces = [], []
        for j in range(rows + 1):
            t = j / rows
            y = Y1 + 2.0 + (top - Y1 - 2.0) * t
            for i in range(n):
                ang = i * TAU / n + k * .4
                r = (r0 + (r1 - r0) * t) * (1 - .65 * t ** 2) * (1 + .12 * math.sin(ang * 3 + t * 7 + k) + .06 * math.sin(ang * 5 - t * 11))
                verts.append((r * math.cos(ang), y, r * math.sin(ang)))
        for j in range(rows):
            for i in range(n):
                faces.append((j * n + i, j * n + (i + 1) % n, (j + 1) * n + (i + 1) % n, (j + 1) * n + i))
        acc.surface(verts, faces, lambda c: (c[0], 0, c[2]))


TREES = []


def lush_tree(ctx, base, h, crown):
    """A full round crown like the target's grove (R2): a library leafy_tree with dense cards, plus a solid dark-green
    body inside the crown so it reads as one mass of leaves, not see-through branches."""
    TREES.append(base)
    M.leafy_tree(ctx, base, h=h, crown=crown, roles=('green', 'leaf_l', 'green'), core='green', n=420, size=1.0, branches=5)
    c = (base[0], base[1] + h * .82, base[2])
    M.ell(ctx.a['green'], c, (crown * .78, 0, 0), (0, crown * .62, 0), (0, 0, crown * .78), 10, 6)


def park(ctx):
    """A dense grove in two rows round the rim (R2, owner: lush like the target), benches facing the tower, residents."""
    rng = ctx.rng

    def clear(ang, gap):
        return all(abs((ang - p + math.pi) % TAU - math.pi) > gap for p in PATHS)

    for row, (count, r0, r1, h0, h1, c0, c1, gap) in enumerate(((26, 19.4, 20.6, 6.2, 8.4, 3.7, 4.4, .2),
                                                                 (18, 16.2, 17.4, 5.4, 6.8, 3.1, 3.6, .24))):
        for i in range(count):
            ang = (i + .5 * row) * TAU / count + rng.uniform(-.08, .08)
            if not clear(ang, gap):
                continue
            r = rng.uniform(r0, r1)
            lush_tree(ctx, (r * math.cos(ang), .48, r * math.sin(ang)), rng.uniform(h0, h1), rng.uniform(c0, c1))
    for i in range(8):
        ang = (i + .5) * TAU / 8
        r = 13.4
        x, z = r * math.cos(ang), r * math.sin(ang)
        yaw = math.atan2(-x, -z)                                             # facing the tower
        M.kit_prop(ctx, 'bench', x, .48, z, yaw + math.pi)
        if i % 2 == 0:
            M.seated_person(ctx, x + .35 * math.cos(ang + math.pi / 2), .48 + .45, z + .35 * math.sin(ang + math.pi / 2), yaw)
    for i in range(14):
        ang = rng.uniform(0, TAU)
        r = rng.uniform(11.2, 15.2)
        M.person(ctx, r * math.cos(ang), .48, r * math.sin(ang))


def build(ctx):
    ground(ctx)
    skirt(ctx)
    shaft(ctx)
    rings(ctx)
    crown(ctx)
    flame(ctx)
    plume(ctx)
    flow(ctx)
    park(ctx)


def main():
    import bpy
    from geo_helpers import finish_mesh, material
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = bpy.data.objects.new('Q05A_REVERSE_AC', None)
    bpy.context.scene.collection.objects.link(root)
    ctx = M.Ctx({k: Acc() for k in [*M.ROLES, *Q05A_ROLES]}, random.Random(2127))
    build(ctx)
    tris, per = 0, {}
    for role, acc in ctx.a.items():
        if not acc.v:
            continue
        rgba, emit, strength = Q05A_ROLES[role] if role in Q05A_ROLES else M.ROLES[role]
        mat = material('q05a_' + role, rgba, ROUGH.get(role, .6), emit=emit, emit_strength=strength)
        bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        if role in METAL:
            bsdf.inputs['Metallic'].default_value = METAL[role]
        if role in DOUBLE:
            mat.use_backface_culling = False
        ob = finish_mesh('q05a_' + role, acc, mat, SMOOTH.get(role, 25))
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = root
        per[role] = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        tris += per[role]
    blend = os.path.join(HERE, 'q05a-reverse-ac-2127.blend')
    glb = os.path.join(HERE, 'q05a-reverse-ac-2127.glb')
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in [root, *root.children_recursive]:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials='EXPORT', export_animations=False,
                              export_cameras=False, export_lights=False, export_extras=False)
    print('@@BUILD@@', {'tris': tris, 'trees': len(TREES), 'glb_bytes': os.path.getsize(glb),
                        'top': dict(sorted(per.items(), key=lambda kv: -kv[1])[:12])})


if __name__ == '__main__':
    main()
