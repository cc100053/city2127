"""car-family-2127: the street pod and the human-driven car (targets: artifacts/car-closeup-polish/target).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_car.py
Writes car-family-2127.blend and .glb next to this file (glTF preset, no Meshopt/Draco).

Real metres, ground contact at y = 0, front = +Z three.js (-Y Blender). Root ROOT_CAR_FAMILY_2127 holds the empties
car_pod and car_human; the runtime merges each one's meshes by material name, its roles:
car_body and car_interior (colour attribute), car_glass, car_seam, car_head, car_tail, car_pool (pod only).

The shell is one loft (t tail 0 .. nose 1, row k bottom centre .. top centre, mirrored), every vertex on the analytic
surface `at(t, s)` with analytic normals. Rows follow designed height curves, so the seam, the windows and the belly
line are mesh rows rather than stair-stepped faces. Coordinates here are three.js (x, y up, z); geo_helpers.B maps them.
"""
import math
import os
import sys

import bmesh
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import B, material, newell  # noqa: E402

L, Z0 = 4.6, -2.3


def lerp_table(table, t):
    """Smooth (Catmull-Rom, monotone-clamped enough for profiles) interpolation of [(t, v), ...]."""
    if t <= table[0][0]:
        return table[0][1]
    if t >= table[-1][0]:
        return table[-1][1]
    for i in range(len(table) - 1):
        t0, v0 = table[i]
        t1, v1 = table[i + 1]
        if t <= t1:
            u = (t - t0) / (t1 - t0)
            tp, vp = table[max(i - 1, 0)]
            tn, vn = table[min(i + 2, len(table) - 1)]
            m0 = (v1 - vp) / max(t1 - tp, 1e-6) * (t1 - t0)
            m1 = (vn - v0) / max(tn - t0, 1e-6) * (t1 - t0)
            lo, hi = min(v0, v1), max(v0, v1)
            if (i == 0 or (v0 - vp) * (v1 - v0) <= 0):
                m0 = 0
            if (i == len(table) - 2 or (vn - v1) * (v1 - v0) <= 0):
                m1 = 0
            h = (2 * u ** 3 - 3 * u ** 2 + 1) * v0 + (u ** 3 - 2 * u ** 2 + u) * m0 + (-2 * u ** 3 + 3 * u ** 2) * v1 + (u ** 3 - u ** 2) * m1
            return min(max(h, lo), hi)


# Silhouette: an egg, tallest 40 % back from the tail, a round tail for the disc, the nose low and tapered.
TOP = [(0, 1.30), (.03, 1.42), (.09, 1.56), (.18, 1.67), (.3, 1.75), (.42, 1.78), (.56, 1.70), (.68, 1.50), (.8, 1.22), (.9, .98), (.97, .80), (1, .68)]
BOT = [(0, .34), (.03, .30), (.09, .27), (.5, .26), (.85, .29), (.95, .36), (1, .46)]
WID = [(0, .48), (.03, .66), (.09, .80), (.18, .89), (.35, .925), (.6, .92), (.8, .84), (.92, .66), (.98, .42), (1, .22)]
SQR = [(0, 2), (.1, 2.3), (.5, 2.6), (.9, 2.3), (1, 2)]

# Row heights (absolute y).
BELLY = [(0, .52), (.12, .50), (.5, .42), (.85, .47), (1, .52)]
SEAM = [(0, 1.16), (.05, 1.36), (.1, 1.4), (.14, 1.24), (.2, .92), (.26, .70), (.33, .55), (.42, .47), (.5, .47), (.56, .56), (.62, .76), (.68, .82), (.8, .80), (.92, .74), (1, .62)]
FOOT_LOW = [(.33, .97), (.36, .78), (.41, .63), (.5, .61), (.56, .68), (.6, .86)]
FOOT_TOP = [(.33, .98), (.45, .93), (.6, .87)]
SILL = [(0, 1.22), (.1, 1.46), (.28, 1.5), (.31, 1.2), (.35, 1.08), (.5, 1.02), (.7, .98), (.82, .94), (.9, .96)]
SEAM_T, SEAM_W = .105, .05
FOOT_T = (.33, .6)
WIN_T = (.285, .885)
ROOF_ROWS = 6  # rows from the sill to the top centre

