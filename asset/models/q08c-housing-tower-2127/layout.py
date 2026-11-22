"""Q08-C housing tower slot grid and seeded house placement (pure Python: no Blender needed; test_layout.py checks it).

Slots: ("F", level, bay) on the front (+z, 8 bays of 6 m) and ("L" | "R", level, 0) on the two sides (the back bay,
z = -6), seven housing levels. Every slot's back edge meets the U-shaped corridor that runs in front of the core (front
corridor z 0.4..3 across the full width, side corridors |x| 15.4..18). The sides' middle bays carry the front corridor
out to the end houses, so they hold public terraces instead of houses (tower builder).
RESERVED keeps the shared programme out of the draw: the delivery bay under the top rail, the double-height sky garden
(level 2 floor, level 3 void) and a single-height sky garden. The lifts stand in a lobby cut into the core.
place(seed) then
  1. opens a few pocket gardens (OPEN_RATE of the free slots) so the facade breathes: front bays only, at most one per
     level, never next to another open or reserved bay (the first renders showed side or stacked openings reading as
     missing houses), and
  2. visits the remaining slots in a seeded random order, choosing a type that differs from every already-placed
     neighbour above, below, left and right, weighted toward the least-used types. Random order and weights avoid
     fixed cycles; the same seed always gives the same result.
"""
import random

NL = 7
FRONT_BAYS = 8
SIDE_BAYS = 1
TYPES = ["ellipse_view", "rib_vault", "stepped_terrace", "glass_garden", "folded_roof"]
OPEN_RATE = .1
RESERVED = {
    ("F", 4, 6): "delivery",
    ("F", 2, 3): "sky_garden_void", ("F", 2, 4): "sky_garden_void",
    ("F", 3, 3): "void", ("F", 3, 4): "void",
    ("F", 5, 1): "sky_garden", ("F", 5, 2): "sky_garden",
}


# Sides' middle bays (owner 2026-11-21): on every level the middle bay and the same level's front corner bay share
# one corridor landing (the corner house's door can only be reached through it; the columns leave 4.8 m, a house is
# 4.4 m wide), so a level gives the landing to one of them. Public terraces stay on TERRACE_LEVELS; on the levels
# listed in SIDE_MIDDLE the middle bay becomes a house slot ("house": drawn, "empty": kept free for a delivery). Beside
# an empty middle slot the front corner bay is an empty slot too (the pair shares the landing: whichever is filled
# first takes it); beside a middle house the corner bay is blocked (no corridor). Elsewhere it is a plain landing.
TERRACE_LEVELS = (1, 4)
SIDE_MIDDLE = {"L": {0: "house", 2: "empty", 3: "house", 5: "empty"}, "R": {2: "house", 3: "empty", 5: "house"}}
CORNER = {"L": 0, "R": FRONT_BAYS - 1}


def all_slots():
    return ([("F", l, i) for l in range(NL) for i in range(FRONT_BAYS)]
            + [(s, l, j) for s in "LR" for l in range(NL) for j in range(SIDE_BAYS)])


def neighbours(slot):
    face, l, i = slot
    n = FRONT_BAYS if face == "F" else 2                                       # back (0) and middle (1) side bays
    return [(face, l + dl, i + di) for dl, di in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= l + dl < NL and 0 <= i + di < n]


def place(seed, types=TYPES, open_rate=OPEN_RATE):
    rng = random.Random(seed)
    free = [s for s in all_slots() if s not in RESERVED]
    order = free[:]
    rng.shuffle(order)
    opened, target = set(), round(open_rate * len(free))
    for s in order:
        if len(opened) >= target:
            break
        if s[0] != "F" or any(o[1] == s[1] for o in opened) or any(n in opened or n in RESERVED for n in neighbours(s)):
            continue
        opened.add(s)
    assign, used = {}, {t: 0 for t in types}
    order = [s for s in free if s not in opened]
    rng.shuffle(order)
    for s in order:
        ban = {assign[n] for n in neighbours(s) if n in assign}
        allowed = [t for t in types if t not in ban] or list(types)
        t = rng.choices(allowed, [1 / (1 + used[t]) ** 2 for t in allowed])[0]
        assign[s] = t
        used[t] += 1
    return assign, opened


