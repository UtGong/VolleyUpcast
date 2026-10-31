# From real clip to a defensible motion study

The working path is local source seeking → explicit manual reconstruction → anonymous player association → visible 2D observations → conditional arm-plane fit/numeric body constraints → reviewed keyframes → illustrative export. It is not automatic match reconstruction. A second camera or measured motion is needed to constrain many otherwise ambiguous 3D motions.

## Information the coach must supply or review

Choose the target player and interval, handedness/visible side, contact interpretation, and camera-cut boundaries. Mark visible shoulder/elbow/wrist points at windup, extension/contact and follow-through. Correct the assumed body-plane orientation; image angle fitting cannot undo foreshortening. Supply or bound body size, court placement, ball height, lift and landing mechanics. Leave occluded joints/depth unresolved rather than inventing observations. The UI allows explicit illustrative interpretation and revokes approval on edits.

For bounciness, mark grounded/countermovement, takeoff, airborne/apex, descent and recovery frames. Use temporal jump-lift/compression/knee/foot keys, and inspect the pelvis proxy. Foot visibility and perspective may prevent metric jump-height estimation. The current template is not a physical spring identification or whole-body biomechanical fit. A high arm target at shared ball contact constrains the hand even when swing keys suggest another direction; the coach must resolve inconsistent timing/height.

The source may contain screen controls, captions, score overlays, non-player graphics and variable-rate or repeated frames. None is a body observation. The current seeker uses timestamps plus declared-FPS steps, not frame-index-exact decoding. Use original timestamps and inspect several adjacent frames before labelling an impact. No speech transcript may be fabricated for a silent clip; authored annotator notes must say so.

## Future optional on-device estimator adapter — not implemented

An adapter should accept local decoded frames with presentation timestamps, a coach-approved region excluding overlays, camera-cut IDs and anonymous player tracks. It should return candidate 2D joints, visibility/occlusion and model/source/version metadata. Estimator outputs are inferred awaiting review, not measured ground truth. Retain any model-supplied score as its own uncalibrated output; do not manufacture accuracy or depth confidence.

After coach correction, a separate calibrated camera/body fitting stage could propose multiple depth/pose solutions with explicit priors, bounds and contact constraints. Store alternatives when monocular geometry is ambiguous. Evaluate visible reprojection error and contact/actor mistakes separately from unknown hidden-joint error. Stable foot contact, joint lengths and timing are necessary checks, not proof of correct 3D anatomy.

No adapter, model weights, third-party inference service or model download is bundled or executed. Before adding one, identify its official source, exact download size, license, runtime requirements and data destination for approval. The current UI remains usable through manual observations while that decision is pending.

## Shareable fixture and private validation

The public candidate contains only the explicitly attributed UVG-VCM clip and manual excerpt, alongside synthetic examples. See `examples/uvg-match-notes.txt` for license and citation. User-supplied clips, screen overlays, screenshots, annotations and derived validation exports remain under ignored `qa-local/`; they must not enter a public commit or build.
