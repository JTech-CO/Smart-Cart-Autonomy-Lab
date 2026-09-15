# Simulation model 1.1.1

[한국어](MODEL-KR.md) · [Sources](SOURCES.md) · [QA](QA.md)

## Boundaries and clocks

The browser runs a 60 Hz fixed-step world/vehicle model, a 20 Hz controller/UWB/ToF sampler, a reduced 10 Hz LiDAR scan and 10 Hz histories. A slow frame advances at most six physics ticks and discloses simulation-time/wall-time progress. World truth is used by sensing, collision constraints, rendering and evaluation. Navigation receives observed scan endpoints, forward ToF ranges, filtered tag estimates and ideal cart odometry. It does not read obstacle truth or IDs. A known traversability map is a separate input, not perception or a claim of SLAM.

## Input and camera frames

World axes are metres, Y up, +Z forward at zero yaw. The orbit eye is proportional to `(sin(a) cos(e), sin(e), -cos(a) cos(e))` relative to its target. Consequently screen-right on the ground is `(-cos(a), -sin(a))` in X/Z, while screen-up is `(-sin(a), cos(a))`. Keyboard/touch motion uses those axes and normalizes diagonal speed. Rightward drag increases azimuth; upward drag increases elevation. Form fields retain native input. Toolbar arrows may move the user, but toolbar Space/Enter retain button activation. The camera itself never rotates the vehicle.

## Sensors and acquired track continuity

C1 is a 360-degree planar sampler at the upper-front mount, 360 or 180 rays at 10 Hz, using first-surface intersections. No-hit and invalid returns are distinct internally and zero-coded on the inherited wire format. The elevated scan can miss low objects. Manufacturer scan throughput is not reproduced.

BU04 anchors produce noisy range and, within the assumed PDoA field, bearing. Polar samples feed an alpha-beta filter. Outside that field, an **already acquired** track is predicted using its velocity, then refined by a regularized two-range MAP update. The finite-variance prior keeps a negative noisy circle-intersection discriminant from dropping the track at a lateral boundary. It does not create information where none exists: initial rear-only ranges remain ambiguous and do not initialize a fabricated pose. Outliers are gated, data older than 0.75 s triggers stopping, and NLOS models remain heuristic. Range projection uses known ground height at the **candidate estimate**, plus an assumed 1.08 m worn-tag height, not the user's true coordinates. Antenna propagation and hardware firmware compatibility are unvalidated.

Both VL53L1X sensors face forward at approximately 0.312 m height. Nine horizontal rays over 27 degrees yield one nearest range per sensor; navigation receives a centreline point and angular spread, not a true per-ray bearing. This is a horizontal 2.5D surrogate, without vertical optics, SPAD/ROI or ground-reflection physics. `tof.cliff` remains null. Rear low obstacles are not observable merely because reversing is now enabled.

## Navigation and reversing

Range returns update a 0.25 m occupancy grid with 1.3 s memory. A* with conservative inflation avoids diagonal corner cutting. Smoothed waypoints and pure-pursuit-style candidates feed a 1.56 s kinematic rollout with scan-point and moving-cluster collision checks. The rollout is still a reduced constant-candidate bicycle prediction, not a full actuator-aware MPC or an omniscient world query.

Distance hold is allowed only with a front/rear-aligned target and a distance band. A near-side or too-close target can instead trigger low-speed repositioning. Stationary close targets are not reasons to invent wheel pivoting. Steering remains bounded to a 38-degree virtual front axle with a 1.15 rad/s response; left/right Ackermann angles and signed rear-wheel rates are retained. In reverse, `yawRate = velocity * tan(steer) / wheelbase` already changes sign: steering must not be negated a second time. Close reverse waypoints are converted from the body-centre path to the rear-axle reference to avoid gear oscillation. Reverse follow commands are limited to 0.25 m/s (repositioning candidates use 0.24 m/s); actual speed remains a dynamic state and can briefly differ from a command.

Each candidate checks the known traversability map for the predicted body corners. A separate swept-strip check covers the commanded front or rear direction, with slope-aware stopping margin. A sign change while moving first commands braking. Sensor loss, insufficient clearance, no feasible path, E-stop and contact can still cause waiting or stopping. A nearby person is not permission to violate clearance. Arbitrary crowds and paths are not guaranteed collision-free.

## Signed longitudinal dynamics

