// A newly selected clip never inherits a sample's supposed reconstruction.
export function unbindVideo(s, sha256) {
  delete s.sample;
  delete s.motion;
  delete s.performance;
  if (!s.contacts.length) {
    const f = (value) => ({
      value,
      status: "unresolved",
      source: "Unbound manual editor scaffold",
    });
    s.contacts = [0, 1].map((i) => ({
      id: `contact-${i + 1}`,
      after: i ? ["contact-1"] : [],
      actor: f(s.actors[0].id),
      action: f("unknown contact"),
      time: f(((i + 1) * s.duration) / 3),
      height: f(2.6),
      x: f(0),
      z: f(0),
      apex: f(2.9),
    }));
  }
  s.videoBinding = {
    state: "unbound",
    source: "User-selected local clip; bytes remain on this device",
  };
  if (sha256) s.videoBinding.sha256 = sha256;
  s.title = "Local video · reconstruction not started";
  s.observations = [];
  s.calibrations = [];
  s.branches = [];
  s.transcript = {
    value: "",
    status: "unresolved",
    source: "Supply the transcript for this clip",
  };
  for (const obj of [s.ball, s.tactic])
    for (const f of Object.values(obj))
      Object.assign(f, {
        value: "unspecified",
        status: "unresolved",
        source: "Not established from this clip",
      });
  for (const c of s.contacts)
    for (const k of ["actor", "action", "time", "height", "x", "z", "apex"])
      Object.assign(c[k], {
        status: "unresolved",
        source: "Unbound editor scaffold; not measured from this clip",
      });
  s.contacts.forEach((c, i) => {
    const a = s.actors[i % s.actors.length];
    c.actor.value = a.id;
    c.action.value = "unknown contact";
    c.x.value = a.path.value[0].x;
    c.z.value = a.path.value[0].z;
    c.height.value = 2.6;
    c.apex.value = 2.9;
    for (const f of Object.values(c))
      if (f && typeof f === "object" && "range" in f) delete f.range;
  });
  s.tactic.playerId.value = s.actors[0].id;
  s.tactic.setterId = {
    value: "",
    status: "flexible-not-applicable",
    source: "No setter association established for this clip",
  };
  for (const a of s.actors) {
    const p = a.path.value[0];
    a.path = {
      value: [
        { t: 0, x: p.x, z: p.z },
        { t: s.duration, x: p.x, z: p.z },
      ],
      status: "unresolved",
      source: "Stationary placement scaffold; map this player to the clip",
    };
    a.role = {
      value: "unknown player",
      status: "unresolved",
      source: "Identify this player in the clip",
    };
    a.rotation.status = "unresolved";
    a.rotation.source = "Not established from this clip";
  }
  for (const k of ["videoOffset", "speechOffset"])
    Object.assign(s.clocks[k], {
      value: 0,
      status: "unresolved",
      source: "Align this clip's clocks explicitly",
    });
  s.approval = null;
  s.reviewedRevision = null;
}
export function sameLocalVideo(s, sha256) {
  return !!sha256 && s.videoBinding?.sha256 === sha256;
}
export function setUnboundDuration(s, duration) {
  if (
    s.videoBinding?.state !== "unbound" ||
    !Number.isFinite(duration) ||
    duration <= 0
  )
    return;
  s.duration = Math.min(120, duration);
  for (const a of s.actors) a.path.value.at(-1).t = s.duration;
  s.contacts.forEach(
    (c, i) => (c.time.value = (s.duration * (i + 1)) / (s.contacts.length + 1)),
  );
}
export function beginManualReconstruction(s) {
  if (s.videoBinding?.state !== "unbound")
    throw Error("Select a new local clip first");
  s.videoBinding.state = "manual";
  s.title = "Local video · coach-created manual illustration";
}
