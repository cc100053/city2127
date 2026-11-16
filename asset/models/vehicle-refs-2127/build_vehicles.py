"""vehicle-refs-2127: four 2127 vehicles modelled from the owner's reference images in references/*.png (draft, not placed).

blender -b --factory-startup --python-exit-code 1 -P build_vehicles.py -- [personal-trike] [tandem-ev] [autonomous-shuttle] [amphibious-shuttle]
(no names = all four). Each vehicle writes, next to this file:
  <name>.blend  editable parts (body, glass, lights, wheels, interior ...) under the empty ROOT_<NAME>
  <name>.glb    glTF binary of the same parts (Y-up, modifiers applied)
  <name>.png    six-view preview sheet (front 3/4, left side, rear 3/4 / front, rear, right side), EEVEE studio

Contract as car-family-2127: real metres, wheels touching the ground at z = 0 (three.js y = 0), nose toward -Y in Blender
(= +Z in three.js), centre line x = 0, +X is the vehicle's left (kerb side in Japan). Material roles: car_body, car_accent,
car_trim, car_glass (+ car_glass_dark), car_head, car_tail, car_light, car_interior, car_seat, car_tire, car_rim, car_metal.
Positions in this file are written P(x, f, h): f forward (+ = nose), h height.
"""
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
TAU = 2 * math.pi
M = {}      # role -> material of the vehicle being built
OBJS = []   # parts of the vehicle being built


def P(x, f, h):
    return Vector((x, -f, h))


def xfh(v):
    return v.x, -v.y, v.z


def smooth01(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- materials and objects

def mat(role, rgb, rough=.45, metal=0., alpha=1., emit=0., double=False):
    m = bpy.data.materials.new(role)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Alpha"].default_value = alpha
    if emit:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = (*rgb, alpha)
    m.use_backface_culling = not double
    if alpha < 1:
        m.surface_render_method = "BLENDED"
    M[role] = m
    return m


def finish(ob, sharp=35):
    me = ob.data
    if sharp is None:
        me.shade_flat()
    else:
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(sharp))
    return ob


def emit(name, bm, role, sharp=35, keep=True, recalc=True):
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(M[role])
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    finish(ob, sharp)
    if keep:
        OBJS.append(ob)
    return ob


def drop(ob):
    if ob in OBJS:
        OBJS.remove(ob)
    me = ob.data
    bpy.data.objects.remove(ob)
    if me and me.users == 0:
        bpy.data.meshes.remove(me)


def join(name, obs, sharp=35):
    """Merge parts into one object, keeping each part's material."""
    mats, bm = [], bmesh.new()
    for o in obs:
        me = o.data
        for p in me.polygons:
            m = me.materials[p.material_index]
            if m not in mats:
                mats.append(m)
            p.material_index = mats.index(m)
        bm.from_mesh(me)
    for o in obs:
        drop(o)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    OBJS.append(ob)
    return finish(ob, sharp)


# ---------------------------------------------------------------- primitives

def rbox(name, c, size, bevel, role, segs=3, rot=None, keep=True, sharp=35):
    """Rounded box: c = P(...), size = (x width, f length, h height)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.verts) + list(bm.edges), offset=min(bevel, min(size) * .49), offset_type="OFFSET",
                        segments=segs, profile=.5, affect="EDGES", clamp_overlap=True)
    if rot:
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Euler(rot).to_matrix())
    bmesh.ops.translate(bm, verts=bm.verts, vec=c)
    return emit(name, bm, role, sharp, keep)


def ellipsoid(name, c, r, role, u=40, v=24, deform=None, keep=True, cuts=()):
    """r = (x, f, h) radii; deform(unit Vector) -> world Vector replaces the plain scale.
    cuts = [(point, normal)] planes (Blender axes) the surface is split along, so painted regions get clean edges."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=1.0)
    for vt in bm.verts:
        u_ = vt.co.copy()
        vt.co = deform(u_) if deform else c + Vector((u_.x * r[0], u_.y * r[1], u_.z * r[2]))
    for co, no in cuts:
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), dist=1e-5, plane_co=co, plane_no=no)
    return emit(name, bm, role, 60, keep)


def h_cut(h):
    return (Vector((0, 0, h)), Vector((0, 0, 1)))


def f_cut(f):
    return (P(0, f, 0), Vector((0, 1, 0)))


def x_cut(x):
    return (Vector((x, 0, 0)), Vector((1, 0, 0)))


def lathe(name, prof, c, axis, role, segs=32, closed=True, a0=0.0, a1=TAU, caps=False, keep=True, sharp=40):
    """Revolve prof [(radius, along-axis)] about `axis` through c. Angle 0 points to local +Y after the axis turn."""
    rmat = Vector((1, 0, 0)).rotation_difference(Vector(axis).normalized()).to_matrix()
    full = abs(a1 - a0 - TAU) < 1e-6
    n = segs if full else segs + 1
    bm = bmesh.new()
    rings = []
    for r, a in prof:
        ring = []
        for i in range(n):
            t = a0 + (a1 - a0) * i / segs
            ring.append(bm.verts.new(c + rmat @ Vector((a, r * math.cos(t), r * math.sin(t)))))
        rings.append(ring)
    k_max = len(rings) if closed else len(rings) - 1
    for k in range(k_max):
        A, Bv = rings[k], rings[(k + 1) % len(rings)]
        for i in range(segs):
            j = (i + 1) % n
            bm.faces.new((A[i], A[j], Bv[j], Bv[i]))
    if caps and not full:
        bm.faces.new([rg[0] for rg in rings])
        bm.faces.new([rg[-1] for rg in rings])
    if caps and full and not closed:
        bm.faces.new(rings[0])
        bm.faces.new(rings[-1])
    return emit(name, bm, role, sharp, keep)


def cylinder(name, c, r, depth, axis, role, segs=32, keep=True, r2=None):
    r2 = r if r2 is None else r2
    return lathe(name, [(r, -depth / 2), (r2, depth / 2)], c, axis, role, segs, closed=False, caps=True, keep=keep)


def torus(name, c, R, r, axis, role, segs=40, tube_segs=12, a0=0.0, a1=TAU):
    prof = [(R + r * math.cos(TAU * i / tube_segs), r * math.sin(TAU * i / tube_segs)) for i in range(tube_segs)]
    return lathe(name, prof, c, axis, role, segs, closed=True, a0=a0, a1=a1, caps=abs(a1 - a0 - TAU) > 1e-6, sharp=80)


def tube(name, pts, r, role, cyclic=False, res=3, keep=True):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = res
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, v in zip(sp.points, pts):
        p.co = (v.x, v.y, v.z, 1)
    sp.use_cyclic_u = cyclic
    tmp = bpy.data.objects.new("tmp_curve", cu)
    bpy.context.scene.collection.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    me.materials.clear()
    me.materials.append(M[role])
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if keep:
        OBJS.append(ob)
    return finish(ob, 70)


