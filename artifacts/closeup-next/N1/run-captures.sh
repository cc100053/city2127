#!/bin/sh
# N1: unmodified S0 capture runner (A6 originals, canonical uncapped A5) for the five energy shots plus hero.
set -eu
export CITY2127_CITY_URL=${CITY2127_CITY_URL:-http://127.0.0.1:5174/}
export CITY2127_EVIDENCE_DIR=${CITY2127_EVIDENCE_DIR:-artifacts/closeup-next/N1/final}
for mode in capture perf; do
  for shot in energy:garden energy:garden2 energy:ring energy:wing energy:island hero; do
    CITY_SHOT_ONLY="$shot" node artifacts/closeup-polish/capture.mjs "$mode"
  done
done