NORM = 1.0


def sec(t):
    top, bot = lerp_table(TOP, t), lerp_table(BOT, t)
    return (top + bot) / 2, (top - bot) / 2, lerp_table(WID, t), lerp_table(SQR, t)


def at(t, s):
    """Surface point (x > 0 side), s = -1 bottom centre .. 1 top centre."""
    yc, h, w, n = sec(t)
    a = s * math.pi / 2
    sa, ca = math.sin(a), max(math.cos(a), 0)
    x = w * ca ** (2 / n)
    y = yc + h * math.copysign(abs(sa) ** (2 / n), sa)
    return x, y, Z0 + t * L


def s_of_y(t, y):
    yc, h, _, n = sec(t)
    v = max(min((y - yc) / h, .999), -.999)
    return math.asin(math.copysign(abs(v) ** (n / 2), v)) * 2 / math.pi


def normal(t, s):
    e = 1e-3
    a, b = at(min(t + e, 1), s), at(max(t - e, 0), s)
    c, d = at(t, min(s + e, 1)), at(t, max(s - e, -1))
    u = [a[i] - b[i] for i in range(3)]
    v = [c[i] - d[i] for i in range(3)]
    n = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
    r = math.sqrt(sum(q * q for q in n)) or 1
    n = [q / r for q in n]
    p = at(t, s)
    yc = sec(t)[0]
    if n[0] * p[0] + n[1] * (p[1] - yc) < 0:
        n = [-q for q in n]
    return n


def rows_at(t):
    """Row positions s at station t, strictly increasing, -1 .. 1."""
    ys = {}
    ys["belly"] = lerp_table(BELLY, t)
    slope = abs(lerp_table(SEAM, min(t + .005, 1)) - lerp_table(SEAM, t - .005)) / (.01 * L)
    ys["seam0"] = lerp_table(SEAM, t)
    taper = min(max((t - SEAM_T) / .03, .08), 1)  # the seam grows out of the shoulder
    ys["seam1"] = ys["seam0"] + SEAM_W * taper * math.sqrt(1 + slope * slope)
    ys["foot0"] = max(lerp_table(FOOT_LOW, t) if FOOT_T[0] <= t <= FOOT_T[1] else 0, ys["seam1"] + .02)
    ys["foot1"] = max(lerp_table(FOOT_TOP, t) if FOOT_T[0] <= t <= FOOT_T[1] else 0, ys["foot0"] + .012)
    ys["sill"] = max(lerp_table(SILL, t), ys["foot1"] + .05)
    s = [-1, s_of_y(t, (lerp_table(BOT, t) + ys["belly"]) / 2)]
    s.append(s_of_y(t, ys["belly"]))
    s.append(s_of_y(t, ys["belly"] + .012))
    # Two free rows, so the tall flank behind the seam's rise is not one flat chord.
    s += [s[-1] + (s_of_y(t, ys["seam0"]) - s[-1]) * j / 3 for j in (1, 2)]
    for key in ("seam0", "seam1", "foot0", "foot1", "sill"):
        s.append(s_of_y(t, ys[key]))
    top = s[-1]
    s += [top + (1 - top) * (1 - math.cos(j / ROOF_ROWS * math.pi / 2)) ** .9 for j in range(1, ROOF_ROWS + 1)]
    s[-1] = 1
    for k in range(1, len(s)):
        s[k] = max(s[k], s[k - 1] + 1e-4)
    # The tail ring is a true circle: even rows there, whatever the flank rows do.
    return [-1 + 2 * k / (ROWS - 1) for k in range(ROWS)] if t <= .007 else s