def plan(hw, ff, fr, rf, rr, n=8):
    """Rounded-rect plan outline [(x, f)], counter-clockwise, 4 (n + 1) points: front corners rf, rear corners rr."""
    rf, rr = min(rf, hw - 1e-3), min(rr, hw - 1e-3)
    pts = []
    for cx, cf, r, a0 in ((hw - rf, ff - rf, rf, 0), (-(hw - rf), ff - rf, rf, 90), (-(hw - rr), fr + rr, rr, 180), (hw - rr, fr + rr, rr, 270)):
        for j in range(n + 1):
            a = math.radians(a0 + 90 * j / n)
            pts.append((cx + r * math.cos(a), cf + r * math.sin(a)))
    return pts


def loft(name, rings, role, caps=True, keep_face=None, sharp=40, keep=True):
    """rings = [(h, [(x, f), ...])] bottom to top, same point count. keep_face(x, f, h) filters an open band."""
    bm = bmesh.new()
    vs = [[bm.verts.new(P(x, f, h)) for x, f in pts] for h, pts in rings]
    for a, b in zip(vs, vs[1:]):
        m = len(a)
        for i in range(m):
            j = (i + 1) % m
            if keep_face:
                c = (a[i].co + a[j].co + b[i].co + b[j].co) / 4
                if not keep_face(*xfh(c)):
                    continue
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if caps:
        bm.faces.new(vs[0])
        bm.faces.new(vs[-1])
        return emit(name, bm, role, sharp, keep)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.normal_update()
    for fc in bm.faces:  # open band: every face looks away from the vertical centre axis
        c = fc.calc_center_median()
        if fc.normal.dot(Vector((c.x, c.y, 0))) < 0:
            fc.normal_flip()
    return emit(name, bm, role, sharp, keep, recalc=False)


def catmull(table, h):
    """Smooth interpolation of rows (h, a, b, ...) at height h."""
    hs = [r[0] for r in table]
    if h <= hs[0]:
        return list(table[0][1:])
    if h >= hs[-1]:
        return list(table[-1][1:])
    i = max(k for k in range(len(hs) - 1) if hs[k] <= h)
    p0, p1, p2, p3 = table[max(i - 1, 0)], table[i], table[i + 1], table[min(i + 2, len(table) - 1)]
    u = (h - p1[0]) / (p2[0] - p1[0])
    out = []
    for k in range(1, len(p1)):
        m1 = (p2[k] - p0[k]) / max(p2[0] - p0[0], 1e-6) * (p2[0] - p1[0])
        m2 = (p3[k] - p1[k]) / max(p3[0] - p1[0], 1e-6) * (p2[0] - p1[0])
        v = ((2 * u ** 3 - 3 * u ** 2 + 1) * p1[k] + (u ** 3 - 2 * u ** 2 + u) * m1 + (-2 * u ** 3 + 3 * u ** 2) * p2[k] + (u ** 3 - u ** 2) * m2)
        out.append(min(max(v, min(p1[k], p2[k])), max(p1[k], p2[k])))
    return out


def dense_heights(table, sub=3):
    hs = []
    for a, b in zip(table, table[1:]):
        hs += [a[0] + (b[0] - a[0]) * i / sub for i in range(sub)]
    return hs + [table[-1][0]]


def boolean(ob, cutters, op="DIFFERENCE"):
    for c in cutters:
        mod = ob.modifiers.new("bool", "BOOLEAN")
        mod.operation = op
        mod.solver = "EXACT"
        mod.object = c
        mod.material_mode = "TRANSFER"
        c.hide_render = True
        c.hide_viewport = True
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)
    for c in cutters:
        drop(c)
    return finish(ob)


def paint(ob, rule):
    """rule(x, f, h, normal, current role) -> role or None."""
    me = ob.data
    idx = {m.name: i for i, m in enumerate(me.materials)}
    for p in me.polygons:
        cur = me.materials[p.material_index].name
        x, f, h = xfh(p.center)
        role = rule(x, f, h, p.normal, cur)
        if role and role != cur:
            if role not in idx:
                me.materials.append(M[role])
                idx[role] = len(me.materials) - 1
            p.material_index = idx[role]


def dense(pts, step=.025):
    out = []
    for a, b in zip(pts, pts[1:]):
        n = max(1, int((b - a).length / step))
        out += [a.lerp(b, i / n) for i in range(n)]
    return out + [pts[-1]]


def proj(target, pts, d, off=.004):
    """Drop points onto target's surface along direction d (Blender axes), lifted off along the normal."""
    d = Vector(d).normalized()
    out = []
    for p in pts:
        ok, loc, nor, _ = target.ray_cast(p - d * 20, d)
        if ok:
            out.append(loc + nor * off)
    return out


FRONT, REAR, FROM_LEFT, FROM_RIGHT = (0, 1, 0), (0, -1, 0), (-1, 0, 0), (1, 0, 0)  # ray directions toward the body


# ---------------------------------------------------------------- wheel

def wheel(tag, c, r, w, side, style="disc", accent=None, tread=False):
    """Tyre + rim about an X axle at c. side +1/-1: the rim face looks toward +X/-X."""
    ri = r * (.60 if style == "offroad" else .66)
    s = min(w * .28, r * .2)
    prof = [(ri, -w / 2 + .012), (ri + (r - s - ri) * .5, -w / 2 - .004)]
    prof += [(r - s + s * math.sin(math.radians(a)), -w / 2 + s - s * math.cos(math.radians(a))) for a in (0, 30, 60, 90)]
    prof += [(r - s + s * math.sin(math.radians(a)), w / 2 - s + s * math.cos(math.radians(a))) for a in (90, 120, 150, 180)]
    prof += [(ri + (r - s - ri) * .5, w / 2 + .004), (ri, w / 2 - .012)]
    parts = [lathe(f"{tag}_tyre", prof, c, (side, 0, 0), "car_tire", 40, closed=True, sharp=50)]
    face = w / 2 - .02
    rim = [(ri * 1.01, -w / 2 + .03), (ri * 1.01, face - .01), (ri * .93, face), (ri * .55, face - .025), (ri * .22, face - .01), (ri * .16, face + .005)]
    parts.append(lathe(f"{tag}_rim", rim, c, (side, 0, 0), "car_rim", 40, closed=False, caps=True, sharp=50))
    out = Vector((side, 0, 0))
    if style == "aero":
        ring = [c + out * (face + .004) + Vector((0, ri * .88 * math.cos(TAU * i / 48), ri * .88 * math.sin(TAU * i / 48))) for i in range(48)]
        parts.append(tube(f"{tag}_ring", ring, .009, accent or "car_light", cyclic=True))
        for k in range(5):
            a = TAU * k / 5
            parts.append(rbox(f"{tag}_fin{k}", c + out * (face - .012) + Vector((0, ri * .45 * math.cos(a), ri * .45 * math.sin(a))),
                              (.012, ri * .55, .035), .006, "car_trim", rot=(a + .5, 0, 0)))
    elif style in ("spoke", "offroad"):
        n = 5 if style == "spoke" else 6
        for k in range(n):
            a = TAU * k / n + .3
            parts.append(rbox(f"{tag}_spoke{k}", c + out * (face - .006) + Vector((0, ri * .52 * math.cos(a), ri * .52 * math.sin(a))),
                              (.02, ri * .62, ri * .16), .008, accent or "car_metal", rot=(a, 0, 0)))
    parts.append(cylinder(f"{tag}_hub", c + out * (face - .005), ri * .22, .03, (side, 0, 0), "car_trim", 24))
    if tread:
        n = 30
        for k in range(n):
            a = TAU * (k + .5) / n
            off = .2 if k % 2 else -.2  # staggered lugs
            parts.append(rbox(f"{tag}_lug{k}", c + Vector((off * w, (r + .012) * math.cos(a), (r + .012) * math.sin(a))),
                              (w * .5, .07, .04), .01, "car_tire", segs=1, rot=(a, 0, 0)))
    return join(tag, parts, 50)


