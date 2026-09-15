# Changelog

## 1.2.0 - 2026-09-16

- Move speed/command/follow/odometer/contact summaries above the viewport; compact the working chrome and enlarge scene height.
- Replace the 1.1.1 camera-relative movement contract with fixed terrain axes for WASD, arrows and touch. Camera orbit/reset no longer changes a held direction.
- Correct forward swing and backward stance. Use a distance-driven 7.5 rad/m gait for the user and pedestrians; update pedestrian facing/phase from collision-resolved travel. Retain terrain-supported soles and two-bone IK.
- Show numeric readings and live history side by side. All five time-series graphs are always displayed; only the supplemental point cloud/event history remain disclosures. Small phones reflow, not hide, graphs.
- Rename root introductions to README.md and README-KR.md and update internal links. Existing root README replacement is now intentional.
- Retain light UI, offline/static paths, sensor/navigation/vehicle dynamics and telemetry/export interfaces. No remote repository or physical hardware changes.

See [QA](QA.md) for executed tests, adjusted historical assertions and environment limits.

## 1.1.1 - 2026-09-16

### Fixed

1. Corrected screen-right handedness using the same camera convention as `M.look`. Direction keys and touch movement remain aligned after any supported orbit. Movement arrows are no longer swallowed by a focused toolbar button; native form controls and Space activation retain their behavior.
2. Reversed both orbit drag signs, focused the viewport on drag, and restricted pointer capture updates/cancellation to the active pointer ID.
3. Replaced unconditional radial hold with aligned distance hold and safe near-side repositioning. Corrected reverse steering sign and reverse travel-heading scoring. A body-centre/rear-axle mismatch in close reverse waypoints is resolved, preventing gear oscillation. Added rear swept-strip braking checks, known-map footprint checks and an explicit brake-before-direction-change state. Acquired UWB range-only tracking now uses a motion-prior MAP update instead of brittle exact circle intersections. Slant range is projected using the known terrain and an assumed worn-tag height.
4. Split the pedestrian legs into thigh, shin and shoe meshes. Each sole is supported over its area by the rendered heightfield; two-bone IK preserves leg lengths. The tagged user and autonomous pedestrians share this pose calculation.
5. Added signed force integration with payload mass, equivalent wheel rotational inertia, gravity, rolling resistance, drag, PI velocity control, actuator lag and finite service/parking braking. Unpowered/unbraked motion can stop and roll backwards on an incline rather than being clamped at zero. Added signed acceleration and force telemetry to the existing drive panel and exports.

### Preserved and verification notes

The light-only SANE layout, static HTML/CSS/classic-JS deployment, original cart construction and Flutter field compatibility are retained. New modules are `kinematics.js` and `dynamics.js`; no CDN, server, build system or package installation is added to runtime. The old heavy-uphill test now advances 1,200 instead of 1,050 ticks before asserting that the vehicle has passed z=7 m: the new finite response no longer exactly cancels grade. Its route, clearance, output-power and finite-value conditions are retained. New tests separately assert the grade transient and payload response rather than treating a timing change as a defect.

Read [QA](QA.md) for executed suites and [manual cases](TEST-CASES.md) for reproduction. Initial rear-only bearing ambiguity, low rear optical blind spots, ideal odometry, known terrain restrictions and uncalibrated brake/motor assumptions remain explicit limitations. The remote repository and GitHub Pages were not modified.


## 1.1.0 - SANE light workspace (2026-09-16 KST)

- Replaced the dark shell with a single light palette. Low-light scene behavior is unchanged.
- Moved status, camera selection, layer switches, input guidance and driving summary outside the 3D canvas. Removed the redundant floating pause box and duplicate cart-speed label.
- Rebuilt telemetry as plain separated instrument sections. Current values remain visible; point clouds and charts expand independently. Rear motor readings use a semantic table.
- Established a 16px body / 14px supporting-text baseline, tabular numerals, local units, honest missing values, 14px plot labels and explicit left/right line styles. ToF plots use mm.
- Replaced the canvas-obscuring settings drawer with a native focus-contained dialog. Advanced sensor controls and faults use progressive disclosure. Opening settings pauses; closing does not auto-resume. Applying settings still resets the session.
- Fixed native-button Space activation, export-menu focus/placement/dismissal and camera-selector synchronization. Opening details repaints the existing history without fabricating samples.
- Adjusted the initial follow-camera framing and the sensor overlay palette for the brighter working surface. Geometry, sensors, estimator, navigation, motor/terrain physics and telemetry schema are unchanged.
- Reflowed the interface for 320-1600 CSS-pixel viewport widths. Mobile direction buttons remain outside the model image.
- Updated browser tests, actual screenshots, source notices and QA records. No remote commit, push or Pages deployment was performed.

Design reference: JTech-CO/SANE `LITE.md`, repository snapshot `06ee062b28929062716e1eb518f025cb71e378bb`. SANE is a design contract, not a bundled CSS framework or runtime dependency.

[한국어](CHANGELOG-KR.md) · [Test scope](QA.md)

## 1.0.0 - Interactive simulation package

- Added a standalone, serverless simulator without changing the existing Flutter source tree.
- Reconstructed source-proportioned D4 hardware with independently animated rear wheels and Ackermann front steering, visible gearmotors, servo bodies/link representations, C1, dual UWB anchors and forward ToF lenses.
- Added a shared interactive world: flat, uphill, downhill, mixed slopes, full-width ascending stairs, fixed columns, independent walkers and movable boxes.
- Added native WebGL 2 materials, procedural surface detail, three lighting modes, sun angles, orbit/zoom cameras and model-origin sensor overlays.
- Implemented reduced LiDAR ray casting, forward single-zone ToF surrogate, noisy/NLOS UWB observations, filtered target estimates, occupancy mapping, A* routing and candidate-trajectory collision checks.
- Separated known terrain restrictions and ideal parking-brake assumptions from sensor evidence. Preserved forward-ToF semantics and null cliff output.
- Added 12-second live plots, synthetic rear-motor and front-steering telemetry, state events, fault/box-disturbance injection, keyboard/touch controls, focus-loss pausing and emergency-stop latching.
- Added local CSV/JSON/canvas-PNG/config exports, validated configuration import, source/assumption documentation, core/browser regression harnesses and GitHub Pages packaging.
- During regression, fixed forward movement speed clamping, initial animation timestamp handling, local trajectory speed selection, range-centre telemetry semantics and pause-overlay placement.

No repository push, live Pages deployment, firmware update, live socket connection or real hardware validation was performed.
