import test from "node:test";
import assert from "node:assert/strict";
import { demo, RIG_LIMITS, validate } from "../src/model.js";
import {
  RIG,
  skeletonAt,
  rigFor,
  keyValues,
  installKey,
} from "../src/motion.js";
import { buildMannequin } from "../src/mannequin.js";
test("mannequin contains finite volumetric body parts without external geometry", () => {
  const s = demo();
  for (const a of s.actors) {
    const faces = buildMannequin(skeletonAt(s, a, 3), rigFor(s, a.id));
    for (const name of [
      "head",
      "torso",
      "left-upper-arm",
      "right-forearm",
      "left-hand",
      "right-thumb",
      "left-thigh",
      "right-shoe",
    ])
      assert(
        faces.some((f) => f.part === name),
        name,
      );
    assert(faces.length > 100);
    for (const f of faces) {
      assert(/^#[0-9a-f]{6}$/.test(f.color));
      assert(f.points.every((p) => p.length === 3 && p.every(Number.isFinite)));
    }
  }
});
test("body proportions and palm/shoe widths change geometry while bone lengths remain constrained", () => {
  const s = demo(),
    a = s.actors[5],
    pose = skeletonAt(s, a, 0),
    before = buildMannequin(pose, RIG),
    wide = buildMannequin(pose, {
      ...RIG,
      palmWidth: 0.12,
      footWidth: 0.15,
      headWidth: 0.26,
      torsoDepth: 0.4,
    });
  for (const part of ["left-hand", "left-shoe", "head", "torso"])
    assert.notDeepEqual(
      before.filter((f) => f.part === part),
      wide.filter((f) => f.part === part),
    );
  for (const [k, v] of Object.entries(RIG))
    assert(v >= RIG_LIMITS[k][0] && v <= RIG_LIMITS[k][1]);
});
test("unsupported mannequin dimensions are rejected before export", () => {
  const s = demo();
  installKey(s, keyValues(s, "M3", "attack", 3), "Coach test");
  s.motion.rigs.M3.headWidth.value = 1;
  assert(validate(s).some((i) => i.message.includes("rig dimension")));
});

test("older seven-dimension rigs acquire explicit default volume provenance when edited", () => {
  const s = demo();
  installKey(s, keyValues(s, "M3", "attack", 3), "Older rig");
  for (const name of Object.keys(RIG).slice(7)) delete s.motion.rigs.M3[name];
  const v = keyValues(s, "M3", "attack", 3);
  v.rig = rigFor(s, "M3");
  installKey(s, v, "Coach edit");
  assert.deepEqual(validate(s), []);
  assert.equal(
    s.motion.rigs.M3.headWidth.status,
    "approved-illustrative-default",
  );
  assert(s.motion.rigs.M3.headWidth.source.includes("Unmeasured"));
});
