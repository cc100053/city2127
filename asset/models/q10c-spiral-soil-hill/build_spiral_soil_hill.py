"""Q10-C spiral soil hill (design document Q10-C v1.0; reference: Q10 sheet p.5, right image C, `.dream-loop/q10c/target.jpg`).

Run:  blender -b --factory-startup --python-exit-code 1 -P build_spiral_soil_hill.py [-- --massing] [--no-export]
Writes q10c-spiral-soil-hill.blend (asset + preview staging), q10c-spiral-soil-hill.glb (asset only) and report.json
beside this file. --massing builds the round-1 white model only (terrain, bench, path, tube; no contents or planting).
No human figures anywhere: chairs, rails, lamps and beds give the scale.

Blender coordinates, real metres; the spiral and every layout number live in spiral.py (shared with check_glb.py).
Origin = hill centre at plaza level, sea on +y, main view and city on -y. The hill is about 122 m across and 38 m to the
plateau (tree crowns reach about 48 m). One bench climbs three turns counter-clockwise from the foot (front-left, under
the feed tube) to the summit: a shallow channel against a dark retaining wall, a rim, and the residents' path with its
own curb and rail on the outer side; planted banks join each turn to the next. Along the channel one year of material
reads in order: old chairs, boxes and cloth just delivered by the glass feed tube (the hero chair has just landed), the
same things wrapped in white mycelium cocoons (chair backs and legs still showing), collapsing white-brown lumps with
wood chips, then dark soil with sprouts that ends at a soil mouth feeding the summit field beds; the forest stands on the
back (sea) half of the plateau. A lift entrance kiosk on the city side and a small pavilion on the plateau stand for
the hidden lift.

Nodes: Q10C_SpiralSoilHill > HILL, CHANNEL, WALK, FEED, SUMMIT, LIFT, PIER_LINK. Channel stages are separate objects
(CHANNEL_S1_OBJECTS, CHANNEL_S2_COCOONS, CHANNEL_S3_CRUMBLE, CHANNEL_S4_SOIL, CHANNEL_S4_SPROUTS, CHANNEL_MOUTH), so
an animation can drive each. Preview staging (sea, land, far shore, route trace) is collection Q10C_Preview, never
exported. Primitives come from the Q04-A builder's parts.py; the old wooden chair, open tube, collar and shard helpers
from the Q10-A builder; library parts used: leafy_tree, leaf_clump, kit bench.
"""
import importlib.util
import json
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

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
QA = _load("q10a_build", os.path.join(MODELS, "q10a-solar-furnace", "build_solar_furnace.py"))   # chair, tube helpers
import spiral as S  # noqa: E402

G, M = K.G, K.M
Accs, loft, obox, lathe, ring, pipe, srgb = K.Accs, K.loft, K.obox, K.lathe, K.ring, K.pipe, K.srgb
TAU = S.TAU

ASSET = "q10c-spiral-soil-hill"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MASSING = "--massing" in ARGS

STEP = math.radians(.75)             # bench sweep step (about 0.7 m on the first turn)
BANK_STEP = math.radians(1.0)
BANK_ROWS = 8
TUBE_R = 1.45
PH_OUT = .06                         # tube outlet in the channel start (about 3.3 m along)
PH_HERO = .115                       # the hero chair, just landed (about 6.3 m along)
PLAZA_R = 84.0
FLOOR_BANDS = 14                     # channel floor colour steps along the year
LIFT_BEARING, LIFT_R = -74.0, 70.0   # lift entrance kiosk on the city side
PAVILION = (8.0, 300.0)              # (r, theta_rel deg) of the lift's summit pavilion, at the forest edge
FOREST = (-5.0, 185.0)               # bearings of the forest half (sea side, +y)


def phis(a, b, step=STEP):
    n = max(1, int(math.ceil((b - a) / step)))
    return [a + (b - a) * i / n for i in range(n + 1)]


def O(ph, k):
    return S.offsets(ph)[k]


def pol(r, deg, z=0.0):
    a = math.radians(deg)
    return Vector((r * math.cos(a), r * math.sin(a), z))


def frame(ph, d=0.0, dz=None, yaw=0.0):
    """Local frame on the bench: x along the channel (counter-clockwise), y outward, z up; origin on the channel floor."""
    a = S.bearing(ph)
    t, u = Vector((-math.sin(a), math.cos(a), 0)), Vector((math.cos(a), math.sin(a), 0))
    o = Vector(S.at(ph, d, -S.FLOOR_D if dz is None else dz))
    R = Matrix(((t.x, u.x, 0), (t.y, u.y, 0), (0, 0, 1))).to_4x4()
    return Matrix.Translation(o) @ R @ Matrix.Rotation(yaw, 4, "Z")


# arc length along the channel centre line -> phi
_ARC = []


def arc_table():
    if not _ARC:
        s, p = 0.0, None
        for ph in phis(0.0, S.PHI_END, math.radians(.1)):
            q = S.at(ph, 0.0)
            if p is not None:
                s += math.dist(p, q)
            _ARC.append((s, ph))
            p = q
    return _ARC


def phi_at(s):
    t = arc_table()
    lo, hi = 0, len(t) - 1
    while hi - lo > 1:
        m = (lo + hi) // 2
        if t[m][0] < s:
            lo = m
        else:
            hi = m
    (s0, p0), (s1, p1) = t[lo], t[hi]
    return p0 + (p1 - p0) * (s - s0) / max(s1 - s0, 1e-9)


def phi_frac(f):
    return f * S.PHI_END


# --- shapes ------------------------------------------------------------------------------------------------------------------
_ICO = {}


def ico(sub):
    if sub not in _ICO:
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
        _ICO[sub] = ([tuple(v.co) for v in bm.verts], [[v.index for v in f.verts] for f in bm.faces])
        bm.free()
    return _ICO[sub]


def lump(acc, T, c, r, seed=0.0, noise=.16, flat=.55, sub=2):
    """Lumpy ellipsoid in frame T: centre c, semi-axes r; the underside is flattened toward the floor."""
    vs, fs = ico(sub)
    out = []
    for x, y, z in vs:
        n = noise * math.sin(x * 5.3 + seed) * math.sin(y * 4.7 + seed * 1.7) * math.sin(z * 5.1 - seed) + .05 * math.sin(x * 11 + z * 13 + seed)
        X, Y, Z = x * (1 + n) * r[0], y * (1 + n) * r[1], z * (1 + n) * r[2]
        if Z < 0:
            Z *= flat
        out.append(tuple(T @ Vector((c[0] + X, c[1] + Y, c[2] + Z))))
    acc.solid(out, fs)


def tbox(acc, T, c, size):
    QA.tbox(acc, T, c, size)


def sweep_box(acc, a, b, d0, d1, z0, z1, step=STEP):
    """Solid along the bench for phi in a..b: radial offsets d0(phi)..d1(phi), heights z0(phi)..z1(phi) over path level."""
    secs = []
    for ph in phis(a, b, step):
        p, q, lo, hi = d0(ph), d1(ph), z0(ph), z1(ph)
        secs.append([S.at(ph, p, lo), S.at(ph, q, lo), S.at(ph, q, hi), S.at(ph, p, hi)])
    loft(acc, secs)


# --- HILL: banks, plateau, plaza ---------------------------------------------------------------------------------------------
def bank_point(ph, t):
    """Point on the bank between the turn at ph (lower edge) and the turn at ph + TAU (upper edge), t 0..1, with a slight
    convex bulge so it reads as a planted bank rather than a ruled surface."""
    lo, hi = Vector(S.inner_edge(ph)), Vector(S.outer_edge(ph + TAU))
    dr = Vector((lo.x, lo.y)).length - Vector((hi.x, hi.y)).length
    dz = hi.z - lo.z
    ln = math.hypot(dr, dz)
    p = lo.lerp(hi, t)
    if ln > 1e-6 and 0 < t < 1:
        radial = Vector((lo.x, lo.y, 0)).normalized()
        nrm = (radial * dz + Vector((0, 0, dr))) / ln                        # outward-up normal of the chord
        amp = (.07 * ln * min(1.0, dz / 4.0)) * math.sin(math.pi * t)
        amp += .12 * math.sin(ph * 23.0 + t * 7.0) * math.sin(math.pi * t) * min(1.0, dz / 4.0)
        p = p + nrm * amp
    return p


