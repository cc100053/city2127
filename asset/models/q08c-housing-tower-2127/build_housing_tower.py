"""Q08-C housing tower (redo of 8C, 2026-11-21): a big white frame whose bays are filled at random, by a fixed seed,
with five house types (houses.py), around sky gardens, public terraces, a lift lobby and a delivery rail on top.

Run:  blender -b --factory-startup --python-exit-code 1 -P build_housing_tower.py [-- --seed 2127] [--out DIR] [--no-export]
Writes <out>/q08c-housing-tower-2127[-s<seed>].blend (asset + preview staging) and .glb (asset only) and
<out>/report-s<seed>.json (placement, counts, triangles, clash and entrance checks). Default out = this folder,
default seed = 2127 (the file name carries the seed only when it is not the default).

Coordinates are three.js (x, y up, z) through geo_helpers.B; one unit = one metre; the front and the water face +z
(three.js) = -Y in Blender. Origin: ground-contact centre. Frame as the 8C boat-room tower: 8 x 3 bays of 6 m
(48 x 18 m), a 6 m arcaded ground level, seven 5 m housing levels (roof slab 41 m), a delivery rail at 46 m on arched
loops with a glass canopy. Houses follow the house contract in houses.py; front houses are unrotated with their
origin at (bay centre, level, 3.0); side houses sit in the back bays with their origin at (+-18, level, -6), turned
+-90 deg. Repeated houses share one mesh per type.

Nodes: Q08H_HousingTower (root) > Q08H_Frame, Q08H_Commons (gardens, terraces, lifts, corridors, lobby), Q08H_Rail
(rail beam, loops, canopy), Q08H_Trolley, Q08H_Spreader, Q08H_Houses > Q08H_House_<F|L|R><level>_<bay> (extras
house_type, slot) and Q08H_House_Delivery (hanging in front of slot F4_6).
"""
import json
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common as C  # noqa: E402
from common import Accs, M, X, Z, add_obj, blob, build_mesh, cyl, loft, obox, prism_z, rail, rbox, role_view  # noqa: E402
import houses as H  # noqa: E402
import layout as LY  # noqa: E402
import staging as S  # noqa: E402

ASSET = "q08c-housing-tower-2127"
DEFAULT_SEED = 2127
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OPT = {ARGS[i][2:]: ARGS[i + 1] for i in range(len(ARGS) - 1) if ARGS[i].startswith("--") and not ARGS[i + 1].startswith("--")}
SEED = int(OPT.get("seed", DEFAULT_SEED))
OUT = os.path.abspath(OPT.get("out", HERE))

BAY = 6.0
XS = [-24 + BAY * i for i in range(9)]
ZS = [-9.0, -3.0, 3.0, 9.0]
G, LV, NL = 6.0, 5.0, LY.NL
Y_ROOF = G + NL * LV                         # 41
COL, SLAB = 1.2, .35
CORE = (-15.4, 15.4, -8.6, .4)               # core x0, x1, z0, z1
LOBBY = (-3.2, 3.2, -2.4)                    # lift lobby notch in the core front: x0, x1, back z
GY, GZ = 46.0, 14.3                          # rail beam centre height and line (14.3: clear of every front house)
DELIVERY = ("F", 4, 6)
HANG_Z = GZ - 2.7                            # back face of the hanging house: its lugs straddle the rail line
SIDE_HANG_X = 26.7                           # side slots: back face of a house hanging at the side rail
SIDE_RAIL_X = SIDE_HANG_X + 2.7              # side rails' line (+-)
VOID = (-6.0, 6.0)                           # level-3 slab opening over the sky garden (front bays 3, 4)


def yl(l):
    return G + l * LV


def bay_x(i):
    return -21 + BAY * i


def slot_xform(slot):
    face, l, i = slot
    if face == "F":
        return (bay_x(i), yl(l), 3.0), 0.0
    return ((-18.0 if face == "L" else 18.0), yl(l), -6.0 if i == 0 else 0.0), (-90.0 if face == "L" else 90.0)


def beam_x(acc, x0, x1, y0, y1, z, hd):
    rbox(acc, (x0 + x1) / 2, z, (x1 - x0) / 2, hd, y0, y1, r=.18, b=.08, n=1)


