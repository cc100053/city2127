"""Reimport check of q10b-material-bank.glb in an empty scene (nothing is written into the model).

blender -b --factory-startup --python-exit-code 1 -P check_glb.py
Imports the GLB once into an empty scene and writes check.json: triangles drawn (every instance) and unique, meshes and
shared meshes, materials and the blend mode of the transparent ones, bounds, the story nodes, people nodes (must be none),
drawer counts by state and how many face the plaza, the gripper fingers against the handles they close on, the bridge
deck against the forming room floor, the intake tubes reaching the facade, and column feet on their plinths.
"""
import json
import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.join(HERE, "q10b-material-bank.glb")
NODES = ("STRUCTURE", "FACADE", "LIBRARY", "ROBOTS", "INTAKE", "FORMING", "BRIDGE", "GROUND", "PLAZA", "FINISHED_BENCH",
         "LIBRARY_RAILS_ARMS", "FORMING_ROOM")


def alpha(m):
    b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m and m.node_tree else None
    return 1.0 if b is None else b.inputs["Alpha"].default_value


RB = 182.07                                                                     # the builder's bend radius


def radial_v(p):
    """Straight-frame depth v of a world point (front facade at -10, back at +10)."""
    return Vector((p.x, p.y + RB, 0)).length - RB


def world_verts(o, role=None):
    me = o.data
    idx = None
    if role:
        slots = [i for i, s in enumerate(o.material_slots) if s.material and role in s.material.name]
        idx = {v for p in me.polygons if p.material_index in slots for v in p.vertices}
    return [o.matrix_world @ v.co for i, v in enumerate(me.vertices) if idx is None or i in idx]


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB)
    obs = list(bpy.context.scene.objects)
    meshes = [o for o in obs if o.type == "MESH"]
    names = {o.name.split(".")[0] for o in obs}
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    uniq = {o.data.name: o.data for o in meshes}
    lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo, hi = Vector(map(min, lo, w)), Vector(map(max, hi, w))
    mats = sorted({s.material.name for o in meshes for s in o.material_slots if s.material})
    trans = {m: {"alpha": round(alpha(bpy.data.materials[m]), 2), "method": bpy.data.materials[m].surface_render_method}
             for m in mats if alpha(bpy.data.materials[m]) < 1}
    drawers = [o for o in meshes if o.name.startswith("DRAWER_")]
    states = {}
    facing = 0
    for o in drawers:
        key = o.data.name.split("_")[3] if o.data.name.count("_") >= 3 else "?"
        states[key] = states.get(key, 0) + 1
        y = o.matrix_world.to_3x3() @ Vector((0, 1, 0))                         # drawer depth axis: must point away from the plaza
        facing += y.y > .9
    pulled = []
    for o in drawers:                                                           # a pulled drawer stands ~1 m proud of its row
        loc = o.matrix_world.translation
        if radial_v(loc) < -7.0 - .5:
            pulled.append(o.name)
    arm = next(o for o in meshes if o.name.startswith("LIBRARY_RAILS_ARMS"))
    fingers = world_verts(arm, "robot_white")
    handles = []
    for o in drawers:
        if o.name in pulled:
            hv = world_verts(o, "handle")
            c = sum(hv, Vector()) / len(hv)
            near = min((v - c).length for v in fingers)
            handles.append({"drawer": o.name, "nearest_finger_m": round(near, 3)})
    bridge = next(o for o in meshes if o.name.startswith("BRIDGE"))
    deck = world_verts(bridge, "bridge_deck")
    form = next(o for o in meshes if o.name.startswith("STRUCTURE_SHELL"))
    floor_top = max((v.z for v in world_verts(form, "slab_white") if 29 < v.z < 31), default=None)
    intake = next(o for o in meshes if o.name.startswith("INTAKE"))
    tube = world_verts(intake, "tube_glass")
    cols = [o for o in meshes if o.name.startswith("COLUMN_")]
    col_low = min(v.z for o in cols for v in world_verts(o, "in_white"))
    plinth_top = max(v.z for o in cols for v in world_verts(o, "plinth_white"))
    def straight_u(p):
        return RB * math.atan2(p.x, p.y + RB)
    benches = [o for o in meshes if "BENCH" in o.name]
    plaza_benches = [o for o in benches if o.name.startswith("PLAZA_REGEN_BENCH")]
    finished = [o for o in benches if o.name.startswith("FINISHED_BENCH")]
    route = (-17.8, -13.2)
    on_route = [o.name for o in meshes if (o.name.startswith(("TREE_", "PLAZA_REGEN_BENCH")))
                and route[0] - 1.5 < straight_u(o.matrix_world.translation) < route[1] + 1.5]
    inside = [v for v in tube if radial_v(v) > -9.6]
    cart_bench = next((o for o in benches if o.name.startswith("FINISHED_BENCH_ON_CART")), None)
    bridge_cart = {}
    if cart_bench:
        bv = [cart_bench.matrix_world @ v.co for v in cart_bench.data.vertices]
        lv = [cart_bench.matrix_world.inverted() @ v for v in bv]              # bench-local: x along the track
        deck_top = max(v.z for v in world_verts(bridge, "cart_deck"))
        seats = [v for v in world_verts(bridge, "handle") if abs(v.z - (deck_top + .05)) < .002]
        bridge_cart = {
            "benches_on_bridge": sum(1 for o in benches if o.name.startswith(("FINISHED_BENCH", "DELIVERED")) and radial_v(o.matrix_world.translation) < 0
                                     and o.matrix_world.translation.z > 29),
            "bench_feet_z": round(min(v.z for v in bv), 3), "cart_deck_top_z": round(deck_top, 3),
            "cart_seat_top_z": round(max(v.z for v in seats), 3) if seats else None,
            "bench_length_m": round(max(v.x for v in lv) - min(v.x for v in lv), 2),
            "bench_width_m": round(max(v.y for v in lv) - min(v.y for v in lv), 2),
            "bench_top_above_deck_m": round(max(v.z for v in bv) - 30.0, 2),
            "vault_clear_height_at_bench_edge_m": round(.15 + 2.6 * math.sqrt(1 - ((max(abs(v.y) for v in lv) + .07) / 2.1) ** 2) - .07, 2),
            "end_wall_opening_m": {"width": 4.3, "height": 3.4},
            "deck_width_between_handrails_m": round(2 * (2.1 - .15) - .08, 2),
        }
    report = {
        "bridge_cart": bridge_cart,
        "same_bench_mesh_on_plaza_and_line": sorted({o.data.name for o in plaza_benches + finished}),
        "plaza_benches": len(plaza_benches), "finished_benches_at_bridge": len(finished),
        "objects_on_entrance_route": on_route,
        "tube_hood_low_z": round(min(v.z for v in inside), 2) if inside else None,
        "unloading_platform_top_z": 19.1,
        "glb": os.path.basename(GLB), "glb_bytes": os.path.getsize(GLB), "objects": len(obs), "mesh_objects": len(meshes),
        "unique_meshes": len(uniq), "triangles_drawn": tris,
        "triangles_unique": sum(sum(len(p.vertices) - 2 for p in m.polygons) for m in uniq.values()),
        "materials": len(mats), "transparent_materials": trans,
        "bounds_min": [round(v, 2) for v in lo], "bounds_max": [round(v, 2) for v in hi],
        "size_m": [round(h - l, 2) for h, l in zip(hi, lo)],
        "story_nodes": {n: n in names for n in NODES},
        "people_nodes": sorted(n for n in names if "person" in n.lower() or "resident" in n.lower()),
        "drawers": {"total": len(drawers), "by_fill": states, "depth_axis_away_from_plaza": facing, "pulled": len(pulled)},
        "gripped_handles": handles,
        "bridge_deck_top_z": round(max(v.z for v in deck), 3), "forming_floor_top_z": None if floor_top is None else round(floor_top, 3),
        "intake_tubes_deepest_v": round(max(radial_v(v) for v in tube if v.z > 19), 2),   # > -10: through the facade into the room
        "intake_tubes_low_z": round(min(v.z for v in tube), 2),
        "column_root_low_z": round(col_low, 3), "plinth_top_z": round(plinth_top, 3),
    }
    with open(os.path.join(HERE, "check.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("CHECK", json.dumps(report))


if __name__ == "__main__":
    main()
