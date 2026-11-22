"""Q07-B 回る本棚のような受け取り塔: neighbourhood parcel pickup tower for a 2127 Odaiba residential block (v4).

Run:  blender -b --factory-startup --python-exit-code 1 -P build_pickup_tower.py [-- --no-export]
Writes q07b-pickup-tower.blend (asset + preview staging), q07b-pickup-tower.glb (asset hierarchy only) and
q07b-flow.json (the parcel route, for render_flow.py) here.

Coordinates are three.js (x, y up, z) through geo_helpers.B; one unit = one metre. The pickup counter faces +z
(three.js), which is -Y in Blender. Origin: ground-contact centre of the plinth.

Nodes (stable names):
  Q07B_PickupTower        export root (empty)
  Q07B_Shell              static: arched base, thin wavy floor slabs, full-height glass with aluminium mullions and
                          guide rails, masts, the front lift chute (four guide rails, glass, roof door), deck, roof
                          arcade, roof kit (unload table and bays, roof roller table, buffer pallets, three arms)
  Q07B_PickupPort         static: lift foot (shaft base with its door), glazed roller passage, storefront with the
                          residents' door, service wall and pickup counter, rain canopy, pickup hall (parcel wall,
                          lockers) and the back-of-house room with its rollers
  Q07B_ShelfRing_01..06   rotating bookshelf drums, two shelf tiers each; origin on the tower axis at the drum
                          floor, so they spin about local Blender Z (three.js Y); 0.6 m behind the glass
  Q07B_LiftCarriage       carriage inside the front chute; origin at its centre, travels along Blender Z between the
                          ground stop (floor 1.05 m) and the roof stop (floor 12.95 m)
Parcel route (v4): drones drop parcels on the unload table (the old service-core cap); the front arm lifts one off
its bay and sets it on the roof roller table, which runs through the planter gap and the front arch to the lift door
on the chute's tower side; the car takes it down into the lift foot; it rolls out of the foot's door through a glazed
passage into the back-of-house room and on to the pickup counter in the storefront, where a resident collects it
from the sidewalk side. Every hand-over is level with the car floor. Residents also collect from the hall's parcel
wall and lockers through the sliding door on the left. route_check moves one parcel through the whole route.
Textures: a 512 px parcel atlas (four box styles with tape, labels and shaded edges) and a 512 px UI atlas (panel
screen, header sign); both are generated here and packed, so the GLB embeds them.
Roof arms (v3, 2026-11-22): three palletising arms merged into Q07B_Shell (see build_arm). The build prints their
triangle count (ARM_TRIS) and fails if a part above the bearing intersects the roof or a pallet (ARM_CLEARANCE).
"""
import math
import os
import random
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
from geo_helpers import Acc, B, blob, bullnose, cyl, material, newell, obox, rrect_pts, sweep  # noqa: E402
import staging  # noqa: E402
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "city-kit-2127"))
import modules as M  # noqa: E402  (city-kit-2127: kit props baked into the port)

KIT2Q = {"white": "white", "wood": "wood", "slate": "frame", "dark": "frame", "glow": "screen", "green": "leaf"}

ASSET = "q07b-pickup-tower"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

# --- massing (metres) -------------------------------------------------------------------------------
R = 5.5                       # tower body radius (11 m drum; arched legs flare to ~12.6 m at the feet)
Y0 = .15                      # plinth top
YB = 3.6                      # first floor slab (top of the arched base)
N_RING = 6                    # rotating drums
RING_H = 1.45                 # one drum = two shelf tiers
TIERS = (.07, .74)            # shelf tops inside a drum
Y_DECK0 = YB + N_RING * RING_H  # 12.30
Y_DECK1 = Y_DECK0 + .3        # 12.60 roof deck
Y_CROWN = Y_DECK1 + 1.05      # 13.65 roof arcade
R_SHELF = 4.55                # drum outer radius
R_SLAB = 4.6                  # floor slab inner radius
R_GLASS = 5.15                # glass inner face (0.6 m in front of the parcels)
R_MUL = 5.21                  # mullion centre line
R_BACK = 1.45                 # drum inner (lit back wall)
R_CORE = 1.25                 # static service core
FRONT = math.pi / 2           # three.js angle of +z
PORTAL_HALF = math.radians(26)
LIFT_Z = 6.05                 # chute centre (x = 0) in front of the portal
CH = .38                      # chute half-width at the rail centres
HALL_X, HALL_Z = 1.95, 1.5    # hall half-width, back wall z
SHOP_Z = 5.05                 # storefront glass plane
K_TOP = 1.88                  # lift-foot top (the chute's glass starts above it)
# --- parcel route (v4) ------------------------------------------------------------------------------------------
# unload table -> arm -> roof roller table -> lift door (roof stop) -> car -> ground stop -> lift-foot door ->
# glazed passage -> back-of-house rollers -> pickup counter tray, facing the sidewalk. Every hand-over is level.
PJ = (.34, .26, .28)          # the route parcel: across the rollers / between the fingers, height, along the rollers
CAR_FLOOR = .26               # carriage floor top below the carriage centre
T_ROOF = Y_DECK1 + .35        # 12.95 roof hand-over level: roller tops, door sill, car floor at the roof stop
T_GND = 1.05                  # ground hand-over level: car floor at the ground stop, rollers, counter tray
Y_T = Y_DECK1 + .48           # 13.08 unload table top (the old service-core cap, now explicit)
TS = Y_T + .004               # parcels rest on the table's inlay
R_TABLE, R_BAY = 1.85, 1.45   # unload table radius; unload bays on r 1.45, one in front of each arm
LF_Z0, LF_Z1, LF_HW = 5.55, 6.55, .65   # lift foot (shaft base round the chute foot)
PIT = .90                     # lift-foot pit top (car bottom at the ground stop is 1.00)
DOOR_HW = .33                 # lift doors and the storefront hatch: half-width
CONV_W = .5                   # roller width
CTR_X = 1.2                   # pickup counter centre (storefront, right of the lift)
CAR_Y = 7.0                   # carriage parked mid-chute, carrying the route parcel down


def P(r, a, y):
    return (r * math.cos(a), y, r * math.sin(a))


def radial(a):
    """obox t/n axes: t tangential, n radial (outward) at angle a."""
    return (-math.sin(a), math.cos(a)), (math.cos(a), math.sin(a))


X, Z = (1, 0), (0, 1)


class TAcc(Acc):
    """Accumulator whose faces carry an atlas tile (u0, v0, u1, v1) each, mapped corner to corner."""

    def __init__(self):
        super().__init__()
        self.uvt = []


TEX_ROLES = ("parcel", "ui")


class Accs(dict):
    def __missing__(self, k):
        v = TAcc() if k in TEX_ROLES else Acc()
        self[k] = v
        return v


def tbox(acc, tile, c, size, t=X, n=Z):
    n0 = len(acc.f)
    obox(acc, c, size, t, n)
    acc.uvt += [tile] * (len(acc.f) - n0)


def loft(acc, sections, wrap=False):
    """Closed solid through equal-length closed sections; capped unless wrap."""
    verts, idx = [], []
    for s in sections:
        idx.append(list(range(len(verts), len(verts) + len(s))))
        verts += s
    m, n = len(sections[0]), len(sections)
    faces = []
    for i in range(n if wrap else n - 1):
        a, b = idx[i], idx[(i + 1) % n]
        faces += [(a[k], b[k], b[(k + 1) % m], a[(k + 1) % m]) for k in range(m)]
    if not wrap:
        faces += [tuple(idx[0]), tuple(reversed(idx[-1]))]
    acc.solid(verts, faces)


def ring_profile(acc, prof, a0=0.0, a1=2 * math.pi, n=96):
    """Sweep a closed (r, y) profile, prof(angle), round the axis from a0 to a1."""
    full = abs(a1 - a0 - 2 * math.pi) < 1e-6
    secs = []
    for i in range(n if full else n + 1):
        a = a0 + (a1 - a0) * i / n
        secs.append([P(r, a, y) for r, y in prof(a)])
    loft(acc, secs, wrap=full)


def ring_band(acc, r_in, r_out, y_bot, y_top, a0=0.0, a1=2 * math.pi, n=96):
    """Annular sector solid; r_in/r_out/y_bot/y_top may be callables of the angle."""
    f = lambda v, a: v(a) if callable(v) else v
    ring_profile(acc, lambda a: [(f(r_in, a), f(y_bot, a)), (f(r_out, a), f(y_bot, a)),
                                 (f(r_out, a), f(y_top, a)), (f(r_in, a), f(y_top, a))], a0, a1, n)


def rod(acc, p0, p1, r, n=8):
    d = Vector(p1) - Vector(p0)
    d.normalize()
    u = d.cross(Vector((0, 1, 0)) if abs(d.y) < .9 else Vector((1, 0, 0))).normalized()
    v = d.cross(u)
    sec = lambda p: [tuple(Vector(p) + r * (math.cos(2 * math.pi * i / n) * u + math.sin(2 * math.pi * i / n) * v))
                     for i in range(n)]
    loft(acc, [sec(p0), sec(p1)])


def ball(acc, c, r, sub=1):
    blob(acc, c, (r, r, r), sub=sub, noise=0, flat=1)


def rbox(acc, cx, cz, hw, hd, y0, y1, r=.06, b=.03):
    """Axis-aligned box with rounded corners in plan and bevelled top/bottom edges."""
    sweep(acc, lambda k: rrect_pts(cx, cz, hw, hd, [r] * 4, 3, k), bullnose(y0, y1, b, 2))


def arch_skin(acc, spans, y0, y1, r, t, flare, rows=7, seg=12, power=.8):
    """Organic arcade: a thick cylindrical skin whose lower edge springs into elliptic arches between legs.

    spans: (a_start, a_end, open_height, leg_half_metres); legs sit on the span ends (shared with neighbours).
    Legs flare outward toward y0 by `flare` metres."""
    secs = []
    for a0, a1, oh, leg in spans:
        la = leg / r
        samples = [(a0, 0.0)]
        for i in range(seg + 1):
            ph = math.pi * i / seg
            u = .5 - .5 * math.cos(ph)
            samples.append((a0 + la + (a1 - a0 - 2 * la) * u, math.sin(ph) ** power))
        for a, s in samples:
            z_open = y0 + oh * s
            col_o, col_i = [], []
            for j in range(rows + 1):
                y = z_open + (y1 - z_open) * j / rows
                k = ((y1 - y) / (y1 - y0)) ** 2
                ro = r + flare * (1 - s) ** 1.5 * k
                col_o.append(P(ro, a, y))
                col_i.append(P(ro - t, a, y))
            secs.append(col_o + col_i[::-1])
    loft(acc, secs, wrap=True)


# --- textures (sRGB pixels, generated and packed) --------------------------------------------------------------
def srgb(h):
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def pack_image(name, arr):
    h, w = arr.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.pixels.foreach_set(np.clip(arr, 0, 1).astype(np.float32).ravel())
    img.file_format = "PNG"
    img.pack()
    return img