# ---------------------------------------------------------------- studio preview

def bounds(objs):
    pts = [o.matrix_world @ Vector(v) for o in objs if o.type == "MESH" for v in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def preview(name, out_png, tile=(800, 534), floor_z=0., floor_half=60.):
    """floor_z / floor_half: studio floor height and half size (ship-refs-2127 puts it under the keel)."""
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 48
    scene.render.resolution_x, scene.render.resolution_y = tile
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("studio")
    scene.world = world
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (.72, .73, .75, 1)
    bg.inputs[1].default_value = 1.0
    sun = bpy.data.objects.new("key", bpy.data.lights.new("key", "SUN"))
    sun.data.energy = 3.0
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(40), 0, math.radians(150))
    scene.collection.objects.link(sun)
    me = bpy.data.meshes.new("floor")
    s, z = floor_half, floor_z
    me.from_pydata([(-s, -s, z), (s, -s, z), (s, s, z), (-s, s, z)], [], [(0, 1, 2, 3)])
    floor = bpy.data.objects.new("floor", me)
    scene.collection.objects.link(floor)
    fm = bpy.data.materials.new("floor")
    fb = next(n for n in fm.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    fb.inputs["Base Color"].default_value = (.62, .62, .63, 1)
    fb.inputs["Roughness"].default_value = .8
    me.materials.append(fm)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.lens = 50
    lo, hi = bounds(OBJS)
    centre = (lo + hi) / 2
    radius = (hi - lo).length / 2
    views = [("front34", (.62, .72, .26)), ("left", (1, 0, .1)), ("rear34", (-.62, -.72, .26)),
             ("front", (0, 1, .1)), ("rear", (0, -1, .1)), ("right", (-1, 0, .1))]
    tmp = bpy.app.tempdir
    paths = []
    for tag, (dx, df, dh) in views:
        d = P(dx, df, dh).normalized()
        cam.location = centre + d * radius * 3.55
        cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
        path = os.path.join(tmp, f"{name}-{tag}.png")
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        paths.append(path)
    sheet(paths, 3, out_png)


def sheet(paths, cols, out):
    imgs = [bpy.data.images.load(p) for p in paths]
    w, h = imgs[0].size
    rows = math.ceil(len(imgs) / cols)
    big = np.ones((rows * h, cols * w, 4), np.float32)
    for i, im in enumerate(imgs):
        a = np.empty(w * h * 4, np.float32)
        im.pixels.foreach_get(a)
        r, cc = divmod(i, cols)
        y0 = (rows - 1 - r) * h
        big[y0:y0 + h, cc * w:(cc + 1) * w] = a.reshape(h, w, 4)
    out_im = bpy.data.images.new("sheet", cols * w, rows * h, alpha=False)
    out_im.pixels.foreach_set(big.ravel())
    out_im.filepath_raw = out
    out_im.file_format = "PNG"
    out_im.save()


# ---------------------------------------------------------------- vehicles

def personal_trike():
    """Green-white egg cabin, one seat, two front wheels on outboard arms, one rear wheel under the tail. 2.3 x 1.3 x 1.65 m."""
    mat("car_body", (.84, .80, .71), .42)
    mat("car_accent", (.36, .46, .34), .45)
    mat("car_trim", (.03, .03, .035), .3)
    mat("car_glass", (.78, .84, .86), .04, alpha=.18, double=True)
    mat("car_glass_dark", (.08, .09, .10), .1, alpha=.7, double=True)
    mat("car_head", (1, .97, .9), .3, emit=8)
    mat("car_tail", (1, .1, .06), .3, emit=6)
    mat("car_interior", (.20, .20, .21), .7)
    mat("car_seat", (.78, .74, .65), .9)
    mat("car_tire", (.035, .035, .038), .8)
    mat("car_rim", (.84, .80, .71), .4)
    mat("car_metal", (.30, .31, .33), .35, metal=.7)
    mat("car_paper", (.62, .47, .30), .8)
    mat("car_leaf", (.20, .45, .16), .7)

    cf, ch, rx, rf, rh = -.02, .92, .56, 1.0, .73

    def egg(u):
        uf = -u.y
        x = u.x * rx * (1 + .08 * -uf)
        h = u.z * rh * (1 + .04 * -uf)
        f = uf * rf
        if uf > 0:
            f += .16 * uf * max(0., .2 - u.z)   # blunt, near-vertical green face below the windscreen
            f -= .10 * uf * max(0., u.z)       # the canopy leans back
        hh = ch + h
        if hh < .34:
            hh = .34 - (.34 - hh) * .45
        return P(x, cf + f, hh)

    # region edges: canopy (h .98, f -.02) with a black rim, door window (f -.68..-.16, h .86..1.44) with a frame,
    # dark roof strip (|x| < .2), green face below the diagonal f - .476 h = .083, green belly and tail
    cuts = [h_cut(h) for h in (.36, .62, .825, .86, .935, .98, 1.44, 1.475, 1.52)]
    cuts += [f_cut(f) for f in (-.715, -.68, -.16, -.125, -.08, -.02, -.72)] + [x_cut(.2), x_cut(-.2)]
    cuts.append((P(0, .0834, 0), Vector((0, -1, -.476)).normalized()))
    body = ellipsoid("trike_body", None, None, "car_body", 96, 64, deform=egg, cuts=cuts)
    body.data.materials[0].use_backface_culling = False  # the cabin is seen from inside through the glass

    def rule(x, f, h, n, cur):
        if f > -.02 and h > .98:
            return "car_glass_dark" if (abs(x) < .2 and h > 1.52) else "car_glass"
        side = abs(x) > .3
        if side and -.68 < f < -.16 and .86 < h < 1.44:
            return "car_glass"
        if (f > -.08 and h > .935) or (side and -.715 < f < -.125 and .825 < h < 1.475):
            return "car_trim"
        if h < .36 or (h < .935 and f - .476 * h > .0834) or (f < -.72 and h < .62):
            return "car_accent"
        return None

    paint(body, rule)

    # lamps: the smile bar, two short DRLs, rear lamps on the tail shoulders
    smile = [P(x, 0, .80 + .06 * (x / .3) ** 2) for x in np.linspace(-.30, .30, 25)]
    tube("trike_headbar", proj(body, smile, FRONT, .008), .013, "car_head")
    for s in (-1, 1):
        tube(f"trike_drl{s:+d}", proj(body, [P(s * .2, 0, .47), P(s * .2, 0, .58)], FRONT, .008), .011, "car_head")
        tail = [P(s * x, 0, .98 - .05 * (x - .1)) for x in np.linspace(.12, .40, 12)]
        tube(f"trike_tail{s:+d}", proj(body, tail, REAR, .008), .013, "car_tail")
        hit = proj(body, [P(0, -.66, .92)], FROM_LEFT if s > 0 else FROM_RIGHT, .012)[0]
        rbox(f"trike_handle{s:+d}", hit, (.03, .15, .035), .012, "car_body")
    wiper = [P(.10 - .26 * t, 0, 1.00 + .34 * t) for t in np.linspace(0, 1, 10)]
    tube("trike_wiper", proj(body, wiper, FRONT, .012), .006, "car_trim")

    # front wheels on outboard arms under green fenders; the rear wheel inside a tail pod
    for s in (-1, 1):
        c = P(s * .60, .64, .26)
        wheel(f"trike_wheel_front{s:+d}", c, .26, .14, s, "disc")
        prof = [(.295, -.10), (.335, -.10), (.345, 0), (.335, .10), (.295, .10)]
        lathe(f"trike_fender{s:+d}", prof, c, (1, 0, 0), "car_accent", 28, closed=True, a0=math.radians(20), a1=math.radians(178), caps=True)
        tube(f"trike_arm_up{s:+d}", [P(s * .18, .68, .40), P(s * .52, .64, .31)], .022, "car_metal")
        tube(f"trike_arm_lo{s:+d}", [P(s * .18, .60, .28), P(s * .52, .64, .21)], .022, "car_metal")
        cylinder(f"trike_knuckle{s:+d}", P(s * .52, .64, .26), .035, .16, (0, 0, 1), "car_metal", 16)
    wheel("trike_wheel_rear", P(0, -.78, .25), .25, .15, 1, "disc")
    ellipsoid("trike_tail_pod", P(0, -.78, .41), (.17, .31, .22), "car_accent", 32, 16)

    # cabin: floor, seat, dash, steering wheel, shopping basket
    rbox("trike_floor", P(0, -.12, .35), (.70, 1.30, .04), .015, "car_interior")
    rbox("trike_seat_base", P(0, -.32, .47), (.30, .36, .22), .03, "car_interior")
    rbox("trike_seat", P(0, -.32, .62), (.50, .50, .13), .05, "car_seat")
    rbox("trike_backrest", P(0, -.60, .96), (.48, .12, .56), .05, "car_seat", rot=(math.radians(-12), 0, 0))
    rbox("trike_headrest", P(0, -.66, 1.31), (.28, .10, .16), .04, "car_seat", rot=(math.radians(-12), 0, 0))
    rbox("trike_dash", P(0, .64, .80), (.60, .26, .16), .06, "car_interior")
    tube("trike_column", [P(0, .62, .84), P(0, .40, 1.00)], .025, "car_trim")
    torus("trike_steering", P(0, .38, 1.02), .15, .018, (0, .55, .85), "car_trim", 32, 8)
    rbox("trike_basket", P(0, -.86, .84), (.40, .18, .20), .03, "car_seat")
    rbox("trike_bag", P(.05, -.86, 1.0), (.18, .11, .20), .02, "car_paper")
    ellipsoid("trike_greens", P(.08, -.86, 1.12), (.06, .05, .07), "car_leaf", 12, 8)


def tandem_ev():
    """Low narrow silver-blue two-seater, seats one behind the other under a long bubble canopy. 3.6 x 1.44 x 1.47 m."""
    mat("car_body", (.60, .62, .66), .26, metal=.75)
    mat("car_trim", (.02, .025, .03), .15)
    mat("car_glass", (.62, .68, .78), .03, alpha=.2, double=True)
    mat("car_glass_dark", (.05, .06, .09), .08, alpha=.75, double=True)
    mat("car_head", (.85, .92, 1), .3, emit=8)
    mat("car_tail", (1, .08, .06), .3, emit=6)
    mat("car_light", (.10, .25, 1), .3, emit=6)
    mat("car_interior", (.10, .11, .13), .6)
    mat("car_seat", (.74, .75, .77), .9)
    mat("car_seat_accent", (.10, .18, .55), .5)
    mat("car_tire", (.03, .03, .035), .8)
    mat("car_rim", (.10, .11, .13), .35, metal=.5)

    body = rbox("tandem_body", P(0, -.05, .47), (1.16, 3.30, .52), .2, "car_body", segs=5)
    parts = [ellipsoid("n", P(0, 1.30, .50), (.60, .50, .30), "car_body", keep=False),
             ellipsoid("rc", P(0, -1.42, .78), (.62, .42, .46), "car_body", keep=False)]
    for s in (-1, 1):
        parts += [ellipsoid("fp", P(s * .52, 1.22, .52), (.20, .58, .38), "car_body", keep=False),
                  ellipsoid("rp", P(s * .52, -1.30, .54), (.20, .55, .40), "car_body", keep=False)]
    boolean(body, parts, "UNION")
    cuts = [rbox("well", P(0, -.12, .86), (1.02, 2.62, .80), .14, "car_interior", keep=False)]
    for s in (-1, 1):
        for f in (1.22, -1.30):
            cuts.append(cylinder("arch", P(s * .725, f, .32), .37, .65, (1, 0, 0), "car_trim", 40, keep=False))
    boolean(body, cuts)

    def rule(x, f, h, n, cur):
        if cur != "car_body":
            return None
        if f > 1.48 and .30 < h < .60 and abs(x) < .42:
            return "car_trim"
        if abs(x) > .5 and abs(n.x) > .5 and -.85 < f < .75 and .26 < h < .42 + (f + .85) * .07:
            return "car_trim"
        return None

    paint(body, rule)

    def canopy(u):
        f = -.15 + u.y * -1.60   # f -1.75 .. 1.45: ends inside the rear cap
        h = .73 + u.z * .74
        if f > 0:
            h = .73 + (h - .73) * (1 - .2 * (f / 1.45) ** 2)
        return P(u.x * .60, f, h)

    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=40, radius=1.0)
    for v in bm.verts:
        v.co = canopy(v.co.copy())
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), plane_co=(0, 0, .735), plane_no=(0, 0, 1), clear_inner=True)
    glass = emit("tandem_canopy", bm, "car_glass", 60)
    paint(glass, lambda x, f, h, n, cur: "car_glass_dark" if h > 1.36 or f < -1.55 else None)
    rim = [P(.60 * math.cos(a), -.15 + 1.60 * math.sin(a), .74) for a in np.linspace(0, TAU, 97)[:-1]]
    tube("tandem_canopy_rim", rim, .022, "car_trim", cyclic=True)

    bar = [P(x, 0, .63 + .06 * (x / .52) ** 2) for x in np.linspace(-.52, .52, 33)]
    tube("tandem_headbar", proj(body, bar, FRONT, .006), .012, "car_head")
    tail = [P(x, 0, 1.0) for x in np.linspace(-.46, .46, 25)]
    tube("tandem_tailbar", proj(body, tail, REAR, .006), .013, "car_tail")
    for s in (-1, 1):
        line = [P(s * 1, f, .43 + (f + .85) * .07) for f in np.linspace(-.85, .75, 30)]
        tube(f"tandem_sideglow{s:+d}", proj(body, line, FROM_LEFT if s > 0 else FROM_RIGHT, .006), .01, "car_light")
        for f in (1.22, -1.30):
            wheel(f"tandem_wheel{'F' if f > 0 else 'R'}{s:+d}", P(s * .56, f, .32), .32, .20, s, "aero", "car_light")

    for f in (.30, -.80):
        k = "front" if f > 0 else "rear"
        rbox(f"tandem_seatbase_{k}", P(0, f, .50), (.36, .40, .10), .02, "car_interior")
        rbox(f"tandem_seat_{k}", P(0, f, .60), (.46, .46, .12), .05, "car_seat")
        rbox(f"tandem_back_{k}", P(0, f - .28, .95), (.44, .10, .64), .05, "car_seat", rot=(math.radians(-10), 0, 0))
        rbox(f"tandem_shell_{k}", P(0, f - .34, .95), (.48, .05, .68), .03, "car_seat_accent", rot=(math.radians(-10), 0, 0))
    rbox("tandem_dash", P(0, 1.00, .80), (.78, .30, .10), .04, "car_interior")
    tube("tandem_dashglow", [P(x, 1.15, .86) for x in np.linspace(-.36, .36, 12)], .006, "car_light")
    tube("tandem_column", [P(0, .98, .84), P(0, .80, .95)], .022, "car_trim")
    yoke = [P(.17 * math.cos(a), .78, .99 + .09 * math.sin(a)) for a in np.linspace(0, TAU, 41)[:-1]]
    tube("tandem_yoke", yoke, .018, "car_trim", cyclic=True)


