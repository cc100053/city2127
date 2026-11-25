"""Q04-A suspended single-room tower: pod positions (design table 02) and the solved bridge lines (design section 05).

Blender coordinates (x, y, z up), real metres, core axis at the origin, sea on +y. No bpy here: Blender's bundled
Python (numpy) runs it, `blender -b --factory-startup --python-exit-code 1 -P layout.py` prints the solved table.

Each pod: ring, k, n (1-based), R, angle (deg), dtheta (deg moved from the table), z (underside of the envelope).
Each bridge: a polyline [(x, y), ...] from the lift landing to the pod's door threshold, its tube and deck height.
Running this file writes layout.json, which the builder and the checks read.
The solver is A* on a 0.2 m grid per deck level against pod envelopes, springs, hanger rods and the bridges already
laid, followed by string pulling; a pod that cannot be reached is turned a little about the core (design 05).
"""
import heapq
import json
import math
import os
import random

import numpy as np

RINGS = (("INNER", 12, 11.0, 0.0, (38, 26)), ("MID", 16, 18.0, 11.25, (33, 21)), ("OUTER", 20, 25.0, 4.5, (37, 25, 19, 31)))
HALF = 2.7                       # envelope half width / half depth
RC = .85                         # envelope plan corner radius (0.65 shell + 0.2 wedge)
POD_H = 5.2
SEAT_R, SPRING_TOP = .86, 7.45   # widest part of the spring unit and its top, above the pod underside
ROD_R, ROD_TOP = .10, 50.0
FLOOR = .35                      # interior floor above the pod underside = bridge deck
DECK_HW = .63                    # 1.10 m clear + two handrails
CLEAR = .12                      # kept by every finished line
GRID_CLEAR = .17                 # the search keeps a little more, so string pulling can straighten its steps
BAND = (-.34, 2.15)              # bridge envelope about its deck: spine beam underside .. headroom
CORE_R = 3.95                    # outside of the lift tubes
TUBES, TUBE_R, TUBE_RING = 14, .55, 3.35      # 13 bridges share the 19-21 and 31-33 m bands, one tube each
LANDING = 9.0                    # a landing reaches this many degrees past its tube and its bridge
START_R = 5.0
APPROACH = .82                   # straight radial leg in front of each door
MIN_POD_GAP = 1.0


def pods():
    out = []
    for ring, n, R, a0, zs in RINGS:
        for k in range(n):
            out.append({"ring": ring, "k": k, "n": k + 1, "R": R, "angle": a0 + k * 360.0 / n, "dtheta": 0.0,
                        "z": float(zs[k % len(zs)]), "name": "%s_%02d" % (ring, k + 1)})
    return out


def centre(p):
    a = math.radians(p["angle"])
    return p["R"] * math.cos(a), p["R"] * math.sin(a)


def sd_pod(p, x, y):
    """Signed distance to the pod's rounded-square envelope in plan (arrays ok)."""
    a = math.radians(p["angle"])
    c, s = math.cos(a), math.sin(a)
    u = np.abs(x * c + y * s - p["R"]) - (HALF - RC)
    v = np.abs(-x * s + y * c) - (HALF - RC)
    return np.hypot(np.maximum(u, 0), np.maximum(v, 0)) + np.minimum(np.maximum(u, v), 0) - RC


