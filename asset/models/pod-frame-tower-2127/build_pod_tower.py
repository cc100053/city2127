"""Pod frame tower (owner image 2026-11-17): open concrete grid, pastel egg pods plugged into and cantilevered off it on
white branching struts, recessed lit glass floors with planted balconies, and a rooftop farm with arbors. Model only:
no lot, no streets, no Meter wiring yet.

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_pod_tower.py
Writes pod-frame-tower-2127.blend and .glb next to this file (glTF, no Meshopt/Draco).

Units are METRES, three.js axes (x, y up, z), front -z, base centre at the origin. Frame 35 x 28 m (5 x 4 bays of 7 m),
ground + 6 floors of 4.5 m, roof deck 31.5 m, arbors to ~35 m; pods reach ~6 m past the frame.
One node POD_FRAME_TOWER, one mesh per role, role materials named pft_<role>.
R2 (2026-11-17): 1.45 m columns, 1.15 x 1.2 m beams with form-joint strips; nine pods seated in front bays; every pod
on a 3-5 limb strut with twigs; hanging planters in every bay, metal baluster railings, indoor trees; ring arbors and
a level-6 terrace farm; 4.5 m ground storefront with three arches and plinth planters.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'city-kit-2127'))
from geo_helpers import Acc, blob, obox  # noqa: E402
import modules as M  # noqa: E402

CELL, COLS, ROWS, LEVELS, FH = 7.0, 5, 4, 7, 4.5
COL, BEAM, BEAM_W = 1.45, 1.15, 1.2
W, D = COLS * CELL, ROWS * CELL
ZF, ZB, XL, XR = -D / 2, D / 2, -W / 2, W / 2
XS = [XL + i * CELL for i in range(COLS + 1)]
ZS = [ZF + j * CELL for j in range(ROWS + 1)]
ARCH_X = (-7.0, 0.0, 7.0)                                       # ground-floor entrances on the front (bay centres)


def top(k):
    return k * FH


def col(xc, zc, face, y):
    """Point on a column side face: face is '+x', '-x', '+z' or '-z'."""
    o = COL / 2 + .01
    return {'+x': (xc + o, y, zc), '-x': (xc - o, y, zc), '+z': (xc, y, zc + o), '-z': (xc, y, zc - o)}[face]


def under(k, x, z):
    """Point on the underside of the level-k perimeter beam at (x, z)."""
    return (x, top(k) - BEAM - .01, z)


def seat(k, H):                                                 # centre height of a pod resting 0.15 m above slab k
    return top(k) + .15 + H / 2


# (x, y, z, length, height, depth, yaw, shell, strut bases). yaw turns the window (local -z): 0 front, -pi/2 right (+x),
# pi/2 left (-x), pi back. Every pod has a strut; two bases grab a column side and a beam underside.
SEATED = [(-7, 1, 'pod_y'), (7, 1, 'pod_s'), (0, 2, 'pod_p'), (14, 2, 'pod_y'), (-14, 3, 'pod_s'), (7, 3, 'pod_p'),
          (-7, 4, 'pod_p'), (0, 5, 'pod_y'), (14, 5, 'pod_s')]  # (bay x, level, shell): front pods sitting in their bays
PODS = [
    # big cantilevered corner pods
    (-22.5, 24.6, -11.5, 13.0, 6.4, 7.6, .45, 'pod_y', [col(XL, -7, '-x', 19.5), under(4, XL - .3, -11)]),
    (22.8, 23.4, -5.0, 13.5, 6.6, 7.8, -.75, 'pod_y', [col(XR, -7, '+x', 18.5), under(4, XR + .3, -2)]),
    (-20.8, 11.0, -6.5, 8.5, 5.0, 6.0, 1.05, 'pod_p', [col(XL, -7, '-x', 5.5), under(1, XL - .3, -3)]),
    (-15.5, 6.4, ZF - 3.2, 8.5, 4.8, 5.4, .2, 'pod_y', [col(XL, ZF, '-z', 2.2), under(1, -13, ZF - .3)]),
    (21.0, 14.2, 4.0, 9.0, 5.4, 6.2, -1.25, 'pod_p', [col(XR, 7, '+x', 9.5), under(2, XR + .3, 2)]),
    (19.5, 29.8, 9.5, 7.5, 4.0, 5.0, -1.4, 'pod_y', [col(XR, 7, '+x', 25.5), under(6, XR + .3, 10.5)]),
    (-19.6, 30.2, 3.0, 7.0, 3.8, 4.8, 1.5, 'pod_y', [col(XL, 7, '-x', 26.0), under(6, XL - .3, 2)]),
    # front face: pods seated in bays (centre 0.1 m inside the frame face, cradled from the beam face below)
    *[(bx, seat(k, 3.0), ZF + .1, 4.9, 3.0, 3.6, 0.0, sh, [(bx - 1.9, top(k) - 1.05, ZF - BEAM_W / 2 - .01)])
      for bx, k, sh in SEATED],
    # front face: two pods pushed out of their bays
    (-14.0, seat(4, 3.6), ZF - 1.4, 5.4, 3.6, 4.2, .08, 'pod_y', [col(-10.5, ZF, '-z', 15.5), under(4, -15.5, ZF - .3)]),
    (7.5, seat(5, 3.6), ZF - 1.4, 5.8, 3.6, 4.4, -.06, 'pod_p', [col(3.5, ZF, '-z', 20.5), under(5, 9.0, ZF - .3)]),
    # right face
    (XR + 1.2, 20.4, 4.5, 6.4, 3.8, 4.6, -math.pi / 2, 'pod_p', [col(XR, 7, '+x', 17.0), under(4, XR + .3, 4.0)]),
    (XR + .8, seat(1, 3.6) - .1, -9.0, 5.6, 3.6, 4.2, -math.pi / 2, 'pod_s', [(XR + BEAM_W / 2 + .01, top(1) - .7, -9.5)]),
    # back and left faces (seen from the far side)
    (-6.0, 15.9, ZB + 1.4, 7.0, 4.0, 4.8, math.pi, 'pod_p', [(-6.0, top(3) - .7, ZB + BEAM_W / 2 + .01), col(-3.5, ZB, '+z', 12.0)]),
    (9.0, 24.9, ZB + 1.6, 7.4, 4.2, 5.0, math.pi, 'pod_y', [(9.0, top(5) - .7, ZB + BEAM_W / 2 + .01), col(10.5, ZB, '+z', 20.5)]),
    (4.0, 7.0, ZB + .8, 5.6, 3.6, 4.2, math.pi, 'pod_s', [(4.0, top(1) - .7, ZB + BEAM_W / 2 + .01)]),
    (XL - 1.2, 15.9, 8.0, 6.0, 3.8, 4.4, math.pi / 2, 'pod_s', [(XL - BEAM_W / 2 - .01, top(3) - .7, 8.0), col(XL, 7, '-x', 12.0)]),
]
SEATED_BAYS = {(bx, k) for bx, k, _ in SEATED}


def surf(pod, a, b, c, s=.96):
    """World point on the pod's egg surface along the local direction (a, b, c), pulled in by s."""
    x, y, z, L, H, Dp, yaw = pod[:7]
    m = math.sqrt(a * a + b * b + c * c)
    a, b, c = a / m, b / m, c / m
    f = 1 - .12 * a
    lx, ly, lz = a * L / 2 * s, b * H / 2 * f * s, c * Dp / 2 * f * s
    cy, sy = math.cos(yaw), math.sin(yaw)
    return (x + lx * cy + lz * sy, y + ly, z - lx * sy + lz * cy)


