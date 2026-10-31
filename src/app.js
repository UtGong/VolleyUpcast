import {
  demo,
  STATUSES,
  field,
  revise,
  validate,
  approve,
  canExport,
  actorAt,
  serialize,
  parse,
} from "./model.js";
import { drawBoard, drawScene, unboard } from "./render.js";
import { makeSample, builtInVideo, SAMPLE_INFO } from "./samples.js";
const $ = (id) => document.getElementById(id);
let s = demo(),
  time = 0,
  playing = false,
  last = performance.now(),
  history = [],
  future = [],
  draft = [],
  drawing = false,
  recorder = null,
  audioChunks = [],
  audioBlob = null,
  videoURL = null,
  audioURL = null,
  exporting = false,
  exportCancelled = false,
  activeCalibration = "",
  dirty = false,
  pendingReplacement = null,
  sampleVideoURL = null,
  sampleVideoSource = "",
  sampleMediaRevision = 0;
const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
const notice = (msg) => {
  $("notice").textContent = msg;
};
function snapshot() {
  history.push(serialize(s));
  if (history.length > 80) history.shift();
  future = [];
}
function mutate(fn) {
  if (exporting) {
    notice("Stop or finish video export before editing.");
    return;
  }
  snapshot();
  try {
    fn();
    for (const o of s.observations)
      o.rallyTime = o.videoTime - s.clocks.videoOffset.value;
    revise(s);
    dirty = true;
    renderUI();
    store();
  } catch (e) {
    s = parse(history.pop());
    notice(e.message);
    renderUI();
  }
}
function store() {
  try {
    localStorage.setItem("volleyupcast.scene.v1", serialize(s));
  } catch {
    notice("Browser storage unavailable. Save scene JSON to keep changes.");
  }
}
function download(data, name, type) {
  const b = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(b),
    a = el("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function requestReplacement(action) {
  if (exporting || recorder?.state === "recording") {
    notice("Finish export or recording before replacing a scene.");
    return;
  }
  if (dirty || audioBlob) {
    pendingReplacement = action;
    $("replace-dialog").showModal();
  } else action();
}
async function syncSampleMedia() {
  const mediaRevision = ++sampleMediaRevision;
  const file = builtInVideo(s),
    video = $("video");
  if (file) {
    const target = new URL(file, document.baseURI).href;
    activeCalibration = s.calibrations[0]?.id || "";
    if (
      sampleVideoSource === target &&
      sampleVideoURL &&
      video.src === sampleVideoURL
    )
      return;
    video.pause();
    video.removeAttribute("src");
    video.load();
    try {
      const response = await fetch(target);
      if (!response.ok) throw Error("Sample clip could not be loaded");
      const blob = await response.blob();
      if (mediaRevision !== sampleMediaRevision || !builtInVideo(s)) return;
      if (sampleVideoURL) URL.revokeObjectURL(sampleVideoURL);
      sampleVideoURL = URL.createObjectURL(blob);
      sampleVideoSource = target;
      video.src = sampleVideoURL;
      video.load();
    } catch (e) {
      if (mediaRevision === sampleMediaRevision)
        notice(e.message + ". Reload the video sample to retry.");
    }
  } else {
    if (sampleVideoURL) {
      if (video.src === sampleVideoURL) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      URL.revokeObjectURL(sampleVideoURL);
      sampleVideoURL = null;
      sampleVideoSource = "";
    }
  }
}
function sampleStatus() {
  const info = s.sample && SAMPLE_INFO[s.sample.kind];
  $("reset-sample").disabled = !info;
  $("active-sample").textContent = info
    ? `${info.title} loaded · ${dirty ? "edited draft" : "supplied illustrative inputs"} · ${s.approval ? "review confirmed" : "review and confirmation still required"}. ${s.sample.kind === "video" ? "Clip alignment tolerance ±0.07s. " : ""}All examples are synthetic.`
    : "No complete sample selected. Loading a sample never approves it for export.";
}
function loadSample(kind) {
  const revision = s.revision;
  mutate(() => {
    s = makeSample(kind);
    s.revision = revision;
    s.sample.baselineRevision = revision + 1;
    time = 0;
    playing = false;
    draft = [];
    drawing = false;
    activeCalibration = "";
  });
  dirty = false;
  if (audioBlob) {
    $("audio").pause();
    $("audio").removeAttribute("src");
    $("audio").load();
    if (audioURL) URL.revokeObjectURL(audioURL);
    audioURL = null;
    audioBlob = null;
    $("save-audio").disabled = true;
  }
  if (videoURL) {
    URL.revokeObjectURL(videoURL);
    videoURL = null;
  }
  syncSampleMedia();
  sampleStatus();
  chooseTab(kind);
  $("illustrative").checked = false;
  $("play").textContent = "▶ Play";
  notice(
    `${SAMPLE_INFO[kind].title} loaded. Synthetic source inputs and scene are editable. Inspect them, then review and confirm before exporting.`,
  );
}
$("sample-board").onclick = () => requestReplacement(() => loadSample("board"));
$("sample-video").onclick = () => requestReplacement(() => loadSample("video"));
$("reset-sample").onclick = () => {
  const kind = s.sample?.kind;
  if (kind) requestReplacement(() => loadSample(kind));
};
$("keep-editing").onclick = () => {
  $("replace-dialog").close();
  pendingReplacement = null;
  renderUI();
};
$("replace-scene").onclick = () => {
  const action = pendingReplacement;
  pendingReplacement = null;
  $("replace-dialog").close();
  action?.();
};
$("replace-dialog").oncancel = () => {
  pendingReplacement = null;
  renderUI();
};
function chooseTab(name) {
  for (const b of document.querySelectorAll("[data-tab]"))
    b.classList.toggle("active", b.dataset.tab === name);
  for (const p of ["board", "video", "review"])
    $(p + "-pane").hidden = p !== name;
  drawAnnotations();
}
function options(select, values, selected) {
  select.replaceChildren();
  for (const [value, label] of values) {
    const opt = el("option", label);
    opt.value = value;
    select.append(opt);
  }
  select.value = selected || values[0]?.[0] || "";
}
function fieldEditor(parent, label, f, onValue) {
  const row = el("div", undefined, "field");
  row.append(el("label", label));
  const input = el("input");
  input.value = String(f.value);
  if (typeof f.value === "number") {
    input.type = "number";
    input.step = ".05";
  }
  input.setAttribute("aria-label", label);
  const suggestions = {
    action: [
      "forearm pass",
      "set",
      "slide attack",
      "attack",
      "blocking shuffle",
      "block",
      "landing",
    ],
    category: ["indoor volleyball", "beach volleyball", "training ball"],
    style: ["illustrative arc", "float", "topspin", "unspecified"],
    tempo: ["quick", "high set", "coach-defined slide tempo"],
    primitive: [
      "slide attack",
      "blocking shuffle",
      "pass–set–attack",
      "custom",
    ],
  };
  if (suggestions[label]) {
    const list = el("datalist");
    list.id = "choices-" + parent.id + "-" + label;
    for (const v of suggestions[label]) {
      const o = el("option");
      o.value = v;
      list.append(o);
    }
    input.setAttribute("list", list.id);
    row.append(list);
  }
  input.addEventListener("change", () =>
    mutate(() => {
      const value =
        typeof f.value === "number" ? Number(input.value) : input.value;
      if (typeof value === "number" && !Number.isFinite(value))
        throw Error("Enter a finite number");
      f.value = value;
      f.status = "coach-provided";
      f.source = "Coach editor";
      onValue?.(value);
    }),
  );
  row.append(input);
  const provenance = el("div", undefined, "provenance"),
    status = el("select");
  status.setAttribute("aria-label", `${label} provenance`);
  options(
    status,
    STATUSES.map((x) => [x, x]),
    f.status,
  );
  status.onchange = () =>
    mutate(() => {
      f.status = status.value;
    });
  const source = el("input");
  source.value = f.source;
  source.setAttribute("aria-label", `${label} source`);
  source.placeholder = "Source / evidence";
  source.onchange = () =>
    mutate(() => {
      f.source = source.value;
    });
  provenance.append(status, source);
  row.append(provenance);
  if (typeof f.value === "number") {
    const range = el("div", undefined, "range");
    range.append(el("span", "Optional bounds"));
    for (let i = 0; i < 2; i++) {
      const n = el("input");
      n.type = "number";
      n.step = ".05";
      n.value = f.range?.[i] ?? "";
      n.placeholder = i ? "max" : "min";
      n.setAttribute("aria-label", `${label} ${i ? "maximum" : "minimum"}`);
      n.onchange = () =>
        mutate(() => {
          if (n.value === "") {
            delete f.range;
            return;
          }
          f.range = f.range || [f.value, f.value];
          f.range[i] = Number(n.value);
        });
      range.append(n);
    }
    row.append(range);
  }
  parent.append(row);
}
function renderUI() {
  if (s.id === "synthetic-pass-set-attack") $("template").value = "rally";
  else if (s.id === "synthetic-slide") $("template").value = "slide";
  const oldActor = $("actor").value,
    oldContact = $("contact").value;
  options(
    $("actor"),
    s.actors.map((a) => [a.id, `${a.id} · ${a.role.value}`]),
    oldActor,
  );
  options(
    $("contact"),
    s.contacts.map((c) => [
      c.id,
      `${c.id} · ${c.time.value.toFixed(2)}s · ${c.action.value}`,
    ]),
    oldContact,
  );
  $("revision").textContent = `REV ${s.revision}`;
  $("approval-pill").textContent = s.approval
    ? `${s.approval.mode.toUpperCase()} APPROVED`
    : "DRAFT";
  $("timeline").max = s.duration;
  $("transcript").value = s.transcript.value;
  $("undo").disabled = !history.length;
  $("redo").disabled = !future.length;
  $("export-video").disabled = !canExport(s) || exporting;
  $("confirm").disabled = s.reviewedRevision !== s.revision || exporting;
  $("export-status").textContent = s.approval
    ? `Revision ${s.revision} approved in ${s.approval.mode} mode. Edits require a new review.`
    : "No approved export yet.";
  $("review-status").textContent =
    s.reviewedRevision === s.revision
      ? `Reviewing revision ${s.revision}. Confirm after checking the ledger.`
      : "Finish editing to review this revision.";
  sampleStatus();
  renderActor();
  renderContact();
  for (const [id, obj] of [
    ["ball-fields", s.ball],
    ["tactic-fields", s.tactic],
    ["clock-fields", s.clocks],
  ]) {
    $(id).replaceChildren();
    for (const [k, f] of Object.entries(obj))
      fieldEditor($(id), k.replace(/([A-Z])/g, " $1"), f);
  }
  $("events").replaceChildren();
  for (const c of s.contacts) {
    const b = el("button", `${c.id} ${c.time.value.toFixed(1)}s`);
    b.onclick = () => {
      time = c.time.value;
      playing = false;
      $("play").textContent = "▶ Play";
      if ($("video").src && Number.isFinite($("video").duration))
        $("video").currentTime = Math.max(
          0,
          Math.min($("video").duration, time + s.clocks.videoOffset.value),
        );
      $("contact").value = c.id;
      renderContact();
      draw();
    };
    $("events").append(b);
  }
  const issues = validate(s);
  $("issue-count").textContent = issues.length ? `(${issues.length})` : "";
  $("questions").replaceChildren();
  if (!issues.length)
    $("questions").append(
      el(
        "div",
        "No blocking contradictions. Inspect synthetic defaults and approve the intended interpretation.",
        "issue good",
      ),
    );
  for (const i of issues) {
    const box = el("div", undefined, "issue");
    box.append(el("b", `Priority ${i.rank} · ${i.id}`), el("div", i.message));
    $("questions").append(box);
  }
  $("ledger").replaceChildren();
  const walk = (v, path) => {
    if (!v || typeof v !== "object") return;
    if ("value" in v && "status" in v) {
      const row = el("div", undefined, "ledger-row");
      row.append(
        el("b", path + " · " + v.status),
        el("div", `${JSON.stringify(v.value)} — ${v.source}`),
      );
      $("ledger").append(row);
      return;
    }
    for (const [k, x] of Object.entries(v)) walk(x, path ? path + "." + k : k);
  };
  walk(s, "");
  renderObservations();
  $("branches").replaceChildren();
  for (const branch of s.branches) {
    fieldEditor($("branches"), branch.id + " condition", branch.condition);
    const label = el("p", branch.label, "hint");
    $("branches").append(label);
  }
  draw();
}
function renderActor() {
  const a = s.actors.find((a) => a.id === $("actor").value);
  $("actor-fields").replaceChildren();
  if (!a) return;
  fieldEditor($("actor-fields"), "Role", a.role);
  fieldEditor($("actor-fields"), "Rotation", a.rotation);
  fieldEditor(
    $("actor-fields"),
    "Path provenance",
    {
      value: "Use path editor below",
      status: a.path.status,
      source: a.path.source,
    },
    () => {},
  );
  const pathDisplay = $("actor-fields").lastElementChild.querySelector("input");
  pathDisplay.readOnly = true;
  pathDisplay.onchange = null;
  const statuses = $("actor-fields").lastElementChild.querySelector("select");
  statuses.onchange = () =>
    mutate(() => {
      a.path.status = statuses.value;
    });
  const source =
    $("actor-fields").lastElementChild.querySelector(".provenance input");
  source.onchange = () =>
    mutate(() => {
      a.path.source = source.value;
    });
  $("path-json").value = JSON.stringify(a.path.value, null, 2);
}
function renderContact() {
  const c = s.contacts.find((c) => c.id === $("contact").value);
  $("contact-fields").replaceChildren();
  if (!c) return;
  for (const key of ["actor", "action", "time", "height", "x", "z", "apex"])
    fieldEditor(
      $("contact-fields"),
      key === "apex" ? "next segment peak height" : key,
      c[key],
    );
  const dep = el("label", "After contact IDs (comma separated)"),
    input = el("input");
  input.value = c.after.join(", ");
  input.onchange = () =>
    mutate(() => {
      c.after = input.value
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    });
  dep.append(input);
  $("contact-fields").append(dep);
}
function draw() {
  time = Math.max(0, Math.min(s.duration, time));
  drawBoard($("board"), s, time, $("actor").value, draft);
  drawScene($("scene"), s, time);
  $("timeline").value = time;
  $("time-label").textContent =
    `${time.toFixed(2)} / ${s.duration.toFixed(2)}s`;
}
$("actor").onchange = () => {
  renderActor();
  draw();
};
$("contact").onchange = renderContact;
for (const b of document.querySelectorAll("[data-tab]"))
  b.onclick = () => chooseTab(b.dataset.tab);
$("template").onchange = () => {
  const kind = $("template").value;
  requestReplacement(() => {
    mutate(() => {
      s = demo(kind);
      time = 0;
      activeCalibration = "";
    });
    syncSampleMedia();
  });
};
$("undo").onclick = () => {
  if (!history.length || exporting) return;
  future.push(serialize(s));
  s = parse(history.pop());
  activeCalibration = "";
  dirty = true;
  syncSampleMedia();
  renderUI();
  store();
  notice("Undo restored a draft; approval must be renewed.");
};
$("redo").onclick = () => {
  if (!future.length || exporting) return;
  history.push(serialize(s));
  s = parse(future.pop());
  activeCalibration = "";
  dirty = true;
  syncSampleMedia();
  renderUI();
  store();
};
$("save").onclick = () => {
  download(serialize(s), "volleyupcast-scene.json", "application/json");
  dirty = false;
  sampleStatus();
};
$("load").onchange = async () => {
  const f = $("load").files[0];
  if (f)
    try {
      const loaded = parse(await f.text());
      requestReplacement(() => {
        mutate(() => {
          s = loaded;
          time = 0;
          activeCalibration = "";
        });
        syncSampleMedia();
        if (s.sample) chooseTab(s.sample.kind);
        notice(
          "Scene loaded. Built-in sample video reconnects automatically; personal media must be reselected. Review again before exporting.",
        );
      });
    } catch (e) {
      notice("Scene rejected: " + e.message);
    }
  $("load").value = "";
};
$("transcript").oninput = () =>
  mutate(() => {
    s.transcript = field(
      $("transcript").value,
      "coach-provided",
      "Coach editable transcript",
    );
  });
$("transcript-file").onchange = async () => {
  const f = $("transcript-file").files[0];
  if (f) {
    const text = await f.text();
    mutate(() => {
      s.transcript = field(text, "coach-provided", "Locally imported text");
    });
  }
};
$("save-transcript").onclick = () =>
  download(
    s.transcript.value + "\n",
    "volleyupcast-transcript.txt",
    "text/plain",
  );
$("apply-path").onclick = () => {
  try {
    const path = JSON.parse($("path-json").value);
    if (
      !Array.isArray(path) ||
      path.length < 1 ||
      path.some(
        (p) =>
          !["t", "x", "z"].every(
            (k) => typeof p[k] === "number" && Number.isFinite(p[k]),
          ),
      )
    )
      throw Error("Path requires finite t, x, z values");
    mutate(() => {
      s.actors.find((a) => a.id === $("actor").value).path = field(
        path,
        "coach-provided",
        "Numeric timed path editor",
      );
    });
  } catch (e) {
    notice(e.message);
  }
};
$("clear-path").onclick = () =>
  mutate(() => {
    const a = s.actors.find((a) => a.id === $("actor").value),
      p = actorAt(a, time);
    a.path = field(
      [
        { t: 0, x: p.x, z: p.z },
        { t: s.duration, x: p.x, z: p.z },
      ],
      "coach-provided",
      "Coach reset to stationary",
    );
  });
const pointer = (e) => {
  const r = $("board").getBoundingClientRect();
  return unboard(
    ((e.clientX - r.left) * 900) / r.width,
    ((e.clientY - r.top) * 620) / r.height,
  );
};
$("board").onpointerdown = (e) => {
  if (exporting) return;
  $("board").setPointerCapture(e.pointerId);
  const p = pointer(e);
  if ($("tool").value === "ball") {
    mutate(() => {
      const c = s.contacts.find((c) => c.id === $("contact").value);
      c.x = field(p.x, "coach-provided", "Board contact placement");
      c.z = field(p.z, "coach-provided", "Board contact placement");
    });
    return;
  }
  drawing = true;
  draft = [p];
  draw();
};
$("board").onpointermove = (e) => {
  if (drawing) {
    const p = pointer(e),
      last = draft.at(-1);
    if (Math.hypot(p.x - last.x, p.z - last.z) > 0.15) draft.push(p);
    draw();
  }
};
function finishPath(cancel = false) {
  if (!drawing) return;
  drawing = false;
  if (cancel || draft.length < 2) {
    draft = [];
    draw();
    return;
  }
  const start = Number($("path-start").value),
    end = Number($("path-end").value);
  if (start < 0 || end <= start || end > s.duration) {
    draft = [];
    notice("Path start/end must be ordered inside the rally duration.");
    draw();
    return;
  }
  const points = draft;
  draft = [];
  mutate(() => {
    const a = s.actors.find((a) => a.id === $("actor").value);
    a.path = field(
      points.map((p, i) => ({
        ...p,
        t: start + ((end - start) * i) / (points.length - 1),
      })),
      "coach-provided",
      "Coach drawn path with explicit start/end times",
    );
  });
}
$("board").onpointerup = () => finishPath();
$("board").onpointercancel = () => finishPath(true);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    finishPath(true);
    if (exporting) exportCancelled = true;
    playing = false;
    $("play").textContent = "▶ Play";
    notice("Interaction stopped. Any interrupted export is discarded.");
  }
});
$("play").onclick = () => {
  if (exporting) return;
  if (time >= s.duration) time = 0;
  playing = !playing;
  $("play").textContent = playing ? "Ⅱ Pause" : "▶ Play";
};
$("reset").onclick = () => {
  time = 0;
  playing = false;
  $("play").textContent = "▶ Play";
  draw();
};
$("timeline").oninput = () => {
  if (exporting) return;
  time = Number($("timeline").value);
  playing = false;
  $("play").textContent = "▶ Play";
  draw();
  if ($("video").src)
    $("video").currentTime = Math.max(0, time + s.clocks.videoOffset.value);
  if ($("audio").src)
    $("audio").currentTime = Math.max(0, time + s.clocks.speechOffset.value);
};
$("done").onclick = () => {
  s.reviewedRevision = s.revision;
  renderUI();
  notice(
    "Review this revision, including defaults, ranges and unresolved questions.",
  );
};
$("confirm").onclick = () => {
  try {
    approve(s, $("illustrative").checked ? "illustrative" : "final");
    renderUI();
    store();
    notice("Scene approved. Any edit will revoke this approval.");
  } catch (e) {
    notice(e.message);
  }
};
$("add-branch").onclick = () =>
  mutate(() => {
    const n = s.branches.length + 1;
    s.branches.push({
      id: `branch-${n}`,
      label: `Alternative ${n} (documented, not animated)`,
      condition: field(
        "Describe coach condition",
        "unresolved",
        "Awaiting coach",
      ),
    });
  });
