"""Parcel-flow preview for Q07-B: orange arrows and numbered labels along the route over the model, four views.

blender -b --factory-startup --python-exit-code 1 -P render_flow.py -- <file.glb> <out_dir>
The route comes from q07b-flow.json, which build_pickup_tower.py writes from the same points its route check moves the
parcel through. Each view renders twice: the model, then the arrows and labels alone on a transparent film. The arrow
layer is laid over the model, so the parts of the route inside the building (back-of-house) stay visible.
Views: oblique (whole tower), roofplan (roof from above), groundplan (plan cut at 2.25 m, looking down), liftside.
Writes <out_dir>/<view>_flow.png. Labels use Microsoft JhengHei when it is installed, else English.
"""
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import staging  # noqa: E402
from geo_helpers import B, material  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:]
glb, out = os.path.abspath(args[0]), os.path.abspath(args[1])
os.makedirs(out, exist_ok=True)
FLOW = json.load(open(os.path.join(HERE, "q07b-flow.json"), encoding="utf-8"))
RES = (1600, 1200)
# name: (camera position, look-at, lens or None for orthographic, ortho scale, stages shown, arrow radius)
VIEWS = {
    "oblique": ((17, 17, 23), (0, 7.0, 0), 38, 0, range(6), .08),
    "roofplan": ((0, 22, 1.21), (0, 12.6, 1.2), None, 16, range(4), .06),
    "groundplan": ((.4, 2.25, 5.3), (.4, 0, 5.3), None, 6.6, range(4, 6), .035),
    "liftside": ((11, 10, 13), (0, 7.0, 4.8), 24, 0, range(6), .07),
}

for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)
scene = bpy.context.scene
objs = staging.setup_scene(scene)
staging.ground_and_people(objs)
for o in objs:
    scene.collection.objects.link(o)
bpy.ops.import_scene.gltf(filepath=glb)
model = [o for o in scene.objects]
sun = next(o for o in model if o.type == "LIGHT")
scene.render.resolution_x, scene.render.resolution_y = RES

font = None
for path in (r"C:\Windows\Fonts\msjh.ttc", r"C:\Windows\Fonts\msjhbd.ttc"):
    if os.path.exists(path):
        try:
            font = bpy.data.fonts.load(path)
            break
        except RuntimeError as e:
            print("FONT", e)
EN = ["1 unload table", "2 arm", "3 roof hand-over / lift door", "4 lift", "5 back-of-house", "6 pickup counter"]

arrow_mat = material("pv_arrow", (1, .36, .02, 1), .5, emit=(1, .36, .02, 1), emit_strength=1)
text_mat = material("pv_text", (1, 1, 1, 1), .5, emit=(1, 1, 1, 1), emit_strength=3)
plate_mat = material("pv_plate", (.02, .16, .18, 1), .5, emit=(.02, .16, .18, 1), emit_strength=1)


def make_camera(name, pos, look, lens, oscale):
    cd = bpy.data.cameras.new(name)
    if lens:
        cd.lens = lens
    else:
        cd.type = "ORTHO"
        cd.ortho_scale = oscale
        cd.clip_start = .005
    cd.clip_end = 500
    co = bpy.data.objects.new(name, cd)
    co.location = B(pos)
    co.rotation_euler = (Vector(B(look)) - co.location).to_track_quat("-Z", "Y").to_euler()   # plans: front at the bottom
    scene.collection.objects.link(co)
    return co


def arrow(pts, r, coll):
    """Tube along pts (three.js coords) ending in a cone at the last point."""
    ps = [Vector(B(p)) for p in pts]
    d = (ps[-1] - ps[-2]).normalized()
    head = r * 6
    tip = ps[-1]
    ps[-1] = tip - d * head
    cu = bpy.data.curves.new("arrow", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = 2
    sp = cu.splines.new("POLY")
    sp.points.add(len(ps) - 1)
    for p, q in zip(sp.points, ps):
        p.co = (*q, 1)
    ob = bpy.data.objects.new("arrow", cu)
    ob.data.materials.append(arrow_mat)
    coll.objects.link(ob)
    me = bpy.data.meshes.new("head")
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=r * 2.6, radius2=0, depth=head)
    bm.to_mesh(me)
    bm.free()
    hd = bpy.data.objects.new("head", me)
    hd.location = tip - d * head / 2
    hd.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    hd.data.materials.append(arrow_mat)
    coll.objects.link(hd)


