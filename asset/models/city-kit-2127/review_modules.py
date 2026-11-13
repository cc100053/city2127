"""Review-only: build one sample of every module beside a 1.8 m figure and render the lineup (not exported).
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P review_modules.py -- out.png
Glass is left out of the render so the rooms, capsule and doorway residents stay visible.
"""
import math
import os
import random
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import Acc, finish_mesh, material, obox  # noqa: E402
import modules as M  # noqa: E402

out = sys.argv[sys.argv.index("--") + 1]
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
    if acc.v and role != 'glass':
        rgba, emit, st = M.ROLES[role]
        ob = finish_mesh('review_' + role, acc, material(role, rgba, .6, emit=emit, emit_strength=st))
        bpy.context.scene.collection.objects.link(ob)
sc = bpy.context.scene
# Blender coords: three.js x -> x, three.js z -> -y. Camera looks from the front-right, slightly above.
az, el, cx = math.radians(-25), math.radians(18), 14
bpy.ops.object.camera_add(location=(cx + 60 * math.sin(az), -60 * math.cos(az), 4 + 60 * math.tan(el)),
                          rotation=(math.radians(90) - el, 0, az))
cam = bpy.context.object
cam.data.type = "ORTHO"
cam.data.ortho_scale = 50
sc.camera = cam
r = sc.render
r.engine = "BLENDER_WORKBENCH"
r.resolution_x, r.resolution_y = 3600, 1500
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "MATERIAL"
sc.display.shading.show_cavity = True
sc.world = bpy.data.worlds.new("w")
sc.world.color = (.93, .94, .96)
r.filepath = out
bpy.ops.render.render(write_still=True)