def beam_z(acc, z0, z1, y0, y1, x, hw):
    rbox(acc, x, (z0 + z1) / 2, hw, (z1 - z0) / 2, y0, y1, r=.18, b=.08, n=1)


# --- frame (also the clash-check body) ---------------------------------------------------------------------------------
def build_frame(a):
    x0, x1, z0, z1 = XS[0], XS[-1], ZS[0], ZS[-1]
    w = a["t_white"]
    rbox(a["t_pave"], 0, 0, x1 + 2.2, z1 + 1.2, 0, .15, r=1.0, b=.04)
    for x in XS:
        for z in ZS:
            rbox(w, x, z, COL / 2, COL / 2, .15, Y_ROOF + 1.1, r=.4, b=.05, n=1)
    for l in range(NL + 1):
        y = yl(l)
        if l == 3:                                                           # the sky garden's double-height void
            rbox(w, 0, (-z1 - .55 + 3.0) / 2, x1 + .55, (3.0 + z1 + .55) / 2, y - SLAB, y, r=.5, b=.08)
            for xa, xb in ((-x1 - .55, VOID[0]), (VOID[1], x1 + .55)):
                rbox(w, (xa + xb) / 2, (3.0 + z1 + .55) / 2, (xb - xa) / 2, (z1 + .55 - 3.0) / 2, y - SLAB, y, r=.3, b=.08)
        else:
            rbox(w, 0, 0, x1 + .55, z1 + .55, y - SLAB, y, r=.5, b=.08, n=1)
        for z in (z0, z1):
            for i in range(8):
                beam_x(w, XS[i] + COL / 2, XS[i + 1] - COL / 2, y - 1.1, y - SLAB + .01, z, .5)
        for x in (x0, x1):
            for j in range(3):
                beam_z(w, ZS[j] + COL / 2, ZS[j + 1] - COL / 2, y - 1.1, y - SLAB + .01, x, .5)
        if l < NL:
            for x in XS:                                                       # node collars on the front columns
                rbox(w, x, z1, .75, .75, y - 1.25, y + .3, r=.4, b=.15, n=1)
    cx0, cx1, cz0, cz1 = CORE
    lx0, lx1, lz = LOBBY
    for xa, xb, za, zb in ((cx0, lx0, cz0, cz1), (lx1, cx1, cz0, cz1), (lx0, lx1, cz0, lz)):
        rbox(a["t_core"], (xa + xb) / 2, (za + zb) / 2, (xb - xa) / 2, (zb - za) / 2, G, Y_ROOF - SLAB, r=.3, b=.02)
    # ground level: arcade, flared legs
    for i in range(8):
        cxb, hw = bay_x(i), (BAY - COL) / 2 + .02
        arch = [(cxb + x, y) for x, y in C.arch_xy(hw, 3.0, G - .9, 14)]
        prism_z(w, (arch + [(cxb - hw, G - .4), (cxb + hw, G - .4)])[::-1], z1 - .36, z1 + .36)
    for sx in (-1, 1):
        for sz in (-1, 1):
            x, z = sx * x1, sz * z1
            M.limb(w, M._bez((x, G + 1.0, z), (x + sx * .3, 2.4, z + sz * .2), (x + sx * 4.0, .15, z + sz * 3.0), 10), .65, 1.3, 16)
    for i in (1, 3, 5, 7):
        x = XS[i]
        M.limb(w, M._bez((x, G - .4, z1), (x, 2.0, z1 + .1), (x, .15, z1 + 1.6), 8), .5, .85, 12)
    for z in (z0, z1):                                                          # roof parapet
        obox(w, (0, Y_ROOF + .5, z), (2 * x1 + 1.1, 1.0, .3), X, Z)
    for x in (x0, x1):
        obox(w, (x, Y_ROOF + .5, 0), (.3, 1.0, 2 * z1 + 1.1), X, Z)


