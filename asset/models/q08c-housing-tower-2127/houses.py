"""Q08-C housing tower: five stand-alone house pods that slot into the tower's bays.

House contract (every type, every rotation):
  local three.js frame, metres. Origin = centre of the bay's corridor edge at slab-top height. Local +z points out of
  the tower (the view side); the entrance is always on the local -z face, opening onto the corridor at z < 0.
  Body |x| <= HW (2.2 m; columns leave +-2.4 m, node collars +-2.25 m), height <= TOP (3.8 m; the beam soffit is 3.9 m).
  The frame line (column/beam face) is at z = BEAM_FACE (6.5); the slab edge at SLAB_EDGE (6.55); a house may project
  to z <= ZMAX (8.4), carried by brackets on the beam face. Lift lugs sit on the chassis sides at z = LUG_Z.
  Interior floor top FL = 0.26 m; the dark chassis is 0 .. 0.2 m.
Front-row houses are placed unrotated with the origin at world (bay centre, level y, 3.0); side houses turn +-90 deg.

Types (HOUSE_TYPES): ellipse_view, rib_vault, stepped_terrace, glass_garden, folded_roof.
build_house(kind, seed, rnd=3) returns an Accs keyed by material role; rnd only affects ellipse_view (the Dream Loop
rounds 0 baseline / 1 shell, windows, entrance, base / 2 frames, furniture, railing, seams / 3 sculpted: leaning shell,
pearl wrap band, 0.55 m window reveal). No house carries people (owner 2026-11-21).
Furniture reuses city-kit-2127 props through modules.kit_prop and the accepted modules.ROLES interior recipe.
"""
import math
import random

from common import (Accs, M, X, Z, arch_ring_z, arch_xy, blob, boolean_diff, disc_x, ellipse_xy, frame_z, loft,
                    obox, prism_x, prism_z, rail, rbox, ring_x, role_view)
from geo_helpers import Acc

HW = 2.2
TOP = 3.8
FL = .26
BEAM_FACE, SLAB_EDGE = 6.5, 6.55
ZMAX = 8.4
LUG_Z = (.8, 4.6)
HOUSE_TYPES = ["ellipse_view", "rib_vault", "stepped_terrace", "glass_garden", "folded_roof"]
LABELS = {"ellipse_view": "橢圓觀景宅", "rib_vault": "肋骨拱頂宅", "stepped_terrace": "階梯露台宅",
          "glass_garden": "玻璃花園宅", "folded_roof": "折板屋頂宅"}
DOOR_X, DOOR_W, DOOR_H = -.9, 1.0, 2.25
DOORS = {"ellipse_view": (-.75, .05), "rib_vault": (-.9, .05), "stepped_terrace": (-.9, .05),
         "glass_garden": (-.9, .05), "folded_roof": (-1.45, .4)}      # door centre x and wall face z, per type


class Turned:
    """Role accessor that yaws and moves geometry: Turned(a, x, y, z, yaw)[role] is a write-only accumulator."""

    def __init__(self, a, x, y, z, yaw):
        self.a, self.p = a, (x, y, z, yaw)

    def __getitem__(self, k):
        return M._TAcc(self.a[k], *self.p)


# --- shared house parts -------------------------------------------------------------------------------------------
def walls_xy(acc, x0, x1, y0, y1, z0, z1, holes=()):
    """Wall in the x-y plane (thickness z0..z1) with rectangular holes (hx0, hx1, hy0, hy1), merged per row band."""
    ys = sorted({y0, y1} | {h[2] for h in holes} | {h[3] for h in holes})
    xs = sorted({x0, x1} | {h[0] for h in holes} | {h[1] for h in holes})
    for j in range(len(ys) - 1):
        cy = (ys[j] + ys[j + 1]) / 2
        run = None
        for i in range(len(xs) - 1):
            cx = (xs[i] + xs[i + 1]) / 2
            hole = any(h[0] < cx < h[1] and h[2] < cy < h[3] for h in holes)
            if not hole and run is None:
                run = xs[i]
            if (hole or i == len(xs) - 2) and run is not None:
                end = xs[i] if hole else xs[i + 1]
                obox(acc, ((run + end) / 2, cy, (z0 + z1) / 2), (end - run, ys[j + 1] - ys[j], z1 - z0))
                run = None


def window(a, x0, x1, y0, y1, zc, depth=.24, t=.08, mull=(), trans=(), glass="h_glass", sill=True, proud=.08):
    """Window in an x-y wall: a framed opening (champagne frame with depth, standing `proud` out of the wall at zc),
    glass set back in the frame, mullions and transoms, and a shell-coloured sill."""
    out = [(x1, y1), (x0, y1), (x0, y0), (x1, y0)]
    inn = [(x1 - t, y1 - t), (x0 + t, y1 - t), (x0 + t, y0 + t), (x1 - t, y0 + t)]
    frame_z(a["h_frame"], out, inn, zc - depth + proud, zc + proud)
    obox(a[glass], ((x0 + x1) / 2, (y0 + y1) / 2, zc - depth / 2 + proud), (x1 - x0 - t, y1 - y0 - t, .02), X, Z)
    for xm in mull:
        obox(a["h_frame"], (xm, (y0 + y1) / 2, zc - depth / 2 + proud), (.05, y1 - y0 - 2 * t, .07), X, Z)
    for ym in trans:
        obox(a["h_frame"], ((x0 + x1) / 2, ym, zc - depth / 2 + proud), (x1 - x0 - 2 * t, .05, .07), X, Z)
    if sill:
        obox(a["h_shell"], ((x0 + x1) / 2, y0 - .04, zc + proud + .05), (x1 - x0 + .16, .07, .16), X, Z)


