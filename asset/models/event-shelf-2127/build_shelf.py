"""SW 'event module shelf' (mixed state) for city2127 (spec: artifacts/sw-event-shelf/spec.md).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_shelf.py
Writes event-shelf-2127.blend and .glb next to this file (glTF preset, no Meshopt/Draco).

Units are METRES (three.js axes: x, y up, z; geo_helpers.B maps to Blender). The site scales the GLB by .25 (SW root is 4 m/unit).
Nodes: SHELF_FRAME (the 36 x 24 x 40 m lattice, centred on x/z 0, front -z) and MOD_A/B/C/D/E/F/H, one rounded event module each,
laid out in a row at z = -50 for review (the site reads each by name and instances it at the 60 slots; R2 modules are 8.6 x 8.6 x 3.2 m capsules, hall H 7.4 m). One mesh per role,
role materials named sw_<role> (remapCityMaterials). Animated parts (gantry bridge, trolley, cables, lock lights) are code.
"""
import os
import random
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'city-kit-2127'))
from geo_helpers import Acc, finish_mesh, material  # noqa: E402
import modules as M  # noqa: E402

VARIANTS = {'A': dict(h=3.2), 'B': dict(h=3.2), 'C': dict(h=3.2), 'D': dict(h=3.2), 'E': dict(h=3.2), 'F': dict(h=3.2), 'H': dict(h=7.4)}
ROW_Z = -50.0


_MATS = {}


def role_mat(role):
    """One material per role for the whole file (the GLB must hold exactly `sw_<role>`, no .001 copies)."""
    if role not in _MATS:
        rgba, emit, st = M.ROLES[role]
        _MATS[role] = material('sw_' + role, rgba, .1 if role == 'glass' else .6, emit=emit, emit_strength=st)
    return _MATS[role]


def add_node(root, name, ctx):
    node = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(node)
    node.parent = root
    tris = 0
    for role, acc in ctx.a.items():
        if not acc.v:
            continue
        ob = finish_mesh(f'{name}_{role}', acc, role_mat(role))
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = node
        tris += sum(len(p.vertices) - 2 for p in ob.data.polygons)
    return node, tris


def new_ctx(seed):
    return M.Ctx({k: Acc() for k in M.ROLES}, random.Random(seed))


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = bpy.data.objects.new('ROOT_EVENT_SHELF_2127', None)
    bpy.context.scene.collection.objects.link(root)
    report = {}
    ctx = new_ctx(2127)
    M.lattice_frame(ctx)
    frame, report['SHELF_FRAME'] = add_node(root, 'SHELF_FRAME', ctx)
    for i, (v, kw) in enumerate(VARIANTS.items()):
        ctx = new_ctx(100 + i)
        M.event_module(ctx, 0, 0, 0, v, **kw)
        node, report['MOD_' + v] = add_node(root, 'MOD_' + v, ctx)
        node.location = (-31.5 + i * 10.5, ROW_Z * -1, 0)  # Blender (x, -z, y): three.js z = ROW_Z
    bpy.context.view_layer.update()
    blend = os.path.join(HERE, 'event-shelf-2127.blend')
    glb = os.path.join(HERE, 'event-shelf-2127.glb')
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in [root, *root.children_recursive]:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials='EXPORT', export_animations=False,
                              export_cameras=False, export_lights=False, export_extras=False)
    print('@@BUILD@@', report, {'glb_bytes': os.path.getsize(glb)})


if __name__ == '__main__':
    main()