def label(text, loc, cam, size, coll):
    """Camera-facing text on a dark teal plate, its left edge at loc (Blender coords)."""
    cu = bpy.data.curves.new("label", "FONT")
    cu.body = text
    if font:
        cu.font = font
    cu.size = size
    cu.align_x, cu.align_y = "LEFT", "CENTER"
    ob = bpy.data.objects.new("label", cu)
    ob.data.materials.append(text_mat)
    rot = cam.matrix_world.to_quaternion()
    back = rot @ Vector((0, 0, 1))
    ob.location = loc
    ob.rotation_euler = rot.to_euler()
    coll.objects.link(ob)
    bpy.context.view_layer.update()
    w, h = ob.dimensions.x, size * 1.15
    me = bpy.data.meshes.new("plate")
    pad = size * .3
    me.from_pydata([(-pad, -h / 2 - pad * .5, 0), (w + pad, -h / 2 - pad * .5, 0), (w + pad, h / 2 + pad * .5, 0),
                    (-pad, h / 2 + pad * .5, 0)], [], [(0, 1, 2, 3)])
    pl = bpy.data.objects.new("plate", me)
    pl.data.materials.append(plate_mat)
    pl.location = ob.location - back * size * .02
    pl.rotation_euler = ob.rotation_euler
    coll.objects.link(pl)


def badge(text, at, cam, size, coll):
    """Stage number beside its arrow: up and right of the anchor point."""
    rot = cam.matrix_world.to_quaternion()
    right, upv, back = rot @ Vector((1, 0, 0)), rot @ Vector((0, 1, 0)), rot @ Vector((0, 0, 1))
    label(text, Vector(B(at)) + right * size * .7 + upv * size * .7 + back * size * .4, cam, size, coll)


def legend(lines, cam, coll):
    """Stage names stacked in the top-left corner of the frame, 2 m in front of the camera."""
    rot = cam.matrix_world.to_quaternion()
    right, upv, fwd = rot @ Vector((1, 0, 0)), rot @ Vector((0, 1, 0)), rot @ Vector((0, 0, -1))
    d = 2.0
    hw = cam.data.ortho_scale / 2 if cam.data.type == "ORTHO" else d * 18 / cam.data.lens
    hh = hw * RES[1] / RES[0]
    line = hh * .1
    for i, text in enumerate(lines):
        loc = cam.location + fwd * d - right * (hw - line * .5) + upv * (hh - line * (.8 + 1.05 * i))
        label(text, loc, cam, line * .75, coll)


def anchor(k, pts):
    """Badge point: start of the drop, the roof run and the ground run; middle of the swing and the lift; end of 6."""
    if k in (1, 3):
        return pts[len(pts) // 2] if len(pts) > 2 else [(a + b) / 2 for a, b in zip(pts[0], pts[-1])]
    return pts[0] if k in (0, 2, 4) else pts[-1]


def load(path):
    im = bpy.data.images.load(path)
    a = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)
    bpy.data.images.remove(im)
    return a


for view, (pos, look, lens, oscale, stages, r) in VIEWS.items():
    cam = make_camera("CAM_FLOW_" + view, pos, look, lens, oscale)
    scene.camera = cam
    coll = bpy.data.collections.new("flow_" + view)
    scene.collection.children.link(coll)
    dist = (cam.location - Vector(B(look))).length
    size = (oscale * .03) if not lens else dist * .028
    for k in stages:
        st = FLOW[k]
        arrow(st["pts"], r, coll)
        badge((st["label"] if font else EN[k]).split()[0], anchor(k, st["pts"]), cam, size, coll)
    legend([FLOW[k]["label"] if font else EN[k] for k in stages], cam, coll)
    sun.data.use_shadow = view != "groundplan"                   # the tower above would shade the plan cut
    base = os.path.join(out, view + "_model.png")
    for o in coll.objects:
        o.hide_render = True
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.render.filepath = base
    bpy.ops.render.render(write_still=True)
    for o in coll.objects:
        o.hide_render = False
    for o in model:
        o.hide_render = True
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    arrows = os.path.join(out, view + "_arrows.png")
    scene.render.filepath = arrows
    bpy.ops.render.render(write_still=True)
    for o in model:
        o.hide_render = False
    a, m = load(arrows), load(base)
    al = a[..., 3:4]
    m[..., :3] = a[..., :3] * al + m[..., :3] * (1 - al)
    m[..., 3] = 1
    img = bpy.data.images.new(view + "_flow", RES[0], RES[1], alpha=False)
    img.pixels.foreach_set(m.ravel())
    img.filepath_raw = os.path.join(out, view + "_flow.png")
    img.file_format = "PNG"
    img.save()
    for o in list(coll.objects):
        bpy.data.objects.remove(o)
    print("RENDERED", img.filepath_raw)
