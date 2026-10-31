import test from "node:test";
import assert from "node:assert/strict";
import {
  demo,
  validate,
  approve,
  revise,
  canExport,
  parse,
  serialize,
  ballAt,
  actorAt,
  segmentAt,
} from "../src/model.js";
const ready = (s, mode = "final") => {
  s.reviewedRevision = s.revision;
  approve(s, mode);
  return s;
};
test("both synthetic scenarios have continuous actors, ordered anchors and no model contradictions", () => {
  for (const kind of ["slide", "rally"])
    assert.deepEqual(validate(demo(kind)), []);
});
test("approval requires review and edits revoke export", () => {
  const s = demo();
  assert.throws(() => approve(s, "final"), /Review/);
  ready(s);
  assert.equal(canExport(s), true);
  revise(s);
  assert.equal(canExport(s), false);
  assert.equal(s.reviewedRevision, null);
});
test("unknown critical height blocks final and requires explicit illustrative approval", () => {
  const s = demo();
  s.contacts[2].height.status = "unresolved";
  s.reviewedRevision = s.revision;
  assert.throws(() => approve(s, "final"), /Critical/);
  approve(s, "illustrative");
  assert.equal(canExport(s), true);
});
test("inferred fields need review while irrelevant spin may stay flexible", () => {
  const s = demo();
  s.ball.tempo.status = "inferred-awaiting-review";
  assert(validate(s).some((i) => i.id === "ball.tempo"));
  s.ball.tempo.status = "coach-provided";
  assert.equal(validate(s).length, 0);
});
test("structural contradictions cannot be exported in illustrative mode", () => {
  for (const change of [
    (s) => (s.contacts[1].time.value = 0.1),
    (s) => (s.contacts[2].actor.value = "missing"),
    (s) => (s.contacts[1].after = ["attack"]),
    (s) => (s.contacts[1].x.value = 50),
    (s) => (s.contacts[0].apex.value = 0.1),
  ]) {
    const s = demo();
    change(s);
    s.reviewedRevision = s.revision;
    assert.throws(() => approve(s, "illustrative"));
    assert.equal(canExport(s), false);
  }
});
test("actor contact location contradiction detected", () => {
  const s = demo();
  s.contacts[2].x.value = 0;
  assert(validate(s).some((i) => i.message.includes("farther")));
});
test("configured numeric range contradictions detected", () => {
  const s = demo();
  s.contacts[2].height.range = [1, 2];
  assert(validate(s).some((i) => i.message.includes("range")));
});
test("every contact anchor is an exact shared ball endpoint", () => {
  const s = demo();
  for (const c of s.contacts) {
    const p = ballAt(s, c.time.value);
    assert(Math.abs(p.x - c.x.value) < 1e-9);
    assert(Math.abs(p.z - c.z.value) < 1e-9);
    assert(Math.abs(p.y - c.height.value) < 1e-9);
  }
  for (let i = 1; i < s.contacts.length; i++) {
    const p = segmentAt(s.contacts[i - 1], s.contacts[i], 0.5);
    assert.equal(p.y, s.contacts[i - 1].apex.value);
  }
});
test("actor interpolation is deterministic and finite at endpoints", () => {
  const s = demo();
  const a = s.actors[2];
  assert.deepEqual(actorAt(a, -1), a.path.value[0]);
  assert.deepEqual(actorAt(a, 100), a.path.value.at(-1));
  assert(Number.isFinite(actorAt(a, 2).x));
});
test("camera cut invalidates observation calibration", () => {
  const s = demo();
  s.calibrations = [
    {
      id: "cal",
      validFrom: 0,
      validUntil: 2,
      landmarks: [],
      status: "observed",
    },
  ];
  s.observations = [
    {
      id: "o",
      kind: "ball",
      videoTime: 3,
      rallyTime: 1,
      x: 0.5,
      y: 0.5,
      note: "synthetic",
      calibrationId: "cal",
      status: "observed",
    },
  ];
  assert(validate(s).some((i) => i.message.includes("camera cut")));
});
test("scenario round trip is deterministic; importing approval never trusts previous session", () => {
  const s = demo();
  assert.equal(serialize(parse(serialize(s))), serialize(s));
  ready(s);
  const loaded = parse(serialize(s));
  assert.equal(loaded.approval, null);
  assert.equal(canExport(loaded), false);
});
test("unsupported or malformed JSON fails closed", () => {
  assert.throws(() => parse("{"));
  assert.throws(() => parse('{"schemaVersion":2}'));
  assert.throws(() => parse("{}"));
});
test("duplicate actors, invalid paths and bad clocks blocked", () => {
  const s = demo();
  s.actors.push(s.actors[0]);
  s.actors[1].path.value[1].t = -2;
  s.clocks.animationRate.value = 0;
  assert(validate(s).length >= 3);
});