R_BELLY, R_S0, R_S1, R_F0, R_F1, R_W = 2, 6, 7, 8, 9, 10
ROWS = 11 + ROOF_ROWS
STATIONS = [0, .007, .03, .06, .09, .105, .125, .15, .18, .21, .25, .285, .31, .33, .36, .41, .46, .51, .56, .6, .64, .68, .74, .8, .86, .885, .92, .955, .985, 1]


def grey(v):
    return (v, v, v, 1)


WHITE, BELLY_C = grey(.72), (.46, .5, .54, 1)  # the instance colour multiplies these; full white clips in the sun


class Mesh:
    """Vertices with colours and optional normals, faces with a material role."""

    def __init__(self):
        self.v, self.c, self.n, self.f, self.roles = [], [], [], [], []

    def vert(self, p, color=WHITE, normal=None):
        self.v.append(B(p))
        self.c.append(color)
        self.n.append(normal)
        return len(self.v) - 1

    def face(self, idx, role):
        self.f.append(tuple(idx))
        self.roles.append(role)


def arch_cut(p, wheels):
    """Project shell points in a wheel arch onto its circle; returns (point, inside)."""
    for zw, yw, r in wheels:
        dz, dy = p[2] - zw, p[1] - yw
        d = math.hypot(dz, dy)
        if d < r:
            return (p[0], yw + dy / max(d, 1e-4) * r, zw + dz / max(d, 1e-4) * r), True
    return p, False


def shell(mesh, human, wheels):
    grid = {}
    for i, t in enumerate(STATIONS):
        rows = rows_at(t)
        for k, s in enumerate(rows):
            for side in (1, -1):
                if side < 0 and k in (0, ROWS - 1):
                    grid[(i, k, side)] = grid[(i, k, 1)]
                    continue
                p = at(t, s)
                n = normal(t, s)
                p, cut = arch_cut(p, wheels)
                color = BELLY_C if k <= R_BELLY else WHITE
                grid[(i, k, side)] = (mesh.vert((p[0] * side, p[1], p[2]), color, (n[0] * side, n[1], n[2])), cut)

    def role(i, k):
        t = (STATIONS[i] + STATIONS[i + 1]) / 2
        if i == 0:
            return "car_tail"
        if k == R_S0 and t > SEAM_T:
            return "car_seam"
        if k == R_F0 and FOOT_T[0] < t < FOOT_T[1]:
            return "car_glass"
        if k >= R_W and WIN_T[0] < t < WIN_T[1]:
            # The human car keeps an opaque roof spine over the cabin; its windscreen stays clear.
            return "car_body" if human and t < .62 and k >= ROWS - 3 else "car_glass"
        return "car_body"

    for i in range(len(STATIONS) - 1):
        for k in range(ROWS - 1):
            for side in (1, -1):
                q = [grid[(i, k, side)], grid[(i, k + 1, side)], grid[(i + 1, k + 1, side)], grid[(i + 1, k, side)]]
                if all(c for _, c in q):
                    continue
                idx = [v for v, _ in q]
                if idx[0] == idx[3]:  # (never: stations differ) keep the guard for the mirrored centre rows
                    continue
                mesh.face(idx if side > 0 else idx[::-1], role(i, k))
    # Tail: a recessed round disc inside the lit ring.
    t0 = [grid[(0, k, 1)][0] for k in range(ROWS)] + [grid[(0, k, -1)][0] for k in range(ROWS - 2, 0, -1)]
    z, yc = Z0 + .05, sec(0)[0]
    inner = []
    for j in range(len(t0)):
        p = mesh.v[t0[j]]  # back in three.js coordinates: B(x, y, z) = (x, -z, y)
        k = .42 / max(math.hypot(p[0], p[2] - yc), 1e-4)
        inner.append(mesh.vert((p[0] * k, yc + (p[2] - yc) * k, z), WHITE, (0, 0, -1)))
    hub = mesh.vert((0, yc, z), WHITE, (0, 0, -1))
    for j in range(len(t0)):
        b = (j + 1) % len(t0)
        mesh.face((t0[j], t0[b], inner[b], inner[j]), "car_body")
        mesh.face((inner[j], inner[b], hub), "car_body")
    # Nose: close the last station.
    n0 = [grid[(len(STATIONS) - 1, k, 1)][0] for k in range(ROWS)] + [grid[(len(STATIONS) - 1, k, -1)][0] for k in range(ROWS - 2, 0, -1)]
    mesh.face(n0[::-1], "car_body")


