"""R3 lower-ring concourse fit-out, in +Y up ring-local metres."""
from math import hypot, pi
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'city-kit-2127'))
from build_kit import COLORS, Prop, bench, planter_1m, tree
from geo_helpers import Acc, finish_mesh, material, obox, rot, rrect_pts, sweep

FLOOR, FRONT, REAR = 17.6, 13.8, 4.5
LEFT, RIGHT, DOOR_X = -8, 14.9, 4.1354
# The angled garden edge follows the retained DECKS facade with a small setback.
OUTLINE = ((LEFT, FRONT), (RIGHT, FRONT), (RIGHT, -6.8), (4.7, -6.8), (LEFT, -3.34))


def slab(acc, outline, low, high):
    n = len(outline)
    acc.solid([(x, y, z) for y in (low, high) for x, z in outline],
              [tuple(reversed(range(n))), tuple(range(n, n * 2)),
               *((i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n))])

WARM = (.65, .35, .16, 1)
FINISHES = {
    'ceramic': ((.79, .80, .75, 1), .43, (.54, .34, .20, 1), .13),
    'graphite': ((.066, .10, .124, 1), .53, None, 0),
    'floor': ((.43, .44, .39, 1), .65, (.38, .24, .15, 1), .19),
    'timber': ((.54, .32, .16, 1), .62, WARM, .14),
    'glazing': ((.14, .24, .28, 1), .26, (.20, .26, .25, 1), .12),
    'wayfinding': ((.62, .86, .94, 1), .38, (.62, .86, .94, 1), .65),
    'cove': ((.93, .76, .52, 1), .50, (.93, .76, .52, 1), .45),
    'soil': ((.18, .16, .10, 1), .9, None, 0),
}
KIT_ROLES = {'kit_white': 'ceramic', 'kit_dark': 'graphite', 'kit_wood': 'timber',
             'kit_soil': 'soil', 'kit_bark': 'timber'}


