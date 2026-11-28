"""Preview light, cameras and renders of the Q11-A rotating-shell shelter (nothing here is exported).

blender -b q11a-rotating-shell-shelter.blend --python-exit-code 1 -P review_rotating_shell.py -- <out_dir> [view ...]
    [--state 0|90|180] [--states] [--samples N] [--scale PCT] [--glb] [--blank] [--clay] [--model NAME] [--compare TARGET]
Views: main (city side, toward +x, about 30 deg down, 4:3), top (orthographic plan), bogie (one bogie from outside the track,
picked nearest bearing -100 in the current state), bogie_side (the same bogie along the track at wheel height),
roof (the stowage bay and the lead panel from above), roof_section (orthographic cut through the roof's sliding axis),
passage_section (orthographic cut along the -104 deg passage), passage (eye height on the ramp, into the tunnel),
well (the battery room and observation well through the glass).
--state sets the state for every view (default: the file's state); --states renders `main` in 0, 90 and 180 and writes
q11a-states.jpg (the three side by side). --blank imports the GLB alone into an empty scene with light and cameras;
--glb swaps the model for the GLB; --clay renders white massing (glass kept clear); --compare TARGET writes the main
render beside the reference.
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import shelter as L  # noqa: E402

ASSET = "q11a-rotating-shell-shelter"


def pol(r, deg, z):
    return (r * math.cos(math.radians(deg)), r * math.sin(math.radians(deg)), z)


def _sec_cam(bearing, r, z):
    """Orthographic section camera: cut plane = the vertical plane through the origin along `bearing`; the camera
    stands 400 m off on the normal (bearing + 90) with clip_start 400, so everything on its side is cut away."""
    c = Vector(pol(r, bearing, z))
    n = Vector(pol(1, bearing + 90, 0))
    return tuple(c + n * 400), tuple(c)


PS_LOC, PS_LOOK = _sec_cam(L.PASSAGES[0], 74.0, -3.0)

CAMERAS = {  # name: (location, look-at, lens mm, resolution, ortho scale, clip_start)
    "main": (pol(158, -22, 84), (2, 0, 10), 32, (1600, 1200), None, .1),
    "top": ((0, 0, 400), (0, 0, 0), 50, (1500, 1500), 140, .1),
    "passage_section": (PS_LOC, PS_LOOK, 50, (1800, 900), 96, 400.0),
    "passage": (pol(84, -104.6, -.9), pol(30, -104, -3.8), 24, (1600, 1200), None, .1),
    "well": (pol(66, 6, 8.5), pol(72, -9, -4.5), 26, (1600, 1200), None, .1),
}


def stage(scene, col):
    sun = bpy.data.lights.new("PV_Sun", "SUN")
    sun.energy, sun.color, sun.angle = 5.0, (1.0, .96, .9), math.radians(1.5)
    so = bpy.data.objects.new("PV_Sun", sun)
    so.rotation_euler = (math.radians(35), 0, math.radians(-25))                # early-summer noon, soft
    col.objects.link(so)
    world(scene)
    for name in CAMERAS:
        camera(name, col)
    scene.camera = bpy.data.objects["CAM_MAIN"]
    scene.render.resolution_x, scene.render.resolution_y = CAMERAS["main"][3]


def camera(name, col, spec=None):
    loc, look, lens, res, ortho, clip = spec or CAMERAS[name]
    ob = bpy.data.objects.get("CAM_" + name.upper())
    if ob is None:
        cd = bpy.data.cameras.new("CAM_" + name.upper())
        ob = bpy.data.objects.new("CAM_" + name.upper(), cd)
        col.objects.link(ob)
    cd = ob.data
    cd.lens, cd.clip_end, cd.clip_start = lens, 12000, clip
    cd.type = "ORTHO" if ortho else "PERSP"
    if ortho:
        cd.ortho_scale = ortho
    ob.location = loc
    ob.rotation_euler = (0, 0, 0) if name == "top" else (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
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
    ramp.color_ramp.elements[0].color = (.70, .84, 1.0, 1)
    ramp.color_ramp.elements[1].color = (.22, .48, .95, 1)
    ramp.color_ramp.elements[1].position = .55
    nt.links.new(ramp.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = .8
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Punchy"
    except TypeError as e:
        print("LOOK", e)
    scene.view_settings.exposure = 0.0


def set_state(angle):
    """Same as the builder's set_state: turn MOVING to -angle, slide each ROOF_PANEL_k to its offset for the state."""
    piv = next(o for o in bpy.data.objects if o.name.split(".")[0] == "MOVING")
    piv.rotation_euler = (0, 0, -math.radians(angle))
    for k, off in enumerate(L.panel_offsets(L.STATES[angle])):
        p = next(o for o in bpy.data.objects if o.name.split(".")[0] == "ROOF_PANEL_%d" % k)
        p.location = (0, off, 0)
    bpy.context.view_layer.update()


