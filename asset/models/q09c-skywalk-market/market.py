"""Q09-C layout (pure Python, no bpy): shared by the builder, the review renders and the reimport check.

Blender coordinates, real metres. Origin = the main entrance floor at the street mouth, z up, +y into the block toward
the sea-side exit. Design document Q09-C_Afterwork: a 54 x 36 m block; a 6 m entrance street splits at the first fork
into two 4 m curved lanes that run round a 12 x 9 m planted courtyard and meet again before the sea-side exit; six small
shops (about 4 x 5 m, eaves 3.6-5.2 m) along the lanes, pottery on the left and books on the right at the fork; three
light curved canopies; two skywalks branch from between the pottery and the bookshop up to a tree-canopy courtyard at
+5 m (3 m clear decks, pearl cladding on curved beams, glass rails, recessed lights), stairs with landings, a lift from
the courtyard to the ground; the ground fork stays open underneath.

The two lanes follow an ellipse round the courtyard: centre LANE_C, centreline semi-axes LANE_AB, 4 m wide. Lane
parameter t: -90 deg = the fork, 0 = the widest point, +90 deg = where the lanes meet again; side s = -1 (left, pottery)
or +1 (right, books).
"""
import math

BLOCK = (-27.0, 27.0, 0.0, 36.0)          # x0 x1 y0 y1
ENTRY_W = 6.0
LANE_W = 4.0
LANE_C = (0.0, 21.0)
LANE_AB = (11.0, 13.0)                    # fork at y 8, rejoin at y 34
COURT = (12.0, 9.0)                       # ground planted courtyard, centred on LANE_C
EXIT_W = 6.0                              # sea-side exit street, y 34 .. 36

# upper level
DECK_Z = 5.0                              # canopy courtyard and bridge decks
LANDING_Z = 2.5
STAIR_W = 3.0
STAIR_Y0 = 10.9                           # first riser (inside the planted wedge between the lanes)
RISER = 2.5 / 14                          # 14 risers to the landing
TREAD = .30
LANDING = (-1.5, 1.5, 0.0, 0.0)           # x0 x1, y0 / y1 filled in below
LANDING_D = 2.2
PLATFORM_C = (0.0, 24.0)                  # canopy courtyard: an ellipse 14 x 10 m on a ribbed trunk
PLATFORM_AB = (7.0, 5.0)
BRIDGE_W = 3.0                            # clear deck width
BRIDGE_STEPS = 14                         # risers from the landing up to the decks (2.5 m)
RISER_B = (DECK_Z - LANDING_Z) / BRIDGE_STEPS
LIFT = (-1.2, 1.2, 29.2, 31.4)            # glass lift behind the courtyard: x0 x1 y0 y1, door to the rear lane (+y)

# shops. The first two stand either side of the entrance street just before the fork, fronts toward the street, so each
# shows half its front at the first corner (round-1 clay check: placed on the lanes they fell out of the entrance view):
# (kind, centre, facing, depth, width, eave)
# round 3: facing the street square they read edge-on from the entrance; turned 30 deg toward the arriving pedestrian
FIRST_SHOPS = (("pottery", (-7.2, 4.8), (.86, -.5), 5.0, 4.2, 4.0), ("books", (7.2, 4.8), (-.86, -.5), 5.0, 4.2, 4.4))
# the other four along the lanes' outer sides: (side, lane t deg, depth, width, eave, kind), centred 2.5 m beyond the
# lane's outer edge plus a 0.6 m frontage, facing the lane, all inside the 54 x 36 m block
LANE_SHOPS = ((-1, -12.0, 5.0, 4.0, 3.6, "tea"), (1, -12.0, 5.0, 4.0, 5.2, "flowers"),
              (-1, 35.0, 5.0, 4.0, 4.6, "crafts"), (1, 35.0, 5.0, 4.0, 3.8, "cafe"))
# three canopies along the shop (outer) side: the left lane, the right lane, and the rear arc where they meet; posts on
# the outer edge only, so the lanes and the entrance street stay clear
CANOPY_T = ((-1, -60.0, 60.0), (1, -60.0, 60.0))   # (side, t0, t1)
# rear arc, on the courtyard side of the lanes (on the outer side it overhung the block's 36 m edge), in two pieces either
# side of the lift: t ranges from the left lane over the top to the right lane
CANOPY_REAR = ((62.0, 76.0), (104.0, 118.0))
CANOPY_H = 3.3


