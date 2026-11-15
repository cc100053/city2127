"""Re-import the four vehicle GLBs (the load check) and render them side by side.

blender -b --factory-startup --python-exit-code 1 -P review_vehicles.py -- <out.png>
For each GLB prints @@CHECK@@ lines and fails (exit 1) when a wheel floats or sinks, the head lamps are not at the nose
(-Y Blender = +Z three.js) with the tail lamps behind, or glass is not alpha-blended. Writes a lineup sheet:
front 3/4 on top, straight front below, all four in one row, same studio and scale.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_vehicles as bv  # noqa: E402

NAMES = ["personal-trike", "tandem-ev", "autonomous-shuttle", "amphibious-shuttle"]
out = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bv.OBJS.clear()
failures, x0 = [], 0.0


def verts_of(objs, role=None):
    pts = []
    for o in objs:
        me = o.data
        for p in me.polygons:
            if role is None or me.materials[p.material_index].name.split(".")[0] == role:
                pts += [o.matrix_world @ me.vertices[i].co for i in p.vertices]
    return pts


for name in NAMES:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, f"{name}.glb"))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    bpy.context.view_layer.update()
    lo, hi = bv.bounds(meshes)
    centre = (lo + hi) / 2
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    wheels = [o for o in meshes if "wheel" in o.name]
    wheel_low = [min((o.matrix_world @ v.co).z for v in o.data.vertices) for o in wheels]
    head, tail = verts_of(meshes, "car_head"), verts_of(meshes, "car_tail")
    head_y = sum(p.y for p in head) / len(head)
    tail_y = sum(p.y for p in tail) / len(tail)
    glass = [m for m in bpy.data.materials if m.name.startswith("car_glass") and m.users]
    glass_ok = all(m.surface_render_method == "BLENDED" for m in glass)
    seats = len(verts_of(meshes, "car_seat"))
    checks = {
        "ground": abs(lo.z) < .005,
        "wheels_touch": len(wheels) >= 3 and all(abs(z) < .01 for z in wheel_low),
        "nose_minus_y": head_y < centre.y - .3 * (hi.y - lo.y) and tail_y > centre.y + .3 * (hi.y - lo.y),
        "glass_blended": bool(glass) and glass_ok,
        "cabin": seats > 0,
    }
    print("@@CHECK@@", name, "size_xyz %.2f x %.2f x %.2f" % tuple(hi - lo), "tris", tris, "wheels", len(wheels),
          "wheel_low", ["%.3f" % z for z in wheel_low], "head_y %.2f tail_y %.2f" % (head_y, tail_y),
          "glass", [m.name for m in glass], checks)
    failures += [f"{name}:{k}" for k, ok in checks.items() if not ok]
    # line up left to right with 1 m gaps, every nose toward -Y
    roots = [o for o in new if o.parent is None]
    shift = x0 - lo.x
    for r in roots:
        r.location.x += shift
    x0 += (hi.x - lo.x) + 1.0
    bv.OBJS.extend(meshes)
    for m in glass:
        m.use_backface_culling = False

bpy.context.view_layer.update()
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x, scene.render.resolution_y = 1800, 700
scene.view_settings.view_transform = "AgX"
world = bpy.data.worlds.new("studio")
scene.world = world
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (.72, .73, .75, 1)
sun = bpy.data.objects.new("key", bpy.data.lights.new("key", "SUN"))
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(40), 0, math.radians(150))
scene.collection.objects.link(sun)
me = bpy.data.meshes.new("floor")
me.from_pydata([(-80, -80, 0), (80, -80, 0), (80, 80, 0), (-80, 80, 0)], [], [(0, 1, 2, 3)])
scene.collection.objects.link(bpy.data.objects.new("floor", me))
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.type = "ORTHO"
lo, hi = bv.bounds(bv.OBJS)
centre = (lo + hi) / 2
cam.data.ortho_scale = (hi.x - lo.x) * 1.08
paths = []
# front 3/4, then dead ahead from -Y: every vehicle must show its nose in the second view
for tag, d in (("front34", Vector((.45, -.8, .35))), ("front", Vector((0, -1, .05)))):
    d.normalize()
    cam.location = centre + d * 30
    cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
    path = os.path.join(bpy.app.tempdir, f"lineup-{tag}.png")
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    paths.append(path)
bv.sheet(paths, 1, out)
print("@@LINEUP@@", out)
if failures:
    print("@@FAIL@@", failures)
    sys.exit(1)
print("@@PASS@@ all four GLBs")