def base(a, z_front, z_back=.05, hw=HW):
    """Dark chassis with a champagne skirt line, lift lugs, a bearing shoe over the slab edge and, when the house
    projects past the frame, an underside fairing and two diagonal brackets onto the beam face."""
    rbox(a["h_base"], 0, (z_back + z_front) / 2, hw, (z_front - z_back) / 2, 0, .2, r=.22, b=.05)
    for s in (-1, 1):
        obox(a["h_frame"], (s * (hw + .008), .12, (z_back + z_front) / 2), (.016, .04, z_front - z_back - .5), X, Z)
        for zz in LUG_Z:
            obox(a["h_base"], (s * (hw + .01), .1, zz), (.06, .14, .3), X, Z)          # inside the 2.25 m collar gap
    for s in (-1, 1):                                                          # bearing shoes clasp the slab edge
        obox(a["h_base"], (s * 1.55, -.14, SLAB_EDGE + .07), (.5, .3, .14), X, Z)
    if z_front > SLAB_EDGE + .3:
        zf = z_front - .12
        prism_x(a["h_base"], [(SLAB_EDGE + .14, 0), (zf, 0), (zf - .25, -.16), (SLAB_EDGE + .3, -.3), (SLAB_EDGE + .14, -.3)],
                -hw + .25, hw - .25)
        for s in (-1, 1):
            M.limb(a["h_frame"], [(s * 1.55, -.92, BEAM_FACE + .09), (s * 1.55, -.48, (BEAM_FACE + zf) / 2 + .1),
                                  (s * 1.55, -.17, zf - .35)], .07, .06, 5)
            obox(a["h_frame"], (s * 1.55, -.92, BEAM_FACE + .03), (.3, .3, .04), X, Z)       # anchor plate on the beam


def entrance(a, x=DOOR_X, w=DOOR_W, h=DOOR_H, z_wall=.05, recess=.55, wall_t=.18, hood=True):
    """Recessed entrance on the corridor face: reveals, door leaf set back `recess`, champagne portal, canopy with a
    downlight, threshold step down to the corridor, wall lamp and a number plate. The wall itself must leave the
    opening x +- w/2, FL .. FL + h."""
    x0, x1, yt = x - w / 2, x + w / 2, FL + h
    zd = z_wall + recess
    for xx in (x0 - .04, x1 + .04):                                           # reveals
        obox(a["h_shell"], (xx, (FL + yt) / 2, (z_wall + zd) / 2 + .02), (.08, h, recess + .04), X, Z)
    obox(a["h_shell"], (x, yt + .04, (z_wall + zd) / 2 + .02), (w + .16, .08, recess + .04), X, Z)
    obox(a["h_door"], (x, (FL + yt) / 2, zd), (w, h, .05), X, Z)                          # door leaf
    obox(a["h_frame"], (x + w / 2 - .14, 1.05, zd - .05), (.03, .4, .04), X, Z)            # handle
    po = [(x1 + .14, yt + .14), (x0 - .14, yt + .14), (x0 - .14, FL - .02), (x1 + .14, FL - .02)]
    pi = [(x1 + .02, yt + .02), (x0 - .02, yt + .02), (x0 - .02, FL - .02), (x1 + .02, FL - .02)]
    frame_z(a["h_frame"], po, pi, z_wall - .07, z_wall + .02)
    if hood:
        rbox(a["h_shell"], x, z_wall - .26, w / 2 + .4, .33, yt + .18, yt + .3, r=.12, b=.04)
        obox(a["h_lamp"], (x, yt + .175, z_wall - .3), (w * .7, .012, .08), X, Z)
    obox(a["h_deck"], (x, .1, z_wall - .2), (w + .5, .2, .44), X, Z)                      # threshold step
    obox(a["h_lamp"], (x1 + .34, 1.95, z_wall - .03), (.1, .22, .05), X, Z)


def interior(a, x0, x1, z0, z1, ceil, glow_x=None, back_glow=True):
    """Warm interior (accepted ROLES recipe): floor, a lit back panel beside the door, a ceiling light."""
    obox(a["in_floor"], ((x0 + x1) / 2, FL - .03, (z0 + z1) / 2), (x1 - x0, .06, z1 - z0), X, Z)
    if back_glow:
        gx0, gx1 = glow_x or (DOOR_X + DOOR_W / 2 + .2, x1 - .1)
        obox(a["in_glow"], ((gx0 + gx1) / 2, (FL + ceil) / 2, z0 + .02), (gx1 - gx0, ceil - FL - .5, .03), X, Z)
    obox(a["in_glow"], ((x0 + x1) / 2, ceil - .02, (z0 + z1) / 2), (min(1.6, x1 - x0 - .6), .03, min(2.4, z1 - z0 - .8)), X, Z)


def leafy(a, x, y, z, r=.3, n=3, seed=0, bloom=True):
    for i in range(n):
        ang = 2 * math.pi * i / n + seed
        blob(a["bloom" if bloom and i == 0 else "leaf"], (x + r * .6 * math.cos(ang), y + .05 * i, z + r * .6 * math.sin(ang)),
             (r, r * .75, r), sub=1, seed=seed + i, noise=.2)