# --- commons: corridors, lifts, gardens, terraces, lobby, roof garden --------------------------------------------------
def edge_rail(a, x0, x1, z, y, along_x=True):
    if along_x:
        rail(a["t_rail"], a["t_glass"], a["t_rail"], (x0, y, z), (x1, y, z), h=1.1, step=1.5)
    else:
        rail(a["t_rail"], a["t_glass"], a["t_rail"], (z, y, x0), (z, y, x1), h=1.1, step=1.5)


def pocket_garden(a, ctx, slot, rng):
    """An open bay left by the draw: deck, planters, a bench and a small tree behind the slab-edge rail."""
    (cx, y, cz), yaw = slot_xform(slot)
    T = H.Turned(a, cx, y, cz, math.radians(yaw))
    obox(T["t_deck"], (0, .03, 3.1), (4.6, .06, 5.9), X, Z)
    rail(T["t_rail"], T["t_glass"], T["t_rail"], (-2.35, .06, 6.4), (2.35, .06, 6.4), h=1.1, step=1.2)
    tctx = M.Ctx(role_view(T), rng)
    M.kit_prop(tctx, "planter_1m", 1.4, .06, 5.9)
    M.kit_prop(tctx, "bench", .1, .06, 4.6, math.pi)
    rbox(T["t_white"], -1.6, 3.0, .45, .45, .06, .5, r=.15, b=.04, n=1)          # shrub box (cheaper than tree_indoor)
    H.leafy(T, -1.6, .75, 3.0, .32, 3, seed=slot[1] + slot[2])


def sky_gardens(a, ctx, rng):
    y2, y5 = yl(2), yl(5)
    # double-height garden on level 2 under the level-3 void
    obox(a["t_deck"], (0, y2 + .03, 6.2), (2 * VOID[1] - .6, .06, 6.4), X, Z)
    for x in (-3.6, 3.2):
        M.leafy_tree(ctx, (x, y2 + .06, 6.0), h=6.0, crown=2.2, n=40, size=.4)
    for x in (-1.0, 1.2):
        M.kit_prop(ctx, "bench", x, y2 + .06, 7.9, math.pi)
    for x in (-5.0, 5.0):
        M.kit_prop(ctx, "planter_1m", x, y2 + .06, 8.7)
    M.kit_prop(ctx, "cafe_set", .2, y2 + .06, 5.0)
    edge_rail(a, VOID[0] + .3, VOID[1] - .3, 9.45, y2)
    y3 = yl(3)                                                                 # rails round the level-3 opening
    edge_rail(a, VOID[0] + .2, VOID[1] - .2, 3.1, y3)
    for x in VOID:
        edge_rail(a, 3.3, 9.3, x, y3, along_x=False)
    # single-height garden on level 5, bays 1-2
    obox(a["t_deck"], (-12, y5 + .03, 6.2), (11.4, .06, 6.4), X, Z)
    for x in (-16.5, -7.5):
        M.kit_prop(ctx, "tree_indoor", x, y5 + .06, 8.4)
    for x in (-14.2, -9.6):
        M.kit_prop(ctx, "cafe_set", x, y5 + .06, 6.2)
    M.kit_prop(ctx, "bench", -12, y5 + .06, 4.2)
    for x in (-17.0, -7.0):
        M.kit_prop(ctx, "planter_1m", x, y5 + .06, 4.0, math.pi / 2)
    edge_rail(a, -17.7, -6.3, 9.45, y5)


def side_middles(a, ctx, landings):
    """The sides' middle bays that do not hold a slot: public terraces on LY.TERRACE_LEVELS (deck, bench, planter,
    café table, slab-edge rail) and plain corridor landings elsewhere (slab-edge rail only). The front corridor runs
    through both to the front corner house."""
    for l in range(NL):
        y = yl(l)
        for side, sx in (("L", -1), ("R", 1)):
            if l in LY.TERRACE_LEVELS:
                obox(a["t_deck"], (sx * 21, y + .03, -1.3), (5.6, .06, 3.2), X, Z)
                M.kit_prop(ctx, "bench", sx * 22.8, y + .06, -1.5, -sx * math.pi / 2)
                M.kit_prop(ctx, "planter_1m", sx * 21, y + .06, -2.6)
                M.kit_prop(ctx, "cafe_set", sx * 21.2, y + .06, -.6, math.pi / 2)
            elif (side, l, 1) not in landings:
                continue
            edge_rail(a, -2.7, 2.7, sx * 24.45, y, along_x=False)


