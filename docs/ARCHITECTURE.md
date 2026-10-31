# Architecture

The app runs entirely in the browser. GitHub Pages serves only the static build over HTTPS; media processing remains browser-local. `src/model.js` is the typed, deterministic domain layer; `src/render.js` contains court and 3D perspective rendering; `src/app.js` owns UI state, review, file/recording lifecycle, and browser persistence. `server.mjs` serves only static files on loopback and has no upload endpoint. The CSP disallows external connections and remote scripts.

## Scenario v1

A scenario has a stable ID, schema version, content revision, actors, contacts, ball classification, tactic fields, editable transcript, clock mapping, observations, calibration intervals, and documented branch conditions. `examples/*.json` show the complete wire format. Serialization is stable for a given scenario; no random IDs or current dates are generated. New observation IDs derive from revision and count.

An important field is `{value, status, source, range?}`. Position paths carry provenance as a unit; each contact component carries independent provenance. Observation records explicitly contain `status: observed`; they are normalized source-image facts, not 3D estimates. Calibration validity is separately stored; a landmark is not a solved camera. Media bytes remain outside JSON. Source text is a human-readable evidence pointer, not verified evidence.

Video time maps to rally time via `rally = video − videoOffset`. Speech time maps via `rally = speech − speechOffset`. Animation rate scales preview playback; it does not rewrite contact times. Declared FPS controls requested video seeks. After clock changes, observation rally timestamps are recomputed from source video time. Recorded audio playback has independent controls and aligns on rally scrubbing. Exact speech-token alignment is a future adapter.

## Rendering

World x runs across the 9m court and z runs longitudinally from −9m to +9m. y is height; the net lies at z=0 with a fixed 2.43m top. `drawScene` performs camera-basis transforms and a pinhole perspective divide on actual x/y/z coordinates. It draws an articulated, explicitly labelled human template with simple gait/arm/jump phases. There is no imported mocap or biomechanics claim. This CPU Canvas renderer needs no WebGL dependency.

Each actor uses a timed polyline. Ball segments share exact contact anchors; each segment uses two easing curves from endpoint height to the chosen mid-time peak and back. Endpoints are continuous, velocity/acceleration generally are not. This is a tactical illustration, not a projectile solver. Contact proximity, time order, numeric ranges, basic model limits, rough horizontal speed and net crossing checks detect supported contradictions. These tests cannot certify a physically possible or regulation-legal rally.

Descriptive slide fields are kept visible even when not executable: takeoff/landing text, technique, coverage instruction and branches are coach intent. The numeric path/contact editors govern actual preview motion. A future compiler should make executable constraints from these descriptions, detect contradiction with numeric anchors, and ask the coach to resolve it; this MVP does not pretend free text already controls motion.

## Review and export

Content mutations snapshot undo history, increment revision, clear review and export approval, recompute derived clock mappings, update both views, then store the draft. Undo/redo/import clear approval, even if serialized input claimed approval. Done editing marks a revision reviewed. Confirm requires that exact revision. Final mode rejects unresolved/inferred critical fields; illustrative mode permits explicit uncertain finite values while rejecting structural/continuity errors. Intentionally flexible spin or joint detail need not be invented. Critical motion cannot bypass review by being labelled not applicable.

`MediaRecorder(canvas.captureStream(30))` records the actual rendered scene in real time. The exporter checks approved revision, blocks content mutations, discards interrupted exports, labels the interpretation on the canvas, and emits a real silent WebM. Export duration is wall-clock rally duration, independent of preview animation rate. No audio mixing, transcoding, or server-side rendering is included.

## Boundaries

Schema parsing rejects unknown versions and malformed essential structures. Type checking currently covers the domain model, not the entire UI. localStorage is same-origin browser storage, not encrypted vault storage. Keep sensitive notes out of demonstrations. The static server uses a root containment check. Production authentication, multitenancy, uploaded-media management, remote collaboration, paid inference are outside this prototype. The public GitHub Pages deployment adds no server-side data processing or media-upload endpoint.
