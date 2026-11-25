"""House types of the Q04-B sky village. Local frame: origin on the floor at the plan centre, front (living-room window) -y,
entrance on -x at y = DOOR_Y (mirror the mesh for the other hand), z up. Rooms are real: lined, lit and furnished behind
the glass (library kit props), more fully in the two front villas than in the eighteen houses further off.
"""
import math

import parts as P
from parts import Accs, K, M, box, loft, ribbon

from houses_size import DOOR_Y, SIZE

TH = .18


def wall(acc, o, d, n, ln, z0, top, holes=(), brk=(), th=TH, off=0.0):
    """Wall with rectangular openings: from plan point o along unit d for ln metres, thickness th along the inward normal n
    (shifted off inward), z0 up to top(t); holes are (t0, t1, z0, z1)."""
    top_ = top if callable(top) else (lambda t: top)
    ts = sorted({0.0, ln, *brk, *(t for h in holes for t in h[:2])})
    for ta, tb in zip(ts, ts[1:]):
        if tb - ta < 1e-4:
            continue
        tm, z = (ta + tb) / 2, z0
        cuts = sorted((h[2], h[3]) for h in holes if h[0] <= tm <= h[1])
        spans = []
        for h0, h1 in cuts:
            if h0 - z > 1e-4:
                spans.append((z, z, h0, h0))
            z = h1
        if top_(tm) - z > 1e-4:
            spans.append((z, z, top_(ta), top_(tb)))
        for za, zb, zc, ze in spans:
            secs = []
            for k in (off, off + th):
                pa, pb = [(o[0] + d[0] * t + n[0] * k, o[1] + d[1] * t + n[1] * k) for t in (ta, tb)]
                secs.append([(*pa, za), (*pb, zb), (*pb, ze), (*pa, zc)])
            loft(acc, secs)


def window(a, o, d, n, h, cols=2, depth=.15, bar=.055, transom=None):
    """Frame and glass set `depth` behind the wall face in opening h = (t0, t1, z0, z1)."""
    t0, t1, z0, z1 = h

    def bar_(ta, tb, za, zb):
        secs = []
        for k in (depth - .03, depth + .04):
            pa, pb = [(o[0] + d[0] * t + n[0] * k, o[1] + d[1] * t + n[1] * k) for t in (ta, tb)]
            secs.append([(*pa, za), (*pb, za), (*pb, zb), (*pa, zb)])
        loft(a["frame"], secs)
    bar_(t0, t1, z0, z0 + bar)
    bar_(t0, t1, z1 - bar, z1)
    for i in range(cols + 1):
        t = t0 + (t1 - t0 - bar) * i / cols
        bar_(t, t + bar, z0, z1)
    if transom:
        bar_(t0, t1, transom, transom + bar * .8)
    p, q = [(o[0] + d[0] * t + n[0] * depth, o[1] + d[1] * t + n[1] * depth) for t in (t0, t1)]
    a["glass_house"].facing([(*p, z0), (*q, z0), (*q, z1), (*p, z1)], [(0, 1, 2, 3)], lambda c: (-n[0], -n[1], 0))


def clad(acc, o, d, n, ln, z0, top, holes=(), step=.42):
    """Vertical joint battens on a wall face, stopping at the openings."""
    top_ = top if callable(top) else (lambda t: top)
    k = int(ln / step)
    for i in range(1, k):
        t = ln * i / k
        hs = [(0, .02, h[2] - .06, h[3] + .06) for h in holes if h[0] - .05 <= t <= h[1] + .05]
        wall(acc, (o[0] + d[0] * t, o[1] + d[1] * t), d, n, .02, z0, top_(t), hs, (), .012, -.012)


def room_shell(a, x0, x1, y0, y1, z0, z1, floor=True, ceil=True):
    if floor:
        a["in_floor"].facing([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)], [(0, 1, 2, 3)], lambda c: (0, 0, 1))
    if ceil:
        a["in_wall"].facing([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], [(0, 1, 2, 3)], lambda c: (0, 0, -1))


