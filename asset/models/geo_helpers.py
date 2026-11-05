"""Shared pure-Python geometry accumulators for the headless Blender builders (build_tower.py, build_kit.py).

Coordinates are three.js (x, y up, z); B() maps them to Blender (x, -z, y). Geometry accumulates per material (Acc)
and is joined into one mesh per material by finish_mesh().
"""
import math

import bmesh
import bpy

B = lambda p: (p[0], -p[2], p[1])


def volume(vs, fs):
    v = 0.0
    for f in fs:
        a = vs[f[0]]
        for i in range(1, len(f) - 1):
            b, c = vs[f[i]], vs[f[i + 1]]
            v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])
    return v


def newell(pts):
    n = [0.0, 0.0, 0.0]
    for i, p in enumerate(pts):
        q = pts[(i + 1) % len(pts)]
        n[0] += (p[1] - q[1]) * (p[2] + q[2])
        n[1] += (p[2] - q[2]) * (p[0] + q[0])
        n[2] += (p[0] - q[0]) * (p[1] + q[1])
    return n


class Acc:
    """Vertex/face soup for one material (Blender coordinates)."""

    def __init__(self):
        self.v, self.f = [], []

    def _push(self, vs, fs):
        base = len(self.v)
        self.v += vs
        self.f += [tuple(base + i for i in f) for f in fs]

    def solid(self, verts, faces):
        """Closed volume: winding is fixed so normals point out."""
        vs = [B(p) for p in verts]
        fs = [tuple(f) for f in faces]
        if volume(vs, fs) < 0:
            fs = [tuple(reversed(f)) for f in fs]
        self._push(vs, fs)

    def surface(self, verts, faces, want):
        """Open surface: each face is flipped to look along want(centroid) (three coords)."""
        vs = [B(p) for p in verts]
        out = []
        for f in faces:
            c = [sum(verts[i][k] for i in f) / len(f) for k in range(3)]
            w = B(want(c))
            n = newell([vs[i] for i in f])
            out.append(tuple(f) if sum(a * b for a, b in zip(n, w)) >= 0 else tuple(reversed(f)))
        self._push(vs, out)


def obox(acc, c, size, t=(1, 0), n=(0, 1)):
    """Box centred c=(x,y,z); size=(along t, y, along n); t/n are unit vectors in the xz plane."""
    st, sy, sn = (s / 2 for s in size)
    verts = [(c[0] + a * st * t[0] + b * sn * n[0], c[1] + h * sy, c[2] + a * st * t[1] + b * sn * n[1])
             for h in (-1, 1) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    acc.solid(verts, [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])


def yawed(yaw):
    """t/n axes of a box turned by `yaw` about Y (three.js convention: +Z front turns toward +X for yaw > 0)."""
    return (math.cos(yaw), -math.sin(yaw)), (math.sin(yaw), math.cos(yaw))


def rot(x, z, yaw):
    """Rotate a local (x, z) offset by yaw about Y."""
    return x * math.cos(yaw) + z * math.sin(yaw), -x * math.sin(yaw) + z * math.cos(yaw)


def rrect_pts(cx, cz, hw, hd, radii, n, k=0.0):
    """Rounded-rect outline inset by k (negative grows). Corner order (+x,+z) (-x,+z) (-x,-z) (+x,-z); radius 0 = sharp."""
    pts = []
    for ci, (sx, sz) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1))):
        r = radii[ci]
        if r <= 1e-6:
            pts.append((cx + sx * (hw - k), cz + sz * (hd - k)))
            continue
        for j in range(n + 1):
            a = math.radians(ci * 90 + 90 * j / n)
            re = max(r - k, 1e-3)
            pts.append((cx + (hw - r) * sx + re * math.cos(a), cz + (hd - r) * sz + re * math.sin(a)))
    return pts


def circle_pts(cx, cz, r, n, k=0.0):
    return [(cx + (r - k) * math.cos(2 * math.pi * i / n), cz + (r - k) * math.sin(2 * math.pi * i / n)) for i in range(n)]