def banks():
    a = Accs()
    secs = [[tuple(bank_point(ph, j / BANK_ROWS)) for j in range(BANK_ROWS + 1)] for ph in phis(-TAU, S.PHI_END - TAU * 0 - 1e-6, BANK_STEP)]
    secs = [s for s in secs]
    m = BANK_ROWS + 1
    vs = [p for s in secs for p in s]
    fs = [(i * m + j, i * m + j + 1, (i + 1) * m + j + 1, (i + 1) * m + j) for i in range(len(secs) - 1) for j in range(BANK_ROWS)]
    a["grass"].facing(vs, fs, lambda c: (c[0], c[1], math.hypot(c[0], c[1]) * .6 + 1.0))
    return a


GREENS = ((.10, .22, .04), (.17, .33, .07), (.30, .45, .12))   # deep, mid, light meadow (linear), mixed by vertex colour


def tint(ob, seed=0.0, dry=0.0):
    """Meadow drifts as a vertex colour (COLOR_0 in the GLB; the material multiplies it): smooth noise over a few metres,
    darker low on each bank, so the slopes read as planted ground rather than one flat green."""
    me = ob.data
    attr = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    co = [v.co for v in me.vertices]
    cols = []
    for lp in me.loops:
        x, y, z = co[lp.vertex_index]
        n = (math.sin(x * .23 + seed) * math.cos(y * .19 - seed) + .6 * math.sin(x * .61 + y * .53 + z * .4)
             + .35 * math.sin(x * 1.7 - y * 1.3 + z)) / 1.95
        t = .5 + .5 * n
        a, b = (GREENS[0], GREENS[1]) if t < .5 else (GREENS[1], GREENS[2])
        k = t * 2 if t < .5 else t * 2 - 1
        c = [p + (q - p) * k for p, q in zip(a, b)]
        if dry:
            c = [p * (1 - dry) + q * dry for p, q in zip(c, (.62, .60, .36))]
        cols.extend((*c, 1.0))
    attr.data.foreach_set("color", cols)
    me.color_attributes.active_color = attr
    for m in me.materials:
        nt = m.node_tree
        b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
        if not b.inputs["Base Color"].is_linked:
            ca = nt.nodes.new("ShaderNodeVertexColor")
            ca.layer_name = "Col"
            nt.links.new(ca.outputs["Color"], b.inputs["Base Color"])


def plateau():
    """Summit plateau inside the spiral's last edge; a low dome in the forest half."""
    a = Accs()
    n, rings = 240, 10
    vs, fs = [(0.0, 0.0, S.Z_END + .45)], []
    for i in range(n):
        th = TAU * i / n
        R = S.summit_r(th)
        x, y = math.cos(S.THETA0 + th), math.sin(S.THETA0 + th)
        for k in range(1, rings + 1):
            r = R * k / rings
            vs.append((x * r, y * r, S.Z_END + .45 * (1 - (k / rings) ** 2)))
    for i in range(n):
        j = (i + 1) % n
        fs.append((0, 1 + i * rings, 1 + j * rings))
        for k in range(rings - 1):
            fs.append((1 + i * rings + k, 1 + i * rings + k + 1, 1 + j * rings + k + 1, 1 + j * rings + k))
    a["meadow"].facing(vs, fs, lambda c: (0, 0, 1))
    return a


def plaza():
    """Plaza at z 0 from the ghost turn (the bank's foot) out to PLAZA_R; light paving bands."""
    a = Accs()
    n = 360
    radii = lambda r0: [r0 + (PLAZA_R - r0) * k / 6 for k in range(7)]  # noqa: E731
    vs, fs = [], []
    for i in range(n + 1):
        th = TAU * i / n
        ph = th - TAU if i < n else -1e-6
        r0 = Vector(S.inner_edge(ph)).xy.length
        x, y = math.cos(S.THETA0 + th), math.sin(S.THETA0 + th)
        vs += [(x * r, y * r, 0.0) for r in radii(r0)]
    for i in range(n):
        for k in range(6):
            fs.append((i * 7 + k, i * 7 + k + 1, (i + 1) * 7 + k + 1, (i + 1) * 7 + k))
    walk = [f for f in fs if f[0] % 7 == 0]                                     # a paved walk round the foot, lawn beyond
    a["paving"].facing(vs, walk, lambda c: (0, 0, 1))
    a["lawn"].facing(vs, [f for f in fs if f[0] % 7 != 0], lambda c: (0, 0, 1))
    ring(a["paving_b"], PLAZA_R - .5, PLAZA_R, -1.3, .12, 180)
    for b in (-122.0, LIFT_BEARING, -20.0, 40.0, 90.0, 150.0, -165.0):          # paths out to the city, the kiosk, the pier
        c = pol((PLAZA_R + 64) / 2, b, .02)
        obox(a["paving"], (c.x, c.y, .01), (PLAZA_R - 60, 4.0, .04), math.radians(b))
        obox(a["glowline"], (c.x, c.y, .035), (PLAZA_R - 62, .12, .02), math.radians(b))
    return a


# --- CHANNEL and WALK: the bench --------------------------------------------------------------------------------------------
def band_edges():
    return [S.PHI_END * i / FLOOR_BANDS for i in range(FLOOR_BANDS + 1)]


def channel_structure():
    a = Accs()
    lo = lambda ph: -S.FLOOR_D - .7  # noqa: E731
    sweep_box(a["wall"], 0, S.PHI_END, lambda ph: O(ph, "wall_in"), lambda ph: O(ph, "chan_in"), lo, S.wall_h)
    sweep_box(a["rim"], 0, S.PHI_END, lambda ph: O(ph, "chan_out"), lambda ph: O(ph, "rim_out"), lo, lambda ph: S.RIM_H)
    e = band_edges()
    for i in range(FLOOR_BANDS):                                                # the channel floor, banded by stage colour
        sweep_box(a["floor_%02d" % i], e[i], e[i + 1], lambda ph: O(ph, "chan_in"), lambda ph: O(ph, "chan_out"), lo,
                  lambda ph: -S.FLOOR_D)
    for ph in phis(0, S.PHI_END, math.radians(6)):                              # expansion joints on the wall cap
        if ph < .3 or ph > S.PHI_END - .3:
            continue
        T = frame(ph, O(ph, "wall_in") + S.WALL_T / 2, S.wall_h(ph))
        tbox(a["seam"], T, (0, 0, .005), (.05, S.WALL_T + .01, .012))
    return a


def walk_structure():
    a = Accs()
    sweep_box(a["path"], 0, S.PHI_END, lambda ph: O(ph, "rim_out"), lambda ph: O(ph, "path_out"), lambda ph: -.6, lambda ph: 0.0)
    sweep_box(a["curb"], 0, S.PHI_END, lambda ph: O(ph, "path_out"), lambda ph: O(ph, "curb_out"), lambda ph: -.8, lambda ph: S.CURB_H)
    sweep_box(a["glowline"], .02, S.PHI_END - .02, lambda ph: O(ph, "path_out") - .22, lambda ph: O(ph, "path_out") - .12,
              lambda ph: -.02, lambda ph: .006, math.radians(1.5))
    return a


def rails():
    """Rail on the outer curb (posts every 2.4 m, top and middle rails) and bollard lights every 14 m inside it."""
    a = Accs()
    d = lambda ph: O(ph, "curb_out") - S.CURB_T / 2  # noqa: E731
    p0 = .12
    sec = [ph for ph in phis(p0, S.PHI_END - .05, math.radians(2.0))]
    for hz in (1.05, .55):
        pipe(a["rail"], [S.at(ph, d(ph), hz) for ph in sec], .028, n=6)
    s, total = 0.0, arc_table()[-1][0]
    k = 0
    while s < total - 3:
        ph = phi_at(s)
        if ph > p0:
            T = frame(ph, d(ph), S.CURB_H)
            tbox(a["rail"], T, (0, 0, .45), (.05, .05, .9))
            if k % 6 == 0:
                Tl = frame(ph, O(ph, "path_out") - .4, 0.0)
                z0 = Tl.translation.z
                lathe(a["frame"], [(.07, z0), (.07, z0 + .75)], 8, *Tl.translation.xy)
                tbox(a["glowline"], Tl, (0, 0, .78), (.16, .16, .06))
        s += 2.4
        k += 1
    return a


