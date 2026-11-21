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


def curtain_wall(parts, point, length, level, height, count, floor, wing, return_wall=False):
    """Two tiers around the existing editing mezzanine, with modelled returns at the jambs."""
    along, depth = ((0, 1), (1, 0)) if return_wall else ((1, 0), (0, 1))

    def box(role, u, y, d, w, h, thick):
        obox(parts[role], point(u, y, d), (w, h, thick), along, depth)

    bay = length / count
    low, middle, top = level + 1.2, level + 9.2, level + height + 1.2
    rail_height = .33 if return_wall else .29
    for y in (low + .16, middle, top - .15):
        box('graphite', length / 2, y, .18, length, rail_height, .71)
    for i in range(count + 1):
        # Stagger the paired ceramic blades; graphite jambs define the narrower pane rhythm.
        u = i * bay
        strong = i in (0, count) or (i + wing) % 3 == 0
        box('graphite', u, (low + top) / 2, .18, .24 if strong else .17, height - (.15 if return_wall else .09), .73)
        if strong:
            for y0, y1 in ((low + .45, middle - .42), (middle + .42, top - .44)):
                box('ceramic', u, (y0 + y1) / 2, -.21, .32, y1 - y0, .39)
                box('ceramic', u, y1 - .28, -.43, .29, .26, .22)

    for i in range(count):
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


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.preferences.filepaths.save_version = 0
    parts = {role: Acc() for role in FINISHES}
    for wing, (x, width) in enumerate(((-56, 22), (40, 38))):
        for floor, level in enumerate((3, 24, 43, 64, 83, 102)):
            height = 19.3 if level == 43 else 17.3
            span = width - 1.3
            curtain_wall(parts, lambda u, y, d: (x - span / 2 + u, y, -2.76 + d),
                         span, level, height, round(span / 4), floor, wing)
            for side in (-1, 1):
                curtain_wall(parts, lambda u, y, d: (x + side * (width / 2 - .5 - d), y, -2.72 + u),
                             35.3, level, height, 8, floor, wing + side, return_wall=True)

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
