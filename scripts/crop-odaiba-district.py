"""Derive the hero-district environment from the committed Phase 03D export.

blender --background --factory-startup --python scripts/crop-odaiba-district.py

Reads odaiba_masterplan_v01_phase03d_environment.glb (never modified) and writes
odaiba_district_v01_environment.glb beside it:
- detail pieces (context blocks, street furniture, stations, tree groups) whose centre
  lies outside DISTRICT are deleted whole;
- plate-wide ground, roads, guardrails and guideway are cut to DISTRICT grown by APRON
  with round corners, where the runtime haze reaches the fog colour;
- the hidden roadside-tree blockout is dropped; the sea is kept whole.
DISTRICT/APRON mirror src/layout.ts (tests/odaiba.test.ts checks the exported bounds).
"""
import bpy
import bmesh
import math
import re
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'asset/models/odaiba-masterplan'
SOURCE = FOLDER / 'odaiba_masterplan_v01_phase03d_environment.glb'
TARGET = FOLDER / 'odaiba_district_v01_environment.glb'
# Three.js metres: x east, z south. Blender after glTF import: y = -z.
MIN_X, MAX_X, MIN_Z, MAX_Z, APRON = -460, 260, -360, 320, 150
DETAIL = re.compile(r'^(CTX_|PUBLIC_|STREETLIGHT_|LANDSCAPE_TREE|STATIONS)')
KEEP_WHOLE = re.compile(r'^WATER_')
DROP = {'ROADSIDE_TREE_INSTANCES'}

def in_district(x, y):
    return MIN_X <= x <= MAX_X and MIN_Z <= -y <= MAX_Z

def apron_planes(segments=6):
    """Outward half-planes of the district grown by APRON, corners as tangent facets."""
    corners = [(MAX_X, -MIN_Z, 0), (MIN_X, -MIN_Z, 90), (MIN_X, -MAX_Z, 180), (MAX_X, -MAX_Z, 270)]
    planes = []
    for cx, cy, start in corners:
        for i in range(segments + 1):
            a = math.radians(start + 90 * i / segments)
            n = Vector((math.cos(a), math.sin(a), 0))
            planes.append((Vector((cx, cy, 0)) + n * APRON, n))
    return planes

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
planes = apron_planes()
for obj in list(meshes):
    if KEEP_WHOLE.match(obj.name): continue
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
    if DETAIL.match(obj.name):
        drop_outside_pieces(bm)
    else:
        for co, no in planes:
            geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
            bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_outer=True)
    bm.to_mesh(obj.data); bm.free()
    if not obj.data.polygons: bpy.data.objects.remove(obj)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(TARGET), export_format='GLB', use_selection=True, export_apply=True,
                          export_animations=False, export_cameras=False, export_lights=False)
print('Wrote', TARGET.name, 'from', SOURCE.name)