def struts(ctx, pod):
    """3-5 belly tips fanned toward the first base, one strut (with twigs) per pod."""
    x, y, z, L, H, Dp, yaw, _shell, bases = pod
    n = 5 if L > 10 else 4 if L >= 7 else 3
    bx, bz = bases[0][0] - x, bases[0][2] - z
    cy, sy = math.cos(yaw), math.sin(yaw)
    ph0 = math.atan2(bx * sy + bz * cy, bx * cy - bz * sy)
    spread = math.radians(150 if n == 5 else 120 if n == 4 else 90)
    tips = []
    for i in range(n):
        ph = ph0 + spread * (i / (n - 1) - .5)
        tips.append(surf(pod, .8 * math.cos(ph), -.55, .8 * math.sin(ph)))     # lower flanks, visible from above
    r = .62 if L > 10 else .42 if L >= 7 else .3
    M.branch_strut(ctx, bases if len(bases) > 1 else bases[0], tips, r=r)
    return n


def railing(A, at, span, yt):
    """Thin metal railing: top and bottom bars plus 2 cm balusters every 0.12 m (open triangular prisms, 6 tris)."""
    obox(A['rail'], at(0, yt + 1.05), (span, .05, .06) if at.along == 'x' else (.06, .05, span))
    obox(A['rail'], at(0, yt + .12), (span, .04, .04) if at.along == 'x' else (.04, .04, span))
    n = int(span / .12)
    e = .01
    for t in range(n + 1):
        c = at(-span / 2 + t * span / n, yt + .6)
        q = [(c[0] + e * math.cos(a), c[1] - .46, c[2] + e * math.sin(a)) for a in (0, 2.09, 4.19)]
        v = q + [(p[0], p[1] + .92, p[2]) for p in q]
        A['rail'].surface(v, [(0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)],
                          lambda cc, c=c: (cc[0] - c[0], 0, cc[2] - c[2]))
    return n + 1


