"""Build three exterior GLBs in the ring gate's coordinate system.

Angles run counterclockwise in the ring plane from local +X. The lower
arc is cut by the existing skew tunnel. The lower arc, both shoulders and
the crown are editable collections in ring-body-2127.blend.
"""
from math import ceil, cos, radians, sin
from pathlib import Path
import sys

import bmesh
import bpy

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from geo_helpers import Acc, finish_mesh, material

CENTRE, INNER, OUTER, HALF = 90, 73, 105, 22.5
FINISHES = {
    'ceramic': ((.82, .84, .83, 1), .36, None, 0),
    'graphite': ((.050, .071, .092, 1), .48, None, 0),
    'glazing': ((.125, .204, .246, 1), .19, (.76, .44, .20, 1), .08),
    'shadow_glazing': ((.097, .162, .204, 1), .23, None, 0),
}


def section(a, radial, axial):
    """Map a normalized radial and axial profile to local metres."""
    crown = max(0, sin(a))
    inner = INNER + 13.5 * crown ** 1.6
    depth = HALF - 9.5 * crown ** 1.5
    r = inner + radial * (OUTER - inner)
    return (r * cos(a), CENTRE + r * sin(a), axial * depth)


def sweep(acc, start, end, profile):
    """Sweep a closed radial/axial profile along a run of the hoop."""
    steps = max(1, ceil((end - start) / 2.25))
    size = len(profile)
    points = [section(radians(start + (end - start) * i / steps), r, z)
              for i in range(steps + 1) for r, z in profile]
    faces = [(i * size + j, i * size + (j + 1) % size,
              (i + 1) * size + (j + 1) % size, (i + 1) * size + j)
             for i in range(steps) for j in range(size)]
    faces.extend([tuple(reversed(range(size))), tuple(range(steps * size, len(points)))])
    acc.solid(points, faces)


def band(acc, start, end, r0, r1, z0, z1):
    sweep(acc, start, end, ((r0, z0), (r1, z0), (r1, z1), (r0, z1)))


def build_arc(meshes, start, end, kind):
    """Fill one 60–120° arc with ceramic cassettes, deep ribs and glazing."""
    ceramic, steel = meshes['ceramic'], meshes['graphite']
    lower, crown = kind == 'lower', kind == 'crown'
    bays = round((end - start) / (12 if crown else 10))
    step = (end - start) / bays
    # Each sector has a continuous dark backing. The two shells meet on a shadow joint.
    sweep(steel, start + .065, end - .065, (
        (.023, -.89), (.82, -.89), (.987, -.67), (.987, .67),
        (.82, .89), (.023, .89), (.023, .63), (.037, 0), (.023, -.63),
    ))

    for i in range(bays):
        a, b = start + i * step, start + (i + 1) * step
        transfer = lower and -65 < a < -31
        split = (a + b) / 2
        for lo, hi in ((a + .28, split - .13), (split + .13, b - .28)):
            # Folded cassette returns wrap both shoulders of the outer shell.
            sweep(ceramic, lo, hi, (
                (.69, -.88), (.69, -.955), (.755, -1), (.91, -1), (1, -.75),
                (1, .75), (.91, 1), (.755, 1), (.69, .955), (.69, .88),
                (.88, .86), (.954, .59), (.954, -.59), (.88, -.86),
            ))

        for side in (-1, 1):
            def panel(acc, lo, hi, r0, r1, z0, z1):
                band(acc, lo, hi, r0, r1, z0 * side, z1 * side)

            # The inner return stands proud of the glass and meets the R1 folded rim.
            sweep(ceramic, a + .34, b - .34, tuple((r, z * side) for r, z in (
                (.002, .815), (.002, .927), (.036, .985),
                (.116 if lower else .093, .961), (.137 if lower else .117, .88),
            )))
            panes = 4 if lower else 3
            length = (step - 1.1) / panes
            for j in range(panes):
                lo = a + .55 + j * length
                role = 'shadow_glazing' if (i * 3 + j + (side == 1)) % 7 in (0, 4) else 'glazing'
                panel(meshes[role], lo + .095, lo + length - .095, .125, .681, .888, .908)
            # Recessed mullions separate panes; a transom gives the garden bays a walkable scale.
            for j in range(1, panes):
                seam = a + .55 + j * length
                panel(steel, seam - .073, seam + .073, .122, .685, .888, .94)
            if lower and not transfer:
                panel(steel, a + .55, b - .55, .453, .471, .909, .948)
                panel(ceramic, a + .62, b - .62, .481, .505, .905, .967)

        # Across the bore: gardens below, long gallery lights above. The bridge
        # enters in front of the first two inner strips; leave its bay open.
        for j, (near, far) in enumerate(((-.84, -.49), (-.43, -.04), (.04, .43), (.49, .84))):
            if lower and a in (-100, -90) and near > .45:
                continue
            role = 'shadow_glazing' if (i + 2 * j) % 5 == 0 else 'glazing'
            band(meshes[role], a + .53, b - .53, .009, .04, near, far)

        # At the transfer foot the darker ribs turn the corner into the portal;
        # at the crown the same connection becomes a thinner blade.
        rib = .50 if transfer else .25
        for side in (-1, 1):
            sweep(steel, a + .06, a + .06 + rib, tuple((r, z * side) for r, z in (
                (.029, .84), (.029, .996), (.15, .999),
                (.86, .999), (.928, .805), (.921, .77), (.79, .918), (.171, .921),
            )))


