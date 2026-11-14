"""Nagi review renders (Workbench, headless): turnaround, pose recipes and a lineup with the 1.8 m reference and the door.

  Blender -b --factory-startup --python-exit-code 1 -P review_nagi.py -- OUTDIR
Writes OUTDIR/turn-{front,q3,back}.png, pose-*.png and lineup-*.png; combine with PIL (see the handoff).
`POSES` doubles as the rig recipe for the beat code: node -> (rx, ry, rz) degrees, additive to the rest pose; Rx < 0 swings a limb forward.
"""
import math, os, sys
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_nagi as B  # noqa: E402

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp/nagi"
os.makedirs(OUT, exist_ok=True)

SIT_Z = .60  # hips height seated (hip joint .57, seat top ~.49 m)
POSES = {  # hand roll Rz = +-70 hangs the device outward at the side (carry); P = upper + lower arm pitch; P = -90 holds the device flat as a tray
    "stand-carry": {"upperArm.L": (-4, 0, 0), "lowerArm.L": (-8, 0, 0), "hand.L": (0, 0, 70), "upperArm.R": (-4, 0, 0), "lowerArm.R": (-8, 0, 0), "hand.R": (0, 0, -70)},
    "sit-tablet": {"torso": (-8, 0, 0), "upperLeg.L": (-90, 0, 0), "upperLeg.R": (-90, 0, 0), "lowerLeg.L": (90, 0, 0), "lowerLeg.R": (90, 0, 0),
                   "upperArm.L": (-20, 0, 0), "lowerArm.L": (-70, 0, 0), "hand.L": (0, 0, 0), "upperArm.R": (-20, 0, 0), "lowerArm.R": (-70, 0, 0), "hand.R": (0, 0, 0), "head": (14, 0, 0)},
    "phone-up": {"upperArm.R": (-45, 0, 0), "lowerArm.R": (-80, 0, 0), "hand.R": (0, 0, 0), "upperArm.L": (-20, 0, 0), "lowerArm.L": (-70, 0, 0), "hand.L": (0, 0, 0), "head": (6, 0, 0)},
    "walk": {"upperLeg.L": (24, 0, 0), "lowerLeg.L": (8, 0, 0), "upperLeg.R": (-22, 0, 0), "lowerLeg.R": (30, 0, 0), "upperArm.R": (22, 0, 0), "lowerArm.R": (-10, 0, 0),
             "hand.R": (0, 0, -70), "upperArm.L": (-20, 0, 0), "lowerArm.L": (-70, 0, 0), "hand.L": (0, 0, 0), "torso": (3, 0, -8)},
    "enter": {"upperLeg.L": (20, 0, 0), "lowerLeg.L": (6, 0, 0), "upperLeg.R": (-16, 0, 0), "lowerLeg.R": (24, 0, 0), "upperArm.L": (-38, 0, 18), "lowerArm.L": (-57, 0, 0),
              "hand.L": (0, 0, 0), "upperArm.R": (14, 0, 0), "hand.R": (0, 0, -70), "torso": (6, 0, -14), "head": (10, 0, 10)},
}


def apply(obs, pose):
    for n, ob in obs.items():
        ob.rotation_mode = "XYZ"
        ob.rotation_euler = tuple(math.radians(a) for a in pose.get(n, (0, 0, 0)))
    obs["hips"].location.z = (SIT_Z if "upperLeg.L" in pose and pose["upperLeg.L"][0] == -90 else .95)
    bpy.context.view_layer.update()


def setup():
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sh = sc.display.shading
    sh.light, sh.color_type, sh.show_object_outline, sh.show_cavity = "STUDIO", "MATERIAL", True, True
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "Standard"  # factory AgX greys the role colours; the scene shows them closer to Standard
    sh.show_specular_highlight = False
    sc.world = bpy.data.worlds.new("w"); sc.world.color = (.84, .85, .88)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = "ORTHO"
    return sc, cam


def shot(sc, cam, name, az, w=520, h=1000, scale=2.3, cx=0, cz=1.0, el=8):
    sc.render.resolution_x, sc.render.resolution_y = w, h
    cam.data.ortho_scale = scale
    a, e = math.radians(az), math.radians(el)  # az 0 = looking at the front (camera on -Y)
    d = 12
    cam.location = Vector((cx + d * math.sin(a) * math.cos(e), -d * math.cos(a) * math.cos(e), cz + d * math.sin(e)))
    cam.rotation_euler = (Vector((cx, 0, cz)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)


def extra(sc, name, x, h, w=.4, color=(.5, .5, .55, 1)):
    """Plain reference peg of height h at x."""
    me = bpy.data.meshes.new(name)
    import bmesh
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    ob.scale = (w, .25, h); ob.location = (x, .5, h / 2)
    m = bpy.data.materials.new(name); m.diffuse_color = color; me.materials.append(m)
    return ob


root, obs = B.build()
sc, cam = setup()
for az, n in ((0, "front"), (35, "q3"), (180, "back"), (90, "side")):
    apply(obs, {}); shot(sc, cam, f"turn-{n}", az)
for n, p in POSES.items():
    apply(obs, p); shot(sc, cam, f"pose-{n}", 25 if n != "enter" else 60, scale=2.4 if n != "sit-tablet" else 2.0, cz=1.0 if n != "sit-tablet" else .8)
# lineup: Nagi 2.0, 1.8 m peg, door frame 1.25 x 2.1, mixed crowd height 2.2 peg
apply(obs, {})
root.location.x = 0
extra(sc, "peg1.8", -.9, 1.8, .45, (.35, .5, .7, 1))
extra(sc, "peg2.2", .95, 2.2, .45, (.7, .5, .35, 1))
# door frame: two jambs + header, 1.25 wide x 2.1 high, at x = 2.0
for nm, x, z, sx, sz in (("jambL", 1.375, 1.05, .06, 2.1), ("jambR", 2.625, 1.05, .06, 2.1), ("header", 2.0, 2.1, 1.31, .06)):
    j = extra(sc, nm, x, 1, .06); j.scale = (sx, .25, sz); j.location = (x, .5, z);
shot(sc, cam, "lineup-front", 0, w=1800, h=900, scale=7.2, cx=1.0, cz=1.1, el=0)
shot(sc, cam, "lineup-side", 90, w=900, h=900, scale=3.0, cx=0, cz=1.1, el=0)
print("@@REVIEW@@", OUT)
