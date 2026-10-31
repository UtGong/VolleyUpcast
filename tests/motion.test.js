import test from "node:test";
import assert from "node:assert/strict";
import {
  demo,
  validate,
  serialize,
  parse,
  approve,
  revise,
  ballAt,
} from "../src/model.js";
import {
  RIG,
  skeletonAt,
  keyValues,
  proposeCue,
  previewPlan,
  installKey,
  angleMix,
  twoBone,
} from "../src/motion.js";
const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
test("articulated templates preserve arm/leg segment lengths throughout both rallies", () => {
  for (const kind of ["slide", "rally"]) {
    const s = demo(kind);
    for (let t = 0; t < 5; t += 0.02)
      for (const a of s.actors) {
        const p = skeletonAt(s, a, t),
          j = p.joints;
        assert.deepEqual(p.warnings, [], `${kind} ${a.id} ${t.toFixed(2)}`);
        for (const side of ["left", "right"]) {
          for (const [a, b, l] of [
            [side + "Shoulder", side + "Elbow", RIG.upperArm],
            [side + "Elbow", side + "Wrist", RIG.forearm],
            [side + "Hip", side + "Knee", RIG.thigh],
            [side + "Knee", side + "Ankle", RIG.shin],
          ])
            assert(Math.abs(distance(j[a], j[b]) - l) < 0.0001);
        }
      }
  }
});
test("attack hand shares exact ball-contact anchor and cue updates both only in a preview clone", () => {
  const s = demo(),
    a = s.actors.find((a) => a.id === "M3"),
    old = skeletonAt(s, a, 3),
    ball = ballAt(s, 3);
  assert(distance(old.joints.rightHand, [ball.x, ball.y, ball.z]) < 0.001);
  const plan = proposeCue(
    s,
    keyValues(s, "M3", "attack", 3),
    "Put your hands higher",
  );
  assert(!plan.question);
  assert.equal(s.motion, undefined);
  assert.equal(s.contacts[2].height.value, 2.9);
  const next = previewPlan(s, plan);
  assert.deepEqual(validate(next), []);
  const pose = skeletonAt(next, a, 3);
  assert(pose.joints.rightHand[1] > old.joints.rightHand[1] + 0.09);
  assert.equal(next.contacts[2].height.value, pose.joints.rightHand[1]);
});
test("ambiguous block wiser and missing target context never mutate motion", () => {
  const s = demo(),
    before = serialize(s);
  assert(
    proposeCue(
      s,
      keyValues(s, "M3", "attack", 3),
      "block wiser",
    ).question.includes("timing"),
  );
  assert(proposeCue(s, null, "hands higher").question.includes("player"));
  assert.equal(serialize(s), before);
});
test("block wider needs explicit block phase and changes visible hand separation", () => {
  const s = demo(),
    v = keyValues(s, "B6", "attack", 3);
  assert(proposeCue(s, v, "block wider").question);
  Object.assign(v, { phase: "block" });
  Object.assign(v.params, {
    handHeight: 2.6,
    handWidth: 0.65,
    jumpHeight: 0.4,
    kneeBend: 15,
  });
  const before = previewPlan(s, { candidate: v }),
    plan = proposeCue(s, v, "block wider"),
    after = previewPlan(s, plan),
    a = s.actors.find((a) => a.id === "B6");
  assert.deepEqual(validate(after), []);
  const x = skeletonAt(before, a, 3).joints,
    y = skeletonAt(after, a, 3).joints;
  assert(
    distance(y.leftHand, y.rightHand) >
      distance(x.leftHand, x.rightHand) + 0.15,
  );
});
test("impossible reach, planted jump, moving plant and abrupt turn block all export modes", () => {
  for (const change of [
    (v) => {
      v.params.handHeight = 3.5;
      v.params.jumpHeight = 0;
    },
    (v) => {
      v.plant = "both";
      v.params.jumpHeight = 0.7;
    },
    (v) => {
      v.plant = "both";
      v.params.jumpHeight = 0;
      v.params.handHeight = 1.5;
    },
  ]) {
    const s = demo(),
      v = keyValues(s, "M3", "attack", 3);
    change(v);
    installKey(s, v, "Coach test");
    assert(validate(s).some((i) => i.rank >= 95));
    s.reviewedRevision = s.revision;
    assert.throws(() => approve(s, "illustrative"));
  }
  const s = demo();
  for (const [t, yaw] of [
    [0, 0],
    [0.01, 170],
  ]) {
    const v = keyValues(s, "B6", "attack", t);
    v.params.torsoYaw = yaw;
    installKey(s, v, "Coach test");
  }
  assert(validate(s).some((i) => i.message.includes("turn")));
});
test("IK reports impossible target while preserving finite fixed bone lengths", () => {
  const ik = twoBone([0, 0, 0], [0, 9, 0], 0.4, 0.4, [1, 0, 0]);
  assert(ik.unreachable);
  assert(Math.abs(distance([0, 0, 0], ik.mid) - 0.4) < 1e-8);
  assert(Math.abs(distance(ik.mid, ik.end) - 0.4) < 1e-8);
});
test("planted feet stay fixed while stationary torso keyframes interpolate; yaw crosses shortest arc", () => {
  const s = demo(),
    a = s.actors.find((a) => a.id === "B6");
  for (const [t, yaw] of [
    [2.8, 170],
    [3.2, -170],
  ]) {
    const v = keyValues(s, a.id, "attack", t);
    v.params.torsoYaw = yaw;
    v.params.kneeBend = 70;
    v.params.handHeight = 1.1;
    v.plant = "both";
    installKey(s, v, "Coach keyframe");
  }
  const x = skeletonAt(s, a, 2.9),
    y = skeletonAt(s, a, 2.95);
  assert(distance(x.joints.leftAnkle, y.joints.leftAnkle) < 0.0001);
  assert(
    distance(
      skeletonAt(s, a, 2.999).joints.leftAnkle,
      skeletonAt(s, a, 3.001).joints.leftAnkle,
    ) < 0.0001,
  );
  assert(Math.abs(Math.abs(angleMix(170, -170, 0.5)) - 180) < 0.001);
  assert(
    distance(
      skeletonAt(s, a, 2.999).joints.rightHand,
      skeletonAt(s, a, 3.001).joints.rightHand,
    ) < 0.02,
  );
});
test("video frame joints remain observed 2D while depth is explicitly illustrative; old JSON remains loadable", () => {
  const s = demo(),
    v = keyValues(s, "M3", "attack", 3);
  v.videoTime = 3;
  v.imageJoints = {
    rightWrist: {
      value: { x: 0.4, y: 0.3 },
      status: "observed",
      source: "Manual source frame point",
    },
  };
  installKey(s, v, "Coach accepted illustrative depth");
  const loaded = parse(serialize(s));
  assert.equal(loaded.motion.keys[0].imageJoints.rightWrist.status, "observed");
  assert(loaded.motion.keys[0].depth.value.includes("Illustrative"));
  assert.equal(loaded.approval, null);
  assert.equal(parse(serialize(demo())).motion, undefined);
  revise(loaded);
  assert.equal(loaded.approval, null);
});
