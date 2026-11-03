#!/usr/bin/env bash
# Fail when files added to artifacts/ since $1 are raw captures (PNG/video) or over 4 MB; see docs/VALIDATION.md, Evidence storage.
bad=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  case "$f" in
    *.png|*.PNG|*.mp4|*.mov|*.webm) echo "::error file=$f::raw capture in artifacts/; keep it in the evidence folder and publish a JPEG with scripts/publish-evidence.mjs"; bad=1 ;;
  esac
  if [ "$(wc -c < "$f")" -gt 4194304 ]; then echo "::error file=$f::over 4 MB; crop or split it"; bad=1; fi
done < <(git diff --name-only --diff-filter=A "$1" HEAD -- artifacts)
exit $bad
