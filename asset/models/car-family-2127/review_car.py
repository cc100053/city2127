"""Review renders of car-family-2127.blend (EEVEE, pale ground, sun): blender -b car-family-2127.blend --python-exit-code 1 -P review_car.py -- <out dir>"""
import math
import os
import sys

import bpy
from mathutils import Vector

out = sys.argv[sys.argv.index("--") + 1]
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.view_settings.view_transform = "Standard"
world = bpy.data.worlds.new("w")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (.62, .76, .92, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = .55
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
sun.data.energy = 1.5
sun.rotation_euler = (math.radians(40), math.radians(10), math.radians(200))
bpy.context.collection.objects.link(sun)
me = bpy.data.meshes.new("ground")
me.from_pydata([(-30, -30, 0), (30, -30, 0), (30, 30, 0), (-30, 30, 0)], [], [(0, 1, 2, 3)])
g = bpy.data.objects.new("ground", me)
bpy.context.collection.objects.link(g)
m = bpy.data.materials.new("g")
n = next(x for x in m.node_tree.nodes if x.type == "BSDF_PRINCIPLED")
n.inputs["Base Color"].default_value = (.82, .81, .78, 1)
me.materials.append(m)
for name in ("car_body", "car_interior"):  # the runtime multiplies the colour attribute; preview that here
    mat = bpy.data.materials[name]
    t = mat.node_tree
    bsdf = next(x for x in t.nodes if x.type == "BSDF_PRINCIPLED")
    attr = t.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    t.links.new(attr.outputs[0], bsdf.inputs["Base Color"])
bpy.data.materials["car_glass"].node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = .3
bpy.data.materials["car_shadow"].node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0
bpy.data.materials["car_shadow"].surface_render_method = "BLENDED"
# The pool is additive at runtime; Blender would draw it as an opaque disc.
pool = bpy.data.materials["car_pool"].node_tree.nodes["Principled BSDF"]
pool.inputs["Alpha"].default_value = 0
bpy.data.materials["car_pool"].surface_render_method = "BLENDED"
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.lens = 45
bpy.context.collection.objects.link(cam)
scene.camera = cam
# three.js (x, y, z) -> Blender (x, -z, y)
def aim(eye, at):
    cam.location = Vector((eye[0], -eye[2], eye[1]))
    cam.rotation_euler = (Vector((at[0], -at[2], at[1])) - cam.location).to_track_quat("-Z", "Y").to_euler()
for name, x in (("pod", 0), ("car", 3)):
    for root in ("car_pod", "car_human"):
        for o in bpy.data.objects:
            if o.name.startswith(root):
                o.hide_render = (root == "car_pod") != (name == "pod")
                if o.type == "EMPTY":
                    o.location = (0, 0, 0)
    for tag, eye in (("side", (-7, 1.5, -1.6)), ("front", (-5, 1.8, 5.5)), ("rear", (-4, 1.8, -6.5))):
        aim(eye, (0, .85, .1))
        scene.render.filepath = os.path.join(out, f"{name}-{tag}.png")
        bpy.ops.render.render(write_still=True)
