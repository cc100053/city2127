"""Build the editable hull-bow cage. Run in Blender with -b --factory-startup -P."""
from math import cos, exp, pi, sin
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
FACE = 92.6
CENTRE = 12.75
# (u, height), measured along the lip of the established seaward cut.
FLANK = [(90.5, 8.3), (86.1, 8.65), (83.6, 9.2), (81.8, 10.5),
         (80.55, 12.45), (80, 15), (80, 18.6), (80.6, 20.8),
         (81.35, 22.2), (82.85, 23.2), (85.4, 24.1), (88.6, 24.75), (92, 25.05)]
# Width across the flange, seaward relief, and projection on the end wall in metres.
PROFILE = [(0, 0, .15), (.22, .24, .41), (.49, .63, .69), (.79, .64, .78),
           (1.05, .44, .69), (1.22, .22, .57), (1.49, .28, .58),
           (1.73, .49, .76), (2.14, .74, .96), (2.75, .82, 1.03),
           (3.38, .68, .92), (4.02, .39, .63), (4.45, .13, .26), (4.74, -.03, .04)]
GASKET_COLUMN = 5


def front(u, setback):
    return 9 * setback - 8 * (1 - (u / 90) ** 2)


def ease(value, start, end):
    t = min(1, max(0, (value - start) / (end - start)))
    return t * t * (3 - 2 * t)


def collar():
    """Return the quad cage in Three.js hull coordinates (u, height, depth)."""
    rows, lips = [], []
    for i, (x, y) in enumerate(FLANK):
        before, after = FLANK[max(0, i - 1)], FLANK[min(len(FLANK) - 1, i + 1)]
        outward = Vector((before[1]-after[1], after[0]-before[0])).normalized()
        setbacks = (0, .12, .42, .72, .93, 1) if y == 15 else (int(y > 15),)
        upper = exp(-((y - 22.4) / 2.7) ** 2)
        lower = exp(-((y - 10.1) / 1.9) ** 2)
        lips.append(len(rows))
        for setback in setbacks:
            row = []
            for width, relief, _ in PROFILE:
                spread = ease(width, 1.9, PROFILE[-1][0])
                u = x + outward.x * width - spread * (2.6 * upper + 2 * lower)
                height = y + outward.y * width * (1 - .4 * ease(y, 22.2, 25.05))
                height += .035 * setback + spread * (1.0 * upper - .85 * lower)
                row.append(Vector((u, height, front(u, setback) - .88 - relief)))
            rows.append(row)

    side_crown = rows[-1]
    end_wall = []
    for i in range(21):
        angle = pi * i / 20
        row = []
        for j, (width, _, advance) in enumerate(PROFILE):
            crown = side_crown[j].y + .30
            sill = 8.46 - .53 * width
            radius = crown - 16 if i <= 10 else 16 - sill
            row.append(Vector((FACE + advance, 16 + cos(angle) * radius,
                               CENTRE + (13.85 + .87 * width) * sin(angle))))
        end_wall.append(row)

    # Two control rows turn over the end wall outside its upper corner.
    for depth, lead, rise, overhang in [(8.42, .33, .08, .34), (10.54, .19, .22, .17)]:
        rows.append([Vector((point.x + lead, side.y + rise, depth - overhang * relief))
                     for point, side, (_, relief, _) in zip(end_wall[0], side_crown, PROFILE)])
    rows.extend(end_wall)
    # Return over the face of the original stiffener, then roll back to the flank.
    for depth, lead, blend in [(2.6, 1.06, .04), (-.73, 1.12, .12), (-1.22, .37, .24)]:
        rows.append([Vector((point.x + lead, point.y * (1-blend) + first.y * blend, depth))
                     for point, first in zip(end_wall[-1], rows[0])])
    return rows, lips


