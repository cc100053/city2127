"""Tile PNG/JPG renders into one comparison sheet (Blender's numpy; no labels: the caller lists the order).

blender -b --factory-startup -P sheet.py -- <out.png> <cols> <tile_w> <img1> <img2> ...   (missing paths leave a grey tile)
"""
import os
import sys

import bpy
import numpy as np

args = sys.argv[sys.argv.index("--") + 1:]
out, cols, tw = args[0], int(args[1]), int(args[2])
paths = args[3:]
tiles = []
for p in paths:
    if not os.path.exists(p):
        tiles.append(None)
        continue
    im = bpy.data.images.load(p)
    w, h = im.size
    a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
    th = int(round(h * tw / w))
    ys = (np.arange(th) * h / th).astype(int)
    xs = (np.arange(tw) * w / tw).astype(int)
    tiles.append(a[ys][:, xs])
th = max(t.shape[0] for t in tiles if t is not None)
rows = (len(tiles) + cols - 1) // cols
gap = 8
sheet = np.ones((rows * th + (rows + 1) * gap, cols * tw + (cols + 1) * gap, 4), dtype=np.float32)
for k, t in enumerate(tiles):
    r, c = k // cols, k % cols
    y0 = sheet.shape[0] - (r + 1) * (th + gap)                 # Blender pixels run bottom-up
    x0 = gap + c * (tw + gap)
    if t is None:
        sheet[y0:y0 + th, x0:x0 + tw, :3] = .5
    else:
        sheet[y0 + th - t.shape[0]:y0 + th, x0:x0 + tw] = t
img = bpy.data.images.new("sheet", sheet.shape[1], sheet.shape[0], alpha=False)
img.pixels.foreach_set(sheet.ravel())
img.filepath_raw = out
img.file_format = "JPEG" if out.lower().endswith(".jpg") else "PNG"
img.save()
print("SHEET", out, sheet.shape[1], sheet.shape[0])