def storey(a, skin, x0, x1, y0, y1, z0, top, openings, cols=None, brk=None, door=None, lining=True, ceiling=None):
    """Four walls with openings per side: F (t from -x), R (t from front), B (t from +x), L (t from back).
    top: a number or {side: number or function of t}."""
    sides = {"F": ((x0, y0), (1, 0), (0, 1), x1 - x0), "R": ((x1, y0), (0, 1), (-1, 0), y1 - y0),
             "B": ((x1, y1), (-1, 0), (0, -1), x1 - x0), "L": ((x0, y1), (0, -1), (1, 0), y1 - y0)}
    for s, (o, d, n, ln) in sides.items():
        t = top[s] if isinstance(top, dict) else top
        hs = openings.get(s, [])
        holes = [h[:4] for h in hs]
        bk = (brk or {}).get(s, ())
        wall(a[skin], o, d, n, ln, z0, t, holes, bk)
        if lining:
            zt = ceiling if ceiling is not None else min(v for v in [t(q) if callable(t) else t for q in (0, ln / 2, ln)])
            wall(a["in_wall"], o, d, n, ln, z0, zt, [(h[0], h[1], h[2], min(h[3], zt)) for h in holes], (), .02, TH)
        for h in hs:
            if len(h) > 4 and h[4] == "door":
                o2 = (o[0] + n[0] * .10, o[1] + n[1] * .10)
                wall(a["door"], (o2[0] + d[0] * h[0], o2[1] + d[1] * h[0]), d, n, h[1] - h[0], h[2], h[3], (), (), .06)
                hx = h[1] - .14
                p = (o[0] + d[0] * hx + n[0] * .06, o[1] + d[1] * hx + n[1] * .06)
                box(a["silver"], p[0] - .03, p[0] + .03, p[1] - .03, p[1] + .03, h[2] + .9, h[2] + 1.25)
            else:
                window(a, o, d, n, h[:4], *(h[4:] or (2,)))


def roof(a, role, pts, axis, c0, c1, th=.20, soffit=True, seams=0.0):
    """Sloped slab: top polyline pts (s, z) across, extruded c0..c1 along the other axis ('y' or 'x'); wood under the eaves."""
    def sec(c, ps):
        return [(s, c, z) if axis == "y" else (c, s, z) for s, z in ps]

    def prism(acc, top, low, ca, cb):
        ps = top + low[::-1]
        loft(acc, [sec(ca, ps), sec(cb, ps)])
    for (s0, z0), (s1, z1) in zip(pts, pts[1:]):
        prism(a[role], [(s0, z0), (s1, z1)], [(s0, z0 - th), (s1, z1 - th)], c0, c1)
        if soffit:
            e = .03
            prism(a["soffit"], [(s0, z0 - th), (s1, z1 - th)], [(s0, z0 - th - e), (s1, z1 - th - e)], c0 + .04, c1 - .04)
        if seams:
            k = int((c1 - c0) / seams)
            for i in range(1, k):
                c = c0 + (c1 - c0) * i / k
                prism(a[role], [(s0, z0 + .035), (s1, z1 + .035)], [(s0, z0), (s1, z1)], c - .02, c + .02)


def props(a, rng):
    def put(name, x, y, z=0.0, yaw=0.0, k=1.0, fabric=None):
        M.kit_prop(K.ctx(a, rng, x, y, z, yaw, k), name, 0, 0, 0, 0, fabric)
    return put


