"""Q09-C 空中步廊漫遊市集 / 空中回廊の寄り道市場 (design document Q09-C_Afterwork; reference: Q09_Afterwork sheet p.2,
right image C, `.dream-loop/q09c/target.png`).

Run:  blender -b --factory-startup --python-exit-code 1 -P build_skywalk_market.py [-- --massing] [--no-export]
Writes q09c-skywalk-market.blend (asset + preview staging), the city GLB q09c-skywalk-market.glb (asset only) and
report.json beside this file. --massing builds the grey model (paving, shops as blocks, stair, landing, skywalks,
canopy courtyard, lift, canopies) into q09c-skywalk-market-massing.blend for locking the fork camera.

Blender coordinates, real metres; every layout number lives in market.py. Origin = the entrance floor at the street
mouth, +y into the block toward the sea-side exit. A 6 m entrance street forks into two 4 m curved lanes (teal tile
edges) round a planted courtyard and meets again at the sea-side exit; six small shops face the lanes (pottery left and
books right at the fork, each showing half its front at the first corner); light curved canopies on ribs and slim
posts along the shop side, draining into planters; low reading walls. Upper level: a 3 m stair from the planted wedge
at the fork to a landing at +2.5 m, two skywalks branching from it (14 risers each, then level curved decks at +5 m on
pearl-clad curved beams with glass rails and recessed lights) round to the two sides of the tree-canopy courtyard (+5 m,
14 x 10 m on a ribbed teal-lit trunk, trees and benches), and a glass lift from the courtyard to the rear lane.

Nodes: Q09C_SkywalkMarket > GROUND (PAVING, SHOPS, CANOPIES, COURTYARD_GROUND), UPPER (STAIR_LANDING, SKYWALK_L,
SKYWALK_R, CANOPY_COURTYARD, LIFT), SITE. Preview staging (sky, far shore, figures, route overlay) is never exported.
"""
import importlib.util
import json
import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)
sys.path.insert(0, HERE)


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


K = _load("q04a_parts", os.path.join(MODELS, "q04a-suspended-pod-tower", "parts.py"))
QA = _load("q09a_build", os.path.join(MODELS, "q09a-wing-wellness", "build_wing_wellness.py"))   # Frame, kit, GLB patch
import market as L  # noqa: E402

G, M = K.G, K.M
Accs, loft, lathe, ring, pipe, beam, srgb = K.Accs, K.loft, K.lathe, K.ring, K.pipe, K.beam, K.srgb
Frame, box, kit, kit_yaw = QA.Frame, QA.box, QA.kit, QA.kit_yaw

ASSET = "q09c-skywalk-market"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MASSING = "--massing" in ARGS
V2 = "--v2" in ARGS                      # v2 (2026-11-29): wider fork, deeper bridge sides, teal band, signs; *-v2 files
OUT = ASSET + ("-v2" if V2 else "")
if V2:
    L.BRIDGE_SPLIT = L.BRIDGE_SPLIT_V2
CLAD_DROP = L.CLAD_DROP_V2 if V2 else 0.0


def strip(acc, pts, w0, w1, z0, z1):
    """Solid band along a plan polyline, from offset w0 to w1 (left normal positive), z0..z1."""
    secs = []
    n = len(pts)
    for i, p in enumerate(pts):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, n - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(tx, ty) or 1
        nx, ny = -ty / ln, tx / ln
        secs.append([(p[0] + nx * w0, p[1] + ny * w0, z0), (p[0] + nx * w1, p[1] + ny * w1, z0),
                     (p[0] + nx * w1, p[1] + ny * w1, z1), (p[0] + nx * w0, p[1] + ny * w0, z1)])
    loft(acc, secs)


def strip_z(acc, pts, zs, w0, w1, d0, d1):
    """Band along a polyline whose top follows zs (per point): from zs + d0 to zs + d1."""
    secs = []
    n = len(pts)
    for i, p in enumerate(pts):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, n - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(tx, ty) or 1
        nx, ny = -ty / ln, tx / ln
        z = zs[i]
        secs.append([(p[0] + nx * w0, p[1] + ny * w0, z + d0), (p[0] + nx * w1, p[1] + ny * w1, z + d0),
                     (p[0] + nx * w1, p[1] + ny * w1, z + d1), (p[0] + nx * w0, p[1] + ny * w0, z + d1)])
    loft(acc, secs)


def lane_pts(s, t0, t1, off=0.0, step=3.0):
    n = max(2, int(abs(t1 - t0) / step))
    return [L.lane_point(s, t0 + (t1 - t0) * i / n, off) for i in range(n + 1)]


# --- ground: paving, lanes, courtyard ring, reading walls -----------------------------------------------------------------------------
def paving(rng):
    a = Accs()
    x0, x1, y0, y1 = L.BLOCK
    box(a["paving_base"], x0, x1, y0, y1, -.3, 0)
    hw = L.LANE_W / 2
    box(a["stone"], -L.ENTRY_W / 2, L.ENTRY_W / 2, y0, L.lane_point(1, -90)[1] + .5, 0, .03)    # entrance street
    box(a["stone"], -L.EXIT_W / 2, L.EXIT_W / 2, L.lane_point(1, 90)[1] - .5, y1, 0, .03)     # sea-side exit street
    for s in (-1, 1):
        pts = lane_pts(s, -90, 90, 0, 2.0)
        strip(a["stone"], pts, -hw, hw, 0, .03)
        if MASSING:
            continue
        for e in (-hw, hw - .3):                                            # teal ceramic tile edges mark the branches
            strip(a["teal_tile"], pts, e, e + .3, .03, .036)
        strip(a["edge_light"], pts, hw + .02, hw + .06, 0, .05)
    if not MASSING:
        for y in [y0 + .9 * i for i in range(1, int(9 / .9))]:              # paving joints in the entrance street
            box(a["joint"], -L.ENTRY_W / 2, L.ENTRY_W / 2, y - .01, y + .01, .03, .034)
        for x in (-L.ENTRY_W / 2 - .05, L.ENTRY_W / 2 + .01):
            box(a["edge_light"], x, x + .04, y0, 8.2, 0, .05)
    return a


