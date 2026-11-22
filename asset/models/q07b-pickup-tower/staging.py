"""Shared Q07-B review staging: sun, sky, render settings, cameras, ground and scale figures.

Used by build_pickup_tower.py (preview collection in the .blend) and render_glb.py (a clean scene around an
imported GLB), so before/after renders share one camera and light set. Nothing here is exported.
Coordinates are three.js (x, y up, z) through geo_helpers.B; the pickup faces +z.
"""
import math

import bpy
from mathutils import Vector

from geo_helpers import Acc, B, blob, cyl, finish_mesh, material

# name: (position, look-at, lens, resolution)
CAMERAS = {
    "main": ((0, 17, 31), (0, 6.4, 0), 42, (1100, 825)),        # matches the reference framing
    "street": ((5.0, 1.6, 20), (.8, 6.4, 0), 20, (1600, 900)),  # eye height, whole tower
    "port": ((-2.8, 1.65, 11.5), (.5, 2.0, 4.2), 28, (1600, 900)),
    "pickup": ((1.9, 1.6, 10.4), (0, 1.75, 6.0), 30, (1600, 900)),  # close-up of the pickup window
    # roof arm close-ups (v3 arm polish): the right arm (FRONT + 260 deg), seen from its front-right, harness side
    "arm": ((3.18, 15.12, 3.50), (2.66, 13.62, -.06), 35, (1600, 900)),
    "armbase": ((3.55, 13.85, 1.75), (3.12, 13.05, -.50), 45, (1600, 900)),
    "armtool": ((3.05, 14.20, 2.00), (2.15, 13.60, .45), 45, (1600, 900)),
    "oblique": ((17, 17, 23), (0, 7.0, 0), 38, (1100, 825)),          # whole tower, front-right from above
}


def setup_scene(scene):
    sun = bpy.data.lights.new("PV_Sun", "SUN")
    sun.energy = 4.5
    sun.color = (1.0, .93, .82)
    sun.angle = math.radians(4)
    so = bpy.data.objects.new("PV_Sun", sun)
    so.rotation_euler = (math.radians(50), 0, math.radians(-40))
    world = bpy.data.worlds.new("PV_World")
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (.40, .58, .85, 1)
    bg.inputs["Strength"].default_value = .55
    scene.world = world
    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError as e:
        print("LOOK", e)
    scene.eevee.taa_render_samples = 64
    return [so]


def make_cameras():
    out = {}
    for name, (loc, look, lens, _) in CAMERAS.items():
        cd = bpy.data.cameras.new("CAM_" + name.upper())
        cd.lens = lens
        cd.clip_end = 2000
        co = bpy.data.objects.new("CAM_" + name.upper(), cd)
        co.location = B(loc)
        co.rotation_euler = (Vector(B(look)) - co.location).to_track_quat("-Z", "Y").to_euler()
        out[name] = co
    return out


def use_camera(scene, name):
    scene.camera = bpy.data.objects["CAM_" + name.upper()]
    scene.render.resolution_x, scene.render.resolution_y = CAMERAS[name][3]


PEOPLE = [(1.45, 6.95, 1.0), (-1.4, 6.6, .97), (-2.6, 9.5, 1.02), (3.4, 10.5, .99), (-4.5, 12.5, 1.0), (5.8, 13.5, 1.03),
          (-6.5, 8.5, .98)]


def ground_and_people(objs_out):
    """Neutral ground disc and blocky 1.75 m figures; one stands at the pickup window."""
    mats = {
        "pv_ground": material("pv_ground", (.66, .64, .60, 1), .9),
        "pv_dark": material("pv_dark", (.06, .06, .07, 1), .8),
        "pv_c1": material("pv_c1", (.85, .85, .82, 1), .8),
        "pv_c2": material("pv_c2", (.10, .18, .40, 1), .8),
        "pv_c3": material("pv_c3", (.55, .25, .15, 1), .8),
        "pv_skin": material("pv_skin", (.65, .45, .33, 1), .7),
    }
    a = {k: Acc() for k in mats}
    cyl(a["pv_ground"], 0, 0, 70, -.02, 0, 96)
    cloth = ["pv_c3", "pv_c2", "pv_c1"]
    for i, (x, z, s) in enumerate(PEOPLE):
        cyl(a["pv_dark"], x, z, .15 * s, 0, .85 * s, 10)
        cyl(a[cloth[i % 3]], x, z, .2 * s, .85 * s, 1.45 * s, 12, r_top=.17 * s)
        blob(a["pv_skin"], (x, 1.62 * s, z), (.12 * s,) * 3, sub=2, noise=0, flat=1)
    for k, acc in a.items():
        if acc.f:
            objs_out.append(finish_mesh("PV_" + k, acc, mats[k]))
