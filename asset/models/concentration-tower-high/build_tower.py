"""SE +1 'high' tower for city2127 (spec: artifacts/se-high-blender/spec.md).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_tower.py
Writes concentration-tower-high.blend and .glb next to this file (glTF preset, no Meshopt/Draco).

Units are the site's local units (towerUpper group space; the site root scales x3 to metres).
Coordinates in this file are three.js (x, y up, z); B() maps them to Blender (x, -z, y).
Geometry is accumulated per material and joined: one mesh per role material.
"""
import math
import os

import bmesh
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
HW, LOBBY, HF, FLOORS = 5.2, 3.6, 2.4, 14
TOP = LOBBY + FLOORS * HF
SLAB_T = .26
FACE = 2.65  # glazing plane: .15 inside the 5.6 slab edge
TERRACE_FLOORS = (1, 4, 7, 10, 12)

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


def slab_section(y0, y1, b):
    return bullnose(y0, y1, b)


def ring_section(k_out, k_in, y0, y1):
    return [(k_out, y0), (k_in, y0), (k_in, y1), (k_out, y1)]


def cyl(acc, cx, cz, r, y0, y1, n):
    sweep(acc, lambda k: circle_pts(cx, cz, r, n, k), [(0, y0), (0, y1)])


def tube(acc, cx, cz, r, y0, y1, n, inward=False):
    sign = -1 if inward else 1
    sweep(acc, lambda k: circle_pts(cx, cz, r, n, k), [(0, y0), (0, y1)], caps=(False, False),
          want=lambda c: (sign * (c[0] - cx), 0, sign * (c[2] - cz)))


def plane(acc, pts, want):
    acc.surface(pts, [(0, 1, 2, 3)], lambda c: want)


SIDES = (((1, 0), (0, 1)), ((-1, 0), (0, -1)), ((0, 1), (-1, 0)), ((0, -1), (1, 0)))  # (normal, tangent): +X -X +Z -Z


def at(side, u, dist):
    (nx, nz), (tx, tz) = SIDES[side]
    return nx * dist + tx * u, nz * dist + tz * u


