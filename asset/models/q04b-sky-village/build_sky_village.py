"""Q04-B sky village: twenty houses with gardens on a white metal tree (design document Q04-B v1.0, owner image Q04 centre, B).

Run:  blender -b --factory-startup --python-exit-code 1 -P build_sky_village.py [-- --white] [--no-export]
Writes q04b-sky-village.blend (asset + preview staging), .glb (asset only) and report.json beside this file.
--white writes only the white massing model, to <temp>/q04b-white.blend (first stage of the design's order of work).
layout.json (platform table, solved limbs and bridges) comes from layout.py.

Blender coordinates, real metres, origin = core centre on the plaza (z 0), sea on +y, main view from -y.
Nodes: Q04B_SkyVillage > STRUCTURE (skeleton), CORE, HOMES, BRIDGES, PLAZA. Per household nn = 01-20: HOME_nn (empty, at the
platform, +x to the wide end) > PLATFORM_nn, RAIL_nn, GARDEN_nn, HOUSE_nn, TREE_nn_k; and BRIDGE_nn.
"""
import json
import math
import os
import random
import sys
import tempfile

import bpy
from mathutils import Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import parts as P  # noqa: E402
import layout as LY  # noqa: E402
from parts import Accs, box, build_mesh, lathe, loft, obox, ring, sector  # noqa: E402
import review_sky_village as RV  # noqa: E402

ASSET = "q04b-sky-village"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
WHITE = "--white" in ARGS


def house_place(p):
    """House origin and turn in the platform frame: (u, v, angle, hand). Front (local -y) faces f * v; the door is on
    the side toward the bridge (local -x for hand 1, mirrored for -1)."""
    import houses as H
    w, d = H.SIZE[p["kind"]]
    hu = {"main": .6, "second": .5}.get(p["kind"], .35)
    room = p["W"] / 2 - d / 2
    hv = -p["f"] * (room - {"main": 1.35, "second": 1.3}.get(p["kind"], 1.5))
    return hu, hv, (0.0 if p["f"] < 0 else math.pi), (1 if p["f"] < 0 else -1)


def masses():
    """Plain volumes of the five house forms, for the white model."""
    import houses as H
    out = {}
    for kind, (w, d) in H.SIZE.items():
        a = Accs()
        b = a["white_model"]
        hw, hd = w / 2, d / 2
        if kind in ("main", "second"):
            k = w / 9
            box(b, -hw, hw, -hd, hd, 0, 3.1)
            loft(b, [[(-hw, y, 3.1), (hw, y, 3.1), (hw, y, 6.8 * (.6 + .4 * k)), (-hw, y, 5.3 * (.6 + .4 * k))] for y in (-hd + .2, hd - .2)])
            loft(b, [[(-hw - .6, y, 5.1 * (.6 + .4 * k)), (hw + .9, y, 6.9 * (.6 + .4 * k)), (hw + .9, y, 7.15 * (.6 + .4 * k)), (-hw - .6, y, 5.35 * (.6 + .4 * k))] for y in (-hd - .6, hd + .6)])
        elif kind == "gable":
            box(b, -hw, hw, -hd, hd, 0, 2.7)
            loft(b, [[(x, -hd - .5, 2.6), (x, hd + .5, 2.6), (x, 0, 4.0)] for x in (-hw - .5, hw + .5)])
        elif kind == "gable2":
            box(b, -hw, hw, -hd, hd, 0, 5.1)
            loft(b, [[(-hw - .5, y, 5.0), (hw + .5, y, 5.0), (0, y, 6.4)] for y in (-hd - .5, hd + .5)])
        elif kind == "ridge":
            box(b, -hw, hw, -hd, hd, 0, 2.6)
            loft(b, [[(x, -hd - .5, 2.5), (x, hd + .5, 2.9), (x, 1.0, 4.3)] for x in (-hw - .5, hw + .5)])
        else:
            box(b, -hw, hw, -hd, hd, 0, 3.0)
            box(b, -hw + .2, .9, -hd + 1.2, hd - .2, 3.0, 5.8)
            loft(b, [[(-hw - .3, y, 5.6), (1.4, y, 5.9), (1.4, y, 6.1), (-hw - .3, y, 5.8)] for y in (-hd + .7, hd + .3)])
        out[kind] = a
    return out


