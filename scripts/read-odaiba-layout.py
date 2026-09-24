"""Read-only extraction: blender --background --factory-startup --python scripts/read-odaiba-layout.py

Writes runtime placement metadata and independent world bounds from the committed
Phase 03D source. Never saves or exports the Blender scene.
"""
import bpy
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'asset/models/odaiba-masterplan/odaiba_masterplan_v01_phase03d.blend'
ASSETS = {
    'aqua': 'aqua-city-odaiba', 'decks': 'decks-tokyo-beach',
    'divercity': 'divercity-tokyo-plaza', 'divercity-office': 'divercity-office-tower',
    'fuji': 'fuji-tv', 'hilton': 'hilton-tokyo-odaiba',
    'nikko': 'grand-nikko-tokyo-daiba', 'telecom': 'telecom-center',
}
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
records = []
for key, asset in ASSETS.items():
    parent = bpy.data.objects['PLACEMENT_' + key]
    points = [o.matrix_world @ v.co for o in parent.children_recursive
              if o.type == 'MESH' and not o.hide_render for v in o.data.vertices]
    adapter = next((o for o in parent.children if o.name.startswith('COORDINATE_ADAPTER_')), None)
    records.append({
        'id': asset,
        'positionBlender': list(parent.matrix_world.translation),
        'rotationZ': parent.rotation_euler.z,
        'scale': list(parent.scale),
        'adapterRotationX': adapter.rotation_euler.x if adapter else 0,
        'boundsBlender': [[min(p[i] for p in points) for i in range(3)],
                          [max(p[i] for p in points) for i in range(3)]],
        'glbSha256': hashlib.sha256((ROOT / f'asset/models/{asset}/{asset}.glb').read_bytes()).hexdigest(),
    })
assert len(records) == 8
result = {'source': str(SOURCE.relative_to(ROOT)).replace('\\', '/'),
          'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
          'blenderVersion': bpy.app.version_string, 'buildings': records}
(ROOT / 'src/odaiba-layout.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print('Extracted eight Phase 03D placements without modifying source assets.')
