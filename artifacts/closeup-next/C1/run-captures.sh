#!/bin/sh
set -eu
export CITY2127_CITY_URL=http://127.0.0.1:5194/
export CITY2127_EVIDENCE_DIR=artifacts/closeup-next/C1/final
for mode in capture perf compare; do
  for shot in nw:focal sw:focal sw:district se:district energy:ring hero; do
    CITY_SHOT_ONLY="$shot" node artifacts/closeup-polish/capture.mjs "$mode"
  done
done

node artifacts/closeup-next/C1/compare.mjs compare
