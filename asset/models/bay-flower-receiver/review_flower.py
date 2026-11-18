"""Preview renders of the Q02-B bay flower, with and without its light beam, and a reference/model comparison.

blender -b --factory-startup --python-exit-code 1 -P review_flower.py -- <out_dir> [--samples N] [--only beam|nobeam|clay]
    [--cam ref|close|root|dome|water|waterzoom|junction|shore|front|side|petal] [--blend <file.blend>]
Every camera shares the same sun and sky (set from the reference camera), so before/after renders compare like for like.
Writes <out_dir>/beam.png, nobeam.png, clay.png (one grey, no emission, no beam: silhouette check) and
compare.jpg (references/q02-b.jpg left, beam render right, same size). Staging (sea, sea bed, shore promenade, sky,
sun, camera) is added at render time only; the .blend is not saved.
"""
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import B  # noqa: E402

REF = os.path.join(HERE, "references", "q02-b.jpg")
SHORE = (-95.0, 56.0)  # same as build_flower.SHORE
# camera from the reference image's viewpoint, three.js coords: position, look-at, focal length (36 mm sensor width)
CAM = ((-80.0, 88.0, 235.0), (-24.0, 15.0, 10.0), 38.0)
# --cam close: low three-quarter view, near petals show their outer backs, far petals their inner panels
# --cam root: just above the water outside the pontoon, looking up under the petals at seats, arms and segments
CAMS = {"ref": CAM, "close": ((-34.0, 70.0, 100.0), (4.0, 16.0, 0.0), 36.0),
        "root": ((-16.0, 5.0, 52.0), (0.0, 8.0, 22.0), 24.0),
        "dome": ((-18.0, 62.0, 40.0), (0.0, 22.0, 0.0), 40.0),  # down into the cup: dome bearing ring and brackets
        # --cam water: low over the water, the receiver base seen through the gaps between petal roots
        "water": ((-62.0, 6.5, 62.0), (0.0, 10.0, 0.0), 32.0),
        "waterzoom": ((-62.0, 6.5, 62.0), (0.0, 9.0, 0.0), 95.0),  # same spot, long lens on the gaps at the centre
        "junction": ((-26.0, 34.0, 20.0), (-11.9, 7.0, 9.1), 30.0),  # down past the inner petals onto the shore junction
        # --cam shore: the reference image's side of the shore station: roof, pipe entry, riser elbow, duct collars
        "shore": ((-75.5, 22.0, 14.3), (-85.5, 4.0, 50.4), 32.0),
        # machine room close-ups: --cam front (water side, oblique on the pipe entry), --cam side (door, windows).
        # shore / front / side frame the room's position before the platform round (room axis facing the flower)
        "front": ((-81.4, 9.0, 31.8), (-87.2, 4.0, 49.6), 35.0),
        "side": ((-100.8, 6.0, 36.2), (-91.9, 4.5, 49.5), 32.0),
        # --cam platform: above the promenade on the reference camera's side of the shore platform: the room's landward
        # side, its arched pipe end, flange, the drop elbows past the platform end, paving, rail and planter
        "platform": ((-89.8, 16.0, 92.4), (-87.0, 2.5, 61.7), 30.0),
        # --cam petal: up under the outer ring at the pontoon edge: guard plates, spine ribs, root shoes on the seats
        "petal": ((7.9, 3.0, 37.2), (4.0, 7.6, 22.9), 30.0)}


def mat(name, rgba, rough=.5, alpha=None):
    m = bpy.data.materials.new(name)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = rgba
    b.inputs["Roughness"].default_value = rough
    if alpha is not None:
        b.inputs["Alpha"].default_value = alpha
        m.surface_render_method = "DITHERED"  # depth-correct, so the sea never paints over the flower
    return m


