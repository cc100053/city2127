"""Review renders of the Q05-B breathing giant leaf (EEVEE, one sun, fixed cameras).

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P review_breathing_leaf.py -- <out_dir>
Writes target.png (the target image's oblique), low.png (pedestrian view) and top.png (plan) into <out_dir>.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else HERE
# Blender coordinates (x, y = -three z, z up).
CAMERAS = {'target': ((-36, 48, 40), (0, 0, 12), 30), 'low': ((-9, 12, 2.2), (0, 0, 14), 20), 'top': ((0, -1, 120), (0, 0, 0), 50),
           'side': ((60, 10, 22), (0, 0, 14), 35)}


def main():
    bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, 'q05b-breathing-leaf-2127.blend'))
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
    sc.view_settings.view_transform = 'AgX'
    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.72, .80, .88, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    sc.world = world
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 4
    sun.rotation_euler = (math.radians(50), 0, math.radians(35))
    sc.collection.objects.link(sun)
    ground = bpy.data.meshes.new('g')
    ground.from_pydata([(-200, -200, -.01), (200, -200, -.01), (200, 200, -.01), (-200, 200, -.01)], [], [(0, 1, 2, 3)])
    go = bpy.data.objects.new('ground', ground)
    gm = bpy.data.materials.new('gm')
    gm.diffuse_color = (.85, .84, .80, 1)
    gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.85, .84, .80, 1)
    ground.materials.append(gm)
    sc.collection.objects.link(go)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    os.makedirs(OUT, exist_ok=True)
    for name, (pos, tgt, lens) in CAMERAS.items():
        cam.location = pos
        cam.rotation_euler = (Vector(tgt) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
        cam.data.lens = lens
        sc.render.filepath = os.path.join(OUT, name + '.png')
        bpy.ops.render.render(write_still=True)


main()