$("record").onclick = async () => {
  try {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
      throw Error("Local microphone recording is unavailable in this browser");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size) audioChunks.push(e.data);
    };
    recorder.onstop = () => {
      audioBlob = new Blob(audioChunks, { type: recorder.mimeType });
      if (audioURL) URL.revokeObjectURL(audioURL);
      audioURL = URL.createObjectURL(audioBlob);
      $("audio").src = audioURL;
      $("save-audio").disabled = false;
      stream.getTracks().forEach((t) => t.stop());
      $("record").disabled = false;
      $("stop-record").disabled = true;
      notice(
        "Audio recorded locally. Type or import transcript; no automatic transcription was used.",
      );
    };
    recorder.start();
    $("record").disabled = true;
    $("stop-record").disabled = false;
    notice("Recording locally. Press Stop recording to finish.");
  } catch (e) {
    notice(e.message);
  }
};
$("stop-record").onclick = () => {
  if (recorder?.state === "recording") recorder.stop();
};
$("save-audio").onclick = () => {
  if (audioBlob)
    download(
      audioBlob,
      "volleyupcast-coach-audio." +
        (audioBlob.type.includes("mp4") ? "m4a" : "webm"),
    );
};
$("video-file").onchange = () => {
  const f = $("video-file").files[0];
  if (!f) return;
  if (videoURL) URL.revokeObjectURL(videoURL);
  videoURL = URL.createObjectURL(f);
  $("video").src = videoURL;
  activeCalibration = "";
  mutate(() => {
    delete s.sample;
    for (const c of s.contacts)
      for (const k of ["actor", "time", "height", "x", "z", "apex"]) {
        if (k === "actor" && c.action.value === "landing") continue;
        c[k].status = "unresolved";
        c[k].source = "Scaffold value, not measured from newly loaded video";
      }
    for (const a of s.actors) {
      a.path.status = "unresolved";
      a.path.source = "Scaffold path, not video-derived";
    }
  });
  notice(
    "Local video loaded. Template tracks are now unresolved scaffolds. Annotate or explicitly approve an illustrative interpretation.",
  );
  drawAnnotations();
};
for (const [id, sign] of [
  ["frame-back", -1],
  ["frame-next", 1],
])
  $(id).onclick = () => {
    const v = $("video");
    v.pause();
    if (v.src && Number.isFinite(v.duration))
      v.currentTime = Math.max(
        0,
        Math.min(v.duration, v.currentTime + sign / s.clocks.fps.value),
      );
  };
