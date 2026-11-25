"""Q04-B sky village: the twenty platforms (design section 2), and the solved branches (section 3) and bridges (section 5).

Blender coordinates (z up, sea +y, main camera at -y looking +y), real metres, core centre at the origin. No bpy here.
  blender -b --factory-startup --python-exit-code 1 -P layout.py      solves and writes layout.json
A platform is an egg: local u runs from the narrow end (bridge) to the wide end (lawn), v is u turned 90 deg left; the
lawn and the house's big window face f * v (f = +-1).
"""
import heapq
import itertools
import json
import math
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
LEVELS = (9.0, 17.0, 25.0, 33.0, 41.0)
# no, x, y (design table), phi = direction of the wide end (deg), f, length, width, house type
TABLE = [
    (1, -18, -11, 184, 1, 16.0, 12.5, "second"), (2, 7, 19, 72, -1, 13.5, 11.0, "gable"), (3, 25, 7, 14, -1, 14.0, 11.0, "ridge"),
    (4, -24, 12, 152, 1, 14.0, 11.0, "gable2"),
    (5, 19, -15, -4, -1, 18.0, 13.0, "main"), (6, -28, -2, 196, 1, 13.5, 10.5, "gable"), (7, -9, 23, 113, 1, 13.5, 11.0, "terrace"),
    (8, 29, 11, 44, -1, 13.5, 10.5, "ridge"),
    (9, -24, -10, 204, 1, 13.5, 10.5, "ridge"), (10, 15, 15, 47, -1, 15.0, 12.0, "gable2"), (11, 30, -1, -4, -1, 14.0, 11.0, "gable"),
    (12, -16, 25, 125, 1, 13.5, 11.0, "terrace"),
    (13, -30, 6, 170, 1, 13.5, 10.5, "gable"), (14, -12, -7, 208, 1, 13.0, 10.0, "ridge"), (15, 22, 3, 10, -1, 14.0, 11.0, "terrace"),
    (16, 6, 25, 78, -1, 13.5, 10.5, "gable"),
    (17, -19, 6, 160, 1, 14.0, 11.0, "gable2"), (18, 5, 13, 66, -1, 13.0, 10.0, "ridge"), (19, 20, -5, -16, -1, 14.0, 11.0, "terrace"),
    (20, -4, -9, 222, 1, 13.0, 10.0, "gable"),
]
MOVED = {                                 # small shifts the design allows (section 2), each for the reason given
    3: (23, 4.5), 8: (31.5, 13.5),        # 08 stood right over 03: no room for its branch
    7: (-7, 23.5), 12: (-19, 27),         # 12 stood right over 07
    14: (-15, -4.5), 20: (-8, -12),       # 20 stood over 14 and in front of the lift tower from the main view
}
EGG = .16                                 # how much wider the wide end is
BELLY = {"main": 2.0, "second": 1.8}      # depth under the middle of the platform, others 1.5
RIM = .42
CORE = (-2.5, 2.5, -3.6, 3.1)             # lift, lobby and stair
EXITS = {"WF": (-2.5, -.15, 180), "WB": (-2.5, 2.15, 180), "EF": (2.5, -.15, 0), "EB": (2.5, 2.15, 0)}
DECK_HW = .85                             # 1.5 m clear + rails
BAND = (-.75, 2.35)


def platforms():
    out = []
    for no, x, y, phi, f, ln, w, kind in TABLE:
        x, y = MOVED.get(no, (x, y))
        out.append({"no": no, "x": float(x), "y": float(y), "z": LEVELS[(no - 1) // 4], "phi": float(phi), "f": f, "L": ln, "W": w, "kind": kind,
                    "belly": BELLY.get(kind, 1.5)})
    return out


def axes(p):
    a = math.radians(p["phi"])
    return (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))


def to_world(p, u, v):
    (ux, uy), (vx, vy) = axes(p)
    return p["x"] + u * ux + v * vx, p["y"] + u * uy + v * vy


