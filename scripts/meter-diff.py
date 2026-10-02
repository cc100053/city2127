#!/usr/bin/env python3
"""Share of a frame that visibly changed between two same-size captures (e.g. ?meters=ne:low vs ne:high).

usage: meter-diff.py a.png b.png [heatmap.png]
A pixel counts as changed when any RGB channel differs by more than 24/255 (above grade/noise jitter).
"""
import sys
import numpy as np
from PIL import Image

a, b = (np.asarray(Image.open(p).convert('RGB'), dtype=np.int16) for p in sys.argv[1:3])
if a.shape != b.shape:
    sys.exit(f'size mismatch {a.shape} vs {b.shape}')
changed = (np.abs(a - b).max(axis=2) > 24)
print(f'changed {changed.mean() * 100:.2f}% of {changed.size} px')
if len(sys.argv) > 3:
    heat = (a * .35).astype(np.uint8)
    heat[changed] = (255, 60, 200)
    Image.fromarray(heat).save(sys.argv[3])