def box_tile(rng, base, tape=None, cross=False, label=False):
    """256 px box face: fibre noise, optional tape stripe(s) and shipping label, darkened edges (a fake bevel)."""
    s = 256
    t = np.ones((s, s, 4))
    t[..., :3] = base
    yy, xx = np.mgrid[0:s, 0:s]
    fib = .025 * np.sin(yy * .9 + np.sin(xx * .05) * 3) + rng.normal(0, .012, (s, s))
    t[..., :3] += fib[..., None]
    if tape is not None:
        m = (np.abs(xx - s / 2) < 20)
        if cross:
            m |= (np.abs(yy - s / 2) < 20)
        t[m, :3] = np.array(tape) + .03 * np.sin(yy[m] * .3)[..., None]
        edge = (np.abs(np.abs(xx - s / 2) - 20) < 1.5)
        t[edge, :3] *= .85
    if label:
        lx0, lx1, ly0, ly1 = 150, 232, 28, 104
        t[ly0:ly1, lx0:lx1, :3] = .93
        bars = rng.random(lx1 - lx0 - 12) < .45
        for i, on in enumerate(bars):
            if on:
                t[ly0 + 26:ly0 + 58, lx0 + 6 + i, :3] = .12
        for row in (ly0 + 8, ly0 + 15, ly1 - 12):
            t[row:row + 3, lx0 + 6:lx1 - 10, :3] = .55
    d = np.minimum(np.minimum(xx, yy), np.minimum(s - 1 - xx, s - 1 - yy))
    t[..., :3] *= (1 - .32 * np.exp(-d / 5.0))[..., None]
    t[..., :3] += (.05 * np.exp(-np.abs(d - 9) / 2.0))[..., None]
    return t


def make_parcel_atlas():
    rng = np.random.default_rng(7)
    kraft, dark, white, light = srgb("C89A64"), srgb("B07E4C"), srgb("E8E3DA"), srgb("D9B486")
    tiles = [box_tile(rng, kraft, tape=srgb("DCC39A")),
             box_tile(rng, dark, tape=srgb("C9A574"), label=True),
             box_tile(rng, white, tape=srgb("4FA7A6")),
             box_tile(rng, light, tape=srgb("E6D3B0"), cross=True, label=True)]
    atlas = np.ones((512, 512, 4))
    for i, t in enumerate(tiles):
        r, c = divmod(i, 2)
        atlas[r * 256:(r + 1) * 256, c * 256:(c + 1) * 256] = t
    return pack_image("q07b_parcel_atlas", atlas)


PARCEL_TILES = [(0, 0, .5, .5), (.5, 0, 1, .5), (0, .5, .5, 1), (.5, .5, 1, 1)]
PARCEL_W = (.36, .26, .22, .16)


def make_ui_atlas():
    """Bottom-left 256 px: operation-panel screen. Band y 256..352: header sign (pictogram + down arrow)."""
    a = np.zeros((512, 512, 4))
    a[..., 3] = 1
    a[..., :3] = srgb("0B2F35")
    s = a[0:256, 0:256]
    s[:, :, :3] = srgb("0B2F35")
    s[214:244, 10:246, :3] = srgb("3CC8C4")                         # top bar
    s[110:190, 88:168, :3] = .95                                     # parcel icon
    s[118:182, 96:160, :3] = srgb("C89A64")
    s[118:182, 122:134, :3] = .95
    for i in range(4):                                               # pickup code boxes
        s[52:86, 22 + i * 56:66 + i * 56, :3] = srgb("E8F4F2")
        s[60:78, 36 + i * 56:52 + i * 56, :3] = srgb("0B2F35")
    s[16:34, 70:186, :3] = srgb("F2B45A")                            # amber "hold here" bar
    h = a[256:352, 0:512]
    h[:, :, :3] = srgb("176B6E")
    h[18:78, 150:210, :3] = .97                                      # parcel pictogram
    h[24:72, 156:204, :3] = srgb("176B6E")
    h[24:72, 177:183, :3] = .97
    for i in range(30):                                              # down arrow (apex at the bottom)
        w = i + 1
        h[18 + i:19 + i, 300 - w:300 + w, :3] = .97
    h[48:80, 290:310, :3] = .97
    h[6:10, 20:492, :3] = srgb("F2B45A")
    return pack_image("q07b_ui_atlas", a)


UI_SCREEN = (0, 0, .5, .5)
UI_HEADER = (0, .5, 1, .6875)


# --- materials (base colours linear; sRGB hex in comments) ----------------------------------------------
def mat(name, rgba, rough=.6, metal=0.0, emit=None, strength=1.0):
    m = material("q07b_" + name, rgba, rough, emit, strength)
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Metallic"].default_value = metal
    return m


