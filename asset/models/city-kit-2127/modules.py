"""city-kit-2127 modules: parametric building parts baked into a site GLB (index: asset/models/LIBRARY.md).

Props (build_kit.PROPS) are single objects; modules are assembled parts — a lit glass room with furniture and
residents, a glass lift with its capsule, a ring doorway — that a site builder calls while it accumulates geometry.
Extracted from the SE stage R5 builder (feat/se-stage-closeup-polish 0f9afde); status in LIBRARY.md.

Usage from a site builder (three.js coordinates, real metres, 1.8 m person):
    from modules import Ctx, ROLES, glass_room, glass_lift
    ctx = Ctx({role: Acc() for role in ROLES}, random.Random(seed))
    glass_room(ctx, x, z, y, width, depth, height)
    ... then finish_mesh(ctx.a[role]) per role with the ROLES recipe (or the site's own material for that role).
A module only writes into ctx.a[<role>]; it never creates materials. Same seed + same call order = same geometry.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import blob, cyl, obox, rot, rrect_pts, sweep  # noqa: E402
from build_kit import PROPS  # noqa: E402

# Material recipe per role: (rgba, emission rgba or None, emission strength). From SE R4/R5, polish 1 (2026-11-13):
# warm light seeps out through glass from ceilings and back panels; floors are light warm wood, not glowing salmon planes;
# residents read as people (not black silhouettes) by day and night.
ROLES = {
    'white': ((.94, .94, .90, 1), None, .5), 'room': ((.68, .43, .27, 1), (.85, .40, .15, 1), 1.2),
    'amber': ((1, .52, .08, 1), (1, .42, .04, 1), .5), 'green': ((.25, .48, .18, 1), None, .5),
    'dark': ((.065, .052, .045, 1), None, .5), 'glass': ((.86, .92, .95, .10), None, .5),
    'floor': ((.88, .68, .44, 1), (1, .60, .26, 1), .8), 'glow': ((1, .62, .28, 1), (1, .55, .18, 1), 2.4),
    'skin': ((.80, .57, .42, 1), None, .5), 'skin_b': ((.52, .35, .26, 1), None, .5),
    'cloth_a': ((.17, .30, .50, 1), None, .5), 'cloth_b': ((.80, .28, .20, 1), None, .5),
    'cloth_c': ((.20, .50, .46, 1), None, .5), 'wood': ((.50, .33, .20, 1), None, .5),
    'slate': ((.20, .22, .25, 1), None, .5), 'fabric': ((.84, .60, .47, 1), None, .5),
    # Event shelf (SW mixed, 2026-11-13): structural frame, steel rail, module teal accent, lock light, forecourt paving.
    'frame': ((.085, .085, .09, 1), None, .5), 'rail': ((.62, .64, .66, 1), None, .5), 'teal': ((.12, .60, .60, 1), None, .5),
    'cyan': ((.22, .78, 1, 1), (.22, .78, 1, 1), 2.0), 'paving': ((.74, .72, .68, 1), None, .5),
    # Event shelf R2: joint block grey, light module body grey, oak panelling. R3: three pane roles (below).
    'joint': ((.30, .31, .32, 1), None, .5), 'grey': ((.58, .60, .61, 1), None, .5), 'oak': ((.55, .36, .19, 1), None, .5),
    # R3: low-saturation warm-glass panes (warm white, pale amber, cool white) replace the toy-bright yellow / cyan window roles.
    'pane_w': ((.80, .70, .52, 1), (1, .78, .50, 1), .9), 'pane_a': ((.76, .58, .36, 1), (1, .66, .30, 1), .9), 'pane_c': ((.70, .76, .80, 1), (.78, .88, 1, 1), .9),
}
# Kit prop material -> module role, so baked props share the site's roles.
KITMAP = {'kit_dark': 'slate', 'kit_white': 'white', 'kit_wood': 'wood', 'kit_fabric': 'fabric', 'kit_screen': 'glow',
          'kit_amber': 'amber', 'kit_leaf_a': 'green', 'kit_leaf_b': 'green', 'kit_glass': 'glass', 'kit_bark': 'wood',
          'kit_soil': 'dark'}


class Ctx:
    """a: role -> Acc (every ROLES key must be present); rng: random.Random owned by the site builder."""
    def __init__(self, a, rng):
        missing = set(ROLES) - set(a)
        assert not missing, f'Ctx needs accumulators for {sorted(missing)}'
        self.a, self.rng = a, rng


def box(ctx, role, x, y, z, sx, sy, sz):
    obox(ctx.a[role], (x, y, z), (sx, sy, sz))


def _lb(acc, x, y, z, lx, ly, lz, sx, sy, sz, yaw):
    """Box at a local offset from (x, y, z), turned by yaw."""
    ox, oz = rot(lx, lz, yaw)
    obox(acc, (x + ox, y + ly, z + oz), (sx, sy, sz), (math.cos(yaw), -math.sin(yaw)), (math.sin(yaw), math.cos(yaw)))


class _TAcc:
    """Yaws a kit prop's geometry about Y, translates it, and writes into a role accumulator."""
    def __init__(self, t, x, y, z, yaw):
        self.t, self.x, self.y, self.z, self.c, self.s = t, x, y, z, math.cos(yaw), math.sin(yaw)

    def tf(self, q):
        return (self.x + q[0] * self.c + q[2] * self.s, self.y + q[1], self.z - q[0] * self.s + q[2] * self.c)

    def solid(self, verts, faces):
        self.t.solid([self.tf(q) for q in verts], faces)

    def surface(self, verts, faces, want):
        def inv(c):
            dx, dz = c[0] - self.x, c[2] - self.z
            return want((dx * self.c - dz * self.s, c[1] - self.y, dx * self.s + dz * self.c))
        self.t.surface([self.tf(q) for q in verts], faces, lambda c: self.tf(inv(c)))


