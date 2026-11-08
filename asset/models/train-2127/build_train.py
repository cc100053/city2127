"""train-2127: the guideway train (target: artifacts/train-closeup-polish/target, owner pick "A night" 2026-11-08).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_train.py
Writes train-2127.blend and .glb next to this file (glTF preset, no Meshopt/Draco).

Real metres, front = +Z three.js. y = 0 is the pose point on the guideway beam top; the body floats from FLOAT up.
Root ROOT_TRAIN_2127 holds three empties, one per car kind: train_lead (blade nose), train_mid, train_tail (red tail band).
Cars are CAR long on a 10 m pitch (mobility CAR_GAP); the lead and mid cars carry the glowing ring and field coupler
of the joint behind them. Material names are roles: train_body and train_interior (colour attribute), train_glass,
train_seam, train_ring, train_head, train_tail, train_field. Coordinates here are three.js (x, y up, z); B maps them.
"""
import math
import os
import sys

import bmesh
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import B, material  # noqa: E402

PITCH, HALF = 10.0, 4.4          # car pitch, half body length
# R2 lifts the body to 1.02 so the ring (R2: radius 2.0) can be as big as the target's and still clear the beam top.
FLOAT, TOP, HW = 1.02, 3.4, 1.32  # belly height, roof height, half width
LIFT = FLOAT - .62 + .15          # the cabin was laid out for a .62 belly; .15 more puts shoulders above the sill
SQ = 2.7                         # superellipse exponent of the section
JOINT = -PITCH / 2               # the joint behind a car
NOSE = 4.6                       # blade length ahead of the lead body (R1's 6.2 read as a needle)
RING_R, RING_T = 2.0, .15  # its foot just clears the beam top


ROLES = {
    "train_body": ((.93, .94, .95, 1), {"rough": .36}),
    "train_interior": ((.8, .8, .8, 1), {"rough": .7}),
    "train_glass": ((.7, .82, .9, .28), {"rough": .06}),
    "train_seam": ((.81, .91, 1, 1), {"rough": .3, "emit": (.81, .91, 1, 1), "emit_strength": 2}),
    "train_ring": ((.85, .93, 1, 1), {"rough": .3, "emit": (.81, .91, 1, 1), "emit_strength": 3}),
    "train_head": ((.96, .96, .94, 1), {"rough": .3, "emit": (1, .95, .85, 1), "emit_strength": 1}),
    "train_tail": ((.85, .86, .88, 1), {"rough": .3, "emit": (1, .23, .19, 1), "emit_strength": 1}),
    "train_field": ((.75, .88, 1, .35), {"rough": 1, "emit": (.75, .88, 1, 1), "emit_strength": 1}),
}


class Mesh:
    def __init__(self):
        self.v, self.f, self.c, self.roles = [], [], [], []

    dy = 0.0  # raises everything added while set (the cabin follows the lifted belly)

    def vert(self, p, col=(1, 1, 1, 1)):
        self.v.append(B((p[0], p[1] + self.dy, p[2])))
        self.c.append(col)
        return len(self.v) - 1

    def face(self, idx, role):
        self.f.append(list(idx))
        self.roles.append(role)


