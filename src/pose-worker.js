import {
  FilesetResolver,
  PoseLandmarker,
} from "../vendor/mediapipe/vision_bundle.mjs";
let detector;
async function ready() {
  detector ??= (async () => {
    const files = await FilesetResolver.forVisionTasks(
      new URL("../vendor/mediapipe/wasm", import.meta.url).href,
      true,
    );
    return PoseLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath: new URL(
          "../models/pose/pose_landmarker_full.task",
          import.meta.url,
        ).href,
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      numPoses: 3,
      minPoseDetectionConfidence: 0.4,
      minPosePresenceConfidence: 0.4,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });
  })();
  return detector;
}
self.onmessage = async ({ data }) => {
  try {
    const task = await ready();
    if (data.type === "init") {
      self.postMessage({ id: data.id, type: "ready" });
      return;
    }
    const result = task.detect(data.bitmap);
    data.bitmap.close();
    const copy = (p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
      visibility: p.visibility ?? 0,
      presence: p.presence ?? 0,
    });
    self.postMessage({
      id: data.id,
      type: "pose",
      landmarks: result.landmarks.map((a) => a.map(copy)),
      worldLandmarks: result.worldLandmarks.map((a) => a.map(copy)),
    });
    result.close?.();
  } catch (e) {
    data.bitmap?.close();
    self.postMessage({
      id: data.id,
      type: "error",
      message: e.message || String(e),
    });
  }
};