# --- FEED: glass tube, cargo, hero chair, hardware bin ----------------------------------------------------------------------
def tube_path():
    """Inverted-U glass tube: up from its base on the plaza behind the channel start, over, and down into the channel,
    the outlet's lower lip just above the channel floor and its axis laid along the channel (slightly downhill)."""
    base_ph = -.2
    B = Vector(S.at(base_ph, 0.0, 1.35))
    B.z = 1.35
    a = S.bearing(PH_OUT)
    t = Vector((-math.sin(a), math.cos(a), 0))
    out_dir = (t * .94 + Vector((0, 0, -.34))).normalized()
    O_ = Vector(S.at(PH_OUT, -.1, -S.FLOOR_D + TUBE_R + .12))
    pts = QA.cubic(B, B + Vector((0, 0, 8.0)), O_ - out_dir * 8.0, O_, 46)
    return QA.resample(pts, .55), out_dir


def tube_glass():
    a = Accs()
    pts, _ = tube_path()
    QA.open_tube(a["tube_glass"], pts, TUBE_R, 40)
    return a


def tube_frame(rng):
    a = Accs()
    pts, out_dir = tube_path()
    fr = QA.frames(pts)
    for i in range(0, len(pts), 6):                                             # ribs every 3.3 m
        QA.collar(a["frame"], pts[i], fr[i][0], TUBE_R + .02, TUBE_R + .14, .09, 40)
    QA.collar(a["frame"], pts[-1], fr[-1][0], TUBE_R - .05, TUBE_R + .26, .28, 40)   # outlet ring
    for s in (-1, 1):                                                          # two spines along the sides
        pipe(a["frame"], [p + w * (TUBE_R + .1) * s for p, (_t, _u, w) in zip(pts, fr)], .06, n=6)
    B = pts[0]
    lathe(a["station"], [(2.6, 0), (2.6, .9), (2.25, 1.05), (2.25, 1.35), (0.0, 1.35)], 40, B.x, B.y)   # base plinth
    ring(a["frame"], 1.4, 1.7, 1.3, 1.6, 40, B.x, B.y)
    ring(a["glowline"], 2.27, 2.33, .95, 1.05, 40, B.x, B.y)
    for i in (-4, -1):                                                         # saddles under the outlet, standing on the floor
        p, (t, u, w) = pts[i], fr[i]
        side = t.cross(Vector((0, 0, 1))).normalized()
        for s in (-1, 1):
            top = p + side * s * (TUBE_R * .72) - Vector((0, 0, TUBE_R * .72))
            foot = Vector((top.x, top.y, S.zp(PH_OUT) - S.FLOOR_D))
            pipe(a["frame"], [foot, top + Vector((0, 0, .1))], .08, n=8)
            lathe(a["frame"], [(.2, foot.z), (.2, foot.z + .06)], 12, foot.x, foot.y)
    # end wall at the channel start (the plaza behind it stands at path level, the floor 0.35 m below)
    sweep_box(a["rim"], -.012, 0.0, lambda ph: O(0, "wall_in"), lambda ph: O(0, "rim_out"), lambda ph: -S.FLOOR_D - .7,
              lambda ph: S.RIM_H, .006)
    # hardware side bin: metal fittings taken off the chair legs are collected here, beside the base
    T = Matrix.Translation(B + Vector((math.cos(S.THETA0 - .165), math.sin(S.THETA0 - .165), 0)) * 3.6 - Vector((0, 0, B.z))) @ \
        Matrix.Rotation(S.THETA0 - .165, 4, "Z")
    tbox(a["station"], T, (0, 0, .5), (1.2, 1.8, 1.0))
    tbox(a["dark"], T, (0, 0, 1.0), (1.0, 1.6, .02))
    tbox(a["tube_glass_s"], T, (0, 0, 1.06), (1.04, 1.64, .1))
    for k in range(26):
        c = T @ Vector((rng.uniform(-.42, .42), rng.uniform(-.7, .7), 1.03))
        QA.octa(a["fitting"], c, .045, rng)
    pipe(a["frame"], [T @ Vector((-.6, 0, .75)), B + (T.to_3x3() @ Vector((-1, 0, 0))) * 2.3 + Vector((0, 0, -.5))], .12, n=8)
    return a


def chair_tilted(a, T):
    QA.chair(a, T)


def cargo(rng):
    """Old things riding down the tube and the hero chair just landed in the channel."""
    a = Accs()
    pts, out_dir = tube_path()
    fr = QA.frames(pts)
    n = len(pts)
    kinds = ("chair", "box", "bundle", "chair", "box", "chair")
    for j, i in enumerate(range(int(n * .14), int(n * .9), 4)):
        p, (t, u, w) = pts[i], fr[i]
        down = Vector((0, 0, -1))
        dn = (down - t * down.dot(t))
        if dn.length < .2:
            dn = w
        dn.normalize()
        up = -dn
        side = t.cross(up).normalized()
        R = Matrix((side, t, up)).transposed().to_4x4()
        kind = kinds[j % len(kinds)]
        if kind == "chair":
            T = Matrix.Translation(p + dn * (TUBE_R - .05)) @ R @ Matrix.Rotation(rng.uniform(-.4, .4), 4, "Z")
            QA.chair(a, T)
        elif kind == "box":
            T = Matrix.Translation(p + dn * (TUBE_R - .55)) @ R
            cardboard(a, T, (0, 0, 0), (.6, .5, .45), rng)
        else:
            T = Matrix.Translation(p + dn * (TUBE_R - .35)) @ R
            lump(a["cloth"], T, (0, 0, 0), (.42, .3, .26), seed=j, noise=.25, flat=.8)
    # a box sliding out of the outlet lip
    cardboard(a, frame(PH_OUT + .018, -.2, yaw=.3) @ Matrix.Translation((0, 0, .05)) @ Matrix.Rotation(-.25, 4, "Y"), (0, 0, 0), (.6, .5, .45), rng)
    # the hero chair: whole, upright, just landed on the channel floor in front of the outlet
    QA.chair(a, frame(PH_HERO, -.35, yaw=math.radians(-28)) @ Matrix.Rotation(math.radians(4), 4, "X"))
    return a


def cardboard(a, T, c, size, rng, wrap=0.0):
    x, y, z = size
    tbox(a["card"], T, (c[0], c[1], c[2] + z / 2), size)
    tbox(a["card_dark"], T, (c[0], c[1], c[2] + z + .004), (x * .14, y + .01, .01))
    for s in (-1, 1):                                                           # open flaps
        F = T @ Matrix.Translation((c[0], c[1] + s * y / 2, c[2] + z)) @ Matrix.Rotation(s * math.radians(rng.uniform(25, 60)), 4, "X")
        tbox(a["card"], F, (0, s * y * .22, 0), (x * .96, y * .44, .012))


# --- CHANNEL stages ----------------------------------------------------------------------------------------------------------
def fibres(a, T, c, r, rng, n=2, role="fibre"):
    """Thin mycelium strands wound round a cocoon and anchored on the floor."""
    for k in range(n):
        ph0, tilt = rng.uniform(0, TAU), rng.uniform(-.5, .5)
        pts = []
        for i in range(19):
            t = i / 18
            ang = ph0 + t * TAU * 1.15
            z = -.85 + 1.7 * t
            s = math.sqrt(max(0.0, 1 - z * z)) * 1.04 + .03
            pts.append(T @ Vector((c[0] + r[0] * s * math.cos(ang), c[1] + r[1] * s * math.sin(ang), c[2] + r[2] * (z + tilt * s * .3))))
        pipe(a[role], pts, .014, n=4)
    for k in range(5):
        ang = rng.uniform(0, TAU)
        p0 = T @ Vector((c[0] + r[0] * .9 * math.cos(ang), c[1] + r[1] * .9 * math.sin(ang), c[2] + r[2] * .1))
        p1 = T @ Vector((c[0] + r[0] * 1.35 * math.cos(ang), c[1] + r[1] * 1.35 * math.sin(ang), .02))
        pipe(a[role], [p0, p1], .012, n=4)


