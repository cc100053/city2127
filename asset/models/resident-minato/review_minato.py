"""Minato review renders (EEVEE soft light, headless), same rig as Nagi's: turnaround in the sheet's tablet-up pose, head close-ups, rest pose.

  Blender -b --factory-startup --python-exit-code 1 -P review_minato.py -- OUTDIR
Writes OUTDIR/turn-{front,q3,back,side}.png, head-{front,q3}.png and rest-front.png.
"""
import os, sys
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, "..", "resident-nagi")]
import build_minato as B  # noqa: E402
import review_nagi as R  # noqa: E402  (setup, shot; OUT comes from the same argv)

TABLET_UP = {"upperArm.L": -.3, "lowerArm.L": -1.35, "hand.L": -.25}  # radians about X, as devMinato.ts holds the tablet

root, obs = B.build()
sc, cam = R.setup()
R.shot(sc, cam, "rest-front", 0, scale=2.0, cz=.86)
for n, rx in TABLET_UP.items():
    obs[n].rotation_euler = (rx, 0, 0)
bpy.context.view_layer.update()
for az, n in ((0, "front"), (-35, "q3"), (180, "back"), (90, "side")):  # the sheet's three-quarter view shows his right side
    R.shot(sc, cam, f"turn-{n}", az, scale=2.0, cz=.86)
for az, n in ((0, "front"), (-35, "q3")):
    R.shot(sc, cam, f"head-{n}", az, w=700, h=700, scale=.62, cz=1.47, el=4)
print("@@REVIEW@@", R.OUT)
