# VolleyUpcast

**A local research prototype for turning coach intent into reviewed volleyball scenes.** Draw a play or annotate a local video, describe the tactic, review uncertain information, then export an actual animated WebM. “Upcast” describes upgrading a flat plan into a 3D tactical illustration.

This working browser prototype combines a coach-reviewed tactics board with an experimental on-device, selected-player video workflow. MediaPipe proposes body landmarks from source frames; local Whisper transcribes English voice notes. It does not recover measured biomechanics, calibrated hidden depth, exact jump height, or ball physics from a single camera. Board scenes use articulated templates; video body proposals use a separate neutral stage.

## Run

Node.js 24 is used by CI. Runtime has no third-party dependencies; TypeScript and Prettier are development tools only.

```sh
npm ci --ignore-scripts
npm run dev
# Open http://127.0.0.1:5187
npm run check
```

`PORT=5190 npm run dev` selects another loopback port. `npm run build` produces `dist/`; `SERVE_DIST=1 npm run dev` serves it. The server binds only to `127.0.0.1`. The public GitHub Pages deployment serves the same static app over HTTPS. No paid API, telemetry, external fonts, media upload endpoint, or remote speech recognition is configured.

## Public testing

**Live prototype: https://utgong.github.io/VolleyUpcast/**

The GitHub Pages workflow builds and checks `main`, then deploys only `dist/`. Assets and the home link use relative URLs so the same build works under `/VolleyUpcast/` and on loopback. Browser media, recordings and local draft storage remain on the testing device. Microphone recording requires HTTPS (or localhost), browser support, and a deliberate permission grant. WebM export remains browser-dependent. No service worker or server-side media storage is configured.

## Two ready-to-load samples

Use the two sample cards near the top of the live app. Both are clearly labelled synthetic, include editable inputs, and start without export approval. Replacing edited work opens a confirmation; Keep editing preserves it. Undo restores the prior scene. Personal videos may need reselecting after replacement; packaged sample media reconnects automatically on JSON open, undo and reload.

**Sample 1 · Board → 3D — middle-blocker slide**

1. Click **Load board sample**. Inspect the authored coach-style transcript, M3 approach cue/path, ball classification, contact anchors, ranges and tactic parameters.
2. Play the supplied 3D illustration or edit paths/contacts/notes.
3. Choose **Done editing → Review**, select **Illustrative mode**, then **Confirm reviewed scene** and export.

**Sample 2 · Video → 3D — synthetic pass–set–attack**

1. Click **Load video sample**. A 4.97-second, silent synthetic clip opens with its matching transcript, four court landmarks, four contact annotations and a supplied reconstruction scene.
2. Use a contact chip or **Go to frame** to compare source and 3D; edit the linked inputs. Source-image annotations use the same fixed-camera projection as the generator, not an automatic detector. No real coach footage is included.
3. Review, select **Illustrative mode**, confirm and export. The complete sample has supplied illustrative values; setting a critical field unresolved still blocks final approval until resolved or explicitly illustrated.

Each card links its scene JSON and transcript; the video card also links the indexed WebM. **Reset loaded sample** restores its original inputs after confirmation when edited. The clip is downloaded from the same static site into a browser blob for reliable seeking; personal media is never uploaded. Nominal rally time is 5 seconds, with source recording/seek tolerance ±0.07s and a 4.97-second encoded tail. Contact anchors are 0.50, 1.80, 3.00 and 4.30 seconds. All occur inside the camera calibration interval. Spin and detailed joints remain intentionally flexible.

Loading shows a fixed loading/success/error message, focuses the chosen workspace and starts a short silent preview. A video sample is reported ready only after its clip decodes. Failed downloads can be retried. Repeatedly loading the same sample also brings its result into view; edited work still requires replacement confirmation.

The reference clip was recorded from `demo("rally")` starting at rally zero, then stream-copy remuxed with FFmpeg to add a duration and seek index. This is an asset preparation step, not a runtime dependency or model call. `examples/sample-video-manifest.json` records the clip SHA-256 and metadata; tests check sample fixtures, transcript/contact consistency, source projection, known-media allowlisting and review gates.

