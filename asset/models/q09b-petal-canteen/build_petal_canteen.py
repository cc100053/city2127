"""Q09-B 花冠港灣共桌食堂 / 花びら屋根の港の食堂 (design document Q09-B_Afterwork; reference: Q09_Afterwork sheet p.2,
middle image B, `.dream-loop/q09b/target.png`).

Run:  blender -b --factory-startup --python-exit-code 1 -P build_petal_canteen.py [-- --massing] [--no-export]
Writes q09b-petal-canteen.blend (asset + preview staging), the city GLB q09b-petal-canteen.glb (asset only) and
report.json beside this file. --massing builds the grey model (floor, columns, ring beam, ribs, both petal rings, hood
and tower, kitchen ring, tables and seats as blocks) into q09b-petal-canteen-massing.blend for locking the entrance
camera.

Blender coordinates, real metres; every layout number lives in hall.py. Origin = the sea-side main entrance floor at
the hall's south edge; hall centre (0, 16); z up; sea toward -y, service side toward +y. A 32 m round hall open on all
sides: twelve slim perimeter columns branching into the copper ring beam (eaves 5 m), six tree columns round the serving
ring, twelve main ribs carrying a two-layer petal roof (12 outer petals spreading past the eaves, 8 inner upright petals
round the tower, overlapping like shingles; copper rim, spine and fan veins; teal / lilac / warm-gold laminated glass
bands); the copper hood, duct and perforated exhaust tower (outlet 15 m) stand apart from the structure. Under the hood
an 8 m kitchen ring (pass counter, food shelf, central hearth), a 2.5 m serving ring, six radial long tables with chairs
facing each other, shared plates, bowls, chopsticks and warm-white table lamps, one place kept for a late colleague; a
service door north to the prep and dish rooms.

Nodes: Q09B_PetalCanteen > STRUCTURE (COLUMNS_RING, RIBS), ROOF (PETALS_OUTER, PETALS_INNER), KITCHEN (KITCHEN_HOOD,
KITCHEN_COUNTER), DINING (TABLE_1..6), SITE (FLOOR, BACK_OF_HOUSE, PLAZA). Preview staging is never exported.
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
import hall as L  # noqa: E402

G, M = K.G, K.M
Accs, loft, lathe, ring, pipe, beam, srgb = K.Accs, K.loft, K.lathe, K.ring, K.pipe, K.beam, K.srgb
Frame, box, kit, kit_yaw = QA.Frame, QA.box, QA.kit, QA.kit_yaw

ASSET = "q09b-petal-canteen"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MASSING = "--massing" in ARGS
V2 = "--v2" in ARGS                      # v2 (2026-11-29): crown silhouette, menu ring, lightbox, a served table; *-v2 files
OUT = ASSET + ("-v2" if V2 else "")
if V2:                                   # the v2 petal rings replace v1's everywhere hall.py is read (spines, ribs, struts)
    L.OUTER, L.INNER, L.CROWN_RING_Z = L.OUTER_V2, L.INNER_V2, L.CROWN_RING_Z_V2
CX, CY = L.C


def pol(r, b, z=0.0):
    return Vector(L.at(r, b, z))


def sector(acc, r0, r1, a0, a1, z0, z1, step=4.0):
    """parts.sector, but centred on the hall centre (parts.sector turns about the world origin)."""
    n = max(1, int(abs(a1 - a0) / step))
    secs = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        c, s = math.cos(a), math.sin(a)
        secs.append([(CX + r0 * c, CY + r0 * s, z0), (CX + r1 * c, CY + r1 * s, z0), (CX + r1 * c, CY + r1 * s, z1), (CX + r0 * c, CY + r0 * s, z1)])
    full = abs(a1 - a0) >= 360
    loft(acc, secs[:-1] if full else secs, wrap=full, caps=not full)


# --- structure: perimeter columns, ring beam, tree columns, main ribs, compression rings -------------------------------------------
def structure():
    a = Accs()
    cu = a["copper"]
    ring(cu, L.RING_R - .18, L.RING_R + .18, L.EAVE - .4, L.EAVE, 96, CX, CY)          # ring beam (eave line)
    if not MASSING:
        ring(a["edge_light"], L.RING_R + .18, L.RING_R + .2, L.EAVE - .32, L.EAVE - .26, 96, CX, CY)
    for k in range(L.N_RIB):                                                    # perimeter columns branching to the ring
        b = 360.0 * k / L.N_RIB + L.RIB_OFF
        base, fork = pol(L.RING_R, b, 0), pol(L.RING_R, b, 3.3)
        pipe(cu, [tuple(base), tuple(fork)], .13, .11, n=10)
        lathe(a["steel_dark"], [(0, 0), (.32, 0), (.32, .06), (0, .06)], 12, base.x, base.y)
        for s in (-1, 1):                                                       # two curved arms along the ring
            pts = []
            for i in range(9):
                t = i / 8
                pts.append(tuple(pol(L.RING_R, b + s * 7.5 * t ** .8, 3.3 + (L.EAVE - .4 - 3.3) * math.sin(t * math.pi / 2))))
            pipe(cu, pts, .09, .06, n=8)
        pipe(cu, [tuple(fork), tuple(pol(L.RING_R, b, L.EAVE - .4))], .09, .08, n=8)
    for k in range(L.INNER_COLS):                                               # tree columns round the serving ring
        b = 360.0 * k / L.INNER_COLS
        base, fork = pol(L.INNER_COL_R, b, 0), pol(L.INNER_COL_R, b, 4.6)
        pipe(cu, [tuple(base), tuple(fork)], .16, .13, n=12)
        lathe(a["steel_dark"], [(0, 0), (.36, 0), (.36, .06), (0, .06)], 12, base.x, base.y)
        for db in (-15.0, 15.0):                                                # arms out to the two nearest ribs
            r_to = L.OUTER[2] + .4                                              # just past the ribs' inner ends
            top = pol(r_to, b + db, L.outer_spine_z(r_to) - .45)
            mid = (fork + top) / 2 + Vector((0, 0, .4))
            pipe(cu, [tuple(fork), tuple(mid), tuple(top)], .1, .07, n=8)
        top = pol(L.OUTER[2], b, L.CROWN_RING_Z - .1)                           # and up to the compression ring
        pipe(cu, [tuple(fork), tuple((fork + top) / 2 + Vector((0, 0, .3))), tuple(top)], .12, .09, n=8)
    # main ribs: copper box beams under each outer petal's spine, from the inner compression ring over the ring beam
    for k in range(L.N_RIB):
        b = 360.0 * k / L.N_RIB + L.OUTER[1]
        pts = [tuple(pol(r, b, L.outer_spine_z(r) - .32)) for r in [L.OUTER[2] + (L.RING_R + .4 - L.OUTER[2]) * i / 16 for i in range(17)]]
        beam(cu, pts, .2, .38, .16, .3)
    zr = L.CROWN_RING_Z
    ring(cu, L.OUTER[2] - .22, L.OUTER[2] + .22, zr - .3, zr + .12, 64, CX, CY)  # compression ring on the tree columns
    zi = L.INNER[3] - .2
    ring(cu, L.INNER[2] - .1, L.INNER[2] + .14, zi - .18, zi + .1, 40, CX, CY)   # crown base ring round the duct
    cnt, off = L.INNER[0], L.INNER[1]
    for k in range(cnt):                                                        # radial struts under each crown petal,
        b = off + 360.0 * k / cnt                                               # a post up to the petal's spine
        a0, a1 = pol(L.OUTER[2] - .2, b, zr - .1), pol(L.INNER[2] + .12, b, zi - .05)
        pipe(cu, [tuple(a0), tuple(a1)], .09, .07, n=8)
        r_p, z_p = L.inner_spine(.35)
        lift = L.INNER[7] if k % 2 else 0.0
        foot = pol(r_p, b, zr - .1 + (zi - .05 - zr + .1) * (L.OUTER[2] - .2 - r_p) / (L.OUTER[2] - .2 - L.INNER[2] - .12))
        pipe(cu, [tuple(foot), tuple(pol(r_p, b, z_p + lift - .15))], .06, .05, n=6)
    return a


# --- petals ---------------------------------------------------------------------------------------------------------------------------
def petal_width(u):
    """Lotus petal plan: narrow base, full belly, sharp tip."""
    return max(math.sin(math.pi * u ** .8) ** .85, .07 if u < .5 else 0.0)


def petal_point(kind, bearing, u, v, lift):
    """Mid-surface point of a petal: u 0 (base) .. 1 (tip), v -1 .. 1 across; cupped toward the inside / up."""
    cnt, off, rb, zb, rt, zt, wmax, _ = kind
    if kind is L.OUTER:
        r = rb + (rt - rb) * u
        z = L.outer_spine_z(r)
        dr, dz = 1.0, (L.outer_spine_z(min(r + .05, rt)) - L.outer_spine_z(max(r - .05, rb))) / ((min(r + .05, rt) - max(r - .05, rb)) or 1)
    else:
        r, z = L.inner_spine(u)
        r2, z2 = L.inner_spine(min(u + .01, 1))
        r1, z1 = L.inner_spine(max(u - .01, 0))
        dr, dz = r2 - r1, z2 - z1
    ln = math.hypot(dr, dz) or 1
    nr, nz = -dz / ln, dr / ln                                                  # up / inward normal in the radial plane
    a = math.radians(bearing)
    rad, tan = Vector((math.cos(a), math.sin(a), 0)), Vector((-math.sin(a), math.cos(a), 0))
    nrm = rad * nr + Vector((0, 0, nz))
    w = wmax * petal_width(u) / 2
    spine = Vector((CX, CY, 0)) + rad * r + Vector((0, 0, z + lift))
    return spine + tan * (v * w) + nrm * (.22 * w * v * v), nrm


def petal(a, kind, k, band_shift):
    """One petal: a thin closed panel (laminated glass) split in colour bands across its width, a copper rim, the copper
    spine and six fan veins from the base to the rim, a fine edge light under the rim."""
    cnt, off = kind[0], kind[1]
    bearing = off + 360.0 * k / cnt
    lift = kind[7] if k % 2 else 0.0
    nu, nv = 22, 12
    us = [i / nu for i in range(nu + 1)]
    vs = [-1 + 2 * j / nv for j in range(nv + 1)]
    t = L.PETAL_T / 2
    top, bot = [], []
    for u in us:
        for v in vs:
            p, n = petal_point(kind, bearing, u, v, lift)
            top.append(tuple(p + n * t))
            bot.append(tuple(p - n * t))
    verts, off_ = top + bot, len(top)
    W = nv + 1
    faces = []
    for i in range(nu):
        for j in range(nv):
            q = (i * W + j, i * W + j + 1, (i + 1) * W + j + 1, (i + 1) * W + j)
            faces += [q, tuple(off_ + c for c in reversed(q))]
    for i in range(nu):
        for j in (0, nv):
            a0, a1 = i * W + j, (i + 1) * W + j
            faces.append((a0, a1, off_ + a1, off_ + a0) if j == 0 else (a1, a0, off_ + a0, off_ + a1))
    for j in range(nv):
        faces.append((j + 1, j, off_ + j, off_ + j + 1))
    if G.volume(verts, faces) < 0:
        faces = [f[::-1] for f in faces]
    # colour: one hue per petal (teal / lilac alternating), a warm-gold base and the other hue along the rim (round 3:
    # bands across the whole width read as a striped umbrella, not glass)
    ring_tag = "o" if kind is L.OUTER else "i"
    hue = (k + band_shift) % 2
    bands = {}
    for f in faces:
        u = min(us[(i % off_) // W] for i in f)
        v = max(abs(vs[(i % off_) % W]) for i in f)
        band = 2 if u < .26 else (1 - hue) if v > .76 else hue
        bands.setdefault(band, []).append(f)
    for band, fs in bands.items():
        a["glass_%s%d" % (ring_tag, band)]._push(verts, fs)
    # copper rim, spine and fan veins (just under the panel)
    rim = [tuple(petal_point(kind, bearing, u, -1, lift)[0]) for u in us] + [tuple(petal_point(kind, bearing, u, 1, lift)[0]) for u in us[::-1][1:]]
    pipe(a["copper"], rim, .055, n=6)
    for v in ((0.0,) if MASSING else (-.78, -.52, -.26, 0.0, .26, .52, .78)):
        pts = []
        for u in us[1:-1] if v else us[:-1]:
            p, n = petal_point(kind, bearing, u, v, lift)
            pts.append(tuple(p - n * (t + .02)))
        pipe(a["copper"], pts, .07 if v == 0 else .028, n=6 if v == 0 else 4)
    if not MASSING:
        ed = []
        for u in us[1:-1]:
            for v in (-1,):
                p, n = petal_point(kind, bearing, u, v, lift)
                ed.append(tuple(p - n * .09))
        pipe(a["edge_light"], ed, .018, n=4)
    tip = petal_point(kind, bearing, 1.0, 0, lift)[0]
    return [round(c, 2) for c in tip]


def roof(kind, band_shift):
    a = Accs()
    tips = [petal(a, kind, k, (k + band_shift) % 3) for k in range(kind[0])]
    return a, tips


# --- kitchen: hood, duct, exhaust tower (not load-bearing) and the counter ring -------------------------------------------------------
def hood():
    a = Accs()
    rb, zb, rt, zt = L.HOOD
    prof = [(rb, zb), (rb + .05, zb + .1), (rb + .05, zb + .45), (rb - .1, zb + .55)]
    for i in range(1, 9):                                                       # the bell: a soft flare into the duct
        t = i / 8
        prof.append((rt + (rb - .1 - rt) * (1 - t) ** 2.2, zb + .55 + (zt - zb - .55) * t))
    prof += [(L.DUCT_R, zt + .3), (L.DUCT_R, L.TOWER[0])]
    lathe(a["copper_hood"], prof + [(L.DUCT_R - .05, L.TOWER[0]), (L.DUCT_R - .05, zb + .6), (rb - .15, zb + .1)], 64, CX, CY, wrap=True)
    if not MASSING:
        ring(a["edge_light"], rb - .05, rb + .06, zb - .03, zb, 64, CX, CY)          # warm light ring under the lip
        ring(a["copper_dark"], rb + .05, rb + .07, zb + .2, zb + .32, 64, CX, CY)    # name band
        for k in range(16):                                                     # downlights in the bell
            p = pol(rb - .45, 22.5 * k, zb + .1)
            lathe(a["table_light"], [(0, zb + .06), (.07, zb + .06), (.07, zb + .1), (0, zb + .1)], 8, p.x, p.y)
    # perforated exhaust tower: lit core behind a copper lattice, outlet cap at 15 m
    z0, z1, r0, r1 = L.TOWER
    lathe(a["tower_core"], [(0, z0), (r0 - .12, z0), (r1 - .12, z1 - .1), (0, z1 - .1)], 24, CX, CY)
    ring(a["copper_hood"], r0 - .02, r0 + .06, z0 - .1, z0 + .15, 32, CX, CY)
    ring(a["copper_hood"], r1 - .04, r1 + .08, z1 - .25, z1, 32, CX, CY)
    nb = 10 if MASSING else 18
    for k in range(nb):                                                         # helical bars both ways: the perforation
        for s in (-1, 1):
            pts = []
            for i in range(13):
                t = i / 12
                z = z0 + .15 + (z1 - .25 - z0 - .15) * t
                r = r0 + (r1 - r0) * t
                ang = math.radians(360.0 * k / nb + s * 80 * t)
                pts.append((CX + r * math.cos(ang), CY + r * math.sin(ang), z))
            pipe(a["copper_hood"], pts, .045, n=4)
    for k in range(6):                                                          # guides from the inner petal ring (sliding)
        b = 60 * k
        pipe(a["steel_dark"], [tuple(pol(L.DUCT_R, b, L.INNER[3] - .2)), tuple(pol(L.INNER[2] - .1, b, L.INNER[3] - .2))], .035, n=5)
    return a


def counter(rng):
    """Kitchen ring: pass counter with a gap toward the service door, food shelf over it, central hearth, cooks' floor."""
    a = Accs()
    r0, r1 = L.KITCHEN_R - .75, L.KITCHEN_R
    g = L.COUNTER_GAP
    sector(a["steel_fascia"], r1 - .05, r1, g + 8, g + 352, 0, 1.0, 4.0)
    sector(a["counter_body"], r0, r1 - .05, g + 8, g + 352, 0, .95, 4.0)
    sector(a["stone_top"], r0 - .05, r1 + .1, g + 8, g + 352, .95, 1.02, 4.0)
    lathe(a["kitchen_floor"], [(0, .03), (r0, .03), (r0, .045), (0, .045)], 48, CX, CY)
    lathe(a["hearth"], [(0, 0), (L.HEARTH_R, 0), (L.HEARTH_R, .9), (0, .9)], 32, CX, CY)
    lathe(a["grill"], [(0, .9), (L.HEARTH_R - .1, .9), (L.HEARTH_R - .1, .93), (0, .93)], 32, CX, CY)
    if MASSING:
        return a
    sector(a["edge_light"], r1 + .1, r1 + .12, g + 8, g + 352, .88, .92, 4.0)   # under-top light line, guest side
    for k in range(10):                                                         # food shelf ring on slim posts
        b = g + 18 + 32.4 * k
        p = pol(r0 + .25, b)
        lathe(a["steel_dark"], [(0, 1.02), (.025, 1.02), (.025, 1.62), (0, 1.62)], 6, p.x, p.y)
    sector(a["shelf_glass"], r0, r0 + .5, g + 12, g + 348, 1.58, 1.62, 4.0)
    for k in range(26):                                                         # bowls and platters on the shelf and counter
        b = g + 16 + 12.8 * k
        p = pol(r0 + .25, b, 1.62)
        col = ("dish_green", "dish_red", "dish_gold")[k % 3]
        lathe(a["plate"], [(0, p.z), (.17, p.z), (.19, p.z + .05), (.15, p.z + .05), (0, p.z + .02)], 12, p.x, p.y)
        lathe(a[col], [(0, p.z + .02), (.13, p.z + .03), (.06, p.z + .09), (0, p.z + .1)], 10, p.x, p.y)
        q = pol(r1 - .25, b + 6, 1.02)
        lathe(a["plate"], [(0, q.z), (.12, q.z), (.12, q.z + .07), (.1, q.z + .07), (.1, q.z + .02), (0, q.z + .02)], 12, q.x, q.y)
    for k in range(5):                                                          # pots and a wok on the hearth
        p = pol(.65, 72 * k, .93) if k else Vector((CX, CY, .93))
        lathe(a["steel_pot"], [(0, p.z), (.22, p.z), (.24, p.z + .26), (.2, p.z + .26), (.2, p.z + .04), (0, p.z + .04)], 14, p.x, p.y)
    for k in range(6):                                                          # cooks' prep counters inside the ring
        b = g + 30 + 50 * k
        p, q = pol(2.15, b), pol(2.15, b + 1)
        ang = math.atan2(q.y - p.y, q.x - p.x)
        K.obox(a["counter_body"], (p.x, p.y, .45), (1.3, .6, .9), ang)
        K.obox(a["stone_top"], (p.x, p.y, .92), (1.34, .64, .04), ang)
    # serving ring floor band with inset light lines, tray station by the gap
    sector(a["serve_band"], L.SERVE_R[0] + .1, L.SERVE_R[1], 0, 360, .03, .038, 3.0)      # on the hall floor (top 0.03)
    for r in L.SERVE_R[1:]:
        sector(a["edge_light"], r - .03, r, 0, 360, .038, .045, 3.0)
    p = pol(7.3, g + 16)                                                        # just outside the ring: the ring stays a loop
    K.obox(a["steel_fascia"], (p.x, p.y, .45), (1.2, .5, .9), math.radians(g + 16 + 90))
    for i in range(5):
        K.obox(a["tray"], (p.x, p.y, .92 + .03 * i), (.45, .34, .02), math.radians(g + 16 + 90))
    return a