def courtyard_ground(rng):
    """The planted courtyard inside the lanes: a planting ring with low reading walls on the lane side, trees, the trunk
    of the canopy courtyard; nothing on the lanes."""
    a = Accs()
    ai, bi = L.LANE_AB[0] - L.LANE_W / 2, L.LANE_AB[1] - L.LANE_W / 2
    pts = [(L.LANE_C[0] + (ai - .1) * math.cos(math.radians(t)), L.LANE_C[1] + (bi - .1) * math.sin(math.radians(t))) for t in range(0, 361, 6)]
    loft(a["planter"], [[(x, y, z) for x, y in pts[:-1]] for z in (0, .45)])
    inner = [(L.LANE_C[0] + (ai - .5) * math.cos(math.radians(t)), L.LANE_C[1] + (bi - .5) * math.sin(math.radians(t))) for t in range(0, 361, 6)]
    loft(a["soil"], [[(x, y, z) for x, y in inner[:-1]] for z in (.4, .5)])
    if MASSING:
        return a
    for s in (-1, 1):                                                       # reading walls (seat height) on the lane side
        for t0, t1 in ((-30, -5), (20, 45)):
            ptsw = [(L.LANE_C[0] + s * (ai - .1) * math.cos(math.radians(t)), L.LANE_C[1] + (bi - .1) * math.sin(math.radians(t)))
                    for t in range(t0, t1 + 1, 3)]
            strip(a["seat_wood"], ptsw, -.05 * s, .45 * s, .45, .5)
    for k in range(48):                                                     # hydrangea / lavender bed
        t = rng.uniform(0, 360)
        r = rng.uniform(.7, .95)
        c = (L.LANE_C[0] + (ai - .9) * r * math.cos(math.radians(t)), L.LANE_C[1] + (bi - .9) * r * math.sin(math.radians(t)), .5)
        if abs(c[0]) < 2.3 and c[1] < L.landing_y()[1] + .5:
            continue                                                       # keep the stair foot clear
        sz = rng.uniform(.35, .6)
        M.leaf_clump(K.ctx(a, rng, *c), (0, sz * .5, 0), (sz, sz * .8, sz), ("pod_p", "leaf_l") if k % 3 else ("pod_y", "green"),
                     "green", 14, .22, .35, 2)
    return a


# --- shops ------------------------------------------------------------------------------------------------------------------------------
def shop(a, rng, c, face, depth, width, eave, kind):
    """Small pavilion at centre c facing `face`: curved glass front, a pearl-tiled curved roof, warm interior, storage
    behind (deliveries from the back)."""
    ln = math.hypot(*face)
    n = (-face[0] / ln, -face[1] / ln)                                     # n: from the front back into the shop
    F = Frame(c[0], c[1], 0, face)                                          # local +y: the front
    hw, hd = width / 2, depth / 2
    F.box(a["wall_white"], -hw, hw, -hd, -hd + .2, 0, eave)                  # back and side walls
    for sx in (-1, 1):
        F.box(a["wall_white"], sx * hw - (.2 if sx > 0 else 0), sx * hw + (0 if sx > 0 else .2), -hd, hd - 1.2, 0, eave)
    F.box(a["shop_floor"], -hw, hw, -hd, hd, 0, .05)
    # curved glass front: an arc bowing toward the lane, slim bronze mullions
    arc = [(-hw + width * i / 12, hd - 1.2 + .9 * math.sin(math.pi * i / 12)) for i in range(13)]
    for (x0_, y0_), (x1_, y1_) in zip(arc, arc[1:]):
        loft(a["glass"], [[F.p(x0_, y0_ - .015, z), F.p(x1_, y1_ - .015, z), F.p(x1_, y1_ + .015, z), F.p(x0_, y0_ + .015, z)] for z in (.05, eave - .35)])
    if not MASSING:
        for x_, y_ in arc[::3]:
            F.box(a["bronze"], x_ - .03, x_ + .03, y_ - .03, y_ + .03, .05, eave - .35)
    # roof: pearl tiles on a curved shell overhanging the front, a warm soffit
    rows = []
    for j in range(9):
        y = -hd - .3 + (depth + 1.5) * j / 8
        z = eave + .15 + .35 * math.sin(math.pi * j / 8) - .2 * (j / 8)
        rows.append([F.p(x, y, z) for x in (-hw - .3, hw + .3)] + [F.p(x, y, z + .14) for x in (hw + .3, -hw - .3)])
    loft(a["pearl"], rows)
    if MASSING:
        return
    for j in range(1, 8):                                                   # tile seams
        y = -hd - .3 + (depth + 1.5) * j / 8
        z = eave + .15 + .35 * math.sin(math.pi * j / 8) - .2 * (j / 8)
        F.box(a["pearl_seam"], -hw - .3, hw + .3, y - .015, y + .015, z + .14, z + .155)
    F.box(a["soffit"], -hw, hw, -hd, hd + .3, eave - .36, eave - .34)
    F.box(a["edge_light"], -hw - .3, hw + .3, hd + 1.15, hd + 1.2, eave - .02, eave + .03)
    # store behind (deliveries come in from the back)
    F.box(a["store"], -hw + .3, hw - .3, -hd - 1.6, -hd, 0, 2.6)
    F.box(a["bronze"], -.5, .5, -hd - 1.62, -hd - 1.6, 0, 2.2)
    # interiors by kind
    if kind == "pottery":
        for x in (-hw + .25, hw - .25):                                     # oak shelves with vases
            F.box(a["oak"], x - .15, x + .15, -hd + .3, hd - 1.6, 0, 2.2)
            for z in (.6, 1.1, 1.6):
                F.box(a["oak"], x - .18, x + .18, -hd + .3, hd - 1.6, z - .03, z)
                for i in range(4):
                    y = -hd + .6 + i * (depth - 2.3) / 4
                    p = F.p(x, y, z)
                    lathe(a["glaze_%d" % ((i + int(z * 10)) % 3)], [(0, z), (.07, z), (.11, z + .1), (.06, z + .22), (.05, z + .26), (0, z + .26)], 10, p[0], p[1])
        F.box(a["oak"], -.5, .5, .2, 1.0, 0, .75)                           # potter's wheel table
        wp = F.p(0, .6, .75)
        lathe(a["wheel"], [(0, .75), (.25, .75), (.25, .82), (0, .82)], 16, wp[0], wp[1])
        lathe(a["clay"], [(0, .82), (.1, .82), (.12, .9), (.07, 1.0), (0, 1.0)], 12, wp[0], wp[1])
        for i, x in enumerate((-.9, .9)):                                   # vases on stone plinths at the front, outside
            p = F.p(x, hd + .6, 0)
            F.box(a["plinth"], x - .3, x + .3, hd + .3, hd + .9, 0, .85)
            lathe(a["glaze_%d" % i], [(0, .85), (.12, .85), (.2, 1.05), (.1, 1.35), (.08, 1.45), (0, 1.45)], 14, p[0], p[1])
    elif kind == "books":
        for x in (-hw + .25, hw - .25):                                     # shelves on both side walls, facing in
            for j in range(3):
                kit(a, rng, "bookshelf", *F.p(x, -hd + .9 + j * 1.05, 0)[:2], 0, ((-1 if x > 0 else 1) * F.T.col[0][0], (-1 if x > 0 else 1) * F.T.col[0][1]))
        F.box(a["oak"], -.6, .6, -.2, .6, 0, .8)                            # display table with books laid open
        for i in range(6):
            F.box(a["book_%d" % (i % 3)], -.5 + i * .17, -.36 + i * .17, -.1, .45, .8, .84)
        kit(a, rng, "bench", *F.p(0, hd + .5, 0)[:2], 0, (n[0], n[1]))      # corner bench outside
    else:
        props = {"tea": ("cafe_set", "potted_plant"), "flowers": ("planter_1m", "potted_plant"), "crafts": ("bookshelf", "potted_plant"),
                 "cafe": ("cafe_set", "cafe_set")}[kind]
        kit(a, rng, props[0], *F.p(-.6, 0, 0)[:2], 0, (-n[0], -n[1]))
        kit(a, rng, props[1], *F.p(.8, .6, 0)[:2], 0, (-n[0], -n[1]))
        F.box(a["oak"], -hw + .3, hw - .3, -hd + .25, -hd + .6, 0, 1.0)     # counter along the back
    F.box(a["sign"], -1.0, 1.0, hd + .55, hd + .58, eave - .75, eave - .5)
    F.box(a["interior_glow"], -hw + .2, hw - .2, -hd + .21, -hd + .23, .3, eave - .5)


