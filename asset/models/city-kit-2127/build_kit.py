"""city-kit-2127: reusable props for every site (spec: artifacts/se-high-blender/spec.md, R2).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_kit.py
Writes city-kit-2127.blend and .glb next to this file (glTF preset, no Meshopt/Draco).

Units are real metres for a 1.8 m person, origin at ground contact (pot base for pots), front = -Y Blender (+Z three.js).
Root ROOT_CITY_KIT_2127 holds one empty per prop, kit_<name>, each laid out on a 6 m grid for review (the runtime reads
meshes relative to their prop empty, so the layout does not matter). One mesh per kit_* material per prop, <= 3 materials.
Coordinates here are three.js (x, y up, z); geo_helpers.B maps them to Blender.
"""
import math
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import Acc, blob, circle_pts, cyl, material, obox, plane, rot, rrect_pts, sweep, yawed, finish_mesh  # noqa: E402

COLORS = {
    "kit_leaf_a": ((.3, .52, .23, 1), {}), "kit_leaf_b": ((.42, .62, .28, 1), {}),
    "kit_bark": ((.79, .57, .35, 1), {}), "kit_white": ((.96, .95, .92, 1), {}),
    "kit_wood": ((.85, .7, .5, 1), {}), "kit_dark": ((.2, .22, .25, 1), {}),
    "kit_fabric": ((.84, .6, .47, 1), {}), "kit_soil": ((.35, .27, .22, 1), {}),
    "kit_screen": ((1, .94, .82, 1), {"emit": (1, .9, .7, 1), "emit_strength": 1.6}),
    "kit_amber": ((1, .7, .22, 1), {"emit": (1, .7, .22, 1), "emit_strength": 1.2}),
    "kit_glass": ((.81, .9, .95, .22), {}),
}
FOLIAGE = {"kit_leaf_a", "kit_leaf_b"}


class Prop:
    def __init__(self, name):
        self.name, self.acc = name, {}

    def a(self, mat):
        return self.acc.setdefault(mat, Acc())


def blobs(p, lobes, sub=3, noise=.12):
    """Lobes are (cx, cy, cz, rx, ry, rz, material[, subdivision])."""
    for i, (cx, cy, cz, rx, ry, rz, m, *sd) in enumerate(lobes):
        blob(p.a(m), (cx, cy, cz), (rx, ry, rz), sub=sd[0] if sd else sub, seed=i * 2.7 + len(p.name), noise=noise)


def trunk(p, R, y0, y1, n=10):
    sweep(p.a("kit_bark"), lambda k: circle_pts(0, 0, R, n, k), [(0, y0), (R * .55, y1)])


# R3: short trunk (<= 30 % of the height), 5-7 overlapping lobes, crown wider than tall, lowest lobe on the trunk top.
LOBES_M = [(0, 1.55, 0, 1.35, .95, 1.35, "kit_leaf_a", 3), (1.0, 1.35, .35, .95, .7, .95, "kit_leaf_b", 3),
           (-.95, 1.4, -.35, .95, .72, .95, "kit_leaf_b", 3), (.25, 2.2, -.55, .9, .68, .9, "kit_leaf_a", 2),
           (-.35, 2.25, .55, .8, .62, .8, "kit_leaf_b", 2), (.6, 1.9, .95, .65, .5, .65, "kit_leaf_a", 2),
           (-.75, 1.1, .7, .6, .48, .6, "kit_leaf_a", 2)]


def tree(f, n):
    def build(p):
        trunk(p, .11 * f, 0, 1.3 * f)  # runs up inside the lowest lobe; ~ 0.85 m shows
        blobs(p, [(x * f, y * f, z * f, rx * f, ry * f, rz * f, m, sd) for x, y, z, rx, ry, rz, m, sd in LOBES_M[:n]])
    return build


def tree_indoor(p):
    cyl(p.a("kit_white"), 0, 0, .24, 0, .42, 16, r_top=.2)
    cyl(p.a("kit_bark"), 0, 0, .2, .38, .45, 16)  # soil, in the trunk colour: <= 3 materials
    sweep(p.a("kit_bark"), lambda k: circle_pts(0, 0, .045, 8, k), [(0, .42), (.02, .8)])
    blobs(p, [(0, 1.15, 0, .62, .5, .62, "kit_leaf_a", 3), (.35, 1.0, .12, .42, .34, .42, "kit_leaf_a", 2), (-.35, 1.05, -.15, .42, .34, .42, "kit_leaf_a", 2),
              (.05, 1.55, -.05, .45, .36, .45, "kit_leaf_a", 2), (-.2, 1.4, .35, .34, .28, .34, "kit_leaf_a", 2)])


