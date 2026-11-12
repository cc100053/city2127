"""Minato's service kiosk for city2127 (targets: artifacts/resident-minato/target/*.jpg, owner-accepted 2026-11-12).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_kiosk.py
Writes kiosk.blend and kiosk.glb next to this file (glTF preset, no Meshopt/Draco).

Real metres at x1.0 (Minato is 1.70 m), origin at the footprint centre on the ground, front (the open counter side) faces Blender -Y
(= three +Z, like the other GLBs). Footprint 2.4 x 1.8 m, height 2.75 m. Nodes (names exact, pivots where the code rotates them):
  kiosk (body: base, kick, counter top, rear and left walls, posts, canopy, housing, trim)
  interior          warm emissive inner faces and a shelf line
  shutter           slatted roll shutter, pivot at its top edge (scale it down to close it; open = scaled to ~0 inside the housing)
  arm_base > arm_upper > arm_fore > arm_grip   robot arm on the counter (state 0)
  glass_room        glazed 1.6 m extension on the right (+X) (state -1)
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

    W, D, H = 2.4, 1.8, 2.75
    F = FRONT * D / 2  # front plane y
    k = node("kiosk")
    k.rprism("ksk_kick", W - .08, D - .08, .21, 0, .08)                                               # recessed dark kick
    k.rprism("ksk_white", W, D, .25, .08, 1.0, profile=[(.015, .08), (0, .10), (0, .97), (.015, 1.0)])   # counter base, soft edges
    k.rprism("ksk_top", W + .16, D + .16, .30, 1.0, 1.04, profile=[(0, 1.0), (0, 1.03), (.012, 1.04)])  # counter top slab, 0.08 proud
    CAN0, CAN1 = H - .35, H                                                                             # canopy 0.35 thick
    cw, cd = W + .30, D + .40
    k.rprism("ksk_white", cw, cd, .34, CAN0, CAN1, cy=FRONT * .05, profile=[(.0, CAN0), (0, CAN1 - .09), (.03, CAN1 - .045), (.075, CAN1)], n=7)
    k.rprism("ksk_trim", cw - .5, .035, .0175, CAN0 - .022, CAN0 + .002, cy=F - .05, n=3)             # cool-blue line under the front edge
    k.box("ksk_white", (0, F + .09, CAN0 - .10), (W - .30, .18, .20), .03)                              # shutter housing under the canopy
    t = .09  # wall thickness
    for x in (-W / 2 + t / 2,):                                                                         # closed left side (the right side is open)
        k.box("ksk_white", (x, 0, (1.04 + CAN0) / 2), (t, D - .16, CAN0 - 1.04), .02)
    k.box("ksk_white", (0, -F - t / 2 + .0, (1.04 + CAN0) / 2), (W - .1, t, CAN0 - 1.04), .02)         # closed rear
    for x in (-W / 2 + .08, W / 2 - .06):                                                               # slim front corner posts
        k.rprism("ksk_white", .12, .12, .05, 1.04, CAN0, cx=x, cy=F + .05, n=3)

    ik = node("interior", "kiosk")
    ik.box("ksk_warm", (0, -F - t - .004, 1.62), (W - .2, .02, CAN0 - 1.1), 0)                           # warm back wall
    ik.box("ksk_warm", (-W / 2 + t + .004, 0, 1.62), (.02, D - .3, CAN0 - 1.1), 0)                       # warm left wall
    ik.box("ksk_warm", (0, 0, CAN0 - .012), (W - .2, D - .3, .02), 0)                                  # warm ceiling
    ik.box("ksk_top", (0, -F - t - .08, 1.6), (W - .35, .14, .035), .01)                                # a shelf line

    sh = node("shutter", "kiosk", (0, F + .035, CAN0 - .20))                                            # pivot = top edge
    slats, top, bottom = 15, CAN0 - .20, 1.06
    step = (top - bottom) / slats
    for i in range(slats):
        zc = top - (i + .5) * step
        sh.box("ksk_slat", (0, F + .035, zc), (W - .34, .03, step - .012), .006)
    sh.box("ksk_white", (0, F + .035, bottom - .012), (W - .30, .04, .035), .01)                      # bottom bar

    # robot arm on the counter, right end (state 0): pivots at base, shoulder, elbow, wrist
    AX, AY, AZ = .82, F + .5, 1.04
    ab = node("arm_base", "kiosk", (AX, AY, AZ))
    ab.limb("ksk_white", (AX, AY, AZ), (AX, AY, AZ + .14), .11, .09)
    ab.sphere("ksk_joint", (AX, AY, AZ + .17), (.07, .07, .07))
    au = node("arm_upper", "arm_base", (AX, AY, AZ + .17))
    au.limb("ksk_white", (AX, AY, AZ + .17), (AX, AY, AZ + .62), .05)
    au.sphere("ksk_joint", (AX, AY, AZ + .64), (.06, .06, .06))
    af = node("arm_fore", "arm_upper", (AX, AY, AZ + .64))
    af.limb("ksk_white", (AX, AY, AZ + .64), (AX, AY, AZ + 1.02), .042, .036)
    af.sphere("ksk_joint", (AX, AY, AZ + 1.04), (.05, .05, .05))
    ag = node("arm_grip", "arm_fore", (AX, AY, AZ + 1.04))
    ag.box("ksk_white", (AX, AY, AZ + 1.09), (.10, .04, .05), .01)
    for s in (1, -1):
        ag.box("ksk_joint", (AX + s * .045, AY, AZ + 1.16), (.02, .035, .11), .004)

    gl = node("glass_room", "kiosk")
    gx0, gx1 = W / 2 + .06, W / 2 + .06 + 1.6
    gl.rprism("ksk_kick", 1.6 - .08, D - .08, .21, 0, .08, cx=(gx0 + gx1) / 2)
    gl.rprism("ksk_white", 1.6, D, .25, .08, 1.0, cx=(gx0 + gx1) / 2, profile=[(.015, .08), (0, .10), (0, .97), (.015, 1.0)])
    gl.rprism("ksk_top", 1.6 + .12, D + .16, .30, 1.0, 1.04, cx=(gx0 + gx1) / 2, profile=[(0, 1.0), (0, 1.03), (.012, 1.04)])
    gl.rprism("ksk_white", 1.6 + .12, cd, .34, CAN0, CAN1, cx=(gx0 + gx1) / 2, cy=FRONT * .05, profile=[(.0, CAN0), (0, CAN1 - .09), (.03, CAN1 - .045), (.075, CAN1)], n=7)
    for x in (gx1 - .05, (gx0 + gx1) / 2):                                                              # slim mullions front and right
        gl.rprism("ksk_white", .07, .07, .03, 1.04, CAN0, cx=x, cy=F + .05, n=3)
    gl.rprism("ksk_white", .07, .07, .03, 1.04, CAN0, cx=gx1 - .05, cy=-F - .08, n=3)
    gl.rprism("ksk_white", .07, .07, .03, 1.04, CAN0, cx=gx1 - .05, cy=0, n=3)
    gl.box("ksk_glass", ((gx0 + gx1) / 2, F + .06, (1.04 + CAN0) / 2), (gx1 - gx0 - .1, .012, CAN0 - 1.04), 0)  # front pane
    gl.box("ksk_glass", (gx1 - .05, 0, (1.04 + CAN0) / 2), (.012, D - .2, CAN0 - 1.04), 0)               # right pane
    gl.box("ksk_glass", ((gx0 + gx1) / 2, -F - .07, (1.04 + CAN0) / 2), (gx1 - gx0 - .1, .012, CAN0 - 1.04), 0)  # back pane
    gl.box("ksk_warm", ((gx0 + gx1) / 2, -F - .09, 1.55), (gx1 - gx0 - .3, .02, CAN0 - 1.1), 0)         # warm back inside

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
