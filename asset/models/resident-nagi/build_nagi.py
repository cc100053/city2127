"""Nagi (凪), 34, delivery route editor: faceted rigid-part character for city2127 (target: character-sheet-c1, Minato precedent).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_nagi.py
Writes nagi.blend and nagi.glb next to this file (glTF preset, no Meshopt/Draco).

Real metres, 2.00 m (hair top to sole; matches the door frame 2.1 m and the 2.2 m crowd after FIG .86), origin between the feet,
facing Blender -Y (= glTF/three +Z). No armature, no skinning: object hierarchy, pivot of every node at its joint:
hips > torso > head > mouth.soft / mouth.smile ; torso > upperArm.L/R > lowerArm.L/R > hand.L/R ; hand.L > tablet ; hand.R > phone ;
hips > upperLeg.L/R > lowerLeg.L/R > foot.L/R. Character's left (.L) is +X.
Mouths: mouth.soft shows; mouth.smile is scaled to 0.0001 (code sets scale 1 and shrinks the other to swap).
Device rest placement is Minato's: lying face up, forward of the palm. A wrist turn of +90 deg about X hangs it down the leg facing forward
(carry); with the forearm raised 90 deg it stands in front of the face (read / look at phone). Pose recipes: see poses() below and the handoff.
Proportions from the sheet's front view as fractions of H = 2.00 m: head+hair 20 %, jacket 28 %, legs 46 %.
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
    "res_jacket": (lin("#8d9b92"), .9, None, 0),        # grey-green work jacket
    "res_trousers": (lin("#3d4547"), .9, None, 0),      # dark trousers
    "res_trim": (lin("#7fa8dc"), .5, lin("#7fa8dc"), .35),  # cool-blue trim line
    "res_skin": (lin("#e3bf9f"), .85, None, 0),
    "res_hair": (lin("#22242c"), .9, None, 0),
    "res_shoe": (lin("#e9ebf0"), .8, None, 0),           # white shoes
    "res_face_dark": (lin("#15171e"), .7, None, 0),      # eyes, mouths, joint gaps
    "res_tablet": (lin("#bfe6f4"), .4, lin("#a6dcf0"), .35),
    "res_phone": (lin("#2b3342"), .5, None, 0),
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

    # ---- hips and legs. hip joint .92, knee .50, ankle .09 (shoe .09 tall): upper .42, lower .41
    hips = node("hips", (0, 0, .95))
    hips.frustum("res_trousers", (0, 0, -.03), .35, .35, .22, .20, .02)
    for s, side in ((1, "L"), (-1, "R")):
        ul = node(f"upperLeg.{side}", (s * .095, 0, .92), "hips")
        ul.ellipsoid("res_face_dark", (0, 0, 0), (.080, .080, .080), 8, 5)       # dark hip ball
        ul.prism("res_trousers", (0, 0, -.01), (0, 0, -.42), .082, .078)
        ll = node(f"lowerLeg.{side}", (s * .095, 0, .50), f"upperLeg.{side}")
        ll.ellipsoid("res_face_dark", (0, 0, 0), (.070, .070, .070), 8, 5)       # dark knee notch
        ll.prism("res_trousers", (0, 0, -.012), (0, 0, -.415), .082, .074)
        ft = node(f"foot.{side}", (s * .095, 0, .09), f"lowerLeg.{side}")
        ft.ellipsoid("res_shoe", (0, -.05, -.045), (.060, .150, .045), 8, 5)    # .30 x .12 x .09, white

    # ---- torso: jacket hem .97 -> shoulders 1.52 (.55), .43 wide at hem, .40 at chest, .25 deep; pivot at the waist (z 1.0)
    torso = node("torso", (0, 0, 1.0), "hips")
    torso.frustum("res_jacket", (0, 0, .245), .43, .40, .25, .55, .018, slope=.04)
    torso.prism("res_jacket", (0, 0, .50), (0, 0, .56), .098, .092, u=8)           # standing collar, .06 tall
    torso.prism("res_trim", (0, 0, .556), (0, 0, .562), .100, .100, u=8)           # collar edge line
    torso.ellipsoid("res_skin", (0, -.09, .545), (.026, .014, .030), 6, 4)         # small V at the open collar
    FY, BY = -.1265, .1265
    for y in (FY, BY):
        for s in (1, -1):
            torso.strip("res_trim", (s * .09, .515), (s * .20, .46), y)             # collar -> shoulder tip
            torso.strip("res_trim", (s * .176, .44), (s * .190, .16), y)            # armhole seam, down the side
    torso.strip("res_trim", (0, -.03), (0, .515), FY, .012)                          # zip, hem to collar
    for s in (1, -1):
        torso.strip("res_trim", (s * .09, .17), (s * .15, .06), FY, .010)           # slanted hand pockets

    # ---- head: pivot at neck base (1.52); skull chin 1.615, top 1.945; hair top 2.00
    head = node("head", (0, 0, 1.52), "torso")
    head.prism("res_skin", (0, 0, 0), (0, 0, .10), .050, .050, u=8)                # neck, hidden by the collar
    SK_C, SK_R = (0, 0, .26), (.150, .145, .165)

    def face_y(x, z, off=0.0):
        k = 1 - (x / SK_R[0]) ** 2 - ((z - SK_C[2]) / SK_R[2]) ** 2
        return -SK_R[1] * math.sqrt(max(k, 0)) - off

    head.ellipsoid("res_skin", SK_C, SK_R, 12, 8)
    head.ellipsoid("res_hair", (0, .035, .305), (.162, .162, .175), 12, 7)         # short dark hair, bulging into a fringe over the forehead
    for s in (1, -1):
        head.ellipsoid("res_skin", (s * .158, .008, .245), (.018, .024, .034), 6, 4)         # ears
        head.ellipsoid("res_hair", (s * .142, -.030, .300), (.024, .040, .060), 6, 4)        # sideburns
        x = s * .052
        head.ellipsoid("res_face_dark", (x, face_y(x, .255, .004), .255), (.012, .008, .015), 8, 6, smooth=True)  # eyes
        head.box("res_hair", (s * .056, face_y(s * .056, .292, .002), .292), (.050, .008, .012), 0, Matrix.Rotation(s * math.radians(6), 4, "Y"))  # brows
    head.ellipsoid("res_skin", (0, face_y(0, .215, .012), .215), (.013, .017, .024), 6, 4)       # nose wedge
    MY, MZ = face_y(0, .172), .172                                                    # mouth centre on the face (head-local)
    soft = node("mouth.soft", (0, MY, 1.52 + MZ), "head")                               # pivot at the mouth so scale 0.0001 collapses it in place
    soft.box("res_face_dark", (0, .003, 0), (.040, .005, .006), 0, smooth=True)
    smile = node("mouth.smile", (0, MY, 1.52 + MZ), "head")
    smile.box("res_face_dark", (0, .003, 0), (.034, .005, .006), 0, smooth=True)
    for s in (1, -1):
        smile.box("res_face_dark", (s * .034, face_y(s * .034, MZ + .006, .001) - MY + .004, .006), (.024, .005, .006), 0, Matrix.Rotation(-s * math.radians(28), 4, "Y"), smooth=True)

    # ---- arms: shoulder pivot (+-.255, 1.46); upper .30 (r .056), forearm .26 (r .062) with dark ball at the elbow, hand .17
    tilt = math.radians(4)
    for s, side in ((1, "L"), (-1, "R")):
        d = Vector((s * math.sin(tilt), 0, -math.cos(tilt)))
        sh = Vector((s * .255, 0, 1.46))
        ua = node(f"upperArm.{side}", sh, "torso")
        ua.ellipsoid("res_jacket", (0, 0, 0), (.064, .064, .064), 8, 5)                 # shoulder ball
        ua.prism("res_jacket", (0, 0, 0), d * .30, .056, .056)
        la = node(f"lowerArm.{side}", sh + d * .30, f"upperArm.{side}")
        la.ellipsoid("res_face_dark", (0, 0, 0), (.050, .050, .050), 8, 5)               # dark inset at the elbow
        la.prism("res_jacket", d * .014, d * .245, .064, .064)
        la.prism("res_trim", d * .222, d * .236, .067, .067)                            # cuff ring
        hd = node(f"hand.{side}", sh + d * .55, f"lowerArm.{side}")
        hd.ellipsoid("res_skin", d * .09, (.046, .028, .088), 8, 5, basis(d))             # mitten, .17 x .09
        hd.ellipsoid("res_skin", d * .06 + Vector((0, -.034, 0)), (.016, .018, .046), 6, 4, basis(d))  # thumb wedge
    tb = node("tablet", sh_L := Vector((.255, 0, 1.46)) + Vector((math.sin(tilt), 0, -math.cos(tilt))) * .55, "hand.L")
    tb.box("res_tablet", (0, -.130, -.088), (.17, .24, .012), .005, segments=2)
    tb.box("res_trim", (0, -.130, -.0945), (.176, .246, .006), .002)                     # darker rim behind
    sh_R = Vector((-.255, 0, 1.46)) + Vector((-math.sin(tilt), 0, -math.cos(tilt))) * .55
    ph = node("phone", sh_R, "hand.R")
    ph.box("res_phone", (0, -.090, -.088), (.072, .150, .011), .004, segments=2)          # thin phone body
    ph.box("res_tablet", (0, -.090, -.0815), (.062, .134, .002), 0)                        # glowing screen

    # ---- objects, hierarchy
    root = bpy.data.objects.new("ROOT_NAGI", None)
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
    obs["mouth.smile"].scale = (1e-4, 1e-4, 1e-4)
    bpy.context.view_layer.update()
    return root, obs


def main():
    root, obs = build()
    tris = sum(len(p.vertices) - 2 for ob in obs.values() for p in ob.data.polygons)
    blend = os.path.join(HERE, "nagi.blend")
    glb = os.path.join(HERE, "nagi.glb")
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
