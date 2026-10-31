# Research framing and evaluation plan

2D→3D conversion is prior work. This prototype's proposed contribution is preserving coach intent for volleyball and managing missing information through explicit, consequence-ranked clarification.

## Verified starting references

- Cannavò et al., 2018, _A participative system for tactics analysis in sport training based on immersive virtual reality_: coaches create/modify tactics for multi-user immersive visualization. [Institutional record](https://iris.polito.it/handle/11583/2699875). This is the verified 2018 sports-tactics source; do not cite an unverified title merely as “VR Playbook.”
- [TactixBoard official tutorial](https://tactixboard.com/howto) and [official product page](https://tactixboard.com/): existing drawing, editing, 3D viewing and video-export workflows, including volleyball. Product claims are not independent accuracy evidence.
- Rosenberg et al., UIST 2024, _DrawTalking: Building Interactive Worlds by Sketching and Speaking_. [Author repository and citation](https://github.com/KTRosenberg/DrawTalking), [DOI](https://doi.org/10.1145/3654777.3676334). Establishes relevant sketch-plus-speech interaction, not validated volleyball reconstruction.

References checked 2026-10-31. No code/assets were copied from these projects. The earlier private research Google Doc was not imported into this public repository; it has not been used to substantiate unseen claims.

## Study proposal

Recruit volleyball coaches and players with explicit recording consent. Use counterbalanced tasks with the same tactical intents: pass–set–attack, several coach-defined middle slides, a blocking shuffle (distinct from an attack), hidden contact, ambiguous actor, camera cut and conditional coverage. Include tasks where detailed spin is irrelevant.

Compare board-only, board+editable speech transcript, board+speech+targeted clarification, and a manual scene-authoring baseline. Keep the renderer and available primitives constant. For video tasks compare manual annotation alone against annotation plus transcript and targeted clarification. The current MVP supports manual editing and explicit review; it does not yet implement an automatic speech intent compiler or adaptive question policy. Instrument those adapters before claiming a controlled comparison of them.

Use consented controlled captures with known contact identities/times and independent coach-intent annotations. Multi-view reference may evaluate airborne location; do not score monocular uncertain height against a fabricated single ground truth. Blind raters to authoring condition where possible. Pre-register task difficulty, inclusion rules and analysis; pilot first rather than inventing a sample-size justification.

| Metric                  | Operational definition                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| Actor/contact error     | Wrong/missing actor-contact association and wrong predecessor order, reported separately          |
| Timing/position error   | Difference from bounded reference only where observed or independently measured                   |
| Unsupported assumptions | Output facts asserted without source or explicit illustrative approval                            |
| Correction time         | Time to a coach-approved scene meeting task criteria; separate editing from playback/export wait  |
| Clarification burden    | Question count, response time, redundant questions, skipped or unnecessary-detail questions       |
| Comprehension           | Players identify intended role, cue, coverage and target from the output; compare to coach intent |
| Uncertainty handling    | Critical unknowns exposed, correct final blocking, intentional flexibility preserved              |
| Revision resilience     | Edits correctly invalidate affected approvals and exported claims                                 |

Report failures and unresolved ranges alongside success rates. A compelling result is lower unsupported assumptions and correction effort without excessive interruption, not prettier motion alone. Template human motion should be disclosed during all study conditions.