def pile(a, T, rng, L, W, chair_top=True):
    """One delivered batch in frame T, L long and W wide: boxes one or two high, a cloth bundle, old chairs (one standing
    on top so its back stays the highest thing). Returns the shell centre and semi-axes that would wrap it."""
    x = -L / 2 + .4
    top = .0
    while x < L / 2 - .4:
        bx, by = rng.uniform(.55, .85), rng.uniform(.45, min(.75, W - .2))
        y = rng.uniform(-1, 1) * max(0.0, W / 2 - by / 2 - .05)
        r = rng.random()
        if r < .55:
            h = rng.uniform(.4, .6)
            cardboard(a, T, (x + bx / 2, y, 0), (bx, by, h), rng)
            if rng.random() < .6:
                h2 = rng.uniform(.35, .5)
                cardboard(a, T @ Matrix.Rotation(rng.uniform(-.3, .3), 4, "Z"), (x + bx / 2, y, h), (bx * .85, by * .85, h2), rng)
                h += h2
            top = max(top, h)
            x += bx + rng.uniform(.05, .25)
        elif r < .75:
            lump(a["cloth"], T, (x + .45, y, .28), (.5, .38, .3), seed=rng.uniform(0, 9), noise=.3, flat=.9)
            top = max(top, .55)
            x += 1.0
        else:
            QA.chair(a, T @ Matrix.Translation((x + .3, y, 0)) @ Matrix.Rotation(rng.uniform(-1.5, 1.5), 4, "Z"))
            top = max(top, .95)
            x += .75
    if chair_top:                                                               # a chair stood on the middle of the batch
        z = min(top, 1.0) if top > .5 else 0.0
        QA.chair(a, T @ Matrix.Translation((rng.uniform(-.2, .2) * L, 0, z * .9)) @ Matrix.Rotation(rng.uniform(-.8, .8), 4, "Z"))
        top = z * .9 + .95
    t = max(top - .4, .45)                                                    # the wrap stops below the top chair's back
    return (0, 0, t * .45), (L / 2 + .15, W / 2 + .05, t * .55)


def stage_objects(rng):
    """Stage 0: fresh batches of old things at the channel start (chairs, boxes, cloth), the first white strands
    over the later ones."""
    a = Accs()
    end_s = [x for x, ph in arc_table() if ph >= phi_frac(.045)][0]
    x = PH_HERO * S.rc(PH_HERO) + 1.6
    k = 0
    while x < end_s - 2.0:
        L = rng.uniform(2.2, 3.4)
        ph = phi_at(x + L / 2)
        f = x / end_s
        W = S.width(ph) - 1.2
        T = frame(ph, rng.uniform(-.2, .2), yaw=rng.uniform(-.12, .12))
        c, r = pile(a, T, rng, L, W, chair_top=k % 2 == 0)
        if f > .5:                                                             # first white strands
            fibres(a, T, c, r, rng, n=1 + int(f > .75))
            if f > .75:
                lump(a["mycelium"], T, (c[0], c[1], .12), (r[0], r[1], .3), seed=k, noise=.3, flat=.2, sub=2)
        x += L + rng.uniform(.6, 1.4)
        k += 1
    return a


def cocoon_items(a, T, rng, kind):
    """Contents of a cocoon in frame T; returns the shell's centre and semi-axes."""
    if kind == "chair":
        QA.chair(a, T @ Matrix.Rotation(rng.uniform(-.15, .15), 4, "Y"))
        return (0, 0, .36), (.38, .36, .3)
    if kind == "boxes":
        cardboard(a, T, (-.35, 0, 0), (.7, .6, .55), rng)
        cardboard(a, T, (.45, .05, 0), (.6, .5, .5), rng)
        cardboard(a, T, (.0, 0, .55), (.6, .5, .45), rng)
        return (.05, 0, .5), (1.0, .55, .62)
    if kind == "pile":                                                         # a big cocoon: boxes, a bundle and a chair
        cardboard(a, T, (-.9, 0, 0), (.8, .65, .6), rng)
        cardboard(a, T, (-.85, .05, .6), (.6, .5, .45), rng)
        lump(a["cloth"], T, (.1, -.1, .3), (.5, .4, .3), seed=rng.uniform(0, 9), noise=.3, flat=.9)
        QA.chair(a, T @ Matrix.Translation((.95, .05, 0)) @ Matrix.Rotation(rng.uniform(-.4, .4), 4, "Z"))
        return (0, 0, .55), (1.75, .7, .75)
    lump(a["cloth"], T, (0, 0, .3), (.6, .45, .33), seed=rng.uniform(0, 9), noise=.3, flat=.9)
    return (0, 0, .32), (.7, .52, .4)


def cocoons(rng):
    """Stage 1: the same things wrapped in white mycelium, the wrap thickening along the first turn; chair backs and legs
    still read through and above the veil."""
    a = Accs()
    s0 = [x for x, ph in arc_table() if ph >= phi_frac(.045)][0]
    s1 = [x for x, ph in arc_table() if ph >= phi_frac(1 / 3)][0]
    x = s0 + .5
    k = 0
    while x < s1 - 2.0:
        f = (x - s0) / (s1 - s0)
        L = rng.uniform(2.6, 4.2)
        ph = phi_at(x + L / 2)
        w = S.width(ph)
        T = frame(ph, rng.uniform(-.15, .15), yaw=rng.uniform(-.08, .08))
        if k % 5 == 3:                                                         # now and then a single chair, wrapped alone
            c, r = cocoon_items(a, T, rng, "chair")
            L = 1.2
        else:
            c, r = pile(a, T, rng, L, w - 1.0)
        grow = 1.0 + .18 * f                                                   # the wrap thickens along the turn
        r = (r[0] * grow + .2, min(w / 2 - .12, r[1] * grow + .25), r[2] * grow + .14)
        c = (c[0], c[1], c[2] + .05)
        lump(a["mycelium"], T, c, r, seed=k * 1.7, noise=.2, flat=.3)
        lump(a["mycelium"], T, (c[0] + r[0] * .35, c[1], c[2] + r[2] * .25), (r[0] * .55, r[1] * .8, r[2] * .7), seed=k * 3.1, noise=.25, flat=.3, sub=1)
        lump(a["mycelium_dense"], T, (c[0], c[1], .02), (r[0] * .97, r[1] * .97, .14 + .2 * f), seed=k, noise=.25, flat=.2, sub=2)
        fibres(a, T, c, r, rng, n=4)
        k += 1
        x += L + rng.uniform(.35, .9)
    # white felt on the floor between the cocoons
    for ph in phis(phi_frac(.05), phi_frac(1 / 3), math.radians(2.2)):
        T = frame(ph, rng.uniform(-1.4, 1.4))
        lump(a["mycelium_dense"], T, (0, 0, 0), (rng.uniform(.5, 1.1), rng.uniform(.4, .8), .07), seed=ph, noise=.3, flat=.1, sub=1)
    return a