def kit_prop(ctx, name, x, y, z, yaw=0, fabric=None):
    """Bake one build_kit prop at (x, y, z) facing yaw; fabric overrides the kit_fabric role (e.g. 'cloth_b')."""
    m = dict(KITMAP)
    if fabric is not None:
        m['kit_fabric'] = fabric

    class P:
        pass
    p = P()
    p.name = name
    p.a = lambda k: _TAcc(ctx.a[m[k]], x, y, z, yaw)
    PROPS[name](p)


def person(ctx, x, y, z, scale=1, yaw=None):
    """Standing resident, ~1.78 m at scale 1: legs, shoes, torso, arms, head and a tapered hair cap;
    height, clothing, skin and hair vary with ctx.rng."""
    rng, a = ctx.rng, ctx.a
    yaw = rng.uniform(0, 2 * math.pi) if yaw is None else yaw
    sc = scale * rng.uniform(.93, 1.08)
    top = a[rng.choice(['cloth_a', 'cloth_b', 'cloth_c', 'white', 'cloth_b'])]
    bot = a[rng.choice(['slate', 'cloth_a', 'wood', 'cloth_c', 'slate'])]
    sk = a[rng.choice(['skin', 'skin', 'skin_b'])]
    hair = a[rng.choice(['dark', 'wood', 'slate'])]
    for dx in [-.11, .11]:
        _lb(bot, x, y, z, dx * sc, .46 * sc, 0, .15 * sc, .84 * sc, .2 * sc, yaw)
        _lb(a['dark'], x, y, z, dx * sc, .04 * sc, .04 * sc, .15 * sc, .08 * sc, .26 * sc, yaw)
    _lb(top, x, y, z, 0, 1.13 * sc, 0, .42 * sc, .6 * sc, .24 * sc, yaw)
    for dx in [-.27, .27]:
        _lb(top, x, y, z, dx * sc, 1.1 * sc, 0, .09 * sc, .56 * sc, .12 * sc, yaw)
    cyl(sk, x, z, .13 * sc, y + 1.43 * sc, y + 1.7 * sc, 8)
    cyl(hair, x, z, .14 * sc, y + 1.62 * sc, y + 1.78 * sc, 8, r_top=.08 * sc)


def seated_person(ctx, x, ysit, z, yaw):
    """Seated resident; ysit is the seat height, yaw the facing."""
    rng, a = ctx.rng, ctx.a
    top = a[rng.choice(['cloth_a', 'cloth_b', 'cloth_c', 'white'])]
    bot = a[rng.choice(['slate', 'cloth_a', 'wood', 'cloth_c'])]
    sk = a[rng.choice(['skin', 'skin', 'skin_b'])]
    for dx in [-.13, .13]:
        _lb(bot, x, ysit, z, dx, .08, .25, .16, .14, .5, yaw)
        _lb(bot, x, ysit, z, dx, -.2, .5, .14, .5, .14, yaw)
    _lb(top, x, ysit, z, 0, .4, 0, .42, .62, .26, yaw)
    for dx in [-.28, .28]:
        _lb(top, x, ysit, z, dx, .38, .14, .1, .5, .12, yaw)
    cyl(sk, x, z, .13, ysit + .72, ysit + .99, 8)
    cyl(a[rng.choice(['dark', 'wood', 'slate'])], x, z, .14, ysit + .91, ysit + 1.07, 8, r_top=.08)


class Rect:
    """Rectangular floor region for furnish(): centre, width (along ang), depth, rotation."""
    def __init__(self, ctx, cx, cz, w, d, ang=0):
        self.rng, self.cx, self.cz, self.w, self.d, self.ang = ctx.rng, cx, cz, w, d, ang
        self.t, self.n, self.area = (math.cos(ang), math.sin(ang)), (-math.sin(ang), math.cos(ang)), w * d

    def at(self, u, v):
        return self.cx + u * self.t[0] + v * self.n[0], self.cz + u * self.t[1] + v * self.n[1]

    def inside(self):
        rng = self.rng
        x, z = self.at(rng.uniform(-self.w / 2 + 1.4, self.w / 2 - 1.4), rng.uniform(-self.d / 2 + 1.4, self.d / 2 - 1.4))
        return x, z, -self.ang + rng.choice([0, math.pi / 2, math.pi, 3 * math.pi / 2]) + rng.uniform(-.3, .3)

    def edge(self):
        rng = self.rng
        side = rng.randrange(4)
        sg = 1 if side % 2 else -1
        if side < 2:
            u, v, nu, nv = rng.uniform(-self.w / 2 + 1.4, self.w / 2 - 1.4), sg * (self.d / 2 - .9), 0, -sg
        else:
            u, v, nu, nv = sg * (self.w / 2 - .9), rng.uniform(-self.d / 2 + 1.4, self.d / 2 - 1.4), -sg, 0
        x, z = self.at(u, v)
        dx, dz = nu * self.t[0] + nv * self.n[0], nu * self.t[1] + nv * self.n[1]
        return x, z, math.atan2(dx, dz)


