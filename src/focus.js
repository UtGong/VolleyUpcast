// @ts-nocheck
// Source-linked model proposals. Scores are model visibility, not accuracy.
export const BODY = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
export const LINKS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const median = (a) => {
  const s = a.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
export function cropAround(point, aspect, height = 0.62) {
  const h = clamp(height, 0.22, 0.95),
    w = Math.min(0.95, h / aspect);
  return {
    x: clamp(point.x - w / 2, 0, 1 - w),
    y: clamp(point.y - h / 2, 0, 1 - h),
    w,
    h,
  };
}
function boxOf(points) {
  const visible = points.filter(
    (p, i) => BODY.includes(i) && p.visibility > 0.35,
  );
  if (visible.length < 6) return null;
  const xs = visible.map((p) => p.x),
    ys = visible.map((p) => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}
export function choosePose(result, roi, seed, previous, videoTime) {
  const candidates = [];
  for (let i = 0; i < result.landmarks.length; i++) {
    const points = result.landmarks[i].map((p) => ({
        ...p,
        x: roi.x + p.x * roi.w,
        y: roi.y + p.y * roi.h,
      })),
      world = result.worldLandmarks[i];
    const box = boxOf(points);
    if (
      !box ||
      !world ||
      [23, 24, 11, 12].some((j) => points[j].visibility < 0.35)
    )
      continue;
    const center = {
      x: (points[23].x + points[24].x + points[11].x + points[12].x) / 4,
      y: (points[23].y + points[24].y + points[11].y + points[12].y) / 4,
    };
    const target = previous?.center || seed;
    const cost =
      distance(center, target) / Math.max(0.15, previous?.box?.h || box.h);
    candidates.push({
      videoTime,
      points,
      world,
      box,
      center,
      cost,
      visibleBody: BODY.filter((j) => points[j].visibility >= 0.5).length,
    });
  }
  candidates.sort((a, b) => a.cost - b.cost);
  // The multi-pose detector can return near-duplicate proposals for one crop.
  // Suppress only practically identical image poses, not distinct overlapping people.
  for (let i = candidates.length - 1; i > 0; i--) {
    const b = candidates[i];
    if (
      candidates
        .slice(0, i)
        .some(
          (a) =>
            BODY.reduce(
              (sum, j) => sum + distance(a.points[j], b.points[j]),
              0,
            ) /
              BODY.length <
            0.012,
        )
    )
      candidates.splice(i, 1);
  }
  if (!candidates.length)
    return {
      videoTime,
      state: "gap",
      reason: "No reliable body proposal in the selected crop",
    };
  const best = candidates[0];
  if (
    best.cost > (previous ? 1.0 : 0.45) ||
    (previous
      ? Math.abs(best.center.x - previous.center.x) > 0.04 ||
        Math.abs(best.center.y - previous.center.y) > 0.11
      : distance(best.center, seed) > 0.085)
  )
    return {
      videoTime,
      state: "gap",
      reason: "Target moved beyond a reliable identity association",
    };
  if (candidates[1] && candidates[1].cost - best.cost < 0.1)
    return {
      videoTime,
      state: "gap",
      reason: "Two people overlap; tap the target again here",
    };
  return {
    ...best,
    state: best.visibleBody < 10 ? "uncertain" : "ok",
    reason:
      best.visibleBody < 10
        ? "Some model joints have low visibility; inspect this interval"
        : "",
  };
}
export function sampleAt(track, sourceTime) {
  const samples = track.samples.value;
  if (
    !samples.length ||
    sourceTime < samples[0].videoTime - 0.002 ||
    sourceTime > samples.at(-1).videoTime + 0.002
  )
    return null;
  let a = samples[0],
    b = samples.at(-1);
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].videoTime <= sourceTime) a = samples[i];
    if (samples[i].videoTime >= sourceTime) {
      b = samples[i];
      break;
    }
  }
  if (
    a.state === "gap" ||
    b.state === "gap" ||
    b.videoTime - a.videoTime > 0.22
  )
    return null;
  const u = clamp(
    (sourceTime - a.videoTime) / (b.videoTime - a.videoTime || 1),
    0,
    1,
  );
  const blend = (aa, bb) =>
    aa.map((p, i) => ({
      x: p.x + (bb[i].x - p.x) * u,
      y: p.y + (bb[i].y - p.y) * u,
      z: p.z + (bb[i].z - p.z) * u,
      visibility: Math.min(p.visibility, bb[i].visibility),
      presence: Math.min(p.presence, bb[i].presence),
    }));
  return {
    ...a,
    videoTime: sourceTime,
    points: blend(a.points, b.points),
    world: blend(a.world, b.world),
  };
}
const vec = (p) => [p.x, -p.y, p.z],
  add = (a, b) => a.map((x, i) => x + b[i]),
  sub = (a, b) => a.map((x, i) => x - b[i]),
  mul = (a, n) => a.map((x) => x * n),
  len = (a) => Math.hypot(...a),
  unit = (a) => mul(a, 1 / (len(a) || 1)),
  mid = (a, b) => mul(add(a, b), 0.5);
