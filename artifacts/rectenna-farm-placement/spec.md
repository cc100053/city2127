# Rectenna farm placement — R1 target inventory

Target: the supplied [Rectenna Farm Canopy GLB](../../asset/models/rectenna-farm-canopy/rectenna-farm-canopy.glb), with the R2 vegetable LOD already present. Place at unit scale at (−117.75, 0, 82.4) m for Q3 large receiver. Start at yaw π and check the lower ramp approach in the scene.

| # | Target shows | We have | Spec |
| --- | --- | --- | --- |
| 1 | Wide, faintly iridescent receiving membrane | GLB `HexPanelGlass` transmission and iridescence | Keep original silhouette and finish. Verify in app light by day and night. |
| 2 | Ring, tower, pilotis and glossy Space Gray structure | GLB `SilverFrame` and chrome accents | Keep the authored finish and 33.6 m height, grounding the pilotis at the surveyed centre. |
| 3 | Terraces with orange trees, crops and ramp | GLB terraces and instanced vegetation | Preserve terrace geometry and R2 vegetable LOD. Connect the lower ramp to a local walking approach and show it in review. |
| 4 | Small offshore alternative | Existing wing | Reuse it for the small state. Capture the small-to-large and large-to-small result paths using the correct destination pose. |
| 5 | Canopy and farm readable in the result | Existing energy headline and timing | Frame the full canopy and at least one planted terrace together at 3200 × 1800. Capture a separate ramp/entry detail and three transition keyframes. |

## Library

| Element | Route | Entry |
| --- | --- | --- |
| Membrane, structural frame, tower, terraces, ramp and planting | Reuse | [rectenna-farm-canopy](../../asset/models/LIBRARY.md) GLB and Blender source |
| Small offshore receiver | Reuse | [energyPrototype](../../src/energyPrototype.ts) wing |
| Site approach tie-in | Reuse | Existing city paving and access materials; verify the tie-in from local terrain and keep the farm envelope within the probed dimensions |

See the [handoff](../../docs/handoffs/rectenna-farm-placement.md) for the state table, siting verification and R1 acceptance rows.


## R2 approved direction

Reuse the same GLB at 2× on the south-edge grass (centre X −152, Z 408 m), 44 m south of the scale trial. The doubled height is 67.2 m. Face the lower ramp west toward the surveyed pavement and move the overlapping backdrop groves as whole units. The R1 camera and footprint above document the previous trial. See the [R2 handoff](../../docs/handoffs/rectenna-farm-placement.md#r2--south-edge-placement-2026-11-15).
