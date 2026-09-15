# Source and rights notice

This package was prepared as an additive simulation demonstration for the owner-supplied JTech-CO repositories. It does not replace their existing license terms or claim a new license over upstream material.

## Hardware reconstruction

Source: JTech-CO/Smart-Cart-4, snapshot `0d91785fc66699fb12a4c7b55bae2dfbb1adad1c`.

- `js/cart-model.js`, blob `391d084ca25d89e8b548e63d07e7696718aa5ae8`: visual proportions, frame members, wheel dimensions, gearbox/servo appearances and sensor arrangement. The new `js/model.js` is a selective, animated reconstruction based on this source, not a byte-identical export of the upstream model.
- `js/engine.js`: native geometry-builder idioms, rounded boxes, cylinders, lathes and tubes inform the new `js/gl.js`. The simulation renderer adds model transforms, a world scene, per-part articulation, cameras, overlays and its own shader/scene integration.
- `data/component-register.csv`, blob `956903ec62d33087316e1daf5a29baf770b83d79`: component identity and limitations, particularly forward-facing ToF, motor no-load speed and the lack of verified battery/motor/stall data.

Upstream's notice cites Smart-Cart-3 snapshot `688dbda586c06510763cf9cc42d9b45c1e14094f`, retains third-party rights, and does not grant a new license. That provenance is preserved here. Public redistribution rights should be confirmed by the repository owner. No system font files, manufacturer photographs, downloaded textures, CAD files or watermark-removed images are distributed in this simulation package. Labels are procedural text identifying modeled components, not manufacturer endorsements.

## Application protocol

JTech-CO/smart_cart_app `lib/models/telemetry.dart`, blob `f120a515e233908a5cf26ad0c6184567f2b24eae`, and the repository README were inspected for application/protocol context. This package implements a JavaScript telemetry serializer with compatible field shapes, not a copy or execution of the Flutter application, hardware firmware or a WebSocket server.

## Limitations

The geometry is a placement/visualization aid, not manufacturer CAD or a fabrication drawing. Dimensions not grounded in the source remain illustrative. Servo pushrod depiction is a simplified mechanism; this is not an exact four-bar linkage solver. The upper rail, forward LiDAR, paired UWB anchors and forward ToF remain distinct.

No fabrication, energization or safety release is granted. See `docs/SOURCES.md` and `docs/MODEL-KR.md` for specification/assumption separation. New simulation logic, interface code and documentation are supplied for the requested project; a public project-wide license should be chosen by the repository owner without overriding upstream or third-party rights.

## Interface revision 1.1.0

Design reference: [JTech-CO/SANE](https://github.com/JTech-CO/SANE), snapshot `06ee062b28929062716e1eb518f025cb71e378bb`, specifically its `LITE.md` minimum design contract and README. The contract informed the UI revision; SANE's documentation is not embedded as an executable library, and no additional font, framework, service or runtime dependency is included. Existing source and rights notices above remain in effect.

In the 1.1.0 release, the 1.0.0 simulation/geometry kernels remained byte-identical. This statement does not describe the 1.1.1 physics, sensing, navigation or walking changes. See `docs/qa/provenance.json` for file hashes and `docs/CHANGELOG.md` for the modified presentation behavior.

## Defect revision 1.1.1

The supplied 1.1.0 ZIP is the exact local base. No newer remote snapshot is claimed and no remote repository was modified. This patch changes input/orbit behavior, acquired-tag range fusion, signed reverse maneuvers, terrain-grounded pedestrian articulation, longitudinal dynamics, telemetry and corresponding documentation/tests. `math.js`, `world.js` and `gl.js` are byte-identical to 1.1.0. The `SC.buildCart` hardware construction section of `model.js` is unchanged; only pedestrian construction is articulated differently. `kinematics.js` and `dynamics.js` are new local classic scripts, not new external dependencies.

Additional force-balance and reversing references are identified in `docs/SOURCES.md`. Motor response, inertia, braking capacity and gait parameters are uncalibrated simulation assumptions; no real vehicle validation is implied. Updated images are actual browser WebGL captures of this revision.

## Interface and input revision 1.2.0

Local changes to fixed-world user input, distance-driven gait, compact stage chrome, always-visible instrument plots and standard README packaging. Existing sensor, planner, vehicle dynamics, cart construction, rights notices and model limitations are retained. The 1.1.1 camera-relative input contract is superseded by the explicit 1.2.0 request. The package replaces its root README files intentionally; it does not relicense upstream materials or modify a remote repository. Source hashes and executed test scopes are recorded in the 1.2.0 QA files.
