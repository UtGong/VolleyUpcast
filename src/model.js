// @ts-check
/** @typedef {'observed'|'coach-provided'|'inferred-awaiting-review'|'approved-illustrative-default'|'flexible-not-applicable'|'unresolved'} Provenance */
/** @template T @typedef {{value:T,status:Provenance,source:string,range?:number[]}} Field */
/** @typedef {{t:number,x:number,z:number}} Point */
/** @typedef {{id:string,role:Field<string>,rotation:Field<number>,path:Field<Point[]>}} Actor */
/** @typedef {{id:string,after:string[],actor:Field<string>,action:Field<string>,time:Field<number>,height:Field<number>,x:Field<number>,z:Field<number>,apex:Field<number>}} Contact */
/** @typedef {{id:string,kind:string,videoTime:number,rallyTime:number,x:number,y:number,note:string,calibrationId:string,status:Provenance,actorId?:string,jointName?:string}} Observation */
/** @typedef {{id:string,actorId:string,eventId:string,time:Field<number>,span:Field<number>,phase:Field<string>,plant:Field<string>,params:Record<string,Field<number>>,depth:Field<string>,videoTime?:Field<number>,imageJoints?:Record<string,Field<{x:number,y:number}>>,imageFit?:Field<string>}} MotionKey */
/** @typedef {{schemaVersion:1,id:string,title:string,revision:number,videoBinding?:{state:"unbound"|"manual",source:string,sha256?:string},motion?:{version:1,rigs:Record<string,Record<string,Field<number>>>,keys:MotionKey[]},sample?:{kind:"board"|"video"|"match",id:string,baselineRevision:number,source:Field<string>,clip?:Field<string>,timingTolerance?:Field<number>,clipDuration?:Field<number>},approval:null|{revision:number,mode:'final'|'illustrative'},reviewedRevision:number|null,duration:number,actors:Actor[],contacts:Contact[],ball:Record<string,Field<string>>,tactic:Record<string,Field<string>>,transcript:Field<string>,clocks:{videoOffset:Field<number>,speechOffset:Field<number>,animationRate:Field<number>,fps:Field<number>},observations:Observation[],calibrations:{id:string,validFrom:number,validUntil:number|null,landmarks:{x:number,y:number,label:string}[],status:Provenance}[],branches:{id:string,label:string,condition:Field<string>}[]}} Scenario */
export const RIG_LIMITS = /** @type {Record<string,number[]>} */ ({
  shoulderHeight: [1, 1.95],
  shoulderWidth: [0.25, 0.75],
  upperArm: [0.2, 0.65],
  forearm: [0.2, 0.65],
  thigh: [0.3, 0.7],
  shin: [0.3, 0.7],
  pelvisWidth: [0.2, 0.6],
  torsoDepth: [0.12, 0.45],
  headWidth: [0.12, 0.28],
  headHeight: [0.16, 0.34],
  headDepth: [0.12, 0.3],
  armRadius: [0.025, 0.11],
  legRadius: [0.045, 0.15],
  palmWidth: [0.05, 0.13],
  footWidth: [0.06, 0.16],
});
export const STATUSES = /** @type {Provenance[]} */ ([
  "observed",
  "coach-provided",
  "inferred-awaiting-review",
  "approved-illustrative-default",
  "flexible-not-applicable",
  "unresolved",
]);
/** @template T @param {T} value @param {Provenance} [status] @param {string} [source] @returns {Field<T>} */
export function field(
  value,
  status = "approved-illustrative-default",
  source = "Synthetic template; coach must review",
) {
  return { value, status, source };
}
/** @param {'slide'|'rally'} [kind] @returns {Scenario} */
export function demo(kind = "slide") {
  const slide = kind === "slide";
  const positions = [
    ["P1", "passer", 1, 2, 6],
    ["S2", "setter", 2, 4.5, 1.4],
    ["M3", "middle blocker", 3, 3.5, 4.5],
    ["O4", "outside hitter", 4, 1, 2],
    ["C5", "coverage", 5, 7, 5],
    ["B6", "blocker", 6, 6, -1],
  ];
  const actors = positions.map(([id, role, rotation, x, z]) => ({
    id: String(id),
    role: field(String(role)),
    rotation: field(Number(rotation)),
    path: field(
      /** @type {Point[]} */ ([
        { t: 0, x: Number(x), z: Number(z) },
        {
          t: 2.8,
          x: id === "M3" ? (slide ? 7 : 4) : Number(x),
          z: id === "M3" ? 1 : Number(z),
        },
        {
          t: 5,
          x: id === "M3" ? (slide ? 7.7 : 4.6) : Number(x),
          z: id === "M3" ? 1.8 : Number(z),
        },
      ]),
    ),
  }));
  /** @param {string} id @param {string} actor @param {string} action @param {number} time @param {number} x @param {number} z @param {number} height @param {number} apex @param {string[]} after @returns {Contact} */
  const contact = (id, actor, action, time, x, z, height, apex, after) => ({
    id,
    after,
    actor: field(actor),
    action: field(action),
    time: field(time),
    x: field(x),
    z: field(z),
    height: field(height),
    apex: field(apex),
  });
  const scenario = {
    schemaVersion: /** @type {1} */ (1),
    id: slide ? "synthetic-slide" : "synthetic-pass-set-attack",
    title: slide
      ? "Middle slide · synthetic study"
      : "Pass → set → attack · synthetic study",
    revision: 1,
    approval: null,
    reviewedRevision: null,
    duration: 5,
    actors,
    contacts: [
      contact("pass", "P1", "forearm pass", 0.5, 2, 6, 0.9, 3.6, []),
      contact("set", "S2", "set", 1.8, 4.5, 1.4, 2.1, 3.5, ["pass"]),
      contact(
        "attack",
        "M3",
        slide ? "slide attack" : "attack",
        3,
        slide ? 7.05 : 4.03,
        1.08,
        2.9,
        3.1,
        ["set"],
      ),
      contact("floor", "", "landing", 4.3, 6, -6, 0, 0, ["attack"]),
    ],
    ball: {
      category: field("volleyball"),
      action: field("pass / set / attack"),
      style: field("illustrative arc"),
      tempo: field(slide ? "coach-defined slide tempo" : "high set"),
      spin: field(
        "unspecified",
        "flexible-not-applicable",
        "Not needed for this tactical illustration",
      ),
    },
    tactic: {
      name: field(slide ? "Middle slide" : "Pass–set–attack"),
      primitive: field(slide ? "slide attack" : "pass–set–attack"),
      playerId: field("M3"),
      setterId: field("S2"),
      approachStartCue: field("After passer contact"),
      approachPath: field("Edit M3 path on board"),
      takeoffRegion: field(
        slide ? "x 6.5–7.3; z 0.8–1.5" : "x 3.5–4.5; z 0.8–1.5",
      ),
      landingRegion: field(slide ? "x 7–8.2; z 1–2.5" : "x 4–5; z 1–2.5"),
      contactTiming: field("Use attack contact anchor"),
      contactHeightRange: field("2.7–3.2 m"),
      setTempo: field("Set 1.8s → attack 3.0s; editable"),
      attackTarget: field("Opponent court x 6; z −6"),
      handednessTechnique: field(
        "Right hand; illustrative one-foot slide, not universal",
      ),
      blockerBehavior: field("B6 stationary template; edit path"),
      coverageBehavior: field("C5 holds coverage; edit path"),
      jointDetail: field(
        "Template limbs only",
        "flexible-not-applicable",
        "No measured joint kinematics",
      ),
    },
    transcript: field(
      slide
        ? "Synthetic coach: P1 passes to S2. M3 starts a slide after the pass; set behind to M3, attack to deep zone. Review timing and hidden contact height."
        : "Synthetic coach: pass to setter S2, set to M3, attack deep.",
    ),
    clocks: {
      videoOffset: field(0),
      speechOffset: field(0),
      animationRate: field(1),
      fps: field(30),
    },
    observations: [],
    calibrations: [],
    branches: [
      {
        id: "primary",
        label: "Primary tactic",
        condition: field("Coach-selected primary pattern"),
      },
    ],
  };
  return scenario;
}
/** @param {Scenario} s @returns {Scenario} */
export function revise(s) {
  s.revision++;
  s.approval = null;
  s.reviewedRevision = null;
  return s;
}
/** @typedef {{id:string,message:string,critical:boolean,rank:number}} Issue */
/** @param {Scenario} s @returns {Issue[]} */
export function validate(s) {
  /** @type {Issue[]} */ const issues = [];
  /** @param {string} id @param {string} message @param {number} rank @param {boolean} [critical] */ const add =
    (id, message, rank, critical = true) =>
      issues.push({ id, message, rank, critical });
  if (!Number.isFinite(s.duration) || s.duration <= 0 || s.duration > 120)
    add(
      "duration",
      "Supported rally duration is greater than zero and at most 120 seconds",
      100,
    );
  const ids = new Set(s.actors.map((a) => a.id));
  if (ids.size !== s.actors.length)
    add("actors", "Actor IDs must be unique", 100);
  const cids = new Set(s.contacts.map((c) => c.id));
  if (cids.size !== s.contacts.length)
    add("contacts", "Contact IDs must be unique", 100);
  for (const a of s.actors) {
    if (!a.path.value.length) add(a.id, "Actor path is empty", 95);
    let previous = -Infinity;
    for (const p of a.path.value) {
      if (
        ![p.t, p.x, p.z].every(Number.isFinite) ||
        p.t < previous ||
        p.t < 0 ||
        p.t > s.duration
      )
        add(a.id, "Actor path timing/coordinates invalid", 95);
      previous = p.t;
      if (p.x < -3 || p.x > 12 || p.z < -12 || p.z > 12)
        add(a.id, "Actor path outside supported playing region", 70);
    }
  }
  let last = -Infinity;
  for (const c of s.contacts) {
    if (
      !Number.isFinite(c.time.value) ||
      c.time.value < last ||
      c.time.value < 0 ||
      c.time.value > s.duration
    )
      add(c.id, "Contact times must be ordered inside rally duration", 100);
    last = c.time.value;
    if (c.action.value !== "landing" && !ids.has(c.actor.value))
      add(c.id, "Contact needs an existing actor", 100);
    if (
      ![c.x.value, c.z.value, c.height.value, c.apex.value].every(
        Number.isFinite,
      ) ||
      c.height.value < 0 ||
      c.height.value > 5 ||
      c.apex.value < 0 ||
      c.apex.value > 10
    )
      add(c.id, "Contact height/trajectory is outside model range", 95);
    for (const id of c.after) {
      const prev = s.contacts.find((p) => p.id === id);
      if (!prev || prev.time.value >= c.time.value)
        add(c.id, "Partial-order dependency contradicts contact time", 100);
    }
    const actor = s.actors.find((a) => a.id === c.actor.value);
    if (actor) {
      const p = actorAt(actor, c.time.value);
      const rig = s.motion?.rigs[actor.id],
        arm = (rig?.upperArm?.value ?? 0.42) + (rig?.forearm?.value ?? 0.42),
        shoulder = rig?.shoulderHeight?.value ?? 1.48;
      if (Math.hypot(p.x - c.x.value, p.z - c.z.value) > arm + 0.1)
        add(
          c.id,
          "Shared contact is outside supported arm reach; correct actor path or contact position",
          95,
        );
      if (c.height.value > shoulder + 1 + arm)
        add(
          c.id,
          "Contact is above maximum supported rig/jump reach; correct height or rig",
          95,
        );
      if (Math.hypot(p.x - c.x.value, p.z - c.z.value) > 1.8)
        add(
          c.id,
          "Contact is farther than 1.8m from actor path; correct actor or path",
          90,
        );
    }
  }
  for (let i = 0; i < s.contacts.length - 1; i++) {
    const a = s.contacts[i],
      b = s.contacts[i + 1];
    if (a.apex.value < Math.max(a.height.value, b.height.value))
      add(a.id, "Ball segment apex must be at least both endpoint heights", 95);
    if (
      b.time.value > a.time.value &&
      Math.hypot(b.x.value - a.x.value, b.z.value - a.z.value) /
        (b.time.value - a.time.value) >
        45
    )
      add(
        a.id,
        "Average horizontal ball speed exceeds illustrative model limit (45m/s)",
        80,
      );
    if (a.z.value * b.z.value < 0) {
      const u =
        Math.abs(a.z.value) / (Math.abs(a.z.value) + Math.abs(b.z.value));
      if (segmentAt(a, b, u).y < 2.43)
        add(
          a.id,
          "Ball crosses the 2.43m template net below its top; adjust arc or choose another net model",
          90,
        );
    }
  }
  const walk = (/** @type {unknown} */ v, /** @type {string} */ p) => {
    if (!v || typeof v !== "object") return;
    const o = /** @type {Record<string,unknown>} */ (v);
    if ("status" in o && "value" in o) {
      if (
        o.status === "flexible-not-applicable" &&
        (/contacts\.\d+\.(time|height|x|z|apex)$/.test(p) ||
          /actors\.\d+\.path$/.test(p))
      )
        add(
          p,
          "Critical motion fields cannot be marked not applicable; resolve or use illustrative mode",
          85,
        );
      if (o.status === "unresolved" || o.status === "inferred-awaiting-review")
        add(
          p,
          `${p}: needs coach clarification or explicitly illustrative use`,
          85,
        );
      if (!STATUSES.includes(/** @type {Provenance} */ (o.status)))
        add(p, "Unknown provenance", 100);
      if (o.value === null || o.value === undefined)
        add(p, "Field has no value", 100);
      if (
        Array.isArray(o.range) &&
        typeof o.value === "number" &&
        (o.value < o.range[0] ||
          o.value > o.range[1] ||
          o.range[0] > o.range[1])
      )
        add(p, "Value contradicts configured range", 95);
      return;
    }
    for (const [k, x] of Object.entries(o)) walk(x, p ? `${p}.${k}` : k);
  };
  walk(s, "");
  if (s.contacts.length < 2)
    add("contacts", "At least two contact anchors needed", 100);
  for (const key of ["playerId", "setterId"])
    if (
      s.tactic[key] &&
      s.tactic[key].status !== "flexible-not-applicable" &&
      !ids.has(s.tactic[key].value)
    )
      add(key, "Tactic references an unknown actor", 95);
  if (s.clocks.animationRate.value <= 0 || s.clocks.fps.value <= 0)
    add("clocks", "Clock rate and FPS must be positive", 100);
  for (const o of s.observations) {
    if (o.calibrationId) {
      const c = s.calibrations.find((c) => c.id === o.calibrationId);
      if (
        !c ||
        o.videoTime < c.validFrom ||
        (c.validUntil !== null && o.videoTime >= c.validUntil)
      )
        add(o.id, "Observation uses calibration invalid after camera cut", 90);
    }
  }
  if (s.videoBinding) {
    if (s.videoBinding.sha256 && !/^[a-f0-9]{64}$/.test(s.videoBinding.sha256))
      add("videoBinding", "Invalid local clip content identity", 100);
    if (
      !["unbound", "manual"].includes(s.videoBinding.state) ||
      typeof s.videoBinding.source !== "string"
    )
      add("videoBinding", "Unknown video reconstruction binding", 100);
    if (s.videoBinding.state === "unbound")
      add(
        "videoBinding",
        "Local video is unbound. Start manual reconstruction and map actual observations before creating a 3D illustration.",
        100,
      );
  }
  if (s.motion) {
    const limits = {
      handHeight: [0.35, 3.5],
      handWidth: [0.08, 1.4],
      handForward: [-0.6, 1],
      jumpHeight: [0, 1],
      kneeBend: [5, 115],
      torsoYaw: [-180, 180],
      torsoLean: [-35, 45],
      wristFlex: [-60, 60],
      stanceWidth: [0.2, 1],
      elbowOut: [0, 1],
      footYaw: [-60, 60],
    };
    if (
      s.motion.version !== 1 ||
      !Array.isArray(s.motion.keys) ||
      !s.motion.rigs
    )
      add("motion", "Unsupported motion schema", 100);
    const swingLimits = {
      compression: [0, 0.18],
      torsoTwist: [-70, 70],
      swingBlend: [0, 1],
      rightSwing: [-160, 180],
      rightAbduction: [-100, 100],
      rightElbowBend: [5, 155],
      rightElbowPlane: [-180, 180],
      rightForearmTwist: [-180, 180],
      leftSwing: [-160, 180],
      leftAbduction: [-100, 100],
      leftElbowBend: [5, 155],
      leftElbowPlane: [-180, 180],
      leftForearmTwist: [-180, 180],
    };
    const rigDefault = {
      shoulderHeight: 1.48,
      shoulderWidth: 0.42,
      upperArm: 0.42,
      forearm: 0.42,
      thigh: 0.46,
      shin: 0.46,
      pelvisWidth: 0.28,
    };
    for (const [id, rig] of Object.entries(s.motion.rigs)) {
      if (!ids.has(id)) add(id, "Rig references missing player", 100);
      for (const [name, f] of Object.entries(rig))
        if (
          !Number.isFinite(f.value) ||
          f.value <= 0 ||
          f.value > 2 ||
          (RIG_LIMITS[name] &&
            (f.value < RIG_LIMITS[name][0] || f.value > RIG_LIMITS[name][1]))
        )
          add(id + name, "Invalid rig dimension", 100);
    }
    const seen = new Set();
    for (const k of s.motion.keys) {
      if (seen.has(k.id)) add(k.id, "Duplicate pose keyframe ID", 100);
      seen.add(k.id);
      if (!ids.has(k.actorId) || !cids.has(k.eventId))
        add(k.id, "Pose needs an existing player and event", 100);
      if (
        !Number.isFinite(k.time.value) ||
        k.time.value < 0 ||
        k.time.value > s.duration ||
        !Number.isFinite(k.span.value) ||
        k.span.value < 0.1 ||
        k.span.value > 2
      )
        add(k.id, "Pose keyframe time/influence window invalid", 100);
      if (
        ![
          "ready",
          "approach",
          "dig",
          "set",
          "attack",
          "block",
          "land",
          "recovery",
        ].includes(k.phase.value) ||
        !["auto", "both", "left", "right", "airborne"].includes(k.plant.value)
      )
        add(k.id, "Unknown phase or foot plant mode", 100);
      for (const [name, bounds] of Object.entries(limits)) {
        const f = k.params[name];
        if (
          !f ||
          !Number.isFinite(f.value) ||
          f.value < bounds[0] ||
          f.value > bounds[1]
        )
          add(
            k.id + name,
            "Motion parameter outside supported template bounds",
            95,
          );
      }
      for (const [name, bounds] of Object.entries(swingLimits)) {
        const f = k.params[name];
        if (
          f &&
          (!Number.isFinite(f.value) ||
            f.value < bounds[0] ||
            f.value > bounds[1])
        )
          add(
            k.id + name,
            "Swing/compression parameter outside supported bounds",
            95,
          );
      }
      const values = Object.fromEntries(
        Object.entries(k.params).map(([name, f]) => [name, f.value]),
      );
      const rig = Object.fromEntries(
        Object.entries(rigDefault).map(([name, value]) => [
          name,
          s.motion?.rigs[k.actorId]?.[name]?.value ?? value,
        ]),
      );
      const drop =
        (rig.thigh + rig.shin) *
        (1 - Math.cos((values.kneeBend * Math.PI) / 360));
      const shoulder =
        rig.shoulderHeight -
        drop +
        values.jumpHeight -
        (values.compression || 0);
      const reach = Math.hypot(
        values.handHeight - shoulder,
        (values.handWidth - rig.shoulderWidth) / 2,
        values.handForward,
      );
      if (
        (values.swingBlend || 0) < 0.99 &&
        reach > rig.upperArm + rig.forearm + 0.03
      )
        add(
          k.id,
          "Impossible arm reach: lower hands, adjust jump/knees or correct rig dimensions",
          95,
        );
      const contact = s.contacts.find((c) => c.id === k.eventId);
      const actor = s.actors.find((a) => a.id === k.actorId);
      if (
        contact?.actor.value === k.actorId &&
        Math.abs(k.time.value - contact.time.value) < 0.03 &&
        ["dig", "set", "attack"].includes(k.phase.value) &&
        Math.abs(values.handHeight - contact.height.value) > 0.06
      )
        add(
          k.id,
          "Pose hand height contradicts shared ball contact; adjust both explicitly",
          95,
        );
      if (k.plant.value !== "auto" && k.plant.value !== "airborne") {
        if (values.jumpHeight > 0.12)
          add(
            k.id,
            "Planted foot conflicts with airborne jump; use auto or airborne",
            95,
          );
        if (actor) {
          const center = actorAt(actor, k.time.value);
          for (const t of [
            Math.max(0, k.time.value - k.span.value * 0.5),
            Math.min(s.duration, k.time.value + k.span.value * 0.5),
          ]) {
            const p = actorAt(actor, t);
            if (Math.hypot(p.x - center.x, p.z - center.z) > 0.18)
              add(
                k.id,
                "Foot sliding constraint: planted pose moves along the actor path; add a step or change plant mode",
                95,
              );
          }
        }
      }
      if (
        k.videoTime &&
        Math.abs(
          k.videoTime.value - (k.time.value + s.clocks.videoOffset.value),
        ) > 0.07
      )
        add(k.id, "Pose frame clock contradicts video/rally offset", 95);
      for (const point of Object.values(k.imageJoints || {}))
        if (
          !Number.isFinite(point.value.x) ||
          !Number.isFinite(point.value.y) ||
          point.value.x < 0 ||
          point.value.x > 1 ||
          point.value.y < 0 ||
          point.value.y > 1
        )
          add(
            k.id,
            "Image joint must be a normalized observed point, not invented depth",
            95,
          );
    }
    for (const id of ids) {
      const keys = s.motion.keys
        .filter((k) => k.actorId === id)
        .sort((a, b) => a.time.value - b.time.value);
      for (let i = 1; i < keys.length; i++) {
        const a = keys[i - 1],
          b = keys[i],
          dt = b.time.value - a.time.value;
        const turn = Math.abs(
          ((b.params.torsoYaw.value - a.params.torsoYaw.value + 540) % 360) -
            180,
        );
        if (dt <= 0 || turn / (dt || 0.001) > 240)
          add(
            b.id,
            "Pose turn is too abrupt for this template; add time or intermediate steps",
            95,
          );
      }
    }
  }
  return issues.sort((a, b) => b.rank - a.rank);
}
/** @param {Scenario} s @param {'final'|'illustrative'} mode */
export function approve(s, mode) {
  if (s.reviewedRevision !== s.revision)
    throw Error("Use Done editing → Review before confirming");
  const issues = validate(s);
  if (issues.some((i) => i.critical) && mode === "final")
    throw Error("Critical questions block final export");
  if (issues.some((i) => i.rank >= 90))
    throw Error(
      "Structural or continuity errors must be fixed even in illustrative mode",
    );
  s.approval = { revision: s.revision, mode };
}
/** @param {Scenario} s */
export function canExport(s) {
  return (
    s.approval?.revision === s.revision &&
    !validate(s).some((i) => i.rank >= 90) &&
    (s.approval.mode === "illustrative" || !validate(s).some((i) => i.critical))
  );
}
/** @param {Actor} a @param {number} t @returns {Point} */
export function actorAt(a, t) {
  const path = a.path.value;
  if (!path.length) return { t, x: 0, z: 0 };
  if (t <= path[0].t) return path[0];
  for (let i = 1; i < path.length; i++) {
    const p = path[i - 1],
      q = path[i];
    if (t <= q.t) {
      const u = (t - p.t) / (q.t - p.t || 1);
      return { t, x: p.x + (q.x - p.x) * u, z: p.z + (q.z - p.z) * u };
    }
  }
  return path.at(-1) || path[0];
}
/** @param {Contact} a @param {Contact} b @param {number} u */
export function segmentAt(a, b, u) {
  const peak = a.apex.value;
  const y =
    u <= 0.5
      ? peak - (peak - a.height.value) * (1 - 2 * u) ** 2
      : peak - (peak - b.height.value) * (2 * u - 1) ** 2;
  return {
    x: a.x.value + (b.x.value - a.x.value) * u,
    z: a.z.value + (b.z.value - a.z.value) * u,
    y,
  };
}
/** @param {Scenario} s @param {number} t */
export function ballAt(s, t) {
  const c = s.contacts;
  if (!c.length) return { x: 4.5, y: 0, z: 0 };
  if (t <= c[0].time.value)
    return { x: c[0].x.value, y: c[0].height.value, z: c[0].z.value };
  for (let i = 1; i < c.length; i++)
    if (t <= c[i].time.value)
      return segmentAt(
        c[i - 1],
        c[i],
        (t - c[i - 1].time.value) /
          (c[i].time.value - c[i - 1].time.value || 1),
      );
  const a = c.at(-1) || c[0];
  return { x: a.x.value, y: a.height.value, z: a.z.value };
}
/** @param {Scenario} s */
export function serialize(s) {
  return JSON.stringify(s, null, 2) + "\n";
}
/** @param {string} text @returns {Scenario} */
export function parse(text) {
  const s = JSON.parse(text);
  if (
    s.schemaVersion !== 1 ||
    !Array.isArray(s.actors) ||
    !Array.isArray(s.contacts) ||
    !s.tactic ||
    !s.clocks ||
    !s.ball ||
    !Array.isArray(s.observations) ||
    !Array.isArray(s.calibrations) ||
    !s.transcript ||
    !Array.isArray(s.branches)
  )
    throw Error("Unsupported scenario schema");
  if (
    !Number.isFinite(s.duration) ||
    s.duration <= 0 ||
    s.duration > 120 ||
    !Number.isInteger(s.revision) ||
    s.revision < 1
  )
    throw Error("Invalid duration or revision");
  if (
    s.sample &&
    (!["board", "video", "match"].includes(s.sample.kind) ||
      typeof s.sample.id !== "string")
  )
    throw Error("Unsupported sample metadata");
  for (const c of s.contacts)
    for (const key of ["time", "height", "x", "z", "apex"])
      if (!Number.isFinite(c[key]?.value))
        throw Error("Contact numeric fields must be finite");
  if (
    s.motion &&
    (s.motion.version !== 1 || !s.motion.rigs || !Array.isArray(s.motion.keys))
  )
    throw Error("Unsupported motion schema");
  validate(s);
  s.approval = null;
  s.reviewedRevision = null;
  return s;
}
