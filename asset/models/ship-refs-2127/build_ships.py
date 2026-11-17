"""ship-refs-2127: six 2127 harbour vessels modelled from the owner's reference images in references/*.png (draft, not placed).

blender -b --factory-startup --python-exit-code 1 -P build_ships.py -- [sail-yacht] [robo-fireboat] [cargo-ship]
    [rescue-patrol] [fireboat] [harbour-patrol]          (no names = all six)
Each ship writes, next to this file:
  <name>.blend  editable parts (hull, deckhouse, glass, rails, equipment ...) under the empty ROOT_<NAME>
  <name>.glb    glTF binary of the same parts (Y-up, modifiers applied)
  <name>.png    six-view preview sheet (front 3/4, left side, rear 3/4 / front, rear, right side), EEVEE studio
Only the vessel and the equipment on board: Rainbow Bridge, sea, wake and spray stay in the reference images.

Contract: real metres, design waterline at z = 0 (three.js y = 0; the hull below it is modelled, so a sea plane at y = 0
hides it), bow toward -Y in Blender (= +Z in three.js), centre line x = 0, +X is starboard. Material roles ship_*.
Reuses the primitives and the studio preview of vehicle-refs-2127/build_vehicles.py; positions are P(x, f, h):
f forward (+ = bow), h height above the waterline.
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "vehicle-refs-2127"))
import build_vehicles as V  # noqa: E402
from build_vehicles import P, cylinder, ellipsoid, join, lathe, loft, mat, paint, plan, rbox, torus, tube  # noqa: E402

UP = Vector((0, 0, 1))
DEG = math.radians

REFS = {  # owner's reference image for each ship (references/)
    "sail-yacht": "レインボーブリッジを望む未来の帆船.png",
    "robo-fireboat": "レインボーブリッジを望む赤白の未来消防艇.png",
    "cargo-ship": "未来型貨物船、レインボーブリッジ遠景.png",
    "rescue-patrol": "お台場の未来型救難パトロール艇.png",
    "fireboat": "お台場の未来型消防艇.png",
    "harbour-patrol": "お台場の未来型ハーバーパトロール艇.png",
}

# role -> (rgb, roughness, metallic[, alpha, emission, double-sided]); each ship overrides what differs
BASE = {
    "ship_hull": ((.78, .80, .82), .25, .8),
    "ship_hull2": ((.36, .38, .40), .35, .7),
    "ship_bottom": ((.09, .10, .11), .6, 0),
    "ship_deck": ((.30, .31, .32), .75, .1),
    "ship_white": ((.88, .89, .90), .35, 0),
    "ship_red": ((.60, .03, .03), .35, 0),
    "ship_trim": ((.07, .08, .09), .45, .2),
    "ship_metal": ((.72, .74, .76), .22, .9),
    "ship_glass": ((.03, .09, .11), .05, .4),
    "ship_safety": ((.92, .68, .04), .45, 0),
    "ship_orange": ((.95, .33, .05), .45, 0),
    "ship_rubber": ((.03, .03, .03), .8, 0),
    "ship_light": ((.15, .95, 1.0), .3, 0, 1, 6),
    "ship_lamp": ((1.0, .97, .90), .3, 0, 1, 8),
    "ship_blue": ((.10, .25, 1.0), .3, 0, 1, 12),
    "ship_amber": ((1.0, .55, .08), .3, 0, 1, 12),
}


def mats(**over):
    for role, a in {**BASE, **over}.items():
        mat(role, *a)


# ---------------------------------------------------------------- hull

def hull_ring(hw, fb, fs, shw, bl, nb=5, na=6, pw=2.0):
    """Waterplane at one height [(x, f)]: stem point at fb, bow entry over bl m (shape exponent pw), parallel body,
    then a taper to a transom of half width shw at fs. nb / na points per side in the entry / run."""
    side = [(hw * (1 - (1 - j / nb) ** pw), fb - bl * j / nb) for j in range(1, nb + 1)]
    span = fb - bl - fs
    for j in range(1, na + 1):
        a = j / na
        w = hw if a < .45 else hw + (shw - hw) * ((a - .45) / .55) ** 1.6
        side.append((w, fb - bl - span * a))
    return [(0.0, fb)] + [(-x, f) for x, f in side] + [(x, f) for x, f in reversed(side)]


def hull(name, rows, role="ship_hull", nb=5, na=6, pw=2.0, sub=1, sharp=None):
    """rows = [(h, half beam, stem f, transom f, transom half beam, entry length)] keel to deck. sub = 1 keeps one ring
    per row (faceted panels); sub > 1 smooths between rows."""
    hs = V.dense_heights(rows, sub) if sub > 1 else [r[0] for r in rows]
    return loft(name, [(h, hull_ring(*V.catmull(rows, h), nb, na, pw)) for h in hs], role, sharp=sharp)


def h_plane(h):
    return V.h_cut(h)


def fh_plane(a, b):
    """Cutting plane through the side-view line a -> b, a and b = (f, h)."""
    pa, pb = P(0, *a), P(0, *b)
    return pa, (pb - pa).cross(Vector((1, 0, 0))).normalized()


def above(f, h, a, b):
    """> 0 when (f, h) lies above the side-view line through a and b (a has the smaller f)."""
    return (b[0] - a[0]) * (h - a[1]) - (b[1] - a[1]) * (f - a[0])


def cut(ob, planes):
    """Split the mesh along planes so painted bands get straight edges."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    for co, no in planes:
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), dist=1e-4, plane_co=co, plane_no=no)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    return ob


def plane3(a, b, c, keep=(0., 0., 2.)):
    """Plane through three (x, f, h) points, its normal turned away from the point `keep`."""
    pa, pb, pc = P(*a), P(*b), P(*c)
    n = (pb - pa).cross(pc - pa).normalized()
    return pa, (-n if n.dot(P(*keep) - pa) > 0 else n)


def mirror3(a, b, c, keep=(0., 0., 2.)):
    """The plane3 of points given on the starboard side and its port mirror."""
    m = lambda p: (-p[0], p[1], p[2])  # noqa: E731
    return [plane3(a, b, c, keep), plane3(m(a), m(b), m(c), m(keep))]


def facet(ob, planes):
    """Slice off everything outside each plane and cap the cut: one flat facet per plane."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    for co, no in planes:
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), dist=1e-4, plane_co=co,
                               plane_no=no, clear_outer=True)
        bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    return ob


def bay_cutter(name, a, b, lo, hi, ct, cb, x_in, x_out, grow, slant=0.):
    """Through-hull bay opening along X: an octagonal side profile (f a .. b, h lo .. hi, top / bottom corner
    chamfers ct / cb, the fore edge leaning aft by `slant` at the bottom) that widens by `grow` from |x| = x_in to
    x_out, so the hull side gets a sloped frame round the opening."""
    def prof(g):
        a0, b0, bf, l0, h0, t, c = a - g, b + g, b - slant + g, lo - g, hi + g, ct + .4 * g, cb + .4 * g
        return [(a0 + c, l0), (bf - c, l0), (bf, l0 + c), (b0, h0 - t), (b0 - t, h0), (a0 + t, h0), (a0, h0 - t),
                (a0, l0 + c)]
    bm = bmesh.new()
    rings = [[bm.verts.new(P(x, f, h)) for f, h in prof(g)] for x, g in
             ((-x_out, grow), (-x_in, 0.), (x_in, 0.), (x_out, grow))]
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(len(r0)):
            j = (i + 1) % len(r0)
            bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    bm.faces.new(rings[0])
    bm.faces.new(rings[-1])
    return V.emit(name, bm, "ship_trim", None, keep=False)


def paint_hull(ob, top, boot, band=None, deck="ship_deck", bottom="ship_bottom"):
    """Deck on the up-facing top, antifouling below `boot`, band(f, h) -> role or None for the topsides."""
    def rule(x, f, h, n, cur):
        if cur != "ship_hull":
            return None
        if n.z > .7 and h > top - .05:
            return deck
        if h < boot:
            return bottom
        return band(f, h) if band else None
    paint(ob, rule)


def hit(target, f, h, side):
    """Point and normal where a ray from side +1 (+X) / -1 meets target at (f, h)."""
    ok, loc, nor, _ = target.ray_cast(P(side * 60, f, h), Vector((-side, 0, 0)))
    return (loc, nor) if ok else (None, None)


def face_rot(nor):
    """Rotation taking box X to the surface normal while its length (Y) stays level along the hull."""
    t = Vector((0, 0, 1)).cross(nor).normalized()
    if t.dot(Vector((0, 1, 0))) < 0:
        t = -t
    return Matrix((nor, t, nor.cross(t))).transposed().to_euler()


def panel(tag, target, f, h, length, height, role, side, depth=.05, off=.02):
    """Flat plate laid on target's side (window band, light strip, fender, grille)."""
    loc, nor = hit(target, f, h, side)
    if loc is None:
        return None
    rot = face_rot(nor)
    return rbox(tag, loc + nor * off, (depth, length, height), min(height, depth) * .3, role, segs=1, rot=rot)


