# Verification scope: 1.2.0

[한국어](QA-KR.md) · [Changelog](CHANGELOG.md) · [Manual checks](TEST-CASES.md)

Smart Cart Autonomy Lab **1.2.0**, 2026-09-16 KST. Local revision of the supplied 1.1.1 archive. The following are executed software tests, not physical safety certification or a guarantee for every path and crowd.

## Executed results

| Suite | Passed | Failed | Scope |
|---|---:|---:|---|
| Retained core | 30 | 0 | Following, avoidance, faults, terrain, protocol |
| Updated previous defect core | 43 | 0 | Fixed input, reversing, side tracking, sole meshes, grade dynamics |
| New release core | 18 | 0 | Fixed input path, forward gait, stance, actual NPC travel, standard README |
| Retained UI/WebGL | 57 | 0 | Controls, dialogs, lighting, graph units, native downloads, responsive layout |
| Updated previous defect browser | 30 | 0 | Actual arrows, orbit, touch, reverse display and incline support |
| New release browser | 45 | 0 | Held WASD through drag/C/top view, all live graphs, 13 widths, baseline comparison |
| Static source / HTTP delivery | 24 | 0 | JS syntax, links, UTF-8, local delivery bytes and MIME |
| **Total** | **247** | **0** | Named checks; internal samples are not counted again |

[Core](qa/core-results.json) · [Previous defects](qa/bugfix-results.json) · [Release core](qa/release120-results.json) · [UI](qa/browser-results.json) · [Defect browser](qa/bugfix-browser-results.json) · [Release browser](qa/release120-browser-results.json) · [Static](qa/static-results.json)

## Working-area comparison

Layout measurements use the supplied 1.1.1 HTML/CSS and the new app in Chromium with identical window dimensions and system fonts, at device scale factor 1. This is CSS layout verification, not screenshot estimation.

| CSS window | 1.1.1 scene height | 1.2.0 scene height | Gain |
|---|---:|---:|---:|
| 1600×1000 | 575 px | 691.70 px | 116.70 px |
| 1366×768 | 343 px | 459.70 px | 116.70 px |

The original bottom summary was 75px tall. Its replacement occupies 29px within the top band. The wider split telemetry rail intentionally trades some viewport width for usable plot width: at 1600px the 3D width is 1056px rather than 1208px. Below 1201px, instruments reflow under the full-width scene. Graphs stay side by side with readings down to 521px, then reflow below at 520px and narrower. Tests cover 320, 390, 520, 521, 600, 820, 1200, 1201, 1280, 1366, 1440, 1600 and 1920px without horizontal page overflow or hidden time plots.

A 6px root overflow caused by an offscreen screen-reader table caption was found during testing. Giving its table a positioning context confines the caption to the scrolling rail, preserving accessible markup and full-height desktop layout.

## Input and gait evidence

The application input function now calls a pure fixed-axis mapper and does not read View state. Core tests check cardinal/diagonal mapping and speed normalization. Browser tests use physical DOM keyboard and pointer events: W, S, A and D are each held during a real mouse orbit, a C-key reset and an upper-camera change. Cross-axis drift remains below the test tolerance. Arrow/touch regressions use the new fixed-world contract.

The original 1.1.1 screen-relative assertions were deliberately replaced; they are not appropriate acceptance criteria for the explicit 1.2.0 request. An early retained browser run failed a minimum-distance assertion because initial software rendering advanced only five ticks during its wall-clock hold. The test now waits for 0.35 **simulation seconds**, retaining its world-axis and distance assertions rather than weakening movement correctness. This is a QA harness correction, not a performance claim.

Foot swing is monotonic forward, stance monotonic backward, and lift is confined to swing. A linear stance and distance-phase relation make the supporting ankle remain stationary in straight, steady flat-ground travel across four headings, five speeds and both legs. Arms counter-swing. NPCs derive phase, facing and velocity from collision-resolved motion; blocked movement does not animate intended travel. The previous 2,560 actual sole/calf-pose clearance checks across slopes, terrain transitions and stairs pass again. Abrupt turns/stops and arbitrary terrain are not a complete planted-foot contact solver or biomechanical model.

## Graph and feature regression

Five time-series canvases are mounted and drawn without closed details ancestors. Numeric values and plots share a row and a single scroll container. Tests confirm all five repaint from advancing simulation history, keep correct units and remain readable after resizing and scrolling to lower drive instruments. ToF no-return values remain distinct from zero.

Native CSV, session JSON, telemetry JSON, config JSON and PNG exports were saved as real browser download files and inspected. Reset/disposal, imports, dialogs, pause/focus cleanup, sensor faults, emergency stop, reverse/lateral tracking, stairs and slope forces were rechecked. Previews are actual WebGL application screenshots with computed telemetry, paused for inspection; reverse and slope previews use declared test fixtures, not real-world data.

## Limits and provenance

Both file and loopback HTTP navigation were attempted and rejected by the managed browser with `ERR_BLOCKED_BY_ADMINISTRATOR`. UI/WebGL suites therefore inject unchanged local source text into about:blank. Separate loopback HTTP checks verify 200 responses, exact bytes and MIME at both deployment layouts. **This does not verify a normal URL-entry E2E flow or a live GitHub Pages deployment.** No administrator policy was altered. [Navigation probes](qa/navigation-results.json)

Chromium on Linux executes real WebGL 2 through ANGLE/SwiftShader with Xvfb. No Safari, Firefox, physical mobile device, hardware-GPU performance, screen-reader end-to-end certification or real cart was tested. No remote commit, push or Actions run was performed. Sensor/vehicle models remain uncalibrated. [Source hashes and exact unchanged files](qa/provenance.json)

`dynamics.js`, `sensors.js`, `navigation.js`, `simulation.js`, `gl.js` and `model.js` are byte-identical to the supplied 1.1.1. Changes are limited to app/layout, pure input mapping, pedestrian displacement/gait and the removal of the obsolete View input mapper, plus tests/docs/packaging.

## Re-run

```sh
node tests/core.test.cjs
node tests/bugfix.test.cjs
node tests/release120.test.cjs
python tests/static.test.py
python tests/browser.test.py
python tests/bugfix.browser.test.py
python tests/release120.browser.test.py
python tests/navigation.test.py
```

Browser QA requires Playwright/Chromium. On Linux hosts needing Xvfb, use DISPLAY=:99 with Xvfb running. Set SC_TEST_URL on a host permitting real static URL navigation. Set SC_BASELINE_DIR to an extracted 1.1.1 package to execute the two optional layout comparisons; without that archive the new browser suite has 43 rather than 45 checks. These are development tools, not runtime dependencies.
