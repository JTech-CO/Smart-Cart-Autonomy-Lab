# 1.2.0 manual checks

[한국어](TEST-CASES-KR.md) · [QA](QA.md)

## Working area

At 1600×1000 and 1366×768, confirm all five driving-summary fields are above the viewport. Sensor layers and movement help remain below it, without a second summary block. The tested Chromium viewport heights are approximately 692px and 460px; font metrics, zoom and window size can change these values.

## Held input and camera

Choose flat terrain without obstacles. Hold W, orbit 90-180 degrees with the mouse without releasing W, then press C while still holding it. Movement must continue on the same terrain-forward axis. Repeat S/A/D and all arrows. World directions are +Z forward, -Z backward, +X left and -X right, with left/right defined from the initial rear observer. Screen direction naturally reverses when viewing from the opposite side; the terrain mapping does not change.

Opposing inputs cancel and diagonals do not run faster. Key release clears motion; focus loss clears input and pauses. Native form controls do not move the background person. Test touch buttons after orbiting as well.

## Feet

Observe a low side view. The airborne foot advances relative to the torso and the supporting foot recedes, instead of the old reverse gait. The person faces actual travel. Repeat cardinal movement and autonomous pedestrians. Confirm slope sole support and no continued gait phase at a rejected boundary/cart movement. This remains visual IK, not perfect biomechanical contact through arbitrary turns and stops.

## Live instruments

Without clicking a disclosure, inspect current values and the right-hand LiDAR/UWB/ToF graphs. Scroll the common rail to motor current and steering-angle plots. Check time, units and solid/dashed traces. ToF values and plots both use mm. No return is -- or a graph gap, not a fabricated zero. Pausing freezes history and values.

At 520 CSS px and below, plots reflow beneath numbers rather than hiding or forcing page-wide horizontal scrolling. Supplemental LiDAR point cloud and event log still expand on request.

## Packaging and retained behavior

Confirm README.md and README-KR.md at the archive root, reciprocal links and images. Delete legacy README-SIMULATION files left in the existing repository. Back up or merge a previous Flutter introduction before replacing the root README. Replace simulator/ completely and retain one Pages deployment workflow.

Recheck sensor faults, E-stop, stairs, reversing, near-side recovery and grade dynamics. Export CSV, session JSON, Flutter-shaped JSON, config JSON and PNG; import a saved configuration. These are simulation tests, not real-cart operating instructions.
