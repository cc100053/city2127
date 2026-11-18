"""Review-only render of pod-frame-tower-2127.blend beside a 1.8 m figure (not exported).
  /Applications/Blender.app/Contents/MacOS/Blender -b pod-frame-tower-2127.blend --factory-startup --python-exit-code 1 \
      -P review_pod_tower.py -- out.png [--view target3q|target|front|back|right|pod|pod3q] [--eevee] [--r2light]
`target3q` matches the owner image: 35 mm perspective from the corner of the front (-z) and +x faces (the +x face
on screen left), 1448 x 1086; R4 lowered it from 32 to 25 deg down (the roof dominated); `target3q32` keeps R3's. `target` is the R1/R2 near-front orthographic view, kept for round compares.
R3 lighting: warm 5,000 K sun (strength 5, from the front-right, 45 deg up), blue sky gradient at .35, Khronos PBR
Neutral at -0.5 EV (AgX greyed the pastels; sampled against the owner image with the @@PROBE@@ pixels).
--r2light restores the R2 lighting for comparisons.
"""
import math
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:]
out = args[0]
view = args[args.index('--view') + 1] if '--view' in args else 'target'
VIEWS = {'target3q': (47, 25, 76, 0), 'target3q32': (47, 32, 84, 0), 'pod3q': (62, 16, 30, 0), 'target': (-12, 28, 140, 66), 'front': (0, 8, 140, 70), 'back': (180, 20, 140, 70), 'right': (90, 15, 140, 70),
         'pod': (-20, 18, 60, 22)}
az_d, el_d, d, ortho = VIEWS[view]
az, el = math.radians(az_d), math.radians(el_d)
sc = bpy.context.scene
tx, ty, tz = {'pod': (-14, 12, 22), 'target3q': (1, 1, 15.0), 'target3q32': (1, 1, 13.5), 'pod3q': (20, -3, 19)}.get(view, (0, 0, 16))                                               # Blender target (x, -z, y)
cam_loc = (tx + d * math.cos(el) * math.sin(az), ty + d * math.cos(el) * math.cos(az), tz + d * math.sin(el))
bpy.ops.object.camera_add(location=cam_loc)
cam = bpy.context.object
direction = (tx - cam_loc[0], ty - cam_loc[1], tz - cam_loc[2])
from mathutils import Vector  # noqa: E402
cam.rotation_euler = Vector(direction).to_track_quat('-Z', 'Y').to_euler()
if ortho:
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = ortho
else:
    cam.data.lens, cam.data.sensor_width, cam.data.sensor_fit = 35, 36, 'HORIZONTAL'
sc.camera = cam
r2 = '--r2light' in args


def opt(name, default):                                                  # tuning overrides, e.g. --exposure -.3
    return float(args[args.index(name) + 1]) if name in args else default
sc.render.resolution_x, sc.render.resolution_y = (1448, 1086) if view in ('target3q', 'target3q32', 'pod3q') else (1600, 1200)
sc.render.resolution_percentage = int(opt('--pct', 100))                 # e.g. --pct 200 for close crops
sc.render.engine = 'BLENDER_EEVEE' if '--eevee' in args else 'BLENDER_WORKBENCH'
sc.world = bpy.data.worlds.new('w')
sc.world.use_nodes = True
nt = sc.world.node_tree
bg = next(n for n in nt.nodes if n.type == 'BACKGROUND')
bg.inputs['Strength'].default_value = .55 if r2 else opt('--sky', .35)
tc, sep, ramp = nt.nodes.new('ShaderNodeTexCoord'), nt.nodes.new('ShaderNodeSeparateXYZ'), nt.nodes.new('ShaderNodeValToRGB')
nt.links.new(tc.outputs['Generated'], sep.inputs[0])                     # R2: sky gradient so glossy pods catch a sheen
nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
if r2:
    ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = .45, (.80, .80, .76, 1)
    ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = .75, (.42, .60, .90, 1)
else:                                                                     # R3: horizon haze to a blue zenith
    ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = .5, (.85, .88, .92, 1)
    ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = .8, (.45, .62, .92, 1)
nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
sc.world.color = (.62, .74, .88)
sun = bpy.data.lights.new('sun', 'SUN')
sun.energy = 4.5 if r2 else opt('--sun', 5.0)
sun.angle = math.radians(3)
so = bpy.data.objects.new('sun', sun)
if r2:
    so.rotation_euler = (math.radians(48), 0, math.radians(150))
else:                                                                     # R3: warm afternoon sun from the +x / front side
    sun.color = (1, .93, .82)
    s_az, s_el = math.radians(opt('--saz', 25)), math.radians(opt('--sel', 45))
    sdir = Vector((-math.cos(s_el) * math.sin(s_az), -math.cos(s_el) * math.cos(s_az), -math.sin(s_el)))
    so.rotation_euler = sdir.to_track_quat('-Z', 'Y').to_euler()
sc.collection.objects.link(so)
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -.01))
gm = bpy.data.materials.new('ground')
gm.diffuse_color = (.80, .78, .72, 1)
gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.80, .78, .72, 1)
bpy.context.object.data.materials.append(gm)
sc.view_settings.view_transform = 'AgX'
sc.view_settings.view_transform = 'AgX' if r2 else (args[args.index('--vt') + 1] if '--vt' in args else 'Khronos PBR Neutral')
sc.view_settings.look = 'AgX - Punchy' if r2 else (args[args.index('--look') + 1] if '--look' in args else
                                                   'AgX - Base Contrast' if sc.view_settings.view_transform == 'AgX' else 'None')  # R2: -0.6 EV was too dark against the target
sc.view_settings.exposure = -.6 if r2 else opt('--exposure', -.5)
if sc.render.engine == 'BLENDER_WORKBENCH':
    sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'MATERIAL'
    sc.display.shading.show_shadows = True
sc.render.filepath = out
PROBES = {'pod_top': (22.0, 27.3, 7.0), 'pod_top_front': (-22.0, 27.6, -11.8), 'pod_pink': (20.4, 15.6, -6.4), 'col_x': (18.24, 18.0, -7.0),
          'col_front': (10.5, 18.0, -14.74), 'beam_front': (7.0, 12.9, -14.62), 'pod_sage': (19.0, 21.4, -7.0),
          'pod_sage_front': (7.0, 7.4, -14.4), 'shop': (0.0, 2.0, -13.5)}           # three.js metres
if view == 'target3q':                                                    # pixel of each probe, for colour checks
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    for name, (px, py, pz) in PROBES.items():
        q = world_to_camera_view(sc, cam, Vector((px, -pz, py)))
        print('@@PROBE@@', name, round(q.x * sc.render.resolution_x), round((1 - q.y) * sc.render.resolution_y))  # at 100 %
print('@@REVIEW@@', view, sc.render.engine, sc.view_settings.look, sc.view_settings.exposure, sun.energy, bg.inputs['Strength'].default_value)
bpy.ops.render.render(write_still=True)
