"""Preview light, cameras and renders of the Q10-C spiral soil hill (nothing here is exported).

blender -b q10c-spiral-soil-hill.blend --python-exit-code 1 -P review_spiral_soil_hill.py -- <out_dir> [view ...]
    [--samples N] [--scale PCT] [--glb] [--blank] [--clay] [--model NAME] [--compare TARGET]
Views: main (reference angle from above the foot, 4:3), top (orthographic plan; the route trace is shown only here),
entrance (the tube outlet and the hero chair from the plaza), summit (from the path exit over the field beds to the
forest), section (orthographic cut-away elevation across the three turns, clay), bank (eye height on the first turn).
--glb replaces the model by the exported GLB; --blank renders the GLB alone, imported once into an empty scene with only
the preview light and cameras (no sea, land or park trees); --clay renders a white massing model (glass kept clear).
--compare TARGET writes <out>/q10c-main-vs-target.jpg: the main render beside the reference image at the same height.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import spiral as S  # noqa: E402

ASSET = "q10c-spiral-soil-hill"


def pol(r, deg, z):
    return (r * math.cos(math.radians(deg)), r * math.sin(math.radians(deg)), z)


def _path_mid(ph, dz):
    o = S.offsets(ph)
    return S.at(ph, (o["rim_out"] + o["path_out"]) / 2, dz)


def _exit_cam():
    """Standing on the paved landing just past the path exit, looking over the field beds to the forest."""
    a = S.bearing(S.PHI_END) + math.radians(9)
    return (18.6 * math.cos(a), 18.6 * math.sin(a), S.Z_END + 1.7)


def _exit_look():
    a = S.bearing(S.PHI_END) + math.radians(40)
    return (11.0 * math.cos(a), 11.0 * math.sin(a), S.Z_END + 1.2)


CAMERAS = {  # name: (location, look-at, lens mm, resolution, ortho scale)
    "main": (pol(96, -98, 48), (-9, 6, 14), 24, (1600, 1200), None),
    "top": ((0, 0, 400), (0, 0, 0), 50, (1500, 1500), 176),
    "entrance": (pol(64, -107, 2.9), S.at(.1, -.4, .3), 24, (1600, 1200), None),
    "summit": (_path_mid(S.PHI_END - .55, 2.2), _exit_look(), 22, (1600, 1200), None),
    "section": ((0, -400, 22), (0, 0, 22), 50, (1800, 900), 130),
    "bank": (_path_mid(1.1, 1.6), _path_mid(1.75, 1.0), 20, (1600, 1200), None),
}


def stage(scene, col):
    sun = bpy.data.lights.new("PV_Sun", "SUN")
    sun.energy, sun.color, sun.angle = 5.5, (1.0, .95, .86), math.radians(1.0)
    so = bpy.data.objects.new("PV_Sun", sun)
    so.rotation_euler = (math.radians(42), 0, math.radians(-42))                # late-morning sun from behind the left shoulder
    col.objects.link(so)
    world(scene)
    for name in CAMERAS:
        camera(name, col)
    scene.camera = bpy.data.objects["CAM_MAIN"]
    scene.render.resolution_x, scene.render.resolution_y = CAMERAS["main"][3]


def camera(name, col):
    loc, look, lens, res, ortho = CAMERAS[name]
    cd = bpy.data.cameras.new("CAM_" + name.upper())
    cd.lens, cd.clip_end, cd.clip_start = lens, 12000, (400.0 if name == "section" else .1)   # section: clipped at y = 0
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
    ramp.color_ramp.elements[0].color = (.66, .82, 1.0, 1)
    ramp.color_ramp.elements[1].color = (.20, .46, .92, 1)
    ramp.color_ramp.elements[1].position = .6
    nt.links.new(ramp.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = .8
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Punchy"
    except TypeError as e:
        print("LOOK", e)
    scene.view_settings.exposure = -.1


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


def clay(objs):
    """White massing: every opaque material becomes one matte white; transparent ones stay as they are."""
    white = bpy.data.materials.new("PV_Clay")
    b = next(n for n in white.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (.82, .82, .80, 1)
    b.inputs["Roughness"].default_value = .7
    for ob in objs:
        if ob.type != "MESH":
            continue
        for slot in ob.material_slots:
            m = slot.material
            if m and next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Alpha"].default_value >= 1:
                slot.link = "OBJECT"
                slot.material = white


def compare(render_png, target, out_jpg, h=900):
    """Render and reference side by side at the same height (JPEG)."""
    import numpy as np
    imgs = []
    for p in (render_png, target):
        im = bpy.data.images.load(p)
        w = round(im.size[0] * h / im.size[1])
        im.scale(w, h)
        px = np.empty(w * h * 4, dtype=np.float32)
        im.pixels.foreach_get(px)
        imgs.append(px.reshape(h, w, 4))
    gap = np.ones((h, 16, 4), dtype=np.float32)
    sheet = np.concatenate([imgs[0], gap, imgs[1]], axis=1)
    out = bpy.data.images.new("q10c_compare", sheet.shape[1], h, alpha=False)
    out.pixels.foreach_set(sheet.ravel())
    out.filepath_raw = out_jpg
    out.file_format = "JPEG"
    out.save()
    print("COMPARE", out_jpg)


def render():
    args = sys.argv[sys.argv.index("--") + 1:]
    out = os.path.abspath(args[0])
    os.makedirs(out, exist_ok=True)
    keys = ("--samples", "--scale", "--model", "--compare")
    opt = {args[i]: args[i + 1] for i in range(len(args) - 1) if args[i] in keys}
    model = opt.get("--model", ASSET)
    skip = set(opt.values())
    views = [a for a in args[1:] if not a.startswith("--") and a not in skip] or ["main", "top", "entrance", "summit"]
    tag = ""
    if "--blank" in args:                                                       # empty scene: light, cameras and one GLB import
        bpy.ops.wm.read_factory_settings(use_empty=True)
        col = bpy.data.collections.new("Q10C_Preview")
        bpy.context.scene.collection.children.link(col)
        stage(bpy.context.scene, col)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, model + ".glb"))
        roots = [o.name for o in bpy.context.scene.objects if o.name.startswith("Q10C_SpiralSoilHill")]
        print("IMPORTED objects=%d roots=%s" % (len([o for o in bpy.context.scene.objects if o.select_get()]), roots))
        assert len(roots) == 1, roots
        tag = "-blank"
    elif "--glb" in args:
        for o in list(bpy.data.collections["Q10C_Asset"].all_objects):
            bpy.data.objects.remove(o)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, model + ".glb"))
        tag = "-glb"
    asset = [o for o in bpy.context.scene.objects if not o.name.startswith(("PV_", "CAM_"))]
    if "--clay" in args:
        clay(asset)
        tag += "-clay"
    sc = bpy.context.scene
    print("DEVICE", gpu(sc))
    sc.cycles.samples = int(opt.get("--samples", 128))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 64
    sc.cycles.max_bounces = 8
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    trace = bpy.data.objects.get("PV_RouteTrace")
    for v in views:
        cam = bpy.data.objects.get("CAM_" + v.upper()) or camera(v, bpy.data.collections["Q10C_Preview"])
        sc.camera = cam
        sc.render.resolution_x, sc.render.resolution_y = CAMERAS[v][3]
        if trace:
            trace.hide_render = v != "top"
        cut = []
        if v == "section":                                                      # cut away the near half (y < 0)
            for o in asset:
                if o.type == "MESH" and o.name.startswith(("HILL_PLAZA_TREE", "PV_Tree")):
                    o.hide_render = True
                    cut.append(o)
        sc.render.filepath = os.path.join(out, "q10c-%s%s%s.png" % (v, model[len(ASSET):], tag))
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)
        for o in cut:
            o.hide_render = False
        if v == "main" and "--compare" in opt:
            compare(sc.render.filepath, opt["--compare"], os.path.join(out, "q10c-main%s-vs-target.jpg" % tag))


if __name__ == "__main__":
    render()
