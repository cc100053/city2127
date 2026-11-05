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
    "kit_leaf_a": ((.36, .58, .27, 1), {}), "kit_leaf_b": ((.5, .68, .33, 1), {}),
    "kit_bark": ((.79, .57, .35, 1), {}), "kit_white": ((.96, .95, .92, 1), {}),
    "kit_wood": ((.85, .7, .5, 1), {}), "kit_dark": ((.2, .22, .25, 1), {}),
    "kit_fabric": ((.84, .6, .47, 1), {}), "kit_soil": ((.35, .27, .22, 1), {}),
    "kit_screen": ((1, .94, .82, 1), {"emit": (1, .9, .7, 1), "emit_strength": 1.6}),
    "kit_glass": ((.81, .9, .95, .22), {}),
}
FOLIAGE = {"kit_leaf_a", "kit_leaf_b"}


class Prop:
    def __init__(self, name):
        self.name, self.acc = name, {}

    def a(self, mat):
        return self.acc.setdefault(mat, Acc())


def blobs(p, lobes, sub=3, noise=.12):
    for i, (cx, cy, cz, rx, ry, rz, m) in enumerate(lobes):
        blob(p.a(m), (cx, cy, cz), (rx, ry, rz), sub=sub, seed=i * 2.7 + len(p.name), noise=noise)


def trunk(p, R, y0, y1, n=10):
    sweep(p.a("kit_bark"), lambda k: circle_pts(0, 0, R, n, k), [(0, y0), (R * .55, y1)])


def tree(f, lobes):
    def build(p):
        trunk(p, .09 * f, 0, 2.3 * f)
        blobs(p, [(x * f, y * f, z * f, rx * f, ry * f, rz * f, m) for x, y, z, rx, ry, rz, m in lobes])
    return build


LOBES_M = [(0, 2.7, 0, 1.15, .95, 1.15, "kit_leaf_a"), (.7, 2.35, .3, .8, .7, .8, "kit_leaf_b"),
           (-.6, 2.5, -.3, .85, .75, .85, "kit_leaf_a"), (.1, 3.3, -.2, .7, .6, .7, "kit_leaf_b")]


def tree_indoor(p):
    cyl(p.a("kit_white"), 0, 0, .24, 0, .42, 16, r_top=.2)
    cyl(p.a("kit_bark"), 0, 0, .2, .38, .45, 16)  # soil, in the trunk colour: <= 3 materials
    sweep(p.a("kit_bark"), lambda k: circle_pts(0, 0, .035, 8, k), [(0, .42), (.015, 1.3)])
    blobs(p, [(0, 1.45, 0, .5, .42, .5, "kit_leaf_a"), (.18, 1.72, .06, .36, .3, .36, "kit_leaf_a"), (-.2, 1.65, -.1, .3, .27, .3, "kit_leaf_a")], sub=2)


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
    W, G, S = p.a("kit_white"), p.a("kit_glass"), p.a("kit_screen")
    w, h, t = 2.0, 2.8, .08
    obox(W, (0, .06, 0), (w, .12, w))
    obox(W, (0, h - .07, 0), (w + .06, .14, w + .06))
    obox(W, (0, h / 2, -w / 2 + t / 2), (w, h - .2, t))
    for x in (-1, 1):
        obox(W, (x * (w / 2 - t / 2), h / 2, 0), (t, h - .2, w - 2 * t))
    obox(W, (0, .4, w / 2 - t / 2), (w, .56, t))  # front: sill, lintel, two pillars around a window
    obox(W, (0, h - .55, w / 2 - t / 2), (w, .7, t))
    for x in (-1, 1):
        obox(W, (x * .85, (.68 + h - .9) / 2, w / 2 - t / 2), (.3, h - .9 - .68, t))
    plane(G, [(-.7, .68, w / 2 - .04), (.7, .68, w / 2 - .04), (.7, h - .9, w / 2 - .04), (-.7, h - .9, w / 2 - .04)], (0, 0, 1))
    obox(S, (0, h / 2, -w / 2 + t + .01), (w - .3, h - .5, .01))  # warm lit back wall
    obox(S, (0, h - .22, 0), (1.2, .02, 1.2))


PROPS = {
    "tree_round_s": tree(.65, LOBES_M[:3]), "tree_round_m": tree(1, LOBES_M), "tree_round_l": tree(1.45, LOBES_M),
    "tree_indoor": tree_indoor, "shrub_cluster": shrub_cluster, "potted_plant": potted_plant, "planter_1m": planter_1m,
    "bench": bench, "desk_monitor": desk_monitor, "chair_office": chair_office, "sofa": sofa, "bookshelf": bookshelf,
    "kitchen_counter": kitchen_counter, "cafe_set": cafe_set, "floor_lamp": floor_lamp, "treadmill": treadmill, "lift_cabin": lift_cabin,
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
