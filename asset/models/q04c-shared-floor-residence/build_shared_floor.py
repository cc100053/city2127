"""Q04-C shared-floor residence: five furnished shared floors (160 seats, 160 curtained beds), roof, stair and plaza.

Run:  blender -b --factory-startup --python-exit-code 1 -P build_shared_floor.py [-- --no-export]
Writes q04c-shared-floor-residence.blend (asset + preview staging), .glb (asset only) and report.json beside this file.
Design: document Q04-C v1.0 and the right image C of the owner's Q04 reference.

Blender coordinates, real metres, origin = plaza centre on the ground, front -y, sea +y.
Nodes: Q04C_SharedFloorResidence > PLAZA, LEVEL_1..LEVEL_5 (empties at each finished floor), ROOF, STAIR (one node per run).
"""
import json
import math
import os
import random
import sys

import bpy
from mathutils import Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import layout as LY  # noqa: E402
import parts as P  # noqa: E402
import floor as F  # noqa: E402
import review_shared_floor as RV  # noqa: E402

ASSET = "q04c-shared-floor-residence"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def preview(col):
    """Ground beyond the plaza and the sea: preview only."""
    P.MATS["pv_ground"] = P.mat("pv_ground", P.srgb("CFD0CC"), .95)
    P.MATS["pv_water"] = P.mat("pv_water", P.srgb("8FB0C4"), .12)
    a = P.Accs()
    a["pv_ground"].facing([(-900, -900, -.06), (900, -900, -.06), (900, 62, -.06), (-900, 62, -.06)], [(0, 1, 2, 3)], lambda c: (0, 0, 1))
    a["pv_water"].facing([(-9000, 62, -2), (9000, 62, -2), (9000, 9000, -2), (-9000, 9000, -2)], [(0, 1, 2, 3)], lambda c: (0, 0, 1))
    P.box(a["pv_ground"], -900, 900, 61.6, 62, -2, .5)
    col.objects.link(bpy.data.objects.new("PV_Context", P.build_mesh("pv_context", a)))
    rng = random.Random(4)
    trees = [P.build_mesh("pv_tree_%d" % i, P.tree(20 + i, 6.0 + i, 2.5 + .2 * i)) for i in range(2)]
    for i, (d, r) in enumerate(((18, 46), (40, 47), (62, 50), (118, 50), (140, 47), (162, 46), (196, 46), (212, 47), (328, 47), (344, 46), (2, 48), (178, 48))):
        ob = bpy.data.objects.new("PV_Tree_%02d" % i, trees[i % 2])
        ob.location = P.pol(r, d, 0)
        ob.rotation_euler[2] = rng.uniform(0, 6)
        col.objects.link(ob)