def sweep(acc, ring, section, caps=(True, True), closed=False, want=None):
    """Loft rings ring(k) at (k, y) section points. Solid when capped/closed, else an open surface looking along want."""
    verts, rings = [], []
    for k, y in section:
        pts = ring(k)
        rings.append(list(range(len(verts), len(verts) + len(pts))))
        verts += [(x, y, z) for x, z in pts]
    faces = []
    for a in range(len(rings) if closed else len(rings) - 1):
        r0, r1 = rings[a], rings[(a + 1) % len(rings)]
        m = len(r0)
        faces += [(r0[i], r0[(i + 1) % m], r1[(i + 1) % m], r1[i]) for i in range(m)]
    if caps[0]:
        faces.append(tuple(reversed(rings[0])))
    if caps[1]:
        faces.append(tuple(rings[-1]))
    if want is None:
        acc.solid(verts, faces)
    else:
        acc.surface(verts, faces, want)


def bullnose(y0, y1, b, segs=3):
    """Section top-cap edge -> bullnose -> bottom-cap edge; k = inset from the outline."""
    top = [(b - b * math.sin(math.radians(90 * j / segs)), y1 - b + b * math.cos(math.radians(90 * j / segs))) for j in range(segs + 1)]
    bot = [(b * (1 - math.cos(math.radians(90 * j / segs))), y0 + b - b * math.sin(math.radians(90 * j / segs))) for j in range(segs + 1)]
    return top + bot


def ring_section(k_out, k_in, y0, y1):
    return [(k_out, y0), (k_in, y0), (k_in, y1), (k_out, y1)]


def cyl(acc, cx, cz, r, y0, y1, n, r_top=None):
    """Cylinder (or frustum when r_top is given)."""
    top = 0 if r_top is None else r - r_top
    sweep(acc, lambda k: circle_pts(cx, cz, r, n, k), [(0, y0), (top, y1)])


def tube(acc, cx, cz, r, y0, y1, n, inward=False):
    sign = -1 if inward else 1
    sweep(acc, lambda k: circle_pts(cx, cz, r, n, k), [(0, y0), (0, y1)], caps=(False, False),
          want=lambda c: (sign * (c[0] - cx), 0, sign * (c[2] - cz)))


def plane(acc, pts, want):
    acc.surface(pts, [(0, 1, 2, 3)], lambda c: want)


def blob(acc, c, r, sub=2, seed=0.0, noise=.12, flat=.7):
    """Lumpy ellipsoid (icosphere): c centre, r=(rx, ry, rz); the underside is flattened by `flat`."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
    verts = []
    for v in bm.verts:
        x, y, z = v.co
        n = noise * math.sin(x * 5.3 + seed) * math.sin(y * 4.7 + seed * 1.7) * math.sin(z * 5.1 - seed)
        s = 1 + n + .03 * math.sin(x * 11 + z * 13 + seed)
        x, y, z = x * s, y * s * (flat if y < 0 else 1), z * s
        verts.append((c[0] + x * r[0], c[1] + y * r[1], c[2] + z * r[2]))
    faces = [[v.index for v in f.verts] for f in bm.faces]
    bm.free()
    acc.solid(verts, faces)


def material(name, rgba, rough=.6, emit=None, emit_strength=1.0, preview_alpha=None):
    """Principled material named `name`; viewport colour set so Workbench renders show it."""
    m = bpy.data.materials.new(name)
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Alpha"].default_value = rgba[3]
    bsdf.inputs["Roughness"].default_value = rough
    if emit:
        bsdf.inputs["Emission Color"].default_value = emit
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    m.diffuse_color = rgba
    m.use_backface_culling = True
    if rgba[3] < 1:
        m.surface_render_method = "BLENDED"
    return m


def finish_mesh(name, acc, mat, smooth_deg=25):
    """One joined mesh per material: all faces smooth, edges sharper than smooth_deg marked sharp."""
    me = bpy.data.meshes.new(name)
    me.from_pydata(acc.v, [], acc.f)
    me.update()
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
    me.materials.append(mat)
    return bpy.data.objects.new(name, me)