def empty_slot(a, slot):
    """A house slot kept free: steel guide rails, a yellow footprint and a slim yellow frame of the pod envelope
    (4.4 x 3.8 x 6.4 m), a dark docking plate with an amber strip on the corridor side, amber lamps at the mouth and a
    yellow-and-dark gate bar across the slab edge."""
    (cx, y, cz), yaw = slot_xform(slot)
    T = H.Turned(a, cx, y, cz, math.radians(yaw))
    for s in (-1, 1):
        obox(T["t_rail"], (s * 1.5, .06, 3.3), (.16, .12, 6.2), X, Z)
        obox(T["t_yellow"], (s * 2.2, .012, 3.3), (.1, .024, 6.4), X, Z)
        obox(T["t_amber"], (s * 2.25, .3, 6.35), (.22, .22, .08), X, Z)
        obox(T["t_dark"], (s * 1.6, .55, 6.42), (.08, 1.1, .08), X, Z)
    for z in (.1, 6.45):
        obox(T["t_yellow"], (0, .012, z), (4.4, .024, .1), X, Z)
    obox(T["t_dark"], (0, .45, .25), (1.2, .9, .2), X, Z)
    obox(T["t_amber"], (0, .75, .36), (.5, .12, .02), X, Z)
    w, top, z0, z1 = 2.18, 3.75, .3, 6.4                                       # the pod envelope, drawn as a slim frame
    for sx in (-1, 1):
        for z in (z0, z1):
            obox(T["t_yellow"], (sx * w, (.06 + top) / 2, z), (.06, top - .06, .06), X, Z)
        obox(T["t_yellow"], (sx * w, top, (z0 + z1) / 2), (.06, .06, z1 - z0), X, Z)
    for z in (z0, z1):
        obox(T["t_yellow"], (0, top, z), (2 * w, .06, .06), X, Z)
    for k in range(4):                                                         # gate bar in yellow and dark bands
        obox(T["t_yellow" if k % 2 == 0 else "t_dark"], (-1.2 + .8 * k, 1.05, 6.42), (.8, .1, .08), X, Z)


def corridors(a, mid_slots):
    """Front and side corridors; on a level whose side middle bay is a slot the front corridor stops at x = +-18."""
    for l in range(NL):
        y = yl(l)
        x0 = -18.0 if ("L", l, 1) in mid_slots else -24.0
        x1 = 18.0 if ("R", l, 1) in mid_slots else 24.0
        obox(a["t_corr"], ((x0 + x1) / 2, y + .01, 1.7), (x1 - x0, .02, 2.6), X, Z)
        for sx in (-1, 1):
            obox(a["t_corr"], (sx * 16.7, y + .01, -4.1), (2.6, .02, 9.0), X, Z)
            obox(a["t_lamp"], (sx * 16.7, y + LV - SLAB - .02, -4.1), (.12, .03, 8.6), X, Z)
        obox(a["t_lamp"], (0, y + LV - SLAB - .02, 1.7), (47.0, .03, .12), X, Z)
        for k in range(12):                                                    # lit service doors in the core wall
            x = -13.5 + k * 2.45
            if abs(x) > 3.6:
                obox(a["t_lamp"], (x, y + 2.2, CORE[3] + .01), (.5, .08, .02), X, Z)


def lifts(a, ctx):
    """Two glass lift shafts in the core lobby, cabins at different levels, a landing rail on each level."""
    for k, x in enumerate((-1.55, 1.55)):
        z = -1.0
        for sx in (-1, 1):
            for sz in (-1, 1):
                obox(a["t_rail"], (x + sx * 1.12, (G + Y_ROOF + 1) / 2, z + sz * 1.12), (.1, Y_ROOF + 1 - G, .1), X, Z)
        obox(a["t_glass"], (x, (G + Y_ROOF + 1) / 2, z + 1.15), (2.2, Y_ROOF + 1 - G, .03), X, Z)
        M.kit_prop(ctx, "lift_cabin", x, yl(2 + 3 * k) + .02, z, math.pi)
    for l in range(NL + 1):
        obox(a["t_white"], (0, yl(l) - .1, -.6), (6.2, .2, 2.0), X, Z)