def villa(w, d, door="-x", full=True, rng=None):
    """Two-storey front villa: open glazed ground floor with a corner window, set-back upper floor, single-pitch roof rising
    to +x. With door="+x" the entrance is on the high side (mirror it to bring the door back to -x)."""
    a = Accs()
    hw, hd, g = w / 2, d / 2, 3.0
    put = props(a, rng)
    dt = hd - DOOR_Y
    dside = [(dt - .5, dt + .5, 0, 2.25, "door"), (.45, .95, .9, 2.2, 1)]
    corner = 2.1
    left = {"L": dside} if door == "-x" else {}
    ops = {"F": [(.9, w - .16, 0, 2.8, 5 if full else 4)], "B": [(.9, 3.4, 1.0, 2.4, 3)], **left}
    if door == "-x":
        ops["R"] = [(.16, corner, 0, 2.8, 1)]
    else:                                                                         # corner glass moves to the garden side
        ops["F"] = [(.16, w - .9, 0, 2.8, 4)]
        ops["L"] = [(d - corner, d - .16, 0, 2.8, 1)]
        ops["R"] = [(hd + DOOR_Y - .5, hd + DOOR_Y + .5, 0, 2.25, "door"), (d - .95, d - .45, .9, 2.2, 1)]
    storey(a, "wall", -hw, hw, -hd, hd, 0, g, ops, ceiling=2.95)
    room_shell(a, -hw + .1, hw - .1, -hd + .1, hd - .1, .01, 2.94)
    box(a["wall"], -hw - .05, hw + .05, -hd - .42, hd + .05, g, g + .28)              # floor band, a canopy over the terrace doors
    box(a["soffit"], -hw, hw, -hd - .40, -hd, g - .03, g)
    z1 = g + .28
    ux0, ux1, uy0, uy1 = -hw + .10, hw - .10, -hd + .22, hd - .10
    lo, rise = 5.12, 1.52
    uw = ux1 - ux0

    def ztop(t):
        return lo + rise * t / uw
    ops = {"F": [(.7, 2.8, z1 + .55, z1 + 1.62, 3), (uw * .45, uw * .88, z1 + .22, z1 + 2.15, 3)],
           "R": [(2.1, 2.8, z1 + .7, z1 + 1.7, 1)], "L": [(1.2, 1.7, z1 + .6, z1 + 1.5, 1)],
           "B": [(1.0, 1.5, z1 + .6, z1 + 2.0, 1), (3.0, 3.5, z1 + .6, z1 + 2.0, 1), (5.2, 5.7, z1 + .6, z1 + 1.6, 1)]}
    storey(a, "wall", ux0, ux1, uy0, uy1, z1, {"F": ztop, "R": lo + rise, "L": lo, "B": lambda t: ztop(uw - t)}, ops, ceiling=lo - .02)
    room_shell(a, ux0 + .1, ux1 - .1, uy0 + .1, uy1 - .1, z1 + .01, 0, ceil=False)
    clad(a["wall2"], (ux0, uy0), (1, 0), (0, 1), uw, z1, lambda t: ztop(t) - .06, ops["F"])
    clad(a["wall2"], (ux1, uy0), (0, 1), (-1, 0), uy1 - uy0, z1, lo + rise - .06, ops["R"])
    clad(a["wall2"], (ux0, uy1), (0, -1), (1, 0), uy1 - uy0, z1, lo - .06, ops["L"])
    s = rise / uw
    a["in_wall"].facing([(ux0, uy0, lo), (ux1, uy0, lo + rise), (ux1, uy1, lo + rise), (ux0, uy1, lo)], [(0, 1, 2, 3)], lambda c: (0, 0, -1))
    xa, xb = -hw - .55, hw + .95
    roof(a, "roof", [(xa, lo + s * (xa - ux0) + .22), (xb, lo + s * (xb - ux0) + .22)], "y", -hd - .62, hd + .55, .20, True, 1.0)
    for x in (hw - .1, hw + .55):                                                  # downlights under the high eave
        box(a["warm"], x - .06, x + .06, -hd - .35, -hd - .23, lo + s * (x - ux0) - .02, lo + s * (x - ux0))
    f0, f1 = -hw + .10 + uw * .45, -hw + .10 + uw * .88                              # clear rail across the big upper window
    a["glass_rail"].facing([(f0, uy0 - .04, z1 + .15), (f1, uy0 - .04, z1 + .15), (f1, uy0 - .04, z1 + .95), (f0, uy0 - .04, z1 + .95)], [(0, 1, 2, 3)], lambda c: (0, -1, 0))
    box(a["rail"], f0, f1, uy0 - .06, uy0 - .02, z1 + .95, z1 + .99)
    # --- rooms
    for x in (-hw * .55, hw * .1, hw * .6):
        box(a["warm"], x - .45, x + .45, -.2, -.1, 2.90, 2.935)
    m = 1 if door == "-x" else -1
    put("meeting_table", m * hw * .28, -hd + 1.75)
    for q in (-.45, .45):
        put("pendant_lamp", m * hw * .28 + q, -hd + 1.75, 1.74)
    put("sofa", -m * hw * .52, .35)
    box(a["in_dark"], -m * hw * .52 - .55, -m * hw * .52 + .55, -1.05, -.50, .28, .34)
    for q in (-.48, .48):
        box(a["in_dark"], -m * hw * .52 + q - .03, -m * hw * .52 + q + .03, -1.0, -.55, .01, .28)
    put("rug", -m * hw * .52, -.75, .015, 0, 1.15)
    put("kitchen_counter", m * hw * .55, hd - .62)
    put("floor_lamp", -m * hw * .80, -.1)
    n = 16                                                                          # stair along the back wall, up toward the door side
    for i in range(n):
        x = m * (.6 - .22 * i)
        box(a["in_floor"], *sorted((x, x - m * .24)), hd - 1.15, hd - .24, max(.188 * i - .12, 0), .188 * (i + 1))
    if full:
        put("bookshelf", -m * (hw - .9), hd - .42)
        put("tree_indoor", m * (hw - .75), hd - 2.1, 0, 0, .9)
        put("upper_cabinet", m * hw * .55, hd - .42, 1.5)
    # upper floor: a sitting room behind the big window, a bed behind the other
    put("sofa", hw * .30, uy0 + 1.5, z1 + .01, math.pi)
    put("floor_lamp", hw * .30 + 1.5, uy0 + 1.3, z1 + .01)
    put("potted_plant", hw * .30 - 1.5, uy0 + .7, z1 + .01)
    put("pendant_lamp", hw * .30, uy0 + 1.2, z1 + 1.35)
    box(a["in_dark"], -hw * .6 - .85, -hw * .6 + .85, uy0 + .7, uy0 + 2.7, z1, z1 + .3)
    K.slab(a["in_linen"], -hw * .6 - .8, -hw * .6 + .8, uy0 + .72, uy0 + 2.68, z1 + .3, z1 + .52)
    K.slab(a["in_cloth"], -hw * .6 - .82, -hw * .6 + .82, uy0 + .7, uy0 + 1.9, z1 + .36, z1 + .55)
    for x in (-hw * .55, hw * .35):
        box(a["warm"], x - .4, x + .4, .3, .4, lo - .06, lo - .03)
    return a


