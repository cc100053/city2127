#!/bin/zsh
# Step 8 FPS: headed Google Chrome (real compositor and vsync), 1920x1080, canvas data-fps 6 x 2.6 s after a 14 s load.
# usage: fps.sh <vite base url> <meters, e.g. nw:high> [session]   -> prints DPR/size, then hero day and night samples; discard the first sample.
B=$1 M=$2 S=${3:-fps}
P() { playwright-cli -s=$S "$@"; }
P open --browser=chrome --headed about:blank >/dev/null 2>&1; P resize 1920 1080 >/dev/null
run() {
  P goto "$B?meters=$M&hour=$2" >/dev/null 2>&1; sleep 14
  s=""; for i in 1 2 3 4 5 6; do sleep 2.6; s="$s $(P eval "() => document.querySelector('canvas').dataset.fps" 2>/dev/null | grep -oE '[0-9]+(\.[0-9]+)?' | tail -1)"; done
  echo "hero $M $1:$s"
}
run day 12
echo "dpr/size: $(P eval "() => devicePixelRatio+' '+innerWidth+'x'+innerHeight" 2>/dev/null | grep -oE '[0-9.]+ [0-9]+x[0-9]+')"
run night 22
P close >/dev/null 2>&1