def egg_local(p, t, inset=0.0):
    """Point on the platform outline at parameter t, moved in by inset (approximate, along the centre line)."""
    a, b = p["L"] / 2 - inset, p["W"] / 2 - inset
    return a * math.cos(t), b * math.sin(t) * (1 + EGG * math.cos(t))


def egg_level(p, x, y):
    """Implicit value of the egg at world points: < 1 inside. A distance to the edge is about (value - 1) * half width."""
    (ux, uy), (vx, vy) = axes(p)
    dx, dy = np.asarray(x) - p["x"], np.asarray(y) - p["y"]
    u, v = (dx * ux + dy * uy) / (p["L"] / 2), dx * vx + dy * vy
    b = p["W"] / 2 * (1 + EGG * np.clip(u, -1, 1))
    return np.sqrt(u * u + (v / b) ** 2)


def egg_gap(p, x, y):
    """Approximate distance outside the egg (negative inside)."""
    return (egg_level(p, x, y) - 1) * min(p["L"], p["W"]) / 2


# --- trunks -----------------------------------------------------------------------------------------------------------
TRUNKS = ((-1, -1), (1, -1), (0, 1))


def trunk_xy(t, z):
    e = math.exp(-z / 3.2)
    if t < 2:
        return TRUNKS[t][0] * (4.85 + 2.6 * e + .42 * math.sin(z / 6.5 + t)), -(3.95 + 2.0 * e + .30 * math.sin(z / 8.0))
    return .5 * math.sin(z / 7.0), 6.5 + 2.6 * e


def trunk_r(z):
    return 1.95 + .50 * math.exp(-z / 1.6) - .038 * z


# --- branches ----------------------------------------------------------------------------------------------------------
NS = 44


def radii(p, s):
    """Branch radius along s 0..1 (before the belly flares out)."""
    k = {"main": 1.45, "second": 1.2}.get(p["kind"], 1.0)
    return k * (.68 + .62 * (1 - s) ** 2.2)


def curve(p0, p1, p2, p3, n=NS):
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3


Z0_LIMIT = {5: (3.5, 7.5), 1: (2.6, 4.5)}                                       # the two front limbs start at the roots, as in the image


def branch_candidates(p):
    """Cubic limbs from a trunk to a point under the platform, cheapest (short, smooth) first."""
    rr = math.hypot(p["x"], p["y"])
    hx, hy = p["x"] / rr, p["y"] / rr
    out = []
    lo, hi = Z0_LIMIT.get(p["no"], (2.6, 34.0))
    for off, lat in ((1.2, 0), (2.6, 0), (1.0, 2.2), (1.0, -2.2), (-1.5, 0)):
        foot = np.array([p["x"] - hx * off - hy * lat, p["y"] - hy * off + hx * lat, p["z"] - p["belly"] - 1.0])
        for t in range(3):
            for drop in (3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 10, 11.5, 13):
                z0 = p["z"] - p["belly"] - drop
                if z0 < lo or z0 > hi:
                    continue
                x, y = trunk_xy(t, z0)
                p0 = np.array([x, y, z0])
                d = np.array([foot[0] - x, foot[1] - y])
                ln = float(np.hypot(*d))
                d = d / ln
                trunk_out = np.array([x, y]) / math.hypot(x, y)
                for mix in (.0, .35, .7):
                    q = d * (1 - mix) + trunk_out * mix
                    q = q / np.hypot(*q)
                    for k in (.35, .55):
                        for up in (.05, .35, .7):
                            for b in (2.2, 3.6, 5.2):
                                p1 = p0 + np.array([q[0] * ln * k, q[1] * ln * k, up * ln * k * .6])
                                p2 = foot - np.array([hx * .8, hy * .8, b])
                                c = curve(p0, p1, p2, foot)
                                bend = float(np.sum(np.abs(np.diff(c, 2, axis=0))))
                                length = float(np.sum(np.linalg.norm(np.diff(c, axis=0), axis=1)))
                                out.append((length + 6 * bend + 2 * abs(lat) + 1.5 * abs(off - 1.2), t, z0, c))
    out.sort(key=lambda q: q[0])
    return out