def both(tag, target, f, h, length, height, role, **kw):
    return [panel(f"{tag}{s:+d}", target, f, h, length, height, role, s, **kw) for s in (-1, 1)]


# ---------------------------------------------------------------- deck blocks, rails

def house(name, f0, f1, hw, h0, h1, role, rake_f=0., rake_r=0., inset=0., rf=.6, rr=.4, n=3):
    """Faceted deck block over f0 (aft) .. f1 (fore), half width hw, h0 .. h1. The top steps back rake_f at the
    front, rake_r at the back and inset at the sides."""
    lo = plan(hw, f1, f0, rf, rr, n)
    hi = plan(hw - inset, f1 - rake_f, f0 + rake_r, max(rf - inset, .05), max(rr - inset, .05), n)
    return loft(name, [(h0, lo), (h1, hi)], role, sharp=None)


def deckhouse(tag, f0, f1, hw, h0, hb, hg, ht, rake=1.0, body="ship_hull", roof=None, glass="ship_glass", over=.35):
    """Bridge block: solid body h0..hb, wrap-around raked glazing hb..hg, roof hg..ht with a visor `over` m proud."""
    a = house(f"{tag}_body", f0, f1, hw, h0, hb, body, rf=.9, rr=.4)
    g = house(f"{tag}_glass", f0 + .1, f1 - .1, hw - .1, hb, hg, glass, rake_f=rake, inset=.25, rf=.8, rr=.35)
    r = house(f"{tag}_roof", f0, f1 - rake + over, hw - .3 + over * .5, hg, ht, roof or body, rake_f=.15, inset=.05,
              rf=.7, rr=.35)
    return a, g, r


def resample(pts, step):
    out, acc = [pts[0]], 0.
    for a, b in zip(pts, pts[1:]):
        seg = (b - a).length
        t = step - acc
        while t <= seg:
            out.append(a.lerp(b, t / seg))
            t += step
        acc = seg - (t - step)
    if (out[-1] - pts[-1]).length > step * .3:
        out.append(pts[-1])
    return out


def rail(tag, pts, ht=1.0, role="ship_metal", r=.03, step=1.8, mid=True):
    """Guard rail on the deck-level polyline pts: top tube at ht, a middle tube, posts every `step` m."""
    up = UP * ht
    parts = [tube(f"{tag}_top", [p + up for p in pts], r, role, res=1, keep=False)]
    if mid:
        parts.append(tube(f"{tag}_mid", [p + up * .5 for p in pts], r * .7, role, res=1, keep=False))
    for k, p in enumerate(resample(pts, step)):
        parts.append(tube(f"{tag}_post{k}", [p, p + up], r * .9, role, res=1, keep=False))
    return join(tag, parts, 60)


def deck_rail(tag, rows, f0, f1, inset=.3, ht=1.0, role="ship_metal", step=1.8):
    """Rails along the sheer between f0 and f1, joined round the stem when the range reaches it."""
    hgt, hw, fb, fs, shw, bl = rows[-1]
    ring = hull_ring(hw - inset, fb - inset * 1.6, fs + inset, shw - inset, bl, 10, 14)
    tip, n = ring[0], (len(ring) - 1) // 2
    left = [p for p in ring[1:1 + n] if f0 <= p[1] <= f1]
    right = [p for p in ring[1 + n:] if f0 <= p[1] <= f1]
    lines = [left[::-1] + [tip] + right[::-1]] if tip[1] <= f1 else [left, right]
    return [rail(f"{tag}{i}", [P(x, f, hgt) for x, f in ln], ht, role, step=step) for i, ln in enumerate(lines) if len(ln) > 1]


def loop_rail(tag, hw, f0, f1, h, ht=1.0, role="ship_metal", keep=lambda x, f: True):
    """Rail round a deck-block roof (plan outline inset 0.15 m), keeping the outline points keep(x, f) accepts."""
    pts = [P(x, f, h) for x, f in plan(hw - .15, f1 - .15, f0 + .15, .5, .3, 3) if keep(x, f)]
    return rail(tag, pts + [pts[0]], ht, role)


# ---------------------------------------------------------------- equipment

def beam(name, a, b, w, t, role, bevel=.04, keep=True):
    d = b - a
    rot = Vector((0, 1, 0)).rotation_difference(d.normalized()).to_euler()
    return rbox(name, (a + b) / 2, (w, d.length, t), bevel, role, segs=1, rot=rot, keep=keep)


def dirv(yaw, pitch):
    """Unit vector: yaw 0 = toward the bow, + toward starboard (+X); pitch up from the deck."""
    return P(math.sin(yaw) * math.cos(pitch), math.cos(yaw) * math.cos(pitch), math.sin(pitch))


def monitor(tag, c, yaw=0., pitch=DEG(14), s=1.0, body="ship_red", robotic=False):
    """Fire monitor (water cannon) standing on the deck point c. robotic: hexagonal plinth and a jointed arm."""
    parts = []
    side = dirv(yaw + math.pi / 2, 0)
    if robotic:
        parts.append(cylinder(f"{tag}_plinth", c + UP * .35 * s, 1.05 * s, .7 * s, UP, body, 6, keep=False, r2=.85 * s))
        parts.append(cylinder(f"{tag}_plinth_light", c + UP * .62 * s, .88 * s, .06 * s, UP, "ship_light", 6, keep=False))
        sh = c + UP * 1.0 * s
        parts.append(cylinder(f"{tag}_turret", sh, .55 * s, .6 * s, UP, "ship_trim", 24, keep=False))
        el = sh + UP * 1.0 * s - dirv(yaw, 0) * .45 * s
        parts.append(beam(f"{tag}_arm", sh, el, .42 * s, .55 * s, body, keep=False))
        parts.append(cylinder(f"{tag}_elbow", el, .42 * s, .7 * s, side, "ship_metal", 24, keep=False))
        parts.append(torus(f"{tag}_elbow_ring", el, .44 * s, .05 * s, side, "ship_light", 24, 6))
        start = el
    else:
        parts.append(cylinder(f"{tag}_base", c + UP * .45 * s, .55 * s, .9 * s, UP, body, 24, keep=False, r2=.38 * s))
        parts.append(cylinder(f"{tag}_flange", c + UP * .92 * s, .48 * s, .08 * s, UP, "ship_metal", 24, keep=False))
        start = c + UP * 1.25 * s
        parts.append(ellipsoid(f"{tag}_head", start, (.33 * s,) * 3, body, 16, 10, keep=False))
        parts.append(cylinder(f"{tag}_trunnion", start, .14 * s, .9 * s, side, "ship_metal", 16, keep=False))
    d = dirv(yaw, pitch)
    L = 2.2 * s
    parts.append(cylinder(f"{tag}_barrel", start + d * L / 2, .21 * s, L, d, body, 20, keep=False, r2=.15 * s))
    parts.append(cylinder(f"{tag}_nozzle", start + d * (L + .3 * s), .16 * s, .6 * s, d, "ship_metal", 20, keep=False,
                          r2=.22 * s))
    parts.append(torus(f"{tag}_band", start + d * (L - .2 * s), .2 * s, .04 * s, d, "ship_light", 20, 6))
    return join(tag, parts, 40)