# --- 1. ellipse view house ------------------------------------------------------------------------------------------
E_A, E_BT, E_BB, E_CY, E_P, E_N = 2.15, 1.77, 2.2, 1.99, 2.5, 28     # half width, upper / lower half height
E_WIN = (1.5, 1.25, 1.9)            # main window opening: half width, half height, centre height
E_DOOR = -.75
PORTS = (6.55,)                     # porthole centre along z, past the frame line (r0-r2 renders had a second at 3.0)


E_SKEW = .55                        # rnd 3: the right shoulder drops, so the crown leans to the left like a shell


def _ept(t, s, k=0.0, skew=0.0):
    c, sn = math.cos(t), math.sin(t)
    b = (E_BT if sn > 0 else E_BB) * s - k
    x = (E_A * s - k) * math.copysign(abs(c) ** (2 / E_P), c)
    y = E_CY + b * math.copysign(abs(sn) ** (2 / E_P), sn)
    if skew:
        y -= skew * max(0.0, x / E_A) ** 1.5 * max(0.0, (y - E_CY) / E_BT)
    return x, y


def _eout(s, k=0.0, floor=.2, skew=0.0):
    """Shell section: a superellipse with a fuller lower half, cut flat at `floor` so the pod sits on its chassis."""
    out = []
    for i in range(E_N):
        x, y = _ept(2 * math.pi * i / E_N, s, k, skew)
        out.append((x, max(floor, y)))
    return out


def _esec(s, z, k=0.0, skew=0.0):
    return [(x, y, z) for x, y in _eout(s, k, .2 if k == 0 else .23, skew)]


def _escale(z, prof):
    for (z0, s0), (z1, s1) in zip(prof, prof[1:]):
        if z0 <= z <= z1:
            return s0 + (s1 - s0) * (z - z0) / (z1 - z0)
    return prof[-1][1]


def _shell_band(acc, prof, zn, skew, z0=7.1, n=15):
    """Pearl outer band that wraps the shell like a seashell lip: it springs from the left flank, runs over the crown
    and ends on the right flank; it thins from 0.34 to 0.12 m and its front edge is cut on a slant, reaching 0.45 m past
    the nose on the left and stopping 0.35 m short of it on the right. It starts past the frame line and the side portholes (z0)."""
    secs = []
    for i in range(n):
        u = i / (n - 1)
        t = math.radians(192 - 212 * u)
        th, z1 = .34 - .22 * u, zn + .45 - .8 * u
        row = []
        for z in (z0, z1):
            x, y = _ept(t, _escale(min(z, zn), prof), 0, skew)
            y = max(.2, y)
            r = math.hypot(x, y - E_CY)
            k = (r + th) / r
            row.append(((x, y, z), (x * k, E_CY + (y - E_CY) * k, z)))
        (i0, o0), (i1, o1) = row
        secs.append([i0, o0, o1, i1])
    loft(acc, secs)


def _ewin(z, grow=0.0):
    """Main window ellipse with one point per shell outline point, at the same parameter angle (pairs with the loft)."""
    a, b, cy = E_WIN[0] + grow, E_WIN[1] + grow, E_WIN[2]
    return [(a * math.cos(2 * math.pi * i / E_N), cy + b * math.sin(2 * math.pi * i / E_N), z) for i in range(E_N)]


