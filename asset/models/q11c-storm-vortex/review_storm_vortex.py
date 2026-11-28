"""Preview light, cameras and renders of the Q11-C storm vortex power station (nothing here is exported).

blender -b q11c-storm-vortex.blend --python-exit-code 1 -P review_storm_vortex.py -- <out_dir> [view ...] [--samples N] [--scale PCT] [--glb] [--blank] [--clay]
Views: main (reference angle, 4:3), front45l / front45r (the same height 45 deg to either side), aerial (oblique from above),
vanes (from the paved ring up the vanes and turbines), turbine (one turbine down the gap between two vanes), roof (eye height on the
viewing walkway, looking up the vortex), elev (orthographic elevation from the land side), top (orthographic plan).
--glb replaces the model by the exported GLB before rendering; --blank renders the GLB alone, imported once into an empty
scene with only the preview light and cameras (no sea, shore or park trees); --clay renders a white massing model (glass kept clear).
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ASSET = "q11c-storm-vortex"


def pol(r, deg, z):
    return (r * math.cos(math.radians(deg)), r * math.sin(math.radians(deg)), z)


CAMERAS = {  # name: (location, look-at, lens mm, resolution, ortho scale)
    "main": (pol(175, -90, 95), (0, 0, 45), 22, (1600, 1200), None),
    "front45l": (pol(175, -135, 95), (0, 0, 45), 22, (1600, 1200), None),
    "front45r": (pol(175, -45, 95), (0, 0, 45), 22, (1600, 1200), None),
    "aerial": (pol(170, -90, 230), (0, 0, 18), 22, (1600, 1200), None),
    "vanes": (pol(92, -72, 3.0), pol(56, -96, 17), 20, (1600, 1200), None),        # from the paved ring up the vanes
    "turbine": (pol(65.8, -101.5, 6.6), pol(54, -91, 11.25), 20, (1600, 1200), None),  # down the gap between two vanes
    "roof": (pol(45.5, -100, 32.7), (0, 0, 62), 14, (1200, 1500), None),
    "elev": (pol(500, -90, 64), (0, 0, 64), 50, (1400, 1200), 170),
    "top": ((0, 0, 500), (0, 0, 0), 50, (1400, 1400), 280),
}


def stage(scene, col):
    sun = bpy.data.lights.new("PV_Sun", "SUN")
    sun.energy, sun.color, sun.angle = 5.0, (1.0, .96, .9), math.radians(1.0)
    so = bpy.data.objects.new("PV_Sun", sun)
    so.rotation_euler = (math.radians(38), 0, math.radians(-30))                # late-morning sun over the land-side right shoulder
    col.objects.link(so)
    world(scene)
    for name in CAMERAS:
        camera(name, col)
    scene.camera = bpy.data.objects["CAM_MAIN"]
    scene.render.resolution_x, scene.render.resolution_y = CAMERAS["main"][3]


def camera(name, col):
    loc, look, lens, res, ortho = CAMERAS[name]
    cd = bpy.data.cameras.new("CAM_" + name.upper())
    cd.lens, cd.clip_end, cd.clip_start = lens, 12000, .1
    if ortho:
        cd.type, cd.ortho_scale = "ORTHO", ortho
    ob = bpy.data.objects.new("CAM_" + name.upper(), cd)
    ob.location = loc
    ob.rotation_euler = (0, 0, 0) if name == "top" else (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    col.objects.link(ob)
    return ob


def world(scene):
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
    ramp.color_ramp.elements[0].color = (.58, .78, 1.0, 1)
    ramp.color_ramp.elements[1].color = (.16, .42, .92, 1)
    ramp.color_ramp.elements[1].position = .6
    nt.links.new(ramp.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError as e:
        print("LOOK", e)
    scene.view_settings.exposure = -.15


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


def clay():
    """White massing: every opaque material becomes one matte white; transparent ones stay as they are."""
    white = bpy.data.materials.new("PV_Clay")
    b = next(n for n in white.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (.82, .82, .80, 1)
    b.inputs["Roughness"].default_value = .7
    for ob in bpy.data.collections["Q11C_Asset"].all_objects:
        if ob.type != "MESH":
            continue
        for slot in ob.material_slots:
            m = slot.material
            if m and next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Alpha"].default_value >= 1:
                slot.link = "OBJECT"
                slot.material = white


def render():
    args = sys.argv[sys.argv.index("--") + 1:]
    out = os.path.abspath(args[0])
    os.makedirs(out, exist_ok=True)
    opt = {args[i]: args[i + 1] for i in range(len(args) - 1) if args[i] in ("--samples", "--scale")}
    skip = set(opt.values())
    views = [a for a in args[1:] if not a.startswith("--") and a not in skip] or ["main", "vanes", "roof"]
    here = os.path.dirname(os.path.abspath(__file__))
    glb = os.path.join(here, ASSET + ".glb")
    tag = ""
    if "--blank" in args:                                                       # empty scene: light, cameras and one GLB import
        bpy.ops.wm.read_factory_settings(use_empty=True)
        col = bpy.data.collections.new("Q11C_Preview")
        bpy.context.scene.collection.children.link(col)
        stage(bpy.context.scene, col)
        bpy.ops.import_scene.gltf(filepath=glb)
        roots = [o.name for o in bpy.context.scene.objects if o.name.startswith("Q11C_StormVortex")]
        print("IMPORTED objects=%d roots=%s" % (len([o for o in bpy.context.scene.objects if o.select_get()]), roots))
        assert len(roots) == 1, roots
        tag = "-blank"
    elif "--glb" in args:
        for o in list(bpy.data.collections["Q11C_Asset"].all_objects):
            bpy.data.objects.remove(o)
        bpy.ops.import_scene.gltf(filepath=glb)
        tag = "-glb"
    if "--clay" in args:
        clay()
        tag = "-clay"
    sc = bpy.context.scene
    print("DEVICE", gpu(sc))
    sc.cycles.samples = int(opt.get("--samples", 128))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 64
    sc.cycles.max_bounces = 10
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    for v in views:
        cam = bpy.data.objects.get("CAM_" + v.upper()) or camera(v, bpy.data.collections["Q11C_Preview"])
        sc.camera = cam
        sc.render.resolution_x, sc.render.resolution_y = CAMERAS[v][3]
        sc.render.filepath = os.path.join(out, "q11c-%s%s.png" % (v, tag))
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)


if __name__ == "__main__":
    render()