def crumble(rng):
    """Stage 2: the cocoons collapse into white-brown lumps, wood chips showing; lumps shrink and darken along turn two."""
    a = Accs()
    s0 = [x for x, ph in arc_table() if ph >= phi_frac(1 / 3)][0]
    s1 = [x for x, ph in arc_table() if ph >= phi_frac(2 / 3)][0]
    x = s0 + .8
    k = 0
    while x < s1 - .8:
        ph = phi_at(x)
        f = (x - s0) / (s1 - s0)
        w = S.width(ph)
        sz = 1.45 - .75 * f
        T = frame(ph, rng.uniform(-.25, .25) * max(0.0, w / 2 - 1.4), yaw=rng.uniform(-.3, .3))
        rx, ry, rz = sz * rng.uniform(1.0, 1.4), min(w / 2 - .3, sz * rng.uniform(.85, 1.15)), sz * rng.uniform(.55, .75)
        body = ("crumble", "crumble_tan", "crumble_dark")[(k + (1 if f > .5 else 0)) % (2 if f < .45 else 3)]
        lump(a[body], T, (0, 0, rz * .45), (rx, ry, rz), seed=k * 2.3, noise=.34, flat=.4)
        lump(a["crumble_tan" if body != "crumble_tan" else "crumble"], T, (rx * .45, ry * .1, rz * .3),
             (rx * .55, ry * .7, rz * .75), seed=k * 1.3, noise=.36, flat=.4, sub=1)
        for j in range(4 if f < .5 else 2):                                    # white mycelium left in the cracks and on top
            q = (rng.uniform(-.6, .6) * rx, rng.uniform(-.5, .5) * ry, rz * rng.uniform(.65, 1.0))
            lump(a["mycelium_dense"], T, q, (rx * rng.uniform(.3, .5) * (1 - .45 * f), ry * rng.uniform(.3, .5), rz * .32),
                 seed=k + j, noise=.3, flat=.6, sub=1)
        for j in range(5):
            q = T @ Vector((rng.uniform(-1.4, 1.4) * rx, rng.uniform(-.9, .9) * ry, rng.uniform(.03, .2)))
            QA.shard(a["chip"], q, rng.uniform(.06, .12) * (1.2 - .5 * f), rng)
        if k in (2, 9, 17):                                                    # an old chair back still showing
            QA.chair(a, T @ Matrix.Translation((.2 * rx, 0, rz * .15)) @ Matrix.Rotation(math.radians(rng.uniform(14, 30)), 4, "X"), "back")
        k += 1
        x += rx * 2 + rng.uniform(.2, .8)
    for ph in phis(phi_frac(1 / 3), phi_frac(2 / 3), math.radians(1.6)):     # loose brown litter on the floor
        T = frame(ph, rng.uniform(-1.6, 1.6))
        lump(a["crumble"], T, (0, 0, 0), (rng.uniform(.4, .9), rng.uniform(.3, .6), .08), seed=ph * 3, noise=.35, flat=.1, sub=1)
    return a


def soil_fill_z(ph, dd, w):
    """Soil surface height over path level across the channel (dd = offset from centre)."""
    rise = S.smooth(phi_frac(2 / 3), phi_frac(.70), ph)
    ridge = .05 * math.cos(dd / (w / 2) * math.pi * 3)                          # three furrowed rows
    return -S.FLOOR_D + .04 + rise * (.22 + ridge)


def soil():
    a = Accs()
    secs = []
    for ph in phis(phi_frac(2 / 3) - .02, S.PHI_END - .012, math.radians(.75)):
        w = S.width(ph)
        h = w / 2 - .02
        top = [S.at(ph, -h + 2 * h * i / 10, soil_fill_z(ph, -h + 2 * h * i / 10, w)) for i in range(11)]
        secs.append([S.at(ph, h, -S.FLOOR_D - .05), S.at(ph, -h, -S.FLOOR_D - .05)] + top)
    loft(a["soil"], secs)
    return a


def sprouts(rng):
    """Sprouts on the soil rows: sparse and tiny where the soil starts, a nursery of seedlings toward the mouth."""
    a = Accs()
    s0 = [x for x, ph in arc_table() if ph >= phi_frac(.70)][0]
    s1 = arc_table()[-1][0] - 3.5
    x = s0
    while x < s1:
        ph = phi_at(x)
        f = (x - s0) / (s1 - s0)
        w = S.width(ph)
        for row in (-1, 0, 1):
            if rng.random() > .35 + .65 * f:
                continue
            dd = row * w / 3 + rng.uniform(-.12, .12)
            p = Vector(S.at(ph, dd, soil_fill_z(ph, dd, w)))
            sz = .16 + .42 * f ** 1.2
            ctx = K.ctx(a, rng, p.x, p.y, p.z)
            M.leaf_clump(ctx, (0, sz * .6, 0), (sz * .8, sz * .7, sz * .8), ("leaf_l", "green") if f > .4 else ("leaf_l",),
                         None, 5 + int(9 * f), .07 + .14 * f, .1, 1, True)
        x += 1.0 - .35 * f
    return a


def mouth(rng):
    """Soil mouth at the end of the channel: a steel hopper and a short conveyor onto the plateau to a soil heap at the
    field beds."""
    a = Accs()
    ph = S.PHI_END - .02
    w = S.width(ph)
    T = frame(ph, 0.0, 0.0)
    for s in (-1, 1):
        tbox(a["frame"], T, (0, s * (w / 2 - .1), .45), (.2, .2, 1.1))
    tbox(a["frame"], T, (0, 0, 1.0), (.24, w, .18))
    tbox(a["dark"], T, (-.25, 0, .3), (.06, w - .4, .6))
    end = Vector(S.at(S.PHI_END, 0, 0))
    a_ = S.bearing(S.PHI_END)
    t = Vector((-math.sin(a_), math.cos(a_), 0))
    heap = end + t * 6.5 - Vector((math.cos(a_), math.sin(a_), 0)) * 1.0
    heap.z = S.Z_END + .1
    p0, p1 = end + Vector((0, 0, .1)), heap + Vector((0, 0, 1.3))
    ang = math.atan2(p1.y - p0.y, p1.x - p0.x)
    ln = (p1.xy - p0.xy).length
    mid = (p0 + p1) / 2
    pitch = math.atan2(p1.z - p0.z, ln)
    C = Matrix.Translation(mid) @ Matrix.Rotation(ang, 4, "Z") @ Matrix.Rotation(-pitch, 4, "Y")
    tbox(a["frame"], C, (0, 0, 0), (ln + .4, 1.2, .25))
    tbox(a["soil"], C, (0, 0, .15), (ln + .2, .9, .06))
    for s in (-1, 1):
        tbox(a["frame"], C, (0, s * .62, .25), (ln + .4, .06, .3))
    for u in (-.35, .35):
        q = C @ Vector((u * ln, 0, 0))
        pipe(a["frame"], [q, Vector((q.x, q.y, S.Z_END))], .07, n=6)
    lump(a["soil"], Matrix.Translation(heap), (0, 0, 0), (1.6, 1.3, .9), seed=4, noise=.25, flat=.1)
    return a


def mist(rng):
    a = Accs()
    for k in range(46):
        f = rng.uniform(.06, .55)
        ph = phi_frac(f)
        p = Vector(S.at(ph, rng.uniform(-1.5, 1.5), rng.uniform(1.0, 2.4)))
        r = rng.uniform(1.0, 2.0)
        M.ell(a["mist"], tuple(p), (r, 0, 0), (0, r * rng.uniform(.5, .9), 0), (0, 0, r * .35), 14, 6)
    return a


# --- SUMMIT: field beds, forest, shrubs ---------------------------------------------------------------------------------------
def rel_of(deg):
    return (math.radians(deg) - S.THETA0) % TAU


def in_forest(th_rel):
    b = math.degrees(S.THETA0 + th_rel) % 360
    lo, hi = FOREST[0] % 360, FOREST[1] % 360
    return lo <= b <= hi if lo < hi else (b >= lo or b <= hi)


def fields(rng):
    """Curved raised beds on the front (city) half of the plateau, beside the path exit and the soil mouth."""
    a = Accs()
    landing = (0.0, math.radians(24))                                          # paved landing where the path arrives
    r = 3.2
    k = 0
    while r < 21.0:
        r1 = r + 1.15
        th = 0.0
        runs, cur = [], None
        n = 360
        for i in range(n + 1):
            th = TAU * i / n
            ok = (not in_forest(th)) and S.summit_r(th) - 1.2 > r1 and not (landing[0] <= th <= landing[1] and r1 > 12.5) \
                and not (abs(math.remainder(th - math.radians(PAVILION[1]), TAU)) * PAVILION[0] < 3.2 and abs(r - PAVILION[0]) < 3.5)
            if ok and cur is None:
                cur = th
            if (not ok or i == n) and cur is not None:
                if th - cur > .12:
                    runs.append((cur, th - TAU / n))
                cur = None
        for t0, t1 in runs:
            a0, a1 = math.degrees(S.THETA0 + t0), math.degrees(S.THETA0 + t1)
            K.sector(a["bed_edge"], r, r1, a0, a1, S.Z_END - .2, S.Z_END + .32, 2.0)
            K.sector(a["bed_soil"], r + .08, r1 - .08, a0 + .3, a1 - .3, S.Z_END + .3, S.Z_END + .36, 2.0)
            roles = (("leaf_l",), ("green",), ("leaf_l", "crop"), ("green", "white"))[k % 4]
            step = .55
            n = max(1, int(math.radians(a1 - a0) * (r + .57) / step))
            for j in range(n):
                ang = math.radians(a0 + (a1 - a0) * (j + .5) / n)
                p = pol(r + .57 + rng.uniform(-.1, .1), math.degrees(ang), S.Z_END + .36)
                sz = rng.uniform(.3, .46)
                M.leaf_clump(K.ctx(a, rng, p.x, p.y, p.z), (0, sz * .5, 0), (sz, sz * .8, sz), roles, None, 7, .16, .2, 1, True)
            k += 1
        r = r1 + .75
    # paved landing at the path exit
    a0 = math.degrees(S.THETA0)
    K.sector(a["path"], 12.6, S.summit_r(0.0) - .05, a0, a0 + 24, S.Z_END - .3, S.Z_END + .02, 1.0)
    return a