def facade(ctx, tops):
    """Every bay of levels 1-6 on every face: a hanging planter spilling over the beam; where no pod sits, a metal
    railing and a balcony planter; vines from 60 % of beams; an indoor tree behind the glass in 30 % of bays."""
    A, rng = ctx.a, ctx.rng
    faces = [(XS, ZF, 'x', -1), (XS, ZB, 'x', 1), (ZS, XL, 'z', -1), (ZS, XR, 'z', 1)]
    st = {'bays': 0, 'planters': 0, 'rail_bays': 0, 'balusters': 0, 'vines': 0, 'trees': 0}
    for k, yt in enumerate(tops[1:-1], 1):
        for lines, edge, along, sg in faces:
            for a0, a1 in zip(lines, lines[1:]):
                mid, span = (a0 + a1) / 2, a1 - a0 - COL - .1
                st['bays'] += 1

                def at(u, yy, o=0.0, inset=.8, mid=mid, edge=edge, sg=sg, along=along):  # o > 0 pushes outwards
                    e = edge - sg * inset + sg * o
                    return (mid + u, yy, e) if along == 'x' else (e, yy, mid + u)
                at.along = along
                seated = sg == -1 and along == 'x' and (mid, k) in SEATED_BAYS
                po = .8 + BEAM_W / 2 + .25                          # hanging planter on the outer beam face
                obox(A['concrete'], at(0, yt - .35, po), (span - .4, .5, .5) if along == 'x' else (.5, .5, span - .4))
                for t in range(3):                                  # three round shrubs spilling over the lip
                    u = (t - 1) * span * (.42 if seated else .3) + rng.uniform(-.25, .25)
                    if seated and t == 1:
                        continue                                    # keep the seated pod's belly clear
                    rr = .75 if t == 1 else .6
                    blob(A['green' if t != 1 else 'leaf_l'], at(u, yt + .05, po + .1), (rr, .5, rr * .8), sub=2, seed=u + yt + edge)
                blob(A['leaf_l'], at(rng.uniform(-1.5, 1.5), yt - .75, po + .05), (.5, .45, .3) if along == 'x' else (.3, .45, .5),
                     sub=1, seed=yt * 3 + mid)
                st['planters'] += 1
                if not seated:
                    st['balusters'] += railing(A, at, span, yt)
                    st['rail_bays'] += 1
                    u = rng.uniform(-span / 4, span / 4)              # one shrub on the balcony behind the railing
                    blob(A['green'], at(u, yt + .55, -.7), (.8, .55, .6), sub=1, seed=u + yt)
                if st['bays'] % 5 in (0, 1, 3):                    # vine curtain from the planter, 1.2-3 m, 3 bays in 5
                    st['vines'] += 1
                    u = rng.choice((-1, 1)) * span * .4 if seated else rng.uniform(-span / 3, span / 3)
                    drop = rng.uniform(1.2, 3.0)
                    for kk in range(int(drop / .45)):
                        rv = .36 - .03 * kk + rng.uniform(-.05, .05)        # thinning, zig-zag strand of leaves
                        blob(A['green' if kk % 2 else 'leaf_l'], at(u + (.22 if kk % 2 else -.22) + rng.uniform(-.1, .1), yt - .9 - kk * .45,
                             po + .1 + rng.uniform(-.1, .1)), (rv, .4, rv * .8), sub=1, seed=u * 7 + kk)
                if st['bays'] % 10 in (1, 4, 7):                   # tree in a pot behind the glass, 3 bays in 10
                    st['trees'] += 1
                    p = at(rng.uniform(-span / 3, span / 3), yt + .38, -2.8)
                    M.kit_prop(ctx, 'tree_indoor', p[0], p[1], p[2], rng.uniform(0, 6.28))
    return st


def ground(ctx):
    """Ground storefront arches on the front and planters round the plinth (gaps at the entrances)."""
    A, rng = ctx.a, ctx.rng
    zg = ZF + 1.0                                                   # just in front of the storefront glass
    for xa in ARCH_X:
        for r, half, rise, dz in ((.34, 2.5, 3.4, 0), (.12, 2.0, 2.9, -.05)):
            arc = [(xa + half * math.cos(math.pi * t / 16), rise * math.sin(math.pi * t / 16), zg + dz) for t in range(17)]
            M.limb(A['white'], arc, r, r, 10)
    for lines, edge, along, sg in [(XS, ZF, 'x', -1), (XS, ZB, 'x', 1), (ZS, XL, 'z', -1), (ZS, XR, 'z', 1)]:
        for a0, a1 in zip(lines, lines[1:]):
            mid = (a0 + a1) / 2
            if along == 'x' and sg == -1 and any(abs(mid - xa) < .1 for xa in ARCH_X):
                continue
            e = edge + sg * 1.5
            obox(A['concrete'], (mid, .4, e) if along == 'x' else (e, .4, mid), (5.2, .6, 1.0) if along == 'x' else (1.0, .6, 5.2))
            for t in range(3):
                u = (t - 1) * 1.6 + rng.uniform(-.2, .2)
                p = (mid + u, .85, e) if along == 'x' else (e, .85, mid + u)
                blob(A['green' if t % 2 else 'leaf_l'], p, (.8, .45, .5) if along == 'x' else (.5, .45, .8), sub=2, seed=u + mid + e)
                f = (p[0] + rng.uniform(-.4, .4), 1.15, p[2] + rng.uniform(-.2, .2))
                blob(A['crop' if t != 1 else 'pod_p'], f, (.16, .12, .16), sub=1, noise=0)