## Real match reference

**Load real match example** opens the licensed UVG-VCM Volleyball Game clip. The original is a real 10-second 3840×2160/60fps indoor sequence; the packaged copy is resized/recompressed to 1280×720 with all 600 frames retained and no audio. Attribution: **UVG-VCM — Volleyball Game, Ultra Video Group, Tampere University, CC BY4.0.** See the [official dataset](https://tie-ultravideo.rd.tuni.fi/UVG-VCM/index.html), [license](https://creativecommons.org/licenses/by/4.0/) and [source/changes/citation notes](examples/uvg-match-notes.txt).

This is a **partial manual reconstruction**, not automatic video extraction: only source 1.50–2.70s and two anonymous net players are illustrated. Approximate visible shoulder/elbow/wrist directions guide two temporal arm keys under an explicit vertical-plane assumption. Attack/possible-block overlap windows are approximately 2.02/2.08s ±0.05s; impact and deflection are uncertain. Court placement, jump lift, metric height, foreshortening and hidden depth remain unconfirmed assumptions. Final approval is blocked by these fields; an explicitly reviewed illustrative export carries the scope/attribution watermark. The remaining players and rally are not reconstructed. Notes are authored by an annotator, not a coach speech transcript.

## Try the two workflows

1. **Tactics board:** choose the middle-slide or pass–set–attack synthetic study. Select a stable actor ID and draw a timed path. Use the ball tool to place the selected contact, or edit all positions and times numerically. Review actor roles/rotation, ball category/action/style/tempo, primitive (slide attack or blocking shuffle are distinct choices), and tactic parameters. Text fields with suggestions remain freely editable. Classification does not determine measured trajectories.
2. **Video-assisted reconstruction:** load a local clip; it stays in browser memory. A new clip clears old sample motion, annotations, calibration and transcript, then displays **3D not reconstructed**. Explicitly start manual reconstruction to expose stationary, unresolved editor placements. Unknown scaffold contacts do not trigger template jumps or ball playback. Seek a source timestamp or step with declared FPS, mark normalized image landmarks/player/ball/contact observations, align contact times, and mark camera cuts. Use board/numeric editors to supply court locations and height ranges. The MVP stores landmark records but does not solve a homography; a court-plane homography would not recover airborne height anyway.
3. **Coach notes:** type/import editable text, or explicitly start microphone recording using the browser permission prompt. Recording stays local and can be saved separately. **Local transcription is not bundled.** No `SpeechRecognition` or paid fallback is invoked. Plain `.txt` export is supported; DOCX is not implemented because the original “Word” requirement remains ambiguous.
4. **Review & cast:** choose Done editing → Review → Confirm reviewed scene. Unresolved/inferred critical information blocks final approval. Explicit **Illustrative mode** permits uncertain finite scaffold values with a visible watermark; structural/time/contact contradictions still block. Exports record the actual canvas as silent WebM, supported in current Chromium browsers. Escape cancels and discards an in-progress export. No MP4 promise or fake download button.
5. **Continue editing:** playback, contact shortcuts, and the rally scrubber share the board and 3D clock. The loaded video follows rally playback and scrubbing; independent video playback drives the rally preview. Audio has independent controls and speech offset, and aligns on scrubbing; audio is not mixed into the export. Every content mutation revokes approval. Undo/redo, local draft persistence, JSON save/open are provided. Reopening a scene always requires fresh review. Media must be reselected.

Video frame stepping uses declared FPS and browser seek behavior, **not frame-index-exact decoding**. Normalized annotations account for the source frame's letterboxing. Media filenames/bytes are not stored in scene JSON. Notes, transcripts and annotations ARE stored in localStorage and exported JSON: review these before sharing.

## Fine-grained body editing

The **Body motion & coach cues** panel selects a player and event, then stages an editable pose. Controls cover hand height/separation/reach, jump lift, knee bend, torso facing/lean, wrist flex, stance, elbow direction and foot angle. Fifteen rig dimensions change body proportions and volume. The procedural mannequin has a shaped torso/head, articulated limb volumes, coarse palms/thumbs and shoes. It has no independent finger articulation, muscle model, measured anatomy or imported motion capture. **Focus motion player** enlarges the selected body; optional joint markers expose the underlying skeleton.

- **Text → pose:** “Put your hands higher” proposes a bounded height increase; at that player's contact it also explicitly proposes a shared ball-contact height change and necessary jump adjustment. “Block wider” proposes arm separation for a block phase. “Turn left/right” proposes a facing adjustment. “Block wiser” asks which aspect—timing, position, angle or coverage—the coach intends. This is a small deterministic cue vocabulary, not a general language-to-motion model. Preview, inspect the changes, then confirm; edits invalidate scene/export approval and support Undo.
- **Video → pose:** pause at a source frame, select a player/event, mark visible **pose joint** observations in normalized image coordinates, then **Capture current video frame**. With shoulder/elbow/wrist marked for one arm, **Preview arm fit from marked joints** converts image segment directions into actual shoulder/elbow angles under a coach-chosen vertical-plane orientation. This conditional fit drives the 3D pose and export. It does not recover perspective, foreshortening, hidden joints or metric depth. Preview and correct it, then explicitly accept illustrative depth and confirm. Frame time and marked 2D joints remain observed; inferred angles/depth remain labelled.

Separate shoulder swing/abduction, elbow bend/bend plane, forearm twist, torso twist and wrist controls allow temporal arm-swing correction. Jump lift and body compression keys control the pelvis trajectory; procedural phases include countermovement, airborne lift, landing compression and a small recovery rebound. Ball-contact anchoring takes precedence at impact. These are editable templates rather than exact measured trajectories.

For clips up to 128MiB, a browser-local SHA-256 content identity lets the exact same file reconnect to a saved scene without losing poses/annotations. A different clip requires replacement confirmation and starts unbound. No filename or video bytes enter scene JSON, but its content hash and private annotation data do; review JSON before sharing. Larger clips can be selected, but matching-media reconnection is unavailable without the local content check. No hash or media is sent remotely.

Foot-plant constraints and fixed-length limb solving catch supported reach, contact, turn and foot-sliding contradictions. These checks cannot establish biomechanical accuracy. Saved scenes preserve motion parameters, rig provenance and image observations. Earlier scenes without motion data, and earlier seven-dimension rigs, continue to load with explicit template defaults. An unconfirmed pose preview blocks scene review and export. The packaged synthetic reference clip uses the earlier template body; the finer mannequin is a new illustrative rendering, not a measured match to that clip's joint motion.

## Follow one important player with little annotation

For a quick public test, **Try local player tracking** loads the licensed UVG clip, uses one clearly labelled preset target tap, and actually runs the local model. It clears the supplied manual 3D scene first; an inference failure leaves no claimed reconstruction. The preset selects a visible near-court receiver, not an occluded net attacker.

1. Open **Video reconstruction** and load a local clip (or the licensed real match example). Pause at a clear torso view, click **Tap player in frame**, then tap that person. Choose up to six seconds around that frame. One player is supported in this release; it does not claim reliable multi-person tracking.
2. Click **Follow selected player locally**, or type “follow this player” and preview the instruction. A worker samples the actual video at about 20 proposals/second, starting at the selected identity anchor and tracking forward/backward. The UI remains usable, reports progress and supports Cancel. The 2D overlay shows model proposals; orange means low visibility, not a calibrated error probability. Inspect identity: a high score can still be wrong. **Show next unclear frame** seeks a flagged interval; tap the same person there and rerun to repair it. There is no per-joint annotation requirement.
3. Record a short English voice note or import audio. Whisper transcribes it locally. Check the editable words, then **Use transcript as player instruction**. “Hands higher” and “jump earlier” stage bounded illustrative variations for that player and current source time. Preview, confirm or discard; confirmed changes invalidate export approval and support Undo. “Block wiser” asks one concise question. This is a small deterministic cue vocabulary, not general text-to-motion generation.
4. Compare source and 3D. Both arms and legs use source-linked proposals with fixed estimated bone lengths. 2D limb directions lead retargeting; model Z is damped and bounded as an explicit illustration assumption. Root travel follows image-space hip displacement. No court or floor is invented. Occlusion/identity gaps remain gaps, without template substitutions. Other people and ball contacts are omitted.
5. **Done editing → Review → Illustrative mode → Confirm → Export playable WebM**. This workflow always blocks Final mode because single-view depth remains inferred. JSON preserves source times, selection anchors, raw 2D/model-3D proposals, visibility, model identity and confirmed variations. Reopening the exact local clip reconnects by SHA-256; different clips clear the reconstruction.

Pose and speech runtimes/weights are self-hosted, lazily loaded only after the user invokes them (roughly 24 MB pose, 55 MB speech). No media uploads, telemetry, external CDN imports or remote speech fallback. CPU/WASM workers need a modern browser; first load and processing can take time, especially mobile. Failed/unclear inference preserves the previous scene and asks for a clearer frame or shorter interval. Silence/invalid audio reports an error; typed instructions remain available. Recording requires microphone permission and HTTPS or localhost. ASR text is never treated as verified motion automatically.

The approved setup transfer total is recorded in `models/manifest.json`, below 300 MB. [Third-party notices](THIRD_PARTY_NOTICES.md) identify exact model/runtime versions, licenses and modifications. Private clips and derived QA remain ignored and excluded from the static build. The real licensed fixture remains separately attributed.

## What the MVP models

- Versioned deterministic JSON, stable actors, timed polylines, contact anchors and partial-order dependencies.
- Shared ball-segment endpoints at each contact, coach-controlled peak heights and editable bounds. Interpolation is an illustrative piecewise arc, not a gravity/drag/spin solver.
- Provenance on intent and motion fields: observed, coach-provided, inferred awaiting review, approved illustrative default, flexible/not applicable, unresolved. The full ledger exposes sources.
- Separate video, speech, rally and animation clocks. Contact review questions are ranked by continuity/tactic consequence using explicit heuristics, not fabricated confidence scores.
- Slide-specific player/setter IDs, approach cue/path, takeoff/landing regions, contact timing/height range, set tempo, target, handedness/technique, blocker and coverage descriptions. These are editable template assumptions; no universal slide is asserted. Some descriptive parameters are documentation constraints rather than animation controls: numeric paths and contact anchors drive motion.
- Alternative tactic branch conditions can be documented; only the primary branch animates.
- Six illustrative actors, not a full 12-player match or a rules-complete rotation simulator. Roles and rotations are editable labels. Net height is currently the fixed 2.43m template, not a configurable competition rule set.

## Checks and evidence

`npm run check` runs JavaScript syntax and formatting checks, strict TypeScript checking of the domain model, Node tests, and a static build. The UI and renderer are plain JavaScript and are not fully statically typed. CI uses the same command. Build hashes version the entry script, styles and relative module imports together to prevent mixed cached releases. Browser testing and known gaps are recorded in [docs/QA.md](docs/QA.md).

See [architecture](docs/ARCHITECTURE.md), [research and evaluation](docs/RESEARCH.md), and the [missing-information protocol](docs/CLARIFICATION.md). Synthetic scenes live in `examples/`; no personal media, transcripts, credentials, or recordings are included.

## Research contribution and next steps

2D→3D sports playbooks and sketch-plus-speech interfaces already exist. The proposed research question is whether preserving volleyball intent and asking targeted questions reduces unsupported assumptions and correction burden. This prototype is an instrument for that question; no novelty or accuracy is established by this code.

Remaining work: robust multi-player identity tracking, calibrated court placement and foot contacts, validated motion accuracy, reliable fingers/occluded joints, broader speech intent, source-linked transcript spans, branch-specific playback, configurable net/rules, frame-accurate decoding and an accessible non-canvas animation alternative. These are not implemented.

## License

No software license has been selected. Public visibility does not grant a software license. The explicitly attributed UVG-VCM media fixture has its own CC BY4.0 license; that does not license the application code. Choose a software license with the project owner before redistribution or reuse.