$("video").ontimeupdate = () => {
  if (!playing && !exporting && !$("video").paused) {
    time = Math.max(
      0,
      Math.min(s.duration, $("video").currentTime - s.clocks.videoOffset.value),
    );
    draw();
  }
  $("video-clock").textContent = `Video ${$("video").currentTime.toFixed(3)}s`;
  drawAnnotations();
};
$("video").onseeked = drawAnnotations;
$("video").onloadedmetadata = () => {
  if (builtInVideo(s))
    $("video").currentTime = Math.max(
      0,
      Math.min($("video").duration, time + s.clocks.videoOffset.value),
    );
  drawAnnotations();
};
$("align-video").onclick = () =>
  mutate(() => {
    s.clocks.videoOffset = field(
      $("video").currentTime - time,
      "coach-provided",
      "Coach aligned frame to rally",
    );
  });
$("align-contact").onclick = () => {
  const t = $("video").currentTime - s.clocks.videoOffset.value;
  if (t < 0 || t > s.duration) {
    notice("Frame maps outside the rally. Align video offset first.");
    return;
  }
  mutate(() => {
    const c = s.contacts.find((c) => c.id === $("contact").value);
    c.time = field(
      t,
      "observed",
      `Manual video contact at ${$("video").currentTime.toFixed(3)}s; coach alignment`,
    );
  });
  notice(
    "Selected contact time aligned. Review its actor, court location and hidden height separately.",
  );
};
$("new-calibration").onclick = () => {
  const id = `cal-${s.revision + 1}`;
  mutate(() => {
    s.calibrations.push({
      id,
      validFrom: $("video").currentTime,
      validUntil: null,
      landmarks: [],
      status: "observed",
    });
    activeCalibration = id;
  });
  notice(
    "Calibration started. Add court landmark observations; the MVP stores them without solving a homography.",
  );
};
$("camera-cut").onclick = () => {
  mutate(() => {
    const t = $("video").currentTime;
    for (const c of s.calibrations)
      if (c.validUntil === null && c.validFrom <= t) c.validUntil = t;
    activeCalibration = "";
  });
  notice(
    "Camera cut marked. Start a new calibration for subsequent observations.",
  );
};
function addObservation(x, y) {
  if (!$("video").src) {
    notice("Load a local video first.");
    return;
  }
  if (![x, y].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) {
    notice("Image coordinates must be between 0 and 1.");
    return;
  }
  mutate(() => {
    const kind = $("observation-kind").value,
      t = $("video").currentTime;
    const o = {
      id: `obs-${s.revision + 1}-${s.observations.length}`,
      kind,
      videoTime: t,
      rallyTime: t - s.clocks.videoOffset.value,
      x,
      y,
      note: $("observation-note").value,
      calibrationId: activeCalibration,
      status: "observed",
    };
    s.observations.push(o);
    if (kind === "court landmark" && activeCalibration)
      s.calibrations
        .find((c) => c.id === activeCalibration)
        .landmarks.push({ x, y, label: o.note });
  });
  notice(
    "Image observation saved. It does not determine court depth or ball height.",
  );
}
function imageBounds() {
  const v = $("video");
  const scale = Math.min(
    900 / (v.videoWidth || 900),
    506 / (v.videoHeight || 506),
  );
  const w = (v.videoWidth || 900) * scale,
    h = (v.videoHeight || 506) * scale;
  return { x: (900 - w) / 2, y: (506 - h) / 2, w, h };
}
$("annotations").onclick = (e) => {
  const r = $("annotations").getBoundingClientRect(),
    b = imageBounds();
  addObservation(
    (((e.clientX - r.left) * 900) / r.width - b.x) / b.w,
    (((e.clientY - r.top) * 506) / r.height - b.y) / b.h,
  );
};
$("add-observation").onclick = () =>
  addObservation(Number($("image-x").value), Number($("image-y").value));
