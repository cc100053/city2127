"""Gardens, trees and the placing of houses on the twenty platforms (platform-local frame, see parts.py)."""
import math
import random

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

import houses as H
import layout as LY
import parts as P
from parts import Accs, G, K, M, box, ribbon

LEAF = {"wood": "bark", "leaf_l": "leaf_a", "green": "leaf_b", "leaf_c": "leaf_c"}


def leaf_ctx(a, rng):
    return M.Ctx({r: K.Three(a[LEAF.get(r, "in_" + r)]) for r in M.ROLES}, rng)


def tree(seed, h, crown):
    """Broadleaf in the three greens: library limbs, loose lobes and a skin of leaf cards so the edge breaks up."""
    a, rng = Accs(), random.Random(seed)
    M.leafy_tree(leaf_ctx(a, rng), (0, 0, 0), h=h, crown=crown * .95, trunk="wood", roles=("leaf_l", "green"), core=None, n=40, size=.34, branches=5)
    for i in range(13):
        t, rr = i * 2.4 + rng.uniform(-.3, .3), 0 if i == 0 else crown * rng.uniform(.30, .74)
        c = (rr * math.cos(t), h * (.88 if i == 0 else rng.uniform(.58, .86) - .10 * (rr / crown) ** 2), rr * math.sin(t))
        q = crown * rng.uniform(.24, .36)
        G.blob(K.Three(a[("leaf_b", "leaf_c")[i % 2]]), c, (q * .66, q * .52, q * .66), sub=1, seed=seed * 7 + i, noise=.30, flat=.8)
        M.leaf_clump(leaf_ctx(a, rng), c, (q * 1.45, q * 1.2, q * 1.45), ("leaf_l", "green", "leaf_l"), None, 84, .36 * (h / 6) ** .5, .25, 1)
    return a


def blob(a, role, x, y, z, r, rng, flat=.75):
    G.blob(K.Three(a[role], x, y, z), (0, 0, 0), (r, r * flat, r * rng.uniform(.85, 1.15)), sub=1, seed=rng.uniform(0, 99), noise=.22, flat=.6)


