"""Q05 shared park surround (owner 2026-11-28, C-R2b: «一個共通周邊», «常駐，四個狀態都見»): the ground round the NE PARK
lot's 24 m plinth, the same whichever Q05 model (or the default NE park) stands on it. A paved walk rings the plinth and four
link walks tie it to the city on the bearings of Q05-A's four paths: the seaside promenade paving to the north-east and
north-west, avenue (1)'s outside footway to the south-east and the pod-tower drive to the south-west. Between them planted
banks, white-rimmed terrace beds, faceted park trees (tall on the far side, low toward the close-up cameras), benches facing
the plinth, ice-white lamps and residents. Measurements: docs/handoffs/q05-park-cooling.md `## C-R2b brief`.

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_park_surround.py
Writes q05-park-surround-2127.blend and .glb next to this file (glTF, no Meshopt/Draco).

Units are METRES, three.js axes (x, y up, z), origin at the lot centre on the ground (world −210, 0, −135). Bearings are world
atan2(z, x): 0 east, pi/2 south, -pi/2 north (the bay). Everything stays outside r = 24.3 m (the plinths) and is static: one node
Q05_PARK_SURROUND, one mesh per role named q05s_<role>. Every glow is ice white, never the concept lot's #5fdcff.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'city-kit-2127'))
from geo_helpers import Acc, obox  # noqa: E402
import modules as M  # noqa: E402

TAU = math.pi * 2
D = math.pi / 180
R_IN, R_OUT, R_BANK = 24.3, 27.3, 29.2          # ring walk inner/outer edge, foot of the planted bank
TOP, FOOT = .42, -.5                            # walk top (one step below the plinths' 0.48-0.62 rims), buried foot
CAM = -2.22                                     # bearing of the q05 close-up cameras
# The utility block CTX_north_utility_service stands 26 m out at about 158-170 degrees: the ring and its bank stop short of it.
GAP = (150 * D, 180 * D)
BANK_GAP = (146 * D, 184 * D)
NORTH = (-125 * D, -60 * D)                     # the bank is paved here, sloping onto the seaside promenade paving (y -0.19)
# Link walks: polylines (x, z) from the ring's outer edge to the city, with the end height they land on. Bearings are Q05-A's.
LINKS = {
    'ne': ([(19.3, -19.3), (20.4, -22.6), (21.0, -26.5), (21.2, -31.0)], -.19),   # promenade paving (north-east)
    'nw': ([(-19.3, -19.3), (-20.4, -21.4), (-21.6, -24.2)], -.19),             # promenade paving (north-west)
    'se': ([(17.5, 20.9), (19.2, 23.0), (20.6, 24.8)], .23),                   # avenue (1) outside footway (50 deg: clear of
                                                                                # the lamp mast at (24, 20))
    'sw': ([(-19.3, 19.3), (-20.8, 23.5), (-22.4, 28.0), (-23.4, 32.4)], .19),   # pod-tower drive's north edge
}
LINK_HALF = 1.5

ROLES_S = {
    'walk': ((.82, .81, .77, 1), None, .5),                     # pale ceramic paving (the plinths' family, a touch lighter)
    'kerb': ((.95, .96, .96, 1), None, .5),                     # white kerbs and bed rims
    'ice': ((.86, .95, 1, 1), (.70, .88, 1, 1), 1.6),           # ice-white seams and lamp heads
    'bank': ((.22, .42, .14, 1), None, .5),                     # planted bank and bed ground cover
    'lawn': ((.30, .52, .18, 1), None, .5),
}
ROUGH = {'walk': .7, 'kerb': .45, 'bank': .95, 'lawn': .9, 'crown': .9, 'crown_l': .9}
SMOOTH = {'crown': 1, 'crown_l': 1, 'green': 80, 'leaf_l': 80, 'kerb': 30}
DOUBLE = ('green', 'leaf_l')


def ang_gap(a, b):
    return abs((a - b + math.pi) % TAU - math.pi)


def in_arc(a, arc):
    lo, hi = arc
    return ang_gap(a, (lo + hi) / 2) < (hi - lo) / 2


def polar(r, a, y):
    return (r * math.cos(a), y, r * math.sin(a))


def arc_solid(acc, section, a0, a1, n):
    """Closed solid of revolution of a closed (r, y) polygon over the bearings a0..a1 (capped at both ends)."""
    k = len(section)
    verts = [polar(r, a0 + (a1 - a0) * i / n, y) for i in range(n + 1) for r, y in section]
    faces = [(i * k + j, i * k + (j + 1) % k, (i + 1) * k + (j + 1) % k, (i + 1) * k + j) for i in range(n) for j in range(k)]
    faces += [tuple(range(k)), tuple(n * k + j for j in reversed(range(k)))]
    acc.solid(verts, faces)


def strip(acc, pts, h0, h1, depth, off0, off1):
    """Slab along an (x, z, y) polyline between the lateral offsets off0..off1 (left of travel positive), top at the
    polyline's y + h0..h1 lift, `depth` deep."""
    verts = []
    for i, (x, z, y) in enumerate(pts):
        p, q = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
        tx, tz = q[0] - p[0], q[1] - p[1]
        ln = math.hypot(tx, tz)
        nx, nz = -tz / ln, tx / ln
        for o, lift in ((off0, h0), (off1, h1)):
            verts.append((x + nx * o, y + lift, z + nz * o))
        for o in (off1, off0):
            verts.append((x + nx * o, y - depth, z + nz * o))
    n = len(pts)
    faces = []
    for i in range(n - 1):
        b, c = i * 4, (i + 1) * 4
        faces += [(b + j, b + (j + 1) % 4, c + (j + 1) % 4, c + j) for j in range(4)]
    faces += [(0, 1, 2, 3), (c + 3, c + 2, c + 1, c)]
    acc.solid(verts, faces)


