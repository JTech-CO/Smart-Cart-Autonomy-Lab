# Smart Cart Autonomy Lab 1.1.1

[한국어](README-SIMULATION-KR.md) · [Open simulator](simulator/index.html) · [Model and limitations](simulator/docs/MODEL.md)

An interactive, fully static sensor-fusion and vehicle-following demonstration for **JTech-CO/smart_cart_app**, using a source-proportioned reconstruction of **Smart-Cart-4**. Move the tagged person with the arrow keys, WASD, or the touch direction pad. The cart follows a filtered UWB estimate and plans around LiDAR/forward-ToF observations. It is not a scripted tour, a game, a firmware release, or a calibrated digital twin.

![Browser-rendered simulator](simulator/assets/preview-desktop.png)

## 1.1.1: input, reversing and terrain fixes

Screen-relative keyboard and touch directions now use the actual camera basis, including after orbiting. Rightward dragging increases azimuth; upward dragging raises elevation. Movement keys work after using toolbar buttons while native editing and modal shortcuts remain protected.

Near-side targets no longer fall into an unconditional distance-hold disc. The controller performs safe low-speed repositioning, correct signed reverse steering, rear-axle waypoint alignment and braking before direction changes. Acquired tracks use a motion-prior/range update outside the assumed PDoA field; noisy circle intersections no longer terminate tracking near the anchor baseline. An initial rear-only pair of ranges still does not manufacture a unique bearing.

Separate terrain-supported soles and two-bone leg articulation replace rigid leg swinging. Vehicle acceleration integrates drive, grade, rolling resistance, drag and finite braking forces against translational plus equivalent wheel inertia. Signed acceleration and gravity appear in the existing drive panel; drive/brake forces and CSV/JSON extensions are also available. Commanded parking hold remains distinct from an unpowered, unbraked coast.

[Changelog](simulator/docs/CHANGELOG.md) · [Manual checks](simulator/docs/TEST-CASES.md) · [Reverse preview](simulator/assets/preview-reverse.png) · [Slope walking preview](simulator/assets/preview-slope.png)

## Retained 1.1.0 SANE interface

This release applies [SANE](https://github.com/JTech-CO/SANE) to the existing simulator: task-first hierarchy, deliberate type sizes, semantic color and progressive disclosure. It is a **single light interface**, with no dark-mode toggle. Low light remains a physical scene condition; it does not recolor the interface.

Choose the environment above, move the person in the large central viewport, and inspect the data rail on the right. Status and camera controls sit above the image. Sensor layers, input guidance and driving summaries sit below it rather than covering the scene. Body text starts at 16px, supporting labels at 14px, with system fonts selected for Korean and numeric coverage.

Current sensor readings and deltas remain available; expand a section to inspect its point cloud or last 12 seconds of plotted history. Scroll the rail to reach rear-drive, front-steering and event details. Left/right traces also differ by line style. ToF plots now use mm consistently with the current values. On narrow screens the controls and instruments follow the viewport in document order.

Settings and model notes pause the session. Closing them or pressing Escape does not resume it. **Apply and reset** deliberately starts a new session, as before. Sensor assumptions and fault tests are disclosed within settings. Focused buttons retain native keyboard activation instead of also triggering the global Space shortcut.

[Changelog](simulator/docs/CHANGELOG.md) · [QA](simulator/docs/QA.md) · [Settings preview](simulator/assets/preview-settings.png) · [Diagnostic preview](simulator/assets/preview-diagnostics.png)

## Run

Extract the archive. Open `simulator/index.html` in a WebGL 2-capable browser. All scripts, styles, geometry and textures are local; there is no npm install, build, API key, CDN or backend. The root `index.html` also links to the simulator. Browser or organization policies may restrict local files; GitHub Pages is the supported deployment target. Enable hardware acceleration for useful frame rates.

## Add to the Flutter repository

Copy the **contents** of this package into the root of `smart_cart_app`. It adds `simulator/`, a root entry page, regression tests, and a Pages workflow. It does **not** contain or replace the existing Flutter `lib/`, `web/`, Android or Windows sources. Existing upstream README and license files are not overwritten. This is an additive package, not a full repository clone.

In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**. The included workflow tests the simulation and publishes `simulator/` as the site root. It targets the `main` branch; change that field for another default branch. Review any existing Pages workflow before enabling this one: a repository has one Pages site. No remote deployment was performed while preparing this archive.

An alternative is **Deploy from a branch → main → /(root)**. The included root entry opens `/simulator/index.html`. The two deployment methods produce different internal paths; neither uses root-absolute asset URLs. See [integration](simulator/docs/INTEGRATION-KR.md).

## Controls and observation

Arrow keys / WASD move the **person**, relative to the camera's horizontal axes. Drag the view to orbit, use the wheel to zoom, and press **C** to restore the follow camera. **Space** pauses, **E** latches/releases the simulated emergency stop. Focus loss or an inactive tab pauses the simulation and clears held input; it never resumes automatically.

Flat road, ascending/descending/combined slopes, stairs, obstacle density and object types are editable in the same interactive world. Lighting, sensor layers, fault injection and box impulses are live controls. Structural settings reset the seeded scene so geometry and sensing stay consistent. Sensor/motor plots retain 12 simulated seconds; the right-hand telemetry column scrolls to rear-motor, steering and state-history panels. CSV/session JSON retain up to 30 simulated minutes. All exported values are synthetic.

## Critical distinctions

The two VL53L1X sensors are **forward-facing**, matching D4. They are not cliff sensors. Stairs and grades above the demo's 8° threshold are blocked by an **explicit known traversability map**, separate from observations. A finite, uncalibrated service/parking brake model can hold the stopped cart within its modeled capacity. Opening a real contactor does not establish a brake. An unpowered, unbraked cart rolls under grade force.

C1 360°/12 m and VL53L1X up-to-4 m/27° are source specifications, not unconditional performance guarantees. Scan count/rate, UWB range and angle limits, sunlight degradation, noise, masses, motor torque curves, currents, friction and braking are disclosed assumptions. Forward-ToF sampling is a horizontal 2.5D surrogate, not a SPAD or full optical-cone simulation. See [source and assumption register](simulator/docs/SOURCES.md).

The exported telemetry follows `lib/models/telemetry.dart` field shapes. There is no active WebSocket connection to Flutter or a vehicle. The old `tof.left_mm/right_mm` fields now mean front-left/front-right and `cliff` is `null`, with an explicit `sim` annotation. Verify this semantic change before using a consumer that labels those fields as side-facing sensors.

## Development and checks

```sh
node tests/core.test.cjs
node tests/bugfix.test.cjs
```

No dependencies are required for core tests. [QA report](simulator/docs/QA-KR.md) distinguishes real WebGL/UI checks, deterministic core tests, HTTP-path checks, and environment-restricted browser URL navigation. Native CSV, session JSON, telemetry JSON, config JSON and PNG download saves were reverified in 1.1.1. Do not interpret test success as safety certification or evidence that every possible environment is passable.

`math/world/kinematics/dynamics/sensors/navigation/simulation` are engine-only classic JavaScript files; `gl/model/view` implement native WebGL 2 rendering; `app` binds DOM controls, charts and local file exports. All runtime state stays in memory. Source rights and attribution are preserved in [SOURCE-NOTICE](simulator/SOURCE-NOTICE.md).
