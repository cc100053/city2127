"""Q02-B bay flower: space-solar receiver floating in Odaiba bay (owner PDF p.3, middle image; references/q02-b.jpg).

blender -b --factory-startup --python-exit-code 1 -P build_flower.py
Writes bay-flower-receiver.blend and .glb next to this file and prints the metrics as one JSON line.

Real metres, three.js coordinates in this file (y up; geo_helpers.B maps them to Blender). Origin: flower centre at the
design waterline y = 0. The shore station sits to -x/+z (SHORE). Exported hierarchy (stable names for the app):
  Q02B_Root
    Q02B_Receiver     petals, frame, dome, floating base, lights
    Q02B_SubseaLink   glass stem under the base and the sea-bed duct to the shore
    Q02B_ShoreStation arched glass landing pavilion where the duct comes ashore
    Q02B_LightBeam    the beam from orbit and its flare: hide or delete it on its own
"""
import json
import math
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import Acc, B, circle_pts, cyl, finish_mesh, material, newell, sweep  # noqa: E402

ID = "bay-flower-receiver"
SHORE = (-95.0, 56.0)       # shore station centre (x, z)
BEAM_TOP = 900.0            # beam height; the app may scale Q02B_LightBeam in y
S = 1.5                     # receiver scale; people by the pavilion in the image make the flower ≈ 120–130 m across
# petal rings: count, angular offset (fraction of a step), hinge radius, hinge height, length, start/end pitch (deg from
# horizontal), max width, cup depth (fraction of width); lengths in units of S
RINGS = tuple((n, o, r * S, y * S, L * S, a0, a1, W * S, c) for n, o, r, y, L, a0, a1, W, c in (
    (18, 0.0, 15.5, 4.6, 29.0, 20, 44, 14.0, .08),
    (16, .5, 13.0, 5.8, 23.0, 40, 66, 12.0, .09),
    (12, .25, 10.5, 7.0, 23.0, 56, 82, 10.0, .1),
))
DRUM_R, DECK_Y = 17.5 * S, 2.4 * S
DOME_R, DOME_Y = 8.0 * S, 15.0 * S


def add(a, b, s=1.0):
    return tuple(x + s * y for x, y in zip(a, b))


def norm(a):
    n = math.sqrt(sum(x * x for x in a)) or 1.0
    return tuple(x / n for x in a)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def surf(acc, verts, faces, wants):
    """Open surface: face i is wound to look along wants[i] (three coords). Only vertices the faces use are kept."""
    used = sorted({i for f in faces for i in f})
    remap = {old: new for new, old in enumerate(used)}
    vs = [B(verts[i]) for i in used]
    out = []
    for f, w in zip(faces, wants):
        f = tuple(remap[i] for i in f)
        n = newell([vs[i] for i in f])
        out.append(f if sum(a * b for a, b in zip(n, B(w))) >= 0 else tuple(reversed(f)))
    acc._push(vs, out)


def pipe(acc, pts, r, sides=6, caps=True):
    """Closed tube of radius r along a 3D polyline (parallel-transport frames)."""
    tans = []
    for i in range(len(pts)):
        a, b = pts[max(i - 1, 0)], pts[min(i + 1, len(pts) - 1)]
        tans.append(norm(tuple(y - x for x, y in zip(a, b))))
    ref = (0, 1, 0) if abs(tans[0][1]) < .9 else (1, 0, 0)
    u = norm(cross(tans[0], ref))
    verts, rings = [], []
    for p, t in zip(pts, tans):
        u = norm(add(u, t, -sum(x * y for x, y in zip(u, t))))
        v = cross(t, u)
        rings.append(list(range(len(verts), len(verts) + sides)))
        for k in range(sides):
            a = 2 * math.pi * (k + .5) / sides
            verts.append(add(add(p, u, r * math.cos(a)), v, r * math.sin(a)))
    faces = []
    for r0, r1 in zip(rings, rings[1:]):
        faces += [(r0[i], r0[(i + 1) % sides], r1[(i + 1) % sides], r1[i]) for i in range(sides)]
    if caps:
        faces += [tuple(reversed(rings[0])), tuple(rings[-1])]
    acc.solid(verts, faces)