def link_path(key, step=.8):
    """Densified (x, z, y) polyline of a link, ramping from the walk top to its landing height."""
    pts, end = LINKS[key]
    out = []
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(x1 - x0, z1 - z0) / step))
        out += [(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n) for i in range(n)]
    out.append(pts[-1])
    total = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(out, out[1:]))
    res, s = [], 0.0
    for i, (x, z) in enumerate(out):
        if i:
            s += math.hypot(x - out[i - 1][0], z - out[i - 1][1])
        t = s / total
        res.append((x, z, TOP + (end + .02 - TOP) * (3 * t * t - 2 * t * t * t)))
    # Start the walk 1.2 m inside the ring's outer edge so the two pavings overlap without a seam.
    x0, z0, _ = res[0]
    r0 = math.hypot(x0, z0)
    res.insert(0, (x0 * (r0 - 1.2) / r0, z0 * (r0 - 1.2) / r0, TOP))
    return res


def link_bearings():
    return [math.atan2(p[0][1], p[0][0]) for p, _ in LINKS.values()]


def ground(ctx):
    """Ring walk with kerbs and seams, the planted (north: paved) bank round it, the four link walks."""
    a = ctx.a
    a0, a1 = GAP[1], GAP[0] + TAU
    n = 260
    arc_solid(a['walk'], [(R_IN, TOP), (R_OUT, TOP), (R_OUT, FOOT), (R_IN, FOOT)], a0, a1, n)
    arc_solid(a['kerb'], [(R_OUT - .05, TOP + .07), (R_OUT + .22, TOP + .07), (R_OUT + .22, FOOT), (R_OUT - .05, FOOT)], a0, a1, n)
    for r in (R_IN + .7, R_OUT - .9):                                         # two ice-white seams along the walk
        arc_solid(a['ice'], [(r - .05, TOP + .012), (r + .05, TOP + .012), (r + .05, TOP - .02), (r - .05, TOP - .02)], a0, a1, n)
    for i in range(72):                                                       # radial paving joints
        ang = i * TAU / 72
        if in_arc(ang, GAP):
            continue
        c, s = math.cos(ang), math.sin(ang)
        obox(a['joint'], ((R_IN + R_OUT) / 2 * c, TOP + .004, (R_IN + R_OUT) / 2 * s), (R_OUT - R_IN - .3, .02, .05), (c, s), (-s, c))
    for end in GAP:                                                           # planters closing the walk at the utility block
        c, s = math.cos(end), math.sin(end)
        side = 1 if end == GAP[1] else -1
        mid = (R_IN + R_OUT) / 2
        p = (mid * c - s * side * .9, mid * s + c * side * .9)
        obox(a['kerb'], (p[0], TOP + .3, p[1]), (R_OUT - R_IN, .6, 1.4), (c, s), (-s, c))
        obox(a['lawn'], (p[0], TOP + .62, p[1]), (R_OUT - R_IN - .3, .04, 1.1), (c, s), (-s, c))
        for q in (-.6, 0, .6):
            M.leaf_clump(ctx, (p[0] + c * q, TOP + 1.0, p[1] + s * q), (.6, .5, .6), roles=('leaf_l', 'green'), core='green',
                         n=24, size=.36, droop=.5, lobes=2)
    # Bank: from the kerb down to the lawn; planted, except the north arc where it is paved onto the promenade. Cut at the links.
    links = link_bearings()
    cuts = sorted([(b - .075, b + .075) for b in links] + [BANK_GAP], key=lambda c: c[0] % TAU)
    bank = [(R_OUT + .2, TOP + .02), (R_BANK, -.42), (R_BANK, FOOT), (R_OUT + .2, FOOT)]
    edges = []
    lo = BANK_GAP[1]
    for c0, c1 in sorted([((c0 - lo) % TAU + lo, (c1 - lo) % TAU + lo) for c0, c1 in cuts if (c0, c1) != BANK_GAP]):
        edges.append((lo, c0))
        lo = c1
    edges.append((lo, BANK_GAP[0] + TAU))
    for e0, e1 in edges:                                                      # split each span at the paved north arc
        marks = [e0, e1]
        for b in NORTH:
            for k in (b, b + TAU):
                if e0 < k < e1:
                    marks.append(k)
        marks.sort()
        for m0, m1 in zip(marks, marks[1:]):
            paved = in_arc((m0 + m1) / 2, NORTH)
            arc_solid(a['walk' if paved else 'bank'], bank, m0, m1, max(2, int((m1 - m0) / (2 * D))))
    for key in LINKS:
        path = link_path(key)
        strip(a['walk'], path, 0, 0, .9, -LINK_HALF, LINK_HALF)
        body = path[1:]
        for side in (-1, 1):                                                  # kerbs and seams
            strip(a['kerb'], body, .07, .07, .9, side * (LINK_HALF - .05), side * (LINK_HALF + .2))
            strip(a['ice'], body, .012, .012, .03, side * (LINK_HALF - .55) - .05, side * (LINK_HALF - .55) + .05)
        x, z, y = path[-1]                                                    # landing threshold: white stripes
        px, pz, _ = path[-2]
        ln = math.hypot(x - px, z - pz)
        tx, tz = (x - px) / ln, (z - pz) / ln
        for k in range(5):
            o = -1.2 + k * .6
            obox(a['kerb'], (x - tx * .6 - tz * o, y + .015, z - tz * .6 + tx * o), (.9, .03, .3), (tx, tz), (-tz, tx))