export function estimateRig(track) {
  const valid = track.samples.value.filter((s) => s.state !== "gap");
  const measure = (a, b) =>
    median(valid.map((s) => len(sub(vec(s.world[a]), vec(s.world[b])))));
  return {
    shoulderHeight: 1.48,
    shoulderWidth: clamp(measure(11, 12), 0.25, 0.65),
    pelvisWidth: clamp(measure(23, 24), 0.2, 0.5),
    upperArm: clamp((measure(11, 13) + measure(12, 14)) / 2, 0.2, 0.55),
    forearm: clamp((measure(13, 15) + measure(14, 16)) / 2, 0.2, 0.55),
    thigh: clamp((measure(23, 25) + measure(24, 26)) / 2, 0.3, 0.65),
    shin: clamp((measure(25, 27) + measure(26, 28)) / 2, 0.3, 0.65),
    torsoLength: clamp(
      median(
        valid.map((s) =>
          len(
            sub(
              mid(vec(s.world[11]), vec(s.world[12])),
              mid(vec(s.world[23]), vec(s.world[24])),
            ),
          ),
        ),
      ),
      0.35,
      0.8,
    ),
    torsoDepth: 0.24,
    headWidth: 0.18,
    headHeight: 0.24,
    headDepth: 0.2,
    armRadius: 0.055,
    legRadius: 0.075,
    palmWidth: 0.085,
    footWidth: 0.1,
  };
}
export function focusSkeleton(track, sourceTime) {
  let shifted = sourceTime;
  for (const c of track.corrections.value)
    if (c.type === "earlier" && Math.abs(sourceTime - c.time) < c.span)
      shifted += c.amount * (1 - Math.abs(sourceTime - c.time) / c.span);
  const sample = sampleAt(track, shifted);
  if (!sample) return null;
  const r = track.rig || estimateRig(track);
  const hip2 = {
    x: (sample.points[23].x + sample.points[24].x) / 2,
    y: (sample.points[23].y + sample.points[24].y) / 2,
  };
  const valid = track.samples.value.filter((s) => s.state !== "gap"),
    first = valid[0];
  const reference = {
    x: (first.points[23].x + first.points[24].x) / 2,
    y: (first.points[23].y + first.points[24].y) / 2,
  };
  const imageTorso = Math.hypot(
    ((sample.points[11].x + sample.points[12].x) / 2 - hip2.x) * track.aspect,
    (sample.points[11].y + sample.points[12].y) / 2 - hip2.y,
  );
  const imageScale =
    track.imageScale || r.torsoLength / Math.max(0.045, imageTorso);
  // Prefer the source-image limb directions; single-view model depth is weak.
  // Bounded, damped model Z is an explicit illustrative retargeting assumption.
  const raw = sample.points.map((p, i) => [
    (p.x - hip2.x) * track.aspect * imageScale,
    -(p.y - hip2.y) * imageScale,
    clamp(sample.world[i].z, -0.4, 0.4) * 0.4,
  ]);
  const pelvis = mid(raw[23], raw[24]),
    shoulders = mid(raw[11], raw[12]);
  const root = [
    (hip2.x - reference.x) * track.aspect * imageScale,
    1 - (hip2.y - reference.y) * imageScale,
    0,
  ];
  const joints = { pelvis: root },
    shoulderCenter = add(
      root,
      mul(unit(sub(shoulders, pelvis)), r.torsoLength),
    );
  const up = unit(sub(shoulderCenter, root));
  joints.neck = add(shoulderCenter, mul(up, 0.08));
  joints.head = add(joints.neck, mul(up, 0.19));
  for (const [side, a, b, c, d, e, f, g, h] of [
    ["left", 11, 13, 15, 23, 25, 27, 31, 19],
    ["right", 12, 14, 16, 24, 26, 28, 32, 20],
  ]) {
    joints[side + "Shoulder"] = add(
      shoulderCenter,
      mul(unit(sub(raw[a], shoulders)), r.shoulderWidth / 2),
    );
    joints[side + "Elbow"] = add(
      joints[side + "Shoulder"],
      mul(unit(sub(raw[b], raw[a])), r.upperArm),
    );
    joints[side + "Wrist"] = add(
      joints[side + "Elbow"],
      mul(unit(sub(raw[c], raw[b])), r.forearm),
    );
    joints[side + "Hand"] = add(
      joints[side + "Wrist"],
      mul(unit(sub(raw[h], raw[c])), 0.085),
    );
    joints[side + "Hip"] = add(
      root,
      mul(unit(sub(raw[d], pelvis)), r.pelvisWidth / 2),
    );
    joints[side + "Knee"] = add(
      joints[side + "Hip"],
      mul(unit(sub(raw[e], raw[d])), r.thigh),
    );
    joints[side + "Ankle"] = add(
      joints[side + "Knee"],
      mul(unit(sub(raw[f], raw[e])), r.shin),
    );
    joints[side + "Toe"] = add(
      joints[side + "Ankle"],
      mul(unit(sub(raw[g], raw[f])), 0.18),
    );
  }
  for (const c of track.corrections.value) {
    if (c.type !== "hands" || Math.abs(sourceTime - c.time) >= c.span) continue;
    const weight = 1 - Math.abs(sourceTime - c.time) / c.span;
    for (const side of ["left", "right"]) {
      const shoulder = joints[side + "Shoulder"],
        wrist = joints[side + "Wrist"],
        delta = [0, c.amount * weight, 0],
        target = add(wrist, delta),
        direction = unit(sub(target, shoulder));
      const reach = Math.min(
          r.upperArm + r.forearm - 0.005,
          len(sub(target, shoulder)),
        ),
        end = add(shoulder, mul(direction, reach)),
        bend = unit(sub(joints[side + "Elbow"], mid(shoulder, wrist)));
      const along =
          (r.upperArm * r.upperArm - r.forearm * r.forearm + reach * reach) /
          (2 * reach),
        height = Math.sqrt(
          Math.max(0, r.upperArm * r.upperArm - along * along),
        );
      const axis = unit(sub(end, shoulder)),
        projection = bend.reduce((sum, x, i) => sum + x * axis[i], 0),
        normal = unit(sub(bend, mul(axis, projection)));
      const handDelta = sub(joints[side + "Hand"], wrist);
      joints[side + "Elbow"] = add(
        add(shoulder, mul(axis, along)),
        mul(normal, height),
      );
      joints[side + "Wrist"] = end;
      joints[side + "Hand"] = add(end, handDelta);
    }
  }
  return {
    joints,
    root: { x: root[0], y: root[1], z: 0 },
    rig: r,
    sample,
    hip2,
    imageScale,
    phase: "source-linked pose",
    params: { handHeight: Math.max(joints.leftHand[1], joints.rightHand[1]) },
    warnings: [],
  };
}
export function stageBounds(track) {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const sample of track.samples.value) {
    if (sample.state === "gap") continue;
    const pose = focusSkeleton(track, sample.videoTime);
    if (!pose) continue;
    for (const p of Object.values(pose.joints)) {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
  }
  return { minX, maxX, minY, maxY };
}
export function focusCue(text, sourceTime) {
  const t = text.trim().toLowerCase();
  if (/wiser|smarter|better/.test(t))
    return {
      question: "Earlier jump, different position, or hand angle?",
      choices: ["Earlier jump", "Different position", "Hand angle"],
    };
  if (/hands? higher|raise.*hands?|arms? higher/.test(t))
    return {
      correction: {
        type: "hands",
        time: sourceTime,
        span: 0.35,
        amount: 0.08,
        text,
      },
      description:
        "Raise both hand targets by a small illustrative offset around this source time; preserve limb lengths.",
    };
  if (/earlier/.test(t))
    return {
      correction: {
        type: "earlier",
        time: sourceTime,
        span: 0.6,
        amount: 0.08,
        text,
      },
      description:
        "Show this player's nearby source motion 0.08s earlier as a labelled tactic variation.",
    };
  if (/follow|track|reconstruct|show.*(swing|motion|jump|player)/.test(t))
    return { analyze: true };
  return {
    question:
      "Do you want me to follow the selected player, raise the hands, or show the jump earlier?",
    choices: ["Follow this player", "Hands higher", "Earlier jump"],
  };
}

