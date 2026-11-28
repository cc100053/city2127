"""Q09-A layout (pure Python, no bpy): shared by the builder, the review renders and the reimport check.

Blender coordinates, real metres. Origin = main entrance floor level, centre of the front (sea-side) facade line;
z up; the front faces -y (the sea-side walkway, three.js +z after export), the service side is +y.
Three terraced tiers (design document Q09-A_Afterwork): the ground tier is 30 x 18 m, each tier above steps back 3 m;
floor levels 0, 4.2 and 8.0 m. Ground floor, seen from the front: gym 12 x 9 m on the left, a 3 m storage and plant
band, yoga room 10 x 9 m on the right, each with its own door off the walkway; a side hall at the right end leads to
the stair / lift core at the back, so readers going up never cross the sport rooms.
Every plan outline is a rounded rectangle (big rounded front corners, as in the reference), sampled counter-clockwise.
"""
import math

# --- tiers -------------------------------------------------------------------------------------------------------------------
X0, X1 = -15.0, 15.0
TIERS = (  # (floor z, plan y0 (front), y1 (back), front corner radius, back corner radius, roof-slab top z)
    (0.0, 0.0, 18.0, 7.0, 3.0, 4.2),
    (4.2, 3.0, 18.0, 6.0, 3.0, 8.0),
    (8.0, 6.0, 18.0, 5.0, 3.0, 11.6),
)
SLAB = (.9, .8, .7)                     # eave / slab depth under each roof-slab top (the thick rounded white eaves)
GLASS_IN = .8                           # glass line inset from the slab edge (eave overhang)

# --- ground floor rooms ----------------------------------------------------------------------------------------------------
ROOM_BACK = 9.8                         # back wall of the two rooms (9 m deep inside the glass at y 0.8)
GYM = (-13.5, -1.5)                     # 12 m
BAND = (-1.5, 1.5)                      # 3 m storage and plant band
YOGA = (1.5, 11.5)                      # 10 m (the curved corner beyond x 11.5: mat store and shoe niche)
SIDE_HALL = (11.5, 15.0)                # x range, y ROOM_BACK .. 18; door on the right end face
CORE = (-3.0, 3.0, 12.5, 18.0)          # stair / lift core, x0 x1 y0 y1
CORE_TOP = 13.2
DOOR_W = 1.8                            # clear width of each entrance
GYM_DOOR = (-6.4, -6.4 + DOOR_W)        # x range on the front glass line
YOGA_DOOR = (5.4, 5.4 + DOOR_W)
SIDE_DOOR = (11.0, 12.8)                # y range on the right end face

# --- roof wings ------------------------------------------------------------------------------------------------------------
RIDGE_Y, RIDGE_Z = 6.4, 13.6            # steel ridge beam over the top roof's front edge: centre line y, top z
RIDGE_X = (-8.5, 8.5)
RIDGE_POSTS = (-7.5, -2.5, 2.5, 7.5)
BACK_BEAMS = (-2.5, 2.5)                # x of the two beams carrying the ridge back onto the core top
# Six fixed iridescent wings unfolding along the sea side, in the plane of the main facade (round-1 clay check against
# the reference: aimed out to sea they read edge-on as a crown; the reference shows their broad faces, sweeping up to
# the right in layers, two drooping over the left end). Per wing: (root x, root y, root lift above the ridge top,
# direction in the facade plane deg: 0 = to the right, 90 = up, 180 = to the left, lean toward the sea deg,
# length, max width, tilt deg: the face turned up from facing the sea)
WINGS = (
    (-5.6, 6.1, .30, -8.0, 10.0, 14.5, 3.4, 8.0),
    (-4.8, 6.5, .55, -2.0, 8.0, 16.0, 3.7, 6.0),
    (-4.0, 6.9, .80, 3.0, 7.0, 17.0, 3.8, 5.0),
    (-3.2, 7.3, 1.05, 4.5, 6.0, 16.0, 3.5, 4.0),
    (-6.4, 6.3, .40, 188.0, 10.0, 10.5, 3.0, 8.0),
    (-7.0, 6.8, .70, 175.0, 8.0, 9.5, 2.8, 6.0),
)
# round 2: faces turned nearly upright toward the walkway (tilted up 18-28 deg they read edge-on from the street) and
# stacked front to back, so the light slots between them stay open; the 17 m tip cap leaves a 5 m band over the roof
# --- v2 wings (owner brief 2026-11-29): one wing unfolding the same way from the terraces. Six feathers root on their own
# steel pedestals at the top roof's front-left, all fanning to the right and toward the sea, top feather nearly level,
# each lower one longer, lower and banked further, so the fan steps down over the terraces; tips 9.6-17 m (design: about
# 17 m at most). Narrow feathers overlap near the roots and open sky slots toward the tips.
# (root xyz, tip xyz, max width, bank deg: the face turned from up toward the sea)
# v2 round 1: banked 18-58 deg the feathers lay nearly flat and read as lines from the walkway, and the lowest reached
# past the entrance camera; now banked 62-82 deg (faces nearly upright toward the walkway) and the fan stays over the
# terraces (tips to y -7.2); the tip curl adds about 0.7 m to the tip heights.
# round 2: 2.6-3 m wide they bunched into a thin band from the walkway; now 4-4.8 m (about a third of the building's
# height, as in the reference), overlapping more near the roots, the taper still opening slots toward the tips.
WINGS_V2 = (
    ((-6.6, 8.2, 14.7), (12.8, 5.2, 16.3), 4.8, 62.0),
    ((-6.0, 7.75, 14.4), (15.0, 2.6, 15.2), 4.8, 66.0),
    ((-5.4, 7.3, 14.1), (16.4, -.2, 14.0), 4.6, 70.0),
    ((-4.8, 6.85, 13.8), (16.6, -2.9, 12.8), 4.4, 74.0),
    ((-4.2, 6.4, 13.5), (15.6, -5.3, 11.5), 4.2, 78.0),
    ((-3.6, 6.0, 13.2), (13.6, -7.2, 10.3), 4.0, 82.0),
)
ROOT_BEAM_X = (-7.4, -2.8)              # v2: steel bearing beam carrying the six pedestals (root line)
BACKSTAY_Y = 15.6                       # v2: backstays from each spine down to anchors on the roof behind

