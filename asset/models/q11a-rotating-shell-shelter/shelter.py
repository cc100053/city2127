"""Q11-A layout and states, shared by the builder, the review renders and the reimport check (pure Python, no bpy).

Blender coordinates, real metres: origin = plaza centre at z 0, z up, sea on +y, city on -y. Bearings in degrees
counter-clockwise from +x. The shell turns clockwise seen from above: at state angle A every moving part is rotated by
-A about the z axis through the origin (the MOVING pivot). A = 0 everyday (opening to the sea, +y), 90 standby (opening
to +x, roof lead panel just out), 180 moored (opening to the city, full shell back to the sea, roof fully out).
Moving parts are modelled in the A = 0 frame ("local"): the shell's 240 deg back faces -y, the roof slides along +y.
"""
import math

# --- fixed building ----------------------------------------------------------------------------------------------------------
R_BLD = 37.0                         # fixed inner building: largest radius of anything fixed inside the ring
LEVELS = (6.0, 14.0, 22.0, 30.0, 38.0)  # display floor levels
ROOF_Z = 43.0                        # highest fixed point (roof plant included)
SETBACK = (0.0, 3.5, 7.0, 10.5, 14.0)    # terrace set-back per level toward the terrace bearing
TERRACE_BEARING = 45.0               # terraces step back toward the sea and the +x side (both show in the 0 and 90 states)
CORES = ((-9.0, -7.0), (9.0, -7.0))  # two separate concrete cores (centre x, y), 8 x 8 m
CORE = 8.0
BASEMENT = -5.2                      # fixed waterproof box floor (shelter hall and passages)

# --- ring foundation and track -----------------------------------------------------------------------------------------------
RING_IN, RING_OUT = 39.0, 46.5       # ring beam (cast concrete) plan radii
RING_TOP = 1.2                       # ring beam top (track bed) over the plaza
RAILS = (41.0, 44.0)                 # rail centre radii
GROUT, PLATE, RAIL_H = .06, .04, .18 # grout layer, sole plate, rail height
RAIL_TOP = RING_TOP + GROUT + PLATE + RAIL_H     # 1.48: wheel tread contact level
RAIL_HEAD_W = .16
GUARD_R = 47.4                       # guard fence on the plaza side of the track

# --- moving shell ------------------------------------------------------------------------------------------------------------
R_OUT, R_IN = 45.0, 40.5             # outer skin, inner skin
SHELL_TOP = 50.0
OPEN_DEG = 120.0                     # opening, centred on +y in the local frame
SHELL_SPAN = (90.0 + OPEN_DEG / 2, 90.0 + 360.0 - OPEN_DEG / 2)   # local bearings 150 .. 390 (through 270 = -y)
BEAM_LOW = (3.6, 5.0)                # lower arc box beam (z) the bogies carry
BEAM_TOP = (47.4, SHELL_TOP)         # upper arc box beam
SKIN_Z0 = BEAM_LOW[1]

# --- bogies (12 equalised bogies, 2 rails x front and back wheel = 48 load wheels) ---------------------------------------------
N_BOGIE = 12
WHEEL_R = .8
WHEEL_W = .34
WHEEL_BASE = 3.0                     # front to back wheel along the rail
AXLE_Z = RAIL_TOP + WHEEL_R


def bogie_bearings():
    """Local bearings of the 12 bogies, evenly over the 240 deg shell, half a pitch in from each end frame."""
    a0, a1 = SHELL_SPAN
    step = (a1 - a0) / N_BOGIE
    return [a0 + step * (i + .5) for i in range(N_BOGIE)]


# --- sliding roof (local frame: slides along +y, from the back stowage toward the opening) -------------------------------------
ROOF_W = 30.0                        # central sliding band (equal-width rectangular panels, fixed side wings take the arcs)
TRUSS_X = 16.2                       # main truss centre lines at x = +-TRUSS_X
TRUSS_Y = (-math.sqrt(R_OUT ** 2 - TRUSS_X ** 2) + .8, 42.6)   # back end on the shell's top beam .. front cantilever tip
PORTAL_Y = R_OUT * math.sin(math.radians(30.0))  # 22.5: front portal beam between the two end frames' tops
TRUSS_Z = (45.4, 51.8)               # truss bottom / top chord (lowest member >= 45 over a 43 m building)
N_PANEL = 6
PANEL_L = 13.0
PANEL_Y0 = -36.0                     # stowed: every panel spans y -36 .. -23 (inside the top beam's inner edge)
PANEL_LEVEL0 = 45.9                  # lowest panel underside; each panel one level up toward the back
PANEL_DZ = .95
PANEL_T = .55
TRAVEL = PANEL_L * (N_PANEL - 1)     # lead panel full travel, 65 m: the lead panel ends at y 42 (shell edge 42.4)
STOW = (-36.8, -22.4)                # stowage bay (y) at the back, its front slot at y -22.4
STOW_X = 15.8
STOW_TOP = PANEL_LEVEL0 + PANEL_DZ * (N_PANEL - 1) + PANEL_T + .7
RAIL_IN_X = ROOF_W / 2 + .25         # panel rails on the trusses' inner faces


def panel_level(k):
    """Underside z of panel k (k = 0 the back-most at full extension .. 5 the lead panel). The back panels ride higher, so
    each laps down over the next one forward and rain runs forward from lap to lap."""
    return PANEL_LEVEL0 + PANEL_DZ * (N_PANEL - 1 - k)


def panel_offsets(s):
    """Y offset of each panel for lead-panel travel s (0 .. TRAVEL): the lead panel goes first, each panel behind follows
    once the one in front has drawn a panel length ahead (panel k ends at k * PANEL_L)."""
    return [min(PANEL_L * k, max(0.0, s - PANEL_L * (N_PANEL - 1 - k))) for k in range(N_PANEL)]


STATES = {0: 0.0, 90: .1 * TRAVEL, 180: TRAVEL}   # lead panel travel per state; standby: the lead panel 6.5 m out (a tenth)
DEFAULT_STATE = 90                   # the city GLB is the standby state

# --- fixed passages under the track, battery room ------------------------------------------------------------------------------
PASSAGES = (-104.0, -76.0)           # two separate passages from the city side, radial
PASS_W, PASS_H = 5.0, 3.2            # clear width, clear height
PASS_FLOOR = BASEMENT
RAMP_R = (58.0, 58.0 + abs(PASS_FLOOR) * 12)   # open ramp at 1:12 from the passage portal up to the city plaza
TRANSFER = (RING_TOP, -1.35)         # transfer girder over each passage (top, bottom) spanning between two abutments
BATTERY = (-8.0, 76.0, 34.0, 20.0)   # glass-roofed battery room: bearing, radius of centre, length (tangential), width
BATTERY_FLOOR = -6.0


def rot(x, y, angle_deg):
    """Local (A = 0) point to world for state angle A (clockwise turn)."""
    a = math.radians(-angle_deg)
    return x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)


def pol(r, deg, z=0.0):
    a = math.radians(deg)
    return (r * math.cos(a), r * math.sin(a), z)


def slab_r(level, bearing):
    """Plan radius of floor slab `level` (index into LEVELS) at bearing: full R_BLD on the city side, stepping back
    toward TERRACE_BEARING (the planted terraces)."""
    f = max(0.0, math.cos(math.radians(bearing - TERRACE_BEARING))) ** .8
    return R_BLD - SETBACK[level] * f