def ellipse_view(a, rng, rnd=3):
    """Streamlined white shell, one large elliptical main window looking out, round portholes on both sides; a sofa
    and floor lamp face the window."""
    if rnd == 0:                                                            # baseline: one closed shell, pasted windows
        prof = [(.05, .94), (.35, 1), (5.6, 1), (6.4, .96), (6.95, .88), (7.25, .78)]
        loft(a["h_shell"], [[(x, y - .2, z) for x, y, _ in _esec(s, z)] for z, s in prof])
        wa, wb, wc = 1.45, 1.05, 1.85
        prism_z(a["h_glass"], ellipse_xy(wa, wb, wc, 32), 7.25, 7.27)
        frame_z(a["h_frame"], ellipse_xy(wa + .1, wb + .1, wc, 32), ellipse_xy(wa, wb, wc, 32), 7.24, 7.29)
        for s in (-1, 1):
            for zz in (2.2, 3.8):
                disc_x(a["h_glass"], 1.95, zz, .38, s * 2.14, s * 2.16)
                ring_x(a["h_frame"], 1.95, zz, .44, .38, s * 2.13, s * 2.17)
        obox(a["h_door"], (E_DOOR, 1.1, .04), (1.0, 2.2, .03), X, Z)
        return
    # R1: a hollow shell (outer skin, a deep lip round the main window opening, inner skin), seams in R2
    zn = 7.8                                                                  # nose face, 1.25 m past the frame line
    sk = E_SKEW if rnd >= 3 else 0.0
    lip = .55 if rnd >= 3 else .3                                             # rnd 3: the window sits deeper in the shell
    prof = [(.05, .95), (.3, 1.0), (6.2, 1.0), (6.95, .97), (7.5, .92), (zn, .86)]
    scale = prof
    if rnd >= 2:                                                            # a recessed panel joint round the shell
        prof = prof[:2] + [(4.78, 1.0), (4.8, .988), (4.86, .988), (4.88, 1.0)] + prof[2:]
    shell = Acc()
    secs = [_esec(s, z, 0, sk) for z, s in prof]
    secs += [_ewin(zn), _ewin(zn - lip)]                                      # the opening's lip
    secs += [_esec(.92, zn - lip - .2, .14, sk), _esec(1.0, 6.7, .14, sk), _esec(1.0, .05, .14, sk)]
    loft(shell, secs, wrap=True)
    cut = Acc()
    for zz in PORTS:                                                          # portholes go through the wall
        disc_x(cut, 2.12, zz, .41, -2.6, 2.6, 12)
    boolean_diff(shell, cut)
    _merge(a["h_shell"], shell)
    back = Acc()
    prism_z(back, _eout(1.0, .14, .2, sk), .05, .23)
    door = Acc()
    obox(door, (E_DOOR, FL + DOOR_H / 2 - .05, .14), (DOOR_W, DOOR_H + .1, .6), X, Z)
    boolean_diff(back, door)
    _merge(a["h_shell"], back)
    for s in (-1, 1):                                                         # porthole tubes through the wall
        for zz in PORTS:
            ring_x(a["h_frame"], 2.12, zz, .5 if rnd >= 2 else .46, .4 if rnd < 2 else .36, s * 1.95, s * 2.28, 12)
            disc_x(a["h_glass"], 2.12, zz, .405, s * 2.07, s * 2.09, 12)
    if rnd >= 3:
        _shell_band(a["h_pearl"], scale, zn, sk)
    else:                                                                     # brow over the main window
        ang = [math.radians(18 + 144 * i / 10) for i in range(11)]
        arc_o = [((E_WIN[0] + .36) * math.cos(t), E_WIN[2] + (E_WIN[1] + .34) * math.sin(t)) for t in ang]
        arc_i = [((E_WIN[0] + .2) * math.cos(t), E_WIN[2] + (E_WIN[1] + .18) * math.sin(t)) for t in ang]
        prism_z(a["h_shell"], arc_o + arc_i[::-1], zn - .25, zn + .4)
    base(a, 7.6)
    entrance(a, x=E_DOOR, z_wall=.05, recess=.55)
    interior(a, -1.3, 1.3, .23, 7.2, 3.2, glow_x=(E_DOOR + DOOR_W / 2 + .2, 1.75))
    if rnd >= 2:
        # main window: deep champagne frame standing proud of the lip, glass set back, one mullion and a guard rail
        zw = zn - (.5 if rnd >= 3 else 0)                                     # rnd 3: frame and glass at the reveal's back
        frame_z(a["h_frame"], [p[:2] for p in _ewin(0, .1 if rnd < 3 else 0)], [p[:2] for p in _ewin(0, -.06)],
                zw - .32, zw + (.1 if rnd < 3 else .04))
        prism_z(a["h_glass"], [p[:2] for p in _ewin(0, -.04)], zw - .26, zw - .24)
        obox(a["h_frame"], (.45, E_WIN[2], zw - .2), (.06, 2 * E_WIN[1] - .1, .08), X, Z)
        # viewing balcony on the chassis nose: deck, curved glass rail, planter
        zb = 7.6
        pts = [(1.95 * math.cos(t), .2, zb + .62 * math.sin(t)) for t in [math.radians(180 * i / 7) for i in range(8)]]
        loft(a["h_deck"], [[(x, y0, z) for x, _, z in pts] + [(x * .9, y0, zb) for x, _, z in pts[::-1]] for y0 in (.12, .24)])
        for p0, p1 in zip(pts, pts[1:]):
            rail(a["h_frame"], a["h_glass"], a["h_frame"], (p0[0], .24, p0[2]), (p1[0], .24, p1[2]), h=1.0, step=9, post=.04)
        obox(a["h_shell"], (-1.05, .43, zb + .25), (.8, .38, .3), X, Z)
        leafy(a, -1.05, .68, zb + .25, .2, 3, seed=1)
        # furniture: sofa and lamp face the window, rug, plant, bookshelf on the back wall
        ctx = M.Ctx(role_view(a), rng)
        M.kit_prop(ctx, "rug", .1, FL, 6.3)
        M.kit_prop(ctx, "sofa", .1, FL, 5.6)
        M.kit_prop(ctx, "floor_lamp", 1.15, FL, 6.15)
        M.kit_prop(ctx, "potted_plant", -1.05, FL, 6.55 if rnd < 3 else 6.2)
        for s in (-1, 1):                                                 # seam line where the shell meets the chassis
            obox(a["h_seam"], (s * 1.5, .215, 3.6), (.06, .03, 6.7), X, Z)
    else:
        ctx = M.Ctx(role_view(a), rng)
        M.kit_prop(ctx, "sofa", .1, FL - .2, 3.2)


def _merge(dst, src):
    base_i = len(dst.v)
    dst.v += src.v
    dst.f += [tuple(base_i + i for i in f) for f in src.f]


# --- 2. rib vault house ---------------------------------------------------------------------------------------------
RV_L, RV_R = (-2.15, .25), (2.15, 1.25)            # vault feet: glazed to the floor on the left, a low wall on the right
RV_ZF = 6.8                                        # vault front (past the collars), portal to 7.15
RV_PIVOT = (-1.9, .42, 6.4)                       # the ribs' common foot, front-left, inside the collar gap


