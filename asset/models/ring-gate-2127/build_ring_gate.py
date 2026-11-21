"""Build the vertical ring's south-east transfer entrance in ring-local metres.

Run Blender from factory startup. The pivot is the hoop centre projected to grade,
with +Z (Blender -Y) facing the plaza. Keep the opening aligned to RING_GATE.
"""
from math import cos, radians, sin, sqrt
from pathlib import Path
from random import Random
import sys

import bmesh
import bpy

HERE = Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent), str(HERE.parent / 'city-kit-2127')]
from geo_helpers import Acc, finish_mesh, material, obox
from modules import Ctx, ROLES, arch_shell, limb


LEFT, NEAR_RIGHT, FAR_RIGHT = 30.5, 65, 53.5
HALF, TOP, CENTRE = 22.5, 22, 90
GLASS = (.125, .204, .246, 1)
WHITE = (.82, .84, .83, 1)
SLATE = (.082, .115, .137, 1)
COOL = (.62, .86, .94, 1)
WARM = (.93, .76, .52, 1)
FINISHES = {
    'ceramic': (WHITE, .36, None, 0),
    'graphite': (SLATE, .45, None, 0),
    'glazing': (GLASS, .19, (.76, .44, .20, 1), .08),
    'wayfinding': (COOL, .38, COOL, .65),
    'cove': (WARM, .50, WARM, .45),
}
A = {role: Acc() for role in FINISHES}


def loft(role, rows):
    size = len(rows[0])
    faces = [(i * size + j, i * size + (j + 1) % size,
              (i + 1) * size + (j + 1) % size, (i + 1) * size + j)
             for i in range(len(rows) - 1) for j in range(size)]
    faces += [tuple(reversed(range(size))), tuple(range((len(rows) - 1) * size, len(rows) * size))]
    A[role].solid([p for row in rows for p in row], faces)


def right(z):
    return FAR_RIGHT + (NEAR_RIGHT - FAR_RIGHT) * ((z + HALF) / (2 * HALF))


def tunnel_strip(role, start, end, lo, hi, reach):
    """A strip follows the skew tunnel section from one mouth to the other."""
    loft(role, [[(x(z), y, z) for x, y in ((start, lo), (end, lo), (end, hi), (start, hi))]
                for z in (-reach, reach)])


def tunnel():
    tunnel_strip('ceramic', lambda z: LEFT - 1.7, lambda z: LEFT - .04, 0, TOP + .1, HALF + .9)
    tunnel_strip('ceramic', lambda z: right(z) + .04, lambda z: right(z) + 1.7, 0, TOP + .1, HALF + .9)
    tunnel_strip('graphite', lambda z: LEFT, right, TOP + .02, TOP + 1.1, HALF + 1.1)
    # The wall channels carry service lighting below the elevated guideway.
    tunnel_strip('graphite', lambda z: LEFT - .22, lambda z: LEFT + .08, 3.22, 4.08, HALF)
    tunnel_strip('graphite', lambda z: right(z) - .08, lambda z: right(z) + .22, 3.22, 4.08, HALF)
    tunnel_strip('cove', lambda z: LEFT + .04, lambda z: LEFT + .12, 3.61, 3.69, HALF - .55)
    tunnel_strip('cove', lambda z: right(z) - .12, lambda z: right(z) - .04, 3.61, 3.69, HALF - .55)
    for i in range(6):
        def along(z, offset):
            return LEFT + (right(z) - LEFT) * ((i + offset) / 6)
        tunnel_strip('ceramic', lambda z: along(z, .08), lambda z: along(z, .92), TOP - .01, TOP + .06, HALF + .72)
        tunnel_strip('cove', lambda z: along(z, .966), lambda z: along(z, 1.018), TOP + .005, TOP + .04, HALF + .62)

    for side, edge in ((1, NEAR_RIGHT), (-1, FAR_RIGHT)):
        span = edge - LEFT
        mid = (LEFT + edge) / 2
        for x, sign in ((LEFT, -1), (edge, 1)):
            # Splayed ceramic jambs end in a shoulder at the lintel, outside the skew opening.
            loft('ceramic', [[(x + sign * d, y, side * z) for d, y in profile] for z, profile in (
                (22.4, ((.6, .05), (3.8, .05), (5.5, 24.8), (1, 24.8))),
                (24.2, ((.7, .05), (4.5, .05), (5.1, 24.8), (1.1, 24.8))),
                (26.2, ((.95, .2), (4.0, .2), (4.4, 24.1), (1.35, 24.1))),
            )])
            obox(A['graphite'], (x + sign * 2, 10.9, side * 26.27), (1.0, 17.5, .23))
            for y in (5.0, 6.1, 7.2, 15.0, 16.1, 17.2):
                obox(A['wayfinding'], (x + sign * 2, y, side * 26.41), (.56, .19, .10))
        loft('ceramic', [[(mid + d, y, side * z) for d, y in profile] for z, profile in (
            (22.35, ((-span / 2 - 4.2, 22.12), (span / 2 + 4.2, 22.12), (span / 2 + 5, 27.5), (-span / 2 - 5, 27.5))),
            (25.5, ((-span / 2 - 3.2, 22.16), (span / 2 + 3.2, 22.16), (span / 2 + 4.6, 27.0), (-span / 2 - 4.6, 27.0))),
            (27.9, ((-span / 2 - 2.6, 22.75), (span / 2 + 2.6, 22.75), (span / 2 + 3.2, 25.1), (-span / 2 - 3.2, 25.1))),
        )])
        obox(A['graphite'], (mid, 24.0, side * 27.94), (span + 4.6, 1.26, .20))
        for j in range(12):
            x = mid + span * (j - 5.5) / 12
            obox(A['wayfinding'], (x, 24.0, side * 28.08), (span / 12 - .32, .22, .10))