# --- v2 signs: the gym's narrow board embedded in a wall slip left of its door, the yoga room's small wood panel right
# of its door (both replace a strip of the front glass)
GYM_SIGN_WALL = (-7.75, -6.75)          # x range of the solid wall slip on the front glass line
GYM_SIGN = (.62, 1.86, .55)             # board width, height, bottom z
YOGA_SIGN_WALL = (7.35, 8.0)            # on the straight front glass (it curves away past x 8)
YOGA_SIGN = (.52, .36, 1.25)            # panel width, height, bottom z

WING_T = .09                            # membrane sandwich thickness
TIP_MAX = 17.0                          # design: the highest wing tip about 17 m

# --- site --------------------------------------------------------------------------------------------------------------------
SITE = (-26.0, 26.0, -14.0, 26.0)       # paving exported with the asset (x0, x1, y0, y1)
WALK_Y = (-9.0, -2.0)                   # sea-side walkway band in front of the doors


def rrect(y0, y1, rf, rb, inset=0.0, step=.5, x0=X0, x1=X1):
    """Counter-clockwise outline of a rounded rectangle (front corners rf, back corners rb), inset inward."""
    x0, x1, y0, y1 = x0 + inset, x1 - inset, y0 + inset, y1 - inset
    rf, rb = max(rf - inset, .05), max(rb - inset, .05)
    pts = []

    def line(a, b):
        n = max(1, int(math.dist(a, b) / step))
        for i in range(n):
            pts.append((a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n))

    def arc(cx, cy, r, a0, a1):
        n = max(4, int(math.radians(abs(a1 - a0)) * r / step))
        for i in range(n):
            a = math.radians(a0 + (a1 - a0) * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    line((x0 + rf, y0), (x1 - rf, y0))
    arc(x1 - rf, y0 + rf, rf, -90, 0)
    line((x1, y0 + rf), (x1, y1 - rb))
    arc(x1 - rb, y1 - rb, rb, 0, 90)
    line((x1 - rb, y1), (x0 + rb, y1))
    arc(x0 + rb, y1 - rb, rb, 90, 180)
    line((x0, y1 - rb), (x0, y0 + rf))
    arc(x0 + rf, y0 + rf, rf, 180, 270)
    return pts


def tier_outline(k, inset=0.0, step=.5):
    z, y0, y1, rf, rb, top = TIERS[k]
    return rrect(y0, y1, rf, rb, inset, step)


def normals(pts):
    """Outward plan normals of a counter-clockwise closed outline."""
    out = []
    n = len(pts)
    for i in range(n):
        a, b = pts[i - 1], pts[(i + 1) % n]
        tx, ty = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(tx, ty) or 1.0
        out.append((ty / ln, -tx / ln))
    return out


def clip(poly, axis, value, keep_less):
    """Sutherland-Hodgman: keep the part of a closed polygon with p[axis] <= value (or >= value)."""
    def inside(p):
        return p[axis] <= value if keep_less else p[axis] >= value
    out = []
    for i in range(len(poly)):
        a, b = poly[i - 1], poly[i]
        ia, ib = inside(a), inside(b)
        if ia != ib:
            t = (value - a[axis]) / (b[axis] - a[axis])
            out.append(tuple(a[k] + (b[k] - a[k]) * t for k in range(2)))
        if ib:
            out.append(b)
    return out


def runs(pts, keep, closed=True):
    """Contiguous runs of outline points that satisfy keep(p) (closed outline: a run may wrap round the start)."""
    flags = [keep(p) for p in pts]
    if all(flags):
        return [list(pts) + ([pts[0]] if closed else [])]
    start = flags.index(False)
    order = list(range(start, len(pts))) + list(range(start))
    out, cur = [], []
    for i in order:
        if flags[i]:
            cur.append(pts[i])
        elif cur:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def front_glass_y():
    return TIERS[0][1] + GLASS_IN
