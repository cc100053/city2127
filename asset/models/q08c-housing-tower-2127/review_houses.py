"""House reviews: the ellipse view house close-up per Dream Loop round, and the five-type lineup at one scale.

blender -b --factory-startup --python-exit-code 1 -P review_houses.py -- closeup <out_dir> [--rnd 0|1|2] [--type ellipse_view]
    beauty (EEVEE, front-left oblique) + clay front + clay back (entrance) of one house in a mock frame bay
blender -b --factory-startup --python-exit-code 1 -P review_houses.py -- lineup <out_dir>
    the five types side by side in five mock bays with a 1.8 m figure: oblique and elevation, beauty and clay
Fixed camera, lens and light per view come from staging.CAMERAS / staging.setup_light. Prints triangles per house.
"""
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common as C  # noqa: E402
import houses as H  # noqa: E402
import staging as S  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:]
mode, out = args[0], os.path.abspath(args[1])
opt = {args[i][2:]: args[i + 1] for i in range(2, len(args) - 1) if args[i].startswith("--")}
os.makedirs(out, exist_ok=True)
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)
scene = bpy.context.scene
col = scene.collection
C.make_materials()
stats = {}

if mode == "closeup":
    kind, rnd = opt.get("type", "ellipse_view"), int(opt.get("rnd", 2))
    me = C.build_mesh("house_" + kind, H.build_house(kind, 7, rnd))
    stats[kind] = C.tris(me)
    C.add_obj("House", me, col)
    S.mock_bays(col, 1)
    S.ground_figure(col, -1.9, -1.4)
    S.setup_light(scene)
    S.camera(scene, "house")
    S.render(scene, os.path.join(out, "beauty.png"))
    S.clay(scene)
    S.render(scene, os.path.join(out, "clay.png"))
    bpy.data.objects["PV_MockCore"].hide_render = True
    S.camera(scene, "house_back")
    S.render(scene, os.path.join(out, "clay_back.png"))
elif mode == "lineup":
    for i, kind in enumerate(H.HOUSE_TYPES):
        me = C.build_mesh("house_" + kind, H.build_house(kind, 7 + i))
        stats[kind] = C.tris(me)
        C.add_obj("House_" + kind, me, col, loc3=(6.0 * i, 0, 0))
    S.mock_bays(col, 5)
    S.ground_figure(col, -2.0, 8.6)
    S.setup_light(scene)
    for cam in ("lineup", "lineup_elev"):
        S.camera(scene, cam)
        S.render(scene, os.path.join(out, cam + ".png"))
    S.clay(scene)
    for cam in ("lineup", "lineup_elev"):
        S.camera(scene, cam)
        S.render(scene, os.path.join(out, cam + "_clay.png"))
print("TRIS", json.dumps(stats))
with open(os.path.join(out, "tris.json"), "w") as f:
    json.dump(stats, f, indent=1)