def plaza(rng):
    a = Accs()
    lathe(a["paving"], [(12, -.4), (12, 0), (1, 0)], 96)
    for r in (6.6, 11.6):
        ring(a["paving_b"], r, r + .3, -.1, .012, 96)
    loft(a["paving"], [[(-4, y, z) for z in (-.4, 0)] + [(4, y, z) for z in (0, -.4)] for y in (-30, -10.5)])
    for x in (-3.9, 3.6):
        box(a["paving_b"], x, x + .3, -30, -11.4, -.1, .012)
    for d, w in P.PLANTERS:                                                     # low planters between the three roots
        sector(a["curb"], 8.6, 10.9, d - w, d + w, 0, .42, 3)
        sector(a["lawn"], 8.8, 10.7, d - w + 1, d + w - 1, .3, .46, 3)
    for d in (126, 54):                                                         # seats facing the sea
        x, y = 7.9 * math.cos(math.radians(d)), 7.9 * math.sin(math.radians(d))
        P.M.kit_prop(P.K.ctx(a, rng, x, y, 0, math.radians(d) + math.pi / 2), "bench", 0, 0, 0)
    for y in (-14, -19, -24, -29):
        for x in (-4.4, 4.4):
            lathe(a["curb"], [(.09, 0), (.09, .9)], 10, x, y)
            lathe(a["warm"], [(.10, .9), (.10, 1.08)], 10, x, y)
    return a


def preview(col, rng):
    """Sea, shore, far city and bridge: preview only."""
    mk = lambda n, h, r=.8: P.MATS.setdefault("pv_" + n, P.mat("pv_" + n, P.srgb(h), r))  # noqa: E731
    for n, h, r in (("water", "3F7FA8", .08), ("land", "A6BC7C", .95), ("path", "D8D2C6", .9), ("far", "B9C9D6", .9), ("farw", "DDE5EA", .8), ("rock", "9B968C", .95)):
        mk(n, h, r)
    a = Accs()
    loft(a["pv_water"], [[(-4000, y, -2.5), (4000, y, -2.5), (4000, y, -2), (-4000, y, -2)] for y in (-600, 6000)])
    shore = [(-52, -120), (-50, -60), (-46, -30), (-44, 0), (-38, 26), (-20, 40), (10, 45), (45, 47), (80, 52), (160, 60), (400, 70), (400, -400), (-52, -400)]
    a["pv_land"].facing([(x, y, -.15) for x, y in shore], [tuple(range(len(shore)))], lambda c: (0, 0, 1))
    edge = shore[:11]
    P.ribbon(a["pv_path"], edge, -4.5, -.2, -.4, .05)
    P.ribbon(a["pv_rock"], edge, -.4, 2.4, -2.6, -.35)
    for r, w, t0, t1 in ((17, 4, 0, 360), (34, 3.5, 175, 380)):
        sector(a["pv_path"], r, r + w, t0, t1, -.4, -.08, 3)
    for d in (210, 330, 20, 160):
        obox(a["pv_path"], (25 * math.cos(math.radians(d)), 25 * math.sin(math.radians(d)), -.22), (20, 4, .3), math.radians(d))
    for i in range(170):
        x, y = rng.uniform(-2600, 2600), rng.uniform(1700, 2300)
        h, w = rng.uniform(15, 60) * (2.2 if rng.random() < .12 else 1), rng.uniform(18, 46)
        box(a["pv_far"], x, x + w, y, y + w, -2, h)
    loft(a["pv_far"], [[(-4000, y, -2.2), (4000, y, -2.2), (4000, y, 5), (-4000, y, 5)] for y in (1680, 2500)])
    bx, by = (-900.0, 1150.0), (-250.0, 1250.0)
    ang = math.atan2(by[1] - bx[1], by[0] - bx[0])

    def along(t, z, s=0):
        return (bx[0] + (by[0] - bx[0]) * t - s * 8 * math.sin(ang), bx[1] + (by[1] - bx[1]) * t + s * 8 * math.cos(ang), z)
    obox(a["pv_farw"], along(.5, 26), (1000, 12, 3), ang)
    for t in (.1, .9):
        for s in (-1, 1):
            obox(a["pv_farw"], along(t, 45, s), (5, 4, 94), ang)
        obox(a["pv_farw"], along(t, 86), (4, 18, 5), ang)
    for s in (-1, 1):
        P.pipe(a["pv_farw"], [along(.1 + .8 * i / 24, 30 + 60 * (2 * i / 24 - 1) ** 2, s) for i in range(25)], .8, .8, 5)
        P.pipe(a["pv_farw"], [along(-.2, 28, s), along(.1, 90, s)], .8, .8, 5)
        P.pipe(a["pv_farw"], [along(1.2, 28, s), along(.9, 90, s)], .8, .8, 5)
    col.objects.link(bpy.data.objects.new("PV_Context", build_mesh("pv_context", a)))