def tree_mesh(seed, h):
    a, rng = Accs(), random.Random(seed)
    cr = h * .42
    M.leafy_tree(K.ctx(a, rng), (0, 0, 0), h=h, crown=cr * .9, trunk="wood", roles=("leaf_l", "green"), core="green", n=46, size=.42, branches=5)
    for i in range(6):
        t, rr = i * 2.4 + rng.uniform(-.3, .3), (0 if i == 0 else cr * rng.uniform(.45, .62))
        c = (rr * math.cos(t), h * (.84 if i == 0 else rng.uniform(.62, .78)), rr * math.sin(t))
        q = cr * rng.uniform(.46, .60)
        G.blob(K.Three(a["in_green" if i % 2 else "in_leaf_l"]), c, (q, q * .8, q), sub=2, seed=seed * 7 + i, noise=.30, flat=.8)
        M.leaf_clump(K.ctx(a, rng), c, (q * 1.08, q * .9, q * 1.08), ("leaf_l", "green"), None, 46, .42, .3, 1)
    return K.build_mesh("q10c_tree_%d" % seed, a, 180)


def forest_spots(rng):
    """Tree positions on the sea half of the plateau, with crown room from its edge."""
    out = []
    tries = 0
    while len(out) < 24 and tries < 6000:
        tries += 1
        th = rng.uniform(0, TAU)
        if not in_forest(th):
            continue
        r = math.sqrt(rng.uniform(0, 1)) * (S.summit_r(th) - 2.2)
        p = Vector((r * math.cos(S.THETA0 + th), r * math.sin(S.THETA0 + th), S.Z_END + .45 * (1 - (r / S.summit_r(th)) ** 2)))
        if all((p.xy - q.xy).length > 3.0 for q, _h in out):
            out.append((p, rng.uniform(9.5, 14.0)))
    return out


def forest_floor(rng, spots):
    """Understory shrubs between the summit trees, so the forest reads as a wood rather than trunks on a lawn."""
    a = Accs()
    n = 0
    while n < 70:
        th = rng.uniform(0, TAU)
        if not in_forest(th):
            continue
        r = math.sqrt(rng.uniform(.02, 1)) * (S.summit_r(th) - 1.4)
        p = Vector((r * math.cos(S.THETA0 + th), r * math.sin(S.THETA0 + th), S.Z_END + .45 * (1 - (r / S.summit_r(th)) ** 2)))
        if any((p.xy - q.xy).length < .8 for q, _h in spots):
            continue
        sz = rng.uniform(.7, 1.4)
        M.leaf_clump(K.ctx(a, rng, p.x, p.y, p.z), (0, sz * .45, 0), (sz * 1.2, sz * .8, sz * 1.2), ("leaf_l", "green"), "green", 30, .34, .35, 2)
        n += 1
    return a


def bank_planting(rng):
    """Shrubs and flower clumps on the banks, kept on the middle of each bank (off the path above and the channel below)."""
    a = Accs()
    x = 0.0
    for ph in phis(-TAU + .2, S.PHI_END - .4, math.radians(1.0)):
        lo, hi = Vector(S.inner_edge(ph)), Vector(S.outer_edge(ph + TAU))
        if hi.z - lo.z < 2.5:
            continue
        r_mid = (lo.xy.length + hi.xy.length) / 2
        x += r_mid * math.radians(1.0)
        if x < rng.uniform(1.3, 2.4):
            continue
        x = 0.0
        t = rng.uniform(.25, .62)
        p = bank_point(ph, t)
        sz = rng.uniform(.8, 1.5)
        roles = ("leaf_l", "green") if rng.random() < .65 else ("green", "white")
        M.leaf_clump(K.ctx(a, rng, p.x, p.y, p.z), (0, sz * .2, 0), (sz * 1.2, sz * .6, sz * 1.2), roles, "green", 34, .36, .3, 3)
    return a


def plaza_trees(rng):
    out = []
    for k in range(40):
        b = rng.uniform(-180, 180)
        if abs(math.remainder(b - (-122), 360)) < 24 or abs(math.remainder(b - LIFT_BEARING, 360)) < 6:
            continue                                                            # keep the main view's line and the kiosk clear
        out.append((pol(rng.uniform(72, 81), b), rng.uniform(5.5, 7.5)))
    return out


# --- LIFT, PIER_LINK ---------------------------------------------------------------------------------------------------------
def kiosk(a, c, yaw, w=4.2, d=3.2, h=3.4):
    T = Matrix.Translation(c) @ Matrix.Rotation(yaw, 4, "Z")
    tbox(a["station"], T, (0, 0, .1), (w + .6, d + .6, .2))
    tbox(a["station"], T, (0, 0, h + .12), (w + .9, d + .9, .24))
    tbox(a["glowline"], T, (0, -(d + .9) / 2, h + .12), (w + .7, .04, .1))
    for sx in (-1, 1):
        for sy in (-1, 1):
            tbox(a["frame"], T, (sx * w / 2, sy * d / 2, h / 2 + .1), (.14, .14, h))
    tbox(a["lift_glass"], T, (0, 0, h / 2 + .1), (w - .1, d - .1, h - .1))
    tbox(a["dark"], T, (0, d / 2 - .4, 1.3), (1.6, .3, 2.4))


def lift():
    a = Accs()
    c = pol(LIFT_R, LIFT_BEARING)
    kiosk(a, c, math.radians(LIFT_BEARING + 90))
    r, th = PAVILION
    p = Vector((r * math.cos(S.THETA0 + math.radians(th)), r * math.sin(S.THETA0 + math.radians(th)), S.Z_END + .2))
    kiosk(a, p, S.THETA0 + math.radians(th) + math.pi / 2, 3.4, 3.0, 3.0)
    return a