def _bez(p0, c1, c2, p1, t):
    m = 1 - t
    return tuple(m ** 3 * a + 3 * m * m * t * b + 3 * m * t * t * c + t ** 3 * d for a, b, c, d in zip(p0, c1, c2, p1))


def _rv_prof(n=14, off=0.0):
    """Leaning vault section (x, y): steep on the left up to a crown at x ~ -0.8, then a long fall to the right foot;
    off pushes it out along its normal (negative = in)."""
    pts = [_bez(RV_L, (-2.3, 4.2), (.2, 5.0), RV_R, i / (n - 1)) for i in range(n)]
    if not off:
        return pts
    out = []
    for i, (x, y) in enumerate(pts):
        (xa, ya), (xb, yb) = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        tx, ty = xb - xa, yb - ya
        ln = math.hypot(tx, ty)
        out.append((x - ty / ln * off, y + tx / ln * off))
    return out


def rib_vault(a, rng):
    """Leaning fan vault: a pink glass vault, steep on the left and falling long to the right, under four white ribs
    that fan out from one foot at the front-left corner; the glazing bars follow the ribs and the front glazing bars
    radiate from the same corner. Deep white portal on the vault's front edge. Dining table under a pendant."""
    prof = _rv_prof()
    inner = _rv_prof(off=-.04)
    prism_z(a["h_pink"], prof + inner[::-1], .3, RV_ZF)
    obox(a["h_shell"], (HW - .1, (.2 + RV_R[1]) / 2, (.05 + RV_ZF) / 2), (.2, RV_R[1] - .2, RV_ZF - .05), X, Z)  # right low wall
    obox(a["h_shell"], (RV_L[0] + .08, .23, (.3 + RV_ZF) / 2), (.16, .06, RV_ZF - .3), X, Z)                    # left glazing curb
    portal_o = _rv_prof(off=.2)
    prism_z(a["h_shell"], portal_o + prof[::-1], RV_ZF, RV_ZF + .35)
    rib = _rv_prof(off=.07)
    xl, xr = rib[0][0], rib[-1][0]
    px, py, pz = RV_PIVOT

    def fan(z_end, k):                                                        # from the knuckle, then on the vault
        return [(px, py, pz)] + [(x, y, pz + (z_end - pz) * ((x - xl) / (xr - xl)) ** .8) for x, y in rib[1:]]
    ends = [5.0, 3.3, 1.7, .4]
    for z_end in ends:                                                        # structural ribs from the one foot
        M.limb(a["h_shell"], fan(z_end, 1), .1, .07, 5)
    for z_a, z_b in zip([pz] + ends, ends):                                   # glazing bars between the ribs
        M.limb(a["h_frame"], fan((z_a + z_b) / 2, 1), .025, .025, 4)
    M.ell(a["h_shell"], (px, py, pz), (.26, 0, 0), (0, .2, 0), (0, 0, .26), 8, 5)          # the ribs' knuckle
    zg = RV_ZF + .15                                                          # front glazing in the portal
    front = _rv_prof(off=-.06)
    prism_z(a["h_pink"], front + [(RV_R[0] - .06, FL), (RV_L[0] + .1, FL)], zg - .01, zg + .01)
    for t in (.3, .5, .7, .88):                                               # bars radiating from the same corner
        x, y = _rv_prof(n=51, off=-.06)[int(t * 50)]
        M.limb(a["h_frame"], [(RV_L[0] + .12, FL + .04, zg + .02), (x, y, zg + .02)], .035, .035, 4)
    back = Acc()                                                              # back wall with the entrance opening
    prism_z(back, _rv_prof(off=-.02) + [(RV_R[0] - .02, .2), (RV_L[0] + .02, .2)], .05, .25)
    door = Acc()
    obox(door, (DOOR_X, FL + DOOR_H / 2 - .05, .15), (DOOR_W, DOOR_H + .1, .6), X, Z)
    boolean_diff(back, door)
    _merge(a["h_shell"], back)
    base(a, RV_ZF + .45)
    entrance(a)
    interior(a, -1.6, 1.95, .26, RV_ZF - .25, 3.0)
    obox(a["h_deck"], (0, .23, RV_ZF + .2), (2 * HW - .1, .06, .3), X, Z)
    ctx = M.Ctx(role_view(a), rng)
    M.kit_prop(ctx, "meeting_table", .1, FL, 4.0, math.pi / 2)
    M.kit_prop(ctx, "pendant_lamp", -.3, 3.25 - 1.2, 4.0)
    M.kit_prop(ctx, "kitchen_counter", 1.05, FL, .65, 0)
    M.kit_prop(ctx, "potted_plant", 1.55, FL, 6.2)


# --- 3. stepped terrace house ---------------------------------------------------------------------------------------
def _curve(p0, c1, c2, p1, n=11):
    return [_bez(p0, c1, c2, p1, i / (n - 1)) for i in range(n)]


