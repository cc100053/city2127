# Headline camera main integration — 2026-10-27

Owner explicitly approved merging accepted feature `cf0fe82d6d781d4841b82f45bc64a4cc7fc69b46` in coordinator chat `01a17b7e-975a-7721-b636-9c24b65f8551`, human message `01a17cea-06c6-7cc3-bc81-f190ee70dd13` ("merge"). Same independent clone and original worker. No deployment or branch deletion.

Fresh origin/main was `00c02737650008a450bd8f08e1a491ad023c77d2`. Local main was created tracking it, fast-forward checked, then `git merge --no-ff feat/headline-camera` produced `51002890371ef3aa7bc7d16791cc34b23d98cffc` without conflicts. The entire merge tree equals the accepted feature tree ([integrity](integrity.json)); runtime, tests, packages, assets and original image bytes are unchanged.

Integrated root [npm test](test.txt), [npm run build](build.txt), committed/working whitespace and [saved-manifest comparison](manifest.txt) PASS. Build retains the existing chunk-size and inconsistent odaiba-layout JSON import-attributes warnings. Survey/module-swap source did not change; separate local suites were not rerun.

Supplemental production preview at5184 + real scratch v4 HTTP/WebSocket server, Chrome156.0.8078.48 headless,1920×1080 DPR1 default/hour12: live nw headline and resident reason, then reload snapshot/ambient hero PASS. DEV `cityShot` is absent. [Results](smoke.json), [live original](production-live.jpg), [reload original](production-reload-hero.jpg), [runner](smoke.mjs). Both originals visually inspected; page/console errors0, system font fallback explicit. This smoke makes no new FPS/long-duration claim. All owned services/browser stopped and5184 confirmed free.

Main push/CI is pending at this local-validation checkpoint; actual result will be recorded after the run completes. Accepted thirteen-shot and correction evidence remains applicable to identical runtime; no repeated full screenshot sweep. Exhibition hardware/Safari/iPad/Windows, sustained performance, visitor understanding and model/material polish limits remain.
