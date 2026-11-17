"""Pod frame tower (owner image 2026-11-17): open concrete grid, pastel egg pods plugged into and cantilevered off it on
white branching struts, recessed lit glass floors with planted balconies, and a rooftop farm with arbors. Model only:
no lot, no streets, no Meter wiring yet.

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_pod_tower.py
Writes pod-frame-tower-2127.blend and .glb next to this file (glTF, no Meshopt/Draco).

Units are METRES, three.js axes (x, y up, z), front -z, base centre at the origin. Frame 35 x 28 m (5 x 4 bays of 7 m),
ground + 6 floors of 4.5 m, roof deck 31.5 m, arbors to ~35 m; pods reach ~6 m past the frame.
One node POD_FRAME_TOWER, one mesh per role, role materials named pft_<role>.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'city-kit-2127'))
from geo_helpers import Acc, blob, obox  # noqa: E402
import modules as M  # noqa: E402

CELL, COLS, ROWS, LEVELS, FH = 7.0, 5, 4, 7, 4.5
W, D = COLS * CELL, ROWS * CELL
ZF, ZB, XL, XR = -D / 2, D / 2, -W / 2, W / 2

# (x, y, z, length, height, depth, yaw, shell, strut bases). yaw turns the window (local -z): 0 front, -pi/2 right (+x),
# pi/2 left (-x), pi back. Strut bases sit on frame faces; [] = no strut (pod rests in its bay).
PODS = [
    # big cantilevered corner pods
    (-22.5, 24.6, -11.5, 13.0, 6.4, 7.6, .45, 'pod_y', [(XL - .5, 18.5, ZF + 1), (XL - .5, 19.0, -7)]),
    (22.8, 23.4, -5.0, 13.5, 6.6, 7.8, -.75, 'pod_y', [(XR + .5, 17.5, -7), (XR + .5, 17.0, 0)]),
    (-20.8, 11.0, -6.5, 8.5, 5.0, 6.0, 1.05, 'pod_p', [(XL - .5, 5.2, -7)]),
    (-15.5, 6.4, ZF - 3.2, 8.5, 4.8, 5.4, .2, 'pod_y', [(-17.5, 1.2, ZF - .5)]),
    (21.0, 14.2, 4.0, 9.0, 5.4, 6.2, -1.25, 'pod_p', [(XR + .5, 8.5, 7)]),
    (19.5, 29.8, 9.5, 7.5, 4.0, 5.0, -1.4, 'pod_y', [(XR + .5, 26.0, 7)]),
    (-19.6, 30.2, 3.0, 7.0, 3.8, 4.8, 1.5, 'pod_y', [(XL - .5, 26.5, 7)]),
    # front face, plugged into bays (half out of the grid)
    (-8.0, 11.6, ZF - 1.6, 7.6, 4.3, 5.0, 0.0, 'pod_y', [(-7.0, 9.0, ZF - .5)]),
    (-1.5, 6.9, ZF - 2.0, 8.2, 4.4, 5.2, .05, 'pod_p', [(-1.5, 4.5, ZF - .5)]),
    (0.5, 15.9, ZF - .8, 5.4, 3.5, 4.2, 0.0, 'pod_s', []),
    (8.0, 20.3, ZF - 1.0, 6.4, 3.8, 4.4, -.05, 'pod_p', [(7.0, 18.0, ZF - .5)]),
    (8.5, 15.8, ZF - .6, 5.6, 3.4, 4.0, 0.0, 'pod_y', []),
    (1.5, 20.4, ZF - .4, 4.6, 3.2, 3.6, 0.0, 'pod_s', []),
    (-13.5, 20.5, ZF - 1.0, 5.2, 3.4, 4.0, .1, 'pod_y', [(-14.0, 18.0, ZF - .5)]),
    (13.0, 7.0, ZF - .8, 5.6, 3.6, 4.2, 0.0, 'pod_y', []),
    (-8.0, 24.9, ZF - .6, 5.0, 3.4, 4.0, 0.0, 'pod_s', []),
    # right face
    (XR + 1.2, 20.4, 4.5, 6.4, 3.8, 4.6, -math.pi / 2, 'pod_p', [(XR + .5, 18.0, 3.5)]),
    (XR + .8, 6.9, -9.0, 5.6, 3.6, 4.2, -math.pi / 2, 'pod_s', []),
    # back and left faces (seen from the far side)
    (-6.0, 15.9, ZB + 1.4, 7.0, 4.0, 4.8, math.pi, 'pod_p', [(-7.0, 13.5, ZB + .5)]),
    (9.0, 24.9, ZB + 1.6, 7.4, 4.2, 5.0, math.pi, 'pod_y', [(10.5, 22.5, ZB + .5)]),
    (4.0, 7.0, ZB + .8, 5.6, 3.6, 4.2, math.pi, 'pod_s', []),
    (XL - 1.2, 15.9, 8.0, 6.0, 3.8, 4.4, math.pi / 2, 'pod_s', [(XL - .5, 13.5, 7)]),
]


def struts(ctx, pod):
    x, y, z, L, H, Dp, yaw, _shell, bases = pod
    c, s = math.cos(yaw), math.sin(yaw)
    tips = []
    for lx in (-.22 * L, .22 * L):
        tips.append((x + lx * c, y - .4 * H, z - lx * s))
    for b in bases:
        M.branch_strut(ctx, b, tips, r=.55 if L > 10 else .4)


def facade(ctx, xs, zs, tops):
    """Balcony railings, planted edge troughs and hanging vines on every face of levels 1-6; ground-floor arches."""
    A, rng = ctx.a, ctx.rng
    faces = [(xs, ZF, 'x', -1), (xs, ZB, 'x', 1), (zs, XL, 'z', -1), (zs, XR, 'z', 1)]
    for yt in tops[1:-1]:
        for lines, edge, along, sg in faces:
            for a0, a1 in zip(lines, lines[1:]):
                mid, span = (a0 + a1) / 2, a1 - a0 - 1.1
                inset = edge - sg * .8

                def at(u, yy, o=0.0):
                    return (u, yy, inset - sg * o) if along == 'x' else (inset - sg * o, yy, u)
                size = (span, 1.0, .05) if along == 'x' else (.05, 1.0, span)
                obox(A['glass'], at(mid, yt + .5), size)
                obox(A['white'], at(mid, yt + 1.05), (span, .07, .09) if along == 'x' else (.09, .07, span))
                if rng.random() < .9:
                    for t in range(3):
                        u = mid + (t - 1) * span / 3 + rng.uniform(-.4, .4)
                        blob(A['green' if t % 2 else 'leaf_l'], at(u, yt + .6, -.6), (.9, .65, .75), sub=2, seed=u + yt)
                if rng.random() < .6:
                    u = mid + rng.uniform(-span / 3, span / 3)
                    drop = rng.uniform(1.2, 3.2)
                    for k in range(int(drop / .5)):
                        blob(A['green' if k % 2 else 'leaf_l'], at(u + rng.uniform(-.15, .15), yt - .9 - k * .5, .5),
                             (.32, .36, .32), sub=1, seed=u * 7 + k)
    for xa in (-7.0, 0.0, 7.0):                                     # white arched entrances on the front, as in the image
        arc = [(xa + 2.4 * math.cos(math.pi * t / 12), 3.6 * math.sin(math.pi * t / 12) if 0 < t < 12 else 0.0, ZF + 2.2)
               for t in range(13)]
        M.limb(A['white'], arc, .28, .28, 8)


def build(ctx):
    xs, zs, tops = M.grid_frame(ctx, cols=COLS, rows=ROWS, levels=LEVELS, cell=CELL, floor_h=FH)
    for k, yb in enumerate(tops[:-1]):                              # recessed lit floors, ground to level 6
        M.glass_room(ctx, 0, 0, yb + (.25 if k == 0 else 0), W - 5.0, D - 5.0, FH - (.75 if k == 0 else .5), planters=True, edge=False)
    facade(ctx, xs, zs, tops)
    M.roof_farm(ctx, 0, 0, tops[-1], W - 1.2, D - 1.2, arbors=3, people=5)
    for pod in PODS:
        x, y, z, L, H, Dp, yaw, shell, _b = pod
        M.egg_pod(ctx, x, y, z, L, H, Dp, yaw, shell)
        struts(ctx, pod)
    for xa in (-12.0, 4.0, 12.0):                                   # residents at the entrances for scale
        M.person(ctx, xa, .2, ZF - 2.5)


def main():
    import bpy
    from geo_helpers import finish_mesh, material
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = bpy.data.objects.new('POD_FRAME_TOWER', None)
    bpy.context.scene.collection.objects.link(root)
    ctx = M.Ctx({k: Acc() for k in M.ROLES}, random.Random(2127))
    build(ctx)
    tris = 0
    for role, acc in ctx.a.items():
        if not acc.v:
            continue
        rgba, emit, st = M.ROLES[role]
        rough = .1 if role == 'glass' else .25 if role.startswith('pod_') or role == 'white' else .6
        ob = finish_mesh('pft_' + role, acc, material('pft_' + role, rgba, rough, emit=emit, emit_strength=st))
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = root
        tris += sum(len(p.vertices) - 2 for p in ob.data.polygons)
    blend = os.path.join(HERE, 'pod-frame-tower-2127.blend')
    glb = os.path.join(HERE, 'pod-frame-tower-2127.glb')
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in [root, *root.children_recursive]:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials='EXPORT', export_animations=False,
                              export_cameras=False, export_lights=False, export_extras=False)
    print('@@BUILD@@', {'tris': tris, 'glb_bytes': os.path.getsize(glb)})


if __name__ == '__main__':
    main()
