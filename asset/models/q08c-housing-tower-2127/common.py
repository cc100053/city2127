"""Shared geometry and materials for the Q08-C housing tower (houses.py, build_housing_tower.py, review.py).

Coordinates are three.js (x, y up, z) through geo_helpers.B; one unit = one metre. Geometry accumulates per material
role (Accs) and becomes one mesh per object with one slot per role (build_mesh). The loft / rounded-box helpers come
from the Q08-C boat-room builder (v2, never committed), which kept them per builder.
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)
for p in (MODELS, os.path.join(MODELS, "city-kit-2127")):
    if p not in sys.path:
        sys.path.insert(0, p)
from geo_helpers import Acc, B, blob, bullnose, cyl, material, newell, obox, rrect_pts, sweep  # noqa: E402,F401
import modules as M  # noqa: E402

X, Z = (1, 0), (0, 1)


class Accs(dict):
    def __missing__(self, k):
        self[k] = Acc()
        return self[k]


def role_view(a, prefix="in_"):
    """modules.* write ROLES names; route them to prefixed accumulators of a."""
    return {role: a[prefix + role] for role in M.ROLES}


# --- shapes ----------------------------------------------------------------------------------------------------------
def loft(acc, sections, wrap=False, caps=True):
    verts, idx = [], []
    for s in sections:
        idx.append(list(range(len(verts), len(verts) + len(s))))
        verts += s
    m, n = len(sections[0]), len(sections)
    faces = []
    for i in range(n if wrap else n - 1):
        a, b = idx[i], idx[(i + 1) % n]
        faces += [(a[k], b[k], b[(k + 1) % m], a[(k + 1) % m]) for k in range(m)]
    if not wrap and caps:
        faces += [tuple(idx[0]), tuple(reversed(idx[-1]))]
    acc.solid(verts, faces)


def rbox(acc, cx, cz, hw, hd, y0, y1, r=.15, b=.05, n=2, segs=1):
    """Box rounded in plan (corner radius r) with bevelled top and bottom edges."""
    r = min(r, hw - 1e-3, hd - 1e-3)
    sweep(acc, lambda k: rrect_pts(cx, cz, hw, hd, [r] * 4, n, k), bullnose(y0, y1, min(b, (y1 - y0) / 2.2), segs))


def prism_z(acc, pts, z0, z1):
    """Extrude a closed (x, y) outline along z."""
    loft(acc, [[(x, y, z0) for x, y in pts], [(x, y, z1) for x, y in pts]])


def prism_x(acc, pts, x0, x1):
    """Extrude a closed (z, y) outline along x."""
    loft(acc, [[(x0, y, z) for z, y in pts], [(x1, y, z) for z, y in pts]])


def frame_z(acc, outer, inner, z0, z1):
    """Ring between two closed (x, y) outlines (same count, same winding) extruded along z: a frame with depth."""
    m = len(outer)
    v = [(x, y, z0) for x, y in outer] + [(x, y, z1) for x, y in outer] + [(x, y, z0) for x, y in inner] + [(x, y, z1) for x, y in inner]
    O0, O1, I0, I1 = 0, m, 2 * m, 3 * m
    f = []
    for k in range(m):
        k1 = (k + 1) % m
        f += [(O0 + k, O0 + k1, O1 + k1, O1 + k), (I0 + k1, I0 + k, I1 + k, I1 + k1),
              (O1 + k, O1 + k1, I1 + k1, I1 + k), (O0 + k1, O0 + k, I0 + k, I0 + k1)]
    acc.solid(v, f)


def ring_x(acc, cy, cz, r_out, r_in, x0, x1, n=16):
    """Round frame (porthole ring) on an axis along x."""
    o = [(cz + r_out * math.cos(2 * math.pi * i / n), cy + r_out * math.sin(2 * math.pi * i / n)) for i in range(n)]
    i_ = [(cz + r_in * math.cos(2 * math.pi * i / n), cy + r_in * math.sin(2 * math.pi * i / n)) for i in range(n)]
    m = n
    v = [(x0, y, z) for z, y in o] + [(x1, y, z) for z, y in o] + [(x0, y, z) for z, y in i_] + [(x1, y, z) for z, y in i_]
    f = []
    for k in range(m):
        k1 = (k + 1) % m
        f += [(k, k1, m + k1, m + k), (2 * m + k1, 2 * m + k, 3 * m + k, 3 * m + k1),
              (m + k, m + k1, 3 * m + k1, 3 * m + k), (k1, k, 2 * m + k, 2 * m + k1)]
    acc.solid(v, f)


def disc_x(acc, cy, cz, r, x0, x1, n=16):
    prism_x(acc, [(cz + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)], x0, x1)


def rr_xy(hw, y0, y1, r, n=4, k=0.0, cx=0.0):
    """Rounded rectangle in the x-y plane, inset by k, counter-clockwise."""
    hw, y0, y1, r = hw - k, y0 + k, y1 - k, max(r - k, .02)
    cy, hh = (y0 + y1) / 2, (y1 - y0) / 2
    pts = []
    for ci, (sx, sy) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1))):
        for j in range(n + 1):
            a = math.radians(ci * 90 + 90 * j / n)
            pts.append((cx + (hw - r) * sx + r * math.cos(a), cy + (hh - r) * sy + r * math.sin(a)))
    return pts


def ellipse_xy(a, b, cy, n=32, cx=0.0, start=0.0):
    return [(cx + a * math.cos(start + 2 * math.pi * i / n), cy + b * math.sin(start + 2 * math.pi * i / n)) for i in range(n)]


def superellipse_xy(a, b, cy, p=2.6, n=32, y_floor=None):
    """Squarish ellipse |x/a|^p + |y/b|^p = 1 centred at (0, cy); y clamped to y_floor (a flat base) when given."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        c, s = math.cos(t), math.sin(t)
        x = a * math.copysign(abs(c) ** (2 / p), c)
        y = cy + b * math.copysign(abs(s) ** (2 / p), s)
        if y_floor is not None:
            y = max(y, y_floor)
        pts.append((x, y))
    return pts


