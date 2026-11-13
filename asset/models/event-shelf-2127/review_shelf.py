"""Review-only: the lattice with sample modules in slots plus the five module variants beside the 1.8 m figure (not exported).
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P review_shelf.py -- out.png [--view front|three] [--eevee]
"""
import math
import os
import random
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'city-kit-2127'))
from geo_helpers import Acc, finish_mesh, material  # noqa: E402
import modules as M  # noqa: E402

args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
view = args[args.index('--view') + 1] if '--view' in args else 'three'
bpy.ops.wm.read_factory_settings(use_empty=True)
ctx = M.Ctx({k: Acc() for k in M.ROLES}, random.Random(7))
M.lattice_frame(ctx)
rng = random.Random(5)
for k in range(9):
    for c in range(3):
        for r in range(2):
            if k == 0 and c == 1:
                continue
            if rng.random() < .62:
                v = rng.choice('ABCD')
                M.event_module(ctx, -12 + c * 12, k * 4 + (.15 if k == 0 else 0), -6 + r * 12 + .2, v)
M.event_module(ctx, 24, 0, -4, 'H', h=7.2)  # not in a slot: hall beside the shelf for scale
M.person(ctx, 26, 0, -14, 1, yaw=0)
for role, acc in ctx.a.items():
    if acc.v:
        rgba, emit, st = M.ROLES[role]
        bpy.context.scene.collection.objects.link(finish_mesh('r_' + role, acc, material(role, rgba, .1 if role == 'glass' else .6, emit=emit, emit_strength=st)))
sc = bpy.context.scene
if view == 'front':
    az, el, d = 0.0, math.radians(10), 140
else:
    az, el, d = math.radians(28), math.radians(16), 150
cx, cy = 4, 20
bpy.ops.object.camera_add(location=(cx + d * math.cos(el) * math.sin(az), d * math.cos(el) * math.cos(az), cy + d * math.sin(el)),
                          rotation=(math.radians(90) - el, 0, math.pi - az))
cam = bpy.context.object
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 76
sc.camera = cam
sc.render.resolution_x, sc.render.resolution_y = 1800, 1350
sc.render.engine = 'BLENDER_EEVEE' if '--eevee' in args else 'BLENDER_WORKBENCH'
sc.world = bpy.data.worlds.new('w')
sc.world.color = (.62, .74, .88)
sun = bpy.data.lights.new('sun', 'SUN')
sun.energy = 4
so = bpy.data.objects.new('sun', sun)
so.rotation_euler = (math.radians(50), 0, math.radians(30))
sc.collection.objects.link(so)
if sc.render.engine == 'BLENDER_WORKBENCH':
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'MATERIAL'
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