def _band(acc, curve, w, y0, y1, off=0.0):
    """Solid strip of width w along a plan curve (x, z), offset `off` toward the curve's inside (its -z side)."""
    secs = []
    n = len(curve)
    for i, (x, z) in enumerate(curve):
        (xa, za), (xb, zb) = curve[max(0, i - 1)], curve[min(n - 1, i + 1)]
        ln = math.hypot(xb - xa, zb - za)
        nx, nz = (zb - za) / ln, -(xb - xa) / ln
        o, q = (x + nx * off, z + nz * off), (x + nx * (off + w), z + nz * (off + w))
        secs.append([(o[0], y0, o[1]), (q[0], y0, q[1]), (q[0], y1, q[1]), (o[0], y1, o[1])])
    loft(acc, secs)


def _planter_edge(a, curve, y, seed, w=.42, h=.5, glass=.42):
    """Terrace edge: a white planter trough on the curve with soil and leaves, a glass guard on its inner lip."""
    _band(a["h_shell"], curve, w, y, y + h)
    _band(a["soil"], curve[1:-1], w - .12, y + h - .03, y + h + .01, .06)
    _band(a["h_glass"], curve, .02, y + h, y + h + glass, w - .03)
    for i in range(1, len(curve) - 1, 2):
        x, z = curve[i]
        (xa, za), (xb, zb) = curve[i - 1], curve[i + 1]
        ln = math.hypot(xb - xa, zb - za)
        blob(a["bloom" if i % 4 == 1 else "leaf"], (x + (zb - za) / ln * w / 2, y + h + .12, z - (xb - xa) / ln * w / 2),
             (.3, .2, .24), sub=1, seed=seed + i, noise=.2)


def stepped_terrace(a, rng):
    """Two staggered curved terraces stepping down to the view: a tall back block; a glazed living step whose roof
    sweeps out as an upper terrace bulging to the left; a thick lower terrace bulging further out to the right. Both
    curved edges are planter troughs with a glass guard; a bench on the lower terrace."""
    zb, zm = 3.3, 5.3                                                         # back block | living step front
    ym = 2.55
    for x0, x1 in ((-HW, DOOR_X - DOOR_W / 2), (DOOR_X + DOOR_W / 2, HW)):   # back wall round the entrance
        obox(a["h_shell"], ((x0 + x1) / 2, (.2 + TOP - .05) / 2, .14), (x1 - x0, TOP - .25, .18), X, Z)
    obox(a["h_shell"], (DOOR_X, (FL + DOOR_H + TOP - .05) / 2, .14), (DOOR_W, TOP - .05 - FL - DOOR_H, .18), X, Z)
    rbox(a["h_shell"], 0, (.05 + zb) / 2, HW, (zb - .05) / 2, TOP - .3, TOP - .02, r=.25, b=.08)     # roof slab
    for s in (-1, 1):
        obox(a["h_shell"], (s * (HW - .09), (.2 + TOP - .3) / 2, (.05 + zb) / 2), (.18, TOP - .5, zb - .05), X, Z)
        obox(a["h_shell"], (s * (HW - .09), (.2 + ym) / 2, (zb + zm) / 2), (.18, ym - .2, zm - zb), X, Z)
    walls_xy(a["h_shell"], -HW + .18, HW - .18, ym, TOP - .3, zb - .09, zb + .09, [(-1.4, 1.4, ym + .02, TOP - .45)])
    window(a, -1.4, 1.4, ym + .02, TOP - .45, zb + .09, mull=(-.45, .45), sill=False)      # door-window to the upper deck
    walls_xy(a["h_shell"], -HW + .18, HW - .18, .2, ym - .26, zm - .1, zm + .08, [(-1.75, 1.75, FL, ym - .4)])
    window(a, -1.75, 1.75, FL, ym - .4, zm + .08, mull=(-.6, .6), trans=(), sill=False)       # living-step glazing
    # upper terrace: the living step's roof sweeps out past the glazing, bulging to the left
    up = _curve((-2.15, 4.6), (-2.1, 6.9), (.6, 6.7), (2.15, 4.4))
    loft(a["h_shell"], [[(x, y, z) for x, z in up + [(2.15, zb), (-2.15, zb)]] for y in (ym - .28, ym)])
    loft(a["h_deck"], [[(x, y, z) for x, z in up[1:-1] + [(2.0, zb + .1), (-2.0, zb + .1)]] for y in (ym, ym + .03)])
    _planter_edge(a, up, ym, 10)
    # lower terrace: a thick curved slab bulging out to the right, carried on two brackets from the beam face
    lo = _curve((-2.15, zm), (-1.9, 7.4), (1.9, 9.1), (2.15, 6.1))
    loft(a["h_shell"], [[(x, y, z) for x, z in lo + [(2.15, zm)]] for y in (.02, .26)])
    _band(a["h_shell"], [p for p in lo if p[1] > 6.75], .35, -.2, .03)        # deep fascia past the slab edge
    loft(a["h_deck"], [[(x, y, z) for x, z in lo[1:-1] + [(2.1, zm + .05)]] for y in (.26, .29)])
    _planter_edge(a, lo, .26, 20, h=.55)
    base(a, 5.4)
    for x in (-.4, 1.3):
        M.limb(a["h_frame"], [(x, -.92, BEAM_FACE + .09), (x, -.4, 7.0), (x, -.14, 7.7)], .07, .06, 5)
        obox(a["h_frame"], (x, -.92, BEAM_FACE + .03), (.3, .3, .04), X, Z)
    ctx = M.Ctx(role_view(a), rng)
    M.kit_prop(ctx, "bench", .2, .29, zm + .6)
    M.kit_prop(ctx, "cafe_set", .9, .29, 6.6, math.pi / 2)
    entrance(a)
    interior(a, -1.95, 1.95, .23, zm - .2, TOP - .35)
    M.kit_prop(ctx, "sofa", -.3, FL, 3.7)
    M.kit_prop(ctx, "floor_lamp", 1.3, FL, 4.3)


