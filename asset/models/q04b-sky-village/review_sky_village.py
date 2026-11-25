"""Preview light, cameras and renders of the Q04-B sky village (nothing here is exported).

blender -b q04b-sky-village.blend --python-exit-code 1 -P review_sky_village.py -- <out_dir> [view ...] [--samples N] [--scale PCT] [--glb] [--prefix NAME]
Views: main (reference angle, 4:3), house (main house 05), top (orthographic plan), front (orthographic elevation),
second (house 01), core (lift and bridges), back (from the sea), under (walking to the entrance).
--glb renders the exported GLB instead of the .blend's own model.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

# name: (position, look-at, lens, resolution, ortho scale)
CAMERAS = {
    "main": ((3.0, -53, 24.0), (3.0, 0, 22.6), 21, (1600, 1200), None),
    "house": ((11.0, -36.5, 25.0), (18.9, -14.0, 18.9), 35, (1600, 1200), None),
    "top": ((0, 0, 300), (0, 0, 0), 50, (1600, 1600), 84),
    "front": ((0, -300, 24.5), (0, 0, 24.5), 50, (1600, 1200), 84),
    "second": ((-9, -34, 14.5), (-17.5, -10.5, 10.6), 36, (1600, 1200), None),
    "core": ((9.5, -20, 21.5), (0, 0, 17.5), 28, (1200, 1600), None),
    "back": ((-22, 62, 30), (0, 0, 23), 26, (1600, 1200), None),
    "under": ((4.5, -27, 1.7), (0.5, 0, 12.5), 20, (1200, 1500), None),
}


def stage(scene, col):
    sun = bpy.data.lights.new("PV_Sun", "SUN")
    sun.energy, sun.color, sun.angle = 3.6, (1.0, .955, .88), math.radians(.8)
    so = bpy.data.objects.new("PV_Sun", sun)
    so.rotation_euler = (math.radians(48), 0, math.radians(-38))                 # early-summer sun from the front left
    col.objects.link(so)
    w = bpy.data.worlds.new("PV_World")
    scene.world = w
    nt = w.node_tree
    bg = next(n for n in nt.nodes if n.type == "BACKGROUND")
    geo, sep, ramp = nt.nodes.new("ShaderNodeNewGeometry"), nt.nodes.new("ShaderNodeSeparateXYZ"), nt.nodes.new("ShaderNodeValToRGB")
    nt.links.new(geo.outputs["Incoming"], sep.inputs[0])
    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "MULTIPLY"
    inv.inputs[1].default_value = -1
    nt.links.new(sep.outputs[2], inv.inputs[0])
    nt.links.new(inv.outputs[0], ramp.inputs[0])
    ramp.color_ramp.elements[0].color = (.50, .72, .95, 1)
    ramp.color_ramp.elements[1].color = (.14, .36, .85, 1)
    ramp.color_ramp.elements[1].position = .55
    nt.links.new(ramp.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = .9
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - High Contrast"
    except TypeError as e:
        print("LOOK", e)
    scene.view_settings.exposure = -.45
    cameras(scene, col)


def cameras(scene, col):
    for name, (loc, look, lens, _res, ortho) in CAMERAS.items():
        cd = bpy.data.cameras.new("CAM_" + name.upper())
        cd.lens, cd.clip_end, cd.clip_start = lens, 9000, .1
        if ortho:
            cd.type, cd.ortho_scale = "ORTHO", ortho
        ob = bpy.data.objects.new("CAM_" + name.upper(), cd)
        ob.location = loc
        ob.rotation_euler = (0, 0, 0) if name == "top" else (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        col.objects.link(ob)
    scene.camera = bpy.data.objects["CAM_MAIN"]
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1200


def gpu(scene):
    scene.render.engine = "CYCLES"
    pr = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA"):
        try:
            pr.compute_device_type = kind
            pr.get_devices()
            for d in pr.devices:
                d.use = d.type == kind
            scene.cycles.device = "GPU"
            return kind
        except TypeError:
            continue
    return "CPU"


def render():
    args = sys.argv[sys.argv.index("--") + 1:]
    out = os.path.abspath(args[0])
    os.makedirs(out, exist_ok=True)
    opt = {args[i]: args[i + 1] for i in range(len(args) - 1) if args[i] in ("--samples", "--scale", "--prefix")}
    skip = set(opt.values())
    views = [a for a in args[1:] if not a.startswith("--") and a not in skip] or ["main", "house", "top"]
    sc = bpy.context.scene
    if "--glb" in args:
        for o in list(bpy.data.collections["Q04B_Asset"].all_objects):
            bpy.data.objects.remove(o)
        bpy.ops.import_scene.gltf(filepath=os.path.join(os.path.dirname(os.path.abspath(__file__)), "q04b-sky-village.glb"))
    for o in [o for o in bpy.data.objects if o.name.startswith("CAM_")]:          # cameras always as written here
        bpy.data.objects.remove(o)
    cameras(sc, sc.collection)
    labels = bpy.data.collections.get("Q04B_Labels")
    print("DEVICE", gpu(sc))
    sc.cycles.samples = int(opt.get("--samples", 160))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 48
    sc.cycles.max_bounces = 8
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    for v in views:
        if labels:
            labels.hide_render = v != "top"
        sc.camera = bpy.data.objects["CAM_" + v.upper()]
        sc.render.resolution_x, sc.render.resolution_y = CAMERAS[v][3]
        sc.render.filepath = os.path.join(out, "%s-%s.png" % (opt.get("--prefix", "q04b"), v))
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)


if __name__ == "__main__":
    render()