def gate_cutter(role, inset):
    # Match RING_GATE's skew through the building, including the side of the
    # jamb behind each mouth. The R1 lining supplies the visible tunnel edges.
    left, reach = 30.47 - inset, 29
    right = lambda z: 53.53 + inset + (65.03 - 53.53) * ((z + HALF) / (2 * HALF))
    outline = [(left, -reach), (right(-reach), -reach), (right(reach), reach), (left, reach)]
    acc = Acc()
    acc.solid([(x, y, z) for y in (-25, 22.035 + inset) for x, z in outline],
              [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
    return finish_mesh(f'Transfer_cut_{role}', acc, material(f'cutter_{role}', (0, 0, 0, 1)))


def triangulate_caps(mesh):
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.triangulate(bm, faces=[face for face in bm.faces if len(face.verts) > 4])
    bm.to_mesh(mesh)
    bm.free()


def main():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    materials = {role: material(f'ring_{role}', *finish) for role, finish in FINISHES.items()}
    sections = {
        'lower': ((-150, -30),),
        'shoulders': ((-30, 30), (150, 210)),
        'crown': ((30, 150),),
    }
    for name, arcs in sections.items():
        collection = bpy.data.collections.new(f'Ring_{name}')
        scene.collection.children.link(collection)
        meshes = {role: Acc() for role in materials}
        for start, end in arcs:
            build_arc(meshes, start, end, 'shoulder' if name == 'shoulders' else name)
        for role, acc in meshes.items():
            obj = finish_mesh(f'{name}_{role}', acc, materials[role])
            collection.objects.link(obj)
            if name == 'lower':
                # Stagger hidden cut faces behind the entrance lining.
                cutter = gate_cutter(role, {'ceramic': .0, 'graphite': .10, 'glazing': .19, 'shadow_glazing': .22}[role])
                scene.collection.objects.link(cutter)
                cutter.display_type = 'WIRE'
                cutter.hide_render = True
                cut = obj.modifiers.new('R1_skew_tunnel', 'BOOLEAN')
                cut.operation, cut.solver, cut.object = 'DIFFERENCE', 'EXACT', cutter
                cut.use_self = True
                obj.modifiers.new('Triangulate_cut_faces', 'TRIANGULATE').min_vertices = 5
                cutter.hide_set(True)
            triangulate_caps(obj.data)
    bpy.context.preferences.filepaths.save_version = 0
    assert bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'ring-body-2127.blend')) == {'FINISHED'}
    for name in sections:
        path = HERE / f'ring-{name}-2127.glb'
        assert bpy.ops.export_scene.gltf(filepath=str(path), collection=f'Ring_{name}', export_format='GLB',
                                         export_yup=True, export_apply=True, export_animations=False,
                                         export_cameras=False, export_lights=False) == {'FINISHED'}


if __name__ == '__main__':
    main()