def hose_reel(tag, c, r, w, axis, role="ship_red"):
    """Hose drum about `axis` (Blender vector) centred at c, metal flanges, three visible coils."""
    a = Vector(axis).normalized()
    parts = [cylinder(f"{tag}_drum", c, r * .82, w, a, role, 24, keep=False)]
    for k, t in enumerate((-.5, .5)):
        parts.append(cylinder(f"{tag}_flange{k}", c + a * t * w, r, .06, a, "ship_metal", 24, keep=False))
    for k in range(4):
        parts.append(torus(f"{tag}_coil{k}", c + a * (-.36 + .24 * k) * w, r * .84, .07 * r, a, role, 24, 6))
    return join(tag, parts, 40)


def life_ring(tag, c, side):
    """Orange ring with four white bands, hanging flat on a +X / -X facing wall."""
    parts = [torus(f"{tag}_ring", c, .30, .075, (side, 0, 0), "ship_orange", 32, 8)]
    for k in range(4):
        a = DEG(45 + 90 * k)
        parts.append(rbox(f"{tag}_band{k}", c + Vector((0, .30 * math.cos(a), .30 * math.sin(a))), (.17, .06, .17), .02,
                          "ship_white", rot=(a, 0, 0), keep=False))
    return join(tag, parts, 50)


def mast(tag, base, height, role="ship_white", accent="ship_trim", yard=3.0, domes=True, radar=True):
    """Tapered mast: yard with two sensor domes and whip antennas, radar bar, top dome and a cyan ring lamp."""
    parts = [cylinder(f"{tag}_post", base + UP * height / 2, .38, height, UP, role, 8, keep=False, r2=.2)]
    y1 = base + UP * height * .6
    parts.append(rbox(f"{tag}_yard", y1, (yard, .3, .18), .04, accent, segs=1, keep=False))
    parts.append(cylinder(f"{tag}_platform", y1 - UP * .3, .9, .1, UP, accent, 12, keep=False))
    for s in (-1, 1):
        if domes:
            parts.append(cylinder(f"{tag}_dome_post{s:+d}", y1 + Vector((s * yard * .38, 0, .2)), .12, .3, UP, accent, 12,
                                  keep=False))
            parts.append(ellipsoid(f"{tag}_dome{s:+d}", y1 + Vector((s * yard * .38, 0, .55)), (.3, .3, .28), "ship_white",
                                   20, 10, keep=False))
        tip = y1 + Vector((s * yard * .5, 0, 0))
        parts.append(tube(f"{tag}_whip{s:+d}", [tip, tip + UP * 2.4], .025, accent, res=1, keep=False))
    if radar:
        r = base + UP * height * .82
        parts.append(cylinder(f"{tag}_radar_post", r, .16, .35, UP, accent, 12, keep=False))
        parts.append(rbox(f"{tag}_radar", r + UP * .28, (2.6, .22, .2), .06, "ship_white", segs=2, keep=False))
    top = base + UP * height
    parts.append(cylinder(f"{tag}_lamp", top - UP * .2, .24, .14, UP, "ship_light", 12, keep=False))
    parts.append(ellipsoid(f"{tag}_top_dome", top + UP * .25, (.34, .34, .32), "ship_white", 20, 10, keep=False))
    return join(tag, parts, 40)


def bollard(tag, c):
    parts = [cylinder(f"{tag}_post{k}", c + Vector((0, k * .5, .25)), .14, .5, UP, "ship_trim", 12, keep=False)
             for k in (-1, 1)]
    parts.append(rbox(f"{tag}_plate", c + UP * .04, (.4, 1.3, .08), .02, "ship_trim", keep=False))
    return join(tag, parts, 40)


def deck_ring(tag, c, r):
    """Flat yellow landing / working-area ring painted on the deck."""
    return lathe(tag, [(r - .25, 0), (r, 0), (r, .02), (r - .25, .02)], c, (0, 0, 1), "ship_safety", 48, closed=True)


# ---------------------------------------------------------------- ships

