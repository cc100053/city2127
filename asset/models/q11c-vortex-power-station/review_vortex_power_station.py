"""Preview light, cameras and renders of the Q11-C white-vortex power station (nothing here is exported).

blender -b q11c-vortex-power-station.blend --python-exit-code 1 -P review_vortex_power_station.py -- <out_dir> [view ...]
        [--samples N] [--scale PCT] [--glb] [--blank] [--clay] [--novortex] [--tag NAME]
Views: main (land side towards the sea, about 27 deg down, 4:3), entrance (from the plaza: canopy, doors, stair hall, the
turbines of the next bays), roof (on the outer roof band beside the entrance stair head: exit, walkway, rail, throat and the
foot of the vortex), top (orthographic plan), elev (orthographic elevation from the land side), aerial.
--glb replaces the model by the exported GLB; --blank renders the GLB alone, imported once into an empty scene with only
the preview sun, sky and cameras (no sea, shore or park trees); --clay renders a white massing model; --novortex hides the
vortex and cloud nodes.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ASSET = "q11c-vortex-power-station"
ROOT = "Q11C_VortexPowerStation"


def pol(r, deg, z):
    return (r * math.cos(math.radians(deg)), r * math.sin(math.radians(deg)), z)


CAMERAS = {  # name: (location, look-at, lens mm, resolution, ortho scale)
    "main": (pol(225, 270, 185), (0, 0, 58), 36, (1600, 1200), None),
    "entrance": (pol(73, 263.0, 2.6), pol(52, 272.5, 8.6), 16, (1600, 1200), None),
    "roof": (pol(37.8, 301, 36.7), pol(31, 266, 38.6), 15, (1600, 1200), None),
    "top": ((0, 0, 600), (0, 0, 0), 50, (1400, 1400), 150),
    "elev": (pol(600, 270, 66), (0, 0, 66), 50, (1400, 1200), 172),
    "aerial": (pol(190, 250, 240), (0, 0, 15), 30, (1600, 1200), None),
}


def stage(scene, col):
    sun = bpy.data.lights.new("PV_Sun", "SUN")
    sun.energy, sun.color, sun.angle = 4.0, (1.0, .965, .91), math.radians(1.0)
    so = bpy.data.objects.new("PV_Sun", sun)
    so.rotation_euler = (math.radians(46), 0, math.radians(-64))                  # early-summer late morning, from the left
    col.objects.link(so)
    world(scene)
    for name in CAMERAS:
        camera(name, col)
    scene.camera = bpy.data.objects["CAM_MAIN"]
    scene.render.resolution_x, scene.render.resolution_y = CAMERAS["main"][3]


def camera(name, col):
    loc, look, lens, res, ortho = CAMERAS[name]
    cd = bpy.data.cameras.new("CAM_" + name.upper())
    cd.lens, cd.clip_end, cd.clip_start = lens, 15000, .1
    if ortho:
        cd.type, cd.ortho_scale = "ORTHO", ortho
    ob = bpy.data.objects.new("CAM_" + name.upper(), cd)
    ob.location = loc
    ob.rotation_euler = (0, 0, 0) if name == "top" else (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    col.objects.link(ob)
    return ob


def world(scene):
    """Clear early-summer sky: pale at the horizon, deeper blue overhead."""
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
    ramp.color_ramp.elements[0].color = (.62, .80, 1.0, 1)
    ramp.color_ramp.elements[1].color = (.13, .38, .90, 1)
    ramp.color_ramp.elements[1].position = .55
    nt.links.new(ramp.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError as e:
        print("LOOK", e)
    scene.view_settings.exposure = -.1


def gpu(scene):
    scene.render.engine = "CYCLES"
    pr = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA", "METAL"):
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


def asset_objects():
    col = bpy.data.collections.get("Q11C_Asset")
    if col:
        return list(col.all_objects)
    root = next(o for o in bpy.data.objects if o.name.startswith(ROOT))
    return [root] + list(root.children_recursive)


def clay():
    """White massing: every opaque material becomes one matte white; transparent and textured ones stay."""
    white = bpy.data.materials.new("PV_Clay")
    b = next(n for n in white.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (.8, .8, .78, 1)
    b.inputs["Roughness"].default_value = .7
    for ob in asset_objects():
        if ob.type != "MESH" or ob.name.startswith(("VORTEX_", "CLOUD_")):
            continue
        for slot in ob.material_slots:
            m = slot.material
            bs = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m else None
            if bs and not bs.inputs["Alpha"].is_linked and bs.inputs["Alpha"].default_value >= 1:
                slot.link = "OBJECT"
                slot.material = white


def render():
    args = sys.argv[sys.argv.index("--") + 1:]
    out = os.path.abspath(args[0])
    os.makedirs(out, exist_ok=True)
    opt = {args[i]: args[i + 1] for i in range(len(args) - 1) if args[i] in ("--samples", "--scale", "--tag")}
    skip = set(opt.values())
    views = [a for a in args[1:] if not a.startswith("--") and a not in skip] or ["main", "entrance", "roof"]
    here = os.path.dirname(os.path.abspath(__file__))
    glb = os.path.join(here, ASSET + ".glb")
    tag = ""
    if "--blank" in args:                                                       # empty scene: light, sky, cameras and one GLB
        bpy.ops.wm.read_factory_settings(use_empty=True)
        col = bpy.data.collections.new("Q11C_Preview")
        bpy.context.scene.collection.children.link(col)
        stage(bpy.context.scene, col)
        bpy.ops.import_scene.gltf(filepath=glb)
        roots = [o.name for o in bpy.context.scene.objects if o.name.startswith(ROOT)]
        print("IMPORTED objects=%d roots=%s" % (len([o for o in bpy.context.scene.objects if o.select_get()]), roots))
        assert len(roots) == 1, roots
        tag = "-glb-blank"
    elif "--glb" in args:
        for o in list(bpy.data.collections["Q11C_Asset"].all_objects):
            bpy.data.objects.remove(o)
        bpy.ops.import_scene.gltf(filepath=glb)
        tag = "-glb"
    if "--clay" in args:
        clay()
        tag += "-clay"
    if "--novortex" in args:
        for o in bpy.data.objects:
            if o.name.startswith(("VORTEX_", "CLOUD_")):
                o.hide_render = True
        tag += "-novortex"
    tag += ("-" + opt["--tag"]) if "--tag" in opt else ""
    sc = bpy.context.scene
    print("DEVICE", gpu(sc))
    sc.cycles.samples = int(opt.get("--samples", 96))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 64
    sc.cycles.max_bounces = 8
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    for v in views:
        cam = bpy.data.objects.get("CAM_" + v.upper()) or camera(v, bpy.data.collections["Q11C_Preview"])
        loc, look, lens, _res, ortho = CAMERAS[v]                              # re-aim from CAMERAS (the .blend may be older)
        cam.location, cam.data.lens = loc, lens
        cam.data.type = "ORTHO" if ortho else "PERSP"
        if ortho:
            cam.data.ortho_scale = ortho
        cam.rotation_euler = (0, 0, 0) if v == "top" else (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.camera = cam
        sc.render.resolution_x, sc.render.resolution_y = CAMERAS[v][3]
        sc.render.filepath = os.path.join(out, "q11c-%s%s.png" % (v, tag))
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)


if __name__ == "__main__":
    render()
