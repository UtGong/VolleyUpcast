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

## Local sample-loading and finer body-model candidate

This candidate is **local and unpublished**. Public `main` remains at `c59a88c86dc4a8a181435dbea6563ce329d3e8e9`. A public commit/push/deployment action was denied by automatic approval review; no retry or alternative publication route was used. Publication awaits explicit approval. These local results do not establish that the live site has this fix.

### Sample loading

- Reproduced the apparent no-op on the previous live release: loading the already-selected board sample changed its revision, but the workspace began about 559px down a 720px viewport and the initial scene looked the same. No JavaScript error appeared in that reproduction; this does not prove every user failure had the same cause.
- Local loading now shows loading/success/error feedback, focuses the selected workspace at approximately 12px from the viewport top, starts a short silent preview and waits for sample video decoding before success. Unit tests cover failed HTTP, empty media, decoder error and timeout.
- Actual desktop/mobile clicks loaded both samples. Repeatedly loading the board sample still focused `board-pane`; video loading focused `video-pane` and reached readyState 4 without a media error. Cancelling replacement preserved edited synthetic text; confirming replacement retained Undo behavior.
- Static builds give entry JS, CSS and relative module imports one content version. No service worker is introduced.

### Articulation, frame editor and persistence

- 36 automated tests cover the prior model/sample checks, media loading, fixed-length limb solving, template motion for both scenarios sampled every 0.02s, shared contact targets, cue candidates, ambiguous cues, impossible reach, planted foot continuity, abrupt turn checks, shortest-angle interpolation, frame observations, legacy scene compatibility and finite volumetric body geometry. Strict domain-model typing, syntax/format checks and static build pass.
- Real browser: selected M3/attack, added a right-wrist 2D observation at source 3.000s, captured that frame, edited the numeric pose and previewed. The interface reported **1/16 observed joints**, with remaining joints/depth illustrative. Apply was disabled until explicit illustrative-depth acceptance. Applying preserved the frame/observation source and revoked scene approval.
- “Put your hands higher” explicitly previewed hand and shared contact height 2.90→3.00m plus jump adjustment. The confirmed JSON had coach-provided contact provenance and no validation issues. “Block wiser” asked for clarification. “Block wider” on B6's staged block visibly changed separation 0.65→0.85m without modifying the scene until confirmation.
- An unconfirmed pose disabled Done editing, confirmation and export. Editing its numeric form cleared the stale preview and disabled Apply. Applying a block added its saved keyframe; Undo removed it and restored a draft.
- Reopened a previously saved seven-dimension rig through the actual file chooser. Its right-wrist observation and source time survived. Changed the newly added head-width dimension to 0.20m, confirmed and downloaded a new scene. Parsing that actual browser download found all 15 rig dimensions, one source-linked pose key, observed wrist, explicit illustrative depth, null scene approval and no validation issues. Browser reload preserved head width and observed-joint coverage.
- Volume mannequin visually inspected in attack and block focus views: torso/head surfaces, articulated limbs, coarse hands/thumbs and shoes. It uses procedural geometry, with no automatic pose estimator, external model or reference-image import. Independent finger motion, occluded-joint recovery and biomechanical accuracy are not implemented. The packaged source clip remains the earlier body template.

### Final export and responsive checks

- Exported the new volume mannequin through actual review → illustrative confirmation → WebM download. Local evidence: `qa-local/final-mannequin-export.webm`, approximately 367KB, VP9 900×620, 4.95 seconds. FFmpeg decoded all 66 recorded frames without error. Capture requests 30fps, but observed cadence in this browser run was lower; smooth frame rate is device/browser dependent and is not guaranteed.
- An earlier frame-editor export and the final JSON remain in ignored `qa-local/`; no recordings or QA files enter the static/public build.
- Mobile 390×844: 390px body width, no horizontal overflow; focused body view, mini review and Apply/Discard controls fit the screen. Desktop 1280×720: both source and new body view rendered; inspected console had no error entries. Local screenshots: `qa-local/final-motion-desktop.png`, `qa-local/final-motion-mobile.png`.
- Actual microphone capture, other browsers, measured real-video accuracy, automatic 3D fitting, detailed fingers and a fixed export frame rate remain unverified or unimplemented as described above. This candidate has not run in remote CI or been checked on the public URL.

## Real footage, conditional pose fitting and spring/swing follow-up