def lobby(a):
    """Ground-floor glass lobby, warm ceiling, and the residents' entrance with a canopy on the water side."""
    obox(a["t_lobby"], (0, .17, -3.0), (34.8, .04, 11.2), X, Z)
    obox(a["t_warm"], (0, G - 1.17, -3.0), (33, .04, 9.0), X, Z)
    for zz in (2.4, -8.4):
        obox(a["t_glass"], (0, 2.9, zz), (34.8, 5.4, .05), X, Z)
    for xx in (-17.4, 17.4):
        obox(a["t_glass"], (xx, 2.9, -3.0), (.05, 5.4, 10.8), X, Z)
    for k in range(11):
        obox(a["t_rail"], (-17.4 + k * 3.48, 2.9, 2.42), (.06, 5.36, .08), X, Z)
    cx = bay_x(4)
    rbox(a["t_white"], cx, 10.7, 3.2, 1.9, 3.15, 3.4, r=.9, b=.1)
    obox(a["t_amber"], (cx, 3.12, 12.55), (5.4, .04, .05), X, Z)
    for s in (-1, 1):
        M.limb(a["t_rail"], [(cx + s * 2.6, .16, 12.0), (cx + s * 2.6, 3.15, 12.0)], .07, .07, 8)
    obox(a["t_lobby"], (cx, .17, 10.6), (2.6, .02, 3.6), X, Z)


def roof_garden(a, ctx, rng):
    for i in range(7):
        cx = -18 + 6 * i
        if i in (2, 4):
            continue                                                           # lift heads and the gardeners' path
        rbox(a["t_white"], cx, -1.0, 2.0, 4.5, Y_ROOF, Y_ROOF + .7, r=.6, b=.1)
        obox(a["soil"], (cx, Y_ROOF + .71, -1.0), (3.6, .02, 8.6), X, Z)
        for k in range(3):
            blob(a["leaf" if k % 3 else "bloom"], (cx + rng.uniform(-1.3, 1.3), Y_ROOF + 1.05, -1 + rng.uniform(-3.6, 3.6)),
                 (rng.uniform(.6, 1.0), .5, rng.uniform(.6, 1.0)), sub=1, seed=i * 10 + k, noise=.15)
    for x in (-6.0, 6.0):
        M.leafy_tree(ctx, (x, Y_ROOF, 5.5), h=4.2, crown=1.8, n=24, size=.42)
    obox(a["t_core"], (0, Y_ROOF + 1.6, -1.0), (6.8, 3.2, 3.0), X, Z)        # lift overrun


# --- rail, trolley, spreader -----------------------------------------------------------------------------------------
def loop_curve(x, n=16):
    return M._bez((x, Y_ROOF + 1.0, -3.0), (x, GY + 4.0, 3.0), (x, GY + .5, GZ - .2), n)


