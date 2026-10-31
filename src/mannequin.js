// Procedural, unmeasured mannequin geometry. No external body mesh or pose model.
const add = (a, b) => a.map((x, i) => x + b[i]),
  sub = (a, b) => a.map((x, i) => x - b[i]),
  mul = (a, n) => a.map((x) => x * n),
  cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  dot = (a, b) => a.reduce((v, x, i) => v + x * b[i], 0),
  unit = (a) => mul(a, 1 / (Math.hypot(...a) || 1));
export function buildMannequin(pose, rig, color = "#3d91ff", detail = 8) {
  const j = pose.joints,
    faces = [],
    right = unit(sub(j.rightShoulder, j.leftShoulder)),
    up = [0, 1, 0],
    forward = unit(cross(right, up));
  const face = (points, fill, part) => {
    const normal = unit(
        cross(sub(points[1], points[0]), sub(points[2], points[0])),
      ),
      light = 0.72 + 0.28 * Math.abs(dot(normal, unit([-0.4, 0.8, 0.5])));
    faces.push({ points, color: shade(fill, light), part });
  };
  const tube = (a, b, r1, r2, fill, part) => {
    const axis = unit(sub(b, a));
    let u = unit(cross(axis, [0, 1, 0]));
    if (Math.hypot(...u) < 0.1) u = [1, 0, 0];
    const v = unit(cross(axis, u)),
      rings = [a, b].map((center, k) =>
        Array.from({ length: detail }, (_, i) => {
          const angle = (i * 2 * Math.PI) / detail;
          return add(
            center,
            add(
              mul(u, Math.cos(angle) * (k ? r2 : r1)),
              mul(v, Math.sin(angle) * (k ? r2 : r1)),
            ),
          );
        }),
      );
    for (let i = 0; i < detail; i++) {
      const n = (i + 1) % detail;
      face([rings[0][i], rings[0][n], rings[1][n], rings[1][i]], fill, part);
    }
    face([...rings[0]].reverse(), fill, part);
    face(rings[1], fill, part);
  };
  const sphere = (center, radii, fill, part, rings = 4) => {
    const points = [];
    for (let k = 0; k <= rings; k++) {
      const lat = -Math.PI / 2 + (k * Math.PI) / rings;
      points.push(
        Array.from({ length: detail }, (_, i) => {
          const lon = (i * 2 * Math.PI) / detail;
          return add(
            center,
            add(
              mul(up, Math.sin(lat) * radii[1]),
              add(
                mul(right, Math.cos(lat) * Math.cos(lon) * radii[0]),
                mul(forward, Math.cos(lat) * Math.sin(lon) * radii[2]),
              ),
            ),
          );
        }),
      );
    }
    for (let k = 0; k < rings; k++)
      for (let i = 0; i < detail; i++) {
        const n = (i + 1) % detail;
        face(
          [points[k][i], points[k][n], points[k + 1][n], points[k + 1][i]],
          fill,
          part,
        );
      }
  };
  const prism = (
    a,
    b,
    widthA,
    widthB,
    depth,
    fill,
    part,
    side = right,
    normal = forward,
  ) => {
    const ring = (p, w) =>
        [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([x, z]) =>
          add(p, add(mul(side, (x * w) / 2), mul(normal, (z * depth) / 2))),
        ),
      v = [...ring(a, widthA), ...ring(b, widthB)];
    for (const ids of [
      [0, 1, 2, 3],
      [4, 7, 6, 5],
      [0, 4, 5, 1],
      [1, 5, 6, 2],
      [2, 6, 7, 3],
      [3, 7, 4, 0],
    ])
      face(
        ids.map((i) => v[i]),
        fill,
        part,
      );
  };
  const shoulder = mul(add(j.leftShoulder, j.rightShoulder), 0.5),
    hip = mul(add(j.leftHip, j.rightHip), 0.5),
    skin = "#dcb28d";
  prism(
    add(hip, [0, 0.04, 0]),
    shoulder,
    rig.pelvisWidth + 0.08,
    rig.shoulderWidth + 0.05,
    rig.torsoDepth,
    color,
    "torso",
  );
  prism(
    add(hip, [0, -0.12, 0]),
    add(hip, [0, 0.04, 0]),
    rig.pelvisWidth + 0.13,
    rig.pelvisWidth + 0.1,
    rig.torsoDepth * 0.92,
    "#24435c",
    "shorts",
  );
  tube(
    j.neck,
    add(j.head, [0, -rig.headHeight * 0.35, 0]),
    0.045,
    0.045,
    skin,
    "neck",
  );
  sphere(
    j.head,
    [rig.headWidth / 2, rig.headHeight / 2, rig.headDepth / 2],
    skin,
    "head",
    6,
  );
  const nose = add(j.head, add(mul(forward, rig.headDepth / 2), [0, 0, 0]));
  sphere(nose, [0.018, 0.025, 0.023], skin, "nose", 3);
  for (const side of [-1, 1])
    sphere(
      add(
        j.head,
        add(
          mul(forward, rig.headDepth * 0.48),
          add(mul(right, side * rig.headWidth * 0.19), [0, 0.025, 0]),
        ),
      ),
      [0.008, 0.008, 0.01],
      "#243241",
      "eyes",
      3,
    );
  for (const side of ["left", "right"]) {
    const sign = side === "left" ? 1 : -1;
    tube(
      j[side + "Shoulder"],
      j[side + "Elbow"],
      rig.armRadius,
      rig.armRadius * 0.82,
      color,
      side + "-upper-arm",
    );
    tube(
      j[side + "Elbow"],
      j[side + "Wrist"],
      rig.armRadius * 0.82,
      rig.armRadius * 0.58,
      skin,
      side + "-forearm",
    );
    sphere(
      j[side + "Shoulder"],
      [rig.armRadius * 1.1, rig.armRadius * 1.1, rig.armRadius * 1.1],
      color,
      side + "-shoulder",
      3,
    );
    sphere(
      j[side + "Elbow"],
      [rig.armRadius * 0.83, rig.armRadius * 0.83, rig.armRadius * 0.83],
      skin,
      side + "-elbow",
      3,
    );
    const handAxis = unit(sub(j[side + "Hand"], j[side + "Wrist"])),
      palmNormal = unit(cross(right, handAxis));
    prism(
      j[side + "Wrist"],
      j[side + "Hand"],
      rig.palmWidth * 0.7,
      rig.palmWidth,
      0.035,
      skin,
      side + "-hand",
      right,
      palmNormal,
    );
    const thumbStart = add(j[side + "Wrist"], mul(handAxis, 0.035));
    tube(
      thumbStart,
      add(thumbStart, add(mul(right, sign * 0.055), mul(handAxis, 0.025))),
      0.018,
      0.012,
      skin,
      side + "-thumb",
    );
    tube(
      j[side + "Hip"],
      j[side + "Knee"],
      rig.legRadius,
      rig.legRadius * 0.78,
      color,
      side + "-thigh",
    );
    sphere(
      j[side + "Knee"],
      [rig.legRadius * 0.8, rig.legRadius * 0.8, rig.legRadius * 0.8],
      skin,
      side + "-knee",
      3,
    );
    tube(
      j[side + "Knee"],
      j[side + "Ankle"],
      rig.legRadius * 0.7,
      rig.legRadius * 0.45,
      "#e9eef0",
      side + "-shin",
    );
    const shoeAxis = unit(sub(j[side + "Toe"], j[side + "Ankle"])),
      shoeSide = unit(cross(shoeAxis, up));
    prism(
      add(j[side + "Ankle"], add(mul(shoeAxis, -0.055), [0, 0.035, 0])),
      add(j[side + "Toe"], [0, 0.035, 0]),
      rig.footWidth,
      rig.footWidth * 0.9,
      0.07,
      "#f6f9fb",
      side + "-shoe",
      shoeSide,
      up,
    );
  }
  return faces;
}
function shade(hex, factor) {
  const rgb = [1, 3, 5].map((i) =>
    Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * factor)),
  );
  return "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");
}
