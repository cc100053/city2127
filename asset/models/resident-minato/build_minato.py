"""Minato (湊), 52, human guide: rigid-part character for city2127 (target: closeup-polish character sheet, owner pick 2026-11-12).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_minato.py
Writes minato.blend and minato.glb next to this file (glTF preset, no Meshopt/Draco).

Real metres, 1.70 m with the cap, origin between the feet, facing Blender -Y (= glTF/three +Z, the other GLBs' front).
No armature, no skinning: an object hierarchy with the pivot of every node at its joint, so code can rotate the nodes
(hips > torso > head > cap; torso > upperArm.L/R > lowerArm.L/R > hand.L/R; hips > upperLeg > lowerLeg > foot; tablet on hand.L).
Character's left (.L) is +X. Limbs are capsules, so a bent joint never opens a gap. Materials are roles (res_*).
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))

ROLES = {  # role: (rgba, roughness, emission rgba, strength)
    "res_navy": ((.075, .115, .24, 1), .85, None, 0),
    "res_trim": ((.22, .45, .9, 1), .5, (.25, .5, 1, 1), .5),
    "res_skin": ((.86, .67, .55, 1), .8, None, 0),
    "res_hair": ((.36, .37, .40, 1), .9, None, 0),
    "res_shoe": ((.035, .045, .07, 1), .8, None, 0),
    "res_face_dark": ((.02, .02, .03, 1), .7, None, 0),
    "res_tablet": ((.50, .78, .92, 1), .4, (.45, .75, 1, 1), .35),
}
ORDER = list(ROLES)
SMOOTH_DEG = 40


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
    """One node: a bmesh of primitives (node-local coordinates), faces tagged with a role."""

    def __init__(self, name, world, parent=None):
        self.name, self.world, self.parent = name, Vector(world), parent
        self.bm = bmesh.new()
        self.layer = self.bm.faces.layers.int.new("role")

    def _tag(self, role):
        for f in self.bm.faces:
            if f[self.layer] == 0:
                f[self.layer] = ORDER.index(role) + 1

    def ellipsoid(self, role, c, r, u=12, v=8, m=None):
        mat = Matrix.Translation(c) @ (m or Matrix.Identity(4)) @ Matrix.Diagonal((r[0], r[1], r[2], 1))
        bmesh.ops.create_uvsphere(self.bm, u_segments=u, v_segments=v, radius=1.0, matrix=mat)
        self._tag(role)

    def capsule(self, role, p0, p1, r, squash=1.0, u=12, v=8):
        """Capsule p0..p1 with round ends, cross-section r x r*squash (y)."""
        p0, p1 = Vector(p0), Vector(p1)
        d = p1 - p0
        bmesh.ops.create_uvsphere(self.bm, u_segments=u, v_segments=v, radius=1.0, matrix=Matrix.Diagonal((r, r * squash, r, 1)))
        for vert in self.bm.verts:
            if all(f[self.layer] == 0 for f in vert.link_faces):
                vert.co.z += d.length / 2 * (1 if vert.co.z > 0 else -1)
        bmesh.ops.transform(self.bm, verts=[x for x in self.bm.verts if all(f[self.layer] == 0 for f in x.link_faces)],
                            matrix=Matrix.Translation(p0 + d / 2) @ basis(d))
        self._tag(role)

    def box(self, role, c, size, bevel=.01, m=None):
        mat = Matrix.Translation(c) @ (m or Matrix.Identity(4)) @ Matrix.Diagonal((size[0], size[1], size[2], 1))
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=mat)
        new = [f for f in self.bm.faces if f[self.layer] == 0]
        edges = {e for f in new for e in f.edges}
        bmesh.ops.bevel(self.bm, geom=list(edges), offset=bevel, segments=2, profile=.5, affect="EDGES", clamp_overlap=True)
        self._tag(role)

    def cylinder(self, role, c, r0, r1, depth, m=None, u=14):
        mat = Matrix.Translation(c) @ (m or Matrix.Identity(4))
        bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=True, segments=u, radius1=r0, radius2=r1, depth=depth, matrix=mat)
        self._tag(role)

    def build(self, mats):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.normal_update()
        used = sorted({f[self.layer] - 1 for f in self.bm.faces})  # only the roles this node uses get a slot
        for f in self.bm.faces:
            f.material_index = used.index(f[self.layer] - 1)
            f.smooth = True
        thr = math.radians(SMOOTH_DEG)
        for e in self.bm.edges:
            if len(e.link_faces) == 2 and e.calc_face_angle(0) > thr:
                e.smooth = False
        self.bm.to_mesh(me)
        self.bm.free()
        for i in used:
            me.materials.append(mats[i])
        ob = bpy.data.objects.new(self.name, me)
        return ob


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = [material(n) for n in ORDER]
    parts = {}

    def node(name, world, parent=None):
        p = Part(name, world, parent)
        parts[name] = p
        return p

    # ---- hips (pelvis in trousers) and legs
    hips = node("hips", (0, 0, .92))
    hips.box("res_navy", (0, 0, .02), (.32, .185, .15), .045)
    for s, side in ((1, "L"), (-1, "R")):
        ul = node(f"upperLeg.{side}", (s * .085, 0, .90), "hips")
        ul.capsule("res_navy", (0, 0, 0), (0, 0, -.40), .075, .95)
        ll = node(f"lowerLeg.{side}", (s * .085, 0, .50), f"upperLeg.{side}")
        ll.capsule("res_navy", (0, 0, 0), (0, 0, -.38), .066, .95)
        ft = node(f"foot.{side}", (s * .085, 0, .09), f"lowerLeg.{side}")
        ft.box("res_shoe", (0, -.05, -.045), (.10, .26, .09), .025)

    # ---- torso (jacket), collar, trim
    torso = node("torso", (0, 0, .95), "hips")
    torso.box("res_navy", (0, 0, .17), (.34, .20, .62), .05)
    torso.cylinder("res_navy", (0, 0, .50), .072, .066, .06, u=14)  # standing collar
    torso.box("res_trim", (0, -.1005, .15), (.012, .008, .56), .002)  # front closure line
    for s in (1, -1):  # collar-to-shoulder seam lines
        torso.box("res_trim", (s * .105, -.0985, .43), (.14, .008, .012), .002, Matrix.Rotation(s * math.radians(-28), 4, "Y"))

    # ---- head, cap
    head = node("head", (0, 0, 1.42), "torso")
    head.cylinder("res_skin", (0, 0, .025), .036, .04, .09)
    SK = (0, 0, .14), (.094, .104, .114)  # skull centre, radii

    def surface_y(x, z, off=0.0):
        """y on the skull front for a feature at (x, z)."""
        k = 1 - (x / SK[1][0]) ** 2 - ((z - SK[0][2]) / SK[1][2]) ** 2
        return -SK[1][1] * math.sqrt(max(k, 0)) - off

    head.ellipsoid("res_skin", SK[0], SK[1], 16, 10)
    for s in (1, -1):
        head.ellipsoid("res_skin", (s * .092, .006, .135), (.013, .02, .03))  # ears
        head.ellipsoid("res_hair", (s * .086, -.012, .178), (.018, .04, .04))  # sideburns
        x = s * .037
        head.ellipsoid("res_face_dark", (x, surface_y(x, .152, .004), .152), (.011, .008, .013), 8, 6)  # eyes
        head.box("res_hair", (s * .038, surface_y(s * .038, .182, .002), .182), (.034, .008, .008), .002, Matrix.Rotation(s * math.radians(-8), 4, "Y"))  # brows
    head.ellipsoid("res_skin", (0, surface_y(0, .122, .006), .122), (.015, .02, .018), 8, 6)  # nose
    head.box("res_face_dark", (0, surface_y(0, .082, .001), .082), (.03, .006, .006), .001)  # mouth
    for s in (1, -1):
        head.box("res_face_dark", (s * .017, surface_y(s * .017, .086, .001), .086), (.012, .006, .006), .001, Matrix.Rotation(s * math.radians(-30), 4, "Y"))
    head.ellipsoid("res_hair", (0, .03, .158), (.099, .100, .102), 16, 10)  # grey hair, visible behind and at the sides

    cap = node("cap", (0, 0, 1.42), "head")
    cap.ellipsoid("res_navy", (0, .004, .212), (.120, .126, .070), 16, 8)
    cap.cylinder("res_navy", (0, .004, .176), .119, .119, .036, u=16)  # band
    cap.box("res_navy", (0, -.13, .172), (.18, .10, .012), .004, Matrix.Rotation(math.radians(-9), 4, "X"))  # short brim

    # ---- arms: shoulder -> elbow -> wrist, tilted slightly away from the body
    tilt = math.radians(7)
    for s, side in ((1, "L"), (-1, "R")):
        d = Vector((s * math.sin(tilt), 0, -math.cos(tilt)))
        sh = Vector((s * .195, 0, 1.36))
        ua = node(f"upperArm.{side}", sh, "torso")
        ua.capsule("res_navy", (0, 0, 0), d * .27, .056, .95)
        la = node(f"lowerArm.{side}", sh + d * .27, f"upperArm.{side}")
        la.capsule("res_navy", (0, 0, 0), d * .25, .05, .95)
        la.cylinder("res_trim", d * .235, .052, .052, .012, basis(d))  # cuff line
        hd = node(f"hand.{side}", sh + d * .52, f"lowerArm.{side}")
        hd.ellipsoid("res_skin", d * .075, (.034, .02, .082), 10, 8, basis(d))  # mitten
        hd.ellipsoid("res_skin", d * .045 + Vector((0, -.03, 0)), (.013, .013, .035), 8, 6, basis(d))  # thumb
        if side == "L":
            tb = node("tablet", sh + d * .52, "hand.L")
            tb.box("res_tablet", d * .11 + Vector((0, -.05, 0)), (.15, .012, .21), .004)

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