class Ring:
    """Annular floor region for furnish(): centre, inner and outer radius."""
    def __init__(self, ctx, cx, cz, r0, r1):
        self.rng, self.cx, self.cz, self.r0, self.r1, self.area = ctx.rng, cx, cz, r0, r1, math.pi * (r1 * r1 - r0 * r0)

    def inside(self):
        rng = self.rng
        a_, r_ = rng.uniform(0, 2 * math.pi), rng.uniform(self.r0 + .9, self.r1 - 1.0)
        return self.cx + r_ * math.cos(a_), self.cz + r_ * math.sin(a_), rng.uniform(0, 2 * math.pi)

    def edge(self):
        a_ = self.rng.uniform(0, 2 * math.pi)
        r_ = self.r1 - .9
        return self.cx + r_ * math.cos(a_), self.cz + r_ * math.sin(a_), math.atan2(-math.cos(a_), -math.sin(a_))


# furnish() vignettes: name, clearance radius (m), placed against a wall, weight.
FURNISH_CATALOG = [('workstation', 1.5, False, 4), ('cafe', 1.3, False, 3), ('sofa', 1.3, False, 2), ('meeting', 1.7, False, 1),
                   ('bookshelf', .7, True, 3), ('counter', 1.2, True, 1), ('whiteboard', .9, True, 1), ('cabinet', 1.0, True, 1),
                   ('art', .7, True, 1), ('planter', .6, True, 1), ('plant', .35, False, 2), ('lamp', .3, False, 2), ('bench', .9, False, 1)]
_SINGLE = {'bookshelf': 'bookshelf', 'counter': 'kitchen_counter', 'whiteboard': 'whiteboard', 'cabinet': 'upper_cabinet',
           'art': 'art_panel', 'planter': 'planter_1m', 'plant': 'potted_plant', 'lamp': 'floor_lamp', 'bench': 'bench'}


def furnish(ctx, reg, y, hh, items, people):
    """Scatter kit furniture vignettes and residents over a floor (top at y, ceiling hh above): no overlaps."""
    rng = ctx.rng
    placed = []

    def free(x, z, r_):
        return all(math.hypot(x - px, z - pz) > r_ + pr for px, pz, pr in placed)

    def spot(r_, edge):
        for _ in range(16):
            x, z, yaw = reg.edge() if edge else reg.inside()
            if free(x, z, r_):
                placed.append((x, z, r_))
                return x, z, yaw
    for _ in range(items):
        name, r_, edge, _w = rng.choices(FURNISH_CATALOG, [c[3] for c in FURNISH_CATALOG])[0]
        sp = spot(r_, edge)
        if not sp:
            continue
        x, z, yaw = sp
        fab = rng.choice(['fabric', 'cloth_a', 'cloth_b', 'cloth_c'])
        if name == 'workstation':
            kit_prop(ctx, 'desk_monitor', x, y, z, yaw)
            ox, oz = rot(0, .95, yaw)
            kit_prop(ctx, 'chair_office', x + ox, y, z + oz, yaw + math.pi)
            if rng.random() < .8:
                seated_person(ctx, x + ox, y + .5, z + oz, yaw + math.pi)
        elif name == 'cafe':
            kit_prop(ctx, 'cafe_set', x, y, z, yaw)
            if hh > 3:
                kit_prop(ctx, 'pendant_lamp', x, y + hh - 1.5, z, 0)
            for sg in (-1, 1):
                if rng.random() < .6:
                    ox, oz = rot(sg * .8, 0, yaw)
                    seated_person(ctx, x + ox, y + .45, z + oz, yaw + (math.pi / 2 if sg < 0 else -math.pi / 2))
        elif name == 'sofa':
            kit_prop(ctx, 'sofa', x, y, z, yaw, fab)
            if rng.random() < .6:
                ox, oz = rot(rng.uniform(-.5, .5), .1, yaw)
                seated_person(ctx, x + ox, y + .42, z + oz, yaw)
        elif name == 'meeting':
            kit_prop(ctx, 'meeting_table', x, y, z, yaw)
            if hh > 3:
                kit_prop(ctx, 'pendant_lamp', x, y + hh - 1.5, z, 0)
            for sg, dx_ in rng.sample([(1, -.7), (1, 0), (1, .7), (-1, -.7), (-1, 0), (-1, .7)], 3):
                ox, oz = rot(dx_, sg * .78, yaw)
                seated_person(ctx, x + ox, y + .48, z + oz, yaw + (math.pi if sg > 0 else 0))
        else:
            kit_prop(ctx, _SINGLE[name], x, y, z, yaw)
    for _ in range(people):
        sp = spot(.45, False)
        if sp:
            person(ctx, sp[0], y, sp[1], 1.0)