def arc(role, start, end, profile, steps=12):
    rows = []
    for i in range(steps + 1):
        f = i / steps
        a = radians(start + (end - start) * f)
        rows.append([(r * cos(a), CENTRE + r * sin(a), z) for r, z in profile(f)])
    loft(role, rows)


def frontage():
    # A folded rim lifts out of the ring face and follows the planted opening towards the portals.
    for start, end in ((-82.5, -74.4), (-74, -62.9), (-62.5, -51.4), (-51, -40.9), (-40.5, -32)):
        arc('graphite', start, end, lambda f: ((72.5, 22), (72.5, 24.3), (73.1, 25.1), (74.8, 23.1), (74.8, 22)))
        arc('ceramic', start + .15, end - .15, lambda f: ((72.6, 23.9), (70.55, 25.25), (70.55, 26.2),
                                                        (71.25, 26.9), (72.25, 26.7), (73.10, 24.55)))

    # Long panes with deep, progressively larger ribs over the road gate, rather than a repeated facade grid.
    for start, end, r0, r1 in ((-52, -44, 75, 80), (-43.6, -35.6, 75, 87), (-35.2, -27.2, 75, 94)):
        arc('graphite', start, end, lambda f: ((r0, 22.24), (r0, 24.7), (r1, 24.45), (r1, 22.24)))
        arc('glazing', start + .35, end - .35, lambda f: ((r0 + .85, 24.5), (r0 + .85, 24.76), (r1 - 1.15, 24.58), (r1 - 1.15, 24.42)))
        arc('ceramic', start + .08, end - .08, lambda f: ((r1 - .65, 24.2), (r1 - .35, 25.24), (r1 + .25, 25.30), (r1 + 1.05, 22.26), (r1, 22.24)))
        for j in range(1, 5):
            a = start + (end - start) * j / 5
            arc('graphite', a - .09, a + .09, lambda f: ((r0 + .46, 24.65), (r0 + .46, 24.91), (r1 - .8, 24.78), (r1 - .8, 24.55)), steps=1)


def garden():
    # Ramp straight off the 17 m plaza bridge into the cut in the planted ledge.
    loft('ceramic', [[(x, y, z) for x, y in ((-.15, 16.88), (8.35, 16.88), (8.35, top), (-.15, top))]
                     for z, top in ((13.8, 17.6), (22.5, 17.6), (25.65, 17.02))])
    obox(A['graphite'], (4.1, 18.45, 14.06), (8.30, .20, .22))
    for x in (.15, 2.78, 5.42, 8.05):
        obox(A['ceramic'], (x, 18.0, 14.06), (.15, .92, .18))
    kit = {role: Acc() for role in ROLES}
    kit.update(white=A['ceramic'], pane_w=A['graphite'])
    span, rise, reach, wall = 13.4, 7.05, 7.2, .62
    x, y, z = 4.1, 17.53, 19.65
    arch_shell(Ctx(kit, Random(2127)), (x, y, z), (0, 0, 1), span=span, rise=rise, reach=reach, t=wall, n=18)
    for offset in (-3.25, 3.25):
        strip = []
        for f in (0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1):
            k = 1 - .2 * f ** 2
            height = (rise - wall / 2) * k * sqrt(1 - (offset / ((span - wall) / 2 * k)) ** 2)
            strip.append((x + offset, y + height - .04, z + reach * f))
        limb(A['cove'], strip, .115, .115, 6)


for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.context.scene.unit_settings.system = 'METRIC'
tunnel()
frontage()
garden()
for role, (base, roughness, emissive, strength) in FINISHES.items():
    finish = material(f'ring_{role}', base, roughness, emissive, strength)
    obj = finish_mesh(f'Ring_{role.title()}', A[role], finish)
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    bmesh.ops.triangulate(mesh, faces=[face for face in mesh.faces if len(face.verts) > 4])
    mesh.to_mesh(obj.data)
    mesh.free()
    bpy.context.collection.objects.link(obj)

output = HERE / 'ring-gate-2127'
bpy.context.preferences.filepaths.save_version = 0
assert bpy.ops.wm.save_as_mainfile(filepath=str(output.with_suffix('.blend'))) == {'FINISHED'}
assert bpy.ops.export_scene.gltf(filepath=str(output.with_suffix('.glb')), export_format='GLB',
                                export_yup=True, export_animations=False, export_cameras=False, export_lights=False) == {'FINISHED'}
