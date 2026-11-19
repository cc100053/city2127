"""Render the Q07-B preview cameras from the .blend (asset + preview context).

blender -b q07b-pickup-tower.blend --factory-startup --python-exit-code 1 -P review_pickup_tower.py -- <out_dir> [main,street,port,pickup]
Cameras and sizes come from staging.CAMERAS (main matches the reference framing, 4:3 1100 x 825).
"""
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import staging  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:]
out = os.path.abspath(args[0])
cams = (args[1] if len(args) > 1 else "main,street,port,pickup").split(",")
os.makedirs(out, exist_ok=True)
scene = bpy.context.scene
for c in cams:
    staging.use_camera(scene, c)
    scene.render.filepath = os.path.join(out, c + ".png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", scene.render.filepath)