def build_transfer(collection):
    parts = {role: Acc() for role in FINISHES}
    width, middle = RIGHT - LEFT, (LEFT + RIGHT) / 2

    def box(role, x, y, z, w, h, d):
        obox(parts[role], (x, y, z), (w, h, d))

    def prop(builder, x, y, z, yaw=0):
        kit = Prop(builder.__name__)
        builder(kit)
        for role, acc in kit.acc.items():
            dst = parts.setdefault(KIT_ROLES.get(role, role), Acc())
            verts = []
            for vx, vz, vy in acc.v:  # Acc stores Blender x, -z, y.
                dx, dz = rot(vx, -vz, yaw)
                verts.append((x + dx, -z - dz, y + vy))
            dst._push(verts, acc.f)

    # One floor through both doors. Stone inlay leaves the middle clear.
    slab(parts['floor'], OUTLINE, FLOOR - .98, FLOOR)
    for side in (-1, 1):
        x = DOOR_X + side * 3.1
        box('graphite', x, FLOOR + .005, 6.45, .28, .018, 14.38)
        box('wayfinding', x, FLOOR + .02, 6.45, .064, .02, 14.18)
    for x in (-5.5, -3, -.5, 8.4, 10.9, 13.4):
        box('graphite', x, FLOOR + .004, 8.55, .025, .015, 9.4)

    # Chamfered roof, dark reveal and a warm ceiling over each waiting bay.
    cz = (FRONT + REAR) / 2
    outline = lambda k: rrect_pts(middle, cz, width / 2, 4.95, (.85,) * 4, 6, k)
    sweep(parts['ceramic'], outline, [(.17, 22.11), (0, 22.39), (0, 23.01), (.32, 23.4)])
    box('graphite', middle, 22.09, cz, width - .9, .27, 8.4)
    for x, w in [(-2.9, 8.95), (11.12, 6.25)]:
        box('timber', x, 21.92, cz, w, .16, 8.12)
        for dz in (-3.4, -1.7, 0, 1.7, 3.4):
            box('cove', x, 21.812, cz + dz, w - .60, .09, .105)
    for x in (DOOR_X - 2.86, DOOR_X + 2.86):
        box('cove', x, 21.887, cz, .12, .16, 8.8)

    # Front and garden portals, with recessed glazing on each flank.
    for z in (FRONT - .19, REAR + .13):
        for x in (DOOR_X - 2.96, DOOR_X + 2.96):
            box('graphite', x, 19.85, z, .34, 4.52, .52)
            box('wayfinding', x, 19.32, z, .09, 3.4, .55)
        box('graphite', DOOR_X, 21.805, z, 5.59, .37, .6)
        for lo, hi in ((LEFT + .34, DOOR_X - 3.104), (DOOR_X + 3.121, RIGHT - .34)):
            x, w = (lo + hi) / 2, hi - lo
            box('ceramic', x, 18.22, z, w, 1.27, .46)
            box('ceramic', x, 21.84, z, w - .04, .85, .46)
            box('glazing', x, 20.029, z, w - .03, 2.43, .09)
            for i in (0, 1, 2, 3):
                box('graphite', lo + w * i / 3, 20.05, z, .11, 2.52, .21)
    for x in (LEFT + .19, RIGHT - .19):
        box('ceramic', x, 18.51, cz, .43, 1.85, 9.28)
        box('glazing', x, 20.16, cz, .12, 1.49, 9.13)
        box('ceramic', x, 21.57, cz, .38, 1.42, 9.27)
        for dz in (-4.31, -2.15, 0, 2.15, 4.31):
            box('graphite', x, 20.15, cz + dz, .32, 1.72, .18)

    for x in (-5.8, -3.88, -1.96, 9.48, 11.4, 13.32):
        prop(bench, x, FLOOR, 10.58)
        prop(bench, x, FLOOR, 7.65, pi)
    for x in (-6.7, -.9, 8.5, 13.7):
        prop(planter_1m, x, FLOOR, 5.45)

    # The court is open to the ring bore. The planting and rear rail meet the setback.
    for lo, hi, centre_z, depth, skew in ((-7.6, 1.0, -1.8, 1.73, -.25), (7.35, 14.49, -3.65, 2.55, 0)):
        x = (lo + hi) / 2

        def outline(k):
            return [(px, pz + (px - x) * skew)
                    for px, pz in rrect_pts(x, centre_z, (hi - lo) / 2, depth, (1.1,) * 4, 5, k)]

        sweep(parts['ceramic'], outline, [(0, FLOOR - .015), (0, FLOOR + .47), (.12, FLOOR + .53),
                                         (.26, FLOOR + .53), (.29, FLOOR + .38), (.29, FLOOR + .03)])
        sweep(parts['soil'], outline, [(.27, FLOOR + .28), (.27, FLOOR + .43)])
        for tx in (lo + 1.85, hi - 1.85):
            prop(tree(.92, 4), tx, FLOOR + .41, centre_z + (tx - x) * skew)
        prop(bench, x, FLOOR, centre_z + depth + .35)

    rail = ((LEFT + .09, 4.25), (LEFT + .09, -3.21), (4.7, -6.665), (RIGHT - .09, -6.665), (RIGHT - .09, 4.25))
    for (x, z), (end_x, end_z) in zip(rail, rail[1:]):
        length = hypot(end_x - x, end_z - z)
        tx, tz = (end_x - x) / length, (end_z - z) / length
        for role, y, h, d, joint in (('graphite', 18.02, .88, .15, .012), ('ceramic', 18.49, .10, .20, .055)):
            obox(parts[role], ((x + end_x) / 2, y, (z + end_z) / 2),
                 (length - joint, h, d), (tx, tz), (-tz, tx))
    for x in (5.7, 10.7):
        box('cove', x, 18.434, -6.57, 1.52, .03, .04)

    for role, acc in parts.items():
        args = FINISHES.get(role)
        finish = (material(f'transfer_{role}', *args) if args else
                  material(f'transfer_{role}', COLORS[role][0]))
        obj = finish_mesh(f'Concourse_{role}', acc, finish)
        collection.objects.link(obj)
    bpy.context.view_layer.update()
