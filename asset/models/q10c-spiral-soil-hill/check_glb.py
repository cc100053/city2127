"""Reimport check of q10c-spiral-soil-hill.glb in an empty scene (nothing is written into the model).

blender -b --factory-startup --python-exit-code 1 -P check_glb.py
Imports the GLB into an empty scene with the preview cameras only and writes check.json:
- counts, bounds, node groups, transparent materials and their blend mode;
- tube glass: rays from the entrance camera that reach old wood (the chairs) through the tube glass, and rays that
  reach the hero chair directly; rays from the main camera that reach old wood;
- seams: straight-down rays every 0.5 m over the whole hill (r <= 62 m) must all hit ground (no hole where a turn
  meets the next, the bank, the plateau or the plaza), and the banks' long edges must lie on the bench edges they join;
- planting: no vertex of a tree, shrub, understory or crop inside the kept-clear envelope of the channel or the walking
  path (spiral.in_bench: inner wall face to outer curb, channel floor to 2.6 m over the path); channel sprouts must stay
  off the rim and path.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import spiral as S  # noqa: E402
import review_spiral_soil_hill as RV  # noqa: E402

GLB = os.path.join(HERE, "q10c-spiral-soil-hill.glb")


def alpha(m):
    b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m and m.node_tree else None
    if b is None:
        return 1.0
    a = b.inputs["Alpha"]
    return .5 if a.is_linked else a.default_value


def mat_at(ob, idx):
    return ob.material_slots[ob.data.polygons[idx].material_index].material if ob.material_slots else None


def trace(scene, dg, o, d, limit=60):
    hits = []
    for _ in range(limit):
        ok, loc, _n, idx, ob, _mw = scene.ray_cast(dg, o, d)
        if not ok:
            break
        m = mat_at(ob, idx)
        hits.append((m.name if m else "?", ob.name))
        if alpha(m) >= .99:
            break
        o = loc + d * 1e-3
    return hits


def rays(cam, nx, ny):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = nx * 10, ny * 10
    fr = cam.data.view_frame(scene=sc)
    mw = cam.matrix_world
    o = mw.translation
    for j in range(ny):
        for i in range(nx):
            u, v = (i + .5) / nx, (j + .5) / ny
            p = mw @ fr[3].lerp(fr[0], u).lerp(fr[2].lerp(fr[1], u), v)
            yield o, (p - o).normalized()


def wood_rays(scene, dg, cam, nx, ny):
    total = glass = 0
    for o, d in rays(cam, nx, ny):
        h = trace(scene, dg, o, d)
        if h and "old_wood" in h[-1][0]:
            total += 1
            glass += any("tube_glass" in m for m, _ob in h[:-1])
    return {"rays_on_old_wood": total, "of_which_through_tube_glass": glass}


def holes(scene, dg, step=.5, rmax=62.0):
    n = miss = graze = 0
    worst = []
    k = int(rmax / step)
    for i in range(-k, k + 1):
        for j in range(-k, k + 1):
            x, y = i * step, j * step
            if math.hypot(x, y) > rmax:
                continue
            n += 1
            ok, loc, *_ = scene.ray_cast(dg, Vector((x, y, 200)), Vector((0, 0, -1)))
            if not ok or loc.z < -1.5:
                # a ray exactly on an edge two solids share can slip between them; re-test 2 cm to each side: a real
                # hole stays open, a grazing ray does not
                around = [scene.ray_cast(dg, Vector((x + dx, y + dy, 200)), Vector((0, 0, -1))) for dx, dy in ((.02, 0), (-.02, 0), (0, .02), (0, -.02))]
                if all(r[0] and r[1].z > -1.5 for r in around):
                    graze += 1
                    continue
                miss += 1
                if len(worst) < 8:
                    worst.append([round(x, 1), round(y, 1)])
    return {"down_rays": n, "holes": miss, "edge_grazing_rays": graze, "first_holes": worst}


def world_verts(ob):
    mw = ob.matrix_world
    return [mw @ v.co for v in ob.data.vertices]


def edge_fit(banks, bench):
    """The banks' long edges against the bench they join, on the reimported meshes: for points every 1 deg along the
    inner wall's top edge and the outer curb's foot (the bench edges, phi 0..PHI_END), the distance to the nearest bank
    vertex; and for the same points, the nearest bench vertex (CHANNEL_STRUCTURE / WALK_PATH), so a gap on either
    side would show."""
    from mathutils.kdtree import KDTree

    def tree(obs):
        vs = [v for o in obs for v in world_verts(o)]
        t = KDTree(len(vs))
        for i, v in enumerate(vs):
            t.insert(v, i)
        t.balance()
        return t
    tb = tree([banks])

    def to_bench(p):
        best = 1e9
        for o in bench:
            inv = o.matrix_world.inverted()
            ok, q, _n, _i = o.closest_point_on_mesh(inv @ p)
            if ok:
                best = min(best, ((o.matrix_world @ q) - p).length)
        return best
    out = {}
    for name, f in (("wall_top_edge", S.inner_edge), ("curb_foot_edge", S.outer_edge)):
        pts = [Vector(f(i * S.TAU / 360)) for i in range(S.TURNS * 360 + 1)]
        db = [tb.find(p)[2] for p in pts]
        dc = [to_bench(p) for p in pts]
        out[name] = {"points": len(pts), "bank_vertex_max_dist_m": round(max(db), 4), "bench_surface_max_dist_m": round(max(dc), 4)}
    return out


def planting(meshes):
    plants = [o for o in meshes if any(k in o.name for k in ("TREE", "UNDERSTORY", "BANK_PLANTS", "SUMMIT_FIELDS"))]
    out = {"objects_checked": len(plants), "verts_checked": 0, "verts_in_channel_or_path": 0, "offenders": []}
    for o in plants:
        bad, first = 0, None
        plant_vi = {i for p in o.data.polygons if "_in_" in (o.material_slots[p.material_index].material.name or "")
                    for i in p.vertices}                                       # library planting roles only (not paving)
        mw = o.matrix_world
        for v in (mw @ o.data.vertices[i].co for i in plant_vi):
            out["verts_checked"] += 1
            if S.in_bench(v.x, v.y, v.z):
                bad += 1
                first = first if bad > 1 else [round(v.x, 2), round(v.y, 2), round(v.z, 2)]
        if bad:
            out["offenders"].append([o.name, bad, first])
        out["verts_in_channel_or_path"] += bad
    sp = next((o for o in meshes if o.name.startswith("CHANNEL_S4_SPROUTS")), None)
    if sp:
        n = bad = 0
        for v in world_verts(sp):
            n += 1
            for ph, d in S.locate(v.x, v.y):
                o = S.offsets(ph)
                if o["chan_out"] - .02 < d < o["curb_out"] and abs(v.z - S.zp(ph)) < 3:
                    bad += 1
                    break
        out["sprout_verts"] = n
        out["sprout_verts_on_rim_or_path"] = bad
    return out


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    col = bpy.data.collections.new("Q10C_Preview")
    bpy.context.scene.collection.children.link(col)
    RV.stage(bpy.context.scene, col)
    before = {m.name for m in bpy.data.materials}
    bpy.ops.import_scene.gltf(filepath=GLB)
    imported = [o for o in bpy.context.scene.objects if o.select_get()]
    meshes = [o for o in imported if o.type == "MESH"]
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    sc = bpy.context.scene
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo, hi = Vector(map(min, lo, w)), Vector(map(max, hi, w))
    mats = sorted({s.material.name for o in meshes for s in o.material_slots if s.material})
    names = sorted(o.name for o in imported)
    banks = next(o for o in meshes if o.name.startswith("HILL_BANKS"))
    report = {
        "glb": os.path.basename(GLB), "glb_bytes": os.path.getsize(GLB), "objects": len(imported), "meshes": len(meshes),
        "unique_meshes": len({o.data.name for o in meshes}), "triangles": tris, "materials": len(mats),
        "new_materials_on_import": len({m.name for m in bpy.data.materials} - before),
        "bounds_min": [round(v, 2) for v in lo], "bounds_max": [round(v, 2) for v in hi],
        "groups": [n for n in names if n in ("Q10C_SpiralSoilHill", "HILL", "CHANNEL", "WALK", "FEED", "SUMMIT", "LIFT", "PIER_LINK", "PIER_LINK_Q11B")],
        "stage_objects": [n for n in names if n.startswith("CHANNEL_")],
        "people_nodes": [n for n in names if "person" in n.lower() or "resident" in n.lower()],
        "bank_vertex_colours": [a.name for a in banks.data.color_attributes],
        "transparent_materials": {m: {"alpha": round(alpha(bpy.data.materials[m]), 3), "method": bpy.data.materials[m].surface_render_method}
                                  for m in mats if alpha(bpy.data.materials[m]) < 1},
        "entrance_view": wood_rays(sc, dg, bpy.data.objects["CAM_ENTRANCE"], 160, 120),
        "main_view": wood_rays(sc, dg, bpy.data.objects["CAM_MAIN"], 320, 240),
        "seams": {"holes": holes(sc, dg), "bank_edges": edge_fit(banks, [o for o in meshes if o.name.startswith(("CHANNEL_STRUCTURE", "WALK_PATH"))])},
        "planting": planting(meshes),
    }
    with open(os.path.join(HERE, "check.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("CHECK", json.dumps(report))


if __name__ == "__main__":
    main()