def build_rail(a):
    z1 = ZS[-1]
    rbox(a["t_white"], 0, GZ, SIDE_RAIL_X + .7, .65, GY - .75, GY + .75, r=.5, b=.25, n=3, segs=2)
    for s in (-1, 1):
        obox(a["t_dark"], (0, GY + .82, GZ + s * .4), (2 * SIDE_RAIL_X + .8, .14, .2), X, Z)
        obox(a["t_rail"], (0, GY + .93, GZ + s * .4), (2 * SIDE_RAIL_X + .8, .08, .1), X, Z)
    for sx in (-1, 1):                                                         # side rails: the side slots' hoist line
        xr, za, zb = sx * SIDE_RAIL_X, -8.0, GZ - .6
        rbox(a["t_white"], xr, (za + zb) / 2, .6, (zb - za) / 2, GY - .7, GY + .7, r=.45, b=.2, n=2, segs=1)
        for s in (-1, 1):
            obox(a["t_rail"], (xr + s * .38, GY + .76, (za + zb) / 2), (.1, .08, zb - za), X, Z)
        for z in (-6.0, 3.0):
            M.limb(a["t_white"], M._bez((sx * 24, Y_ROOF + 1.0, z), (sx * 26.5, GY + 3.0, z), (xr, GY - .5, z), 10), .7, .5, 8)
        obox(a["t_yellow"], (xr, GY + 1.0, za - .1), (1.1, .5, .3), X, Z)
    for x in (-24, -12, 0, 12, 24):
        M.limb(a["t_white"], M._bez((x, Y_ROOF + 1.0, z1), (x, Y_ROOF + 5.0, z1 + .5), (x, GY - .6, GZ - .4), 12), .85, .6, 10)
        M.limb(a["t_white"], loop_curve(x), .8, .55, 10)
    secs = []
    for xi in range(9):
        x = -24 + 6 * xi
        c = [(z, y - .75) for _, y, z in loop_curve(x, 12)[1:-1]]
        secs.append([(x, y, z) for z, y in c] + [(x, y - .04, z) for z, y in c[::-1]])
    loft(a["t_canopy"], secs)
    for k in range(17):
        x = -24 + 3 * k
        M.limb(a["h_frame"], [(x, y - .72, z) for _, y, z in loop_curve(x, 12)[1:-1]], .05, .05, 4)

    for x in XS:                                                               # hoist guides on the front columns
        obox(a["t_rail"], (x, (G + Y_ROOF) / 2, z1 + COL / 2 + .05), (.22, Y_ROOF - G, .1), X, Z)


def build_trolley(a, y_top):
    """Local to the trolley origin (x = z = 0 at the rail line, y absolute then offset)."""
    rbox(a["t_dark"], 0, 0, 1.8, 1.0, GY + 1.0, GY + 1.9, r=.3, b=.1)
    for s in (-1, 1):
        obox(a["t_dark"], (0, GY, s * .95), (3.2, 2.4, .25), X, Z)
    rbox(a["t_dark"], 0, 0, 3.0, 2.3, GY - 1.55, GY - 1.15, r=.3, b=.1)
    obox(a["t_yellow"], (0, GY + 1.6, 1.01), (3.0, .3, .02), X, Z)
    for sx in (-2.6, 2.6):
        for sz in (-2.0, 2.0):
            cyl(a["t_rail"], sx, sz, .2, GY - 1.75, GY - 1.55, 12)
            cyl(a["t_dark"], sx, sz, .03, y_top, GY - 1.75, 6)


def build_spreader(a, drop):
    """Local to its centre over the hanging house's lugs; slings drop `drop` m to the lugs."""
    for s in (-1, 1):
        obox(a["t_yellow"], (s * 2.6, 0, 0), (.22, .3, 4.6), X, Z)
        obox(a["t_yellow"], (0, 0, s * 2.0), (5.4, .3, .22), X, Z)
    for sx in (-1, 1):
        for zz in H.LUG_Z:
            z = zz - 2.7
            obox(a["t_yellow"], (sx * 2.45, -.2, z), (.4, .14, .16), X, Z)
            obox(a["t_dark"], (sx * 2.31, -.2 - drop / 2, z), (.035, drop, .035), X, Z)


# --- checks --------------------------------------------------------------------------------------------------------------
def world_tris(ob, nudge=(0, 0, 0)):
    mw = Matrix.Translation(Vector(nudge)) @ ob.matrix_world
    me = ob.data
    return [mw @ v.co for v in me.vertices], [tuple(p.vertices) for p in me.polygons]