- Downloaded the official licensed UVG-VCM Volleyball Game MP4, inspected full frames and adjacent attack/contact windows locally, and prepared a 1280×720 H.264 derivative: 600 frames/60fps, 10s, no audio, approximately 1.8MB. Original and transformed byte hashes, attribution, CC BY4.0 license, changes and the requested Partanen et al. QoMEX 2026 citation are recorded with the fixture. This fixture is the only newly allowlisted public MP4.
- The real example is a **partial manual two-player 1.50–2.70s excerpt**. Marked shoulder/elbow/wrist directions at 1.80/2.17s drive actual 3D arm keys under an explicit vertical-plane assumption. Approximate attack and possible block overlap windows around 2.02/2.08s have ±0.05s tolerance; exact impact, deflection, metric heights and depth remain uncertain. No automatic tracker/pose model ran. Final export is blocked until inferred information is resolved; explicit illustrative confirmation works.
- New local video selection clears old sample/motion/transcript/observations/calibrations and shows a blank **3D not reconstructed** state. Export is blocked while unbound. The explicit manual-start action exposes stationary unresolved placements; unknown contacts do not animate demo jumps or a ball. Actual media duration resets the editor timeline rather than retaining the previous sample's duration.
- Separately materialized the user-supplied private recording through Library, verified its exact hash and inspected its pixels locally. It contains a short approach/jump/swing/recovery with player/net occlusion and recording overlays. Original media, frame images, identifying overlays and derived validation artifacts remain in ignored `qa-local/private-clip/`; none are build or public-fixture inputs.
- Browser validation on that private clip: duration 4.078333s, readyState4, empty prior transcript, no saved sample pose, and unbound 3D. After explicit manual start, three manually marked visible arm points at source3.200s generated different actual 3D shoulder/elbow angles. Separate coach-style jump lift remained explicitly illustrative. Confirmed pose JSON parsed with those observations, conditional-fit metadata and no structural/reach warnings. This is a one-frame-guided pose study, not a full reconstruction of the recording.
- Actual private-derived canvas export: VP9 900×620, approximately310KB, 4.04s/121 frames; extracted output at3.2s visibly contains the guided raised arm and jump. It stays ignored and private. Exact anatomical swing, hidden joints, body depth and measured jump height are not established. A decoder-to-null run using the input timestamp time base passes; a default30fps null mux initially reported timestamp quantization warnings, not a decode failure.
- Local content hashing allows exact same media to reconnect to saved motion without losing observations. Tested actual JSON import and matching private-file reconnection: three observations and one pose retained, readyState4. Selecting a different clip opened replacement confirmation; Keep editing retained the private scene and original4.078333s media. Hashing is local and limited to files up to128MiB. No filename/media bytes enter JSON; private content hashes/annotations do.
- Motion now separates shoulder swing/abduction, elbow flexion/bend plane, forearm twist, torso twist and compression. The template has countermovement, parabolic lift, landing compression and damped rebound; pelvis height is a proxy, not measured center of mass or physical spring identification. Airborne-to-ground interpolation avoids planting a foot at the midpoint while still visibly lifted. Shared attack contact remains exact in domain tests despite contrary swing angles.
- 44 automated tests pass. New tests cover clearing/binding, content identity, real-fixture routing/hash/uncertainty gates, conditional image directions changing actual fixed-length 3D limbs, spring phases, swing bounds/contact anchoring and airborne descent. The real manual excerpt samples all actors at60Hz without reach warnings. Body phase controls retain selected keyframe time/source through review/export refresh; browser check retained source1.800s and three marked joints.
- Real-reference browser load reached readyState4/duration10 with no console errors. Actual illustrative export produced a174KB WebM of the1.2s manual excerpt with source scope, attribution and source-clock labels. Public deployment remains pending approval, so these are local results only.
- The licensed excerpt export decodes all36 frames, duration1.17s; the nominal1.2s interval remains subject to recorder quantization. Mobile390×844 has390px body width with no overflow, and the source-linked mini review is visible while Done editing is disabled. Desktop/mobile screenshots contain the licensed source only. Numbered annotation dots replace long overlapping video labels; full notes remain in the observation list.
- Fixed a browser-discovered form refresh issue: a selected saved key could remain selected while controls reverted to event defaults after review/export. The form now restores the selected key's numeric values, time, source observations and conditional-fit metadata. Actual review refresh retained the1.800s source frame and0.300s rally key.