def small_room(a, put, w, d, z=0.0, h=2.5, two=True):
    """Light furnishing for the further houses."""
    put("sofa", -w * .10, .55, z)
    box(a["in_dark"], -w * .10 - .5, -w * .10 + .5, -.75, -.25, z + .25, z + .32)
    put("floor_lamp", w * .22, .5, z)
    if two:
        put("bookshelf", -w * .30, d / 2 - .42, z)
        box(a["in_dark"], w * .20, w * .36, -d / 2 + .7, -d / 2 + 1.5, z + .68, z + .73)
    box(a["warm"], -.6, .6, -.1, 0, z + h - .06, z + h - .03)


def gable(rng):
    a = Accs()
    w, d = SIZE["gable"]
    hw, hd, e, r = w / 2, d / 2, 2.62, 3.85
    put = props(a, rng)
    sl = (r - e) / hd

    def end(t):
        return e + sl * (hd - abs(t - hd)) - .12
    storey(a, "wall", -hw, hw, -hd, hd, 0, {"F": e - .1, "B": e - .1, "L": end, "R": end},
           {"F": [(.9, 4.7, 0, 2.28, 3), (5.4, 6.7, .8, 2.1, 1)], "L": [(hd - DOOR_Y - .5, hd - DOOR_Y + .5, 0, 2.15, "door")],
            "R": [(1.4, 2.6, .9, 2.1, 1)], "B": [(1.2, 1.8, 1.0, 2.1, 1), (4.0, 4.9, 1.2, 2.1, 1)]}, brk={"L": (hd,), "R": (hd,)}, ceiling=e - .14)
    room_shell(a, -hw + .1, hw - .1, -hd + .1, hd - .1, .01, e - .15)
    o = .55
    roof(a, "roof2", [(-hd - o, e - sl * o + .08), (0, r + .08), (hd + o, e - sl * o + .08)], "x", -hw - .45, hw + .45, .17)
    small_room(a, put, w, d)
    return a


