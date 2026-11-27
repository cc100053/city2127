"""Q10-B material bank (design document Q10-B v1.0; reference: Q10 sheet, centre image B, `.dream-loop/q10b/target.png`).

Run:  blender -b --factory-startup --python-exit-code 1 -P build_material_bank.py [-- --no-export] [--template --out DIR]
Writes q10b-material-bank.blend (asset + preview staging), q10b-material-bank.glb (asset only) and report.json beside this
file. --template builds one library bay only (every material type in every state, all near detail, a gantry and its arm)
and saves q10b-template.blend into --out, for the wall check before the full build. No human figures anywhere.

Blender coordinates, real metres. Origin = building centre at plaza level (z 0), long axis X, sea on +Y, main facade to the
plaza (-Y). The plan is a gentle arc (100.75 m chord, 7 m sagitta, ends toward the plaza): everything is laid out in a
straight frame (u along the building, v across, front v -10 .. back v +10, z) and bent onto the arc by bend(); bay modules
are built bent around u = 0 and placed by rotating about the arc centre, so one mesh serves every bay.

Read left (-X, intake) to right (+X, making): three glass intake tubes carry old chairs from plaza stations up into the
dismantling room (round table: a chair frame and its cushion apart, an arm, sorting bins); the material library is 24
bays x 12 levels, four drawers per cell (metal bars end-on, cloth rolls with cores, glass granules in pale green
hoppers, wood powder in closed tan bins, resin pellets in small jars), full / half / empty, with gantry masts on rails in
front whose arms grip the handles of pulled-out drawers; the double-height forming room under a 50 m glass roof shows a
half-formed bench between two arms and a finished bench on the conveyor onto the glass bridge, deck flush with the room
floor, out to a lift down to the street. A covered public walkway runs under the building on branching columns from the
entrance to the pickup window.

Nodes: Q10B_MaterialBank > STRUCTURE, FACADE, LIBRARY, ROBOTS, INTAKE, FORMING, BRIDGE, GROUND, PLAZA. Repeated parts
(bay modules, drawers, columns, trees) are linked duplicates of one mesh. Preview staging is collection Q10B_Preview and
is never exported. Primitives come from the Q04-A builder's parts.py; the old wooden chair, tube and collar helpers from
the Q10-A builder; library parts used: branch_strut, leafy_tree, kit bench.
"""
import importlib.util
import json
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


K = _load("q04a_parts", os.path.join(MODELS, "q04a-suspended-pod-tower", "parts.py"))
QA = _load("q10a_build", os.path.join(MODELS, "q10a-solar-furnace", "build_solar_furnace.py"))   # chair, tube helpers
G, M = K.G, K.M
Accs, loft, obox, lathe, ring, pipe, srgb = K.Accs, K.loft, K.obox, K.lathe, K.ring, K.pipe, K.srgb

ASSET = "q10b-material-bank"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
TEMPLATE = "--template" in ARGS

# --- layout ------------------------------------------------------------------------------------------------------------------
BAY = 62.0 / 24                      # library bay, 2.583 m
N_IN, N_LIB, N_FORM = 6, 24, 9       # bays: intake, library, forming
NB = N_IN + N_LIB + N_FORM
U0 = -NB * BAY / 2                   # -50.375
U1 = -U0
SAG = 7.0
RB = ((NB * BAY / 2) ** 2 + SAG ** 2) / (2 * SAG)   # bend radius of the centre line
V_F, V_B = -10.0, 10.0
Z_SLAB = 6.0                         # top of the slab over the walkway
LEV, NLEV = 3.0, 12
Z_TOP = Z_SLAB + LEV * NLEV          # 42: rack top, front wall top
ROOF_H, ROOF_H_FORM = 48.5, 50.0
V_RACK, RACK_D = -7.0, 3.2           # rack front face, rack depth
V_RAIL = -8.9                        # gantry rails and masts, in front of the racks
V_GROUND = -4.0                      # ground floor glass line: v -10 .. -4 is the covered walkway
Z_DIS, Z_FORM = 18.0, 30.0           # dismantling room floor, forming room floor (= bridge deck)
TYPES = ("metal", "cloth", "glass", "wood", "resin")
SLOT_W = BAY / 2 - .10               # drawer slot width (two per cell side by side, two rows)
DW, DH, DD = SLOT_W - .07, 1.36, 2.6  # drawer width, height, depth
HANDLE = (0.0, -.105, DH - .24)      # handle centre in drawer coordinates (front y = 0, depth +y)
PULL = 1.05                          # a drawer being drawn out stands this far in front of the rack
NEAR_LEVELS = 2                   # levels 0..2 (and the rack close-up) get near detail; the rest share cheaper far meshes
TUBE_R = 1.25
TUBE_BAYS = (1, 3, 5)
HERO_TUBE = 1                        # nearest the main view: whole chairs ride in it
BRIDGE_W = 4.2
LIFT_U = U1 + 26.5                   # lift tower at the bridge end


def bay_u(k):
    return U0 + (k + .5) * BAY


def lib_u(i):
    return bay_u(N_IN + i)


def lib_type(i):
    return TYPES[0 if i < 5 else 1 if i < 10 else 2 if i < 14 else 3 if i < 19 else 4]


def bend(p):
    u, v, z = p
    a = u / RB
    r = RB + v
    return (r * math.sin(a), r * math.cos(a) - RB, z)


def bent(accs):
    for acc in accs.values():
        acc.v = [bend(p) for p in acc.v]
    return accs


