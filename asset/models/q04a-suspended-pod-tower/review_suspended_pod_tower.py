"""Preview light, cameras and renders of the Q04-A suspended pod tower (nothing here is exported).

blender -b q04a-suspended-pod-tower-v2.blend --python-exit-code 1 -P review_suspended_pod_tower.py -- <out_dir> [view ...] [--samples N] [--scale PCT] [--glb]
Views: main (reference angle, 4:3), top (orthographic plan), pod (one dwelling, front oblique), room (the sample room
from outside its window), trio (three neighbouring dwellings, three accents), back (its entrance and
bridge), under (from the entrance side, looking up), elev (orthographic elevation).
"""
import math
import os
import sys

import bpy
from mathutils import Vector


def pol(r, deg, z):
    return (r * math.cos(math.radians(deg)), r * math.sin(math.radians(deg)), z)


HERO = "OUTER_17"


def cameras(by):
    h = by[HERO]
    c, d, z = pol(h["R"], h["angle"], 0), h["angle"], h["z"]

    def near(out, side, up, look_z):
        p = pol(h["R"] + out, d, z + up)
        t = (-math.sin(math.radians(d)), math.cos(math.radians(d)))
        return (p[0] + t[0] * side, p[1] + t[1] * side, p[2]), (c[0], c[1], z + look_z)
    def window(name, side, out=6.6, up=3.9):
        """Camera outside one dwelling's window, `side` m along the facade, looking at the opening."""
        q = by[name]
        a = math.radians(q["angle"])
        o, t = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
        p = (q["R"] + out, side)
        return (p[0] * o[0] + p[1] * t[0], p[0] * o[1] + p[1] * t[1], q["z"] + up), ((q["R"] + 2.0) * o[0], (q["R"] + 2.0) * o[1], q["z"] + 1.75)
    return {
        "main": (pol(60, -45, 56), (0, 0, 31), 26, (1600, 1200), None),
        "top": ((0, 0, 300), (0, 0, 0), 50, (1600, 1600), 84),
        "pod": (*near(9.4, 4.3, 4.6, 3.75), 31, (1400, 1600), None),
        "room": (*window(HERO, 2.25), 40, (1600, 1300), None),
        "room_bed": (*window("OUTER_20", -2.25), 40, (1600, 1300), None),
        "room_plant": (*window("OUTER_05", -2.25), 40, (1600, 1300), None),
        "trio": (pol(59, -42, 44), pol(20, -43, 32.2), 38, (1600, 1200), None),
        "back": (*near(-7.5, -8.5, 5.0, 3.0), 30, (1600, 1200), None),
        "under": (pol(33, -45, 1.7), (0, 0, 27), 20, (1200, 1500), None),
        "elev": (pol(300, -90, 30), (0, 0, 30), 50, (1600, 1300), 84),
    }


def stage(scene, col, by):
    sun = bpy.data.lights.new("PV_Sun", "SUN")
    sun.energy, sun.color, sun.angle = 4.0, (1.0, .955, .88), math.radians(.8)
    so = bpy.data.objects.new("PV_Sun", sun)
    so.rotation_euler = (math.radians(42), 0, math.radians(8))                   # high early-summer sun from the south
    col.objects.link(so)
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
    ramp.color_ramp.elements[0].color = (.46, .68, .95, 1)
    ramp.color_ramp.elements[1].color = (.16, .38, .85, 1)
    ramp.color_ramp.elements[1].position = .55
    nt.links.new(ramp.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = .9
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - High Contrast"
    except TypeError as e:
        print("LOOK", e)
    scene.view_settings.exposure = -.5
    for name, (loc, look, lens, _res, ortho) in cameras(by).items():
        cd = bpy.data.cameras.new("CAM_" + name.upper())
        cd.lens, cd.clip_end, cd.clip_start = lens, 9000, .1
        if ortho:
            cd.type, cd.ortho_scale = "ORTHO", ortho
        ob = bpy.data.objects.new("CAM_" + name.upper(), cd)
        ob.location = loc
        ob.rotation_euler = (0, 0, 0) if name == "top" else (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        col.objects.link(ob)
    scene.camera = bpy.data.objects["CAM_MAIN"]
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1200


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
    opt = {args[i]: args[i + 1] for i in range(len(args) - 1) if args[i] in ("--samples", "--scale")}
    skip = set(opt.values())
    views = [a for a in args[1:] if not a.startswith("--") and a not in skip] or ["main", "top", "pod"]
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import layout as LY
    if "--glb" in args:                                                          # replace the model by the exported GLB
        for o in list(bpy.data.collections["Q04A_Asset"].all_objects):
            bpy.data.objects.remove(o)
        bpy.ops.import_scene.gltf(filepath=os.path.join(os.path.dirname(os.path.abspath(__file__)), "q04a-suspended-pod-tower-v2.glb"))
    cams = cameras({p["name"]: p for p in LY.cached()[0]})
    sc = bpy.context.scene
    print("DEVICE", gpu(sc))
    sc.cycles.samples = int(opt.get("--samples", 160))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 48
    sc.cycles.max_bounces = 8
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    for v in views:
        sc.camera = bpy.data.objects["CAM_" + v.upper()]
        sc.render.resolution_x, sc.render.resolution_y = cams[v][3]
        sc.render.filepath = os.path.join(out, "q04a-v2-%s.png" % v)
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)


if __name__ == "__main__":
    render()
