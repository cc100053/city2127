"""Fuji theatre skin and bearing assembly in civic-local metres."""
from math import asin, cos, pi, radians, sin, sqrt
from pathlib import Path
import sys

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from geo_helpers import Acc, B, finish_mesh, material

CENTRE = Vector((-18, 100, 23))
RADIUS = 28
AZIMUTHS = 72
# Negative Z faces the bay. The opening clears the roof berth and keeps the poles intact.
FIRST, LAST = 45, 56  # −135° to −80°
SILL, HEAD = -7.5, 2.4

FINISHES = {
    'silver': ((.89, .91, .93, 1), .17),
    'ceramic': ((.9, .87, .81, 1), .47),
    'graphite': ((.15, .18, .21, 1), .55),
    'clear': ((.62, .73, .82, .22), .3),
    'studio': ((.48, .66, .82, 1), .45, (.41, .65, .91, 1), .33),
}


def at(radius, latitude, azimuth):
    return CENTRE + radius * Vector((cos(latitude) * cos(azimuth), sin(latitude), cos(latitude) * sin(azimuth)))


def skin(finishes):
    """Closed silver envelope with a recessed, flared reveal cut into its bay side."""
    latitudes = sorted({pi * j / 36 for j in range(-17, 18) if not SILL - .5 <= RADIUS * sin(pi * j / 36) <= HEAD + .5}
                       | {asin(y / RADIUS) for y in (SILL, SILL + .9, -2.4, HEAD - .9, HEAD)})
    low, high = (latitudes.index(asin(y / RADIUS)) for y in (SILL, HEAD))
    vertices, faces, roles = [], [], []
    skin_normals = []

    def vertex(radius, lat, az):
        vertices.append(B(at(radius, lat, az)))
        return len(vertices) - 1

    def face(points, role, radial=0):
        faces.append(points)
        roles.append(role)
        skin_normals.append(radial)

    outlines = []
    for outside in (True, False):
        radius = RADIUS if outside else 25.25
        rings = []
        for row, lat in enumerate(latitudes):
            ring = []
            for i in range(AZIMUTHS):
                if low < row < high and FIRST < i < LAST:
                    ring.append(None)
                    continue
                az = 2 * pi * i / AZIMUTHS
                if low <= row <= high and FIRST <= i <= LAST:
                    taper = 1.7 if row in (low, high) else .3
                    across = (i - FIRST) / (LAST - FIRST)
                    az += radians((1 - 2 * across) * (taper + (0 if outside else .8)))
                    if not outside:
                        lat_in = lat + radians(.42 if row == low else -.42 if row == high else 0)
                    else:
                        lat_in = lat
                    ring.append(vertex(radius, lat_in, az))
                else:
                    ring.append(vertex(radius, lat, az))
            rings.append(ring)

        bottom, top = vertex(radius, -pi / 2, 0), vertex(radius, pi / 2, 0)
        sign = 1 if outside else -1
        for i in range(AZIMUTHS):
            j = (i + 1) % AZIMUTHS
            face((bottom, rings[0][i], rings[0][j])[::sign], 'silver', sign)
            face((top, rings[-1][j], rings[-1][i])[::sign], 'silver', sign)
            for row, (a, b) in enumerate(zip(rings, rings[1:])):
                if low <= row < high and FIRST <= i < LAST:
                    continue
                face((a[j], a[i], b[i], b[j])[::sign], 'silver', sign)
        outlines.append(rings[low][FIRST:LAST] + [r[LAST] for r in rings[low:high]]
                        + rings[high][LAST:FIRST:-1] + [r[FIRST] for r in reversed(rings[low + 1:high + 1])])

    outside, inside = outlines
    bevel = []
    for a, b in zip(outside, inside):
        rim = Vector(vertices[a]).lerp(Vector(vertices[b]), .16) - Vector(B(CENTRE))
        bevel.append(len(vertices))
        vertices.append(Vector(B(CENTRE)) + rim.normalized() * 27.62)
    for i in range(len(outside)):
        j = (i + 1) % len(outside)
        face((outside[j], outside[i], bevel[i], bevel[j]), 'silver')
        face((bevel[j], bevel[i], inside[i], inside[j]), 'graphite')

    mesh = bpy.data.meshes.new('Theatre_skin')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(mesh.name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(finishes['silver'])
    mesh.materials.append(finishes['graphite'])
    centre = Vector(B(CENTRE))
    normals = []
    for poly, role, sign in zip(mesh.polygons, roles, skin_normals):
        poly.material_index = int(role == 'graphite')
        poly.use_smooth = bool(sign)
        normals.extend((mesh.vertices[i].co - centre).normalized() * sign if sign else poly.normal for i in poly.vertices)
    mesh.normals_split_custom_set(normals)


def extrude(part, start, end, profile, segments=8, round_section=False):
    """Loft a chamfered box section or a turned pin along a member axis."""
    start, end = Vector(start), Vector(end)
    axis = (end - start).normalized()
    across = axis.cross(Vector((0, 0, 1))).normalized()
    up = axis.cross(across)
    vertices, faces = [], []
    for t, width, depth in profile:
        u, v = width / 2, depth / 2
        if round_section:
            perimeter = [(u * cos(2 * pi * i / segments), v * sin(2 * pi * i / segments)) for i in range(segments)]
        else:
            bevel = min(.18, u * .35, v * .35)
            perimeter = [(u, v - bevel), (u - bevel, v), (-u + bevel, v), (-u, v - bevel),
                         (-u, -v + bevel), (-u + bevel, -v), (u - bevel, -v), (u, -v + bevel)]
        vertices.extend(start.lerp(end, t) + x * across + y * up for x, y in perimeter)
    faces.append(tuple(reversed(range(segments))))
    for row in range(len(profile) - 1):
        a, b = row * segments, (row + 1) * segments
        for i in range(segments):
            j = (i + 1) % segments
            faces.append((a + i, a + j, b + j, b + i))
    faces.append(tuple(range(len(vertices) - segments, len(vertices))))
    part.solid(vertices, faces)


def bearings(parts):
    for side in (-1, 1):
        # Forward ends cup the lower rear quarters. The broad heel bears into the fixed rear deck.
        heel = Vector((-18 + side * 35, 62.3, 62))
        seat = Vector((-18 + side * 19, 74.4, 44))
        extrude(parts['ceramic'], heel, seat, [(0, 5.1, 3.7), (.12, 5.4, 4.4), (.64, 3.4, 3.0), (1, 2.9, 2.4)])
        extrude(parts['graphite'], heel, seat, [(-.06, 5.6, 4.1), (-.015, 6.2, 4.9), (.09, 6.2, 4.9), (.13, 5.1, 3.4)])
        # The recessed dark coupling separates ceramic from the chrome saddle; a thin witness ring marks the pin.
        for upper in (False, True):
            radial = Vector((side * 13, 12.8, 21.2)) if upper else Vector((side * 11.5, -24.8, -4))
            contact = CENTRE + radial.normalized() * RADIUS
            outer = contact.lerp(CENTRE, -.16)
            inner = contact.lerp(CENTRE, .014)
            extrude(parts['graphite'], outer, inner, [(0, 2.25, 2.25), (.18, 2.7, 2.7), (.68, 2.7, 2.7), (1, 5.5, 5.5)], 16, True)
            extrude(parts['silver'], outer, inner, [(.56, 2.7, 2.7), (.61, 3.2, 3.2), (.79, 4.55, 4.55), (.83, 4.72, 4.72)], 16, True)
            extrude(parts['studio'], outer, inner, [(.35, 2.62, 2.62), (.36, 2.77, 2.77), (.40, 2.77, 2.77), (.41, 2.62, 2.62)], 16, True)
            if upper:
                anchor = Vector((-18 + side * 20, 130.1, 69))
                extrude(parts['ceramic'], anchor, outer, [(0, 3.6, 3.8), (.18, 2.75, 2.75), (.28, 1.5, 1.55), (1.12, 1.65, 1.65)])
                extrude(parts['graphite'], anchor, outer, [(.1, 3.64, 3.88), (.13, 3.72, 3.97), (.19, 2.91, 2.86), (.21, 2.25, 2.29)])
            else:
                extrude(parts['ceramic'], seat, outer, [(-.16, 3.25, 2.5), (.11, 3.7, 3.0), (.72, 2.8, 2.65), (1.05, 2.1, 2.05)])
                extrude(parts['graphite'], seat, outer, [(-.09, 3.95, 2.9), (.05, 4.05, 3.24), (.12, 3.8, 3.1)])


def glazing(parts):
    # One curved inner pane leaves the existing stage sightline open across the bay.
    for role, r, depths, heights in (
        ('clear', 25.31, (.07, -.12), (SILL - .33, HEAD + .47)),
        ('studio', 25.51, (.05, -.12), (-6.84, -6.45)),
    ):
        vertices = []
        for offset in depths:
            for y in heights:
                latitude = asin(y / r)
                vertices.extend(at(r + offset, latitude, radians(-137 + i * 5)) for i in range(13))
        # Each row is the same number of azimuth samples, and the four rows form a closed curved strip.
        order = (0, 1, 3, 2)
        faces = [tuple(row * 13 for row in reversed(order)), tuple(row * 13 + 12 for row in order)]
        for a, b in zip(order, order[1:] + order[:1]):
            faces += [(a * 13 + i, b * 13 + i, b * 13 + i + 1, a * 13 + i + 1) for i in range(12)]
        parts[role].solid(vertices, faces)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.preferences.filepaths.save_version = 0
    finishes = {role: material(f'fuji_{role}', *values) for role, values in FINISHES.items()}
    bsdf = next(node for node in finishes['silver'].node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Metallic'].default_value = 1
    skin(finishes)
    parts = {role: Acc() for role in FINISHES}
    bearings(parts)
    glazing(parts)
    for role, acc in parts.items():
        bpy.context.collection.objects.link(finish_mesh(f'Assembly_{role}', acc, finishes[role]))
    # Editable UVs for shell and metalwork. The solid-color runtime export omits them.
    for obj in bpy.context.scene.objects:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(island_margin=.008)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'fuji-civic-sphere.blend'))


if __name__ == '__main__':
    build()
