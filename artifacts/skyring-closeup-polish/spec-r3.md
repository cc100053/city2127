# Sky Ring Blender polish — R3

Owner direction: fix every score-1 item. R2 absolute judge totals 15, 15, 14 (median 15/22); pairwise pylon shell R2 wins, truss-berth R1 wins, other items tie. R2's large diagonal lower staircase obstructs the target berth crop; it is separable from the pylon, so restore the truss-berth region to R1 first and replace that staircase with a visually unobtrusive real access arrangement meeting `truss-berth` and `truss-lower` (supported landings and no collision with the pad or passing people). Confirm the composed state with capture before judging; preserve the route-clearance fix. Keep actual route geometry/mesh checks and foot-contact checks.

## Keep

- `berth-hall` 2: preserve `skyRingGate`, the widened glass hall, `lobbyGlass`, mezzanine, entrance, upper landing, external right-hand stairs and local-coordinate residents/foot-contact tests. Changes for neighbouring lower access must not alter these. Re-crop against R2.
- `berth-apron` 2: preserve the layered `apron` slabs, materials, fascia lights, docking circle, pod and `berthPark`. Re-crop against R2.
- `voices-lamps` 2: preserve `voicePosition`, `voices`, `paint`, `setVoices`, `highlight` and lamp appearance. Re-crop against R2.
- `voices-structure` 2: preserve `warmUnder` and its `update` emissive setting. Re-crop against R2.

## Fix the remaining items

- `berth-walk` / `berth-garden`: form continuous broad curved access with legible transparent edge rails, interrupted organic planting islands with densely mixed, varied shrubs and multiple distinct tree silhouettes rather than evenly spaced round balls. Keep a usable unobstructed walkway. Add true ground/planter contact and realistic material contrast; match the full target crop, not just individual trees.
- `berth-people`: put substantially more people on the upper walk and near the hall, distributed naturally in groups, all supported and clear of foliage/rails/landing. Existing instancing preferred. Keep the proven hall-local residents and contacts.
- `truss-lower` / `truss-berth`: improve the continuous lower walkway's visual contrast and legible glass rails, with visible residents in multiple bays; add a slender, supported access to berth which does not create the large diagonal panel seen in R2. Keep actual walkable headroom, landing connectivity and no intersections. Test actual mesh surfaces and re-crop `truss-berth` and `truss-lower`.
- `truss-frame`: replace blocklike exposed nodes with rounded white structural junctions, and make the closely spaced triangular lower lattice clear from the review camera. Preserve main diagonal brace silhouette, upper fascia and lamp visibility.
- `pylon-shell`: R2 beats R1 but remains thin and insufficiently articulated. Use Blender to make the leg cladding more substantial toward the owner's truss target, with readable segmented shells, dark longitudinal recesses and shaped ring attachments. Keep leg endpoints and avoid changing the owner-approved local shore route unless the new shape actually requires further clearance, in which case stop for owner decision. Re-run actual GLB geometry checks, actor routes and hero visibility.

Each changed part feeding a Keep item must be listed against all affected items and compared to R2. If an unresolvable geometry or route constraint blocks the target, stop and ask, never silently lower the spec. Use exact same review poses and 3200×1800 captures (berth, truss, pylon, voices night, hero day/night), at most three capture/compare iterations. Run Blender QA/material/wireframe/reimport, root `npm test`, `npm run build`, `git diff --check`. Report all warnings and actual measurements. Then make blind absolute and pairwise crops against R2.