def branch_clear(p, c, plats, done, heads, ways=()):
    s = np.linspace(0, 1, len(c))
    r = np.array([radii(p, q) for q in s])
    x, y, z = c[:, 0], c[:, 1], c[:, 2]
    # lift, lobby and the view of the glass tower from the front
    if np.any((np.abs(x) < 2.9 + r) & (y > -4.2 - r) & (y < 3.5 + r) & (s > .12)):
        return False
    if np.any((np.abs(x) < 2.6 + r) & (y < -3.6) & (s > .1)):
        return False
    for q in plats:
        if q["no"] == p["no"]:
            continue
        g = egg_gap(q, x, y)
        hit = (g < r + .45) & (z > q["z"] - q["belly"] * np.clip(1 - .5 * (g + 5) / 5, .3, 1) - .6 - r) & (z < q["z"] + heads[q["no"]] + r)
        if np.any(hit):
            return False
    for cc, rr, tt, pp in done:
        d = np.linalg.norm(c[:, None, :] - cc[None, :, :], axis=2) - r[:, None] - rr[None, :]
        far = np.ones_like(d, bool)
        far[: int(len(c) * .35), :] = False                                     # limbs may grow out of one another near the trunk
        far[:, : int(len(cc) * .35)] = False
        if np.any(d[far] < .25):
            return False
    for lv in LEVELS:                                                            # leave the mouths of the bridges open
        mouth = (np.abs(x) > 2.3) & (np.abs(x) < 6.5) & (y > -1.4 - r) & (y < 3.4 + r) & (z > lv - .9 - r) & (z < lv + 2.4 + r)
        if np.any(mouth):
            return False
    for deck, pts in ways:                                                       # bridge corridors
        m = (z > deck + BAND[0] - r) & (z < deck + BAND[1] + r)
        if np.any(m):
            dd = np.min(np.hypot(x[m][:, None] - pts[None, :, 0], y[m][:, None] - pts[None, :, 1]), axis=1)
            if np.any(dd < r[m] + DECK_HW + .2):
                return False
    for t in range(3):                                                          # other trunks
        tx = np.array([trunk_xy(t, max(q, 0)) for q in z])
        dd = np.hypot(x - tx[:, 0], y - tx[:, 1]) - r - np.array([trunk_r(q) for q in z])
        if np.any((dd < .3) & (s > .45) & (z < 34)):
            return False
    return True


HEAD = {"main": 8.2, "second": 7.6, "gable2": 7.2, "terrace": 7.0, "ridge": 5.6, "gable": 5.4}


