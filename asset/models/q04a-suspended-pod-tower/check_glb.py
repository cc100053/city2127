"""Reimport check of q04a-suspended-pod-tower-v2.glb, on the exported triangles (not on the layout's envelopes).

blender -b --factory-startup --python-exit-code 1 -P check_glb.py     (exit code 1 on a failed check; writes check-v2.json)
Counts and height; smallest gap between dwellings; hanger rods and springs against bridges and other dwellings; bridges
against dwellings and each other; bridge end against its own threshold (gap, level, sideways, clear doorway); the chain
arm -> rod -> spring seat. v2: no human figure left, plaza unchanged from v1, furniture really visible through the open windows
(sight lines, only glass in between), accent colours kept.
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

glb = os.path.join(HERE, "q04a-suspended-pod-tower-v2.glb")
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)
bpy.ops.import_scene.gltf(filepath=glb)
bpy.context.view_layer.update()
obs = {o.name: o for o in bpy.data.objects}
pods_t, _ = LY.cached()
names = [p["name"] for p in pods_t]
fail, res = [], {}


def need(cond, msg):
    if not cond:
        fail.append(msg)


class Geo:
    """World triangles of an object (optionally only those matching keep(vertex list))."""

    def __init__(self, objs, keep=None):
        self.v, self.f = [], []
        for o in objs:
            mw, b = o.matrix_world, len(self.v)
            self.v += [mw @ q.co for q in o.data.vertices]
            for p in o.data.polygons:
                f = [b + i for i in p.vertices]
                if keep is None or keep([self.v[i] for i in f]):
                    self.f.append(f)
        used = sorted({i for f in self.f for i in f})
        m = {i: k for k, i in enumerate(used)}
        self.v = [self.v[i] for i in used]
        self.f = [[m[i] for i in f] for f in self.f]
        self.t = BVHTree.FromPolygons(self.v, self.f)
        self.lo = [min(q[k] for q in self.v) for k in range(3)]
        self.hi = [max(q[k] for q in self.v) for k in range(3)]

    def near(self, o, d):
        return all(self.lo[k] - d < o.hi[k] and o.lo[k] - d < self.hi[k] for k in range(3))

    def gap(self, o, cap=4.0):
        """Vertex-to-surface distance both ways (0 when the surfaces cross); cap when further apart."""
        if not self.near(o, cap):
            return cap
        if self.t.overlap(o.t):
            return 0.0
        best = cap
        for a, b in ((self, o), (o, self)):
            for q in a.v:
                if all(b.lo[k] - best < q[k] < b.hi[k] + best for k in range(3)):
                    h = b.t.find_nearest(q, best)
                    if h[0] is not None:
                        best = min(best, h[3])
        return best


for g in ("Q04A_SuspendedPodTower", "CORE", "CROWN", "PODS", "ACCESS", "PLAZA"):
    need(g in obs, "missing group " + g)
for n in names:
    for pre in ("POD_", "SHUTTER_", "ACCENT_", "HANGER_", "ARM_", "BRIDGE_"):
        need(pre + n in obs, "missing " + pre + n)
res["pods"] = sum(1 for n in obs if n.startswith("POD_"))
res["by_ring"] = {r: sum(1 for n in obs if n.startswith("POD_" + r)) for r in ("INNER", "MID", "OUTER")}
need(res["by_ring"] == {"INNER": 12, "MID": 16, "OUTER": 20}, "ring counts %s" % res["by_ring"])
need(len({obs["POD_" + n].data.name for n in names}) == 1, "pods do not share one mesh")
meshes = [o for o in obs.values() if o.type == "MESH"]
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
res["height_m"] = round(max(p.z for p in pts), 3)
crown = [o.matrix_world @ v.co for o in meshes if o.name.startswith(("POD_", "ARM_", "CROWN_")) for v in o.data.vertices]
res["crown_and_pods_diameter_m"] = round(2 * max(math.hypot(p.x, p.y) for p in crown), 2)
need(abs(res["height_m"] - 60) < .05, "height %s" % res["height_m"])
need(res["crown_and_pods_diameter_m"] <= 58, "diameter")
res["triangles_drawn"] = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
res["triangles_unique"] = sum(len(p.vertices) - 2 for m in {o.data for o in meshes} for p in m.polygons)
res["glb_bytes"] = os.path.getsize(glb)
res["windows"] = {s: sum(1 for n in names if obs["POD_" + n].get("window") == s) for s in ("closed", "open", "half")}

by = {p["name"]: p for p in pods_t}
pod, body, hang, br = {}, {}, {}, {}
for n in names:
    z = by[n]["z"]
    grp = [obs["POD_" + n], obs["SHUTTER_" + n], obs["ACCENT_" + n]]
    pod[n] = Geo(grp)                                                           # dwelling with its spring
    body[n] = Geo(grp, lambda vs, z=z: max(v.z for v in vs) < z + 5.35)          # the room alone
    hang[n] = Geo([obs["HANGER_" + n]])
    br[n] = Geo([obs["BRIDGE_" + n]])
    need(max(v.z for v in body[n].v) - min(v.z for v in body[n].v) <= 5.36, "room height " + n)
ext = [(obs["POD_INNER_01"].matrix_world.inverted() @ v) for v in body["INNER_01"].v]
res["pod_envelope_m"] = [round(max(v[k] for v in ext) - min(v[k] for v in ext), 3) for k in range(3)]

gaps = sorted((round(body[a].gap(body[b]), 3), a, b) for i, a in enumerate(names) for b in names[i + 1:] if body[a].near(body[b], 4))
res["pod_gap_min"] = gaps[:5]
res["pods_with_neighbour_1_to_2_m"] = len({n for g, a, b in gaps if 1 <= g <= 2 for n in (a, b)})
need(gaps[0][0] >= 1.0, "pod gap %s" % (gaps[0],))
pg = sorted((round(pod[a].gap(pod[b]), 3), a, b) for i, a in enumerate(names) for b in names[i + 1:] if pod[a].near(pod[b], 4))
res["pod_with_spring_gap_min"] = pg[:3]
need(pg[0][0] >= .5, "spring/pod gap %s" % (pg[0],))
hb = sorted((round(min(hang[a].gap(br[b]), pod[a].gap(br[b])), 3), a, b) for a in names for b in names if a != b and (hang[a].near(br[b], 1.5) or pod[a].near(br[b], 1.5)))
res["bridge_to_other_dwellings_min"] = hb[:5]
need(hb[0][0] > .05, "bridge fouls a dwelling, spring or rod: %s" % (hb[0],))
rb = sorted((round(hang[a].gap(br[b]), 3), a, b) for a in names for b in names if hang[a].near(br[b], 1.5))
res["rod_to_bridge_min"] = rb[:5]
need(rb[0][0] > .05, "rod through a bridge: %s" % (rb[0],))
hp = sorted((round(hang[a].gap(pod[b]), 3), a, b) for a in names for b in names if a != b and hang[a].near(pod[b], 3))
res["rod_to_other_pod_min"] = hp[:3]
need(not hp or hp[0][0] > .3, "rod through a pod: %s" % (hp[:1],))
bb = sorted((round(br[a].gap(br[b], 1.5), 3), a, b) for i, a in enumerate(names) for b in names[i + 1:] if br[a].near(br[b], 1.5))
res["bridge_to_bridge_min"] = bb[:5]
need(bb[0][0] > .05, "bridges cross: %s" % (bb[0],))
core = Geo([obs["CORE_STRUCTURE"], obs["CORE_TUBES"], obs["CORE_LEGS"]])
res["bridge_start_to_core_max"] = max(round(br[n].gap(core), 3) for n in names)
need(res["bridge_start_to_core_max"] < .12, "a bridge does not reach the core")
need(all(not br[n].t.overlap(Geo([obs["CORE_LEGS"]]).t) for n in names), "a bridge crosses a leg")

door = {}
for n in names:
    mw = obs["POD_" + n].matrix_world
    inv = mw.inverted()
    loc = [inv @ v for v in br[n].v]                                             # bridge in the pod's own frame
    end = [v for v in loc if v.y > -2.75 and abs(v.x) < .7 and .2 < v.z < .5]
    gap = -2.70 - max(v.y for v in end)
    cx = (max(v.x for v in end) + min(v.x for v in end)) / 2
    down = br[n].t.ray_cast(mw @ Vector((0, -3.3, 1.0)), Vector((0, 0, -1)), 2)   # deck just outside the joint
    sill = body[n].t.ray_cast(mw @ Vector((0, -2.55, 1.0)), Vector((0, 0, -1)), 2)  # threshold inside the portal
    step = None if down[0] is None or sill[0] is None else round(down[0].z - sill[0].z, 3)
    d = (mw.to_3x3() @ Vector((0, 1, 0))).normalized()
    free = []
    for x in (-.40, 0, .40):
        for z in (.75, 1.5, 2.2):
            o = mw @ Vector((x, -3.4, z))
            h1, h2 = br[n].t.ray_cast(o, d, 1.1)[0], body[n].t.ray_cast(o, d, 1.1)[0]
            free.append(h1 is None and h2 is None)
    ok = abs(gap) < .02 and abs(cx) < .02 and step is not None and abs(step) < .02 and all(free)
    door[n] = {"gap": round(gap, 4), "sideways": round(cx, 4), "step": step, "clear": all(free), "ok": ok}
res["doors_ok"] = sum(1 for v in door.values() if v["ok"])
res["door_gap_max"] = max(abs(v["gap"]) for v in door.values())
res["door_step_max"] = max(abs(v["step"]) for v in door.values() if v["step"] is not None)
bad = {k: v for k, v in door.items() if not v["ok"]}
need(not bad, "doors %s" % list(bad.items())[:3])

chain = 0
for n in names:
    arm = Geo([obs["ARM_" + n]])
    if hang[n].t.overlap(arm.t) and hang[n].t.overlap(pod[n].t):
        chain += 1
res["arm_rod_spring_connected"] = chain
need(chain == 48, "broken hanger chain (%d of 48)" % chain)
# --- v2 ---------------------------------------------------------------------------------------------------------------
mats = {m.name for o in meshes for m in o.data.materials if m}
FIGURE = ("skin", "cloth_")                                                     # materials only the library's people use
res["figure_materials"] = sorted(m for m in mats if any(k in m for k in FIGURE))
res["figure_nodes"] = sorted(n for n in obs if any(k in n.lower() for k in ("person", "people", "resident", "human", "figure")))
src = "".join(open(os.path.join(HERE, f), encoding="utf-8").read() for f in ("build_suspended_pod_tower.py", "parts.py"))
res["figure_calls_in_builder"] = sum(src.count("M." + k + "(") for k in ("person", "seated_person"))
need(not res["figure_materials"] and not res["figure_nodes"] and not res["figure_calls_in_builder"], "human figures left")


def accent_mat(n):
    return obs["ACCENT_" + n].data.materials[0].name


res["accents"] = {}
for n in names:
    m, want = accent_mat(n), obs["POD_" + n]["accent"]
    need({"white": "accent_white", "blue": "accent_mist_blue", "sage": "accent_sage", "sand": "accent_sand"}[want] in m, "accent " + n)
    res["accents"][want] = res["accents"].get(want, 0) + 1
need(len(res["accents"]) == 4, "accents %s" % res["accents"])


def base_hex(key):
    m = next(m for m in bpy.data.materials if m.name.startswith("q04a_" + key))
    c = next(x for x in m.node_tree.nodes if x.type == "BSDF_PRINCIPLED").inputs["Base Color"].default_value
    return "".join("%02X" % round(255 * (1.055 * v ** (1 / 2.4) - .055 if v > .0031308 else 12.92 * v)) for v in c[:3])


res["finishes"] = {k: base_hex(k) for k in ("acoustic_wedge", "window_titanium", "seal_strip", "spring_steel", "accent_mist_blue", "accent_sage", "accent_sand", "accent_white")}
KINDS = ("BED", "DESK", "CHAIR", "CABINET", "LAMP", "BOOK", "SHELF", "PLANT")
res["furniture_meshes"] = {k: len({o.data.name for o in meshes if o.name.startswith(k + "_")}) for k in KINDS}
res["furniture_objects"] = {k: sum(1 for o in meshes if o.name.startswith(k + "_")) for k in KINDS}
need(all(v == 1 for v in res["furniture_meshes"].values()), "furniture meshes not shared")
need(not any(k + "_" + n in obs for n in names for k in KINDS + ("ROOM",) if obs["POD_" + n]["window"] == "closed"), "closed window with a room")

fit = []
for n in names:
    inv = obs["POD_" + n].matrix_world.inverted()
    bx = {}
    for k in KINDS:
        if k + "_" + n in obs:
            o = obs[k + "_" + n]
            q = [inv @ o.matrix_world @ v.co for v in o.data.vertices]
            bx[k] = [(min(v[i] for v in q), max(v[i] for v in q)) for i in range(3)]
    for k, b in bx.items():
        if b[0][0] < .475 and b[0][1] > -.475 and b[1][0] < -.6:                  # 0.95 m wide, 1.3 m deep inside the door
            fit.append((n, k, "blocks the door"))
        if b[0][0] < -2.0 or b[0][1] > 2.0 or b[1][0] < -1.88 or b[1][1] > 1.70 or b[2][0] < .349:
            fit.append((n, k, "through a wall"))
    for k, j in (("BED", "DESK"), ("BED", "CABINET"), ("BED", "CHAIR"), ("DESK", "CABINET"), ("CHAIR", "CABINET"), ("BED", "SHELF")):
        if k in bx and j in bx and all(bx[k][i][0] < bx[j][i][1] - .005 and bx[j][i][0] < bx[k][i][1] - .005 for i in range(3)):
            fit.append((n, k, "overlaps " + j))
    if "DESK" in bx:
        need(bx["DESK"][2][1] < 1.10, "desk above the sill " + n)
res["furniture_fit_problems"] = fit[:6]
need(not fit, "furniture fit %s" % fit[:3])


def glass(o, p):
    return "glass" in o.data.materials[p.material_index].name


def sight(n, eye):
    """Share of each furniture piece's faces seen from eye with only glass in between (the dwelling's own parts block)."""
    own = [obs[k + "_" + n] for k in ("POD", "SHUTTER", "ACCENT", "ROOM") + KINDS if k + "_" + n in obs]
    vs, fs, tag = [], [], []
    for o in own:
        b = len(vs)
        vs += [o.matrix_world @ q.co for q in o.data.vertices]
        for p in o.data.polygons:
            if not glass(o, p):
                fs.append([b + i for i in p.vertices])
                tag.append(o.name.split("_")[0])
    t = BVHTree.FromPolygons(vs, fs)
    seen = {}
    for i, f in enumerate(fs):
        if tag[i] in KINDS:
            c = sum((vs[j] for j in f), Vector()) / len(f)
            h = t.ray_cast(eye, (c - eye).normalized(), (c - eye).length + .5)
            s = seen.setdefault(tag[i], [0, 0])
            s[1] += 1
            s[0] += h[2] is not None and tag[h[2]] == tag[i] and h[3] > (c - eye).length - .25
    return {k: round(a / b, 3) for k, (a, b) in seen.items()}


res["through_window"], bad_sight = {}, []
MUST = {"desk": ("BED", "DESK", "CHAIR", "LAMP"), "bed": ("BED", "BOOK", "DESK", "CHAIR"), "plant": ("BED", "PLANT")}
for n in names:
    pd = obs["POD_" + n]
    if pd["window"] != "open":
        continue
    side = 1 if math.remainder(by[n]["angle"] + 45, 360) < 0 else -1               # the side its room is laid out for
    eye = pd.matrix_world @ Vector((-side * 2.25, 6.6, 3.9))
    s = sight(n, eye)
    res["through_window"][n + " " + pd["layout"]] = s
    bad_sight += [(n, k) for k in MUST[pd["layout"]] if s.get(k, 0) <= 0]
need(not bad_sight, "furniture not visible %s" % bad_sight[:4])
main_eye = Vector((60 * math.cos(math.radians(-45)), 60 * math.sin(math.radians(-45)), 56))
res["from_main_view"] = {n: sight(n, main_eye) for n in ("OUTER_17", "OUTER_20")}

before = {o.name for o in bpy.data.objects}
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, "q04a-suspended-pod-tower.glb"))
bpy.context.view_layer.update()
v1 = [o for o in bpy.data.objects if o.name not in before]


def sig(objs, pre):
    return sorted((o.name.split(".")[0], len(o.data.vertices), tuple(round(c, 3) for v in o.bound_box for c in o.matrix_world @ Vector(v)))
                  for o in objs if o.type == "MESH" and o.name.startswith(pre))


same = {k: sig(v1, k) == sig([obs[n] for n in before], k) for k in ("PLAZA", "TREE", "ARM", "HANGER", "BRIDGE", "CROWN", "CORE")}
same["POD positions"] = all((next(o for o in v1 if o.name.split(".")[0] == "POD_" + n).matrix_world.translation - obs["POD_" + n].matrix_world.translation).length < 1e-4 for n in names)
res["unchanged_from_v1"] = same
need(all(same.values()), "changed from v1: %s" % same)
res["result"] = "PASS" if not fail else "FAIL"
res["failures"] = fail
with open(os.path.join(HERE, "check-v2.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(res, f, indent=1)
print("CHECK", json.dumps(res, indent=1))
if fail:
    sys.exit(1)