def shops(rng):
    a = Accs()
    for kind, c, face, depth, width, eave in L.FIRST_SHOPS:
        shop(a, rng, c, face, depth, width, eave, kind)
    for side, t, depth, width, eave, kind in L.LANE_SHOPS:
        n = L.lane_normal(side, t)
        edge = L.lane_point(side, t, L.LANE_W / 2)
        c = (edge[0] + n[0] * (.6 + depth / 2), edge[1] + n[1] * (.6 + depth / 2))
        shop(a, rng, c, (-n[0], -n[1]), depth, width, eave, kind)
    return a


# --- canopies -------------------------------------------------------------------------------------------------------------------------
def canopies():
    """Three light curved canopies: one along each lane's shop side and one over the entrance street's edge; ribbed
    segments on slim posts at the lane's outer edge, each segment draining into the planter at its post."""
    a = Accs()
    runs = []
    for s, t0, t1 in L.CANOPY_T:
        runs.append([L.lane_point(s, t0 + (t1 - t0) * i / 24, L.LANE_W / 2 + .15) for i in range(25)])
    for t0, t1 in L.CANOPY_REAR:                                            # rear arc, courtyard side (t past 90 = right)
        runs.append([L.lane_point(-1, t0 + (t1 - t0) * i / 9, -(L.LANE_W / 2 + .15)) for i in range(10)])
    for pts in runs:
        zs = [L.CANOPY_H + .25 * math.sin(math.pi * i / (len(pts) - 1)) for i in range(len(pts))]
        strip_z(a["canopy"], pts, zs, -1.1, 1.1, 0, .08)
        if MASSING:
            continue
        strip_z(a["edge_light"], pts, zs, -1.12, -1.08, -.06, 0)
        for i in range(0, len(pts), 3):                                     # ribs and posts, a planter at each post
            p = pts[i]
            a_, b_ = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
            tx, ty = b_[0] - a_[0], b_[1] - a_[1]
            ln = math.hypot(tx, ty) or 1
            nx, ny = -ty / ln, tx / ln
            pipe(a["canopy_rib"], [(p[0] - nx * 1.1, p[1] - ny * 1.1, zs[i] - .02), (p[0], p[1], zs[i] - .25), (p[0] + nx * 1.1, p[1] + ny * 1.1, zs[i] - .02)], .04, n=5)
            pipe(a["canopy_rib"], [(p[0], p[1], 0), (p[0], p[1], zs[i] - .25)], .06, n=8)
            lathe(a["planter"], [(0, 0), (.42, 0), (.42, .45), (0, .45)], 12, p[0], p[1])
            pipe(a["canopy_rib"], [(p[0] + .07, p[1], zs[i] - .3), (p[0] + .07, p[1], .45)], .025, n=4)   # downpipe into it
    return a


