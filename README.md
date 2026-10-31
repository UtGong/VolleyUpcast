# VolleyUpcast

**A local research prototype for turning coach intent into reviewed volleyball scenes.** Draw a play or annotate a local video, describe the tactic, review uncertain information, then export an actual animated WebM. “Upcast” describes upgrading a flat plan into a 3D tactical illustration.

This is a working browser application, not an automatic monocular reconstruction system. It uses a perspective projection of a 3D court/net and articulated template players. It does not estimate measured joint motion, solve ball physics, transcribe speech, or infer hidden video depth.

## Run

Node.js 24 is used by CI. Runtime has no third-party dependencies; TypeScript and Prettier are development tools only.

```sh
npm ci --ignore-scripts
npm run dev
# Open http://127.0.0.1:5187
npm run check
```

`PORT=5190 npm run dev` selects another loopback port. `npm run build` produces `dist/`; `SERVE_DIST=1 npm run dev` serves it. The server binds only to `127.0.0.1`. No cloud deployment, new account, paid API, telemetry, external fonts, or remote speech recognition is configured.

## Try the two workflows

1. **Tactics board:** choose the middle-slide or pass–set–attack synthetic study. Select a stable actor ID and draw a timed path. Use the ball tool to place the selected contact, or edit all positions and times numerically. Review actor roles/rotation, ball category/action/style/tempo, primitive (slide attack or blocking shuffle are distinct choices), and tactic parameters. Text fields with suggestions remain freely editable. Classification does not determine measured trajectories.
2. **Video-assisted reconstruction:** load a local clip; it stays in browser memory. Existing template tracks become **unresolved scaffolds**, never detections. Step with your declared frame rate, start a calibration record, mark normalized image landmarks/player/ball/contact observations, align contact times, and mark camera cuts. Use board/numeric editors to supply court locations and height ranges. The MVP stores landmark records but does not solve a homography; a court-plane homography would not recover airborne height anyway.
3. **Coach notes:** type/import editable text, or explicitly start microphone recording using the browser permission prompt. Recording stays local and can be saved separately. **Local transcription is not bundled.** No `SpeechRecognition` or paid fallback is invoked. Plain `.txt` export is supported; DOCX is not implemented because the original “Word” requirement remains ambiguous.
4. **Review & cast:** choose Done editing → Review → Confirm reviewed scene. Unresolved/inferred critical information blocks final approval. Explicit **Illustrative mode** permits uncertain finite scaffold values with a visible watermark; structural/time/contact contradictions still block. Exports record the actual canvas as silent WebM, supported in current Chromium browsers. Escape cancels and discards an in-progress export. No MP4 promise or fake download button.
5. **Continue editing:** playback, contact shortcuts, and the rally scrubber share the board and 3D clock. The loaded video follows rally playback and scrubbing; independent video playback drives the rally preview. Audio has independent controls and speech offset, and aligns on scrubbing; audio is not mixed into the export. Every content mutation revokes approval. Undo/redo, local draft persistence, JSON save/open are provided. Reopening a scene always requires fresh review. Media must be reselected.

Video frame stepping uses declared FPS and browser seek behavior, **not frame-index-exact decoding**. Normalized annotations account for the source frame's letterboxing. Media filenames/bytes are not stored in scene JSON. Notes, transcripts and annotations ARE stored in localStorage and exported JSON: review these before sharing.

## What the MVP models

- Versioned deterministic JSON, stable actors, timed polylines, contact anchors and partial-order dependencies.
- Shared ball-segment endpoints at each contact, coach-controlled peak heights and editable bounds. Interpolation is an illustrative piecewise arc, not a gravity/drag/spin solver.
- Provenance on intent and motion fields: observed, coach-provided, inferred awaiting review, approved illustrative default, flexible/not applicable, unresolved. The full ledger exposes sources.
- Separate video, speech, rally and animation clocks. Contact review questions are ranked by continuity/tactic consequence using explicit heuristics, not fabricated confidence scores.
- Slide-specific player/setter IDs, approach cue/path, takeoff/landing regions, contact timing/height range, set tempo, target, handedness/technique, blocker and coverage descriptions. These are editable template assumptions; no universal slide is asserted. Some descriptive parameters are documentation constraints rather than animation controls: numeric paths and contact anchors drive motion.
- Alternative tactic branch conditions can be documented; only the primary branch animates.
- Six illustrative actors, not a full 12-player match or a rules-complete rotation simulator. Roles and rotations are editable labels. Net height is currently the fixed 2.43m template, not a configurable competition rule set.

## Checks and evidence

`npm run check` runs JavaScript syntax and formatting checks, strict TypeScript checking of the domain model, Node model tests, and a static build. The UI is plain JavaScript and is not fully statically typed. CI uses the same command. Browser testing and known gaps are recorded in [docs/QA.md](docs/QA.md).

See [architecture](docs/ARCHITECTURE.md), [research and evaluation](docs/RESEARCH.md), and the [missing-information protocol](docs/CLARIFICATION.md). Synthetic scenes live in `examples/`; no personal media, transcripts, credentials, or recordings are included.

## Research contribution and next steps

2D→3D sports playbooks and sketch-plus-speech interfaces already exist. The proposed research question is whether preserving volleyball intent and asking targeted questions reduces unsupported assumptions and correction burden. This prototype is an instrument for that question; no novelty or accuracy is established by this code.

Next adapters: explicit on-device speech transcription, robust court calibration, coach-assisted tracking, source-linked transcript spans, branch-specific playback, measured motion retargeting, configurable net/rules, frame-accurate decoding and an accessible non-canvas animation alternative. These are not implemented.

## License

No license has been selected. Public visibility does not grant a software license. Choose one with the project owner before redistribution or reuse.
