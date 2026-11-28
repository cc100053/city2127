"""Q10-C spiral geometry, shared by the builder and the reimport check (pure Python, no bpy).

Blender coordinates, real metres: origin = hill centre at plaza level (z 0), z up, sea on +y, city and main view on -y.
One continuous bench winds three times counter-clockwise (seen from above) from the foot to the summit. phi is the
unwrapped angle along it, 0 at the start (bearing THETA0, front-left, under the feed tube) to PHI_END after three turns
(same bearing, at the summit). Across the bench, d is the radial offset from the channel centre line (+ outward):

    inner wall | channel (shallow trough) | rim | walking path | outer curb        (centre of the hill <-  -> outside)

Between one turn's inner wall and the next turn's outer curb lies a planted bank (slope band). The bank below the first
turn runs down to the plaza along a "ghost" turn at ground level (phi < 0); the bank above the third turn runs up to the
summit plateau, whose edge continues the spiral inward until it reaches R_TOP, so the last turn opens onto the plateau.
"""
import math

TAU = 2 * math.pi
TURNS = 3
PHI_END = TURNS * TAU
THETA0 = math.radians(-118.0)        # start bearing: front-left of the main view, the feed tube lands here
RC0, RC1 = 55.2, 16.0                # channel centre radius at the start / at the end of the third turn
PITCH = (RC0 - RC1) / TURNS          # 13.07 m inward per turn
Z_END = 38.0                         # path level at the end = summit plateau level
TURN_Z = (0.0, 12.5, 25.0, Z_END)    # path level at the end of each turn (design: 0 -> 12 -> 25 -> 40)
W0, W1 = 5.6, 4.6                    # channel width at the start / end (owner reference: narrower than the design's 10 m)
WALL_T, RIM_T = .35, .35             # inner retaining wall and rim thickness
PATH_W, CURB_T = 2.4, .25            # walking path width, outer curb
WALL_H = 1.6                         # inner wall above path level (the dark band behind the channel)
RIM_H = .45                          # rim top above path level
FLOOR_D = .35                        # channel floor below path level (shallow trough: 0.8 m below the rim)
CURB_H = .15


def smooth(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def rc(phi):
    """Channel centre radius; linear in phi and extrapolated outside 0..PHI_END (ghost turn, summit edge)."""
    return RC0 + (RC1 - RC0) * phi / PHI_END


def zp(phi):
    """Path level: linear within each turn through TURN_Z; 0 before the start, Z_END after the end."""
    if phi <= 0:
        return 0.0
    if phi >= PHI_END:
        return Z_END
    k = min(int(phi / TAU), TURNS - 1)
    f = phi / TAU - k
    return TURN_Z[k] + (TURN_Z[k + 1] - TURN_Z[k]) * f


def width(phi):
    return W0 + (W1 - W0) * min(max(phi / PHI_END, 0.0), 1.0)


def wall_h(phi):
    """The inner wall grows out of the plaza over the first 20 deg and sinks into the plateau over the last 35 deg."""
    return WALL_H * smooth(0.0, math.radians(20), phi) * (1 - smooth(PHI_END - math.radians(35), PHI_END, phi))


def offsets(phi):
    """Radial offsets (from the channel centre) of the bench's long edges, inside to outside."""
    h = width(phi) / 2
    return {"wall_in": -h - WALL_T, "chan_in": -h, "chan_out": h, "rim_out": h + RIM_T,
            "path_out": h + RIM_T + PATH_W, "curb_out": h + RIM_T + PATH_W + CURB_T}


def bearing(phi):
    return THETA0 + phi


def xy(r, phi):
    a = bearing(phi)
    return r * math.cos(a), r * math.sin(a)


def at(phi, d, dz=0.0):
    """Point on the bench at unwrapped angle phi, radial offset d, height path level + dz."""
    x, y = xy(rc(phi) + d, phi)
    return (x, y, zp(phi) + dz)


def inner_edge(phi):
    """Lower edge of the bank above this turn: top inner corner of the inner wall. phi < 0: the ghost turn at ground."""
    if phi < 0:
        return at(phi, offsets(0.0)["wall_in"])[:2] + (0.0,)
    return at(phi, offsets(phi)["wall_in"], wall_h(phi))


R_TOP = rc(PHI_END) + offsets(PHI_END)["wall_in"]     # summit plateau radius where the last turn ends (13.35 m)


def outer_edge(psi):
    """Upper edge of a bank: the outer curb foot of the turn at psi, or for psi > PHI_END the summit plateau edge,
    which continues the spiral inward at Z_END until it reaches R_TOP."""
    if psi <= PHI_END:
        return at(psi, offsets(psi)["curb_out"])
    r = max(R_TOP, rc(psi) + offsets(PHI_END)["curb_out"])
    x, y = xy(r, psi)
    return (x, y, Z_END)


def summit_r(theta_rel):
    """Plateau edge radius at bearing THETA0 + theta_rel (0 .. TAU)."""
    return max(R_TOP, rc(PHI_END + theta_rel) + offsets(PHI_END)["curb_out"])


def stage(phi):
    """Material stage along the channel, by the fraction of the year f = phi / PHI_END:
    0 fresh objects, 1 white mycelium cocoons, 2 collapsing white-brown, 3 dark soil with sprouts."""
    f = phi / PHI_END
    return 0 if f < .045 else 1 if f < 1 / 3 else 2 if f < 2 / 3 else 3


def arc_len(phi0, phi1, n=2000):
    """Length of the channel centre line between phi0 and phi1 (with its climb)."""
    s, p = 0.0, None
    for i in range(n + 1):
        ph = phi0 + (phi1 - phi0) * i / n
        q = at(ph, 0.0)
        if p is not None:
            s += math.dist(p, q)
        p = q
    return s


def locate(x, y):
    """For a plan point: list of (phi, d) for every turn whose bench section lies at this bearing, d = radial offset."""
    r = math.hypot(x, y)
    rel = (math.atan2(y, x) - THETA0) % TAU
    out = []
    for k in range(TURNS):
        phi = rel + k * TAU
        out.append((phi, r - rc(phi)))
    return out


def in_bench(x, y, z, clear=2.6):
    """True if (x, y, z) lies inside the kept-clear envelope of the channel or the walking path: in plan between the
    inner wall's face and the outer curb, and between the channel floor and `clear` m above path level."""
    for phi, d in locate(x, y):
        o = offsets(phi)
        if o["chan_in"] < d < o["curb_out"] and zp(phi) - FLOOR_D - .05 < z < zp(phi) + clear:
            return True
    return False


if __name__ == "__main__":
    print("pitch %.2f  R_TOP %.2f  turn lengths %s" % (PITCH, R_TOP, [round(arc_len(k * TAU, (k + 1) * TAU), 1) for k in range(TURNS)]))
    for k in range(TURNS):
        a, b = k * TAU, (k + 1) * TAU - 1e-6
        ln = arc_len(a, b)
        print("turn %d: rc %.1f -> %.1f, z %.1f -> %.1f, grade %.1f %%, bank width %.2f m" % (
            k + 1, rc(a), rc(b), zp(a), zp(b), 100 * (zp(b) - zp(a)) / ln,
            (rc(a) + offsets(a)["wall_in"]) - (rc(a + TAU) + offsets(a + TAU)["curb_out"])))
