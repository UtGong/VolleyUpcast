import { drawFocused } from "./focus-render.js";
import { skeletonAt, rigFor } from "./motion.js";
import { buildMannequin } from "./mannequin.js";
import { actorAt, ballAt } from "./model.js";
const BLUE = "#3d91ff",
  ORANGE = "#fcad65";
const contactsMapped = (s) =>
  !s.videoBinding ||
  s.contacts.every(
    (c) =>
      ![c.actor, c.time, c.height, c.x, c.z].some(
        (f) => f.status === "unresolved",
      ),
  );
export const boardPoint = (x, z) => ({
  x: 100 + x * 77.7778,
  y: 310 + z * 27.7778,
});
export function unboard(x, y) {
  return {
    x: Math.max(-2, Math.min(11, (x - 100) / 77.7778)),
    z: Math.max(-11, Math.min(11, (y - 310) / 27.7778)),
  };
}
export function drawBoard(canvas, s, t, selected, draft = []) {
  if (s.performance)
    return drawFocused(canvas, s, t, {
      focusCamera: "source",
      showJoints: true,
    });
  const c = canvas.getContext("2d");
  c.clearRect(0, 0, 900, 620);
  c.fillStyle = "#eef4f7";
  c.fillRect(0, 0, 900, 620);
  c.fillStyle = "#f6dcc1";
  c.fillRect(100, 60, 700, 500);
  c.fillStyle = "#fbe8d2";
  c.fillRect(100, 310, 700, 250);
  c.strokeStyle = "#fff";
  c.lineWidth = 3;
  c.strokeRect(100, 60, 700, 500);
  for (const z of [-3, 3]) {
    c.beginPath();
    c.moveTo(100, boardPoint(0, z).y);
    c.lineTo(800, boardPoint(0, z).y);
    c.stroke();
  }
  c.strokeStyle = "#233e55";
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(85, 310);
  c.lineTo(815, 310);
  c.stroke();
  c.fillStyle = "#697e90";
  c.font = "12px system-ui";
  c.fillText("OPPONENT COURT", 110, 40);
  c.fillText("NEAR TEAM · 9m", 110, 590);
  c.fillText("NET", 822, 315);
  if (s.videoBinding?.state === "unbound") {
    c.fillStyle = "#233e55";
    c.font = "bold 20px system-ui";
    c.fillText("LOCAL VIDEO · NO MAPPED PLAYER TRACKS", 145, 220);
    c.font = "16px system-ui";
    c.fillText(
      "Start manual reconstruction to place and identify players.",
      145,
      250,
    );
    return;
  }
  for (const a of s.actors) {
    const path = a.path.value.map((p) => boardPoint(p.x, p.z));
    c.strokeStyle = a.id === selected ? BLUE : "#9ab9d8";
    c.setLineDash([6, 5]);
    c.lineWidth = 2;
    c.beginPath();
    path.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.stroke();
    c.setLineDash([]);
    for (const p of path) {
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(p.x, p.y, 3, 0, 7);
      c.fill();
    }
    const p = actorAt(a, t),
      q = boardPoint(p.x, p.z);
    c.fillStyle = p.z < 0 ? ORANGE : BLUE;
    c.beginPath();
    c.arc(q.x, q.y, a.id === selected ? 21 : 17, 0, 7);
    c.fill();
    c.strokeStyle = "#fff";
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = "#fff";
    c.font = "bold 12px system-ui";
    c.textAlign = "center";
    c.fillText(a.id, q.x, q.y + 4);
    c.textAlign = "left";
  }
  const contacts = contactsMapped(s) ? s.contacts : [];
  for (let i = 0; i < contacts.length; i++) {
    const q = boardPoint(contacts[i].x.value, contacts[i].z.value);
    if (i) {
      const prev = boardPoint(contacts[i - 1].x.value, contacts[i - 1].z.value);
      c.strokeStyle = "#c58e28";
      c.lineWidth = 2;
      c.setLineDash([3, 5]);
      c.beginPath();
      c.moveTo(prev.x, prev.y);
      c.lineTo(q.x, q.y);
      c.stroke();
      c.setLineDash([]);
    }
    c.fillStyle = "#af7a22";
    c.font = "11px system-ui";
    c.fillText(contacts[i].id, q.x + 10, q.y - 15);
  }
  if (contactsMapped(s)) {
    const b = ballAt(s, t),
      q = boardPoint(b.x, b.z);
    c.fillStyle = "#ffe68c";
    c.strokeStyle = "#384c58";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(q.x, q.y, 8, 0, 7);
    c.fill();
    c.stroke();
  }
  if (draft.length) {
    c.strokeStyle = "#1766d9";
    c.lineWidth = 4;
    c.beginPath();
    draft.forEach((p, i) => {
      const q = boardPoint(p.x, p.z);
      i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y);
    });
    c.stroke();
  }
}
const project = (() => {
  // A true 3D pinhole projection: world x/y/z -> camera, perspective divide.
  const camera = { x: 16, y: 15, z: 22 },
    target = { x: 4.5, y: 0, z: 0 };
  const norm = (v) => {
    const n = Math.hypot(...v);
    return v.map((x) => x / n);
  };
  const f = norm([
    target.x - camera.x,
    target.y - camera.y,
    target.z - camera.z,
  ]);
  const r = norm([-f[2], 0, f[0]]);
  const u = [
    r[1] * f[2] - r[2] * f[1],
    r[2] * f[0] - r[0] * f[2],
    r[0] * f[1] - r[1] * f[0],
  ];
  return (x, y, z) => {
    const v = [x - camera.x, y - camera.y, z - camera.z];
    const depth = v.reduce((a, b, i) => a + b * f[i], 0);
    return {
      x: 450 + (v.reduce((a, b, i) => a + b * r[i], 0) * 850) / depth,
      y: 300 - (v.reduce((a, b, i) => a + b * u[i], 0) * 850) / depth,
      depth,
    };
  };
})();

