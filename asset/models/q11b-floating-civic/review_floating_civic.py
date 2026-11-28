"""Preview light, cameras and renders of the Q11-B floating civic building (nothing here is exported).

blender -b q11b-floating-civic.blend --python-exit-code 1 -P review_floating_civic.py -- <out_dir> [view ...]
        [--state normal|high] [--samples N] [--scale PCT] [--glb] [--blank] [--clay] [--tag NAME]
Views: main (shore side, about 30 deg down, 4:3: the bridge from the foreground to the building, four pillars and the
roof), bridge (orthographic side section along the bridge from +x: hinge, steps, water, seat, float edge), bridgeclose
(from the shore walk along the three nested segments and their joints), slider (one
pillar's carriage close up: arm, pin joint, rails, both roller sets), top (orthographic plan), elev (orthographic land-side
elevation), aerial. --state picks the water state (frame 1 normal, frame 2 high tide; default high). --glb replaces the
model by the exported GLB (high tide only); --blank renders the GLB alone in an empty scene with only the preview sun, sky
and cameras; --clay renders a white massing model.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ASSET = "q11b-floating-civic"
ROOT = "Q11B_FloatingCivic"


def pol(r, deg, z):
    return (r * math.cos(math.radians(deg)), r * math.sin(math.radians(deg)), z)


CAMERAS = {  # name: (location, look-at, lens mm, resolution, ortho scale)
    "main": (pol(114, 298, 64), (-2, -24, 5), 26, (1600, 1200), None),
    "bridge": ((150, -60, 9.5), (0, -60, 9.5), 50, (1600, 900), 66),
    "bridgeclose": ((8.5, -86.5, 7.6), (-.5, -58, 5.4), 22, (1600, 1200), None),        # from the shore walk along the bridge
    "slider": ((-22.6, -37.6, 10.2), (-28.6, -28.9, 4.2), 24, (1600, 1200), None),        # beside pillar SW, into the gap
    "top": ((0, 0, 600), (0, 0, 0), 50, (1400, 1400), 240),
    "elev": (pol(600, 270, 18), (0, 0, 18), 50, (1600, 900), 150),
    "aerial": (pol(170, 235, 150), (0, 0, 5), 30, (1600, 1200), None),
}
STATE_FRAME = {"normal": 1, "high": 2}
CLIP = {"bridge": 146.4}                                                            # section: drop everything at x > 3


def stage(scene, col):
    sun = bpy.data.lights.new("PV_Sun", "SUN")
    sun.energy, sun.color, sun.angle = 3.8, (1.0, .965, .91), math.radians(1.2)
    so = bpy.data.objects.new("PV_Sun", sun)
    so.rotation_euler = (math.radians(42), 0, math.radians(-58))                  # early-summer late morning, front left
    col.objects.link(so)
    world(scene)
    for name in CAMERAS:
        camera(name, col)
    scene.camera = bpy.data.objects["CAM_MAIN"]
    scene.render.resolution_x, scene.render.resolution_y = CAMERAS["main"][3]


def aim(ob, name):
    loc, look, lens, _res, ortho = CAMERAS[name]
    ob.location, ob.data.lens = loc, lens
    ob.data.clip_start = CLIP.get(name, .1)
    ob.data.type = "ORTHO" if ortho else "PERSP"
    if ortho:
        ob.data.ortho_scale = ortho
    ob.rotation_euler = (0, 0, 0) if name == "top" else (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


def camera(name, col):
    cd = bpy.data.cameras.new("CAM_" + name.upper())
    cd.clip_end, cd.clip_start = 15000, .1
    ob = bpy.data.objects.new("CAM_" + name.upper(), cd)
    col.objects.link(ob)
    aim(ob, name)
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
    col = bpy.data.collections.get("Q11B_Asset")
    if col:
        return list(col.all_objects)
    root = next(o for o in bpy.data.objects if o.name.startswith(ROOT))
    return [root] + list(root.children_recursive)


def clay():
    white = bpy.data.materials.new("PV_Clay")
    b = next(n for n in white.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (.8, .8, .78, 1)
    b.inputs["Roughness"].default_value = .7
    for ob in asset_objects():
        if ob.type != "MESH":
            continue
        for slot in ob.material_slots:
            m = slot.material
            bs = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m else None
            if bs and bs.inputs["Alpha"].default_value >= 1:
                slot.link = "OBJECT"
                slot.material = white


def render():
    args = sys.argv[sys.argv.index("--") + 1:]
    out = os.path.abspath(args[0])
    os.makedirs(out, exist_ok=True)
    opt = {args[i]: args[i + 1] for i in range(len(args) - 1) if args[i] in ("--samples", "--scale", "--tag", "--state")}
    skip = set(opt.values())
    views = [a for a in args[1:] if not a.startswith("--") and a not in skip] or ["main"]
    here = os.path.dirname(os.path.abspath(__file__))
    glb = os.path.join(here, ASSET + ".glb")
    state = opt.get("--state", "high")
    tag = ""
    if "--blank" in args:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        col = bpy.data.collections.new("Q11B_Preview")
        bpy.context.scene.collection.children.link(col)
        stage(bpy.context.scene, col)
        bpy.ops.import_scene.gltf(filepath=glb)
        roots = [o.name for o in bpy.context.scene.objects if o.name.startswith(ROOT)]
        print("IMPORTED objects=%d roots=%s" % (len([o for o in bpy.context.scene.objects if o.select_get()]), roots))
        assert len(roots) == 1, roots
        tag, state = "-glb-blank", "high"
    elif "--glb" in args:
        for o in list(bpy.data.collections["Q11B_Asset"].all_objects):
            bpy.data.objects.remove(o)
        bpy.ops.import_scene.gltf(filepath=glb)
        tag, state = "-glb", "high"
    else:
        bpy.context.scene.frame_set(STATE_FRAME[state])
    if "--clay" in args:
        clay()
        tag += "-clay"
    tag += ("-" + opt["--tag"]) if "--tag" in opt else ""
    sc = bpy.context.scene
    print("DEVICE", gpu(sc), "STATE", state)
    sc.cycles.samples = int(opt.get("--samples", 96))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 32
    sc.cycles.max_bounces = 8
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    for v in views:
        cam = bpy.data.objects.get("CAM_" + v.upper()) or camera(v, bpy.data.collections["Q11B_Preview"])
        aim(cam, v)
        sc.camera = cam
        sc.render.resolution_x, sc.render.resolution_y = CAMERAS[v][3]
        sc.render.filepath = os.path.join(out, "q11b-%s-%s%s.png" % (v, state, tag))
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)


if __name__ == "__main__":
    render()
