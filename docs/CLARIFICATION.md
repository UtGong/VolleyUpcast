# Missing-information review protocol

Capture intent and source evidence separately. The coach may specify a range or leave a field intentionally flexible when the tactic does not depend on it. Do not turn unknown height, occlusion, actor identity or timing into measured facts.

| Information             | Preferred evidence / coach question                                                                                       | MVP behavior                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Contact order and actor | Which stable player contacted the ball? Which contact must happen first?                                                  | Actor existence, predecessor and time checks; editable anchors        |
| Hidden contact time     | Which interval/frame contains it? Can the coach bound it?                                                                 | Declared FPS seeks and observed time alignment; numeric bounds        |
| Ball height and arc     | Was it visible from a calibrated view? Otherwise ask height/peak range or accept an illustrative value                    | Independent field provenance, ranges, final gate                      |
| Court positions         | Visible planar landmarks, then coach-corrected court locations                                                            | Source-image annotations plus manual x/z; no solved homography        |
| Camera cut              | Does the camera view change?                                                                                              | End calibration interval; subsequent views need a new record          |
| Slide intent            | Who is middle/setter? Approach cue and path? Which takeoff/landing region? Set tempo, contact and target? Hand/technique? | Exposed intent fields plus numeric path/contact anchors               |
| Blocker/coverage        | Which opponents move, and how does coverage respond?                                                                      | Editable actor paths and descriptive behavior; no automatic inference |
| Ball classification     | Category/action/style/tempo versus measured flight                                                                        | Separate fields; classification does not invent a path                |
| Spin and fine joints    | Does this affect the tactical question?                                                                                   | May remain flexible/not applicable                                    |
| Speech/video offsets    | Which narration event corresponds to which source frame and rally anchor?                                                 | Separate offsets; manual transcript-event observations                |
| Tactic alternatives     | What coach condition changes the play?                                                                                    | Document branch condition; only primary branch animates               |

The current ranking heuristic gives order/actor/schema contradictions highest priority, then contact proximity, calibration validity and trajectory bounds, then unresolved fields. A future study should test whether this ranking corresponds to coaches' consequence judgments. No probability or calibrated confidence is asserted.

Final approval means the coach reviewed a tactical scene, not that the system recovered an exact real rally. A new local video marks prior motion and critical contact values unresolved to prevent treating the demo as a reconstruction. Illustrative mode always requires an explicit checkbox and confirmation. It is for explanation, not evidence of measured execution.
