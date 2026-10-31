// Local deterministic articulated template. No video measurements or model calls.
export const PARAMS = {
  handHeight: [0.35, 3.5, "Hand target height (m)"],
  handWidth: [0.08, 1.4, "Hand separation (m)"],
  handForward: [-0.6, 1, "Hands forward (m)"],
  jumpHeight: [0, 1, "Jump lift (m)"],
  kneeBend: [5, 115, "Knee bend (degrees)"],
  torsoYaw: [-180, 180, "Torso facing (degrees)"],
  torsoLean: [-35, 45, "Torso lean (degrees)"],
  wristFlex: [-60, 60, "Wrist flex (degrees)"],
  stanceWidth: [0.2, 1, "Foot stance width (m)"],
  elbowOut: [0, 1, "Elbow outward bias"],
  footYaw: [-60, 60, "Foot angle (degrees)"],
  compression: [0, 0.18, "Body compression below knee pose (m)"],
  torsoTwist: [-70, 70, "Shoulders relative to hips (degrees)"],
  swingBlend: [0, 1, "Joint-angle arm influence (0 target · 1 swing)"],
  rightSwing: [-160, 180, "Right shoulder forward swing (degrees)"],
  rightAbduction: [-100, 100, "Right shoulder outward angle (degrees)"],
  rightElbowBend: [5, 155, "Right elbow bend (degrees)"],
  rightElbowPlane: [-180, 180, "Right elbow bend plane (degrees)"],
  rightForearmTwist: [-180, 180, "Right forearm twist (degrees)"],
  leftSwing: [-160, 180, "Left shoulder forward swing (degrees)"],
  leftAbduction: [-100, 100, "Left shoulder outward angle (degrees)"],
  leftElbowBend: [5, 155, "Left elbow bend (degrees)"],
  leftElbowPlane: [-180, 180, "Left elbow bend plane (degrees)"],
  leftForearmTwist: [-180, 180, "Left forearm twist (degrees)"],
};
export const RIG = {
  shoulderHeight: 1.48,
  shoulderWidth: 0.42,
  upperArm: 0.42,
  forearm: 0.42,
  thigh: 0.46,
  shin: 0.46,
  pelvisWidth: 0.28,
  torsoDepth: 0.24,
  headWidth: 0.18,
  headHeight: 0.24,
  headDepth: 0.2,
  armRadius: 0.055,
  legRadius: 0.075,
  palmWidth: 0.085,
  footWidth: 0.1,
};
export const PHASES = [
  "ready",
  "approach",
  "dig",
  "set",
  "attack",
  "block",
  "land",
  "recovery",
];
export const JOINTS = [
  "head",
  "neck",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftHand",
  "rightHand",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle",
];
const rad = (d) => (d * Math.PI) / 180,
  clamp = (n, a, b) => Math.max(a, Math.min(b, n)),
  smooth = (t) => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  },
  mix = (a, b, t) => a + (b - a) * t;
const add = (a, b) => a.map((x, i) => x + b[i]),
  sub = (a, b) => a.map((x, i) => x - b[i]),
  mul = (a, n) => a.map((x) => x * n),
  dot = (a, b) => a.reduce((v, x, i) => v + x * b[i], 0),
  len = (a) => Math.hypot(...a),
  unit = (a) => mul(a, 1 / (len(a) || 1));
