# 1.1.1 manual defect checks

[한국어](TEST-CASES-KR.md) · [Automated evidence](QA.md)

Terrain/density changes reset the session. Keys move the tagged user, not the cart.

| Defect | Procedure | Expected behavior |
|---|---|---|
| Movement directions | Choose flat/no obstacles, focus the scene, try all arrows. Repeat after 90/180-degree orbiting and after clicking Resume. | Movement follows screen directions; toolbar focus does not swallow arrows. Form inputs keep native editing. |
| Orbit drag | Drag right and then up. Release outside the canvas and move without holding a pointer. | Azimuth/elevation increase respectively. Released pointers do not keep orbiting. |
| Side/reverse tracking | Acquire the front tag first. E-stop only the cart, walk the user around its side and then several metres behind, and release E-stop. | Safe repositioning / low-speed reverse; range-history fusion remains distinct from PDoA. Reverse speed, RPM and PWM are negative. Initial rear-only acquisition is a separate ambiguous case. |
| Walking slopes | Use 5-8-degree up/down grades with pedestrians. Lower the camera and inspect shoes. | Separate feet stay above terrain while knees and swing lift adapt. |
| Vehicle inertia | Drive onto a 5-8-degree grade with 0 kg and 65 kg cargo; then press E while moving. | Grade/payload change the transient and stopping travel. Parking brake holds after stopping. Space freezes time and is not a physical-braking test. |

`node tests/bugfix.test.cjs` also exercises unpowered, unbraked coasting through the internal physics command `coast:true, brake:false`. Normal autonomous stopping still requests parking hold. No new real-vehicle control or GUI brake-release button is introduced.

Being within nominal radio/scan range alone does not resolve initial bearing ambiguity, occlusion, inadequate space or unobserved low rear obstacles. See [model limits](MODEL.md).