def headband(mesh):
    """Warm headlight band hugging the nose."""
    ts, y0, y1 = [.93, .955, .975, .99], .56, .62
    verts = []
    for side in (1, -1):
        for t in ts if side > 0 else ts[::-1]:
            for y, off in ((y0, 0), (y1, 0)):
                p = at(t, s_of_y(t, y))
                n = normal(t, s_of_y(t, y))
                verts.append(mesh.vert((side * (p[0] + n[0] * .006), p[1] + n[1] * .006, p[2] + n[2] * .006), WHITE, (side * n[0], n[1], n[2])))
    m = len(verts) // 2
    for i in range(m - 1):
        a, b, c, d = verts[2 * i], verts[2 * i + 1], verts[2 * i + 3], verts[2 * i + 2]
        mesh.face((a, b, c, d) if i >= len(ts) else (d, c, b, a), "car_head")


def box(mesh, c, s, color, role="car_interior", yaw=0.0):
    x, y, z = c
    sx, sy, sz = (v / 2 for v in s)
    cs, sn = math.cos(yaw), math.sin(yaw)
    v = [mesh.vert((x + a * sx * cs + d * sz * sn, y + b * sy, z - a * sx * sn + d * sz * cs), color) for b in (-1, 1) for a, d in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        mesh.face([v[i] for i in f], role)


def ball(mesh, c, r, color, seg=8, rings=5, role="car_interior", squash=1.0, top_only=False):
    y0 = 0 if top_only else 1
    grid = []
    for j in range(rings + 1):
        a = -math.pi / 2 + math.pi * j / rings
        if top_only and a < -.05:
            a = max(a, -.05)
        grid.append([mesh.vert((c[0] + r * math.cos(a) * math.cos(2 * math.pi * i / seg), c[1] + r * squash * math.sin(a), c[2] + r * math.cos(a) * math.sin(2 * math.pi * i / seg)), color) for i in range(seg)])
    for j in range(rings):
        for i in range(seg):
            n = (i + 1) % seg
            mesh.face((grid[j][i], grid[j + 1][i], grid[j + 1][n], grid[j][n]), role)


def person(mesh, x, z, facing, coat, skin, hair, trousers):
    """Seated figure: hips at seat height, knees forward of the seat, feet on the floor. `facing` +1 toward the nose."""
    f = facing
    ball(mesh, (x, .88, z), .2, coat, squash=1.6)
    ball(mesh, (x, 1.3, z + .02 * f), .115, skin)
    ball(mesh, (x, 1.33, z - .01 * f), .122, hair, top_only=True)
    for dx in (-.1, .1):
        box(mesh, (x + dx, .62, z + .19 * f), (.14, .13, .42), trousers)
        box(mesh, (x + dx, .47, z + .38 * f), (.12, .32, .12), trousers)


def seat(mesh, x, z, facing, color):
    box(mesh, (x, .5, z), (.5, .16, .5), color)
    box(mesh, (x, .8, z - .24 * facing), (.42, .54, .1), color)


def interior(mesh, human):
    pale, dark = grey(.6), grey(.3)
    box(mesh, (0, .42, .1), (1.1, .03, 2.8), grey(.5))
    if human:
        spots = [(.38, -.35, 1, True), (-.38, -.35, 1, False), (.38, .55, 1, False), (-.38, .55, 1, True)]
        box(mesh, (0, .86, 1.15), (1.36, .1, .34), pale)
        box(mesh, (-.38, 1.06, .96), (.3, .05, .05), dark, yaw=0)
        box(mesh, (-.38, .97, 1.04), (.05, .05, .2), dark)
    else:
        spots = [(.38, -.35, 1, True), (-.38, -.35, 1, False), (.38, .75, -1, False), (-.38, .75, -1, True)]
        box(mesh, (0, .52, .2), (.5, .05, .34), pale)
    people = [((.34, .41, .48, 1), (.72, .55, .42, 1), (.1, .08, .07, 1), (.2, .24, .3, 1)),
              ((.1, .13, .17, 1), (.58, .4, .28, 1), (.2, .13, .08, 1), (.08, .1, .13, 1))]
    who = 0
    for x, z, f, sitting in spots:
        seat(mesh, x, z, f, pale)
        if sitting:
            person(mesh, x, z + .02 * f, f, *people[who])
            who += 1


def wheel(mesh, x, z, r, w):
    """Disc wheel: thin dark tyre and a white disc, in car_body so night interior light leaves it alone."""
    n = 18
    side = 1 if x > 0 else -1
    tyre, disc = grey(.035), grey(.72)
    y = r + 0
    ring = lambda rr, dx, col: [mesh.vert((x + dx, y + rr * math.cos(2 * math.pi * i / n), z + rr * math.sin(2 * math.pi * i / n)), col) for i in range(n)]
    outer, inner = w / 2 * side, -w / 2 * side
    a, b, c, d = ring(r, inner, tyre), ring(r, outer, tyre), ring(r * .86, outer, tyre), ring(r * .86, outer + .01 * side, disc)
    e = ring(r * .3, outer + .03 * side, disc)
    hub = mesh.vert((x + outer + .035 * side, y, z), disc)
    for i in range(n):
        j = (i + 1) % n
        for p, q in ((a, b), (b, c), (d, e)):
            f = (p[i], p[j], q[j], q[i])
            mesh.face(f if side > 0 else f[::-1], "car_body")
        f = (e[i], e[j], hub)
        mesh.face(f if side > 0 else f[::-1], "car_body")


def hover(mesh):
    """Thin emitter ring under the belly and a soft light pool on the road (car_pool's colours fade it out)."""
    n = 28
    ring = lambda rx, rz, y: [mesh.vert((rx * math.cos(2 * math.pi * i / n), y, .1 + rz * math.sin(2 * math.pi * i / n))) for i in range(n)]
    a, b, c, d = ring(.8, 1.12, .19), ring(.72, 1.02, .19), ring(.8, 1.12, .13), ring(.72, 1.02, .13)
    for i in range(n):
        j = (i + 1) % n
        for f in ((a[j], a[i], b[i], b[j]), (a[i], a[j], c[j], c[i]), (b[j], b[i], d[i], d[j]), (d[j], d[i], c[i], c[j])):
            mesh.face(f, "car_seam")
    # Column between the ring and the belly.
    for dz in (-.4, .6):
        box(mesh, (0, .22, dz), (.5, .1, .3), grey(.72), role="car_body")
    glow = lambda rx, rz, v: [mesh.vert((rx * math.cos(2 * math.pi * i / n), .03, .1 + rz * math.sin(2 * math.pi * i / n)), grey(v)) for i in range(n)]
    p, q = glow(.75, 1.2, 1), glow(1.25, 2.05, 0)
    centre = mesh.vert((0, .03, .1), grey(1))
    for i in range(n):
        j = (i + 1) % n
        mesh.face((p[j], p[i], q[i], q[j]), "car_pool")
        mesh.face((p[j], centre, p[i]), "car_pool")


ROLES = {
    "car_body": ((.94, .95, .96, 1), {"rough": .38}),
    "car_interior": ((.8, .8, .8, 1), {"rough": .7}),
    "car_glass": ((.72, .84, .92, .3), {"rough": .08}),
    "car_seam": ((.81, .91, 1, 1), {"rough": .3, "emit": (.81, .91, 1, 1), "emit_strength": 2}),
    "car_head": ((.96, .96, .94, 1), {"rough": .3, "emit": (1, .96, .88, 1), "emit_strength": 1}),
    "car_tail": ((.72, .35, .31, 1), {"rough": .3, "emit": (1, .29, .23, 1), "emit_strength": 1}),
    "car_pool": ((.81, .91, 1, 1), {"rough": 1, "emit": (.81, .91, 1, 1), "emit_strength": 1}),
}


def to_object(name, mesh, mats, parent, analytic):
    faces = mesh.f
    if analytic:  # every shell vertex knows its outward normal, so the winding follows it
        out = []
        for f in faces:
            n = newell([mesh.v[i] for i in f])
            w = [sum(B(mesh.n[i])[a] for i in f) for a in range(3)]
            out.append(f if sum(n[a] * w[a] for a in range(3)) >= 0 else f[::-1])
        faces = out
    me = bpy.data.meshes.new(name)
    me.from_pydata(mesh.v, [], faces)
    order = [r for r in ROLES if r in mesh.roles]
    for r in order:
        me.materials.append(mats[r])
    me.polygons.foreach_set("material_index", [order.index(r) for r in mesh.roles])
    me.polygons.foreach_set("use_smooth", [True] * len(mesh.f))
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    attr.data.foreach_set("color", [c for rgba in mesh.c for c in rgba])
    me.update()
    if analytic:
        me.normals_split_custom_set_from_vertices([B(n) if n else (0, 0, 1) for n in mesh.n])
    else:  # closed parts: outward by topology; the flat light pool faces up
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces:
            f.smooth = True
            if f.material_index == order.index("car_pool") if "car_pool" in order else False:
                if f.normal.z < 0:
                    f.normal_flip()
        for e in bm.edges:
            if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(30):
                e.smooth = False
        bm.to_mesh(me)
        bm.free()
    obj = bpy.data.objects.new(name, me)
    obj.parent = parent
    bpy.context.collection.objects.link(obj)
    return obj


def build(name, human, x, mats, root):
    empty = bpy.data.objects.new(name, None)
    empty.parent = root
    empty.location = (x, 0, 0)
    bpy.context.collection.objects.link(empty)
    wheels = [(-1.42, .34, .43), (1.42, .34, .43)] if human else []
    body = Mesh()
    shell(body, human, wheels)
    headband(body)
    to_object(f"{name}_shell", body, mats, empty, True)
    parts = Mesh()
    interior(parts, human)
    if human:
        for wz in (-1.42, 1.42):
            for wx in (-.8, .8):
                wheel(parts, wx, wz, .34, .18)
    else:
        hover(parts)
    to_object(f"{name}_parts", parts, mats, empty, False)
    return body, parts


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = {name: material(name, rgba, **kw) for name, (rgba, kw) in ROLES.items()}
    root = bpy.data.objects.new("ROOT_CAR_FAMILY_2127", None)
    bpy.context.collection.objects.link(root)
    report = {}
    for name, human, x in (("car_pod", False, 0), ("car_human", True, 3)):
        a, b = build(name, human, x, mats, root)
        report[name] = sum(len(f) - 2 for f in a.f + b.f)
    blend, glb = os.path.join(HERE, "car-family-2127.blend"), os.path.join(HERE, "car-family-2127.glb")
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials="EXPORT", export_animations=False, export_cameras=False,
                              export_lights=False, export_extras=False, export_vertex_color="ACTIVE")
    print("@@CAR@@", report, "bytes", os.path.getsize(glb))


if __name__ == "__main__":
    main()
