"""Preview light, cameras and renders of the Q10-B material bank (nothing here is exported).

blender -b q10b-material-bank.blend --python-exit-code 1 -P review_material_bank.py -- <out_dir> [view ...] [--samples N]
    [--scale PCT] [--glb | --blank] [--blend PATH]
Views: main (oblique from the plaza, the reference angle, 4:3), rack (library wall and a gripper, close), forming (forming
room and the bridge mouth), walk (eye level on the covered walkway), template / template_mid (the one-bay wall template:
eye level from the plaza, and mid height), top (orthographic plan).
--glb replaces the model by the exported GLB; --blank renders the GLB alone, imported once into an empty scene with only
the preview light and cameras. Camera points are given in the builder's straight frame and bent like the building.
"""
import importlib.util
import math
import os
import sys

import bpy
from mathutils import Vector

ASSET = "q10b-material-bank"
HERE = os.path.dirname(os.path.abspath(__file__))
BAY, NB, SAG = 62.0 / 24, 39, 7.0                    # keep in step with build_material_bank.py
U0 = -NB * BAY / 2
RB = ((NB * BAY / 2) ** 2 + SAG ** 2) / (2 * SAG)


def bend(u, v, z):
    a = u / RB
    return ((RB + v) * math.sin(a), (RB + v) * math.cos(a) - RB, z)


def lib_u(i):
    return U0 + (6 + i + .5) * BAY


UM = lib_u(5) - BAY / 2                               # first gantry mast
CAMERAS = {  # name: (location, look-at, lens mm, resolution, ortho scale)
    "main": ((-60, -82, 38), (3, -3, 19), 24, (1600, 1200), None),
    "back": ((-44, 66, 32), (4, 4, 19), 24, (1600, 1200), None),           # oblique from the sea side, back left
    "eye": (bend(2, -47, 1.6), bend(-7, -12, 6.0), 20, (1600, 1200), None),  # eye level on the plaza: benches, route, entrance
    "intake": (bend(U0 - 20, -27, 21.5), bend(U0 + 8.5, -6, 19.2), 30, (1600, 1200), None),  # the intake end from the side
    # the owner's three Blender viewport close-ups (Q10B-01..03), matched by eye from the screenshots
    "fig1": (bend(-U0 + 3.0, 1.0, 4.4), bend(-U0 - 32, 4.0, 1.4), 20, (1600, 1000), None),     # ground floor hall, right end
    "fig2": (bend(-U0 - 9 * BAY - 1.5, -18.5, 21.5), bend(-U0 - 9 * BAY + 9, -.5, 12.0), 20, (1600, 1000), None),  # end floors by the racks
    "fig3": (bend(-U0 + 12, -15, 41), bend(-U0 - 1, -4, 30.5), 22, (1600, 1000), None),      # the bridge and its cart, from above
    "rack": (bend(UM + 3.6, -19.5, 13.5), bend(UM + .5, -8.3, 16.6), 30, (1600, 1200), None),
    "forming": (bend(-U0 + 9, -23, 38.5), bend(-U0 - 9, -2.5, 31.5), 24, (1600, 1200), None),
    "walk": (bend(-16, -27, 1.7), bend(-22, -8, 13), 20, (1600, 1200), None),
    "template": ((-2.5, -30, 1.7), (0, -8, 14.5), 22, (1200, 1500), None),
    "template_mid": ((-7, -21, 13), (0, -8.2, 15), 26, (1600, 1200), None),
    "template_grip": ((1.8, -13.2, 18.9), (-.75, -8.3, 17.3), 32, (1600, 1200), None),   # the gripper on a handle
    "top": ((0, -15, 400), (0, -15, 0), 50, (1600, 1200), 190),
}


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def stage(scene, col):
    sun = bpy.data.lights.new("PV_Sun", "SUN")
    sun.energy, sun.color, sun.angle = 5.0, (1.0, .96, .9), math.radians(1.0)
    so = bpy.data.objects.new("PV_Sun", sun)
    so.rotation_euler = (math.radians(40), 0, math.radians(-35))                # late-morning sun from the plaza side, right
    col.objects.link(so)
    _load("q10a_review", os.path.join(os.path.dirname(HERE), "q10a-solar-furnace", "review_solar_furnace.py")).world(scene)  # same sky
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
    opt = {args[i]: args[i + 1] for i in range(len(args) - 1) if args[i] in ("--samples", "--scale", "--model")}
    skip = set(opt.values())
    views = [a for a in args[1:] if not a.startswith("--") and a not in skip] or ["main", "rack", "forming"]
    model = opt.get("--model", ASSET)
    tag = ""
    if "--blank" in args:                                                       # empty scene: light, cameras and one GLB import
        bpy.ops.wm.read_factory_settings(use_empty=True)
        col = bpy.data.collections.new("Q10B_Preview")
        bpy.context.scene.collection.children.link(col)
        stage(bpy.context.scene, col)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, model + ".glb"))
        roots = [o.name for o in bpy.context.scene.objects if o.name.startswith("Q10B_MaterialBank")]
        print("IMPORTED objects=%d roots=%s" % (len([o for o in bpy.context.scene.objects if o.select_get()]), roots))
        assert len(roots) == 1, roots
        tag = "-blank"
    elif "--glb" in args:
        for o in list(bpy.data.collections["Q10B_Asset"].all_objects):
            bpy.data.objects.remove(o)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, model + ".glb"))
        tag = "-glb"
    sc = bpy.context.scene
    print("DEVICE", gpu(sc))
    sc.cycles.samples = int(opt.get("--samples", 128))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 64
    sc.cycles.max_bounces = 10
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    for v in views:
        cam = bpy.data.objects.get("CAM_" + v.upper()) or camera(v, bpy.data.collections["Q10B_Preview"])
        loc, look, lens, _res, _o = CAMERAS[v]                                  # cameras always follow CAMERAS (no rebuild)
        cam.location, cam.data.lens = loc, lens
        if v != "top":
            cam.rotation_euler = (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.camera = cam
        sc.render.resolution_x, sc.render.resolution_y = CAMERAS[v][3]
        sc.render.filepath = os.path.join(out, "q10b-%s%s.png" % (v, tag))
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)


if __name__ == "__main__":
    render()