def build(ctx):
    _xs, _zs, tops = M.grid_frame(ctx, cols=COLS, rows=ROWS, levels=LEVELS, cell=CELL, floor_h=FH, col=COL, beam=BEAM,
                                  beam_w=BEAM_W, joint='concrete_j')
    M.glass_room(ctx, 0, 0, .25, W - 3.0, D - 3.0, FH - .7, planters=True, edge=False)     # storefront, glass to the slab
    for yb in tops[1:-2]:                                           # recessed lit floors, levels 1-5
        M.glass_room(ctx, 0, 0, yb, W - 5.0, D - 5.0, FH - .5, planters=True, edge=False)
    M.glass_room(ctx, 0, 3.5, tops[6], W - 5.0, D - 12.0, FH - .5, planters=True, edge=False)  # level 6: front bay open
    M.roof_farm(ctx, -10.5, ZF + 3.8, tops[6], 13.0, 4.6, arbors=0, people=1, density=1.6, crops=3, bed='green',
                soil='leaf_l')  # terrace farm, 2 bays
    st = facade(ctx, tops)
    ground(ctx)
    M.roof_farm(ctx, 0, 0, tops[-1], W - 1.2, D - 1.2, arbors=2, people=5, density=1.6, crops=3, ring=True, bed='green',
                soil='leaf_l')
    st['strut_tips'] = []
    for pod in PODS:
        x, y, z, L, H, Dp, yaw, shell, _b = pod
        M.egg_pod(ctx, x, y, z, L, H, Dp, yaw, shell, ni=48 if L >= 6 else 32)
        st['strut_tips'].append(struts(ctx, pod))
    for xa in (-10.5, 3.5, 12.0):                                   # residents at the entrances for scale
        M.person(ctx, xa, .2, ZF - 2.5)
    return st


# Build-local look (R2): darker warm floors so the glass rooms read as lit interiors rather than beige plates; glossy
# coated pod shells; smooth shading on leaves and white struts.
OVERRIDE = {'floor': ((.66, .48, .32, 1), (1, .58, .24, 1), .45)}
ROUGH = {'glass': .1, 'white': .3, 'rail': .35, 'pod_y': .12, 'pod_p': .12, 'pod_s': .12}
SMOOTH = {'green': 80, 'leaf_l': 80, 'crop': 80, 'white': 50, 'pod_in': 60}


def main():
    import bpy
    from geo_helpers import finish_mesh, material
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = bpy.data.objects.new('POD_FRAME_TOWER', None)
    bpy.context.scene.collection.objects.link(root)
    ctx = M.Ctx({k: Acc() for k in M.ROLES}, random.Random(2127))
    st = build(ctx)
    tris, per = 0, {}
    for role, acc in ctx.a.items():
        if not acc.v:
            continue
        rgba, emit, strength = OVERRIDE.get(role, M.ROLES[role])
        mat = material('pft_' + role, rgba, ROUGH.get(role, .6), emit=emit, emit_strength=strength)
        if role in ('pod_y', 'pod_p', 'pod_s'):
            bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
            bsdf.inputs['Coat Weight'].default_value = .6
            bsdf.inputs['Coat Roughness'].default_value = .05
        ob = finish_mesh('pft_' + role, acc, mat, SMOOTH.get(role, 25))
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = root
        per[role] = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        tris += per[role]
    blend = os.path.join(HERE, 'pod-frame-tower-2127.blend')
    glb = os.path.join(HERE, 'pod-frame-tower-2127.glb')
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in [root, *root.children_recursive]:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials='EXPORT', export_animations=False,
                              export_cameras=False, export_lights=False, export_extras=False)
    print('@@BUILD@@', {'tris': tris, 'glb_bytes': os.path.getsize(glb), 'pods': len(PODS), 'facade': st,
                        'top': dict(sorted(per.items(), key=lambda kv: -kv[1])[:12])})


if __name__ == '__main__':
    main()