def sail_yacht():
    """Silver faceted sloop: glazed deck saloon under a long hardtop, teak decks, wing mast with battened main and
    jib, lounge furniture. 33 x 7.1 m hull, mast 36 m above the waterline."""
    mats(ship_deck=((.55, .36, .20), .6, 0), ship_glass=((.30, .40, .42), .04, .2, .3, 0, True),
         ship_sail=((.93, .93, .91), .7, 0, 1, 0, True), ship_fabric=((.86, .83, .77), .85, 0),
         ship_wood=((.42, .27, .15), .5, 0), ship_leaf=((.16, .38, .14), .7, 0))
    rows = [(-1.4, .5, 12.6, -13.4, .3, 9.), (-.7, 2.3, 14.8, -15.5, 1.7, 10.), (0., 3.15, 15.6, -15.9, 2.6, 11.),
            (.9, 3.5, 16.0, -16.0, 3.0, 11.), (2.0, 3.55, 16.4, -16.0, 3.1, 11.5)]
    body = hull("yacht_hull", rows, nb=4, na=6, pw=1.7)
    cut(body, [h_plane(.25)])
    paint_hull(body, 2.0, .25)
    rbox("yacht_keel", P(0, -1.0, -2.6), (.32, 3.0, 2.6), .1, "ship_bottom")
    ellipsoid("yacht_keel_bulb", P(0, -1.4, -3.9), (.45, 2.2, .4), "ship_bottom", 24, 12)
    rbox("yacht_rudder", P(0, -12.6, -1.3), (.18, 1.2, 1.6), .06, "ship_bottom")
    for s in (-1, 1):
        panel(f"yacht_hull_window_fwd{s:+d}", body, 6.5, .95, 6.0, .42, "ship_trim", s)
        panel(f"yacht_hull_window_aft{s:+d}", body, -5.0, .95, 4.5, .42, "ship_trim", s)
        panel(f"yacht_strip_bow{s:+d}", body, 13.0, 1.35, 2.0, .1, "ship_light", s)
        panel(f"yacht_strip_aft{s:+d}", body, -11.0, .45, 2.5, .1, "ship_light", s)
        panel(f"yacht_strip_mid{s:+d}", body, 2.5, .62, 1.2, .08, "ship_light", s)
        panel(f"yacht_vent{s:+d}", body, 11.0, .35, 1.5, .3, "ship_trim", s)

    # saloon, hardtop, cockpit and saloon lounge
    house("yacht_saloon_base", -8.0, 4.5, 2.7, 2.0, 2.45, "ship_hull")
    house("yacht_saloon_glass", -7.8, 4.3, 2.6, 2.45, 4.35, "ship_glass", rake_f=1.6, inset=.12)
    house("yacht_hardtop", -12.2, 4.6, 2.95, 4.35, 4.6, "ship_hull", rake_f=.8, inset=.1, rf=1.5, rr=.6)
    rbox("yacht_skylight", P(0, -3.0, 4.61), (3.0, 7.0, .02), 0, "ship_trim")
    for s in (-1, 1):
        rbox(f"yacht_hardtop_strip{s:+d}", P(s * 2.93, -3.5, 4.47), (.03, 7.0, .06), 0, "ship_light")
        tube(f"yacht_pillar{s:+d}", [P(s * 2.55, -11.9, 2.0), P(s * 2.72, -11.6, 3.2), P(s * 2.78, -11.2, 4.36)], .09,
             "ship_hull")
        rbox(f"yacht_cockpit_sofa_side{s:+d}", P(s * 1.95, -9.8, 2.25), (.9, 2.6, .5), .12, "ship_fabric")
        rbox(f"yacht_cockpit_cushion{s:+d}", P(s * 2.35, -9.8, 2.75), (.22, 2.4, .5), .08, "ship_fabric")
    rbox("yacht_cockpit_sofa", P(0, -11.3, 2.25), (4.6, .9, .5), .12, "ship_fabric")
    rbox("yacht_cockpit_back", P(0, -11.75, 2.72), (4.6, .25, .5), .08, "ship_fabric")
    rbox("yacht_cockpit_table", P(0, -9.6, 2.42), (1.9, 1.2, .08), .03, "ship_wood")
    cylinder("yacht_cockpit_table_leg", P(0, -9.6, 2.2), .12, .4, UP, "ship_metal", 12)
    rbox("yacht_saloon_sofa", P(-1.7, -4.2, 2.3), (1.0, 3.6, .5), .12, "ship_fabric")
    rbox("yacht_saloon_sofa_back", P(-2.15, -4.2, 2.75), (.25, 3.6, .5), .08, "ship_fabric")
    rbox("yacht_saloon_table", P(.6, -3.0, 2.78), (1.2, 2.4, .07), .03, "ship_wood")
    cylinder("yacht_saloon_table_leg", P(.6, -3.0, 2.4), .14, .72, UP, "ship_metal", 12)
    for f in (-3.8, -2.2):
        rbox(f"yacht_chair{f:+.1f}", P(1.55, f, 2.45), (.55, .55, .45), .1, "ship_fabric")
    cylinder("yacht_plant_pot", P(-2.0, -7.0, 2.33), .28, .65, UP, "ship_white", 16)
    ellipsoid("yacht_plant", P(-2.0, -7.0, 3.15), (.5, .5, .75), "ship_leaf", 12, 8)
    rbox("yacht_helm", P(0, 3.0, 2.9), (2.2, .6, .9), .1, "ship_trim")

    # wing mast, boom, sails, rigging
    MF = 5.3
    mast_rings = [(2.0, plan(.26, MF + .65, MF - .65, .26, .26, 4)), (20.0, plan(.22, MF + .5, MF - .5, .22, .22, 4)),
                  (36.0, plan(.12, MF + .25, MF - .25, .12, .12, 4))]
    loft("yacht_mast", mast_rings, "ship_metal", sharp=40)
    house("yacht_mast_foot", 4.55, 6.25, .75, 2.0, 2.7, "ship_hull", inset=.3, rake_f=.3, rake_r=.3)
    for k, h in enumerate((8, 14, 20, 26, 31)):
        rbox(f"yacht_mast_slit{k}", P(0, MF + .62 - h * .011, h), (.08, .05, 2.2), .01, "ship_light")
    for h in (16.0, 26.0):
        tube(f"yacht_spreader{h:.0f}", [P(-2.2 + h * .03, MF - .1, h), P(2.2 - h * .03, MF - .1, h)], .05, "ship_metal")
    cylinder("yacht_masthead", P(0, MF, 36.15), .15, .3, UP, "ship_trim", 12)
    cylinder("yacht_masthead_lamp", P(0, MF, 36.4), .12, .2, UP, "ship_light", 12)
    tube("yacht_boom", [P(0, MF - .45, 5.3), P(0, -9.9, 5.15)], .14, "ship_metal")

    def sail(name, tack, head, clew, camber, nu=10, nv=16, battens=()):
        bm = bmesh.new()
        grid = []
        for j in range(nv + 1):
            v = j / nv * .985
            grid.append([bm.verts.new(tack + (clew - tack) * (i / nu) * (1 - v) + (head - tack) * v +
                                      Vector((camber * 4 * (i / nu) * (1 - i / nu) * (1 - .6 * v), 0, 0)))
                         for i in range(nu + 1)])
        for a, b in zip(grid, grid[1:]):
            for i in range(nu):
                bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
        ob = V.emit(name, bm, "ship_sail", 60)
        for k, v in enumerate(battens):
            pts = [tack + (clew - tack) * (i / nu) * (1 - v) + (head - tack) * v +
                   Vector((camber * 4 * (i / nu) * (1 - i / nu) * (1 - .6 * v) + .03, 0, 0)) for i in range(nu + 1)]
            tube(f"{name}_batten{k}", pts, .04, "ship_metal", res=1)
        return ob

    sail("yacht_mainsail", P(0, MF - .6, 5.5), P(0, MF - .3, 35.2), P(0, -9.6, 5.4), .9,
         battens=(.12, .27, .42, .57, .72, .86))
    sail("yacht_jib", P(0, 15.5, 2.6), P(0, MF + .45, 32.0), P(.6, MF + 1.2, 3.1), .7, battens=(.2, .4, .6, .8))
    tube("yacht_forestay", [P(0, 16.1, 2.1), P(0, MF + .3, 32.6)], .025, "ship_metal", res=1)
    for s in (-1, 1):
        tube(f"yacht_backstay{s:+d}", [P(0, MF - .2, 35.6), P(s * 2.9, -15.7, 2.05)], .02, "ship_metal", res=1)
        tube(f"yacht_shroud{s:+d}", [P(0, MF, 26.0), P(s * 2.1, MF - .1, 16.0), P(s * 3.25, MF - .6, 2.05)], .02,
             "ship_metal", res=1)
    deck_rail("yacht_rail", rows, -15.5, 20, inset=.25, ht=.75, step=1.6)
    tube("yacht_bowsprit", [P(0, 16.1, 2.1), P(0, 17.3, 2.4)], .07, "ship_metal")
    rbox("yacht_swim_platform", P(0, -16.6, .55), (6.0, 1.2, .18), .05, "ship_deck")
    rbox("yacht_foredeck_hatch", P(0, 11.0, 2.03), (1.4, 1.4, .06), .03, "ship_trim")