def labels(scene):
    """Plan annotation (preview only): what is where, and the walking lines from the lifts and the stair."""
    lab = bpy.data.collections.new("Q04C_Labels")
    scene.collection.children.link(lab)
    P.MATS["pv_ink"] = P.mat("pv_ink", (0, 0, 0, 1), 1, emit=P.srgb("1E2F45"), strength=1.4)
    P.MATS["pv_route_lift"] = P.mat("pv_route_lift", (0, 0, 0, 1), 1, emit=P.srgb("C2402F"), strength=1.6)
    P.MATS["pv_route_stair"] = P.mat("pv_route_stair", (0, 0, 0, 1), 1, emit=P.srgb("0F6E9A"), strength=1.6)
    path = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", "msjhbd.ttc")
    font = bpy.data.fonts.load(path) if os.path.exists(path) else None

    def text(s, x, y, size=1.0, role="pv_ink"):
        t = bpy.data.curves.new("LABEL", "FONT")
        t.body, t.size, t.align_x, t.align_y = s, size, "CENTER", "CENTER"
        if font:
            t.font = font
        t.materials.append(P.MATS[role])
        o = bpy.data.objects.new("PV_Label", t)
        o.location = (x, y, 45)
        lab.objects.link(o)
    text("長桌 A\n16 席", -8.3, -12.2)
    text("長桌 B\n16 席", 8.3, -12.2)
    text("共享備餐島", 0, -5.35, .85)
    text("內弧 16 床", 3.0, 9.9, .9)
    text("外弧 16 床", 0, 20.9, .9)
    text("衛浴", 14.3, 3.1, .85)
    text("電梯", -11.4, -3.2, .85)
    text("衛浴・洗衣・清潔", -16.0, -3.2, .72)
    text("樓梯平台", 3.4, -24.9, .9, "pv_route_stair")
    text("Q04-C　L2 樣板層　32 席・32 床", 0, 28.2, 1.5)
    text("紅線：電梯出發　藍線：樓梯出發　兩排床簾都開向中間弧形走道", 0, 26.1, .85)
    a = P.Accs()

    def route(role, pts, w=.16):
        for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
            n = max(1, int(math.dist((xa, ya), (xb, yb)) / .7))
            for i in range(n):
                f0, f1 = i / n, (i + .62) / n
                P.obox(a[role], (xa + (xb - xa) * (f0 + f1) / 2, ya + (yb - ya) * (f0 + f1) / 2, 40), (math.dist((xa, ya), (xb, yb)) * (f1 - f0), w, .02), math.atan2(yb - ya, xb - xa))
    ring = lambda d0, d1, r=6.0: [P.pol(r, d0 + (d1 - d0) * i / 14) for i in range(15)]  # noqa: E731
    route("pv_route_lift", [(-9.4, 1.15), (-6.6, 1.15)] + ring(172, 232))
    route("pv_route_lift", [P.pol(6.0, 232), (-3.2, -6.4), (-3.2, -13.4)])
    route("pv_route_lift", ring(172, 90) + [(0, 12.5)] + [(0, 14.6)])
    route("pv_route_lift", [P.pol(15.5, 90 + (163 - 90) * i / 18) for i in range(19)] + [(-13.5, 3.0), (-9.2, 3.0), (-7.0, 1.4)])
    route("pv_route_lift", [P.pol(15.5, 90 - (90 - 17) * i / 18) for i in range(19)] + [(13.0, 3.0)])
    route("pv_route_stair", [P.pol(26.0, 285.5), P.pol(23.2, 285.6), (2.6, -15.0), (3.2, -13.4), (3.2, -6.4)] + ring(296, 372) + [(9.4, 3.05), (13.0, 3.05)])
    lab.objects.link(bpy.data.objects.new("PV_Routes", P.build_mesh("pv_routes", a)))