def tex_mat(name, img, rough=.75, emit_strength=0.0):
    m = mat(name, (1, 1, 1, 1), rough)
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = img
    tx.interpolation = "Linear"
    nt.links.new(tx.outputs["Color"], bsdf.inputs["Base Color"])
    if emit_strength:
        nt.links.new(tx.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    return m


def make_materials():
    glass = mat("glass", (.95, .97, .98, .08), .12)
    glass.use_backface_culling = True                                        # one visible layer per pane
    gb = next(n for n in glass.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    gb.inputs["Specular IOR Level"].default_value = .1
    return {
        "white": mat("white", (.888, .863, .807, 1), .6),                  # #F2EFE8 matte shell
        "alu": mat("alu", (.21, .24, .28, 1), .35, .8),                    # #7F8790 dark metal: mullions, rails
        "node": mat("node", (.62, .64, .66, 1), .3, .8),                   # joints
        "frame": mat("frame", (.12, .13, .14, 1), .4, .5),                 # dark bezels
        "glass": glass,                                                     # tinted, alpha-blended
        "wood": mat("wood", (.693, .445, .195, 1), .55),                   # #D9B27A shelves
        "back": mat("shelf_back", (.92, .80, .62, 1), .7, emit=(1, .62, .32, 1), strength=2.2),
        "glow": mat("glow", (1, .86, .66, 1), .5, emit=(1, .58, .26, 1), strength=4.5),
        "warm": mat("warm_light", (1, .88, .70, 1), .4, emit=(1, .66, .34, 1), strength=6.0),  # pickup window
        "parcel": tex_mat("parcel", make_parcel_atlas(), .8),
        "ui": tex_mat("ui", make_ui_atlas(), .35, 1.4),
        "teal": mat("teal", (.06, .34, .36, 1), .4),
        "tealglow": mat("teal_glow", (.3, .85, .85, 1), .4, emit=(.25, .9, .9, 1), strength=3.0),
        "lobby": mat("lobby_glass", (.10, .10, .10, 1), .08, .3, emit=(1, .68, .40, 1), strength=.15),
        "leaf": mat("leaf", (.12, .30, .08, 1), .8),
        "leaf2": mat("leaf_light", (.25, .45, .12, 1), .8),
        "soil": mat("soil", (.20, .13, .08, 1), .9),
        "paving": mat("paving", (.62, .60, .56, 1), .85),
        "screen": mat("screen", (.06, .22, .28, 1), .3, emit=(.35, .85, .95, 1), strength=1.5),
        "cable": mat("cable", (.035, .038, .042, 1), .75),                  # #353739 rubber harness (arms)
    }


MATS = {}


def make_obj(name, accs, col, parent=None, loc3=(0, 0, 0)):
    vs, fs, mi, mats, tiles = [], [], [], [], []
    for role, acc in accs.items():
        if not acc.f:
            continue
        base = len(vs)
        vs += acc.v
        mats.append(MATS[role])
        fs += [tuple(base + i for i in f) for f in acc.f]
        mi += [len(mats) - 1] * len(acc.f)
        tiles += getattr(acc, "uvt", [None] * len(acc.f))
    off = B(loc3)
    vs = [(x - off[0], y - off[1], z - off[2]) for x, y, z in vs]
    me = bpy.data.meshes.new(name)
    me.from_pydata(vs, [], fs)
    me.update()
    for m in mats:
        me.materials.append(m)
    me.polygons.foreach_set("material_index", mi)
    # UVs: atlas tiles corner to corner; everything else box-projected at 0.5 m per unit
    uv = []
    for f, tile in zip(fs, tiles):
        nrm = newell([vs[i] for i in f])
        ax = max(range(3), key=lambda i: abs(nrm[i]))
        # Blender axes: front/back faces map (x, z), sides (y, z), tops (x, y); flipped so the face reads upright
        ua, va = {0: (1, 2), 1: (0, 2), 2: (0, 1)}[ax]
        flip = (ax == 1 and nrm[1] > 0) or (ax == 0 and nrm[0] < 0)
        if tile:
            us = [vs[i][ua] for i in f]
            vv = [vs[i][va] for i in f]
            u0, v0, u1, v1 = tile
            for i in f:
                fu = (vs[i][ua] - min(us)) / max(max(us) - min(us), 1e-6)
                fv = (vs[i][va] - min(vv)) / max(max(vv) - min(vv), 1e-6)
                uv += [u0 + (u1 - u0) * (1 - fu if flip else fu), v0 + (v1 - v0) * fv]
            continue
        for i in f:
            uv += [vs[i][ua] * .5, vs[i][va] * .5]
    me.uv_layers.new(name="UVMap").data.foreach_set("uv", uv)
    bm = bmesh.new()
    bm.from_mesh(me)
    thr = math.radians(30)
    for f in bm.faces:
        f.smooth = True
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > thr:
            e.smooth = False
    bm.to_mesh(me)
    bm.free()
    me.update()
    ob = bpy.data.objects.new(name, me)
    ob.location = off
    col.objects.link(ob)
    if parent:
        ob.parent = parent
    return ob


# --- shell ------------------------------------------------------------------------------------------------
def band_wave(k):
    if k in (0, N_RING):
        return lambda a: .04 * math.sin(2 * a + k)
    return lambda a: .08 * math.sin(2 * a + 1.7 * k) + .02 * math.sin(5 * a + k)


def band_y(k):
    return YB + k * RING_H


def band_hh(k):
    return .08 if k in (0, N_RING) else .04


def band_prof(k):
    """Thin floor slab: flat inner edge at R_SLAB, a small round nose out to ~R + 0.1 (+-0.1 wobble)."""
    w, hh = band_wave(k), band_hh(k)

    def prof(a):
        yc = band_y(k) + w(a)
        ro = R + .04 + .06 * math.sin(3 * a + 1.9 * k) * (1 if k % 2 else -1)
        pts = [(R_SLAB, yc - hh)]                                   # flat soffit, small round nose
        for j in range(5):
            ph = -math.pi / 2 + math.pi * j / 4
            pts.append((ro - hh + hh * math.cos(ph), yc + hh * math.sin(ph)))
        pts.append((R_SLAB, yc + hh))
        return pts
    return prof


def slab_top(k):
    return lambda a: band_y(k) + band_wave(k)(a) + band_hh(k)


def slab_bot(k):
    return lambda a: band_y(k) + band_wave(k)(a) - band_hh(k)


def mast_angles():
    return [FRONT + math.radians(34), FRONT - math.radians(34), FRONT + math.radians(100), FRONT - math.radians(100),
            FRONT + math.pi]


def build_shell(a):
    cyl(a["paving"], 0, 0, 6.9, 0, Y0, 72)
    # arched base: tall slender legs flaring at the feet; the portal span is centred on the front
    rest = (2 * math.pi - 2 * PORTAL_HALF) / 6
    spans = [(FRONT - PORTAL_HALF, FRONT + PORTAL_HALF, 3.05, .42)]
    for i in range(6):
        s = FRONT + PORTAL_HALF + i * rest
        spans.append((s, s + rest, 2.95, .42))
    arch_skin(a["white"], spans, Y0, YB - .1, R, .3, 1.0, rows=8, seg=14, power=.6)
    ring_band(a["lobby"], 4.55, 4.62, Y0, YB - .2, FRONT + PORTAL_HALF, FRONT + 2 * math.pi - PORTAL_HALF, 72)
    for i in range(30):
        ang = FRONT + PORTAL_HALF + (2 * math.pi - 2 * PORTAL_HALF) * (i + .5) / 30
        obox(a["alu"], P(4.66, ang, (Y0 + YB) / 2), (.05, YB - Y0, .06), *radial(ang))
    ring_band(a["white"], 4.5, R - .1, YB - .3, YB - .13, n=96)            # podium soffit
    cyl(a["white"], 0, 0, R_CORE, YB - .3, Y_T - .01, 40)                  # service core, capped by the unload table
    # thin wavy floor slabs; full-height glass between them, set 0.6 m in front of the drums
    for k in range(N_RING + 1):
        ring_profile(a["white"], band_prof(k), n=120)
    for k in range(N_RING):
        ring_band(a["glass"], R_GLASS, R_GLASS + .025, slab_top(k), slab_bot(k + 1), n=96)
    # dark metal mullions every 10 deg, every third one a deeper vertical guide rail
    for i in range(36):
        ang = FRONT + math.radians(5 + 10 * i)
        t, n = radial(ang)
        if i % 3 == 0:
            obox(a["alu"], P(R_MUL + .03, ang, (YB + Y_DECK0) / 2), (.06, Y_DECK0 - YB, .13), t, n)
        else:
            obox(a["alu"], P(R_MUL, ang, (YB + Y_DECK0) / 2), (.022, Y_DECK0 - YB, .05), t, n)
    # white masts with joint nodes and clamps
    for ang in mast_angles():
        rm = 5.85
        cyl(a["white"], math.cos(ang) * rm, math.sin(ang) * rm, .14, YB - .1, Y_CROWN + .3, 14)
        ball(a["white"], P(rm, ang, Y_CROWN + .35), .18)
        for k in range(N_RING + 1):
            yk = band_y(k) + band_wave(k)(ang)
            ball(a["node"], P(rm, ang, yk), .22)
            rod(a["node"], P(5.45, ang, yk), P(rm, ang, yk), .07, 8)
    # front lift chute: four aluminium guide rails, glass on three sides, brackets to every slab
    yr0, yr1 = PIT, Y_CROWN + .3                                           # rails run down into the lift-foot pit
    for sx in (-CH, CH):
        for sz in (-CH, CH):
            cyl(a["alu"], sx, LIFT_Z + sz, .045, yr0, yr1, 12)
    for sx in (-CH, CH):
        for k in range(N_RING + 1):
            yk = band_y(k) + band_wave(k)(FRONT)
            obox(a["alu"], (sx, yk, (LIFT_Z - CH + R - .1) / 2), (.06, .08, LIFT_Z - CH - R + .1 + .05), X, Z)
    gy0, gy1 = K_TOP + .06, Y_CROWN + .2
    obox(a["glass"], (0, (gy0 + gy1) / 2, LIFT_Z + CH + .04), (2 * CH + .1, gy1 - gy0, .02), X, Z)
    for sx in (-1, 1):
        obox(a["glass"], (sx * (CH + .04), (gy0 + gy1) / 2, LIFT_Z), (.02, gy1 - gy0, 2 * CH), X, Z)
    for yy in [K_TOP + .9 + 1.45 * i for i in range(8)]:                   # thin rings hold the glass
        if yy < gy1:
            obox(a["alu"], (0, yy, LIFT_Z + CH + .055), (2 * CH + .14, .035, .01), X, Z)
    rbox(a["alu"], 0, LIFT_Z, CH + .1, CH + .1, yr1, yr1 + .16, r=.05, b=.03)
    obox(a["tealglow"], (0, yr1 + .08, LIFT_Z + CH + .105), (.5, .04, .01), X, Z)
    # roof lift door on the chute's tower side (the rails are its jambs): sill flush with the car floor, lit header
    zd = LIFT_Z - CH - .07
    obox(a["alu"], (0, T_ROOF - .01, (zd + LIFT_Z - .31) / 2), (2 * DOOR_HW - .06, .02, LIFT_Z - .31 - zd), X, Z)
    obox(a["alu"], (0, T_ROOF + .585, zd + .03), (2 * CH + .14, .07, .06), X, Z)
    obox(a["tealglow"], (0, T_ROOF + .585, zd - .002), (2 * CH - .1, .03, .006), X, Z)
    # roof deck, open arcade standing on the deck, rim, planters
    cyl(a["white"], 0, 0, R + .1, Y_DECK0 + .1, Y_DECK1, 96)
    cyl(a["paving"], 0, 0, 4.3, Y_DECK1, Y_DECK1 + .02, 72)
    # twelve arches; the two at the front become three 20 deg arches so one opens over the roof roller table
    step = 2 * math.pi / 12
    crown = [(i * step, (i + 1) * step, .82, .14) for i in range(2)]
    crown += [(FRONT - math.radians(30) + j * math.radians(20), FRONT - math.radians(10) + j * math.radians(20), .82, .14)
              for j in range(3)]
    crown += [(i * step, (i + 1) * step, .82, .14) for i in range(4, 12)]
    arch_skin(a["white"], crown, Y_DECK1, Y_CROWN, R + .05, .14, .3, rows=5, seg=12, power=.6)
    ring_profile(a["white"], lambda ang: [(R - .15, Y_CROWN - .05), (R + .3, Y_CROWN - .05), (R + .38, Y_CROWN + .05),
                                          (R + .3, Y_CROWN + .15), (R - .15, Y_CROWN + .15)], n=120)
    gap = math.radians(7)                                                   # planter opens where the rollers pass
    ring_band(a["white"], 4.35, 5.05, Y_DECK1, Y_DECK1 + .25, FRONT + gap, FRONT + 2 * math.pi - gap, n=94)
    ring_band(a["soil"], 4.43, 4.97, Y_DECK1 + .25, Y_DECK1 + .27, FRONT + gap, FRONT + 2 * math.pi - gap, n=94)
    rng = random.Random(11)
    for i in range(40):
        ang = 2 * math.pi * (i + rng.random() * .4) / 40
        r0 = rng.uniform(.26, .4)
        if abs(math.atan2(math.sin(ang - FRONT), math.cos(ang - FRONT))) < math.radians(11):
            continue
        blob(a["leaf" if i % 3 else "leaf2"], P(4.7, ang, Y_DECK1 + .27 + r0 * .2), (r0, r0 * .85, r0), sub=1, seed=i, noise=.2)


def pick_tile(rng):
    r, acc = rng.random(), 0
    for tile, w in zip(PARCEL_TILES, PARCEL_W):
        acc += w
        if r < acc:
            return tile
    return PARCEL_TILES[-1]


def parcel(a, rng, c, size, t=X, n=Z, jitter=0.0):
    if jitter:
        j = rng.uniform(-jitter, jitter)
        cj, sj = math.cos(j), math.sin(j)
        t, n = (cj * t[0] + sj * n[0], cj * t[1] + sj * n[1]), (-sj * t[0] + cj * n[0], -sj * t[1] + cj * n[1])
    tbox(a["parcel"], pick_tile(rng), c, size, t, n)


# --- roof loader arms (v3, 2026-11-22: arm-only polish) ---------------------------------------------------
# Same three sites and reach as v2: base on r 3.2, wrist over r 2.2 / +0.38 rad, parcel held ~0.73 m above the deck.
# Each arm is a palletising robot in the reference's language: a dark fixed mount bolted to the deck, a white
# turntable over a dark bearing gap, shoulder / elbow / wrist housings with metal rings and dark caps, links with
# dark seam rings, a harness that loops round each joint, and a parallel gripper holding one parcel.
# The arms stay merged into Q07B_Shell (no pivots, no animation in v2 or v3).
ARM_ANGLES = tuple(FRONT + math.radians(d) for d in (20, 140, 260))
ARM_R, ARM_WRIST_R, ARM_WRIST_DA = 3.2, 2.2, .38
UP = Vector((0, 1, 0))


def perp_basis(ax):
    e1 = ax.cross(UP if abs(ax.y) < .9 else Vector((1, 0, 0))).normalized()
    return e1, ax.cross(e1)


def lathe(acc, c, ax, prof, n=24):
    """Solid of revolution about the unit axis ax through c; prof = [(radius, offset along ax)], end to end."""
    e1, e2 = perp_basis(ax)
    ring = [math.cos(2 * math.pi * i / n) * e1 + math.sin(2 * math.pi * i / n) * e2 for i in range(n)]
    loft(acc, [[tuple(c + d * ax + r * q) for q in ring] for r, d in prof])


def chamf(r, d0, d1, ch):
    return [(r - ch, d0), (r, d0 + ch), (r, d1 - ch), (r - ch, d1)]


def rsec(c, e1, e2, h1, h2, rc, k=0.0):
    """Rounded-rect section centred c in the plane (e1, e2), half sizes h1 x h2, inset by k."""
    return [tuple(c + x * e1 + z * e2) for x, z in rrect_pts(0, 0, h1, h2, [rc] * 4, 2, k)]


def gbox(acc, c, ex, ey, ez, size):
    """Box centred c with edges along the orthonormal ex, ey, ez; size along each."""
    hx, hy, hz = (s / 2 for s in size)
    verts = [tuple(c + sy * hy * ey + a * hx * ex + b * hz * ez)
             for sy in (-1, 1) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    acc.solid(verts, [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])


def pipe(acc, pts, r, n=6):
    """Round tube through the points (parallel-transport frames), capped."""
    pts = [Vector(p) for p in pts]
    secs, nrm = [], None
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        nrm = perp_basis(t)[0] if nrm is None else (nrm - t * nrm.dot(t)).normalized()
        bi = t.cross(nrm)
        secs.append([tuple(p + r * (math.cos(2 * math.pi * k / n) * nrm + math.sin(2 * math.pi * k / n) * bi))
                     for k in range(n)])
    loft(acc, secs)


def joint(m, c, ax, r, half, n=20, hub=False):
    """Joint housing along ax: white chamfered drum; each end steps down to a metal ring, a dark cap (and a hub)."""
    lathe(m["white"], c, ax, chamf(r, -half, half, r * .12), n)
    for sg in (-1, 1):
        a = ax * sg
        lathe(m["node"], c, a, [(r * .8, half - .01), (r * .84, half), (r * .84, half + .014), (r * .78, half + .02)], n)
        lathe(m["frame"], c, a, [(r * .58, half + .012), (r * .58, half + .03), (r * .5, half + .037)], max(n // 2, 8))
        if hub:
            lathe(m["node"], c, a, [(r * .2, half + .03), (r * .2, half + .045)], 8)


def link(m, p0, p1, side, h0, h1, rc=.035, ends=(.24, .2), gap=.03, inset=.012):
    """Tapered rounded-rect link from p0 to p1 (joint axis `side`): white body with a dark recessed seam ring
    `ends` from each end. Half sizes h = (along side, across). Returns (direction, in-plane normal)."""
    d = p1 - p0
    ln = d.length
    d.normalize()
    w = d.cross(side).normalized()
    hs = lambda t: [h0[i] + (h1[i] - h0[i]) * t / ln for i in (0, 1)]
    sec = lambda t, k=0.0: rsec(p0 + d * t, side, w, *hs(t), rc, k)
    cuts = [0, ends[0], ends[0] + gap, ln - ends[1] - gap, ln - ends[1], ln]
    for i in range(5):
        loft(m["frame"] if i in (1, 3) else m["white"], [sec(cuts[i], inset if i in (1, 3) else 0), sec(cuts[i + 1], inset if i in (1, 3) else 0)])
    return d, w


def arc(c, rad, th0, th1, steps, u, b0, b1, side):
    """Points on a circle of radius rad round c in the (u, up) plane, side offset b0 -> b1."""
    return [c + rad * (math.cos(th0 + (th1 - th0) * i / steps) * u + math.sin(th0 + (th1 - th0) * i / steps) * UP)
            + (b0 + (b1 - b0) * i / steps) * side for i in range(steps + 1)]


ARM_L1, ARM_L2 = math.hypot(.35, .76), math.hypot(1.07, .24)   # shoulder-elbow, elbow-wrist (v3 link lengths)
GRIP_DROP = .40               # wrist pitch axis (J5) above the centre of the parcel in the gripper
J2_H = .74                    # shoulder axis above the deck


def arm_base(ang):
    """Base centre on the deck and the arm's home direction (v3's reach direction; the mount is laid out on it)."""
    y = Y_DECK1 + .02
    c, w = P(ARM_R, ang, y), P(ARM_WRIST_R, ang + ARM_WRIST_DA, y)
    return Vector(c), Vector((w[0] - c[0], 0, w[2] - c[2])).normalized()


def arm_ik(O, pc):
    """Elbow-up pose that puts the gripped parcel's centre at pc. Returns (J2, J3, J5, U, reach D, limit)."""
    J2, J5 = O + J2_H * UP, pc + GRIP_DROP * UP
    hv = Vector((J5.x - O.x, 0, J5.z - O.z))
    a, h = hv.length, J5.y - J2.y
    U = hv / a
    D = math.hypot(a, h)
    if not (abs(ARM_L1 - ARM_L2) + .05 < D < ARM_L1 + ARM_L2 - .02):
        raise SystemExit("arm cannot reach %s (D %.3f)" % (tuple(round(v, 2) for v in pc), D))
    th1 = math.atan2(h, a) + math.acos((ARM_L1 ** 2 + D ** 2 - ARM_L2 ** 2) / (2 * ARM_L1 * D))
    J3 = J2 + ARM_L1 * (math.cos(th1) * U + math.sin(th1) * UP)
    return J2, J3, J5, U, D, ARM_L1 + ARM_L2


def build_arm(mount, mech, rng, ang, pc, tool_s=None):
    """One loader arm posed so its gripper holds a parcel centred at pc (tool_s: the fingers' axis, horizontal).
    mount: the fixed parts bolted to the deck, laid out on the home direction; mech: everything above the bearing."""
    O, U0 = arm_base(ang)
    S0 = UP.cross(U0)
    M = lambda a, h, b=0.0: O + a * U0 + h * UP + b * S0
    J2, J3, J5, U, _, _ = arm_ik(O, Vector(pc))
    S = UP.cross(U)                                            # joint axis; the harness runs on +S
    L = lambda a, h, b=0.0: O + a * U + h * UP + b * S
    Ts = (tool_s or S).normalized()                            # J6 turns the gripper to the parcel
    Tu = Ts.cross(UP)

    # fixed: chamfered mount plate, anchor bolts, flanged pedestal with flange bolts, junction box
    loft(mount["frame"], [rsec(M(0, hh), U0, S0, .40, .40, .06, k) for k, hh in ((.012, 0), (0, .012), (0, .038), (.012, .05))])
    for sa in (-1, 1):
        for sb in (-1, 1):
            lathe(mount["node"], M(.32 * sa, .05, .32 * sb), UP,                  # washer + hex nut
                  [(.045, -.002), (.045, .008), (.027, .008), (.027, .03), (.019, .038)], 6)
    lathe(mount["alu"], M(0, 0), UP, [(.33, .045), (.34, .055), (.34, .085), (.30, .095), (.30, .27), (.285, .29)], 24)
    for i in range(8):
        q = 2 * math.pi * (i + .5) / 8
        lathe(mount["node"], M(.32 * math.cos(q), .083, .32 * math.sin(q)), UP, [(.016, 0), (.014, .022)], 6)
    gbox(mount["frame"], M(-.335, .121), U0, UP, S0, (.12, .14, .22))               # junction box, inside the plate
    lathe(mount["cable"], M(-.335, .19), UP, [(.028, -.005), (.028, .02), (.02, .03)], 8)

    # rotating: dark bearing gap, white turntable with a teal index mark (turns with the arm), turret
    lathe(mech["frame"], L(0, 0), UP, [(.272, .28), (.272, .33)], 24)
    lathe(mech["white"], L(0, 0), UP, [(.28, .31), (.30, .325), (.30, .40), (.27, .43)], 24)
    gbox(mech["tealglow"], L(.297, .365), U, UP, S, (.012, .03, .09))
    lathe(mech["white"], L(0, 0), UP, [(.25, .40), (.25, .46), (.20, .62), (.18, .66)], 24)

    # shoulder (J2), upper arm, elbow (J3) with its rear motor, forearm, wrist roll (J4), wrist pitch (J5)
    joint(mech, J2, S, .21, .19, hub=True)
    lathe(mech["white"], J2, -S, [(.085, .225), (.10, .245), (.10, .35), (.085, .37)], 16)   # shoulder motor
    lathe(mech["frame"], J2, -S, [(.07, .365), (.07, .385)], 12)
    d1, _ = link(mech, J2, J3, S, (.13, .12), (.11, .095))
    joint(mech, J3, S, .16, .17)
    d2 = (J5 - J3).normalized()
    lathe(mech["white"], J3, -d2, [(.085, .10), (.105, .12), (.105, .27), (.09, .29)], 16)   # elbow motor
    lathe(mech["frame"], J3, -d2, [(.07, .285), (.07, .305)], 12)
    J4 = J5 - d2 * .17
    link(mech, J3, J4, S, (.095, .09), (.075, .068), ends=(.2, .12))
    lathe(mech["node"], J4, d2, [(.07, -.005), (.074, 0), (.074, .028), (.07, .033)], 16)     # wrist roll ring
    lathe(mech["white"], J4, d2, [(.068, .03), (.068, .13), (.05, .17)], 16)
    joint(mech, J5, S, .085, .10, n=12)

    # tool: J6 rotary and flange pointing down, parallel gripper (body, rail, fingers, pads, lips), one parcel
    lathe(mech["node"], J5, -UP, [(.055, .05), (.055, .12)], 12)
    lathe(mech["frame"], J5, -UP, [(.08, .115), (.085, .12), (.085, .14), (.08, .145)], 16)
    tb = J5 - UP * .145
    bb = tb - UP * .095
    loft(mech["white"], [rsec(bb + UP * hh, Ts, Tu, .24, .075, .025, k) for k, hh in ((.01, 0), (0, .01), (0, .085), (.01, .095))])
    gbox(mech["tealglow"], bb + UP * .05 + Tu * .0755, Ts, UP, Tu, (.2, .014, .004))
    gbox(mech["alu"], bb - UP * .012, Ts, UP, Tu, (.46, .024, .05))
    ptop = bb - UP * .03
    pc = ptop - UP * PJ[1] / 2
    for sg in (-1, 1):
        f_top, f_bot = bb - UP * .004, pc - UP * .15
        gbox(mech["alu"], bb - UP * .01 + Ts * sg * .1945, Ts, UP, Tu, (.05, .032, .075))      # finger carriage on the rail
        gbox(mech["node"], (f_top + f_bot) / 2 + Ts * sg * .1945, Ts, UP, Tu, (.025, (f_top - f_bot).y, .065))
        gbox(mech["node"], pc - UP * .141 + Ts * sg * .182, Ts, UP, Tu, (.045, .014, .057))     # lip, just under the parcel
        gbox(mech["teal"], pc + Ts * sg * .177, Ts, UP, Tu, (.018, .19, .085))   # grip pad, wider than the finger, bites 2 mm
    parcel(mech, rng, tuple(pc), PJ, (Ts.x, Ts.z), (Tu.x, Tu.z))

    # harness: turret -> loop round the shoulder -> back of the upper arm -> loop over the elbow -> forearm -> wrist
    wb = S.cross(d1)
    wb = -wb if wb.dot(U) > 0 else wb
    n2 = d2.cross(S)
    n2 = -n2 if n2.y < 0 else n2
    th = lambda v: math.atan2(v.y, v.dot(U))
    l1, l2 = (J3 - J2).length, (J4 - J3).length
    pts = [L(-.13, .47, .12), L(-.2, .52, .15)]
    pts += arc(J2, .27, math.radians(215), th(wb), 6, U, .15, .15, S)
    pts += [J2 + d1 * t + wb * .15 + S * .15 for t in (.4, l1 - .3)]
    pts += arc(J3, .21, th(wb), th(n2), 7, U, .15, .1, S)
    pts += [J3 + d2 * t + n2 * .12 + S * .06 for t in (.3, l2 - .1)]
    pts += [J4 + n2 * .03 + S * .03]
    pipe(mech["cable"], pts, .024, 6)
    for t in (.45, l1 - .5):
        gbox(mech["node"], J2 + d1 * t + wb * .13 + S * .14, d1, wb, S, (.035, .09, .075))
    for t in (.45, l2 - .25):
        gbox(mech["node"], J3 + d2 * t + n2 * .1 + S * .06, d2, n2, S, (.03, .06, .07))


def tri_count(accs):
    return sum(len(f) - 2 for acc in accs.values() for f in acc.f)


def merge_accs(dst, src):
    for role, acc in src.items():
        d = dst[role]
        base = len(d.v)
        d.v += acc.v
        d.f += [tuple(base + i for i in f) for f in acc.f]
        if hasattr(d, "uvt"):
            d.uvt += acc.uvt


def bvh(accs):
    from mathutils.bvhtree import BVHTree
    vs, fs = [], []
    for acc in accs.values():
        base = len(vs)
        vs += acc.v
        fs += [tuple(base + i for i in f) for f in acc.f]
    return BVHTree.FromPolygons(vs, fs)


ROUTE = {}                    # hand-over points of the route parcel, filled by the builders, read by route_check
CHECK = {}                    # parts kept apart for a clearance check before they are merged


def burn_v3_roof_draws(rng):
    """Consume the shared rng exactly as the v3 roof did (3 arm parcels, 6 random pallets), so the drums built after
    it keep their v2/v3 parcels. The v4 roof draws from its own rng."""
    for _ in range(3):
        rng.random()
    for _ in range(6):
        for _ in range(rng.randint(1, 3)):
            for _ in range(4):
                if rng.random() < .85:
                    rng.random()


def roller_table(a, p0, p1, top, w=CONV_W, legs=(), floor=None, stop=False):
    """Straight roller conveyor from p0 to p1 (x, z), roller tops at `top`: 8-sided rollers every ~9 cm between two
    guide rails (lips 3 cm above the rollers), a pan under the rollers, optional legs down to floor(z) and an end stop at
    p0."""
    d = Vector((p1[0] - p0[0], 0, p1[1] - p0[1]))
    ln = d.length
    d.normalize()
    s = UP.cross(d)
    c0 = Vector((p0[0], top, p0[1]))
    n = max(1, round(ln / .09))
    for i in range(n):                                                      # axles run into the rails
        lathe(a["node"], c0 + d * ((i + .5) * ln / n) - UP * .03, s, [(.03, -w / 2 - .01), (.03, w / 2 + .01)], 8)
    mid = c0 + d * (ln / 2)
    for sg in (-1, 1):
        gbox(a["alu"], mid + s * sg * (w / 2 + .02) - UP * .02, d, UP, s, (ln, .1, .035))
    gbox(a["alu"], mid - UP * .09, d, UP, s, (ln, .03, w))
    if stop:
        gbox(a["alu"], c0 - d * .015, d, UP, s, (.04, .14, w + .09))         # laps 5 mm over the rail ends
    for t in legs:
        q = c0 + d * t
        for sg in (-1, 1):
            e = q + s * sg * (w / 2 + .02)
            cyl(a["alu"], e.x, e.z, .022, floor(e.z), top - .07, 8)


def transfer_pad(a, cx, cz, top, floor_y):
    """Ball-transfer corner between two roller runs: a white body, an aluminium plate and nine steel balls."""
    obox(a["white"], (cx, (floor_y + top - .035) / 2, cz), (.56, top - .035 - floor_y, .56), X, Z)
    rbox(a["alu"], cx, cz, .28, .28, top - .035, top - .008, r=.04, b=.008)
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            cyl(a["node"], cx + .17 * i, cz + .17 * j, .022, top - .012, top, 8)


def print_hits(a, b, most=12):
    """Where a's faces cut b's: role names and face centres (three.js coords), for a failed clearance check."""
    fa = [(role, [acc.v[i] for i in f]) for role, acc in a.items() for f in acc.f]
    fb = [(role, [acc.v[i] for i in f]) for role, acc in b.items() for f in acc.f]
    seen = set()
    for i, j in bvh(a).overlap(bvh(b)):
        ca = Vector(map(sum, zip(*fa[i][1]))) / len(fa[i][1])
        key = (fa[i][0], fb[j][0], tuple(round(v, 1) for v in (ca.x, ca.z, -ca.y)))
        if key not in seen and len(seen) < most:
            seen.add(key)
            print("HIT %s x %s near (x %.1f, y %.1f, z %.1f)" % (key[0], key[1], ca.x, ca.z, -ca.y))


def build_roof_kit(a, rng):
    """Roof receiving and sorting (all of it ends up in the shell): the unload table on the service core with an
    unload bay in front of each arm, the roof roller table to the lift door, four fixed buffer pallets, the arms.
    Returns (mount, mech, show): arm mounts, the arms above their bearings, and the route parcel at its start."""
    burn_v3_roof_draws(rng)
    rr = random.Random(4127)
    mount, mech, show = Accs(), Accs(), Accs()
    y = Y_DECK1 + .02
    # unload table: the drones' drop point; chamfered drum, dark inlay, teal landing ring and rim light
    lathe(a["white"], Vector((0, y, 0)), UP, [(1.8, 0), (R_TABLE, .03), (R_TABLE, Y_T - y - .03), (1.8, Y_T - y)], 72)
    cyl(a["frame"], 0, 0, R_TABLE - .13, Y_T - .004, TS, 72)
    ring_band(a["tealglow"], .5, .58, TS, TS + .003, n=48)
    ring_band(a["tealglow"], R_TABLE - .005, R_TABLE + .006, Y_T - .14, Y_T - .11, n=72)
    bays = []
    for k, ang in enumerate(ARM_ANGLES):
        O, _ = arm_base(ang)
        cb = Vector(P(R_BAY, ang, TS + PJ[1] / 2))
        ub = Vector((cb.x - O.x, 0, cb.z - O.z)).normalized()
        sb = UP.cross(ub)
        bays.append((cb, sb))
        for sg in (-1, 1):                                                   # stops at both ends, fingers slip past
            gbox(a["alu"], Vector((cb.x, TS + .025, cb.z)) + ub * sg * (PJ[2] / 2 + .035), sb, UP, ub, (.30, .05, .03))
            gbox(a["teal"], Vector((cb.x, TS + .0015, cb.z)) + sb * sg * .225, sb, UP, ub, (.02, .003, .36))
    # roof roller table: from the front arm's place point through the planter gap and the front arch to the lift door
    z0, z1 = 3.75, LIFT_Z - CH - .07
    floor = lambda z: Y_DECK1 + .02 if z < 4.3 else Y_DECK1
    roller_table(a, (0, z0), (0, z1), T_ROOF, legs=(.15, 1.0, 1.7), floor=floor, stop=True)
    pick = Vector((0, T_ROOF + PJ[1] / 2, 3.98))
    # four fixed buffer pallets, two beside each rear arm, on teal corner marks
    stacks = []
    for ang, layers in ((ARM_ANGLES[2] + math.radians(28), 2), (ARM_ANGLES[2] - math.radians(28), 1),
                        (ARM_ANGLES[1] + math.radians(28), 2), (ARM_ANGLES[1] - math.radians(28), 1)):
        c = P(3.25, ang, y)
        t, n = radial(ang)
        obox(a["frame"], (c[0], y + .07, c[2]), (1.1, .14, .85), t, n)
        for sx in (-1, 1):
            for sz in (-1, 1):
                q = (c[0] + t[0] * sx * .61 + n[0] * sz * .485, y + .002, c[2] + t[1] * sx * .61 + n[1] * sz * .485)
                obox(a["teal"], (q[0] - t[0] * sx * .07, q[1], q[2] - t[1] * sx * .07), (.18, .004, .035), t, n)
                obox(a["teal"], (q[0] - n[0] * sz * .08875, q[1], q[2] - n[1] * sz * .08875), (.035, .004, .1425), t, n)
        hy = y + .14
        for _ in range(layers):
            for sx in (-.27, .27):
                for sz in (-.2, .2):
                    parcel(a, rr, (c[0] + t[0] * sx + n[0] * sz, hy + .15, c[2] + t[1] * sx + n[1] * sz), (.5, .3, .36), t, n)
            hy += .3
        stacks.append((Vector((c[0], hy, c[2])), Vector((t[0], 0, t[1]))))
    # arms: the front one sets the route parcel on the roller table; the left one lifts a parcel off its bay;
    # the right one stacks a parcel on its buffer pallet. The front bay holds the next route parcel.
    build_arm(mount, mech, rr, ARM_ANGLES[0], pick + UP * .03, Vector((1, 0, 0)))
    build_arm(mount, mech, rr, ARM_ANGLES[1], bays[1][0] + UP * .04, bays[1][1])
    build_arm(mount, mech, rr, ARM_ANGLES[2], stacks[0][0] + UP * (PJ[1] / 2 + .03), stacks[0][1])
    for k, acc in ((0, show), (2, a)):
        cb, sb = bays[k]
        parcel(acc, rr, tuple(cb), PJ, (sb.x, sb.z), (sb.cross(UP).x, sb.cross(UP).z))
    ROUTE.update(bay=bays[0], arm=ARM_ANGLES[0], pick=pick, roof_rollers=(z0, z1))
    return mount, mech, show


# --- rotating drums -----------------------------------------------------------------------------------------
def fill_cubby(a, rng, ac, yb, hmax, rf, span, k, d):
    """Parcels across one cubby: varied sizes, gaps, depth and slight yaw; some cubbies empty or planted."""
    tc, nc = radial(ac)
    roll = rng.random()
    if roll < .07:
        return
    if roll < .14:
        pc = P(rf - .35, ac, yb)
        cyl(a["white"], pc[0], pc[2], .12, yb, yb + .17, 10, r_top=.14)
        blob(a["leaf" if d % 2 else "leaf2"], (pc[0], yb + .27, pc[2]), (.22, .17, .22), sub=1, seed=k * 50 + d, noise=.2)
        return
    x = -span / 2 + rng.uniform(.02, .2)
    while x < span / 2 - .22:
        kind = rng.random()
        if kind < .2:                                               # flat parcel / mailer, often stacked
            bw, bh, bd = rng.uniform(.3, .45), rng.uniform(.06, .1), rng.uniform(.25, .35)
        elif kind < .35:                                            # tall box
            bw, bh, bd = rng.uniform(.22, .3), hmax * rng.uniform(.8, .95), rng.uniform(.25, .35)
        else:
            bw, bh, bd = rng.uniform(.26, .48), hmax * rng.uniform(.35, .75), rng.uniform(.3, .5)
        bw = min(bw, span / 2 - x - .02)
        if bw < .18:
            break
        back = rng.uniform(0, .18)
        off = x + bw / 2
        yy = yb
        for _ in range(3 if kind < .2 else 1):
            c = P(rf - bd / 2 - back, ac, yy + bh / 2)
            parcel(a, rng, (c[0] + tc[0] * off, c[1], c[2] + tc[1] * off), (bw * .95, bh, bd), tc, nc, jitter=.1)
            yy += bh
            if kind >= .2 or rng.random() < .4:
                break
        sh = hmax - (yy - yb) - .04
        if kind >= .35 and sh > .14 and rng.random() < .45:
            sh = min(sh, rng.uniform(.12, .24))
            parcel(a, rng, (c[0] + tc[0] * off, yy + sh / 2, c[2] + tc[1] * off), (bw * .7, sh, bd * .7), tc, nc, jitter=.15)
        x += bw + rng.uniform(.02, .16)
    if rng.random() < .35:
        bh = hmax * rng.uniform(.4, .8)
        c = P(rf - 1.0, ac, yb + bh / 2)
        parcel(a, rng, c, (span * .45, bh, .45), tc, nc, jitter=.1)


def build_ring(k, rng):
    """One rotating bookshelf drum (two tiers) in world coordinates; make_obj moves its origin to the axis."""
    a = Accs()
    y0 = band_y(k)
    top = y0 + RING_H - .06
    tops = [y0 + t for t in TIERS]
    ring_band(a["wood"], R_BACK, R_SHELF, y0, y0 + .07, n=96)
    for ty in tops[1:]:
        ring_band(a["wood"], R_BACK, R_SHELF, ty - .05, ty, n=96)
        ring_band(a["glow"], R_SHELF - .22, R_SHELF - .06, ty - .07, ty - .04, n=96)    # under-shelf light
    ring_band(a["back"], R_BACK - .05, R_BACK, y0 + .07, top, n=48)
    ring_band(a["wood"], R_BACK, R_SHELF, top - .04, top, n=96)
    nd = 24
    ph = math.radians(5 * k)
    rf = R_SHELF - .06
    for d in range(nd):
        ang = ph + 2 * math.pi * d / nd
        t, n = radial(ang)
        obox(a["white"], P((R_BACK + R_SHELF) / 2, ang, (y0 + top) / 2), (.035, top - y0 - .02, R_SHELF - R_BACK - .02), t, n)
        obox(a["white"], P(R_SHELF - .03, ang, (y0 + top) / 2), (.08, top - y0 - .05, .06), t, n)
        ac = ang + math.pi / nd
        span = 2 * math.sin(math.pi / nd) * (rf - .3) - .06
        for i, yb in enumerate(tops):
            hmax = (tops[i + 1] - .05 if i + 1 < len(tops) else top - .04) - yb
            fill_cubby(a, rng, ac, yb, hmax - .03, rf, span, k, d)
    return a


# --- pickup port ----------------------------------------------------------------------------------------------
def prism(acc, pts, y0, y1):
    """Vertical prism over a simple (x, z) polygon, y0..y1."""
    m = len(pts)
    verts = [(x, y0, z) for x, z in pts] + [(x, y1, z) for x, z in pts]
    faces = [tuple(range(m - 1, -1, -1)), tuple(range(m, 2 * m))]               # caps wound against the sides
    faces += [(i, (i + 1) % m, m + (i + 1) % m, m + i) for i in range(m)]
    acc.solid(verts, faces)


def build_ground(a, rng, show):
    """Ground hand-over, in route order: the lift foot (the shaft base round the chute foot, its door on the tower side
    at the car-floor level), a glazed roller passage into the storefront, the pickup counter facing the sidewalk, a rain
    canopy over the forecourt. The back-of-house room behind the counter is built with the hall (build_port)."""
    z0, z1, hw = LF_Z0, LF_Z1, LF_HW
    zr = LIFT_Z + CH + .06                                                  # +z wall stands clear of the rails
    # lift foot: hollow, the car drops into it; the rails run down to the pit
    obox(a["white"], (0, (Y0 + K_TOP) / 2, (zr + z1) / 2), (2 * hw, K_TOP - Y0, z1 - zr), X, Z)
    for s in (-1, 1):
        obox(a["white"], (s * (.45 + hw) / 2, (Y0 + K_TOP) / 2, (z0 + zr) / 2), (hw - .45, K_TOP - Y0, zr - z0), X, Z)
    dy0, dy1, wz = T_GND - .03, T_GND + .45, z0 + .03
    obox(a["white"], (0, (Y0 + dy0) / 2, wz), (.9, dy0 - Y0, .06), X, Z)
    obox(a["white"], (0, (dy1 + K_TOP) / 2, wz), (.9, K_TOP - dy1, .06), X, Z)
    for s in (-1, 1):
        obox(a["white"], (s * (DOOR_HW + .45) / 2, (dy0 + dy1) / 2, wz), (.45 - DOOR_HW, dy1 - dy0, .06), X, Z)
    obox(a["white"], (0, (Y0 + PIT) / 2, (z0 + .06 + zr) / 2), (.9, PIT - Y0, zr - z0 - .06), X, Z)
    obox(a["alu"], (0, T_GND - .01, (z0 + LIFT_Z - .31) / 2), (2 * DOOR_HW - .06, .02, LIFT_Z - .31 - z0), X, Z)   # sill
    obox(a["tealglow"], (0, dy1 + .05, z0 - .003), (.5, .03, .006), X, Z)
    # cap ring round the carriage hole (the chute's glass starts above it)
    hx, hz0, hz1 = CH - .03, LIFT_Z - CH + .03, LIFT_Z + CH - .03
    cz0, cz1, cx = z0 - .03, z1 + .03, hw + .03
    for za, zb in ((cz0, hz0), (hz1, cz1)):
        obox(a["alu"], (0, K_TOP + .025, (za + zb) / 2), (2 * cx, .05, zb - za), X, Z)
    for s in (-1, 1):
        obox(a["alu"], (s * (hx + cx) / 2, K_TOP + .025, LIFT_Z), (cx - hx, .05, hz1 - hz0), X, Z)
    # street face of the lift foot: a flush light-metal service hatch (not a doorway) and the lift light
    obox(a["alu"], (0, .85, z1 + .004), (.42, .9, .008), X, Z)
    obox(a["frame"], (.15, .85, z1 + .011), (.02, .1, .01), X, Z)
    obox(a["tealglow"], (0, 1.76, z1 + .006), (.36, .04, .012), X, Z)
    # glazed passage from the lift door into the storefront hatch, rollers inside
    pz0, pz1 = SHOP_Z + .05, z0
    pc, pl = (pz0 + pz1) / 2, pz1 - pz0
    obox(a["white"], (0, Y0 + .025, pc), (.88, .05, pl), X, Z)
    obox(a["white"], (0, T_GND + .55, pc), (.9, .06, pl), X, Z)
    for s in (-1, 1):
        obox(a["glass"], (s * .41, (Y0 + .05 + T_GND + .52) / 2, pc), (.02, T_GND + .47 - Y0, pl - .08), X, Z)
        for zz in (pz0 + .02, pz1 - .02):
            obox(a["alu"], (s * .42, (Y0 + .05 + T_GND + .52) / 2, zz), (.04, T_GND + .47 - Y0, .04), X, Z)
    obox(a["white"], (0, (Y0 + .05 + T_GND - .105) / 2, pc), (CONV_W + .07, T_GND - .105 - Y0 - .05, pl), X, Z)
    # pickup counter in the storefront (the storefront itself is built in build_port): lit frame, tray, panel, sign
    wx, wy0, wy1 = .45, T_GND - .05, T_GND + .62
    fz = SHOP_Z + .06
    obox(a["warm"], (CTR_X, wy1 + .03, fz), (2 * wx + .1, .04, .02), X, Z)
    for s in (-1, 1):
        obox(a["warm"], (CTR_X + s * (wx + .03), (wy0 + wy1) / 2, fz), (.04, wy1 - wy0 + .02, .02), X, Z)
    obox(a["alu"], (CTR_X, T_GND - .01, SHOP_Z), (2 * wx - .1, .02, .1), X, Z)                    # window sill
    sweep(a["alu"], lambda k: rrect_pts(CTR_X, SHOP_Z + .26, wx - .05, .21, [.03, .03, 0, 0], 2, k),
          bullnose(T_GND - .04, T_GND, .012, 1))                                                     # hand-over tray
    obox(a["teal"], (CTR_X, T_GND + .015, SHOP_Z + .46), (2 * wx - .16, .05, .02), X, Z)
    parcel(show, rng, (CTR_X, T_GND + PJ[1] / 2, SHOP_Z + .26), PJ, X, Z)                            # route end
    px = CTR_X + wx + .13
    obox(a["frame"], (px, T_GND + .27, SHOP_Z + .065), (.2, .44, .03), X, Z)
    tbox(a["ui"], UI_SCREEN, (px, T_GND + .33, SHOP_Z + .085), (.16, .24, .01))
    obox(a["tealglow"], (px, T_GND + .12, SHOP_Z + .085), (.11, .07, .01), X, Z)
    tbox(a["ui"], UI_HEADER, (CTR_X, wy1 + .22, SHOP_Z + .07), (1.0, .2, .02))
    obox(a["teal"], (CTR_X, Y0 + .004, SHOP_Z + 1.05), (.9, .008, .3), X, Z)                         # stand here
    # rain canopy over the forecourt: two halves meeting on the axis, an opening for the chute, two posts
    half = [(0, 5.1), (1.3, 5.1), (1.3, 5.6), (1.85, 5.6), (1.85, 7.3), (0, 7.3), (0, 6.66), (.5, 6.66), (.5, 5.5), (0, 5.5)]
    canopy = Accs()
    for s in (-1, 1):
        pts = [(s * x, z) for x, z in half]
        prism(canopy["white"], pts if s > 0 else pts[::-1], 2.45, 2.55)
        obox(canopy["glow"], (s * 1.15, 2.44, 6.45), (.05, .02, 1.5), X, Z)
        cyl(canopy["alu"], s * 1.72, 7.18, .045, 0, 2.45, 12)
    obox(canopy["tealglow"], (0, 2.5, 7.303), (3.5, .03, .006), X, Z)
    # residents' entrance sign hung under the canopy in front of the sliding door (pictogram tile), on two rods
    tbox(canopy["ui"], (0, .5, .5, .6875), (-1.35, 2.2, 6.0), (.9, .24, .03))
    for s in (-1, 1):
        cyl(canopy["node"], -1.35 + s * .35, 6.0, .012, 2.32, 2.45, 6)
    CHECK["canopy"] = canopy
    merge_accs(a, canopy)
    # big entrance sign over the arch, split round the chute (pictogram left, arrow right)
    for s, tile in ((-1, (0, .5, .5, .6875)), (1, (.5, .5, 1, .6875))):
        tbox(a["ui"], tile, (s * 1.25, 3.3, 5.62), (1.3, .34, .05))
        rod(a["node"], (s * 1.25, 3.47, 5.6), (s * 1.25, 3.62, 5.45), .025, 6)


def build_back_of_house(a):
    """Back-of-house room behind the counter (staff only, door from the lobby): rollers from the passage hatch, two
    ball-transfer corners, rollers out to the counter window; a wall cabinet from the kit."""
    x0, x1, zb, zf, top = -.5, HALL_X, 3.85, SHOP_Z - .05, 2.3
    fl = Y0 + .02                                                           # on the hall paving
    obox(a["white"], ((x0 + x1) / 2, (fl + top) / 2, zb + .05), (x1 - x0, top - fl, .1), X, Z)
    obox(a["white"], (x0 + .05, (fl + top) / 2, (zb + .1 + zf) / 2), (.1, top - fl, zf - zb - .1), X, Z)
    obox(a["white"], ((x0 + x1) / 2, top + .05, (zb + zf) / 2), (x1 - x0, .1, zf - zb), X, Z)
    obox(a["glow"], (.72, top - .01, 4.42), (1.8, .02, .5), X, Z)
    obox(a["frame"], (x0 - .006, (Y0 + 2.05) / 2 + .01, 4.4), (.012, 2.05 - Y0, .8), X, Z)        # staff door
    obox(a["node"], (x0 - .02, 1.05, 4.72), (.02, .03, .12), X, Z)
    obox(a["tealglow"], (x0 - .006, 2.12, 4.4), (.012, .04, .3), X, Z)
    pz = 4.4
    roller_table(a, (0, LF_Z0), (0, pz + .28), T_GND)                                                # lift -> hall
    obox(a["white"], (0, (fl + T_GND - .105) / 2, (pz + .28 + zf) / 2), (CONV_W + .07, T_GND - .105 - fl, zf - pz - .28), X, Z)
    transfer_pad(a, 0, pz, T_GND, fl)
    roller_table(a, (.28, pz), (CTR_X - .28, pz), T_GND)
    obox(a["white"], ((CTR_X) / 2, (fl + T_GND - .105) / 2, pz), (CTR_X - .56, T_GND - .105 - fl, CONV_W + .07), X, Z)
    transfer_pad(a, CTR_X, pz, T_GND, fl)
    roller_table(a, (CTR_X, pz + .28), (CTR_X, zf), T_GND)                                           # -> counter
    obox(a["white"], (CTR_X, (fl + T_GND - .105) / 2, (pz + .28 + zf) / 2), (CONV_W + .07, T_GND - .105 - fl, zf - pz - .28), X, Z)
    kit = M.Ctx({role: Acc() for role in M.ROLES}, random.Random(0))
    M.kit_prop(kit, "upper_cabinet", .72, 1.45, zb + .1)
    for role, acc in kit.a.items():
        if acc.f:
            merge_accs(a, {KIT2Q[role]: acc})
    ROUTE.update(gnd=(pz, CTR_X, SHOP_Z + .26))


def build_port(a, rng, show):
    """Ground: lift foot, passage, counter and canopy; the glazed storefront with the resident entrance; the pickup
    hall (residents' lobby with the parcel wall and lockers) and the back-of-house room."""
    build_ground(a, rng, show)
    hw, bz = HALL_X, HALL_Z
    fz = math.sqrt(4.5 ** 2 - hw ** 2)
    ceil = 3.0
    # storefront in the portal: resident entrance (sliding door, left), glass, the service wall with the roller
    # hatch (middle), the counter wall with its window (right); aluminium mullions and transom
    door0, door1, tr = -1.9, -.8, 2.3
    wy0, wy1 = T_GND - .05, T_GND + .62
    obox(a["glass"], ((door0 + door1) / 2 - .03, (tr + 3.25) / 2, SHOP_Z), (door1 - door0 + .06, 3.25 - tr, .02), X, Z)
    obox(a["glass"], ((door1 - .45) / 2, (Y0 + 3.25) / 2, SHOP_Z), (-.45 - door1, 3.25 - Y0, .02), X, Z)
    obox(a["glass"], (0, (tr + 3.25) / 2, SHOP_Z), (.9, 3.25 - tr, .02), X, Z)
    obox(a["glass"], ((.45 + 1.9) / 2, (wy1 + .04 + 3.25) / 2, SHOP_Z), (1.45, 3.25 - wy1 - .04, .02), X, Z)
    hy0, hy1 = T_GND - .11, T_GND + .45                                     # hatch clears the roller pan
    obox(a["white"], (0, (Y0 + hy0) / 2, SHOP_Z), (.9, hy0 - Y0, .1), X, Z)
    obox(a["white"], (0, (hy1 + tr) / 2, SHOP_Z), (.9, tr - hy1, .1), X, Z)
    for s in (-1, 1):
        obox(a["white"], (s * (DOOR_HW + .45) / 2, (hy0 + hy1) / 2, SHOP_Z), (.45 - DOOR_HW, hy1 - hy0, .1), X, Z)
    cx0, cx1 = CTR_X - .45, CTR_X + .45
    obox(a["white"], ((.45 + 1.9) / 2, (Y0 + wy0) / 2, SHOP_Z), (1.45, wy0 - Y0, .1), X, Z)
    obox(a["white"], ((.45 + cx0) / 2, (wy0 + wy1) / 2, SHOP_Z), (cx0 - .45, wy1 - wy0, .1), X, Z)
    obox(a["white"], ((cx1 + 1.9) / 2, (wy0 + wy1) / 2, SHOP_Z), (1.9 - cx1, wy1 - wy0, .1), X, Z)
    obox(a["white"], ((.45 + 1.9) / 2, wy1 + .02, SHOP_Z), (1.45, .04, .1), X, Z)
    for x in (door0, door1, -.45, .45, 1.9):                                # feet 5 mm up: off the walls' bottom faces
        obox(a["alu"], (x, (Y0 + .005 + 3.25) / 2, SHOP_Z), (.05, 3.25 - Y0 - .005, .07), X, Z)
    obox(a["alu"], ((-1.95 - .45) / 2, tr, SHOP_Z), (1.5, .06, .07), X, Z)
    for i, x in enumerate((door0 + .3, door0 + .62)):                       # two leaves slid open
        zz = SHOP_Z + .05 + .04 * i
        obox(a["glass"], (x, (Y0 + tr) / 2, zz), (.5, tr - Y0 - .04, .015), X, Z)
        obox(a["alu"], (x - .25, (Y0 + tr) / 2, zz), (.035, tr - Y0 - .04, .03), X, Z)
        obox(a["alu"], (x + .25, (Y0 + tr) / 2, zz), (.035, tr - Y0 - .04, .03), X, Z)
    obox(a["tealglow"], ((door0 + door1) / 2, tr + .07, SHOP_Z + .04), (door1 - door0 - .1, .03, .01), X, Z)
    obox(a["teal"], ((door0 + door1) / 2, Y0 + .004, SHOP_Z + .45), (door1 - door0, .008, .8), X, Z)
    for x in (door0 + .04, door1 - .04):                                    # lit jambs mark the residents' door
        obox(a["tealglow"], (x, (Y0 + tr) / 2, SHOP_Z + .045), (.02, tr - Y0 - .1, .012), X, Z)
    # hall
    obox(a["paving"], (0, Y0 + .01, (bz + SHOP_Z - .05) / 2), (3.4, .02, SHOP_Z - .05 - bz), X, Z)   # ends at the storefront
    obox(a["white"], (0, (Y0 + ceil) / 2, bz - .1), (2 * hw + .2, ceil - Y0, .2), X, Z)
    for s in (-1, 1):
        obox(a["white"], (s * (hw + .1), (Y0 + ceil) / 2, (bz + 5.0) / 2), (.2, ceil - Y0, 5.0 - bz), X, Z)
    obox(a["white"], (0, ceil + .06, (bz + 5.0) / 2), (2 * hw + .4, .12, 5.0 - bz), X, Z)
    obox(a["glow"], (0, ceil - .01, (bz + fz) / 2), (2 * hw - .6, .02, fz - bz - .6), X, Z)
    wz = bz + .01
    obox(a["back"], (0, 1.3, wz), (2 * hw - .1, 2.2, .02), X, Z)
    for sy in (.2, .75, 1.3, 1.85):
        obox(a["wood"], (0, sy, wz + .2), (2 * hw - .1, .05, .4), X, Z)
        x = -hw + .1 + rng.uniform(0, .2)
        while x < hw - .35:
            bw = rng.uniform(.24, .48)
            bh = rng.uniform(.14, .44)
            if rng.random() < .85:
                parcel(a, rng, (x + bw / 2, sy + .025 + bh / 2, wz + .22), (bw * .92, bh, .32), X, Z, jitter=.08)
            x += bw + rng.uniform(.03, .14)
    for x in (-hw + .05, -.6, .6, hw - .05):
        obox(a["wood"], (x, 1.21, wz + .2), (.05, 2.08, .4), X, Z)
    obox(a["screen"], (0, 2.65, wz + .05), (1.4, .4, .04), X, Z)
    for s in (-1, 1):                                                       # side lockers
        wx = -s * hw
        rows = [(.25, .55), (.55, .85), (.85, 1.4), (1.4, 1.95), (1.95, 2.8)]
        z0, z1 = bz + .3, fz - .5
        for yy0, yy1 in rows:
            cols = 3 if yy1 - yy0 < .5 else 2
            for c in range(cols):
                u0 = z0 + (z1 - z0) * c / cols
                u1 = z0 + (z1 - z0) * (c + 1) / cols
                uc, w, h, yc = (u0 + u1) / 2, u1 - u0 - .05, yy1 - yy0 - .05, (yy0 + yy1) / 2
                obox(a["wood"], (wx + .03 * s, yc, uc), (.04, h, w), X, Z)
                obox(a["tealglow"], (wx + .055 * s, yc + h * .32, uc + w * .36), (.01, .05, .05), X, Z)
    build_back_of_house(a)


def build_carriage(rng, with_parcel=True):
    """Lift carriage around its centre (fits the 0.76 m chute), open front and back; carries the route parcel."""
    a = Accs()
    hw, h = .29, .62
    for yy in (-h / 2 + .025, h / 2 - .025):
        rbox(a["alu"], 0, 0, hw, hw, yy - .025, yy + .025, r=.03, b=.01)
    for sx in (-1, 1):
        for sz in (-1, 1):
            obox(a["alu"], (sx * (hw - .025), 0, sz * (hw - .025)), (.04, h - .05, .04), X, Z)
        obox(a["node"], (sx * (hw + .005), 0, 0), (.06, h - .05, .12), X, Z)  # rail shoes, tied to both plates
    obox(a["tealglow"], (0, h / 2 - .08, hw - .005), (.52, .03, .01), X, Z)
    if with_parcel:
        parcel(a, rng, (0, -CAR_FLOOR + PJ[1] / 2, 0), PJ, X, Z)
    return a


# --- preview staging (not exported) ------------------------------------------------------------------------
def build_preview(col, rng):
    a = Accs()
    for ang, r0, rr in ((.4, 14, 5), (2.6, 14, 5), (3.6, 13, 6), (5.3, 16, 7), (1.0, 22, 5), (2.1, 22, 5), (4.6, 21, 5)):
        cyl(a["pv_grass"], math.cos(ang) * r0, math.sin(ang) * r0, rr, 0, .03, 32)
    for i in range(26):
        ang = rng.uniform(0, 2 * math.pi)
        r0 = rng.uniform(10, 30)
        if abs(math.atan2(math.sin(ang - FRONT), math.cos(ang - FRONT))) < .5 and r0 < 26:
            continue
        x, z = math.cos(ang) * r0, math.sin(ang) * r0
        h = rng.uniform(3, 5.5)
        cyl(a["pv_bark"], x, z, .15, 0, h * .5, 8)
        blob(a["pv_tree" if i % 3 else "pv_tree2"], (x, h * .72, z), (h * .3, h * .28, h * .3), sub=2, seed=i, noise=.2)
    for ang, r0 in ((.25, 30), (.95, 33), (2.2, 33), (2.9, 30), (3.7, 38), (4.5, 37), (5.6, 31)):
        x, z = math.cos(ang) * r0, math.sin(ang) * r0
        h = rng.uniform(8, 13)
        cyl(a["pv_bldg"], x, z, rng.uniform(5, 6.5), 0, h, 40)
        for f in range(int(h // 3.3)):
            cyl(a["pv_glass"], x, z, 5.05, f * 3.3 + .9, f * 3.3 + 2.7, 40)
    obox(a["pv_water"], (0, -.4, -230), (900, .2, 300), (1, 0), (0, 1))
    MATS.update({
        "pv_grass": mat("pv_grass", (.20, .38, .10, 1), .9),
        "pv_bark": mat("pv_bark", (.20, .13, .08, 1), .9),
        "pv_tree": mat("pv_tree", (.12, .32, .07, 1), .8),
        "pv_tree2": mat("pv_tree2", (.70, .40, .55, 1), .8),
        "pv_bldg": mat("pv_bldg", (.85, .82, .77, 1), .5),
        "pv_glass": mat("pv_glass", (.30, .38, .40, 1), .15),
        "pv_water": mat("pv_water", (.08, .25, .38, 1), .1),
    })
    make_obj("PV_Context", a, col)
    objs = staging.setup_scene(bpy.context.scene) + list(staging.make_cameras().values())
    staging.ground_and_people(objs)
    for o in objs:
        col.objects.link(o)
    staging.use_camera(bpy.context.scene, "main")


# --- route check and flow data -------------------------------------------------------------------------------
def route_points():
    """The route parcel's centre through every stage, three.js coords: [(stage, [points], finger axis)]."""
    cb, sb = ROUTE["bay"]
    O, _ = arm_base(ROUTE["arm"])
    pick = ROUTE["pick"]
    pz, cx, tz = ROUTE["gnd"]
    lift = .35
    seg = lambda p0, p1, step=.05: [p0.lerp(p1, i / max(1, int((p1 - p0).length / step))) for i in range(int((p1 - p0).length / step) + 1)]
    a0 = math.atan2(cb.z - O.z, cb.x - O.x)
    a1 = math.atan2(pick.z - O.z, pick.x - O.x)
    a1 += 2 * math.pi * round((a0 - a1) / (2 * math.pi))
    r0, r1 = math.hypot(cb.x - O.x, cb.z - O.z), math.hypot(pick.x - O.x, pick.z - O.z)
    y0, y1 = cb.y + lift, pick.y + lift
    swing, axes = [], []
    for i in range(41):
        f = i / 40
        ang, rad = a0 + (a1 - a0) * f, r0 + (r1 - r0) * f
        swing.append(Vector((O.x + rad * math.cos(ang), y0 + (y1 - y0) * f, O.z + rad * math.sin(ang))))
        yaw = math.atan2(sb.z, sb.x) * (1 - f) + 0 * f
        axes.append(Vector((math.cos(yaw), 0, math.sin(yaw))))
    yg = T_GND + PJ[1] / 2
    return [
        ("1 unload bay", [cb], sb),
        ("2 arm lifts", seg(cb, cb + UP * lift), sb),
        ("2 arm swings", swing, axes),
        ("2 arm sets down", seg(pick + UP * lift, pick), Vector((1, 0, 0))),
        ("3 rollers into the car", seg(pick, Vector((0, pick.y, LIFT_Z))), Vector((1, 0, 0))),
        ("4 lift down", seg(Vector((0, pick.y, LIFT_Z)), Vector((0, yg, LIFT_Z)), .1), Vector((1, 0, 0))),
        ("5 out to the back-of-house", seg(Vector((0, yg, LIFT_Z)), Vector((0, yg, pz))), Vector((1, 0, 0))),
        ("5 across to the counter run", seg(Vector((0, yg, pz)), Vector((cx, yg, pz))), Vector((1, 0, 0))),
        ("6 out onto the counter tray", seg(Vector((cx, yg, pz)), Vector((cx, yg, tz))), Vector((1, 0, 0))),
    ]


def route_check(static, car_frame):
    """Move one route parcel (PJ, shrunk 4 mm so resting contact is not a hit) through every stage against the static
    model; ride the empty car between its stops; check the arm reaches every point it carries the parcel through."""
    from mathutils.bvhtree import BVHTree
    st = bvh({("%d_%s" % (i, k)): acc for i, accs in enumerate(static) for k, acc in accs.items()})
    car_v = [tuple(v) for v in car_frame_verts(car_frame)]
    car_f = [f for acc in car_frame.values() for f in acc.f]

    def car_at(yc):
        off = B((0, yc, LIFT_Z))
        return BVHTree.FromPolygons([(x + off[0], y + off[1], z + off[2]) for x, y, z in car_v], car_f)

    def pbox(c, ts):
        acc = Acc()
        gbox(acc, c, ts, UP, ts.cross(UP), tuple(s - .008 for s in PJ))
        return BVHTree.FromPolygons(acc.v, acc.f)

    # the check must be able to fail: a parcel inside the counter wall and the car sunk into the pit both hit
    if not (pbox(Vector((CTR_X, .6, SHOP_Z)), Vector((1, 0, 0))).overlap(st) and car_at(.6).overlap(st)):
        raise SystemExit("route check self-test: known collisions were not detected")
    fails = []
    O, _ = arm_base(ROUTE["arm"])
    roof_car, gnd_car = car_at(T_ROOF + CAR_FLOOR), car_at(T_GND + CAR_FLOOR)
    for name, pts, ts in route_points():
        hits = 0
        for i, p in enumerate(pts):
            b = pbox(p, ts[i] if isinstance(ts, list) else ts)
            hit = bool(b.overlap(st))
            if name.startswith("3"):
                hit |= bool(b.overlap(roof_car))
            if name.startswith("5"):
                hit |= bool(b.overlap(gnd_car))
            hits += hit
        print("ROUTE %-30s %3d positions, %d hits" % (name, len(pts), hits))
        if hits:
            fails.append(name)
        if name.startswith(("1", "2")):
            ds = [arm_ik(O, p)[4] for p in pts]
            print("ROUTE %-30s arm reach %.3f..%.3f m of %.3f" % ("", min(ds), max(ds), ARM_L1 + ARM_L2))
    hits = 0
    y = T_GND + CAR_FLOOR
    while y <= T_ROOF + CAR_FLOOR + 1e-6:
        hits += bool(car_at(y).overlap(st))
        y += .1
    print("ROUTE %-30s car %.2f..%.2f m, %d hits" % ("4 empty car rides the shaft", T_GND + CAR_FLOOR, T_ROOF + CAR_FLOOR, hits))
    if hits:
        fails.append("car ride")
    # hand-over levels measured on the geometry: highest vertex under each parcel path, between the guide rails
    verts3 = [(v[0], v[2], -v[1]) for accs in static for acc in accs.values() for v in acc.v]

    def top_in(x0, x1, z0, z1, y0, y1):
        ys = [y for x, y, z in verts3 if x0 < x < x1 and z0 < z < z1 and y0 < y < y1]
        return max(ys) if ys else float("nan")
    car_floor = max(v[2] for v in car_v if -.32 < v[2] < -.2)     # floor plate top (Blender z = three.js y)
    print("ROUTE levels (m): roof rollers %.3f, roof sill %.3f, car floor at the roof stop %.3f | car floor at the ground "
          "stop %.3f, ground sill %.3f, back-of-house rollers %.3f, counter tray %.3f" % (
              top_in(-.27, .27, 4.4, 4.6, T_ROOF - .1, T_ROOF + .02), top_in(-.31, .31, 5.59, 5.75, T_ROOF - .1, T_ROOF + .02),
              T_ROOF + CAR_FLOOR + car_floor, T_GND + CAR_FLOOR + car_floor,
              top_in(-.31, .31, 5.54, 5.75, T_GND - .1, T_GND + .02), top_in(-.27, .27, 4.8, 4.95, T_GND - .1, T_GND + .02),
              top_in(CTR_X - .41, CTR_X + .41, 5.11, 5.53, T_GND - .1, T_GND + .02)))
    print("ROUTE car fit: parcel %.2f x %.2f x %.2f m in a car %.2f x %.2f clear, %.2f m clear height"
          % (PJ[0], PJ[2], PJ[1], 2 * (.29 - .045), 2 * (.29 - .045), 2 * CAR_FLOOR))
    if fails:
        raise SystemExit("route blocked: " + ", ".join(fails))


def car_frame_verts(car):
    return [v for acc in car.values() for v in acc.v]


def write_flow():
    """Arrow polylines and labels for render_flow.py (three.js coords), from the same route points."""
    import json
    st = route_points()
    cb, _ = ROUTE["bay"]
    up = lambda pts, h: [list(p + UP * h) for p in pts]
    pz, cx, tz = ROUTE["gnd"]
    yg = T_GND + .45
    flow = [
        {"label": "① 卸貨定位台", "pts": [list(cb + UP * 1.7), list(cb + UP * .45)]},
        {"label": "② 機械臂", "pts": up(st[2][1][::4], .35)},
        {"label": "③ 屋頂交接平台・貨梯門", "pts": [list(ROUTE["pick"] + UP * .4), [0, T_ROOF + .4, LIFT_Z]]},
        {"label": "④ 貨梯", "pts": [[0, T_ROOF + .4, LIFT_Z + .8], [0, T_GND + .6, LIFT_Z + .8]]},
        {"label": "⑤ 地面後勤區", "pts": [[0, yg, LIFT_Z], [0, yg, pz], [cx, yg, pz], [cx, yg, SHOP_Z - .1]]},
        {"label": "⑥ 取貨櫃台", "pts": [[cx, yg, SHOP_Z], [cx, yg, SHOP_Z + 1.1]]},
    ]
    path = os.path.join(HERE, "q07b-flow.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(flow, f, ensure_ascii=False, indent=1)
    print("FLOW", path)


def main():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    rng = random.Random(2127)
    MATS.update(make_materials())
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    asset_col = bpy.data.collections.new("Q07B_Asset")
    prev_col = bpy.data.collections.new("Q07B_Preview")
    scene.collection.children.link(asset_col)
    scene.collection.children.link(prev_col)

    root = bpy.data.objects.new("Q07B_PickupTower", None)
    root.empty_display_size = 2
    asset_col.objects.link(root)

    shell = Accs()
    build_shell(shell)
    mount, mech, show_roof = build_roof_kit(shell, rng)
    # arms: triangle count; the parts above the bearing (which sits in its own pedestal) must not touch the deck,
    # table, rollers, arcade or pallets
    hits_roof = len(bvh(mech).overlap(bvh(shell)))
    print("ARM_TRIS per arm %d (mount %d, mech %d), three arms %d" % (
        (tri_count(mount) + tri_count(mech)) // len(ARM_ANGLES), tri_count(mount) // len(ARM_ANGLES),
        tri_count(mech) // len(ARM_ANGLES), tri_count(mount) + tri_count(mech)))
    print("ARM_CLEARANCE arm moving parts x roof, table, rollers and pallets: %d overlapping triangle pairs" % hits_roof)
    if hits_roof:
        print_hits(mech, shell)
        raise SystemExit("arm parts intersect the roof")
    merge_accs(shell, mount)
    port, show_gnd = Accs(), Accs()
    build_port(port, rng, show_gnd)
    hits_canopy = len(bvh(CHECK["canopy"]).overlap(bvh(shell)))
    print("CANOPY_CLEARANCE canopy x shell (arches, legs, chute): %d overlapping triangle pairs" % hits_canopy)
    rings = [build_ring(k, rng) for k in range(N_RING)]
    car = build_carriage(rng)
    route_check([shell, port] + rings, build_carriage(random.Random(0), with_parcel=False))
    write_flow()

    merge_accs(shell, mech)
    merge_accs(shell, show_roof)
    make_obj("Q07B_Shell", shell, asset_col, root)
    merge_accs(port, show_gnd)
    make_obj("Q07B_PickupPort", port, asset_col, root)
    for k in range(N_RING):
        ob = make_obj("Q07B_ShelfRing_%02d" % (k + 1), rings[k], asset_col, root, (0, band_y(k), 0))
        ob["rotation_axis"] = "local Z in Blender (three.js Y): the tower axis"
    ob = make_obj("Q07B_LiftCarriage", car, asset_col, root)
    ob.location = B((0, CAR_Y, LIFT_Z))
    ob["travel"] = ("local Z (centre) from %.2f m (ground stop, floor at %.2f) to %.2f m (roof stop, floor at %.2f)"
                    % (T_GND + CAR_FLOOR, T_GND, T_ROOF + CAR_FLOOR, T_ROOF))

    build_preview(prev_col, rng)

    blend = os.path.join(HERE, ASSET + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
    print("SAVED", blend)
    if "--no-export" in ARGS:
        return
    for ob in bpy.data.objects:
        ob.select_set(False)
    for ob in asset_col.objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    glb = os.path.join(HERE, ASSET + ".glb")
    res = bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True,
                                    export_yup=True, export_animations=False, export_cameras=False,
                                    export_lights=False, export_extras=True, export_materials="EXPORT",
                                    export_image_format="AUTO")
    print("EXPORTED", res, glb, os.path.getsize(glb))


main()
