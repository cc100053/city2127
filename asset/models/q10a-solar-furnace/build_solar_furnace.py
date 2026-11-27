"""Q10-A transparent sphere furnace (crownless) and warm-water plaza (design document Q10-A v1.0; reference: Q10 sheet, image A).

Run:  blender -b --factory-startup --python-exit-code 1 -P build_solar_furnace.py [-- --no-export]
Writes q10a-solar-furnace-nocrown.blend (asset + preview staging), q10a-solar-furnace-nocrown.glb (asset only) and
report-nocrown.json (counts and layout checks) beside this file. The earlier crowned ring-stand version is frozen as
q10a-solar-furnace.{blend,glb}; this script no longer builds it.
No human figures anywhere: chairs, steps, ramps and railings give the scale.

Blender coordinates, real metres, origin = pool centre on the plaza (z 0), sea on +y, main view from the land side (-y).
Sphere furnace centre z 54 m, outer diameter 30 m, 4 m cold-white light core; the top of the sphere is the top of the
structure (z 69). The sphere sits in an open shallow bowl: three groups of curved box ribs run in under the lower half and
carry it on bearing pads that touch the glass (near the bottom and at the rib tips, plus a centre tongue per group); each
group grows out of the fork of an arched box column (wide root, slim waist), cut level on a base plate that sits on its own
plinth rising from the pool floor clear of the water. Two columns flank the main view; the third stands behind, its foot
set left of the bridge to the centre island so the bridge passes between two feet. Four feed tubes rise from plaza stations
into the underside of the sphere through the gaps between the rib groups; the front-right one carries whole old chairs that
break into shards and then light particles inside the sphere. Power lines run down the two front columns into plaza grooves.

Nodes: Q10A_SolarFurnace > STRUCTURE, FURNACE, FEED, POWER, POOL, PLAZA. The three static story stages are separate
nodes so an animation can drive each: FEED_CHAIRS_* (objects rising), FURNACE_SHARDS / FURNACE_SPARKS (breaking up),
POWER_LINES (output). Preview staging (sea, far shore, bridge) is collection Q10A_Preview and is never exported.
Geometry primitives and the library hook (kit props, leafy_tree) come from the Q04-A builder's parts.py, as Q04-B does.
"""
import importlib.util
import json
import math
import os
import random
import sys

import bpy
from mathutils import Matrix, Vector

sys.dont_write_bytecode = True       # Q04-A's __pycache__ is tracked: loading its parts.py must not rewrite it
HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.dirname(HERE)
sys.path.insert(0, HERE)
_spec = importlib.util.spec_from_file_location("q04a_parts", os.path.join(MODELS, "q04a-suspended-pod-tower", "parts.py"))
K = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(K)
G, M = K.G, K.M
Accs, loft, obox, lathe, ring, sector, pipe, srgb = K.Accs, K.loft, K.obox, K.lathe, K.ring, K.sector, K.pipe, K.srgb

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ASSET = "q10a-solar-furnace-nocrown"   # the crowned ring-stand version is frozen as q10a-solar-furnace.{blend,glb}

C = Vector((0.0, 0.0, 54.0))         # sphere centre
SR = 15.0                            # sphere outer radius
CORE_R = 2.0
COLUMNS = ((210.0, 210.0), (330.0, 330.0), (112.0, 100.0))  # (foot bearing, cradle bearing) of the three columns: two flank
# the main view (-90); the third stands behind, its foot set left of the island bridge (bearing 90), its top turned back under the sphere
FOOT_R = 31.0                        # base centre radius in the pool
BASE_L, BASE_W, BASE_RAD = 7.6, 6.0, 1.6   # base plinth: radial length, tangential width, corner radius
BASE_TOP = .45                       # base top stands .6 m clear of the water (-0.15): the foot reads from the poolside
PLATE_L, PLATE_W, PLATE_T = 4.6, 5.6, .3   # base plate under each column foot
FOOT_Z = BASE_TOP + PLATE_T          # each column ends in a level cut on its plate
FORK = (11.2, 33.5)                  # (r, z) where a column forks into its cradle ribs, under the sphere
CRADLE_GAP = .9                      # rib centre line off the glass
RIB_E, RIB_B = (-58.0, -28.0), (5.0, 16.0)  # each rib runs from near the bottom (elevation, bearing offset) out to its tip
PAD_E = (-52.0, -31.0)               # bearing pads along each rib: one near the bottom, one at the tip
TONGUE_E = -68.0                     # each group's centre tongue reaches in to a pad close to the bottom
BRIDGE_HALF = .95                    # island bridge deck half-width (rails at .85)
TUBES = (315, 225, 135, 45)          # feed tube station bearings (on the plaza paths)
ENTRY = {315: 293.0, 225: 247.0, 135: 135.0, 45: 45.0}  # where each tube enters the sphere: the front pair swings clear of the columns
HERO = 315                           # front-right tube with the whole chairs: a diagonal from the main view, nearest the poolside view
ENTRY_E = -62.0                      # tube entry elevation: under the sphere, off to the side, between the cradle rib groups
POOL_R, COPING_R, WALK_R, PLAZA_R = 44.0, 45.2, 49.5, 76.0
WATER_Z, SHALLOW_Z, DEEP_Z = -.15, -.6, -1.25
RAMPS = (200, 340)
LADDERS = (20, 160, 125, 55)
SEAT_ARCS = ((-115, -65), (30, 48), (132, 150))
OUTLETS = (-50, -130, 70, 110)
POWER_LEGS = (210.0, 330.0)


def pol(r, deg, z=0.0):
    a = math.radians(deg)
    return Vector((r * math.cos(a), r * math.sin(a), z))