# --- 4. glass garden house ------------------------------------------------------------------------------------------
def glass_garden(a, rng):
    """Living box on the left; on the right a winter garden whose glass roof curves down to the front, with a
    champagne glazing grid, plants, a small tree and a café table."""
    xs, zf, zg = -.15, 6.4, 7.5                                               # split line, box front, garden front
    lt = 3.45
    obox(a["h_shell"], (xs - .08, (.2 + lt) / 2, (.05 + zf) / 2), (.16, lt - .2, zf - .05), X, Z)      # party wall
    obox(a["h_shell"], (-HW + .09, (.2 + lt) / 2, (.05 + zf) / 2), (.18, lt - .2, zf - .05), X, Z)
    rbox(a["h_shell"], (-HW + xs) / 2, (.05 + zf) / 2 + .1, (xs + HW) / 2 + .02, (zf - .05) / 2 + .1, lt - .02, lt + .2, r=.2, b=.07)
    walls_xy(a["h_shell"], -HW + .18, xs - .16, .2, lt, zf - .18, zf, [(-1.85, -.5, .55, 3.0)])
    window(a, -1.85, -.5, .55, 3.0, zf, trans=(2.2,))
    # winter garden: profile in z-y, roof 3.75 at the back curving down to the deck at the front
    prof = [(.05, 3.72)] + [(4.2 + 3.25 * math.sin(math.pi / 2 * i / 10), .26 + 3.46 * math.cos(math.pi / 2 * i / 10)) for i in range(11)]
    sheet = [(z, y) for z, y in prof] + [(z - .03, y - .03) for z, y in prof[::-1]]
    prism_x(a["h_blue"], sheet, xs, HW - .02)
    for xr in (xs + .05, .55, 1.25, HW - .05):                                # curved ribs
        M.limb(a["h_frame"], [(xr, y + .03, z + .02) for z, y in prof], .045, .045, 4)
    for z, y in prof[1::2]:                                                   # glazing bars along x
        obox(a["h_frame"], ((xs + HW) / 2, y + .03, z + .02), (HW - xs, .05, .05), X, Z)
    side = [(.05, .26)] + prof + [(7.45, .26)]
    prism_x(a["h_blue"], side, HW - .03, HW - .01)
    obox(a["h_frame"], (HW - .02, .4, (.05 + zg) / 2), (.06, .3, zg - .05), X, Z)
    for zz in (1.5, 3.0, 4.5):
        top = .26 + 3.46 if zz <= 4.2 else .26 + 3.46 * math.cos(math.asin(min(1, (zz - 4.2) / 3.25)))
        obox(a["h_frame"], (HW - .02, (FL + top) / 2, zz), (.06, top - FL, .06), X, Z)
    obox(a["h_shell"], (HW - .3, .3, zg - .15), (.5, .2, .3), X, Z)
    base(a, zg + .1)
    walls_xy(a["h_shell"], -HW + .02, HW - .02, .2, TOP - .05, .05, .23, [(DOOR_X - DOOR_W / 2, DOOR_X + DOOR_W / 2, FL, FL + DOOR_H)])
    entrance(a)
    interior(a, -HW + .18, xs - .16, .23, zf - .2, lt - .1, glow_x=(DOOR_X + DOOR_W / 2 + .1, xs - .25))
    obox(a["h_deck"], ((xs + HW) / 2, FL - .02, (.3 + zg) / 2), (HW - xs - .05, .05, zg - .4), X, Z)
    ctx = M.Ctx(role_view(a), rng)
    M.kit_prop(ctx, "sofa", -1.2, FL, 3.2, math.pi / 2)
    M.kit_prop(ctx, "floor_lamp", -1.75, FL, 4.9)
    M.kit_prop(ctx, "tree_indoor", 1.3, FL, 2.0)
    M.kit_prop(ctx, "cafe_set", 1.0, FL, 4.6, math.pi / 2)