def arc_path(pts, rad, n=6):
    """Polyline with each inner corner replaced by an n-step fillet of radius ~rad."""
    out = [pts[0]]
    for a, b, c in zip(pts, pts[1:], pts[2:]):
        d0, d1 = norm(tuple(y - x for x, y in zip(a, b))), norm(tuple(y - x for x, y in zip(b, c)))
        p0, p1 = add(b, d0, -rad), add(b, d1, rad)
        for i in range(n + 1):  # quadratic Bezier through the corner
            t = i / n
            out.append(tuple((1 - t) ** 2 * x + 2 * t * (1 - t) * y + t * t * z for x, y, z in zip(p0, b, p1)))
    out.append(pts[-1])
    return out


def petal(acc, skin, ring, theta, nu=10, nv=6):
    """One cupped, pointed petal: inner face into acc (panels), outer face and edges into skin (white shell).
    Returns (top(u, v), bottom(u, v)) samplers for frame and struts."""
    _, _, r0, y0, L, a0, a1, W, cup = ring
    R, Lt = (math.cos(theta), 0, math.sin(theta)), (-math.sin(theta), 0, math.cos(theta))
    spine, r, y = [], r0, y0
    for i in range(nu + 1):  # integrate the spine in the (radial, up) plane
        u = i / nu
        a = math.radians(a0 + (a1 - a0) * u ** 1.4)
        spine.append((r, y, a))
        r, y = r + L / nu * math.cos(a), y + L / nu * math.sin(a)

    def at(u, v, side):
        i = min(int(u * nu), nu - 1)
        f = u * nu - i
        (ra, ya, aa), (rb, yb, ab) = spine[i], spine[i + 1]
        rr, yy, aa = ra + (rb - ra) * f, ya + (yb - ya) * f, aa + (ab - aa) * f
        w = max(W * (math.sin(math.pi * min(u, 1) ** .7) ** .5 + .15 * (1 - u) ** 2), .12)  # almond: full to near the tip
        N = (-math.sin(aa) * R[0], math.cos(aa), -math.sin(aa) * R[2])
        p = (R[0] * rr + Lt[0] * v * w / 2, yy, R[2] * rr + Lt[2] * v * w / 2)
        p = add(p, N, cup * w * v * v)
        if side < 0:
            p = add(p, N, -(.42 * (1 - u) + .1))
        return p, N

    grid = lambda side: [at(i / nu, -1 + 2 * j / nv, side) for i in range(nu + 1) for j in range(nv + 1)]
    top, bot = grid(1), grid(-1)
    verts = [p for p, _ in top] + [p for p, _ in bot]
    nb = len(top)
    idx = lambda i, j: i * (nv + 1) + j
    tf, tw, faces, wants = [], [], [], []
    for i in range(nu):
        for j in range(nv):
            q = (idx(i, j), idx(i, j + 1), idx(i + 1, j + 1), idx(i + 1, j))
            n = top[idx(i, j)][1]
            tf.append(q)
            tw.append(n)
            faces.append(tuple(nb + k for k in q))
            wants.append(tuple(-x for x in n))
        for j, s in ((0, -1), (nv, 1)):  # side strips
            faces.append((idx(i, j), idx(i + 1, j), nb + idx(i + 1, j), nb + idx(i, j)))
            wants.append(tuple(s * x for x in Lt))
    for j in range(nv):  # hinge edge
        faces.append((idx(0, j), idx(0, j + 1), nb + idx(0, j + 1), nb + idx(0, j)))
        wants.append((-R[0], 0, -R[2]))
    surf(acc, verts, tf, tw)
    surf(skin, verts, faces, wants)
    return (lambda u, v: at(u, v, 1)[0]), (lambda u, v: at(u, v, -1)[0])


