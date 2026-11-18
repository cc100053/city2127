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
R4 (2026-11-18): every plant is built from leaf cards (leaf_clump, leafy_tree, leaf_strand) instead of lumpy balls;
strut forks stand in front of each pod's camera side; solid bone arms; a brighter lit ground-floor shop.
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
ARCHES = [((-7.0, 0, ZF - .1), (0, 0, -1)), ((7.0, 0, ZF - .1), (0, 0, -1)), ((XR + .1, 0, 3.5), (1, 0, 0))]  # entrance hoods


def top(k):
    return k * FH


def col(xc, zc, face, y):
    """(point, normal) on a column side face: face is '+x', '-x', '+z' or '-z'."""
    o = COL / 2 + .01
    n = {'+x': (1, 0, 0), '-x': (-1, 0, 0), '+z': (0, 0, 1), '-z': (0, 0, -1)}[face]
    return (xc + n[0] * o, y, zc + n[2] * o), n


def under(k, x, z):
    """(point, normal) on the underside of the level-k perimeter beam at (x, z)."""
    return (x, top(k) - BEAM - .01, z), (0, -1, 0)


def bface(k, x, z, n, dy=.7):
    """(point, normal) on the outer face of the level-k perimeter beam, dy below its top."""
    o = BEAM_W / 2 + .01
    return (x + n[0] * o, top(k) - dy, z + n[2] * o), n


def slab(k, x, z):
    """(point, normal) on the top of slab k: a strut that grows up from the floor like a small white tree."""
    return (x, top(k) + .01, z), (0, 1, 0)


def seat(k, H):                                                 # centre height of a pod resting 0.15 m above slab k
    return top(k) + .15 + H / 2


FRONT, RIGHT, BACK, LEFT = (0, 0, -1), (1, 0, 0), (0, 0, 1), (-1, 0, 0)
FACE_CAM = -.82                                                  # yaw that turns a window toward the target3q camera
# (x, y, z, length, height, depth, yaw, shell, strut bases). yaw turns the window (local -z): 0 front, -pi/2 right (+x),
# pi/2 left (-x), pi back. Every pod has a strut; bases are (point, normal) pairs on a column side, beam or slab.
# R3 layout for the target3q view (the +x face on screen left, the front on screen right): the big cream pods stand
# off the far ends of both faces, pinks low on the +x face, nine seated front pods (4 cream, 3 pink, 2 sage).
SEATED = [(-7, 1, 'pod_y'), (7, 1, 'pod_s'), (0, 2, 'pod_p'), (14, 2, 'pod_y'), (-14, 3, 'pod_s'), (7, 3, 'pod_p'),
          (-7, 4, 'pod_p'), (0, 5, 'pod_y'), (14, 5, 'pod_y')]  # (bay x, level, shell): front pods sitting in their bays