def solve_branches(plats, ways=(), verbose=False):
    heads = {p["no"]: HEAD[p["kind"]] for p in plats}
    best = None
    order = [5, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    by = {p["no"]: p for p in plats}
    cands = {n: branch_candidates(by[n]) for n in by}
    for _ in range(14):
        done, res, fail = [], {}, []
        for n in order:
            p = by[n]
            hit = next((q for q in cands[n] if branch_clear(p, q[3], plats, done, heads, ways)), None)
            if hit is None:
                fail.append(n)
                continue
            rr = np.array([radii(p, s) for s in np.linspace(0, 1, NS)])
            done.append((hit[3], rr, hit[1], p))
            res[n] = {"trunk": hit[1], "z0": hit[2], "cost": hit[0], "path": hit[3].round(4).tolist()}
        if verbose:
            print("BRANCHES failed", fail, flush=True)
        if best is None or len(fail) < len(best[1]):
            best = (res, fail)
        if not fail:
            break
        order = [n for n in order[:2] if n not in fail] + fail + [n for n in order[2:] if n not in fail]
    return best


# --- bridges ---------------------------------------------------------------------------------------------------------
STEP = .3
NX, NY = int(40 / STEP), int(38 / STEP)
GX, GY = np.meshgrid(np.arange(-NX, NX + 1) * STEP, np.arange(-NY, NY + 1) * STEP, indexing="ij")


def blocked_field(deck, target, plats, branches, others):
    """Clear distance from each grid point to whatever a bridge at `deck` must stay out of."""
    d = np.full(GX.shape, 9.0)
    for p in plats:
        g = egg_gap(p, GX, GY)
        if p["no"] == target["no"]:
            continue
        if p["z"] - p["belly"] - 1 < deck + BAND[1] and p["z"] + HEAD[p["kind"]] > deck + BAND[0]:
            d = np.minimum(d, g)
    for n, b in branches.items():
        c = np.array(b["path"])
        p = next(q for q in plats if q["no"] == n)
        r = np.array([radii(p, s) for s in np.linspace(0, 1, len(c))])
        for (x, y, z), rr in zip(c, r):
            if deck + BAND[0] - rr < z < deck + BAND[1] + rr:
                d = np.minimum(d, np.hypot(GX - x, GY - y) - rr)
    for t in range(3):
        if deck < 35:
            for z in (deck - .5, deck + 1, deck + 2.2):
                x, y = trunk_xy(t, z)
                d = np.minimum(d, np.hypot(GX - x, GY - y) - trunk_r(z))
    dx = np.maximum(np.maximum(CORE[0] - GX, GX - CORE[1]), 0)
    dy = np.maximum(np.maximum(CORE[2] - GY, GY - CORE[3]), 0)
    inside = np.minimum(np.maximum(np.maximum(CORE[0] - GX, GX - CORE[1]), np.maximum(CORE[2] - GY, GY - CORE[3])), 0)
    d = np.minimum(d, np.hypot(dx, dy) + inside + DECK_HW - .15)
    for path in others:
        for (x, y) in path:
            d = np.minimum(d, np.hypot(GX - x, GY - y) - DECK_HW)
    return d


def landing(p):
    """Where a bridge meets the platform: the narrow end (2 m inside, and the direction in)."""
    return to_world(p, -p["L"] / 2, 0), to_world(p, -p["L"] / 2 - 1.6, 0)


def cell(q):
    return round(q[0] / STEP) + NX, round(q[1] / STEP) + NY


def route(p, ex, plats, branches, others, clear=.2):
    d = blocked_field(p["z"], p, plats, branches, others)
    own = egg_gap(p, GX, GY)
    free = (d > DECK_HW + clear) & (own > DECK_HW * .4)
    end, pre = landing(p)
    x, y, a = EXITS[ex]
    out = (x + math.cos(math.radians(a)) * 1.6, y)
    s, g = cell(out), cell(pre)
    free[s] = True
    if not free[g]:
        return None
    near = np.clip(1.6 - (d - DECK_HW), 0, 1.6)                                   # keep a little away from obstacles when there is room
    best, came, heap, done = {s: 0.0}, {}, [(0.0, s)], set()
    nb = [(i, j, math.hypot(i, j) * STEP) for i in (-1, 0, 1) for j in (-1, 0, 1) if i or j]
    while heap:
        _, c = heapq.heappop(heap)
        if c in done:
            continue
        done.add(c)
        if c == g:
            break
        for i, j, w in nb:
            q = (c[0] + i, c[1] + j)
            if not (0 <= q[0] <= 2 * NX and 0 <= q[1] <= 2 * NY) or not free[q]:
                continue
            v = best[c] + w * (1 + .25 * near[q])
            if v < best.get(q, 1e9) - 1e-9:
                best[q], came[q] = v, c
                heapq.heappush(heap, (v + math.dist(q, g) * STEP, q))
    if g not in done:
        return None
    cells = [g]
    while cells[-1] in came:
        cells.append(came[cells[-1]])
    pts = [out] + [(float(GX[c]), float(GY[c])) for c in reversed(cells)][1:-1] + [pre]

    def los(a, b):
        n = max(2, int(math.dist(a, b) / .15))
        return all(free[cell((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))] for k in range(n + 1))
    pulled, i = [pts[0]], 0
    while i < len(pts) - 1:
        j = len(pts) - 1
        while j > i + 1 and not los(pts[i], pts[j]):
            j -= 1
        pulled.append(pts[j])
        i = j
    path = [(x, y)] + pulled + [end]
    smooth = path
    for _ in range(3):                                                           # rounded corners (Chaikin), ends kept
        q = [smooth[0]]
        for a, b in zip(smooth, smooth[1:]):
            q += [(a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25), (a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75)]
        smooth = q + [smooth[-1]]
    dense = []
    for a, b in zip(smooth, smooth[1:]):
        n = max(1, int(math.dist(a, b) / .5))
        dense += [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(n)]
    dense.append(smooth[-1])
    return {"exit": ex, "path": [(round(a, 4), round(b, 4)) for a, b in smooth], "dense": dense,
            "length": sum(math.dist(a, b) for a, b in zip(smooth, smooth[1:]))}


def solve_bridges(plats, branches, verbose=False):
    out, failed = {}, []
    for lv in LEVELS:
        four = [p for p in plats if p["z"] == lv]
        solo = {(p["no"], ex): route(p, ex, plats, branches, []) for p in four for ex in EXITS}
        perms = []
        for perm in itertools.permutations(EXITS):
            if all(solo[(p["no"], ex)] for p, ex in zip(four, perm)):
                perms.append((sum(solo[(p["no"], ex)]["length"] for p, ex in zip(four, perm)), perm))
        perms.sort()
        best = None
        for _, perm in perms[:6]:
            for order in itertools.permutations(range(4)):
                got, others = {}, []
                for i in order:
                    r = route(four[i], perm[i], plats, branches, others)
                    if r is None:
                        break
                    got[four[i]["no"]] = r
                    others.append(r["dense"])
                if best is None or len(got) > len(best):
                    best = got
                if len(got) == 4:
                    break
            if best and len(best) == 4:
                break
        best = best or {}
        for p in four:
            if p["no"] in best:
                out[p["no"]] = {k: best[p["no"]][k] for k in ("exit", "path", "length", "dense")}
            else:
                failed.append((p["no"], [ex for ex in EXITS if solo[(p["no"], ex)]]))
        if verbose:
            print("LEVEL", lv, {n: (r["exit"], round(r["length"], 1)) for n, r in best.items()}, flush=True)
    return out, failed


def overlaps(plats):
    """Upper platform over a lower one in plan: (lower, upper, overlap depth)."""
    out = []
    for a in plats:
        for b in plats:
            if b["z"] - a["z"] == 8.0:
                t = np.linspace(0, 2 * math.pi, 60)
                pts = np.array([to_world(a, *egg_local(a, q)) for q in t])
                m = float(np.min(egg_gap(b, pts[:, 0], pts[:, 1])))
                if m < 0:
                    out.append((a["no"], b["no"], round(m, 2)))
            elif b["z"] == a["z"] and b["no"] > a["no"]:
                t = np.linspace(0, 2 * math.pi, 60)
                pts = np.array([to_world(a, *egg_local(a, q)) for q in t])
                m = float(np.min(egg_gap(b, pts[:, 0], pts[:, 1])))
                if m < 2:
                    out.append((a["no"], b["no"], "same level", round(m, 2)))
    return out


def cached():
    with open(os.path.join(HERE, "layout.json"), encoding="utf-8") as f:
        d = json.load(f)
    return d["platforms"], {int(k): v for k, v in d["branches"].items()}, {int(k): v for k, v in d["bridges"].items()}


if __name__ == "__main__":
    ps = platforms()
    print("OVERLAPS", overlaps(ps))
    bg, gf = solve_bridges(ps, {}, True)                                         # bridges first, on trunks and platforms only
    by = {p["no"]: p for p in ps}
    ways = [(by[n]["z"], np.array(v["dense"])) for n, v in bg.items()]
    br, bf = solve_branches(ps, ways, True)                                      # then limbs that leave those corridors open
    for n in sorted(br):
        print("BRANCH", n, "trunk", br[n]["trunk"], "z0 %.1f" % br[n]["z0"], "cost %.1f" % br[n]["cost"])
    bg, gf = solve_bridges(ps, br, True)                                         # and the bridges again, on everything
    for v in bg.values():
        v.pop("dense")
    print("FAILED branches", bf, "bridges", gf)
    with open(os.path.join(HERE, "layout.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump({"platforms": ps, "branches": br, "bridges": bg}, f, indent=1)