def bed(ctx, ang, r, length, depth, tiers=2):
    """White-rimmed terrace bed along the ring at bearing `ang`, radius r (its inner edge), two tiers stepping up outward,
    planted with ground cover and leaf clumps."""
    a = ctx.a
    c, s = math.cos(ang), math.sin(ang)
    for k in range(tiers):
        rr = r + depth * (k + .5) / tiers
        h = .55 + .4 * k
        obox(a['kerb'], (rr * c, h / 2 - .3, rr * s), (depth / tiers, h + .6, length - k * .8), (c, s), (-s, c))
        obox(a['lawn'], (rr * c, h + .005, rr * s), (depth / tiers - .28, .02, length - k * .8 - .28), (c, s), (-s, c))
        for q in range(int(length / 1.6)):
            o = -length / 2 + .9 + q * 1.6 + ctx.rng.uniform(-.3, .3)
            if abs(o) > (length - k * .8) / 2 - .5:
                continue
            M.leaf_clump(ctx, (rr * c - s * o, h + .35, rr * s + c * o), (.75, .5, .75), roles=('leaf_l', 'green'), core='green',
                         n=22, size=.34, droop=.5, lobes=2)


def clear_of_links(x, z, gap):
    for key in LINKS:
        for px, pz, _ in link_path(key, 1.0):
            if math.hypot(x - px, z - pz) < gap:
                return False
    return True


def greenery(ctx):
    """Planted ground between the links: terrace beds against the bank, faceted park trees in loose groves (tall on the far
    side as the dark ground the Q05 models read against, low and sparse toward the close-up cameras), shrubs on the bank."""
    rng = ctx.rng
    trees = 0
    # (bearing from, to, radius from, to, height from, to, count): kept off the promenade, avenue (1)'s footway and street trees,
    # the pod-tower drive and the utility block (occupancy grid in the brief).
    groves = [(-38, -2, 31, 39, 6.5, 9.0, 9), (2, 20, 29.5, 32, 6.0, 8.0, 3), (88, 124, 30, 34, 6.5, 9.0, 9),
              (128, 142, 30, 33, 5.5, 7.0, 3), (188, 204, 31, 38, 3.5, 5.0, 3), (-30, -14, 40, 44, 6.0, 8.0, 3)]
    for b0, b1, r0, r1, h0, h1, count in groves:
        for i in range(count):
            for _ in range(20):
                ang = rng.uniform(b0, b1) * D
                r = rng.uniform(r0, r1)
                x, z = r * math.cos(ang), r * math.sin(ang)
                if clear_of_links(x, z, 4.2):
                    break
            else:
                continue
            M.facet_tree(ctx, (x, -.3, z), rng.uniform(h0, h1), rng.uniform(2.4, 3.4), blobs=rng.randint(8, 10))
            trees += 1
    # Terrace beds against the bank, between the links (none on the north promenade arc or by the utility block).
    for ang_deg in (-30, -8, 14, 75, 95, 115, 196, 210):
        ang = ang_deg * D
        if not clear_of_links(R_BANK * math.cos(ang), R_BANK * math.sin(ang), 4.0):
            continue
        bed(ctx, ang, R_BANK + .2, rng.uniform(5.5, 7.0), 2.2)
    # Shrubs along the planted bank.
    links = link_bearings()
    for i in range(110):
        ang = i * TAU / 110
        if in_arc(ang, BANK_GAP) or in_arc(ang, NORTH) or any(ang_gap(ang, b) < .12 for b in links):
            continue
        r = (R_OUT + R_BANK) / 2 + .3
        M.leaf_clump(ctx, polar(r, ang, .05), (.9, .55, .9), roles=('leaf_l', 'green'), core='green', n=20, size=.36, droop=.5,
                     lobes=2)
    return trees