BAY_TREES = {(7, 1), (-14, 3), (0, 2), (14, 5)}                 # seated pods also held by a white tree from the slab
PODS = [
    # big cantilevered pods off the far end of each face (bone arms hook their crowns)
    (-22.5, 24.6, -11.5, 13.0, 6.4, 7.6, -.5, 'pod_y', [col(XL, ZF, '-x', 19.5), under(4, XL - .3, -9)]),
    (22.6, 24.2, 7.5, 13.5, 6.6, 7.8, -1.05, 'pod_y', [col(XR, 7, '+x', 18.5), under(4, XR + .3, 4.5)]),
    # front (-z) face, screen right
    (-20.5, 11.8, -12.0, 8.5, 5.0, 6.0, -.3, 'pod_p', [col(XL, ZF, '-x', 7.0), under(2, XL - .3, -10.0)]),
    (-15.5, 5.6, ZF - 3.2, 7.5, 4.4, 5.0, .15, 'pod_y', [col(-10.5, ZF, '-z', 2.0), under(1, -13, ZF - .3)]),
    (-14.0, seat(4, 3.6), ZF - 1.4, 5.4, 3.6, 4.2, .08, 'pod_y', [col(-10.5, ZF, '-z', 15.5), under(4, -15.5, ZF - .3)]),
    (7.5, seat(5, 3.6), ZF - 1.4, 5.8, 3.6, 4.4, -.06, 'pod_p', [col(3.5, ZF, '-z', 20.5), under(5, 9.0, ZF - .3)]),
    *[(bx, seat(k, 3.0), ZF + .1, 4.9, 3.0, 3.6, 0.0, sh, [bface(k, bx - 1.9, ZF, FRONT, 1.05)]) for bx, k, sh in SEATED],
    # +x face, screen left
    (20.6, 13.0, -6.0, 9.0, 5.4, 6.2, -1.0, 'pod_p', [col(XR, -7, '+x', 8.5), under(2, XR + .3, -3.0)]),
    (XR + 1.0, seat(3, 3.6), 10.0, 6.0, 3.6, 4.4, -1.45, 'pod_p', [col(XR, 7, '+x', 12.0), bface(2, XR, 10.5, RIGHT)]),
    (XR + 1.0, seat(3, 3.4), 1.0, 5.4, 3.4, 4.0, -1.3, 'pod_y', [bface(2, XR, 1.5, RIGHT), col(XR, 0, '+x', 12.5)]),
    (XR + .8, seat(1, 3.6) - .1, 4.0, 5.6, 3.6, 4.2, -math.pi / 2, 'pod_s', [col(XR, 7, '+x', 1.4)]),
    (XR + 1.0, seat(4, 3.6), -6.5, 6.0, 3.6, 4.4, -1.4, 'pod_s', [col(XR, -7, '+x', 17.0), under(4, XR + .3, -4.5)]),
    (19.6, 30.4, -2.5, 7.0, 3.8, 4.8, -1.3, 'pod_y', [col(XR, 0, '+x', 26.0), under(6, XR + .3, -3.5)]),
    # back and left faces (seen from the far side)
    (-19.6, 30.2, 3.0, 7.0, 3.8, 4.8, 1.5, 'pod_y', [col(XL, 7, '-x', 26.0), under(6, XL - .3, 2)]),
    (-6.0, 15.9, ZB + 1.4, 7.0, 4.0, 4.8, math.pi, 'pod_p', [bface(3, -6.0, ZB, BACK), col(-3.5, ZB, '+z', 12.0)]),
    (9.0, 24.9, ZB + 1.6, 7.4, 4.2, 5.0, math.pi, 'pod_y', [bface(5, 9.0, ZB, BACK), col(10.5, ZB, '+z', 20.5)]),
    (4.0, 7.0, ZB + .8, 5.6, 3.6, 4.2, math.pi, 'pod_s', [bface(1, 4.0, ZB, BACK)]),
    (XL - 1.2, 15.9, 8.0, 6.0, 3.8, 4.4, math.pi / 2, 'pod_s', [bface(3, XL, 8.0, LEFT), col(XL, 7, '-x', 12.0)]),
]
# bone arms: (pod index, (point, normal) on a column top or beam) -> flat perforated arm to the pod's crown
BONES = [(0, col(XL, -7, '-x', 28.6)), (1, col(XR, 7, '+x', 28.4)), (2, col(XL, -7, '-x', 15.2)),
         (7, col(XR, ZF, '+x', 16.2)), (8, col(XR, 14.0, '+x', 18.6))]
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


CAM = (.73, -.68)                                                # three.js xz direction from the tower to the target3q camera


def local_dir(pod, wx, wz):
    """World xz direction -> the pod's local (x, z) (inverse of the yaw used by surf)."""
    cy, sy = math.cos(pod[6]), math.sin(pod[6])
    return wx * cy - wz * sy, wx * sy + wz * cy