function renderObservations() {
  $("observations").replaceChildren();
  for (const c of s.calibrations) {
    $("observations").append(
      el(
        "div",
        `${c.id}: ${c.validFrom.toFixed(3)}–${c.validUntil?.toFixed(3) ?? "open"}s · ${c.landmarks.length} landmarks · ${c.status} · landmark record, not a solved camera`,
        "observation",
      ),
    );
  }
  for (const o of s.observations) {
    const row = el("div", undefined, "observation");
    row.append(
      el(
        "b",
        `${o.kind} · video ${o.videoTime.toFixed(3)}s · rally ${o.rallyTime.toFixed(3)}s`,
      ),
      el(
        "div",
        `Image (${o.x.toFixed(3)}, ${o.y.toFixed(3)}) · ${o.note} · ${o.calibrationId || "uncalibrated"}`,
      ),
    );
    const seek = el("button", "Go to frame");
    seek.onclick = () => {
      const v = $("video");
      v.pause();
      if (v.src) v.currentTime = o.videoTime;
      time = Math.max(0, Math.min(s.duration, o.rallyTime));
      playing = false;
      $("play").textContent = "▶ Play";
      draw();
    };
    row.append(seek);
    const del = el("button", "Remove");
    del.onclick = () =>
      mutate(() => {
        s.observations = s.observations.filter((x) => x.id !== o.id);
      });
    row.append(del);
    $("observations").append(row);
  }
  drawAnnotations();
}
function drawAnnotations() {
  const canvas = $("annotations"),
    c = canvas.getContext("2d");
  c.clearRect(0, 0, 900, 506);
  if (!$("video").src) {
    c.fillStyle = "#91adbf";
    c.font = "18px system-ui";
    c.textAlign = "center";
    c.fillText("Load a local clip to begin", 450, 240);
    return;
  }
  const b = imageBounds();
  for (const o of s.observations.filter(
    (o) => Math.abs(o.videoTime - $("video").currentTime) < 0.15,
  )) {
    c.fillStyle = "#ffe075";
    c.beginPath();
    c.arc(b.x + o.x * b.w, b.y + o.y * b.h, 6, 0, 7);
    c.fill();
    c.font = "13px system-ui";
    c.textAlign = "left";
    c.fillText(o.kind + ": " + o.note, b.x + o.x * b.w + 10, b.y + o.y * b.h);
  }
}
$("export-video").onclick = async () => {
  if (!canExport(s)) {
    notice("Review and confirm this revision before exporting.");
    return;
  }
  const mime = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ].find((x) => window.MediaRecorder?.isTypeSupported(x));
  if (!mime || !$("scene").captureStream) {
    notice(
      "This browser cannot record canvas WebM. Use a current Chromium browser.",
    );
    return;
  }
  exporting = true;
  exportCancelled = false;
  playing = false;
  renderUI();
  const revision = s.revision,
    oldTime = time,
    stream = $("scene").captureStream(30),
    chunks = [],
    r = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 2500000,
    });
  r.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const done = new Promise((resolve, reject) => {
    r.onstop = resolve;
    r.onerror = reject;
  });
  r.start();
  notice(
    "Recording the actual 3D canvas in real time. Escape cancels and discards the export.",
  );
  const start = performance.now();
  await new Promise((resolve) => {
    function frame(now) {
      time = Math.min(s.duration, (now - start) / 1000);
      draw();
      if (exportCancelled || time >= s.duration) resolve();
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  r.stop();
  await done;
  stream.getTracks().forEach((t) => t.stop());
  exporting = false;
  time = oldTime;
  renderUI();
  if (exportCancelled || s.revision !== revision) {
    notice("Interrupted export discarded.");
    return;
  }
  const blob = new Blob(chunks, { type: mime });
  download(blob, `volleyupcast-${s.approval.mode}-rev${revision}.webm`);
  $("export-status").textContent =
    `Playable WebM recorded (${Math.round(blob.size / 1024)} KB). ${s.approval.mode} mode. No source audio included.`;
  notice(
    "Actual canvas video exported. The file labels illustrative scenes and template motion.",
  );
};
window.addEventListener("beforeunload", () => {
  if (recorder?.state === "recording") recorder.stop();
  if (videoURL) URL.revokeObjectURL(videoURL);
  if (sampleVideoURL) URL.revokeObjectURL(sampleVideoURL);
  if (audioURL) URL.revokeObjectURL(audioURL);
});
function tick(now) {
  const delta = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (playing && !exporting) {
    time += delta * s.clocks.animationRate.value;
    if (time >= s.duration) {
      time = s.duration;
      playing = false;
      $("play").textContent = "▶ Play";
    }
    const video = $("video");
    if (video.src && Number.isFinite(video.duration)) {
      video.pause();
      const vt = Math.max(
        0,
        Math.min(video.duration, time + s.clocks.videoOffset.value),
      );
      if (Math.abs(video.currentTime - vt) > 0.05) video.currentTime = vt;
    }
    draw();
  }
  requestAnimationFrame(tick);
}
try {
  const saved = localStorage.getItem("volleyupcast.scene.v1");
  if (saved) {
    s = parse(saved);
    dirty = !s.sample || s.revision !== s.sample.baselineRevision;
    notice(
      s.sample
        ? "Saved sample draft restored; its packaged clip reconnects automatically. Review again before exporting."
        : "Local draft restored. Reopen personal media and review again before exporting.",
    );
  }
} catch {
  notice("Saved draft could not be restored. Synthetic template loaded.");
}
syncSampleMedia();
renderUI();
if (s.sample) chooseTab(s.sample.kind);
requestAnimationFrame(tick);