# --- 5. folded roof house -------------------------------------------------------------------------------------------
def folded_roof(a, rng):
    """Box under a folded plate roof (ridge off-centre, front edge raised), an asymmetric front of a tall slit, a
    square light and a balcony door with a small balcony, and a deeply recessed corner entrance."""
    zf = 6.45
    xr = .9                                                                    # ridge line
    yl, yr, yrr = 2.4, 3.56, 3.0                                               # low eave, ridge, right eave (front)

    def roof_y(x, z):
        k = .4 * (z / zf - 1)                                                 # the fold drops toward the corridor
        return (yl + (yr - yl) * (x + HW) / (xr + HW) if x <= xr else yr - (yr - yrr) * (x - xr) / (HW - xr)) + k

    outline = lambda z: [(HW, .2), (HW, roof_y(HW, z)), (xr, roof_y(xr, z)), (-HW, roof_y(-HW, z)), (-HW, .2)]
    shell = Acc()
    prism_z(shell, outline(0), .05, .23)                                      # back wall
    cut = Acc()
    obox(cut, (-1.3, FL + DOOR_H / 2 - .05, .1), (1.6, DOOR_H + .1, .5), X, Z)    # wide opening of the entry recess
    boolean_diff(shell, cut)
    _merge(a["h_shell"], shell)
    for s in (-1, 1):                                                         # side walls follow the fold
        xw = s * (HW - .09)
        side = [(.05, .2), (.05, roof_y(xw, .05)), (zf, roof_y(xw, zf)), (zf, .2)]
        prism_x(a["h_shell"], side, xw - .09, xw + .09)
    front = Acc()
    loft(front, [[(x, y, zf - .18) for x, y in outline(zf)], [(x, y, zf) for x, y in outline(zf)]])
    holes = Acc()
    for x0, x1, y0, y1 in ((-1.95, -1.45, .55, 2.95), (-1.05, -.35, 1.75, 2.45), (.25, 1.55, FL, 2.5)):
        obox(holes, ((x0 + x1) / 2, (y0 + y1) / 2, zf - .09), (x1 - x0, y1 - y0, .5), X, Z)
    tri = [(xr - .55, 2.62), (xr + .45, 2.62), (xr, roof_y(xr, zf) - .2)]
    prism_z(holes, tri, zf - .4, zf + .2)
    boolean_diff(front, holes)
    _merge(a["h_shell"], front)
    window(a, -1.95, -1.45, .55, 2.95, zf, trans=(1.6,))
    window(a, -1.05, -.35, 1.75, 2.45, zf)
    window(a, .25, 1.55, FL, 2.5, zf, mull=(.9,), sill=False)
    tri_o = [(tri[0][0] - .08, tri[0][1] - .05), (tri[1][0] + .08, tri[1][1] - .05), (tri[2][0], tri[2][1] + .08)]
    frame_z(a["h_frame"], tri_o, tri, zf - .12, zf + .06)
    prism_z(a["h_glass"], tri, zf - .1, zf - .08)
    # folded roof plates with overhang and a champagne fascia
    zo = zf + .85                                                              # the folded plates reach out over the balcony
    for xa, xb in ((-HW - .04, xr), (xr, HW - .02)):
        ya, yb = (roof_y(max(-HW, min(HW, xx)), zf) for xx in (xa, xb))
        pts = [(xa, ya - .4 * (zf + .15) / zf, -.15), (xb, yb - .4 * (zf + .15) / zf, -.15),
               (xb, yb + .4 * (zo - zf) / zf, zo), (xa, ya + .4 * (zo - zf) / zf, zo)]
        loft(a["h_roof"], [[(x, y + .01, z) for x, y, z in pts], [(x, y + .17, z) for x, y, z in pts]])
        ex0, ex1 = pts[3], pts[2]
        M.limb(a["h_frame"], [(ex0[0] + .06, ex0[1] + .1, zo + .02), (ex1[0] - .06, ex1[1] + .1, zo + .02)], .06, .06, 6)
    # recessed corner entrance: a 0.9 m deep pocket behind the wide opening
    zr = .95
    obox(a["h_shell"], (-.42, (FL + 2.6) / 2, (.23 + zr) / 2), (.16, 2.6 - FL, zr - .2), X, Z)
    obox(a["h_shell"], (-1.3, 2.62, (.05 + zr) / 2), (1.76, .16, zr), X, Z)
    entrance(a, x=-1.45, w=1.0, z_wall=zr - .55, recess=.55, hood=False)
    obox(a["h_lamp"], (-1.3, 2.53, .4), (1.2, .02, .4), X, Z)
    obox(a["in_floor"], (-1.3, FL - .02, .5), (1.6, .04, .9), X, Z)
    # balcony on the right
    base(a, zf + .95)
    obox(a["h_deck"], (.95, .23, zf + .5), (2.3, .06, .9), X, Z)
    rail(a["h_frame"], a["h_glass"], a["h_frame"], (-.2, .26, zf + .9), (2.1, .26, zf + .9), h=1.05, step=1.15, glass=False)
    for xx in (-.2, 2.1):
        rail(a["h_frame"], a["h_glass"], a["h_frame"], (xx, .26, zf + .05), (xx, .26, zf + .9), h=1.05, step=1, glass=False)
    for k in range(1, 9):                                                    # vertical balusters
        obox(a["h_frame"], (-.2 + 2.3 * k / 9, .78, zf + .9), (.025, 1.0, .025), X, Z)
    interior(a, -1.95, 1.95, 1.0, zf - .2, 2.7, glow_x=(.2, 1.9))
    ctx = M.Ctx(role_view(a), rng)
    M.kit_prop(ctx, "potted_plant", 1.7, .26, zf + .45)
    M.kit_prop(ctx, "desk_monitor", .7, FL, 4.3, math.pi)
    M.kit_prop(ctx, "chair_office", .7, FL, 3.55)
    M.kit_prop(ctx, "sofa", .5, FL, 1.7)


BUILDERS = {"ellipse_view": ellipse_view, "rib_vault": rib_vault, "stepped_terrace": stepped_terrace,
            "glass_garden": glass_garden, "folded_roof": folded_roof}


def build_house(kind, seed=0, rnd=3):
    rng = random.Random(seed)
    a = Accs()
    for role in M.ROLES:
        a["in_" + role]
    if kind == "ellipse_view":
        ellipse_view(a, rng, rnd)
    else:
        BUILDERS[kind](a, rng)
    return a