def struts(ctx, pod):
    """R4: the fork stands out in front of the pod's camera-side underbelly (outside its silhouette from target3q),
    its 3-5 thick flat limbs fanning up onto the camera-facing flank and belly, webbed at the fork; the trunk runs
    from the frame base(s) to that fork. Disc feet."""
    x, y, z, L, H, Dp, yaw, _shell, bases = pod
    n = 5 if L > 10 else 4 if L >= 7 else 3
    clx, clz = local_dir(pod, *CAM)
    bx, bz = local_dir(pod, bases[0][0][0] - x, bases[0][0][2] - z)
    bm = math.hypot(bx, bz) or 1
    bx, bz = bx / bm, bz / bm
    a0 = math.atan2(clz * .7 + bz * .3, clx * .7 + bx * .3)        # mostly camera side, leaning to the base
    spread = math.radians(150 if n == 5 else 120 if n == 4 else 90)
    tips = []
    for i in range(n):
        ph = a0 + spread * (i / (n - 1) - .5)
        tips.append(surf(pod, math.cos(ph), -.35 if i % 2 else -.75, math.sin(ph)))  # camera-side flank and belly
    fx, fz = math.cos(a0) * .55 + bx * .25, math.sin(a0) * .55 + bz * .25
    fl = (fx, -1.0, fz)                                             # local fork direction: below and in front
    q = math.sqrt((fl[0] / (L / 2)) ** 2 + (fl[1] / (H / 2)) ** 2 + (fl[2] / (Dp / 2)) ** 2)
    k = 1.7 / q
    cy, sy = math.cos(yaw), math.sin(yaw)
    lx, ly, lz = fl[0] * k, fl[1] * k, fl[2] * k
    fork = (x + lx * cy + lz * sy, y + ly, z - lx * sy + lz * cy)
    r = .7 if L > 10 else .55 if L >= 7 else .42
    M.branch_strut(ctx, [b[0] for b in bases], tips, r=r, web=True, pads=[b[1] for b in bases], limb_r=.85, flat=.75,
                   twigs=L >= 6, fork=fork, web_k=1.15)
    return n


def bay_tree(ctx, pod):
    """A white tree from the slab beside a seated pod: trunk from the floor, limbs to the pod flank and beam above."""
    x, y, z, L, H = pod[:5]
    k = round((y - H / 2 - .15) / FH)
    side = 1 if x < 10 else -1
    base = slab(k, x + side * (L / 2 + .2), ZF + 1.2)
    tips = [surf(pod, side, -.1, -.3), surf(pod, side * .6, .5, -.5),
            (base[0][0] + side * .4, top(k + 1) - BEAM - .01, ZF + .6)]
    M.branch_strut(ctx, base[0], tips, r=.22, web=True, pads=[base[1]], limb_r=.7)