export function validateFocus(track, scene) {
  const issues = [];
  const finite = (n) => typeof n === "number" && Number.isFinite(n);
  const interval = track?.interval?.value;
  if (
    track.version !== 1 ||
    !Array.isArray(interval) ||
    interval.length !== 2 ||
    !interval.every(finite) ||
    interval[0] < 0 ||
    interval[1] <= interval[0] ||
    interval[1] - interval[0] > 6.01
  )
    return ["Invalid selected-player interval"];
  if (
    !scene.actors.some((a) => a.id === track.actorId) ||
    scene.contacts.length ||
    scene.videoBinding?.state !== "focused"
  )
    issues.push(
      "Focused scene must contain its selected actor and no invented ball contacts",
    );
  if (
    Math.abs(scene.clocks.videoOffset.value - interval[0]) > 0.001 ||
    Math.abs(scene.duration - (interval[1] - interval[0])) > 0.001
  )
    issues.push("Source, animation and selected interval clocks disagree");
  const samples = track.samples?.value;
  if (!Array.isArray(samples) || samples.length < 3 || samples.length > 500)
    return [...issues, "Invalid pose sample count"];
  if (
    !finite(track.aspect) ||
    track.aspect <= 0 ||
    !finite(track.imageScale) ||
    track.imageScale <= 0 ||
    track.imageScale > 100
  )
    issues.push("Invalid body projection scale");
  let previous = -1,
    valid = 0;
  for (const sample of samples) {
    if (
      !finite(sample.videoTime) ||
      sample.videoTime <= previous ||
      sample.videoTime < interval[0] - 0.01 ||
      sample.videoTime > interval[1] + 0.01
    )
      issues.push(
        "Pose source timestamps must be ordered and inside the selected interval",
      );
    previous = sample.videoTime;
    if (!["ok", "uncertain", "gap"].includes(sample.state))
      issues.push("Unknown tracking state");
    if (sample.state === "gap") continue;
    valid++;
    for (const key of ["points", "world"]) {
      const points = sample[key];
      if (
        !Array.isArray(points) ||
        points.length !== 33 ||
        points.some(
          (p) =>
            ![p.x, p.y, p.z, p.visibility, p.presence].every(finite) ||
            Math.abs(p.x) > 20 ||
            Math.abs(p.y) > 20 ||
            Math.abs(p.z) > 20 ||
            p.visibility < 0 ||
            p.visibility > 1,
        )
      )
        issues.push("Pose proposals must contain 33 finite bounded landmarks");
    }
  }
  if (valid < 3)
    issues.push("At least three usable source frames are required");
  const corrections = track.corrections?.value;
  if (
    !Array.isArray(corrections) ||
    corrections.length > 200 ||
    corrections.some(
      (c) =>
        !["hands", "earlier"].includes(c.type) ||
        ![c.time, c.span, c.amount].every(finite) ||
        c.span <= 0 ||
        c.span > 2 ||
        Math.abs(c.amount) > 0.2,
    )
  )
    issues.push("Invalid coach correction");
  const requiredRig = [
    "shoulderWidth",
    "pelvisWidth",
    "upperArm",
    "forearm",
    "thigh",
    "shin",
    "torsoLength",
    "torsoDepth",
    "headWidth",
    "headHeight",
    "headDepth",
    "armRadius",
    "legRadius",
    "palmWidth",
    "footWidth",
  ];
  if (
    ![track.sourceWidth, track.sourceHeight].every(
      (n) => finite(n) && n > 0 && n <= 16384,
    )
  )
    issues.push("Invalid source frame dimensions");
  if (
    !track.bounds ||
    !["minX", "maxX", "minY", "maxY"].every(
      (k) => finite(track.bounds[k]) && Math.abs(track.bounds[k]) <= 30,
    )
  )
    issues.push("Invalid body stage bounds");
  if (
    !track.rig ||
    requiredRig.some((k) => !finite(track.rig[k])) ||
    Object.values(track.rig).some((n) => !finite(n) || n <= 0 || n > 3)
  )
    issues.push("Invalid estimated mannequin proportions");
  return [...new Set(issues)];
}

