"""Preview light, cameras and renders of the Q10-A solar furnace tower (nothing here is exported).

blender -b q10a-solar-furnace.blend --python-exit-code 1 -P review_solar_furnace.py -- <out_dir> [view ...] [--samples N] [--scale PCT] [--glb] [--blank] [--clay]
    [--model q10a-solar-furnace-nocrown]   (which GLB --glb / --blank load; default the crowned model)
Views: main (reference angle, 4:3), front45l / front45r (the same height 45 deg to either side), aerial (oblique from above), stand (sphere and cradle
close-up), underside (looking up from the front walkway), footbridge (rear base beside the island bridge), pooltop
(orthographic, straight down on the pool), furnace (through the shell to the core), poolside (eye height on the walkway,
looking up the front feed tube), elev (orthographic elevation from the land side), top (orthographic plan).
--glb replaces the model by the exported GLB before rendering; --blank renders the GLB alone, imported once into an empty
scene with only the preview light and cameras (no sea, shore or park trees); --clay renders a white massing model (glass kept clear).
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ASSET = "q10a-solar-furnace"


def pol(r, deg, z):
    return (r * math.cos(math.radians(deg)), r * math.sin(math.radians(deg)), z)


CAMERAS = {  # name: (location, look-at, lens mm, resolution, ortho scale)
    "main": (pol(90, -90, 40), (0, 0, 39), 16, (1600, 1200), None),
    "front45l": (pol(90, -135, 40), (0, 0, 39), 16, (1600, 1200), None),   # the frame comparison set: main + both 45 deg + aerial
    "front45r": (pol(90, -45, 40), (0, 0, 39), 16, (1600, 1200), None),
    "aerial": (pol(72, -90, 112), (0, 0, 44), 18, (1600, 1200), None),
    "stand": (pol(64, -108, 66), (0, 0, 46), 32, (1600, 1200), None),      # side-front close-up of sphere, cradle and columns
    "underside": (pol(39, 352, 1.4), pol(10, 334, 30), 14, (1200, 1500), None),  # up from beside a base: glass, pads, ribs, column, base
    "footbridge": ((2.6, 50, 3.0), (-3.5, 20, .4), 20, (1600, 1200), None),  # down the island bridge, the rear base off to its left
    "pooltop": ((0, 0, 400), (0, 0, 0), 50, (1400, 1400), 100),          # straight down on the whole pool
    "furnace": (pol(27, 272, 46), (1.5, -2, 51.5), 26, (1600, 1200), None),
    "poolside": (pol(46.6, 307, 1.6), pol(34, 318, 12.5), 16, (1200, 1500), None),
    "elev": (pol(400, -90, 50), (0, 0, 50), 50, (1200, 1400), 130),
    "top": ((0, 0, 400), (0, 0, 0), 50, (1400, 1400), 140),
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
    ob.rotation_euler = (0, 0, 0) if name in ("top", "pooltop") else (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    col.objects.link(ob)
    return ob


def world(scene):
    w =bpy.data.worlds.new("PV_World")
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


def clay():
    """White massing: every opaque material becomes one matte white; transparent ones stay as they are."""
    white = bpy.data.materials.new("PV_Clay")
    b = next(n for n in white.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (.82, .82, .80, 1)
    b.inputs["Roughness"].default_value = .7
    for ob in bpy.data.collections["Q10A_Asset"].all_objects:
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
    opt = {args[i]: args[i + 1] for i in range(len(args) - 1) if args[i] in ("--samples", "--scale", "--model")}
    model = opt.get("--model", ASSET)                                           # e.g. q10a-solar-furnace-nocrown
    skip = set(opt.values())
    views = [a for a in args[1:] if not a.startswith("--") and a not in skip] or ["main", "furnace", "poolside"]
    here = os.path.dirname(os.path.abspath(__file__))
    tag = ""
    if "--blank" in args:                                                       # empty scene: light, cameras and one GLB import
        bpy.ops.wm.read_factory_settings(use_empty=True)
        col = bpy.data.collections.new("Q10A_Preview")
        bpy.context.scene.collection.children.link(col)
        stage(bpy.context.scene, col)
        bpy.ops.import_scene.gltf(filepath=os.path.join(here, model + ".glb"))
        roots = [o.name for o in bpy.context.scene.objects if o.name.startswith("Q10A_SolarFurnace")]
        print("IMPORTED objects=%d roots=%s" % (len([o for o in bpy.context.scene.objects if o.select_get()]), roots))
        assert len(roots) == 1, roots
        tag = "-blank"
    elif "--glb" in args:
        for o in list(bpy.data.collections["Q10A_Asset"].all_objects):
            bpy.data.objects.remove(o)
        bpy.ops.import_scene.gltf(filepath=os.path.join(here, model + ".glb"))
        tag = "-glb"
    if "--clay" in args:
        clay()
        tag = "-clay"
    sc = bpy.context.scene
    print("DEVICE", gpu(sc))
    sc.cycles.samples = int(opt.get("--samples", 160))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 64
    sc.cycles.max_bounces = 10
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    for v in views:
        cam = bpy.data.objects.get("CAM_" + v.upper()) or camera(v, bpy.data.collections["Q10A_Preview"])  # a .blend staged before the view was added
        sc.camera = cam
        sc.render.resolution_x, sc.render.resolution_y = CAMERAS[v][3]
        sc.render.filepath = os.path.join(out, "q10a-%s%s%s.png" % (v, model[len(ASSET):], tag))
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)


if __name__ == "__main__":
    render()
