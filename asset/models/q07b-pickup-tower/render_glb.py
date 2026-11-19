"""Import a Q07-B GLB into a clean scene and render it with the shared staging (same sun, sky and cameras).

blender -b --factory-startup --python-exit-code 1 -P render_glb.py -- <file.glb> <out_dir> [main,pickup,...]
The scene holds only the GLB, a neutral ground disc and scale figures, so a before/after pair differs only by
the model.
"""
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import staging  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:]
glb, out = os.path.abspath(args[0]), os.path.abspath(args[1])
cams = (args[2] if len(args) > 2 else "main,pickup").split(",")
os.makedirs(out, exist_ok=True)
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)
scene = bpy.context.scene
objs = staging.setup_scene(scene) + list(staging.make_cameras().values())
staging.ground_and_people(objs)
for o in objs:
    scene.collection.objects.link(o)
bpy.ops.import_scene.gltf(filepath=glb)
for c in cams:
    staging.use_camera(scene, c)
    scene.render.filepath = os.path.join(out, c + ".png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", scene.render.filepath)
