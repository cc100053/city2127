"""Review-only render of pod-frame-tower-2127.blend beside a 1.8 m figure (not exported).
  /Applications/Blender.app/Contents/MacOS/Blender -b pod-frame-tower-2127.blend --factory-startup --python-exit-code 1 \
      -P review_pod_tower.py -- out.png [--view target|front|back|right] [--eevee]
`target` matches the owner image: elevated three-quarter view from the front-left.
"""
import math
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
view = args[args.index('--view') + 1] if '--view' in args else 'target'
VIEWS = {'target': (-12, 28, 140, 66), 'front': (0, 8, 140, 70), 'back': (180, 20, 140, 70), 'right': (90, 15, 140, 70),
         'pod': (-20, 18, 60, 22)}
az_d, el_d, d, ortho = VIEWS[view]
az, el = math.radians(az_d), math.radians(el_d)
sc = bpy.context.scene
tx, ty, tz = (-14, 12, 22) if view == 'pod' else (0, 0, 16)                                               # Blender target (x, -z, y)
cam_loc = (tx + d * math.cos(el) * math.sin(az), ty + d * math.cos(el) * math.cos(az), tz + d * math.sin(el))
bpy.ops.object.camera_add(location=cam_loc)
cam = bpy.context.object
direction = (tx - cam_loc[0], ty - cam_loc[1], tz - cam_loc[2])
from mathutils import Vector  # noqa: E402
cam.rotation_euler = Vector(direction).to_track_quat('-Z', 'Y').to_euler()
cam.data.type = 'ORTHO'
cam.data.ortho_scale = ortho
sc.camera = cam
sc.render.resolution_x, sc.render.resolution_y = 1600, 1200
sc.render.engine = 'BLENDER_EEVEE' if '--eevee' in args else 'BLENDER_WORKBENCH'
sc.world = bpy.data.worlds.new('w')
sc.world.use_nodes = True
nt = sc.world.node_tree
bg = next(n for n in nt.nodes if n.type == 'BACKGROUND')
bg.inputs['Strength'].default_value = .55
tc, sep, ramp = nt.nodes.new('ShaderNodeTexCoord'), nt.nodes.new('ShaderNodeSeparateXYZ'), nt.nodes.new('ShaderNodeValToRGB')
nt.links.new(tc.outputs['Generated'], sep.inputs[0])                     # R2: sky gradient so glossy pods catch a sheen
nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = .45, (.80, .80, .76, 1)
ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = .75, (.42, .60, .90, 1)
nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
sc.world.color = (.62, .74, .88)
sun = bpy.data.lights.new('sun', 'SUN')
sun.energy = 4.5
sun.angle = math.radians(3)
so = bpy.data.objects.new('sun', sun)
so.rotation_euler = (math.radians(48), 0, math.radians(150))
sc.collection.objects.link(so)
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -.01))
gm = bpy.data.materials.new('ground')
gm.diffuse_color = (.80, .78, .72, 1)
gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.80, .78, .72, 1)
bpy.context.object.data.materials.append(gm)
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Punchy'                                  # R2: punchier look, -0.6 EV (R1 washed out)
sc.view_settings.exposure = -.6
if sc.render.engine == 'BLENDER_WORKBENCH':
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'MATERIAL'
    sc.display.shading.show_shadows = True
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