def arch_xy(hw, ys, ya, n=12, k=0.0, legs=None, cx=0.0):
    """Elliptic arch from (hw, ys) over (0, ya) to (-hw, ys), inset k; legs extend both feet down to that height."""
    pts = [(cx + (hw - k) * math.cos(math.pi * i / n), ys + (ya - ys - k) * math.sin(math.pi * i / n)) for i in range(n + 1)]
    if legs is not None:
        pts = [(cx + hw - k, legs)] + pts + [(cx - (hw - k), legs)]
    return pts


def arch_ring_z(acc, hw, ys, ya, t, z0, z1, n=12, cx=0.0):
    prism_z(acc, arch_xy(hw, ys, ya, n, cx=cx) + arch_xy(hw, ys, ya, n, k=t, cx=cx)[::-1], z0, z1)


def rail(acc_post, acc_glass, acc_top, p0, p1, h=1.1, step=1.2, post=.05, glass=True):
    """Balcony railing from p0 to p1 (x, y, z) on its floor line: posts, a handrail and an optional glass infill."""
    dx, dz = p1[0] - p0[0], p1[2] - p0[2]
    ln = math.hypot(dx, dz)
    t = (dx / ln, dz / ln)
    n = (-t[1], t[0])
    c = ((p0[0] + p1[0]) / 2, p0[1], (p0[2] + p1[2]) / 2)
    k = max(1, round(ln / step))
    for i in range(k + 1):
        x, z = p0[0] + dx * i / k, p0[2] + dz * i / k
        obox(acc_post, (x, p0[1] + h / 2, z), (post, h, post), t, n)
    obox(acc_top, (c[0], p0[1] + h, c[2]), (ln + post, .05, .07), t, n)
    if glass:
        obox(acc_glass, (c[0], p0[1] + .1 + (h - .2) / 2, c[2]), (ln, h - .2, .02), t, n)


def boolean_diff(acc, cutter):
    """acc minus cutter (both closed Accs), solved by Blender's exact boolean; acc is rewritten in place."""
    me = bpy.data.meshes.new("_bool_a")
    me.from_pydata(acc.v, [], acc.f)
    ob = bpy.data.objects.new("_bool_a", me)
    cme = bpy.data.meshes.new("_bool_c")
    cme.from_pydata(cutter.v, [], cutter.f)
    cob = bpy.data.objects.new("_bool_c", cme)
    col = bpy.context.scene.collection
    col.objects.link(ob)
    col.objects.link(cob)
    mod = ob.modifiers.new("cut", "BOOLEAN")
    mod.operation, mod.solver, mod.object = "DIFFERENCE", "EXACT", cob
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    m2 = ev.to_mesh()
    acc.v = [tuple(v.co) for v in m2.vertices]
    acc.f = [tuple(p.vertices) for p in m2.polygons]
    ev.to_mesh_clear()
    for o, m in ((ob, me), (cob, cme)):
        bpy.data.objects.remove(o)
        bpy.data.meshes.remove(m)


# --- materials ------------------------------------------------------------------------------------------------------
MATS = {}


def mat(name, rgba, rough=.6, metal=0.0, emit=None, strength=1.0, culling=True):
    m = material("q08h_" + name, rgba, rough, emit, strength)
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Metallic"].default_value = metal
    if rgba[3] < 1:
        bsdf.inputs["Specular IOR Level"].default_value = .4
    m.use_backface_culling = culling
    return m