def glass_room(ctx, x, z, y, width, depth, height, planters=True, edge=True):
    """Box room glazed on four sides: slim white mullions, warm ceiling glow, light wood floor, furnished at random
    (about one vignette per 16 m², 3–12). planters: a planted trough inside each glass wall (sides ≥ 5 m);
    edge: an amber line under the slab edge. Rooms taller than 8 m cap furniture at 6; split tall volumes into
    ~5 m floors so people read at scale."""
    box(ctx, 'white', x, y + .2, z, width + 1, .25, depth + 1)
    box(ctx, 'floor', x, y + .35, z, width - .7, .06, depth - .7)
    box(ctx, 'room', x, y + height - .16, z, width - 1, .12, depth - 1)
    box(ctx, 'glow', x, y + height - .25, z, width - 2.4, .06, depth - 2.4)
    for side in [-1, 1]:
        for dx in [-.34, 0, .34]:
            box(ctx, 'white', x + dx * width, y + height / 2, z + side * (depth / 2 + .06), .12, height, .1)
        box(ctx, 'glass', x, y + height / 2, z + side * (depth / 2 + .3), width, height, .08)
        for dz in [-.3, 0, .3]:
            box(ctx, 'white', x + side * (width / 2 + .06), y + height / 2, z + dz * depth, .1, height, .12)
        box(ctx, 'glass', x + side * (width / 2 + .3), y + height / 2, z, .08, height, depth)
        if edge:
            box(ctx, 'amber', x, y + .05, z + side * (depth / 2 + .5), width + 1, .1, .06)
            box(ctx, 'amber', x + side * (width / 2 + .5), y + .05, z, .06, .1, depth + 1)
        if planters:
            for along, across, length in [(False, depth, width), (True, width, depth)]:
                if length < 5:
                    continue
                run, off = length * .6, side * (across / 2 - .25)
                px, pz = (x + off, z) if along else (x, z + off)
                sx, sz = (.45, run) if along else (run, .45)
                box(ctx, 'white', px, y + .6, pz, sx, .5, sz)
                box(ctx, 'green', px, y + .9, pz, sx - .06, .12, sz - .06)
                for t in [-.3, .3]:
                    bx, bz = (px, pz + t * run) if along else (px + t * run, pz)
                    blob(ctx.a['green'], (bx, y + 1.15, bz), (.55, .35, .55), sub=1, seed=bx + bz)
    n = min(12, max(3, round(width * depth / 16)))
    if height > 8:
        n = min(n, 6)
    furnish(ctx, Rect(ctx, x, z, width - (1.2 if planters else 0), depth - (1.2 if planters else 0)), y + .38, height, n, n // 2 + 2)


def glass_lift(ctx, x, z, y0, y1, ycap, wd=2.2, sz=2.0):
    """Transparent lift shaft (y0..y1) with white frame, amber front edges, landings every 12 m, and a glass
    capsule at ycap with an amber frame, lit back panel (+z) and one or two riders facing -z. Amber edges face -z."""
    yc, hh = (y0 + y1) / 2, y1 - y0
    for dz in [-1, 1]:
        box(ctx, 'glass', x, yc, z + dz * sz / 2, wd, hh, .08)
    for dx in [-1, 1]:
        box(ctx, 'glass', x + dx * wd / 2, yc, z, .08, hh, sz)
    for dx in [-1, 1]:
        for dz in [-1, 1]:
            box(ctx, 'white', x + dx * wd / 2, yc, z + dz * sz / 2, .16, hh, .16)
    for dx in [-1, 1]:
        box(ctx, 'amber', x + dx * wd / 2, yc, z - sz / 2 - .08, .1, hh, .06)
    for yy in range(int(y0) + 8, int(y1), 12):
        box(ctx, 'white', x, yy, z, wd + .2, .22, sz + .2)
    cw, cz, ch = wd - .5, sz - .5, 3.6
    box(ctx, 'glass', x, ycap + ch / 2, z, cw, ch, cz)
    box(ctx, 'amber', x, ycap + .08, z, cw + .14, .16, cz + .14)  # amber cabin frame: rims and corner posts
    box(ctx, 'amber', x, ycap + ch, z, cw + .14, .14, cz + .14)
    for dx in [-1, 1]:
        for dz in [-1, 1]:
            box(ctx, 'amber', x + dx * (cw / 2 + .03), ycap + ch / 2, z + dz * (cz / 2 + .03), .08, ch, .08)
    box(ctx, 'glow', x, ycap + ch - .12, z, cw - .3, .06, cz - .3)
    box(ctx, 'glow', x, ycap + ch / 2, z + cz / 2 - .05, cw - .3, ch - .6, .04)  # lit back panel behind the riders
    box(ctx, 'floor', x, ycap + .19, z, cw - .1, .06, cz - .1)
    for dx in ([-.35, .35] if cw > 1.4 else [0]):
        person(ctx, x + dx, ycap + .2, z - .1, .9, yaw=0)


def ring_doorways(ctx, radius, y0, y1, cx=0, cz=0):
    """Cylindrical glass wall (y0..y1) around (cx, cz) with two 2.5 m doorways on ±x: amber door frame,
    white canopy, threshold step and a resident at each door."""
    seg = 96
    step = 2 * math.pi / seg
    for k in range(seg):
        a, b = k * step, (k + 1) * step
        mid = (a + b) / 2
        if abs(math.sin(mid)) < 1.25 / radius and abs(math.cos(mid)) > .9:
            continue

        def p(angle, y):
            return (cx + radius * math.cos(angle), y, cz + radius * math.sin(angle))
        ctx.a['glass'].surface([p(a, y0), p(b, y0), p(b, y1), p(a, y1)], [(0, 1, 2, 3)], lambda c: (c[0] - cx, 0, c[2] - cz))
    for side in [-1, 1]:
        for z in [-1.25, 1.25]:
            box(ctx, 'white', cx + side * radius, (y0 + y1) / 2, cz + z, .22, y1 - y0, .22)
            box(ctx, 'amber', cx + side * (radius + .13), y0 + 1.27, cz + z * .94, .06, 2.5, .1)
        box(ctx, 'amber', cx + side * (radius + .1), y0 + 2.55, cz, .16, .2, 2.7)
        box(ctx, 'white', cx + side * (radius + .55), y0 + 2.8, cz, 1.1, .12, 3.1)
        box(ctx, 'white', cx + side * (radius - .7), y0 + .09, cz, 1.2, .16, 2.8)
        person(ctx, cx + side * (radius - .4), y0 + .16, cz + .45, 1)


def _wedge(acc, x, y, w, z0, z1, h):
    """Gusset prism: w wide along x at x; its lower face runs y..y, from z0 (height h) down to z1 (height 0)."""
    pts = [(xx, yy, zz) for xx in (x - w / 2, x + w / 2) for yy, zz in ((y, z0), (y, z1), (y + h, z0))]
    acc.solid(pts, [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 5, 3)])


