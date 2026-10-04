# Art rules — Odaiba runtime

Current implementation rules, checked 2026-10-02. [CITY MASTER TASTE](ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) is the visual/world authority; this file documents materials, batching, lighting and choice semantics. [PROJECT](PROJECT.md) maps the source. Owner: cc100053; documentation: Codex.

Shibuya art passes and Pic 2 are historical references; their remaining work is closed. They are not a second visual target. See the [archived rules](history/SHIBUYA_ART.md) and original [art handoff](handoffs/archive/art-direction.md) for dated evidence.

## Palette and material roles

Reuse factories/materials from `cityRig`, `odaibaScene`, `civicCore` and `districtMeters`; runtime layers can have their own shared instanced materials. Do not require every imported model to use one procedural material, or allocate a material per repeated object.

| Role | Current use |
| --- | --- |
| Pale ceramic / ivory structure | Civic cores, terraces, canopies, trims and architectural mass |
| Reflective / frosted glass | Landmark curtain walls, garden vaults, towers and pods; sky reflections and night room bands |
| Metal / photovoltaic surfaces | Rails, fins, hotel roof systems and docking equipment |
| Living green | Roof gardens, crowns, pergolas, planted balconies and waterfront edges |
| Stone / pale paving | Public terraces, courts and site grounds |
| Civic mint / warm public light | Persistent route edges, services, berth and public-space readability |
| Saffron guest marker | Existing local changed-site marker |
| Meter pulse colours | Automation blue `#3fa9ff`, sharing rose `#ff6f91`, environment green `#5fe08a`, concentration amber `#ffb347` |

Persistent civic lighting and live proposal pulses have different meanings. Meter colours are allowed semantic accents; the former “saffron is the only guest accent” rule is superseded. Shared city materials never flash for a vote.

## Geometry, identity and detail

All low/mixed/high outcomes are complete, mature 2127 architectures. Human-led service and private space remain technologically credible; low does not mean empty or obsolete. District carriers mix deterministic design families; mixed uses hybrids and partner Meters can add facilities. Counts/selection follow the authoritative layout and seeds, not art-side rerolls.

Preserve waterfront, civic-core and landmark relationships, sightlines to all four sites, grounded piers/access and route clearance. Odaiba is metres: prioritize detail by projected size in the authored hero and orbit view, not old Shibuya 45/90-unit thresholds. Curves, terraces and greenery must read as structure; keep support/join logic intelligible. Avoid contemporary logos and trademarked character geometry.

## Glass, sky and day/night

Current renderer uses Neutral tone mapping, VSM shadows, GTAO, mild bloom, vignette and a display-space grade. A softened generated maritime sky plus HDR RoomEnvironment light cards produces PMREM reflections; it supersedes the earlier rejection of sky-colour reflections. Current sky and ground textures are local files.

Glass reads through reflections by day and room bands by night. Civic light follows darkness; local district accents add slow night rhythms. Admin Day/Night/Auto and the 180 s clock change lighting independently of v2 Meter values. Compare day/dusk/night with stated camera/hour/actor time; full values and render flow belong in [PROJECT](PROJECT.md).

## Change semantics and resources

Live changes ease over 3 s and mark changed sites/slots with local pulses: bright ring + shaft at the site, faint rings only at district slots. Snapshot/reset/Undo/reconnect/reduced motion apply immediately without a pulse. Do not animate an upgrade from an old era. Preserve fixed footprints and complementary carrier coverage; late GLBs/roof publication must use the latest target/seed.

Batch static geometry by material; use InstancedMesh for repeated/moving pieces. Inactive batches draw nothing; hidden transforms stay invertible for G-buffer normals. Reuse cached GLBs/fallbacks and shared resources. Do not build geometry/materials per frame. Assets follow [BLENDER](BLENDER.md).

## Review gates and evidence

Check future identity, readable low/mixed/high differences, complete hybrid states, public access/support, site visibility, night readability, 3 s retargeting, immediate recovery and route clearance. Performance must be measured on stated hardware; old Shibuya captures are not current evidence.

Odaiba visual history: [first civic pass](handoffs/archive/odaiba-art-direction-01.md), [Dream Loop](handoffs/archive/odaiba-dream-loop.md), [second target](handoffs/odaiba-dream-loop-2.md), [hero district/backdrop](handoffs/archive/odaiba-district.md), [Meter variety](handoffs/archive/meter-variety.md). Integration does not prove a previously unmet generated target was reached. Current procedures and dated evidence index: [VALIDATION](VALIDATION.md).