def gable2(rng):
    a = Accs()
    w, d = SIZE["gable2"]
    hw, hd, e, r = w / 2, d / 2, 4.95, 6.15
    put = props(a, rng)
    sl = (r - e) / hw

    def end(t):
        return e + sl * (hw - abs(t - hw)) - .12
    storey(a, "wall2", -hw, hw, -hd, hd, 0, {"F": end, "B": end, "L": e - .1, "R": e - .1},
           {"F": [(.9, 4.7, 0, 2.35, 3), (1.0, 2.6, 3.35, 4.5, 2), (3.6, 5.4, 3.15, 4.75, 2)], "L": [(hd - DOOR_Y - .5, hd - DOOR_Y + .5, 0, 2.2, "door"), (1.6, 2.4, 3.4, 4.4, 1)],
            "R": [(1.6, 2.6, .9, 2.1, 1), (1.6, 2.4, 3.4, 4.4, 1)], "B": [(1.0, 1.6, 1.0, 2.2, 1), (2.6, 3.2, 3.4, 4.6, 1)]}, brk={"F": (hw,), "B": (hw,)}, ceiling=e - .14)
    room_shell(a, -hw + .1, hw - .1, -hd + .1, hd - .1, .01, 2.58)
    room_shell(a, -hw + .1, hw - .1, -hd + .1, hd - .1, 2.86, e - .15)
    box(a["wall"], -hw - .03, hw + .03, -hd - .30, hd + .03, 2.62, 2.84)
    o = .5
    roof(a, "roof", [(-hw - o, e - sl * o + .08), (0, r + .08), (hw + o, e - sl * o + .08)], "y", -hd - .55, hd + .45, .17)
    small_room(a, put, w, d)
    put("sofa", 1.0, .2, 2.87)
    box(a["warm"], -.5, .5, -.1, 0, e - .2, e - .17)
    return a


def ridge(rng):
    a = Accs()
    w, d = SIZE["ridge"]
    hw, hd = w / 2, d / 2
    ef, rz, eb, ry = 2.62, 4.15, 3.05, .9
    put = props(a, rng)

    def z_at(y):
        return (ef + (rz - ef) * (y + hd) / (ry + hd) if y < ry else rz + (eb - rz) * (y - ry) / (hd - ry)) - .10
    storey(a, "wall", -hw, hw, -hd, hd, 0, {"F": ef - .1, "B": eb - .1, "R": lambda t: z_at(t - hd), "L": lambda t: z_at(hd - t)},
           {"F": [(2.5, 6.5, 0, 2.3, 3), (.7, 1.5, .9, 2.1, 1)], "L": [(hd - DOOR_Y - .5, hd - DOOR_Y + .5, 0, 2.15, "door")],
            "R": [(1.5, 2.9, .9, 2.2, 1)], "B": [(1.0, 1.6, 1.2, 2.2, 1), (3.8, 5.2, 1.4, 2.3, 2)]}, brk={"R": (ry + hd,), "L": (hd - ry,)}, ceiling=ef - .14)
    room_shell(a, -hw + .1, hw - .1, -hd + .1, hd - .1, .01, ef - .15)
    o = .55
    s0, s1 = (rz - ef) / (ry + hd), (eb - rz) / (hd - ry)
    roof(a, "roof", [(-hd - o, ef - s0 * o + .09), (ry, rz + .09), (hd + o, eb + s1 * o + .09)], "x", -hw - .45, hw + .45, .17)
    y0, y1 = -.9, .2                                                               # skylight on the long slope
    loft(a["frame"], [[(x, y0, z_at(y0) + .16), (x, y1, z_at(y1) + .16), (x, y1, z_at(y1) + .26), (x, y0, z_at(y0) + .26)] for x in (-.9, .7)])
    small_room(a, put, w, d)
    return a


