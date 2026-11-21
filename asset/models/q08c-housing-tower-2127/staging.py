"""Review staging for the Q08-C housing tower: light (day / night), clay mode, cameras, a mock frame bay for house
close-ups, and the waterfront context for whole-tower renders. Nothing here is exported.

Coordinates are three.js (x, y up, z) through geo_helpers.B; the tower front and the water face +z.
"""
import math
import random

import bpy
from mathutils import Vector

from common import Accs, MATS, X, Z, add_obj, build_mesh, make_materials, obox, rbox
from geo_helpers import Acc, B, blob, cyl, finish_mesh, material

# name: (position, look-at, lens, resolution)
CAMERAS = {
    "main": ((-52, 44, 92), (4, 23, 6), 38, (1100, 825)),          # the reference framing (front-left, high), as v1/v2
    "front": ((-16, 27, 84), (1, 23, 4), 38, (1600, 1100)),        # lower, closer: the houses' outlines
    "side": ((70, 20, 40), (6, 22, 0), 40, (1600, 1000)),           # right side and the delivery bay
    "house": ((-6.2, 3.3, 17.0), (.3, 1.7, 4.9), 32, (1600, 1100)),     # house close-up, front-left oblique
    "house_back": ((4.6, 2.7, -5.2), (-.75, 1.3, .4), 26, (1600, 1100)),  # the entrance side (core wall hidden)
    "lineup": ((-2, 6.5, 30), (12, 2.0, 4.0), 40, (2400, 1000)),     # five bays in a row
    "lineup_elev": ((12, 2.2, 40), (12, 2.2, 4.0), 30, (2400, 900)),
}


def setup_light(scene, night=False):
    for ob in [o for o in bpy.data.objects if o.name.startswith("PV_Sun")]:
        bpy.data.objects.remove(ob)
    sun = bpy.data.lights.new("PV_Sun", "SUN")
    if night:
        sun.energy, sun.color = .35, (.55, .65, 1.0)
    else:
        sun.energy, sun.color = 4.2, (1.0, .92, .80)
    sun.angle = math.radians(3)
    so = bpy.data.objects.new("PV_Sun", sun)
    so.rotation_euler = (math.radians(52), 0, math.radians(-28))
    scene.collection.objects.link(so)
    world = bpy.data.worlds.get("PV_World") or bpy.data.worlds.new("PV_World")
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (.03, .045, .09, 1) if night else (.45, .62, .86, 1)
    bg.inputs["Strength"].default_value = .8 if night else .6
    scene.world = world
    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError as e:
        print("LOOK", e)
    scene.eevee.taa_render_samples = 64
    return so


def clay(scene):
    """Workbench grey model: single colour, studio light, cavity and shadows, so geometry reads without materials."""
    scene.render.engine = "BLENDER_WORKBENCH"
    sh = scene.display.shading
    sh.light, sh.color_type = "STUDIO", "SINGLE"
    sh.single_color = (.72, .72, .70)
    sh.show_cavity, sh.cavity_type = True, "BOTH"
    sh.show_shadows = True
    sh.show_object_outline = False
    scene.display.render_aa = "16"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"


