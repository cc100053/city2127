"""Render the housing tower .blend from the fixed preview cameras, by day and by night, and as a clay model.

blender -b <q08c-housing-tower-2127[-s<seed>].blend> --factory-startup --python-exit-code 1 -P review_tower.py -- <out_dir> [main,front,side] [day,night,clay]
Camera "main" repeats the 8C reference framing (front-left, high, 1100 x 825) used for v1/v2.
"""
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import staging as S  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:]
out = os.path.abspath(args[0])
cams = (args[1] if len(args) > 1 else "main,front,side").split(",")
modes = (args[2] if len(args) > 2 else "day,night").split(",")
os.makedirs(out, exist_ok=True)
scene = bpy.context.scene
for mode in modes:
    if mode == "clay":
        S.clay(scene)
    else:
        S.setup_light(scene, night=(mode == "night"))
        S.night_city(mode == "night")
    for c in cams:
        S.camera(scene, c)
        S.render(scene, os.path.join(out, "%s_%s.png" % (c, mode)))
