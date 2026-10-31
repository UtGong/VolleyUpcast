import { buildMannequin } from "./mannequin.js";
import { focusSkeleton, stageBounds, BODY } from "./focus.js";
export function imageAlignment(pose, track) {
  const mapping = {
    11: "leftShoulder",
    12: "rightShoulder",
    13: "leftElbow",
    14: "rightElbow",
    15: "leftWrist",
    16: "rightWrist",
    23: "leftHip",
    24: "rightHip",
    25: "leftKnee",
    26: "rightKnee",
    27: "leftAnkle",
    28: "rightAnkle",
  };
  let denominator = 0,
    a = 0,
    b = 0,
    count = 0;
  for (const i of BODY) {
    const p = pose.sample.points[i];
    if (p.visibility < 0.5) continue;
    const j = pose.joints[mapping[i]],
      x = j[0] - pose.root.x,
      y = j[1] - pose.root.y,
      tx = (p.x - pose.hip2.x) * track.aspect,
      ty = -(p.y - pose.hip2.y);
    denominator += x * x + y * y;
    a += x * tx + y * ty;
    b += x * ty - y * tx;
    count++;
  }
  a /= denominator || 1;
  b /= denominator || 1;
  let error = 0;
  for (const i of BODY) {
    const p = pose.sample.points[i];
    if (p.visibility < 0.5) continue;
    const j = pose.joints[mapping[i]],
      x = j[0] - pose.root.x,
      y = j[1] - pose.root.y;
    const px = pose.hip2.x + (a * x - b * y) / track.aspect,
      py = pose.hip2.y - (b * x + a * y);
    error +=
      ((px - p.x) * track.sourceWidth) ** 2 +
      ((py - p.y) * track.sourceHeight) ** 2;
  }
  return { a, b, rms: Math.sqrt(error / (count || 1)), count };
}
export function drawFocused(canvas, scene, t, options = {}) {
  const c = canvas.getContext("2d"),
    track = scene.performance,
    sourceTime = t + scene.clocks.videoOffset.value,
    pose = focusSkeleton(track, sourceTime);
  c.save();
  c.scale(canvas.width / 900, canvas.height / 620);
  c.fillStyle = "#102b3f";
  c.fillRect(0, 0, 900, 620);
  c.fillStyle = "#bdd7e8";
  c.font = "13px system-ui";
  c.fillText("SELECTED PLAYER · ON-DEVICE MODEL PROPOSAL", 24, 28);
  c.fillText(
    "No court/floor calibrated · hidden depth inferred · other players hidden",
    24,
    50,
  );
  if (!pose) {
    c.fillStyle = "#ffdf90";
    c.font = "bold 23px system-ui";
    c.fillText("Tracking gap — inspect the source and reselect", 55, 285);
    c.font = "16px system-ui";
    c.fillText(
      "No template motion is substituted for missing evidence.",
      55,
      320,
    );
    c.restore();
    return;
  }
  const bounds = track.bounds || stageBounds(track),
    scale = Math.min(
      780 / Math.max(0.5, bounds.maxX - bounds.minX + 0.4),
      450 / Math.max(1, bounds.maxY - bounds.minY + 0.3),
      280,
    ),
    center = (bounds.minX + bounds.maxX) / 2,
    top = bounds.maxY;
  const aligned = options.focusCamera === "source",
    fit = imageAlignment(pose, track),
    frameW = 820,
    frameH = frameW / track.aspect,
    frameY = (620 - frameH) / 2;
  const project = (x, y, z) =>
    aligned
      ? {
          x:
            40 +
            (pose.hip2.x +
              (fit.a * (x - pose.root.x) - fit.b * (y - pose.root.y)) /
                track.aspect) *
              frameW,
          y:
            frameY +
            (pose.hip2.y -
              (fit.b * (x - pose.root.x) + fit.a * (y - pose.root.y))) *
              frameH,
          depth: z,
        }
      : {
          x: 450 + (x - center + z * 0.14) * scale,
          y: 80 + (top - y) * scale,
          depth: z,
        };
  c.strokeStyle = "#587b9060";
  c.lineWidth = 1;
  c.strokeRect(18, 65, 864, 485);
  const surfaces = buildMannequin(pose, pose.rig, "#3d91ff", 10).map(
    (face) => ({ ...face, p: face.points.map((v) => project(...v)) }),
  );
  surfaces.sort(
    (a, b) =>
      b.p.reduce((n, p) => n + p.depth, 0) / b.p.length -
      a.p.reduce((n, p) => n + p.depth, 0) / a.p.length,
  );
  for (const face of surfaces) {
    c.fillStyle = face.color;
    c.beginPath();
    face.p.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    c.fill();
  }
  if (options.showJoints)
    for (const j of Object.values(pose.joints)) {
      const p = project(...j);
      c.fillStyle = "#ffe08c";
      c.beginPath();
      c.arc(p.x, p.y, 3, 0, 7);
      c.fill();
    }
  c.fillStyle = "#f1f6fb";
  c.font = "bold 15px system-ui";
  c.fillText(track.label.value, 28, 574);
  c.font = "12px system-ui";
  c.fillStyle = "#ffe08c";
  c.fillText(
    `ILLUSTRATIVE · source ${sourceTime.toFixed(3)}s · ${pose.sample.visibleBody}/12 body joints above model threshold`,
    28,
    596,
  );
  if (aligned) {
    c.fillStyle = "#bbd2e1";
    c.fillText(
      `2D/model-3D alignment residual ${fit.rms.toFixed(1)}px · self-consistency, not ground-truth accuracy`,
      28,
      546,
    );
  }
  if (scene.sample?.kind === "match") {
    c.fillStyle = "#bbd2e1";
    c.font = "10px system-ui";
    c.fillText(
      "UVG-VCM · Ultra Video Group, Tampere University · CC BY4.0",
      440,
      574,
    );
  }
  c.restore();
}