# --- dining ---------------------------------------------------------------------------------------------------------------------------
def table(rng, bearing, keep_place):
    """One radial long table with chairs facing each other across it, shared dishes, bowls, chopsticks, cups, two warm
    table lamps; the outer end left clear for an added chair or a wheelchair."""
    a = Accs()
    c, rad, tan = L.table_frame(bearing)
    F = Frame(c[0], c[1], 0, tan)                                               # local x along the table (radial), y across
    ln, wd = L.TABLE
    F.box(a["table_top"], -ln / 2, ln / 2, -wd / 2, wd / 2, .72, .77)
    for x in (-ln / 2 + .25, ln / 2 - .25):
        F.box(a["table_leg"], x - .05, x + .05, -wd / 2 + .12, wd / 2 - .12, 0, .72)
        F.box(a["table_leg"], x - .05, x + .05, -.05, .05, .05, .12)
    F.box(a["table_leg"], -ln / 2 + .3, ln / 2 - .3, -.04, .04, .1, .16)
    seats = []
    for side in (-1, 1):
        for i in range(L.SEATS_PER_SIDE):
            x = -ln / 2 + .6 + i * (ln - 1.2) / (L.SEATS_PER_SIDE - 1)
            y = side * (wd / 2 + .38)
            pulled = keep_place and side == 1 and i == 1                        # the late colleague's place, chair turned out
            yy = y + side * (.25 if pulled else 0)
            chair(a, F, x, yy, side, MASSING, turn=.35 if pulled else 0.0)
            seats.append((x, y, side, pulled))
    if MASSING:
        return a
    if V2 and keep_place:                                                       # v2: this table's meals are served
        served_table(a, F, seats, wd)
        return a
    for x, y, side, pulled in seats:                                            # place settings
        py = side * (wd / 2 - .22)
        lathe(a["plate"], [(0, .775), (.14, .775), (.15, .79), (.12, .79), (0, .78)], 14, *F.p(x, py, 0)[:2])
        lathe(a["bowl"], [(0, .79), (.07, .8), (.08, .84), (.065, .84), (0, .8)], 10, *F.p(x - .15, py - side * .05, 0)[:2])
        F.box(a["chopstick"], x + .17, x + .19, py - .12, py + .12, .775, .785)
        F.box(a["chopstick"], x + .2, x + .22, py - .12, py + .12, .775, .785)
        if not pulled:
            lathe(a["cup_glass"], [(0, .775), (.035, .775), (.04, .9), (0, .9)], 8, *F.p(x + .05, py - side * .18, 0)[:2])
        else:                                                                   # a folded card on the kept place
            F.box(a["card"], x - .06, x + .06, py - .01, py + .01, .775, .84)
    for i, x in enumerate((-1.5, -.3, .9, 2.0)):                                # shared dishes along the middle
        col = ("dish_green", "dish_red", "dish_gold", "dish_green")[i]
        lathe(a["plate"], [(0, .775), (.2, .775), (.22, .8), (.18, .8), (0, .78)], 14, *F.p(x, 0, 0)[:2])
        lathe(a[col], [(0, .78), (.16, .79), (.07, .86), (0, .87)], 12, *F.p(x, 0, 0)[:2])
    for x in (-.9, 1.45):                                                       # warm-white table lamps (glass cylinders)
        lathe(a["table_light"], [(0, .775), (.06, .775), (.06, .95), (0, .95)], 10, *F.p(x, 0, 0)[:2])
        lathe(a["cup_glass"], [(0, .775), (.075, .775), (.075, .98), (0, .98)], 10, *F.p(x, 0, 0)[:2])
    lathe(a["vase"], [(0, .775), (.06, .775), (.07, .9), (.04, 1.0), (0, 1.0)], 10, *F.p(.3, 0, 0)[:2])
    M.leaf_clump(K.ctx(a, rng, *F.p(.3, 0, 1.0)), (0, .1, 0), (.16, .14, .16), ("pod_p", "leaf_l"), "green", 10, .08, .3, 1)
    return a


