"""SE +1 'high' tower for city2127 (spec: artifacts/se-high-blender/spec.md, R2).

Re-run headless (Blender 5.2):
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_tower.py
Writes concentration-tower-high.blend and .glb next to this file (glTF preset, no Meshopt/Draco).

Units are the site's local units (towerUpper group space; the site root scales x3 to metres).
Coordinates in this file are three.js (x, y up, z); geo_helpers.B maps them to Blender (x, -z, y).
Geometry is accumulated per role material and joined: one mesh per role. Furniture, people and greenery are NOT here:
they are kit props (asset/models/city-kit-2127) placed by concentrationTower.ts.
"""
import math
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from geo_helpers import Acc, circle_pts, cyl, finish_mesh, material, obox, plane, rrect_pts, sweep, tube, bullnose, ring_section  # noqa: E402

HW, LOBBY, HF = 5.2, 3.6, 2.4
TOP = LOBBY + 14 * HF          # cap underside = ceiling of the open floor 13
SLAB_T = .26
GLASS = 2.62                   # glazing plane: between the pier faces (2.25..2.65)
WALL = 2.4                     # inward-facing room walls
AMBER_FLOORS = (0, 3, 6, 9, 12)
LIFT = (1.0, -3.6)             # centre of the separate lift tube (x, z)
CAP_R = 3.7                    # spec says 3.4; the slab corners reach 3.67, so the cap covers them

ROLES = {  # role: (preview rgba, emission)
    "se_white": ((.95, .94, .9, 1), None), "se_amber": ((1, .6, .15, 1), (1, .6, .15, 1)),
    "se_room": ((.97, .8, .65, 1), None), "se_cream": ((.99, .95, .9, 1), None),
    "se_ceiling": ((1, 1, 1, 1), None), "se_light": ((1, .96, .86, 1), (1, .96, .86, 1)),
    "se_glass": ((.95, .95, .95, .08), None), "se_lift_glass": ((.86, .93, .98, .35), None), "se_paving": ((.93, .9, .85, 1), None),
}
SIDES = (((1, 0), (0, 1)), ((-1, 0), (0, -1)), ((0, 1), (-1, 0)), ((0, -1), (1, 0)))  # (normal, tangent): +X -X +Z -Z


def at(side, u, dist):
    (nx, nz), (tx, tz) = SIDES[side]
    return nx * dist + tx * u, nz * dist + tz * u