def _rsec(y0, y1, bt, bb, segs=2):
    """Vertical profile for sweep(): (inset, y) points, top edge rounded by bt and bottom edge by bb (0 = sharp)."""
    s = [math.radians(90 * j / segs) for j in range(segs + 1)]
    top = [(bt - bt * math.sin(a), y1 - bt + bt * math.cos(a)) for a in s] if bt > 0 else [(0, y1)]
    bot = [(bb * (1 - math.cos(a)), y0 + bb - bb * math.sin(a)) for a in s] if bb > 0 else [(0, y0)]
    return top + bot


def rbox(acc, cx, y0, cz, w, d, h, rp, bt=0.0, bb=0.0, n=3, segs=2, grow=0.0):
    """Rounded block: plan corner radius rp, top/bottom edge radii bt/bb, n arc segments per corner; grow = offset outwards."""
    sweep(acc, lambda k: rrect_pts(cx, cz, w / 2, d / 2, [rp] * 4, n, k - grow), _rsec(y0, y0 + h, bt, bb, segs))


def rpanel(acc, face, cx, cy, cz, w, h, r, t, n=3):
    """Thin rounded-rectangle plate. face 'z-' (front), 'z+', 'x-' or 'x+': the way it looks; (cx, cy, cz) = centre of
    its inner face, t = thickness outwards. r <= min(w, h) / 2."""
    pts = rrect_pts(0, 0, w / 2, h / 2, [r] * 4, n)
    sg = -1 if face.endswith('-') else 1
    m = len(pts)

    def P(u, v, o):
        return (cx + u, cy + v, cz + sg * o) if face[0] == 'z' else (cx + sg * o, cy + v, cz + u)
    verts = [P(u, v, 0) for u, v in pts] + [P(u, v, t) for u, v in pts]
    acc.solid(verts, [(i, (i + 1) % m, m + (i + 1) % m, m + i) for i in range(m)] + [tuple(range(m)), tuple(range(m, 2 * m))])


def _fbox(ctx, role, face, cx, cy, cz, u, v, o, du, dv, dt):
    """Box on a module face: plane coords u (along the face) / v (up) / o (outwards), size du x dv x dt (thickness dt)."""
    sg = -1 if face.endswith('-') else 1
    if face[0] == 'z':
        obox(ctx.a[role], (cx + u, cy + v, cz + sg * o), (du, dv, dt))
    else:
        obox(ctx.a[role], (cx + sg * o, cy + v, cz + u), (dt, dv, du))


def _silhouettes(ctx, face, x, y, z, w, h, seed):
    """Flat dark cut-outs on a lit pane (people, a table with chairs, a plant): what you see through a window, not furniture models."""
    rnd = random.Random(seed)
    o, b = .115, -h / 2 + .02
    u = -w / 2 + .6
    while u < w / 2 - .4:
        kind = rnd.choice(('person', 'table', 'plant', 'person'))
        if kind == 'person' and h > .9:
            ph = min(h * .78, 1.25)
            _fbox(ctx, 'joint', face, x, y, z, u, b + ph * .36, o, .34, ph * .72, .03)
            _fbox(ctx, 'joint', face, x, y, z, u, b + ph * .86, o, .2, ph * .26, .03)
            u += 1.5
        elif kind == 'table':
            _fbox(ctx, 'joint', face, x, y, z, u, b + .52, o, .95, .05, .03)
            _fbox(ctx, 'joint', face, x, y, z, u, b + .26, o, .07, .5, .03)
            for c in (-.6, .6):
                _fbox(ctx, 'joint', face, x, y, z, u + c, b + .3, o, .3, .6, .03)
            u += 2.4
        else:
            _fbox(ctx, 'joint', face, x, y, z, u, b + .16, o, .3, .3, .03)
            _fbox(ctx, 'joint', face, x, y, z, u, b + .55, o, .45, .55, .03)
            u += 1.4


def _window(ctx, face, x, y, z, w, h, role, mull=0, r=None, seed=0, sil=True, awning=None):
    """Real-glass window on a module face: thin dark frame, warm pane with dark interior cut-outs, thin mullions, sill and an
    optional awning slab above ('slate' / 'teal' / 'oak'). (x, y, z) = on the wall; r = corner radius."""
    r = min(h / 2 - .02, .22) if r is None else min(r, h / 2 - .02, w / 2 - .02)
    rpanel(ctx.a['slate'], face, x, y, z, w + .14, h + .14, r + .07, .05)
    rpanel(ctx.a[role], face, x, y, z, w, h, r, .09)
    if sil:
        _silhouettes(ctx, face, x, y, z, w, h, seed)
    for i in range(1, mull + 1):
        _fbox(ctx, 'slate', face, x, y, z, -w / 2 + i * w / (mull + 1), 0, .12, .05, h, .06)
    _fbox(ctx, 'grey', face, x, y, z, 0, -h / 2 - .1, .1, w + .3, .06, .2)
    if awning:
        _fbox(ctx, awning, face, x, y, z, 0, h / 2 + .32, .32, w + .5, .09, .62)
        _fbox(ctx, 'slate', face, x, y, z, 0, h / 2 + .24, .1, w + .3, .1, .14)


