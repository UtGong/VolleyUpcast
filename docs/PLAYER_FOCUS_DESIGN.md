# Player selection and speech before annotation

Status: design checkpoint; local model/runtime setup and public prototype publication are explicitly approved. Perception and speech recognition are not implemented yet. The existing local candidate is build `562922388101` with 44 passing tests. The public site remains the earlier release. No model weights or new inference runtimes have been downloaded during this assessment.

## Why the existing generated scene is unsatisfactory

Comparing the private source at 3.200s with its exported 3D frame shows concrete mismatches: the source player raises both arms, but only the marked right arm drives the avatar and the other arm hangs down. The avatar's root remains at an unrelated template court placement; its approach travel is absent. Its legs use a symmetric template rather than the source's asymmetric leg positions. Lift is an illustrative 0.4m and timing blends across a chosen influence span, not a measured takeoff/landing trajectory. The oblique 3D camera also differs from the source, so there is no calibrated reprojection comparison. No identity track connects the chosen person across the interval. These are grounding failures; more sliders do not resolve them.

The private recording and comparison images remain ignored and private. This document deliberately contains no identifying overlays or image excerpts.

## Primary workflow

1. Choose a short clip interval and tap one player; support up to three. A detector can propose nearby boxes, then the tap confirms the anonymous target. The first proof of concept targets one person, not the full court.
2. Speak intent, such as “follow this attacker through the jump; show the arm swing.” Selection and source time anchor “this player” and later references. Persist that target context.
3. The system proposes the target's temporal boxes and dense pose samples, renders a source overlay and a motion-only 3D preview, and highlights uncertain gaps. Other people remain hidden or simple source context markers.
4. Ask only targeted questions: “Is this still Player 1 after the overlap?” or “Earlier jump, different position, or hand angle?” Simple taps, spoken answers or one drag repair the proposal. Full joint annotation becomes an advanced fallback.
5. Preview the source and generated motion together, then confirm. Coach changes are a separate correction layer, not a relabelling of inferred joints as observations. A tactic variation may intentionally depart from the clip and must say so.

The default source-bound view should be a neutral motion stage until court/camera grounding exists. Do not place the player beside a plausible-looking net at invented coordinates. Metric global travel, ball contact/height and hidden joints remain unresolved unless grounded separately. A spoken event cue can identify an approximate contact window without implying a ball tracker ran.

## Automatic proposal architecture

Use a browser worker for local perception. Run a person/pose proposal around the selected location, then one-person pose inference on a crop with context margin. Associate adjacent boxes using overlap, movement and pose continuity under the selected anonymous ID; this is within-clip association, not biometric identity recognition. Stop or mark ambiguity at overlap, camera cuts and long gaps rather than switching targets silently. Do not fill missing motion with the old demo.

Retain source timestamps, normalized 2D landmarks, model-estimated local 3D landmarks, visibility/presence outputs, crop transforms, model/version/hash and any coach corrections. Model outputs are inferred awaiting review. Visibility scores are model scores, not calibrated accuracy. Keep the observed image and inferred depth axes distinct. Dense estimated limb directions should drive both arms, torso and legs, with fixed-length retargeting and temporal regularization; contact/foot constraints may correct a proposal but cannot manufacture evidence.

For uncalibrated footage, separate image-space root travel from local body articulation. Global court placement requires a calibrated camera/floor and additional assumptions. Preview source overlays and measure visible-joint reprojection error; do not certify the hidden 3D skeleton from that error.

## Runtime assessment and scoped model choices

The laptop currently has no MediaPipe, TensorFlow, ONNX Runtime, Whisper, faster-whisper, Vosk or MLX-Whisper installation found in the tested runtime. The in-app browser exposes neither SpeechRecognition nor webkitSpeechRecognition. Recording audio and typed transcript editing work in the current app; actual speech recognition does not.

[MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker) provides 33 landmark proposals and local 3D estimates. Its [model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf) licenses the model under Apache 2.0 and warns about multi-person/distant subjects, occlusion and metric depth. Selecting and cropping one player is appropriate to test, but cannot recover detail absent from the pixels. The [web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js) recommends workers to avoid blocking the UI.

Verified official model bundle lengths:

| Pose choice                     | Official artifact                                                                                                          |     Bytes |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------: |
| Full, recommended quality floor | `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task` | 9,398,198 |
| Lite, smaller comparison        | `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task` | 5,777,746 |

For browser-local English speech, use a quantized Whisper tiny.en ONNX model with [Transformers.js](https://github.com/huggingface/transformers.js). Its official [audio guide](https://github.com/huggingface/transformers.js/blob/main/packages/transformers/docs/source/guides/node-audio-processing.md) uses the [Xenova/whisper-tiny.en conversion](https://huggingface.co/Xenova/whisper-tiny.en), whose metadata declares Apache 2.0. Pin revision `79fb389fc764e7c395bd330e9531d9d32ada7049` and download only the required quantized files, not the whole model repository:

- `onnx/encoder_model_quantized.onnx`: 10,124,913 bytes.
- `onnx/decoder_model_merged_quantized.onnx`: 30,727,382 bytes.
- Tokenizer/configuration files: a few additional MB, explicitly allowlisted before fetching.

Two bundled choices for approval are Full pose + browser Whisper (50,250,493 bytes of main weights) or Lite pose + the same Whisper (46,630,041 bytes of main weights), plus tokenizer/config files and runtimes. Full adds only 3.62MB and is the recommended first quality test. Native ggml tiny.en Q5_1 is 32,166,155 bytes but would require a separate native/WASM toolchain; it is an alternative, not an interchangeable ONNX file.

Pin browser packages from the official npm registry: `@mediapipe/tasks-vision@1.2.0` (Apache 2.0, 44,247,137 bytes unpacked), `@huggingface/transformers@4.3.2` (Apache 2.0, 9,990,867 bytes unpacked), and its compatible `onnxruntime-web@1.31.0-dev.20260914-8d85527a0` (MIT, 144,895,056 bytes unpacked). Those package totals include variants not all needed in the served app; use a verified browser-only asset allowlist and avoid pulling native ONNX/sharp binaries. Record registry integrity and model hashes. A scoped approval should cover these named sources, weights and browser runtime setup with a 300MB download ceiling; stop if additional SDKs, services, permissions, terms or a larger download are needed. No paid API or external media transfer is proposed.

Actual ASR must run locally in a worker, with an explicit microphone action and editable transcript. The [Web Speech specification](https://webaudio.github.io/web-speech-api/#dom-speechrecognition-processlocally) permits remote processing by default; do not silently fall back to that. If the local recognizer is unavailable or fails, say so and retain recording/text fallback. English-only POC recognition will need actual jargon/latency evaluation, not a speech-working badge based on typed commands.

## First proof of concept and evaluation

Start with one selected player over the private short clip, keeping all artifacts private, then repeat on the licensed public fixture. Propose tracking/pose without user joint marking. Compare several source timestamps spanning approach, airborne motion and recovery. Show both arms and legs from the actual proposal; hide or flag uncertain gaps. Test an overlap/reidentification correction and a speech cue tied to the selected player.

Measure initial taps/drags, time to first usable preview, targeted clarification/correction count, lost tracks/identity switches, visible-joint reprojection error on a small developer-labelled holdout, event-time disagreement and foot-contact plausibility. Count offline QA annotations separately from user-required actions. Inspect source versus generated motion visually; a smooth result can still be wrong. No claim of full-match or exact monocular 3D reconstruction follows from this POC.

The user has now explicitly approved the scoped model/runtime setup and public publication of tested improvements. The earlier publication rejection was resolved by that new approval; each release still requires validation. Private uploaded media and its derived QA remain excluded from publication.