def robo_fireboat():
    """Red-and-white faceted fireboat with three robotic monitors (bow, bridge roof, stern), hose-reel bays, a sensor
    tower and yellow deck rails. 35 x 9.2 m."""
    mats(ship_hull=((.62, .03, .03), .3, .1), ship_deck=((.26, .27, .28), .7, .3), ship_bottom=((.06, .06, .07), .6, 0))
    rows = [(-1.9, 1.0, 12.8, -15.2, .8, 9.), (-1.0, 3.5, 15.2, -16.6, 3.0, 10.), (0., 4.25, 16.3, -17.0, 3.9, 10.),
            (1.4, 4.6, 17.1, -17.0, 4.25, 10.), (3.0, 4.45, 17.8, -16.8, 4.1, 10.)]
    body = hull("robo_hull", rows, nb=4, na=6, pw=1.6)
    L1, L2 = ((1.8, .55), (8.3, 3.0)), ((4.0, .55), (10.5, 3.0))
    cut(body, [h_plane(-.3), h_plane(.55), h_plane(1.45), fh_plane(*L1), fh_plane(*L2), V.f_cut(-14.5), V.f_cut(-12.5)])

    def band(f, h):
        diag = h > .55 and above(f, h, *L1) <= 0 and above(f, h, *L2) >= 0
        low = .55 < h < 1.45 and f < 3.0
        stern = h > 1.45 and -14.5 < f < -12.5
        return "ship_white" if diag or low or stern else None

    paint_hull(body, 3.0, -.3, band)
    for s in (-1, 1):
        panel(f"robo_strip_bow{s:+d}", body, 12.5, 1.9, 2.2, .12, "ship_light", s)
        panel(f"robo_strip_mid{s:+d}", body, 5.5, 2.5, 1.6, .12, "ship_light", s)
        panel(f"robo_strip_aft{s:+d}", body, -11.0, .9, 2.0, .12, "ship_light", s)
        panel(f"robo_grille{s:+d}", body, 1.0, .3, 3.2, .45, "ship_trim", s)
        panel(f"robo_grille_light{s:+d}", body, 1.0, .58, 2.0, .06, "ship_light", s)

    # deckhouse, hose bays, bridge, sensor tower
    h1 = house("robo_house", -10.0, 7.0, 3.7, 3.0, 5.8, "ship_white", rake_f=1.2, inset=.2, rf=1.2, rr=.6)
    cut(h1, [h_plane(3.9)])
    paint(h1, lambda x, f, h, n, cur: "ship_red" if h < 3.9 and n.z < .5 else None)
    deckhouse("robo_bridge", -5.0, 5.2, 3.3, 5.8, 6.5, 7.9, 8.3, rake=1.0, body="ship_white", roof="ship_red")
    house("robo_tower", -3.5, .8, 1.8, 8.3, 9.6, "ship_trim", rake_f=.4, inset=.2)
    mast("robo_mast", P(0, -1.3, 9.6), 6.5, "ship_red", "ship_trim")
    for s in (-1, 1):
        for k, (f, ln) in enumerate(((-2.1, 4.6), (-7.6, 3.0))):
            rbox(f"robo_bay{s:+d}{k}", P(s * 3.62, f, 4.4), (.12, ln, 2.0), .05, "ship_trim")
        for f in (-3.2, -1.0):
            hose_reel(f"robo_reel{s:+d}{f:+.0f}", P(s * 3.88, f, 4.35), .8, 1.6, (0, 1, 0))
        rbox(f"robo_door{s:+d}", P(s * 3.55, 4.4, 4.5), (.1, 1.0, 2.0), .05, "ship_red")
        rbox(f"robo_house_strip{s:+d}", P(s * 3.6, 1.4, 5.1), (.05, 2.0, .1), 0, "ship_light")
        ladder = [P(s * 3.85, -8.8, 3.0), P(s * 3.85, -8.8, 5.8)]
        tube(f"robo_ladder_a{s:+d}", ladder, .04, "ship_safety", res=1)
        tube(f"robo_ladder_b{s:+d}", [p + P(0, -.6, 0) for p in ladder], .04, "ship_safety", res=1)
        for k in range(8):
            tube(f"robo_rung{s:+d}{k}", [P(s * 3.85, -8.8, 3.3 + .32 * k), P(s * 3.85, -9.4, 3.3 + .32 * k)], .025,
                 "ship_safety", res=1)
    monitor("robo_monitor_bow", P(0, 11.3, 3.0), 0, DEG(16), 1.0, robotic=True)
    monitor("robo_monitor_top", P(0, 3.0, 8.3), 0, DEG(10), .85, robotic=True)
    monitor("robo_monitor_aft", P(0, -13.2, 3.0), 0, DEG(20), .95, robotic=True)
    deck_ring("robo_deck_ring", P(0, 11.3, 3.0), 2.2)
    deck_ring("robo_deck_ring_aft", P(0, -13.2, 3.0), 2.0)
    deck_rail("robo_rail", rows, -16.5, 20, ht=1.0, role="ship_safety")
    loop_rail("robo_house_rail", 3.7 - .2, -10.0 + .3, 7.0 - 1.2, 5.8, role="ship_safety", keep=lambda x, f: f < -4.5)
    loop_rail("robo_bridge_rail", 3.3 - .3, -5.0, 5.2 - .7, 8.3, .9, "ship_safety", keep=lambda x, f: f < -1.0)
    for f, x in ((14.2, 1.6), (-15.6, 2.8)):
        for s in (-1, 1):
            bollard(f"robo_bollard{f:+.0f}{s:+d}", P(s * x, f, 3.0))