def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    P.make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    rng = random.Random(2127)
    col = bpy.data.collections.new("Q04B_Asset")
    prev = bpy.data.collections.new("Q04B_Preview")
    scene.collection.children.link(col)
    scene.collection.children.link(prev)
    root = bpy.data.objects.new("Q04B_SkyVillage", None)
    col.objects.link(root)
    groups = {}
    for g in ("STRUCTURE", "CORE", "HOMES", "BRIDGES", "PLAZA"):
        e = bpy.data.objects.new(g, None)
        c = bpy.data.collections.new(g)
        col.children.link(c)
        c.objects.link(e)
        e.parent = root
        groups[g] = (e, c)

    def add(name, data, g, parent=None, mw=None):
        ob = bpy.data.objects.new(name, data)
        groups[g][1].objects.link(ob)
        ob.parent = parent or groups[g][0]
        if mw is not None:
            ob.matrix_local = mw
        return ob

    def mesh(name, accs, **kw):
        return build_mesh(name, accs, white=WHITE, **kw)

    plats, branches, bridges = LY.cached()
    sk = P.skeleton(plats, branches)
    if WHITE:
        sk.materials[0] = P.MATS["white_model"]
    add("SKELETON", sk, "STRUCTURE")
    add("CORE_FRAME", mesh("q04b_core", P.core()), "CORE")
    add("CORE_GLASS", mesh("q04b_core_glass", P.core_glass()), "CORE")
    for i, z in enumerate((6.2, 17.04, 33.6)):
        add("LIFT_CABIN_%d" % (i + 1), mesh("q04b_cabin_%d" % i, P.cabin(z)), "CORE")
    for p in plats:
        add("BRIDGE_%02d" % p["no"], mesh("q04b_bridge_%02d" % p["no"], P.bridge(bridges[p["no"]]["path"], p["z"], branches[p["no"]]["path"])), "BRIDGES")
    add("PLAZA_GROUND", mesh("q04b_plaza", plaza(rng)), "PLAZA")

    if WHITE:
        ms = {k: mesh("white_" + k, a) for k, a in masses().items()}
        mirror = {k: mesh("white_m_" + k, P.mirrored(a)) for k, a in masses().items()}
        lab = bpy.data.collections.new("Q04B_Labels")
        scene.collection.children.link(lab)
    else:
        import homes
        kit = homes.Kit(mesh, [sk] + [o.data for o in groups["BRIDGES"][1].objects if o.type == "MESH"])
    for p in plats:
        n = "%02d" % p["no"]
        home = add("HOME_" + n, None, "HOMES", mw=Matrix.Translation((p["x"], p["y"], p["z"])) @ Matrix.Rotation(math.radians(p["phi"]), 4, "Z"))
        home["household"], home["house_type"], home["level"] = p["no"], p["kind"], LY.LEVELS.index(p["z"]) + 1
        add("PLATFORM_" + n, mesh("q04b_platform_" + n, P.platform(p, branches[p["no"]])), "HOMES", home)
        add("RAIL_" + n, mesh("q04b_rail_" + n, P.railing(p)), "HOMES", home)
        hu, hv, ang, hand = house_place(p)
        hm = Matrix.Translation((hu, hv, P.FLOOR)) @ Matrix.Rotation(ang, 4, "Z")
        if WHITE:
            add("HOUSE_" + n, (ms if hand > 0 else mirror)[p["kind"]], "HOMES", home, hm)
            t = bpy.data.curves.new("LABEL_" + n, "FONT")
            t.body, t.size, t.align_x, t.align_y = n, 3.2, "CENTER", "CENTER"
            t.materials.append(P.MATS["label"])
            o = bpy.data.objects.new("LABEL_" + n, t)
            dx, dy = {3: (5, 4), 2: (2, 3), 1: (0, -3)}.get(p["no"], (0, 0))
            o.location = (p["x"] + dx, p["y"] + dy, 70)
            lab.objects.link(o)
        else:
            kit.place(p, home, (hu, hv, ang, hand), hm, lambda name, data, parent, mw=None: add(name, data, "HOMES", parent, mw))
    if not WHITE:
        kit.ground(plats, lambda name, data, mw: add(name, data, "PLAZA", None, mw), prev)
    preview(prev, random.Random(7))

    bpy.context.view_layer.update()
    asset = list(col.all_objects)
    by_group = {g: sum(P.tris(o.data) for o in groups[g][1].objects if o.type == "MESH") for g in groups}
    report = {"households": len(plats), "bridges": len(bridges), "moved_from_table": {str(k): v for k, v in LY.MOVED.items()},
              "tris_by_group": by_group, "tris_total": sum(by_group.values()),
              "unique_mesh_tris": sum(P.tris(m) for m in {o.data for o in asset if o.type == "MESH"}), "objects": len(asset),
              "materials": len({m.name for o in asset if o.type == "MESH" for m in o.data.materials})}
    RV.stage(scene, prev)
    if WHITE:
        path = os.path.join(tempfile.gettempdir(), "q04b-white.blend")
        bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
        print("REPORT", json.dumps(report))
        return
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, ASSET + ".blend"), compress=True)
    if "--no-export" not in ARGS:
        glb = os.path.join(HERE, ASSET + ".glb")
        for ob in bpy.data.objects:
            ob.select_set(False)
        for ob in asset:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = root
        bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                                  export_animations=False, export_cameras=False, export_lights=False, export_extras=True,
                                  export_materials="EXPORT")
        report["glb_bytes"] = os.path.getsize(glb)
    with open(os.path.join(HERE, "report.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps(report))


if __name__ == "__main__":
    main()
