"""Review-only: build one sample of every module beside a 1.8 m figure and render the lineup (not exported).
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P review_modules.py -- out.png [--eevee]
Workbench (default) leaves glass out so rooms, capsule and doorway residents stay visible; --eevee renders the real
materials, glass and emission under a sun, closer to the in-city look. MODDIR=<dir> reviews another modules.py
(e.g. an older checkout) for side-by-side comparison.
"""
import math
import os
import random
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.environ.get('MODDIR', HERE))
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import Acc, finish_mesh, material, obox  # noqa: E402
import modules as M  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:]
out, eevee = args[0], '--eevee' in args
bpy.ops.wm.read_factory_settings(use_empty=True)
ctx = M.Ctx({k: Acc() for k in M.ROLES}, random.Random(2127))
# Samples laid out along +x (three.js), each on its own white pad.
M.glass_room(ctx, 0, 0, 0, 10, 8, 4.5)                        # glass_room + furnish + kit_prop + person/seated_person
M.glass_lift(ctx, 10, 0, 0, 14, 5)                            # glass_lift
obox(ctx.a['white'], (20, .35, 0), (14, .7, 14))
M.ring_doorways(ctx, 6, .7, 4.4, cx=20)                       # ring_doorways
for i in range(4):
    M.person(ctx, 30 + i * .9, 0, 0, 1, yaw=0)               # person, four rng variations
M.kit_prop(ctx, 'chair_office', 35, 0, 0, math.pi)
M.seated_person(ctx, 35, .5, 0, math.pi)                      # seated_person on a kit chair
M.person(ctx, -7, 0, 0, 1, yaw=0)                             # 1.8 m reference
for role, acc in ctx.a.items():
    if acc.v and (eevee or role != 'glass'):
        rgba, emit, st = M.ROLES[role]
        ob = finish_mesh('review_' + role, acc, material(role, rgba, .6, emit=emit, emit_strength=st))
        bpy.context.scene.collection.objects.link(ob)
sc = bpy.context.scene
# Blender coords: three.js x -> x, three.js z -> -y. Camera looks from three.js -z (the side lift cabins and their amber edges face), slightly above.
az, el, cx = math.radians(180 + 25), math.radians(18), 14
bpy.ops.object.camera_add(location=(cx + 60 * math.sin(az), -60 * math.cos(az), 4 + 60 * math.tan(el)),
                          rotation=(math.radians(90) - el, 0, az))
cam = bpy.context.object
cam.data.type = "ORTHO"
cam.data.ortho_scale = 50
sc.camera = cam
r = sc.render
r.resolution_x, r.resolution_y = 3600, 1500
sc.world = bpy.data.worlds.new("w")
if eevee:
    r.engine = "BLENDER_EEVEE"
    sc.world.use_nodes = True
    sc.world.node_tree.nodes["Background"].inputs["Color"].default_value = (.55, .7, .95, 1)
    sc.world.node_tree.nodes["Background"].inputs["Strength"].default_value = .8
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 4
    sc.view_settings.view_transform = "Standard"
    sun.rotation_euler = (math.radians(50), 0, math.radians(150))
    sc.collection.objects.link(sun)
    sc.render.film_transparent = False
else:
    r.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "MATERIAL"
    sc.display.shading.show_cavity = True
    sc.world.color = (.93, .94, .96)
r.filepath = out
bpy.ops.render.render(write_still=True)
