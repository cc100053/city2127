"""Studio review of the candidates beside today's car_human, re-imported from their GLBs (EEVEE, pale ground, one sun).

blender -b --factory-startup --python-exit-code 1 -P review_candidates.py -- <out dir> [close] [r2]
Writes <car>-<view>.png for car_human, car_green, car_tech; `close` adds lamp and wheel close-ups. Importing the GLBs (not the
.blend) is the load check: it prints each variant's bounds, triangle count and material roles.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)
args = sys.argv[sys.argv.index("--") + 1:]
out, close = args[0], "close" in args[1:]
suffix = "-r2" if "r2" in args[1:] else ""  # `r2`: round 2's files
CARS = [("car_human", os.path.join(MODELS, "car-family-2127", "car-family-2127.glb")),
        ("car_green", os.path.join(HERE, f"car-green-2127{suffix}.glb")),
        ("car_tech", os.path.join(HERE, f"car-tech-2127{suffix}.glb"))]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
scene.view_settings.view_transform = "AgX"
world = bpy.data.worlds.new("w")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (.62, .74, .88, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = .9
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
sun.data.energy = 3.2
sun.data.angle = math.radians(3)
sun.rotation_euler = (math.radians(48), math.radians(8), math.radians(215))
bpy.context.collection.objects.link(sun)
me = bpy.data.meshes.new("ground")
me.from_pydata([(-40, -40, 0), (40, -40, 0), (40, 40, 0), (-40, 40, 0)], [], [(0, 1, 2, 3)])
g = bpy.data.objects.new("ground", me)
bpy.context.collection.objects.link(g)
gm = bpy.data.materials.new("ground")
next(x for x in gm.node_tree.nodes if x.type == "BSDF_PRINCIPLED").inputs["Base Color"].default_value = (.5, .5, .48, 1)
me.materials.append(gm)

roots = {}
for name, path in CARS:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    variant = next(o for o in new if o.name.startswith(name))
    keep = {variant} | set(variant.children_recursive)
    for o in new:
        if o not in keep and o.type == "MESH":
            bpy.data.objects.remove(o)
    mw = variant.matrix_world.copy()
    variant.parent = None
    variant.matrix_world = mw
    variant.location = (0, 0, 0)  # car-family places car_human 3 m aside; all three share the origin here
    bpy.context.view_layer.update()
    roots[name] = variant
    meshes = [o for o in variant.children_recursive if o.type == "MESH"]
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    roles = sorted({s.material.name.split(".")[0] for o in meshes for s in o.material_slots if s.material})
    # Blender bounds: x width, -y = three.js z (front), z height.
    print("@@LOAD@@", name, "size_xyz(m) %.2f x %.2f x %.2f" % tuple(hi - lo), "front_y_min %.2f" % lo.y, "ground_z %.3f" % lo.z, "tris", tris, roles)

# Preview what the runtime does: colour attribute times base colour; the soft shadow disc and glass alpha by role.
for mat in bpy.data.materials:
    base = mat.name.split(".")[0]
    if not mat.use_nodes:
        continue
    t = mat.node_tree
    bsdf = next((x for x in t.nodes if x.type == "BSDF_PRINCIPLED"), None)
    if not bsdf:
        continue
    if base in ("car_body", "car_interior") and not bsdf.inputs["Base Color"].is_linked:
        attr = t.nodes.new("ShaderNodeVertexColor")
        attr.layer_name = "Color"
        t.links.new(attr.outputs[0], bsdf.inputs["Base Color"])
    if base == "car_shadow":  # r2 wires the colour attribute's alpha in; the review hides the disc either way
        for link in [l for l in t.links if l.to_node == bsdf and l.to_socket.name in ("Alpha", "Base Color")]:
            t.links.remove(link)
        bsdf.inputs["Alpha"].default_value = 0
        mat.surface_render_method = "BLENDED"
    if base == "car_glass":
        mat.surface_render_method = "BLENDED"

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
bpy.context.collection.objects.link(cam)
scene.camera = cam


def aim(eye, at, lens):
    """three.js (x, y, z) -> Blender (x, -z, y)."""
    cam.data.lens = lens
    cam.location = Vector((eye[0], -eye[2], eye[1]))
    cam.rotation_euler = (Vector((at[0], -at[2], at[1])) - cam.location).to_track_quat("-Z", "Y").to_euler()


VIEWS = [("front34", (-4.6, 1.7, 5.4), (0, .7, .2), 40), ("rear34", (4.4, 1.9, -5.6), (0, .75, -.2), 40), ("side", (-8.5, 1.2, 0), (0, .75, 0), 45)]
if close:
    VIEWS += [("front", (-.6, 1.1, 7.5), (0, .7, 0), 40), ("back", (.6, 1.2, -7.5), (0, .75, 0), 40), ("nose", (-1.4, 1.0, 3.6), (0, .6, 2.2), 50), ("tail", (1.5, 1.2, -3.6), (0, .7, -2.2), 50),
              ("wheel", (-2.6, .7, 2.6), (-.8, .4, 1.42), 55), ("roof", (-2.4, 3.4, 1.8), (0, 1.3, -.1), 42)]
for name, variant in roots.items():
    for other in roots.values():
        for o in [other] + list(other.children_recursive):
            o.hide_render = other is not variant
    for tag, eye, at, lens in VIEWS:
        aim(eye, at, lens)
        scene.render.filepath = os.path.join(out, f"{name}-{tag}.png")
        bpy.ops.render.render(write_still=True)
