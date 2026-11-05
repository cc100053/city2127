"""Review-only: line every kit prop up in a row beside a 1.8 m figure and render it (not exported).
  blender -b city-kit-2127.blend --factory-startup -P review_kit.py -- out.png
"""
import sys

import bpy
from mathutils import Vector

out = sys.argv[sys.argv.index("--") + 1]
root = bpy.data.objects["ROOT_CITY_KIT_2127"]
cursor = 1.2
for e in root.children:
    meshes = [c for c in e.children if c.type == "MESH"]
    pts = [Vector(c) for m in meshes for c in m.bound_box]
    lo, hi = min(p.x for p in pts), max(p.x for p in pts)
    e.location = (cursor - lo, 0, 0)
    cursor += hi - lo + .5
# 1.8 m figure at x = 0
def box(name, c, s, color):
    bpy.ops.mesh.primitive_cube_add(size=1, location=c)
    o = bpy.context.object; o.name = name; o.scale = s
    m = bpy.data.materials.new(name); m.diffuse_color = color; o.data.materials.append(m)
box("fig_legs", (0, 0, .43), (.3, .16, .86), (.27, .3, .33, 1))
box("fig_torso", (0, 0, 1.2), (.4, .2, .55), (.9, .9, .95, 1))
box("fig_head", (0, 0, 1.68), (.2, .2, .24), (.88, .69, .55, 1))
bpy.ops.object.empty_add(location=(0, 0, 0))
sc = bpy.context.scene
bpy.ops.object.camera_add(location=(cursor / 2, -40, 1.4), rotation=(1.5708, 0, 0))
cam = bpy.context.object
cam.data.type = "ORTHO"; cam.data.ortho_scale = cursor * 1.04
sc.camera = cam
r = sc.render
r.engine = "BLENDER_WORKBENCH"; r.resolution_x = 4200; r.resolution_y = int(4200 * 5.6 / cursor)
sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"; sc.display.shading.show_cavity = True
sc.world = bpy.data.worlds.new("w"); sc.world.color = (.93, .94, .96)
r.filepath = out
cam.location.z = 2.75
bpy.ops.render.render(write_still=True)