class Kit:
    def __init__(self, mesh, fixed):
        self.mesh, self.fixed = mesh, [(m, tree_of(m, Matrix())) for m in fixed]     # fixed: world meshes trees must clear
        rng = random.Random(41)
        self.house = {}
        for kind in H.SIZE:
            a = H.build(kind, rng)
            self.house[kind, 1] = mesh("q04b_house_" + kind, a)
            if kind not in ("main",):
                self.house[kind, -1] = mesh("q04b_house_%s_m" % kind, P.mirrored(a))
        self.big = [mesh("q04b_tree_big_%d" % i, tree(11 + i, 6.0, 2.5), smooth_deg=180) for i in range(2)]
        self.mid = [mesh("q04b_tree_mid_%d" % i, tree(31 + i, 4.1, 1.7), smooth_deg=180) for i in range(2)]

    # --- one household -----------------------------------------------------------------------------------------------------
    def place(self, p, home, spot, hm, add):
        n = "%02d" % p["no"]
        hu, hv, ang, hand = spot
        w, d = H.SIZE[p["kind"]]
        add("HOUSE_" + n, self.house[p["kind"], hand], home, hm)
        ca, sa = math.cos(ang), math.sin(ang)

        def at(x, y):                                                              # house-local -> platform-local
            x *= hand
            return hu + x * ca - y * sa, hv + x * sa + y * ca

        def local(u, v):
            du, dv = u - hu, v - hv
            return (du * ca + dv * sa) * hand, -du * sa + dv * ca
        rng = random.Random(p["no"] * 17)
        a = Accs()
        near = p["kind"] in ("main", "second")
        # entrance path from the bridge to the door
        door = at(-w / 2 + .02, H.DOOR_Y)
        turn = at(-w / 2 - 1.25, H.DOOR_Y)
        path = [(-p["L"] / 2 + .31, 0.0), (-p["L"] / 2 + 1.7, 0.0), turn, door]
        fine = []
        for q, r in zip(path, path[1:]):
            k = max(1, int(math.dist(q, r) / .5))
            fine += [(q[0] + (r[0] - q[0]) * i / k, q[1] + (r[1] - q[1]) * i / k) for i in range(k)]
        fine.append(path[-1])
        for _ in range(4):
            fine = fine[:1] + [((fine[i - 1][0] + 2 * fine[i][0] + fine[i + 1][0]) / 4, (fine[i - 1][1] + 2 * fine[i][1] + fine[i + 1][1]) / 4) for i in range(1, len(fine) - 1)] + fine[-1:]
        ribbon(a["paving"], fine, -.72, .72, -.02, P.FLOOR)
        # terrace in front of the living room
        td = 1.45 if p["kind"] == "main" else 1.5
        tx0, tx1 = {"main": (-3.7, 4.7), "second": (-3.2, 3.9)}.get(p["kind"], (-w * .42, w * .46))
        c = [at(x, y) for x, y in ((tx0, -d / 2 - td), (tx1, -d / 2 - td), (tx1, -d / 2 + .12), (tx0, -d / 2 + .12))]
        P.loft(a["wood"], [[(*q, z) for q in c] for z in (-.02, P.FLOOR)])
        for i in range(1, 6 if near else 1):                                        # board joints
            y = -d / 2 - td * i / 6
            q, r = at(tx0, y), at(tx1, y)
            ribbon(a["soffit"], [q, r], -.012, .012, P.FLOOR - .002, P.FLOOR + .003)
        set_at = None
        if near or p["no"] % 2 == 0:
            set_at = at({"main": -1.6, "second": -1.5}.get(p["kind"], w * .20), -d / 2 - (2.35 if near else .85))
            M.kit_prop(K.ctx(a, rng, *set_at, .02 if near else P.FLOOR, ang), "cafe_set", 0, 0, 0)
        if p["kind"] == "main":                                                     # stepping stones over the lawn, toward the corner
            for i in range(6):
                s = at(3.3 + .18 * i, -d / 2 - td - .45 - .62 * i)
                K.slab(a["paving"], s[0] - .5, s[0] + .5, s[1] - .2, s[1] + .2, 0, .055, .05, .015)
        clear = []                                                                   # keep-out tests for planting

        def free(u, v, r):
            x, y = local(u, v)
            if abs(x) < w / 2 + r and abs(y) < d / 2 + r:
                return False
            if tx0 - r * .4 < x < tx1 + r * .4 and -d / 2 - td - r * .5 < y < 0:
                return False
            if min(math.dist((u, v), q) for q in fine) < .85 + r:
                return False
            if set_at and math.dist((u, v), set_at) < 1.0 + r:
                return False
            return all(math.dist((u, v), (cu, cv)) > cr + r for cu, cv, cr in clear)
        # planted edge: soil band with shrubs and flowers, lower in front of the lawn
        g = P.gate_t(p, 1.3)
        band = P.arc_points(p, .85, .8, math.pi + g, 3 * math.pi - g)
        ribbon(a["soil"], [(u, v) for u, v, _ in band], -.40, .40, -.02, .05)
        step = .82 if near else 1.12
        front = p["f"]
        for u, v, t in P.arc_points(p, .85, step, math.pi + g, 3 * math.pi - g):
            at_front = v * front > p["W"] * .22
            r = rng.uniform(.34, .50) if at_front else rng.uniform(.48, .78)
            if not free(u, v, r * 1.15 + .15):
                r = .30
                if not free(u, v, .55):
                    continue
            q = (u + rng.uniform(-.15, .15), v + rng.uniform(-.15, .15))
            blob(a, rng.choice(("leaf_a", "leaf_b", "leaf_b", "leaf_c")), *q, r * .35, r, rng)
            if rng.random() < (.62 if near else .38):
                col = rng.choice(("flower_p", "flower_p", "flower_w", "flower_y"))
                for _ in range(3 if near else 1):
                    blob(a, col, q[0] + rng.uniform(-.4, .4), q[1] + rng.uniform(-.4, .4), r * .75, rng.uniform(.12, .20), rng)
            if near and at_front:                                                   # a second, lower row toward the lawn
                du = 1 - .85 / (p["W"] / 2)
                q2 = (u * du, v * du)
                if free(*q2, .2) and rng.random() < .9:
                    blob(a, rng.choice(("leaf_a", "leaf_b", "flower_w")), *q2, .08, rng.uniform(.2, .3), rng)
        add("GARDEN_" + n, self.mesh("q04b_garden_" + n, a), home)
        # trees at the corners of the plot: moved along the edge, or taken smaller, until the crown clears the house, the
        # limbs, the bridges and the platforms above
        want = {"main": [(6.9, -.4, "big"), (-6.4, -2.7, "mid"), (6.6, 3.2, "mid"), (-6.4, 3.4, "mid")],
                "second": [(5.8, .5, "big"), (-5.0, 3.4, "mid"), (4.8, -3.6, "mid"), (3.6, 4.6, "mid")]}.get(p["kind"])
        if want is None:
            s = -p["f"]
            want = [(p["L"] / 2 - 1.8, s * 1.0, "big"), (-p["L"] / 2 + 2.6, s * (p["W"] / 2 - 2.6), "mid"), (p["L"] / 2 - 2.2, -s * 2.8, "mid"), (-p["L"] / 2 + 2.4, -s * 2.6, "mid")]
        hw_ = home.matrix_local
        block = [tree_of(self.house[p["kind"], hand], hw_ @ hm)] + [b for m, b in self.fixed]
        walk = P.Acc()                                                               # head room over the entrance path and the bridge mouth
        (bx, by) = fine[0]
        ribbon(walk, [(bx - 3.0, by)] + fine, -.62, .62, .25, 2.25)
        block.append(BVHTree.FromPolygons([hw_ @ Vector(q) for q in walk.v], walk.f))
        above = [q for q in LY.platforms() if q["z"] == p["z"] + 8.0]
        k = 0
        for i, (u, v, size) in enumerate(want):
            t0 = math.atan2(v / (p["W"] / 2), u / (p["L"] / 2))
            found = None
            for scale in ((1.0, .88) if size == "big" else (1.0, .88, .76, .64, .54)):
                for shift in (0, .12, -.12, .24, -.24, .38, -.38, .55, -.55):
                    for inset in (1.15, .85):
                        uu, vv = LY.egg_local(p, t0 + shift, inset) if shift or inset < 1 else (u, v)
                        if not inside(p, uu, vv, .7) or not free(uu, vv, .28):
                            continue
                        wx, wy = LY.to_world(p, uu, vv)
                        h, crown = (6.6, 2.7) if size == "big" else (4.6, 1.9)
                        if any(LY.egg_gap(q, wx, wy) < crown * scale + .3 for q in above) and h * scale > 6.0 - .35:
                            continue
                        me = (self.big if size == "big" else self.mid)[(p["no"] + k) % 2]
                        ml = Matrix.Translation((uu, vv, .02)) @ Matrix.Rotation(rng.uniform(0, 6.28), 4, "Z") @ Matrix.Scale(scale, 4)
                        bt = tree_of(me, hw_ @ ml)
                        if any(bt.overlap(q) for q in block):
                            continue
                        found = (uu, vv, me, ml)
                        break
                    if found:
                        break
                if found:
                    break
            if found:
                uu, vv, me, ml = found
                clear.append((uu, vv, .9))
                add("TREE_%s_%d" % (n, k + 1), me, home, ml)
                k += 1

    # --- plaza and preview trees -----------------------------------------------------------------------------------------------
    def ground(self, plats, add, prev):
        rng = random.Random(5)
        a = Accs()
        i = 0
        for d, hw in P.PLANTERS:
            for q in (-hw * .55, hw * .55):
                t = math.radians(d + q)
                for s in (.85, .7, .58, .46):                                        # as tall as the limbs above allow
                    mw = Matrix.Translation((9.75 * math.cos(t), 9.75 * math.sin(t), .44)) @ Matrix.Rotation(rng.uniform(0, 6), 4, "Z") @ Matrix.Scale(s, 4)
                    if not any(tree_of(self.mid[i % 2], mw).overlap(b) for _, b in self.fixed):
                        add("PLAZA_TREE_%02d" % (i + 1), self.mid[i % 2], mw)
                        i += 1
                        break
            for q in range(-hw + 3, hw - 2, 4):
                t = math.radians(d + q)
                blob(a, rng.choice(("leaf_a", "leaf_b", "leaf_c", "flower_p", "flower_w")), 9.75 * math.cos(t) + rng.uniform(-.5, .5), 9.75 * math.sin(t) + rng.uniform(-.5, .5), .55, rng.uniform(.3, .5), rng)
        add("PLAZA_PLANTING", self.mesh("q04b_plaza_planting", a), Matrix())
        n = 0
        while n < 190:                                                              # park around, preview only
            x, y = rng.uniform(-44, 120), rng.uniform(-60, 58)
            r, t = math.hypot(x, y), math.degrees(math.atan2(y, x)) % 360
            shore = -50 + max(0, (y + 60)) * .06 if y < 0 else -44 + y * .55
            if r < 22.5 or 32.5 < r < 39.5 or (abs(x) < 6 and y < 0) or x < shore + 8 or y > 34 + min(10, max(0, x) * .1):
                continue
            if any(abs((t - q + 180) % 360 - 180) * r * .0175 < 3.5 and r < 36 for q in (210, 330, 20, 160)):
                continue
            if y < -30 and abs(x) < 24 and rng.random() < .8:
                continue
            s = rng.uniform(.85, 1.15) if y > -30 else rng.uniform(.6, .75)
            if y < -44 and abs(x) < 34:
                continue
            o = bpy.data.objects.new("PV_Tree_%03d" % n, (self.big if rng.random() < .5 else self.mid)[n % 2])
            o.location = (x, y, -.15)
            o.rotation_euler = (0, 0, rng.uniform(0, 6.28))
            o.scale = (s,) * 3
            prev.objects.link(o)
            n += 1


def tree_of(me, mw):
    """Collision tree of a mesh placed at mw."""
    return BVHTree.FromPolygons([mw @ q.co for q in me.vertices], [tuple(f.vertices) for f in me.polygons])


def inside(p, u, v, inset):
    a, b = p["L"] / 2 - inset, (p["W"] / 2 - inset) * (1 + LY.EGG * max(-1, min(1, u / (p["L"] / 2))))
    return (u / a) ** 2 + (v / b) ** 2 < 1


def near_house(q, w, d):
    return math.hypot(max(abs(q[0]) - w / 2, 0), max(abs(q[1]) - d / 2, 0))
