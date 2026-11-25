"""Dimensions of the Q04-C shared-floor residence (design document Q04-C v1.0). Pure maths, no bpy.

Real metres, z up, origin = plaza centre, front -y, sea +y; bearings in degrees counter-clockwise from +x.
"""
import math

# --- frame ---------------------------------------------------------------------------------------------------------------
LEVELS = (6.0, 11.0, 16.0, 21.0, 26.0)            # finished floor of L1..L5
SAMPLE = 2                                        # the sample storey the owner accepted on 2026-11-25; the others vary from it
R_SLAB, T_SLAB, FIN = 24.0, .55, .03              # disc radius, structural + finish depth, finish layer inside it
CEIL = 5.0 - T_SLAB                               # clear height on a typical floor
R_COL, COL_R = 21.0, 1.0
COLS = (0, 60, 120, 180, 240, 300)                # the front bay is 240-300
R_RAIL = 23.78

# --- roof ----------------------------------------------------------------------------------------------------------------
EAVE, R_ROOF, R_OCULUS = 32.0, 27.0, 8.0
BAYS = 48


def roof_z(r):
    """Underside of the radial beams: lowest over the columns, rising to the open centre and a little to the eave."""
    return 31.55 + (.0105 if r < R_COL else .0125) * (r - R_COL) ** 2


# --- main stair: two flights per storey, side by side outside the slab, turning at both ends ---------------------------------
LANE = 1.80                                       # clear width
STR = .10                                         # stringer + balustrade zone each side
RI, RO = 25.22, 27.32                             # flight centre lines (inner goes up to the right, outer back to the left)
RM = (RI + RO) / 2
HALF = LANE / 2 + STR
A0 = 288.0                                        # bearing where both flights leave the floor landings
GOING = .30                                       # on the mean line RM
DA = math.degrees(GOING / RM)
RISE = 1 / 6
R_TURN = RM - (RI - HALF)                         # 2.05: half-disc landing radius
L_FLOOR = 2.15                                    # floor landing length left of A0


def storeys():
    """(z0, z1, risers per flight, bearing of the mid landing) for the five runs."""
    out, zs = [], (0.0,) + LEVELS
    for z0, z1 in zip(zs, zs[1:]):
        n = round((z1 - z0) / RISE / 2)
        out.append((z0, z1, n, A0 + (n - 1) * DA))
    return out


def turn_deg(s):
    return math.degrees(s / RM)


GATE = (A0 - turn_deg(L_FLOOR) + .35, A0 - .35)   # opening in the floor railing (degrees)


# --- typical floor ---------------------------------------------------------------------------------------------------------
TABLES = ((-5.0, -10.0), (5.0, -10.0))
TABLE = (7.2, 1.1, .74)
SEATS, SEAT_PITCH, SEAT_OFF = 8, .85, .55 + .20   # chair centre from the table's long axis
ROWS = {"inner": 13.0, "outer": 18.0}
BED = (.95, 2.0)
PITCH, FIRST = 8.5, 7.75                          # degrees between beds, first bed either side of the centre aisle
CELL_Y = (-1.25, 1.35)                            # curtain track in the bed frame: head side, entrance side
CELL_HW = {"inner": .83, "outer": .95}
TRACK_Z, HEM = 2.56, .12
STATES = ("closed", "half", "tied")
SHAFT = (-12.6, -10.2, -2.3, 2.3)                 # two lifts, doors on the +x face
LIFT_Y = (-1.15, 1.15)
LIFT_DOOR = (1.1, 2.2)
WASH_R = (10.2, 18.4, -3.0, 2.3)                  # right service block
WASH_L = (-18.4, -12.6, -2.3, 2.3)                # left service block, behind the lifts
WALL_H = 2.75
ISLAND = ((3.35, 4.25), (45, 135, 225, 315), 9.5)  # counter radii, gap bearings, half gap (degrees)
RISER_R = .95
RISER2 = (14.3, -1.0, .45)                        # drain riser under the right block


