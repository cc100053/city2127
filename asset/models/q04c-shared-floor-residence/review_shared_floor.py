"""Preview light, cameras and renders of the Q04-C shared-floor residence (nothing here is exported).

blender -b q04c-shared-floor-residence.blend --python-exit-code 1 -P review_shared_floor.py -- <out_dir> [view ...] [--samples N] [--scale PCT] [--glb]
Views: five (all five furnished storeys at once, reference side, long lens), levels (the five storeys laid out side by side, from above), main (reference angle, all white), plan (L2 from straight above, storeys over it hidden), bird (L2 oblique), top (the L5 storey under the roof), table (standing beside
the dining table, looking to the beds), stair, stair_side, back, under, aisle. --glb renders the exported GLB instead of the .blend's model.
"""
import math
import os
import sys

import bpy
from mathutils import Vector


def _c(r, deg, z):
    return (r * math.cos(math.radians(deg)), r * math.sin(math.radians(deg)), z)


EYE = 11 + 1.60
# name: (position, look-at, lens, resolution, ortho scale, shift_y, white, storeys over L2 hidden)
CAMERAS = {
    "five": (_c(220, 263, 27), _c(0, 0, 17.0), 130, (2400, 1800), None, 0, False, False),
    "levels": ((0, -110, 125), (0, -2.5, 0), 50, (2700, 1650), 168, 0, False, False),
    "main": (_c(80, 265, 24.5), _c(0, 0, 24.5), 40.5, (1600, 1200), None, -.158, True, False),
    "plan": ((0, 0, 60), (0, 0, 0), 50, (1800, 1800), 60, 0, False, True),
    "plan_clean": ((0, 0, 60), (0, 0, 0), 50, (1800, 1800), 60, 0, False, True),
    "bird": (_c(38, 262, 43), (0.4, -2.5, 11), 35, (1800, 1350), None, 0, False, True),
    "table": ((2.75, -11.1, EYE), (6.7, 10, 12.0), 29, (1600, 1100), None, 0, False, False),
    "top": ((2.75, -13.6, 27.6), (4.2, 10, 28.3), 22, (1600, 1100), None, 0, False, False),
    "stair": (_c(58, 296, 14), _c(23, 294, 16), 35, (1200, 1600), None, 0, True, False),
    "stair_side": (_c(52, 330, 18), _c(24, 296, 15), 35, (1200, 1600), None, 0, True, False),
    "back": (_c(80, 80, 24), (0, 0, 17), 40, (1600, 1200), None, 0, True, False),
    "under": (_c(36, 262, 1.7), (2, 0, 14), 20, (1200, 1500), None, 0, True, False),
    "aisle": (_c(15.5, 60, EYE), _c(16.5, 108, 12.0), 22, (1600, 1100), None, 0, False, False),
    "gate": (_c(14.0, 281, EYE), _c(25.5, 288, 12.6), 22, (1600, 1100), None, 0, False, False),
}
KEEP = ("pane_", "warm_light")                                                   # stay as they are in the white view