def railing(A, at, span, yt):
    """Thin metal railing: top and bottom bars plus 2 cm balusters every 0.15 m (R3: one outward-facing strip each, 2 tris)."""
    obox(A['rail'], at(0, yt + 1.05), (span, .05, .06) if at.along == 'x' else (.06, .05, span))
    obox(A['rail'], at(0, yt + .12), (span, .04, .04) if at.along == 'x' else (.04, .04, span))
    n = int(span / .15)
    e = .01
    for t in range(n + 1):
        c = at(-span / 2 + t * span / n, yt + .6)
        o = at(-span / 2 + t * span / n, yt + .6, 1.0)                 # a point just outside: the strip faces it
        out = (o[0] - c[0], 0, o[2] - c[2])
        du = (e * abs(out[2]), 0, e * abs(out[0]))
        v = [(c[0] - du[0], c[1] - .46, c[2] - du[2]), (c[0] + du[0], c[1] - .46, c[2] + du[2]),
             (c[0] + du[0], c[1] + .46, c[2] + du[2]), (c[0] - du[0], c[1] + .46, c[2] - du[2])]
        A['rail'].surface(v, [(0, 1, 2, 3)], lambda cc, out=out: out)
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
                for t in range(3):                                  # R4: three leafy shrubs spilling over the lip
                    u = (t - 1) * span * (.42 if seated else .3) + rng.uniform(-.25, .25)
                    if seated and t == 1:
                        continue                                    # keep the seated pod's belly clear
                    rr = 1.0 if t == 1 else .85
                    M.leaf_clump(ctx, at(u, yt + .15, po + .2), (rr, .7, rr * .85), ('leaf_l', 'green') if t == 1 else ('green', 'leaf_l'),
                                 'green', 22, .5, .8, 2)
                ox = (0, 0, sg) if along == 'x' else (sg, 0, 0)
                for t in range(2):                                  # trailing stems over the planter lip
                    M.leaf_strand(ctx, at(rng.uniform(-span / 2.5, span / 2.5), yt - .2, po + .4), rng.uniform(.9, 2.0), ox, 'leaf_l', .34, .26)
                st['planters'] += 1
                if not seated:
                    st['balusters'] += railing(A, at, span, yt)
                    st['rail_bays'] += 1
                    u = rng.uniform(-span / 4, span / 4)              # one shrub on the balcony behind the railing
                    M.leaf_clump(ctx, at(u, yt + .7, -.7), (1.0, .7, .7), ('green', 'leaf_l'), 'green', 18, .42, .5, 2)
                if not (along == 'x' and sg == -1) and st['bays'] % 5 in (0, 1, 3):   # R3: leaf-ribbon strands, 3 bays in 5
                    st['vines'] += 1
                    u = rng.uniform(-span / 4, span / 4)
                    M.vine_curtain(ctx, at(u - 1.0, 0, po + .1), at(u + 1.0, 0, po + .1), yt - .6, (0, 0, sg) if along == 'x' else (sg, 0, 0),
                                   length=(1.2, 3.0), step=.9, role='vine', flowers=('pod_p', 'white'), skip=pod_clear(yt), cards=True)
                if st['bays'] % 10 in (1, 4, 7):                   # tree in a pot behind the glass, 3 bays in 10
                    st['trees'] += 1
                    p = at(rng.uniform(-span / 3, span / 3), yt + .38, -2.8)
                    obox(A['white'], (p[0], p[1] + .25, p[2]), (.6, .5, .6))     # R4: pot + branching leafy tree
                    M.leafy_tree(ctx, (p[0], p[1] + .5, p[2]), 2.6, .9, 'wood', ('leaf_l', 'green'), 'green', 40, .32, 3)
    return st


def pod_clear(yt):
    """skip() for vine strands hanging from the beam at yt: stop 0.1 m above any pod top below the strand."""
    def f(px, pz):
        lim = None
        for pod in PODS:
            x, y, z, L, H, Dp, yaw = pod[:7]
            r = max(L, Dp) / 2 + .3
            if (px - x) ** 2 + (pz - z) ** 2 < r * r and y + H / 2 < yt:
                gap = max(.4, yt - .6 - (y + H / 2) - .1)
                lim = gap if lim is None else min(lim, gap)
        return lim
    return f


def curtains(ctx, tops):
    """Front vine curtains (R3): three per level, each 7 m wide centred on an inner column so it spans two bays,
    hanging 1.5-3.5 m from the beam planter, pale yellow-green with pink and white flowers."""
    n = 0
    cols = XS[1:-1]
    for k in range(2, 8):
        yt = tops[k]
        for c in [cols[(k + i) % 4] for i in range(3)]:
            zc = ZF - BEAM_W / 2 - .3
            M.vine_curtain(ctx, (c - 3.3, 0, zc), (c + 3.3, 0, zc), yt - .6, (0, 0, -1), length=(1.5, 3.5), step=.75,
                           role='vine', flowers=('pod_p', 'white'), skip=pod_clear(yt), cards=True)
            n += 1
    return n