export function installPerformance(scene, track) {
  scene.performance = track;
  delete scene.motion;
  scene.videoBinding = {
    ...scene.videoBinding,
    state: "focused",
    source: "Source-linked, on-device single-player body proposal",
  };
  scene.duration = track.interval.value[1] - track.interval.value[0];
  scene.clocks.videoOffset = {
    value: track.interval.value[0],
    status: "coach-provided",
    source: "Selected source interval begins at animation zero",
  };
  scene.clocks.speechOffset = {
    value: 0,
    status: "flexible-not-applicable",
    source: "Voice is a coach instruction, not source audio",
  };
  const f = (value) => ({
    value,
    status: "flexible-not-applicable",
    source: "Not reconstructed in selected-player body mode",
  });
  scene.actors = [
    {
      id: track.actorId,
      team: "near",
      role: { ...track.label },
      rotation: f(0),
      path: f([
        { t: 0, x: 0, z: 0 },
        { t: scene.duration, x: 0, z: 0 },
      ]),
    },
  ];
  // Neutral stage uses performance samples; this path is explicitly inapplicable.
  scene.actors[0].path.status = "approved-illustrative-default";
  scene.contacts = [];
  scene.observations = [];
  scene.calibrations = [];
  scene.branches = [];
  for (const obj of [scene.ball, scene.tactic])
    for (const key of Object.keys(obj)) obj[key] = f("not reconstructed");
  scene.title = "Selected player · source-linked illustrative motion";
}
