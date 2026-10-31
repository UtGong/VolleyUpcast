import test from "node:test";
import assert from "node:assert/strict";
import {
  choosePose,
  cropAround,
  sampleAt,
  focusSkeleton,
  estimateRig,
  installPerformance,
  validateFocus,
  focusCue,
  stageBounds,
} from "../src/focus.js";
import {
  demo,
  validate,
  approve,
  revise,
  canExport,
  serialize,
  parse,
} from "../src/model.js";
const landmarks = () =>
  Array.from({ length: 33 }, (_, i) => ({
    x: 0.5 + (i % 2 ? 0.04 : -0.04),
    y: 0.5 + (i < 17 ? -0.2 : 0.2),
    z: 0,
    visibility: 0.98,
    presence: 0.99,
  }));
function sample(t) {
  const points = landmarks();
  const world = landmarks();
  for (const [a, b] of [
    [11, 12],
    [13, 14],
    [15, 16],
    [23, 24],
    [25, 26],
    [27, 28],
  ]) {
    world[a].x = -0.2;
    world[b].x = 0.2;
  }
  world[11].y = world[12].y = -0.5;
  world[13].y = world[14].y = -0.75;
  world[15].y = world[16].y = -1;
  world[23].y = world[24].y = 0;
  world[25].y = world[26].y = 0.4;
  world[27].y = world[28].y = 0.8;
  for (let i = 0; i < 33; i++) {
    points[i].x = 0.5 + world[i].x * 0.2;
    points[i].y = 0.6 + world[i].y * 0.3;
  }
  return {
    videoTime: t,
    state: "ok",
    points,
    world,
    center: { x: 0.5, y: 0.5 },
    visibleBody: 12,
    box: { x: 0.4, y: 0.2, w: 0.2, h: 0.6 },
  };
}
function track() {
  const p = {
    version: 1,
    actorId: "focus-1",
    label: { value: "Player 1", status: "coach-provided", source: "tap" },
    interval: {
      value: [1, 1.2],
      status: "coach-provided",
      source: "coach interval",
    },
    seeds: {
      value: [{ x: 0.5, y: 0.5, time: 1.1 }],
      status: "coach-provided",
      source: "tap",
    },
    samples: {
      value: [sample(1), sample(1.1), sample(1.2)],
      status: "inferred-awaiting-review",
      source: "model proposal",
    },
    corrections: { value: [], status: "coach-provided", source: "coach" },
    aspect: 16 / 9,
    sourceWidth: 1280,
    sourceHeight: 720,
    imageScale: 4,
  };
  p.rig = estimateRig(p);
  p.bounds = stageBounds(p);
  return p;
}
test("identity association refuses a nearby player switch and ambiguous overlap", () => {
  const result = { landmarks: [landmarks()], worldLandmarks: [landmarks()] },
    roi = { x: 0, y: 0, w: 1, h: 1 };
  assert.notEqual(
    choosePose(result, roi, { x: 0.5, y: 0.5 }, null, 1).state,
    "gap",
  );
  assert.equal(
    choosePose(
      result,
      roi,
      { x: 0.5, y: 0.5 },
      { center: { x: 0.4, y: 0.5 }, box: { h: 0.6 } },
      1,
    ).state,
    "gap",
  );
  result.landmarks.push(landmarks().map((p) => ({ ...p, x: p.x + 0.03 })));
  result.worldLandmarks.push(landmarks());
  assert.equal(
    choosePose(result, roi, { x: 0.5, y: 0.5 }, null, 1).state,
    "gap",
  );
  const c = cropAround({ x: 0, y: 1 }, 16 / 9, 0.7);
  assert(c.x >= 0 && c.y + c.h <= 1 && (c.w * 16) / 9 === c.h);
});
test("gaps, large time holes and out-of-interval frames never receive template poses", () => {
  const p = track();
  assert(sampleAt(p, 1.05));
  assert.equal(sampleAt(p, 0.8), null);
  assert.equal(sampleAt(p, 1.4), null);
  p.samples.value[1] = { videoTime: 1.1, state: "gap" };
  assert.equal(focusSkeleton(p, 1.05), null);
  p.samples.value = [sample(1), sample(1.4)];
  assert.equal(sampleAt(p, 1.2), null);
});
test("observed proposals animate both limbs with fixed estimated bone lengths and reviewable variations", () => {
  const p = track(),
    pose = focusSkeleton(p, 1.1);
  for (const side of ["left", "right"]) {
    assert(pose.joints[side + "Wrist"][1] > pose.joints[side + "Shoulder"][1]);
    const a = pose.joints[side + "Shoulder"],
      b = pose.joints[side + "Elbow"];
    assert(
      Math.abs(Math.hypot(...a.map((x, i) => x - b[i])) - p.rig.upperArm) <
        1e-9,
    );
  }
  const before = JSON.stringify(p.samples);
  p.corrections.value.push(focusCue("hands higher", 1.1).correction);
  assert(focusSkeleton(p, 1.1));
  assert.equal(JSON.stringify(p.samples), before);
  assert(focusCue("block wiser", 1.1).question);
});
test("selected-player scene has no inherited contacts, cannot claim final accuracy and survives save/load", () => {
  const s = demo();
  installPerformance(s, track());
  assert.equal(s.contacts.length, 0);
  assert.equal(validateFocus(s.performance, s).length, 0);
  assert(!validate(s).some((i) => i.rank >= 90));
  s.reviewedRevision = s.revision;
  assert.throws(() => approve(s, "final"));
  approve(s, "illustrative");
  assert(canExport(s));
  const saved = parse(serialize(s));
  assert(saved.performance);
  assert.equal(saved.approval, null);
  revise(s);
  assert(!canExport(s));
  s.performance.samples.value[0].world[0].x = NaN;
  assert(validateFocus(s.performance, s).length);
  assert.throws(() => parse(serialize(s)));
});

test("duplicate detections of the same image pose are not treated as two identities", () => {
  const points = landmarks(),
    result = {
      landmarks: [points, points.map((p) => ({ ...p, x: p.x + 0.001 }))],
      worldLandmarks: [landmarks(), landmarks()],
    };
  assert.notEqual(
    choosePose(result, { x: 0, y: 0, w: 1, h: 1 }, { x: 0.5, y: 0.5 }, null, 1)
      .state,
    "gap",
  );
});
test("replacing a focused clip removes its derived track and reinstates only unresolved manual scaffolds", async () => {
  const { unbindVideo } = await import("../src/reconstruction.js");
  const s = demo();
  installPerformance(s, track());
  unbindVideo(s, "c".repeat(64));
  assert.equal(s.performance, undefined);
  assert.equal(s.videoBinding.state, "unbound");
  assert(s.contacts.length >= 2);
  assert(s.contacts.every((c) => c.time.status === "unresolved"));
  assert(validate(s).some((i) => i.rank >= 90));
  assert(!canExport(s));
});