The force model follows Newton's law along the vehicle's longitudinal road direction:

`m_eff * a = F_motor + F_gravity + F_rolling + F_drag + F_brake`

`F_gravity = -m*g*sin(pitch)`

`m_eff = m + 2*J_rear/r_rear^2 + 2*J_front/r_front^2`

All signed forces and velocities use **+ for body-forward**, not world-uphill. Positive pitch makes gravity a negative force. A vehicle facing the other way changes pitch/gravity sign. The ground-plane bicycle integrates signed surface travel projected by cos(pitch). Pitch and roll are derived from rear/front, left/right terrain support samples. This is not full six-degree-of-freedom vehicle, tyre, suspension or rollover dynamics; lateral tyre constraints are assumed.

Current illustrative constants are:

| Parameter | Assumption |
|---|---|
| Empty mass / added cargo | 34 kg / configuration 0-65 kg |
| Rear / front wheel radius | 0.129 m / 0.066 m |
| Per-wheel rear / front inertia | 0.022 / 0.003 kg m² |
| Rolling coefficient / traction coefficient | 0.018 / 0.55 |
| Motor envelope | Two 250 W identifiers, 120 rpm no-load, assumed 24 Nm stall intercept |
| Speed PI gains | 130 N per (m/s), 70 N per m of integrated speed error |
| Drive force lag / brake lag | 0.18 s / 0.08 s |
| Speed-reference slew | 0.75 m/s² accelerating, 1.20 m/s² decelerating |
| Combined service / parking brake capacities | 260 N / 300 N, also traction-limited |
| Aerodynamic term | -0.30 v abs(v) N |

These are not measured MY1016Z, brake, tyre or battery specifications. Motor force obeys the assumed torque-speed, per-wheel power and traction limits. PI control has anti-windup and no exact grade feed-forward, so slope transitions create actual transient speed/acceleration. Braking and rolling resistance oppose motion; at a zero crossing, a valid static balance may hold, otherwise gravity can start motion in the opposite direction. A neutral/coast command removes drive, not gravity. A stop/E-stop requests modeled braking; it is **not** equivalent to free coasting or opening a physical contactor.

Rotational wheel animation follows signed travelled distance; instantaneous RPM is signed speed/radius. Terrain/contact projection cancels rejected travel and motor force so wheels do not continue spinning at a blocked step. Contact is an additional impulse/constraint, not included in the smooth force-balance samples. Negative motor mechanical work is recorded as dissipated braking power, not as validated regenerative charging. Current, duty and voltage sag remain heuristic estimates.

## Terrain, pedestrians and bodies

The six-step staircase is six 0.17 m rises with 0.32 m treads and no side bypass. Stairs and illustrative slopes above 8 degrees are known-map no-go areas for the cart; an independent physical footprint constraint also prevents penetration. The user may climb. This is not proof of stair or cliff detection with forward ToF.

Pedestrians keep their existing individual-goal/repulsion movement. Their articulated visual pose now samples support over each shoe sole, aligns the shoe with local terrain and adds swing clearance. A two-bone IK chain preserves the 0.43 m thigh and 0.40 m shin lengths, lowering the pelvis only when required for reach. The tagged user uses the same calculation. This avoids the old rigid-leg geometry cutting into a slope, but is not foot-pressure simulation, perfect planted-foot motion or biomechanics.

Boxes translate under friction/contact impulse; rotation, tipping and deformation remain omitted. The cart hardware construction is unchanged from 1.1.0. Servo linkage depiction is still illustrative rather than a solved four-bar mechanism.

## Visualization and export

The SANE light-only layout is retained. Darkness affects the 3D environment, not the UI theme. Native WebGL uses procedural PBR-style shading and shadows, not path tracing or calibrated lighting. Sensor graphics represent modeled sampling/radio bounds rather than safety certification.

The existing drive panel adds signed acceleration and gravity force, with drive/brake forces in its disclosure. CSV/session samples add `acceleration_mps2`, `gravity_force_N`, `motor_force_N`, `rolling_force_N`, `brake_force_N`, `effective_mass_kg` and `parking_brake`. Flutter-compatible fields are unchanged; the `sim` extension carries signed acceleration/force values and a corrected finite-brake assumption label. Histories retain up to 30 simulated minutes, charts 12 seconds. No WebSocket, cloud storage, real vehicle transport or replay UI is added.