def _door(ctx, face, x, y, z, u, role, awning='slate'):
    """Small entrance on a module face (sill at y): oak or slate door leaf with a lit light, canopy, and two steps down."""
    o = .08
    _fbox(ctx, 'joint', face, x, y, z, u, 1.05, o, 1.25, 2.1, .06)
    _fbox(ctx, role, face, x, y, z, u, 1.05, o + .06, 1.05, 2.0, .05)
    _fbox(ctx, 'pane_w', face, x, y, z, u, 1.3, o + .09, .55, 1.15, .03)
    _fbox(ctx, awning, face, x, y, z, u, 2.3, .4, 1.9, .09, .85)
    for sg in (-1, 1):
        _fbox(ctx, 'slate', face, x, y, z, u + sg * .85, 2.15, .12, .08, .3, .08)
    _fbox(ctx, 'grey', face, x, y, z, u, -.07, .9, 1.7, .22, .95)       # lower step
    _fbox(ctx, 'grey', face, x, y, z, u, .02, .45, 1.55, .08, .6)        # upper step


def _grooves(ctx, face, x, y0, y1, z, u0, u1, step):
    """Thin vertical panel seams on a wall."""
    u = u0
    while u <= u1 + 1e-6:
        _fbox(ctx, 'slate', face, x, (y0 + y1) / 2, z, u, 0, .0, .035, y1 - y0, .03)
        u += step


# variant -> (body, skirt, roof cap, accent panel, pane light role); pane roles: pane_w warm white, pane_a pale amber, pane_c cool white.
EVENT_LOOKS = {'A': ('white', 'teal', 'grey', 'teal', 'pane_w'), 'B': ('teal', 'white', 'white', 'white', 'pane_a'), 'C': ('grey', 'oak', 'white', 'oak', 'pane_c'),
               'D': ('oak', 'slate', 'white', 'teal', 'pane_a'), 'E': ('grey', 'teal', 'teal', 'white', 'pane_w'), 'F': ('white', 'oak', 'oak', 'teal', 'pane_c'),
               'H': ('white', 'oak', 'grey', 'teal', 'pane_w')}


