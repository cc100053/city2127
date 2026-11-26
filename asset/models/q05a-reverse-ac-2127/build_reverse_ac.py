"""Q05-A reverse air conditioner (owner-accepted target artifacts/q05-targets/q05a-reverse-ac.jpg, 2026-11-26): a glass tower
that draws the park's hot ground air in through an ice-blue louvred skirt, lifts it as an amber spiral inside a clear core
wrapped by a pale diagonal exoskeleton, and throws it out of a gold fin crown into the sky. Three stabilising rings (one
with a docked maintenance drone); a round cooled lawn with radial cold seams, trees, benches and residents around it.

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_reverse_ac.py
Writes q05a-reverse-ac-2127.blend and .glb next to this file (glTF, no Meshopt/Draco).

Units are METRES, three.js axes (x, y up, z), ground-contact centre at the origin, front -z (no strong front: round).
Lot: NE PARK `changeSites.ne` (40 x 40 m); the lawn disc is 20 m in radius, the crown tops out at ~46 m, the plume
reaches ~78 m. One node Q05A_REVERSE_AC, one mesh per role named q05a_<role>; the runtime animates two of them:
q05a_spiral (the amber heat spiral, turned about y) and q05a_plume (the heat column above the crown, drawn additive).
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
LAWN_R, PLINTH_R = 18.6, 20.0
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
    'silver': ((.93, .95, .97, 1), None, .5),                   # exoskeleton, rings, skirt fins: pale near-white metal
    'ice': ((.30, .80, 1, 1), (.25, .75, 1, 1), 2.6),            # cold intake glow, ring strips, lawn seams
    'heat': ((1, .62, .22, 1), (1, .55, .14, 1), 3.0),           # hot core column
    'spiral': ((1, .74, .32, 1), (1, .66, .20, 1), 4.5),         # the rising heat spiral (animated)
    'gold': ((.93, .70, .32, 1), (1, .62, .22, 1), .35),        # crown fins and band
    'core': ((.80, .90, .96, .16), None, .5),                    # clear glass core
    'plume': ((1, .70, .42, .13), (1, .60, .30, 1), .55),        # heat shimmer column (runtime: additive, translucent)
    'lawn': ((.20, .40, .12, 1), None, .5),
    'plinth': ((.90, .90, .87, 1), None, .5),
}
ROUGH = {'silver': .28, 'gold': .3, 'core': .05, 'plume': .9, 'lawn': .9, 'plinth': .6}
METAL = {'silver': .3, 'gold': .8}
SMOOTH = {'silver': 40, 'gold': 35, 'core': 60, 'plume': 80, 'spiral': 70, 'heat': 60, 'green': 80, 'leaf_l': 80,
          'ice': 40}
LEAVES = ('green', 'leaf_l')


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
    ring_solid(a['ice'], LAWN_R, LAWN_R + .35, .35, .52, 96)                 # cold rim light round the lawn
    ring_solid(a['plinth'], 9.0, 10.4, .35, .55, 72)                         # paved ring round the skirt
    for i in range(16):                                                      # radial cold seams in the grass
        ang = (i + .5) * TAU / 16
        c, s = math.cos(ang), math.sin(ang)
        r0, r1 = 10.6, LAWN_R - .5
        obox(a['ice'], ((r0 + r1) / 2 * c, .5, (r0 + r1) / 2 * s), (r1 - r0, .05, .22), (c, s), (-s, c))
    for i in range(4):                                                       # four paths in from the rim
        ang = TAU / 8 + i * TAU / 4
        c, s = math.cos(ang), math.sin(ang)
        obox(a['plinth'], (14.6 * c, .5, 14.6 * s), (8.4, .06, 1.8), (c, s), (-s, c))


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
    # Pale exoskeleton: 14 left- and 14 right-hand helical members, from skirt collar to the crown band.
    for hand in (1, -1):
        for i in range(14):
            pts = []
            for j in range(33):
                t = j / 32
                y = Y0 + (Y1 - Y0) * t
                ang = i * TAU / 14 + hand * t * math.pi * .95
                r = prof(y)
                pts.append((r * math.cos(ang), y, r * math.sin(ang)))
            M.limb(a['silver'], pts, .2, .17, 6)
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
    drone(ctx, (prof(22.5) + 1.7) * math.cos(-2.2), 23.55, (prof(22.5) + 1.7) * math.sin(-2.2), -2.2)
    drone(ctx, 7.6 * math.cos(-1.4), 19.4, 7.6 * math.sin(-1.4), .4)


def drone(ctx, x, y, z, yaw):
    a = ctx.a
    M.ell(a['white'], (x, y, z), (.7, 0, 0), (0, .26, 0), (0, 0, .55), 10, 6)
    for dx, dz in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        ox, oz = .75 * dx, .6 * dz
        px, pz = x + ox * math.cos(yaw) + oz * math.sin(yaw), z - ox * math.sin(yaw) + oz * math.cos(yaw)
        M.limb(a['slate'], [(x, y + .05, z), (px, y + .12, pz)], .05, .05, 5)
        cyl(a['dark'], px, pz, .38, y + .14, y + .19, 12)
    cyl(a['ice'], x, z, .16, y - .32, y - .22, 10)


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


def plume(ctx):
    """Translucent heat column: three wavy open tubes nested above the crown (runtime draws them additive)."""
    acc = ctx.a['plume']
    for k, (r0, r1, top) in enumerate(((3.6, 7.5, 78.0), (2.6, 5.6, 70.0), (1.6, 3.8, 62.0))):
        n, rows = 28, 12
        verts, faces = [], []
        for j in range(rows + 1):
            t = j / rows
            y = Y1 + 2.0 + (top - Y1 - 2.0) * t
            for i in range(n):
                ang = i * TAU / n + k * .4
                r = (r0 + (r1 - r0) * t) * (1 + .12 * math.sin(ang * 3 + t * 7 + k) + .06 * math.sin(ang * 5 - t * 11))
                verts.append((r * math.cos(ang), y, r * math.sin(ang)))
        for j in range(rows):
            for i in range(n):
                faces.append((j * n + i, j * n + (i + 1) % n, (j + 1) * n + (i + 1) % n, (j + 1) * n + i))
        acc.surface(verts, faces, lambda c: (c[0], 0, c[2]))


def park(ctx):
    """Trees round the rim, benches facing the tower, residents resting in the cool."""
    rng = ctx.rng
    for i in range(16):                                                      # lush rim grove (owner: green stays lush)
        ang = i * TAU / 16 + rng.uniform(-.1, .1)
        r = rng.uniform(15.4, 17.4)
        M.leafy_tree(ctx, (r * math.cos(ang), .48, r * math.sin(ang)), h=rng.uniform(6.5, 8.5), crown=rng.uniform(3.0, 3.6),
                     roles=('leaf_l', 'green'), n=150, size=.75, branches=5)
    for i in range(6):                                                       # a few inner trees for shade on the benches
        ang = (i + .25) * TAU / 6
        M.leafy_tree(ctx, (13.2 * math.cos(ang), .48, 13.2 * math.sin(ang)), h=5.5, crown=2.4,
                     roles=('leaf_l', 'green'), n=90, size=.6, branches=4)
    for i in range(8):
        ang = (i + .5) * TAU / 8
        r = 12.4
        x, z = r * math.cos(ang), r * math.sin(ang)
        yaw = math.atan2(-x, -z)                                             # facing the tower
        M.kit_prop(ctx, 'bench', x, .48, z, yaw + math.pi)
        if i % 2 == 0:
            M.seated_person(ctx, x + .35 * math.cos(ang + math.pi / 2), .48 + .45, z + .35 * math.sin(ang + math.pi / 2), yaw)
    for i in range(14):
        ang = rng.uniform(0, TAU)
        r = rng.uniform(11.0, 14.5)
        M.person(ctx, r * math.cos(ang), .48, r * math.sin(ang))


def build(ctx):
    ground(ctx)
    skirt(ctx)
    shaft(ctx)
    rings(ctx)
    crown(ctx)
    plume(ctx)
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
        if role in LEAVES or role == 'plume':
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
    print('@@BUILD@@', {'tris': tris, 'glb_bytes': os.path.getsize(glb),
                        'top': dict(sorted(per.items(), key=lambda kv: -kv[1])[:12])})


if __name__ == '__main__':
    main()
