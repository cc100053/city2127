"""Preview light, cameras and renders of Q09-A 光翼海灣自在館 (nothing here is exported).

blender -b q09a-wing-wellness.blend --python-exit-code 1 -P review_wing_wellness.py -- <out_dir> [view ...]
    [--samples N] [--scale PCT] [--blank] [--clay] [--nopeople] [--compare TARGET] [--tag T]
Views: main (on the walkway in front of the building, left of centre, eye 1.7 m: gym on the left, yoga mats on the right,
reading terrace and the wings above, square like the reference), sea (oblique from the sea side over the three terraces),
gym (close-up through the gym glass: weight stacks, dumbbells, bikes), yoga (close-up through the yoga glass: mats,
cabinet, slatted wall), wing_root (ridge beam, clevis roots and struts on the top roof), top (orthographic plan).
--blank imports the GLB alone into an empty scene with the same light and cameras; --clay renders a grey model (glass
and wing membranes kept see-through); --nopeople hides the display figures; --compare TARGET writes main beside the
reference.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pavilion as L  # noqa: E402

ASSET = "q09a-wing-wellness"
MAIN_EYE = (-1.0, -9.0, 1.5)      # on the walkway, 9 m out: by the design's 30 x 18 m the ground floor is wider and lower
                                   # than the sheet's image, so the camera stands close to give it the same share

CAMERAS = {  # name: (location, look-at, lens mm, resolution, ortho scale, shift_y)
    "main": (MAIN_EYE, (1.0, 6.0, 1.5), 14, (1400, 1400), None, .22),
    "sea": ((-38.0, -42.0, 24.0), (0.0, 7.0, 7.0), 30, (1600, 1200), None, 0),
    "gym": ((-4.6, -4.2, 1.6), (-7.6, 6.5, .9), 24, (1600, 1200), None, 0),
    "yoga": ((7.8, -4.0, 1.9), (6.2, 6.0, .2), 24, (1600, 1200), None, 0),
    "wing_root": ((-9.0, 2.0, 15.5), (0.0, 10.5, 12.2), 26, (1600, 1200), None, 0),
    "top": ((0.0, 4.0, 300.0), (0.0, 4.0, 0.0), 50, (1400, 1200), 52, 0),
}


def stage(scene, col):
    sun = bpy.data.lights.new("PV_Sun", "SUN")
    sun.energy, sun.color, sun.angle = 2.6, (1.0, .70, .52), math.radians(3.0)
    so = bpy.data.objects.new("PV_Sun", sun)
    so.rotation_euler = (math.radians(76), 0, math.radians(-125))              # low dusk sun from behind-left
    col.objects.link(so)
    fill = bpy.data.lights.new("PV_Fill", "SUN")                                # soft sky fill from the sea side
    fill.energy, fill.color, fill.angle = .7, (.75, .78, 1.0), math.radians(30)
    fo = bpy.data.objects.new("PV_Fill", fill)
    fo.rotation_euler = (math.radians(55), 0, math.radians(20))
    col.objects.link(fo)
    world(scene)
    for name in CAMERAS:
        camera(name, col)
    scene.camera = bpy.data.objects["CAM_MAIN"]
    scene.render.resolution_x, scene.render.resolution_y = CAMERAS["main"][3]


def camera(name, col, spec=None):
    loc, look, lens, res, ortho, shift = spec or CAMERAS[name]
    ob = bpy.data.objects.get("CAM_" + name.upper())
    if ob is None:
        cd = bpy.data.cameras.new("CAM_" + name.upper())
        ob = bpy.data.objects.new("CAM_" + name.upper(), cd)
        col.objects.link(ob)
    cd = ob.data
    cd.lens, cd.clip_end, cd.clip_start = lens, 12000, .05
    cd.shift_y = shift
    cd.type = "ORTHO" if ortho else "PERSP"
    if ortho:
        cd.ortho_scale = ortho
    ob.location = loc
    ob.rotation_euler = (0, 0, 0) if name == "top" else (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob


def world(scene):
    """Dusk sky: peach at the horizon, rose, then violet-blue overhead (as the reference)."""
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
    el = ramp.color_ramp.elements
    el[0].position, el[0].color = 0.0, (1.0, .62, .42, 1)
    el[1].position, el[1].color = .55, (.20, .22, .62, 1)
    for pos, col in ((.08, (.95, .55, .62, 1)), (.22, (.55, .45, .85, 1))):
        e = el.new(pos)
        e.color = col
    nt.links.new(ramp.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = .9
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Punchy"
    except TypeError as e:
        print("LOOK", e)
    scene.view_settings.exposure = .3


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
    grey = bpy.data.materials.new("PV_Clay")
    b = next(n for n in grey.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (.72, .72, .70, 1)
    b.inputs["Roughness"].default_value = .75
    for ob in objs:
        if ob.type != "MESH":
            continue
        for slot in ob.material_slots:
            m = slot.material
            if m and next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Alpha"].default_value >= 1:
                slot.link = "OBJECT"
                slot.material = grey


def sheet(paths, out_jpg, h=900):
    """Images side by side at the same height (JPEG)."""
    import numpy as np
    imgs = []
    for p in paths:
        im = bpy.data.images.load(p)
        w = round(im.size[0] * h / im.size[1])
        im.scale(w, h)
        px = np.empty(w * h * 4, dtype=np.float32)
        im.pixels.foreach_get(px)
        imgs.append(px.reshape(h, w, 4))
        imgs.append(np.ones((h, 16, 4), dtype=np.float32))
    s = np.concatenate(imgs[:-1], axis=1)
    out = bpy.data.images.new("q09a_sheet", s.shape[1], h, alpha=False)
    out.pixels.foreach_set(s.ravel())
    out.filepath_raw = out_jpg
    out.file_format = "JPEG"
    out.save()
    print("SHEET", out_jpg)


def render():
    args = sys.argv[sys.argv.index("--") + 1:]
    out = os.path.abspath(args[0])
    os.makedirs(out, exist_ok=True)
    keys = ("--samples", "--scale", "--compare", "--tag")
    opt = {args[i]: args[i + 1] for i in range(len(args) - 1) if args[i] in keys}
    skip = {args[i + 1] for i in range(len(args) - 1) if args[i] in keys}
    views = [a for a in args[1:] if not a.startswith("--") and a not in skip] or ["main"]
    tag = opt.get("--tag", "")
    if "--blank" in args:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        col = bpy.data.collections.new("Q09A_Preview")
        bpy.context.scene.collection.children.link(col)
        stage(bpy.context.scene, col)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, ASSET + ".glb"))
        roots = [o.name for o in bpy.context.scene.objects if o.name.startswith("Q09A_WingWellness")]
        assert len(roots) == 1, roots
        tag += "-blank"
    col = bpy.data.collections["Q09A_Preview"]
    asset = [o for o in bpy.context.scene.objects if not o.name.startswith(("PV_", "CAM_"))]
    if "--clay" in args:
        clay(asset)
        tag += "-clay"
    ppl = bpy.data.objects.get("PV_People")
    if ppl and "--nopeople" in args:
        ppl.hide_render = True
    sc = bpy.context.scene
    print("DEVICE", gpu(sc))
    sc.cycles.samples = int(opt.get("--samples", 128))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 48
    sc.cycles.max_bounces = 8
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    for v in views:
        sc.camera = camera(v, col)
        sc.render.resolution_x, sc.render.resolution_y = CAMERAS[v][3]
        sc.render.filepath = os.path.join(out, "q09a-%s%s.png" % (v, tag))
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)
        if v == "main" and "--compare" in opt:
            sheet([sc.render.filepath, opt["--compare"]], os.path.join(out, "q09a-main%s-vs-target.jpg" % tag))


if __name__ == "__main__":
    render()