def ground(ctx):
    """R3 ground floor: white half-egg entrance hoods (two on the front, one on the +x face), storefront mullions
    every 1.5 m, and low rounded flower beds with small trees round the plinth (inside the 1.5 m paving)."""
    A = ctx.a
    for c, out in ARCHES:
        M.arch_shell(ctx, c, out, span=5.5, rise=4.0, reach=2.0, t=.4)
    hw, hd = (W - 3.0) / 2 + .3, (D - 3.0) / 2 + .3                 # storefront glass planes (glass_room)
    for i in range(int((W - 3.0) / 1.5) + 1):
        x = -(W - 3.0) / 2 + i * 1.5
        for zz in (-hd - .06, hd + .06):
            obox(A['white'], (x, .25 + (FH - .7) / 2, zz), (.1, FH - .7, .08))
    for i in range(int((D - 3.0) / 1.5) + 1):
        zq = -(D - 3.0) / 2 + i * 1.5
        for xx in (-hw - .06, hw + .06):
            obox(A['white'], (xx, .25 + (FH - .7) / 2, zq), (.08, FH - .7, .1))
    for zz, xx in ((-hd + 1.8, None), (None, hw - 1.8)):             # lit shop back walls behind the front and +x glass
        q = ([(-hw + 1, .4, zz), (hw - 1, .4, zz), (hw - 1, 3.4, zz), (-hw + 1, 3.4, zz)] if zz is not None else
             [(xx, .4, -hd + 1), (xx, .4, hd - 1), (xx, 3.4, hd - 1), (xx, 3.4, -hd + 1)])
        A['shop'].surface(q, [(0, 1, 2, 3)], lambda c, zz=zz: (0, 0, -1) if zz is not None else (1, 0, 0))
    A['shop'].surface([(-hw + .2, FH - .52, -hd + .2), (hw - .2, FH - .52, -hd + .2), (hw - .2, FH - .52, hd - .2),
                       (-hw + .2, FH - .52, hd - .2)], [(0, 1, 2, 3)], lambda c: (0, -1, 0))   # R4: lit shop ceiling
    for lines, edge, along, sg in [(XS, ZF, 'x', -1), (XS, ZB, 'x', 1), (ZS, XL, 'z', -1), (ZS, XR, 'z', 1)]:
        for bi, (a0, a1) in enumerate(zip(lines, lines[1:])):
            mid = (a0 + a1) / 2
            e = edge + sg * .85
            c = (mid, 0, e) if along == 'x' else (e, 0, mid)
            if any(abs(c[0] - ac[0]) < 1 and abs(c[2] - ac[2]) < 1.5 for ac, _o in ARCHES):
                continue
            M.flower_bed(ctx, c, (1, 0) if along == 'x' else (0, 1), 5.0, 1.2, grass='leaf_l',
                         flowers=('white', 'pod_p', 'flower_v'), trees=1 if bi % 2 == 0 else 0, cards=True)


def planter_tray(ctx, x, y, z, r=1.5):
    """Round white planter platform (3 m) off a beam face, full of shrubs and flowers, on a short white strut."""
    A = ctx.a
    M.disc(A['white'], (x, y, z), (0, 1, 0), r, .45, 28)
    M.disc(A['leaf_l'], (x, y + .26, z), (0, 1, 0), r - .12, .1, 28)
    for t in range(7):
        a = t * 2 * math.pi / 7
        M.leaf_clump(ctx, (x + .95 * math.cos(a), y + .6, z + .95 * math.sin(a)), (.55, .45, .55),
                     ('green', 'leaf_l') if t % 2 else ('leaf_l', 'green'), 'green', 22, .34, .8, 2)
    M.leafy_tree(ctx, (x, y + .3, z), 2.4, .9, 'wood', ('leaf_l', 'green'), 'green', 50, .34, 3)
    for t in range(5):
        a = t * 2 * math.pi / 5 + .3
        blob(A['pod_p' if t % 2 else 'white'], (x + 1.2 * math.cos(a), y + .85, z + 1.2 * math.sin(a)), (.18, .12, .18), sub=1, noise=0)
    M.branch_strut(ctx, [bface(2, x + 1.2, ZF, FRONT, .6)[0]], [(x - .6, y - .2, z + .2), (x + .6, y - .2, z - .2)],
                   r=.22, web=True, pads=[FRONT], limb_r=.7)