export function angleMix(a, b, u) {
  return ((a + (((b - a + 540) % 360) - 180) * u + 540) % 360) - 180;
}
export function pathAt(a, t) {
  const p = a.path.value;
  if (t <= p[0].t) return p[0];
  for (let i = 1; i < p.length; i++)
    if (t <= p[i].t) {
      const q = p[i - 1],
        r = p[i],
        u = (t - q.t) / (r.t - q.t || 1);
      return { x: mix(q.x, r.x, u), z: mix(q.z, r.z, u) };
    }
  return p.at(-1);
}
export function rigFor(s, id) {
  const fields = s.motion?.rigs?.[id];
  return Object.fromEntries(
    Object.entries(RIG).map(([k, v]) => [k, fields?.[k]?.value ?? v]),
  );
}
export function defaultPose(s, a, t) {
  const p = pathAt(a, t),
    before = pathAt(a, Math.max(0, t - 0.05)),
    after = pathAt(a, t + 0.05),
    speed = Math.hypot(after.x - before.x, after.z - before.z) / 0.1;
  let yaw = p.z < 0 ? 0 : 180;
  if (speed > 0.08)
    yaw = (Math.atan2(after.x - before.x, after.z - before.z) * 180) / Math.PI;
  const contact = s.contacts
    .filter(
      (c) =>
        c.actor.value === a.id &&
        (!s.videoBinding ||
          ![c.actor, c.action, c.time].some((f) => f.status === "unresolved")),
    )
    .sort((x, y) => Math.abs(x.time.value - t) - Math.abs(y.time.value - t))[0];
  let phase = speed > 0.08 ? "approach" : "ready",
    w = 0,
    dt = 0,
    params = {
      handHeight: 1.05,
      handWidth: 0.55,
      handForward: 0.15,
      jumpHeight: 0,
      kneeBend: speed > 0.08 ? 40 : 18,
      torsoYaw: yaw,
      torsoLean: 0,
      wristFlex: 0,
      stanceWidth: 0.45,
      elbowOut: 0.5,
      footYaw: 0,
      compression: 0,
      torsoTwist: 0,
      swingBlend: 0,
      rightSwing: 0,
      rightAbduction: 10,
      rightElbowBend: 25,
      rightElbowPlane: 0,
      rightForearmTwist: 0,
      leftSwing: 0,
      leftAbduction: 10,
      leftElbowBend: 25,
      leftElbowPlane: 0,
      leftForearmTwist: 0,
    };
  if (contact) {
    dt = t - contact.time.value;
    w = smooth(1 - Math.abs(dt) / 0.65);
    if (w > 0) {
      phase = /pass|dig/.test(contact.action.value)
        ? "dig"
        : /set/.test(contact.action.value)
          ? "set"
          : /block/.test(contact.action.value)
            ? "block"
            : "attack";
      const target =
        phase === "dig"
          ? {
              handHeight: contact.height.value,
              handWidth: 0.2,
              handForward: 0.45,
              kneeBend: 70,
              torsoLean: 25,
            }
          : phase === "set"
            ? {
                handHeight: contact.height.value,
                handWidth: 0.3,
                handForward: 0.18,
                kneeBend: 40,
                wristFlex: 20,
              }
            : phase === "block"
              ? {
                  handHeight: contact.height.value,
                  handWidth: 0.65,
                  jumpHeight: Math.max(
                    0.4,
                    contact.height.value -
                      rigFor(s, a.id).shoulderHeight -
                      rigFor(s, a.id).upperArm -
                      rigFor(s, a.id).forearm +
                      0.08,
                  ),
                  kneeBend: 12,
                  wristFlex: 20,
                }
              : {
                  handHeight: contact.height.value,
                  handWidth: 0.35,
                  jumpHeight: 0.65,
                  kneeBend: 10,
                  torsoLean: -8,
                  wristFlex: 15,
                };
      for (const [k, v] of Object.entries(target))
        params[k] = mix(params[k], v, w);
      if (phase === "attack" || phase === "block") {
        params.jumpHeight =
          (target.jumpHeight || 0.4) *
          Math.max(0, 1 - ((dt + 0.01) / 0.34) ** 2);
        const load = smooth(1 - Math.abs(dt + 0.43) / 0.15),
          landing = smooth(1 - Math.abs(dt - 0.43) / 0.12);
        params.compression = 0.09 * load + 0.12 * landing;
        if (dt > 0.5)
          params.jumpHeight +=
            0.035 *
            Math.exp(-(dt - 0.5) * 12) *
            Math.max(0, Math.sin(((dt - 0.5) * Math.PI) / 0.15));
        if (phase === "attack") {
          const windup = smooth((dt + 0.38) / 0.25),
            follow = smooth(dt / 0.32);
          params.swingBlend = 1;
          params.rightSwing =
            dt < 0 ? mix(-55, 170, windup) : mix(170, 45, follow);
          params.rightAbduction =
            dt < 0 ? mix(15, 40, windup) : mix(40, 5, follow);
          params.rightElbowBend =
            dt < 0
              ? mix(35, 115, smooth((dt + 0.5) / 0.22))
              : mix(12, 35, follow);
          params.rightForearmTwist = mix(-45, 35, smooth((dt + 0.2) / 0.4));
          params.leftSwing = mix(90, 15, smooth((dt + 0.1) / 0.4));
          params.leftElbowBend = 45;
          params.torsoTwist = dt < 0 ? -30 * windup : 25 * follow;
        }
        if (dt < -0.1) {
          params.handHeight = mix(
            1.3,
            contact.height.value,
            smooth((dt + 0.5) / 0.4),
          );
          params.handForward = mix(-0.45, 0.1, smooth((dt + 0.5) / 0.4));
        }
        if (dt > 0.35) {
          phase = "land";
          params.kneeBend = mix(18, 65, smooth(1 - Math.abs(dt - 0.43) / 0.2));
        }
      }
      const next = s.contacts[s.contacts.indexOf(contact) + 1];
      if (next) {
        const facing =
          (Math.atan2(next.x.value - p.x, next.z.value - p.z) * 180) / Math.PI;
        params.torsoYaw = angleMix(yaw, facing, w);
      }
    }
  }
  if ((phase === "attack" || phase === "block") && Math.abs(dt) > 0.02) {
    const r = rigFor(s, a.id),
      drop = (r.thigh + r.shin) * (1 - Math.cos(rad(params.kneeBend) / 2));
    params.handHeight = Math.min(
      params.handHeight,
      r.shoulderHeight -
        params.compression -
        drop +
        params.jumpHeight +
        r.upperArm +
        r.forearm -
        0.05,
    );
  }
  return { params, phase, plant: "auto", span: 0.6, contact, w, dt, key: null };
}
export function poseSettingsAt(s, a, t) {
  const base = defaultPose(s, a, t),
    keys = (s.motion?.keys || [])
      .filter((k) => k.actorId === a.id)
      .sort((x, y) => x.time.value - y.time.value);
  let left = null,
    right = null;
  for (const k of keys) {
    if (k.time.value <= t) left = k;
    if (k.time.value >= t && !right) right = k;
  }
  let values,
    key,
    u = 0,
    weight = 0;
  if (
    left &&
    right &&
    left !== right &&
    right.time.value - left.time.value <= left.span.value + right.span.value
  ) {
    u = smooth((t - left.time.value) / (right.time.value - left.time.value));
    values = Object.fromEntries(
      Object.keys(PARAMS).map((p) => [
        p,
        p === "torsoYaw"
          ? angleMix(
              left.params[p]?.value ?? base.params[p],
              right.params[p]?.value ?? base.params[p],
              u,
            )
          : mix(
              left.params[p]?.value ?? base.params[p],
              right.params[p]?.value ?? base.params[p],
              u,
            ),
      ]),
    );
    key = u < 0.5 ? left : right;
    weight = 1;
  } else {
    key = [left, right]
      .filter(Boolean)
      .sort(
        (x, y) => Math.abs(x.time.value - t) - Math.abs(y.time.value - t),
      )[0];
    if (key) {
      weight = smooth(1 - Math.abs(t - key.time.value) / key.span.value);
      values = Object.fromEntries(
        Object.entries(key.params).map(([p, f]) => [p, f.value]),
      );
    }
  }
  if (key && weight > 0) {
    for (const p of Object.keys(PARAMS))
      base.params[p] =
        p === "torsoYaw"
          ? angleMix(base.params[p], values[p] ?? base.params[p], weight)
          : mix(base.params[p], values[p] ?? base.params[p], weight);
    base.phase = weight > 0.5 ? key.phase.value : base.phase;
    base.plant = weight > 0.5 ? key.plant.value : "auto";
    if (
      base.params.jumpHeight > 0.025 &&
      !["auto", "airborne"].includes(base.plant)
    )
      base.plant = "airborne";
    base.key = key;
    if (base.plant !== "auto" && base.plant !== "airborne") {
      let index = keys.indexOf(key);
      while (
        index > 0 &&
        keys[index - 1].plant.value === key.plant.value &&
        keys[index].time.value - keys[index - 1].time.value <=
          keys[index].span.value + keys[index - 1].span.value
      )
        index--;
      base.plantKey = keys[index];
    }
    base.weight = weight;
  }
  return base;
}
// Two-bone IK preserves segment lengths and reports unreachable targets.
export function twoBone(root, target, l1, l2, bend) {
  const delta = sub(target, root),
    distance = len(delta),
    d = clamp(distance, Math.abs(l1 - l2) + 0.00001, l1 + l2 - 0.00001),
    axis = unit(delta),
    projection = dot(bend, axis);
  let normal = unit(sub(bend, mul(axis, projection)));
  if (len(normal) < 0.01) normal = unit([axis[1], -axis[0], 0.1]);
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d),
    height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const end = add(root, mul(axis, d));
  return {
    mid: add(add(root, mul(axis, along)), mul(normal, height)),
    end,
    unreachable:
      distance > l1 + l2 + 0.015 || distance < Math.abs(l1 - l2) - 0.015,
    distance,
  };
}
export function skeletonAt(s, a, t) {
  const root = pathAt(a, t),
    pose = poseSettingsAt(s, a, t),
    p = pose.params,
    r = rigFor(s, a.id),
    theta = rad(p.torsoYaw),
    right = [Math.cos(theta), 0, -Math.sin(theta)],
    forward = [Math.sin(theta), 0, Math.cos(theta)];
  const leg = r.thigh + r.shin,
    hipY = leg * Math.cos(rad(p.kneeBend) / 2) + p.jumpHeight - p.compression,
    drop = leg - hipY + p.jumpHeight,
    shoulderY = r.shoulderHeight - drop + p.jumpHeight,
    lean = Math.tan(rad(p.torsoLean)) * 0.4;
  const world = (x, y, z) => [
    root.x + right[0] * x + forward[0] * z,
    y,
    root.z + right[2] * x + forward[2] * z,
  ];
  const shoulderTheta = theta + rad(p.torsoTwist),
    shoulderRight = [Math.cos(shoulderTheta), 0, -Math.sin(shoulderTheta)],
    shoulderForward = [Math.sin(shoulderTheta), 0, Math.cos(shoulderTheta)];
  const joints = {
    pelvis: world(0, hipY, 0),
    neck: world(0, shoulderY + 0.08, lean),
    head: world(0, shoulderY + 0.28, lean),
  };
  const warnings = [];
  let center = world(0, p.handHeight, p.handForward + lean);
  const c = pose.contact;
  const anchoring =
    c &&
    Math.abs(t - c.time.value) < 0.65 &&
    pose.phase !== "block" &&
    (!pose.key || pose.key.eventId === c.id);
  if (anchoring) {
    const w = pose.w;
    center[0] = mix(center[0], c.x.value, w);
    center[2] = mix(center[2], c.z.value, w);
  }
  for (const side of [-1, 1]) {
    const prefix = side < 0 ? "left" : "right",
      shoulder = add(
        world(0, shoulderY, lean),
        mul(shoulderRight, (side * r.shoulderWidth) / 2),
      ),
      hip = world((side * r.pelvisWidth) / 2, hipY, 0);
    joints[prefix + "Shoulder"] = shoulder;
    joints[prefix + "Hip"] = hip;
    let hand = add(center, mul(right, (side * p.handWidth) / 2));
    if (pose.phase === "attack") {
      if (side > 0) hand = [...center];
      else hand = world(-0.3, Math.min(1.55 + p.jumpHeight, p.handHeight), 0.2);
    }
    const wrist = sub(hand, mul(forward, 0.08 * Math.cos(rad(p.wristFlex))));
    wrist[1] -= 0.08 * Math.sin(rad(p.wristFlex));
    let bend = add(mul(right, side * (0.25 + p.elbowOut)), [0, -0.3, 0]);
    if (p.swingBlend > 0) {
      const swing = rad(p[prefix + "Swing"]),
        abduct = rad(p[prefix + "Abduction"]),
        flex = rad(p[prefix + "ElbowBend"]),
        upper = add(
          add(
            mul(shoulderForward, Math.sin(swing) * Math.cos(abduct)),
            mul(shoulderRight, side * Math.sin(abduct)),
          ),
          [0, -Math.cos(swing) * Math.cos(abduct), 0],
        ),
        sagittal = unit(
          add(mul(shoulderForward, Math.cos(swing)), [0, Math.sin(swing), 0]),
        ),
        lateral = unit(
          add(
            add(
              mul(shoulderRight, side * Math.cos(abduct)),
              mul(shoulderForward, -Math.sin(swing) * Math.sin(abduct)),
            ),
            [0, Math.cos(swing) * Math.sin(abduct), 0],
          ),
        ),
        plane = rad(p[prefix + "ElbowPlane"]),
        axis = add(
          mul(sagittal, Math.cos(plane)),
          mul(lateral, Math.sin(plane)),
        ),
        elbow = add(shoulder, mul(upper, r.upperArm)),
        lower = add(mul(upper, Math.cos(flex)), mul(axis, Math.sin(flex))),
        swingWrist = add(elbow, mul(lower, r.forearm));
      // The shared ball-contact target always takes precedence at contact.
      const lock = anchoring
          ? smooth(1 - Math.abs(t - c.time.value) / 0.11)
          : 0,
        blend = p.swingBlend * (1 - lock);
      for (let i = 0; i < 3; i++)
        wrist[i] = mix(wrist[i], swingWrist[i], blend);
      bend = add(mul(bend, 1 - blend), mul(sub(elbow, shoulder), blend));
      const palmAxis = unit(
          add(
            mul(lower, Math.cos(rad(p.wristFlex))),
            mul(shoulderForward, Math.sin(rad(p.wristFlex))),
          ),
        ),
        twist = rad(p[prefix + "ForearmTwist"]),
        twisted = add(
          mul(palmAxis, Math.cos(twist)),
          mul(shoulderRight, side * Math.sin(twist)),
        );
      hand = add(wrist, mul(unit(twisted), 0.08));
      if (lock > 0) {
        const targetHand = [...center];
        if (side < 0 && pose.phase === "attack")
          targetHand.splice(
            0,
            3,
            ...world(-0.3, Math.min(1.55 + p.jumpHeight, p.handHeight), 0.2),
          );
        for (let i = 0; i < 3; i++) hand[i] = mix(hand[i], targetHand[i], lock);
      }
    }
    const arm = twoBone(shoulder, wrist, r.upperArm, r.forearm, bend);
    joints[prefix + "Elbow"] = arm.mid;
    joints[prefix + "Wrist"] = arm.end;
    joints[prefix + "Hand"] = add(arm.end, sub(hand, wrist));
    if (arm.unreachable) warnings.push(prefix + " arm cannot reach target");
    const speedPoint = pathAt(a, Math.max(0, t - 0.03)),
      moving = Math.hypot(root.x - speedPoint.x, root.z - speedPoint.z) > 0.002;
    let foot;
    const planted = pose.plant === "both" || pose.plant === prefix;
    if (planted && pose.key) {
      const plantKey = pose.plantKey || pose.key;
      const at = pathAt(a, plantKey.time.value),
        thetaK = rad(plantKey.params.torsoYaw.value),
        plantWidth = plantKey.params.stanceWidth.value;
      foot = [
        at.x + (Math.cos(thetaK) * side * plantWidth) / 2,
        0,
        at.z - (Math.sin(thetaK) * side * plantWidth) / 2,
      ];
    } else if (p.jumpHeight > 0.001 || pose.plant === "airborne")
      foot = world((side * p.stanceWidth) / 2, p.jumpHeight, 0.02);
    else if (!moving) {
      const fixedYaw = root.z < 0 ? 0 : Math.PI;
      foot = [
        root.x + (Math.cos(fixedYaw) * side * p.stanceWidth) / 2,
        0,
        root.z - (Math.sin(fixedYaw) * side * p.stanceWidth) / 2,
      ];
    } else {
      const cycle = 0.42,
        shift = side < 0 ? 0 : 0.5,
        phase = t / cycle + shift,
        n = Math.floor(phase),
        u = phase - n,
        start = (n - shift) * cycle;
      const anchor = (time) => {
        const q = pathAt(a, Math.max(0, time)),
          prev = pathAt(a, Math.max(0, time - 0.03)),
          next = pathAt(a, time + 0.03);
        const yaw =
          Math.hypot(next.x - prev.x, next.z - prev.z) > 0.001
            ? Math.atan2(next.x - prev.x, next.z - prev.z)
            : q.z < 0
              ? 0
              : Math.PI;
        return [
          q.x + (Math.cos(yaw) * side * p.stanceWidth) / 2,
          0,
          q.z - (Math.sin(yaw) * side * p.stanceWidth) / 2,
        ];
      };
      const old = anchor(start + 0.12),
        next = anchor(start + cycle + 0.12);
      if (u < 0.6) foot = old;
      else {
        const w = smooth((u - 0.6) / 0.4);
        foot = old.map((x, i) => mix(x, next[i], w));
        foot[1] = Math.sin(Math.PI * w) * 0.13;
      }
    }
    const knee = twoBone(
      hip,
      foot,
      r.thigh,
      r.shin,
      add(forward, mul(right, side * 0.1)),
    );
    joints[prefix + "Knee"] = knee.mid;
    joints[prefix + "Ankle"] = knee.end;
    joints[prefix + "Toe"] = add(knee.end, [
      Math.sin(theta + rad(p.footYaw)) * 0.18,
      0,
      Math.cos(theta + rad(p.footYaw)) * 0.18,
    ]);
    if (knee.unreachable)
      warnings.push(prefix + " leg cannot reach planted foot");
  }
  return { joints, phase: pose.phase, params: p, root, warnings };
}
export function keyValues(s, actorId, eventId, t) {
  const a = s.actors.find((a) => a.id === actorId);
  if (!a) throw Error("Choose an existing target player");
  const pose = poseSettingsAt(s, a, t);
  return {
    actorId,
    eventId,
    time: t,
    span: 0.6,
    phase: pose.phase,
    plant: "auto",
    params: { ...pose.params },
  };
}
// Conditional image-plane fit, not monocular 3D recovery. The coach supplies
// plane orientation; observed segment directions determine actual arm angles.
export function fitObservedArms(s, context, aspect = 16 / 9, planeYaw = 0) {
  if (context.videoTime === undefined)
    return {
      question:
        "Capture a source frame and mark shoulder, elbow and wrist for at least one arm first.",
    };
  const candidate = structuredClone(context),
    changes = [];
  let fitted = 0;
  for (const side of ["left", "right"]) {
    const points = ["Shoulder", "Elbow", "Wrist"].map(
      (n) => context.imageJoints?.[side + n]?.value,
    );
    if (points.some((p) => !p)) continue;
    const [a, b, c] = points,
      upper = [(b.x - a.x) * aspect, -(b.y - a.y)],
      lower = [(c.x - b.x) * aspect, -(c.y - b.y)],
      l1 = Math.hypot(...upper),
      l2 = Math.hypot(...lower);
    if (l1 < 0.003 || l2 < 0.003)
      return {
        question:
          "Separate marked joints; a zero-length image segment cannot define an arm angle.",
      };
    const sign = side === "right" ? 1 : -1,
      swing = upper[1] > 0 ? 180 : 0,
      abduct =
        (Math.asin(clamp((sign * upper[0]) / l1, -1, 1)) * 180) / Math.PI,
      bend =
        (Math.acos(clamp(dot(upper, lower) / (l1 * l2), -1, 1)) * 180) /
        Math.PI,
      lateral = [
        sign * Math.cos(rad(abduct)),
        Math.cos(rad(swing)) * Math.sin(rad(abduct)),
      ];
    candidate.params[side + "Swing"] = swing;
    candidate.params[side + "Abduction"] = abduct;
    candidate.params[side + "ElbowBend"] = clamp(bend, 5, 155);
    candidate.params[side + "ElbowPlane"] = dot(lower, lateral) >= 0 ? 90 : -90;
    changes.push(
      `${side} arm: 3 observed image joints → shoulder/elbow directions under your vertical-plane assumption`,
    );
    fitted++;
  }
  if (!fitted)
    return {
      question:
        "Mark shoulder, elbow and wrist for the same arm/player/frame, then capture that frame. No pose was changed.",
    };
  candidate.params.torsoYaw = planeYaw;
  candidate.params.torsoTwist = 0;
  candidate.params.swingBlend = 1;
  candidate.imageFit = `Conditional vertical-plane arm fit; coach plane facing ${planeYaw} degrees, image aspect ${aspect.toFixed(4)}; foreshortening and depth not recovered`;
  return {
    candidate,
    changes,
    text: candidate.imageFit,
    baseRevision: s.revision,
  };
}
export function proposeCue(s, context, text) {
  if (!context?.actorId || !context?.eventId)
    return { question: "Select a target player and event first." };
  if (
    !s.actors.some((a) => a.id === context.actorId) ||
    !s.contacts.some((c) => c.id === context.eventId)
  )
    return { question: "Choose an existing player and event." };
  const cue = text.trim().toLowerCase();
  const candidate = structuredClone(context);
  const changes = [];
  const set = (name, value) => {
    const [min, max] = PARAMS[name];
    if (value < min || value > max)
      throw Error(`${name} must stay between ${min} and ${max}`);
    changes.push(
      `${name}: ${candidate.params[name].toFixed(2)} → ${value.toFixed(2)}`,
    );
    candidate.params[name] = value;
  };
  try {
    if (/\b(wiser|better|smarter)\b/.test(cue))
      return {
        question:
          "Do you mean block timing, court position, torso/hand angle, or coverage? Choose a specific change; no motion has changed.",
      };
    if (/hands? higher|raise (?:your )?hands?|arms? higher/.test(cue))
      set(
        "handHeight",
        Math.round((candidate.params.handHeight + 0.1) * 100) / 100,
      );
    else if (/block wider|hands? wider|arms? wider/.test(cue)) {
      if (candidate.phase !== "block")
        return {
          question:
            "Choose the block phase and the blocking player/event before widening the block.",
        };
      set("handWidth", Math.min(1.4, candidate.params.handWidth + 0.2));
    } else if (/turn.*left/.test(cue))
      set("torsoYaw", Math.max(-180, candidate.params.torsoYaw - 10));
    else if (/turn.*right/.test(cue))
      set("torsoYaw", Math.min(180, candidate.params.torsoYaw + 10));
    else
      return {
        question:
          "Specify hands higher, block wider, turn left/right, or edit the numeric keyframe. Timing, position and coverage need explicit event/path edits.",
      };
    const contact = s.contacts.find((c) => c.id === context.eventId);
    let contactHeight;
    if (
      contact.actor.value === context.actorId &&
      Math.abs(context.time - contact.time.value) < 0.01 &&
      changes.some((c) => c.startsWith("handHeight"))
    ) {
      contactHeight = candidate.params.handHeight;
      changes.push(
        `Shared ${contact.id} ball-contact height: ${contact.height.value.toFixed(2)} → ${contactHeight.toFixed(2)} m`,
      );
    }
    if (changes.some((c) => c.startsWith("handHeight"))) {
      const r = context.rig || rigFor(s, context.actorId),
        leg = r.thigh + r.shin,
        drop = leg * (1 - Math.cos(rad(candidate.params.kneeBend) / 2)),
        reach = r.upperArm + r.forearm - 0.06;
      const lift = Math.max(
        candidate.params.jumpHeight,
        candidate.params.handHeight - r.shoulderHeight + drop - reach + 0.03,
      );
      if (lift > candidate.params.jumpHeight)
        set("jumpHeight", Math.ceil(lift * 100) / 100);
    }
    return {
      candidate,
      contactHeight,
      changes,
      text,
      baseRevision: s.revision,
    };
  } catch (e) {
    return { question: e.message };
  }
}
export function installKey(s, candidate, source) {
  s.motion ??= { version: 1, rigs: {}, keys: [] };
  const wrap = (value) => ({ value, status: "coach-provided", source });
  s.motion.rigs[candidate.actorId] ??= Object.fromEntries(
    Object.entries(RIG).map(([k, v]) => [
      k,
      {
        value: v,
        status: "approved-illustrative-default",
        source: "Unmeasured articulated template rig",
      },
    ]),
  );
  if (candidate.rig)
    s.motion.rigs[candidate.actorId] = Object.fromEntries(
      Object.entries(candidate.rig).map(([k, v]) => [
        k,
        Math.abs(v - (s.motion.rigs[candidate.actorId]?.[k]?.value ?? RIG[k])) <
        0.00001
          ? s.motion.rigs[candidate.actorId][k] || {
              value: v,
              status: "approved-illustrative-default",
              source: "Unmeasured mannequin template dimension",
            }
          : wrap(v),
      ]),
    );
  const id = `pose-${candidate.actorId}-${candidate.time.toFixed(3)}`;
  const key = {
    id,
    actorId: candidate.actorId,
    eventId: candidate.eventId,
    time: wrap(candidate.time),
    span: wrap(candidate.span),
    phase: wrap(candidate.phase),
    plant: wrap(candidate.plant),
    params: Object.fromEntries(
      Object.entries(candidate.params).map(([k, v]) => [k, wrap(v)]),
    ),
    depth: wrap(
      "Illustrative template depth; not recovered from monocular video",
    ),
    imageJoints: candidate.imageJoints || {},
  };
  if (candidate.imageFit) key.imageFit = wrap(candidate.imageFit);
  if (candidate.videoTime !== undefined)
    key.videoTime = {
      value: candidate.videoTime,
      status: "observed",
      source:
        "Coach-selected local source frame; joint depth remains illustrative",
    };
  s.motion.keys = s.motion.keys.filter((k) => k.id !== id);
  s.motion.keys.push(key);
  return key;
}
export function previewPlan(s, plan) {
  const clone = structuredClone(s);
  installKey(
    clone,
    plan.candidate,
    `Unconfirmed preview: ${plan.text || "manual pose"}`,
  );
  if (plan.contactHeight !== undefined) {
    const c = clone.contacts.find((c) => c.id === plan.candidate.eventId);
    c.height.value = plan.contactHeight;
  }
  return clone;
}