def event_module(ctx, x, y, z, variant='A', w=8.6, d=8.6, h=3.2):
    """Self-contained event module, a small building that rides the shelf (spec: artifacts/sw-event-shelf/spec.md R3).
    Centred on (x, z), underside of the drive shoes at y, front -z, 8.6 x 8.6 x 3.2 m (hall H: h = 7.4), rounded capsule shell
    (plan radius 1.1 m, 0.55 m edges). Programme per variant: A event hall, B cafe (striped awning), C exhibit (tall display
    windows), D workshop (roller door, clerestory, roof garden), E lounge (porthole accent, solar roof), F study room, H double-height
    hall. Each has an entrance with canopy and two steps, thin-framed warm-glass windows with flat interior cut-outs, an accent panel,
    panel seams and roof plant, four drive shoes on two slide rails (x = +-3.6, 11.2 m long, carried under the module), four corner
    couplings and four roof lifting rings. Roles: white, teal, grey, oak, slate, dark, rail, cyan, green, joint, pane_w, pane_a, pane_c."""
    body, skirt, cap, acc, light = EVENT_LOOKS[variant]
    A = ctx.a
    hw, hd, ys, hs = w / 2, d / 2, y + .3, h - .3
    RP = 1.1
    for sx in (-1, 1):                                              # drive shoes: bogie plate + roller cap
        for sz in (-1, 1):
            obox(A['slate'], (x + sx * 3.6, y + .12, z + sz * 3.3), (1.0, .24, 1.9))
            obox(A['rail'], (x + sx * 3.6, y + .27, z + sz * 3.3), (.42, .08, 1.7))
    for sx in (-1, 1):                                               # slide rails travel with the module (cell depth 12 m minus the beams), so empty cells stay open
        obox(A['joint'], (x + sx * 3.6, y + .15, z), (.5, .3, 11.2))
    rbox(A[body], x, ys, z, w, d, hs, RP, bt=.55, bb=.55)                     # shell
    rbox(A[skirt], x, ys, z, w, d, 1.15 if variant == 'F' else .7, RP, bb=.55, grow=.03)
    rbox(A[cap], x, y + h - .62, z, w, d, .62, RP, bt=.55, grow=.03)           # roof cap
    wy = ys + 1.5
    fz, bz = z - hd, z + hd                                          # front / back wall planes
    side = lambda sx_: x + sx_ * hw                                  # noqa: E731
    S = lambda face: 'x-' if face < 0 else 'x+'                      # noqa: E731
    sd = ord(variant)
    if variant == 'A':                                               # event hall: wide band, door right, teal accent left
        _window(ctx, 'z-', x - .6, wy, fz, 3.4, 1.25, light, 2, seed=sd, awning='teal')
        _door(ctx, 'z-', x, ys, fz, 2.2, 'oak')
        for s in (-1, 1):
            _window(ctx, S(s), side(s), wy, z, 3.0, 1.2, light, 1, seed=sd + s)
        rpanel(A['teal'], 'z-', x - 3.0, wy, fz, .45, 2.3, .22, .05)
    elif variant == 'B':                                             # cafe: window under a striped awning, door left, portholes on the sides
        _window(ctx, 'z-', x + .9, wy, fz, 3.0, 1.3, light, 2, seed=sd, awning='white')
        for i in range(-2, 3):
            if i % 2 == 0:
                _fbox(ctx, 'teal', 'z-', x, wy, fz, .9 + i * .6, 1.64, .33, .6, .1, .63)
        _door(ctx, 'z-', x, ys, fz, -2.1, 'slate', awning='white')
        for s in (-1, 1):
            for dz in (-1.5, 1.5):
                _window(ctx, S(s), side(s), wy, z + dz, 1.2, 1.2, light, 0, r=.6, seed=sd + s + int(dz * 4))
    elif variant == 'C':                                             # exhibit: two tall display windows, door right, oak accent
        for u in (-2.0, 0):
            _window(ctx, 'z-', x + u, ys + 1.25, fz, 1.5, 1.9, light, 1, r=.3, seed=sd + int(u * 5), awning='oak')
        _door(ctx, 'z-', x, ys, fz, 2.2, 'slate', awning='oak')
        for s in (-1, 1):
            _window(ctx, S(s), side(s), ys + 1.25, z + 1.3, 1.4, 1.9, light, 0, r=.3, seed=sd + s)
            _window(ctx, S(s), side(s), ys + 1.25, z - 1.3, 1.4, 1.9, light, 0, r=.3, seed=sd + s + 7)
    elif variant == 'D':                                             # workshop: roller door, window, roof garden
        _fbox(ctx, 'slate', 'z-', x, ys, fz, -1.6, 1.05, .08, 2.6, 2.1, .06)
        for i in range(8):
            _fbox(ctx, 'grey', 'z-', x, ys, fz, -1.6, .2 + i * .25, .12, 2.4, .04, .04)
        _window(ctx, 'z-', x + 1.8, ys + 1.3, fz, 2.2, 1.3, light, 1, seed=sd, awning='slate')
        for s in (-1, 1):
            _window(ctx, S(s), side(s), ys + 1.35, z, 3.0, 1.1, light, 1, seed=sd + s)
    elif variant == 'E':                                             # lounge: door left, window with teal awning, portholes on the sides
        _door(ctx, 'z-', x, ys, fz, -1.8, 'oak', awning='teal')
        _window(ctx, 'z-', x + 1.3, wy, fz, 2.8, 1.3, light, 1, seed=sd, awning='teal')
        for s in (-1, 1):
            for dz in (-1.6, 1.6):
                _window(ctx, S(s), side(s), wy, z + dz, 1.1, 1.1, light, 0, r=.55, seed=sd + s + int(dz * 4))
    elif variant == 'F':                                             # study room: long band, oak door left, teal accent right
        _window(ctx, 'z-', x + .6, wy, fz, 3.6, 1.2, light, 3, seed=sd)
        _door(ctx, 'z-', x, ys, fz, -2.3, 'oak', awning='oak')
        for s in (-1, 1):
            _window(ctx, S(s), side(s), wy, z, 3.0, 1.2, light, 1, seed=sd + s)
        rpanel(A['teal'], 'z-', x + 3.05, wy, fz, .45, 2.3, .22, .05)
    else:  # H
        _window(ctx, 'z-', x - .9, y + 3.8, fz, 3.2, 4.4, light, 2, r=.5, seed=sd, sil=False)
        _door(ctx, 'z-', x, ys, fz, 2.2, 'oak')
        for u in (-3.1, 3.1):
            rpanel(A['teal'], 'z-', x + u, y + 3.9, fz, .5, 5.4, .25, .06)
        for s in (-1, 1):
            _window(ctx, S(s), side(s), y + 3.8, z, 3.0, 3.4, light, 1, r=.5, seed=sd + s, sil=False)
    for s_ in (-1, 1):                                               # panel seams on the side walls (the panes sit over them)
        _grooves(ctx, S(s_), side(s_), ys + .75, y + h - .7, z, -3.0, 3.0, 1.5)
    _window(ctx, 'z+', x, wy, bz, 2.4, 1.0, light, 0, seed=sd + 11)  # back wall, one small window
    top = y + h
    for sx in (-1, 1):                                               # roof: lifting rings with lugs
        for sz in (-1, 1):
            cyl(A['rail'], x + sx * 3.3, z + sz * 3.3, .5, top - .02, top + .16, 10)
            cyl(A['dark'], x + sx * 3.3, z + sz * 3.3, .25, top + .1, top + .26, 8)
            obox(A['rail'], (x + sx * 3.3 + sx * .5, top + .1, z + sz * 3.3), (.6, .22, .5))
    for sx in (-1, 1):                                               # four corner couplings on the rounded corners (cyan lock light on the front pair)
        for sz in (-1, 1):
            ex, ez = sx * (hw - RP + RP * .7071 + .12), sz * (hd - RP + RP * .7071 + .12)
            for yy in (ys + .55, y + h - .9):
                cyl(A['joint'], x + ex, z + ez, .4, yy - .3, yy + .3, 10)
            if sz < 0:
                cyl(A['cyan'], x + ex * 1.02, z + ez * 1.02, .2, y + h - .9 + .3, y + h - .9 + .38, 8)
    if variant == 'D':                                               # planted roof deck
        for dx in (-2.6, 0, 2.6):
            obox(A['white'], (x + dx, top + .2, z + .6), (2.0, .3, 1.8))
            obox(A['green'], (x + dx, top + .42, z + .6), (1.8, .15, 1.6))
            blob(A['green'], (x + dx, top + .6, z + .6), (.7, .4, .7), sub=1, seed=dx + 3)
    elif variant in ('A', 'F'):                                      # roof plant: AC unit with louvres and a vent stack
        obox(A['grey'], (x - 1.2, top + .32, z + 1.2), (1.8, .5, 1.2))
        obox(A['slate'], (x - 1.2, top + .6, z + 1.2), (1.5, .1, .9))
        cyl(A['rail'], x + 1.2, z + 1.4, .22, top, top + .7, 8)
    elif variant == 'E':                                             # solar panels on a tilt-free rack
        for dx in (-1.6, 1.0):
            obox(A['dark'], (x + dx, top + .32, z + .4), (2.2, .08, 2.6))
            obox(A['grey'], (x + dx, top + .18, z + .4), (.2, .3, 2.4))
    elif variant == 'B':                                             # kitchen extract + planter
        obox(A['grey'], (x + 1.6, top + .35, z + 1.0), (1.4, .55, 1.0))
        cyl(A['rail'], x - 1.2, z + 1.3, .3, top, top + .7, 8)
        obox(A['white'], (x - 1.0, top + .2, z - 1.0), (1.8, .3, .9))
        blob(A['green'], (x - 1.0, top + .62, z - 1.0), (.6, .4, .4), sub=1, seed=5)
    elif variant == 'C':                                             # skylight + AC
        obox(A['pane_w'], (x - 1.0, top + .12, z), (2.6, .08, 1.8))
        obox(A['grey'], (x + 1.8, top + .32, z + 1.3), (1.6, .5, 1.0))
    elif variant == 'H':
        obox(A['grey'], (x + 1.5, top + .32, z + 1.5), (2.4, .5, 1.6))
        cyl(A['rail'], x - 1.5, z + 1.5, .3, top, top + 1.2, 8)