def smooth(t):
    t = min(max(t, 0), 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- shell
def section(z, kind):
    """(centre y, half height, half width) of the body at z; ends close as rounded capsules, the lead's front as a blade."""
    yc, h, w = (FLOAT + TOP) / 2, (TOP - FLOAT) / 2, HW
    rear = HALF - .9
    if z < -rear:  # rounded capsule end: a quarter ellipse closing to 55 %
        u = (-rear - z) / .9
        k = .55 + .45 * math.sqrt(max(1 - u * u, 0))
        return yc, h * k, w * k
    if kind == "lead" and z > 1.2:  # the blade: drops and narrows to a low point NOSE ahead of the body
        u = min((z - 1.2) / (HALF + NOSE - 1.2), 1)
        top = TOP - (TOP - FLOAT - .62) * smooth(u) ** .75
        bot = FLOAT + .36 * smooth(u)
        top = max(top, bot + .04)
        return (top + bot) / 2, (top - bot) / 2, w * (1 - u ** 2.2) ** .7 + .02
    if kind != "lead" and z > rear:
        u = (z - rear) / .9
        k = .55 + .45 * math.sqrt(max(1 - u * u, 0))
        return yc, h * k, w * k
    return yc, h, w


def point(z, s, kind):
    """Surface point, s = -1 belly centre .. 1 roof centre, right side (x >= 0)."""
    yc, h, w = section(z, kind)
    a = s * math.pi / 2
    sa, ca = math.sin(a), max(math.cos(a), 0)
    return w * ca ** (2 / SQ), yc + h * math.copysign(abs(sa) ** (2 / SQ), sa), z


# Rows round the half section and what each band between rows is.
# The glass starts above a white shoulder (s .22), so the body keeps its mass from the raised review camera (R1 read as an open tray).
# R2: the seam runs just under the sill (s -.04–.04): mid-flank (R1) is foreshortened away from the raised camera; the sill (.1)
# sits below the riders' shoulders.
S_ROWS = [-1, -.93, -.86, -.6, -.35, -.14, -.04, .04, .1, .4, .7, .92, 1]
BANDS = ["emit", "belly", "body", "body", "body", "body", "seam", "body", "win", "win", "win", "spine"]


def stations(kind):
    zs = [-HALF + i * .15 for i in range(7)] + [-HALF + .9 + i * .55 for i in range(int((2 * HALF - 1.8) / .55) + 1)]
    if kind == "lead":
        zs = [z for z in zs if z <= 1.2] + [1.2 + (HALF + NOSE - 1.2) * (i / 22) ** .85 for i in range(1, 23)]
    else:
        zs += [HALF - .9 + i * .15 for i in range(7)]
    zs = sorted(set(round(z, 4) for z in zs))
    return zs


def shell(m, kind):
    zs = stations(kind)
    tip = zs[-1]
    grid = []
    for z in zs:
        row = []
        for s in S_ROWS:
            x, y, _ = point(z, s, kind)
            row.append((x, y, z))
        grid.append(row)

    def role(band, z0, z1):
        zm = (z0 + z1) / 2
        end = kind != "lead" and abs(zm) > HALF - .75 or kind == "lead" and zm < -HALF + .75
        if band == "win":
            if kind == "lead" and zm > HALF + NOSE * .5:  # the windscreen ends at the blade's root; the blade stays white
                return "train_body"
            return "train_body" if end else "train_glass"
        if band == "seam":
            if kind == "lead" and zm > HALF + .4:
                return "train_head"
            if kind == "tail" and zm < -HALF + .5:
                return "train_tail"
            return "train_seam"
        if band == "emit":
            return "train_seam"
        return "train_body"

    for side in (1, -1):
        idx = [[m.vert((p[0] * side, p[1], p[2])) for p in row] for row in grid]
        for i in range(len(zs) - 1):
            for k in range(len(S_ROWS) - 1):
                q = [idx[i][k], idx[i + 1][k], idx[i + 1][k + 1], idx[i][k + 1]]
                m.face(q[::-1] if side > 0 else q, role(BANDS[k], zs[i], zs[i + 1]))  # outward: +z then up winds inward on the right side
    # Caps: the rear end closes on a fan; the lead's blade tip is already a point.
    for end, z in ((0, zs[0]), (1, zs[-1])):
        if kind == "lead" and end == 1:
            continue
        x0, y0, _ = point(z, 0, kind)
        c = m.vert((0, section(z, kind)[0], z))
        ring = [m.vert(point(z, s, kind)) for s in S_ROWS] + [m.vert((-point(z, s, kind)[0], point(z, s, kind)[1], z)) for s in reversed(S_ROWS[1:-1])]
        for a in range(len(ring)):
            tri = [c, ring[a], ring[(a + 1) % len(ring)]]
            m.face(tri if end == 1 else tri[::-1], "train_body" if not (kind == "tail" and end == 0) else "train_tail")
    del tip


def headband(m):
    """The lead's warm-white headlight band: a thin strip sweeping round the blade just below the windscreen."""
    pts = []
    for i in range(18):
        z = HALF + .4 + (NOSE - 1.0) * i / 17
        x, y, _ = point(z, .02, "lead")
        pts.append((x + .04, y + .02, z))  # proud of the blade's facets
    for side in (1, -1):
        prev = None
        for x, y, z in pts:
            a = m.vert((x * side, y - .1, z))
            b = m.vert((x * side, y + .1, z))
            if prev:
                q = [prev[0], a, b, prev[1]]
                m.face(q[::-1] if side > 0 else q, "train_head")
            prev = (a, b)


# ---------------------------------------------------------------- parts
def box(m, c, size, role, col=(1, 1, 1, 1)):
    hx, hy, hz = (s / 2 for s in size)
    v = [m.vert((c[0] + sx * hx, c[1] + sy * hy, c[2] + sz * hz), col) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        m.face([v[i] for i in f], role)


def ball(m, c, r, role, col, seg=6):
    rows = []
    for j in range(seg // 2 + 1):
        a = math.pi * j / (seg // 2) - math.pi / 2
        rows.append([m.vert((c[0] + r * math.cos(a) * math.cos(2 * math.pi * i / seg), c[1] + r * math.sin(a), c[2] + r * math.cos(a) * math.sin(2 * math.pi * i / seg)), col) for i in range(seg)])
    for j in range(len(rows) - 1):
        for i in range(seg):
            m.face([rows[j][i], rows[j][(i + 1) % seg], rows[j + 1][(i + 1) % seg], rows[j + 1][i]], role)


def torus(m, cz, yc, R, r, role, seg=40, tube=6):
    """A ring standing across the track (in the x-y plane) at z = cz."""
    rows = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        rows.append([m.vert(((R + r * math.cos(b)) * math.cos(a), yc + (R + r * math.cos(b)) * math.sin(a), cz + r * math.sin(b)))
                     for b in (2 * math.pi * j / tube for j in range(tube))])
    for i in range(seg):
        for j in range(tube):
            m.face([rows[i][j], rows[(i + 1) % seg][j], rows[(i + 1) % seg][(j + 1) % tube], rows[i][(j + 1) % tube]], role)


def tube_z(m, z0, z1, yc, r, role, seg=16):
    a = [m.vert((r * math.cos(2 * math.pi * i / seg), yc + r * math.sin(2 * math.pi * i / seg), z0)) for i in range(seg)]
    b = [m.vert((r * math.cos(2 * math.pi * i / seg), yc + r * math.sin(2 * math.pi * i / seg), z1)) for i in range(seg)]
    for i in range(seg):
        m.face([a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]], role)


SKIN = [(.93, .78, .66, 1), (.78, .6, .46, 1), (.55, .4, .3, 1)]
CLOTH = [(.36, .42, .5, 1), (.85, .84, .8, 1), (.3, .33, .36, 1), (.55, .62, .58, 1), (.62, .55, .6, 1), (.9, .9, .88, 1), (.42, .5, .62, 1)]


def person(m, x, z, seated, k, face=1):
    skin, cloth = SKIN[k % 3], CLOTH[(k * 5 + 2) % len(CLOTH)]
    floor = 1.0
    if seated:
        box(m, (x, floor + .62, z), (.42, .62, .3), "train_interior", cloth)
        box(m, (x, floor + .42, z + .22 * face), (.38, .16, .42), "train_interior", CLOTH[(k + 2) % len(CLOTH)])
        ball(m, (x, floor + 1.08, z), .13, "train_interior", skin)
    else:
        box(m, (x, floor + .48, z), (.3, .9, .24), "train_interior", CLOTH[(k + 3) % len(CLOTH)])
        box(m, (x, floor + 1.22, z), (.44, .58, .28), "train_interior", cloth)
        ball(m, (x, floor + 1.68, z), .13, "train_interior", skin)


def interior(m, kind, seed):
    m.dy = LIFT
    _interior(m, kind, seed)
    m.dy = 0


def _interior(m, kind, seed):
    pale, seat = (.7, .68, .64, 1), (.42, .47, .54, 1)  # darker than the white shell, so the cabin reads through the glass
    z0, z1 = -HALF + .7, (HALF + 1.2 if kind == "lead" else HALF - .7)
    box(m, (0, .92, (z0 + z1) / 2), (2.3, .16, z1 - z0), "train_interior", pale)
    k = seed
    # Facing pairs of seats down both sides, an aisle in the middle; a few people standing.
    zc = z0 + .6
    while zc < z1 - .5:
        for x in (-.72, .72):
            for face in (1, -1):
                zz = zc + .45 * face
                box(m, (x, 1.22, zz), (.86, .12, .46), "train_interior", seat)
                box(m, (x, 1.55, zz + .25 * face), (.86, .7, .1), "train_interior", seat)
                if (k * 7 + int(zz * 3)) % 5 < 3:
                    person(m, x + (.2 if k % 2 else -.2), zz, True, k, -face)
                k += 1
        zc += 1.9
    for j, z in enumerate((z0 + 1.6, (z0 + z1) / 2 + .3, z1 - 1.4)):
        if (seed + j) % 2 == 0:
            person(m, .05 * (-1) ** j, z, False, seed + j)


def coupler(m):
    """The joint behind a car: a glowing ring round the gap and a short field coupler between the car ends."""
    yc = (FLOAT + TOP) / 2
    torus(m, JOINT, yc, RING_R, RING_T, "train_ring")
    tube_z(m, JOINT - .6, JOINT + .6, yc, .82, "train_field")


def field(m, kind):
    """The levitation field: a sheet on the beam plus two curtains flaring from the belly edges down past the beam's sides,
    bright at the belly and fading out at the foot (additive at runtime, so the colour is the brightness)."""
    z0, z1 = -HALF + .3, (HALF + NOSE * .6 if kind == "lead" else HALF - .3)
    hi, lo = (1, 1, 1, 1), (0, 0, 0, 1)
    a, b, c, d = (m.vert(p, (.6, .6, .6, 1)) for p in ((-1.1, .06, z0), (1.1, .06, z0), (1.1, .06, z1), (-1.1, .06, z1)))
    m.face([a, d, c, b], "train_field")
    for side in (1, -1):
        q = [m.vert((side * .85, FLOAT + .02, z0), hi), m.vert((side * .85, FLOAT + .02, z1), hi),
             m.vert((side * 1.6, .03, z1), lo), m.vert((side * 1.6, .03, z0), lo)]
        m.face(q if side > 0 else q[::-1], "train_field")


# ---------------------------------------------------------------- objects
def to_object(name, mesh, mats, parent, sharp_deg):
    me = bpy.data.meshes.new(name)
    me.from_pydata(mesh.v, [], mesh.f)
    order = [r for r in ROLES if r in mesh.roles]
    for r in order:
        me.materials.append(mats[r])
    me.polygons.foreach_set("material_index", [order.index(r) for r in mesh.roles])
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    attr.data.foreach_set("color", [c for rgba in mesh.c for c in rgba])
    me.update()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(sharp_deg):
            e.smooth = False
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    obj.parent = parent
    bpy.context.collection.objects.link(obj)
    return obj


def build(kind, x, mats, root, seed):
    empty = bpy.data.objects.new(f"train_{kind}", None)
    empty.parent = root
    empty.location = (x, 0, 0)
    bpy.context.collection.objects.link(empty)
    body = Mesh()
    shell(body, kind)
    if kind == "lead":
        headband(body)
    to_object(f"train_{kind}_shell", body, mats, empty, 50)
    parts = Mesh()
    interior(parts, kind, seed)
    field(parts, kind)
    if kind != "tail":
        coupler(parts)
    to_object(f"train_{kind}_parts", parts, mats, empty, 30)
    return sum(len(f) - 2 for f in body.f + parts.f)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = {name: material(name, rgba, **kw) for name, (rgba, kw) in ROLES.items()}
    root = bpy.data.objects.new("ROOT_TRAIN_2127", None)
    bpy.context.collection.objects.link(root)
    report = {kind: build(kind, x, mats, root, seed) for kind, x, seed in (("lead", 0, 1), ("mid", 4, 4), ("tail", 8, 9))}
    blend, glb = os.path.join(HERE, "train-2127.blend"), os.path.join(HERE, "train-2127.glb")
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials="EXPORT", export_animations=False, export_cameras=False,
                              export_lights=False, export_extras=False, export_vertex_color="ACTIVE")
    print("@@TRAIN@@", report, "bytes", os.path.getsize(glb))


if __name__ == "__main__":
    main()