def build():
    acc = {k: Acc() for k in ("se_white", "se_amber", "se_room", "se_lamp", "se_light", "se_pane")}
    W, A, R, L, G, P = (acc[k] for k in ("se_white", "se_amber", "se_room", "se_lamp", "se_light", "se_pane"))
    sq = lambda w, r, n=6: (lambda k, w=w, r=r, n=n: rrect_pts(0, 0, w / 2, w / 2, (r,) * 4, n, k))

    # 1 plinth
    sweep(W, sq(6.4, .9), [(0, 0), (0, .12)])
    # 2 slabs + 3 amber bands
    slab_y = [0] + [LOBBY + i * HF for i in range(FLOORS)] + [TOP]
    for y in slab_y:
        sweep(W, sq(5.6, .7), slab_section(max(y, .08), y + SLAB_T, .08))  # lobby slab starts inside the plinth: no coplanar bottoms
        c = y + SLAB_T - .11  # .01 off the bullnose ring at -.04: no coplanar facet
        sweep(A, sq(5.6, .7), ring_section(-.05, .03, c - .06, c + .06), caps=(False, False), closed=True)
    # 4 corner columns
    for sx in (-1, 1):
        for sz in (-1, 1):
            cyl(W, sx * 2.45, sz * 2.45, .32, .05, TOP, 16)

    # 5-7 glazing, rooms, ceilings, cores, lobby portal
    floors = [(0, LOBBY)] + [(LOBBY + i * HF, HF) for i in range(FLOORS)]
    for fi, (y0, h) in enumerate(floors):
        ya, yb = y0 + SLAB_T, y0 + h
        for side in range(4):
            (n, t) = SIDES[side]
            for i in range(1, 5):  # 5 bays: the end posts are the corner columns
                u = -HW / 2 + i * HW / 5
                x, z = at(side, u, FACE)
                obox(W, (x, (ya + yb) / 2, z), (.06, h - SLAB_T + .12, .06), t, n)
            x, z = at(side, 0, FACE)
            obox(W, (x, yb - .05, z), (HW, .07, .07), t, n)  # head rail
            o = lambda u, d, y, s=side: (at(s, u, d)[0], y, at(s, u, d)[1])
            plane(P, [o(-HW / 2, FACE, ya), o(HW / 2, FACE, ya), o(HW / 2, FACE, yb), o(-HW / 2, FACE, yb)], (n[0], 0, n[1]))
            wall = FACE - .25
            plane(R, [o(-wall, wall, ya), o(wall, wall, ya), o(wall, wall, yb), o(-wall, wall, yb)], (-n[0], 0, -n[1]))
        plane(L, [(-2.2, yb - .02, -2.2), (2.2, yb - .02, -2.2), (2.2, yb - .02, 2.2), (-2.2, yb - .02, 2.2)], (0, -1, 0))
        for z in (-1.7, 1.7):
            obox(G, (0, yb - .032, z), (3.0, .03, .12))
        if 1 <= fi <= FLOORS - 1:  # warm core (the top floor has the white core cylinder instead)
            obox(R, (-.9, ya + (HF - .3) / 2, .9), (1.2, HF - .3, 1.2))
    # 7 lobby portal on +X
    px = FACE + .1 - .09
    for z in (-.9, .9):
        obox(W, (px, (SLAB_T + 3.0) / 2, z), (.18, 3.0 - SLAB_T, .18), (0, 1), (1, 0))
    obox(W, (px, 3.09, 0), (2.0, .18, .18), (0, 1), (1, 0))
    obox(G, (px, 2.985, 0), (1.6, .05, .06), (0, 1), (1, 0))

    # 8 lift tube
    lx, lz = 3.3, -1.8
    lift = lambda k, w=1.2: rrect_pts(lx, lz, w / 2, w / 2, (.25,) * 4, 4, k)
    sweep(P, lift, [(0, .02), (0, TOP + .4)], caps=(False, False), want=lambda c: (c[0] - lx, 0, c[2] - lz))
    for dx in (-1, 1):
        for dz in (-1, 1):
            if dx > 0:
                cyl(A, lx + dx * .52, lz + dz * .52, .05, .02, TOP + .45, 8)
            else:
                cyl(W, lx + dx * .52, lz + dz * .52, .06, .02, TOP + .45, 8)
    for y in slab_y:
        c = max(y + SLAB_T / 2, .17)
        sweep(W, lift, ring_section(-.05, -.005, c - .05, c + .05), caps=(False, False), closed=True)
    for y in slab_y[::3]:
        obox(W, (2.7, max(y + SLAB_T / 2, .17), lz), (.5, .12, .16))
    sweep(W, lambda k: rrect_pts(lx, lz, .65, .65, (.3,) * 4, 4, k), [(0, TOP + .4), (0, TOP + .6)])

    # 9 sky terraces
    for i in TERRACE_FLOORS:
        y0 = LOBBY + i * HF
        sweep(W, lambda k: rrect_pts(3.2, 1.1, .6, 1.5, (.4, 0, 0, .4), 4, k), slab_section(y0 + .02, y0 + .16, .05))
        b = y0 + .15
        trough = lambda k: rrect_pts(3.61, 1.1, .15, 1.3, (.12,) * 4, 3, k)
        sweep(W, trough, [(.05, b + .22), (.05, b + .3), (0, b + .3), (0, b)])
        sweep(A, trough, ring_section(-.005, .03, b + .295, b + .33), caps=(False, False), closed=True)

    # 10 crown
    d1, d0 = TOP + .55, TOP + 1.1
    cyl(W, 0, 0, 3.0, TOP + SLAB_T - .01, d1, 48)
    cyl(W, 0, 0, 3.0, d0, TOP + 1.41, 48)
    tube(P, 0, 0, 2.95, d1, d0, 48)
    tube(R, 0, 0, 2.7, d1, d0, 48, inward=True)
    plane(L, [(-1.8, d0 - .01, -1.8), (1.8, d0 - .01, -1.8), (1.8, d0 - .01, 1.8), (-1.8, d0 - .01, 1.8)], (0, -1, 0))
    for i in range(24):
        a = 2 * math.pi * i / 24
        n = (math.cos(a), math.sin(a))
        obox(W, (2.95 * n[0], (d1 + d0) / 2, 2.95 * n[1]), (.06, d0 - d1 + .04, .06), (-n[1], n[0]), n)
    sweep(W, lambda k: circle_pts(0, 0, 3.5, 48, k), slab_section(TOP + 1.4, TOP + 1.75, .1))
    sweep(W, lambda k: circle_pts(0, 0, 3.2, 48, k), ring_section(0, .1, TOP + 1.73, TOP + 2.0), caps=(False, False), closed=True)
    cyl(W, 0, 0, 1.0, TOP - HF + SLAB_T, TOP + .2, 24)
    return acc


PREVIEW = {"se_white": (.95, .94, .9, 1), "se_amber": (1, .6, .15, 1), "se_room": (.97, .8, .65, 1),
           "se_lamp": (.97, .81, .69, 1), "se_light": (1, .96, .86, 1), "se_pane": (.81, .9, .95, .2)}


def material(name):
    m = bpy.data.materials.new(name)
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = PREVIEW[name]
    bsdf.inputs["Alpha"].default_value = PREVIEW[name][3]
    bsdf.inputs["Roughness"].default_value = .1 if name == "se_pane" else .6
    m.use_backface_culling = True
    if name == "se_pane":
        m.surface_render_method = "BLENDED"
    return m


def finish(name, a):
    me = bpy.data.meshes.new(name)
    me.from_pydata(a.v, [], a.f)
    me.update()
    bm = bmesh.new()
    bm.from_mesh(me)
    thr = math.radians(25)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > thr:
            e.smooth = False
    bm.to_mesh(me)
    bm.free()
    me.materials.append(material(name))
    ob = bpy.data.objects.new("TOWER_HIGH_" + name, me)
    return ob


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = bpy.data.objects.new("ROOT_CONCENTRATION_TOWER_HIGH", None)
    bpy.context.scene.collection.objects.link(root)
    for name, a in build().items():
        ob = finish(name, a)
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = root
    bpy.context.view_layer.update()
    blend = os.path.join(HERE, "concentration-tower-high.blend")
    glb = os.path.join(HERE, "concentration-tower-high.glb")
    bpy.context.preferences.filepaths.save_version = 0  # no .blend1 backup
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in [root, *root.children]:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials="EXPORT", export_animations=False,
                              export_cameras=False, export_lights=False, export_extras=False)
    tris = sum(len(p.vertices) - 2 for ob in root.children for p in ob.data.polygons)
    print("@@BUILD@@", {"tris": tris, "glb_bytes": os.path.getsize(glb), "blend": blend, "glb": glb})


if __name__ == "__main__":
    main()
