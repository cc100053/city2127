"""Minato (湊), 52, human guide: rounded rigid-part character for city2127 (target: artifacts/resident-minato/target/character.jpg).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_minato.py
Writes minato.blend and minato.glb next to this file (glTF preset, no Meshopt/Draco). Review renders: review_minato.py.

Real metres, 1.70 m with the cap (cap top to shoe sole), origin between the feet, facing Blender -Y (= glTF/three +Z, the other GLBs' front).
No armature, no skinning: an object hierarchy with the pivot of every node at its joint, so code can rotate the nodes
(hips > torso > head > cap, mouth.soft / mouth.smile; torso > upperArm.L/R > lowerArm.L/R > hand.L/R; hips > upperLeg > lowerLeg > foot; tablet on hand.L).
Character's left (.L) is +X. Pivots are the ones devMinato.ts was tuned on; only the shapes changed (owner 2026-11-14: Nagi standard).
Nagi standard: rounded-box head, closed hair shell with a cut hairline, 12-sided limbs, bevelled jacket, smooth shading with only > 50 deg
edges crisp (the mesh builder is build_nagi.Part). Mouths: mouth.soft shows; mouth.smile is scaled to 0.0001 (swap by scale).
Proportions from the sheet's front view as fractions of H = 1.70 m: head+cap 25 %, jacket 34 %, legs 41 %.
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "resident-nagi"))
import build_nagi as N  # noqa: E402  (Part, material, basis, lin: one mesh builder for every resident)

lin, basis = N.lin, N.basis
ROLES = {  # role: (rgba, roughness, emission rgba, strength); colours picked from the sheet's lit sides
    "res_navy": (lin("#222f5c"), .9, None, 0),         # jacket, cap
    "res_navy_dark": (lin("#1a2248"), .9, None, 0),    # trousers
    "res_trim": (lin("#6aa5f0"), .5, lin("#6aa5f0"), .3),
    "res_skin": (lin("#ecc3a6"), .85, None, 0),
    "res_hair": (lin("#9a9da6"), 1.0, None, 0),
    "res_shoe": (lin("#262a36"), .85, None, 0),
    "res_face_dark": (lin("#14161e"), .7, None, 0),    # eyes, mouths, joint gaps
    "res_tablet": (lin("#bfe9f7"), .4, lin("#a6dcf0"), .3),
    "res_line": (lin("#c79a80"), .85, None, 0),        # age lines: a skin shadow tone, not black
}


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    N.ROLES, N.ORDER = ROLES, list(ROLES)  # the shared builder reads its module's role table
    mats = [N.material(n) for n in N.ORDER]
    parts = {}

    def node(name, world, parent=None):
        p = N.Part(name, world, parent)
        parts[name] = p
        return p

    # ---- hips and legs: hem to sole .70 m, upper .30, lower .31, shoe .08
    hips = node("hips", (0, 0, .74))
    hips.frustum("res_navy_dark", (0, 0, -.03), .30, .30, .17, .12, .04, segments=2)   # mostly under the jacket; shows as the crotch
    for s, side in ((1, "L"), (-1, "R")):
        ul = node(f"upperLeg.{side}", (s * .085, 0, .69), "hips")
        ul.ellipsoid("res_navy_dark", (0, 0, 0), (.072, .072, .072), 12, 8)
        ul.prism("res_navy_dark", (0, 0, 0), (0, 0, -.29), .072, .070, u=12)
        ll = node(f"lowerLeg.{side}", (s * .085, 0, .39), f"upperLeg.{side}")
        ll.ellipsoid("res_face_dark", (0, 0, 0), (.064, .064, .064), 12, 8)       # dark knee gap, as on the sheet
        ll.prism("res_navy_dark", (0, 0, -.014), (0, 0, -.31), .074, .070, u=12)
        ft = node(f"foot.{side}", (s * .085, 0, .08), f"lowerLeg.{side}")
        ft.ellipsoid("res_shoe", (0, -.045, -.04), (.060, .135, .040), 12, 8, n=3)  # .27 x .12 x .08, squared like the sheet

    # ---- torso: jacket hem .70 -> shoulders 1.27, .38 wide at the chest, .37 at the hem, .215 deep; pivot at the waist (.90)
    torso = node("torso", (0, 0, .90), "hips")
    torso.frustum("res_navy", (0, 0, .085), .37, .40, .215, .57, .035, slope=.02, segments=3)
    torso.prism("res_navy", (0, 0, .33), (0, 0, .395), .088, .082, u=12)             # standing collar, to 1.295
    torso.prism("res_trim", (0, 0, .392), (0, 0, .398), .084, .084, u=12)            # collar edge line
    torso.box("res_skin", (0, -.083, .394), (.030, .006, .030), 0, Matrix.Rotation(math.radians(45), 4, "Y"))  # open collar front: the lower half of a diamond reads as a V of neck
    FY, BY = -.1085, .1085
    torso.strip("res_trim", (0, -.165), (0, .34), FY, .008)                        # centre front, hem to collar
    for y in (FY, BY):
        torso.strip("res_trim", (-.13, -.165), (.13, -.165), y, .008)               # hem line
        for s in (1, -1):
            torso.strip("res_trim", (s * .176, .30), (s * .180, .14), y, .008)     # armhole seam

    # ---- head: rounded-box skull .30 wide, chin 1.28, skull top 1.56 inside the cap; pivot at the neck base (1.25)
    head = node("head", (0, 0, 1.25), "torso")
    head.prism("res_skin", (0, 0, 0), (0, 0, .07), .050, .050, u=12)                # neck, inside the collar
    SK_C, SK_R, SK_N = Vector((0, 0, .17)), (.150, .142, .140), 2.6

    def face_y(x, z, off=0.0):
        k = 1 - abs(x / SK_R[0]) ** SK_N - abs((z - SK_C[2]) / SK_R[2]) ** SK_N
        return -SK_R[1] * max(k, 0) ** (1 / SK_N) - off

    head.ellipsoid("res_skin", SK_C, SK_R, 16, 10, n=SK_N)
    # grey hair: a closed shell over the skull; the face window between the temples, everything in front below the sideburns and
    # everything below the nape are cut with bisects and sunk into the skull (clean hairline step, closed mesh). The cap hides the top.
    head.ellipsoid("res_hair", (0, .010, .185), (.160, .160, .135), 20, 12, n=2.4)
    hair = N.ORDER.index("res_hair") + 1
    TEMPLE, SIDE, NAPE = .128, .150, .085                                           # half face-window width, sideburn bottom, nape

    def cut(co, no):
        faces = [f for f in head.bm.faces if f[head.layer] == hair]
        geom = list({*faces, *(e for f in faces for e in f.edges), *(v for f in faces for v in f.verts)})
        bmesh.ops.bisect_plane(head.bm, geom=geom, dist=1e-5, plane_co=co, plane_no=no)

    cut((0, 0, 0), (0, 1, 0))
    cut((0, 0, SIDE), (0, 0, 1))
    cut((0, 0, NAPE), (0, 0, 1))
    for sx in (1, -1):
        cut((sx * TEMPLE, 0, 0), (1, 0, 0))
    E = 1e-4
    for vert in {v for f in head.bm.faces if f[head.layer] == hair for v in f.verts}:
        c = vert.co
        if c.z < NAPE - E or (c.y < -E and (c.z < SIDE - E or abs(c.x) < TEMPLE - E)):
            vert.co = SK_C + (c - SK_C) * .80
    for s in (1, -1):
        head.ellipsoid("res_skin", (s * .166, .012, .180), (.022, .030, .048), 8, 6)             # large ears, clear of the side hair
        x = s * .058
        head.ellipsoid("res_face_dark", (x, face_y(x, .196, .003), .196), (.011, .007, .015), 8, 6)  # small oval eyes
        head.box("res_hair", (s * .062, face_y(s * .062, .230, .002), .230), (.070, .008, .016), 0,
                 Matrix.Rotation(s * math.radians(12), 4, "Y"), segments=2)                        # grey brows, outer ends lower
        head.box("res_line", (s * .049, face_y(s * .049, .118, .001), .118), (.004, .004, .042), 0, Matrix.Rotation(s * math.radians(14), 4, "Y"))  # nose-to-mouth line
        head.box("res_line", (s * .100, face_y(s * .100, .186, .001), .186), (.018, .004, .004), 0, Matrix.Rotation(s * math.radians(22), 4, "Y"))  # crow's foot
    head.prism("res_skin", (0, face_y(0, .128) - .014, .128), (0, face_y(0, .192) + .004, .192), .019, .005, u=6)  # nose wedge: wide flat base, narrow bridge
    MZ = .097
    MY = face_y(0, MZ)
    for name, mid, end, lift in (("mouth.soft", .028, .020, 18), ("mouth.smile", .042, .028, 28)):
        m = node(name, (0, MY, 1.25 + MZ), "head")
        m.box("res_face_dark", (0, .003, 0), (mid, .005, .006), 0)
        ex = mid / 2 + end * .42
        for s in (1, -1):
            m.box("res_face_dark", (s * ex, face_y(s * ex, MZ + .004, .001) - MY + .004, end * .16), (end, .005, .006), 0, Matrix.Rotation(-s * math.radians(lift), 4, "Y"))

    # ---- cap: soft wide crown .38 across overhanging a band, short rounded brim tilted down; top at 1.70
    cap = node("cap", (0, 0, 1.25), "head")
    cap.prism("res_navy", (0, 0, .262), (0, 0, .305), .156, .158, u=16)              # band
    cap.ellipsoid("res_navy", (0, -.008, .372), (.192, .198, .078), 16, 8, n=2.2)   # crown
    cap.ellipsoid("res_navy", (0, -.130, .284), (.125, .118, .011), 16, 6, Matrix.Rotation(math.radians(-12), 4, "X"))  # brim

    # ---- arms: upper .25, forearm .21 (a wider cuff segment), dark ball at the elbow, mitten hand .16
    tilt = math.radians(5)
    for s, side in ((1, "L"), (-1, "R")):
        d = Vector((s * math.sin(tilt), 0, -math.cos(tilt)))
        sh = Vector((s * .228, 0, 1.20))
        ua = node(f"upperArm.{side}", sh, "torso")
        ua.ellipsoid("res_navy", (0, 0, 0), (.054, .054, .054), 12, 8)              # round shoulder
        ua.prism("res_navy", (0, 0, 0), d * .24, .054, .052, u=12)
        la = node(f"lowerArm.{side}", sh + d * .25, f"upperArm.{side}")
        la.ellipsoid("res_face_dark", (0, 0, 0), (.047, .047, .047), 12, 8)          # dark inset at the elbow
        la.prism("res_navy", d * .014, d * .222, .060, .058, u=12)
        la.prism("res_trim", d * .200, d * .208, .0605, .0605, u=12)                # cuff line
        hd = node(f"hand.{side}", sh + d * .472, f"lowerArm.{side}")
        hd.ellipsoid("res_skin", d * .075, (.040, .026, .078), 10, 6, basis(d))     # mitten
        hd.ellipsoid("res_skin", d * .05 + Vector((0, -.030, 0)), (.015, .016, .040), 8, 5, basis(d))  # thumb
        if side == "L":
            # Held across the palm: long axis along the hand's forward (-Y), face up in rest. devMinato.ts bends the arm so it
            # stands in front of the stomach facing up-and-back toward the face.
            tb = node("tablet", sh + d * .472, "hand.L")
            tb.box("res_tablet", (0, -.125, -.085), (.15, .21, .012), .005, segments=2)

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
    obs["mouth.smile"].scale = (1e-4, 1e-4, 1e-4)
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