def smooth(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def col_rz(t):
    """(r, z) of a column centre line at t (0 foot .. 1 fork): rising level off its plate, then arching in under the sphere."""
    p = [Vector((FOOT_R, FOOT_Z)), Vector((FOOT_R - .6, 12.0)), Vector((FORK[0] + 5.5, 26.0)), Vector(FORK)]
    q = p[0] * (1 - t) ** 3 + p[1] * 3 * (1 - t) ** 2 * t + p[2] * 3 * (1 - t) * t * t + p[3] * t ** 3
    return q.x, q.y


def col_size(t):
    """Horizontal box section (tangential width, radial depth): a wide root, a slim waist, widening again into the fork."""
    w = 1.5 + 2.9 * (1 - smooth(0, .5, t)) + .9 * smooth(.65, 1, t)
    d = 1.25 + 2.0 * (1 - smooth(0, .5, t)) + .55 * smooth(.65, 1, t)
    return w, d


def col_at(fb, cb, t):
    """Centre point and bearing of the column with foot bearing fb and cradle bearing cb at t."""
    b = fb + (cb - fb) * smooth(0, 1, t)
    r, z = col_rz(t)
    return pol(r, b, z), b


def sph(d, e, r):
    """Point at bearing d, elevation e (degrees) on a sphere of radius r round the furnace centre."""
    d, e = math.radians(d), math.radians(e)
    return C + Vector((math.cos(e) * math.cos(d), math.cos(e) * math.sin(d), math.sin(e))) * r


# --- small geometry helpers (axis-free) --------------------------------------------------------------------------------------
def basis(t):
    t = t.normalized()
    u = t.cross(Vector((0, 0, 1)) if abs(t.z) < .9 else Vector((1, 0, 0))).normalized()
    return t, u, t.cross(u)


def circle_ax(c, u, w, r, n):
    return [tuple(c + u * (r * math.cos(2 * math.pi * j / n)) + w * (r * math.sin(2 * math.pi * j / n))) for j in range(n)]


def collar(acc, p, t, r0, r1, h, n=28):
    """Annular band of radii r0..r1, 2h long, round axis t at p (does not plug the tube)."""
    t, u, w = basis(t)
    loft(acc, [circle_ax(p + t * dh, u, w, r, n) for r, dh in ((r0, -h), (r1, -h), (r1, h), (r0, h))], wrap=True)


def frames(pts):
    """Parallel-transported (t, u, w) along a polyline."""
    out = []
    t0 = (pts[1] - pts[0]).normalized()
    _, u, _ = basis(t0)
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        u = (u - t * u.dot(t)).normalized()
        out.append((t, u, t.cross(u)))
    return out


def open_tube(acc, pts, r, n=28):
    """Open glass tube along pts, faces looking outward from the centre line."""
    fr = frames(pts)
    vs, fs = [], []
    for p, (t, u, w) in zip(pts, fr):
        vs += circle_ax(p, u, w, r, n)
    for i in range(len(pts) - 1):
        for k in range(n):
            f = (i * n + k, i * n + (k + 1) % n, (i + 1) * n + (k + 1) % n, (i + 1) * n + k)
            a, b, c = (Vector(vs[j]) for j in f[:3])
            out = (a + c) / 2 - (pts[i] + pts[i + 1]) / 2
            fs.append(f if (b - a).cross(c - a).dot(out) >= 0 else f[::-1])
    acc._push(vs, fs)


def octa(acc, c, s, rng=None):
    """Light particle / shard: a small octahedron (8 tris), randomly stretched."""
    k = (1, 1, 1) if rng is None else (rng.uniform(.7, 1.3), rng.uniform(.7, 1.3), rng.uniform(.7, 1.3))
    vs = [(c.x + s * k[0], c.y, c.z), (c.x - s * k[0], c.y, c.z), (c.x, c.y + s * k[1], c.z), (c.x, c.y - s * k[1], c.z),
          (c.x, c.y, c.z + s * k[2]), (c.x, c.y, c.z - s * k[2])]
    fs = [(0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)]
    acc.solid(vs, fs)


def shard(acc, c, s, rng):
    """Splinter of a chair: a small box with a random tilt."""
    m = Matrix.Rotation(rng.uniform(0, 6.3), 3, Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized())
    hx, hy, hz = s * rng.uniform(1.2, 2.6), s * rng.uniform(.35, .6), s * rng.uniform(.25, .45)
    secs = [[tuple(c + m @ Vector((x, y, z))) for x, y in ((-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy))] for z in (-hz, hz)]
    loft(acc, secs)


def sphere(acc, c, r, n=24, m=14):
    M.ell(acc, tuple(c), (r, 0, 0), (0, r, 0), (0, 0, r), n, m)


def tbox(acc, T, c, size):
    """Box of size (x, y, z) centred c in a local frame T (4x4 Matrix)."""
    hx, hy, hz = (s / 2 for s in size)
    loft(acc, [[tuple(T @ Vector((c[0] + x, c[1] + y, c[2] + z))) for x, y in ((-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy))] for z in (-hz, hz)])


def cubic(p0, p1, p2, p3, n):
    return [p0 * (1 - t) ** 3 + p1 * 3 * (1 - t) ** 2 * t + p2 * 3 * (1 - t) * t * t + p3 * t ** 3 for t in (j / n for j in range(n + 1))]


def resample(pts, step):
    """Points every `step` metres along a polyline (by arc length)."""
    d = [0.0]
    for a, b in zip(pts, pts[1:]):
        d.append(d[-1] + (b - a).length)
    out, s, i = [], 0.0, 0
    while s <= d[-1]:
        while d[i + 1] < s:
            i += 1
        f = (s - d[i]) / max(d[i + 1] - d[i], 1e-9)
        out.append(pts[i].lerp(pts[i + 1], f))
        s += step
    return out


# --- old chair (site-only; the kit has no wooden chair) -------------------------------------------------------------------
def chair(a, T, part="whole"):
    """Worn ladder-back wooden chair, 0.46 x 0.44 x 0.95 m, origin at floor centre, seat front toward local -y.
    part: whole | back (only the back posts' upper half, top rail and one slat: what is still recognisable at the furnace)."""
    w, dk, fb = a["wood"], a["wood_dark"], a["fabric_old"]
    if part == "whole":
        for x in (-.2, .2):
            tbox(w, T, (x, -.19, .22), (.04, .04, .44))
            tbox(w, T, (x, .19, .475), (.045, .045, .95))
            tbox(dk, T, (x, 0, .16), (.022, .36, .025))
        tbox(dk, T, (0, -.19, .14), (.36, .022, .025))
        tbox(w, T, (0, 0, .46), (.48, .46, .045))
        tbox(fb, T, (0, -.01, .505), (.40, .38, .05))
        tbox(w, T, (0, .19, .62), (.38, .03, .05))
        tbox(w, T, (0, .19, .74), (.38, .03, .05))
        tbox(w, T, (0, .195, .885), (.46, .045, .09))
    else:
        tbox(w, T, (-.2, .19, .72), (.045, .045, .46))
        tbox(w, T, (.2, .19, .66), (.045, .045, .34))
        tbox(w, T, (0, .195, .885), (.46, .045, .09))
        tbox(w, T, (-.04, .19, .74), (.30, .03, .05))


# --- STRUCTURE ---------------------------------------------------------------------------------------------------------------
def rrect(c, u, v, a, b, rad, z, k=4):
    """Level rounded rectangle at height z, centred on c's plan position: half-sizes a along u and b along v."""
    rad = min(rad, a * .95, b * .95)
    out = []
    for cu, cv, a0 in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        for j in range(k + 1):
            t = math.radians(a0 + 90 * j / k)
            p = Vector((c.x, c.y, 0)) + u * (cu * (a - rad) + rad * math.cos(t)) + v * (cv * (b - rad) + rad * math.sin(t))
            out.append((p.x, p.y, z))
    return out


def side_at(p):
    """Level tangential direction (bearing + 90) at p."""
    return Vector((-p.y, p.x, 0)).normalized()


def strap(acc, pts, w0, w1, d0, d1):
    """Box-section bar along pts: width across (tangential), depth in the bar's own vertical plane; tapers w0->w1, d0->d1."""
    secs, n = [], len(pts) - 1
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n)] - pts[max(i - 1, 0)]).normalized()
        s = side_at(p)
        s = (s - t * s.dot(t)).normalized()
        q = s.cross(t)
        w, d = w0 + (w1 - w0) * i / n, d0 + (d1 - d0) * i / n
        secs.append([tuple(p + s * (x * w / 2) + q * (y * d / 2)) for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    loft(acc, secs)


def columns():
    """Three arched box columns: a wide root cut level on its plate, a slim waist, widening again into the fork."""
    a = Accs()
    n = 60
    for fb, cb in COLUMNS:
        secs, seam = [], []
        for k in range(n + 1):
            t = k / n
            p, b = col_at(fb, cb, t)
            w, d = col_size(t)
            u, v = pol(1, b), pol(1, b + 90)
            secs.append(rrect(p, u, v, d / 2, w / 2, min(w, d) * .22, p.z))
            if 2 <= k <= n - 4:
                seam.append(p + u * (d / 2 + .012))
        loft(a["frame"], secs)
        pipe(a["glowline"], seam, .045, .045, 6)                                # thin light seam down the outer face
        p, b = col_at(fb, cb, 0)                                                # joint edge where the foot meets its plate
        w, d = col_size(0)
        u, v = pol(1, b), pol(1, b + 90)
        loft(a["seam"], [rrect(p, u, v, d / 2 + .05, w / 2 + .05, min(w, d) * .22, z) for z in (FOOT_Z - .01, FOOT_Z + .14)])
    return a


def bases():
    """One plinth per column, standing up from the pool floor with its top clear of the water, and the column's base plate."""
    a = Accs()
    for fb, cb in COLUMNS:
        c, u, v = pol(FOOT_R, fb), pol(1, fb), pol(1, fb + 90)
        hl, hw = BASE_L / 2, BASE_W / 2
        loft(a["node"], [rrect(c, u, v, hl, hw, BASE_RAD, DEEP_Z - .02), rrect(c, u, v, hl, hw, BASE_RAD, BASE_TOP - .16),
                         rrect(c, u, v, hl - .16, hw - .16, BASE_RAD - .16, BASE_TOP)])
        loft(a["glowline"], [rrect(c, u, v, hl + .015, hw + .015, BASE_RAD, z) for z in (BASE_TOP - .3, BASE_TOP - .23)])
        p, b = col_at(fb, cb, 0)
        u, v = pol(1, b), pol(1, b + 90)
        pl, pw = PLATE_L / 2, PLATE_W / 2
        loft(a["frame"], [rrect(p, u, v, pl, pw, .45, BASE_TOP - .01), rrect(p, u, v, pl, pw, .45, FOOT_Z - .08),
                          rrect(p, u, v, pl - .08, pw - .08, .37, FOOT_Z)])
        for x in (-1, 1):                                                       # anchor bolts at the plate corners
            for y in (-1, 1):
                q = p + u * (x * (pl - .38)) + v * (y * (pw - .38))
                lathe(a["seam"], [(.15, FOOT_Z - .02), (.15, FOOT_Z + .09), (.01, FOOT_Z + .12)], 10, q.x, q.y)
    return a


def rib_at(g, s, t):
    """Point on a cradle rib (group bearing g, side s) at t (0 near the bottom .. 1 tip), CRADLE_GAP off the glass."""
    e = RIB_E[0] + (RIB_E[1] - RIB_E[0]) * t
    return sph(g + s * (RIB_B[0] + (RIB_B[1] - RIB_B[0]) * smooth(0, 1, t)), e, SR + CRADLE_GAP)


def pad(a, q, p, depth):
    """Bearing pad: a stub from the rib face at q to a pad that sits on the glass at shell point p (with an elastomer layer)."""
    n = (p - C).normalized()
    pipe(a["frame"], [q - n * (depth / 2 - .05), p + n * .16], .22, .22, 10)
    collar(a["seam"], p + n * -.01, n, .01, .68, .03, 24)                      # elastomer: its inner face bears on the shell
    collar(a["frame"], p + n * .1, n, .01, .6, .08, 24)


def cradle():
    """Open shallow bowl: each column forks into two curved ribs that run in under the sphere and sweep out along the lower
    shell, plus a centre tongue; bearing pads on the ribs (near the bottom and at the tips) and on the tongue carry the
    glass. Glass -> pad -> rib -> column -> base. The tube entries sit in the gaps between the three groups."""
    a = Accs()
    for fb, cb in COLUMNS:
        F, b = col_at(fb, cb, 1)
        v = pol(1, b + 90)
        for s in (-1, 1):
            arc = [rib_at(cb, s, k / 30) for k in range(31)]
            ts = (arc[1] - arc[0]).normalized()
            f0 = F + v * (s * .7) - Vector((0, 0, .4))
            arm = cubic(f0, f0 + Vector((0, 0, 3.5)), arc[0] - ts * 2.2, arc[0], 16)
            strap(a["frame"], arm[:-1] + arc, 1.35, .62, 1.15, .55)
            for e in PAD_E:
                t = (e - RIB_E[0]) / (RIB_E[1] - RIB_E[0])
                k = round(t * 30)
                q = arc[k]
                pad(a, q, C + (q - C).normalized() * SR, .7)
        tip = sph(cb, TONGUE_E, SR + .55)                                       # centre tongue to a pad near the bottom
        nt = (tip - C).normalized()
        strap(a["frame"], cubic(F - Vector((0, 0, .4)), F + Vector((0, 0, 3.0)), tip + nt * 2.5, tip, 16), .95, .6, .85, .5)
        pad(a, tip, C + nt * SR, .5)
    return a


# --- FURNACE -----------------------------------------------------------------------------------------------------------------
def shell():
    a = Accs()
    n, es = 72, [e for e in range(-88, 89, 4)]
    vs, fs = [], []
    for e in es:
        ce, se = math.cos(math.radians(e)), math.sin(math.radians(e))
        vs += [(C.x + SR * ce * math.cos(2 * math.pi * j / n), C.y + SR * ce * math.sin(2 * math.pi * j / n), C.z + SR * se) for j in range(n)]
    for i in range(len(es) - 1):
        fs += [(i * n + k, i * n + (k + 1) % n, (i + 1) * n + (k + 1) % n, (i + 1) * n + k) for k in range(n)]
    a["shell_glass"].facing(vs, fs, lambda c: (c[0] - C.x, c[1] - C.y, c[2] - C.z))
    return a


def mullions():
    a = Accs()
    for j in range(16):
        d = j * 22.5 + 11.25
        pipe(a["mullion"], [C + Vector((math.cos(math.radians(e)) * math.cos(math.radians(d)), math.cos(math.radians(e)) * math.sin(math.radians(d)),
                                        math.sin(math.radians(e)))) * (SR + .06) for e in range(-82, 83, 4)], .085, .085, 6)
    for e in (-56, -28, 28, 56):
        r, z = (SR + .04) * math.cos(math.radians(e)), C.z + (SR + .04) * math.sin(math.radians(e))
        ring(a["mullion"], r - .07, r + .07, z - .09, z + .09, 96)
    lathe(a["frame"], [(.01, C.z + SR - .3), (2.6, C.z + SR * math.sin(math.radians(80)) - .2), (2.9, C.z + SR * math.sin(math.radians(79))),
                       (2.4, C.z + SR + .25), (.01, C.z + SR + .45)], 32)        # top cap the meridians meet
    for d in TUBES:                                                             # entry collars where the tubes meet the shell
        dv = entry_dir(d)
        collar(a["frame"], C + dv * (SR + .1), dv, TUBE_R + .06, TUBE_R + .8, .5, 40)
        collar(a["glowline"], C + dv * (SR + .64), dv, TUBE_R + .45, TUBE_R + .52, .06, 40)
    return a


def brackets():
    """Inside the shell: a gimbal ring round the core held by six slim rods to the shell, and a lit core seat."""
    a = Accs()
    tilt = Matrix.Rotation(math.radians(-28), 4, "X")
    for rot in (Matrix.Identity(4), Matrix.Rotation(math.radians(90), 4, "Y")):
        pts = [C + (tilt @ rot @ Vector((3.4 * math.cos(2 * math.pi * j / 40), 3.4 * math.sin(2 * math.pi * j / 40), 0))) for j in range(41)]
        pipe(a["bracket"], pts, .09, .09, 6)
    for k in range(6):
        d, e = k * 60 + 30, (-52 if k % 2 else 50)
        p = C + Vector((math.cos(math.radians(e)) * math.cos(math.radians(d)), math.cos(math.radians(e)) * math.sin(math.radians(d)),
                        math.sin(math.radians(e)))) * (SR - .1)
        q = C + (p - C).normalized() * 3.4
        pipe(a["bracket"], [p, q], .07, .05, 6)
        sphere(a["bracket"], q, .16, 8, 6)
        collar(a["bracket"], p - (p - C).normalized() * .12, p - C, .01, .45, .08, 16)
    return a


def core():
    a = Accs()
    sphere(a["core"], C, CORE_R, 32, 20)
    sphere(a["halo"], C, CORE_R * 1.35, 28, 16)
    sphere(a["halo_b"], C, CORE_R * 2.0, 28, 16)
    return a


def entry_dir(d):
    """Unit direction from the sphere centre to where the tube from station bearing d enters the shell."""
    e, b = math.radians(ENTRY_E), math.radians(ENTRY[d])
    return Vector((math.cos(e) * math.cos(b), math.cos(e) * math.sin(b), math.sin(e)))


def sparks(rng):
    """Spiral of light particles round the core in a tilted plane, plus a thin cloud."""
    a = Accs()
    n = Vector((0, -math.sin(math.radians(50)), math.cos(math.radians(50))))
    u = Vector((1, 0, 0))
    v = n.cross(u)
    for arm in (0, 1):
        for i in range(700):
            th = i * .0128 + arm * math.pi
            r = 2.7 * math.exp(.175 * th - .175 * arm * math.pi)
            if r > 12.8:
                break
            j = .10 + .045 * r                                                  # arms stay thin, widening outward
            p = C + u * (r * math.cos(th) + rng.gauss(0, j)) + v * (r * math.sin(th) + rng.gauss(0, j)) + n * rng.gauss(0, j * .35)
            octa(a["spark" if rng.random() < .75 else "spark_b"], p, rng.uniform(.08, .22) * (1.25 - r / 16), rng)
    k = 0
    while k < 260:
        p = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * 13.2
        if p.length > 13.2 or p.length < 2.8:
            continue
        octa(a["spark_b" if k % 3 else "spark"], C + p, rng.uniform(.05, .14), rng)
        k += 1
    return a


def stream(rng, d, count, hero):
    """From one tube's entry to the core: shards that thin out into sparks along a swirling path."""
    a = Accs()
    dv = entry_dir(d)
    p0 = C + dv * (SR - 2.2)
    axis = Vector((0, -math.sin(math.radians(50)), math.cos(math.radians(50))))
    for i in range(count):
        s = (i + rng.random()) / count
        q = C + Matrix.Rotation(s * 1.6 * math.pi, 3, axis) @ ((p0 - C) * (1 - s * .86))
        j = .25 + .55 * (1 - s)
        q += Vector((rng.gauss(0, j), rng.gauss(0, j), rng.gauss(0, j)))
        wood = hero and rng.random() > smooth(.12, .55, s)
        if wood:
            shard(a["wood" if rng.random() < .6 else "wood_dark"], q, .09 * (1.3 - s), rng)
        else:
            octa(a["spark" if rng.random() < .6 else "spark_b"], q, rng.uniform(.06, .18), rng)
    if hero:                                                                    # what is still a chair just inside the shell
        q = C + dv * (SR - 1.6)
        T = Matrix.Translation(q - Vector((0, 0, .5))) @ Matrix.Rotation(math.radians(d + 90 + 18), 4, "Z") @ Matrix.Rotation(math.radians(14), 4, "X")
        chair(a, T, "back")
        for k in range(26):
            shard(a["wood" if k % 3 else "wood_dark"], q + Vector((rng.gauss(0, .5), rng.gauss(0, .5), rng.gauss(-.1, .35))), .06, rng)
    return a


# --- FEED --------------------------------------------------------------------------------------------------------------------
TUBE_R = 2.1
STATION_R = WALK_R + 5.0


def tube_path(d):
    dv = entry_dir(d)
    p3 = C + dv * (SR - .2)
    p2 = C + dv * (SR + 12)
    return cubic(pol(STATION_R - 1.4, d, 3.0), pol(POOL_R - 3.0, d, 5.0), p2, p3, 64)


def down_at(t):
    g = Vector((0, 0, -1))
    return (g - t * g.dot(t)).normalized()


def tube_glass(d):
    a = Accs()
    open_tube(a["tube_glass"], tube_path(d), TUBE_R, 32)
    return a


def tube_frame(d, rng):
    a = Accs()
    pts = tube_path(d)
    fr = frames(pts)
    rail = [p + down_at(t) * (TUBE_R - .2) for p, (t, _u, _w) in zip(pts, fr)]
    pipe(a["rail"], rail, .07, .07, 6)
    for s in (-1, 1):                                                           # lit seams along both upper edges outline the tube from afar
        seam = []
        for p, (t, _u, _w) in zip(pts, fr):
            up = -down_at(t)
            seam.append(p + (up * math.cos(math.radians(55)) + t.cross(up) * (s * math.sin(math.radians(55)))) * (TUBE_R + .03))
        pipe(a["glowline"], seam[1:-1], .06, .06, 6)
    for p in resample(pts, 9.0)[1:]:                                             # joints with visible seams
        t = (pts[min(range(len(pts)), key=lambda i: (pts[i] - p).length) + 1] - p).normalized() if (pts[-1] - p).length > .5 else fr[-1][0]
        collar(a["frame"], p, t, TUBE_R - .02, TUBE_R + .12, .14, 32)
        collar(a["seam"], p, t, TUBE_R + .11, TUBE_R + .14, .04, 32)
    # saddle supports over the walkway and the water, and a tall pair from the pool floor at about 18 m
    picks = [min(range(len(pts)), key=lambda k: abs(pts[k].xy.length - target)) for target in (WALK_R - 2.0, POOL_R - 6.0)]
    picks.append(min(range(len(pts)), key=lambda k: abs(pts[k].z - 18)))
    for i in picks:
        p, (t, u, w) = pts[i], fr[i]
        collar(a["frame"], p, t, TUBE_R - .02, TUBE_R + .26, .35, 32)
        side = Vector((-t.y, t.x, 0)).normalized()
        rr = p.xy.length
        floor = 0.0 if rr > POOL_R else SHALLOW_Z if rr > POOL_R - 4.4 else DEEP_Z
        for s in (-1, 1):
            top = p + side * (s * (TUBE_R + .1)) - Vector((0, 0, .4))
            pipe(a["frame"], [Vector((top.x, top.y, floor)), top], .16 if top.z < 8 else .26, .14 if top.z < 8 else .2, 8)
            lathe(a["node"], [(.42, floor - .05), (.42, max(floor + .12, WATER_Z + .05)), (.2, max(floor + .2, WATER_Z + .12))], 12, top.x, top.y)
    # station on the plaza where the tube starts
    sd = math.radians(d)
    T = Matrix.Translation(pol(STATION_R, d, 0)) @ Matrix.Rotation(sd, 4, "Z")
    tbox(a["station"], T, (0, 0, .2), (7.4, 5.2, .4))
    tbox(a["station"], T, (0, 0, 4.75), (7.6, 5.4, .3))
    for x in (-3.5, 3.5):
        for y in (-2.4, 2.4):
            tbox(a["frame"], T, (x, y, 2.45), (.22, .22, 4.3))
    tbox(a["glowline"], T, (0, -2.72, 4.62), (7.0, .04, .08))
    tbox(a["glowline"], T, (0, 2.72, 4.62), (7.0, .04, .08))
    tbox(a["dark"], T, (3.62, 0, 1.4), (.06, 2.2, 2.4))                           # loading hatch on the plaza side
    tbox(a["glowline"], T, (3.66, 0, 2.7), (.03, 2.0, .06))
    return a


def station_glass(d):
    a = Accs()
    T = Matrix.Translation(pol(STATION_R, d, 0)) @ Matrix.Rotation(math.radians(d), 4, "Z")
    for y in (-2.5, 2.5):
        tbox(a["station_glass"], T, (0, y, 2.47), (6.9, .04, 4.15))
    tbox(a["station_glass"], T, (-3.55, 0, 2.47), (.04, 4.9, 4.15))
    return a


def cargo(d, rng):
    """What rides in each tube: whole chairs in the hero tube, sparse other objects elsewhere."""
    a = Accs()
    pts = tube_path(d)
    fr = frames(pts)

    def at(f):
        i = int(f * (len(pts) - 1))
        t = fr[i][0]
        return pts[i] + down_at(t) * (TUBE_R - .28), t
    if d == HERO:
        for k, f in enumerate((.06, .13, .2, .28, .36, .45, .55, .66, .78, .9)):
            p, t = at(f)
            T = Matrix.Translation(p) @ Matrix.Rotation(math.radians(d + 90 + (8 if k % 2 else -6)), 4, "Z")
            tbox(a["carrier"], T, (0, 0, -.06), (.62, .58, .08))
            tbox(a["carrier"], T, (0, 0, -.2), (.06, .06, .22))
            chair(a, T)
        for k in range(3):                                                      # chairs waiting at the station
            T = Matrix.Translation(pol(STATION_R + 1.1, d - 6.0 - k * .8, 0)) @ Matrix.Rotation(math.radians(d + 180 + k * 9), 4, "Z")
            chair(a, T)
        T = Matrix.Translation(pol(STATION_R + 2.8, d - 6.5, .47)) @ Matrix.Rotation(math.radians(d + 160), 4, "Z") @ Matrix.Rotation(math.radians(3), 4, "Y")
        chair(a, Matrix.Translation(pol(STATION_R + 2.8, d - 6.5, 0)) @ Matrix.Rotation(math.radians(d + 150), 4, "Z"))
        chair(a, T)                                                             # one stacked on another
    else:
        for f in {225: (.3, .7), 135: (.42, .82), 45: (.25, .6)}[d]:
            p, t = at(f)
            T = Matrix.Translation(p) @ Matrix.Rotation(math.radians(d + rng.uniform(60, 120)), 4, "Z")
            kind = rng.choice(("box", "lamp", "crate"))
            if kind == "box":
                tbox(a["dark"], T, (0, 0, .32), (.7, .5, .55))
                tbox(a["fabric_old"], T, (0, -.255, .34), (.58, .02, .42))
            elif kind == "lamp":
                tbox(a["dark"], T, (0, 0, .02), (.3, .3, .04))
                tbox(a["carrier"], T, (0, 0, .45), (.04, .04, .85))
                tbox(a["fabric_old"], T, (0, 0, .95), (.4, .4, .3))
            else:
                tbox(a["wood"], T, (0, 0, .25), (.8, .6, .5))
                tbox(a["wood_dark"], T, (0, 0, .51), (.82, .62, .03))
    return a


# --- POWER -------------------------------------------------------------------------------------------------------------------
def power():
    a = Accs()
    for L in POWER_LEGS:
        fb, cb = next(c for c in COLUMNS if c[0] == L)                          # from the fork down the column's outer face
        line = []
        for k in range(58, 0, -1):
            t = k / 60
            p, b = col_at(fb, cb, t)
            d = col_size(t)[1]
            line.append(pol(col_rz(t)[0] + d / 2 + .32, b, p.z))
            if k % 6 == 0:
                pipe(a["frame"], [line[-1], pol(col_rz(t)[0] + d / 2 - .02, b, p.z)], .06, .06, 5)
        edge = FOOT_R + BASE_L / 2 + .2                                         # over the plate and the base top, down its outer face
        line += [pol(edge - 2.0, L, FOOT_Z + .25), pol(edge, L, BASE_TOP + .1), pol(edge, L, DEEP_Z + .12)]
        pipe(a["power"], line, .13, .13, 8)
        # along the pool floor, under the walkway, into a groove that turns toward the city
        pipe(a["power"], [pol(edge, L, DEEP_Z + .12), pol(edge + 1.2, L, SHALLOW_Z - .55), pol(POOL_R - .3, L, SHALLOW_Z + .05)], .1, .1, 8)
        turn = 1 if L < 270 else -1
        path = [pol(POOL_R - .3 + k * .5, L + turn * 18 * smooth(COPING_R, PLAZA_R + 6, POOL_R - .3 + k * .5), 0) for k in range(int((PLAZA_R + 6 - POOL_R) / .5) + 1)]
        for p, q in zip(path, path[1:]):
            m = (p + q) / 2
            ang = math.atan2(q.y - p.y, q.x - p.x)
            obox(a["groove"], (m.x, m.y, .012), ((q - p).length + .02, .55, .03), ang)
            obox(a["power"], (m.x, m.y, .03), ((q - p).length + .02, .14, .03), ang)
    return a


# --- POOL --------------------------------------------------------------------------------------------------------------------
def gaps(a0, a1, holes, half):
    """Split the arc a0..a1 (degrees) round the given hole bearings."""
    cuts, cur = [], a0
    for h in sorted(((x - a0) % 360 + a0 for x in holes)):
        if h - half > cur:
            cuts.append((cur, h - half))
        cur = h + half
    if cur < a1:
        cuts.append((cur, a1))
    return cuts


def pool(rng):
    a = Accs()
    lathe(a["pool_floor"], [(.01, -1.8), (POOL_R + .3, -1.8), (POOL_R + .3, SHALLOW_Z), (POOL_R - 4.4, SHALLOW_Z), (POOL_R - 5.4, DEEP_Z), (.01, DEEP_Z)], 144, wrap=True)
    for r in (8, 12, 16, 20, 24):                                                # tile bands under the water
        ring(a["pool_tile"], r, r + .25, DEEP_Z, DEEP_Z + .01, 144)
    ring(a["pool_tile"], POOL_R - 4.3, POOL_R - 4.0, SHALLOW_Z, SHALLOW_Z + .01, 144)
    for a0, a1 in gaps(-180, 180, RAMPS, 3.1):                                   # coping: the sitting edge round the water
        sector(a["coping"], POOL_R, COPING_R, a0, a1, SHALLOW_Z, .35, 1.5)
        sector(a["coping_edge"], COPING_R - .08, COPING_R + .02, a0, a1, .33, .38, 1.5)
    for a0, a1 in SEAT_ARCS:                                                    # seat steps stepping down into the water
        sector(a["coping"], POOL_R - 1.1, POOL_R, a0, a1, SHALLOW_Z, .02, 1.5)
        sector(a["coping"], POOL_R - 2.2, POOL_R - 1.1, a0, a1, SHALLOW_Z, -.34, 1.5)
        sector(a["glowline"], POOL_R - .06, POOL_R + .0, a0, a1, -.12, -.06, 1.5)
    for d in RAMPS:                                                             # gentle ramps into the shallow edge
        T = Matrix.Rotation(math.radians(d), 4, "Z")
        r0, r1 = COPING_R + 2.8, POOL_R - 4.2
        sec = lambda r, z: [tuple(T @ Vector((r, y, zz))) for y, zz in ((-1.6, -1.8), (1.6, -1.8), (1.6, z), (-1.6, z))]  # noqa: E731
        loft(a["coping"], [sec(r0, .0), sec(COPING_R, -.08), sec(r1, SHALLOW_Z)])
        for s in (-1, 1):
            posts = [Vector((r0 - k * 1.2, s * 1.55, 0)) for k in range(8)]
            for p in posts:
                z = max(SHALLOW_Z, -.08 * (r0 - p.x) / (r0 - COPING_R)) if p.x > COPING_R else SHALLOW_Z + (p.x - r1) / (COPING_R - r1) * (-.08 - SHALLOW_Z)
                pipe(a["rail"], [T @ Vector((p.x, p.y, z)), T @ Vector((p.x, p.y, z + .95))], .03, .03, 6)
            top = [T @ Vector((r, s * 1.55, .95 + (max(SHALLOW_Z, -.08 * (r0 - r) / (r0 - COPING_R)) if r > COPING_R else SHALLOW_Z + (r - r1) / (COPING_R - r1) * (-.08 - SHALLOW_Z))))
                   for r in [r0 - k * .6 for k in range(15)]]
            pipe(a["rail"], top, .035, .035, 6)
    for d in LADDERS:                                                           # steel ladders with grab rails
        T = Matrix.Rotation(math.radians(d), 4, "Z")
        for s in (-1, 1):
            pts = [T @ Vector((COPING_R + .35, s * .3, 0)), T @ Vector((COPING_R + .35, s * .3, .95)), T @ Vector((COPING_R - .2, s * .3, 1.2)),
                   T @ Vector((POOL_R - .3, s * .3, .95)), T @ Vector((POOL_R - .3, s * .3, SHALLOW_Z))]
            pipe(a["rail"], pts, .03, .03, 6)
        for z in (-.45, -.15):
            pipe(a["rail"], [T @ Vector((POOL_R - .3, -.3, z)), T @ Vector((POOL_R - .3, .3, z))], .025, .025, 6)
    # centre island: equipment plinth, maintenance hatch, service bridge to the sea-side walkway
    lathe(a["coping"], [(.01, DEEP_Z), (5.6, DEEP_Z), (5.6, .45), (5.3, .58), (.01, .58)], 64)
    ring(a["glowline"], 5.58, 5.62, .2, .28, 64)
    T = Matrix.Rotation(math.radians(90), 4, "Z")
    tbox(a["dark"], T, (5.6, 0, 1.2), (.1, 1.4, 1.2))
    tbox(a["coping"], T, ((5.6 + COPING_R) / 2, 0, .5), (COPING_R - 5.6, 1.8, .2))
    for s in (-1, 1):
        for k in range(16):                                                     # posts all the way to the coping: no loose rail end
            x = 6.0 + k * 2.5
            pipe(a["rail"], [T @ Vector((x, s * .85, .6)), T @ Vector((x, s * .85, 1.6))], .03, .03, 6)
        pipe(a["rail"], [T @ Vector((5.8, s * .85, 1.6)), T @ Vector((COPING_R, s * .85, 1.6))], .035, .035, 6)
        tbox(a["coping"], T, ((5.6 + COPING_R) / 2, s * .85, .7), (COPING_R - 5.6, .06, .25))
    for d in OUTLETS:                                                           # warm water outlets in the pool wall
        T = Matrix.Rotation(math.radians(d), 4, "Z")
        tbox(a["dark"], T, (POOL_R - .02, 0, -.32), (.06, 1.6, .22))
        tbox(a["frame"], T, (POOL_R - .05, 0, -.32), (.06, 1.9, .34))
    return a


def water():
    a = Accs()
    ring(a["water"], 5.55, POOL_R + .01, WATER_Z - .04, WATER_Z, 144)
    return a


def ripples(rng):
    a = Accs()
    feet = [pol(FOOT_R, fb) for fb, _cb in COLUMNS] + [Vector((0, 0, 0))]
    for c in feet:
        r0 = 4.9 if c.length > 1 else 5.65                                     # round the base plinths and the centre island
        for k, w in enumerate((.10, .08, .06)):
            r = r0 + .5 + k * .9
            ring(a["ripple"], r, r + w, WATER_Z + .005, WATER_Z + .012, 64, c.x, c.y)
    for d in OUTLETS:                                                           # spreading arcs at each outlet
        o = pol(POOL_R, d)
        for k in range(5):
            r = 1.2 + k * 1.05
            sector_c(a["ripple"], o, r, r + .09 - k * .01, d + 180 - 70, d + 180 + 70, WATER_Z + .005, WATER_Z + .012)
    return a


def sector_c(acc, c, r0, r1, a0, a1, z0, z1, step=5.0):
    n = max(1, int((a1 - a0) / step))
    secs = []
    for i in range(n + 1):
        t = math.radians(a0 + (a1 - a0) * i / n)
        ct, st = math.cos(t), math.sin(t)
        secs.append([(c.x + r0 * ct, c.y + r0 * st, z0), (c.x + r1 * ct, c.y + r1 * st, z0), (c.x + r1 * ct, c.y + r1 * st, z1), (c.x + r0 * ct, c.y + r0 * st, z1)])
    loft(acc, secs)


def mist(rng):
    a = Accs()
    for d in OUTLETS:
        for k in range(5):
            c = pol(POOL_R - 1.0 - k * .9 + rng.uniform(-.3, .3), d + rng.uniform(-6, 6), .25 + k * .12)
            r = rng.uniform(1.0, 1.8)
            M.ell(a["mist"], tuple(c), (r, 0, 0), (0, r * rng.uniform(.6, 1), 0), (0, 0, r * .28), 14, 6)
    return a


# --- PLAZA -------------------------------------------------------------------------------------------------------------------
PATHS = (-90, -45, -135, 0, 180, 90)


def plaza(rng):
    a = Accs()
    ring(a["walkway"], COPING_R, WALK_R, -.3, .0, 144)
    ring(a["glowline"], WALK_R - .12, WALK_R - .02, .0, .015, 144)
    ring(a["paving"], WALK_R, PLAZA_R, -.3, -.005, 144)
    for r in (44.0, 52.0, 60.0):
        ring(a["paving_b"], r, r + .3, -.1, .0, 144)
    for i in range(36):
        d = i * 10 + 5
        obox(a["paving_b"], tuple(pol((WALK_R + PLAZA_R) / 2, d, -.004)), (PLAZA_R - WALK_R, .1, .01), math.radians(d))
    ring(a["coping_edge"], PLAZA_R - .4, PLAZA_R, -.3, .12, 144)
    beds = gaps(-180, 180, PATHS, 7.0)
    for a0, a1 in beds:                                                         # planted beds with seating edges
        sector(a["coping"], WALK_R + 11.0, WALK_R + 19.5, a0, a1, -.1, .45, 2)
        sector(a["grass"], WALK_R + 11.3, WALK_R + 19.2, a0 + .4, a1 - .4, .3, .5, 2)
    for a0, a1 in beds:                                                         # light lines on the plaza: direction only
        pts = [pol(WALK_R + 2.0 + 7.5 * math.sin(math.pi * k / 24), a0 + 3 + (a1 - a0 - 6) * k / 24, .02) for k in range(25)]
        for p, q in zip(pts, pts[1:]):
            m = (p + q) / 2
            obox(a["glowline"], (m.x, m.y, .012), ((q - p).length + .02, .12, .025), math.atan2(q.y - p.y, q.x - p.x))
    for d in range(0, 360, 30):                                                 # benches and cafe tables on the walkway rim
        if min(abs(math.remainder(d - p, 360)) for p in PATHS) < 9:
            continue
        M.kit_prop(K.ctx(a, rng, *pol(WALK_R + 1.6, d), math.radians(d) - math.pi / 2), "bench", 0, 0, 0)
    for d in (-70, -110, 66, 114, -20, -160):
        M.kit_prop(K.ctx(a, rng, *pol(WALK_R + 8.5, d), math.radians(d)), "cafe_set", 0, 0, 0)
    for i in range(24):                                                         # low lights along the walkway
        d = i * 15 + 7.5
        p = pol(WALK_R + .5, d)
        lathe(a["frame"], [(.08, 0), (.08, .9)], 10, p.x, p.y)
        lathe(a["glowline"], [(.09, .9), (.09, 1.05)], 10, p.x, p.y)
    T = Matrix.Rotation(math.radians(-90), 4, "Z")                               # the main entrance from the city side
    for s in (-1, 1):
        tbox(a["frame"], T, (PLAZA_R - 2, s * 4.2, 2.4), (.4, .4, 4.8))
    tbox(a["frame"], T, (PLAZA_R - 2, 0, 4.9), (1.4, 9.4, .25))
    tbox(a["glowline"], T, (PLAZA_R - 2, 0, 4.76), (1.0, 8.6, .04))
    return a


def tree_mesh(seed):
    a, rng = Accs(), random.Random(seed)
    h = (6.0, 7.2, 5.2)[seed % 3]
    cr = h * .40
    M.leafy_tree(K.ctx(a, rng), (0, 0, 0), h=h, crown=cr * .9, trunk="wood", roles=("leaf_l", "green"), core="green", n=40, size=.4, branches=5)
    for i in range(6):
        t, rr = i * 2.4 + rng.uniform(-.3, .3), (0 if i == 0 else cr * rng.uniform(.45, .62))
        c = (rr * math.cos(t), h * (.84 if i == 0 else rng.uniform(.62, .78)), rr * math.sin(t))
        q = cr * rng.uniform(.46, .60)
        G.blob(K.Three(a["in_green" if i % 2 else "in_leaf_l"]), c, (q, q * .8, q), sub=2, seed=seed * 7 + i, noise=.30, flat=.8)
        M.leaf_clump(K.ctx(a, rng), c, (q * 1.08, q * .9, q * 1.08), ("leaf_l", "green"), None, 46, .42, .3, 1)
    return K.build_mesh("q10a_tree_%d" % seed, a, 180)


def tree_spots(rng):
    out = []
    for a0, a1 in gaps(-180, 180, PATHS, 7.0):
        m = max(1, int((a1 - a0) / 5.5))
        for k in range(m):
            out.append(pol(WALK_R + 15.2 + rng.uniform(-1.5, 1.5), a0 + (a1 - a0) * (k + .5) / m + rng.uniform(-1.5, 1.5), .45))
    return out


# --- materials ---------------------------------------------------------------------------------------------------------------
def mat(name, hexc, rough=.6, metal=0.0, alpha=1.0, emit=None, strength=1.0, culling=True):
    m = G.material("q10a_" + name, srgb(hexc, alpha), rough, srgb(emit) if emit else None, strength)
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Metallic"].default_value = metal
    m.use_backface_culling = culling
    return m


def make_materials():
    K.MATS.clear()
    K.MATS.update({
        "frame": mat("frame_silver", "E6E9EA", .38, .55), "node": mat("node_white", "F3F4F2", .42, .2),
        "seam": mat("seam", "8E979B", .5, .4), "bracket": mat("core_bracket", "D9DFE2", .3, .7),
        "mullion": mat("shell_mullion", "DCE2E4", .3, .6), "rail": mat("rail_steel", "D8DCDD", .32, .6),
        "shell_glass": mat("shell_glass", "D6ECF8", .02, alpha=.21, culling=False),
        "tube_glass": mat("tube_glass", "BFE0EE", .05, alpha=.28, culling=False),
        "station_glass": mat("station_glass", "C6E2EA", .06, alpha=.22, culling=False),
        "core": mat("light_core", "F4F9FF", .3, emit="EAF4FF", strength=60.0),
        "halo": mat("core_halo", "E2F0FF", .5, alpha=.14, emit="D8ECFF", strength=6.0, culling=False),
        "halo_b": mat("core_halo_outer", "C9E4FF", .5, alpha=.05, emit="BFDFFF", strength=3.0, culling=False),
        "spark": mat("spark_white", "F2F8FF", .4, emit="EEF6FF", strength=14.0),
        "spark_b": mat("spark_blue", "CFE9FF", .4, emit="B8E2FF", strength=9.0),
        "power": mat("power_line", "D2F1FF", .3, emit="BDEBFF", strength=5.0),
        "glowline": mat("pale_light", "D7F2FB", .4, emit="C6EEFF", strength=2.0),
        "groove": mat("groove", "59636A", .7), "dark": mat("dark_panel", "3A4246", .5, .3),
        "station": mat("station_white", "EEF0EE", .45),
        "wood": mat("old_wood", "8E6A48", .72), "wood_dark": mat("old_wood_dark", "5F4632", .78),
        "fabric_old": mat("faded_cushion", "8E9A80", .92), "carrier": mat("carrier", "C4CBCE", .35, .6),
        "water": mat("warm_water", "56C1D8", .03, alpha=.5, culling=False),
        "ripple": mat("ripple", "FFFFFF", .1, alpha=.38, culling=False),
        "mist": mat("mist", "F5FAFC", 1.0, alpha=.09, culling=False),
        "pool_floor": mat("pool_floor", "9ED8E0", .6), "pool_tile": mat("pool_tile", "62B9CA", .5),
        "coping": mat("coping_stone", "EEEBE4", .55), "coping_edge": mat("coping_edge", "D6D1C7", .6),
        "walkway": mat("walkway", "E6E2DA", .8), "paving": mat("paving", "D9D4CA", .85), "paving_b": mat("paving_band", "C4BEB2", .85),
        "grass": mat("lawn", "7E9C4E", .9),
    })
    for role, (rgba, emit, strength) in M.ROLES.items():                         # library props and planting
        leafy = role in ("leaf_l", "green")
        m = G.material("q10a_in_" + role, rgba, .6, emit, strength)
        m.use_backface_culling = not leafy and rgba[3] >= 1
        K.MATS["in_" + role] = m
    return K.MATS


# --- preview staging -------------------------------------------------------------------------------------------------------
def preview(col, trees, rng):
    mk = lambda n, h, r=.8, **k: K.MATS.setdefault("pv_" + n, mat("pv_" + n, h, r, **k))  # noqa: E731
    mk("water", "4A86A8", .06)
    mk("land", "A9B58A", .95)
    mk("path", "D3CDC1", .9)
    mk("far", "BCCAD6", .9)
    mk("farw", "E1E7EB", .8)
    a = Accs()
    loft(a["pv_water"], [[(-5000, 92, z), (5000, 92, z), (5000, 7000, z), (-5000, 7000, z)] for z in (-2.5, -2)])
    loft(a["pv_land"], [[(-900, -700, z), (900, -700, z), (900, 90, z), (-900, 90, z)] for z in (-3, -.32)])
    loft(a["pv_path"], [[(-900, 84, z), (900, 84, z), (900, 93, z), (-900, 93, z)] for z in (-3, .0)])
    for d in (-90, 0, 180):
        obox(a["pv_path"], tuple(pol(PLAZA_R + 60, d, -.2)), (120, 8, .2), math.radians(d))
    for i in range(220):                                                       # far shore across the bay
        x = rng.uniform(-4200, 4200)
        y = rng.uniform(2300, 3000)
        h = rng.uniform(15, 70) * (2.4 if rng.random() < .1 else 1)
        w = rng.uniform(20, 50)
        K.box(a["pv_far"], x, x + w, y, y + w, -2, h)
    loft(a["pv_far"], [[(-6000, 2400, z), (6000, 2400, z), (6000, 3400, z), (-6000, 3400, z)] for z in (-2.2, 5)])
    bx, by = Vector((-2200.0, 1500.0)), Vector((-700.0, 2350.0))                 # a suspension bridge to the left
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
    while n < 340:                                                             # park trees round the plaza
        r, d = rng.uniform(80, 170), rng.uniform(0, 360)
        p = pol(r, d)
        if p.y > 78 or min(abs(math.remainder(d - q, 360)) for q in (-90, 0, 180)) * r * .0175 < 6:
            continue
        if abs(math.remainder(d + 90, 360)) < 22:                                # keep the main camera's line clear
            continue
        t = bpy.data.objects.new("PV_Tree_%03d" % n, trees[n % 3])
        t.location = (p.x, p.y, -.32)
        t.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        t.scale = (rng.uniform(1.1, 1.7),) * 3
        col.objects.link(t)
        n += 1


# --- layout checks (written into the report) ---------------------------------------------------------------------------------
def layout_checks():
    """Plan clearances of the column bases (island bridge corridor, feed tubes near the water) and the foot/pad levels."""
    out = {}
    for fb, cb in COLUMNS:
        foot = rrect(pol(FOOT_R, fb), pol(1, fb), pol(1, fb + 90), BASE_L / 2, BASE_W / 2, BASE_RAD, 0, 6)
        bridge = min(abs(x) for x, y, _z in foot) - BRIDGE_HALF if any(5.6 - 4 < y < COPING_R + 4 for _x, y, _z in foot) else None
        tube = min((Vector((x, y)) - p.xy).length - TUBE_R for d in TUBES for p in tube_path(d) if p.z < 8 for x, y, _z in foot)
        out["base_%03d" % fb] = {"bridge_clearance_m": None if bridge is None else round(bridge, 2),
                                 "base_to_bridge_axis_min_m": round(min(abs(x) for x, y, _z in foot), 2),
                                 "tube_clearance_low_m": round(tube, 2)}
    out["levels"] = {"water": WATER_Z, "base_top": BASE_TOP, "plate_top": FOOT_Z, "column_foot": round(col_rz(0)[1], 3)}
    out["pads"] = {"count": len(COLUMNS) * (2 * len(PAD_E) + 1), "elastomer_inner_face_below_glass_m": .04}
    return out


# --- assembly ----------------------------------------------------------------------------------------------------------------
def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    make_materials()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    rng = random.Random(2127)
    col = bpy.data.collections.new("Q10A_Asset")
    prev = bpy.data.collections.new("Q10A_Preview")
    scene.collection.children.link(col)
    scene.collection.children.link(prev)
    root = bpy.data.objects.new("Q10A_SolarFurnace", None)
    col.objects.link(root)
    groups = {}
    for g in ("STRUCTURE", "FURNACE", "FEED", "POWER", "POOL", "PLAZA"):
        e = bpy.data.objects.new(g, None)
        c = bpy.data.collections.new("Q10A_" + g)
        col.children.link(c)
        c.objects.link(e)
        e.parent = root
        groups[g] = (e, c)

    def add(name, accs, g, smooth_deg=30, mw=None, data=None):
        ob = bpy.data.objects.new(name, data or K.build_mesh("q10a_" + name.lower(), accs, smooth_deg))
        groups[g][1].objects.link(ob)
        ob.parent = groups[g][0]
        if mw is not None:
            ob.matrix_local = mw
        return ob

    add("STRUCTURE_COLUMNS", columns(), "STRUCTURE")
    add("STRUCTURE_CRADLE", cradle(), "STRUCTURE")
    add("STRUCTURE_BASES", bases(), "STRUCTURE")
    add("FURNACE_SHELL", shell(), "FURNACE", 60)
    add("FURNACE_MULLIONS", mullions(), "FURNACE")
    add("FURNACE_BRACKETS", brackets(), "FURNACE")
    add("FURNACE_CORE", core(), "FURNACE", 60)
    add("FURNACE_SPARKS", sparks(rng), "FURNACE", 0)
    shards = Accs()
    for d in TUBES:
        for k, v in stream(rng, d, 240 if d == HERO else 70, d == HERO).items():
            shards[k]._push(v.v, v.f)
    add("FURNACE_SHARDS", shards, "FURNACE", 0)
    for d in TUBES:
        tag = "%03d" % d
        add("FEED_TUBE_" + tag, tube_glass(d), "FEED", 60)
        add("FEED_FRAME_" + tag, tube_frame(d, rng), "FEED")
        add("FEED_STATION_GLASS_" + tag, station_glass(d), "FEED")
        add("FEED_CHAIRS_" + tag if d == HERO else "FEED_CARGO_" + tag, cargo(d, rng), "FEED")
    add("POWER_LINES", power(), "POWER")
    add("POOL_BASIN", pool(rng), "POOL")
    add("POOL_WATER", water(), "POOL", 60)
    add("POOL_RIPPLES", ripples(rng), "POOL")
    add("POOL_MIST", mist(rng), "POOL", 60)
    add("PLAZA_GROUND", plaza(rng), "PLAZA")
    trees = [tree_mesh(s) for s in range(3)]
    for i, q in enumerate(tree_spots(rng)):
        add("TREE_%02d" % (i + 1), None, "PLAZA", data=trees[i % 3],
            mw=Matrix.Translation(q) @ Matrix.Rotation(rng.uniform(0, 6.28), 4, "Z") @ Matrix.Scale(rng.uniform(1.2, 1.55), 4))
    preview(prev, trees, rng)

    bpy.context.view_layer.update()
    asset = [o for o in col.all_objects]
    by_group = {g: sum(K.tris(o.data) for o in groups[g][1].objects if o.type == "MESH") for g in groups}
    report = {"tris_by_group": by_group, "tris_total": sum(by_group.values()),
              "unique_mesh_tris": sum(K.tris(m) for m in {o.data for o in asset if o.type == "MESH"}),
              "objects": len(asset), "materials": len({m.name for o in asset if o.type == "MESH" for m in o.data.materials})}
    import review_solar_furnace as RV
    RV.stage(scene, prev)
    blend = os.path.join(HERE, ASSET + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
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
    report["layout"] = layout_checks()
    with open(os.path.join(HERE, "report-nocrown.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, indent=1)
    print("REPORT", json.dumps(report))


if __name__ == "__main__":
    main()
