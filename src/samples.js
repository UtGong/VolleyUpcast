import { demo, field } from "./model.js";
import { projectPoint } from "./render.js";

export const SAMPLE_VIDEO_DURATION = 4.97;
export const SAMPLE_VIDEO = "./examples/sample-video.webm";
export const SAMPLE_INFO = {
  board: {
    id: "board-slide-v1",
    title: "Sample 1 · Board → 3D",
    detail:
      "Middle-blocker slide · coach-style transcript, timed paths, ball types and complete illustrative constraints.",
  },
  video: {
    id: "video-rally-v1",
    title: "Sample 2 · Video → 3D",
    detail:
      "Synthetic pass–set–attack clip · matching transcript, image annotations, calibration record and supplied 3D scene.",
  },
};
export function makeSample(kind) {
  if (!Object.hasOwn(SAMPLE_INFO, kind)) throw Error("Unknown sample");
  const s = demo(kind === "board" ? "slide" : "rally");
  const info = SAMPLE_INFO[kind];
  s.title = info.title + " · SYNTHETIC DEMO";
  s.sample = {
    kind,
    id: info.id,
    baselineRevision: 1,
    source: field(
      "Authored synthetic example. Not real coaching data or automatic reconstruction.",
    ),
  };
  s.ball.category = field("indoor volleyball");
  s.ball.action = field("forearm pass → set → attack");
  s.ball.style = field("illustrative arc; spin unspecified");
  s.contacts[2].height.range = [2.7, 3.2];
  s.tactic.approachStartCue = field(
    "After P1 pass at 0.50s; path starts at rally 0s and reaches the attack area by 2.80s",
  );
  const slide = kind === "board";
  if (slide) {
    const middle = s.actors.find((a) => a.id === "M3");
    middle.path.value.splice(1, 0, { ...middle.path.value[0], t: 0.5 });
    s.tactic.approachStartCue = field(
      "After P1 pass at 0.50s; hold until the cue, then approach by 2.80s",
    );
  } else {
    s.tactic.approachStartCue = field(
      "At rally start; M3 approaches the attack area by 2.80s, as in the synthetic source clip",
    );
    s.tactic.handednessTechnique = field(
      "Right hand; illustrative attack template, no measured joint technique",
    );
  }
  s.transcript = field(
    [
      "SYNTHETIC COACH-STYLE TRANSCRIPT — authored demonstration, not a real recording.",
      "[rally 0.00s] Near-team actors P1 passer, S2 setter, M3 middle; O4 and C5 hold support. B6 is a stationary template opponent.",
      "[rally 0.50s] P1 forearm-passes from (x 2.00m, z 6.00m), contact height 0.90m, to S2.",
      "[rally 1.80s] S2 sets at (x 4.50m, z 1.40m), contact height 2.10m.",
      slide
        ? "[rally 3.00s] M3 finishes the middle slide and attacks at (x 7.05m, z 1.08m), height 2.90m. This is one illustrative approach, not a universal slide technique."
        : "[rally 3.00s] M3 attacks at (x 4.03m, z 1.08m), height 2.90m. This sample is a standard pass–set–attack, not a slide.",
      "[rally 4.30s] Ball lands at opponent-court target (x 6.00m, z −6.00m).",
      "All paths, heights and timing are supplied by the synthetic generator. Spin and detailed joints are intentionally unspecified. Review before confirming or exporting.",
    ].join("\n"),
    "approved-illustrative-default",
    "Authored transcript matched to synthetic contact anchors",
  );
  const retag = (v) => {
    if (!v || typeof v !== "object") return;
    if ("value" in v && "status" in v) {
      if (v.status !== "flexible-not-applicable")
        v.source =
          "Authored synthetic generator scene; illustrative reference, awaiting your scene review";
      return;
    }
    for (const x of Object.values(v)) retag(x);
  };
  retag(s);
  if (!slide) {
    s.sample.clip = field(
      SAMPLE_VIDEO,
      "approved-illustrative-default",
      'Generated from demo("rally"), fixed 900×620 camera, approximately five seconds; no private footage',
    );
    s.sample.clipDuration = field(
      SAMPLE_VIDEO_DURATION,
      "approved-illustrative-default",
      "Duration of the packaged, indexed synthetic WebM",
    );
    s.sample.timingTolerance = field(
      0.07,
      "approved-illustrative-default",
      "Two nominal 30fps frames; browser recording/seeking is not frame-exact",
    );
    s.clocks.videoOffset = field(
      0,
      "approved-illustrative-default",
      "Synthetic clip recorded from rally zero; nominal clocks agree within 0.07s",
    );
    const corners = [
      [0, 0, -9, "far-left baseline"],
      [9, 0, -9, "far-right baseline"],
      [9, 0, 9, "near-right baseline"],
      [0, 0, 9, "near-left baseline"],
    ];
    const image = ([x, y, z]) => {
      const p = projectPoint(x, y, z);
      return { x: p.x / 900, y: p.y / 620 };
    };
    s.calibrations = [
      {
        id: "synthetic-fixed-camera",
        validFrom: 0,
        validUntil: SAMPLE_VIDEO_DURATION,
        status: "approved-illustrative-default",
        landmarks: corners.map((p) => ({ ...image(p), label: p[3] })),
      },
    ];
    s.observations = corners.map((p, i) => ({
      id: `corner-${i + 1}`,
      kind: "court landmark",
      videoTime: 0,
      rallyTime: 0,
      ...image(p),
      note: `${p[3]} · synthetic source projection, not an automatic detection`,
      calibrationId: "synthetic-fixed-camera",
      status: "approved-illustrative-default",
    }));
    for (const c of s.contacts)
      s.observations.push({
        id: `source-${c.id}`,
        kind: "contact",
        videoTime: c.time.value,
        rallyTime: c.time.value,
        ...image([c.x.value, c.height.value, c.z.value]),
        note: `${c.id} · ${c.actor.value || "floor"} · synthetic generator reference (±0.07s frame tolerance); not detected from real footage`,
        calibrationId: "synthetic-fixed-camera",
        status: "approved-illustrative-default",
      });
  }
  return s;
}
export function builtInVideo(s) {
  return s.sample?.kind === "video" && s.sample.id === SAMPLE_INFO.video.id
    ? SAMPLE_VIDEO
    : null;
}