def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    P.make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    rng = random.Random(2127)
    col, prev = bpy.data.collections.new("Q04C_Asset"), bpy.data.collections.new("Q04C_Preview")
    scene.collection.children.link(col)
    scene.collection.children.link(prev)
    root = bpy.data.objects.new("Q04C_SharedFloorResidence", None)
    col.objects.link(root)
    groups = {}
    for g, z in [("PLAZA", 0)] + [("LEVEL_%d" % (i + 1), z) for i, z in enumerate(LY.LEVELS)] + [("ROOF", 0), ("STAIR", 0)]:
        c = bpy.data.collections.new(g)
        col.children.link(c)
        e = bpy.data.objects.new(g, None)
        e.location = (0, 0, z)
        c.objects.link(e)
        e.parent = root
        groups[g] = (e, c)
    cache = {}

    def mesh(name, accs, **kw):
        if name not in cache:
            cache[name] = P.build_mesh(name, accs, **kw)
        return cache[name]

    def add(g, name, data, mw=None):
        ob = bpy.data.objects.new(name, data)
        groups[g][1].objects.link(ob)
        ob.parent = groups[g][0]
        if mw is not None:
            ob.matrix_local = mw
        return ob

    def col_mw(d, z=0.0):
        return Matrix.Translation(P.pol(LY.R_COL, d, z)) @ Matrix.Rotation(math.radians(d), 4, "Z")

    base, mid, head = mesh("q04c_column_base", P.column_base()), mesh("q04c_column_mid", P.column_mid()), P.column_head()
    rail, slabs = mesh("q04c_railing", P.railing()), {}
    add("PLAZA", "PLAZA_GROUND", mesh("q04c_plaza", P.plaza(rng)))
    add("PLAZA", "SHAFT_0", mesh("q04c_shaft_0", P.shaft(LY.LEVELS[0], open_car=LY.LIFT_Y[0])))
    add("PLAZA", "RISER_0", mesh("q04c_riser_0", P.riser(LY.LEVELS[0])))
    pt = mesh("q04c_plaza_tree", P.tree(31, 5.2, 2.2))
    for k, d in enumerate(P.PLAZA_TREES):
        add("PLAZA", "PLAZA_TREE_%d" % (k + 1), pt, Matrix.Translation(P.pol(31.5, d, .35)) @ Matrix.Rotation(k * 1.3, 4, "Z"))
    car = mesh("q04c_lift_car", P.car())
    add("PLAZA", "LIFT_CAR_1", car, Matrix.Translation((0, LY.LIFT_Y[0], 0)))
    for k, d in enumerate(LY.COLS):
        add("PLAZA", "COLUMN_%d_0" % (k + 1), base, col_mw(d))
    for i, z in enumerate(LY.LEVELS):
        n, g = i + 1, "LEVEL_%d" % (i + 1)
        add(g, "DISC_%d" % n, mesh("q04c_disc_floor_wood", P.disc("floor_wood")))
        add(g, "RAILING_%d" % n, rail)
        for k, d in enumerate(LY.COLS):
            add(g, "COLUMN_%d_%d" % (k + 1, n), mid if n < 5 else head, col_mw(d))
        h = 5.0 if n < 5 else 4.0
        add(g, "SHAFT_%d" % n, mesh("q04c_shaft_%s" % ("open" if n == LY.SAMPLE else "top" if n == 5 else "typ"), P.shaft(h, n == 5, LY.LIFT_Y[1] if n == LY.SAMPLE else None)))
        add(g, "RISER_%d" % n, mesh("q04c_riser_%d" % (n == 5), P.riser(h if n < 5 else LY.CEIL)))
        if n == LY.SAMPLE:
            add(g, "LIFT_CAR_2", car, Matrix.Translation((0, LY.LIFT_Y[1], 0)))
        F.place(lambda name, data, mw, g=g: add(g, name, data, mw), mesh, n)
    a, gl = P.roof()
    add("ROOF", "ROOF_FRAME", mesh("q04c_roof_frame", a))
    add("ROOF", "ROOF_PANES", mesh("q04c_roof_panes", gl))
    for i in range(5):
        add("STAIR", "STAIR_%d" % i, mesh("q04c_stair_%d" % i, P.stair(i)))
    preview(prev)
    labels(scene)

    bpy.context.view_layer.update()
    asset = list(col.all_objects)
    by = {g: sum(P.tris(o.data) for o in groups[g][1].objects if o.type == "MESH") for g in groups}
    per = lambda kind: [sum(o.name.startswith("L%d_%s_" % (n, kind)) for o in asset) for n in range(1, 6)]  # noqa: E731
    report = {"round": 2, "levels": LY.LEVELS, "sample_level": LY.SAMPLE, "beds": per("BED"), "curtains": per("CURTAIN"), "chairs": per("CHAIR"),
              "curtain_states": {n: {s: sum(b[6] == s for b in LY.beds(n)) for s in LY.STATES} for n in LY.VARY}, "risers_per_run": [2 * s[2] for s in LY.storeys()],
              "tris_by_group": by, "tris_total": sum(by.values()), "unique_mesh_tris": sum(P.tris(m) for m in {o.data for o in asset if o.type == "MESH"}),
              "objects": len(asset), "meshes": len({o.data for o in asset if o.type == "MESH"}),
              "materials": len({m.name for o in asset if o.type == "MESH" for m in o.data.materials})}
    RV.stage(scene, prev)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, ASSET + ".blend"), compress=True)
    if "--no-export" not in ARGS:
        glb = os.path.join(HERE, ASSET + ".glb")
        for ob in bpy.data.objects:
            ob.select_set(False)
        for ob in asset:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = root
        bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_animations=False,
                                  export_cameras=False, export_lights=False, export_extras=True, export_materials="EXPORT")
        report["glb_bytes"] = os.path.getsize(glb)
    with open(os.path.join(HERE, "report.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps(report))


if __name__ == "__main__":
    main()