def cargo_ship():
    """Grey faceted coaster: bow block carrying the bridge and mast, four open side bays with cargo pods under a
    continuous hatch deck, articulated crane with a spreader gripper on a raised stern block. 76 x 12.9 m, deck 6.4 m:
    long and low. Round 2: the bow is carved from a full block by a few large planes (an inward-leaning upper facet,
    a lower facet raking back to the waterline, a flat stem face); their knuckle runs from the stem down aft into the
    first bay frame, and a sloped dark band under the bays carries the fold on to the stern. The bridge is cut by the
    same upper planes, so its walls and wrap-around window band continue the bow. Bays have sloped frames, the crane
    stands on a stern block cut by matching quarter facets."""
    mats(ship_hull=((.62, .64, .66), .3, .75), ship_hull2=((.20, .21, .23), .4, .6), ship_deck=((.40, .41, .42), .6, .4),
         ship_cargo=((.66, .68, .70), .35, .6), ship_glass=((.02, .05, .06), .6, 0))
    D, B0, B1 = 6.4, 2.3, 5.7  # deck, bay floor, bay ceiling (deck slab above)
    # full block before faceting: the planes below shape the bow, the rows only have to reach past them
    rows = [(-3.0, 1.6, 26.0, -33.0, 3.0, 13.), (-1.8, 5.0, 30.0, -35.2, 4.8, 14.), (0., 5.9, 32.5, -35.8, 5.6, 14.),
            (2.0, 6.35, 35.5, -36.6, 5.9, 14.), (4.2, 6.5, 38.2, -37.7, 6.1, 13.), (D, 6.4, 38.6, -38.0, 6.0, 12.)]
    body = hull("cargo_hull", rows, nb=4, na=8, pw=1.6)
    K1, K2 = (1.6, 37.6, 4.2), (6.7, 14.0, 3.6)  # bow knuckle: stem to the first bay frame
    UPPER = mirror3((.5, 38.4, D), K1, K2)  # leans inboard toward the deck; the bridge walls lie in it too
    LOWER = mirror3(K1, K2, (.25, 32.0, -.6))  # rakes back and in to the waterline stem
    STEM = [plane3((-1., 38.0, D), (1., 38.0, D), (0., 33.0, -.5))]  # flat stem face
    BAND = mirror3((6.4, -40., 1.7), (6.4, 40., 1.7), (5.7, 0., -.3))  # sloped dark band under the bays
    QUARTER = mirror3((6.4, -26.0, D), (5.2, -38.2, D), (6.3, -38.2, 3.6))  # stern shoulders
    facet(body, UPPER + LOWER + STEM + BAND + QUARTER)
    crease = ((12.0, 1.7), (28.0, -.3))  # side-view line: the dark lower hull rises aft to the band
    cut(body, [h_plane(1.7), fh_plane(*crease)])
    BAYS = [(4.95, 15.0), (-6.7, 3.35), (-18.35, -8.3), (-30.0, -19.95)]
    V.boolean(body, [bay_cutter(f"bay{k}", a, b, B0, B1, .9, .5, 5.5, 8.0, 1.0, 1.6 if k == 0 else 0.)
                     for k, (a, b) in enumerate(BAYS)])
    V.finish(body, None)  # boolean() re-smooths; keep the faceted panels

    def tone(f, h, n):
        if -n.y > .75 and f > 30:  # the stem face reads dark, as in the reference
            return "ship_hull2"
        return "ship_hull2" if h < 1.7 and above(f, h, *crease) < 0 else None
    paint(body, lambda x, f, h, n, cur: None if cur != "ship_hull" else
          ("ship_deck" if n.z > .7 and h > D - .05 else "ship_bottom" if h < 0 else tone(f, h, n)))
    pc, ph = (B0 + B1) / 2 - .05, B1 - B0 - .35  # pod centre height and pod height
    for k, (a, b) in enumerate(BAYS):
        c, ln = (a + b) / 2 - (.8 if k == 0 else 0.), b - a - (3.0 if k == 0 else 1.4)
        rbox(f"cargo_pod{k}", P(0, c, pc), (10.4, ln, ph), .4, "ship_cargo", segs=2)
        for s in (-1, 1):
            for j in range(int(ln // 2.2) + 1):
                rbox(f"cargo_pod{k}_rib{s:+d}{j}", P(s * 5.22, c - ln / 2 + .6 + j * (ln - 1.2) / int(ln // 2.2), pc),
                     (.12, .22, ph - .4), .03, "ship_metal")
            rbox(f"cargo_pod{k}_rail{s:+d}", P(s * 5.24, c, pc + ph * .2), (.1, ln - .8, .14), .03, "ship_metal")
            rbox(f"cargo_pod{k}_light{s:+d}", P(s * 5.27, c, pc - ph * .3), (.05, ln * .5, .08), 0, "ship_light")
            for e in (-1, 1):
                rbox(f"cargo_pod{k}_corner{s:+d}{e:+d}", P(s * 5.0, c + e * (ln / 2 - .3), B0 + .17), (.5, .5, .35), .05,
                     "ship_safety")
            rbox(f"cargo_track{k}{s:+d}", P(s * 3.5, c, B0 + .02), (.3, b - a - .4, .04), 0, "ship_safety")
    for k in range(12):
        rbox(f"cargo_hatch_seam{k}", P(0, -26.0 + k * 3.6, D + .01), (11.5, .1, .02), 0, "ship_trim")
    for s in (-1, 1):
        panel(f"cargo_strip_bow{s:+d}", body, 29.0, 3.7, 8.0, .16, "ship_light", s)
        panel(f"cargo_strip_mid{s:+d}", body, -2.0, 1.0, 2.0, .14, "ship_light", s)
        panel(f"cargo_strip_aft{s:+d}", body, -24.0, 1.0, 2.0, .14, "ship_light", s)
        panel(f"cargo_strip_stern{s:+d}", body, -34.0, 3.6, 2.4, .12, "ship_light", s)

    # low bridge: a block cut by the bow's upper planes (its walls continue the bow facets), a chevron front and a
    # raked back; a dark window band wraps the whole front and both sides
    ht = D + 2.7
    bridge = loft("cargo_bridge", [(D - .3, plan(7.0, 30.0, 16.5, .05, .05, 1)), (ht, plan(7.0, 30.0, 16.5, .05, .05, 1))],
                  "ship_hull", sharp=None)
    keep = (0., 22., D + 1.)
    facet(bridge, UPPER + mirror3((0., 29.0, D), (4.5, 24.0, D), (0., 27.4, ht), keep)
          + [plane3((-1., 16.5, D), (1., 16.5, D), (0., 17.4, ht), keep)])
    cut(bridge, [h_plane(D + .55), h_plane(D + 2.1)])
    paint(bridge, lambda x, f, h, n, cur: "ship_glass" if D + .55 < h < D + 2.1 and abs(n.z) < .6 else None)
    house("cargo_bridge_top", 18.6, 24.6, 2.2, ht, ht + .6, "ship_hull2", rake_f=.6, rake_r=.2, inset=.3)
    mast("cargo_mast", P(0, 20.6, ht + .6), 4.4, "ship_trim", "ship_trim", yard=2.4)
    for s in (-1, 1):
        cylinder(f"cargo_beacon{s:+d}", P(s * 1.6, 23.4, ht + .17), .24, .35, UP, "ship_light", 16)

    # stern block: the crane deck, cut by the quarter planes and raked fore and aft so it reads as part of the hull
    st = D + 1.8
    block = loft("cargo_stern_block", [(D - .3, plan(7.0, -26.0, -39.0, .05, .05, 1)),
                                       (st, plan(7.0, -26.0, -39.0, .05, .05, 1))], "ship_hull", sharp=None)
    keep = (0., -33., D + .7)
    facet(block, QUARTER + mirror3((6.4, -30., D), (6.4, -36., D), (5.0, -33., st), keep)
          + [plane3((-1., -26.5, D), (1., -26.5, D), (0., -30.0, st), keep),
             plane3((-1., -38.0, D), (1., -38.0, D), (0., -37.4, st), keep)])
    paint(block, lambda x, f, h, n, cur: "ship_deck" if n.z > .95 else None)

    # crane: hexagonal pedestal out of the block, raked slewing house, steep main boom folding at the knuckle into a
    # long jib over the second bay, luffing and knuckle rams, cable and spreader gripper
    base, hf = P(0, -33.0, st), -8.0  # crane base on the block, hook position f
    cylinder("cargo_crane_pedestal", base + UP * .5, 2.5, 1.0, UP, "ship_hull2", 6, r2=2.0)
    cylinder("cargo_crane_ring", base + UP * 1.05, 1.95, .12, UP, "ship_light", 24)
    house("cargo_crane_house", -36.0, -30.6, 2.2, st + 1.1, st + 3.2, "ship_hull2", rake_f=1.2, rake_r=.3, inset=.4)
    rbox("cargo_crane_light", P(2.0, -33.6, st + 2.1), (.04, 2.4, .1), 0, "ship_light")
    j1, j2, tip = P(0, -34.4, st + 2.6), P(0, -30.6, D + 7.8), P(0, hf, D + 7.2)
    beam("cargo_boom1", j1, j2, 1.6, 1.7, "ship_trim", .3)
    beam("cargo_boom2", j2, tip, 1.1, 1.2, "ship_trim", .22)
    beam("cargo_boom_light", j2 + P(.52, -1.0, -.1), tip + P(.52, 0, -.1), .05, .1, "ship_light", 0)
    beam("cargo_boom_stripe", j2 + P(0, -1.0, .5), j2 + P(0, -4.5, .45), .7, .06, "ship_safety", 0)
    for k, p in enumerate((j1, j2, tip)):
        cylinder(f"cargo_crane_joint{k}", p, .65 - k * .12, 1.5, (1, 0, 0), "ship_metal", 8)
    for s in (-1, 1):  # luffing rams from the house front to the main boom, knuckle ram above it
        tube(f"cargo_crane_ram{s:+d}", [P(s * .6, -30.9, st + 1.5), j1.lerp(j2, .6) + P(s * .6, 0, 0)], .22, "ship_metal")
    tube("cargo_crane_knuckle_ram", [j1.lerp(j2, .55) + P(0, 0, .7), j2 + P(0, -2.6, .6)], .16, "ship_metal")
    hook = tip.z - 3.0
    tube("cargo_crane_cable", [tip + P(0, 0, -.4), P(0, hf, hook + .2)], .04, "ship_trim", res=1)
    rbox("cargo_spreader", P(0, hf, hook), (3.4, .45, .35), .06, "ship_trim")
    for s in (-1, 1):
        beam(f"cargo_claw{s:+d}", P(s * 1.5, hf, hook - .1), P(s * 1.2, hf, hook - 1.1), .25, .3, "ship_trim", .03)
        beam(f"cargo_claw_tip{s:+d}", P(s * 1.2, hf, hook - 1.1), P(s * .8, hf, hook - 1.3), .25, .3, "ship_metal", .03)


def rescue_patrol():
    """White deep-V rescue patrol boat: tinted canopy, blue diagonal stripes, blue/amber light bar, life ring in a
    side housing, swim platform. 14.4 x 4 m."""
    mats(ship_hull=((.90, .91, .92), .3, .05), ship_accent=((.05, .18, .80), .35, 0), ship_deck=((.20, .21, .22), .7, .2),
         ship_bottom=((.05, .05, .06), .5, 0), ship_glass=((.02, .04, .06), .04, .5))
    rows = [(-.7, .12, 5.0, -6.6, .12, 4.5), (-.3, 1.25, 6.4, -6.95, 1.05, 5.), (.2, 1.85, 7.1, -7.0, 1.7, 5.2),
            (.9, 2.0, 7.4, -7.0, 1.9, 5.6), (1.45, 1.92, 7.1, -6.95, 1.84, 5.6)]
    body = hull("patrol_hull", rows, nb=5, na=6, pw=1.7)
    S1 = (((-1.6, -.3), (-.2, 1.45)), ((-.4, -.3), (1.0, 1.45)))
    S2 = (((.4, -.3), (1.8, 1.45)), ((1.1, -.3), (2.5, 1.45)))
    cut(body, [h_plane(.15), h_plane(.55), V.f_cut(-2.0)] + [fh_plane(*ln) for pair in (S1, S2) for ln in pair])

    def band(f, h):
        for rear, front in (S1, S2):
            if above(f, h, *rear) <= 0 and above(f, h, *front) >= 0:
                return "ship_accent"
        return "ship_accent" if h < .55 and f < -2.0 else None

    paint_hull(body, 1.45, .15, band)
    house("patrol_cabin_base", -3.6, 4.6, 1.75, 1.45, 1.9, "ship_hull", rake_f=.6, inset=.1)
    house("patrol_canopy", -3.3, 3.9, 1.62, 1.9, 2.75, "ship_glass", rake_f=2.1, rake_r=.6, inset=.45, rf=1.3, rr=.8, n=4)
    house("patrol_roof", -3.5, 1.5, 1.22, 2.75, 2.88, "ship_hull", rake_f=.3, inset=.1)
    rbox("patrol_lightbar_base", P(0, -.4, 2.94), (2.3, .38, .12), .04, "ship_trim")
    rbox("patrol_lightbar_blue", P(-.4, -.4, 3.05), (1.45, .32, .12), .04, "ship_blue")
    rbox("patrol_lightbar_amber", P(.75, -.4, 3.05), (.7, .32, .12), .04, "ship_amber")
    tube("patrol_antenna", [P(.75, -3.0, 2.88), P(.75, -3.0, 4.1)], .02, "ship_trim", res=1)
    cylinder("patrol_searchlight", P(-.7, 1.1, 2.97), .13, .18, UP, "ship_lamp", 16)
    for s in (-1, 1):
        tube(f"patrol_grab{s:+d}", [P(s * .95, -3.1, 2.88), P(s * .95, -3.0, 2.98), P(s * .95, -1.4, 2.98),
                                    P(s * .95, -1.3, 2.88)], .025, "ship_metal", res=1)
        loc, nor = hit(body, -4.3, 1.0, s)
        rbox(f"patrol_ring_housing{s:+d}", loc + nor * .04, (.08, .95, .95), .12, "ship_white",
             rot=face_rot(nor))
        life_ring(f"patrol_life_ring{s:+d}", loc + nor * .14, s)
        panel(f"patrol_intake{s:+d}", body, -2.6, 1.15, 1.0, .25, "ship_trim", s)
        panel(f"patrol_strip_bow{s:+d}", body, 5.6, 1.15, 1.3, .08, "ship_light", s)
        panel(f"patrol_strip_mid{s:+d}", body, -1.2, .6, .35, .08, "ship_light", s)
        panel(f"patrol_strip_aft{s:+d}", body, -6.6, .85, .4, .08, "ship_light", s)
    rbox("patrol_engine_hatch", P(0, -5.6, 1.47), (3.0, 2.2, .04), .02, "ship_trim")
    rbox("patrol_swim_platform", P(0, -7.45, .38), (3.6, 1.0, .12), .04, "ship_trim")
    for s in (-1, 1):
        rbox(f"patrol_platform_light{s:+d}", P(s * 1.79, -7.45, .38), (.03, .5, .06), 0, "ship_light")


def fireboat():
    """Conventional red-and-white fireboat: two-tier white deckhouse with a wrap-around bridge, red mast with radar and
    domes, bow monitor and two monitors aft of the bridge, twin hose reels, knuckle crane, fender strake. 37 x 9.7 m."""
    mats(ship_hull=((.66, .04, .04), .3, .05), ship_bottom=((.05, .05, .06), .6, 0), ship_deck=((.28, .29, .30), .7, .2))
    rows = [(-2.2, 1.2, 14.4, -16.4, 1.2, 10.), (-1.2, 3.8, 16.6, -17.5, 3.5, 10.5), (0., 4.6, 17.6, -18.0, 4.4, 11.),
            (1.4, 4.8, 18.2, -18.0, 4.7, 11.), (2.8, 4.85, 18.8, -18.0, 4.75, 11.5)]
    body = hull("fire_hull", rows, nb=8, na=8, pw=2.0, sub=2, sharp=40)
    W1, W2 = ((-4.0, 1.0), (3.0, 2.8)), ((-10.0, 1.0), (-8.0, 2.8))
    SA = [((-13.0, .4), (-11.5, 2.8)), ((-14.0, .4), (-12.5, 2.8)), ((-14.8, .4), (-13.3, 2.8)), ((-15.6, .4), (-14.1, 2.8))]
    cut(body, [h_plane(-.25), h_plane(1.0), h_plane(.4), fh_plane(*W1), fh_plane(*W2)] + [fh_plane(*ln) for ln in SA])

    def band(f, h):
        if h > 1.0 and above(f, h, *W1) > 0 and above(f, h, *W2) < 0:
            return "ship_white"
        for a, b in ((SA[0], SA[1]), (SA[2], SA[3])):
            if h > .4 and above(f, h, *a) > 0 and above(f, h, *b) < 0:
                return "ship_white"
        return None

    paint_hull(body, 2.8, -.25, band)
    for s in (-1, 1):
        for k in range(12):
            panel(f"fire_fender{s:+d}{k}", body, -15.0 + k * 2.6, 2.35, 2.0, .32, "ship_rubber", s, depth=.25)
        panel(f"fire_hawse{s:+d}", body, 16.4, 2.0, 1.4, .6, "ship_trim", s)
        panel(f"fire_thruster{s:+d}", body, 15.2, .6, 1.1, .9, "ship_trim", s)
        panel(f"fire_name_plate{s:+d}", body, 6.0, 1.9, 1.4, .25, "ship_trim", s)
    deck_ring("fire_deck_ring", P(0, 10.5, 2.8), 2.0)

    h1 = house("fire_house", -8.0, 6.0, 4.0, 2.8, 5.6, "ship_white", rake_f=.3, inset=.1)
    cut(h1, [h_plane(3.5)])
    paint(h1, lambda x, f, h, n, cur: "ship_red" if h < 3.5 and n.z < .5 else None)
    deckhouse("fire_bridge", -2.5, 5.4, 3.6, 5.6, 6.3, 7.7, 8.1, rake=1.1, body="ship_white")
    house("fire_wheelhouse_top", -3.5, .8, 2.0, 8.1, 9.0, "ship_white", rake_f=.3, inset=.15)
    mast("fire_mast", P(0, -1.5, 9.0), 7.0, "ship_red", "ship_trim", yard=3.2)
    for s in (-1, 1):
        rbox(f"fire_house_stripe{s:+d}", P(s * 3.98, 2.0, 4.7), (.05, 3.0, .35), .02, "ship_red")
        rbox(f"fire_house_louvre{s:+d}", P(s * 3.98, -5.5, 4.4), (.06, 1.6, 1.2), .03, "ship_trim")
        life_ring(f"fire_life_ring_house{s:+d}", P(s * 4.08, .4, 4.3), s)
        life_ring(f"fire_life_ring_rail{s:+d}", P(s * 4.55, -7.0, 3.5), s)
        cylinder(f"fire_searchlight{s:+d}", P(s * 2.2, 4.6, 8.25), .2, .3, UP, "ship_lamp", 16)
        rbox(f"fire_bridge_strip{s:+d}", P(s * 3.25, 2.0, 7.95), (.04, 2.4, .06), 0, "ship_light")
    monitor("fire_monitor_bow", P(0, 12.2, 2.8), 0, DEG(12), 1.1)
    for s in (-1, 1):
        monitor(f"fire_monitor_top{s:+d}", P(s * 1.7, -5.0, 5.6), 0, DEG(14), .95)
    for f in (-9.6, -11.5):
        hose_reel(f"fire_reel{f:+.0f}", P(0, f, 3.75), .9, 2.2, (1, 0, 0))
        for s in (-1, 1):
            rbox(f"fire_reel_stand{f:+.0f}{s:+d}", P(s * 1.2, f, 3.3), (.12, .5, 1.0), .03, "ship_white")
    rbox("fire_utility", P(0, -13.8, 3.6), (2.6, 1.4, 1.6), .1, "ship_white")
    for k in range(6):
        rbox(f"fire_utility_slat{k}", P(1.31, -14.3 + k * .2, 3.6), (.03, .12, 1.2), 0, "ship_trim")
    crane = P(-2.9, -15.2, 2.8)
    cylinder("fire_crane_pedestal", crane + UP * .6, .45, 1.2, UP, "ship_red", 16)
    j1, j2, tip = crane + UP * 1.6, P(-2.7, -14.0, 6.2), P(-1.2, -10.4, 6.7)
    beam("fire_crane_boom1", j1, j2, .5, .55, "ship_white", .06)
    beam("fire_crane_boom2", j2, tip, .4, .45, "ship_white", .05)
    for k, p in enumerate((j1, j2, tip)):
        cylinder(f"fire_crane_joint{k}", p, .3, .6, (1, 0, 0), "ship_red", 16)
    tube("fire_crane_cable", [tip, tip - UP * 1.6], .03, "ship_trim", res=1)
    rbox("fire_crane_hook", tip - UP * 1.75, (.25, .25, .3), .05, "ship_red")
    deck_rail("fire_rail", rows, -17.6, 30, ht=1.0, step=1.8)
    loop_rail("fire_house_rail", 4.0 - .1, -8.0, 6.0 - .3, 5.6, keep=lambda x, f: f < -2.4)
    loop_rail("fire_bridge_rail", 2.0, -3.5, .8, 9.0, .8)
    for f, x in ((15.0, 1.4), (-16.6, 3.2)):
        for s in (-1, 1):
            bollard(f"fire_bollard{f:+.0f}{s:+d}", P(s * x, f, 2.8))


def harbour_patrol():
    """Silver faceted harbour patrol / survey vessel: two-tier superstructure with a raked bridge, blue/amber light bar,
    sensor mast and satcom dome, aft working deck with an A-frame, winch and yellow rails. 31 x 7.5 m."""
    mats(ship_hull=((.74, .76, .78), .25, .85), ship_hull2=((.40, .42, .44), .3, .8), ship_deck=((.30, .31, .32), .7, .2))
    rows = [(-1.8, .8, 11.3, -13.4, .8, 8.), (-.9, 3.0, 13.4, -14.6, 2.7, 8.5), (0., 3.6, 14.5, -15.0, 3.3, 9.),
            (1.2, 3.75, 15.1, -15.0, 3.55, 9.), (2.6, 3.7, 15.7, -14.8, 3.5, 9.5)]
    body = hull("harbour_hull", rows, nb=4, na=6, pw=1.6)
    cut(body, [h_plane(.9)])
    paint_hull(body, 2.6, 0, lambda f, h: "ship_hull2" if h < .9 else None)
    for s in (-1, 1):
        panel(f"harbour_strip_bow{s:+d}", body, 12.0, 2.0, 2.5, .12, "ship_light", s)
        panel(f"harbour_strip_mid{s:+d}", body, -3.0, 1.15, 2.0, .12, "ship_light", s)
        panel(f"harbour_strip_aft{s:+d}", body, -12.0, .65, 1.6, .12, "ship_light", s)

    h1 = house("harbour_house", -6.5, 11.0, 3.55, 2.6, 5.2, "ship_hull", rake_f=1.5, inset=.15, rf=1.5)
    for s in (-1, 1):
        panel(f"harbour_lab_window{s:+d}", h1, -2.5, 3.9, 5.5, 1.1, "ship_glass", s)
        panel(f"harbour_window{s:+d}", h1, 6.2, 4.3, 2.0, .5, "ship_glass", s)
        panel(f"harbour_house_strip{s:+d}", h1, 3.0, 4.6, 1.5, .1, "ship_light", s)
        panel(f"harbour_vent{s:+d}", h1, 2.2, 3.6, 1.2, .35, "ship_trim", s)
        life_ring(f"harbour_life_ring{s:+d}", P(s * 3.62, -5.6, 3.9), s)
    deckhouse("harbour_bridge", -3.5, 8.0, 3.2, 5.2, 5.6, 7.0, 7.4, rake=1.4)
    house("harbour_top", -2.5, 3.0, 2.0, 7.4, 8.3, "ship_hull", rake_f=.8, inset=.2)
    mast("harbour_mast", P(0, -.8, 8.3), 6.5, "ship_trim", "ship_trim")
    cylinder("harbour_satcom_post", P(1.8, -2.4, 7.7), .2, .6, UP, "ship_trim", 12)
    ellipsoid("harbour_satcom", P(1.8, -2.4, 8.45), (.75, .75, .7), "ship_white", 24, 12)
    rbox("harbour_lightbar_base", P(0, 5.6, 7.47), (2.6, .32, .12), .04, "ship_trim")
    rbox("harbour_lightbar_blue", P(-.35, 5.6, 7.58), (1.7, .28, .12), .04, "ship_blue")
    rbox("harbour_lightbar_amber", P(.9, 5.6, 7.58), (.7, .28, .12), .04, "ship_amber")
    for k in range(4):
        cylinder(f"harbour_flood{k}", P(-.9 + k * .6, 6.4, 7.25), .12, .1, (0, -1, 0), "ship_lamp", 12)

    # aft working deck: ring marking, winch, A-frame
    deck_ring("harbour_deck_ring", P(0, -10.5, 2.6), 2.1)
    rbox("harbour_winch_base", P(0, -8.4, 2.8), (2.6, 1.6, .4), .05, "ship_trim")
    cylinder("harbour_winch", P(0, -8.4, 3.55), .65, 1.9, (1, 0, 0), "ship_safety", 24)
    for s in (-1, 1):
        rbox(f"harbour_winch_cheek{s:+d}", P(s * 1.05, -8.4, 3.45), (.12, 1.5, 1.4), .04, "ship_trim")
        beam(f"harbour_aframe_leg{s:+d}", P(s * 3.0, -13.0, 2.6), P(s * 2.8, -14.6, 7.2), .5, .6, "ship_metal", .06)
        beam(f"harbour_aframe_brace{s:+d}", P(s * 3.0, -10.6, 2.6), P(s * 2.9, -13.7, 6.0), .3, .35, "ship_metal", .04)
        rbox(f"harbour_aframe_foot{s:+d}", P(s * 3.0, -13.0, 2.75), (.8, 1.0, .3), .05, "ship_safety")
    beam("harbour_aframe_top", P(-2.8, -14.6, 7.2), P(2.8, -14.6, 7.2), .6, .6, "ship_metal", .06)
    for k in range(3):
        rbox(f"harbour_aframe_lamp{k}", P(-1.2 + k * 1.2, -14.25, 7.15), (.35, .06, .2), .02, "ship_lamp")
    rbox("harbour_sheave", P(0, -14.7, 6.65), (.45, .5, .7), .06, "ship_trim")
    tube("harbour_cable", [P(0, -14.7, 6.3), P(0, -14.7, 4.3)], .03, "ship_trim", res=1)
    rbox("harbour_hook", P(0, -14.7, 4.15), (.3, .3, .35), .05, "ship_safety")
    deck_rail("harbour_rail_aft", rows, -14.7, -6.6, ht=1.0, role="ship_safety")
    deck_rail("harbour_rail_fwd", rows, 9.0, 30, ht=1.0)
    loop_rail("harbour_house_rail", 3.55 - .15, -6.5, 11.0 - 1.5, 5.2, keep=lambda x, f: f < -3.4)


SHIPS = {"sail-yacht": sail_yacht, "robo-fireboat": robo_fireboat, "cargo-ship": cargo_ship,
         "rescue-patrol": rescue_patrol, "fireboat": fireboat, "harbour-patrol": harbour_patrol}


def build(name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    V.M.clear()
    V.OBJS.clear()
    SHIPS[name]()
    root = bpy.data.objects.new("ROOT_" + name.upper().replace("-", "_"), None)
    root["reference_image"] = "references/" + REFS[name]
    bpy.context.scene.collection.objects.link(root)
    for o in V.OBJS:
        o.parent = root
    for m in list(bpy.data.materials):
        if m.users == 0:
            bpy.data.materials.remove(m)
    blend, glb, png = (os.path.join(HERE, f"{name}.{e}") for e in ("blend", "glb", "png"))
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    for o in bpy.context.scene.objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_animations=False, export_cameras=False, export_lights=False, export_extras=False)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in V.OBJS)
    lo, hi = V.bounds(V.OBJS)
    print("@@SHIP@@", name, "parts", len(V.OBJS), "tris", tris, "size_xyz %.2f x %.2f x %.2f" % tuple(hi - lo),
          "keel %.2f top %.2f" % (lo.z, hi.z), "glb_bytes", os.path.getsize(glb))
    V.preview(name, png, floor_z=lo.z - .02, floor_half=400.)


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for n in (args or list(SHIPS)):
        build(n)