def sd_seg(x, y, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = np.clip(((x - a[0]) * dx + (y - a[1]) * dy) / max(dx * dx + dy * dy, 1e-9), 0, 1)
    return np.hypot(x - a[0] - t * dx, y - a[1] - t * dy)


def field(x, y, deck, all_pods, bridges):
    """Distance from each point to the nearest thing a bridge at `deck` must stay clear of, less nothing (surface to axis)."""
    z0, z1 = deck + BAND[0], deck + BAND[1]
    d = np.hypot(x, y) - CORE_R + DECK_HW                                      # the core only blocks the axis line itself
    for p in all_pods:
        if p["z"] < z1 and p["z"] + POD_H > z0:
            d = np.minimum(d, sd_pod(p, x, y))
        cx, cy = centre(p)
        r = np.hypot(x - cx, y - cy)
        if p["z"] + POD_H < z1 and p["z"] + SPRING_TOP > z0:
            d = np.minimum(d, r - SEAT_R)
        if p["z"] + SPRING_TOP < z1 and ROD_TOP > z0:
            d = np.minimum(d, r - ROD_R)
    for b in bridges:
        if b["deck"] + BAND[0] < z1 and b["deck"] + BAND[1] > z0:
            for a, c in zip(b["path"], b["path"][1:]):
                d = np.minimum(d, sd_seg(x, y, a, c) - DECK_HW)
    return d


STEP = .2
N = int(27.0 / STEP)
GX, GY = np.meshgrid(np.arange(-N, N + 1) * STEP, np.arange(-N, N + 1) * STEP, indexing="ij")


def los(a, b, deck, all_pods, bridges):
    n = max(2, int(math.dist(a, b) / .05))
    t = np.linspace(0, 1, n)
    return bool(np.all(field(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, deck, all_pods, bridges) > DECK_HW + CLEAR - .005))


def landings_meet(t0, s0, t1, s1):
    """Do two landings (tube index, bridge bearing) overlap in plan?"""
    iv = []
    for t, s in ((t0, s0), (t1, s1)):
        a = t * 360.0 / TUBES
        off = math.remainder(s - a, 360.0)
        iv.append((a + off / 2, abs(off) / 2 + LANDING + .25))
    return abs(math.remainder(iv[0][0] - iv[1][0], 360.0)) < iv[0][1] + iv[1][1]


def solve(p, all_pods, bridges):
    deck = p["z"] + FLOOR
    a = math.radians(p["angle"])
    door = ((p["R"] - HALF) * math.cos(a), (p["R"] - HALF) * math.sin(a))
    appr = ((p["R"] - HALF - APPROACH) * math.cos(a), (p["R"] - HALF - APPROACH) * math.sin(a))
    free = field(GX, GY, deck, all_pods, bridges) > DECK_HW + GRID_CLEAR
    free &= np.hypot(GX, GY) > START_R - .15
    if not field(np.array(appr[0]), np.array(appr[1]), deck, all_pods, bridges) > DECK_HW + CLEAR - .005:
        return None
    near = [b for b in bridges if b["deck"] + BAND[0] < deck + BAND[1] and b["deck"] + BAND[1] > deck + BAND[0]]
    starts = {}
    for t in range(TUBES):
        for off in (0.0, -6.0, 6.0, -12.0, 12.0):
            if any(landings_meet(t, t * 360.0 / TUBES + off, b["tube"], b["start"]) for b in near):
                continue
            sa = math.radians(t * 360.0 / TUBES + off)
            s0 = (CORE_R * math.cos(sa), CORE_R * math.sin(sa))
            s1 = (START_R * math.cos(sa), START_R * math.sin(sa))
            ok = all(not (b["deck"] + BAND[0] < deck + BAND[1] and b["deck"] + BAND[1] > deck + BAND[0]) or
                     min(float(sd_seg(np.array(q[0]), np.array(q[1]), u, v)) for q in (s0, s1) for u, v in zip(b["path"], b["path"][1:])) > 2 * DECK_HW + .1
                     for b in bridges)
            if not ok:
                continue
            i, j = round(s1[0] / STEP) + N, round(s1[1] / STEP) + N
            cells = [(i + di, j + dj) for di in (-1, 0, 1) for dj in (-1, 0, 1) if free[i + di, j + dj]]
            if cells:
                c = min(cells, key=lambda c: math.dist((GX[c], GY[c]), s1))
                starts[c] = (t, s0, s1)
    gi, gj = round(appr[0] / STEP) + N, round(appr[1] / STEP) + N
    goals = [(gi + di, gj + dj) for di in range(-2, 3) for dj in range(-2, 3) if free[gi + di, gj + dj]]
    if not starts or not goals:
        return None
    goal = min(goals, key=lambda c: math.dist((GX[c], GY[c]), appr))
    best, came, heap = {}, {}, []
    for c in starts:
        # landings off a tube's axis cost a little, so doors line up with tubes when they can
        sdeg = math.degrees(math.atan2(starts[c][1][1], starts[c][1][0]))
        extra = .06 * abs(math.remainder(sdeg - starts[c][0] * 360.0 / TUBES, 360.0))
        best[c] = extra
        heapq.heappush(heap, (extra + math.dist(c, goal) * STEP, c))
    nb = [(di, dj, math.hypot(di, dj) * STEP) for di in (-1, 0, 1) for dj in (-1, 0, 1) if di or dj]
    done = set()
    while heap:
        _, c = heapq.heappop(heap)
        if c in done:
            continue
        done.add(c)
        if c == goal:
            break
        for di, dj, w in nb:
            q = (c[0] + di, c[1] + dj)
            if not (0 <= q[0] <= 2 * N and 0 <= q[1] <= 2 * N) or not free[q]:
                continue
            g = best[c] + w
            if g < best.get(q, 1e9) - 1e-9:
                best[q], came[q] = g, c
                heapq.heappush(heap, (g + math.dist(q, goal) * STEP, q))
    if goal not in done:
        return None
    cells = [goal]
    while cells[-1] in came:
        cells.append(came[cells[-1]])
    cells.reverse()
    tube, s0, s1 = starts[cells[0]]
    pts = [s1] + [(float(GX[c]), float(GY[c])) for c in cells] + [appr]
    out = [pts[0]]
    i = 0
    while i < len(pts) - 1:                                                      # string pulling
        j = len(pts) - 1
        while j > i + 1 and not los(pts[i], pts[j], deck, all_pods, bridges):
            j -= 1
        out.append(pts[j])
        i = j
    clean = [s0]
    for q in out + [door]:
        if math.dist(q, clean[-1]) > .02:
            clean.append(q)
    path = [clean[0]]                                                            # drop collinear points
    for i in range(1, len(clean) - 1):
        u = math.atan2(clean[i][1] - path[-1][1], clean[i][0] - path[-1][0])
        v = math.atan2(clean[i + 1][1] - clean[i][1], clean[i + 1][0] - clean[i][0])
        if abs(math.remainder(u - v, 2 * math.pi)) > math.radians(.5):
            path.append(clean[i])
    path.append(clean[-1])
    return {"pod": p["name"], "tube": tube, "start": math.degrees(math.atan2(s0[1], s0[0])), "deck": deck, "path": path,
            "length": sum(math.dist(a, b) for a, b in zip(path, path[1:]))}


def pod_gap(p, q, n=48):
    """Plan gap between two envelopes whose heights overlap (inf otherwise), by sampling p's outline."""
    if p["z"] >= q["z"] + POD_H or q["z"] >= p["z"] + POD_H:
        return math.inf
    a = math.radians(p["angle"])
    t = np.linspace(-HALF, HALF, n)
    u = np.concatenate([t, t, np.full(n, HALF), np.full(n, -HALF)])
    v = np.concatenate([np.full(n, HALF), np.full(n, -HALF), t, t])
    x = (p["R"] + u) * math.cos(a) - v * math.sin(a)
    y = (p["R"] + u) * math.sin(a) + v * math.cos(a)
    keep = sd_pod(p, x, y) <= 1e-6
    k2 = sd_pod(p, x, y)                                                         # pull square corners onto the rounding
    return float(np.min(sd_pod(q, x, y)[keep])) if not keep.all() else float(np.min(sd_pod(q, x, y) - 0 * k2))


BANDS = ((37.0, 38.0), (25.0, 26.0), (31.0, 33.0), (19.0, 21.0))                 # decks whose bridges can meet; bands cannot


def lay(order, all_pods, bridges, limit=1.25):
    """Lay `order` onto the bridges so far; returns (pods, bridges, failed names), leaving the inputs unchanged."""
    all_pods, bridges, log = [dict(p) for p in all_pods], list(bridges), []
    by = {p["name"]: p for p in all_pods}
    for name in order:
        p = by[name]
        base, hit = p["angle"], None
        for off in (0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7):
            p["angle"] = base + off
            if off and min(pod_gap(p, q) for q in all_pods if q is not p) < MIN_POD_GAP:
                continue
            if off and not all(hang_clear(p, q) for q in all_pods if q is not p):
                continue
            if off and not all(los_path_clear(b, p) for b in bridges):           # must not foul bridges already laid
                continue
            hit = solve(p, all_pods, bridges)
            if hit and hit["length"] > limit * p["R"]:
                hit = None                                                        # a detour: try a small turn instead
            if hit:
                p["dtheta"] = float(off)
                break
        if not hit:
            p["angle"] = base
            log.append(name)
            if len(log) > 1:
                break
            continue
        bridges.append(hit)
    return all_pods, bridges, log


def solve_all(verbose=False, tries=40, seed=2127):
    """Band by band: try shuffled orders, keep the one that reaches every pod with the fewest turned pods and bends."""
    rng = random.Random(seed)
    all_pods, bridges, failed = pods(), [], []
    for band in BANDS:
        names = [p["name"] for p in all_pods if p["z"] in band]
        order = [n for n in names if n.startswith("OUTER")] + [n for n in names if not n.startswith("OUTER")]
        best, good = None, 0
        for t in range(tries):
            res = lay(order, all_pods, bridges)
            score = (len(res[2]), sum(1 for p in res[0] if p["dtheta"]), sum(len(b["path"]) for b in res[1]))
            if best is None or score < best[0]:
                best = (score, res)
            if verbose:
                print("BAND", band, "try", t, score, res[2], flush=True)
            if not res[2]:
                good += 1
                if good >= 3:
                    break
                rng.shuffle(order)
            elif t % 3 == 2:
                rng.shuffle(order)
            else:
                order = res[2] + [n for n in order if n not in res[2]]
        all_pods, bridges = best[1][0], best[1][1]
        failed += best[1][2]
    return all_pods, bridges, failed


def cached():
    """The solved layout (layout.json, written by running this file)."""
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "layout.json"), encoding="utf-8") as f:
        d = json.load(f)
    return d["pods"], d["bridges"]


