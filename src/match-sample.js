import { demo, field } from "./model.js";
import { keyValues, fitObservedArms, installKey } from "./motion.js";

export const MATCH_CLIP = "./examples/uvg-volleyball-match.mp4";
export const MATCH_ID = "uvg-match-manual-v1";
const assumption = (value, note) =>
  field(value, "inferred-awaiting-review", note);
export function makeMatchSample() {
  const s = demo("rally");
  s.id = MATCH_ID;
  s.title = "REAL UVG-VCM clip · manual 1.50–2.70s excerpt";
  s.duration = 1.2;
  s.sample = {
    kind: "match",
    id: MATCH_ID,
    baselineRevision: 1,
    source: field(
      "UVG-VCM — Volleyball Game, Ultra Video Group, Tampere University, CC BY4.0; resized 3840×2160 → 1280×720, H.264 recompressed; no audio",
      "observed",
      "https://tie-ultravideo.rd.tuni.fi/UVG-VCM/index.html",
    ),
    clip: field(MATCH_CLIP),
    clipDuration: field(10),
    timingTolerance: field(0.05),
  };
  s.videoBinding = {
    state: "manual",
    source:
      "Real licensed UVG-VCM clip; manually marked frames, conditional arm-plane fit, unmeasured 3D depth. Only the 1.50–2.70s attack/block excerpt is illustrated.",
  };
  s.approval = null;
  s.reviewedRevision = null;
  s.observations = [];
  s.branches = [];
  s.actors = s.actors.filter((a) => ["M3", "B6"].includes(a.id));
  for (const [id, role, x, z] of [
    ["M3", "near right-side jumper · anonymous visual track", 7.4, 0.85],
    ["B6", "opposite net jumper · anonymous visual track", 7.05, -0.35],
  ]) {
    const a = s.actors.find((a) => a.id === id);
    a.role = assumption(
      role,
      "Manual visual track description, not a player identity or confirmed positional role",
    );
    a.rotation = field(
      0,
      "flexible-not-applicable",
      "Rotation not needed for this two-player excerpt",
    );
    a.path = assumption(
      [
        { t: 0, x, z },
        { t: 1.2, x, z },
      ],
      "Approximate stationary court placement for the net exchange; horizontal travel/depth not calibrated from source",
    );
  }
  s.contacts = [
    {
      id: "attack",
      after: [],
      actor: assumption(
        "M3",
        "Near right-side jumper; manually associated at source approximately 2.02s",
      ),
      action: assumption(
        "attack",
        "Visible overhead swing; exact impact frame uncertain ±0.05s",
      ),
      time: field(
        31 / 60,
        "observed",
        "Manual approximate impact window source 2.0167s, rally origin source 1.50s",
        [28 / 60, 34 / 60],
      ),
      height: assumption(
        2.75,
        "Illustrative height; monocular image does not establish metres",
      ),
      x: assumption(7.4, "Uncalibrated court placement"),
      z: assumption(0.85, "Uncalibrated court depth"),
      apex: assumption(2.9, "Illustrative short attack/block segment"),
    },
    {
      id: "block",
      after: ["attack"],
      actor: assumption(
        "B6",
        "Opposite net jumper; hand/ball overlap near source 2.08s, occlusion uncertain",
      ),
      action: assumption(
        "block",
        "Possible hand-ball contact; coach must resolve overlap/deflection ambiguity",
      ),
      time: field(
        35 / 60,
        "observed",
        "Manual approximate overlap window source 2.0833s; not frame-exact impact",
        [33 / 60, 38 / 60],
      ),
      height: assumption(
        2.75,
        "Illustrative height; depth and exact contact unresolved",
      ),
      x: assumption(7.05, "Uncalibrated court placement"),
      z: assumption(-0.35, "Uncalibrated court depth"),
      apex: assumption(
        2.9,
        "End of illustrated exchange; rest of rally not reconstructed",
      ),
    },
  ];
  for (const c of s.contacts) c.height.range = [2.4, 3.2];
  s.ball = {
    category: field("indoor volleyball", "observed", "Real indoor source clip"),
    action: assumption(
      "attack → possible block",
      "Manual partial exchange; later rally not reconstructed",
    ),
    style: field("illustrative segment; not a fitted physical trajectory"),
    tempo: field(
      "not established",
      "unresolved",
      "Requires coach confirmation",
    ),
    spin: field("unknown", "flexible-not-applicable", "Spin is not resolved"),
  };
  for (const k of Object.keys(s.tactic))
    s.tactic[k] = field(
      "Not applicable to this partial two-player excerpt",
      "flexible-not-applicable",
      "No full-rally or slide classification is asserted",
    );
  s.tactic.primitive = assumption(
    "net attack / possible block exchange",
    "Manual interpretation of visible motion",
  );
  s.clocks.videoOffset = field(
    1.5,
    "coach-provided",
    "Annotator chose source 1.50s as excerpt rally zero; source clip remains 10s",
  );
  s.clocks.speechOffset = field(
    0,
    "flexible-not-applicable",
    "Source has no audio; supplied text is authored annotation",
  );
  s.clocks.fps = field(
    60,
    "observed",
    "Official MP4 and decoded frame metadata",
  );
  s.calibrations = [
    {
      id: "uvg-fixed-observation-window",
      validFrom: 0,
      validUntil: 10,
      landmarks: [],
      status: "inferred-awaiting-review",
    },
  ];
  const mark = (time, id, jointName, x, y, note) => {
    s.observations.push({
      id: `uvg-${s.observations.length}`,
      kind: jointName ? "pose joint" : "contact",
      actorId: id,
      ...(jointName ? { jointName } : {}),
      videoTime: time,
      rallyTime: time - 1.5,
      x: x / 1920,
      y: y / 1080,
      note,
      calibrationId: "uvg-fixed-observation-window",
      status: "observed",
    });
  };
  for (const [time, coords] of [
    [
      1.8,
      [
        [1384, 510],
        [1403, 475],
        [1358, 450],
      ],
    ],
    [
      13 / 6,
      [
        [1385, 505],
        [1340, 530],
        [1300, 540],
      ],
    ],
  ]) {
    for (let i = 0; i < 3; i++)
      mark(
        time,
        "M3",
        ["rightShoulder", "rightElbow", "rightWrist"][i],
        ...coords[i],
        "Manual approximate visible right-arm point, ±15px at 1920×1080 inspection scale; side association and occlusion need coach review",
      );
    const candidate = keyValues(s, "M3", "attack", time - 1.5);
    candidate.videoTime = time;
    candidate.span = 0.18;
    candidate.imageJoints = Object.fromEntries(
      s.observations
        .filter((o) => o.videoTime === time && o.kind === "pose joint")
        .map((o) => [
          o.jointName,
          field({ x: o.x, y: o.y }, "observed", o.note),
        ]),
    );
    const plan = fitObservedArms(s, candidate, 16 / 9, 180);
    if (plan.question) throw Error(plan.question);
    const key = installKey(
      s,
      plan.candidate,
      "Annotator conditional image-plane fit; unconfirmed 3D illustration, not measured depth",
    );
    for (const f of [
      key.phase,
      key.plant,
      key.depth,
      ...Object.values(key.params),
    ])
      f.status = "inferred-awaiting-review";
  }
  mark(
    121 / 60,
    "M3",
    null,
    1340,
    398,
    "Approximate attack hand/ball overlap; inspect ±0.05s, no exact impact claim",
  );
  mark(
    125 / 60,
    "B6",
    null,
    1310,
    394,
    "Possible block hand/ball overlap, partly occluded; inspect ±0.05s",
  );
  s.transcript = field(
    "AUTHORED ANNOTATOR NOTES — not a real coach recording. Real UVG-VCM source has no audio.\n[source 1.50–2.70s] Only two anonymous net players are illustrated; other players and the remainder of the 10-second rally are not reconstructed.\n[source 1.80s] Near right-side jumper has a cocked arm; approximate visible shoulder/elbow/wrist points guide a conditional vertical-plane pose.\n[source about 2.02s ±0.05s] Overhead attack hand/ball overlap.\n[source about 2.08s ±0.05s] Possible opposite blocker contact; overlap/occlusion requires coach confirmation.\n[source 2.17s] Follow-through arm points guide the next key. Court positions, heights, body depth and jump lift are illustrative assumptions. Correct them and review before exporting.",
    "coach-provided",
    "Authored by prototype annotator from inspected source frames; no speech transcription",
  );
  return s;
}
