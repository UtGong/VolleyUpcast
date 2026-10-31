import { actorAt, ballAt } from "./model.js";
const BLUE = "#3d91ff",
  ORANGE = "#fcad65";
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
  const contacts = s.contacts;
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
  const b = ballAt(s, t),
    q = boardPoint(b.x, b.z);
  c.fillStyle = "#ffe68c";
  c.strokeStyle = "#384c58";
  c.lineWidth = 2;
  c.beginPath();
  c.arc(q.x, q.y, 8, 0, 7);
  c.fill();
  c.stroke();
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

export function drawScene(canvas, s, t) {
  const c = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height;
  const scale = w / 900;
  c.save();
  c.scale(scale, scale);
  c.fillStyle = "#102b3f";
  c.fillRect(0, 0, 900, 620);
  const proj = projectPoint;
  const line = (a, b, color, width = 2) => {
    const p = proj(...a),
      q = proj(...b);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(q.x, q.y);
    c.stroke();
  };
  const poly = (points, color) => {
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
    const p = actorAt(a, t);
    const contact = s.contacts.find(
      (e) => e.actor.value === a.id && Math.abs(e.time.value - t) < 0.45,
    );
    const phase = t * 8;
    const before = actorAt(a, Math.max(0, t - 0.03)),
      after = actorAt(a, t + 0.03);
    const moving = Math.hypot(after.x - before.x, after.z - before.z) > 0.008;
    const swing = moving ? Math.sin(phase) * 0.28 : 0;
    const jump =
      contact && /attack/.test(contact.action.value)
        ? Math.max(0, 1 - Math.abs(contact.time.value - t) / 0.45) * 0.5
        : 0;
    const color = p.z < 0 ? ORANGE : BLUE;
    const hip = [p.x, 0.9 + jump, p.z],
      shoulder = [p.x, 1.48 + jump, p.z],
      head = proj(p.x, 1.78 + jump, p.z);
    const ground = proj(p.x, 0.02, p.z);
    c.fillStyle = "#0a253957";
    c.beginPath();
    c.ellipse(ground.x, ground.y, 13, 5, 0, 0, 7);
    c.fill();
    line(hip, shoulder, color, 11);
    for (const side of [-1, 1]) {
      const knee = [p.x + side * 0.13, 0.48 + jump, p.z + swing * side],
        foot = [p.x + side * 0.19, 0.05 + jump, p.z - swing * side];
      line([p.x + side * 0.1, 0.9 + jump, p.z], knee, color, 5);
      line(knee, foot, "#d5e7ed", 4);
      const elbow = [p.x + side * 0.3, contact ? 1.8 + jump : 1.1 + jump, p.z];
      const hand = [
        p.x + side * 0.25,
        contact ? Math.min(3.2, contact.height.value) : 0.95 + jump,
        p.z + 0.17,
      ];
      line([p.x + side * 0.16, 1.45 + jump, p.z], elbow, color, 4);
      line(elbow, hand, "#d8ad8b", 4);
    }
    c.fillStyle = "#e2b998";
    c.beginPath();
    c.arc(head.x, head.y, 7, 0, 7);
    c.fill();
    const label = proj(p.x, 2.2 + jump, p.z);
    c.fillStyle = "#e9f3fa";
    c.font = "bold 11px system-ui";
    c.textAlign = "center";
    c.fillText(a.id, label.x, label.y);
    c.textAlign = "left";
  }
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
  c.fillStyle = "#b0cad9";
  c.font = "11px system-ui";
  c.fillText("VOLLEYUPCAST / TEMPLATE MOTION", 22, 30);
  c.fillStyle = s.approval?.mode === "final" ? "#b9ded5" : "#ffe0a4";
  c.fillText(
    `${s.approval?.mode === "final" ? "COACH-REVIEWED TACTICAL SCENE" : "ILLUSTRATIVE · NOT AN EXACT REPLAY"}   |   t ${t.toFixed(2)} s`,
    22,
    590,
  );
  c.restore();
}