def build():
    acc = {k: Acc() for k in ROLES}
    W, A, R, C, CE, G, P, V = (acc[k] for k in ("se_white", "se_amber", "se_room", "se_cream", "se_ceiling", "se_light", "se_glass", "se_paving"))
    LG = acc["se_lift_glass"]
    sq = lambda w, r, n=6: (lambda k, w=w, r=r, n=n: rrect_pts(0, 0, w / 2, w / 2, (r,) * 4, n, k))

    sweep(W, sq(6.4, .9), [(0, 0), (0, .12)])  # plinth
    slabs = [0] + [LOBBY + i * HF for i in range(14)]  # lobby floor, then the slab of floors 0..13
    for y in slabs:
        sweep(W, sq(5.6, .7), bullnose(max(y, .08), y + SLAB_T, .08))
    for i in AMBER_FLOORS:  # T3: amber band .2 tall, .08 proud, only every third floor
        c = LOBBY + i * HF + SLAB_T / 2
        sweep(A, sq(5.6, .7), ring_section(-.08, .03, c - .1, c + .1), caps=(False, False), closed=True)
    for sx in (-1, 1):  # T2: square corner piers .4 x .4
        for sz in (-1, 1):
            obox(W, (sx * 2.45, (.05 + TOP) / 2, sz * 2.45), (.4, TOP - .05, .4))

    floors = [(0, LOBBY, True, "se_room")] + [(LOBBY + i * HF, HF, False, "se_room" if i < 6 else "se_cream") for i in range(13)]
    for y0, h, lobby, wall in floors:
        ya, yb = y0 + SLAB_T, y0 + h
        for side in range(4):
            n, t = SIDES[side]
            x, z = at(side, 0, GLASS)
            o = lambda u, d, y, s=side: (at(s, u, d)[0], y, at(s, u, d)[1])
            plane(P, [o(-2.25, GLASS, ya), o(2.25, GLASS, ya), o(2.25, GLASS, yb), o(-2.25, GLASS, yb)], (n[0], 0, n[1]))
            door = lobby and side == 0
            for u in (-.75, .75):  # 3 bays: two slim mullions (the lobby door frame is a little heavier)
                x, z = at(side, u, GLASS)
                obox(W, (x, (ya + yb) / 2, z), (.12 if door else .06, yb - ya + .1, .12 if door else .06), t, n)
            x, z = at(side, 0, GLASS)
            obox(W, (x, yb - .03, z), (4.52, .06, .07), t, n)  # head rail
            if not door:
                obox(W, (x, ya + .03, z), (4.52, .06, .07), t, n)  # sill rail
            wl = lambda u, y: o(u, WALL, y)
            tgt = R if wall == "se_room" else C
            plane(tgt, [wl(-WALL, ya), wl(WALL, ya), wl(WALL, yb), wl(-WALL, yb)], (-n[0], 0, -n[1]))
        plane(CE, [(-2.2, yb - .02, -2.2), (2.2, yb - .02, -2.2), (2.2, yb - .02, 2.2), (-2.2, yb - .02, 2.2)], (0, -1, 0))
        for z in (-1.2, 1.2):  # two linear lights across x
            obox(G, (0, yb - .032, z), (3.4, .03, .1))
    # T9 lobby: central white-framed double door on +X
    px = GLASS + .03
    obox(W, (px, 2.9, 0), (.12, .16, 1.62), (0, 1), (1, 0))   # head beam
    obox(G, (px + .02, 2.8, 0), (.06, .05, 1.4), (0, 1), (1, 0))  # lit lintel strip
    obox(W, (px, (SLAB_T + 2.85) / 2, 0), (.04, 2.85 - SLAB_T, .04), (0, 1), (1, 0))  # door meeting stile

    # T7 open floor 13: piers only, white tank drum, six spots under the cap
    y13 = LOBBY + 13 * HF + SLAB_T
    cyl(W, -.6, .6, 1.1, y13 - .01, y13 + 1.9, 24)
    for i in range(6):
        a = 2 * math.pi * i / 6 + .3
        cyl(G, 2.0 * math.cos(a), 2.0 * math.sin(a), .1, TOP - .06, TOP + .01, 10)
    # cap and planter rim (R3: the Meter ring is the only amber on the crown, so no GLB band under the cap)
    sweep(W, lambda k: circle_pts(0, 0, CAP_R, 64, k), bullnose(TOP, TOP + .7, .12))
    sweep(W, lambda k: circle_pts(0, 0, 3.5, 64, k), ring_section(0, .1, TOP + .68, TOP + .95), caps=(False, False), closed=True)

    # T8 separate lift tube, 1.6 x 1.6, beside the -Z face
    lx, lz = LIFT
    lift = lambda k, w=1.6: rrect_pts(lx, lz, w / 2, w / 2, (.3,) * 4, 4, k)
    top = TOP - .17
    sweep(LG, lift, [(0, .02), (0, top)], caps=(False, False), want=lambda c: (c[0] - lx, 0, c[2] - lz))
    d = .5 + .3 * math.cos(math.pi / 4)
    for dx in (-1, 1):
        for dz in (-1, 1):
            if dx > 0:
                cyl(A, lx + dx * d, lz + dz * d, .05, .02, top, 8)
            else:
                cyl(W, lx + dx * d, lz + dz * d, .06, .02, top, 8)
    levels = [.2] + [LOBBY + i * HF + .13 for i in range(14)]  # R3: a white ring band at every slab, tie brackets every 4th
    for n, c in enumerate(levels):
        sweep(W, lift, ring_section(-.06, -.005, c - .06, c + .06), caps=(False, False), closed=True)
        if n % 4 == 1 or n == 0:
            obox(W, (lx, c, lz + .95), (.3, .1, .3))  # tie bracket to the -Z face
    sweep(W, lambda k: rrect_pts(lx, lz, .85, .85, (.35,) * 4, 4, k), [(0, top), (0, top + .15)])  # roof

    # T9 forecourt: pale paving with a white path to the door
    sweep(V, lambda k: rrect_pts(4.6, 0, 2.0, 3.2, (.3, 0, 0, .3), 4, k), [(0, .005), (0, .04)])
    obox(W, (4.55, .035, 0), (3.8, .03, 1.5))
    return acc


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = bpy.data.objects.new("ROOT_CONCENTRATION_TOWER_HIGH", None)
    bpy.context.scene.collection.objects.link(root)
    tris = 0
    for name, a in build().items():
        rgba, emit = ROLES[name]
        ob = finish_mesh("TOWER_HIGH_" + name, a, material(name, rgba, .1 if name in ("se_glass", "se_lift_glass") else .6, emit=emit, emit_strength=1.0))
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = root
        tris += sum(len(p.vertices) - 2 for p in ob.data.polygons)
    bpy.context.view_layer.update()
    blend = os.path.join(HERE, "concentration-tower-high.blend")
    glb = os.path.join(HERE, "concentration-tower-high.glb")
    bpy.context.preferences.filepaths.save_version = 0  # no .blend1 backup
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in [root, *root.children]:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_normals=True, export_materials="EXPORT", export_animations=False,
                              export_cameras=False, export_lights=False, export_extras=False)
    print("@@BUILD@@", {"tris": tris, "glb_bytes": os.path.getsize(glb)})


if __name__ == "__main__":
    main()
