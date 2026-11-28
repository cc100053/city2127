"""Preview light, cameras and renders of Q09-B 花冠港灣共桌食堂 (nothing here is exported).

blender -b q09b-petal-canteen.blend --python-exit-code 1 -P review_petal_canteen.py -- <out_dir> [view ...]
    [--samples N] [--scale PCT] [--blank] [--clay] [--nopeople] [--compare TARGET] [--tag T]
Views: main (just inside the sea-side entrance, eye 1.55 m: a long table in the foreground, the kitchen and hood in the
middle, the whole petal crown above; square like the reference), table (seated at the end of the 240 deg table, looking
along it to the kitchen), aerial (the whole hall from the sea side, above), top (orthographic plan: serving ring, table
passages, service door). Light, dusk sky, clay and sheets come from the Q09-A review module (same staging).
"""
import importlib.util
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hall as L  # noqa: E402


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


RA = _load("q09a_review", os.path.join(os.path.dirname(HERE), "q09a-wing-wellness", "review_wing_wellness.py"))

ASSET = "q09b-petal-canteen"
CX, CY = L.C
MAIN_EYE = (-3.5, 2.9, 1.55)      # in the sea entrance's aisle, 13.6 m from the centre, beside the 240 deg table: from
                                   # here the crown rises through the open centre over the outer petal ring (round 1)
TABLE_EYE = (-7.82, 3.66, 1.25)
CAMERAS = {  # name: (location, look-at, lens mm, resolution, ortho scale, shift_y)
    "main": (MAIN_EYE, (.3, CY, 6.6), 13, (1400, 1400), None, 0),
    "front": ((-3.0, -5.0, 1.6), (0.0, CY, 6.5), 14, (1400, 1400), None, 0),
    "table": (TABLE_EYE, (CX, CY, 1.5), 22, (1600, 1200), None, .05),
    "aerial": ((-30.0, -24.0, 26.0), (CX, CY, 5.0), 30, (1600, 1200), None, 0),
    "top": ((CX, CY + 2, 200.0), (CX, CY + 2, 0.0), 50, (1300, 1400), 46, 0),
}
RA.CAMERAS = CAMERAS                                                            # RA.camera() / RA.stage() read these


def stage(scene, col):
    RA.stage(scene, col)


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
        col = bpy.data.collections.new("Q09B_Preview")
        bpy.context.scene.collection.children.link(col)
        stage(bpy.context.scene, col)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, ASSET + ".glb"))
        roots = [o.name for o in bpy.context.scene.objects if o.name.startswith("Q09B_PetalCanteen")]
        assert len(roots) == 1, roots
        tag += "-blank"
    col = bpy.data.collections["Q09B_Preview"]
    asset = [o for o in bpy.context.scene.objects if not o.name.startswith(("PV_", "CAM_"))]
    if "--clay" in args:
        RA.clay(asset)
        tag += "-clay"
    ppl = bpy.data.objects.get("PV_People")
    if ppl and "--nopeople" in args:
        ppl.hide_render = True
    sc = bpy.context.scene
    print("DEVICE", RA.gpu(sc))
    sc.cycles.samples = int(opt.get("--samples", 128))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 64
    sc.cycles.max_bounces = 8
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    for v in views:
        sc.camera = RA.camera(v, col)
        sc.render.resolution_x, sc.render.resolution_y = CAMERAS[v][3]
        sc.render.filepath = os.path.join(out, "q09b-%s%s.png" % (v, tag))
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)
        if v == "main" and "--compare" in opt:
            RA.sheet([sc.render.filepath, opt["--compare"]], os.path.join(out, "q09b-main%s-vs-target.jpg" % tag))


if __name__ == "__main__":
    render()