def beds(n=SAMPLE):
    """Beds of level n: (code, row, bearing, x, y, yaw of the bed frame whose +y is the entrance, curtain state)."""
    out = []
    ang = [90 - FIRST - PITCH * k for k in range(7, -1, -1)] + [90 + FIRST + PITCH * k for k in range(8)]
    for row, r in ROWS.items():
        for i, a in enumerate(ang):
            t = math.radians(a)
            yaw = t - math.pi / 2 if row == "inner" else t + math.pi / 2
            st = {"c": "closed", "h": "half", "t": "tied"}[VARY[n][row][i]]
            out.append(("%s%02d" % (row[0].upper(), i + 1), row, a, r * math.cos(t), r * math.sin(t), yaw, st))
    return out


def chairs():
    """(code, x, y, yaw): yaw turns a chair that looks along +y toward its table."""
    out = []
    for t, (cx, cy) in enumerate(TABLES):
        for s in (-1, 1):
            for i in range(SEATS):
                out.append(("T%d%s%d" % (t + 1, "W" if s < 0 else "E", i + 1), cx + s * SEAT_OFF, cy + (i - (SEATS - 1) / 2) * SEAT_PITCH,
                            s * math.pi / 2))
    return out


# --- what differs between the storeys: curtains (c closed, h half, t tied, east to west), edge troughs and benches (bearings),
# pot trees (radius, bearing), round sofa and tree seat (x, y, turn). Nothing stands in the front bay or near the stair gate.
VARY = {
    1: dict(inner="thchtchthcthchtc", outer="chtcthchtchthcht",
            planters=((46, 51.5), (64, 69.5), (110.5, 116), (128.5, 134), (9, 14.5), (349, 354.5), (165.5, 171), (186, 191.5), (225, 231), (308, 314)),
            benches=((24, 32), (148, 156), (204, 212), (328, 336), (98, 106)),
            pots=((9.4, 48), (9.4, 132), (20.0, 342), (19.6, 167.5), (20.2, 222), (19.2, 316)), sofa=(-13.2, -9.4, 30), tree=(13.2, -9.4, 40)),
    2: dict(inner="chthcthtchthcthc", outer="hctchthcthchthct",
            planters=((51, 56.5), (63.5, 69), (111, 116.5), (123.5, 129), (3.5, 9), (351, 356.5), (171, 176.5), (183.5, 189), (230, 236), (304, 310)),
            benches=((26, 34), (146, 154), (206, 214), (326, 334), (86, 94)),
            pots=((9.2, 62), (9.2, 118), (19.6, 12.5), (19.6, 167.5), (19.2, 228), (19.2, 316)), sofa=(13.2, -9.4, 150), tree=(-13.2, -9.4, 0)),
    3: dict(inner="htcthchtcthchtht", outer="tchthctchthcthch",
            planters=((51, 56.5), (70, 75.5), (104.5, 110), (123.5, 129), (3.5, 9), (344, 349.5), (171, 176.5), (190.5, 196), (231, 236.5), (303.5, 309)),
            benches=((20, 28), (142, 150), (210, 218), (318, 326), (86, 94)),
            pots=((9.2, 72), (9.2, 118), (19.6, 12.5), (20.0, 198), (19.2, 214), (20.0, 335)), sofa=(12.6, -11.2, 140), tree=(-12.4, -11.2, 200)),
    4: dict(inner="cthchthctchthchc", outer="htchctchthctchth",
            planters=((49, 54.5), (63.5, 69), (110, 115.5), (131, 136.5), (11, 16.5), (351, 356.5), (163, 168.5), (183.5, 189), (221, 227), (313, 319)),
            benches=((28, 36), (150, 158), (200, 208), (330, 338), (78, 86)),
            pots=((9.4, 54), (9.4, 108), (20.0, 342), (20.0, 198), (18.5, 250), (18.5, 312)), sofa=(-12.8, -10.4, 20), tree=(13.2, -8.6, 110)),
    5: dict(inner="tchthcthctchthtc", outer="cthcthtchtcthcht",
            planters=((44, 49.5), (71, 76.5), (103.5, 109), (125, 130.5), (6, 11.5), (346.5, 352), (168, 173.5), (188, 193.5), (229, 235), (305, 311)),
            benches=((30, 38), (138, 146), (212, 220), (322, 330), (92, 100)),
            pots=((9.2, 66), (9.4, 126), (19.6, 12.5), (19.6, 167.5), (20.2, 226), (18.5, 314)), sofa=(13.2, -9.4, 165), tree=(-13.6, -8.6, 280)),
}
assert all(len(v[r]) == 16 for v in VARY.values() for r in ("inner", "outer"))