def terrace(rng):
    a = Accs()
    w, d = SIZE["terrace"]
    hw, hd, g = w / 2, d / 2, 2.85
    put = props(a, rng)
    storey(a, "wall2", -hw, hw, -hd, hd, 0, g, {"F": [(2.0, 6.6, 0, 2.4, 4)], "L": [(hd - DOOR_Y - .5, hd - DOOR_Y + .5, 0, 2.2, "door")],
           "R": [(1.2, 2.6, .8, 2.2, 1)], "B": [(1.0, 1.6, 1.0, 2.2, 1), (4.2, 5.0, 1.0, 2.2, 1)]}, ceiling=g - .1)
    room_shell(a, -hw + .1, hw - .1, -hd + .1, hd - .1, .01, g - .12)
    box(a["wall"], -hw - .35, hw + .35, -hd - .45, hd + .2, g, g + .22)
    z = g + .22
    x0, x1, y0, y1 = -hw + .15, .9, -hd + 1.35, hd - .15
    storey(a, "wall", x0, x1, y0, y1, z, {"F": lambda t: z + 2.45 + .10 * t, "R": z + 2.45 + .1 * (x1 - x0), "L": z + 2.45, "B": lambda t: z + 2.45 + .1 * (x1 - x0 - t)},
           {"F": [(.5, 1.5, z + .8, z + 1.9, 1), (2.2, 4.1, z, z + 2.15, 2)], "R": [(.4, 1.5, z, z + 2.15, 1)], "B": [(1.6, 2.2, z + .9, z + 1.9, 1)]}, ceiling=z + 2.35)
    room_shell(a, x0 + .1, x1 - .1, y0 + .1, y1 - .1, z + .01, z + 2.34)
    roof(a, "roof2", [(x0 - .5, z + 2.45 - .05 + .12), (x1 + .6, z + 2.45 + .1 * (x1 - x0 + .6) + .12)], "y", y0 - .5, y1 + .35, .16)
    e = .10
    path = [(-hw - .2 + e, y0), (-hw - .2 + e, -hd - .3), (hw + .2, -hd - .3), (hw + .2, hd + .05), (x1, hd + .05)]   # roof-terrace rail
    ribbon(a["rail"], path, -.02, .02, z + 1.0, z + 1.04)
    for p, q in zip(path, path[1:]):
        a["glass_rail"].facing([(*p, z + .08), (*q, z + .08), (*q, z + .98), (*p, z + .98)], [(0, 1, 2, 3)], lambda c: (c[0], c[1], 0))
        k = max(1, int(math.dist(p, q) / 1.8))
        for i in range(k + 1):
            x, y = p[0] + (q[0] - p[0]) * i / k, p[1] + (q[1] - p[1]) * i / k
            box(a["rail"], x - .018, x + .018, y - .018, y + .018, z, z + 1.02)
    put("cafe_set", 2.3, -.2, z)
    small_room(a, put, w, d)
    put("sofa", -.6, .9, z + .01)
    box(a["warm"], -1.6, -.6, .4, .5, z + 2.28, z + 2.31)
    return a


def build(kind, rng):
    if kind == "main":
        return villa(*SIZE["main"], "-x", True, rng)
    if kind == "second":
        return P.mirrored(villa(*SIZE["second"], "+x", True, rng))
    return {"gable": gable, "gable2": gable2, "ridge": ridge, "terrace": terrace}[kind](rng)
