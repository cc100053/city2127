"""Nagi (凪), 34, delivery route editor: faceted rigid-part character for city2127 (target: character-sheet-c1, Minato precedent).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_nagi.py
Writes nagi.blend and nagi.glb next to this file (glTF preset, no Meshopt/Draco).

Real metres, 2.00 m (hair top to sole; matches the door frame 2.1 m and the 2.2 m crowd after FIG .86), origin between the feet,
facing Blender -Y (= glTF/three +Z). No armature, no skinning: object hierarchy, pivot of every node at its joint:
hips > torso > head > mouth.soft / mouth.smile ; torso > upperArm.L/R > lowerArm.L/R > hand.L/R ; hand.L > tablet ; hand.R > phone ;
hips > upperLeg.L/R > lowerLeg.L/R > foot.L/R. Character's left (.L) is +X.
Mouths: mouth.soft shows; mouth.smile is scaled to 0.0001 (code sets scale 1 and shrinks the other to swap).
Rounded look: ellipsoid joints/head, bevelled jacket and hips, 12-sided limbs, smooth shading with only >50 deg edges kept crisp.
Each hand is one rounded block glued to its device (hand frame: forearm -Z, the device sits on the -Y face; no separate fingers). Forearm pitch P = upper + lower arm Rx; P = -90 holds the device flat on the palm (lap / chest), P = -125 tilts a phone toward
the face, and a hand roll Rz = +-70 (L +, R -) swings the device out beside the thigh for carrying. Pose recipes: `POSES` in review_nagi.py.
Proportions from the sheet's front view as fractions of H = 2.00 m: head+hair 18 %, jacket 29 %, legs 46 %.
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
    "res_jacket": (lin("#9aa9a2"), .9, None, 0),        # grey-green work jacket
    "res_trousers": (lin("#4a5153"), .9, None, 0),      # dark trousers
    "res_trim": (lin("#9cc3e0"), .5, lin("#9cc3e0"), .25),  # pale-blue zip line
    "res_skin": (lin("#f3c9b0"), .85, None, 0),         # saturated warm peach from the sheet (paler tones read as grey-white)
    "res_hair": (lin("#383a43"), 1.0, None, 0),         # matte soft black
    "res_shoe": (lin("#f0f1f4"), .8, None, 0),           # white shoes, armhole seam, inner collar
    "res_face_dark": (lin("#15171e"), .7, None, 0),      # eyes, mouths, elbow gaps, phone body
    "res_tablet": (lin("#bfe6f4"), .4, lin("#a6dcf0"), .35),
    "res_rib": (lin("#5f7b7c"), .9, None, 0),           # ribbed hem and cuffs, pocket slits
}
ORDER = list(ROLES)
HEAD_SCALE = 1.07


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

    def ellipsoid(self, role, c, r, u=8, v=5, m=None, smooth=False, n=2):
        """n = 2 is an ellipsoid; n > 2 squares it toward a rounded box (the sheet's head)."""
        mat = Matrix.Translation(c) @ (m or Matrix.Identity(4)) @ Matrix.Diagonal((r[0], r[1], r[2], 1))
        for vert in bmesh.ops.create_uvsphere(self.bm, u_segments=u, v_segments=v, radius=1.0)["verts"]:
            p = vert.co
            vert.co = mat @ (p / sum(abs(q) ** n for q in p) ** (1 / n))
        self._tag(role, smooth)

    def prism(self, role, p0, p1, r0, r1, u=8):
        """8-sided prism / frustum from p0 (radius r0) to p1 (radius r1), flat caps."""
        p0, p1 = Vector(p0), Vector(p1)
        d = p1 - p0
        bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=True, segments=u, radius1=r0, radius2=r1, depth=d.length,
                              matrix=Matrix.Translation(p0 + d / 2) @ basis(d) @ Matrix.Rotation(math.pi / u, 4, "Z"))
        self._tag(role)

    def frustum(self, role, c, bottom, top, depth, h, bevel=.015, slope=0.0, segments=1):
        """Boxy block: width `bottom` at the base, `top` at the top; `slope` lowers the outer top corners (shoulders)."""
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=Matrix.Diagonal((1, 1, 1, 1)))
        for v in self._new_verts():
            top_row = v.co.z > 0
            v.co = Vector((v.co.x * (top if top_row else bottom), v.co.y * depth, v.co.z * h))
            if top_row and slope:
                v.co.z -= slope * abs(v.co.x) / (top / 2)
            v.co += Vector(c)
        new = [f for f in self.bm.faces if f[self.layer] == 0]
        bmesh.ops.bevel(self.bm, geom=list({e for f in new for e in f.edges}), offset=bevel, segments=segments, profile=.5, affect="EDGES", clamp_overlap=True)
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
        todo = set(self.bm.faces)  # recalc can leave a whole closed primitive inside-out: flip any island with negative volume
        while todo:
            stack, island = [todo.pop()], []
            while stack:
                f = stack.pop()
                island.append(f)
                for e in f.edges:
                    for g in e.link_faces:
                        if g in todo:
                            todo.discard(g)
                            stack.append(g)
            c = sum((f.calc_center_median() for f in island), Vector()) / len(island)
            if sum((f.calc_center_median() - c).dot(f.normal) * f.calc_area() for f in island) < 0:
                bmesh.ops.reverse_faces(self.bm, faces=island)
        used = sorted({f[self.layer] - 1 for f in self.bm.faces})  # only the roles this node uses get a slot
        for f in self.bm.faces:
            f.material_index = used.index(f[self.layer] - 1)
            f.smooth = True  # soft look everywhere; creases come from sharp edges below
        for e in self.bm.edges:  # smooth by angle: only edges turning more than 50 deg stay crisp (caps, thin trim boxes)
            if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(50):
                e.smooth = False
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
    hips.frustum("res_trousers", (0, 0, -.02), .36, .365, .19, .20, .06, segments=3)   # pelvis as wide as the jacket hem
    for s, side in ((1, "L"), (-1, "R")):
        ul = node(f"upperLeg.{side}", (s * .097, 0, .92), "hips")
        ul.ellipsoid("res_trousers", (0, 0, 0), (.084, .084, .084), 12, 8)       # round hip, same cloth
        ul.prism("res_trousers", (0, 0, -.01), (0, 0, -.42), .086, .081, u=12)
        ll = node(f"lowerLeg.{side}", (s * .097, 0, .50), f"upperLeg.{side}")
        ll.ellipsoid("res_trousers", (0, 0, 0), (.079, .079, .079), 12, 8)       # round knee
        ll.prism("res_trousers", (0, 0, -.012), (0, 0, -.415), .083, .075, u=12)
        ft = node(f"foot.{side}", (s * .097, 0, .09), f"lowerLeg.{side}")
        ft.ellipsoid("res_shoe", (0, -.05, -.037), (.068, .150, .053), 12, 8, n=3)   # .30 x .135 x .105 slip-on, squared like the sheet
        ft.ellipsoid("res_shoe", (0, .015, -.012), (.060, .070, .035), 8, 6)     # ankle collar so the shin sits into the shoe

    # ---- torso: jacket hem 1.005 -> shoulders 1.585 (.58), .41 wide at hem, .40 at chest, .25 deep; pivot at the waist (z 1.0)
    torso = node("torso", (0, 0, 1.0), "hips")
    torso.frustum("res_jacket", (0, 0, .295), .41, .40, .25, .58, .06, slope=.02, segments=3)  # rounded boxy bomber
    torso.box("res_rib", (0, 0, .03), (.40, .245, .06), .018, segments=2)           # ribbed hem band
    torso.prism("res_jacket", (0, 0, .545), (0, 0, .635), .088, .084, u=12)         # standing collar
    torso.ellipsoid("res_jacket", (0, 0, .635), (.088, .084, .014), 16, 6)           # rolled collar edge
    torso.box("res_shoe", (0, -.084, .618), (.022, .012, .045), .004)                # white inner collar showing at the open front
    FY = -.1265
    torso.strip("res_trim", (0, .07), (0, .52), FY, .012)                           # zip, hem band to collar (flat panel region)
    for s in (1, -1):
        torso.strip("res_rib", (s * .15, .20), (s * .11, .12), FY, .012)            # slanted hand pockets, top outward
        torso.ellipsoid("res_shoe", (s * .192, 0, .50), (.010, .066, .066), 12, 6)   # white armhole seam around the shoulder ball

    # ---- head: rounded-box skull, pivot at neck base (1.53). Modelled at 1/HEAD_SCALE and scaled on the node (sheet head is 17 % of H):
    # scaled it is .32 wide (.36 with hair), chin 1.63, hair top 2.00
    head = node("head", (0, 0, 1.53), "torso")
    head.prism("res_skin", (0, 0, .05), (0, 0, .125), .052, .052, u=12)      # short neck, mostly inside the collar
    SK_C, SK_R, SK_N = Vector((0, 0, .26)), (.150, .148, .165), 2.6

    def face_y(x, z, off=0.0):
        k = 1 - abs(x / SK_R[0]) ** SK_N - abs((z - SK_C[2]) / SK_R[2]) ** SK_N
        return -SK_R[1] * max(k, 0) ** (1 / SK_N) - off

    head.ellipsoid("res_skin", SK_C, SK_R, 16, 10, n=SK_N)
    # hair cap: a closed shell over the skull. The face window (between the temples, below the sloping hairline) and the cheeks
    # below the side hair are cut with bisects and sunk into the skull, so the hairline is a clean step and the mesh stays closed
    head.ellipsoid("res_hair", (0, .012, .285), (.168, .172, .155), 20, 12, n=2.4)
    hair = ORDER.index("res_hair") + 1
    LINE, SLOPE, TEMPLE, SIDE = .385, .45, .118, .215                               # forehead hairline, its drop per metre toward the ears, half window width, side-hair bottom

    def cut(co, no):
        faces = [f for f in head.bm.faces if f[head.layer] == hair]
        geom = list({*faces, *(e for f in faces for e in f.edges), *(v for f in faces for v in f.verts)})
        bmesh.ops.bisect_plane(head.bm, geom=geom, dist=1e-5, plane_co=co, plane_no=no)

    cut((0, -.15, LINE), Vector((0, SLOPE, 1)).normalized())
    cut((0, 0, 0), (0, 1, 0))
    cut((0, 0, SIDE), (0, 0, 1))
    for sx in (1, -1):
        cut((sx * TEMPLE, 0, 0), (1, 0, 0))
    E = 1e-4
    for vert in {v for f in head.bm.faces if f[head.layer] == hair for v in f.verts}:
        c = vert.co
        if c.y < -E and (c.z < SIDE - E or (abs(c.x) < TEMPLE - E and c.z + SLOPE * (c.y + .15) < LINE - E)):
            vert.co = SK_C + (c - SK_C) * .84
    # fringe: side part on the character's right; three broad tufts sweep toward +X, one falls to the right temple (sheet front view)
    for (tx, tz), (px, pz), w in (((-.050, .378), (.005, .335), .046), ((.000, .378), (.058, .318), .050), ((.055, .376), (.112, .292), .046), ((-.066, .374), (-.114, .300), .040)):
        top = Vector((tx, face_y(tx, tz) - .006, tz))
        tip = Vector((px, face_y(px, pz) - .010, pz))
        zc = (tip - top).normalized()
        xc = Vector((0, -1, 0)).cross(zc).normalized()
        frame = Matrix((xc, zc.cross(xc), zc)).transposed().to_4x4()
        bmesh.ops.create_cone(head.bm, cap_ends=True, cap_tris=True, segments=8, radius1=w, radius2=.007, depth=(tip - top).length,
                              matrix=Matrix.Translation((top + tip) / 2) @ frame @ Matrix.Diagonal((1, .34, 1, 1)))
        head._tag("res_hair")
    for s in (1, -1):
        head.ellipsoid("res_skin", (s * .166, .012, .235), (.020, .028, .040), 8, 6)         # ears, clear of the side hair
        x = s * .06
        head.ellipsoid("res_face_dark", (x, face_y(x, .25, .003), .25), (.014, .007, .022), 8, 6)  # tall oval eyes
        head.box("res_hair", (x, face_y(x, .29, .002), .29), (.052, .008, .011), 0, Matrix.Rotation(s * math.radians(7), 4, "Y"), segments=2)  # soft brows, outer ends lower
    head.ellipsoid("res_skin", (0, face_y(0, .208, .008), .208), (.010, .012, .015), 6, 4)       # nose
    MY, MZ = face_y(0, .162), .162
    soft = node("mouth.soft", (0, MY, 1.53 + MZ), "head")
    soft.box("res_face_dark", (0, .003, 0), (.022, .005, .006), 0)                  # gentle smile: flat middle, two short raised ends
    for s in (1, -1):
        soft.box("res_face_dark", (s * .019, face_y(s * .019, MZ + .003, .001) - MY + .004, .003), (.018, .005, .006), 0, Matrix.Rotation(-s * math.radians(20), 4, "Y"))
    smile = node("mouth.smile", (0, MY, 1.53 + MZ), "head")
    smile.box("res_face_dark", (0, .003, 0), (.034, .005, .006), 0)
    for s in (1, -1):
        smile.box("res_face_dark", (s * .034, face_y(s * .034, MZ + .006, .001) - MY + .004, .006), (.024, .005, .006), 0, Matrix.Rotation(-s * math.radians(28), 4, "Y"))

    # ---- arms: shoulder pivot (+-.255, 1.50); upper .30, forearm .26, hand .17 (wrist .55 below the shoulder)
    tilt = math.radians(4)
    wrist = {}
    for s, side in ((1, "L"), (-1, "R")):
        d = Vector((s * math.sin(tilt), 0, -math.cos(tilt)))
        sh = Vector((s * .255, 0, 1.50))
        ua = node(f"upperArm.{side}", sh, "torso")
        ua.ellipsoid("res_jacket", (0, 0, 0), (.060, .060, .060), 12, 8)           # round shoulder
        ua.prism("res_jacket", (0, 0, 0), d * .287, .060, .060, u=12)    # puffy sleeve, stops short of the elbow
        la = node(f"lowerArm.{side}", sh + d * .30, f"upperArm.{side}")
        la.ellipsoid("res_trousers", (0, 0, 0), (.052, .052, .052), 12, 8)         # dark elbow joint showing in the gap
        la.prism("res_jacket", d * .02, d * .215, .060, .060, u=12)
        la.prism("res_rib", d * .205, d * .250, .056, .052, u=12)                  # ribbed cuff
        la.ellipsoid("res_skin", d * .255, (.036, .036, .026), 8, 6, basis(d))      # wrist
        wrist[side] = sh + d * .55
        hd = node(f"hand.{side}", wrist[side], f"lowerArm.{side}")
        # Tray grip, hand frame: forearm -Z, palm faces -Y (the device lies in front of it), thumb toward the body (-s X).
        hd.box("res_skin", (0, .012, -.058), (.092, .036, .110), .016, segments=2)                # one-piece hand, glued to the device
    # devices live in the hand frame: face toward -Y, extending along -Z, edge gripped at x = s*.04
    tb = node("tablet", wrist["L"], "hand.L")
    tb.box("res_tablet", (-.045, -.012, -.140), (.17, .012, .24), .004)
    tb.box("res_trim", (-.045, -.0045, -.140), (.176, .006, .246), 0)          # darker rim behind
    ph = node("phone", wrist["R"], "hand.R")
    ph.box("res_face_dark", (.004, -.012, -.120), (.072, .011, .150), .004)
    ph.box("res_tablet", (.004, -.0185, -.120), (.062, .002, .134), 0)                        # glowing screen

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
    obs["head"].scale = (HEAD_SCALE,) * 3
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