def autonomous_shuttle():
    """Boxy cream-teal driverless shuttle: wide sliding door (closed by default), low flat floor, wheelchair bay. 4.6 x 2.1 x 2.72 m."""
    mat("car_body", (.86, .83, .76), .42)
    mat("car_accent", (.26, .48, .46), .45)
    mat("car_trim", (.03, .035, .04), .25)
    mat("car_glass", (.66, .74, .76), .04, alpha=.22, double=True)
    mat("car_head", (.95, .98, 1), .3, emit=8)
    mat("car_tail", (1, .1, .06), .3, emit=6)
    mat("car_light", (.40, .86, .95), .3, emit=5)
    mat("car_interior", (.78, .78, .76), .6)
    mat("car_floor", (.48, .49, .50), .8)
    mat("car_mark", (.92, .93, .94), .6)
    mat("car_seat", (.26, .48, .46), .85)
    mat("car_rail", (.95, .76, .10), .35)
    mat("car_tire", (.03, .03, .035), .8)
    mat("car_rim", (.70, .72, .74), .3, metal=.7)
    mat("car_metal", (.30, .31, .33), .35, metal=.7)

    def front(h):
        return 2.30 - .10 * smooth01((h - 1.2) / 1.3)

    def ring(h, off=0., R=.30, top=2.50, bottom=.30):
        ins = 0.
        if h > top - R:
            ins = R - math.sqrt(max(R * R - (h - (top - R)) ** 2, 0))
        if h < bottom + .12:
            ins = max(ins, .10 * (1 - (h - bottom) / .12) ** 2)
        k = ins - off
        return plan(1.0 - k, front(h) - k, -2.30 + k, max(.32 - ins * .5, .05), max(.32 - ins * .5, .05), 8)

    hs = [.30, .31, .33, .36, .42, .6, .9, 1.2, 1.5, 1.8, 2.05] + [2.20 + .30 * math.sin(math.radians(a)) for a in range(10, 91, 10)]
    body = loft("shuttle_body", [(h, ring(h)) for h in hs], "car_body")
    his = [.36, .6, 1.2, 1.8, 2.05] + [2.20 + .24 * math.sin(math.radians(a)) for a in range(10, 91, 10)]
    inner = loft("inner", [(h, ring(h, -.06, R=.24, top=2.44, bottom=.36)) for h in his], "car_interior", keep=False)
    cuts = [inner, rbox("ws", P(0, 2.30, 1.75), (1.80, .50, .90), .08, "car_trim", keep=False),
            rbox("rw", P(0, -2.30, 1.80), (1.60, .40, .76), .08, "car_trim", keep=False),
            rbox("door", P(1.0, .25, 1.28), (.40, 1.70, 1.80), .05, "car_trim", keep=False)]
    for s in (-1, 1):
        cuts.append(rbox("fw", P(s, 1.62, 1.75), (.40, .62, .90), .08, "car_trim", keep=False))
        cuts.append(rbox("bw", P(s, -1.45 if s > 0 else -1.22, 1.75), (.40, 1.20 if s > 0 else 1.66, .90), .08, "car_trim", keep=False))
        for f in (1.55, -1.55):
            cuts.append(cylinder("arch", P(s * .875, f, .36), .44, .65, (1, 0, 0), "car_trim", 40, keep=False))
    cuts.append(rbox("mw", P(-1, .47, 1.75), (.40, 1.30, .90), .08, "car_trim", keep=False))
    boolean(body, cuts)

    def rule(x, f, h, n, cur):
        if cur != "car_body":
            return None
        if h < .66 or (abs(x) > .9 and min(math.hypot(f - 1.55, h - .36), math.hypot(f + 1.55, h - .36)) < .58):
            return "car_accent"
        if abs(x) > .9 and f < -1.0 and h < 1.08:
            return "car_accent"
        return None

    paint(body, rule)

    # glass: a mid-shell band for the wrap-round windscreen and rear window, flat panes in the side windows
    band = [(h, ring(h, -.03)) for h in np.linspace(1.30, 2.20, 7)]
    loft("shuttle_glass_ends", band, "car_glass", caps=False, keep_face=lambda x, f, h: f > 2.0 or f < -2.0)
    for s, f0, f1 in ((1, 1.31, 1.93), (-1, 1.31, 1.93), (1, -2.05, -.85), (-1, -2.05, -.39), (-1, -.18, 1.12)):
        rbox(f"shuttle_pane{s:+d}_{f0:.1f}", P(s * .97, (f0 + f1) / 2, 1.75), (.012, f1 - f0, .90), .0, "car_glass")
    glass = [o for o in OBJS if o.name.startswith("shuttle_pane") or o.name == "shuttle_glass_ends"]
    join("shuttle_glass", glass, 60)

    # front face: black band with C-shaped lamps and cameras, DRL bars, grille slots; roof lidar and cyan roof-line glow
    fascia = [(h, ring(h, .012)) for h in np.linspace(.96, 1.24, 5)]
    fas = loft("shuttle_fascia", fascia, "car_trim", caps=False, keep_face=lambda x, f, h: f > 1.98)
    for s in (-1, 1):
        c_pts = [P(s * .60, 0, 1.19), P(s * .80, 0, 1.19)] + [P(s * (.80 + .07 * math.sin(a)), 0, 1.10 + .09 * math.cos(a)) for a in np.linspace(0, math.pi, 9)] + [P(s * .60, 0, 1.01)]
        tube(f"shuttle_lamp{s:+d}", proj(fas, dense(c_pts, .02), FRONT, .006), .014, "car_head")
        rbox(f"shuttle_drl{s:+d}", P(s * .80, 2.305, .66), (.045, .03, .24), .015, "car_head")
        rbox(f"shuttle_tail{s:+d}", P(s * .80, -2.305, .98), (.05, .03, .36), .015, "car_tail")
        for k in range(3):
            rbox(f"shuttle_slot{s:+d}{k}", P(s * .45, 2.30, .40 + .045 * k), (.30, .02, .016), .005, "car_trim")
        line = [P(s * 1.004, f, 2.21) for f in np.linspace(-2.0, 2.0, 2)]
        tube(f"shuttle_roofglow{s:+d}", line, .008, "car_light")
    for x in (-.25, 0, .25):
        cylinder(f"shuttle_cam{x:+.2f}", P(x, 2.32, 1.10), .028, .02, (0, -1, 0), "car_glass", 16)
    rbox("shuttle_roofcam", P(0, 2.22, 2.31), (.34, .10, .07), .03, "car_trim", rot=(math.radians(-25), 0, 0))
    cylinder("shuttle_lidar", P(0, 1.70, 2.58), .13, .18, (0, 0, 1), "car_trim", 32)
    cylinder("shuttle_lidar_glow", P(0, 1.70, 2.57), .132, .03, (0, 0, 1), "car_light", 32)
    cylinder("shuttle_lidar_cap", P(0, 1.70, 2.68), .14, .04, (0, 0, 1), "car_body", 32)
    hit = proj(body, [P(0, 1.20, 1.22)], FROM_LEFT, .01)[0]
    cylinder("shuttle_door_button", hit, .05, .02, (1, 0, 0), "car_trim", 24)
    torus("shuttle_door_button_glow", hit + Vector((.012, 0, 0)), .03, .006, (1, 0, 0), "car_light", 24, 6)

    # the sliding door, closed in its opening (f -.60..1.10, h .38..2.18): outer face flush with the body side (x 1.0),
    # inside the .06 wall, a 12 mm seam all round; the teal lower panel (to h 1.08, as on the reference door) continues
    # the rear body band, the window sill (1.30) the side-window line. Rails run aft of the door, where it slides back.
    dx, t, g, band = .98, .04, .012, 1.08
    f0, f1, h0, h1 = -.60 + g, 1.10 - g, .38 + g, 2.18 - g
    fc, fl = (f0 + f1) / 2, f1 - f0
    door = [rbox("d_teal", P(dx, fc, (h0 + band) / 2), (t, fl, band - h0), .015, "car_accent", keep=False),
            rbox("d_low", P(dx, fc, (band + 1.30) / 2), (t, fl, 1.30 - band), .015, "car_body", keep=False),
            rbox("d_mid", P(dx, fc, 1.32), (t, fl, .04), .015, "car_trim", keep=False),
            rbox("d_top", P(dx, fc, (2.13 + h1) / 2), (t, fl, h1 - 2.13), .015, "car_trim", keep=False),
            rbox("d_front", P(dx, f1 - .025, 1.735), (t, .05, .79), .015, "car_trim", keep=False),
            rbox("d_rear", P(dx, f0 + .025, 1.735), (t, .05, .79), .015, "car_trim", keep=False),
            rbox("d_glass", P(dx, fc, 1.735), (.012, fl - .09, .80), 0, "car_glass", keep=False)]
    join("shuttle_door", door)
    tube("shuttle_rail_low", [P(1.012, -2.1, .42), P(1.012, -.66, .42)], .012, "car_metal")
    tube("shuttle_rail_top", [P(1.012, -2.1, 2.19), P(1.012, -.66, 2.19)], .012, "car_metal")
    rbox("shuttle_threshold", P(.985, .25, .37), (.04, 1.66, .012), 0, "car_light")

    for s in (-1, 1):
        for f in (1.55, -1.55):
            wheel(f"shuttle_wheel{'F' if f > 0 else 'R'}{s:+d}", P(s * .78, f, .36), .36, .26, s, "spoke", "car_trim")
            rbox(f"shuttle_well_top{s:+d}{f:+.0f}", P(s * .63, f, .88), (.64, 1.0, .14), .03, "car_interior")
            rbox(f"shuttle_well_wall{s:+d}{f:+.0f}", P(s * .43, f, .62), (.24, 1.0, .52), .03, "car_interior")

    # cabin: floor with the wheelchair bay, fold-down seats, rear bench, yellow grab rails, hand loops, ceiling lights
    rbox("shuttle_floor", P(0, 0, .365), (1.86, 4.36, .012), 0, "car_floor")
    for c, sz in ((P(.30, -.42, .374), (1.14, .03, .004)), (P(.30, .92, .374), (1.14, .03, .004)),
                  (P(-.25, .25, .374), (.03, 1.37, .004)), (P(.85, .25, .374), (.03, 1.37, .004))):
        rbox("shuttle_bay_line", c, sz, 0, "car_mark")
    rbox("shuttle_bay_sign", P(.30, .25, .374), (.34, .34, .004), 0, "car_light")
    for f in (-.18, .32):
        rbox(f"shuttle_fold_seat{f:+.2f}", P(-.70, f, .86), (.42, .44, .08), .03, "car_seat")
        rbox(f"shuttle_fold_back{f:+.2f}", P(-.90, f, 1.22), (.07, .42, .52), .03, "car_seat")
        rbox(f"shuttle_fold_leg{f:+.2f}", P(-.70, f, .61), (.05, .05, .44), .01, "car_metal")
    rbox("shuttle_front_seat", P(.62, 1.55, 1.00), (.44, .46, .10), .03, "car_seat")
    rbox("shuttle_front_back", P(.88, 1.55, 1.30), (.07, .46, .50), .03, "car_seat")
    for s in (-1, 1):
        rbox(f"shuttle_bench{s:+d}", P(s * .45, -1.85, 1.00), (.80, .46, .10), .03, "car_seat")
        rbox(f"shuttle_bench_back{s:+d}", P(s * .45, -2.16, 1.32), (.80, .07, .52), .03, "car_seat")
    for f in (1.10, -.58):
        tube(f"shuttle_pole{f:+.2f}", [P(.86, f, .37), P(.86, f, 2.40)], .018, "car_rail")
    tube("shuttle_pole_mid", [P(-.55, .07, .37), P(-.55, .07, 2.40)], .018, "car_rail")
    tube("shuttle_ceiling_rail", [P(.30, -1.8, 2.30), P(.30, 1.6, 2.30)], .016, "car_rail")
    tube("shuttle_cross_rail", [P(-.85, .07, 2.30), P(.86, .07, 2.30)], .016, "car_rail")
    for f in (-.9, -.3, .5, 1.1):
        tube(f"shuttle_strap{f:+.1f}", [P(.30, f, 2.29), P(.30, f, 2.14)], .008, "car_mark")
        torus(f"shuttle_loop{f:+.1f}", P(.30, f, 2.08), .055, .01, (0, 1, 0), "car_mark", 20, 6)
    for x in (-.45, .45):
        rbox(f"shuttle_ceiling_light{x:+.2f}", P(x, 0, 2.435), (.07, 3.6, .012), 0, "car_light")


