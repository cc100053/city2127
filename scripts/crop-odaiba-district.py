"""Derive the hero-district environment from the committed Phase 03D export.

blender --background --factory-startup --python scripts/crop-odaiba-district.py

Reads odaiba_masterplan_v01_phase03d_environment.glb (never modified) and writes
odaiba_district_v01_environment.glb beside it:
- street furniture, stations and tree groups whose centre lies outside DISTRICT are
  deleted whole;
- ground, roads, guideway, context massing and the sea are kept whole: beyond the
  district they are the low-detail Odaiba backdrop (the runtime recedes them into haze);
- the hidden roadside-tree blockout is dropped.
DISTRICT mirrors src/layout.ts (tests/odaiba.test.ts checks the export).
"""
import bpy
import bmesh
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'asset/models/odaiba-masterplan'
SOURCE = FOLDER / 'odaiba_masterplan_v01_phase03d_environment.glb'
TARGET = FOLDER / 'odaiba_district_v01_environment.glb'
# Three.js metres: x east, z south. Blender after glTF import: y = -z.
MIN_X, MAX_X, MIN_Z, MAX_Z = -460, 260, -360, 320
DETAIL = re.compile(r'^(PUBLIC_|STREETLIGHT_|LANDSCAPE_TREE|STATIONS)')
DROP = {'ROADSIDE_TREE_INSTANCES'}

def in_district(x, y):
    return MIN_X <= x <= MAX_X and MIN_Z <= -y <= MAX_Z

def drop_outside_pieces(bm):
    parent = list(range(len(bm.verts)))
    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    welded = {}
    for v in bm.verts:
        key = tuple(round(c, 3) for c in v.co)
        if key in welded: parent[root(v.index)] = root(welded[key])
        else: welded[key] = v.index
    for e in bm.edges: parent[root(e.verts[0].index)] = root(e.verts[1].index)
    bounds = {}
    for v in bm.verts:
        r = root(v.index); lo, hi = bounds.setdefault(r, [v.co.copy(), v.co.copy()])
        for k in range(3): lo[k] = min(lo[k], v.co[k]); hi[k] = max(hi[k], v.co[k])
    keep = {r: in_district((lo.x + hi.x) / 2, (lo.y + hi.y) / 2) for r, (lo, hi) in bounds.items()}
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep[root(v.index)]], context='VERTS')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
for obj in list(bpy.data.objects):
    if obj.name in DROP: bpy.data.objects.remove(obj)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for obj in [o for o in meshes if DETAIL.match(o.name)]:
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
    drop_outside_pieces(bm)
    bm.to_mesh(obj.data); bm.free()
    if not obj.data.polygons: bpy.data.objects.remove(obj)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(TARGET), export_format='GLB', use_selection=True, export_apply=True,
                          export_animations=False, export_cameras=False, export_lights=False)
print('Wrote', TARGET.name, 'from', SOURCE.name)
