"""Q09-B layout (pure Python, no bpy): shared by the builder, the review renders and the reimport check.

Blender coordinates, real metres. Origin = the main (sea-side) entrance floor at the hall's south edge; the round hall's
centre is C = (0, R_HALL); z up; the sea and the main entrance are toward -y, the service side (prep and dish rooms) is
toward +y. Angles are plan bearings in degrees about C, counter-clockwise from +x: 270 = sea entrance (south),
30 = street entrance, 90 = service door (north).
Design document Q09-B_Afterwork: hall 32 m across, eaves 5 m; kitchen 8 m across under the exhaust tower; a 2.5 m serving
ring round it; six 4.8 x 1.1 m long tables set radially, the passages between them reaching the outer ring; a two-layer
petal roof (inner and outer rings of pointed translucent petals) on twelve main ribs, carried by a ring beam and slim
perimeter columns; petal tips up to about 13 m, the exhaust outlet at 15 m; the copper hood modelled apart from the
load-bearing members.
"""
import math

R_HALL = 16.0
C = (0.0, R_HALL)
EAVE = 5.0                               # ring-beam top / eave height
RING_R = 15.6                            # ring beam and perimeter columns
N_RIB = 12                               # main ribs, perimeter columns and outer petals on bearings 15, 45, ..., 345
RIB_OFF = 15.0                           # so the entrance (30, 270) and service (90) axes pass between columns
INNER_COLS = 6                           # tree columns just outside the serving ring, bearings 0, 60, ..., 300
INNER_COL_R = 6.9

KITCHEN_R = 4.0                          # 8 m kitchen (counter outer face)
SERVE_R = (4.0, 6.5)                     # 2.5 m serving ring
HEARTH_R = 1.3
COUNTER_GAP = 90.0                       # staff opening in the counter ring, toward the service door

TABLE = (4.8, 1.1)                       # long table, length x width
TABLE_R = (8.3, 13.1)                    # radial extent of each table
TABLE_BEARINGS = tuple(60.0 * k for k in range(6))
SEATS_PER_SIDE = 4

ENTRANCES = {"sea": 270.0, "street": 30.0}
SERVICE_DOOR = 90.0
BOH = (-7.0, 7.0, 33.0, 40.0)            # back-of-house block (prep room, dish room): x0 x1 y0 y1

# hood and exhaust (not load-bearing)
HOOD = (3.7, 3.1, 1.0, 5.6)              # bottom radius, bottom z, top radius, top z
DUCT_R = .9
TOWER = (9.5, 15.0, 1.15, .95)           # perforated copper exhaust tower: z0, z1 (the outlet), r0, r1

# petals: (count, bearing offset, base r, base z, tip r, tip z, max width, lift of every other petal)
# Round-1 clay check: with the outer ring running in to r 3 the crown was hidden from everywhere inside the hall. Now
# the outer ring starts over the tree columns, leaving the centre open, and the inner crown rises through it with its
# tips reaching out over the outer ring (overlapping it in plan, so rain sheds from the crown onto the outer petals).
# Round 2: with the outer ring starting at r 6.6 the main camera still met the crown only through the outer glass; the
# outer ring now starts at r 8.0 (on arms from the tree columns) so the crown's lower half shows directly over the hood.
OUTER = (12, RIB_OFF, 8.0, 6.7, 18.6, 7.2, 6.4, .32)
INNER = (8, 22.5, 1.45, 6.7, 9.0, 13.0, 6.0, .3)
CROWN_RING_Z = 6.3                    # top of the tree columns: the outer compression ring and the radial struts
# v2 (2026-11-29): read the crown from afar. The inner crown taller and tighter (tips r 7 m, 13.2 m), the outer ring
# lower and reaching further toward the street (from 6.2 m at r 7.6 m down to the eaves, tips r 19.6 m at 6.6 m) and
# narrower, so notches open between the tips and the two layers separate from the ground and from above.
OUTER_V2 = (12, RIB_OFF, 7.6, 6.2, 19.6, 6.6, 5.8, .28)
INNER_V2 = (8, 22.5, 1.45, 6.6, 7.0, 13.2, 5.0, .25)
CROWN_RING_Z_V2 = 5.85
MENU = (3.92, 2.22, 2.84)                # v2 menu ring over the kitchen: radius, bottom z, top z (12 facets facing out)
LIGHTBOX = (259.0, 17.4, .7, .4, 3.2)    # v2 entrance lightbox: bearing, radius, width, bottom z, top z
PETAL_T = .06                           # laminated glass panel thickness
TIP_MAX = 13.0
OUTLET_Z = 15.0

SITE = (-24.0, 24.0, -7.0, 42.0)         # plaza paving exported with the asset (x0, x1, y0, y1)


def at(r, bearing, z=0.0):
    a = math.radians(bearing)
    return (C[0] + r * math.cos(a), C[1] + r * math.sin(a), z)


def outer_spine_z(r):
    """Outer petal / main rib height over plan radius r: falling from the centre to rest on the ring beam, then the
    petal tip turning up past the eave (zero slope at the ring beam on both sides)."""
    z0, ring_z, tip_z = OUTER[3], EAVE + .55, OUTER[5]
    if r <= RING_R:
        return ring_z + (z0 - ring_z) * ((RING_R - r) / (RING_R - OUTER[2])) ** 1.6
    return ring_z + (tip_z - ring_z) * ((r - RING_R) / (OUTER[4] - RING_R)) ** 1.8


def inner_spine(u):
    """Inner petal spine (r, z) for u 0..1: upright cup round the exhaust duct."""
    rb, zb, rt, zt = INNER[2], INNER[3], INNER[4], INNER[5]
    return rb + (rt - rb) * (1 - (1 - u) ** 2), zb + (zt - zb) * u


def table_frame(bearing):
    """Table centre and its radial / tangential unit vectors."""
    rm = sum(TABLE_R) / 2
    a = math.radians(bearing)
    return at(rm, bearing), (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
