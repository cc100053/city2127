"""Render a ship .blend from roughly the camera of its reference image, for side-by-side comparison.

blender -b --factory-startup --python-exit-code 1 -P compare_ship.py -- <ship> <out.png> [<ship.blend>]
Opens <ship.blend> (default: the one next to this file), adds a sea plane at the waterline (z = 0) so the freeboard
reads as in the photo, and renders one frame at the reference image's size with the camera from CAMS.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_ships import REFS, P  # noqa: E402

# ship -> (camera P(x, f, h), look-at P(x, f, h), focal length mm); x + = starboard, f + = bow
CAMS = {
    "cargo-ship": (P(50., 48., 13.), P(0., 6., 5.0), 33.),
}


def main():
    args = sys.argv[sys.argv.index("--") + 1:]
    name, out = args[0], os.path.abspath(args[1])
    blend = args[2] if len(args) > 2 else os.path.join(HERE, f"{name}.blend")
    bpy.ops.wm.open_mainfile(filepath=blend)
    scene = bpy.context.scene
    ref = bpy.data.images.load(os.path.join(HERE, "references", REFS[name]))
    scene.render.resolution_x, scene.render.resolution_y = ref.size
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 48
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("sky")
    scene.world = world
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (.62, .72, .85, 1)
    bg.inputs[1].default_value = .45
    sun = bpy.data.objects.new("key", bpy.data.lights.new("key", "SUN"))
    sun.data.energy = 4.5
    sun.data.angle = math.radians(6)
    sun.rotation_euler = (math.radians(50), 0, math.radians(60))  # from ahead on the starboard bow, as in the photos
    scene.collection.objects.link(sun)
    me = bpy.data.meshes.new("sea")
    s = 600.
    me.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    sea = bpy.data.objects.new("sea", me)
    scene.collection.objects.link(sea)
    sm = bpy.data.materials.new("sea")
    b = next(n for n in sm.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (.06, .16, .26, 1)
    b.inputs["Roughness"].default_value = .35
    me.materials.append(sm)
    loc, at, lens = CAMS[name]
    cam = bpy.data.objects.new("cmp_cam", bpy.data.cameras.new("cmp_cam"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.lens = lens
    cam.location = loc
    cam.rotation_euler = (Vector(at) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)


main()