def side_middle(seed, assign, opened):
    """Apply SIDE_MIDDLE after the main draw (so the rest of the facade keeps its seed result). Corner bays on those
    levels lose their house: beside an empty middle slot they become empty slots, beside a middle house they are
    blocked. "house" middle slots are drawn with the same neighbour rule. Returns
    (assign, opened, blocked_corners, empty_slots, landings); empty_slots holds the middle and corner pair slots."""
    rng = random.Random(seed * 7 + 1)
    assign, opened = dict(assign), set(opened)
    blocked, empty, landings = set(), set(), set()
    for side, prog in SIDE_MIDDLE.items():
        for l in range(NL):
            if l in prog:
                c = ("F", l, CORNER[side])
                assign.pop(c, None)
                opened.discard(c)
                (empty if prog[l] == "empty" else blocked).add(c)
            elif l not in TERRACE_LEVELS:
                landings.add((side, l, 1))
    used = {t: 0 for t in TYPES}
    for t in assign.values():
        used[t] += 1
    for side in sorted(SIDE_MIDDLE):
        for l, use in sorted(SIDE_MIDDLE[side].items()):
            s = (side, l, 1)
            if use == "empty":
                empty.add(s)
                continue
            ban = {assign[n] for n in neighbours(s) if n in assign}
            allowed = [t for t in TYPES if t not in ban] or list(TYPES)
            t = rng.choices(allowed, [1 / (1 + used[t]) ** 2 for t in allowed])[0]
            assign[s] = t
            used[t] += 1
    return assign, opened, blocked, empty, landings


def stats(assign, opened):
    same = sorted((a, b) for a in assign for b in neighbours(a) if b in assign and a < b and assign[a] == assign[b])
    counts = {}
    for t in assign.values():
        counts[t] = counts.get(t, 0) + 1
    cycles = []                                     # a row that repeats with a period of 2..5 over its whole length
    for l in range(NL):
        row = [assign.get(("F", l, i)) for i in range(FRONT_BAYS)]
        for k in range(2, 6):
            pairs = [(row[i], row[i + k]) for i in range(FRONT_BAYS - k) if row[i] and row[i + k]]
            if len(pairs) >= 3 and all(a == b for a, b in pairs):
                cycles.append((l, k))
    return {"houses": len(assign), "open": len(opened), "reserved": len(RESERVED), "counts": counts,
            "adjacent_same": same, "periodic_rows": cycles}


def front_map(assign, opened):
    """Text map of the front (then the side bays), top level first: E R S G F houses, o open or corner garden,
    d delivery, g sky garden, v void; side middle bays: _ empty slot, t public terrace, - corridor landing."""
    code = {"ellipse_view": "E", "rib_vault": "R", "stepped_terrace": "S", "glass_garden": "G", "folded_roof": "F"}
    lines = []
    for l in reversed(range(NL)):
        cells = []
        for i in range(FRONT_BAYS):
            s = ("F", l, i)
            res = {"delivery": "d", "sky_garden_void": "g", "void": "v", "sky_garden": "g"}
            cells.append(code[assign[s]] if s in assign else ("o" if s in opened else res[RESERVED[s]] if s in RESERVED else "."))
        def mid(f):
            if (f, l, 1) in assign:
                return code[assign[(f, l, 1)]]
            return {"empty": "_"}.get(SIDE_MIDDLE[f].get(l), "t" if l in TERRACE_LEVELS else "-")
        side = [code.get(assign.get((f, l, 0)), "o") for f in "LR"]
        lines.append("L%d  %s   | L back %s mid %s | R mid %s back %s" % (l, " ".join(cells), side[0], mid("L"), mid("R"), side[1]))
    return "\n".join(lines)