def state_cameras(col):
    """Cameras that follow the moving parts: a bogie close-up and the roof views, recomputed for the current state."""
    bogies = [o for o in bpy.data.objects if o.name.startswith("BOGIE_")]
    want = Vector(pol(1, -100, 0))
    bg = max(bogies, key=lambda o: o.matrix_world.translation.normalized().dot(want))
    M = bg.matrix_world
    camera("bogie", col, (tuple(M @ Vector((-3.4, 7.2, 2.6))), tuple(M @ Vector((0, .6, 2.1))), 30, (1600, 1200), None, .1))
    camera("bogie_side", col, (tuple(M @ Vector((-7.5, 2.6, 1.9))), tuple(M @ Vector((0, .2, 2.2))), 30, (1600, 1200), None, .1))
    R = next(o for o in bpy.data.objects if o.name.split(".")[0] == "MOVING").matrix_world
    c = R @ Vector((0, -22.0, 48.4))
    n = (R.to_3x3() @ Vector((1, 0, 0))).normalized()
    camera("roof_section", col, (tuple(c + n * 400), tuple(c), 50, (1800, 1000), 40, 400.0))
    camera("roof", col, (tuple(R @ Vector((34, -60, 70))), tuple(R @ Vector((0, -22, 48))), 32, (1600, 1200), None, .1))


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


def sheet(paths, out_jpg, h=700):
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
    out = bpy.data.images.new("q11a_sheet", s.shape[1], h, alpha=False)
    out.pixels.foreach_set(s.ravel())
    out.filepath_raw = out_jpg
    out.file_format = "JPEG"
    out.save()
    print("SHEET", out_jpg)


def render():
    args = sys.argv[sys.argv.index("--") + 1:]
    out = os.path.abspath(args[0])
    os.makedirs(out, exist_ok=True)
    keys = ("--samples", "--scale", "--model", "--compare", "--state")
    opt = {args[i]: args[i + 1] for i in range(len(args) - 1) if args[i] in keys}
    model = opt.get("--model", ASSET)
    skip = {args[i + 1] for i in range(len(args) - 1) if args[i] in keys}
    views = [a for a in args[1:] if not a.startswith("--") and a not in skip] or ["main"]
    tag = ""
    if "--blank" in args:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        col = bpy.data.collections.new("Q11A_Preview")
        bpy.context.scene.collection.children.link(col)
        stage(bpy.context.scene, col)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, model + ".glb"))
        roots = [o.name for o in bpy.context.scene.objects if o.name.startswith("Q11A_RotatingShellShelter")]
        print("IMPORTED objects=%d roots=%s" % (len([o for o in bpy.context.scene.objects if o.select_get()]), roots))
        assert len(roots) == 1, roots
        tag = "-blank"
    elif "--glb" in args:
        for o in list(bpy.data.collections["Q11A_Asset"].all_objects):
            bpy.data.objects.remove(o)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, model + ".glb"))
        tag = "-glb"
    col = bpy.data.collections["Q11A_Preview"]
    asset = [o for o in bpy.context.scene.objects if not o.name.startswith(("PV_", "CAM_"))]
    if "--clay" in args:
        clay(asset)
        tag += "-clay"
    sc = bpy.context.scene
    print("DEVICE", gpu(sc))
    sc.cycles.samples = int(opt.get("--samples", 128))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 32
    sc.cycles.max_bounces = 8
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    jobs = [(int(opt["--state"]) if "--state" in opt else None, v) for v in views]
    if "--states" in args:
        jobs = [(s, "main") for s in (0, 90, 180)] + [j for j in jobs if j[1] != "main"]
    done = []
    for st, v in jobs:
        cur = st if st is not None else int(sc.get("q11a_state", L.DEFAULT_STATE))
        set_state(cur)                                                          # the file's state unless a job names one
        state_cameras(col)
        sc.camera = camera(v, col, None) if v in CAMERAS else bpy.data.objects["CAM_" + v.upper()]
        cam = sc.camera
        sc.render.resolution_x, sc.render.resolution_y = (CAMERAS[v][3] if v in CAMERAS else
                                                          (1800, 1000) if v.endswith("section") else (1600, 1200))
        del cam
        name = "q11a-%s-%03d%s%s.png" % (v, cur, model[len(ASSET):], tag)
        sc.render.filepath = os.path.join(out, name)
        land = bpy.data.objects.get("PV_Land")
        if land:
            land.hide_render = v.endswith("section")
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)
        done.append((cur, v, sc.render.filepath))
        if v == "main" and "--compare" in opt and cur == L.DEFAULT_STATE:
            sheet([sc.render.filepath, opt["--compare"]], os.path.join(out, "q11a-main%s-vs-target.jpg" % tag), 900)
    mains = [p for s, v, p in done if v == "main"]
    if "--states" in args and len(mains) == 3:
        sheet(mains, os.path.join(out, "q11a-states%s.jpg" % tag), 600)


if __name__ == "__main__":
    render()
