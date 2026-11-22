"""Civic Core curtain wall in its existing local metre datum, before CIVIC scale."""
from math import ceil, sqrt
from pathlib import Path
import sys

import bpy

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from geo_helpers import Acc, finish_mesh, material, obox

FINISHES = {
    'ceramic': ((.89, .87, .81, 1), .64),
    'graphite': ((.14, .17, .20, 1), .52),
    'clear': ((.57, .68, .74, .22), .34),
    'warm': ((.78, .63, .48, 1), .65, (.90, .57, .30, 1), .35),
    'studio': ((.36, .55, .76, 1), .58, (.31, .57, .92, 1), .28),
}


def curtain_wall(parts, point, length, level, height, count, floor, wing, return_wall=False, first_bay=0):
    """Two tiers around the existing editing mezzanine, with modelled returns at the jambs."""
    along, depth = ((0, 1), (1, 0)) if return_wall else ((1, 0), (0, 1))

    def box(role, u, y, d, w, h, thick):
        obox(parts[role], point(u, y, d), (w, h, thick), along, depth)

    bay = length / count
    low, middle, top = level + 1.2, level + 9.2, level + height + 1.2
    rail_height = .33 if return_wall else .29
    start = first_bay * bay
    for y in (low + .16, middle, top - .15):
        box('graphite', (start + length) / 2, y, .18, length - start, rail_height, .71)
    for i in range(first_bay, count + 1):
        # Stagger the paired ceramic blades; graphite jambs define the narrower pane rhythm.
        u = i * bay
        strong = i in (0, count) or (i + wing) % 3 == 0
        box('graphite', u, (low + top) / 2, .18, .24 if strong else .17, height - (.15 if return_wall else .09), .73)
        if strong:
            for y0, y1 in ((low + .45, middle - .42), (middle + .42, top - .44)):
                box('ceramic', u, (y0 + y1) / 2, -.21, .32, y1 - y0, .39)
                box('ceramic', u, y1 - .28, -.43, .29, .26, .22)

    for i in range(first_bay, count):
        u = (i + .5) * bay
        for row, (y0, y1) in enumerate(((low, middle), (middle, top))):
            y = (y0 + y1) / 2
            pattern = (i + 2 * floor + wing + 2 * row) % 7
            studio = level in (43, 83, 102) and row == 0
            if pattern in (0, 1):
                # Opaque acoustic cassette with two punched-in trims and a recessed maintenance seam.
                box('graphite', u, y, .25, bay - .18, y1 - y0 - .37, .65)
                box('ceramic', u, y0 + .77, -.12, bay - .58, .62, .29)
                for offset in (-.31, .31):
                    box('graphite', u + offset * bay, y + .4, -.13, .10, y1 - y0 - 2.2, .20)
            else:
                box('clear', u, y, .43, bay - .15, y1 - y0 - .22, .08)
                box('graphite', u, y0 + 1.02, .28, bay - .21, .12, .41)
                box('ceramic', u, y0 + .50, .18, bay - .23, .24, .70)
                if pattern in (2, 4, 6):
                    head = y1 - (.69 if return_wall else .61)
                    box('graphite', u, head, .53, bay - .36, .40, .87)
                    box('studio' if studio and pattern == 4 else 'warm', u, head - .16, .70,
                        bay - .75, .13, .37)


def pilot_frame(ceramic, x, z, sea_end, return_end, low, high):
    """One mitered surround with a slanted shared pier and two splayed openings."""
    vertices, faces, indices = [], [], {}

    def corner_point(u, y, depth):
        # Negative u runs up the return. At u=0 both offsets meet on the miter.
        return (x + max(u, 0) + (depth if u <= 0 else 0), y,
                z - min(u, 0) + (depth if u >= 0 else 0))

    def loop(left, right, bottom, top, run, rise, depth, wraps):
        lb, lt = left
        rb, rt = right
        points = [(lb + run, bottom), (rb - run, bottom), (rb, bottom + rise),
                  (rt, top - rise), (rt - run, top), (lt + run, top),
                  (lt, top - rise), (lb, bottom + rise)]
        if wraps:
            points.insert(5, (0, top))
            points.insert(1, (0, bottom))
        result = []
        for u, y in points:
            point = corner_point(u, y, depth)
            if point not in indices:
                indices[point] = len(vertices)
                vertices.append(point)
            result.append(indices[point])
        return result

    pier = (13.8, 9.45)
    for left, right, wraps in (((z - return_end,) * 2, pier, True),
                               (pier, (sea_end - x,) * 2, False)):
        # The return jamb leans further in at the head. Fine mullions stay behind this structure.
        inset_left = (1.35, 2.65) if wraps else (1.15, 1.15)
        inset_right = (1.15, 1.15) if wraps else (1.25, 1.8)
        opening_left = tuple(u + inset for u, inset in zip(left, inset_left))
        opening_right = tuple(u - inset for u, inset in zip(right, inset_right))
        throat_left = tuple(u + .38 for u in opening_left)
        throat_right = tuple(u - .38 for u in opening_right)
        outer = loop(left, right, low, high, .8, 0, -2.20, wraps)
        mouth = loop(opening_left, opening_right, low + 1.13, high - 1.02, 1.10, .96, -2.20, wraps)
        throat = loop(throat_left, throat_right, low + 1.51, high - 1.40, .82, .72, .36, wraps)
        back = loop(left, right, low, high, .8, 0, .36, wraps)
        shared_edge = 3 if wraps else 6
        for i in range(len(outer)):
            j = (i + 1) % len(outer)
            faces.extend(((outer[i], mouth[i], mouth[j], outer[j]),
                          (mouth[i], throat[i], throat[j], mouth[j]),
                          (throat[i], back[i], back[j], throat[j])))
            if i != shared_edge:
                faces.append((back[i], outer[i], outer[j], back[j]))

    ceramic.solid(vertices, faces)