# --- upper level --------------------------------------------------------------------------------------------------------------------
def stair_landing():
    a = Accs()
    x0, x1 = L.LANDING[0], L.LANDING[1]
    for k in range(14):                                                     # 14 risers, 13 treads, then the landing
        y = L.STAIR_Y0 + k * L.TREAD
        z1 = (k + 1) * L.RISER
        box(a["stair"], x0, x1, y, y + L.TREAD + (.0 if k < 13 else .02), z1 - .05, z1)
        box(a["stair_riser"], x0, x1, y - .02, y, z1 - L.RISER, z1)
        if not MASSING:
            box(a["edge_light"], x0 + .05, x1 - .05, y + .02, y + .05, z1 - .06, z1 - .05)
    ly0, ly1 = L.landing_y()
    box(a["stair"], x0, x1, ly0, ly1, L.LANDING_Z - .3, L.LANDING_Z)
    # stringers: pearl-clad curved side beams under the stair; glass rails
    for sx in (x0 - .12, x1 + .12):
        pts = [(L.STAIR_Y0 - .2, 0), (L.STAIR_Y0 + 13 * L.TREAD, L.LANDING_Z), (ly1, L.LANDING_Z)]
        loft(a["pearl"], [[(sx - .1, y, max(0.0, z - .55)), (sx + .1, y, max(0.0, z - .55)), (sx + .1, y, z + .05), (sx - .1, y, z + .05)]
                          for y, z in pts])
        if not MASSING:
            loft(a["glass_rail"], [[(sx - .015, y, z + .05), (sx + .015, y, z + .05), (sx + .015, y, z + 1.1), (sx - .015, y, z + 1.1)] for y, z in pts])
            pipe(a["bronze"], [(sx, y, z + 1.12) for y, z in pts], .03, n=6)
            if V2:                                                              # teal band up both stringers to the landing
                o = sx + (.105 if sx > 0 else -.105)
                band = [(y, max(z - .3, .05), max(z - .22, .13)) for y, z in pts]     # kept above the ground at the foot
                for run in (band[:2], band[1:]):
                    loft(a["teal_band"], [[(o - .01, y, z0), (o + .01, y, z0), (o + .01, y, z1), (o - .01, y, z1)] for y, z0, z1 in run])
    for x in (x0 + .2, x1 - .2):                                            # landing columns (in the planted wedge)
        pipe(a["column"], [(x, ly1 - .4, 0), (x, ly1 - .4, L.LANDING_Z - .3)], .12, n=10)
    box(a["stair_riser"], x0 - .2, x1 + .2, L.STAIR_Y0 - .25, L.STAIR_Y0, 0, .03)
    return a


def skywalk(s):
    """Skywalk s: from the landing's side, 14 risers up a curved stepped deck, then a level curved deck at +5 m, on a
    pearl-clad curved beam, glass rails both sides, recessed lights in the deck edge; slim columns in the planting ring."""
    a = Accs()
    pts = L.bridge_path(s, L.BRIDGE_N)
    n = len(pts) - 1
    seg_z = [L.bridge_z((i + .5) / n) for i in range(n)]                        # tread height of each segment
    # rails, beam and cladding follow a smooth line: from one riser over the landing up to the deck over the steps
    zs = [min(L.DECK_Z, L.LANDING_Z + L.RISER_B + (L.DECK_Z - L.LANDING_Z - L.RISER_B) * min(1.0, (i / n) / .42)) for i in range(n + 1)]
    hw = L.BRIDGE_W / 2
    # deck: one flat tread per step (3 segments each), then the level deck
    for i in range(n):
        strip(a["deck"], [pts[i], pts[i + 1]], -hw, hw, seg_z[i] - .12, seg_z[i])
    # curved beam under the deck, pearl cladding along both sides (follows a smooth soffit line under the steps)
    soff = [z - .9 for z in zs]
    strip_z(a["beam"], pts, soff, -1.0, 1.0, 0, .6)
    for side_off in (-hw - .1, hw + .02):
        strip_z(a["pearl"], pts, soff, side_off, side_off + .08, -.08 - CLAD_DROP, .78)
    if V2:                                                                      # the bridge body underneath, closed
        strip_z(a["pearl"], pts, soff, -hw - .1, hw + .1, -.08 - CLAD_DROP, -.02 - CLAD_DROP)
    if V2 and not MASSING:                                                      # continuous teal band in both sides
        for o in (-hw - .115, hw + .105):
            strip_z(a["teal_band"], pts, soff, o, o + .01, .5, .58)
    if not MASSING:
        for side_off in (-hw, hw):
            strip_z(a["glass_rail"], pts, [z for z in zs], side_off - .02 if side_off > 0 else side_off, side_off + .02 if side_off < 0 else side_off, 0, 1.1)
            strip_z(a["bronze"], pts, zs, side_off - .03, side_off + .03, 1.08, 1.14)
            strip_z(a["edge_light"], pts, zs, side_off * .96 - .02, side_off * .96 + .02, 0, .012)
    # columns: in the planting ring, away from the lanes
    for u in (.3, .62):
        i = int(u * n)
        p = pts[i]
        ai, bi = L.LANE_AB[0] - L.LANE_W / 2 - 1.0, L.LANE_AB[1] - L.LANE_W / 2 - 1.0
        dx, dy = p[0] - L.LANE_C[0], p[1] - L.LANE_C[1]
        f = 1.0 / max(1.0, math.hypot(dx / ai, dy / bi))                      # pull the foot inside the planting ring
        foot = (L.LANE_C[0] + dx * f, L.LANE_C[1] + dy * f)
        top = soff[i]
        pipe(a["column"], [(foot[0], foot[1], 0), (p[0] * .5 + foot[0] * .5, p[1] * .5 + foot[1] * .5, top * .6), (p[0], p[1], top)], .14, .11, n=10)
    return a, {"start": [round(pts[0][0], 2), round(pts[0][1], 2), zs[1]], "end": [round(pts[-1][0], 2), round(pts[-1][1], 2), zs[-1]]}