BRIDGE_SPLIT = 5.5                        # how far the two skywalks swing out sideways from the landing (Bezier handle)

# --- v2 (2026-11-29): signs that lead the way, and the bridges read as the third path ------------------------------------
BRIDGE_SPLIT_V2 = 7.5                     # wider fork: the two decks open apart right from the landing
CLAD_DROP_V2 = .55                        # deeper pearl sides (the bridge reads as a body, not a line); clear under stays > 3 m
# pottery lightbox at the shop's street-side front corner (clear of its vase plinths): x, y, width, height, facing
# round 1: at the street-side corners both fell outside the pedestrian's view; now at the shops' inner front corners
UTSUWA = (-3.6, 4.67, .42, 2.7, (.86, -.5))
# bookshop blade hung from a bracket 0.5 m out of the street-side front corner, across the shopfront: x, y, width,
# height, bottom z, facing (the street side; the back face reads from inside the lane)
KOSHO = (3.81, 5.49, .4, 1.15, 2.2, (.5, -.866))
GARDEN_SCREEN = (2.15, 10.25, .78, .58, 1.15)       # stair screen: x, y, width, height, bottom z; faces the entrance (-y)
# corner wall beyond the left lane's outer edge (between canopy posts), turned toward the fork; from the entrance the
# pottery shop hides part of it: x, y, width, height, bottom z, facing
POSTER = (-10.95, 11.2, .9, 1.24, .55, (.93, -.37))


def lane_point(s, t, off=0.0):
    """Point on lane s at parameter t (deg), offset `off` outward from the centreline (+ = toward the shops)."""
    a = math.radians(t)
    ax, by = LANE_AB[0] + off, LANE_AB[1] + off
    return (LANE_C[0] + s * ax * math.cos(a), LANE_C[1] + by * math.sin(a))


def lane_normal(s, t):
    """Outward unit normal of lane s at t (toward the shops)."""
    a = math.radians(t)
    nx, ny = s * math.cos(a) / LANE_AB[0], math.sin(a) / LANE_AB[1]
    ln = math.hypot(nx, ny)
    return nx / ln, ny / ln


def stair_top_y():
    return STAIR_Y0 + 13 * TREAD


def landing_y():
    y0 = stair_top_y()
    return y0, y0 + LANDING_D


def platform_point(deg, scale=1.0):
    a = math.radians(deg)
    return PLATFORM_C[0] + PLATFORM_AB[0] * scale * math.cos(a), PLATFORM_C[1] + PLATFORM_AB[1] * scale * math.sin(a)


def bridge_path(s, n=40):
    """Plan centreline of skywalk s (cubic Bezier) from the landing's side to the canopy courtyard's side, and its deck
    z: the first part stepped (landing -> deck level), the rest level."""
    y0, y1 = landing_y()
    p0 = (s * (LANDING[1] - .02), (y0 + y1) / 2)
    p3 = platform_point(180.0 if s < 0 else 0.0, 1.0)
    p3 = (p3[0] - s * .05, p3[1] - 1.2)
    c1 = (p0[0] + s * BRIDGE_SPLIT, p0[1] + .2)
    c2 = (p3[0] + s * 3.0, p3[1] - 4.2)
    pts = []
    for i in range(n + 1):
        u = i / n
        x = (1 - u) ** 3 * p0[0] + 3 * (1 - u) ** 2 * u * c1[0] + 3 * (1 - u) * u * u * c2[0] + u ** 3 * p3[0]
        y = (1 - u) ** 3 * p0[1] + 3 * (1 - u) ** 2 * u * c1[1] + 3 * (1 - u) * u * u * c2[1] + u ** 3 * p3[1]
        pts.append((x, y))
    return pts


BRIDGE_N = 100                            # path samples: the 14 treads take exactly 3 segments each (42 of 100)


def bridge_z(u):
    """Deck height along a skywalk at u (use a segment's midpoint): 14 risers over the first 42 % (steps), then level at
    DECK_Z. Round 3: with 56 samples the treads came out 1 or 2 segments deep and the first riser 0.21 m."""
    if u >= .42:
        return DECK_Z
    k = min(BRIDGE_STEPS, int(u / .42 * BRIDGE_STEPS) + 1)
    return LANDING_Z + k * (DECK_Z - LANDING_Z) / BRIDGE_STEPS
