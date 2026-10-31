# Verification log

## Automated checks

2026-10-31: model unit tests (13), strict domain-model type checking, JavaScript syntax checks, static build passed. Tests include deterministic round trip; contact endpoints and peak height; actor interpolation; approval/revision invalidation; explicit illustrative mode; wrong actors; contradictory partial order; invalid paths/clocks; model bounds and net/arc contradictions; numeric ranges; camera-cut validity; malformed schema handling. Formatting check added to the final `npm run check` run.

## Real browser observations

Tested in the local ChatGPT in-app Chromium browser at desktop 1280×720:

- Synthetic court and articulated 3D preview render together; actor/contact selectors and timeline present.
- Done editing → Review → Confirm enables export; initial draft does not enable it.
- Real silent WebM exported: 335 KB, 900×620, decoded readyState 4, duration 4.966786 seconds for a 5-second scene (recorder frame quantization), no media error. Exported file stays local and is excluded from Git.
- Exported synthetic WebM reloaded through the actual file chooser. Loading media invalidated approval and converted 29 scaffold fields to unresolved questions.
- New calibration + landmark observation saved, and frame step advanced source time from 0 to 0.033 seconds.
- Unresolved video scaffold blocked final approval. Explicit illustrative checkbox + confirmation succeeded. Undo revoked approval.

Additional responsive, persistence, interruption and final-source checks are appended below when completed. Microphone capture requires deliberate user permission and was not exercised with the user's real microphone. No private media was used.

## Follow-up checks

- Responsive 390×844 viewport: body width 390px, no horizontal overflow; mobile court, notes and 3D preview stack correctly.
- Found a transcript save-on-blur issue during browser automation; switched the transcript to input-event persistence. Verified edited synthetic text survives reload and restored scene remains a draft.
- Numeric M3 path edit applied, incremented revision, and undo restored a draft.
- Started an actual canvas export and pressed Escape: browser reported “Interrupted export discarded”; no export downloaded.
- Final source accounts for source-frame letterboxing in annotation coordinates; media source files remain local only.
- Desktop and mobile screenshots are stored in ignored `qa-local/` for local handoff; no user data or media is committed.
- Browser console error log was empty in the inspected run. Full UI static typing, cross-browser media behavior, real microphone permission/capture, and a full automated browser regression suite remain unverified.