// Shared source-image projection for generated demonstration annotations.
export function projectPoint(x, y, z) {
  return project(x, y, z);
}

export function drawScene(canvas, s, t, options = {}) {
  if (s.performance) return drawFocused(canvas, s, t, options);
  const c = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height;
  const scale = w / 900;
  c.save();
  c.scale(scale, scale);
  c.fillStyle = "#102b3f";
  c.fillRect(0, 0, 900, 620);
  if (s.videoBinding?.state === "unbound") {
    c.fillStyle = "#f0f6fb";
    c.font = "bold 25px system-ui";
    c.fillText("LOCAL VIDEO · 3D NOT RECONSTRUCTED", 55, 240);
    c.font = "18px system-ui";
    c.fillText("The sample animation has been cleared.", 55, 285);
    c.fillText(
      "Map observed frames and coach-provided constraints first.",
      55,
      320,
    );
    c.restore();
    return;
  }
  let proj = projectPoint;
  if (options.focusActor) {
    const a = s.actors.find((a) => a.id === options.focusActor);
    if (a) {
      const p = actorAt(a, t),
        camera = [p.x + 3.4, 3.6, p.z + 4.6],
        target = [p.x, 1.55, p.z];
      const unit = (v) => {
          const n = Math.hypot(...v);
          return v.map((x) => x / n);
        },
        f = unit(target.map((x, i) => x - camera[i])),
        r = unit([-f[2], 0, f[0]]),
        up = [
          r[1] * f[2] - r[2] * f[1],
          r[2] * f[0] - r[0] * f[2],
          r[0] * f[1] - r[1] * f[0],
        ];
      proj = (x, y, z) => {
        const v = [x - camera[0], y - camera[1], z - camera[2]],
          d = v.reduce((a, b, i) => a + b * f[i], 0);
        return {
          x: 450 + (v.reduce((a, b, i) => a + b * r[i], 0) * 750) / d,
          y: 310 - (v.reduce((a, b, i) => a + b * up[i], 0) * 750) / d,
          depth: d,
        };
      };
    }
  }

  const line = (a, b, color, width = 2) => {
    const p = proj(...a),
      q = proj(...b);
    if (p.depth <= 0.1 || q.depth <= 0.1) return;
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(q.x, q.y);
    c.stroke();
  };
  const poly = (points, color) => {
    if (points.some((p) => proj(...p).depth <= 0.1)) return;
    c.fillStyle = color;
    c.beginPath();
    points.forEach((p, i) => {
      const q = proj(...p);
      i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y);
    });
    c.closePath();
    c.fill();
  };
  poly(
    [
      [-3, 0, -12],
      [12, 0, -12],
      [12, 0, 12],
      [-3, 0, 12],
    ],
    "#19465a",
  );
  poly(
    [
      [0, 0.01, -9],
      [9, 0.01, -9],
      [9, 0.01, 0],
      [0, 0.01, 0],
    ],
    "#ba8b66",
  );
  poly(
    [
      [0, 0.01, 0],
      [9, 0.01, 0],
      [9, 0.01, 9],
      [0, 0.01, 9],
    ],
    "#d0a37f",
  );
  if (options.focusActor) {
    const a = s.actors.find((a) => a.id === options.focusActor);
    if (a) {
      const p = actorAt(a, t);
      poly(
        [
          [p.x - 2.5, 0, p.z - 2.5],
          [p.x + 2.5, 0, p.z - 2.5],
          [p.x + 2.5, 0, p.z + 2.5],
          [p.x - 2.5, 0, p.z + 2.5],
        ],
        "#9b785b",
      );
    }
  }
  for (const z of [-9, -3, 0, 3, 9])
    line([0, 0.03, z], [9, 0.03, z], "#f6ede0", 2);
  line([0, 0.03, -9], [0, 0.03, 9], "#f6ede0");
  line([9, 0.03, -9], [9, 0.03, 9], "#f6ede0");
  for (const x of [-0.3, 9.3]) line([x, 0, 0], [x, 2.7, 0], "#c5d9dd", 4);
  for (let x = 0; x <= 9; x += 0.4)
    line([x, 1.45, 0], [x, 2.43, 0], "#8aa9b66b", 0.7);
  for (let y = 1.45; y < 2.43; y += 0.2)
    line([0, y, 0], [9, y, 0], "#8aa9b66b", 0.7);
  line([-0.3, 2.43, 0], [9.3, 2.43, 0], "#e9f3f1", 3);
  for (const a of [...s.actors].sort(
    (a, b) => actorAt(a, t).z - actorAt(b, t).z,
  )) {
    const pose = skeletonAt(s, a, t),
      j = pose.joints,
      color = pose.root.z < 0 ? ORANGE : BLUE;
    if (options.focusActor && a.id !== options.focusActor) continue;
    if (options.compareTo && options.focusActor === a.id) {
      const old = skeletonAt(options.compareTo, a, t);
      c.setLineDash([4, 4]);
      for (const hand of ["leftHand", "rightHand"]) {
        const q = proj(...old.joints[hand]);
        c.strokeStyle = "#d6e3ed";
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(q.x, q.y, 7, 0, 7);
        c.stroke();
        line(old.joints[hand], j[hand], "#ffe093", 2);
      }
      c.setLineDash([]);
    }
    const ground = proj(pose.root.x, 0.02, pose.root.z);
    c.fillStyle = "#09213477";
    c.beginPath();
    c.ellipse(ground.x, ground.y, 16, 6, 0, 0, 7);
    c.fill();
    const surfaces = buildMannequin(
      pose,
      rigFor(s, a.id),
      color,
      options.focusActor ? 10 : 6,
    )
      .map((face) => ({
        ...face,
        projected: face.points.map((p) => proj(...p)),
      }))
      .filter((face) => face.projected.every((p) => p.depth > 0.1));
    surfaces.sort(
      (a, b) =>
        b.projected.reduce((v, p) => v + p.depth, 0) / b.projected.length -
        a.projected.reduce((v, p) => v + p.depth, 0) / a.projected.length,
    );
    for (const face of surfaces) {
      c.fillStyle = face.color;
      c.beginPath();
      face.projected.forEach((p, i) =>
        i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y),
      );
      c.closePath();
      c.fill();
    }
    if (options.showJoints)
      for (const side of ["left", "right"])
        for (const name of [
          "Shoulder",
          "Elbow",
          "Wrist",
          "Hip",
          "Knee",
          "Ankle",
        ]) {
          const q = proj(...j[side + name]);
          c.fillStyle = "#ffdf90";
          c.beginPath();
          c.arc(q.x, q.y, options.focusActor ? 3 : 1.5, 0, 7);
          c.fill();
        }
    const label = proj(
      pose.root.x,
      Math.max(j.head[1] + 0.3, pose.params.handHeight + 0.15),
      pose.root.z,
    );
    c.fillStyle = "#e9f3fa";
    c.font = options.focusActor ? "bold 14px system-ui" : "bold 11px system-ui";
    c.textAlign = "center";
    c.fillText(
      a.id + (options.focusActor ? " · " + pose.phase : ""),
      label.x,
      label.y,
    );
    c.textAlign = "left";
  }
  if (contactsMapped(s)) {
    const b = ballAt(s, t),
      q = proj(b.x, b.y, b.z),
      shadow = proj(b.x, 0.02, b.z);
    c.fillStyle = "#0c243c60";
    c.beginPath();
    c.ellipse(shadow.x, shadow.y, 8, 3, 0, 0, 7);
    c.fill();
    c.fillStyle = "#ffdc61";
    c.strokeStyle = "#fff4b6";
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(q.x, q.y, 5.5, 0, 7);
    c.fill();
    c.stroke();
  }
  c.fillStyle = "#b0cad9";
  c.font = "11px system-ui";
  c.fillText(
    s.videoBinding
      ? "VOLLEYUPCAST / COACH-CREATED MANUAL ILLUSTRATION"
      : "VOLLEYUPCAST / TEMPLATE MOTION",
    22,
    30,
  );
  if (s.sample?.kind === "match") {
    c.fillText(
      "UVG-VCM · Ultra Video Group, Tampere University · CC BY4.0",
      22,
      48,
    );
    c.fillText(
      "MANUAL TWO-PLAYER EXCERPT · uncertain depth/impact · source 1.50–2.70s",
      22,
      564,
    );
  }
  c.fillStyle = s.approval?.mode === "final" ? "#b9ded5" : "#ffe0a4";
  c.fillText(
    `${s.approval?.mode === "final" ? "COACH-REVIEWED TACTICAL SCENE" : "ILLUSTRATIVE · NOT AN EXACT REPLAY"}   |   t ${t.toFixed(2)} s${s.sample?.kind === "match" ? " / source " + (t + s.clocks.videoOffset.value).toFixed(2) + "s" : ""}`,
    22,
    590,
  );
  c.restore();
}