def rail_bearings(material):
    """Two swept brackets from the bulkhead to the guideway deck undersides."""
    # (u, upper, lower, half-width, depth of each track). Keep the upper edge
    # below 9 m until beyond the extended entrance at u = 97.6 m.
    stations = [
        (91.95, 7.58, 3.65, 1.13, 9.45, 16.08),
        (93.10, 7.83, 4.03, 1.07, 9.25, 15.75),
        (95.45, 8.39, 5.44, .90, 8.87, 15.26),
        (97.55, 8.81, 7.11, .75, 8.46, 14.81),
        (98.26, 9.43, 7.81, .71, 8.35, 14.64),
        (99.40, 11.01, 8.94, .72, 8.17, 14.43),
        (100.65, 13.24, 10.53, .80, 7.97, 14.16),
        (101.49, 14.18, 12.36, .85, 7.84, 13.98),
        (102.12, 14.18, 13.27, .85, 7.74, 13.85),
        (103.00, 14.18, 13.83, .77, 7.60, 13.65),
    ]
    for track in range(2):
        rows = []
        for u, top, low, half, *depths in stations:
            d = depths[track]
            corner = min(.20, (top - low) * .26)
            rows.append([(u, y, z) for y, z in [
                (top, d - half + corner), (top, d + half - corner),
                (top - corner, d + half), (low + corner, d + half),
                (low, d + half - corner), (low, d - half + corner),
                (low + corner, d - half), (top - corner, d - half),
            ]])
        vertices = [point for row in rows for point in row]
        sides = [(8*i+j, 8*i+(j+1)%8, 8*(i+1)+(j+1)%8, 8*(i+1)+j)
                 for i in range(len(rows)-1) for j in range(8)]
        faces = sides + [tuple(range(7, -1, -1)), tuple(range(len(vertices)-8, len(vertices)))]
        name = ('Bow_Bearing_Seaward', 'Bow_Bearing_Inland')[track]
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata([(x, -z, y) for x, y, z in vertices], [], faces)
        mesh.update()
        mesh.materials.append(material)
        uv = mesh.uv_layers.new(name='Brushed_Metres')
        for edge in mesh.edges:
            edge.use_edge_sharp = edge.vertices[0] % 8 == edge.vertices[1] % 8
        for face in mesh.polygons:
            side = face.index < len(sides)
            face.use_smooth = side
            if side:
                width = (Vector(vertices[face.vertices[1]]) - Vector(vertices[face.vertices[0]])).length
            for j, loop in enumerate(face.loop_indices):
                x, y, z = vertices[mesh.loops[loop].vertex_index]
                uv.uv[loop].vector = (x, width if j in (1, 2) else 0.) if side else (y, z)
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.select_set(True)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    rows, lips = collar()
    stride = len(PROFILE)
    vertices = [point for row in rows for point in row]
    faces, uv_faces, roles = [], [], []
    along = [0.]
    across = [0.]
    for previous, row in zip(rows, rows[1:]):
        along.append(along[-1] + (row[8] - previous[8]).length)
    end_distance = along[-1] + (rows[0][8] - rows[-1][8]).length
    for j in range(1, stride):
        across.append(across[-1] + (rows[0][j] - rows[0][j-1]).length)

    def quad(ids, uv, role=0):
        faces.append(ids)
        uv_faces.append(uv)
        roles.append(role)

    for i in range(len(rows)):
        n = (i + 1) % len(rows)
        for j in range(stride - 1):
            quad((i*stride+j, i*stride+j+1, n*stride+j+1, n*stride+j),
                 [(along[i], across[j]), (along[i], across[j+1]),
                  (along[n] if n else end_distance, across[j+1]),
                  (along[n] if n else end_distance, across[j])],
                 int(j == GASKET_COLUMN))

    # The silver surface branches directly out of the collar. The last rows submerge
    # into the existing facade band, so the joint lies beneath the brushed face.
    for band, first, last, tip_u, low, high in [(0, 1, 2, 73.75, 2.69, 3.16),
                                               (1, 8, 10, 73.25, 25.70, 26.88)]:
        anchors = [i*stride+stride-1 for i in range(lips[first], lips[last]+1)]
        prior = anchors
        for step, t in enumerate((.20, .42, .67, .87, 1.), 1):
            current = []
            for j, index in enumerate(anchors):
                start = vertices[index]
                u = start.x + (tip_u - start.x) * t
                goal = low + (high-low) * j / (len(anchors)-1)
                height = start.y + (goal-start.y) * ease(t, 0, 1)
                depth = front(u, band) - .88 + .27*t**4 - .44*sin(pi*t)
                depth += (start.z - (front(start.x, band)-.88)) * (1-t)
                current.append(len(vertices))
                vertices.append(Vector((u, height, depth)))
            for j in range(len(anchors)-1):
                quad((prior[j], current[j], current[j+1], prior[j+1]),
                     [((step-1)*2, j), (step*2, j), (step*2, j+1), ((step-1)*2, j+1)])
            prior = current

    mesh = bpy.data.meshes.new('Bow_Quad_Cage')
    # glTF Y-up maps Blender (u, -depth, height) back to the hull's (u, height, depth).
    mesh.from_pydata([(p.x, -p.z, p.y) for p in vertices], [], faces)
    mesh.update()
    for name, color, metal, roughness in [
        ('bow_silver', (.70, .73, .76, 1), .69, .68),
        ('bow_recess', (.035, .048, .06, 1), .35, .73),
    ]:
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = color
        shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        shader.inputs['Base Color'].default_value = color
        shader.inputs['Metallic'].default_value = metal
        shader.inputs['Roughness'].default_value = roughness
        mesh.materials.append(mat)
    uv = mesh.uv_layers.new(name='Brushed_Metres')
    for polygon, role, coords in zip(mesh.polygons, roles, uv_faces):
        polygon.use_smooth = True
        polygon.material_index = role
        for loop, value in zip(polygon.loop_indices, coords):
            uv.uv[loop].vector = value
    obj = bpy.data.objects.new('Bow_Collar', mesh)
    bpy.context.collection.objects.link(obj)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    fair = obj.modifiers.new('Fair silver across the crown and ribbon junctions', 'SUBSURF')
    fair.levels = fair.render_levels = 1
    fair.uv_smooth = 'PRESERVE_BOUNDARIES'
    rail_bearings(mesh.materials[0])
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'hull-bow-2127.blend'))


if __name__ == '__main__':
    build()