def pilot_panes(parts, x, z, sea_end, return_end, level, height, sea_bays, return_bays):
    """Use the existing curtain-wall roles behind the ceramic, with a slim corner joint."""
    low, middle, top = level + 1.2, level + 9.2, level + height + 1.2
    skin = .45
    corner_x, corner_z = x + skin, z + skin
    joint = .11
    obox(parts['graphite'], (corner_x, (low + top) / 2, corner_z), (joint, top - low, joint))

    for is_return, length, count in ((False, sea_end - corner_x, sea_bays),
                                     (True, return_end - corner_z, return_bays)):
        along, depth = ((0, 1), (1, 0)) if is_return else ((1, 0), (0, 1))

        def box(role, u, y, d, width, h, thick):
            point = (corner_x + d, y, corner_z + u) if is_return else (corner_x + u, y, corner_z + d)
            obox(parts[role], point, (width, h, thick), along, depth)

        bay = length / count
        rail_start, rail_end = joint / 2 - .009, length - .035
        for y in (low + .20, middle, top - .18):
            box('graphite', (rail_start + rail_end) / 2, y, .04, rail_end - rail_start, .23, .24)
        for i in range(1, count):
            box('graphite', i * bay, (low + top) / 2, .03, .13, top - low - .10, .23)
        for i in range(count):
            start = joint / 2 - .012 if i == 0 else i * bay + .06
            end = (i + 1) * bay - .06
            u = (start + end) / 2
            for row, (y0, y1) in enumerate(((low, middle), (middle, top))):
                opaque = not is_return and i == 4 and row == 1
                role = 'ceramic' if opaque else 'clear'
                box(role, u, (y0 + y1) / 2, 0, end - start, y1 - y0 - .20, .14 if opaque else .08)
                if not opaque and i > 0 and (i + row) % 2 == 0:
                    box('graphite', u, y1 - .61, .22, end - start - .20, .30, .39)
                    box('studio' if not is_return and row == 0 else 'warm',
                        u, y1 - .76, .28, end - start - .40, .12, .25)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.preferences.filepaths.save_version = 0
    parts = {role: Acc() for role in FINISHES}
    for wing, (x, width) in enumerate(((-56, 22), (40, 38))):
        for floor, level in enumerate((3, 24, 43, 64, 83, 102)):
            height = 19.3 if level == 43 else 17.3
            span = width - 1.3
            sea_bays = round(span / 4)
            side_span, side_bays = 35.3, 8
            pilot = wing == 1 and level == 83
            pilot_sea_bays, pilot_side_bays = 6, 3
            curtain_wall(parts, lambda u, y, d: (x - span / 2 + u, y, -2.76 + d),
                         span, level, height, sea_bays, floor, wing, first_bay=pilot_sea_bays if pilot else 0)
            for side in (-1, 1):
                curtain_wall(parts, lambda u, y, d: (x + side * (width / 2 - .5 - d), y, -2.72 + u),
                             side_span, level, height, side_bays, floor, wing + side, return_wall=True,
                             first_bay=pilot_side_bays if pilot and side == -1 else 0)
            if pilot:
                corner_x, corner_z = x - width / 2 + .5, -2.76
                sea_end = x - span / 2 + span * pilot_sea_bays / sea_bays
                return_end = -2.72 + side_span * pilot_side_bays / side_bays
                pilot_frame(parts['ceramic'], corner_x, corner_z, sea_end - .025, return_end - .025,
                            level + 1.57, level + height + .91)
                pilot_panes(parts, corner_x, corner_z, sea_end, return_end, level, height,
                            pilot_sea_bays, pilot_side_bays)

    for role, geometry in parts.items():
        finish = material(f'fuji_{role}', *FINISHES[role])
        obj = finish_mesh(f'Facade_{role}', geometry, finish)
        # Keep each quad in its own UV tile for editable panel finishes.
        uv = obj.data.uv_layers.new().uv
        tiles = ceil(sqrt(len(obj.data.polygons)))
        for face in obj.data.polygons:
            x, y = face.index % tiles, face.index // tiles
            for loop, (u, v) in zip(face.loop_indices, ((.05, .05), (.95, .05), (.95, .95), (.05, .95))):
                uv[loop].vector = ((x + u) / tiles, (y + v) / tiles)
        bpy.context.collection.objects.link(obj)
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'fuji-civic-facade.blend'))


if __name__ == '__main__':
    build()