def canopy_courtyard(rng):
    """The tree-canopy courtyard at +5 m: an elliptical deck on a ribbed trunk lit teal, pearl fascia, glass rail with
    openings for the two skywalks and the lift, planters with trees (one in blossom), benches."""
    a = Accs()
    cx, cy = L.PLATFORM_C
    ax, by = L.PLATFORM_AB
    n = 64
    ell = lambda sc, z: [(cx + ax * sc * math.cos(2 * math.pi * i / n), cy + by * sc * math.sin(2 * math.pi * i / n), z) for i in range(n)]  # noqa: E731
    loft(a["deck"], [ell(1.0, L.DECK_Z - .25), ell(1.0, L.DECK_Z)])
    loft(a["pearl"], [ell(.55, L.DECK_Z - 1.2), ell(.85, L.DECK_Z - .7), ell(1.0, L.DECK_Z - .35), ell(1.02, L.DECK_Z - .2), ell(1.02, L.DECK_Z - .05)],
         wrap=False, caps=True)
    # ribbed trunk: ribs splaying from a 1.1 m root up to the deck's underside, teal light between them
    for k in range(18):
        t = 2 * math.pi * k / 18
        pts = []
        for i in range(9):
            f = i / 8
            r = .9 + 4.0 * f ** 2.2
            pts.append((cx + r * math.cos(t) * (ax / by if f > .5 else 1) ** f, cy + r * math.sin(t), (L.DECK_Z - 1.15) * f))
        pipe(a["trunk_rib"], pts, .16, .1, n=6)
    lathe(a["trunk_glow"], [(0, 0), (.95, 0), (.75, 2.0), (1.4, 3.6), (0, 3.6)], 18, cx, cy)
    if MASSING:
        return a
    # rail with openings at the skywalk ends (sides) and the lift (back)
    gaps = [(170, 196), (-16, 10), (78, 102)]
    for i in range(n):
        deg = 360.0 * i / n
        d2 = ((deg + 180) % 360) - 180
        if any(g0 <= deg <= g1 or g0 <= d2 <= g1 for g0, g1 in gaps):
            continue
        p0, p1 = ell(.99, L.DECK_Z)[i], ell(.99, L.DECK_Z)[(i + 1) % n]
        loft(a["glass_rail"], [[(p0[0], p0[1], z), (p1[0], p1[1], z), (p1[0] + .001, p1[1] + .02, z), (p0[0] + .001, p0[1] + .02, z)] for z in (L.DECK_Z, L.DECK_Z + 1.1)])
        pipe(a["bronze"], [(p0[0], p0[1], L.DECK_Z + 1.12), (p1[0], p1[1], L.DECK_Z + 1.12)], .03, n=5)
    ring_pts = ell(1.03, 0)
    for i in range(n):
        p0, p1 = ring_pts[i], ring_pts[(i + 1) % n]
        loft(a["edge_light"], [[(p0[0], p0[1], z), (p1[0], p1[1], z), (p1[0], p1[1] + .02, z), (p0[0], p0[1] + .02, z)] for z in (L.DECK_Z - .37, L.DECK_Z - .33)])
    # planters with trees, benches
    for k, (dx, dy, blossom) in enumerate(((-3.6, 1.6, False), (0.2, 2.6, True), (3.8, 1.2, False), (-2.0, -1.4, False), (2.4, -1.8, False))):
        p = (cx + dx, cy + dy)
        lathe(a["planter"], [(0, L.DECK_Z), (1.0, L.DECK_Z), (1.0, L.DECK_Z + .5), (0, L.DECK_Z + .5)], 16, *p)
        lathe(a["soil"], [(0, L.DECK_Z + .5), (.9, L.DECK_Z + .5), (.9, L.DECK_Z + .54), (0, L.DECK_Z + .54)], 16, *p)
        M.leafy_tree(K.ctx(a, rng, p[0], p[1], L.DECK_Z + .5), (0, 0, 0), h=rng.uniform(4.0, 5.0) if not blossom else 5.4,
                     crown=2.0 if not blossom else 2.6, trunk="wood", roles=("pod_p", "white") if blossom else ("leaf_l", "green"),
                     core="pod_p" if blossom else "green", n=90, size=.38, branches=4)
    for dx, dy, face in ((-4.8, -.6, (1, 0)), (4.8, -.4, (-1, 0)), (0.0, -3.4, (0, 1))):
        kit(a, rng, "bench", cx + dx, cy + dy, L.DECK_Z, face)
    return a


def lift():
    a = Accs()
    x0, x1, y0, y1 = L.LIFT
    top = L.DECK_Z + 3.0
    for x in (x0, x1):
        for y in (y0, y1):
            box(a["bronze"], x - .06, x + .06, y - .06, y + .06, 0, top)
    box(a["lift_glass"], x0, x1, y0, y0 + .03, L.DECK_Z + 2.4, top)              # glass shaft (doors left open on y0 / y1)
    for x in (x0, x1 - .03):
        box(a["lift_glass"], x, x + .03, y0, y1, 0, top)
    box(a["lift_glass"], x0, x1, y1 - .03, y1, 2.4, top)
    box(a["pearl"], x0 - .15, x1 + .15, y0 - .15, y1 + .15, top, top + .3)
    box(a["lift_car"], x0 + .1, x1 - .1, y0 + .1, y1 - .1, L.DECK_Z, L.DECK_Z + 2.3)
    box(a["deck"], x0 - .2, x1 + .2, L.PLATFORM_C[1] + L.PLATFORM_AB[1] - .4, y0 + .02, L.DECK_Z - .25, L.DECK_Z)   # deck bridge to the car
    box(a["stone"], x0 - .4, x1 + .4, y1, L.LANE_C[1] + L.LANE_AB[1] - L.LANE_W / 2 + .1, 0, .04)   # path from the door to the lane
    if not MASSING:
        box(a["sign"], x0 + .4, x1 - .4, y1 + .02, y1 + .04, 2.5, 2.8)
    return a