def build():
    A = {k: Acc() for roles in GROUPS.values() for k in roles}
    # ---- floating base: pontoon drum with a dark window band and a ring of cyan lights
    sweep(A["base"], lambda k: circle_pts(0, 0, DRUM_R, 72, k),
          [(5.0, -4.0), (1.2, -1.6), (0.0, -.6), (0.0, DECK_Y - .5), (.5, DECK_Y)])
    sweep(A["dark"], lambda k: circle_pts(0, 0, DRUM_R + .06, 72, k), [(0, .5), (0, 1.5)], caps=(False, False),
          want=lambda c: (c[0], 0, c[2]))
    for i in range(48):
        a = 2 * math.pi * i / 48
        x, z = (DRUM_R + .12) * math.cos(a), (DRUM_R + .12) * math.sin(a)
        cyl(A["glow"], x, z, .28, 2.0, 2.3, 6)
    # ---- dome on its collar, meridian ribs, receiver aperture
    cyl(A["base"], 0, 0, DOME_R + .6, DECK_Y - .2, DOME_Y, 48)
    sec = [(DOME_R * (1 - math.cos(math.radians(p))), DOME_Y + DOME_R * math.sin(math.radians(p))) for p in range(0, 86, 5)]
    sweep(A["dome"], lambda k: circle_pts(0, 0, DOME_R, 48, k), sec)
    for i in range(16):
        a = 2 * math.pi * i / 16
        pts = [((DOME_R + .1) * math.cos(math.radians(p)) * math.cos(a), DOME_Y + (DOME_R + .1) * math.sin(math.radians(p)),
                (DOME_R + .1) * math.cos(math.radians(p)) * math.sin(a)) for p in range(0, 81, 10)]
        pipe(A["frame"], pts, .12, 4)
    for p in (25, 50):
        rr, yy = (DOME_R + .1) * math.cos(math.radians(p)), DOME_Y + (DOME_R + .1) * math.sin(math.radians(p))
        pipe(A["frame"], [(rr * math.cos(a), yy, rr * math.sin(a)) for a in [2 * math.pi * k / 48 for k in range(49)]], .12, 4)
    top_y = DOME_Y + DOME_R * math.sin(math.radians(85))
    cyl(A["frame"], 0, 0, 1.9, top_y - .3, top_y + .5, 24)
    cyl(A["aperture"], 0, 0, 1.4, top_y + .5, top_y + .65, 24)
    # ---- petals with white rims and seams; hinges and struts
    under = []
    for ri, ring in enumerate(RINGS):
        n, off = ring[0], ring[1]
        row = []
        for k in range(n):
            th = 2 * math.pi * (k + off) / n
            topf, botf = petal(A["panel"], A["shell"], ring, th)
            for v in (-1, 1):
                pipe(A["frame"], [topf(u / 12, v * .98) for u in range(13)], .2, 5)
            for v in (-.5, 0, .5):
                pipe(A["frame"], [topf(u / 10, v) for u in range(1, 10)], .07, 3)
            for u in (.3, .55, .78):
                pipe(A["frame"], [topf(u, -1 + j / 4) for j in range(9)], .07, 3)
            h0 = topf(0, 0)
            hb = (h0[0] * .97, DECK_Y, h0[2] * .97)  # pedestal from the deck to the petal hinge
            pipe(A["shell"], [hb, botf(.02, 0)], .55, 8)
            row.append(botf(.42, 0))
            if ri < 2:  # props from the deck edge / ring beam to the petal's underside
                foot_r = DRUM_R - 1.0 if ri == 0 else DRUM_R - 6.0
                for dv in (-.12, .12):
                    f = (foot_r * math.cos(th + dv), DECK_Y, foot_r * math.sin(th + dv))
                    pipe(A["frame"], [f, botf(.45 if ri == 0 else .3, dv * 6)], .26, 5)
        under.append(row)
    for row in under[:2]:  # ring beams joining the strut heads
        pipe(A["frame"], row + row[:1], .3, 5)
    # ---- sub-sea link: glass stem with glowing rings, elbow, duct to the shore station
    sx, sz = SHORE
    d = norm((sx, 0, sz))
    cyl(A["core"], 0, 0, 2.0, -12.5, -3.5, 16)
    cyl(A["sleeve"], 0, 0, 3.8, -12.0, -3.8, 32)
    for yy in (-5.0, -8.0, -11.0):
        sweep(A["sub_glow"], lambda k: circle_pts(0, 0, 3.95, 32, k), [(0, yy - .25), (0, yy + .25)], caps=(False, False),
              want=lambda c: (c[0], 0, c[2]))
    path = arc_path([(0, -9.0, 0), (0, -13.5, 0), (sx - d[0] * 9, -13.5, sz - d[2] * 9), (sx - d[0] * 4, -.5, sz - d[2] * 4),
                     (sx - d[0] * 3.5, 1.4, sz - d[2] * 3.5)], 4.0)
    # the core pokes 0.3 m past both sleeve ends so the end caps are not coplanar
    ext = lambda p, q: add(p, norm(tuple(x - y for x, y in zip(p, q))), .3)
    pipe(A["core"], [ext(path[0], path[1])] + path[1:-1] + [ext(path[-1], path[-2])], 1.1, 10)
    pipe(A["sleeve"], path, 2.2, 16)
    seg = [(path[i], path[i + 1]) for i in range(len(path) - 1)]
    run = 0.0
    for a, b in seg:
        ln = math.dist(a, b)
        while run < ln:
            c = add(a, norm(tuple(y - x for x, y in zip(a, b))), run)
            e = add(c, norm(tuple(y - x for x, y in zip(a, b))), .7)
            pipe(A["sub_frame"], [c, e], 2.45, 16)
            run += 9.0
        run -= ln
    # ---- shore station: arched glass pavilion, long axis along the shore
    t = (d[2], 0, -d[0])  # along shore
    PL, PW, PH, PY = 18.0, 10.0, 6.2, 1.5
    loc = lambda a, b, h: (sx + t[0] * a + d[0] * b, h, sz + t[2] * a + d[2] * b)
    quad = [loc(-PL / 2 - 1, -PW / 2 - 1, 0), loc(PL / 2 + 1, -PW / 2 - 1, 0), loc(PL / 2 + 1, PW / 2 + 1, 0), loc(-PL / 2 - 1, PW / 2 + 1, 0)]
    up = [(p[0], PY, p[2]) for p in quad]
    A["pav_base"].solid(quad + up, [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
    arch = lambda a, s: loc(a, -PW / 2 * math.cos(math.pi * s), PY + .4 + PH * math.sin(math.pi * s))
    for i in range(7):
        a = -PL / 2 + PL * i / 6
        pipe(A["pav_frame"], [arch(a, s / 12) for s in range(13)], .22, 6)
    for s in (0, .2, .4, .5, .6, .8, 1):
        pipe(A["pav_frame"], [arch(-PL / 2, s), arch(PL / 2, s)], .12, 4)
    vs, fs, ws = [], [], []
    for i in range(13):
        for a in (-PL / 2, PL / 2):
            vs.append(arch(a, i / 12))
    for i in range(12):
        fs.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
        mid = arch(0, (i + .5) / 12)
        ws.append(norm((mid[0] - loc(0, 0, 0)[0], mid[1] - PY, mid[2] - loc(0, 0, 0)[2])))
    surf(A["pav_glass"], vs, fs, ws)
    for a in (-PL / 2, PL / 2):  # glazed gable ends
        ring_ = [arch(a, s / 12) for s in range(13)]
        surf(A["pav_glass"], ring_, [tuple(range(13))], [tuple(math.copysign(1, a) * x for x in t)])
    tl = loc(0, -PW / 2 + 3.5, 0)  # terminal where the duct surfaces
    cyl(A["pav_core"], tl[0], tl[2], 1.6, PY, PY + 2.6, 16)
    cyl(A["pav_glow"], tl[0], tl[2], 1.65, PY + 1.0, PY + 1.3, 16)
    # ---- the beam from orbit (own node)
    cyl(A["beam_core"], 0, 0, .45, top_y + .6, BEAM_TOP, 12)
    cyl(A["beam_glow"], 0, 0, 1.8, top_y + .9, BEAM_TOP - 1, 16)
    sec = [(1.8 * (1 - math.cos(math.radians(p))), top_y + 1.0 + 1.8 * math.sin(math.radians(p))) for p in range(-80, 81, 20)]
    sweep(A["beam_core"], lambda k: circle_pts(0, 0, 1.8, 16, k), sec)
    sec = [(4.5 * (1 - math.cos(math.radians(p))), top_y + 1.0 + 4.5 * math.sin(math.radians(p))) for p in range(-80, 81, 20)]
    sweep(A["beam_glow"], lambda k: circle_pts(0, 0, 4.5, 24, k), sec)
    return A


def mats():
    def m(name, rgba, rough, metal=0.0, emit=None, es=1.0):
        mt = material("q02b_" + name, rgba, rough, emit, es)
        bsdf = next(n for n in mt.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        bsdf.inputs["Metallic"].default_value = metal
        return mt
    return {
        "panel": m("petal_panel", (.80, .85, .90, 1), .12, .65),
        "shell": m("petal_shell", (.92, .93, .94, 1), .32),
        "frame": m("frame_white", (.90, .90, .88, 1), .42),
        "dome": m("dome_pearl", (.84, .88, .93, 1), .16, .55),
        "base": m("base_white", (.80, .81, .82, 1), .55),
        "dark": m("window_band", (.04, .06, .08, 1), .25),
        "glow": m("light_cyan", (.25, .7, 1, 1), .4, 0, (.3, .78, 1, 1), 6.0),
        "aperture": m("aperture", (.85, .95, 1, 1), .2, 0, (.7, .9, 1, 1), 3.0),
        "sleeve": m("subsea_glass", (.6, .88, .9, .55), .06),
        "core": m("core_metal", (.26, .30, .33, 1), .35, .7),
        "pav_glass": m("pavilion_glass", (.78, .9, .96, .35), .05),
        "pav_frame": m("pavilion_frame", (.92, .92, .9, 1), .4),
        "beam_core": m("beam_core", (.85, .95, 1, 1), .5, 0, (.75, .9, 1, 1), 40.0),
        "beam_glow": m("beam_glow", (.5, .78, 1, .1), .5, 0, (.45, .72, 1, 1), 2.0),
    }


GROUPS = {
    "Q02B_Receiver": ("panel", "shell", "frame", "dome", "base", "dark", "glow", "aperture"),
    "Q02B_SubseaLink": ("sleeve", "core", "sub_frame", "sub_glow"),
    "Q02B_ShoreStation": ("pav_glass", "pav_frame", "pav_base", "pav_core", "pav_glow"),
    "Q02B_LightBeam": ("beam_core", "beam_glow"),
}
SHARED = {"sub_frame": "frame", "sub_glow": "glow", "pav_base": "base", "pav_core": "core", "pav_glow": "glow"}


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    A, M = build(), mats()
    root = bpy.data.objects.new("Q02B_Root", None)
    bpy.context.scene.collection.objects.link(root)
    objs = []
    for gname, roles in GROUPS.items():
        g = bpy.data.objects.new(gname, None)
        bpy.context.scene.collection.objects.link(g)
        g.parent = root
        for role in roles:
            ob = finish_mesh(f"{gname}_{role}", A[role], M[SHARED.get(role, role)])
            bpy.context.scene.collection.objects.link(ob)
            ob.parent = g
            objs.append(ob)
    blend, glb = os.path.join(HERE, ID + ".blend"), os.path.join(HERE, ID + ".glb")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    for o in bpy.context.scene.objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_animations=False, export_cameras=False, export_lights=False, export_extras=False)
    tris = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs}
    print("@@JSON@@" + json.dumps({"tris_total": sum(tris.values()),
                                   "tris_beam": sum(v for k, v in tris.items() if k.startswith("Q02B_LightBeam")),
                                   "objects": len(objs), "glb_bytes": os.path.getsize(glb), "tris": tris}))


main()