def shrub_cluster(p):
    blobs(p, [(0, .3, 0, .55, .38, .5, "kit_leaf_a"), (.5, .24, .15, .4, .28, .4, "kit_leaf_b"), (-.45, .24, -.1, .4, .3, .38, "kit_leaf_b")])


def potted_plant(p):
    cyl(p.a("kit_white"), 0, 0, .17, 0, .3, 14, r_top=.22)
    cyl(p.a("kit_bark"), 0, 0, .19, .27, .33, 14)
    blobs(p, [(0, .55, 0, .3, .27, .3, "kit_leaf_a"), (.14, .76, .04, .2, .19, .2, "kit_leaf_a")], sub=2)


def planter_1m(p):
    W = p.a("kit_white")
    tr = lambda k: rrect_pts(0, 0, .5, .2, (.06,) * 4, 3, k)
    sweep(W, tr, [(.05, .32), (.05, .4), (0, .4), (0, 0)])
    obox(p.a("kit_soil"), (0, .32, 0), (.9, .04, .3))
    blobs(p, [(-.3, .56, 0, .24, .2, .2, "kit_leaf_a"), (0, .6, 0, .26, .22, .2, "kit_leaf_a"), (.3, .55, 0, .24, .2, .2, "kit_leaf_a")], sub=2)


def bench(p):
    W, D = p.a("kit_white"), p.a("kit_wood")
    for z in (-.15, 0, .15):
        obox(D, (0, .45, z), (1.6, .04, .13))
    for x in (-.7, .7):
        obox(W, (x, .22, .0), (.05, .44, .42))
        obox(W, (x, .66, -.22), (.05, .5, .05))
    for y in (.62, .76):
        obox(D, (0, y, -.255), (1.6, .1, .03))


def desk_monitor(p):
    W, D, S, O = p.a("kit_dark"), p.a("kit_dark"), p.a("kit_screen"), p.a("kit_wood")
    obox(O, (0, .75, 0), (1.4, .04, .7))
    for x in (-.65, .65):
        obox(W, (x, .365, 0), (.05, .73, .62))
    obox(D, (0, .775, -.15), (.22, .02, .16))
    obox(D, (0, .87, -.15), (.04, .2, .04))
    obox(D, (0, 1.0, -.18), (.56, .34, .03))
    obox(S, (0, 1.0, -.1625), (.5, .28, .005))
    obox(D, (0, .775, .12), (.4, .015, .14))


def chair_office(p):
    D, W = p.a("kit_dark"), p.a("kit_white")
    obox(D, (0, .48, 0), (.46, .07, .46))
    obox(D, (0, .76, -.22), (.44, .5, .06))
    cyl(W, 0, 0, .03, .1, .45, 8)
    for a in (0, 60, 120):
        t, n = yawed(math.radians(a))
        obox(W, (0, .06, 0), (.62, .04, .05), t, n)


def sofa(p):
    F, D = p.a("kit_fabric"), p.a("kit_dark")
    obox(F, (0, .25, .05), (1.8, .34, .8))
    obox(F, (0, .6, -.35), (1.9, .5, .16))
    for x in (-.95, .95):
        obox(F, (x, .38, 0), (.18, .55, .9))
    for x in (-.8, .8):
        for z in (-.35, .35):
            obox(D, (x, .04, z), (.07, .08, .07))


def bookshelf(p):
    W, O, F = p.a("kit_white"), p.a("kit_wood"), p.a("kit_fabric")
    for x in (-.485, .485):
        obox(W, (x, .95, 0), (.03, 1.9, .3))
    obox(W, (0, .95, -.155), (.94, 1.9, .02))
    for y in (.02, .4, .78, 1.16, 1.54, 1.88):
        obox(W, (0, y, 0), (.94, .03, .3))
    for si, y in enumerate((.415, .795, 1.175, 1.555)):
        x = -.4
        for bi in range(7):
            w = .05 + .02 * ((bi * 3 + si) % 3)
            h = .22 + .05 * ((bi + si * 2) % 4)
            obox(O if (bi + si) % 2 else F, (x + w / 2, y + h / 2, 0), (w, h, .22))
            x += w + .015
            if x > .38:
                break


def kitchen_counter(p):
    W, O, D = p.a("kit_white"), p.a("kit_wood"), p.a("kit_dark")
    obox(W, (0, .43, -.02), (2.0, .82, .6))
    obox(O, (0, .88, 0), (2.04, .04, .66))
    obox(D, (-.45, .905, 0), (.6, .01, .45))
    obox(D, (.6, .91, 0), (.5, .02, .35))
    for x in (-.5, 0, .5):
        obox(D, (x, .7, .285), (.2, .02, .02))


