import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { makeSample, builtInVideo, SAMPLE_VIDEO } from "../src/samples.js";
import {
  validate,
  serialize,
  parse,
  approve,
  canExport,
  revise,
} from "../src/model.js";
import { projectPoint } from "../src/render.js";
test("two complete sample scenes require review and preserve gates after edits", () => {
  for (const kind of ["board", "video"]) {
    const s = makeSample(kind);
    assert.deepEqual(validate(s), []);
    assert.equal(canExport(s), false);
    assert.throws(() => approve(s, "illustrative"));
    s.reviewedRevision = s.revision;
    approve(s, "illustrative");
    assert.equal(canExport(s), true);
    revise(s);
    assert.equal(canExport(s), false);
    const loaded = parse(serialize(s));
    assert.equal(loaded.sample.kind, kind);
    assert.equal(loaded.approval, null);
  }
});
test("video contact annotations, source projection and transcript agree with source anchors", () => {
  const s = makeSample("video");
  assert.equal(s.calibrations[0].landmarks.length, 4);
  assert.equal(s.observations.length, 8);
  for (const c of s.contacts) {
    const o = s.observations.find((o) => o.id === `source-${c.id}`);
    assert.equal(o.videoTime, c.time.value);
    assert.equal(o.rallyTime, c.time.value);
    const p = projectPoint(c.x.value, c.height.value, c.z.value);
    assert(Math.abs(o.x - p.x / 900) < 1e-9);
    assert(Math.abs(o.y - p.y / 620) < 1e-9);
    assert(s.transcript.value.includes(c.time.value.toFixed(2) + "s"));
    assert(o.note.includes("synthetic"));
  }
  for (const o of s.observations) {
    assert(o.x >= 0 && o.x <= 1 && o.y >= 0 && o.y <= 1);
    assert(o.videoTime < s.sample.clipDuration.value);
    assert.equal(s.calibrations[0].validUntil, s.sample.clipDuration.value);
  }
});
test("saved sample fixtures and transcripts match the actual loader", async () => {
  for (const kind of ["board", "video"]) {
    assert.deepEqual(
      JSON.parse(await readFile(`examples/sample-${kind}.json`, "utf8")),
      makeSample(kind),
    );
    assert.equal(
      await readFile(`examples/sample-${kind}-transcript.txt`, "utf8"),
      makeSample(kind).transcript.value + "\n",
    );
  }
});
test("only the known built-in sample may reconnect packaged video", () => {
  const s = makeSample("video");
  assert.equal(builtInVideo(s), SAMPLE_VIDEO);
  s.sample.id = "untrusted";
  s.sample.clip.value = "https://untrusted.invalid/clip";
  assert.equal(builtInVideo(s), null);
  assert.equal(builtInVideo(makeSample("board")), null);
});
test("packaged WebM matches the explicit synthetic clip manifest", async () => {
  const manifest = JSON.parse(
    await readFile("examples/sample-video-manifest.json", "utf8"),
  );
  const bytes = await readFile("examples/sample-video.webm");
  assert.equal(bytes.subarray(0, 4).toString("hex"), "1a45dfa3");
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    manifest.sha256,
  );
  assert.deepEqual(
    manifest.contactAnchorsSeconds,
    makeSample("video").contacts.map((c) => c.time.value),
  );
  assert(bytes.length > 100000);
});

test("malformed sample routing metadata is rejected on import", () => {
  const s = makeSample("video");
  s.sample.kind = "unknown";
  assert.throws(() => parse(serialize(s)), /sample metadata/);
});
