# Verification scope: 1.1.1

Smart Cart Autonomy Lab **1.1.1**, 2026-09-16 KST. These are executed regression results, not physical safety certification or a guarantee for every crowd, route or sensor condition.

[한국어](QA-KR.md) · [Changelog](CHANGELOG.md) · [Manual reproduction](TEST-CASES.md)

## Executed suites

| Suite | Passed | Failed | Scope |
|---|---:|---:|---|
| Retained Node.js core | 30 | 0 | Following, obstacles, terrain stops, faults, emergency stop, protocol |
| New defect core | 43 | 0 | Camera basis, reversing, lateral tracking, actual foot meshes, grade dynamics |
| Retained browser UI/WebGL | 57 | 0 | DOM input, light UI, rendering, responsive layout, native file saves |
| New defect browser | 30 | 0 | Real keyboard, drag, touch, signed reverse telemetry, terrain-supported feet |
| Static source / HTTP delivery | 24 | 0 | JS syntax, local references, UTF-8, bytes and MIME at two URL layouts |
| **Total** | **184** | **0** | Named automated checks, not every internal sample counted again |

The 2,560 tested walking poses are inside the new core suite, not added again to this total. Blocked browser URL-entry probes are recorded as **NOT_VERIFIED**, not passed tests.

[Core](qa/core-results.json) · [Defect core](qa/bugfix-results.json) · [Browser](qa/browser-results.json) · [Defect browser](qa/bugfix-browser-results.json) · [Static](qa/static-results.json) · [Navigation probes](qa/navigation-results.json)

## Baseline and corrections

The supplied 1.1.0 archive was independently extracted and its defects reproduced. At the frontal camera, screen-left had the opposite world-X sign. Right/up dragging changed azimuth/elevation with the opposite signs. A near-side target produced zero speed, braking and HOLD_DISTANCE. An unpowered/unbraked cart stayed motionless on an 8-degree incline. A sampled walking mesh penetrated the incline by **10.19 mm**. See the version-labeled [baseline record](qa/baseline-reproduction.json).

**Input and orbit.** Core tests project eight cardinal/diagonal inputs through the actual view matrix at eight azimuths and three elevations. Browser tests physically press all four arrows at 0, 90, 180 and -90 degrees and evaluate screen-projected displacement, not merely changed world coordinates. A real right/up pointer drag changes azimuth/elevation in the corrected direction and releases capture. Arrows after dragging or using Pause remain usable; native editing and modal behavior are preserved. A 390×844 touch-capable Chromium context receives actual CDP touchStart/touchEnd events at the mobile button after a 90-degree orbit. Screen-left motion and release cleanup pass. This is not an Android/iOS device test.

**Reverse and lateral tracking.** A previously acquired tag circles the cart across both assumed PDoA boundaries with noise 0/1/2. Maximum position errors in this seeded model test are 0.044/0.142/0.147 m; maximum observation ages are 0.040/0.040/0.100 s. These are synthetic-model results, not real UWB accuracy. Acquired left/right near-side targets cause roughly 0.92/0.93 m repositioning and 56-degree heading recovery without contact. Tracking continues when the target leaves the side. Three acquired rear targets are approached with the correct reverse curvature and stop without contact or repeated gear oscillation. Real browser rendering displays negative speed, RPM and duty. Brake-before-reverse, observed rear collision rejection and map-boundary rejection pass. A separate test confirms that two initial rear-only ranges do **not** fabricate a bearing or trigger blind reversing. Forward ToF still does not see low rear objects.

**Feet.** Actual transformed shoe/calf vertices are checked against terrain at 576 poses each on flat/uphill/downhill/rolling terrain and 256 stair poses: **2,560 total**. Minimum clearance in these cases is approximately 6 mm on flat/slopes and 1.81 mm on stairs; thigh/shin lengths remain constant to floating-point precision. Stationary feet stop swinging. The same terrain pose drives the user and autonomous pedestrians, and actual browser-rendered uphill foot geometry is tested separately. This is two-bone visual articulation and sole support, not complete biomechanics, perfect planted-foot locking or all possible terrain meshes.