def cafe_set(p):
    O, W, D = p.a("kit_wood"), p.a("kit_white"), p.a("kit_dark")
    cyl(O, 0, 0, .45, .72, .76, 20)
    cyl(W, 0, 0, .04, .03, .72, 8)
    cyl(W, 0, 0, .25, 0, .03, 16)
    for s in (-1, 1):
        yaw = math.pi / 2 if s < 0 else -math.pi / 2  # facing the table
        cx, cz = s * .8, 0
        t, n = yawed(yaw)
        obox(D, (cx, .45, cz), (.4, .04, .4), t, n)
        ox, oz = rot(0, -.18, yaw)
        obox(D, (cx + ox, .7, cz + oz), (.4, .42, .04), t, n)
        for lx in (-.17, .17):
            for lz in (-.17, .17):
                ox, oz = rot(lx, lz, yaw)
                obox(D, (cx + ox, .21, cz + oz), (.03, .42, .03), t, n)


def floor_lamp(p):
    D, S = p.a("kit_dark"), p.a("kit_screen")
    cyl(D, 0, 0, .15, 0, .03, 14)
    cyl(D, 0, 0, .015, .03, 1.5, 6)
    cyl(S, 0, 0, .22, 1.5, 1.78, 16, r_top=.16)


def treadmill(p):
    D, W, S = p.a("kit_dark"), p.a("kit_white"), p.a("kit_screen")
    obox(D, (0, .16, 0), (.7, .14, 1.7))
    obox(W, (0, .26, 0), (.64, .02, 1.5))
    for x in (-.32, .32):
        obox(W, (x, .65, -.75), (.04, 1.0, .04))
        obox(D, (x, 1.0, -.45), (.05, .04, .7))
    obox(D, (0, 1.12, -.75), (.64, .22, .06))
    obox(S, (0, 1.12, -.72), (.5, .16, .005))


def lift_cabin(p):
    W, S, A = p.a("kit_white"), p.a("kit_screen"), p.a("kit_amber")
    w, h, t = 2.0, 3.2, .08  # R3: 1.0 : 1.6, a tall cabin (placed at ~1.2 x 1.9 local units)
    obox(W, (0, .06, 0), (w, .12, w))
    obox(W, (0, h - .07, 0), (w + .06, .14, w + .06))
    obox(W, (0, h / 2, -w / 2 + t / 2), (w, h - .2, t))
    for x in (-1, 1):
        obox(W, (x * (w / 2 - t / 2), h / 2, 0), (t, h - .2, w - 2 * t))
    sill, lintel = 1.0, h - .75  # front: sill and lintel panels, two pillars, one big window between
    obox(W, (0, (.12 + sill) / 2, w / 2 - t / 2), (w, sill - .12, t))
    obox(W, (0, (lintel + h - .14) / 2, w / 2 - t / 2), (w, h - .14 - lintel, t))
    for x in (-1, 1):
        obox(W, (x * .85, (sill + lintel) / 2, w / 2 - t / 2), (.3, lintel - sill, t))
    obox(S, (0, h / 2, -w / 2 + t + .01), (w - .3, h - .5, .01))  # warm lit back wall
    obox(S, (0, h - .22, 0), (1.2, .02, 1.2))
    obox(A, (0, .19, w / 2 + .005), (w + .02, .1, .02))  # thin amber trim at the floor line
    for x in (-1, 1):
        obox(A, (x * (w / 2 + .005), .19, 0), (.02, .1, w))


def pendant_lamp(p):
    """Origin at the lamp's lowest point: hangs from a 1.2 m cord, so place it at ceiling height minus 1.2 m."""
    D, S = p.a("kit_dark"), p.a("kit_screen")
    cyl(S, 0, 0, .12, 0, .22, 16, r_top=.28)
    cyl(D, 0, 0, .006, .22, 1.2, 4)


def rug(p):
    F, W = p.a("kit_fabric"), p.a("kit_white")
    sweep(F, lambda k: rrect_pts(0, 0, 1.0, .7, (.08,) * 4, 3, k), [(0, 0), (0, .02)])
    sweep(W, lambda k: rrect_pts(0, 0, 1.0, .7, (.08,) * 4, 3, k), [(.12, .015), (.12, .025)])


