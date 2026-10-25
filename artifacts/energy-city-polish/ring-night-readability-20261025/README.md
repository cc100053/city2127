# Storage ring night readability — one approved trial, 2026-10-25

**Decision: rejected trial; accepted baseline runtime retained.** Owner and coordinator agree night hero improvement is insufficient and daylight loses edge highlights; [owner review](review.md). One trial only.

Owner: Codex batch chat `01a171dc-80a0-7e63-a14d-b7dbca7159b6`. Persistent clone `/Users/fatboy/city2127-energy-polish`, branch `codex/energy-city-polish`. No push/deploy/main integration.

[Dispatch](dispatch.md) · [Preflight](preflight.json) · [Target prompt](target-prompt.txt) · [Target lock](target-lock.json) · [Worker](worker.json) · [Handoff](../../../docs/handoffs/ring-night-readability.md).

## Target and immutable scope

Built-in imagegen edited the newly captured [actual hour22 hero](before/hero-night-mixed.png). Exact generated target [target.png](target.png), SHA256 `062aed68c2ad36de52bc2c153a20e540918fe2a45d4e7b67bc559a4d09ecee02`, locked 16:05:29 JST. Its 1672×941 resize, smoothing, background/UI/text drift are explicitly rejected; only the existing ring/support non-emissive silver finish is a reference. Runtime remains 1920×1080 DPR1 default, authored camera, fixed hour/reviewTime50. Previous accepted targets are untouched.

One fresh same-chat `gpt-6-astra`/low worker implemented only ring-local finish references, then stopped. Owner handles every gate and review. Trial source SHA256 `29168309084f683cf6c57e82ca45ee2c3fa2e3ba22e86cb4fc92c2103b60cf02`. [Original source](baseline-energyPrototype.ts) and exact before evidence are retained.

## Same-camera comparisons

| Configuration | Before | Trial (rejected) | Restored baseline |
| --- | --- | --- | --- |
| Hero day mixed | [original](before/hero-day-mixed.png) | [original](after/hero-day-mixed.png) | [original](restored/hero-day-mixed.png) |
| Hero night mixed | [original](before/hero-night-mixed.png) | [original](after/hero-night-mixed.png) | [original](restored/hero-night-mixed.png) |
| Ring detail day mixed | [original](before/detail-day-mixed.png) | [original](after/detail-day-mixed.png) | [original](restored/detail-day-mixed.png) |
| Ring detail night mixed | [original](before/detail-night-mixed.png) | [original](after/detail-night-mixed.png) | [original](restored/detail-night-mixed.png) |

Each DEV run uses the unchanged existing storage-ring 27-shot harness: day12/dusk18.5/night22, mixed/B/baseline, hero/detail, fixed charge10/hold30/release50, native static, live two times and live→static. Original PNGs and full URLs/times/hashes are in each `browser.json`. Static whole-scene PNGs are meaningful only at fixed reviewTime; other city actors remain live after native energy static mode.

[Protection checker](protected-check.mjs) compares exact outside-ring source, unrounded sorted world-space triangle coordinates in every energy part, non-ring finish hashes, shared finish values and local material ownership. First checker attempt compared in-memory undefined fields to JSON-omitted fields: original checker/log/baseline remain as `*-attempt1`/`*-v1`; repaired checker normalizes JSON and records geometry from the unchanged baseline source copy under `.dream-loop/ring-night-readability/baseline-runtime.ts` (only import locations adapted). No runtime/tests were changed to pass it.

Validation/review/checkpoint completion is recorded in the handoff and final checkpoint JSON after gates finish. No FPS, engineering, exhibition hardware or pixel-exact target achievement claim.


Restored-state root test/build/diff/protected check and full DEV27 PASS; final source exactly equals starting baseline01987a48 and verified source333e984. [Restored results](restored-summary.json), [81 PNG / 42 fixed-pair verification](evidence-check.json), [formal trial gate](formal-trial/browser.json), [source identity](source-identity.json), [cleanup](cleanup.json). Owner/coordinator rejected the sole trial; no candidate runtime commit and no new pass. All owned services and implementation worker released. Local checkpoint/bundle/archive verification is in ignored `checkpoints/final.json`; no push/deploy/main integration.
