"""Build the Weather Library resident, using the library's rigid-part mesh builder."""
from pathlib import Path
import sys
import bpy

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / "resident-nagi"))
from build_nagi import Part, ORDER, ROLES, lin, material

PALETTE = {
    "res_jacket": "#465478",
    "res_trousers": "#454958",
    "res_trim": "#c0b58a",
    "res_skin": "#cf9b7e",
    "res_hair": "#392a2b",
    "res_shoe": "#aaa7a1",
    "res_face_dark": "#292329",
}
ORDER[:] = PALETTE
ROLES.update({name: (lin(color), .85, None, 0) for name, color in PALETTE.items()})


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig = bpy.data.objects.new("Aoi", None)
    bpy.context.collection.objects.link(rig)
    materials = [material(name) for name in ORDER]
    parts = []

    def part(name, position, parent=None):
        result = Part(name, position, parent)
        parts.append(result)
        return result

    hips = part("hips", (0, 0, .87))
    hips.frustum("res_trousers", (0, 0, .025), .31, .32, .21, .20, .035)
    torso = part("torso", (0, 0, .93), hips)
    torso.frustum("res_jacket", (0, 0, .173), .34, .37, .235, .48, .048, slope=.015, segments=2)
    torso.box("res_trim", (0, -.115, .12), (.24, .046, .27), 0)
    torso.box("res_jacket", (0, -.145, .115), (.185, .022, .13), 0)
    head = part("head", (0, 0, 1.36), torso)
    head.prism("res_skin", (0, 0, -.02), (0, 0, .145), .049, .055)
    head.ellipsoid("res_skin", (0, -.011, .18), (.125, .122, .146), 14, 9)
    head.ellipsoid("res_hair", (0, .039, .217), (.133, .115, .136), 14, 9)
    head.ellipsoid("res_hair", (-.018, .112, .174), (.076, .082, .083), 10, 7)
    head.ellipsoid("res_hair", (-.034, -.047, .29), (.104, .079, .06), 10, 6)
    head.ellipsoid("res_skin", (0, -.124, .16), (.027, .028, .034), 8, 6)
    head.ellipsoid("res_face_dark", (0, -.12, .122), (.034, .013, .008), 8, 5)
    for sign in (-1, 1):
        head.ellipsoid("res_skin", (sign * .119, .002, .165), (.024, .031, .038), 8, 5)
        head.ellipsoid("res_face_dark", (sign * .049, -.119, .202), (.012, .007, .014), 8, 5)
    for sign, side in ((1, "L"), (-1, "R")):
        x = sign * .105
        leg = part(f"leg.{side}", (x, 0, .84), hips)
        leg.prism("res_trousers", (0, 0, -.78), (0, 0, .02), .052, .083)
        leg.ellipsoid("res_shoe", (0, -.055, -.802), (.068, .136, .038), 10, 6, n=2.8)
        x = sign * .194
        arm = part(f"upperArm.{side}", (x, 0, 1.303), torso)
        arm.prism("res_jacket", (0, 0, -.265), (0, 0, .02), .052, .066)
        fore = part(f"lowerArm.{side}", (x, 0, 1.038), arm)
        fore.prism("res_jacket", (0, 0, -.207), (0, 0, .017), .041, .055)
        fore.prism("res_trim", (0, 0, -.224), (0, 0, -.196), .044, .048)
        hand = part(f"hand.{side}", (x, 0, .816), fore)
        hand.ellipsoid("res_skin", (0, 0, -.056), (.042, .02, .072), 10, 6)
        hand.ellipsoid("res_skin", (-sign * .036, -.012, -.044), (.019, .021, .041), 8, 5)

    objects = {}
    for mesh in parts:
        obj = mesh.build(materials)
        bpy.context.collection.objects.link(obj)
        obj.parent = objects[mesh.parent.name] if mesh.parent else rig
        obj.location = mesh.world - mesh.parent.world if mesh.parent else mesh.world
        objects[mesh.name] = obj

    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "resident-aoi.blend"))
    bpy.ops.export_scene.gltf(filepath=str(ROOT / "resident-aoi.glb"), export_format="GLB", export_animations=False)


if __name__ == "__main__":
    build()
