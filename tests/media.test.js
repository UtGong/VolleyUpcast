import test from "node:test";
import assert from "node:assert/strict";
import { fetchSampleClip, waitForVideo } from "../src/media.js";
test("sample HTTP/empty download failures surface instead of reporting loaded", async () => {
  await assert.rejects(
    fetchSampleClip("/clip", null, async () => ({ ok: false, status: 404 })),
    /404/,
  );
  await assert.rejects(
    fetchSampleClip("/clip", null, async () => ({
      ok: true,
      blob: async () => new Blob([]),
    })),
    /empty/,
  );
  const b = new Blob(["reference"]);
  assert.equal(
    await fetchSampleClip("/clip", null, async () => ({
      ok: true,
      blob: async () => b,
    })),
    b,
  );
});
test("sample readiness waits for decoding and reports decode/timeout failures", async () => {
  const video = new EventTarget();
  video.readyState = 0;
  const ready = waitForVideo(video, 100);
  video.dispatchEvent(new Event("loadeddata"));
  await ready;
  const bad = waitForVideo(video, 100);
  video.dispatchEvent(new Event("error"));
  await assert.rejects(bad, /decode/);
  await assert.rejects(waitForVideo(video, 2), /ready/);
});
