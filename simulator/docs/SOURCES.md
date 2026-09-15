# Sources and assumption register

Prepared for the 2026-09-16 delivery. Source content was inspected through repository reads and official web documentation. The runtime does not request any source URL below. Product specifications are conditional upper bounds, not guaranteed performance in every environment.

## Inspected sources

| ID | Primary source | Used for |
|---|---|---|
| R1 | [Smart-Cart-4](https://github.com/JTech-CO/Smart-Cart-4), commit `0d91785fc66699fb12a4c7b55bae2dfbb1adad1c` | Procedural hardware model, native-rendering approach, dimensions and placement |
| R2 | [Component register](https://github.com/JTech-CO/Smart-Cart-4/blob/0d91785fc66699fb12a4c7b55bae2dfbb1adad1c/data/component-register.csv) | C1 / BU04 / BU03 / VL53L1X, forward-ToF limitations, 250 W motors, 120 rpm no-load interpretation |
| R3 | [smart_cart_app README](https://github.com/JTech-CO/smart_cart_app/blob/main/README.md) | Flutter application structure and simulation/server/vehicle separation |
| R4 | [Flutter telemetry](https://github.com/JTech-CO/smart_cart_app/blob/main/lib/models/telemetry.dart), inspected blob `f120a515e233908a5cf26ad0c6184567f2b24eae` | JSON keys, missing-value behavior, front-bearing convention, contactor-not-brake caveat |
| R5 | [Upstream source notice](https://github.com/JTech-CO/Smart-Cart-4/blob/0d91785fc66699fb12a4c7b55bae2dfbb1adad1c/SOURCE-NOTICE.md) | Rights and provenance limitations |
| S1 | [SLAMTEC RPLIDAR C1](https://www.slamtec.com/en/c1) | 12 m radius, 360° scan, 5,000 samples/s; conditional performance, product identity |
| S2 | [ST VL53L1X](https://www.st.com/en/imaging-and-photonics-solutions/vl53l1x.html) | Up-to-4 m range, full FoV 27°, 940 nm, single-zone/ROI behavior |
| S3 | [Ai-Thinker BU04 kit](https://en.ai-thinker.com/pro_view-159.html) | Dual-antenna positioning product context; not validation of the supplied pair's firmware or calibration |
| S4 | [Ai-Thinker BU0x SDK](https://github.com/Ai-Thinker-Open/STM32F103-BU0x_SDK) | TWR/PDoA firmware context; this package does not execute that SDK |
| A1 | [Regulated Pure Pursuit for Robot Path Tracking, 2023](https://arxiv.org/abs/2305.20026) | Algorithmic context for velocity-regulated geometric tracking; the implementation here is custom, not ROS/Nav2 |
| D1 | [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) | Static HTML/CSS/JS hosting and repository subpaths |
| D2 | [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) | Current official checkout/configure/upload/deploy action examples and permissions |

## Parameters and evidential status

| Parameter | Implemented value | Status |
|---|---|---|
| Frame envelope | approximately 0.67 × 0.982 m, upper rail 0.805 m | R1 visual model, not measured manufacturer CAD |
| Rear tire radius/track | 0.129 m / 0.762 m | R1 geometric reconstruction |
| Front tire radius/track | 0.066 m / 0.516 m | R1 geometric reconstruction |
| Effective wheelbase | 0.768 m | Rear wheel to front wheel-contact coordinates in reconstruction; caster/kingpin distinction simplified |
| LiDAR mount | body-relative `[0, 0.864, 0.489]` m | R1; original body origin used here |
| Forward ToF lenses | body-relative `[±0.205, 0.312, 0.565]` m | R1/R2; forward, not downward |
| UWB anchors | body-relative `[±0.313, 0.858, 0.445]` m | Illustration aligned with upper-front frame; not antenna phase-centre survey |
| LiDAR envelope | 360°, nominal upper radius 12 m | S1 specification context |
| LiDAR simulated acquisition | 360 rays (180 in low mode), 10 Hz | Browser reduction; NOT C1's native 5 ksample/s stream |
| ToF upper envelope | 4 m, full 27° horizontal sector surrogate | S2 range/FoV context; 9 horizontal ray samples per single-zone sensor |
| ToF update | 20 Hz | Model setting, not a chosen physical timing-budget guarantee |
| UWB range / PDoA angle | default 18 m / 180° total | Explicit assumptions; configurable 6–30 m / 120–180° |
| UWB worn tag height / slant projection | 1.08 m above candidate-estimate terrain; nominal flat offset 0.222 m | Known heightfield and tag-height assumptions; not a survey |
| UWB rates and estimator | 20 Hz; polar alpha-beta fusion, acquired range/motion-prior update outside PDoA field | Custom simulation model; initial rear bearing remains ambiguous |
| NLOS stress | positive range bias, lower quality, higher angle/range noise/dropouts | Heuristic, not measured antenna/body/metal/RF response |
| Sunlight optical stress | LiDAR envelope ×0.96; ToF envelope ×0.63; noise/dropout increase | Intentionally illustrative stress parameters, NOT a manufacturer outdoor calibration curve |
| Scene mass | 34 kg + configurable 0–65 kg cargo | Assumption; not verified physical cart mass |
| Motor ratings | 24 V class / 250 W × 2, 120 rpm no-load | R2; 120 rpm is NOT loaded speed and 13.4 A is NOT stall current |
| Torque model | 24 N·m assumed zero-speed output torque; linear no-load falloff; 250 W per-motor ceiling in envelope | Conservative illustrative curve, not identified MY1016Z performance |
| Rolling / traction / efficiency | 0.018 / 0.55 / 0.78 | Assumptions; no measured surface or motor efficiency map |
| Steering | centre ±38°, rate 1.15 rad/s, Ackermann left/right | Illustrative kinematic settings, not servo calibration or verified link travel |
| Speed reference rise/fall / actual acceleration | +0.75 / −1.20 m/s² reference slew; actual acceleration from net force / effective mass | Uncalibrated dynamic response, not a fixed actual acceleration limit |
| Parking hold | finite service/parking capacity, static balance and dissipative braking; no wheel spin at rest | Uncalibrated assumption; cannot be inferred from contactor state; see 1.1.1 force model below |
| Stairs | 6 risers, 0.17 m rise, 0.32 m tread, full arena width | Authored test geometry; no traversable side route in this terrain mode |
| Grade restriction | known-map stop for slopes above 8° | Demo design rule, not verified mechanical climb limit |
| Navigation | 0.25 m occupancy grid, 1.3 s obstacle memory, inflation 0.79 m, A* + geometric tracking + sampled bicycle trajectories | Custom planner; no semantic ground-truth obstacle positions supplied |
| Current / duty / voltage | values derived from simulated force, torque and speed | Synthetic estimates, not firmware ADC or real encoder readings |

Manufacturer ranges and FoV are available independently of this simulator. Their inclusion does not establish real outdoor, black-surface, glass, grazing-angle, multipath, occlusion, stall or thermal performance. Low mode changes sampling and can change a route; it is not guaranteed to be numerically equivalent to high mode.


## 1.1.1 force balance and reverse-path references

References checked for this patch on 2026-09-16. Equations and behavior are reimplemented locally, not an import of these products or frameworks.

- F01. MathWorks, *Vehicle Body Total Road Load*: Newtonian longitudinal force balance and road-grade load. https://www.mathworks.com/help/vdynblks/ref/vehiclebodytotalroadload.html
- F02. MathWorks, *Longitudinal Vehicle*: longitudinal motion, wheel/rolling load and braking modeling context. https://www.mathworks.com/help/sdl/ref/longitudinalvehicle.html
- F03. ROS Navigation 2, *Regulated Pure Pursuit*: explicit reversing behavior, collision regulation and the distinction between reversing and rotate-in-place behavior. https://docs.nav2.org/rolling/configuration_and_development/configuration_guide/controller_plugins/configuring_regulated_pp/
- F04. MathWorks, *Longitudinal Driver*: signed forward/reverse speed-control context and distinct drive/neutral/braking modes. https://www.mathworks.com/help/autoblks/ref/longitudinaldriver.html

Neither reference specifies this cart's actual mass, wheel inertia, PI gains, motor force lag or brake capacities. The 1.1.1 values in `dynamics.js` and `MODEL.md` remain explicit, uncalibrated demonstration assumptions. The two-range motion-prior update and two-bone visual gait are local numerical implementations; no hardware positioning accuracy or biomechanical validation is claimed.