def checks(frame_acc_list, houses_objs):
    fv, ff = [], []
    for acc in frame_acc_list:
        base = len(fv)
        fv += [Vector(v) for v in acc.v]
        ff += [tuple(base + i for i in f) for f in acc.f]
    frame = BVHTree.FromPolygons(fv, ff)
    trees, res = {}, {"frame_clash": {}, "house_clash": [], "entrance": {}}
    for ob in houses_objs:
        yaw = math.radians(ob["yaw"])
        out = (math.sin(yaw) * .004, -math.cos(yaw) * .004, .004)              # 4 mm off the slab and the beam face
        v, f = world_tris(ob, out)
        t = BVHTree.FromPolygons(v, f)
        trees[ob.name] = (t, ob)
        n = len(t.overlap(frame))
        if n:
            res["frame_clash"][ob.name] = n
    names = sorted(trees)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            pa, pb = trees[a][1].matrix_world.translation, trees[b][1].matrix_world.translation
            if (pa - pb).length > 13:
                continue
            n = len(trees[a][0].overlap(trees[b][0]))
            if n:
                res["house_clash"].append((a, b, n))
    for ob in houses_objs:                                                      # door threshold -> corridor floor
        if ob.name.endswith("Delivery"):
            continue
        dx, wz = H.DOORS[ob["house_type"]]
        mw = ob.matrix_world
        p = mw @ Vector(C.B((dx, .5, wz - .25)))
        hit = frame.ray_cast(p, Vector((0, 0, -1)), 1.0)
        floor = None if hit[0] is None else round(p.z - hit[0].z - .5, 3)
        q = mw @ Vector(C.B((dx, 1.0, wz - .5)))
        d = (mw.to_3x3() @ Vector(C.B((0, 0, -1)))).normalized()
        blocked = frame.ray_cast(q, d, 1.6)[0] is not None
        ok = floor is not None and abs(floor) < .02 and not blocked
        res["entrance"][ob.name] = {"floor_gap": floor, "path_blocked": blocked, "ok": ok}
    return res