# --- materials ---------------------------------------------------------------------------------------------------------------
def mat(name, hexc, rough=.6, metal=0.0, alpha=1.0, emit=None, strength=1.0, culling=True):
    m = G.material("q10c_" + name, srgb(hexc, alpha), rough, srgb(emit) if emit else None, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


FLOOR_RAMP = ("D9D4C8", "B79C7C", "6A5038", "3A2A1E")   # pale, tan-brown, brown, dark soil


def floor_hex(i):
    f = (i + .5) / FLOOR_BANDS * 3
    k = min(int(f), 2)
    t = f - k
    a, b = [int(FLOOR_RAMP[k][j:j + 2], 16) for j in (0, 2, 4)], [int(FLOOR_RAMP[k + 1][j:j + 2], 16) for j in (0, 2, 4)]
    return "".join("%02X" % round(x + (y - x) * t) for x, y in zip(a, b))


def make_materials():
    K.MATS.clear()
    K.MATS.update({
        "grass": mat("bank_grass", "6C9A3A", .92), "grass_b": mat("bank_grass_deep", "557F2C", .92),
        "grass_c": mat("bank_grass_light", "8AAE4C", .92), "meadow": mat("summit_meadow", "76A044", .92),
        "lawn": mat("plaza_lawn", "7AA546", .92), "crumble_tan": mat("crumble_tan", "B8976E", .95),
        "wall": mat("retaining_wall", "5A5246", .85), "rim": mat("channel_rim", "C9C3B7", .7), "seam": mat("wall_joint", "3D372F", .8),
        "path": mat("walk_paving", "DCD7CC", .82), "curb": mat("walk_curb", "EFECE5", .6),
        "paving": mat("plaza_paving", "D8D3C8", .85), "paving_b": mat("plaza_band", "C2BBAE", .85),
        "rail": mat("rail_steel", "D8DCDD", .32, .6), "frame": mat("frame_silver", "E2E6E7", .36, .55),
        "station": mat("station_white", "EEF0EE", .45), "dark": mat("dark_panel", "3A4246", .5, .3),
        "glowline": mat("pale_light", "D7F2FB", .4, emit="C6EEFF", strength=2.0),
        "tube_glass": mat("tube_glass", "C8E6F0", .04, alpha=.18, culling=False),
        "tube_glass_s": mat("bin_glass", "C8E6F0", .05, alpha=.3, culling=False),
        "lift_glass": mat("lift_glass", "BFE2EC", .04, alpha=.24, culling=False),
        "fitting": mat("chair_fittings", "B9BEC2", .3, .9),
        "wood": mat("old_wood", "8E6A48", .72), "wood_dark": mat("old_wood_dark", "5F4632", .78),
        "fabric_old": mat("faded_cushion", "8E9A80", .92),
        "card": mat("cardboard", "BC9462", .9), "card_dark": mat("cardboard_tape", "8C6A42", .8),
        "cloth": mat("old_cloth", "6F7F96", .95),
        "mycelium": mat("mycelium_veil", "F6F4EE", .85, alpha=.5, culling=False),
        "mycelium_dense": mat("mycelium_felt", "F1EDE3", .9),
        "fibre": mat("mycelium_fibre", "FBFAF6", .8),
        "crumble": mat("crumble_brown", "8C6A48", .95), "crumble_dark": mat("crumble_dark", "5E4632", .95),
        "chip": mat("wood_chip", "B8905E", .85),
        "soil": mat("dark_soil", "35271C", .98),
        "bed_edge": mat("bed_edge", "A88E6C", .8), "bed_soil": mat("bed_soil", "3F2E21", .98),
        "mist": mat("mist", "F5F8F8", 1.0, alpha=.07, culling=False),
    })
    for i in range(FLOOR_BANDS):
        K.MATS["floor_%02d" % i] = mat("channel_floor_%02d" % i, floor_hex(i), .95)
    for role, (rgba, emit, strength) in M.ROLES.items():                         # library planting and props
        leafy = role in ("leaf_l", "green", "white")
        m = G.material("q10c_in_" + role, rgba, .6, emit, strength)
        m.use_backface_culling = not leafy and rgba[3] >= 1
        K.MATS["in_" + role] = m
    if MASSING:                                                                 # round-1 white model: one white, glass kept
        white = mat("massing_white", "E4E2DC", .8)
        for k, m in list(K.MATS.items()):
            if next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Alpha"].default_value >= 1:
                K.MATS[k] = white
    return K.MATS


# --- preview staging (never exported) ----------------------------------------------------------------------------------------
TRACE = ("E8442E", "F2A007", "2E7DE8")   # turn 1, 2, 3


def route_trace(col):
    """Preview-only route line drawn 0.4 m over the path centre, one colour per turn, a white dot every quarter turn: the
    plan view's check that each turn runs on into the next and the last one reaches the plateau."""
    a = Accs()
    for i in range(3):
        K.MATS.setdefault("trace_%d" % i, mat("trace_%d" % i, TRACE[i], .5, emit=TRACE[i], strength=2.0))
    K.MATS.setdefault("trace_dot", mat("trace_dot", "FFFFFF", .5, emit="FFFFFF", strength=3.0))
    d = lambda ph: (O(ph, "rim_out") + O(ph, "path_out")) / 2  # noqa: E731
    pts = [(ph, Vector(S.at(ph, d(ph), .4))) for ph in phis(0, S.PHI_END, math.radians(1.0))]
    for (p0, a0), (p1, a1) in zip(pts, pts[1:]):
        m = (a0 + a1) / 2
        obox(a["trace_%d" % min(int(p0 / TAU), 2)], (m.x, m.y, m.z), ((a1 - a0).length + .05, .9, .1), math.atan2(a1.y - a0.y, a1.x - a0.x))
    for q in range(13):
        ph = q * TAU / 4
        p = Vector(S.at(ph, d(ph), .6))
        lathe(a["trace_dot"], [(1.0, p.z), (1.0, p.z + .2)], 20, p.x, p.y)
    ob = bpy.data.objects.new("PV_RouteTrace", K.build_mesh("pv_route_trace", a))
    col.objects.link(ob)
    ob.hide_render = True
    return ob


def preview(col, trees, rng):
    mk = lambda n, h, r=.8, **k: K.MATS.setdefault("pv_" + n, mat("pv_" + n, h, r, **k))  # noqa: E731
    mk("water", "4A86A8", .06)
    mk("land", "A9B58A", .95)
    mk("path", "D3CDC1", .9)
    mk("far", "BCCAD6", .9)
    mk("farw", "E1E7EB", .8)
    a = Accs()
    loft(a["pv_water"], [[(-5000, 128, z), (5000, 128, z), (5000, 7000, z), (-5000, 7000, z)] for z in (-2.5, -2)])
    loft(a["pv_land"], [[(-900, -700, z), (900, -700, z), (900, 126, z), (-900, 126, z)] for z in (-3, -1.2)])   # below the
    loft(a["pv_path"], [[(-900, 118, z), (900, 118, z), (900, 128, z), (-900, 128, z)] for z in (-3, -1.1)])   # sunk channel start
    for i in range(220):                                                       # far shore across the bay
        x, y = rng.uniform(-4200, 4200), rng.uniform(2300, 3000)
        h = rng.uniform(15, 70) * (2.4 if rng.random() < .1 else 1)
        w = rng.uniform(20, 50)
        K.box(a["pv_far"], x, x + w, y, y + w, -2, h)
    loft(a["pv_far"], [[(-6000, 2400, z), (6000, 2400, z), (6000, 3400, z), (-6000, 3400, z)] for z in (-2.2, 5)])
    bx, by = Vector((900.0, 1700.0)), Vector((2600.0, 2350.0))                  # a suspension bridge to the right
    ang = math.atan2(by.y - bx.y, by.x - bx.x)

    def along(t, z, s=0):
        c = bx.lerp(by, t)
        return (c.x - s * 9 * math.sin(ang), c.y + s * 9 * math.cos(ang), z)
    obox(a["pv_farw"], along(.5, 30), ((by - bx).length * 1.3, 14, 3), ang)
    for t in (.15, .85):
        for s in (-1, 1):
            obox(a["pv_farw"], along(t, 55, s), (5, 4, 112), ang)
        obox(a["pv_farw"], along(t, 105), (4, 20, 5), ang)
    for s in (-1, 1):
        pipe(a["pv_farw"], [Vector(along(.15 + .7 * i / 24, 34 + 72 * (2 * i / 24 - 1) ** 2, s)) for i in range(25)], 1.0, 1.0, 5)
    ob = bpy.data.objects.new("PV_Context", K.build_mesh("pv_context", a))
    col.objects.link(ob)
    n = 0
    while n < 260 and trees:
        r, d = rng.uniform(90, 190), rng.uniform(0, 360)
        p = pol(r, d)
        if p.y > 112 or abs(math.remainder(d + 122, 360)) < 20:
            continue
        t = bpy.data.objects.new("PV_Tree_%03d" % n, trees[n % len(trees)])
        t.location = (p.x, p.y, 0)
        t.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        t.scale = (rng.uniform(.9, 1.3),) * 3
        col.objects.link(t)
        n += 1
    route_trace(col)


# --- layout checks (written into the report) ---------------------------------------------------------------------------------
def layout_checks():
    out = {"pitch_m": round(S.PITCH, 2), "plateau_radius_min_m": round(S.R_TOP, 2), "plateau_radius_at_exit_m": round(S.summit_r(0.0), 2),
           "hill_outer_radius_m": round(S.rc(0) + O(0, "curb_out"), 2)}
    turns = []
    for k in range(S.TURNS):
        a, b = k * TAU, (k + 1) * TAU - 1e-6
        ln = S.arc_len(a, b)
        bw = [Vector(S.inner_edge(ph)).xy.length - Vector(S.outer_edge(ph + TAU)).xy.length for ph in phis(a, b, math.radians(2))]
        rise = [Vector(S.outer_edge(ph + TAU)).z - Vector(S.inner_edge(ph)).z for ph in phis(a, b, math.radians(2))]
        turns.append({"length_m": round(ln, 1), "z": [round(S.zp(a), 2), round(S.zp(b), 2)], "grade_pct": round(100 * (S.zp(b) - S.zp(a)) / ln, 2),
                      "channel_width_m": [round(S.width(a), 2), round(S.width(b), 2)],
                      "bank_above_width_min_m": round(min(bw), 2), "bank_above_rise_max_m": round(max(rise), 2),
                      "bank_above_slope_max_deg": round(max(math.degrees(math.atan2(r, w)) for r, w in zip(rise, bw) if w > .01), 1)})
    out["turns"] = turns
    # each turn runs on into the next: the path centre line has no jump anywhere (largest step between samples)
    d = lambda ph: (O(ph, "rim_out") + O(ph, "path_out")) / 2  # noqa: E731
    pts = [Vector(S.at(ph, d(ph))) for ph in phis(0, S.PHI_END, math.radians(.25))]
    out["path_centre_max_step_m"] = round(max((q - p).length for p, q in zip(pts, pts[1:])), 3)
    for k in (1, 2):
        ph = k * TAU
        out["turn_%d_to_%d_gap_m" % (k, k + 1)] = round((Vector(S.at(ph - 1e-6, d(ph))) - Vector(S.at(ph + 1e-6, d(ph)))).length, 4)
    # the last turn opens onto the plateau: exit edge levels and radii
    out["exit"] = {"path_z": round(S.zp(S.PHI_END), 2), "plateau_z": S.Z_END, "wall_h_at_end": round(S.wall_h(S.PHI_END), 3),
                   "exit_path_r": [round(S.rc(S.PHI_END) + O(S.PHI_END, "rim_out"), 2), round(S.rc(S.PHI_END) + O(S.PHI_END, "path_out"), 2)],
                   "plateau_edge_r_at_exit": round(S.summit_r(0.0), 2)}
    # the tube outlet sits in the channel and points along its floor: lip height, sideways offset, axis angles
    pts_t, od = tube_path()
    P = pts_t[-1]
    zf = S.zp(PH_OUT) - S.FLOOR_D
    ph_o = (math.atan2(P.y, P.x) - S.THETA0) % TAU
    off = P.xy.length - S.rc(ph_o)
    a = S.bearing(ph_o)
    t = Vector((-math.sin(a), math.cos(a), 0))
    out["tube"] = {"outlet_lip_over_floor_m": round(P.z - TUBE_R - zf, 2), "outlet_offset_from_channel_centre_m": round(off, 2),
                   "outlet_clear_of_channel_sides_m": round(S.width(ph_o) / 2 - abs(off) - TUBE_R, 2),
                   "axis_down_deg": round(math.degrees(math.asin(-od.z)), 1),
                   "axis_off_channel_direction_deg": round(math.degrees(math.acos(max(-1, min(1, od.xy.normalized().dot(t.xy))))), 1),
                   "outlet_along_m": round(ph_o * S.rc(ph_o), 2), "hero_chair_along_m": round(PH_HERO * S.rc(PH_HERO), 2)}
    return out


# --- assembly ----------------------------------------------------------------------------------------------------------------
def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    rng = random.Random(2127)
    col = bpy.data.collections.new("Q10C_Asset")
    prev = bpy.data.collections.new("Q10C_Preview")
    scene.collection.children.link(col)
    scene.collection.children.link(prev)
    root = bpy.data.objects.new("Q10C_SpiralSoilHill", None)
    col.objects.link(root)
    groups = {}
    for g in ("HILL", "CHANNEL", "WALK", "FEED", "SUMMIT", "LIFT", "PIER_LINK"):
        e = bpy.data.objects.new(g, None)
        c = bpy.data.collections.new("Q10C_" + g)
        col.children.link(c)
        c.objects.link(e)
        e.parent = root
        groups[g] = (e, c)

    def add(name, accs, g, smooth_deg=30, mw=None, data=None):
        if data is None and not any(acc.f for acc in accs.values()):
            return None
        ob = bpy.data.objects.new(name, data or K.build_mesh("q10c_" + name.lower(), accs, smooth_deg))
        groups[g][1].objects.link(ob)
        ob.parent = groups[g][0]
        if mw is not None:
            ob.matrix_local = mw
        return ob

    bk = add("HILL_BANKS", banks(), "HILL", 50)
    pl = add("HILL_PLATEAU", plateau(), "HILL", 60)
    if not MASSING:
        tint(bk)
        tint(pl, 1.3)
    add("HILL_PLAZA", plaza(), "HILL")
    add("CHANNEL_STRUCTURE", channel_structure(), "CHANNEL")
    add("WALK_PATH", walk_structure(), "WALK")
    add("WALK_RAIL", rails(), "WALK")
    add("FEED_TUBE", tube_glass(), "FEED", 60)
    add("FEED_FRAME", tube_frame(rng), "FEED")
    add("LIFT_KIOSKS", lift(), "LIFT")
    pier = bpy.data.objects.new("PIER_LINK_Q11B", None)                       # where a Q11-B pier would join on the sea side
    pier.location = tuple(pol(S.rc(0) + 8, 90))
    groups["PIER_LINK"][1].objects.link(pier)
    pier.parent = groups["PIER_LINK"][0]
    trees = []
    if not MASSING:
        add("FEED_CARGO", cargo(rng), "FEED")
        add("CHANNEL_S1_OBJECTS", stage_objects(rng), "CHANNEL")
        add("CHANNEL_S2_COCOONS", cocoons(rng), "CHANNEL", 50)
        add("CHANNEL_S3_CRUMBLE", crumble(rng), "CHANNEL", 50)
        add("CHANNEL_S4_SOIL", soil(), "CHANNEL", 50)
        add("CHANNEL_S4_SPROUTS", sprouts(rng), "CHANNEL")
        add("CHANNEL_MOUTH", mouth(rng), "CHANNEL")
        add("CHANNEL_MIST", mist(rng), "CHANNEL", 60)
        add("HILL_BANK_PLANTS", bank_planting(rng), "HILL")
        add("SUMMIT_FIELDS", fields(rng), "SUMMIT")
        TH = (11.0, 12.5, 9.5)
        trees = [tree_mesh(s, h) for s, h in zip(range(3), TH)]
        spots = forest_spots(rng)
        add("SUMMIT_UNDERSTORY", forest_floor(rng, spots), "SUMMIT")
        for i, (p, h) in enumerate(spots):
            add("SUMMIT_TREE_%02d" % (i + 1), None, "SUMMIT", data=trees[i % 3],
                mw=Matrix.Translation(p) @ Matrix.Rotation(rng.uniform(0, 6.28), 4, "Z") @ Matrix.Scale(h / TH[i % 3], 4))
        for i, (p, h) in enumerate(plaza_trees(rng)):
            add("HILL_PLAZA_TREE_%02d" % (i + 1), None, "HILL", data=trees[i % 3],
                mw=Matrix.Translation(p) @ Matrix.Rotation(rng.uniform(0, 6.28), 4, "Z") @ Matrix.Scale(h / TH[i % 3], 4))
    preview(prev, trees, rng)

    bpy.context.view_layer.update()
    asset = [o for o in col.all_objects]
    by_group = {g: sum(K.tris(o.data) for o in groups[g][1].objects if o.type == "MESH") for g in groups}
    report = {"massing": MASSING, "tris_by_group": by_group, "tris_total": sum(by_group.values()),
              "unique_mesh_tris": sum(K.tris(m) for m in {o.data for o in asset if o.type == "MESH"}),
              "objects": len(asset), "materials": len({m.name for o in asset if o.type == "MESH" for m in o.data.materials})}
    import review_spiral_soil_hill as RV
    RV.stage(scene, prev)
    blend = os.path.join(HERE, ASSET + ("-massing" if MASSING else "") + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    if "--no-export" not in ARGS and not MASSING:
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
    report["layout"] = layout_checks()
    with open(os.path.join(HERE, "report%s.json" % ("-massing" if MASSING else "")), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps(report))


if __name__ == "__main__":
    main()
