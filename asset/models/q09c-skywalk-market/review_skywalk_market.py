"""Preview light, cameras and renders of Q09-C 空中步廊漫遊市集 (nothing here is exported).

blender -b q09c-skywalk-market.blend --python-exit-code 1 -P review_skywalk_market.py -- <out_dir> [view ...]
    [--samples N] [--scale PCT] [--blank] [--clay] [--nopeople] [--compare TARGET] [--tag T]
Views: main (pedestrian in the entrance street, eye 1.6 m: pottery left, books right, the stair and skywalks rising to
the canopy courtyard, the lanes carrying on under them; square like the reference), top (orthographic plan with the
route overlay: ground route teal, upper route amber), fork (closer, at the first corner), under (in the left lane,
under the skywalk, looking along the lane), aerial (the whole block from the street side, above). Light, dusk sky, clay
and sheets come from the Q09-A review module; the route overlay object is shown only in `top`.
"""
import importlib.util
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import market as L  # noqa: E402


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


RA = _load("q09a_review", os.path.join(os.path.dirname(HERE), "q09a-wing-wellness", "review_wing_wellness.py"))

ASSET = "q09c-skywalk-market"
MAIN_EYE = (0.0, -1.5, 1.6)      # at the entrance: the two corner shops turned toward us at the frame's sides, the fork,
                                  # both lanes, the stair and the skywalks ahead
_ul = L.lane_point(-1, 0.0)
CAMERAS = {  # name: (location, look-at, lens mm, resolution, ortho scale, shift_y)
    "main": (MAIN_EYE, (0.0, 20.0, 3.6), 14, (1400, 1400), None, .06),
    "fork": ((.6, 5.2, 1.6), (0.0, 18.0, 3.2), 16, (1600, 1200), None, .04),
    "under": ((_ul[0] + .4, _ul[1] - 6.0, 1.6), (_ul[0] - .5, _ul[1] + 4.0, 2.4), 18, (1600, 1200), None, 0),
    "aerial": ((-26.0, -22.0, 28.0), (0.0, 19.0, 3.0), 30, (1600, 1200), None, 0),
    "top": ((0.0, 18.0, 200.0), (0.0, 18.0, 0.0), 50, (1500, 1100), 60, 0),
}
CAMERAS.update({  # v2 close-ups
    "signs": ((0.0, 1.0, 1.6), (0.0, 14.0, 3.2), 15, (1600, 1100), None, .04),       # at the first fork
    "poster": ((-3.5, 8.0, 1.6), (-10.95, 11.2, 1.25), 30, (1200, 1200), None, 0),
})
RA.CAMERAS = CAMERAS


def stage(scene, col):
    RA.stage(scene, col)


def set_light(scene, mode):
    """Re-light an opened file for 'day' (afternoon sun, blue sky); 'dusk' keeps the staging the builder saved."""
    if mode != "day":
        return
    import math
    sun, fill = bpy.data.objects.get("PV_Sun"), bpy.data.objects.get("PV_Fill")
    if sun:
        sun.data.energy, sun.data.color = 4.2, (1.0, .95, .88)
        sun.rotation_euler = (math.radians(42), 0, math.radians(-140))
    if fill:
        fill.data.energy = .9
    w = scene.world
    ramp = next((n for n in w.node_tree.nodes if n.type == "VALTORGB"), None) if w and w.node_tree else None
    if ramp:
        cols = ((0.0, (.92, .9, .86, 1)), (.08, (.72, .82, .95, 1)), (.22, (.45, .62, .92, 1)), (.55, (.2, .38, .82, 1)))
        for el, (pos, col) in zip(sorted(ramp.color_ramp.elements, key=lambda e: e.position), cols):
            el.position, el.color = pos, col
    scene.view_settings.exposure = 0.0


def render():
    args = sys.argv[sys.argv.index("--") + 1:]
    out = os.path.abspath(args[0])
    os.makedirs(out, exist_ok=True)
    keys = ("--samples", "--scale", "--compare", "--tag", "--light", "--model", "--against")
    opt = {args[i]: args[i + 1] for i in range(len(args) - 1) if args[i] in keys}
    skip = {args[i + 1] for i in range(len(args) - 1) if args[i] in keys}
    views = [a for a in args[1:] if not a.startswith("--") and a not in skip] or ["main"]
    tag = opt.get("--tag", "")
    if "--blank" in args:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        col = bpy.data.collections.new("Q09C_Preview")
        bpy.context.scene.collection.children.link(col)
        stage(bpy.context.scene, col)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, opt.get("--model", ASSET) + ".glb"))
        roots = [o.name for o in bpy.context.scene.objects if o.name.startswith("Q09C_SkywalkMarket")]
        assert len(roots) == 1, roots
        tag += "-blank"
    col = bpy.data.collections["Q09C_Preview"]
    asset = [o for o in bpy.context.scene.objects if not o.name.startswith(("PV_", "CAM_"))]
    if "--clay" in args:
        RA.clay(asset)
        tag += "-clay"
    ppl = bpy.data.objects.get("PV_People")
    if ppl and "--nopeople" in args:
        ppl.hide_render = True
    routes = bpy.data.objects.get("PV_Routes")
    sc = bpy.context.scene
    if opt.get("--light", "dusk") == "day":
        set_light(sc, "day")
        tag += "-day"
    print("DEVICE", RA.gpu(sc))
    sc.cycles.samples = int(opt.get("--samples", 128))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 48
    sc.cycles.max_bounces = 8
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    for v in views:
        if routes:
            routes.hide_render = v != "top"
        sc.camera = RA.camera(v, col)
        sc.render.resolution_x, sc.render.resolution_y = CAMERAS[v][3]
        sc.render.filepath = os.path.join(out, "q09c-%s%s.png" % (v, tag))
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)
        if v == "main" and "--compare" in opt:
            RA.sheet([sc.render.filepath, opt["--compare"]], os.path.join(out, "q09c-main%s-vs-target.jpg" % tag))
        other = os.path.join(out, "q09c-%s%s.png" % (v, opt.get("--against", "")))
        if "--against" in opt and os.path.exists(other):                        # same view, an earlier version beside it
            RA.sheet([other, sc.render.filepath], os.path.join(out, "q09c-%s%s-vs%s.jpg" % (v, opt["--against"], tag)))


if __name__ == "__main__":
    render()