def lattice_frame(ctx, cx=0, cz=0, y0=0, cols=3, rows=2, levels=10, cell=12.0, floor_h=4.0, col=1.3, ground_tracks=(-12.0, 12.0), gauge=7.2):
    """Heavy dark-grey structural frame, front -z (spec R2): (cols+1)(rows+1) 1.3 m square columns, 0.9 x 0.8 m beam ring at every
    level (beam top = module floor of that level), large chamfered joint blocks at every column/beam crossing, a light guide rail with rack teeth,
    dark base and cyan guide strips at every column line on the front and back faces (ground to roof), two runway beams
    (white, 1 m) cantilevered 7.5 m past each end on gusset braces with teal end stops, two ground tracks (gauge 7.2 m, +-3.6
    from x = -12 / +12) and a paving plinth. Default 36 x 24 x 40 m. Roles: frame, joint, rail, white, teal, dark, cyan, paving."""
    W, D, H = cols * cell, rows * cell, levels * floor_h
    xs = [cx - W / 2 + i * cell for i in range(cols + 1)]
    zs = [cz - D / 2 + j * cell for j in range(rows + 1)]
    A = ctx.a
    obox(A['paving'], (cx, y0 + .1, cz - 4), (W + 4, .2, D + 12))
    for xc in xs:
        for zc in zs:
            obox(A['frame'], (xc, y0 + .2 + (H - .2) / 2, zc), (col, H - .2, col))
            obox(A['joint'], (xc, y0 + .45, zc), (col + .5, .5, col + .5))
    for k in range(1, levels + 1):                                  # R3: one floor-edge beam per face; no interior along-z beams
        yb = y0 + k * floor_h - .4
        for zc in zs:
            obox(A['frame'], (cx, yb, zc), (W + col, .8, .9))
        for xc in (xs[0], xs[-1]):
            obox(A['frame'], (xc, yb, cz), (.9, .8, D + col))
        if k % 2 == 0 or k == levels:                               # joint blocks only every other level, on the front/back columns
            for xc in xs:
                for zc in (zs[0], zs[-1]):
                    rbox(A['joint'], xc, yb - .65, zc, 2.0, 2.0, 1.3, .45, n=1, segs=1)
    zf = zs[0] - col / 2                                            # front column face; back is mirrored
    for sg, face in ((-1, zf), (1, zs[-1] + col / 2)):
        for xc in xs:
            top = y0 + H + .6
            obox(A['dark'], (xc, y0 + .2 + (H - .2) / 2, face + sg * .125), (.9, H - .2, .25))
            obox(A['rail'], (xc, y0 + .2 + (top - y0 - .2) / 2, face + sg * .4), (.5, top - y0 - .2, .3))
            for yy in range(4, int(H), 4):
                obox(A['dark'], (xc, y0 + yy, face + sg * .58), (.5, .24, .1))      # rack teeth
                obox(A['cyan'], (xc, y0 + yy + 2.0, face + sg * .57), (.07, 1.6, .06))  # guide strip segments
    ext, ext_b = 7.5, 2.0                                           # runway beams: 7.5 m cantilever on the front (the hoist side), only 2 m at the back
    for xc in (xs[0], xs[-1]):
        z0, z1 = cz - D / 2 - ext - .45, cz + D / 2 + ext_b + .45
        obox(A['white'], (xc, y0 + H + .5, (z0 + z1) / 2), (1.0, 1.0, z1 - z0))
        for sg, e in ((-1, ext), (1, ext_b)):
            _wedge(A['frame'], xc, y0 + H - 3.2, .8, cz + sg * (D / 2 + .65), cz + sg * (D / 2 + e - .6), 3.2)
            obox(A['teal'], (xc, y0 + H + .55, cz + sg * (D / 2 + e + .1)), (1.5, 1.2, 1.0))
            obox(A['cyan'], (xc, y0 + H + 1.25, cz + sg * (D / 2 + e + .1)), (.5, .2, .5))
    for gx in ground_tracks:                                        # ground tracks from the plinth edge through the ground tier
        z0, z1 = cz - D / 2 - 10, cz
        for dx in (-gauge / 2, gauge / 2):
            obox(A['rail'], (cx + gx + dx, y0 + .41, (z0 + z1) / 2), (.3, .18, z1 - z0))
        n = int((z1 - z0) / 1.6)
        for i in range(n + 1):
            obox(A['dark'], (cx + gx, y0 + .26, z0 + i * (z1 - z0) / n), (gauge + .9, .12, .34))


# Registry checked against LIBRARY.md by tests/assetLibrary.test.ts — add a row there for every new key.
MODULES = {
    'kit_prop': kit_prop, 'person': person, 'seated_person': seated_person, 'furnish': furnish,
    'glass_room': glass_room, 'glass_lift': glass_lift, 'ring_doorways': ring_doorways,
    'event_module': event_module, 'lattice_frame': lattice_frame,
}
