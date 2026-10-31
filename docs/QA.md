# Verification log

## Automated checks

2026-10-31: model unit tests (14), strict domain-model type checking, JavaScript syntax checks, static build passed. Tests include deterministic round trip; contact endpoints and peak height; actor interpolation; approval/revision invalidation; explicit illustrative mode; wrong actors; contradictory partial order; invalid paths/clocks; model bounds and net/arc contradictions; numeric ranges; camera-cut validity; malformed schema handling. Formatting check added to the final `npm run check` run.

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

- Final import hardening rejects non-finite contact numeric types and unsupported duration/revision before UI rendering; corresponding regression test passed.

## Public HTTPS deployment

2026-10-31: GitHub Pages at https://utgong.github.io/VolleyUpcast/ returned HTTP 200 for the entry page and JavaScript asset. Public deployment and CI passed for the deployment change. The build contains only `index.html`, `src/`, synthetic `examples/` and `.nojekyll`; local screenshots, personal recordings and notes are excluded. The later two-sample update explicitly includes one generated synthetic WebM. Entry asset URLs and the home link are relative to the project subpath, covered by regression checks. A restrictive CSP is embedded in HTML so it survives static hosting.

- Deployed desktop browser rendered the board and 3D scene; attack contact shortcut synchronized the shared playhead at 3.00 seconds.
- Deployed mobile viewport 390×844 had 390px body width and no horizontal overflow.
- Deployed browser console had no error entries during the inspected run.
- Deployed illustrative export generated a real 339 KB silent WebM through the actual download UI.
- Microphone recording remains an explicit button action using `getUserMedia` with browser permission on HTTPS. No automatic recording, remote speech API or microphone permission grant was exercised during publishing QA. Actual device capture remains a tester permission step; no private audio was recorded.
- Synthetic screenshot evidence is retained in ignored `qa-local/public-desktop.jpg` and `qa-local/public-mobile.jpg` in the working task workspace.

## Two-sample update

- 22 automated checks pass, including both complete sample scene fixtures, transcript/contact agreement, normalized generator projection, clip hash, review invalidation and safe built-in media resolution.
- The synthetic reference contains 149 VP9 frames at 900×620 and is 4.97 seconds long. Stream-copy remux adds the duration/seek index; no footage was inferred or sourced from a coach.
- Browser decoded the indexed sample and reported seekable interval [0, 4.97]. Attack shortcut moved source video and scene to 3.00 seconds.
- Edited board transcript survived Keep editing in the replacement confirmation. Replacing then Undo restored that edited transcript; Redo and reload reconnected the packaged video.
- Actual Save scene download and Open scene import restored video sample metadata and reset approval to DRAFT. Board sample review enabled export only after Done editing and confirmation.
- Marking a sample contact height unresolved blocked final confirmation. Explicit illustrative confirmation enabled a real 200 KB WebM export from the new sample.
- The sample controls fit a 390px viewport with no horizontal overflow. Browser console error log was empty in the inspected run.
- Public sample-control and asset checks are performed after deployment; real coach data and microphone capture are outside this test.