def furniture(ctx):
    """Benches on the walk's outer edge facing the plinth, lamps with ice-white heads round the walk and along the links,
    residents strolling the ring and the links, a few seated."""
    a, rng = ctx.a, ctx.rng
    links = link_bearings()
    seats = []
    for i in range(18):                                                       # benches
        ang = (i + .5) * TAU / 18
        if in_arc(ang, (GAP[0] - 4 * D, GAP[1] + 4 * D)) or any(ang_gap(ang, b) < .16 for b in links):
            continue
        r = R_OUT - .55
        x, z = r * math.cos(ang), r * math.sin(ang)
        yaw = math.atan2(-x, -z)
        M.kit_prop(ctx, 'bench', x, TOP, z, yaw + math.pi)
        seats.append((x, z, yaw))
    for x, z, yaw in seats[::3]:
        M.seated_person(ctx, x, TOP + .45, z, yaw)
    lamps = [polar(R_OUT - .3, (i + .25) * TAU / 12, TOP) for i in range(12) if not in_arc((i + .25) * TAU / 12, GAP)]
    for key in LINKS:
        path = link_path(key, 1.0)
        if len(path) > 8:
            x, z, y = path[len(path) // 2]
            px, pz, _ = path[len(path) // 2 - 1]
            ln = math.hypot(x - px, z - pz)
            lamps.append((x - (z - pz) / ln * (LINK_HALF + .5), y, z + (x - px) / ln * (LINK_HALF + .5)))
    for x, y, z in lamps:
        M.limb(a['kerb'], [(x, y, z), (x, y + 4.4, z)], .08, .06, 8)
        M.disc(a['kerb'], (x, y + 4.45, z), (0, 1, 0), .34, .1, 16)
        M.disc(a['ice'], (x, y + 4.38, z), (0, 1, 0), .26, .04, 16)
    for i in range(16):                                                       # walkers on the ring
        ang = rng.uniform(0, TAU)
        if in_arc(ang, GAP):
            continue
        r = rng.uniform(R_IN + .6, R_OUT - 1.4)
        M.person(ctx, r * math.cos(ang), TOP, r * math.sin(ang), yaw=ang + math.pi / 2 * rng.choice((1, -1)))
    for key in LINKS:                                                         # and on the links
        path = link_path(key, 1.0)
        for f in (.35, .75):
            x, z, y = path[int(f * (len(path) - 1))]
            M.person(ctx, x + rng.uniform(-.6, .6), y, z + rng.uniform(-.6, .6))
    return len(lamps)


def build(ctx):
    ground(ctx)
    trees = greenery(ctx)
    lamps = furniture(ctx)
    return {'trees': trees, 'lamps': lamps}


def main():
    import bpy
    from geo_helpers import finish_mesh, material
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = bpy.data.objects.new('Q05_PARK_SURROUND', None)
    bpy.context.scene.collection.objects.link(root)
    ctx = M.Ctx({k: Acc() for k in [*M.ROLES, *ROLES_S]}, random.Random(2128))
    info = build(ctx)
    tris, per = 0, {}
    for role, acc in ctx.a.items():
        if not acc.v:
            continue
        rgba, emit, strength = ROLES_S[role] if role in ROLES_S else M.ROLES[role]
        mat = material('q05s_' + role, rgba, ROUGH.get(role, .6), emit=emit, emit_strength=strength)
        if role in DOUBLE:
            mat.use_backface_culling = False
        ob = finish_mesh('q05s_' + role, acc, mat, SMOOTH.get(role, 25))
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = root
        per[role] = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        tris += per[role]
    blend = os.path.join(HERE, 'q05-park-surround-2127.blend')
    glb = os.path.join(HERE, 'q05-park-surround-2127.glb')
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
