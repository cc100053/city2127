"""Render the room handover of module-carrier step by step (frames for the owner's handover sheet).

blender -b --factory-startup --python-exit-code 1 -P module_handover.py -- <out_dir> [<module-carrier.blend>]
Writes step1..step4.png and detail_side.png / detail_door.png to <out_dir>. The quay, the dolly and the tower cells
are schematic stand-ins added here only (the tower is Q08-C, not modelled); arrows are orange emissive bars.
Poses move the .blend's nodes: ROOM_MODULE (the room), CRANE_SLEW (slews about the pedestal), HOOK_GEAR (spreader,
lowered by stretching carrier_crane_cable, whose origin is its top end). Ship: bow -Y, starboard +X, quay on +X.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index("--") + 1:]
OUT = os.path.abspath(args[0])
bpy.ops.wm.open_mainfile(filepath=args[1] if len(args) > 1 else os.path.join(HERE, "module-carrier.blend"))
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene
root = bpy.data.objects["ROOT_MODULE_CARRIER"]
room, crane, gear = (bpy.data.objects[n] for n in ("ROOM_MODULE", "CRANE_SLEW", "HOOK_GEAR"))
cable = bpy.data.objects["carrier_crane_cable"]
W, L, H = root["room_size"]
FB, SEAT, LIFT = root["berth_lift_f"], root["seat_h"], root["lift_dz"]
home = {o: (o.location.copy(), o.rotation_euler.copy(), o.scale.copy()) for o in (room, crane, gear, cable)}


def B(x, f, h):  # project P(x, f, h) -> Blender
    return Vector((x, -f, h))


def material(name, rgb, rough=.6, emit=0.):
    m = bpy.data.materials.new(name)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


def box(name, lo, hi, m, coll):
    """Axis-aligned box between Blender corners lo / hi."""
    (x0, y0, z0), (x1, y1, z1) = lo, hi
    me = bpy.data.meshes.new(name)
    v = [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    me.from_pydata(v, [], [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)])
    me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


def arrow(name, a, b, m, coll, r=.35):
    """Bar from a to b with a cone head (Blender coordinates)."""
    a, b = Vector(a), Vector(b)
    d = b - a
    n = d.normalized()
    q = Vector((0, 0, 1)).rotation_difference(n).to_euler()
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=max(d.length - 1.6, .1), location=a + n * (d.length - 1.6) / 2,
                                        rotation=q, vertices=12)
    s = bpy.context.object
    bpy.ops.mesh.primitive_cone_add(radius1=r * 2.6, depth=1.6, location=b - n * .8, rotation=q, vertices=16)
    h = bpy.context.object
    for o in (s, h):
        o.data.materials.append(m)
        o.name = name
        for c in o.users_collection:
            c.objects.unlink(o)
        coll.objects.link(o)


# ---------------------------------------------------------------- shared set: sea, quay, dolly, tower cells
sc.render.engine = "BLENDER_EEVEE"
sc.eevee.taa_render_samples = 48
sc.view_settings.view_transform = "AgX"
sc.render.resolution_x, sc.render.resolution_y = 1400, 860
world = bpy.data.worlds.new("sky")
sc.world = world
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (.62, .72, .85, 1)
bg.inputs[1].default_value = .55
sun = bpy.data.objects.new("key", bpy.data.lights.new("key", "SUN"))
sun.data.energy = 4.0
sun.data.angle = math.radians(8)
sun.rotation_euler = (math.radians(48), 0, math.radians(-40))
sc.collection.objects.link(sun)
SET = bpy.data.collections.new("handover_set")
sc.collection.children.link(SET)
sea, concrete = material("sea", (.06, .16, .26), .35), material("quay", (.70, .70, .68), .8)
dark, steel = material("dolly", (.12, .13, .14), .5), material("tower", (.86, .86, .84), .5)
pastel = [material(f"cell{k}", c, .5) for k, c in enumerate(((.92, .78, .86), (.74, .86, .92), (.95, .90, .76),
                                                              (.80, .76, .92), (.84, .92, .80)))]
orange, cyan = material("arrow", (1.0, .35, .02), .4, 1.5), material("target", (.15, .95, 1.0), .4, 5.)
box("sea", (-400, -400, -.05), (400, 400, 0), sea, SET)
QX, QZ = 7.6, 2.6  # quay face (starboard of the ship) and quay top
box("quay", (QX, -45, -3), (90, 60, QZ), concrete, SET)
for k in range(9):  # fenders along the quay face
    box(f"fender{k}", (QX - .5, -36 + k * 9, .3), (QX, -34.6 + k * 9, QZ - .3), dark, SET)
DZ = 1.0  # dolly deck height above the quay


def dolly(name, cx, cy):
    """Rail dolly under a room turned 90 degrees (room fore-aft along +X)."""
    box(name, (cx - L / 2 - .3, cy - W / 2 - .3, QZ + .35), (cx + L / 2 + .3, cy + W / 2 + .3, QZ + DZ), dark, SET)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(f"{name}_wheel", (cx + sx * 3.4 - .5, cy + sy * (W / 2 - .2) - .25, QZ),
                (cx + sx * 3.4 + .5, cy + sy * (W / 2 - .2) + .25, QZ + .55), dark, SET)


for k in (-1, 1):  # dolly rails on the quay, from under the crane's reach to the tower
    box(f"rail{k}", (16, 33 + k * 2.4 - .15, QZ), (44, 33 + k * 2.4 + .15, QZ + .08), dark, SET)
# tower cells (schematic Q08-C frame): 3 bays along the quay (Y), 4 floors, one room deep (X)
TX0, TX1, CY, CW, CH = 44.0, 54.6, 33.0, 8.4, 6.6
target = (1, 1)  # (bay, floor) left empty for the incoming room
for i in range(4):
    y = CY + (i - 1.5) * CW
    box(f"col{i}", (TX0, y - .35, QZ), (TX0 + .7, y + .35, QZ + 4 * CH + 1), steel, SET)
    box(f"colb{i}", (TX1 - .7, y - .35, QZ), (TX1, y + .35, QZ + 4 * CH + 1), steel, SET)
for j in range(5):
    box(f"slab{j}", (TX0, CY - 1.5 * CW - .35, QZ + j * CH), (TX1, CY + 1.5 * CW + .35, QZ + j * CH + .5), steel, SET)
for i in range(3):
    for j in range(4):
        y = CY + (i - 1) * CW
        if (i, j) == target:
            z = QZ + j * CH + .5
            for a, b in (((TX0, y - 3.6, z), (TX0 + .2, y + 3.6, z + .15)), ((TX0, y - 3.6, z + CH - .7),
                         (TX0 + .2, y + 3.6, z + CH - .55)), ((TX0, y - 3.6, z), (TX0 + .2, y - 3.45, z + CH - .55)),
                         ((TX0, y + 3.45, z), (TX0 + .2, y + 3.6, z + CH - .55))):
                box("target", a, b, cyan, SET)
            continue
        box(f"cell{i}{j}", (TX0 + 1.0, y - 3.4, QZ + j * CH + .6), (TX1 - 1.0, y + 3.4, QZ + (j + 1) * CH - .3),
            pastel[(i + 2 * j) % 5], SET)
# rooftop gantry of the tower: girder along the quay and a trolley over the target bay, cantilevered over the quay
GZ = QZ + 4 * CH + 1.0
box("gantry", (TX0 - 14, CY - 1.5 * CW, GZ), (TX1, CY - 1.5 * CW + 1.2, GZ + 1.4), steel, SET)
box("gantry2", (TX0 - 14, CY + 1.5 * CW - 1.2, GZ), (TX1, CY + 1.5 * CW, GZ + 1.4), steel, SET)
box("trolley", (TX0 - 11, CY - 1.5 * CW, GZ + 1.4), (TX0 - 7, CY + 1.5 * CW, GZ + 2.4), dark, SET)

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
sc.collection.objects.link(cam)
sc.camera = cam


def shot(name, loc, at, lens=30.):
    cam.location = loc
    cam.rotation_euler = (Vector(at) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = lens
    sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)


def reset():
    for o, (l, r, s) in home.items():
        o.location, o.rotation_euler, o.scale = l.copy(), r.copy(), s.copy()
    for o in [o for o in bpy.data.objects if o.name.startswith("step_")]:
        bpy.data.objects.remove(o)


def step_coll():
    c = bpy.data.collections.get("steps") or bpy.data.collections.new("steps")
    if c.name not in sc.collection.children:
        sc.collection.children.link(c)
    return c


def lower_hook(dz):
    """Pay out the cable: the hook gear drops dz, the cable (origin at its top) stretches by the same."""
    length = cable.dimensions.z
    cable.scale.z = (length + dz) / length
    gear.location.z -= dz


WIDE = (B(-48, 58, 46), B(14, -8, 4))
pivot = crane.location.copy()
hook_xy = Vector((0, -FB))  # Blender XY of the hook at home
# step 1: room on the fore berth; unclamped, it slides aft on the skid rails to the lift berth under the hook
reset()
dolly("step_dolly", 20.0, 33.0)
arrow("step_arrow", B(0, 2.5, SEAT + H + 1.6), B(0, FB + 3.5, SEAT + H + 1.6), orange, step_coll())
shot("step1", *WIDE)
# step 2: at the lift berth the spreader locks the four lugs and the crane hoists the room clear of the guide posts
reset()
dolly("step_dolly", 20.0, 33.0)
room.location = B(0, FB, SEAT + LIFT)
arrow("step_arrow", B(-5.2, FB, SEAT + .8), B(-5.2, FB, SEAT + LIFT + 3.6), orange, step_coll())
shot("step2", *WIDE)
# step 3: the crane slews 90 degrees to starboard and lowers the room onto the quay dolly
reset()
crane.rotation_euler.z = math.radians(90)
d = hook_xy - pivot.xy
hx = pivot.xy + Vector((-d.y, d.x))  # hook XY after a +90 degree slew
lower_hook(SEAT + LIFT - (QZ + DZ))
room.location = (hx.x, hx.y, QZ + DZ)
room.rotation_euler.z = math.radians(90)
dolly("step_dolly", hx.x, hx.y)
arrow("step_arrow", B(4, FB + 2, SEAT + LIFT + H + 2.5), (hx.x - 3.5, hx.y - 6.5, QZ + DZ + H + 2.0), orange,
      step_coll())
shot("step3", *WIDE)
# step 4: the dolly runs to the tower's empty bay; the tower gantry hoists the room and slides it into the cell
reset()
room.location = (TX0 - 9.0, CY, QZ + DZ)
room.rotation_euler.z = math.radians(90)
dolly("step_dolly", TX0 - 9.0, CY)
z_cell = QZ + target[1] * CH + .5
arrow("step_arrow", Vector((TX0 - 9.0, CY - W / 2 - 1.2, QZ + DZ + H + .5)),
      Vector((TX0 - 9.0, CY - W / 2 - 1.2, z_cell + 2.5)), orange, step_coll())
arrow("step_arrow2", Vector((TX0 - 4.0, CY - W / 2 - 1.2, z_cell + 2.5)), Vector((TX0 + 3.0, CY - W / 2 - 1.2, z_cell + 2.5)),
      orange, step_coll())
shot("step4", *WIDE)
# details: the seated room from starboard (windows, cage, cradle) and from aft (door, coupler, umbilical, empty berth)
reset()
fa = root["berth_fore_f"]
shot("detail_side", B(15, fa + 13, SEAT + 6.5), B(0, fa + .5, SEAT + 2.2), 35.)
shot("detail_door", B(9, fa - 16, SEAT + 5.5), B(0, fa - 3.5, SEAT + 1.8), 35.)