def served_table(a, F, seats, wd):
    """v2: a set meal on an oak tray at every place (rice, miso soup, the main dish, a small dish, chopsticks on a rest,
    tea), sharing plates down the middle, two warm lamps; the late colleague's place keeps an empty tray, a card and a
    clean bowl upside down."""
    for x, y, side, pulled in seats:
        py = side * (wd / 2 - .24)
        F.box(a["tray"], x - .22, x + .22, py - .17, py + .17, .775, .79)
        if pulled:
            F.box(a["card"], x - .06, x + .06, py - .01, py + .01, .79, .855)
            p = F.p(x + .1, py - side * .06, 0)
            lathe(a["bowl"], [(0, .79), (.065, .79), (.075, .83), (.04, .85), (0, .85)], 10, p[0], p[1])   # bowl turned over
            continue
        p = F.p(x - .11, py + side * .06, 0)                                    # rice
        lathe(a["plate"], [(0, .79), (.05, .79), (.075, .83), (.065, .85), (0, .85)], 12, p[0], p[1])
        lathe(a["rice"], [(0, .84), (.06, .845), (.04, .87), (0, .875)], 10, p[0], p[1])
        p = F.p(x + .11, py + side * .06, 0)                                    # miso soup, lacquer bowl
        lathe(a["lacquer"], [(0, .79), (.05, .79), (.07, .83), (.065, .85), (0, .85)], 12, p[0], p[1])
        lathe(a["miso"], [(0, .835), (.058, .835), (.058, .84), (0, .84)], 10, p[0], p[1])
        p = F.p(x, py - side * .08, 0)                                          # main dish on a long plate
        F.box(a["plate"], x - .14, x + .14, py - side * .08 - .055, py - side * .08 + .055, .79, .8)
        F.box(a["grilled"], x - .1, x + .1, py - side * .08 - .03, py - side * .08 + .03, .8, .83)
        p = F.p(x + .17, py - side * .1, 0)                                     # small dish
        lathe(a["bowl"], [(0, .79), (.035, .79), (.04, .81), (0, .81)], 8, p[0], p[1])
        lathe(a["dish_green"], [(0, .805), (.03, .805), (.015, .82), (0, .82)], 8, p[0], p[1])
        F.box(a["chopstick"], x - .2, x - .18, py - .14, py + .14, .79, .8)    # chopsticks on a rest
        F.box(a["chopstick"], x - .17, x - .15, py - .14, py + .14, .79, .8)
        p = F.p(x + .2, py + side * .12, 0)                                     # tea
        lathe(a["tea"], [(0, .79), (.035, .79), (.04, .87), (0, .87)], 8, p[0], p[1])
    for i, x in enumerate((-1.4, .0, 1.4)):                                     # sharing plates down the middle
        col = ("dish_red", "dish_gold", "dish_green")[i]
        lathe(a["plate"], [(0, .775), (.2, .775), (.22, .8), (.18, .8), (0, .78)], 14, *F.p(x, 0, 0)[:2])
        lathe(a[col], [(0, .78), (.16, .79), (.07, .86), (0, .87)], 12, *F.p(x, 0, 0)[:2])
    for x in (-.7, .7):
        lathe(a["table_light"], [(0, .775), (.06, .775), (.06, .95), (0, .95)], 10, *F.p(x, 0, 0)[:2])
        lathe(a["cup_glass"], [(0, .775), (.075, .775), (.075, .98), (0, .98)], 10, *F.p(x, 0, 0)[:2])