def make_materials():
    if MATS:
        return MATS
    MATS.update({
        # fixed structure (matte warm white frame, grey core, steel, dark machinery, paving)
        "t_white": mat("tower_white", (.80, .78, .74, 1), .78),
        "t_core": mat("tower_core", (.60, .61, .61, 1), .8),
        "t_rail": mat("rail_steel", (.62, .64, .67, 1), .28, 1.0),
        "t_dark": mat("machine_dark", (.10, .11, .12, 1), .4, .6),
        "t_yellow": mat("machine_yellow", (.95, .70, .15, 1), .45),
        "t_amber": mat("signal_amber", (1, .6, .2, 1), .4, emit=(1, .55, .15, 1), strength=4.0),
        "t_glass": mat("lobby_glass", (.70, .84, .92, .22), .04),
        "t_canopy": mat("canopy_glass", (.78, .90, .96, .28), .04, culling=False),
        "t_warm": mat("lobby_ceiling", (1, .86, .66, 1), .5, emit=(1, .62, .3, 1), strength=2.0),
        "t_lobby": mat("lobby_floor", (.86, .74, .58, 1), .7),
        "t_pave": mat("quay_paving", (.70, .68, .64, 1), .85),
        "t_deck": mat("garden_deck", (.56, .40, .26, 1), .7),
        "t_corr": mat("corridor_floor", (.74, .72, .68, 1), .8),
        "t_lamp": mat("corridor_lamp", (1, .9, .75, 1), .5, emit=(1, .82, .6, 1), strength=3.0),
        "leaf": mat("leaf", (.16, .36, .10, 1), .8),
        "bloom": mat("bloom", (.90, .55, .68, 1), .8),
        "soil": mat("soil", (.20, .13, .08, 1), .9),
        # houses: glossy white shells, champagne metal, tinted glass, warm wood, dark chassis
        "h_shell": mat("house_shell", (.95, .95, .93, 1), .18),
        "h_seam": mat("house_seam", (.55, .56, .57, 1), .5),
        "h_base": mat("house_base", (.17, .18, .20, 1), .35, .8),
        "h_frame": mat("house_frame_champagne", (.578, .431, .254, 1), .3, 1.0),
        "h_glass": mat("house_glass", (.62, .78, .90, .2), .03, culling=False),
        "h_pink": mat("house_glass_pink", (.95, .55, .75, .42), .05, culling=False),
        "h_blue": mat("house_glass_blue", (.45, .70, .95, .38), .05, culling=False),
        "h_wood": mat("house_wood", (.55, .32, .14, 1), .5),
        "h_deck": mat("house_deck", (.50, .34, .20, 1), .7),
        "h_door": mat("house_door", (.22, .28, .32, 1), .4, .3),
        "h_lamp": mat("house_lamp", (1, .86, .62, 1), .4, emit=(1, .72, .4, 1), strength=3.0),
        "h_roof": mat("house_roof", (.20, .23, .26, 1), .45, .2),
    })
    for role, (rgba, emit, strength) in M.ROLES.items():           # accepted interior recipe (LIBRARY: modules.ROLES)
        MATS["in_" + role] = mat("in_" + role, rgba, .6, emit=emit, strength=strength, culling=rgba[3] >= 1)
    return MATS


def build_mesh(name, accs, smooth_deg=30):
    vs, fs, mi, mats = [], [], [], []
    for role, acc in accs.items():
        if not acc.f:
            continue
        base = len(vs)
        vs += acc.v
        mats.append(MATS[role])
        fs += [tuple(base + i for i in f) for f in acc.f]
        mi += [len(mats) - 1] * len(acc.f)
    me = bpy.data.meshes.new(name)
    me.from_pydata(vs, [], fs)
    me.update()
    for m in mats:
        me.materials.append(m)
    me.polygons.foreach_set("material_index", mi)
    uv = []                                                        # box projection, 3 m per unit
    for f in fs:
        nrm = newell([vs[i] for i in f])
        ax = max(range(3), key=lambda i: abs(nrm[i]))
        ua, va = {0: (1, 2), 1: (0, 2), 2: (0, 1)}[ax]
        for i in f:
            uv += [vs[i][ua] / 3.0, vs[i][va] / 3.0]
    me.uv_layers.new(name="UVMap").data.foreach_set("uv", uv)
    bm = bmesh.new()
    bm.from_mesh(me)
    thr = math.radians(smooth_deg)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > thr:
            e.smooth = False
    bm.to_mesh(me)
    bm.free()
    me.update()
    return me


def add_obj(name, data, col, parent=None, loc3=(0, 0, 0), yaw_deg=0.0):
    """Object at a three.js location, turned yaw_deg about the vertical (positive turns local +z toward +x)."""
    ob = bpy.data.objects.new(name, data)
    col.objects.link(ob)
    ob.matrix_world = Matrix.Translation(B(loc3)) @ Matrix.Rotation(math.radians(yaw_deg), 4, "Z")
    if parent:
        ob.parent = parent
        ob.matrix_parent_inverse = parent.matrix_world.inverted()
    return ob


def tris(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)
