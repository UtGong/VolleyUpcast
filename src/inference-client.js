import { cropAround, choosePose, estimateRig, stageBounds } from "./focus.js";
export class LocalWorker {
  constructor(file, onProgress = () => {}) {
    const url = new URL(file, import.meta.url);
    url.searchParams.set("v", document.documentElement.dataset.build || "dev");
    this.worker = new Worker(url, { type: "module" });
    this.next = 0;
    this.pending = new Map();
    this.onProgress = onProgress;
    this.worker.onmessage = ({ data }) => {
      if (data.type === "progress") {
        this.onProgress(data);
        return;
      }
      const entry = this.pending.get(data.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      this.pending.delete(data.id);
      data.type === "error"
        ? entry.reject(Error(data.message))
        : entry.resolve(data);
    };
    this.worker.onerror = (e) =>
      this.close(Error(e.message || "Local model worker failed"));
  }
  call(data, transfer = []) {
    const id = ++this.next;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Error("Local inference timed out. Try a shorter interval."));
      }, 90000);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ ...data, id }, transfer);
    });
  }
  close(error = Error("Local analysis cancelled")) {
    this.worker.terminate();
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    this.pending.clear();
  }
}
export async function seekVideo(video, time, signal) {
  if (signal?.aborted) throw Error("Analysis cancelled");
  if (
    Math.abs(video.currentTime - time) < 0.003 &&
    !video.seeking &&
    video.readyState >= 2
  )
    return;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => finish(Error("The source frame could not be decoded")),
      6000,
    );
    const done = () => finish(),
      error = () => finish(Error("The source video could not be decoded")),
      abort = () => finish(Error("Analysis cancelled"));
    function finish(err) {
      clearTimeout(timeout);
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", error);
      signal?.removeEventListener("abort", abort);
      err ? reject(err) : resolve();
    }
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", error, { once: true });
    signal?.addEventListener("abort", abort, { once: true });
    video.currentTime = time;
  });
}
export async function analyzePlayer(video, selection, onProgress, signal) {
  const { start, end, seeds, label } = selection;
  if (!seeds.length) throw Error("Tap the player in the source frame first.");
  if (
    !Number.isFinite(video.duration) ||
    start < 0 ||
    end > video.duration + 0.001 ||
    end <= start ||
    end - start > 6
  )
    throw Error(
      "Choose an interval of up to 6 seconds inside the loaded clip.",
    );
  const worker = new LocalWorker("./pose-worker.js"),
    abort = () => worker.close();
  signal.addEventListener("abort", abort, { once: true });
  const aspect = video.videoWidth / video.videoHeight,
    canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const samples = [],
    times = [];
  for (let t = start; t < end - 0.008; t += 0.05) times.push(t);
  times.push(Math.min(end, video.duration - 0.002));
  try {
    onProgress({
      stage: "Loading the on-device pose model (about 24 MB on first use)",
      done: 0,
      total: times.length,
    });
    await worker.call({ type: "init" });
    // Start at the human identity anchor and track in both temporal directions.
    // Never start on an earlier overlapping person and call that the selected identity.
    const anchor = seeds.reduce((a, b) =>
      Math.abs(b.time - (start + end) / 2) <
      Math.abs(a.time - (start + end) / 2)
        ? b
        : a,
    );
    if (anchor.time < start || anchor.time > end)
      throw Error("The selected player frame must be inside the interval.");
    const ordered = [
      anchor.time,
      ...times.filter((t) => t > anchor.time + 0.004),
      ...times.filter((t) => t < anchor.time - 0.004).reverse(),
    ];
    let previous = null,
      roi = cropAround(anchor, aspect, 0.5),
      lastTime = anchor.time,
      backward = false,
      initial = null;
    for (let i = 0; i < ordered.length; i++) {
      if (signal.aborted) throw Error("Analysis cancelled");
      const t = ordered[i],
        reverse = t < anchor.time - 0.004;
      if (reverse && !backward) {
        backward = true;
        lastTime = anchor.time;
        previous = initial;
        roi = initial
          ? cropAround(
              {
                x: initial.box.x + initial.box.w / 2,
                y: initial.box.y + initial.box.h / 2,
              },
              aspect,
              Math.max(0.28, initial.box.h * 1.7),
            )
          : cropAround(anchor, aspect, 0.5);
      }
      const repair = seeds.find((p) => Math.abs(p.time - t) < 0.026);
      if (repair) {
        previous = null;
        roi = cropAround(repair, aspect, 0.5);
      }
      await seekVideo(video, t, signal);
      const seed = repair || anchor;
      const detect = async (crop) => {
        ctx.drawImage(
          video,
          crop.x * video.videoWidth,
          crop.y * video.videoHeight,
          crop.w * video.videoWidth,
          crop.h * video.videoHeight,
          0,
          0,
          512,
          512,
        );
        const bitmap = await createImageBitmap(canvas),
          result = await worker.call({ type: "detect", bitmap }, [bitmap]);
        return choosePose(result, crop, seed, previous, video.currentTime);
      };
      let sample = await detect(roi);
      if (!previous && (i === 0 || repair) && sample.state === "gap") {
        for (const height of [0.36, 0.7]) {
          roi = cropAround(seed, aspect, height);
          sample = await detect(roi);
          if (sample.state !== "gap") break;
        }
      }
      if (i === 0) {
        if (sample.state === "gap")
          throw Error(
            "The selected frame has no reliable pose for that player. Tap a clearer torso view or choose another frame.",
          );
        initial = sample;
      }
      // A long occlusion needs a fresh human anchor; do not silently reacquire another person.
      if (previous && Math.abs(t - lastTime) > 0.23 && !repair)
        sample = {
          videoTime: video.currentTime,
          state: "gap",
          reason:
            "Tracking lost. Tap this same player in a later clear frame to repair identity.",
        };
      samples.push(sample);
      if (sample.state !== "gap") {
        previous = sample;
        lastTime = t;
        roi = cropAround(
          {
            x: sample.box.x + sample.box.w / 2,
            y: sample.box.y + sample.box.h / 2,
          },
          aspect,
          Math.max(0.28, initial.box.h * 1.4, sample.box.h * 1.7),
        );
      }
      onProgress({
        stage: "Proposing this player's body motion",
        done: i + 1,
        total: ordered.length,
        sample,
      });
    }
    samples.sort((a, b) => a.videoTime - b.videoTime);
    for (let i = samples.length - 1; i > 0; i--)
      if (samples[i].videoTime - samples[i - 1].videoTime < 0.004)
        samples.splice(i, 1);
    if (samples.filter((s) => s.state !== "gap").length < 3)
      throw Error(
        `Only ${samples.filter((s) => s.state !== "gap").length}/${samples.length} frames were usable. Choose a clearer frame or a shorter interval; no demo motion was substituted.`,
      );
    const field = (value, status, source) => ({ value, status, source });
    const track = {
      version: 1,
      actorId: "focus-1",
      label: field(
        label || "Player 1",
        "coach-provided",
        "Coach-selected anonymous player label",
      ),
      interval: field(
        [start, end],
        "coach-provided",
        "Coach-selected source interval",
      ),
      seeds: field(
        seeds,
        "coach-provided",
        "Coach taps identifying the same player within this clip",
      ),
      samples: field(
        samples,
        "inferred-awaiting-review",
        "MediaPipe Full CPU/WASM per-frame proposals and geometric association; not measured 3D",
      ),
      corrections: field(
        [],
        "coach-provided",
        "No coach motion correction yet",
      ),
      aspect,
      sourceWidth: video.videoWidth,
      sourceHeight: video.videoHeight,
      model: {
        name: "MediaPipe Pose Landmarker Full",
        runtime: "@mediapipe/tasks-vision 1.2.0",
        sha256:
          "5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1",
        license: "Apache-2.0",
      },
      basis:
        "2D-led fixed-bone retargeting with damped bounded model depth and image-space root travel; no calibrated court depth, floor or metric jump height",
    };
    track.rig = estimateRig(track);
    const ratios = samples
      .filter((s) => s.state !== "gap")
      .map((s) => {
        const hip = {
          x: (s.points[23].x + s.points[24].x) / 2,
          y: (s.points[23].y + s.points[24].y) / 2,
        };
        return (
          track.rig.torsoLength /
          Math.max(
            0.045,
            Math.hypot(
              ((s.points[11].x + s.points[12].x) / 2 - hip.x) * aspect,
              (s.points[11].y + s.points[12].y) / 2 - hip.y,
            ),
          )
        );
      })
      .sort((a, b) => a - b);
    track.imageScale = ratios[Math.floor(ratios.length / 2)];
    track.bounds = stageBounds(track);
    return track;
  } finally {
    signal.removeEventListener("abort", abort);
    worker.close();
  }
}
export async function audioSamples(blob) {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) throw Error("This browser cannot decode local voice notes.");
  const context = new Audio();
  try {
    const raw = await context.decodeAudioData(await blob.arrayBuffer());
    if (raw.duration > 60)
      throw Error("Use a voice note of up to 60 seconds for this prototype.");
    const offline = new OfflineAudioContext(
        1,
        Math.ceil(raw.duration * 16000),
        16000,
      ),
      source = offline.createBufferSource();
    source.buffer = raw;
    source.connect(offline.destination);
    source.start();
    return (await offline.startRendering()).getChannelData(0);
  } finally {
    await context.close();
  }
}