def amphibious_shuttle():
    """Orange-white boat-hulled amphibious bus on four off-road wheels, long window band, rails and a life ring. 6.5 x 2.4 x 3.3 m."""
    mat("car_body", (.88, .87, .84), .35)
    mat("car_accent", (.95, .38, .07), .4)
    mat("car_trim", (.03, .035, .04), .3)
    mat("car_glass", (.62, .70, .74), .04, alpha=.22, double=True)
    mat("car_head", (.95, .98, 1), .3, emit=8)
    mat("car_tail", (1, .1, .06), .3, emit=6)
    mat("car_interior", (.80, .80, .79), .6)
    mat("car_floor", (.42, .43, .45), .8)
    mat("car_seat", (.55, .57, .60), .85)
    mat("car_tire", (.035, .035, .04), .85)
    mat("car_rim", (.16, .17, .18), .4, metal=.4)
    mat("car_metal", (.78, .79, .80), .2, metal=.9)
    mat("car_arch", (.12, .12, .13), .6)

    HULL = [(0.62, .78, 2.35, -2.92, .70, .22), (0.70, .95, 2.75, -3.02, .85, .25), (0.85, 1.06, 3.02, -3.10, .95, .28),
            (1.05, 1.12, 3.17, -3.15, 1.0, .30), (1.30, 1.15, 3.24, -3.18, 1.0, .30), (1.50, 1.15, 3.25, -3.18, 1.0, .30),
            (1.56, 1.12, 3.20, -3.16, .95, .30)]
    CABIN = [(1.57, 1.10, 2.72, -3.14, .80, .30), (1.80, 1.10, 2.58, -3.12, .70, .30), (2.20, 1.09, 2.28, -3.10, .62, .30),
             (2.60, 1.07, 1.98, -3.07, .55, .30), (2.74, 1.00, 1.86, -3.02, .50, .28), (2.82, .90, 1.76, -2.95, .45, .25),
             (2.86, .78, 1.68, -2.88, .40, .22)]

    def ring(table, h, off=0.):
        hw, ff, fr, rf, rr = catmull(table, h)
        return plan(hw + off, ff + off, fr - off, max(rf + off, .05), max(rr + off, .05), 10)

    rings = [(h, ring(HULL, h)) for h in dense_heights(HULL, 3)] + [(h, ring(CABIN, h)) for h in dense_heights(CABIN, 3)]
    body = loft("amphibious_body", rings, "car_body")
    INNER = [(1.15, 1.06, 2.64, -3.09, .80, .24), (1.56, 1.06, 2.64, -3.10, .74, .24), (1.80, 1.04, 2.52, -3.06, .64, .24),
             (2.20, 1.03, 2.22, -3.04, .56, .24), (2.60, 1.01, 1.92, -3.01, .49, .24), (2.74, .93, 1.80, -2.96, .44, .22),
             (2.80, .80, 1.70, -2.90, .40, .20)]
    inner = loft("inner", [(h, ring(INNER, h)) for h in dense_heights(INNER, 2)], "car_interior", keep=False)
    cuts = [inner, rbox("ws", P(0, 2.45, 2.15), (1.96, 1.30, .92), .1, "car_trim", keep=False),
            rbox("rw", P(0, -3.08, 2.15), (1.70, .40, .80), .1, "car_trim", keep=False)]
    WIN = [1.15, .25, -.65, -1.55, -2.45]
    for s in (-1, 1):
        for f in WIN:
            cuts.append(rbox("sw", P(s * 1.09, f, 2.15), (.40, .80, .86), .08, "car_trim", keep=False))
        for f in (1.95, -2.05):
            cuts.append(cylinder("arch", P(s * .98, f, .50), .62, .80, (1, 0, 0), "car_arch", 48, keep=False))
    boolean(body, cuts)

    def wave(f):
        return 1.50 if f > 2.6 else 1.32 + .16 * math.cos((f - 2.6) * 1.1)

    def rule(x, f, h, n, cur):
        if cur != "car_body":
            return None
        if abs(x) > .85 and -1.3 < f < 1.25 and h < .93 and abs(n.x) > .3:
            return None  # pale rocker panel between the wheels
        return "car_accent" if h < wave(f) else None

    paint(body, rule)

    band = [(h, ring(CABIN, h, -.03)) for h in np.linspace(1.70, 2.60, 7)]
    loft("amphibious_glass_ends", band, "car_glass", caps=False, keep_face=lambda x, f, h: f > 1.78 or f < -2.98)
    for s in (-1, 1):
        for f in WIN:
            rbox(f"amphibious_pane{s:+d}_{f:+.2f}", P(s * 1.065, f, 2.15), (.012, .80, .86), 0, "car_glass")
    join("amphibious_glass", [o for o in OBJS if o.name.startswith("amphibious_pane") or o.name == "amphibious_glass_ends"], 60)
    belt = [P(x, f, 1.535) for x, f in plan(1.155, 3.255, -3.185, 1.0, .30, 12)]
    tube("amphibious_beltline", belt, .014, "car_metal", cyclic=True)

    # lamps, tow eye, portholes, flares, rails, the life ring, roof radar, antenna and air unit
    bar = [P(x, 0, 1.47 - .04 * (x / 1.0) ** 2) for x in np.linspace(-1.0, 1.0, 41)]
    tube("amphibious_headbar", proj(body, bar, FRONT, .008), .016, "car_head")
    for s in (-1, 1):
        lamp = proj(body, [P(s * .52, 0, 1.40)], FRONT, .01)[0]
        rbox(f"amphibious_lamp{s:+d}", lamp, (.22, .04, .07), .02, "car_head", rot=(0, 0, s * math.radians(-28)))
        tube(f"amphibious_tail{s:+d}", proj(body, [P(s * .98, 0, 1.15), P(s * .98, 0, 1.48)], REAR, .008), .025, "car_tail")
        port = proj(body, [P(0, .75, 1.25)], FROM_LEFT if s > 0 else FROM_RIGHT, .006)[0]
        torus(f"amphibious_port{s:+d}", port, .14, .025, (s, 0, 0), "car_metal", 32, 8)
        cylinder(f"amphibious_port_grille{s:+d}", port, .125, .02, (s, 0, 0), "car_trim", 32)
        for k in range(4):
            rbox(f"amphibious_port_slat{s:+d}{k}", port + Vector((s * .012, 0, -.075 + .05 * k)), (.012, .20, .015), .004, "car_metal")
        for f in (1.95, -2.05):
            prof = [(.62, -.07), (.70, -.07), (.71, .07), (.62, .07)]
            lathe(f"amphibious_flare{s:+d}{f:+.0f}", prof, P(s * 1.10, f, .50), (1, 0, 0), "car_arch", 36, closed=True,
                  a0=math.radians(12), a1=math.radians(168), caps=True)
            wheel(f"amphibious_wheel{'F' if f > 0 else 'R'}{s:+d}", P(s * .93, f, .50), .50, .34, s, "offroad", "car_metal", tread=True)
        bow = [p for p in plan(1.0, 3.08, -3.0, .95, .3, 16) if p[1] > 2.45 and p[0] * s > .35]
        bow.sort(key=lambda p: p[1])
        rail = [P(x, f, 1.88) for x, f in bow]
        tube(f"amphibious_bowrail{s:+d}", rail, .018, "car_metal")
        for x, f in (bow[0], bow[-1]):
            tube(f"amphibious_bowpost{s:+d}{f:.1f}", [P(x, f, 1.57), P(x, f, 1.89)], .016, "car_metal")
        stern = [P(s * 1.17, -2.92, 1.62), P(s * 1.17, -2.92, 1.78), P(s * 1.17, -2.55, 1.78), P(s * 1.17, -2.55, 1.62)]
        tube(f"amphibious_sternrail{s:+d}", stern, .016, "car_metal")
    tow = proj(body, [P(0, 0, 1.30)], FRONT, .0)[0]
    rbox("amphibious_tow_plate", tow, (.20, .03, .10), .015, "car_metal")
    torus("amphibious_tow_eye", tow + Vector((0, -.06, -.02)), .065, .014, (1, 0, 0), "car_metal", 24, 8)
    buoy = P(1.155, -2.62, 2.15)
    torus("amphibious_life_ring", buoy, .21, .055, (1, 0, 0), "car_accent", 40, 12)
    for k in range(4):
        a = math.radians(45 + 90 * k)
        rbox(f"amphibious_ring_band{k}", buoy + Vector((0, .21 * math.cos(a), .21 * math.sin(a))), (.125, .065, .125), .02, "car_body",
             rot=(a, 0, 0))
    cylinder("amphibious_radar_base", P(0, 1.85, 2.95), .16, .22, (0, 0, 1), "car_trim", 32)
    ellipsoid("amphibious_radar_dome", P(0, 1.85, 3.08), (.30, .30, .09), "car_body", 32, 12)
    tube("amphibious_antenna", [P(.55, 1.45, 2.80), P(.55, 1.45, 3.40)], .008, "car_trim")
    rbox("amphibious_air_unit", P(0, -2.05, 2.92), (1.15, .95, .16), .05, "car_body")
    for k in range(6):
        rbox(f"amphibious_air_slat{k}", P(.35, -2.40 + k * .06, 3.005), (.40, .025, .012), .004, "car_trim")

    # cabin: floor, 2 + 1 seat rows, driver station, grab poles, ceiling lights
    rbox("amphibious_floor", P(0, -.2, 1.155), (2.0, 5.6, .012), 0, "car_floor")
    for f in (1.30, .40, -.50, -1.40, -2.30):
        for x in (.80, .36, -.66):
            rbox(f"amphibious_seat_base{x:+.2f}{f:+.1f}", P(x, f, 1.34), (.30, .30, .36), .03, "car_interior")
            rbox(f"amphibious_seat{x:+.2f}{f:+.1f}", P(x, f, 1.58), (.40, .42, .10), .03, "car_seat")
            rbox(f"amphibious_back{x:+.2f}{f:+.1f}", P(x, f - .24, 1.92), (.40, .08, .58), .03, "car_seat", rot=(math.radians(-8), 0, 0))
            rbox(f"amphibious_back_edge{x:+.2f}{f:+.1f}", P(x, f - .27, 2.21), (.40, .09, .04), .015, "car_accent")
    rbox("amphibious_driver", P(-.55, 2.0, 1.58), (.44, .44, .12), .03, "car_seat")
    rbox("amphibious_driver_back", P(-.55, 1.74, 1.92), (.44, .08, .60), .03, "car_seat", rot=(math.radians(-10), 0, 0))
    rbox("amphibious_dash", P(0, 2.30, 1.80), (1.80, .30, .22), .05, "car_trim")
    torus("amphibious_steering", P(-.55, 2.18, 1.98), .18, .02, (0, .6, .8), "car_trim", 32, 8)
    for f in (1.75, .85, -.05, -.95, -1.85):
        tube(f"amphibious_pole{f:+.2f}", [P(.10, f, 1.16), P(.10, f, 2.78)], .018, "car_metal")
    for x in (-.45, .45):
        tube(f"amphibious_ceiling_rail{x:+.2f}", [P(x, -2.6, 2.70), P(x, 1.7, 2.70)], .015, "car_metal")
        rbox(f"amphibious_ceiling_light{x:+.2f}", P(x * .5, -.4, 2.79), (.05, 4.2, .012), 0, "car_head")