def stage(scene, col):
    sun = bpy.data.lights.new("PV_Sun", "SUN")
    sun.energy, sun.color, sun.angle = 5.0, (1.0, .955, .88), math.radians(.8)
    so = bpy.data.objects.new("PV_Sun", sun)
    so.rotation_euler = (math.radians(47), 0, math.radians(-36))                   # from the front left, high
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
    ramp.color_ramp.elements[0].color = (.95, 1.15, 1.35, 1)
    ramp.color_ramp.elements[1].color = (.20, .50, 1.1, 1)
    ramp.color_ramp.elements[1].position = .55
    lp, mix = nt.nodes.new("ShaderNodeLightPath"), nt.nodes.new("ShaderNodeMixRGB")       # blue for the camera, neutral as light
    mix.inputs[1].default_value = (.62, .64, .67, 1)
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs[0])
    nt.links.new(ramp.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = .95
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError as e:
        print("LOOK", e)
    scene.view_settings.exposure = -.35
    cameras(scene, col)


def cameras(scene, col):
    for name, (loc, look, lens, _res, ortho, shift, _w, _h) in CAMERAS.items():
        cd = bpy.data.cameras.new("CAM_" + name.upper())
        cd.lens, cd.clip_end, cd.clip_start, cd.shift_y = lens, 12000, .1, shift
        if ortho:
            cd.type, cd.ortho_scale = "ORTHO", ortho
        ob = bpy.data.objects.new("CAM_" + name.upper(), cd)
        ob.location = loc
        ob.rotation_euler = (0, 0, 0) if ortho and look[:2] == loc[:2] else (Vector(look) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
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


def whiten():
    """White-model look: every opaque asset material becomes plain white (memory only)."""
    for m in bpy.data.materials:
        if not m.name.startswith("q04c_") or m.name.startswith("q04c_pv_") or any(k in m.name for k in KEEP):
            continue
        b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        for s in ("Base Color", "Emission Strength"):
            for ln in list(b.inputs[s].links):
                m.node_tree.links.remove(ln)
        g = .50 if any(k in m.name for k in ("paving_band", "stair_tread")) else .80          # floor pattern and treads stay readable
        b.inputs["Base Color"].default_value = (g, g, g * .99, 1)
        b.inputs["Emission Strength"].default_value = 0
        b.inputs["Metallic"].default_value = 0
        b.inputs["Roughness"].default_value = .75


def above_l2(o):
    """Everything above the L2 room: upper storeys, roof, upper stair runs, the ceiling and the service lids."""
    n, anc = o.name, []
    p = o
    while p:
        anc.append(p.name)
        p = p.parent
    return any(a in ("LEVEL_3", "LEVEL_4", "LEVEL_5", "ROOF") for a in anc) or n in ("STAIR_2", "STAIR_3", "STAIR_4", "L2_CEILING", "L2_SERVICE_LIDS")


def interior_lights():
    """Preview-only soft light under every ceiling, so the dining side and the beds read in one overall picture."""
    for i, z in enumerate((6, 11, 16, 21, 26)):
        ld = bpy.data.lights.new("PV_Floor_%d" % (i + 1), "AREA")
        ld.shape, ld.size, ld.energy, ld.color = "DISK", 40, 2700, (1.0, .90, .76)
        o = bpy.data.objects.new("PV_Floor_%d" % (i + 1), ld)
        o.location, o.visible_camera = (0, 0, z + 4.3), False
        bpy.context.scene.collection.objects.link(o)


def lay_out():
    """The five storeys side by side (memory only): three in the upper row, two below, each with the stair run that arrives at it."""
    spots = ((-56, 31), (0, 31), (56, 31), (-28, -30), (28, -30))
    col = bpy.context.scene.collection
    font = next((f for f in bpy.data.fonts if f.filepath.lower().endswith("msjhbd.ttc")), None)
    for o in bpy.data.objects:
        n = o.name
        o.hide_render = o.hide_render or n.startswith(("PV_", "COLUMN_", "PLAZA", "SHAFT_0", "RISER", "ROOF", "LIFT_CAR_1")) or n.endswith(("_CEILING", "_SERVICE_LIDS")) or "_PENDANT_" in n
    for i, (x, y) in enumerate(spots):
        n = i + 1
        bpy.data.objects["LEVEL_%d" % n].location = (x, y, 0)
        bpy.data.objects["STAIR_%d" % i].location = (x, y, -(6, 11, 16, 21, 26)[i])
        t = bpy.data.curves.new("PV_T", "FONT")
        t.body, t.size, t.align_x, t.align_y = "L%d　32 席・32 床" % n, 3.2, "CENTER", "CENTER"
        if font:
            t.font = font
        t.materials.append(bpy.data.materials["q04c_pv_ink"])
        o = bpy.data.objects.new("PV_T", t)
        o.location = (x - 4, y - 32, .5)
        col.objects.link(o)
    bpy.context.view_layer.update()


def render():
    args = sys.argv[sys.argv.index("--") + 1:]
    out = os.path.abspath(args[0])
    os.makedirs(out, exist_ok=True)
    opt = {args[i]: args[i + 1] for i in range(len(args) - 1) if args[i] in ("--samples", "--scale", "--prefix")}
    skip = set(opt.values())
    views = [a for a in args[1:] if not a.startswith("--") and a not in skip] or ["main", "plan", "table"]
    if "levels" in views and len(views) > 1:
        sys.exit("levels moves the storeys and white views repaint them: render levels in its own run")
    sc = bpy.context.scene
    if "--glb" in args:
        for o in list(bpy.data.collections["Q04C_Asset"].all_objects):
            bpy.data.objects.remove(o)
        bpy.ops.import_scene.gltf(filepath=os.path.join(os.path.dirname(os.path.abspath(__file__)), "q04c-shared-floor-residence.glb"))
    for o in [o for o in bpy.data.objects if o.name.startswith("CAM_")]:            # cameras always as written here
        bpy.data.objects.remove(o)
    cameras(sc, sc.collection)
    print("DEVICE", gpu(sc))
    sc.cycles.samples = int(opt.get("--samples", 160))
    sc.cycles.use_denoising = True
    sc.cycles.transparent_max_bounces = 48
    sc.cycles.max_bounces = 10
    sc.render.image_settings.file_format = "PNG"
    sc.render.resolution_percentage = int(opt.get("--scale", 100))
    expo = sc.view_settings.exposure
    for v in sorted(views, key=lambda k: CAMERAS[k][6]):                             # white views last: whiten() is one way
        cam = CAMERAS[v]
        if cam[6]:
            whiten()
        for o in bpy.data.objects:
            if o.type == "MESH":
                o.hide_render = cam[7] and above_l2(o)
        for o in bpy.data.objects:
            if o.name.startswith("PV_Floor_"):
                o.hide_render = v != "five"
        if v == "five" and not bpy.data.objects.get("PV_Floor_1"):
            interior_lights()
        if v == "five":                                                          # the long lens looks near the horizon: bring the blue down to it
            next(n for n in sc.world.node_tree.nodes if n.type == "VALTORGB").color_ramp.elements[1].position = .16
            bpy.data.materials["q04c_pv_water"].node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (.10, .27, .42, 1)
        if v == "levels":
            lay_out()
        lab = bpy.data.collections.get("Q04C_Labels")
        if lab:
            lab.hide_render = v != "plan"
        sc.view_settings.exposure = expo + {"table": 1.45, "aisle": 1.3, "gate": .7, "plan": .2, "plan_clean": .2, "bird": .2, "five": -.3, "levels": .4, "top": .35}.get(v, 0)
        sc.view_settings.use_white_balance = v in ("table", "aisle", "gate", "five", "levels", "top")          # the eye adapts to the warm lamps
        sc.view_settings.white_balance_temperature = 6000 if v in ("five", "levels") else 5300
        sc.view_settings.look = "AgX - High Contrast" if v in ("five", "levels") else "AgX - Medium High Contrast"
        sc.camera = bpy.data.objects["CAM_" + v.upper()]
        sc.render.resolution_x, sc.render.resolution_y = cam[3]
        sc.render.filepath = os.path.join(out, "%s-%s.png" % (opt.get("--prefix", "q04c"), v))
        bpy.ops.render.render(write_still=True)
        print("RENDERED", sc.render.filepath)


if __name__ == "__main__":
    render()