# --- assembly ------------------------------------------------------------------------------------------------------------
def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    C.make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    asset_col = bpy.data.collections.new("Q08H_Asset")
    prev_col = bpy.data.collections.new("Q08H_Preview")
    scene.collection.children.link(asset_col)
    scene.collection.children.link(prev_col)
    rng = random.Random(SEED)
    assign, opened = LY.place(SEED)
    assign, opened, corner_gardens, empty_slots, landings = LY.side_middle(SEED, assign, opened)
    mid_slots = {s for s in assign if s[2] == 1 and s[0] != "F"} | empty_slots

    root = bpy.data.objects.new("Q08H_HousingTower", None)
    root.empty_display_size = 4
    asset_col.objects.link(root)
    root["seed"] = SEED
    frame = Accs()
    build_frame(frame)
    add_obj("Q08H_Frame", build_mesh("q08h_frame", frame), asset_col, root)

    com = Accs()
    for role in M.ROLES:
        com["in_" + role]
    ctx = M.Ctx(role_view(com), rng)
    corridors(com, mid_slots)
    lifts(com, ctx)
    lobby(com)
    sky_gardens(com, ctx, rng)
    side_middles(com, ctx, landings)
    for s in sorted(empty_slots | {DELIVERY}):
        empty_slot(com, s)
    roof_garden(com, ctx, rng)
    for s in sorted(opened | corner_gardens):
        pocket_garden(com, ctx, s, rng)
    add_obj("Q08H_Commons", build_mesh("q08h_commons", com), asset_col, root)
    rl = Accs()
    build_rail(rl)
    add_obj("Q08H_Rail", build_mesh("q08h_rail", rl), asset_col, root)

    meshes = {k: build_mesh("q08h_house_" + k, H.build_house(k, 100 + i)) for i, k in enumerate(H.HOUSE_TYPES)}
    hroot = bpy.data.objects.new("Q08H_Houses", None)
    asset_col.objects.link(hroot)
    hroot.parent = root
    hobs = []
    for slot in sorted(assign):
        kind = assign[slot]
        loc, yaw = slot_xform(slot)
        ob = add_obj("Q08H_House_%s%d_%d" % slot, meshes[kind], asset_col, hroot, loc, yaw)
        ob["house_type"], ob["slot"], ob["yaw"] = kind, "%s%d_%d" % slot, yaw
        hobs.append(ob)
    hang_kind = "ellipse_view"                    # the hero type; the slings clear its shell (|x| <= 2.15)
    hy = yl(DELIVERY[1]) + .3
    hx = bay_x(DELIVERY[2])
    hang = add_obj("Q08H_House_Delivery", meshes[hang_kind], asset_col, hroot, (hx, hy, HANG_Z))
    hang["house_type"], hang["slot"], hang["yaw"] = hang_kind, "F4_6 (being lowered)", 0.0
    sp_y = hy + 4.3
    tr = Accs()
    build_trolley(tr, sp_y + .15)
    for acc in tr.values():
        acc.v = [(x, y, z - GY) for x, y, z in acc.v]
    add_obj("Q08H_Trolley", build_mesh("q08h_trolley", tr), asset_col, root, (hx, GY, GZ))
    sp = Accs()
    build_spreader(sp, 4.3 - .2 - .2 - .3)
    add_obj("Q08H_Spreader", build_mesh("q08h_spreader", sp), asset_col, root, (hx, sp_y, GZ))

    rep = checks([frame["t_white"], frame["t_core"]], hobs + [hang])
    reach = {}                                                                  # max reach of each type past its slot line
    for k, me in meshes.items():
        reach[k] = max(-v.co[1] for v in me.vertices)                          # Blender -Y = local +z
    hoist = {"front_line_z": HANG_Z, "max_front_house_z": round(3.0 + max(reach.values()), 3),
             "side_line_x": SIDE_HANG_X, "max_side_house_x": round(18.0 + max(reach.values()), 3)}
    hoist["clear"] = hoist["max_front_house_z"] < HANG_Z - .05 and hoist["max_side_house_x"] < SIDE_HANG_X - .05
    counts = {}
    for k in assign.values():
        counts[k] = counts.get(k, 0) + 1
    tris = {ob.name: C.tris(ob.data) for ob in asset_col.objects if ob.type == "MESH"}
    by_part = {"frame": tris["Q08H_Frame"], "commons": tris["Q08H_Commons"], "rail": tris["Q08H_Rail"],
               "trolley+spreader": tris["Q08H_Trolley"] + tris["Q08H_Spreader"],
               "houses": sum(v for k, v in tris.items() if k.startswith("Q08H_House_"))}
    st = LY.stats(assign, opened)
    report = {"seed": SEED, "houses": len(assign), "hanging": hang_kind, "open_bays": sorted("%s%d_%d" % s for s in opened),
              "counts": counts, "adjacent_same": st["adjacent_same"], "periodic_rows": st["periodic_rows"],
              "type_tris": {k: C.tris(m) for k, m in meshes.items()}, "tris_by_part": by_part,
              "tris_total": sum(by_part.values()), "materials": len(bpy.data.materials),
              "frame_clash": rep["frame_clash"], "house_clash": rep["house_clash"],
              "entrance_fail": {k: v for k, v in rep["entrance"].items() if not v["ok"]},
              "entrances_checked": len(rep["entrance"]), "hoist": hoist,
              "side_middle_houses": sorted("%s%d_%d=%s" % (s + (assign[s],)) for s in assign if s[0] != "F" and s[2] == 1),
              "empty_slots": sorted("%s%d_%d" % s for s in empty_slots | {DELIVERY}),
              "corner_gardens": sorted("%s%d_%d" % s for s in corner_gardens),
              "map": LY.front_map(assign, opened | corner_gardens)}

    S.context(prev_col)
    S.setup_light(scene)
    for cam in ("main", "front", "side"):
        S.camera(scene, cam)
    S.camera(scene, "main")
    for ob in list(scene.collection.objects):                                  # staging lives in the preview collection
        if ob.name.startswith(("PV_", "CAM_")):
            scene.collection.objects.unlink(ob)
            prev_col.objects.link(ob)

    os.makedirs(OUT, exist_ok=True)
    stem = ASSET if SEED == DEFAULT_SEED else "%s-s%d" % (ASSET, SEED)
    blend = os.path.join(OUT, stem + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    if "--no-export" not in ARGS:
        for ob in bpy.data.objects:
            ob.select_set(ob.users_collection[0] == asset_col if ob.users_collection else False)
        bpy.context.view_layer.objects.active = root
        glb = os.path.join(OUT, stem + ".glb")
        bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True,
                                  export_yup=True, export_animations=False, export_cameras=False,
                                  export_lights=False, export_extras=True, export_materials="EXPORT")
        report["glb_bytes"] = os.path.getsize(glb)
    with open(os.path.join(OUT, "report-s%d.json" % SEED), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1, ensure_ascii=False)
    print("REPORT", json.dumps({k: v for k, v in report.items() if k != "map"}, ensure_ascii=False))
    print(report["map"])


main()