# --- materials -------------------------------------------------------------------------------------------------------------------------
def mat(name, hexc, rough=.6, metal=0.0, alpha=1.0, emit=None, strength=1.0, culling=True):
    m = G.material("q09c_" + name, srgb(hexc, alpha), rough, srgb(emit) if emit else None, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


def pearl(name, hexc, film):
    m = mat(name, hexc, .18, .25, emit=hexc, strength=.12)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    for key, val in (("Thin Film Thickness", film), ("Thin Film IOR", 1.45), ("Coat Weight", .6), ("Coat Roughness", .05)):
        if key in b.inputs:
            b.inputs[key].default_value = val
    return m


FILM_NM = {"q09c_pearl_cladding": (380.0, 640.0), "q09c_pearl_roof": (420.0, 680.0)}


# --- v2 signs ----------------------------------------------------------------------------------------------------------------------
def face_quad(c, n, w, h, z0):
    """Vertical quad centred on plan point c, bottom z0, facing plan direction n; corners in UV order (0,0) (1,0) (1,1)
    (0,1), so the picture reads left to right for someone looking at it."""
    ln = math.hypot(*n)
    nx, ny = n[0] / ln, n[1] / ln
    rx, ry = -ny, nx                                                            # the viewer's right
    x0, y0 = c[0] - rx * w / 2, c[1] - ry * w / 2
    x1, y1 = c[0] + rx * w / 2, c[1] + ry * w / 2
    return [(x0, y0, z0), (x1, y1, z0), (x1, y1, z0 + h), (x0, y0, z0 + h)]


def sign_mat(name, path, glow, alpha=1.0):
    m = bpy.data.materials.new("q09c_" + name)
    nt = m.node_tree
    b = next(nd for nd in nt.nodes if nd.type == "BSDF_PRINCIPLED")
    tn = nt.nodes.new("ShaderNodeTexImage")
    tn.image = bpy.data.images.load(path, check_existing=True)
    nt.links.new(tn.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tn.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = glow
    b.inputs["Roughness"].default_value = .3
    b.inputs["Alpha"].default_value = alpha
    m.use_backface_culling = True
    if alpha < 1:
        # the glTF exporter keeps a textured material's translucency only from the image's alpha, so write it there
        import numpy as np
        img = tn.image
        px = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        px[3::4] = alpha
        img.pixels.foreach_set(px)
        img.filepath_raw = path
        img.file_format = "PNG"
        img.save()
        nt.links.new(tn.outputs["Alpha"], b.inputs["Alpha"])
        m.surface_render_method = "BLENDED"
    return m


def signs_v2(col, parent, tex):
    """The four signs as textured quads (one object) and their frames (an Accs): the pottery lightbox 「うつわ」 (both
    faces), the bookshop blade 「古書」 (both faces) on a bracket, the stair's translucent screen 「空中庭園 ↑」 on a post,
    the day poster 「本日、陶芸体験」 on a corner wall."""
    mats = [sign_mat("sign_utsuwa", tex["utsuwa"], 2.2), sign_mat("sign_kosho", tex["kosho"], .9),
            sign_mat("sign_garden", tex["garden"], 1.6, alpha=.72), sign_mat("poster_touge", tex["poster"], .35)]
    quads, a = [], Accs()

    def both(c, n, w, h, z0, mi, depth):
        """A box sign: picture on its front and back (each reads correctly from its side), a dark frame round it."""
        ln = math.hypot(*n)
        nx, ny = n[0] / ln, n[1] / ln
        quads.append((face_quad((c[0] + nx * depth / 2, c[1] + ny * depth / 2), (nx, ny), w, h, z0), mi))
        quads.append((face_quad((c[0] - nx * depth / 2, c[1] - ny * depth / 2), (-nx, -ny), w, h, z0), mi))
        ang = math.atan2(ny, nx) + math.pi / 2
        for dz, hh in ((-.04, .04), (h, .04)):                                  # top and bottom caps
            K.obox(a["sign_frame"], (c[0], c[1], z0 + dz + hh / 2), (w + .06, depth + .02, hh), ang)
        rx, ry = -ny, nx
        for sg in (-1, 1):                                                      # side caps
            K.obox(a["sign_frame"], (c[0] + rx * sg * (w / 2 + .015), c[1] + ry * sg * (w / 2 + .015), z0 + h / 2), (.03, depth + .02, h + .08), ang)

    x, y, w, h, n = L.UTSUWA                                                    # pottery: a standing lightbox
    both((x, y), n, w, h, .3, 0, .16)
    K.obox(a["sign_frame"], (x, y, .15), (w + .1, .3, .3), math.atan2(n[1], n[0]) + math.pi / 2)
    x, y, w, h, z0, n = L.KOSHO                                                 # books: a blade on a bracket
    both((x, y), n, w, h, z0, 1, .06)
    ln = math.hypot(*n)
    fx, fy = -n[1] / ln, n[0] / ln                                              # along the blade: toward the shopfront
    for zz in (z0 + h + .1, z0 + h + .35):
        pipe(a["sign_frame"], [(x - fx * .3, y - fy * .3, zz), (x + fx * .45, y + fy * .45, zz)], .025, n=5)
    pipe(a["sign_frame"], [(x - fx * .1, y - fy * .1, z0 + h + .04), (x - fx * .1, y - fy * .1, z0 + h + .1)], .01, n=4)
    pipe(a["sign_frame"], [(x + fx * .1, y + fy * .1, z0 + h + .04), (x + fx * .1, y + fy * .1, z0 + h + .1)], .01, n=4)
    x, y, w, h, z0 = L.GARDEN_SCREEN                                            # stair screen on a post, faces the entrance
    quads.append((face_quad((x, y - .02), (0, -1), w, h, z0), 2))
    K.box(a["sign_frame"], x - w / 2 - .03, x + w / 2 + .03, y - .01, y + .03, z0 - .03, z0)
    K.box(a["sign_frame"], x - w / 2 - .03, x + w / 2 + .03, y - .01, y + .03, z0 + h, z0 + h + .03)
    pipe(a["sign_frame"], [(x, y + .05, .45), (x, y + .05, z0 + h)], .035, n=6)
    x, y, w, h, z0, n = L.POSTER                                                # corner wall with the day poster
    ln = math.hypot(*n)
    nx, ny = n[0] / ln, n[1] / ln
    ang = math.atan2(ny, nx) + math.pi / 2
    K.obox(a["poster_wall"], (x - nx * .12, y - ny * .12, 1.2), (1.6, .22, 2.4), ang)
    quads.append((face_quad((x + nx * .005, y + ny * .005), (nx, ny), w, h, z0), 3))
    K.obox(a["sign_frame"], (x + nx * .003, y + ny * .003, z0 + h + .03), (w + .08, .02, .04), ang)
    # one object of textured quads
    vs, fs, mi = [], [], []
    for corners, m in quads:
        base = len(vs)
        vs += corners
        fs.append((base, base + 1, base + 2, base + 3))
        mi.append(m)
    me = bpy.data.meshes.new("q09c_signs")
    me.from_pydata(vs, [], fs)
    uv = me.uv_layers.new(name="UVMap")
    for li in range(len(uv.data)):
        uv.data[li].uv = ((0, 0), (1, 0), (1, 1), (0, 1))[li % 4]
    for m in mats:
        me.materials.append(m)
    me.polygons.foreach_set("material_index", mi)
    ob = bpy.data.objects.new("SIGNS", me)
    col.objects.link(ob)
    ob.parent = parent
    return ob, a


def make_materials():
    K.MATS.clear()
    K.MATS.update({
        "pearl": pearl("pearl_cladding", "E9E4EE", 520.0), "pearl_seam": mat("pearl_seam", "B9B3C2", .4, .3),
        "beam": mat("curved_beam", "D9D5DC", .4, .3), "deck": mat("deck_stone", "D8D2C8", .6), "stair": mat("stair_tread", "E3DED4", .5),
        "stair_riser": mat("stair_riser", "C9C2B7", .6), "column": mat("column_white", "E8E5E0", .4, .2),
        "glass_rail": mat("glass_rail", "D8ECF0", .04, alpha=.22, culling=False), "glass": mat("shop_glass", "D4E8EC", .03, alpha=.14, culling=False),
        "lift_glass": mat("lift_glass", "CFE6EC", .03, alpha=.2, culling=False), "lift_car": mat("lift_car", "E6DCCB", .4, emit="FFE3B8", strength=.6),
        "bronze": mat("bronze", "7A5C40", .35, .75), "edge_light": mat("edge_light", "FFE4B8", .4, emit="FFD9A0", strength=7.0),
        "trunk_rib": mat("trunk_rib", "C8A27A", .35, .7), "trunk_glow": mat("trunk_glow", "7FE6D8", .4, emit="4FE0CC", strength=3.0),
        "stone": mat("paving_stone", "9FA3A8", .7), "paving_base": mat("paving_base", "8E9296", .8), "joint": mat("joint", "7A7E82", .8),
        "teal_tile": mat("teal_tile", "3FA39A", .35, .1), "planter": mat("planter", "D8D2C6", .6), "soil": mat("soil", "5A4532", .95),
        "seat_wood": mat("seat_wood", "B88A5A", .5), "canopy": mat("canopy_light", "F2EFEA", .4, emit="FFF4E6", strength=.15),
        "canopy_rib": mat("canopy_rib", "E0DCD4", .35, .4),
        "wall_white": mat("shop_wall", "EFEAE2", .6), "shop_floor": mat("shop_floor", "C9A57A", .5, emit="A67C4C", strength=.1),
        "soffit": mat("shop_soffit", "E7C08E", .5, emit="FFC883", strength=.9), "store": mat("store", "C6C0B6", .7),
        "oak": mat("oak", "B88A5A", .5, emit="7A5530", strength=.08), "plinth": mat("stone_plinth", "D6D2CB", .7),
        "glaze_0": mat("glaze_celadon", "BFE0D6", .2), "glaze_1": mat("glaze_rose", "E6C3CC", .2), "glaze_2": mat("glaze_ivory", "F1EBDD", .2),
        "wheel": mat("potter_wheel", "4A4542", .5, .4), "clay": mat("wet_clay", "A9765A", .5),
        "book_0": mat("book_teal", "3F7F86", .7), "book_1": mat("book_rust", "B0573E", .7), "book_2": mat("book_cream", "EDE2C8", .7),
        "sign": mat("sign_light", "F6EEDF", .4, emit="FFE9C8", strength=3.0),
        "interior_glow": mat("interior_glow", "FFE2B6", .5, emit="FFD9A0", strength=1.2),
        "wood": mat("trunk", "6E5238", .8),
    })
    for role, (rgba, emit, strength) in M.ROLES.items():
        leafy = role in ("leaf_l", "green", "white", "pod_p", "pod_y")
        m = G.material("q09c_in_" + role, rgba, .6, emit, strength)
        m.use_backface_culling = not leafy and rgba[3] >= 1
        K.MATS["in_" + role] = m
    K.MATS["in_pod_p"] = mat("in_blossom", "E9A9C8", .6, culling=False)           # blossoms / hydrangea ride pod_p
    K.MATS["in_pod_y"] = mat("in_hydrangea", "8FA6E0", .6, culling=False)
    K.MATS["pearl_roof"] = pearl("pearl_roof", "ECE7F0", 560.0)
    K.MATS.update({                                                             # v2 band and sign hardware
        "teal_band": mat("teal_band", "45F0D6", .3, emit="3FE8CF", strength=7.0),
        "sign_frame": mat("sign_frame", "3B342E", .4, .7), "poster_wall": mat("poster_wall", "C9B8A2", .8),
    })
    if MASSING:
        grey = mat("massing_grey", "CFCDC8", .8)
        for k, m in list(K.MATS.items()):
            if next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Alpha"].default_value >= 1:
                K.MATS[k] = grey
    return K.MATS


# --- preview staging (never exported) -----------------------------------------------------------------------------------------------
def preview(col, rng):
    mk = lambda n, h, r=.8, **k: K.MATS.setdefault("pv_" + n, mat("pv_" + n, h, r, **k))  # noqa: E731
    mk("ground", "9C9A96", .9)
    mk("block", "D9D2C8", .8)
    mk("water", "3D5D86", .05)
    mk("route_ground", "29C4B0", .5, emit="29C4B0", strength=4.0)
    mk("route_upper", "FFB14A", .5, emit="FFB14A", strength=4.0)
    a = Accs()
    box(a["pv_ground"], -300, 300, -200, 300, -.6, -.31)
    box(a["pv_water"], -3000, 3000, 44, 4000, -2.6, -1.4)
    for s in (-1, 1):                                                       # neighbouring market buildings round the block
        for i in range(5):
            x = s * rng.uniform(29, 45)
            y = rng.uniform(-2, 40)
            box(a["pv_block"], x - 5, x + 5, y - 4, y + 4, 0, rng.uniform(5, 9))
        for i in range(3):
            x = s * rng.uniform(12, 25)
            box(a["pv_block"], x - 5, x + 5, -16, -6, 0, rng.uniform(6, 11))
    ob = bpy.data.objects.new("PV_Context", K.build_mesh("pv_context", a))
    col.objects.link(ob)
    if MASSING:
        return
    # route overlay for the top view only (hidden in other renders by the review script)
    r = Accs()
    gpts = [(0, .5, 7.5), (0, 7.8, 7.5)]
    pipe(r["pv_route_ground"], gpts, .18, n=6)
    for s in (-1, 1):
        pipe(r["pv_route_ground"], [(*L.lane_point(s, t), 7.5) for t in range(-90, 91, 5)], .18, n=6)
    pipe(r["pv_route_ground"], [(0, L.lane_point(1, 90)[1], 7.5), (0, 36, 7.5)], .18, n=6)
    upts = [(0, L.STAIR_Y0, 8.5), (0, sum(L.landing_y()) / 2, 8.5)]
    pipe(r["pv_route_upper"], upts, .2, n=6)
    for s in (-1, 1):
        pipe(r["pv_route_upper"], [(x, y, 8.5) for x, y in L.bridge_path(s, 30)], .2, n=6)
    pipe(r["pv_route_upper"], [(0, L.PLATFORM_C[1], 8.5), (0, sum(L.LIFT[2:]) / 2, 8.5)], .2, n=6)
    ob = bpy.data.objects.new("PV_Routes", K.build_mesh("pv_routes", r))
    col.objects.link(ob)
    p = Accs()                                                              # display figures: own layer, not exported
    spots = [(-1.2, 4.0, (0, 1)), (1.4, 6.5, (0, 1)), (-.6, 11.8, (0, 1)), (.5, 13.0, (0, 1)), (0, 16.0, (1, 1))]
    for s in (-1, 1):
        for t in (-40, 0, 40, 75):
            x, y = L.lane_point(s, t, rng.uniform(-1, 1))
            spots.append((x, y, (rng.uniform(-1, 1), 1)))
    for x, y, face in spots:
        z = 0.0
        if L.STAIR_Y0 <= y <= L.stair_top_y() and abs(x) < 1.5:
            z = (int((y - L.STAIR_Y0) / L.TREAD) + 1) * L.RISER
        elif L.landing_y()[0] <= y <= L.landing_y()[1] and abs(x) < 1.5:
            z = L.LANDING_Z
        M.person(K.ctx(p, rng, x, y, z, kit_yaw(*face)), 0, 0, 0, yaw=0)
    for s in (-1, 1):
        x, y = L.bridge_path(s, 10)[7]
        M.person(K.ctx(p, rng, x, y, L.DECK_Z, kit_yaw(s, 0)), 0, 0, 0, yaw=0)
    for dx, dy in ((-2.0, .2), (1.6, -.8), (3.0, .6)):
        M.person(K.ctx(p, rng, L.PLATFORM_C[0] + dx, L.PLATFORM_C[1] + dy, L.DECK_Z, kit_yaw(0, -1)), 0, 0, 0, yaw=0)
    ob = bpy.data.objects.new("PV_People", K.build_mesh("pv_people", p))
    col.objects.link(ob)


# --- assembly ------------------------------------------------------------------------------------------------------------------------
def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    tex = None
    if V2 and not MASSING:                                                      # sign faces first, in the emptied scene
        import signs
        tex = signs.make_textures(os.path.join(HERE, "textures"))
    make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    rng = random.Random(2127)
    col = bpy.data.collections.new("Q09C_Asset")
    prev = bpy.data.collections.new("Q09C_Preview")
    scene.collection.children.link(col)
    scene.collection.children.link(prev)
    root = bpy.data.objects.new("Q09C_SkywalkMarket", None)
    col.objects.link(root)
    nodes = {}
    for g in ("GROUND", "UPPER", "SITE"):
        e = bpy.data.objects.new(g, None)
        col.objects.link(e)
        e.parent = root
        nodes[g] = e

    def add(name, accs, g, smooth_deg=35):
        if not any(acc.f for acc in accs.values()):
            return None
        ob = bpy.data.objects.new(name, K.build_mesh("q09c_" + name.lower(), accs, smooth_deg))
        col.objects.link(ob)
        ob.parent = nodes[g]
        return ob

    sh = shops(rng)
    if "pearl" in sh:                                                       # shop roofs: their own pearl variant
        sh["pearl_roof"] = sh.pop("pearl")
    add("PAVING", paving(rng), "SITE")
    add("SHOPS", sh, "GROUND")
    add("CANOPIES", canopies(), "GROUND", 50)
    add("COURTYARD_GROUND", courtyard_ground(rng), "GROUND")
    add("STAIR_LANDING", stair_landing(), "UPPER")
    ends = {}
    for s, tag in ((-1, "L"), (1, "R")):
        acc, info = skywalk(s)
        add("SKYWALK_" + tag, acc, "UPPER", 50)
        ends[tag] = info
    add("CANOPY_COURTYARD", canopy_courtyard(rng), "UPPER", 50)
    add("LIFT", lift(), "UPPER")
    if tex:
        _, frames = signs_v2(col, nodes["GROUND"], tex)
        add("SIGN_FRAMES", frames, "GROUND")
    preview(prev, rng)
    bpy.context.view_layer.update()

    asset = [o for o in col.all_objects]
    meshes = [o for o in asset if o.type == "MESH"]
    lo = [min(v[i] for o in meshes for v in o.bound_box) for i in range(3)]
    hi = [max(v[i] for o in meshes for v in o.bound_box) for i in range(3)]
    report = {"massing": MASSING, "tris": sum(K.tris(o.data) for o in meshes), "objects": len(asset),
              "tris_by_object": {o.name: K.tris(o.data) for o in meshes},
              "materials": len({m.name for o in meshes for m in o.data.materials}),
              "bbox_min": [round(v, 2) for v in lo], "bbox_max": [round(v, 2) for v in hi],
              "levels": {"stair_top": round(14 * L.RISER, 3), "landing": L.LANDING_Z, "deck": L.DECK_Z, "skywalks": ends},
              "block": list(L.BLOCK)}
    if "--no-export" not in ARGS and not MASSING:
        glb = os.path.join(HERE, OUT + ".glb")
        for ob in bpy.data.objects:
            ob.select_set(False)
        for ob in asset:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = root
        bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                                  export_animations=False, export_cameras=False, export_lights=False, export_extras=True,
                                  export_materials="EXPORT")
        QA.FILM_NM = FILM_NM                                                    # the Q09-A patch, with this asset's pearl
        report["iridescence_patched"] = QA.add_iridescence(glb)
        report["glb_bytes"] = os.path.getsize(glb)
    import review_skywalk_market as RV
    RV.stage(scene, prev)
    blend = os.path.join(HERE, OUT + ("-massing" if MASSING else "") + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    rep = "report%s%s.json" % ("-v2" if V2 else "", "-massing" if MASSING else "")
    with open(os.path.join(HERE, rep), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps({k: v for k, v in report.items() if k != "tris_by_object"}))


if __name__ == "__main__":
    main()
