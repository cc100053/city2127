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
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import blob, cyl, obox, rot  # noqa: E402
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


# Registry checked against LIBRARY.md by tests/assetLibrary.test.ts — add a row there for every new key.
MODULES = {
    'kit_prop': kit_prop, 'person': person, 'seated_person': seated_person, 'furnish': furnish,
    'glass_room': glass_room, 'glass_lift': glass_lift, 'ring_doorways': ring_doorways,
}