def whiteboard(p):
    W, D, F = p.a("kit_white"), p.a("kit_dark"), p.a("kit_fabric")
    obox(W, (0, 1.4, 0), (1.6, 1.0, .03))
    for y in (.9, 1.9):
        obox(D, (0, y, 0), (1.66, .04, .05))
    for x in (-.83, .83):
        obox(D, (x, 1.4, 0), (.04, 1.0, .05))
        obox(D, (x * .9, .45, 0), (.05, .9, .3))
    for x, y, w in ((-.4, 1.6, .5), (.2, 1.45, .7), (-.2, 1.25, .4)):
        obox(F, (x, y, .02), (w, .035, .005))


def upper_cabinet(p):
    W, O, D = p.a("kit_white"), p.a("kit_wood"), p.a("kit_dark")
    obox(W, (0, 1.8, 0), (1.8, .7, .35))
    for x in (-.45, .45):
        obox(O, (x, 1.8, .18), (.86, .64, .02))
        obox(D, (x * .15 + (-.4 if x < 0 else .4), 1.6, .2), (.02, .12, .02))


def art_panel(p):
    D, F, G = p.a("kit_white"), p.a("kit_fabric"), p.a("kit_leaf_a")
    obox(D, (0, 1.5, 0), (1.2, .8, .04))
    obox(F, (-.28, 1.5, .025), (.5, .64, .01))
    obox(G, (.3, 1.58, .025), (.5, .48, .01))
    obox(D, (.3, 1.3, .025), (.5, .1, .012))


def meeting_table(p):
    O, W, D = p.a("kit_wood"), p.a("kit_white"), p.a("kit_dark")
    obox(O, (0, .75, 0), (2.4, .05, 1.0))
    for x in (-1, 1):
        obox(W, (x, .36, 0), (.08, .72, .7))
    for x in (-.7, 0, .7):
        for s in (-1, 1):
            yaw = math.pi if s > 0 else 0  # chairs face the table
            t, n = yawed(yaw)
            obox(D, (x, .48, s * .78), (.44, .06, .44), t, n)
            ox, oz = rot(0, -.2, yaw)
            obox(D, (x + ox, .74, s * .78 + oz), (.44, .45, .05), t, n)
            obox(D, (x, .22, s * .78), (.06, .44, .06))


PROPS = {
    "tree_round_s": tree(.65, 5), "tree_round_m": tree(1, 7), "tree_round_l": tree(1.45, 7),
    "tree_indoor": tree_indoor, "shrub_cluster": shrub_cluster, "potted_plant": potted_plant, "planter_1m": planter_1m,
    "bench": bench, "desk_monitor": desk_monitor, "chair_office": chair_office, "sofa": sofa, "bookshelf": bookshelf,
    "kitchen_counter": kitchen_counter, "cafe_set": cafe_set, "floor_lamp": floor_lamp, "treadmill": treadmill, "lift_cabin": lift_cabin,
    "pendant_lamp": pendant_lamp, "rug": rug, "whiteboard": whiteboard, "upper_cabinet": upper_cabinet, "art_panel": art_panel, "meeting_table": meeting_table,
}


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = {n: material(n, c, .7 if n in FOLIAGE else .55, **kw) for n, (c, kw) in COLORS.items()}
    root = bpy.data.objects.new("ROOT_CITY_KIT_2127", None)
    bpy.context.scene.collection.objects.link(root)
    report = {}
    for i, (name, build) in enumerate(PROPS.items()):
        p = Prop(name)
        build(p)
        empty = bpy.data.objects.new("kit_" + name, None)
        bpy.context.scene.collection.objects.link(empty)
        empty.parent = root
        empty.location = ((i % 6) * 6.0, -(i // 6) * 6.0, 0)  # review grid; the runtime ignores it
        tris = 0
        for mat, acc in p.acc.items():
            ob = finish_mesh(f"{name}__{mat}", acc, mats[mat], smooth_deg=80 if mat in FOLIAGE else 25)
            bpy.context.scene.collection.objects.link(ob)
            ob.parent = empty
            tris += sum(len(q.vertices) - 2 for q in ob.data.polygons)
        assert len(p.acc) <= 3, f"{name}: {len(p.acc)} materials"
        report[name] = (tris, len(p.acc))
    bpy.context.view_layer.update()
    blend = os.path.join(HERE, "city-kit-2127.blend")
    glb = os.path.join(HERE, "city-kit-2127.glb")
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in [root, *root.children_recursive]:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials="EXPORT", export_animations=False,
                              export_cameras=False, export_lights=False, export_extras=False)
    print("@@KIT@@", report, "bytes", os.path.getsize(glb))


if __name__ == "__main__":
    main()
