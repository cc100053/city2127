"""Minato (湊), 52, human guide: faceted rigid-part character for city2127 (target: closeup-polish character sheet, owner pick 2026-11-12).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_minato.py
Writes minato.blend and minato.glb next to this file (glTF preset, no Meshopt/Draco).

Real metres, 1.70 m with the cap (cap top to shoe sole), origin between the feet, facing Blender -Y (= glTF/three +Z, the other GLBs' front).
No armature, no skinning: an object hierarchy with the pivot of every node at its joint, so code can rotate the nodes
(hips > torso > head > cap; torso > upperArm.L/R > lowerArm.L/R > hand.L/R; hips > upperLeg > lowerLeg > foot; tablet on hand.L).
Character's left (.L) is +X. Limbs are 8-sided prisms with a dark ball at each joint, so a bent joint never opens a see-through gap.
Everything is flat-shaded (the sheet is faceted); only the small face features are smooth. Materials are roles (res_*).
Proportions come from the sheet's front view as fractions of H = 1.70 m (see docs in the owner brief): head+cap 24%, jacket 33%, legs 41%.
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))


def lin(hex_):
    """sRGB hex -> linear rgba."""
    c = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple((v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4) for v in c) + (1,)


ROLES = {  # role: (rgba, roughness, emission rgba, strength)
    "res_navy": (lin("#101c42"), .9, None, 0),         # jacket, cap
    "res_navy_dark": (lin("#0b1230"), .9, None, 0),    # trousers
    "res_trim": (lin("#4f8fe8"), .5, lin("#4f8fe8"), .45),
    "res_skin": (lin("#e0b698"), .85, None, 0),
    "res_hair": (lin("#8a8f98"), .9, None, 0),
    "res_shoe": (lin("#20232d"), .85, None, 0),
    "res_face_dark": (lin("#14161e"), .7, None, 0),    # eyes, mouth, joint gaps
    "res_tablet": (lin("#aee4f4"), .4, lin("#9ad8f2"), .3),
}
ORDER = list(ROLES)


def material(name):
    rgba, rough, emit, strength = ROLES[name]
    m = bpy.data.materials.new(name)
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = 0
    if emit:
        bsdf.inputs["Emission Color"].default_value = emit
        bsdf.inputs["Emission Strength"].default_value = strength
    m.diffuse_color = rgba
    return m


def basis(direction):
    """Rotation taking +Z to `direction`."""
    return Vector((0, 0, 1)).rotation_difference(Vector(direction).normalized()).to_matrix().to_4x4()


class Part:
    """One node: a bmesh of primitives (node-local coordinates), faces tagged with a role and a smooth flag."""

    def __init__(self, name, world, parent=None):
        self.name, self.world, self.parent = name, Vector(world), parent
        self.bm = bmesh.new()
        self.layer = self.bm.faces.layers.int.new("role")
        self.smooth = self.bm.faces.layers.int.new("smooth")

    def _tag(self, role, smooth=False):
        for f in self.bm.faces:
            if f[self.layer] == 0:
                f[self.layer] = ORDER.index(role) + 1
                f[self.smooth] = 1 if smooth else 0

    def _new_verts(self):
        return [v for v in self.bm.verts if all(f[self.layer] == 0 for f in v.link_faces)]

    def ellipsoid(self, role, c, r, u=8, v=5, m=None, smooth=False):
        mat = Matrix.Translation(c) @ (m or Matrix.Identity(4)) @ Matrix.Diagonal((r[0], r[1], r[2], 1))
        bmesh.ops.create_uvsphere(self.bm, u_segments=u, v_segments=v, radius=1.0, matrix=mat)
        self._tag(role, smooth)

    def prism(self, role, p0, p1, r0, r1, u=8):
        """8-sided prism / frustum from p0 (radius r0) to p1 (radius r1), flat caps."""
        p0, p1 = Vector(p0), Vector(p1)
        d = p1 - p0
        bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=True, segments=u, radius1=r0, radius2=r1, depth=d.length,
                              matrix=Matrix.Translation(p0 + d / 2) @ basis(d) @ Matrix.Rotation(math.pi / u, 4, "Z"))
        self._tag(role)

    def frustum(self, role, c, bottom, top, depth, h, bevel=.015, slope=0.0):
        """Boxy block: width `bottom` at the base, `top` at the top; `slope` lowers the outer top corners (shoulders)."""
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=Matrix.Diagonal((1, 1, 1, 1)))
        for v in self._new_verts():
            top_row = v.co.z > 0
            v.co = Vector((v.co.x * (top if top_row else bottom), v.co.y * depth, v.co.z * h))
            if top_row and slope:
                v.co.z -= slope * abs(v.co.x) / (top / 2)
            v.co += Vector(c)
        new = [f for f in self.bm.faces if f[self.layer] == 0]
        bmesh.ops.bevel(self.bm, geom=list({e for f in new for e in f.edges}), offset=bevel, segments=1, profile=.5, affect="EDGES", clamp_overlap=True)
        self._tag(role)

    def box(self, role, c, size, bevel=.004, m=None, smooth=False, segments=1):
        mat = Matrix.Translation(c) @ (m or Matrix.Identity(4)) @ Matrix.Diagonal((size[0], size[1], size[2], 1))
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=mat)
        new = [f for f in self.bm.faces if f[self.layer] == 0]
        if bevel:
            bmesh.ops.bevel(self.bm, geom=list({e for f in new for e in f.edges}), offset=bevel, segments=segments, profile=.5, affect="EDGES", clamp_overlap=True)
        self._tag(role, smooth)

    def strip(self, role, a, b, y, w=.012, t=.004):
        """Thin emissive strip between two points of the xz plane on a face at height y (front or back of the jacket)."""
        (ax, az), (bx, bz) = a, b
        length = math.hypot(bx - ax, bz - az)
        angle = math.atan2(-(bz - az), bx - ax)
        self.box(role, ((ax + bx) / 2, y, (az + bz) / 2), (length, t, w), 0, Matrix.Rotation(angle, 4, "Y"))

    def build(self, mats):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.normal_update()
        used = sorted({f[self.layer] - 1 for f in self.bm.faces})  # only the roles this node uses get a slot
        for f in self.bm.faces:
            f.material_index = used.index(f[self.layer] - 1)
            f.smooth = bool(f[self.smooth])
        self.bm.to_mesh(me)
        self.bm.free()
        for i in used:
            me.materials.append(mats[i])
        return bpy.data.objects.new(self.name, me)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = [material(n) for n in ORDER]
    parts = {}

    def node(name, world, parent=None):
        p = Part(name, world, parent)
        parts[name] = p
        return p

    # ---- hips (pelvis in dark trousers) and legs: hem to sole 0.69 m, upper 0.30, lower 0.30, shoe 0.08
    hips = node("hips", (0, 0, .74))
    hips.frustum("res_navy_dark", (0, 0, -.02), .31, .31, .19, .18, .02)
    for s, side in ((1, "L"), (-1, "R")):
        ul = node(f"upperLeg.{side}", (s * .085, 0, .69), "hips")
        ul.prism("res_navy_dark", (0, 0, .02), (0, 0, -.30), .070, .070)
        ll = node(f"lowerLeg.{side}", (s * .085, 0, .39), f"upperLeg.{side}")
        ll.ellipsoid("res_face_dark", (0, 0, 0), (.062, .062, .062), 8, 5)  # dark knee notch
        ll.prism("res_navy_dark", (0, 0, -.012), (0, 0, -.31), .075, .070)  # widens to 0.15 m at the ankle
        ft = node(f"foot.{side}", (s * .085, 0, .08), f"lowerLeg.{side}")
        ft.ellipsoid("res_shoe", (0, -.045, -.04), (.055, .135, .040), 8, 5)  # 0.27 x 0.11 x 0.08, rounded faceted toe

    # ---- torso: jacket 0.56 m (hem .69 -> shoulders 1.25), 0.36 wide at the chest, 0.39 at the hem, 0.22 deep
    torso = node("torso", (0, 0, .90), "hips")
    torso.frustum("res_navy", (0, 0, .14), .39, .36, .22, .56, .016, slope=.035)
    torso.prism("res_navy", (0, 0, .345), (0, 0, .39), .088, .082, u=8)  # standing collar, 0.04 m tall
    torso.prism("res_trim", (0, 0, .386), (0, 0, .392), .090, .090, u=8)  # collar edge line
    torso.ellipsoid("res_skin", (0, -.082, .372), (.022, .012, .026), 6, 4)  # small V at the open collar front
    FY, BY = -.1115, .1115
    for y in (FY, BY):
        for s in (1, -1):
            torso.strip("res_trim", (s * .078, .384), (s * .172, .322), y)       # collar -> shoulder tip, along the shoulder
            torso.strip("res_trim", (s * .176, .318), (s * .186, .165), y)       # armhole seam, down the side
    torso.strip("res_trim", (0, -.07), (0, .385), FY, .012)                       # centre front, hem to collar

    # ---- head: 0.27 tall skull (chin at 1.30), cap on top (top at 1.70)
    head = node("head", (0, 0, 1.25), "torso")
    head.prism("res_skin", (0, 0, 0), (0, 0, .07), .045, .045, u=8)  # neck, hidden by the collar
    SK_C, SK_R = (0, 0, .185), (.135, .13, .135)  # skull centre and radii (0.27 wide, 0.27 tall)

    def face_y(x, z, off=0.0):
        k = 1 - (x / SK_R[0]) ** 2 - ((z - SK_C[2]) / SK_R[2]) ** 2
        return -SK_R[1] * math.sqrt(max(k, 0)) - off

    head.ellipsoid("res_skin", SK_C, SK_R, 12, 8)
    head.ellipsoid("res_hair", (0, .034, .225), (.142, .142, .112), 12, 7)  # grey hair mass over the back of the head, down to the nape
    for s in (1, -1):
        head.ellipsoid("res_skin", (s * .144, .008, .180), (.016, .022, .030), 6, 4)                 # ears, 0.06 m tall
        head.ellipsoid("res_hair", (s * .128, -.030, .225), (.022, .038, .055), 6, 4)               # sideburns
        x = s * .0425
        head.ellipsoid("res_face_dark", (x, face_y(x, .205, .004), .205), (.0115, .008, .014), 8, 6, smooth=True)  # eyes, 0.028 m tall ovals
        head.box("res_hair", (s * .048, face_y(s * .048, .238, .002), .238), (.045, .008, .012), 0,
                 Matrix.Rotation(s * math.radians(10), 4, "Y"))                                       # brows, angled down toward the outside
        head.box("res_face_dark", (s * .046, face_y(s * .046, .105, .003), .105), (.004, .004, .026), 0, Matrix.Rotation(s * math.radians(12), 4, "Y"))  # cheek lines
    head.ellipsoid("res_skin", (0, face_y(0, .150, .012), .150), (.012, .016, .022), 6, 4)          # nose wedge
    head.box("res_face_dark", (0, face_y(0, .092, .001), .092), (.036, .005, .006), 0, smooth=True)  # mouth, centre
    for s in (1, -1):
        head.box("res_face_dark", (s * .029, face_y(s * .029, .098, .001), .098), (.026, .005, .006), 0, Matrix.Rotation(-s * math.radians(25), 4, "Y"), smooth=True)  # smile corners

    # ---- cap: 8-panel crown 0.38 wide x 0.11 tall overhanging a 0.035 band, short brim tilted down
    cap = node("cap", (0, 0, 1.25), "head")
    cap.prism("res_navy", (0, 0, .300), (0, 0, .335), .160, .160, u=8)              # band
    cap.prism("res_navy", (0, 0, .335), (0, 0, .450), .190, .085, u=8)              # crown, flat panels to a low centre
    cap.box("res_navy", (0, -.185, .312), (.20, .09, .012), .004, Matrix.Rotation(math.radians(-15), 4, "X"))  # brim

    # ---- arms: upper 0.25 x 0.10, forearm 0.21 x 0.12 (wider), dark ball at the elbow, hand 0.16 x 0.085
    tilt = math.radians(5)
    for s, side in ((1, "L"), (-1, "R")):
        d = Vector((s * math.sin(tilt), 0, -math.cos(tilt)))
        sh = Vector((s * .228, 0, 1.20))
        ua = node(f"upperArm.{side}", sh, "torso")
        ua.ellipsoid("res_navy", (0, 0, 0), (.058, .058, .058), 8, 5)               # shoulder ball
        ua.prism("res_navy", (0, 0, 0), d * .25, .052, .052)
        la = node(f"lowerArm.{side}", sh + d * .25, f"upperArm.{side}")
        la.ellipsoid("res_face_dark", (0, 0, 0), (.047, .047, .047), 8, 5)           # dark inset at the elbow
        la.prism("res_navy", d * .012, d * .222, .060, .060)
        la.prism("res_trim", d * .196, d * .208, .063, .063)                        # cuff ring
        hd = node(f"hand.{side}", sh + d * .472, f"lowerArm.{side}")
        hd.ellipsoid("res_skin", d * .08, (.0425, .026, .082), 8, 5, basis(d))      # mitten, 0.16 x 0.085
        hd.ellipsoid("res_skin", d * .05 + Vector((0, -.032, 0)), (.015, .016, .042), 6, 4, basis(d))  # thumb wedge
        if side == "L":
            # Held across the palm: long axis along the hand's forward (-Y), face up in rest. Bend the forearm 90 deg forward and it
            # stands up in front of the stomach facing up-and-back toward the face.
            tb = node("tablet", sh + d * .472, "hand.L")
            tb.box("res_tablet", (0, -.125, -.085), (.16, .22, .012), .005, smooth=False, segments=2)
            tb.box("res_trim", (0, -.125, -.0915), (.166, .226, .006), .002, smooth=False)  # darker rim behind

    # ---- objects, hierarchy
    root = bpy.data.objects.new("ROOT_MINATO", None)
    bpy.context.scene.collection.objects.link(root)
    obs = {}
    for name, p in parts.items():
        ob = p.build(mats)
        obs[name] = ob
        bpy.context.scene.collection.objects.link(ob)
    for name, p in parts.items():
        ob = obs[name]
        ob.parent = obs[p.parent] if p.parent else root
        ob.location = p.world - (parts[p.parent].world if p.parent else Vector((0, 0, 0)))
    bpy.context.view_layer.update()
    return root, obs


def main():
    root, obs = build()
    tris = sum(len(p.vertices) - 2 for ob in obs.values() for p in ob.data.polygons)
    blend = os.path.join(HERE, "minato.blend")
    glb = os.path.join(HERE, "minato.glb")
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