VEHICLES = {"personal-trike": personal_trike, "tandem-ev": tandem_ev,
            "autonomous-shuttle": autonomous_shuttle, "amphibious-shuttle": amphibious_shuttle}


def build(name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M.clear()
    OBJS.clear()
    VEHICLES[name]()
    # wheels on the ground: shift every part so the lowest vertex sits at z = 0
    lo = min((o.matrix_world @ v.co).z for o in OBJS for v in o.data.vertices)
    for o in OBJS:
        o.data.transform(Matrix.Translation((0, 0, -lo)))
    root = bpy.data.objects.new("ROOT_" + name.upper().replace("-", "_"), None)
    bpy.context.scene.collection.objects.link(root)
    for o in OBJS:
        o.parent = root
    for m in list(bpy.data.materials):
        if m.users == 0:
            bpy.data.materials.remove(m)
    blend, glb, png = (os.path.join(HERE, f"{name}.{e}") for e in ("blend", "glb", "png"))
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    for o in bpy.context.scene.objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_animations=False, export_cameras=False, export_lights=False, export_extras=False)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in OBJS)
    lo, hi = bounds(OBJS)
    print("@@VEHICLE@@", name, "parts", len(OBJS), "tris", tris, "size_xyz %.2f x %.2f x %.2f" % tuple(hi - lo),
          "ground %.4f" % lo.z, "glb_bytes", os.path.getsize(glb))
    preview(name, png)


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for n in (args or list(VEHICLES)):
        build(n)
