"""Minato's service kiosk for city2127 (targets: artifacts/resident-minato/target/*.jpg, owner-accepted 2026-11-12).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_kiosk.py
Writes kiosk.blend and kiosk.glb next to this file (glTF preset, no Meshopt/Draco).

Real metres at x1.0 (Minato is 1.70 m), origin at the footprint centre on the ground, front (the open counter side) faces Blender -Y
(= three +Z, like the other GLBs). Footprint 2.4 x 1.8 m, height 2.75 m. Nodes (names exact, pivots where the code rotates them):
  kiosk (body: rear and left walls, posts, housing), counter_base, counter_top, canopy (all three replaced in state -1 by glass_room's wide base/top and canopy_wide)
  interior          warm emissive inner faces and a shelf line
  shutter           slatted roll shutter, pivot at its top edge (scale it down to close it; open = scaled to ~0 inside the housing)
  arm_base > arm_upper > arm_fore > arm_grip   robot arm on the counter (state 0)
  glass_room        glazed 1.6 m extension on the right (+X) with the wide base and counter top, and canopy_wide: one roof over both (state -1)
Smooth rounded forms; materials are roles (ksk_*).
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROLES = {  # role: (rgba, roughness, emission rgba, strength)
    "ksk_white": ((.86, .88, .91, 1), .55, None, 0),
    "ksk_kick": ((.12, .13, .16, 1), .8, None, 0),
    "ksk_top": ((.93, .88, .80, 1), .5, None, 0),
    "ksk_slat": ((.30, .33, .38, 1), .6, None, 0),
    "ksk_warm": ((1.0, .62, .25, 1), .9, (1.0, .55, .18, 1), 1.1),
    "ksk_trim": ((.35, .65, 1.0, 1), .5, (.35, .65, 1.0, 1), 1.6),
    "ksk_glass": ((.80, .90, .96, .22), .1, None, 0),
    "ksk_joint": ((.08, .09, .11, 1), .6, None, 0),
}
ORDER = list(ROLES)
FRONT = -1  # front is -Y


def material(name):
    rgba, rough, emit, strength = ROLES[name]
    m = bpy.data.materials.new(name)
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Alpha"].default_value = rgba[3]
    if emit:
        bsdf.inputs["Emission Color"].default_value = emit
        bsdf.inputs["Emission Strength"].default_value = strength
    m.diffuse_color = rgba
    if rgba[3] < 1:
        m.surface_render_method = "BLENDED"
    return m


def rr_points(w, d, r, n=6, cx=0.0, cy=0.0):
    """Rounded-rectangle outline, counter-clockwise, 4*(n+1) points."""
    r = max(min(r, w / 2 - 1e-3, d / 2 - 1e-3), 1e-3)
    pts = []
    for (sx, sy, a0) in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        ox, oy = sx * (w / 2 - r), sy * (d / 2 - r)
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + ox + r * math.cos(a), cy + oy + r * math.sin(a)))
    return pts


class Part:
    def __init__(self, name, parent=None, origin=(0, 0, 0)):
        self.name, self.parent, self.origin = name, parent, Vector(origin)
        self.bm = bmesh.new()
        self.layer = self.bm.faces.layers.int.new("role")

    def tag(self, role):
        for f in self.bm.faces:
            if f[self.layer] == 0:
                f[self.layer] = ORDER.index(role) + 1

    def loft(self, role, rings, caps=True):
        """rings: list of lists of (x, y, z) with the same point count; quads between consecutive rings."""
        vs = [[self.bm.verts.new(Vector(p) - self.origin) for p in ring] for ring in rings]
        for a, b in zip(vs, vs[1:]):
            for i in range(len(a)):
                j = (i + 1) % len(a)
                self.bm.faces.new((a[i], a[j], b[j], b[i]))
        if caps:
            self.bm.faces.new(list(reversed(vs[0])))
            self.bm.faces.new(vs[-1])
        self.tag(role)

    def rprism(self, role, w, d, r, z0, z1, cx=0.0, cy=0.0, profile=None, n=6):
        """Rounded-rectangle prism; `profile` = [(inset, z), ...] bottom to top for soft edges."""
        profile = profile or [(0, z0), (0, z1)]
        rings = [[(x, y, z) for x, y in rr_points(w - 2 * i, d - 2 * i, r - i, n, cx, cy)] for i, z in profile]
        self.loft(role, rings)

    def box(self, role, c, size, bevel=0.0):
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=Matrix.Translation(Vector(c) - self.origin) @ Matrix.Diagonal((*size, 1)))
        if bevel:
            new = [f for f in self.bm.faces if f[self.layer] == 0]
            bmesh.ops.bevel(self.bm, geom=list({e for f in new for e in f.edges}), offset=bevel, segments=2, profile=.5, affect="EDGES", clamp_overlap=True)
        self.tag(role)

    def sphere(self, role, c, r, u=10, v=6):
        bmesh.ops.create_uvsphere(self.bm, u_segments=u, v_segments=v, radius=1.0, matrix=Matrix.Translation(Vector(c) - self.origin) @ Matrix.Diagonal((*r, 1)))
        self.tag(role)

    def limb(self, role, p0, p1, r0, r1=None, u=10):
        p0, p1 = Vector(p0) - self.origin, Vector(p1) - self.origin
        d = p1 - p0
        rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=True, segments=u, radius1=r0, radius2=r1 or r0, depth=d.length, matrix=Matrix.Translation(p0 + d / 2) @ rot)
        self.tag(role)

    def build(self, mats):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        used = sorted({f[self.layer] - 1 for f in self.bm.faces}) if self.bm.faces else []
        for f in self.bm.faces:
            f.material_index = used.index(f[self.layer] - 1)
            f.smooth = True
        thr = math.radians(38)
        for e in self.bm.edges:
            if len(e.link_faces) == 2 and e.calc_face_angle(0) > thr:
                e.smooth = False
        self.bm.to_mesh(me)
        self.bm.free()
        for i in used:
            me.materials.append(mats[i])
        ob = bpy.data.objects.new(self.name, me)
        ob.location = self.origin
        return ob


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = [material(n) for n in ORDER]
    parts = {}

    def node(name, parent=None, origin=(0, 0, 0)):
        p = Part(name, parent, origin)
        parts[name] = p
        return p

    W, D, H = 2.4, 1.8, 2.45
    F = FRONT * D / 2  # front plane y
    CAN0, CAN1 = H - .28, H                      # canopy 0.28 thick
    CT = .95                                     # counter base height; the top slab sits on it (0.04)
    CB = .6                                      # counter depth: the rest of the footprint is the floor Minato stands on
    CY = F + CB / 2                              # counter centre y
    TOP = CT + .04
    prof_base = [(.015, .08), (0, .10), (0, CT - .03), (.015, CT)]
    prof_top = [(0, CT), (0, CT + .03), (.012, TOP)]
    prof_can = [(0, CAN0), (0, CAN1 - .08), (.025, CAN1 - .04), (.065, CAN1)]
    k = node("kiosk")
    cb = node("counter_base", "kiosk")                                                                  # hidden in -1, where the glass room's continuous base replaces it
    cb.rprism("ksk_kick", W - .08, CB - .08, .21, 0, .08, cy=CY)                                         # recessed dark kick
    cb.rprism("ksk_white", W, CB, .25, .08, CT, cy=CY, profile=prof_base)                                  # counter base, soft edges
    t = .09  # wall thickness
    k.box("ksk_white", (-W / 2 + t / 2, 0, (TOP + CAN0) / 2), (t, D - .16, CAN0 - TOP), .02)            # closed left side (the right side is open)
    k.box("ksk_white", (0, -F - t / 2, (TOP + CAN0) / 2), (W - .1, t, CAN0 - TOP), .02)                 # closed rear
    k.box("ksk_white", (-W / 2 + t / 2, 0, (0 + TOP) / 2), (t, D - .16, TOP), .02)                      # left wall down to the floor
    k.box("ksk_white", (0, -F - t / 2, TOP / 2), (W - .1, t, TOP), .02)                                 # rear wall down to the floor
    for x in (-W / 2 + .08, W / 2 - .06):                                                               # slim front corner posts
        k.rprism("ksk_white", .12, .12, .05, TOP, CAN0, cx=x, cy=F + .05, n=3)
    k.box("ksk_white", (0, F + .09, CAN0 - .10), (W - .30, .18, .20), .03)                              # shutter housing under the canopy

    ct = node("counter_top", "kiosk")
    ct.rprism("ksk_top", W + .16, CB + .08, .30, CT, TOP, cy=CY - .04, profile=prof_top)               # counter top slab, 0.08 proud

    cw, cd = W + .30, D + .40
    cn = node("canopy", "kiosk")
    cn.rprism("ksk_white", cw, cd, .34, CAN0, CAN1, cy=FRONT * .05, profile=prof_can, n=7)
    cn.rprism("ksk_trim", cw - .5, .035, .0175, CAN0 - .022, CAN0 + .002, cy=F - .05, n=3)             # cool-blue line under the front edge

    ik = node("interior", "kiosk")
    ik.box("ksk_warm", (0, -F - t - .004, (TOP + CAN0) / 2 + .1), (W - .2, .02, CAN0 - TOP - .2), 0)    # warm back wall
    ik.box("ksk_warm", (-W / 2 + t + .004, 0, (TOP + CAN0) / 2 + .1), (.02, D - .3, CAN0 - TOP - .2), 0)  # warm left wall
    ik.box("ksk_warm", (0, 0, CAN0 - .012), (W - .2, D - .3, .02), 0)                                  # warm ceiling
    ik.box("ksk_top", (0, -F - t - .08, 1.55), (W - .35, .14, .035), .01)                               # a shelf line

    sh = node("shutter", "kiosk", (0, F + .035, CAN0 - .20))                                            # pivot = top edge
    slats, top, bottom = 13, CAN0 - .20, TOP + .03
    step = (top - bottom) / slats
    sh.box("ksk_joint", (0, F + .045, (top + bottom) / 2), (W - .36, .012, top - bottom), 0)             # dark backing: the gaps between slats read dark
    for i in range(slats):
        zc = top - (i + .5) * step
        sh.box("ksk_slat", (0, F + .035, zc), (W - .34, .035, step - .022), .008)
    sh.box("ksk_white", (0, F + .035, bottom - .012), (W - .30, .045, .04), .01)                      # bottom bar

    # robot arm at the counter's left-front corner (state 0): pivots at base, shoulder, elbow, wrist; segments r 0.07, reach about 1.2 m
    AX, AY, AZ = -W / 2 + .3, F + .32, TOP
    ab = node("arm_base", "kiosk", (AX, AY, AZ))
    ab.limb("ksk_white", (AX, AY, AZ), (AX, AY, AZ + .16), .15, .12)
    ab.sphere("ksk_joint", (AX, AY, AZ + .2), (.10, .10, .10))
    au = node("arm_upper", "arm_base", (AX, AY, AZ + .2))
    au.limb("ksk_white", (AX, AY, AZ + .2), (AX, AY, AZ + .72), .07)
    au.sphere("ksk_joint", (AX, AY, AZ + .74), (.09, .09, .09))
    af = node("arm_fore", "arm_upper", (AX, AY, AZ + .74))
    af.limb("ksk_white", (AX, AY, AZ + .74), (AX, AY, AZ + 1.22), .065, .055)
    af.sphere("ksk_joint", (AX, AY, AZ + 1.24), (.075, .075, .075))
    ag = node("arm_grip", "arm_fore", (AX, AY, AZ + 1.24))
    ag.box("ksk_white", (AX, AY, AZ + 1.31), (.16, .07, .07), .015)
    for s in (1, -1):
        ag.box("ksk_joint", (AX + s * .075, AY, AZ + 1.42), (.03, .06, .16), .006)

    # state -1: one continuous building. canopy_wide replaces canopy over kiosk + glass room; the glass room has its own base, wide counter top and glazing.
    gx0, gx1 = W / 2, W / 2 + 1.6
    gcx = (gx0 + gx1) / 2
    x_lo, x_hi = -W / 2 - .15, gx1 + .15
    cwn = node("canopy_wide", "kiosk")
    cwn.rprism("ksk_white", x_hi - x_lo, cd, .34, CAN0, CAN1, cx=(x_lo + x_hi) / 2, cy=FRONT * .05, profile=prof_can, n=7)
    cwn.rprism("ksk_trim", x_hi - x_lo - .5, .035, .0175, CAN0 - .022, CAN0 + .002, cx=(x_lo + x_hi) / 2, cy=F - .05, n=3)
    gl = node("glass_room", "kiosk")
    gl.rprism("ksk_kick", gx1 - gx0 + W - .08 - .0, CB - .08, .21, 0, .08, cx=(-W / 2 + gx1) / 2, cy=CY)  # kick under the whole wide counter
    gl.rprism("ksk_white", gx1 + W / 2, CB, .25, .08, CT, cx=(-W / 2 + gx1) / 2, cy=CY, profile=prof_base) # one continuous counter base across both
    gl.rprism("ksk_top", gx1 + W / 2 + .16, CB + .08, .30, CT, TOP, cx=(-W / 2 + gx1) / 2, cy=CY - .04, profile=prof_top)  # wide counter top
    gz = (TOP + CAN0) / 2
    for x in (gx0 + .55, gx0 + 1.1, gx1 - .05):                                                         # slim mullions on the front
        gl.rprism("ksk_white", .06, .06, .025, TOP, CAN0, cx=x, cy=F + .05, n=3)
    for y in (F + .05, -F - .08):                                                                        # and at the far corners
        gl.rprism("ksk_white", .06, .06, .025, TOP, CAN0, cx=gx1 - .05, cy=y, n=3)
    gl.rprism("ksk_white", .06, .06, .025, TOP, CAN0, cx=gx1 - .05, cy=0, n=3)
    gl.box("ksk_glass", ((gx0 + gx1) / 2, F + .06, gz), (gx1 - gx0 - .06, .012, CAN0 - TOP), 0)         # front glazing, continuous between the mullions
    gl.box("ksk_glass", (gx1 - .05, 0, gz), (.012, D - .2, CAN0 - TOP), 0)                               # far side glazing
    gl.box("ksk_glass", ((gx0 + gx1) / 2, -F - .07, gz), (gx1 - gx0 - .06, .012, CAN0 - TOP), 0)       # back glazing
    gl.box("ksk_warm", ((gx0 + gx1) / 2, -F - .09, gz + .1), (gx1 - gx0 - .3, .02, CAN0 - TOP - .3), 0)  # warm back inside

    root = bpy.data.objects.new("ROOT_KIOSK", None)
    bpy.context.scene.collection.objects.link(root)
    obs = {}
    for name, p in parts.items():
        obs[name] = p.build(mats)
        bpy.context.scene.collection.objects.link(obs[name])
    for name, p in parts.items():
        ob = obs[name]
        if p.parent:
            ob.parent = obs[p.parent]
            ob.location = p.origin - parts[p.parent].origin
        else:
            ob.parent = root
    bpy.context.view_layer.update()
    return root, obs


def main():
    root, obs = build()
    tris = sum(len(p.vertices) - 2 for ob in obs.values() for p in ob.data.polygons)
    blend = os.path.join(HERE, "kiosk.blend")
    glb = os.path.join(HERE, "kiosk.glb")
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in [root, *obs.values()]:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials="EXPORT", export_animations=False,
                              export_cameras=False, export_lights=False, export_extras=False)
    print("@@BUILD@@", {"tris": tris, "glb_bytes": os.path.getsize(glb)})


if __name__ == "__main__":
    main()