**Dynamics.** Translational mass 49 kg becomes about 53.021 kg with equivalent wheel inertia in the selected fixture. Force balance, payload-dependent startup, grade-entry transients, rollback through zero speed, heading-dependent gravity, finite braking and parking hold pass. After one simulated second without drive or brakes on an 8-degree incline, the cart facing uphill has speed -1.098 m/s, horizontal travel -0.544 m and longitudinal gravity -66.899 N. Facing downhill reverses these signs. With the same selected initial braking speed, stopping travel is 0.105 m uphill, 0.164 m flat and 0.331 m downhill. These values follow uncalibrated demo parameters, not measured cart capabilities. Normal follow-stop requests the assumed parking brake, so a stopped cart can correctly remain on the slope. Signed RPM, wheel rotation, acceleration, forces and CSV/JSON extensions are checked.

## Retained-test adjustment

The loaded-uphill core test now advances **1,200 ticks (20 s)** rather than 1,050 ticks (17.5 s). Removing instantaneous grade cancellation and introducing finite drive response changed arrival timing; the old duration ended short of the position threshold. Terrain, payload, destination threshold, finite values and per-motor power bounds are retained. This timing adjustment is disclosed rather than presented as byte-identical testing. New independent checks cover force balance, loading, grade transients, braking travel and coast behavior.

The 57 retained browser assertions recheck the light-only UI, 14px essential text, layout hierarchy, sensor panels/charts, ToF mm units, settings/faults, emergency stop, imports, focus cleanup and GPU reset disposal. CSV, session JSON, telemetry JSON, configuration JSON and PNG exports are verified through actual browser download events and completed nonempty file saves, not only Blob creation.

## Rendering, layout and preview provenance

Chromium 144.0.7559.96 on Linux with ANGLE/SwiftShader executes real WebGL 2. The baseline rendered scene has 87,370 triangles, 172 draws and GL error 0. Widths 320, 390, 600, 820, 1024, 1366 and 1600 CSS px are checked for horizontal overflow and accessible essential controls. Narrow-screen vertical scrolling is intentional. No real-GPU frame-rate guarantee, full OS font matrix or WCAG certification is claimed.

[Desktop](../assets/preview-desktop.png) · [Reverse](../assets/preview-reverse.png) · [Slope](../assets/preview-slope.png) · [Mobile](../assets/preview-mobile.png)

Previews are actual WebGL screenshots from local application code, paused for inspection. The reverse screenshot uses an explicitly acquired-track fixture. The slope screenshot is a deliberate placement/drive fixture for forces and articulated feet. Telemetry is computed, not fabricated DOM decoration. These images are not evidence of an entire arbitrary interactive route completing; displayed velocity is the last frozen state.

## Provenance and verification limits

[provenance.json](qa/provenance.json) records the base archive and runtime SHA-256 values. `math.js`, `world.js` and `gl.js` are byte-identical to 1.1.0. The cart hardware construction part of `model.js` is unchanged; its pedestrian construction is articulated differently. `kinematics.js` and `dynamics.js` are new local classic scripts, not external dependencies.

Both `file://` and loopback HTTP browser navigation were actually attempted and rejected with `ERR_BLOCKED_BY_ADMINISTRATOR`. Browser suites inject the complete local HTML/CSS/JS into about:blank to execute real DOM events and WebGL. Separate temporary loopback HTTP tests verify status 200, identical bytes and executable MIME for HTML, 11 scripts, CSS and favicon at the Pages-artifact root and a nested repository path. **This is not browser URL-entry E2E success.** No administrator or security policies were disabled.

No remote commit, push, GitHub Actions run or live Pages deployment was performed. Safari, Firefox, actual Android/iOS devices and GPUs, physical sensors/motors/brakes and live Flutter transport are not validated. Known terrain, ideal odometry, assumed tag height, heuristic sensing, rear optical blind spots and uncalibrated drive/brake parameters remain explicit [model limitations](MODEL.md).

## Re-run

```sh
node tests/core.test.cjs
node tests/bugfix.test.cjs
python tests/static.test.py
# QA tools only: Python Playwright and Chromium.
python tests/browser.test.py
python tests/bugfix.browser.test.py
python tests/navigation.test.py
```

On Linux test hosts that need Xvfb, start it and set `DISPLAY=:99`. Set `SC_TEST_URL` to exercise a real static URL on a normal host. These tools and any temporary test server are not application runtime dependencies. JSON timestamps are UTC; the release date above is KST.
