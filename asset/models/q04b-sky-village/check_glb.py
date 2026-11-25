"""Reimport check of q04b-sky-village.glb, on the exported triangles.

blender -b --factory-startup --python-exit-code 1 -P check_glb.py      (exit code 1 on a failed check; writes check.json)
Households and size; every platform carried by the white tree; every house standing on its platform; the walk from the core
landing over the bridge to each front door (levels, gaps, clear width and headroom); crowns, roofs and limbs against
other households; glass: living rooms and lift cabins seen through it.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import layout as LY  # noqa: E402
import houses_size as HS  # noqa: E402

glb = os.path.join(HERE, "q04b-sky-village.glb")
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)
bpy.ops.import_scene.gltf(filepath=glb)
bpy.context.view_layer.update()
obs = {o.name: o for o in bpy.data.objects}
plats, branches, bridges = LY.cached()
fail, res = [], {}
NN = ["%02d" % p["no"] for p in plats]
P = {"%02d" % p["no"]: p for p in plats}


def need(cond, msg):
    if not cond:
        fail.append(msg)


class Geo:
    def __init__(self, objs, skip_glass=False):
        self.v, self.f = [], []
        for o in objs:
            b = len(self.v)
            self.v += [o.matrix_world @ q.co for q in o.data.vertices]
            for p in o.data.polygons:
                if not (skip_glass and "glass" in o.data.materials[p.material_index].name):
                    self.f.append([b + i for i in p.vertices])
        self.t = BVHTree.FromPolygons(self.v, self.f)
        self.lo = [min(q[k] for q in self.v) for k in range(3)]
        self.hi = [max(q[k] for q in self.v) for k in range(3)]

    def near(self, o, d=0.0):
        return all(self.lo[k] - d < o.hi[k] and o.lo[k] - d < self.hi[k] for k in range(3))

    def hits(self, o):
        return len(self.t.overlap(o.t)) if self.near(o) else 0

    def down(self, x, y, z, reach=3.0):
        h = self.t.ray_cast(Vector((x, y, z)), Vector((0, 0, -1)), reach)
        return None if h[0] is None else h[0].z


for g in ("Q04B_SkyVillage", "STRUCTURE", "CORE", "HOMES", "BRIDGES", "PLAZA", "SKELETON"):
    need(g in obs, "missing " + g)
for n in NN:
    for pre in ("HOME_", "PLATFORM_", "RAIL_", "GARDEN_", "HOUSE_", "BRIDGE_"):
        need(pre + n in obs, "missing " + pre + n)
meshes = [o for o in obs.values() if o.type == "MESH"]
res["households"] = sum(1 for n in obs if n.startswith("HOUSE_"))
need(res["households"] == 20, "households")
res["types"] = {}
for n in NN:
    k = obs["HOME_" + n]["house_type"]
    res["types"][k] = res["types"].get(k, 0) + 1
pts = [o.matrix_world @ Vector(c) for o in meshes if not o.name.startswith("PLAZA") for c in o.bound_box]
res["height_m"] = round(max(p.z for p in pts), 2)
res["plan_m"] = [round(max(p[k] for p in pts) - min(p[k] for p in pts), 1) for k in (0, 1)]
need(47 <= res["height_m"] <= 51, "height %s" % res["height_m"])
res["triangles_drawn"] = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
res["triangles_unique"] = sum(len(p.vertices) - 2 for m in {o.data for o in meshes} for p in m.polygons)
res["materials"] = len({m.name for o in meshes for m in o.data.materials if m})
res["trees"] = sum(1 for n in obs if n.startswith("TREE_"))
res["glb_bytes"] = os.path.getsize(glb)
res["figures"] = sorted(m.name for m in bpy.data.materials if "skin" in m.name or "cloth_" in m.name)
need(not res["figures"], "human figures")

sk = Geo([obs["SKELETON"]])
plat = {n: Geo([obs["PLATFORM_" + n]]) for n in NN}
house = {n: Geo([obs["HOUSE_" + n]]) for n in NN}
br = {n: Geo([obs["BRIDGE_" + n]]) for n in NN}
gar = {n: Geo([obs["GARDEN_" + n]]) for n in NN}
rail = {n: Geo([obs["RAIL_" + n]]) for n in NN}
core = Geo([obs["CORE_FRAME"]])
trees = {n: [o for k, o in obs.items() if k.startswith("TREE_%s_" % n)] for n in NN}
tg = {o.name: Geo([o]) for n in NN for o in trees[n]}

# carried by the tree: the limb's end lies inside the platform's funnel, and the skin crosses it
res["limb_joins"] = sum(1 for n in NN if sk.hits(plat[n]) > 0)
need(res["limb_joins"] == 20, "limbs joined %d" % res["limb_joins"])
need(sk.lo[2] < 0, "roots above ground")
res["skeleton_pieces"] = None
adj = {}
me = obs["SKELETON"].data
par = list(range(len(me.vertices)))


def find(i):
    while par[i] != i:
        par[i] = par[par[i]]
        i = par[i]
    return i


seen = {}
for v in me.vertices:                                                           # glTF splits vertices at normals: weld by position
    k = tuple(round(c, 4) for c in v.co)
    if k in seen:
        par[find(v.index)] = find(seen[k])
    else:
        seen[k] = v.index
for e in me.edges:
    par[find(e.vertices[0])] = find(e.vertices[1])
roots = {}
for v in me.vertices:
    roots.setdefault(find(v.index), []).append((obs["SKELETON"].matrix_world @ v.co).z)
res["skeleton_pieces"] = len(roots)
need(all(min(z) < 1 for z in roots.values()), "a limb floats free of the roots")

# houses on their platforms
gaps, inside = {}, {}
for n in NN:
    p = P[n]
    w, d = HS.SIZE[p["kind"]]
    mw = obs["HOUSE_" + n].matrix_world
    mn = min((mw @ v.co).z for v in obs["HOUSE_" + n].data.vertices)
    gaps[n] = round(mn - p["z"], 3)
    worst = 9
    for x in (-w / 2, w / 2):
        for y in (-d / 2, d / 2):
            c = mw @ Vector((x, y, 0))
            worst = min(worst, -float(LY.egg_gap(p, c.x, c.y)))
            z = plat[n].down(c.x, c.y, p["z"] + 1)
            need(z is not None and abs(z - p["z"]) < .15, "house corner off the platform " + n)
    inside[n] = round(worst, 2)
res["house_base_above_lawn_m"] = [min(gaps.values()), max(gaps.values())]
res["house_corner_inside_edge_min_m"] = min(inside.values())
need(max(gaps.values()) <= .06 and min(gaps.values()) >= -.05, "house base %s" % gaps)

# the walk: core landing -> bridge -> garden path -> door
walk, worst_step = {}, 0.0
up = Vector((0, 0, 1))
for n in NN:
    p, b = P[n], bridges[int(n)]
    z = p["z"] + .04
    problems = []
    x, y = b["path"][0]
    inn = core.down(x - math.copysign(.15, x), y, z + 1)
    out = br[n].down(x + math.copysign(.15, x), y, z + 1)
    if inn is None or out is None or abs(inn - out) > .02:
        problems.append("core step %s %s" % (inn, out))
    ex, ey = b["path"][-1]
    (ux, uy), _ = LY.axes(p)
    a0 = br[n].down(ex - ux * .12, ey - uy * .12, z + 1)
    a1 = gar[n].down(ex + ux * .45, ey + uy * .45, z + 1)
    if a0 is None or a1 is None or abs(a0 - a1) > .02:
        problems.append("platform step %s %s" % (a0, a1))
    else:
        worst_step = max(worst_step, abs(a0 - a1))
    last, rise = None, 0.0                                                       # floor level every 4 cm from the bridge into the garden
    for k in range(-20, 28):
        for off in (-.4, 0, .4):
            qx, qy = ex + ux * k * .04 - uy * off, ey + uy * k * .04 + ux * off
            lv = [g.down(qx, qy, z + .6) for g in (br[n], gar[n], plat[n])]
            lv = max([q for q in lv if q is not None], default=None)
            if lv is None or abs(lv - z) > (.03 if k < 16 or off == 0 else .045):   # beside the bending path: lawn, 4 cm lower
                rise = max(rise, 9 if lv is None else abs(lv - z))
    if rise:
        problems.append("threshold %.3f" % rise)
    line = [tuple(q) for q in b["path"]]
    blocks = [("skeleton", sk)] + [("platform " + m, plat[m]) for m in NN if m != n and plat[m].near(br[n], 3)] + [("house " + m, house[m]) for m in NN if m != n and house[m].near(br[n], 3)]
    blocks += [("bridge " + m, br[m]) for m in NN if m != n and br[m].near(br[n], .1)]
    blocks += [("tree " + k, g) for k, g in tg.items() if g.near(br[n], .5)]
    blocks += [("rail", rail[n]), ("garden", gar[n]), ("house", house[n])]
    w, d = HS.SIZE[p["kind"]]
    mw = obs["HOUSE_" + n].matrix_world
    hand = 1 if p["f"] < 0 else -1
    door_out, door_in = mw @ Vector((-hand * (w / 2 + 1.25), HS.DOOR_Y, 0)), mw @ Vector((-hand * (w / 2 + .05), HS.DOOR_Y, 0))
    s = LY.to_world(p, -p["L"] / 2 + 1.7, 0)
    gpath = [(ex, ey), s, (door_out.x, door_out.y), (door_in.x, door_in.y)]
    full = line + gpath[1:]
    for q, r in zip(full, full[1:]):
        dv = Vector((r[0] - q[0], r[1] - q[1], 0))
        ln = dv.length
        if ln < 1e-3:
            continue
        dv /= ln
        side = Vector((-dv.y, dv.x, 0))
        for off in (-.40, 0, .40):
            for h in (.35, 1.0, 1.6, 2.05):
                o = Vector((*q, z + h)) + side * off
                for name, g in blocks:
                    if g.t.ray_cast(o, dv, ln)[0] is not None:
                        problems.append("%s h %.2f" % (name, h))
    own = house[n].t.ray_cast(Vector((door_out.x, door_out.y, z + 1.0)), (door_in - door_out).normalized(), 2.0)
    if own[0] is None or not .9 < own[3] < 1.5:
        problems.append("no door leaf %s" % (own[3],))
    walk[n] = sorted(set(problems))
res["walk_ok"] = sum(1 for v in walk.values() if not v)
res["walk_step_max_m"] = round(worst_step, 4)
res["walk_problems"] = {k: v[:5] for k, v in walk.items() if v}
need(res["walk_ok"] == 20, "walk problems %s" % res["walk_problems"])

# clashes between households
clash = []
for n in NN:
    if house[n].hits(sk):
        clash.append(("house", n, "skeleton"))
    for m in NN:
        if m == n:
            continue
        for what, g in (("platform", plat[m]), ("bridge", br[m])):
            if house[n].hits(g):
                clash.append(("house", n, what, m))
        if m > n and house[n].hits(house[m]):
            clash.append(("house", n, "house", m))
        if m > n and plat[n].hits(plat[m]):
            clash.append(("platform", n, "platform", m))
        if br[n].hits(plat[m]):
            clash.append(("bridge", n, "platform", m))
    for o in trees[n]:
        g = tg[o.name]
        for m in NN:
            if g.hits(house[m]):
                clash.append(("tree", o.name, "house", m))
            if m != n and g.hits(plat[m]):
                clash.append(("tree", o.name, "platform", m))
            if g.hits(br[m]):
                clash.append(("tree", o.name, "bridge", m))
        if g.hits(sk):
            clash.append(("tree", o.name, "skeleton"))
for k, o in obs.items():
    if k.startswith(("PLAZA_TREE", "PLAZA_PLANTING")) and Geo([o]).hits(sk):
        clash.append((k, "skeleton"))
props = []
for n in NN:                                                                    # bridges touch the tree only by their props
    k = br[n].hits(sk)
    if k:
        props.append((n, k))
res["bridges_propped_on_limbs"] = [n for n, _ in props]
for i, n in enumerate(NN):
    for m in NN[i + 1:]:
        if br[n].hits(br[m]):
            clash.append(("bridge", n, "bridge", m))
res["clashes"] = clash
need(not clash, "clashes %s" % clash[:6])

# glass
glass = sorted({m.name for m in bpy.data.materials if "glass" in m.name})
res["glass_materials"] = glass
need(all(bpy.data.materials[g].surface_render_method == "BLENDED" for g in glass), "glass not blended")


def seen_through(eye, target, parts_):
    """Share of target faces the eye reaches with only glass in between."""
    blockers = [Geo([o], True) for o in parts_]
    ok = tot = 0
    for o in target:
        for p in o.data.polygons:
            if "glass" in o.data.materials[p.material_index].name:
                continue
            c = o.matrix_world @ p.center
            d = c - eye
            tot += 1
            ok += all((h := b.t.ray_cast(eye, d.normalized(), d.length - .12))[0] is None for b in blockers)
    return round(ok / max(tot, 1), 3)


eye = Vector((3.0, -53.0, 24.0))
res["lift_cabins_seen_from_main"] = {k: seen_through(eye, [obs[k]], [obs["CORE_FRAME"], obs["SKELETON"]]) for k in obs if k.startswith("LIFT_CABIN")}
need(sum(v > .02 for v in res["lift_cabins_seen_from_main"].values()) >= 2, "cabins hidden")
# the main house's furniture: faces of library props inside the ground floor
o5 = obs["HOUSE_05"]
kitm = [i for i, m in enumerate(o5.data.materials) if m.name.startswith(("q04b_kit_fabric", "q04b_kit_wood", "q04b_kit_slate"))]
own = Geo([o5], True)
for label, e in (("main", eye), ("house", Vector((9.5, -38.0, 23.0)))):
    ok = tot = 0
    for p in o5.data.polygons:
        if p.material_index in kitm:
            c = o5.matrix_world @ p.center
            if c.z < P["05"]["z"] + 2.6:
                d = c - e
                tot += 1
                ok += own.t.ray_cast(e, d.normalized(), d.length - .05)[0] is None
    res["main_house_furniture_seen_from_" + label] = round(ok / max(tot, 1), 3)
    need(ok / max(tot, 1) > .05, "furniture hidden from " + label)
front = []
for n in NN:                                                                     # each living-room window looks onto its own lawn
    p = P[n]
    mw = obs["HOUSE_" + n].matrix_world
    d = HS.SIZE[p["kind"]][1]
    a = mw @ Vector((0, -d / 2, 0))
    b = mw @ Vector((0, -d / 2 - 2.2, 0))
    front.append(float(LY.egg_gap(p, b.x, b.y)) < -.5 and plat[n].down(b.x, b.y, p["z"] + .8) is not None)
res["windows_onto_own_garden"] = sum(front)
need(all(front), "a window without a garden")
m5 = obs["HOUSE_05"].matrix_world
y, depth = -HS.SIZE["main"][1] / 2 - 1.45, 0.0
while True:
    c = m5 @ Vector((0, y - depth, 0))
    if float(LY.egg_gap(P["05"], c.x, c.y)) > -.45:
        break
    depth += .02
res["main_lawn_depth_to_rail_side_m"] = round(depth, 2)
need(depth >= 4.0, "main lawn %s" % depth)
res["result"] = "PASS" if not fail else "FAIL"
res["failures"] = fail
with open(os.path.join(HERE, "check.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(res, f, indent=1)
print("CHECK", json.dumps(res, indent=1))
if fail:
    sys.exit(1)