def camera(scene, name):
    loc, look, lens, res = CAMERAS[name]
    cam = bpy.data.objects.get("CAM_" + name.upper())
    if cam is None:
        cd = bpy.data.cameras.new("CAM_" + name.upper())
        cd.lens, cd.clip_end = lens, 3000
        cam = bpy.data.objects.new("CAM_" + name.upper(), cd)
        scene.collection.objects.link(cam)
        cam.location = B(loc)
        cam.rotation_euler = (Vector(B(look)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = 100
    return cam


def mock_bays(col, n=1, step=6.0):
    """n frame bays in a row (x = 0, 6, ...) in house-local coordinates: the floor slab and the one above, columns on the
    corridor and frame lines, front beams with node collars, the corridor and the core wall behind it."""
    make_materials()
    a = Accs()
    x0, x1 = -3.6, (n - 1) * step + 3.6
    cx = (x0 + x1) / 2
    for y in (0.0, 5.0):
        rbox(a["t_white"], cx, (-2.6 + 6.55) / 2, (x1 - x0) / 2, (6.55 + 2.6) / 2, y - .35, y, r=.4, b=.08)
        rbox(a["t_white"], cx, 6.0, (x1 - x0) / 2 - .1, .5, y - 1.1, y - .34, r=.15, b=.08, n=1)
    obox(a["t_corr"], (cx, .01, -1.3), (x1 - x0, .02, 2.6), X, Z)
    obox(a["t_lamp"], (cx, 4.6, -1.3), (x1 - x0, .03, .12), X, Z)
    core = Accs()
    obox(core["t_core"], (cx, 2.3, -2.75), (x1 - x0, 4.6, .3), X, Z)
    add_obj("PV_MockCore", build_mesh("pv_mock_core", core), col)
    for i in range(n + 1):
        x = -3 + i * step
        for z in (0.0, 6.0):
            rbox(a["t_white"], x, z, .6, .6, -1.5, 5.6, r=.4, b=.05)
        for y in (0.0, 5.0):
            rbox(a["t_white"], x, 6.0, .75, .75, y - 1.25, y + .3, r=.4, b=.15, n=2)
    return add_obj("PV_MockBay", build_mesh("pv_mock_bay", a), col)


def ground_figure(col, x, z, y=0.0):
    """1.8 m scale figure."""
    m = material("pv_figure", (.18, .22, .30, 1), .7)
    f = Acc()
    cyl(f, x, z, .17, y, y + .85, 10)
    cyl(f, x, z, .22, y + .85, y + 1.5, 10, r_top=.19)
    blob(f, (x, y + 1.66, z), (.12, .14, .12), sub=1, noise=0, flat=1)
    ob = finish_mesh("PV_Figure", f, m)
    col.objects.link(ob)
    return ob


def context(col, seed=8):
    """Water, promenade with a sea wall, lawns, trees, people and a distant city ring."""
    rng = random.Random(seed)
    mats = {
        "pv_water": material("pv_water", (.07, .26, .40, 1), .06),
        "pv_prom": material("pv_prom", (.78, .75, .70, 1), .85),
        "pv_wall": material("pv_wall", (.60, .58, .55, 1), .8),
        "pv_grass": material("pv_grass", (.22, .40, .12, 1), .9),
        "pv_tree": material("pv_tree", (.15, .36, .10, 1), .8),
        "pv_bloom": material("pv_bloom", (.88, .55, .66, 1), .8),
        "pv_bark": material("pv_bark", (.22, .15, .10, 1), .9),
        "pv_city": material("pv_city", (.88, .88, .86, 1), .5),
        "pv_cityg": material("pv_cityg", (.40, .55, .62, 1), .2, (1, .75, .45, 1), .0),
        "pv_dark": material("pv_dark", (.06, .06, .07, 1), .8),
        "pv_c1": material("pv_c1", (.85, .85, .82, 1), .8),
        "pv_c2": material("pv_c2", (.10, .18, .40, 1), .8),
        "pv_c3": material("pv_c3", (.55, .25, .15, 1), .8),
        "pv_skin": material("pv_skin", (.65, .45, .33, 1), .7),
    }
    from geo_helpers import Acc
    a = {k: Acc() for k in mats}
    obox(a["pv_water"], (0, -1.3, 150), (900, .2, 700), (1, 0), (0, 1))
    obox(a["pv_prom"], (0, -.2, -50), (220, .4, 140), (1, 0), (0, 1))
    obox(a["pv_wall"], (0, -.9, 19.9), (220, 1.4, .3), (1, 0), (0, 1))
    for x, z, w, d in ((-40, 12, 14, 9), (42, 8, 12, 10), (-42, -24, 16, 12), (38, -26, 14, 12)):
        obox(a["pv_grass"], (x, .02, z), (w, .04, d), (1, 0), (0, 1))
    for i in range(22):
        x = rng.choice([-1, 1]) * rng.uniform(31, 62)
        z = rng.uniform(-40, 18)
        h = rng.uniform(3.5, 6)
        cyl(a["pv_bark"], x, z, .18, 0, h * .5, 8)
        blob(a["pv_bloom" if i % 3 == 0 else "pv_tree"], (x, h * .72, z), (h * .32, h * .28, h * .32), sub=2, seed=i, noise=.2)
    for i in range(18):
        x, z = rng.uniform(-30, 30), rng.uniform(13, 19)
        s = rng.uniform(.95, 1.05)
        cyl(a["pv_dark"], x, z, .15 * s, 0, .85 * s, 8)
        cyl(a[rng.choice(["pv_c1", "pv_c2", "pv_c3"])], x, z, .2 * s, .85 * s, 1.45 * s, 10, r_top=.17 * s)
        blob(a["pv_skin"], (x, 1.62 * s, z), (.12 * s,) * 3, sub=1, noise=0, flat=1)
    for i in range(16):
        ang = rng.uniform(math.radians(200), math.radians(340))
        r = rng.uniform(230, 320)
        x, z = r * math.cos(ang), r * math.sin(ang)
        h = rng.uniform(25, 70)
        cyl(a["pv_city"], x, z, rng.uniform(6, 11), 0, h, 24)
        cyl(a["pv_cityg"], x, z, rng.uniform(5.5, 6), 2, h - 2, 24)
    out = []
    for k, acc in a.items():
        if acc.f:
            ob = finish_mesh("PV_" + k, acc, mats[k])
            col.objects.link(ob)
            out.append(ob)
    return out


def night_city(on):
    """Distant city glazing glows at night."""
    m = bpy.data.materials.get("pv_cityg")
    if m:
        bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Emission Strength"].default_value = 1.5 if on else 0.0


def render(scene, path):
    scene.render.filepath = path
    scene.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)
    print("RENDERED", path)