def smooth(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def roof_profile(H, n1=9, n2=6):
    """(v, z) points of the roof section from the front wall top to the back wall top, peak H."""
    pts = [(-4 + 6 * math.cos(math.radians(180 - 90 * k / n1)), Z_TOP + 6 * math.sin(math.radians(180 - 90 * k / n1))) for k in range(n1 + 1)]
    pts += [(-4 + 10 * k / 3, Z_TOP + 6 + (H - Z_TOP - 6) * k / 3) for k in (1, 2, 3)]
    pts += [(6 + 4 * math.cos(math.radians(90 - 90 * k / n2)), H - 4 + 4 * math.sin(math.radians(90 - 90 * k / n2))) for k in range(1, n2 + 1)]
    return pts


def zprof(v, H):
    pts = roof_profile(H)
    for (v0, z0), (v1, z1) in zip(pts, pts[1:]):
        if v0 <= v <= v1:
            return z0 + (z1 - z0) * (v - v0) / max(v1 - v0, 1e-9)
    return pts[-1][1]


def roof_h(u):
    return ROOF_H_FORM if u > bay_u(N_IN + N_LIB) - BAY / 2 - .01 else ROOF_H


# --- small helpers -----------------------------------------------------------------------------------------------------------
def ubox(acc, u0, u1, v0, v1, z0, z1, step=2.0):
    """Box segmented along u, so it bends cleanly (pieces up to 3 m stay one segment: 5 mm off the arc at most)."""
    n = 1 if u1 - u0 <= 3.0 else max(1, math.ceil((u1 - u0) / step))
    loft(acc, [[(u, v0, z0), (u, v1, z0), (u, v1, z1), (u, v0, z1)] for u in (u0 + (u1 - u0) * i / n for i in range(n + 1))])


def box(acc, x0, x1, y0, y1, z0, z1):
    K.box(acc, min(x0, x1), max(x0, x1), min(y0, y1), max(y0, y1), min(z0, z1), max(z0, z1))


def prism(acc, c, axis, r, h0, h1, n=6, rot=0.0):
    """n-sided prism round an axis ('y' or 'z') through c = (a, b), from h0 to h1 along the axis."""
    secs = []
    for h in (h0, h1):
        sec = []
        for j in range(n):
            t = rot + 2 * math.pi * j / n
            p, q = c[0] + r * math.cos(t), c[1] + r * math.sin(t)
            sec.append((p, h, q) if axis == "y" else (p, q, h))
        secs.append(sec)
    loft(acc, secs)


def disc_y(acc, c, y, r, n=8, r0=0.0, rot=0.0):
    """Flat disc (or annulus r0..r) facing -y at depth y, centred (x, z) = c: a cut end seen from the front."""
    if r0 <= 0:
        vs = [(c[0] + r * math.cos(rot + 2 * math.pi * j / n), y, c[1] + r * math.sin(rot + 2 * math.pi * j / n)) for j in range(n)]
        acc.facing(vs + [(c[0], y, c[1])], [(j, (j + 1) % n, n) for j in range(n)], lambda _c: (0, -1, 0))
        return
    vs = []
    for rr in (r0, r):
        vs += [(c[0] + rr * math.cos(rot + 2 * math.pi * j / n), y, c[1] + rr * math.sin(rot + 2 * math.pi * j / n)) for j in range(n)]
    acc.facing(vs, [(j, (j + 1) % n, n + (j + 1) % n, n + j) for j in range(n)], lambda _c: (0, -1, 0))


def sphere(acc, c, r, n=10, m=6):
    M.ell(acc, tuple(c), (r, 0, 0), (0, r, 0), (0, 0, r), n, m)


def three(p):
    """Blender (straight frame) point -> three.js coordinates for library modules."""
    return (p[0], p[2], -p[1])


# --- robot arm (site part; candidate for the library) --------------------------------------------------------------------------
def robot_arm(a, base, nrm, target, approach, l1=.8, l2=.7, hint=(0, 0, 1), grip=(0, 0, 1), s=1.0):
    """Six-axis style arm: base housing on a mount face (normal nrm), turret, upper arm, forearm, wrist and a two-finger
    gripper whose fingers close on `target` (e.g. a drawer handle bar) from `approach` (unit, pointing into the target),
    one finger each side along `grip`. Two-link IK in the plane of the reach, elbow toward `hint`. Roles arm, arm_dark."""
    base, nrm, target, ap = Vector(base), Vector(nrm).normalized(), Vector(target), Vector(approach).normalized()
    pipe(a["arm_dark"], [base - nrm * .02, base + nrm * .16 * s], .28 * s, .27 * s, 18)
    S = base + nrm * .46 * s
    pipe(a["arm"], [base + nrm * .14 * s, S], .21 * s, .17 * s, 16)
    W = target - ap * .44 * s
    d = W - S
    L = d.length
    k = max(1.0, L / ((l1 + l2) * .97))
    l1, l2 = l1 * k, l2 * k
    dh = d.normalized()
    h = Vector(hint) - dh * Vector(hint).dot(dh)
    if h.length < 1e-3:
        h = nrm - dh * nrm.dot(dh)
    h.normalize()
    x = (l1 * l1 - l2 * l2 + L * L) / (2 * L)
    E = S + dh * x + h * math.sqrt(max(l1 * l1 - x * x, 0.0))
    pipe(a["arm"], [S, S.lerp(E, .5) + h * .04 * s, E], .16 * s, .13 * s, 14)
    pipe(a["arm"], [E, W], .12 * s, .095 * s, 12)
    pipe(a["arm_dark"], [S + (E - S).normalized() * .05, S + (E - S).normalized() * .3 * s], .165 * s, .165 * s, 14)   # joint bands
    sphere(a["arm_dark"], S, .19 * s, 14, 8)
    sphere(a["arm_dark"], E, .15 * s, 12, 8)
    sphere(a["arm_dark"], W, .11 * s, 12, 6)
    Wg = W + ap * .2 * s
    pipe(a["arm"], [W, Wg], .085 * s, .085 * s, 12)
    g = Vector(grip) - ap * Vector(grip).dot(ap)
    g.normalize()
    side = ap.cross(g)
    loft(a["arm_dark"], [[tuple(Wg + ap * t + g * (y * .13 * s) + side * (x_ * .07 * s)) for y, x_ in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
                         for t in (0, .06 * s)])                                     # palm
    for sg in (-1, 1):                                                          # fingers close above and below the bar
        p0 = Wg + ap * .05 * s + g * (sg * .1 * s)
        p1 = target + ap * .06 + g * (sg * .035)
        pipe(a["arm"], [p0, p0.lerp(p1, .5) + g * (sg * .02), p1], .028 * s, .022 * s, 6)
    return E


# --- drawers -----------------------------------------------------------------------------------------------------------------
def drawer_tray(a, near, typ="metal"):
    """Open-fronted tray: base, back, a low front lip and side posts, side rails (near only) and the handle bar. The back
    plate takes the material's band colour (low saturation), so each material reads as a band from the plaza."""
    hw = DW / 2
    box(a["tray"], -hw, hw, 0, DD, 0, .04)
    box(a["back_" + typ], -hw, hw, DD - .04, DD, 0, DH)
    box(a["tray_front"], -hw, hw, -.02, .04, 0, .1)
    hx, hy, hz = HANDLE
    box(a["handle"], -.26, .26, hy - .022, hy + .022, hz - .022, hz + .022)
    if near:
        for s in (-1, 1):
            box(a["tray_front"], s * hw, s * (hw - .05), -.02, .04, 0, DH)
            box(a["tray"], s * hw, s * (hw - .04), .04, DD - .04, DH - .05, DH)
            box(a["handle"], s * .25 - .02, s * .25 + .02, hy, .0, hz - .02, hz + .02)
        box(a["tray_front"], -hw, hw, -.02, .04, DH - .06, DH)
    else:
        box(a["tray_front"], -hw, -hw + .05, -.02, .04, .1, DH)
        box(a["handle"], -.02, .02, hy, .0, hz - .02, hz + .02)


def c_metal(a, fill, near):
    """Bars end-on: cut ends in rows on a bundle, two strap bands; near drawers show the top row as whole bars."""
    rows = {"full": 8, "half": 4}.get(fill, 0)
    if not rows:
        return
    cols, r, pz = (6, .066, .15) if near else (4, .1, .225)
    rows = min(rows, 7) if near else rows
    if not near:
        rows = rows // 2
    for i in range(cols):
        for j in range(rows):
            c = (-(cols - 1) / 2 * (2 * r + .02) + (2 * r + .02) * i + (r * .5 if j % 2 else 0), .04 + r + pz * j)
            disc_y(a["metal_end"], c, .125, r * .96, 6, rot=math.pi / 6)
            if near and j == rows - 1:
                prism(a["metal"], c, "y", r, .13, DD - .12, 6, math.pi / 6)
    top = .04 + r + pz * (rows - 1) + r
    box(a["metal"], -.48, .5, .14, DD - .14, .045, top - (r if near else 0))
    for y in (.55, DD - .7):
        box(a["strap"], -.5, .52, y, y + .05, .04, top + .012)


ROLL_ROLES = ("cloth_a", "cloth_b", "cloth_c")


def c_cloth(a, fill, near, seed=0):
    """Rolls on their side, cores to the front: the wound face, a layer line and the core tube sticking out."""
    spots = [(-.28, .32), (.28, .32), (-.28, .9), (.28, .9)][:{"full": 4, "half": 2}.get(fill, 0)]
    r = .275
    n = 12 if near else 8
    for k, c in enumerate(spots):
        role = ROLL_ROLES[(k + seed) % 3]
        if near:
            secs = [[(c[0] + r * math.cos(2 * math.pi * j / n), y, c[1] + r * math.sin(2 * math.pi * j / n)) for j in range(n)] for y in (.12, DD - .12)]
            a[role].facing([q for s in secs for q in s], [(j, (j + 1) % n, n + (j + 1) % n, n + j) for j in range(n)],
                           lambda q, c=c: (q[0] - c[0], 0, q[2] - c[1]))
            disc_y(a["cloth_line"], c, .114, .185, n, r0=.17)
            prism(a["core"], c, "y", .068, .05, .4, 8)
        else:
            box(a[role], c[0] - r * .92, c[0] + r * .92, .14, DD - .14, c[1] - r * .92, c[1] + r * .92)
            disc_y(a["core"], c, .113, .068, 6)
        disc_y(a[role], c, .116, r, n, r0=.07)
        disc_y(a["core_hole"], c, .044 if near else .11, .042, 6)


def c_glass(a, fill, near, rng):
    """Pale green translucent hopper with a spout and gate at the front; granules inside to the fill height."""
    hw = .5
    walls = [(-hw, hw, .1, .14, .04, 1.18)]
    if near:
        walls += [(-hw, -hw + .04, .14, DD - .12, .04, 1.18), (hw - .04, hw, .14, DD - .12, .04, 1.18)]
    for w in walls:
        box(a["hopper"], *w)
    box(a["hopper_rim"], -hw - .02, hw + .02, .08, .16, 1.15, 1.2)
    prism(a["hopper_rim"], (0, .2), "y", .07, -.06, .12, 8)                      # spout
    for s in (-1, 1):                                                           # funnel outline on the front: the hopper shape
        pipe(a["hopper_rim"], [Vector((s * .47, .085, .62)), Vector((s * .1, .085, .1))], .022, .022, 6)
        pipe(a["hopper_rim"], [Vector((s * .47, .085, .62)), Vector((s * .47, .085, 1.15))], .022, .022, 6)
    box(a["hopper_rim"], -.1, .1, -.08, -.05, .12, .3)                           # gate
    zf = {"full": 1.02, "half": .55}.get(fill)
    if zf:
        box(a["granule"], -hw + .05, hw - .05, .15, DD - .17, .045, zf)
        if near:
            for _ in range(20):                                                 # loose top layer at the front
                QA.octa(a["granule_b"], Vector((rng.uniform(-.43, .43), rng.uniform(.16, .5), zf + rng.uniform(0, .03))), .04, rng)


def c_wood(a, fill, near):
    for x in (-.28, .28)[:{"full": 2, "half": 1}.get(fill, 0)]:
        box(a["bin"], x - .26, x + .26, .12, DD - .14, .04, 1.0)
        box(a["bin_lid"], x - .28, x + .28, .1, DD - .12, 1.0, 1.07)
        box(a["label"], x - .14, x + .14, .105, .12, .58, .78)
        if near:
            box(a["bin_lid"], x - .1, x + .1, .07, .105, .86, .9)                # lid pull (not the drawer handle)
            box(a["bin_lid"], x - .27, x + .27, .105, .13, .2, .24)              # ribs on the bin face
            box(a["bin_lid"], x - .27, x + .27, .105, .13, .42, .46)


def c_resin(a, fill, near):
    """Small replaceable jars on two tiers (the jar shelf stays when the drawer is empty)."""
    box(a["tray"], -DW / 2 + .06, DW / 2 - .06, .1, DD - .1, .64, .68)
    for z0 in {"full": (.04, .68), "half": (.04,)}.get(fill, ()):
        for x in (-.39, -.13, .13, .39):
            if near:
                n = 8
                loft(a["resin"], [[(x + .11 * math.cos(2 * math.pi * j / n), .32 + .11 * math.sin(2 * math.pi * j / n), z) for j in range(n)] for z in (z0, z0 + .46)])
                loft(a["cap"], [[(x + .115 * math.cos(2 * math.pi * j / n), .32 + .115 * math.sin(2 * math.pi * j / n), z) for j in range(n)] for z in (z0 + .46, z0 + .53)])
            else:
                box(a["resin"], x - .1, x + .1, .22, .42, z0, z0 + .46)
                box(a["cap"], x - .105, x + .105, .21, .43, z0 + .46, z0 + .52)
        if not near:
            box(a["resin_b"], -.5, .5, .5, DD - .2, z0, z0 + .4)                   # the rows behind, as one block


def drawer_mesh(typ, fill, near, seed=0):
    a = Accs()
    drawer_tray(a, near, typ)
    rng =random.Random(sum(map(ord, typ + fill)) + near)                       # stable across runs (no str hash)
    {"metal": lambda: c_metal(a, fill, near), "cloth": lambda: c_cloth(a, fill, near, seed),
     "glass": lambda: c_glass(a, fill, near, rng), "wood": lambda: c_wood(a, fill, near),
     "resin": lambda: c_resin(a, fill, near)}[typ]()
    return K.build_mesh("q10b_drawer_%s_%s_%s" % (typ, fill, "near" if near else "far"), a, 35)


# --- bay modules (built bent round u = 0) ---------------------------------------------------------------------------------------
def rack_bay():
    """One library bay of racking: left front and back posts, level beams and plates, the mid row beam and the column
    divider, and the gantry rail brackets top and bottom."""
    a = Accs()
    x0, x1 = -BAY / 2, BAY / 2
    for v in (V_RACK, V_RACK + RACK_D - .14):
        ubox(a["rack"], x0 - .07, x0 + .07, v, v + .14, Z_SLAB, Z_TOP + .1, 9)
    for k in range(NLEV + 1):
        z = Z_SLAB + k * LEV
        ubox(a["rack"], x0, x1, V_RACK, V_RACK + .1, z - .1, z, 1)
        ubox(a["rack_plate"], x0, x1, V_RACK, V_RACK + RACK_D, z - .04, z, 1)
        if k < NLEV:
            ubox(a["rack"], x0, x1, V_RACK, V_RACK + .08, z + 1.5 - .06, z + 1.5, 1)
            ubox(a["rack_plate"], x0, x1, V_RACK, V_RACK + RACK_D, z + 1.5 - .03, z + 1.5, 1)
            ubox(a["rack"], -.03, .03, V_RACK, V_RACK + .08, z, z + LEV, 1)
    for z in (Z_SLAB + .25, Z_TOP + .35):                                     # rail brackets back to the post
        ubox(a["rail"], x0 - .06, x0 + .06, V_RAIL + .08, V_RACK, z - .08, z + .08, 1)
    return K.build_mesh("q10b_rack_bay", bent(a), 30)


def rack_end():
    a = Accs()
    for v in (V_RACK, V_RACK + RACK_D - .14):
        ubox(a["rack"], -.07, .07, v, v + .14, Z_SLAB, Z_TOP + .1, 9)
    return K.build_mesh("q10b_rack_end", bent(a), 30)


def facade_bay():
    """Front glass bay v -10, z 6..42: left mullion with a cap, a transom at every level (in line with the rack beams),
    segmented panels."""
    a = Accs()
    x0, x1 = -BAY / 2, BAY / 2
    ubox(a["frame"], x0 - .035, x0 + .035, V_F, V_F + .26, Z_SLAB, Z_TOP, 9)
    ubox(a["cap_strip"], x0 - .045, x0 + .045, V_F - .04, V_F, Z_SLAB, Z_TOP, 9)
    for k in range(NLEV + 1):                                                   # a band every fourth level, slim seams between
        z = Z_SLAB + k * LEV
        if k % 4 == 0:
            ubox(a["frame"], x0, x1, V_F, V_F + .18, z - .05, z + .05, 1)
            ubox(a["cap_strip"], x0, x1, V_F - .04, V_F, z - .06, z + .06, 1)
        else:
            ubox(a["seam_glass"], x0, x1, V_F - .015, V_F + .06, z - .015, z + .015, 1)
    for k in range(NLEV):
        z = Z_SLAB + k * LEV
        a["glass"].facing([(x0 + .045, V_F + .06, z + .045), (x1 - .045, V_F + .06, z + .045), (x1 - .045, V_F + .06, z + LEV - .045),
                           (x0 + .045, V_F + .06, z + LEV - .045)], [(0, 1, 2, 3)], lambda _c: (0, -1, 0))
    return K.build_mesh("q10b_facade_bay", bent(a), 30)


def roof_bay(H, name):
    """Roof bay: the left rib (box section along the profile), purlins and the glass strip."""
    a = Accs()
    x0, x1 = -BAY / 2, BAY / 2
    prof = roof_profile(H)
    secs = []
    for i, (v, z) in enumerate(prof):
        t0, t1 = prof[max(i - 1, 0)], prof[min(i + 1, len(prof) - 1)]
        tv, tz = t1[0] - t0[0], t1[1] - t0[1]
        ln = math.hypot(tv, tz)
        nv, nz = -tz / ln, tv / ln                                               # outward normal of the section
        secs.append([(x0 + dx, v + nv * dn, z + nz * dn) for dx, dn in ((-.07, -.32), (.07, -.32), (.07, .02), (-.07, .02))])
    loft(a["frame"], secs)
    for i in range(0, len(prof), 3):
        v, z = prof[i]
        ubox(a["frame"], x0, x1, v - .05, v + .05, z - .12, z - .02, 1)
    vs, fs = [], []
    for i, (v, z) in enumerate(prof):
        vs += [(x0 + .07, v, z), (x1 - .07, v, z)]
        if i:
            fs.append((2 * i - 2, 2 * i - 1, 2 * i + 1, 2 * i))
    a["glass"].facing(vs, fs, lambda c: (0, c[1] - 2, c[2] - 30))
    return K.build_mesh("q10b_" + name, bent(a), 30)


def back_bay(H, name):
    a = Accs()
    x0, x1 = -BAY / 2, BAY / 2
    zt = H - 4                                                                  # glazed like the front, bays of 6 m
    ubox(a["frame"], x0 - .035, x0 + .035, V_B - .26, V_B, Z_SLAB, zt, 9)
    zs = [Z_SLAB + 6 * k for k in range(int((zt - Z_SLAB) // 6) + 1)] + [zt]
    for z in zs:
        ubox(a["frame"], x0, x1, V_B - .18, V_B, z - .035, z + .035, 1)
    for za, zb in zip(zs, zs[1:]):
        a["glass"].facing([(x0 + .035, V_B - .06, za + .035), (x1 - .035, V_B - .06, za + .035), (x1 - .035, V_B - .06, zb - .035),
                           (x0 + .035, V_B - .06, zb - .035)], [(0, 1, 2, 3)], lambda _c: (0, 1, 0))
    ubox(a["back"], x0, x1, V_B - .3, V_B, 0, Z_SLAB - .6, 1)                    # ground floor back wall
    return K.build_mesh("q10b_" + name, bent(a), 30)


def ground_bay(kind="glass"):
    """Ground floor glass at v -4 (the walkway's back edge): mullion, head, glass; 'door' has two leaves with pulls,
    'window' is the pickup window (counter, sill light, open)."""
    a = Accs()
    x0, x1 = -BAY / 2, BAY / 2
    zt = Z_SLAB - .6
    ubox(a["frame"], x0 - .05, x0 + .05, V_GROUND, V_GROUND + .16, 0, zt, 3)
    ubox(a["frame"], x0, x1, V_GROUND, V_GROUND + .16, zt - .12, zt, 1)
    if kind == "glass":
        a["glass"].facing([(x0 + .05, V_GROUND + .06, .02), (x1 - .05, V_GROUND + .06, .02), (x1 - .05, V_GROUND + .06, zt - .12),
                           (x0 + .05, V_GROUND + .06, zt - .12)], [(0, 1, 2, 3)], lambda _c: (0, -1, 0))
    elif kind == "door":
        for s in (-1, 1):
            xa, xb = (x0 + .06, -.02) if s < 0 else (.02, x1 - .06)
            ubox(a["frame"], xa, xb, V_GROUND + .02, V_GROUND + .12, 0, .1, 1)
            ubox(a["frame"], xa, xb, V_GROUND + .02, V_GROUND + .12, 2.9, 3.0, 1)
            a["glass"].facing([(xa, V_GROUND + .07, .1), (xb, V_GROUND + .07, .1), (xb, V_GROUND + .07, 2.9), (xa, V_GROUND + .07, 2.9)],
                              [(0, 1, 2, 3)], lambda _c: (0, -1, 0))
            ubox(a["handle"], s * .12 - .02, s * .12 + .02, V_GROUND - .06, V_GROUND, .9, 2.0, 1)
        ubox(a["frame"], x0, x1, V_GROUND, V_GROUND + .16, 3.0, 3.12, 1)
        a["glass"].facing([(x0 + .05, V_GROUND + .06, 3.12), (x1 - .05, V_GROUND + .06, 3.12), (x1 - .05, V_GROUND + .06, zt - .12),
                           (x0 + .05, V_GROUND + .06, zt - .12)], [(0, 1, 2, 3)], lambda _c: (0, -1, 0))
        ubox(a["glowline"], x0 + .2, x1 - .2, V_GROUND - .03, V_GROUND, 3.16, 3.24, 1)
    elif kind in ("dropoff", "sample"):
        # dropoff: residents hand in old things - counter, a hatch behind it, an old chair just handed in, warm sign
        # sample: a material sample counter open to the walkway - one sample of each material on the counter
        ubox(a["station"], x0 + .05, x1 - .05, V_GROUND - .5, V_GROUND + .6, 0, 1.05, 1)
        ubox(a["wood_new" if kind == "sample" else "frame"], x0 + .05, x1 - .05, V_GROUND - .55, V_GROUND + .6, 1.05, 1.12, 1)
        ubox(a["frame"], x0, x1, V_GROUND, V_GROUND + .16, 2.6, 2.75, 1)
        a["glass"].facing([(x0 + .05, V_GROUND + .06, 2.75), (x1 - .05, V_GROUND + .06, 2.75), (x1 - .05, V_GROUND + .06, zt - .12),
                           (x0 + .05, V_GROUND + .06, zt - .12)], [(0, 1, 2, 3)], lambda _c: (0, -1, 0))
        sign = "amber" if kind == "dropoff" else "glowline"
        ubox(a[sign], x0 + .1, x1 - .1, V_GROUND - .03, V_GROUND, 2.78, 2.95, 1)
        if kind == "dropoff":
            ubox(a["dark"], -.55, .55, V_GROUND + .5, V_GROUND + .56, 1.25, 2.3, 1)          # the hatch into the intake hall
            ubox(a["frame"], -.62, .62, V_GROUND + .44, V_GROUND + .5, 1.18, 2.37, 1)
            QA.chair(a, Matrix.Translation((.35, V_GROUND - .1, 1.12)) @ Matrix.Rotation(math.radians(160), 4, "Z"))
        else:
            z = 1.12
            for q, typ in enumerate(TYPES):
                x = -1.0 + .5 * q
                if typ == "metal":
                    for m in range(3):
                        for n in range(2):
                            prism(a["metal"], (x - .06 + .06 * m, z + .04 + .07 * n), "y", .03, V_GROUND - .35, V_GROUND + .25, 6)
                elif typ == "cloth":
                    prism(a["cloth_b"], (x, z + .14), "y", .14, V_GROUND - .3, V_GROUND + .25, 12)
                    prism(a["core"], (x, z + .14), "y", .04, V_GROUND - .33, V_GROUND + .28, 8)
                elif typ == "glass":
                    ubox(a["hopper"], x - .13, x + .13, V_GROUND - .3, V_GROUND + .1, z, z + .32, 1)
                    ubox(a["granule"], x - .11, x + .11, V_GROUND - .28, V_GROUND + .08, z + .01, z + .2, 1)
                elif typ == "wood":
                    ubox(a["bin"], x - .14, x + .14, V_GROUND - .3, V_GROUND + .1, z, z + .26, 1)
                    ubox(a["bin_lid"], x - .15, x + .15, V_GROUND - .31, V_GROUND + .11, z + .26, z + .3, 1)
                else:
                    for m in (-1, 1):
                        prism(a["resin"], (x + m * .08, V_GROUND - .1), "z", .065, z, z + .24, 10)
                        prism(a["cap"], (x + m * .08, V_GROUND - .1), "z", .07, z + .24, z + .28, 10)
    else:                                                                       # pickup window
        ubox(a["station"], x0 + .05, x1 - .05, V_GROUND - .5, V_GROUND + .6, 0, 1.05, 1)
        ubox(a["frame"], x0 + .05, x1 - .05, V_GROUND - .55, V_GROUND + .6, 1.05, 1.12, 1)
        ubox(a["frame"], x0, x1, V_GROUND, V_GROUND + .16, 2.6, 2.75, 1)
        a["glass"].facing([(x0 + .05, V_GROUND + .06, 2.75), (x1 - .05, V_GROUND + .06, 2.75), (x1 - .05, V_GROUND + .06, zt - .12),
                           (x0 + .05, V_GROUND + .06, zt - .12)], [(0, 1, 2, 3)], lambda _c: (0, -1, 0))
        ubox(a["glowline"], x0 + .1, x1 - .1, V_GROUND - .03, V_GROUND, 2.78, 2.9, 1)
        ubox(a["glowline"], x0 + .1, x1 - .1, V_GROUND - .56, V_GROUND - .5, .95, 1.0, 1)
    return K.build_mesh("q10b_ground_bay_" + kind, bent(a), 30)


def column():
    """Branching walkway column (library branch_strut) on its plinth: the root stands on the plinth, three limbs reach the
    slab underside."""
    a = Accs()
    lathe(a["node"], [(.95, -.02), (.95, .25), (.8, .4), (.01, .42)], 28, 0, V_F + .6)
    ring(a["seam"], .94, .97, .08, .14, 28, 0, V_F + .6)
    base = three((0, V_F + .6, .4))
    tips = [three((-1.55, V_F + .15, Z_SLAB - .6)), three((1.55, V_F + .15, Z_SLAB - .6)), three((0, V_F + 2.6, Z_SLAB - .6))]
    M.branch_strut(K.ctx(a, random.Random(7)), base, tips, r=.34, role="white", twigs=False, web=True, pads=[(0, 1, 0)], limb_r=.7)
    return K.build_mesh("q10b_column", bent(a), 40)


# --- unique structure (straight, bent at the end) --------------------------------------------------------------------------
def structure():
    a = Accs()
    ubox(a["slab_edge"], U0, U1, V_F - .3, V_B, Z_SLAB - .6, Z_SLAB, 2)            # slab over the walkway
    for v in (-8.6, -6.0):
        ubox(a["glowline"], U0 + .5, U1 - .5, v - .06, v + .06, Z_SLAB - .62, Z_SLAB - .6, 2)
    ubox(a["floor_in"], U0, U1, V_GROUND, V_B, -.08, 0, 2)                          # ground floor
    ubox(a["frame"], U0, U1, V_F - .1, V_F + .2, Z_TOP - .1, Z_TOP + .2, 2)         # eaves beam where the roof starts
    ubox(a["slab_edge"], U0, U0 + N_IN * BAY, V_F + .3, V_B - .3, Z_DIS - .4, Z_DIS, 2)   # dismantling room floor
    ubox(a["slab_edge"], U1 - N_FORM * BAY, U1, V_F + .3, V_B - .3, Z_FORM - .4, Z_FORM, 2)  # forming room floor
    ubox(a["slab_edge"], U1 - N_FORM * BAY, U1, V_F + .3, V_B - .3, Z_DIS - .4, Z_DIS, 2)
    for z in (Z_FORM,):                                                         # upper catwalk behind the racks (z 18: backside())
        ubox(a["rack_plate"], U0 + N_IN * BAY, U1 - N_FORM * BAY, V_RACK + RACK_D, V_RACK + RACK_D + 2.2, z - .1, z, 2)
    # main columns at every fourth bay line, just inside the facade, in line with the mullions
    for k in range(0, NB + 1, 4):
        u = U0 + k * BAY
        ubox(a["frame"], u - .16, u + .16, V_F + .32, V_F + .9, Z_SLAB, Z_TOP, 9)
    # the step where the forming room's taller roof starts, and the two end walls
    uf = U1 - N_FORM * BAY
    prof_a, prof_b = roof_profile(ROOF_H), roof_profile(ROOF_H_FORM)
    vs = [(uf, v, z) for v, z in prof_a] + [(uf, v, z) for v, z in prof_b]
    n = len(prof_a)
    a["glass"].facing(vs, [(i, i + 1, n + i + 1, n + i) for i in range(n - 1)], lambda _c: (-1, 0, 0))
    end_wall(a, U0, ROOF_H, -1)
    end_wall(a, U1, ROOF_H_FORM, 1, hole=(-4 - BRIDGE_W / 2 - .05, -4 + BRIDGE_W / 2 + .05, Z_FORM, Z_FORM + 3.4))
    rails(a)
    return a


def end_wall(a, u, H, side, hole=None):
    vs_ = [V_F + k for k in range(0, 21)]
    for v in vs_[::4]:                                                           # mullions every 4 m
        zt = zprof(v, H) if V_F < v < V_B else (Z_TOP if v == V_F else H - 4)
        ubox(a["frame"], u - .1, u + .1, v - .06, v + .06, 0 if v >= V_GROUND else Z_SLAB, zt, 1)
    for v0, v1 in zip(vs_, vs_[1:]):
        z0 = Z_SLAB if v1 <= V_GROUND else .02
        za, zb = zprof(v0, H) if v0 > V_F else Z_TOP, zprof(v1, H)
        cells = [(z0, None)]
        if hole and hole[0] <= v0 and v1 <= hole[1]:
            cells = [(z0, hole[2]), (hole[3], None)]
        for c0, c1 in cells:
            top0, top1 = (za, zb) if c1 is None else (c1, c1)
            if top0 - c0 < .1:
                continue
            a["glass"].facing([(u, v0, c0), (u, v1, c0), (u, v1, top1), (u, v0, top0)], [(0, 1, 2, 3)], lambda _c: (side, 0, 0))
    if hole:
        for z in (hole[2] - .1, hole[3]):
            ubox(a["frame"], u - .12, u + .12, hole[0], hole[1], z, z + .14, 1)


def rails(a):
    """Gantry rails along the library front, top and bottom, on the rack brackets."""
    ua, ub = U0 + N_IN * BAY, U1 - N_FORM * BAY
    for z in (Z_SLAB + .25, Z_TOP + .35):
        ubox(a["rail"], ua, ub, V_RAIL - .1, V_RAIL + .1, z - .1, z + .1, 1.5)
        ubox(a["rail_head"], ua, ub, V_RAIL - .14, V_RAIL - .1, z - .05, z + .05, 1.5)


# --- library -----------------------------------------------------------------------------------------------------------------
GANTRIES = ((5, 3, 0, 1), (8, 5, 0, 1), (12, 7, 0, 1), (16, 9, 0, 0), (19, 2, 0, 0))   # (bay right of the mast, level, slot column, row)


def drawer_states(rng, template=False):
    """{(bay, level, col, row): (type, fill, pulled)} for the library."""
    out = {}
    for i in range(1 if template else N_LIB):
        for lv in range(NLEV):
            for c in (0, 1):
                for r in (0, 1):
                    if template:                                               # two levels per type, every fill side by side
                        typ = ("metal", "metal", "cloth", "cloth", "glass", "glass", "wood", "wood", "resin", "resin", "metal", "cloth")[lv]
                        fill = ("full", "half", "empty", "full")[(c + 2 * r + lv) % 4]
                    else:
                        typ = lib_type(i)
                        x = rng.random()
                        fill = "full" if x < .55 else "half" if x < .85 else "empty"
                    out[(i, lv, c, r)] = (typ, fill, False)
    pulls = [(0, 3, 0, 1), (0, 6, 1, 0), (0, 9, 0, 1)] if template else list(GANTRIES)   # every pulled drawer has its arm
    for key in pulls:
        t, f, _p = out[key]
        out[key] = (t, "full" if f == "empty" else f, True)
    return out


def slot_origin(i, lv, c, r, pulled, u_of=lib_u):
    u = u_of(i) + (-1 if c == 0 else 1) * (BAY / 4 - .02)
    z = Z_SLAB + lv * LEV + .02 + r * 1.5
    v = V_RACK + .03 - (PULL if pulled else 0)
    return u, v, z


def runners(a, states, u_of=lib_u):
    """Telescopic runners under each pulled drawer, from the rack face to the drawer front."""
    for (i, lv, c, r), (_t, _f, pulled) in states.items():
        if pulled:
            u, v, z = slot_origin(i, lv, c, r, True, u_of)
            for s in (-1, 1):
                ubox(a["rail"], u + s * (DW / 2 - .02) - .03, u + s * (DW / 2 - .02) + .03, v + .05, V_RACK + .2, z + .02, z + .1, 1)


def gantries(a, states, u_of=lib_u, template=False):
    """A mast on the rails at each gantry bay line, its carriage at the pulled drawer's height, and an arm gripping that
    drawer's handle. Returns the handle points and the gripper finger tips for the check."""
    out = []
    for g in ((0, 3, 0, 1),) if template else GANTRIES:
        i, lv, c, r = g
        um = u_of(i) - BAY / 2
        ubox(a["mast"], um - .13, um + .13, V_RAIL - .13, V_RAIL + .13, Z_SLAB + .35, Z_TOP + .25, 6)
        for z in (Z_SLAB + .25, Z_TOP + .35):                                   # trucks on the rails
            ubox(a["arm_dark"], um - .32, um + .32, V_RAIL - .24, V_RAIL + .2, z - .2, z + .2, 1)
        u, v, z = slot_origin(i, lv, c, r, True, u_of)
        hand = Vector((u + HANDLE[0], v + HANDLE[1], z + HANDLE[2]))
        zc = hand.z - .6
        ubox(a["arm_dark"], um - .28, um + .28, V_RAIL - .36, V_RAIL + .2, zc - .45, zc + .45, 1)   # carriage
        ubox(a["glowline"], um - .2, um + .2, V_RAIL - .37, V_RAIL - .36, zc + .3, zc + .36, 1)
        base = Vector((um + .28, V_RAIL - .12, zc))                             # arm on the carriage's side, toward the drawer
        robot_arm(a, base, (1, 0, 0), hand, (0, 1, 0), l1=.75, l2=.7, hint=(0, -1, .9), s=.85)
        out.append((tuple(hand), i, lv))
    return out


# --- intake -----------------------------------------------------------------------------------------------------------------
UB = U0 + N_IN * BAY                 # where the intake end meets the library
DOCK_V = (-8.3, -6.3)                # unloading platform under the tube ends, along the front glass
BENCH_V = -4.4                       # dismantling benches, one per tube lane
AISLE_V = (-3.8, .4)                 # back transport aisle behind the racks (z 18), conveyor near the racks
CONV_V = -2.4


def tube_path(k):
    u = bay_u(TUBE_BAYS[k])
    return QA.cubic(Vector((u - .8 * (k - 1), -23.5 - 1.2 * (1 - k), 1.6)), Vector((u - .8 * (k - 1), -22.5, 15.0)),
                    Vector((u, -15.0, TUBE_Z)), Vector((u, -8.9, TUBE_Z)), 56)


TUBE_Z = 25.5                        # the tubes come through the glass above the work band (z 18 - 23), then drop to the platform


def metal_leg(a, p, d, ln=.46):
    """A chair's steel tube leg lying along d."""
    d = Vector(d).normalized()
    pipe(a["metal"], [Vector(p), Vector(p) + d * ln], .018, .018, 8)


def intake(rng):
    """Dismantling room on the z 18 floor, worked front to back: the tubes drop onto an unloading platform along the glass
    (a whole chair just arrived under the hero tube), an arm takes chairs to the dismantling benches (back, legs and seat
    apart), the parts go into sorted crates on the belt that runs into the back aisle behind the racks."""
    a = Accs()
    zt = Z_DIS + 1.1                                                            # platform top
    box(a["floor_work"], U0 + .4, UB - .2, -8.9, 1.2, Z_DIS, Z_DIS + .012)          # the work floor, darker than the slab
    box(a["back_metal"], U0 + .4, UB - .2, 1.2, 1.4, Z_DIS, Z_DIS + 7.5)            # backdrop behind the line, so the parts read
    box(a["glowline"], U0 + .4, UB - .2, 1.18, 1.2, Z_DIS + 7.3, Z_DIS + 7.45)
    for j in range(6):                                                          # chairs waiting by the end wall, stacked
        QA.chair(a, Matrix.Translation((U0 + 1.3, -3.6 + .65 * (j % 3), Z_DIS + .5 * (j // 3))) @ Matrix.Rotation(math.radians(95), 4, "Z"))
    box(a["station"], U0 + 1.2, UB - .6, DOCK_V[0], DOCK_V[1], Z_DIS, zt)
    box(a["glowline"], U0 + 1.2, UB - .6, DOCK_V[0] - .02, DOCK_V[0], zt - .14, zt - .08)
    box(a["dark"], U0 + 1.2, UB - .6, DOCK_V[0] - .01, DOCK_V[1] + .01, zt, zt + .02)
    for k in range(len(TUBE_BAYS)):
        pts = tube_path(k)
        QA.open_tube(a["tube_glass"], pts, TUBE_R, 28)
        fr = QA.frames(pts)
        for p in QA.resample(pts, 4.5)[1:]:
            i = min(range(len(pts)), key=lambda j: (pts[j] - p).length)
            QA.collar(a["frame"], p, fr[i][0], TUBE_R - .02, TUBE_R + .1, .12, 28)
        cp = min(pts, key=lambda p: abs(p.y - V_F))                             # facade collar where the tube passes the glass
        QA.collar(a["frame"], cp, Vector((0, 1, 0)), TUBE_R - .02, TUBE_R + .45, .35, 28)
        rail = [p + QA.down_at(t) * (TUBE_R - .18) for p, (t, _u, _w) in zip(pts, fr)]
        pipe(a["rail"], rail, .05, .05, 6)
        st = pts[0]                                                             # plaza station
        lathe(a["station"], [(.01, 0), (2.0, 0), (2.0, .9), (1.6, 1.25), (TUBE_R + .15, 1.4), (TUBE_R + .15, 1.9), (.01, 1.9)], 32, st.x, st.y)
        ring(a["glowline"], 1.98, 2.03, .8, .88, 32, st.x, st.y)
        T = Matrix.Translation(st + Vector((0, -1.95, .45))) @ Matrix.Rotation(math.pi, 4, "Z")
        QA.tbox(a["dark"], T, (0, 0, .35), (1.3, .06, .7))
        for f in ((.12, .42) if k == HERO_TUBE else (.3,)):                     # what rides in each tube
            i = int(f * (len(pts) - 1))
            p = pts[i] + QA.down_at(fr[i][0]) * (TUBE_R - .26)
            T = Matrix.Translation(p) @ Matrix.Rotation(math.radians(80 + 20 * k), 4, "Z")
            QA.tbox(a["carrier"], T, (0, 0, -.05), (.62, .58, .08))
            if k == 2:
                QA.tbox(a["wood"], T, (0, 0, .25), (.7, .5, .5))
            else:
                QA.chair(a, T)
        # the tube end turns down onto the platform: a glass hood over a hatch
        u = pts[-1].x
        end = pts[-1]
        drop = Vector((u, -7.3, zt + .02))                                      # the hood stands on the platform over its hatch
        hood = QA.cubic(end, end + Vector((0, 1.0, 0)), drop + Vector((0, 0, 2.6)), drop, 14)
        QA.open_tube(a["tube_glass"], hood, TUBE_R * .85, 24)
        QA.collar(a["frame"], drop, (drop - hood[-2]).normalized(), TUBE_R * .85 - .02, TUBE_R * .85 + .18, .1, 24)
        box(a["dark"], u - .9, u + .9, -8.1, -6.5, zt, zt + .03)
        for s in (-1, 1):                                                       # hood legs on the platform
            box(a["frame"], u + s * 1.15 - .05, u + s * 1.15 + .05, -7.35, -7.25, zt, zt + 1.0)
        # what has just arrived on the platform
        for q in (-1.6, 1.6):                                                   # a queue of whole chairs along the platform
            QA.chair(a, Matrix.Translation((u + q, -7.3, zt)) @ Matrix.Rotation(math.radians(180 + 25 * q), 4, "Z"))
        if k == HERO_TUBE:
            QA.chair(a, Matrix.Translation((u + .1, -7.2, zt + .03)) @ Matrix.Rotation(math.radians(200), 4, "Z"))
        elif k == 0:
            QA.chair(a, Matrix.Translation((u, -7.0, zt + .5)) @ Matrix.Rotation(math.radians(90), 4, "X") @ Matrix.Rotation(math.radians(30), 4, "Z"))
        else:
            QA.tbox(a["wood"], Matrix.Translation((u, -7.2, zt)) @ Matrix.Rotation(math.radians(12), 4, "Z"), (0, 0, .3), (.8, .55, .6))
        # dismantling bench in the lane behind
        bx = u
        box(a["station"], bx - 1.3, bx + 1.3, BENCH_V - .6, BENCH_V + .6, Z_DIS, Z_DIS + .88)
        box(a["dark"], bx - 1.32, bx + 1.32, BENCH_V - .62, BENCH_V + .62, Z_DIS + .88, Z_DIS + .95)
        box(a["glowline"], bx - 1.3, bx + 1.3, BENCH_V - .63, BENCH_V - .61, Z_DIS + .7, Z_DIS + .76)
        lamp = Z_DIS + 3.4                                                      # task light over the bench
        box(a["frame"], bx - 1.2, bx + 1.2, BENCH_V - .1, BENCH_V + .1, lamp, lamp + .08)
        box(a["glowline"], bx - 1.1, bx + 1.1, BENCH_V - .08, BENCH_V + .08, lamp - .02, lamp)
        for s in (-1, 1):
            pipe(a["handle"], [Vector((bx + s * 1.1, BENCH_V, lamp + .08)), Vector((bx + s * 1.1, BENCH_V, Z_DIS + 6.5))], .015, .015, 4)
        top = Z_DIS + .95
        if k == HERO_TUBE:                                                      # the chair apart: seat frame, back, cushion, steel legs
            seat = Accs()
            QA.chair(seat, Matrix.Translation((bx - .65, BENCH_V, top)) @ Matrix.Rotation(math.radians(-8), 4, "Z"))
            for role in ("wood", "wood_dark"):
                vs = [(x, y, z) for x, y, z in seat[role].v]
                a[role]._push(vs, seat[role].f)
            QA.chair(a, Matrix.Translation((bx + .35, BENCH_V + .05, top - .58)) @ Matrix.Rotation(math.radians(80), 4, "X"), "back")
            QA.tbox(a["fabric_old"], Matrix.Translation((bx + .75, BENCH_V - .3, top)) @ Matrix.Rotation(math.radians(-20), 4, "Z"), (0, 0, .03), (.40, .38, .06))
            for j in range(4):
                metal_leg(a, (bx + .25 + .1 * j, BENCH_V + .35, top + .02), (1, .25, 0))
        elif k == 0:
            QA.tbox(a["fabric_old"], Matrix.Translation((bx - .4, BENCH_V, top)), (0, 0, .04), (.45, .4, .08))
            QA.tbox(a["fabric_old"], Matrix.Translation((bx + .3, BENCH_V + .1, top)) @ Matrix.Rotation(.4, 4, "Z"), (0, 0, .04), (.4, .36, .08))
            for j in range(3):
                metal_leg(a, (bx + .5, BENCH_V - .3 + .12 * j, top + .02), (1, 0, 0), .5)
        else:
            for j in range(5):
                QA.tbox(a["wood"], Matrix.Translation((bx - .7 + .3 * j, BENCH_V, top)) @ Matrix.Rotation(.15 * j, 4, "Z"), (0, 0, .02), (.05, .6, .04))
    # the arm that brings the chair from the platform: gripping the hero chair's back on the bench
    hu = bay_u(TUBE_BAYS[HERO_TUBE])
    base = Vector((hu + 1.9, -5.6, Z_DIS))
    lathe(a["arm_dark"], [(.01, Z_DIS), (.55, Z_DIS), (.55, Z_DIS + .06), (.01, Z_DIS + .06)], 20, base.x, base.y)
    robot_arm(a, base, (0, 0, 1), Vector((hu + .35, BENCH_V + .1, Z_DIS + .95 + .48)), (0, 0, -1), l1=2.1, l2=1.8,
              hint=(.4, -.6, 1), grip=(1, 0, 0), s=1.7)
    # sorted crates riding the belt into the back aisle, open sorting bins beyond it
    box(a["conveyor"], U0 + 1.5, UB + 1.0, CONV_V - .55, CONV_V + .55, Z_DIS + .72, Z_DIS + .85)
    for x in [U0 + 2 + 1.6 * j for j in range(int((UB - U0 - 1) / 1.6) + 1)]:
        for s in (-1, 1):
            box(a["frame"], x - .05, x + .05, CONV_V + s * .48 - .05, CONV_V + s * .48 + .05, Z_DIS, Z_DIS + .72)
    for j, role in enumerate(("wood", "fabric_old", "metal", "wood", "metal", "fabric_old")):
        x = U0 + 3.0 + 2.1 * j
        box(a["crate"], x - .5, x + .5, CONV_V - .42, CONV_V + .42, Z_DIS + .85, Z_DIS + 1.35)
        box(a[role], x - .42, x + .42, CONV_V - .34, CONV_V + .34, Z_DIS + .9, Z_DIS + 1.28)
    for j, role in enumerate(("wood", "fabric_old", "metal", "resin")):
        x = U0 + 3.2 + 3.0 * j
        box(a["bin_open"], x - .8, x + .8, -.6, .8, Z_DIS, Z_DIS + 1.1)
        box(a[role], x - .7, x + .7, -.5, .7, Z_DIS + .1, Z_DIS + .85)
        box(a["label"], x - .3, x + .3, -.62, -.6, Z_DIS + .7, Z_DIS + .95)
    # the intake hall under the room and the overhead crane under the roof
    for j in range(3):
        x = U0 + (1.2 + 2 * j) * BAY
        lathe(a["station"], [(.01, 0), (1.2, 0), (1.2, 2.2), (.4, 3.2), (.4, 5.4), (.01, 5.4)], 24, x, -1.5)
    for v in (-8.0, 6.0):
        box(a["rail"], U0 + .5, UB - .5, v - .15, v + .15, 40.0, 40.4)
    box(a["mast"], U0 + 6.0, U0 + 6.6, -8.0, 6.0, 40.4, 41.0)
    box(a["arm_dark"], U0 + 5.8, U0 + 6.8, -3.4, -2.4, 39.6, 40.4)
    pipe(a["handle"], [Vector((U0 + 6.3, -2.9, 39.6)), Vector((U0 + 6.3, -2.9, 33.5))], .03, .03, 6)
    box(a["crate"], U0 + 5.7, U0 + 6.9, -3.5, -2.3, 32.3, 33.5)
    return a


def backside():
    """Back transport aisle (z 18) from the dismantling room along the back of the racks: the belt carries crates to a
    lift platform at a rack bay that raises them to the level they are stored at; a glowing edge and handrail."""
    a = Accs()
    ue = UB + 18 * BAY
    ubox(a["rack_plate"], UB - .2, ue, AISLE_V[0], AISLE_V[1], Z_DIS - .12, Z_DIS, 2)
    ubox(a["glowline"], UB, ue, AISLE_V[1] - .04, AISLE_V[1], Z_DIS - .1, Z_DIS - .02, 2)
    ubox(a["rail"], UB, ue, AISLE_V[1] - .06, AISLE_V[1], Z_DIS + 1.0, Z_DIS + 1.06, 2)
    for k in range(N_IN, N_IN + 18):
        u = U0 + k * BAY
        ubox(a["rail"], u - .03, u + .03, AISLE_V[1] - .06, AISLE_V[1], Z_DIS, Z_DIS + 1.0, 1)
    ubox(a["conveyor"], UB, ue - 2.0, CONV_V - .55, CONV_V + .55, Z_DIS + .72, Z_DIS + .85, 2)
    for j in range(4):
        u = UB + 4 + 6.5 * j
        role = ("metal", "wood", "fabric_old", "metal")[j]
        box(a["crate"], u - .5, u + .5, CONV_V - .42, CONV_V + .42, Z_DIS + .85, Z_DIS + 1.35)
        box(a[role], u - .42, u + .42, CONV_V - .34, CONV_V + .34, Z_DIS + .9, Z_DIS + 1.28)
    for lu, zp, role in ((UB + 6 * BAY, 27.0, "metal"), (ue - .8, 33.0, "fabric_old")):  # lifts: a lit cage raising a crate
        for s in (-1, 1):
            for v in (-3.6, .2):
                ubox(a["mast"], lu + s * 1.3 - .16, lu + s * 1.3 + .16, v - .16, v + .16, Z_SLAB, Z_TOP, 1)
        box(a["arm_dark"], lu - 1.3, lu + 1.3, -3.6, .2, zp - .18, zp)
        for v in (-3.62, .2):
            box(a["glowline"], lu - 1.3, lu + 1.3, v, v + .02, zp - .15, zp - .05)
        for s in (-1, 1):
            box(a["glowline"], lu + s * 1.3 - .02, lu + s * 1.3 + .02, .36, .4, Z_SLAB, Z_TOP)
        for j, x in enumerate((-.6, .6)):
            box(a["crate"], lu + x - .5, lu + x + .5, CONV_V - .45, CONV_V + .45, zp, zp + .5)
            box(a[role], lu + x - .42, lu + x + .42, CONV_V - .37, CONV_V + .37, zp + .05, zp + .44)
        for s in (-1, 1):
            pipe(a["handle"], [Vector((lu + s * 1.1, -1.6, zp)), Vector((lu + s * 1.1, -1.6, Z_TOP))], .025, .025, 4)
    return a


# --- forming room and bridge ----------------------------------------------------------------------------------------------------
BENCH_L, BENCH_D = 2.2, .62           # the regenerated bench made here (and used on the plaza)
BENCH_FEET_X, BENCH_FEET_Y = (-.95, .95), (-.24, .20)   # its four feet


def regen_bench(a, T, stage="done"):
    """Regenerated bench, 2.2 x .62 x .84 m: two white bent-steel end frames (four feet, at x +-.95, y -.24 / +.20),
    light new-wood seat slats and a three-slat back. stage 'half': frames and three of six seat slats only (no back) -
    the piece on the forming jig."""
    for x in BENCH_FEET_X:
        QA.tbox(a["frame"], T, (x, -.24, .21), (.06, .06, .42))
        QA.tbox(a["frame"], T, (x, .2, .21), (.06, .06, .42))
        QA.tbox(a["frame"], T, (x, -.02, .43), (.06, .52, .045))
        if stage == "done":
            QA.tbox(a["frame"], T, (x, .25, .63), (.05, .05, .42))
    slats = 6 if stage == "done" else 3
    for j in range(slats):
        QA.tbox(a["wood_new"], T, (0, -.25 + .095 * j, .47), (BENCH_L, .085, .035))
    if stage == "done":
        for j in range(3):
            QA.tbox(a["wood_new"], T, (0, .27, .55 + .11 * j), (BENCH_L, .03, .085))


def forming(rng):
    """Forming room (z 30): the jig against the glass with a half-made bench, one arm lowering the next seat slat onto
    it and one holding a clamp on the frame, open floor round both arms; a transfer to the belt that carries a finished
    bench into the bridge. Formed panels and leg stock wait at the back; finishing and storage below."""
    a = Accs()
    uf0 = U1 - N_FORM * BAY
    jig = (uf0 + 8.5, -7.0)
    zj = Z_FORM + .8
    box(a["station"], jig[0] - 1.4, jig[0] + 1.4, jig[1] - .5, jig[1] + .5, Z_FORM, zj)
    box(a["glowline"], jig[0] - 1.4, jig[0] + 1.4, jig[1] - .52, jig[1] - .5, zj - .15, zj - .1)
    ring(a["glowline"], 5.0, 5.1, Z_FORM + .005, Z_FORM + .02, 64, *bend_free(jig))     # the arms' working circle on the floor
    regen_bench(a, Matrix.Translation((jig[0], jig[1], zj)), "half")
    slat = Vector((jig[0], jig[1] + .035, zj + .47 + .75))                          # the next slat, over its place
    QA.tbox(a["wood_new"], Matrix.Translation(slat), (0, 0, 0), (BENCH_L, .085, .035))
    robot_arm(a, (jig[0] - 3.2, jig[1] - 1.7, Z_FORM + .6), (0, 0, 1), slat + Vector((0, 0, .03)), (0, 0, -1), l1=2.2, l2=1.9,
              hint=(-.3, -.6, 1), grip=(0, 1, 0), s=1.6)
    robot_arm(a, (jig[0] + 3.2, jig[1] + 1.9, Z_FORM + .6), (0, 0, 1), Vector((jig[0] + 1.0, jig[1] - .02, zj + .45)), (0, 0, -1),
              l1=2.2, l2=1.9, hint=(.3, .6, 1), grip=(1, 0, 0), s=1.6)
    for p in ((jig[0] - 3.2, jig[1] - 1.7), (jig[0] + 3.2, jig[1] + 1.9)):
        box(a["station"], p[0] - .8, p[0] + .8, p[1] - .8, p[1] + .8, Z_FORM, Z_FORM + .6)
        box(a["glowline"], p[0] - .81, p[0] + .81, p[1] - .81, p[1] + .81, Z_FORM + .5, Z_FORM + .54)
    # leg stock and formed panels at the back, out of the arms' reach
    tx, ty = uf0 + 3.5, 3.5
    box(a["station"], tx - 1.1, tx + 1.1, ty - .6, ty + .6, Z_FORM, Z_FORM + .8)
    for j in range(7):
        box(a["frame"], tx - .9 + .3 * j, tx - .84 + .3 * j, ty - .45, ty + .45, Z_FORM + .8, Z_FORM + .86)
    px, py = uf0 + 15.5, 4.5
    box(a["station"], px - 1.4, px + 1.4, py - .7, py + .7, Z_FORM, Z_FORM + .3)
    for j in range(9):
        Tp = Matrix.Translation((px - 1.1 + .27 * j, py, Z_FORM + .3)) @ Matrix.Rotation(math.radians(-12 + 3 * j), 4, "Y")
        QA.tbox(a["panel"], Tp, (0, 0, 1.2), (.04, 1.1, 2.4))
    lathe(a["hopper"], [(.01, Z_FORM + 1.6), (.4, Z_FORM + 1.6), (1.0, Z_FORM + 3.0), (1.0, Z_FORM + 3.4), (.01, Z_FORM + 3.4)], 20, uf0 + 4.5, 0.0)
    pipe(a["rail"], [Vector((uf0 - .5, 0.0, Z_FORM + 6.5)), Vector((uf0 + 4.5, 0.0, Z_FORM + 3.4))], .3, .3, 12)
    # transfer from the jig to the belt, the belt to the bridge mouth (belt top = floor + .75), a finished bench on it
    cv = -4.0
    box(a["conveyor"], jig[0] + 1.6, jig[0] + 2.6, jig[1] - .4, cv, Z_FORM + .65, Z_FORM + .75)
    belt_end = HANDOVER[0]
    box(a["conveyor"], jig[0] + 1.6, belt_end, cv - .55, cv + .55, Z_FORM + .65, Z_FORM + .75)
    for x in [jig[0] + 1.8 + 1.5 * j for j in range(int((belt_end - jig[0] - 1.8) / 1.5) + 1)]:
        for s in (-1, 1):
            box(a["frame"], x - .05, x + .05, cv + s * .5 - .05, cv + s * .5 + .05, Z_FORM, Z_FORM + .65)
    for s in (-1, 1):
        box(a["frame"], jig[0] + 1.6, belt_end, cv + s * .6 - .04, cv + s * .6 + .04, Z_FORM + .6, Z_FORM + .82)
    handover(a)
    prep_floor(a, Z_SLAB, "prep")
    prep_floor(a, Z_DIS, "assembly")
    return a, (jig, slat)


HANDOVER = (U1 - 2.6, U1 - .5)        # the handover station at the belt's end, where a finished bench goes onto a cart


def handover(a):
    """Handover station: a portal over a roller table at belt height with a stop bar and a lift that lowers the bench
    onto the cart waiting on the rails below; lit header, two lit floor marks where the cart parks."""
    u0, u1 = HANDOVER
    cv, zb = -4.0, Z_FORM + .75
    box(a["station"], u0, u1, cv - .62, cv + .62, Z_FORM + .38, zb - .08)          # roller table on a lift
    for x in [u0 + .15 + .25 * j for j in range(int((u1 - u0 - .2) / .25) + 1)]:
        prism(a["rail"], (x, zb - .05), "y", .04, cv - .55, cv + .55, 8)
    box(a["handle"], u1 - .08, u1, cv - .6, cv + .6, zb, zb + .25)                  # stop bar
    for s in (-1, 1):                                                           # portal
        box(a["frame"], u0 - .1, u0 + .1, cv + s * 1.0 - .1, cv + s * 1.0 + .1, Z_FORM, Z_FORM + 3.0)
        box(a["frame"], u1 - .1, u1 + .1, cv + s * 1.0 - .1, cv + s * 1.0 + .1, Z_FORM, Z_FORM + 3.0)
        box(a["frame"], u0 - .1, u1 + .1, cv + s * 1.0 - .1, cv + s * 1.0 + .1, Z_FORM + 2.9, Z_FORM + 3.1)
    box(a["frame"], u0 - .1, u1 + .1, cv - 1.1, cv + 1.1, Z_FORM + 3.0, Z_FORM + 3.15)
    box(a["amber"], u0, u1, cv - 1.12, cv - 1.1, Z_FORM + 2.92, Z_FORM + 3.08)     # lit header: handover
    for s in (-1, 1):                                                           # lift cylinders under the table
        prism(a["handle"], (u0 + .3, cv + s * .45), "z", .06, Z_FORM, Z_FORM + .4, 8)
        prism(a["handle"], (u1 - .3, cv + s * .45), "z", .06, Z_FORM, Z_FORM + .4, 8)
    box(a["glowline"], u0, u1, cv - 1.0, cv - .96, Z_FORM, Z_FORM + .01)
    box(a["glowline"], u0, u1, cv + .96, cv + 1.0, Z_FORM, Z_FORM + .01)


def clamp(a, x, y, z, s=1.0):
    """C-clamp on a table edge at (x, y), top of the table at z."""
    box(a["handle"], x - .03 * s, x + .03 * s, y - .02, y + .1 * s, z - .12 * s, z + .14 * s)
    box(a["handle"], x - .03 * s, x + .03 * s, y - .02, y + .02, z + .1 * s, z + .14 * s)
    box(a["rail_head"], x - .02, x + .02, y - .02, y + .02, z + .14 * s, z + .3 * s)


def prep_floor(a, z, kind):
    """A workstation floor between the library and the forming room: a cart on rails from the rack end, a worktable with
    legs, clamps and a task light, the material on it, and an upright rack against the back wall. 'prep' (z 6): cutting
    regenerated panels; 'assembly' (z 18): putting bench frames and slats together."""
    uf0 = U1 - N_FORM * BAY
    box(a["floor_work"], uf0 + .3, uf0 + 19.0, -7.6, 9.4, z, z + .012)
    tu, tv = uf0 + 8.0, -4.4                                                    # worktable
    top = z + .9
    box(a["wood_new" if kind == "prep" else "station"], tu - 1.6, tu + 1.6, tv - .75, tv + .75, top - .06, top)
    box(a["frame"], tu - 1.55, tu + 1.55, tv - .7, tv + .7, top - .16, top - .06)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(a["frame"], tu + sx * 1.45 - .05, tu + sx * 1.45 + .05, tv + sy * .6 - .05, tv + sy * .6 + .05, z, top - .16)
    box(a["frame"], tu - 1.45, tu + 1.45, tv - .03, tv + .03, z + .25, z + .3)        # stretcher
    for x in (-1.1, 0, 1.1):
        clamp(a, tu + x, tv - .76, top)
    lamp = top + 2.0
    box(a["frame"], tu - 1.4, tu + 1.4, tv - .08, tv + .08, lamp, lamp + .08)
    box(a["glowline"], tu - 1.3, tu + 1.3, tv - .06, tv + .06, lamp - .02, lamp)
    for sx in (-1, 1):
        pipe(a["handle"], [Vector((tu + sx * 1.3, tv, lamp + .08)), Vector((tu + sx * 1.3, tv, z + 5.4))], .015, .015, 4)
    if kind == "prep":                                                          # regenerated panels, one clamped for cutting
        for j in range(4):
            box(a["wood_new" if j % 2 else "panel"], tu + .2, tu + 1.4, tv - .5 + .01 * j, tv + .5, top + .03 * j, top + .03 * j + .03)
        box(a["wood_new"], tu - 1.4, tu - .1, tv - .6, tv + .55, top, top + .04)
        box(a["dark"], tu - .8, tu - .74, tv - .6, tv + .55, top + .04, top + .05)        # the cut line
    else:                                                                       # a bench being assembled in clamps
        regen_bench(a, Matrix.Translation((tu, tv + .05, top)), "half")
    # upright rack against the back wall: boards (prep) or seat slats and frames (assembly)
    ru = uf0 + 13.0
    box(a["frame"], ru - 2.2, ru + 2.2, 8.3, 9.5, z, z + .12)
    for j in range(9):
        box(a["frame"], ru - 2.1 + .52 * j, ru - 2.06 + .52 * j, 8.4, 9.4, z + .12, z + 2.6)
    box(a["frame"], ru - 2.2, ru + 2.2, 9.35, 9.45, z + 2.5, z + 2.6)
    for j in range(8):
        x0 = ru - 1.95 + .52 * j
        if kind == "prep":
            box(a["wood_new" if j % 3 else "panel"], x0, x0 + .04, 8.45, 9.35, z + .12, z + 2.4)
        else:
            for m in range(4):
                box(a["wood_new"], x0 + .02 + .1 * (m % 2), x0 + .08 + .1 * (m % 2), 8.5, 9.3, z + .12, z + 2.25)
    box(a["glowline"], ru - 2.2, ru + 2.2, 9.48, 9.5, z + 2.7, z + 2.85)
    # cart on floor rails from the rack end to the table, carrying a drawer from the library
    r0, r1, rv = uf0 + .25, tu - 1.8, -5.6
    for s in (-1, 1):
        box(a["rail"], r0, r1, rv + s * .4 - .03, rv + s * .4 + .03, z, z + .05)
    cu = uf0 + 2.4
    box(a["cart_deck"], cu - .8, cu + .8, rv - .5, rv + .5, z + .3, z + .38)
    for sx in (-1, 1):
        for sy in (-1, 1):
            prism(a["handle"], (cu + sx * .6, z + .13), "y", .12, rv + sy * .4 - .04, rv + sy * .4 + .04, 12)
    pipe(a["frame"], [Vector((cu + .8, rv - .45, z + .38)), Vector((cu + 1.0, rv - .45, z + 1.2)), Vector((cu + 1.0, rv + .45, z + 1.2)),
                      Vector((cu + .8, rv + .45, z + .38))], .025, .025, 6)       # push handle
    box(a["tray"], cu - .6, cu + .6, rv - .45, rv + .45, z + .38, z + .45)          # a drawer brought from the rack
    box(a["back_wood" if kind == "prep" else "back_metal"], cu - .6, cu + .6, rv + .41, rv + .45, z + .45, z + .9)
    box(a["bin" if kind == "prep" else "metal"], cu - .52, cu + .52, rv - .38, rv + .36, z + .45, z + .8)


def bend_free(p):
    """(cx, cy) for ring() in the straight frame."""
    return p[0], p[1]


def bridge_path(n=40):
    """Deck centre line from the forming room's end wall out to the lift tower, in straight coordinates."""
    pts = []
    for k in range(n + 1):
        t = k / n
        u = U1 + (LIFT_U - U1) * t
        pts.append(Vector((u, -4.0 - 10.0 * smooth(.25, 1.0, t), Z_FORM)))
    return pts


def bridge(rng):
    a = Accs()
    pts = bridge_path()
    fr = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        s = Vector((-t.y, t.x, 0)).normalized()
        fr.append((t, s))
    hw = BRIDGE_W / 2
    loft(a["deck"], [[tuple(p + s * (x * hw) + Vector((0, 0, z))) for x, z in ((-1, -.55), (1, -.55), (1, 0), (-1, 0))] for p, (t, s) in zip(pts, fr)])
    loft(a["frame"], [[tuple(p + s * (x * (hw + .12)) + Vector((0, 0, z))) for x, z in ((-1, -.7), (1, -.7), (1, -.5), (-1, -.5))] for p, (t, s) in zip(pts, fr)])
    rows = []
    n = 16
    for p, (t, s) in zip(pts, fr):                                              # glass vault over the deck
        rows.append([tuple(p + s * (hw * math.cos(math.pi * j / n)) + Vector((0, 0, .15 + 2.6 * math.sin(math.pi * j / n)))) for j in range(n + 1)])
    vs = [q for r in rows for q in r]
    fs = [(i * (n + 1) + j, i * (n + 1) + j + 1, (i + 1) * (n + 1) + j + 1, (i + 1) * (n + 1) + j) for i in range(len(rows) - 1) for j in range(n)]
    a["glass"].facing(vs, fs, lambda c: (0, 0, 1))
    for i in range(0, len(pts), 3):                                             # ribs
        p, (t, s) = pts[i], fr[i]
        pipe(a["frame"], [p + s * (hw * math.cos(math.pi * j / n)) + Vector((0, 0, .15 + 2.6 * math.sin(math.pi * j / n))) for j in range(n + 1)], .07, .07, 6)
    for x in (-1, 1):
        pipe(a["rail"], [p + s * (x * (hw - .15)) + Vector((0, 0, 1.05)) for p, (t, s) in zip(pts, fr)], .04, .04, 6)
        pipe(a["glowline"], [p + s * (x * (hw - .05)) + Vector((0, 0, .04)) for p, (t, s) in zip(pts, fr)], .03, .03, 6)
    # cart rails: from under the handover station, through the end wall, along the deck to the lift
    track = [Vector((HANDOVER[0] + k * .5, -4.0, Z_FORM)) for k in range(int((U1 - HANDOVER[0]) / .5))] + pts
    tfr = []
    for i, p in enumerate(track):
        t = (track[min(i + 1, len(track) - 1)] - track[max(i - 1, 0)]).normalized()
        tfr.append(Vector((-t.y, t.x, 0)).normalized())
    for x in (-1, 1):
        pipe(a["rail"], [p + s * (x * CART_GAUGE / 2) + Vector((0, 0, .035)) for p, s in zip(track, tfr)], .035, .035, 6)
        pipe(a["glowline"], [p + s * (x * (CART_GAUGE / 2 + .12)) + Vector((0, 0, .008)) for p, s in zip(track, tfr)], .012, .012, 4)
    # the cart, out on the deck with the finished bench on its four seats
    ci = min(range(len(pts)), key=lambda k: abs(pts[k].x - (U1 + 4.6)))
    cp, (ct, cs) = pts[ci], fr[ci]
    yaw = math.atan2(ct.y, ct.x)
    T = Matrix.Translation(cp) @ Matrix.Rotation(yaw, 4, "Z")
    cart(a, T)
    cart_at = (cp, yaw)
    # support: a branching column under the deck's bend, on a plinth
    i = int(len(pts) * .55)
    p, (t, s) = pts[i], fr[i]
    g = p + Vector((0, -2.0, -Z_FORM))
    lathe(a["node"], [(1.2, -.02), (1.2, .35), (1.0, .55), (.01, .58)], 28, g.x, g.y)
    tips = [p + s * (-hw * .8) + t * (-2.5) + Vector((0, 0, -.7)), p + s * (hw * .8) + t * (-2.5) + Vector((0, 0, -.7)),
            p + t * 3.2 + Vector((0, 0, -.7))]
    M.branch_strut(K.ctx(a, random.Random(11)), three(g + Vector((0, 0, .55))), [three(q) for q in tips], r=.5, role="white", twigs=False,
                   web=True, pads=[(0, 1, 0)], limb_r=.7)
    # lift tower to the street
    e = pts[-1]
    cx, cy = e.x + 2.6, e.y
    for dx in (-1.6, 1.6):
        for dy in (-1.6, 1.6):
            box(a["frame"], cx + dx - .12, cx + dx + .12, cy + dy - .12, cy + dy + .12, 0, Z_FORM + 3.6)
    for z in [3.0 * j for j in range(12)] + [Z_FORM + 3.6]:
        box(a["frame"], cx - 1.72, cx + 1.72, cy - 1.72, cy + 1.72, z, z + .12)
    for dx, dy, nx, ny in ((-1.6, 0, -1, 0), (1.6, 0, 1, 0), (0, -1.6, 0, -1), (0, 1.6, 0, 1)):
        x0, y0 = cx + dx - abs(ny) * 1.5, cy + dy - abs(nx) * 1.5
        x1, y1 = cx + dx + abs(ny) * 1.5, cy + dy + abs(nx) * 1.5
        a["glass"].facing([(x0, y0, .1), (x1, y1, .1), (x1, y1, Z_FORM + 3.5), (x0, y0, Z_FORM + 3.5)], [(0, 1, 2, 3)], lambda _c, n_=(nx, ny): (n_[0], n_[1], 0))
    box(a["station"], cx - 1.2, cx + 1.2, cy - 1.2, cy + 1.2, Z_FORM - .6, Z_FORM + .0)
    box(a["deck"], e.x - .2, cx - 1.6, cy - hw, cy + hw, Z_FORM - .55, Z_FORM)
    box(a["glowline"], cx - 1.73, cx + 1.73, cy - 1.73, cy + 1.73, Z_FORM + 3.75, Z_FORM + 3.82)
    box(a["paving_b"], cx - 3.0, cx + 3.0, cy - 3.0, cy + 3.0, -.04, .02)
    return a, cart_at


CART_GAUGE = .9                       # rail gauge of the bench cart
CART_TOP = .38                        # cart deck top above the rails' floor
SEAT_H = .05                          # the fixing seats the bench feet stand in


def cart(a, T):
    """Low bench cart in its own frame T (x along the track): deck, chassis, four wheel sets on the rails, buffers at
    both ends and four fixing seats under the bench's feet (a ring of four cleats round each foot)."""
    QA.tbox(a["cart_deck"], T, (0, 0, CART_TOP - .04), (2.5, .86, .08))
    QA.tbox(a["arm_dark"], T, (0, 0, .22), (2.3, .5, .12))
    for x in (-1.0, 1.0):
        for y in (-CART_GAUGE / 2, CART_GAUGE / 2):
            QA.tbox(a["handle"], T, (x, y, .14), (.24, .06, .2))                     # wheel (drawn as a disc block)
            QA.tbox(a["arm_dark"], T, (x, y, .27), (.3, .1, .06))                    # axle box
        QA.tbox(a["amber"], T, (x * 1.27, 0, .3), (.04, .7, .08))                    # buffers / end lights
    for fx in BENCH_FEET_X:
        for fy in BENCH_FEET_Y:
            QA.tbox(a["handle"], T, (fx, fy, CART_TOP + SEAT_H / 2), (.14, .14, SEAT_H))   # seat under the foot
            for dx, dy in ((-.07, 0), (.07, 0), (0, -.07), (0, .07)):            # cleats round the foot
                QA.tbox(a["handle"], T, (fx + dx * 1.15, fy + dy * 1.15, CART_TOP + .09), (.025 if dx else .16, .16 if dx else .025, .08))


# --- ground floor and plaza --------------------------------------------------------------------------------------------------
ENTRANCE_BAY, PICKUP_BAY, DROPOFF_BAY, SAMPLE_BAYS = 13, 35, 4, (19, 25)
PATH_U = (-17.8, -13.2)              # kept-clear walking route from the plaza to the entrance (u range), nothing placed on it


def ground(rng):
    a = Accs()
    ubox(a["walk"], U0 - 1, U1 + 1, V_F - 1.0, V_GROUND, -.03, .02, 2)
    ubox(a["paving_b"], U0 - 1, U1 + 1, V_F - 1.06, V_F - .94, -.02, .025, 2)
    # sample cabinets behind the ground glass, a sample of each material on their shelves
    for j, k in enumerate(range(N_IN + 2, N_IN + N_LIB - 1, 3)):
        if k in (ENTRANCE_BAY,):
            continue
        u = bay_u(k)
        box(a["station"], u - 1.0, u + 1.0, V_GROUND + .5, V_GROUND + 1.1, 0, .8)
        box(a["frame"], u - 1.0, u + 1.0, V_GROUND + .5, V_GROUND + 1.1, 2.2, 2.3)
        for s in (-1, 1):
            box(a["frame"], u + s * 1.0 - .04, u + s * 1.0 + .04, V_GROUND + .5, V_GROUND + 1.1, .8, 2.2)
        box(a["glass_cab"], u - .96, u + .96, V_GROUND + .48, V_GROUND + .52, .8, 2.2)
        for lv, z in enumerate((.8, 1.5)):
            box(a["tray"], u - .95, u + .95, V_GROUND + .55, V_GROUND + 1.05, z, z + .03)
            for q, typ in enumerate(TYPES):
                x = u - .76 + .38 * q
                role = {"metal": "metal_end", "cloth": "cloth_b", "glass": "granule", "wood": "bin", "resin": "resin"}[typ]
                if typ == "cloth":
                    prism(a[role], (x, z + .17), "y", .14, V_GROUND + .62, V_GROUND + .98, 10)
                elif typ == "metal":
                    for m in range(3):
                        prism(a[role], (x - .06 + .06 * m, z + .08), "y", .03, V_GROUND + .6, V_GROUND + 1.0, 6)
                else:
                    box(a[role], x - .12, x + .12, V_GROUND + .62, V_GROUND + .98, z + .03, z + .3)
        box(a["glowline"], u - .95, u + .95, V_GROUND + .6, V_GROUND + 1.0, 2.19, 2.2)
    counter(a)
    return a


COUNTER_U = (U1 - N_FORM * BAY + 1.0, U1 - 2.6)   # the material sample and pickup counter along the back wall
NICHES = 3


def counter(a):
    """Material sample and pickup counter along the ground floor's back wall (the long wall seen from the entrance): one
    run with a wood top, three recessed pickup windows with lit frames, and above it three real exhibits - cut ends of
    metal bars, cloth rolls end-on with their cores, regenerated panels. The hall in front (v 2 .. 7.8) stays clear."""
    u0, u1 = COUNTER_U
    vb, vf = 9.68, 8.0                                                          # wall face, counter front
    ubox(a["back_metal"], u0 - .3, u1 + .3, vb - .12, vb, .02, 5.2, 2)            # display wall
    ubox(a["station"], u0, u1, vf, vb - .12, 0, 1.0, 2)
    ubox(a["dark"], u0, u1, vf - .02, vf, 0, .12, 2)
    ubox(a["wood_new"], u0 - .05, u1 + .05, vf - .1, vb - .12, 1.0, 1.07, 2)
    ubox(a["glowline"], u0, u1, vf - .12, vf - .1, .96, 1.0, 2)
    span = (u1 - u0) / NICHES
    for j in range(NICHES):                                                     # recessed pickup windows
        c = u0 + span * (j + .5)
        ubox(a["dark"], c - .9, c + .9, vb - .13, vb - .11, 1.07, 2.3, 1)
        for s in (-1, 1):
            ubox(a["frame"], c + s * .95 - .06, c + s * .95 + .06, vf + .2, vb - .12, 1.07, 2.4, 1)
        ubox(a["frame"], c - 1.01, c + 1.01, vf + .2, vb - .12, 2.3, 2.42, 1)
        ubox(a["amber"], c - .9, c + .9, vf + .18, vf + .2, 2.32, 2.4, 1)
        ubox(a["frame"], c - .9, c + .9, vf + .2, vb - .12, 1.07, 1.12, 1)            # the niche floor, set back
        ubox(a["label"], c - .35, c + .35, vf + .5, vf + 1.0, 1.12, 1.4, 1)            # a wrapped piece waiting
    # exhibits above: bar ends, rolls, panels (one per niche span)
    zb = 2.7
    c = u0 + span * .5                                                          # metal bar ends in a frame
    ubox(a["frame"], c - 1.25, c + 1.25, vb - .2, vb - .12, zb - .1, zb + 2.0, 1)
    for i in range(9):
        for k in range(6):
            disc_y(a["metal_end"], (c - 1.0 + .25 * i + (.12 if k % 2 else 0), zb + .2 + .3 * k), vb - .22, .1, 6, rot=math.pi / 6)
            prism(a["metal"], (c - 1.0 + .25 * i + (.12 if k % 2 else 0), zb + .2 + .3 * k), "y", .1, vb - .21, vb - .13, 6, math.pi / 6)
    c = u0 + span * 1.5                                                         # cloth rolls end-on
    ubox(a["frame"], c - 1.25, c + 1.25, vb - .2, vb - .12, zb - .1, zb + 2.0, 1)
    for i in range(4):
        for k in range(3):
            cc = (c - .9 + .6 * i, zb + .3 + .6 * k)
            prism(a[ROLL_ROLES[(i + k) % 3]], cc, "y", .27, vb - .55, vb - .13, 14)
            disc_y(a[ROLL_ROLES[(i + k) % 3]], cc, vb - .56, .27, 14, r0=.07)
            disc_y(a["cloth_line"], cc, vb - .565, .19, 14, r0=.175)
            prism(a["core"], cc, "y", .068, vb - .62, vb - .13, 8)
    c = u0 + span * 2.5                                                         # regenerated panels, standing in a row
    ubox(a["frame"], c - 1.25, c + 1.25, vb - .2, vb - .12, zb - .1, zb + 2.0, 1)
    for i in range(7):
        x = c - 1.05 + .35 * i
        ubox(a["wood_new" if i % 2 else "panel"], x - .14, x + .14, vb - .3, vb - .2, zb, zb + 1.85, 1)
    ubox(a["glowline"], u0 - .3, u1 + .3, vb - .2, vb - .12, 5.0, 5.08, 2)


def plaza(rng):
    a = Accs()
    ubox(a["paving"], U0 - 26, U1 + 34, -62, V_F - 1.0, -.06, -.01, 3)
    for v in (-20, -34, -48):
        ubox(a["paving_b"], U0 - 26, U1 + 34, v - .15, v + .15, -.05, 0, 3)
    beds = []
    ubox(a["walk"], PATH_U[0], PATH_U[1], -62, V_F - 1.0, -.03, .005, 3)          # the walking route to the entrance, kept clear
    for s in PATH_U:
        ubox(a["glowline"], s - .05, s + .05, -62, V_F - 1.2, .0, .012, 3)
    for (uc, vc, w, d) in PLAZA_BEDS:
        hw, hd = w / 2, d / 2
        loft(a["coping"], [[(uc + hw * math.cos(t), vc + hd * math.sin(t), z) for t in (2 * math.pi * j / 36 for j in range(36))]
                           for z in (-.05, .45)])
        loft(a["grass"], [[(uc + (hw - .3) * math.cos(t), vc + (hd - .3) * math.sin(t), z) for t in (2 * math.pi * j / 36 for j in range(36))]
                          for z in (.3, .5)])
        beds.append((uc, vc, hw, hd))
    return a, beds


def tree_mesh(seed):
    a, rng = Accs(), random.Random(seed)
    h = (6.4, 7.6, 5.6)[seed % 3]
    M.leafy_tree(K.ctx(a, rng), (0, 0, 0), h=h, crown=h * .36, trunk="wood", roles=("leaf_l", "green"), core="green", n=40, size=.4, branches=5)
    return K.build_mesh("q10b_tree_%d" % seed, a, 180)


PLAZA_BEDS = ((4, -36, 12, 5), (18, -26, 9, 4), (44, -40, 16, 6), (-38, -44, 10, 5))   # (u, v, length, width); none on the route
PLAZA_BENCHES = ((-1.5, -31.6, math.pi), (4.0, -31.6, math.pi), (9.5, -31.6, math.pi),   # the regenerated benches in use
                 (38.5, -15.5, 0.0), (44.5, -15.5, 0.0))


def bench_mesh():
    """The regenerated bench (finished) as one shared mesh: on the conveyor, on the plaza, in storage."""
    a = Accs()
    regen_bench(a, Matrix.Identity(4))
    return K.build_mesh("q10b_regen_bench", a, 30)


# --- materials -------------------------------------------------------------------------------------------------------------
def mat(name, hexc, rough=.6, metal=0.0, alpha=1.0, emit=None, strength=1.0, culling=True):
    m = G.material("q10b_" + name, srgb(hexc, alpha), rough, srgb(emit) if emit else None, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


def make_materials():
    K.MATS.clear()
    K.MATS.update({
        "frame": mat("frame_white", "EDEFEE", .35, .3), "slab_edge": mat("slab_white", "F1F1EE", .5), "node": mat("plinth_white", "F3F4F2", .45, .1),
        "seam": mat("seam", "8E979B", .5, .4), "back": mat("back_panel", "E1E4E3", .6),
        "glass": mat("facade_glass", "D9EEF4", .03, alpha=.09, culling=False), "cap_strip": mat("cap_strip", "DCE1E3", .35, .4),
        "seam_glass": mat("glass_seam", "A9B7BD", .4, .3),
        "resin_b": mat("resin_rows", "7EA78C", .5),
        "back_metal": mat("band_metal", "5E6B76", .6), "back_cloth": mat("band_cloth", "B9A991", .8),
        "back_glass": mat("band_glass", "7FA79C", .6), "back_wood": mat("band_wood", "9C7B55", .7), "back_resin": mat("band_resin", "5F8469", .6),
        "crate": mat("sorted_crate", "D5DADC", .5, .2), "floor_work": mat("work_floor", "B7AE9E", .8),
        "cart_deck": mat("cart_deck", "9AA3A8", .5, .4), "wood_new": mat("new_wood", "D2AE7E", .55),
        "amber": mat("warm_sign", "FFE2B0", .4, emit="FFD79A", strength=2.5),
        "glass_cab": mat("cabinet_glass", "E2F2F4", .03, alpha=.12, culling=False),
        "tube_glass": mat("tube_glass", "C8E6EF", .05, alpha=.24, culling=False),
        "hopper": mat("hopper_glass", "A9DCC6", .08, alpha=.5, culling=False), "hopper_rim": mat("hopper_rim", "9FCDB6", .3),
        "rack": mat("rack_steel", "B4BBBF", .4, .5), "rack_plate": mat("rack_plate", "9EA6AB", .55, .4),
        "tray": mat("drawer_tray", "7F888E", .5, .4), "tray_front": mat("drawer_front", "B9C0C4", .4, .3),
        "handle": mat("handle", "4B5358", .35, .6), "mast": mat("gantry_mast", "D3D8DA", .35, .5),
        "rail": mat("rail_steel", "C2C8CB", .3, .6), "rail_head": mat("rail_head", "7D868B", .35, .7),
        "metal": mat("bar_steel", "6E787F", .35, .75), "metal_end": mat("bar_cut_end", "E4E7E9", .25, .5), "strap": mat("strap", "4E555A", .5, .3),
        "cloth_a": mat("cloth_linen", "E8E2D7", .95), "cloth_b": mat("cloth_rose", "CDB9B0", .95), "cloth_c": mat("cloth_slate", "B6C1CA", .95),
        "cloth_line": mat("cloth_layer", "B9AF9F", .95), "core": mat("roll_core", "8C7155", .7), "core_hole": mat("core_hole", "3B3531", .8),
        "granule": mat("glass_granule", "8EC2B3", .5), "granule_b": mat("glass_granule_light", "C9E6DC", .3),
        "bin": mat("wood_bin", "C9A170", .7), "bin_lid": mat("wood_bin_lid", "AA8559", .65), "label": mat("label", "EEE9DE", .7),
        "resin": mat("resin_jar", "77AA8A", .4), "cap": mat("jar_cap", "E7ECE8", .4), "bin_open": mat("sorting_bin", "C9CED0", .5, .3),
        "arm": mat("robot_white", "F2F3F1", .28, .15), "arm_dark": mat("robot_joint", "7B8388", .35, .6),
        "glowline": mat("pale_light", "D7F2FB", .4, emit="C6EEFF", strength=2.0),
        "station": mat("station_white", "EEF0EE", .45), "dark": mat("dark_panel", "3A4246", .5, .3),
        "carrier": mat("carrier", "C4CBCE", .35, .6), "conveyor": mat("conveyor_belt", "41484C", .7),
        "panel": mat("formed_panel", "F4F1EA", .5), "deck": mat("bridge_deck", "D9DBD9", .6),
        "wood": mat("old_wood", "8E6A48", .72), "wood_dark": mat("old_wood_dark", "5F4632", .78), "fabric_old": mat("faded_cushion", "8E9A80", .92),
        "floor_in": mat("ground_floor", "E9E2D5", .6, emit="E9E2D5", strength=.15), "walk": mat("walkway", "E6E2DA", .8),
        "paving": mat("paving", "D9D4CA", .85), "paving_b": mat("paving_band", "C4BEB2", .85),
        "coping": mat("planter_edge", "EEEBE4", .55), "grass": mat("lawn", "7E9C4E", .9),
    })
    for role, (rgba, emit, strength) in M.ROLES.items():
        leafy = role in ("leaf_l", "green")
        m = G.material("q10b_in_" + role, rgba, .6, emit, strength)
        m.use_backface_culling = not leafy and rgba[3] >= 1
        K.MATS["in_" + role] = m
    return K.MATS


# --- preview staging ---------------------------------------------------------------------------------------------------------
def preview(col, trees, rng):
    mk = lambda n, h, r=.8: K.MATS.setdefault("pv_" + n, mat("pv_" + n, h, r))  # noqa: E731
    mk("water", "4A86A8", .06)
    mk("land", "A9B58A", .95)
    mk("path", "D3CDC1", .9)
    mk("far", "BCCAD6", .9)
    mk("farw", "E1E7EB", .8)
    a = Accs()
    K.box(a["pv_water"], -6000, 6000, 30, 7000, -2.5, -1.6)
    K.box(a["pv_land"], -900, 900, -800, 30, -3, -.08)
    K.box(a["pv_path"], -900, 900, 22, 30, -3, -.04)
    for _ in range(240):                                                        # far shore
        x, y = rng.uniform(-3200, 3200), rng.uniform(1500, 2100)
        w, h = rng.uniform(18, 50), rng.uniform(12, 70) * (2.2 if rng.random() < .1 else 1)
        K.box(a["pv_far"], x, x + w, y, y + w, -2, h)
    K.box(a["pv_far"], -6000, 6000, 1600, 2400, -2.2, 4)
    bx, by = Vector((-1500.0, 900.0)), Vector((-300.0, 1600.0))                # a suspension bridge to the left
    ang = math.atan2(by.y - bx.y, by.x - bx.x)

    def along(t, z, s=0):
        c = bx.lerp(by, t)
        return (c.x - s * 9 * math.sin(ang), c.y + s * 9 * math.cos(ang), z)
    obox(a["pv_farw"], along(.5, 28), ((by - bx).length * 1.3, 14, 3), ang)
    for t in (.15, .85):
        for s in (-1, 1):
            obox(a["pv_farw"], along(t, 52, s), (5, 4, 106), ang)
    for s in (-1, 1):
        pipe(a["pv_farw"], [Vector(along(.15 + .7 * i / 24, 32 + 70 * (2 * i / 24 - 1) ** 2, s)) for i in range(25)], 1.0, 1.0, 5)
    col.objects.link(bpy.data.objects.new("PV_Context", K.build_mesh("pv_context", a)))
    n = 0
    while n < 160:                                                              # park trees round the plaza
        x, y = rng.uniform(-160, 170), rng.uniform(-170, 20)
        if -95 < x < 105 and y > -72:
            continue
        t = bpy.data.objects.new("PV_Tree_%03d" % n, trees[n % 3])
        t.location = (x, y, -.08)
        t.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        t.scale = (rng.uniform(1.1, 1.6),) * 3
        col.objects.link(t)
        n += 1


# --- assembly ----------------------------------------------------------------------------------------------------------------
def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    rng = random.Random(2127)
    col = bpy.data.collections.new("Q10B_Asset")
    prev = bpy.data.collections.new("Q10B_Preview")
    scene.collection.children.link(col)
    scene.collection.children.link(prev)
    root = bpy.data.objects.new("Q10B_MaterialBank", None)
    col.objects.link(root)
    groups = {}
    for g in ("STRUCTURE", "FACADE", "LIBRARY", "ROBOTS", "INTAKE", "FORMING", "BRIDGE", "GROUND", "PLAZA"):
        e = bpy.data.objects.new(g, None)
        c = bpy.data.collections.new("Q10B_" + g)
        col.children.link(c)
        c.objects.link(e)
        e.parent = root
        groups[g] = (e, c)

    def add(name, data, g, u=None, v=0.0, z=0.0, yaw=0.0):
        ob = bpy.data.objects.new(name, data)
        groups[g][1].objects.link(ob)
        ob.parent = groups[g][0]
        if u is not None:
            ob.location = bend((u, v, z))
            ob.rotation_euler = (0, 0, -u / RB + yaw)
        return ob

    def unique(name, accs, g, smooth_deg=30):
        return add(name, K.build_mesh("q10b_" + name.lower(), bent(accs), smooth_deg), g)

    meshes = {}

    def dmesh(typ, fill, near):
        key = (typ, fill, near)
        if key not in meshes:
            meshes[key] = drawer_mesh(typ, fill, near)
        return meshes[key]

    lib_of = (lambda i: 0.0) if TEMPLATE else lib_u
    states = drawer_states(rng, TEMPLATE)
    rack, fac = rack_bay(), facade_bay()
    n_lib = 1 if TEMPLATE else N_LIB
    for i in range(n_lib):
        add("RACK_BAY_%02d" % i, rack, "LIBRARY", lib_of(i))
    add("RACK_END", rack_end(), "LIBRARY", lib_of(n_lib - 1) + BAY / 2)
    for (i, lv, c, r), (typ, fill, pulled) in sorted(states.items()):
        u, v, z = slot_origin(i, lv, c, r, pulled, lib_of)
        near = TEMPLATE or pulled or lv < NEAR_LEVELS or (abs(i - GANTRIES[0][0]) <= 3 and lv <= 5)   # walkway eye level + the close-up
        add("DRAWER_%02d_%02d_%d%d" % (i, lv, c, r), dmesh(typ, fill, near), "LIBRARY", u, v, z)
    lib = Accs()
    runners(lib, states, lib_of)
    hands = gantries(lib, states, lib_of, TEMPLATE)
    if TEMPLATE:
        a = Accs()
        ubox(a["slab_edge"], -BAY / 2 - 2, BAY / 2 + 2, V_F - .3, V_B, Z_SLAB - .6, Z_SLAB, 1)
        ubox(a["rail"], -BAY / 2 - 2, BAY / 2 + 2, V_RAIL - .1, V_RAIL + .1, Z_SLAB + .15, Z_SLAB + .35, 1)
        ubox(a["rail"], -BAY / 2 - 2, BAY / 2 + 2, V_RAIL - .1, V_RAIL + .1, Z_TOP + .25, Z_TOP + .45, 1)
        ubox(a["walk"], -BAY / 2 - 6, BAY / 2 + 6, -40, V_GROUND, -.03, .02, 1)
        unique("TEMPLATE_BASE", a, "STRUCTURE")
        add("FACADE_BAY_00", fac, "FACADE", 0.0)
        add("FACADE_BAY_01", fac, "FACADE", BAY)
        add("COLUMN_00", column(), "STRUCTURE", -BAY / 2)
        unique("LIBRARY_RAILS", lib, "ROBOTS")
    else:
        for k in range(NB):
            add("FACADE_BAY_%02d" % k, fac, "FACADE", bay_u(k))
        add("FACADE_END", K.build_mesh("q10b_facade_end", bent(_facade_end()), 30), "FACADE", U1)
        rb, rbf = roof_bay(ROOF_H, "roof_bay"), roof_bay(ROOF_H_FORM, "roof_bay_form")
        bb, bbf = back_bay(ROOF_H, "back_bay"), back_bay(ROOF_H_FORM, "back_bay_form")
        for k in range(NB):
            form = k >= N_IN + N_LIB
            add("ROOF_BAY_%02d" % k, rbf if form else rb, "STRUCTURE", bay_u(k))
            add("BACK_BAY_%02d" % k, bbf if form else bb, "STRUCTURE", bay_u(k))
        add("ROOF_END", K.build_mesh("q10b_roof_end", bent(_roof_end()), 30), "STRUCTURE", U1)
        gb = {kind: ground_bay(kind) for kind in ("glass", "door", "dropoff", "sample")}
        for k in range(NB):
            kind = ("door" if k == ENTRANCE_BAY else "dropoff" if k == DROPOFF_BAY
                    else "sample" if k in SAMPLE_BAYS else "glass")
            add("GROUND_BAY_%02d" % k, gb[kind], "GROUND", bay_u(k))
        colm = column()
        for j, k in enumerate(range(2, NB, 4)):
            add("COLUMN_%02d" % j, colm, "STRUCTURE", U0 + k * BAY)
        unique("STRUCTURE_SHELL", structure(), "STRUCTURE")
        unique("LIBRARY_RAILS_ARMS", lib, "ROBOTS")
        unique("INTAKE", intake(rng), "INTAKE")
        unique("LIBRARY_BACK_AISLE", backside(), "LIBRARY")
        fa, (jig, slat) = forming(rng)
        unique("FORMING_ROOM", fa, "FORMING")
        ba, (cp, yaw) = bridge(rng)
        unique("BRIDGE", ba, "BRIDGE")
        bench = bench_mesh()
        add("FINISHED_BENCH_ON_CART", bench, "BRIDGE", cp.x, cp.y, Z_FORM + CART_TOP + SEAT_H, yaw)   # feet in the cart's seats
        add("DELIVERED_SAMPLE_BENCH", bench, "GROUND", COUNTER_U[0] - 2.2, 7.4, 0.0)                # beside the pickup counter, facing the hall
        unique("GROUND_FLOOR", ground(rng), "GROUND")
        pa, beds = plaza(rng)
        unique("PLAZA", pa, "PLAZA")
        trees = [tree_mesh(s) for s in range(3)]
        n = 0
        for (uc, vc, hw, hd) in beds:
            for j in range(max(2, int(hw / 3))):
                t = 2 * math.pi * (j + .5) / max(2, int(hw / 3))
                ob = add("TREE_%02d" % n, trees[n % 3], "PLAZA", uc + (hw - 1.6) * .6 * math.cos(t), vc + (hd - 1.4) * .6 * math.sin(t), .45,
                         rng.uniform(0, 6.28))
                s = rng.uniform(1.2, 1.5)
                ob.scale = (s, s, s)
                n += 1
        for j, (u, v, yaw) in enumerate(PLAZA_BENCHES):                         # the same bench, in use on the plaza
            add("PLAZA_REGEN_BENCH_%02d" % j, bench, "PLAZA", u, v, 0, yaw)
        preview(prev, trees, rng)

    bpy.context.view_layer.update()
    asset = list(col.all_objects)
    mesh_obs = [o for o in asset if o.type == "MESH"]
    report = {
        "tris_by_group": {g: sum(K.tris(o.data) for o in groups[g][1].objects if o.type == "MESH") for g in groups},
        "unique_mesh_tris": sum(K.tris(m) for m in {o.data for o in mesh_obs}),
        "objects": len(asset), "mesh_objects": len(mesh_obs), "unique_meshes": len({o.data.name for o in mesh_obs}),
        "drawers": {"total": len(states), "full": sum(1 for s in states.values() if s[1] == "full"),
                    "half": sum(1 for s in states.values() if s[1] == "half"), "empty": sum(1 for s in states.values() if s[1] == "empty"),
                    "pulled": sum(1 for s in states.values() if s[2])},
        "gripped_handles": [[round(x, 3) for x in bend(h[0])] for h in hands],
        "bridge_deck_z": Z_FORM, "forming_floor_z": Z_FORM,
    }
    report["tris_total"] = sum(report["tris_by_group"].values())
    rv = _load("review_material_bank", os.path.join(HERE, "review_material_bank.py"))
    rv.stage(scene, prev)
    if TEMPLATE:
        out = ARGS[ARGS.index("--out") + 1] if "--out" in ARGS else HERE
        os.makedirs(out, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "q10b-template.blend"), compress=True)
        print("REPORT", json.dumps(report))
        return
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, ASSET + ".blend"), compress=True)
    if "--no-export" not in ARGS:
        glb = os.path.join(HERE, ASSET + ".glb")
        for ob in bpy.data.objects:
            ob.select_set(False)
        for ob in asset:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = root
        bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                                  export_animations=False, export_cameras=False, export_lights=False, export_extras=True,
                                  export_materials="EXPORT")
        report["glb_bytes"] = os.path.getsize(glb)
    with open(os.path.join(HERE, "report.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps(report))


def _facade_end():
    """The last mullion at the right end of the front glass (each bay draws only its left one)."""
    a = Accs()
    ubox(a["frame"], -.045, .045, V_F, V_F + .28, Z_SLAB, Z_TOP, 9)
    ubox(a["frame"], -.06, .06, V_F - .05, V_F, Z_SLAB, Z_TOP, 9)
    return a


def _roof_end():
    a = Accs()
    prof = roof_profile(ROOF_H_FORM)
    secs = []
    for i, (v, z) in enumerate(prof):
        t0, t1 = prof[max(i - 1, 0)], prof[min(i + 1, len(prof) - 1)]
        tv, tz = t1[0] - t0[0], t1[1] - t0[1]
        ln = math.hypot(tv, tz)
        nv, nz = -tz / ln, tv / ln
        secs.append([(dx, v + nv * dn, z + nz * dn) for dx, dn in ((-.07, -.32), (.07, -.32), (.07, .02), (-.07, .02))])
    loft(a["frame"], secs)
    return a


if __name__ == "__main__":
    main()