def tcount(ctx):
    return sum(len(f) - 2 for acc in ctx.a.values() for f in acc.f)


def build(ctx):
    parts, last = {}, [0]

    def mark(name):                                                 # triangles added by each part, for the budget row
        n = tcount(ctx)
        parts[name] = parts.get(name, 0) + n - last[0]
        last[0] = n
    _xs, _zs, tops = M.grid_frame(ctx, cols=COLS, rows=ROWS, levels=LEVELS, cell=CELL, floor_h=FH, col=COL, beam=BEAM,
                                  beam_w=BEAM_W, joint='concrete_j', joint_w=.06, alt='concrete_b', ties='concrete_t',
                                  nodes=True)
    mark('frame')
    M.glass_room(ctx, 0, 0, .25, W - 3.0, D - 3.0, FH - .7, planters=True, edge=False)     # storefront, glass to the slab
    for yb in tops[1:5]:                                            # recessed lit floors, levels 1-4
        M.glass_room(ctx, 0, 0, yb, W - 5.0, D - 5.0, FH - .5, planters=True, edge=False)
    # R3: level 5 glass steps in one bay on the front and +x faces, the outer bays farmed; level 6 is all farm
    M.glass_room(ctx, (XL + 2.5 + XR - CELL) / 2, (ZF + CELL + ZB - 2.5) / 2, tops[5], W - CELL - 2.5, D - CELL - 2.5,
                 FH - .5, planters=True, edge=False)
    farm = dict(density=1.25, crops=1.8, bed='green', soil='leaf_l', leaf='leaf_c', flowers=('pod_p', 'white', 'flower_v'),
                edges=False, cards=True)
    M.roof_farm(ctx, 0, ZF + 4.6, tops[5], W - 2.5, 4.6, arbors=0, people=1, **farm)
    M.roof_farm(ctx, XR - 4.2, (ZF + CELL + ZB - 1.5) / 2, tops[5], 5.6, D - CELL - 1.5, arbors=0, people=1, **farm)
    M.roof_farm(ctx, 0, 0, tops[6], W - 2.5, D - 2.5, arbors=0, people=2, **farm)
    mark('rooms')
    st = facade(ctx, tops)
    st['curtains'] = curtains(ctx, tops)
    mark('facade')
    ground(ctx)
    mark('ground')
    M.roof_farm(ctx, 0, 0, tops[-1], W - 1.2, D - 1.2, arbors=2, people=5, density=1.6, crops=2.4, ring=True, bed='green',
                soil='leaf_l', leaf='leaf_c', hoop='arch', tufts=8, canopy=True, spill=1.2,
                flowers=('pod_p', 'white', 'flower_v'), hoop_step=2.6, cards=True)
    mark('roof')
    st['strut_tips'] = []
    for pod in PODS:
        x, y, z, L, H, Dp, yaw, shell, _b = pod
        M.egg_pod(ctx, x, y, z, L, H, Dp, yaw, shell, ni=40 if L >= 6 else 24, win=(37, 32), tilt=14, rim=.06,
                  mullions=5 if L >= 8 else 4, port=('L', .06), side_port=L >= 6, back_wall=True)
        mark('pods')
        st['strut_tips'].append(struts(ctx, pod))
        if (round(x), round((y - H / 2 - .15) / FH)) in BAY_TREES and abs(z - (ZF + .1)) < .01:
            bay_tree(ctx, pod)
        mark('struts')
    for i, (pt, _n) in BONES:                                       # perforated bone arms over the big pods' crowns
        pod = PODS[i]
        crown = surf(pod, 0, 1, 0, s=1.0)
        crown = (crown[0] + (pt[0] - crown[0]) * .12, crown[1] - .25, crown[2] + (pt[2] - crown[2]) * .12)
        L = pod[3]
        M.bone_arm(ctx, pt, crown, w=1.3 if L > 10 else 1.0, t=.36, holes=3 if L > 8 else 2, sag=.1, solid=True)
    mark('bones')
    planter_tray(ctx, -12.0, top(3) - .3, ZF - 2.4)
    for xa in (-10.5, 3.5, 12.0):                                   # residents at the entrances for scale
        M.person(ctx, xa, .2, ZF - 2.5)
    mark('other')
    st['parts'] = parts
    return st