def quad(name, pts, m):
    me = bpy.data.meshes.new(name)
    me.from_pydata([B(p) for p in pts], [], [(0, 1, 2, 3)])
    me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def stage(cam_name="ref"):
    scene = bpy.context.scene
    s = 2000.
    quad("sea", [(-s, 0, -s), (s, 0, -s), (s, 0, s), (-s, 0, s)], mat("sea", (.01, .24, .32, 1), .08, .5))
    quad("seabed", [(-s, -15, -s), (s, -15, -s), (s, -15, s), (-s, -15, s)], mat("seabed", (.22, .42, .38, 1), .9))
    sx, sz = SHORE
    n = math.hypot(sx, sz)
    d, t = (sx / n, sz / n), (sz / n, -sx / n)
    edge = lambda a, b, h: (sx + d[0] * b + t[0] * a, h, sz + d[1] * b + t[1] * a)
    pave, grass, wall = mat("paving", (.62, .6, .56, 1), .8), mat("grass", (.12, .3, .08, 1), .9), mat("seawall", (.45, .44, .42, 1), .9)
    quad("promenade", [edge(-600, 6, 1.5), edge(600, 6, 1.5), edge(600, 22, 1.5), edge(-600, 22, 1.5)], pave)
    quad("lawn", [edge(-600, 22, 1.6), edge(600, 22, 1.6), edge(600, 400, 1.6), edge(-600, 400, 1.6)], grass)
    quad("seawall", [edge(-600, 6, -15), edge(600, 6, -15), edge(600, 6, 1.5), edge(-600, 6, 1.5)], wall)
    world = bpy.data.worlds.new("sky")
    scene.world = world
    nt = world.node_tree
    bg = next(nd for nd in nt.nodes if nd.type == "BACKGROUND")
    bg.inputs[1].default_value = .8
    # vertical gradient sky (hazy white horizon to deep blue zenith) so the metal petals have something to reflect
    tc, sep, mr, ramp = (nt.nodes.new(t) for t in ("ShaderNodeTexCoord", "ShaderNodeSeparateXYZ", "ShaderNodeMapRange",
                                                    "ShaderNodeValToRGB"))
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = -1.0, 1.0
    nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = .3, (.18, .24, .28, 1)
    els[1].position, els[1].color = 1.0, (.12, .32, .85, 1)
    for pos, col in ((.5, (.92, .95, 1, 1)), (.58, (.55, .72, .97, 1))):
        e = els.new(pos)
        e.color = col
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    loc, at, lens = CAM  # the sun always follows the reference camera, so every view shares one daylight
    sun =bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 4.5
    sun.data.angle = math.radians(4)
    f = Vector((at[0] - loc[0], 0, at[2] - loc[2])).normalized()  # light from behind-right of the view, as in the image
    r = Vector((-f.z, 0, f.x))
    travel = -f * .6 - r * .7 + Vector((0, -1.1, 0))
    sun.rotation_euler = Vector(B(travel)).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(sun)
    loc, at, lens = CAMS[cam_name]
    cam =bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.lens = lens
    cam.data.clip_end = 5000
    cam.location = B(loc)
    cam.rotation_euler = (Vector(B(at)) - Vector(B(loc))).to_track_quat("-Z", "Y").to_euler()


def render(path, beam=True, clay=False):
    node = bpy.data.objects.get("Q02B_LightBeam")  # absent in the -nobeam file
    if node:
        node.hide_render = not beam
        for o in node.children:
            o.hide_render = not beam
    if clay:
        cm = mat("clay", (.62, .62, .62, 1), .7)
        for o in bpy.data.objects:
            if o.type == "MESH" and o.name.startswith("Q02B_"):
                o.data.materials.clear()
                o.data.materials.append(cm)
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def side_by_side(a, b, out):
    ia, ib = bpy.data.images.load(a), bpy.data.images.load(b)
    w, h = ia.size
    pa = np.array(ia.pixels[:]).reshape(h, w, 4)
    pb = np.array(ib.pixels[:]).reshape(h, w, 4)
    gap = np.ones((h, 16, 4))
    px = np.concatenate([pa, gap, pb], axis=1)
    img = bpy.data.images.new("compare", px.shape[1], h)
    img.pixels = px.ravel()
    img.filepath_raw = out
    img.file_format = "JPEG"
    img.save()


def main():
    args = sys.argv[sys.argv.index("--") + 1:]
    out = os.path.abspath(args[0])
    os.makedirs(out, exist_ok=True)
    samples = int(args[args.index("--samples") + 1]) if "--samples" in args else 48
    only = args[args.index("--only") + 1] if "--only" in args else None
    cam_name = args[args.index("--cam") + 1] if "--cam" in args else "ref"
    blend = args[args.index("--blend") + 1] if "--blend" in args else os.path.join(HERE, "bay-flower-receiver.blend")
    bpy.ops.wm.open_mainfile(filepath=blend)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = samples
    scene.view_settings.view_transform = "Standard"
    ref = bpy.data.images.load(REF)
    scene.render.resolution_x, scene.render.resolution_y = ref.size
    stage(cam_name)
    for name, beam, clay in (("beam", True, False), ("nobeam", False, False), ("clay", False, True)):
        if only in (None, name):
            render(os.path.join(out, name + ".png"), beam, clay)
    if only in (None, "beam") and cam_name == "ref":
        side_by_side(REF, os.path.join(out, "beam.png"), os.path.join(out, "compare.jpg"))


main()