def textured_quads(name, quads, mats, col, parent):
    """An object of textured quads: quads = [(4 corners, material index)], UVs left-to-right / bottom-to-top as given."""
    vs, fs, mi = [], [], []
    for corners, m in quads:
        base = len(vs)
        vs += corners
        fs.append((base, base + 1, base + 2, base + 3))
        mi.append(m)
    me = bpy.data.meshes.new(name.lower())
    me.from_pydata(vs, [], fs)
    uv = me.uv_layers.new(name="UVMap")
    for li in range(len(uv.data)):
        uv.data[li].uv = ((0, 0), (1, 0), (1, 1), (0, 1))[li % 4]
    for m in mats:
        me.materials.append(m)
    me.polygons.foreach_set("material_index", mi)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    ob.parent = parent
    return ob


def image_mat(name, path, glow):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    b = next(nd for nd in nt.nodes if nd.type == "BSDF_PRINCIPLED")
    tn = nt.nodes.new("ShaderNodeTexImage")
    tn.image = bpy.data.images.load(path, check_existing=True)
    nt.links.new(tn.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tn.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = glow
    b.inputs["Roughness"].default_value = .3
    m.use_backface_culling = True                                               # no mirrored text seen from behind
    return m


def menu_and_lightbox(col, parent, tex):
    """v2: twelve menu screens round the kitchen under the hood lip, facing the tables (three dishes in turn), on a copper
    frame hung from the hood; the entrance lightbox 「港の食堂」 lit both sides on a copper frame."""
    r, z0, z1 = L.MENU
    mats = [image_mat("q09b_menu_%d" % i, tex["menu_%d" % i], 2.2) for i in range(3)]
    quads = []
    for k in range(12):
        b0, b1 = 30.0 * k + 1.0, 30.0 * (k + 1) - 1.0
        # chord ends pushed out so the whole flat screen clears the curved back plate; seen from outside the larger
        # bearing is on the left, so the quad starts at the smaller one (text reads left to right from the tables)
        ro = (r + .03) / math.cos(math.radians(14.0))
        p0, p1 = pol(ro, b0), pol(ro, b1)
        quads.append(([(p0.x, p0.y, z0), (p1.x, p1.y, z0), (p1.x, p1.y, z1), (p0.x, p0.y, z1)], k % 3))
    menu = textured_quads("MENU_RING", quads, mats, col, parent)
    bearing, rr, w, lz0, lz1 = L.LIGHTBOX
    c = pol(rr, bearing)
    lb = image_mat("q09b_lightbox", tex["lightbox"], 3.0)
    y0, y1 = c.y - .09, c.y + .09
    box_q = [([(c.x - w / 2, y0, lz0), (c.x + w / 2, y0, lz0), (c.x + w / 2, y0, lz1), (c.x - w / 2, y0, lz1)], 0),   # street side
             ([(c.x + w / 2, y1, lz0), (c.x - w / 2, y1, lz0), (c.x - w / 2, y1, lz1), (c.x + w / 2, y1, lz1)], 0)]   # hall side
    light = textured_quads("LIGHTBOX", box_q, [lb], col, parent)
    a = Accs()                                                                  # frames
    for k in range(12):
        b0, b1 = 30.0 * k, 30.0 * (k + 1)
        sector(a["copper"], r - .02, r + .2, b0, b1, z1, z1 + .06, 6.0)
        sector(a["copper"], r - .02, r + .2, b0, b1, z0 - .06, z0, 6.0)
        sector(a["steel_dark"], r - .07, r - .02, b0 + .5, b1 - .5, z0, z1, 3.0)    # opaque back plate (kitchen side)
        pipe(a["copper"], [tuple(pol(r + .01, b0, z1)), tuple(pol(L.HOOD[0] - .05, b0, L.HOOD[1] + .1))], .025, n=5)   # hanger
        pipe(a["copper"], [tuple(pol(r + .01, b0, z0 - .06)), tuple(pol(r + .01, b0, z1))], .025, n=5)
    box(a["copper"], c.x - w / 2 - .06, c.x + w / 2 + .06, y0 - .02, y1 + .02, lz1, lz1 + .12)
    box(a["copper"], c.x - w / 2 - .06, c.x + w / 2 + .06, y0 - .02, y1 + .02, lz0 - .12, lz0)
    for sx in (-1, 1):
        box(a["copper"], c.x + sx * (w / 2 + .03) - .03, c.x + sx * (w / 2 + .03) + .03, y0 - .02, y1 + .02, 0, lz1 + .12)
    box(a["steel_dark"], c.x - .3, c.x + .3, c.y - .2, c.y + .2, 0, .05)
    return menu, light, a


def chair(a, F, x, y, side, block, turn=0.0):
    """Wood chair facing the table (its back away from it)."""
    c, s = math.cos(turn), math.sin(turn)
    fx, fy = F.T.col[1][0] * -side, F.T.col[1][1] * -side                    # facing: toward the table centre line
    fx, fy = fx * c - fy * s, fx * s + fy * c
    H = Frame(*F.p(x, y, 0)[:2], 0, (fx, fy))
    H.box(a["chair_wood"], -.22, .22, -.22, .2, .43, .48)
    H.box(a["chair_wood"], -.22, .22, -.24, -.2, .48, .9)
    if block:
        H.box(a["chair_wood"], -.2, .2, -.2, .18, 0, .43)
        return
    for lx in (-.19, .19):
        for ly in (-.2, .17):
            H.box(a["chair_wood"], lx - .02, lx + .02, ly - .02, ly + .02, 0, .43)
    H.box(a["chair_seat"], -.2, .2, -.18, .18, .48, .51)


# --- site, floor, back of house ----------------------------------------------------------------------------------------------------
def floor_and_site(rng):
    a = Accs()
    x0, x1, y0, y1 = L.SITE
    box(a["paving"], x0, x1, y0, y1, -.3, 0)
    lathe(a["hall_floor"], [(0, 0), (L.R_HALL + .3, 0), (L.R_HALL + .3, .03), (0, .03)], 96, CX, CY)
    if MASSING:
        return a
    for r in (8.0, 11.0, 14.0):                                                 # floor rings and radial joints
        sector(a["floor_joint"], r - .01, r + .01, 0, 360, .03, .034, 3.0)
    for k in range(24):
        b = 15 * k
        p, q = pol(L.SERVE_R[1], b, .032), pol(L.R_HALL + .2, b, .032)
        pipe(a["floor_joint"], [tuple(p), tuple(q)], .01, n=3)
    ring(a["edge_light"], L.R_HALL + .28, L.R_HALL + .32, .0, .04, 96, CX, CY)
    # perimeter planters with lavender between columns, open at the two entrances and the service door
    for k in range(L.N_RIB):
        b0 = 360.0 * k / L.N_RIB + L.RIB_OFF + 6                                 # between two columns
        b1 = b0 + 18
        mid = (b0 + b1) / 2
        if any(abs(((mid - e + 180) % 360) - 180) < 20 for e in list(L.ENTRANCES.values()) + [L.SERVICE_DOOR]):
            continue
        sector(a["planter"], L.R_HALL - .6, L.R_HALL + .3, b0, b1, 0, .5, 2.0)
        sector(a["soil"], L.R_HALL - .5, L.R_HALL + .2, b0 + .3, b1 - .3, .45, .52, 2.0)
        for j in range(6):
            p = pol(L.R_HALL - .15, b0 + 1.5 + j * 2.9, .5)
            sz = rng.uniform(.3, .45)
            M.leaf_clump(K.ctx(a, rng, *p), (0, sz * .7, 0), (sz * .7, sz * 1.1, sz * .7), ("pod_p", "leaf_l"), "green", 14, .2, .3, 2)
    for e in L.ENTRANCES.values():                                              # entrance thresholds and lit bollards
        sector(a["threshold"], L.R_HALL - .2, L.R_HALL + 1.6, e - 7, e + 7, 0, .02, 2.0)
        for s in (-1, 1):
            p = pol(L.R_HALL + 1.0, e + s * 8.5)
            lathe(a["copper"], [(0, 0), (.09, 0), (.09, .9), (0, .9)], 10, p.x, p.y)
            lathe(a["edge_light"], [(0, .9), (.095, .9), (.095, 1.0), (0, 1.0)], 10, p.x, p.y)
    # sea promenade rail and street path
    box(a["rail"], x0, x1, y0 + .3, y0 + .4, 0, 1.05)
    for x in [x0 + 2 * i for i in range(int((x1 - x0) / 2) + 1)]:
        box(a["rail"], x - .03, x + .03, y0 + .32, y0 + .38, 0, 1.05)
    e = pol(L.R_HALL + 1.6, L.ENTRANCES["street"])
    K.obox(a["threshold"], ((e.x + x1) / 2, e.y, .01), (x1 - e.x, 3.0, .02), 0)
    for tx, ty in ((-20.5, 4.0), (-21.0, 30.0), (20.5, 6.0), (-12.0, 38.0)):
        M.leafy_tree(K.ctx(a, rng, tx, ty, 0), (0, 0, 0), h=rng.uniform(6.0, 7.5), crown=2.2, trunk="wood", roles=("leaf_l", "green"),
                     core="green", n=70, size=.4, branches=4)
    return a


def back_of_house():
    """Prep room and dish room north of the hall, the service door facing the kitchen gap, waste and recycling out east."""
    a = Accs()
    x0, x1, y0, y1 = L.BOH
    box(a["boh_wall"], x0, x1, y0, y1, 0, 4.0)
    box(a["boh_roof"], x0 - .3, x1 + .3, y0 - .3, y1 + .3, 4.0, 4.25)
    if MASSING:
        return a
    d = pol(L.R_HALL, L.SERVICE_DOOR)
    box(a["door_frame"], -1.1, 1.1, y0 - .05, y0, 0, 2.5)
    box(a["boh_door"], -1.0, 1.0, y0 - .07, y0 - .05, 0, 2.4)
    box(a["edge_light"], -.8, .8, y0 - .1, y0 - .07, 2.6, 2.65)
    box(a["canopy"], -1.8, 1.8, d.y + .2, y0, 2.9, 3.0)                          # covered link from the hall edge
    for x in (-1.7, 1.7):
        box(a["copper"], x - .05, x + .05, d.y + .25, d.y + .35, 0, 2.9)
    for xa in (x0 + 1.0, 3.0):                                                  # windows: prep room (west), dish room (east)
        box(a["boh_window"], xa, xa + 2.6, y0 - .04, y0, 1.1, 2.6)
    box(a["roll_door"], x1, x1 + .05, y0 + 1.5, y0 + 4.5, 0, 2.8)               # waste / recycling out east
    for i in range(3):
        box(a["bin_" + ("green", "blue", "grey")[i]], x1 + .6, x1 + 1.3, y0 + 1.6 + i * 1.0, y0 + 2.4 + i * 1.0, 0, 1.1)
    return a


# --- materials ----------------------------------------------------------------------------------------------------------------------
def mat(name, hexc, rough=.6, metal=0.0, alpha=1.0, emit=None, strength=1.0, culling=True):
    m = G.material("q09b_" + name, srgb(hexc, alpha), rough, srgb(emit) if emit else None, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


def petal_glass(name, hexc, film, alpha, glow):
    m = mat(name, hexc, .08, .05, alpha=alpha, emit=hexc, strength=glow, culling=False)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    for key, val in (("Thin Film Thickness", film), ("Thin Film IOR", 1.4), ("Coat Weight", .5), ("Coat Roughness", .05)):
        if key in b.inputs:
            b.inputs[key].default_value = val
    return m


FILM_NM = {"q09b_%s_%s" % (ring, hue): rng for ring in ("outer", "crown")
           for hue, rng in (("teal", (420.0, 600.0)), ("lilac", (480.0, 680.0)), ("gold", (360.0, 520.0)), ("amber", (340.0, 500.0)))}
GLASS = (("teal", "54D2C2", 500.0), ("lilac", "C08BEA", 580.0), ("gold", "F2BE62", 440.0))
if V2:                                   # v2: deeper teal and lilac, the warm band an amber rather than a pale gold
    GLASS = (("teal", "3FCDB8", 500.0), ("lilac", "B486EC", 580.0), ("amber", "F29A2E", 420.0))


def make_materials():
    K.MATS.clear()
    K.MATS.update({
        "copper": mat("copper_rib", "B8693F", .3, 1.0), "copper_hood": mat("copper_hood", "C47A4C", .22, 1.0),
        "copper_dark": mat("copper_band", "6E3B22", .35, 1.0), "steel_dark": mat("steel_dark", "3E4246", .4, .7),
        "edge_light": mat("edge_light", "FFE3B5", .4, emit="FFD9A0", strength=7.0),
        "tower_core": mat("tower_glow", "FFB070", .5, emit="FF9A4A", strength=5.0),
        "steel_fascia": mat("steel_fascia", "C9CCCC", .25, .9), "counter_body": mat("counter_body", "D9D2C6", .5),
        "stone_top": mat("stone_top", "EEE9E0", .3), "kitchen_floor": mat("kitchen_floor", "8E8A84", .7),
        "hearth": mat("hearth", "50463F", .5, .4), "grill": mat("grill", "1E1E20", .6, .6),
        "shelf_glass": mat("shelf_glass", "E3F2F2", .05, alpha=.35, culling=False), "steel_pot": mat("steel_pot", "C2C6C8", .2, 1.0),
        "plate": mat("plate_white", "F6F3EC", .3), "bowl": mat("bowl_celadon", "B9D3C3", .3),
        "dish_green": mat("dish_greens", "6E9E4A", .7), "dish_red": mat("dish_tomato", "C2563A", .6), "dish_gold": mat("dish_golden", "D9A54A", .6),
        "chopstick": mat("chopsticks", "8A5A34", .5), "cup_glass": mat("cup_glass", "F2EAD0", .05, alpha=.35, culling=False),
        "card": mat("place_card", "F8F4EA", .6), "vase": mat("vase", "D7C9B4", .4),
        "table_top": mat("table_oak", "A97A4C", .45), "table_leg": mat("table_leg", "6B4A2E", .5),
        "chair_wood": mat("chair_oak", "B88A58", .5), "chair_seat": mat("chair_seat", "C9B79C", .8),
        "table_light": mat("table_light", "FFF4E0", .4, emit="FFEFD6", strength=12.0),
        "serve_band": mat("serving_ring", "E6E0D4", .6), "tray": mat("tray", "5C4636", .5),
        "paving": mat("plaza_paving", "C4BCB0", .8), "hall_floor": mat("hall_stone", "D6CFC4", .55),
        "floor_joint": mat("floor_joint", "A89F93", .8), "threshold": mat("threshold", "B9A68E", .6),
        "planter": mat("planter", "D9D1C2", .6), "soil": mat("soil", "5A4532", .95), "rail": mat("sea_rail", "C9BBA6", .35, .8),
        "boh_wall": mat("boh_wall", "E4DED4", .6), "boh_roof": mat("boh_roof", "8C8478", .6), "door_frame": mat("door_frame", "6E4A32", .4, .6),
        "boh_door": mat("boh_door", "A9A39A", .4, .6), "boh_window": mat("boh_window", "FFE7C2", .2, emit="FFDDAA", strength=1.5),
        "canopy": mat("canopy", "B8693F", .3, 1.0), "roll_door": mat("roll_door", "9A9FA2", .45, .5),
        "bin_green": mat("bin_green", "4E8A56", .6), "bin_blue": mat("bin_blue", "4A6EA2", .6), "bin_grey": mat("bin_grey", "7C8084", .6),
        "wood": mat("trunk", "6E5238", .8),
        "rice": mat("rice", "F6F2E8", .6), "lacquer": mat("lacquer_bowl", "6A1C14", .25), "miso": mat("miso", "9A6838", .5),
        "grilled": mat("grilled_fish", "B8723A", .6), "tea": mat("green_tea", "B6A86A", .3),
    })
    for i, (hue, hexc, film) in enumerate(GLASS):                               # outer ring clearer, the crown richer, so
        K.MATS["glass_o%d" % i] = petal_glass("outer_" + hue, hexc, film, .3, .25)    # the crown reads through it
        K.MATS["glass_i%d" % i] = petal_glass("crown_" + hue, hexc, film, .48, .7)
    for role, (rgba, emit, strength) in M.ROLES.items():
        leafy = role in ("leaf_l", "green", "white", "pod_p")
        m = G.material("q09b_in_" + role, rgba, .6, emit, strength)
        m.use_backface_culling = not leafy and rgba[3] >= 1
        K.MATS["in_" + role] = m
    K.MATS["in_pod_p"] = mat("in_lavender", "A88AD6", .6, culling=False)        # blossoms ride the pod_p role
    if MASSING:
        grey = mat("massing_grey", "CFCDC8", .8)
        for k, m in list(K.MATS.items()):
            if next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Alpha"].default_value >= 1:
                K.MATS[k] = grey
    return K.MATS


# --- preview staging (never exported) -------------------------------------------------------------------------------------------------
def preview(col, rng):
    mk = lambda n, h, r=.8, **k: K.MATS.setdefault("pv_" + n, mat("pv_" + n, h, r, **k))  # noqa: E731
    mk("water", "3D5D86", .05)
    mk("ground", "BEB7AD", .9)
    mk("far", "6F7898", .9)
    mk("farw", "DCDDE6", .6)
    mk("lit", "FFD9A0", .5, emit="FFC37A", strength=3.0)
    a = Accs()
    box(a["pv_ground"], -400, 400, -7.0, 300, -.6, -.01)
    box(a["pv_water"], -6000, 6000, -9000, -7.0, -2.6, -1.4)
    for i in range(180):                                                        # far shore across the bay (-y)
        x, y = rng.uniform(-3000, 3000), -rng.uniform(1300, 1900)
        h = rng.uniform(15, 80) * (2.2 if rng.random() < .12 else 1)
        w = rng.uniform(20, 50)
        box(a["pv_far"], x, x + w, y, y - w, -2, h)
        if rng.random() < .6:
            box(a["pv_lit"], x + 2, x + w - 2, y + .2, y - .3, h * .35, h * .35 + 2.5)
    bx, by = Vector((-1500.0, -1000.0)), Vector((-400.0, -1250.0))             # bridge, left; Ferris wheel, right
    ang = math.atan2(by.y - bx.y, by.x - bx.x)

    def along(t, z, s=0):
        c = bx.lerp(by, t)
        return (c.x - s * 9 * math.sin(ang), c.y + s * 9 * math.cos(ang), z)
    K.obox(a["pv_farw"], along(.5, 30), ((by - bx).length * 1.4, 16, 3), ang)
    for t in (.22, .78):
        for s in (-1, 1):
            K.obox(a["pv_lit"], along(t, 60, s), (6, 5, 120), ang)
    for s in (-1, 1):
        pipe(a["pv_farw"], [along(.22 + .56 * i / 24, 34 + 80 * (2 * i / 24 - 1) ** 2, s) for i in range(25)], 1.0, n=5)
    c = Vector((900.0, -1000.0, 75.0))
    pipe(a["pv_lit"], [(c.x + 70 * math.cos(2 * math.pi * i / 48), c.y, c.z + 70 * math.sin(2 * math.pi * i / 48)) for i in range(49)], 1.4, n=5)
    for i in range(16):
        t = 2 * math.pi * i / 16
        pipe(a["pv_lit"], [tuple(c), (c.x + 70 * math.cos(t), c.y, c.z + 70 * math.sin(t))], .6, n=4)
    ob = bpy.data.objects.new("PV_Context", K.build_mesh("pv_context", a))
    col.objects.link(ob)
    if MASSING:
        return
    p = Accs()                                                                  # display figures: own layer, not exported
    for bearing in L.TABLE_BEARINGS:
        c_, rad, tan = L.table_frame(bearing)
        for side in (-1, 1):
            for i in range(L.SEATS_PER_SIDE):
                if (bearing, side, i) in ((240.0, 1, 1),) or rng.random() < .3:
                    continue
                x = -L.TABLE[0] / 2 + .6 + i * (L.TABLE[0] - 1.2) / (L.SEATS_PER_SIDE - 1)
                y = side * (L.TABLE[1] / 2 + .38)
                px = c_[0] + rad[0] * x + tan[0] * y
                py = c_[1] + rad[1] * x + tan[1] * y
                M.seated_person(K.ctx(p, rng, px, py, 0, 0), 0, .48, 0, kit_yaw(-tan[0] * side, -tan[1] * side))
    for k in range(4):                                                          # cooks inside the ring, guests at the pass
        q = pol(2.9, 40 + 85 * k)
        M.person(K.ctx(p, rng, q.x, q.y, .02, kit_yaw(q.x - CX, q.y - CY)), 0, 0, 0, yaw=0)
    for k in range(3):
        q = pol(5.0, 200 + 50 * k)
        M.person(K.ctx(p, rng, q.x, q.y, 0, kit_yaw(CX - q.x, CY - q.y)), 0, 0, 0, yaw=0)
    ob = bpy.data.objects.new("PV_People", K.build_mesh("pv_people", p))
    col.objects.link(ob)


# --- assembly -------------------------------------------------------------------------------------------------------------------------
def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    tex = None
    if V2 and not MASSING:                                                      # menu and lightbox faces, in the emptied scene
        import menus
        tex = menus.make_textures(os.path.join(HERE, "textures"))
    make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    rng = random.Random(2127)
    col = bpy.data.collections.new("Q09B_Asset")
    prev = bpy.data.collections.new("Q09B_Preview")
    scene.collection.children.link(col)
    scene.collection.children.link(prev)
    root = bpy.data.objects.new("Q09B_PetalCanteen", None)
    col.objects.link(root)
    nodes = {}
    for g in ("STRUCTURE", "ROOF", "KITCHEN", "DINING", "SITE"):
        e = bpy.data.objects.new(g, None)
        col.objects.link(e)
        e.parent = root
        nodes[g] = e

    def add(name, accs, g, smooth_deg=35):
        if not any(acc.f for acc in accs.values()):
            return None
        ob = bpy.data.objects.new(name, K.build_mesh("q09b_" + name.lower(), accs, smooth_deg))
        col.objects.link(ob)
        ob.parent = nodes[g]
        return ob

    add("COLUMNS_RING_RIBS", structure(), "STRUCTURE", 50)
    outer, tips_o = roof(L.OUTER, 0)
    inner, tips_i = roof(L.INNER, 1)
    add("PETALS_OUTER", outer, "ROOF", 50)
    add("PETALS_INNER", inner, "ROOF", 50)
    add("KITCHEN_HOOD", hood(), "KITCHEN", 50)
    add("KITCHEN_COUNTER", counter(rng), "KITCHEN")
    for i, b in enumerate(L.TABLE_BEARINGS):
        add("TABLE_%d" % (i + 1), table(rng, b, keep_place=(b == 240.0)), "DINING")
    add("FLOOR_PLAZA", floor_and_site(rng), "SITE")
    add("BACK_OF_HOUSE", back_of_house(), "SITE")
    if tex:
        _, _, frames = menu_and_lightbox(col, nodes["KITCHEN"], tex)
        add("MENU_LIGHTBOX_FRAMES", frames, "KITCHEN")
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
              "petal_tips": {"outer_max_z": max(t[2] for t in tips_o), "outer_max_r": round(max(math.hypot(t[0] - CX, t[1] - CY) for t in tips_o), 2),
                             "inner_max_z": max(t[2] for t in tips_i), "inner_min_z": min(t[2] for t in tips_i)},
              "outlet_z": L.TOWER[1], "hall_d": 2 * L.R_HALL, "eave": L.EAVE}
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
        QA.FILM_NM = FILM_NM                                                    # the Q09-A patch, with this asset's films
        report["iridescence_patched"] = QA.add_iridescence(glb)
        report["glb_bytes"] = os.path.getsize(glb)
    import review_petal_canteen as RV
    RV.stage(scene, prev)
    blend = os.path.join(HERE, OUT + ("-massing" if MASSING else "") + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    rep = "report%s%s.json" % ("-v2" if V2 else "", "-massing" if MASSING else "")
    with open(os.path.join(HERE, rep), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps({k: v for k, v in report.items() if k != "tris_by_object"}))


if __name__ == "__main__":
    main()