# Build-local look (R2): darker warm floors so the glass rooms read as lit interiors rather than beige plates; glossy
# coated pod shells; smooth shading on leaves and white struts.
PFT_ROLES = {                                                    # R3 build-only roles (shared ROLES untouched)
    'concrete_b': ((.68, .595, .575, 1), None, .5),              # second concrete shade, about 6 % darker
    'concrete_t': ((.30, .29, .28, 1), None, .5),                # form-tie holes
    'leaf_c': ((.55, .78, .30, 1), None, .5),                    # pale crop green
    'vine': ((.62, .80, .32, 1), None, .5),                      # yellow-green vine curtains
    'arch': ((.16, .24, .14, 1), None, .5),                      # dark green metal arbor hoops
    'flower_v': ((.62, .48, .80, 1), None, .5),                  # violet flowers
    'shop': ((1, .82, .58, 1), (1, .72, .42, 1), 4.0),          # R4: ground-floor shop walls and ceiling, brightest
}
OVERRIDE = {**PFT_ROLES, 'floor': ((.86, .70, .50, 1), (1, .70, .42, 1), .6),   # R3: light warm wood, lit
            'room': ((.95, .86, .72, 1), (1, .82, .60, 1), 1.0),  # R3: warm white lit ceilings (was orange)
            'concrete': ((.72, .63, .61, 1), None, .5),           # R3: warm pinkish grey sampled from the target 'concrete_j': ((.42, .40, .37, 1), None, .5),
            'pod_y': ((.97, .88, .70, 1), None, .5),                # R3: cream, not butter-yellow, under the warm sun
            'pod_in': ((.96, .84, .64, 1), (1, .76, .46, 1), 1.1)}  # R3: brighter lit lining
ROUGH = {'glass': .1, 'white': .3, 'rail': .35, 'arch': .4, 'pod_y': .12, 'pod_p': .12, 'pod_s': .12}
LEAVES = ('green', 'leaf_l', 'leaf_c', 'vine')                    # R4: leaf cards are single faces: double-sided
SMOOTH = {'green': 80, 'leaf_l': 80, 'crop': 80, 'white': 50, 'pod_in': 60, 'leaf_c': 80, 'vine': 80, 'flower_v': 80}


def main():
    import bpy
    from geo_helpers import finish_mesh, material
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = bpy.data.objects.new('POD_FRAME_TOWER', None)
    bpy.context.scene.collection.objects.link(root)
    ctx = M.Ctx({k: Acc() for k in [*M.ROLES, *PFT_ROLES]}, random.Random(2127))
    st = build(ctx)
    tris, per = 0, {}
    for role, acc in ctx.a.items():
        if not acc.v:
            continue
        rgba, emit, strength = OVERRIDE[role] if role in OVERRIDE else M.ROLES[role]
        mat = material('pft_' + role, rgba, ROUGH.get(role, .6), emit=emit, emit_strength=strength)
        if role in ('pod_y', 'pod_p', 'pod_s'):
            bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
            bsdf.inputs['Coat Weight'].default_value = .6
            bsdf.inputs['Coat Roughness'].default_value = .05
        if role in LEAVES:
            mat.use_backface_culling = False
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
