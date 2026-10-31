import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { demo, approve, validate, serialize, parse } from "../src/model.js";
import { makeSample, builtInVideo } from "../src/samples.js";
import { makeMatchSample, MATCH_CLIP } from "../src/match-sample.js";
import {
  unbindVideo,
  beginManualReconstruction,
  setUnboundDuration,
  sameLocalVideo,
} from "../src/reconstruction.js";
import {
  skeletonAt,
  keyValues,
  installKey,
  fitObservedArms,
  previewPlan,
  RIG,
} from "../src/motion.js";
const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
test("new local clip clears demo motion/media evidence and blocks even illustrative export until explicitly bound", () => {
  const s = makeMatchSample();
  unbindVideo(s);
  setUnboundDuration(s, 4.078333);
  assert.equal(s.duration, 4.078333);
  assert.equal(s.motion, undefined);
  assert.equal(s.sample, undefined);
  assert.deepEqual(s.observations, []);
  assert.deepEqual(s.calibrations, []);
  assert.equal(s.transcript.value, "");
  assert.equal(builtInVideo(s), null);
  s.reviewedRevision = s.revision;
  assert.throws(() => approve(s, "illustrative"));
  beginManualReconstruction(s);
  for (const a of s.actors)
    for (const t of [0, 2, 4]) {
      const p = skeletonAt(s, a, t);
      assert.equal(p.phase, "ready");
      assert.equal(p.params.jumpHeight, 0);
    }
  assert.equal(
    validate(s).some((i) => i.rank >= 90),
    false,
  );
  assert.equal(parse(serialize(s)).videoBinding.state, "manual");
});
test("marked 2D arm directions change actual 3D joints under an explicit plane assumption", () => {
  const s = demo(),
    v = keyValues(s, "B6", "attack", 1);
  v.videoTime = 1;
  v.imageJoints = {};
  for (const [name, x, y] of [
    ["rightShoulder", 0.5, 0.5],
    ["rightElbow", 0.55, 0.4],
    ["rightWrist", 0.6, 0.32],
  ])
    v.imageJoints[name] = {
      value: { x, y },
      status: "observed",
      source: "Synthetic manual points",
    };
  const plan = fitObservedArms(s, v, 16 / 9, 0);
  assert(!plan.question);
  assert(plan.candidate.imageFit.includes("depth not recovered"));
  const a = s.actors.find((a) => a.id === "B6"),
    before = skeletonAt(s, a, 1),
    after = skeletonAt(previewPlan(s, plan), a, 1);
  assert(distance(before.joints.rightWrist, after.joints.rightWrist) > 0.2);
  assert(
    Math.abs(
      distance(after.joints.rightShoulder, after.joints.rightElbow) -
        RIG.upperArm,
    ) < 1e-4,
  );
  assert(
    Math.abs(
      distance(after.joints.rightElbow, after.joints.rightWrist) - RIG.forearm,
    ) < 1e-4,
  );
  assert.deepEqual(after.warnings, []);
  const missing = structuredClone(v);
  delete missing.imageJoints.rightElbow;
  assert(fitObservedArms(s, missing).question);
});
test("countermovement, airborne lift and landing compression produce a changing pelvis trajectory", () => {
  const s = demo(),
    a = s.actors.find((a) => a.id === "M3");
  const ready = skeletonAt(s, a, 2.3),
    load = skeletonAt(s, a, 2.57),
    peak = skeletonAt(s, a, 3),
    land = skeletonAt(s, a, 3.43),
    recovery = skeletonAt(s, a, 3.8);
  assert(load.params.compression > 0.07);
  assert(peak.joints.pelvis[1] > ready.joints.pelvis[1] + 0.5);
  assert(land.params.compression > 0.1);
  assert.equal(recovery.params.compression, 0);
  assert(distance(load.joints.rightElbow, peak.joints.rightElbow) > 0.2);
});
test("swing controls preserve the shared attack contact and reject unsupported angle bounds", () => {
  const s = demo(),
    v = keyValues(s, "M3", "attack", 3);
  v.params.swingBlend = 1;
  v.params.rightSwing = -90;
  installKey(s, v, "Coach test");
  const p = skeletonAt(
      s,
      s.actors.find((a) => a.id === "M3"),
      3,
    ),
    c = s.contacts.find((c) => c.id === "attack");
  assert(
    distance(p.joints.rightHand, [c.x.value, c.height.value, c.z.value]) <
      0.001,
  );
  s.motion.keys[0].params.rightElbowBend.value = 170;
  assert(validate(s).some((i) => i.message.includes("Swing/compression")));
});
test("real match fixture preserves scoped observations, safe media routing, uncertainty and finite motion", async () => {
  const s = makeMatchSample();
  assert.equal(builtInVideo(s), MATCH_CLIP);
  assert.deepEqual(
    JSON.parse(await readFile("examples/uvg-match.json", "utf8")),
    s,
  );
  assert.equal(s.clocks.videoOffset.value, 1.5);
  assert.equal(s.duration, 1.2);
  assert(s.transcript.value.startsWith("AUTHORED ANNOTATOR"));
  assert(
    s.motion.keys.every(
      (k) => k.imageFit && Object.keys(k.imageJoints).length === 3,
    ),
  );
  assert(validate(s).some((i) => i.rank === 85));
  assert(!validate(s).some((i) => i.rank >= 90));
  s.reviewedRevision = s.revision;
  assert.throws(() => approve(s, "final"));
  approve(s, "illustrative");
  for (let t = 0; t < s.duration; t += 1 / 60)
    for (const a of s.actors)
      assert.deepEqual(skeletonAt(s, a, t).warnings, []);
  s.sample.id = "untrusted";
  assert.equal(builtInVideo(s), null);
});
test("only the licensed transformed match clip matches its public manifest", async () => {
  const manifest = JSON.parse(
      await readFile("examples/uvg-match-manifest.json", "utf8"),
    ),
    bytes = await readFile("examples/uvg-volleyball-match.mp4");
  assert.equal(bytes.length, manifest.bytes);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    manifest.sha256,
  );
  assert.equal(manifest.frames, 600);
  assert.equal(manifest.audio, false);
  assert(manifest.license.endsWith("/by/4.0/"));
});
test("matching local content reconnects a saved scene while different bytes cannot inherit its motion", () => {
  const s = makeMatchSample(),
    hash = "a".repeat(64);
  unbindVideo(s, hash);
  beginManualReconstruction(s);
  const v = keyValues(s, s.actors[0].id, s.contacts[0].id, 0.4);
  installKey(s, v, "Manual test");
  const loaded = parse(serialize(s));
  assert(sameLocalVideo(loaded, hash));
  assert(!sameLocalVideo(loaded, "b".repeat(64)));
  assert(!sameLocalVideo(loaded, undefined));
  assert.equal(loaded.motion.keys.length, 1);
});
test("descent remains airborne until lift is near ground instead of planting at the key midpoint", () => {
  const s = demo(),
    a = s.actors.find((a) => a.id === "B6");
  for (const [time, lift, plant] of [
    [0.5, 0.4, "airborne"],
    [1, 0, "both"],
  ]) {
    const v = keyValues(s, a.id, "attack", time);
    Object.assign(v.params, {
      jumpHeight: lift,
      kneeBend: 55,
      handHeight: 1.1,
    });
    v.plant = plant;
    installKey(s, v, "Manual landing");
  }
  const p = skeletonAt(s, a, 0.8);
  assert(p.params.jumpHeight > 0.025);
  assert(p.joints.leftAnkle[1] > 0.025);
  assert.deepEqual(p.warnings, []);
});