def hang_clear(p, q, margin=.6):
    """Neither pod's spring and rod passes within `margin` of the other's envelope."""
    for a, b in ((p, q), (q, p)):
        if b["z"] + POD_H > a["z"] + POD_H:                                      # b reaches above a's roof, beside a's hanger
            x, y = centre(a)
            r = SEAT_R if b["z"] < a["z"] + SPRING_TOP else ROD_R
            if float(sd_pod(b, np.array(x), np.array(y))) - r < margin:
                return False
    return True


def los_path_clear(b, p):
    return all(los(u, v, b["deck"], [p], []) or math.dist(u, v) < 1e-6 for u, v in zip(b["path"][1:-1], b["path"][2:-1]))


if __name__ == "__main__":
    ps, bs, fail = solve_all(True)
    gaps = [(pod_gap(a, b), a["name"], b["name"]) for i, a in enumerate(ps) for b in ps[i + 1:]]
    by = {p["name"]: p for p in ps}
    for b in bs:
        print("BRIDGE", b["pod"], "deck %.2f" % b["deck"], "dtheta %+.0f" % by[b["pod"]]["dtheta"], "tube", b["tube"],
              "bends", len(b["path"]) - 2, "len %.1f" % b["length"])
    print("PODS", len(ps), "BRIDGES", len(bs), "FAILED", fail)
    print("MIN PLAN GAP", sorted(gaps)[:4])
    print("HANGER CONFLICTS", [(a["name"], b["name"]) for i, a in enumerate(ps) for b in ps[i + 1:] if not hang_clear(a, b, .5)])
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "layout.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump({"pods": ps, "bridges": bs, "failed": fail}, f, indent=1)
