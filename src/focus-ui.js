import { canExport } from "./model.js";
import {
  analyzePlayer,
  LocalWorker,
  audioSamples,
  seekVideo,
} from "./inference-client.js";
import { focusCue, installPerformance, sampleAt, LINKS } from "./focus.js";
export function setupFocus({
  getScene,
  mutate,
  draw,
  notice,
  getTime,
  setTime,
  boardCue,
}) {
  const $ = (id) => document.getElementById(id),
    video = $("video");
  let selecting = false,
    seeds = [],
    media = "",
    job = null,
    pending = null,
    lastTrack = null,
    voiceURL = null;
  const status = (text) => {
    $("focus-status").textContent = text;
    notice(text);
  };
  function controls() {
    $("follow-player").disabled = !!job;
    $("select-player").disabled = !!job;
    $("cancel-inference").disabled = !job;
    $("next-gap").disabled = !!job || !getScene().performance;
    $("apply-focus-cue").disabled = !!job;
    if (!$("stop-record").disabled) {
    } else $("record").disabled = !!job;
    $("transcribe-audio").disabled = !!job || !$("audio").src;
    $("done").disabled = !!job || !!pending;
    $("confirm").disabled =
      !!job || !!pending || getScene().reviewedRevision !== getScene().revision;
    $("confirm-focus").disabled = !pending;
    $("discard-focus").disabled = !pending;
    $("export-video").disabled = !!pending || !!job || !canExport(getScene());
  }
  function cancel() {
    job?.controller?.abort();
    job?.worker?.close();
    job = null;
    $("focus-progress").hidden = true;
    controls();
  }
  function mediaChanged() {
    if (video.src === media) return;
    cancel();
    media = video.src;
    pending = null;
    seeds = [];
    lastTrack = null;
    selecting = false;
    $("focus-start").value = Math.max(0, video.currentTime - 0.8).toFixed(2);
    $("focus-end").value = Math.min(
      video.duration || 3,
      video.currentTime + 2.2,
    ).toFixed(2);
    const track = getScene().performance;
    if (track) {
      seeds = structuredClone(track.seeds.value);
      $("focus-start").value = track.interval.value[0];
      $("focus-end").value = track.interval.value[1];
    }
    status(
      track
        ? "Saved player proposals restored. Reselect only if identity needs repair."
        : "Pause at a clear view, tap the player's torso, then Follow. No manual joint labels required.",
    );
  }
  $("next-gap").onclick = async () => {
    const track = getScene().performance;
    if (!track) {
      status("Generate proposals first.");
      return;
    }
    const current = video.currentTime,
      unclear = track.samples.value.filter((p) => p.state !== "ok");
    const next =
      unclear.find((p) => p.videoTime > current + 0.06) || unclear[0];
    if (!next) {
      status(
        "No model-flagged gaps. Still inspect identity and motion; visibility scores do not guarantee accuracy.",
      );
      return;
    }
    await seekVideo(video, next.videoTime);
    video.scrollIntoView({ block: "center", behavior: "instant" });
    selecting = true;
    status(
      `Source ${next.videoTime.toFixed(3)}s: ${next.reason}. Tap the same player's torso if visible, then rerun.`,
    );
    draw();
  };
  $("select-player").onclick = () => {
    if (!video.src || video.readyState < 2) {
      status("Load a playable clip first.");
      return;
    }
    video.pause();
    setTime(getTime());
    video.scrollIntoView({ block: "center", behavior: "instant" });
    selecting = true;
    status(
      "Tap the selected player's torso in this frame. A later tap repairs the same identity; it does not add another player.",
    );
  };
  function selectPoint(x, y) {
    if (!selecting) return false;
    if (x < 0 || x > 1 || y < 0 || y > 1) return true;
    const t = video.currentTime;
    seeds = seeds.filter((p) => Math.abs(p.time - t) > 0.08);
    seeds.push({ x, y, time: t });
    seeds.sort((a, b) => a.time - b.time);
    selecting = false;
    if (seeds.length === 1) {
      $("focus-start").value = Math.max(0, t - 0.8).toFixed(2);
      $("focus-end").value = Math.min(video.duration, t + 1.4).toFixed(2);
    }
    status(
      `Player selected at ${t.toFixed(3)}s · ${seeds.length} identity anchor(s). Adjust the interval if needed, then Follow.`,
    );
    draw();
    return true;
  }
  async function follow() {
    if (job) return;
    setTime(getTime());
    if (pending) {
      status("Confirm or discard the current variation first.");
      return;
    }
    const controller = new AbortController(),
      token = { controller };
    job = token;
    controls();
    $("focus-progress").hidden = false;
    const revision = getScene().revision,
      selection = {
        start: Number($("focus-start").value),
        end: Number($("focus-end").value),
        label: $("focus-label").value,
        seeds: structuredClone(seeds),
      };
    video.pause();
    try {
      const track = await analyzePlayer(
        video,
        selection,
        (p) => {
          if (job !== token) return;
          $("focus-progress").value = p.done / p.total;
          $("focus-status").textContent =
            `${p.stage} · ${p.done}/${p.total} frames`;
        },
        controller.signal,
      );
      if (job !== token || controller.signal.aborted) return;
      if (getScene().revision !== revision)
        throw Error(
          "Scene changed during analysis. Rerun for the current clip.",
        );
      job = null;
      mutate(() => installPerformance(getScene(), track));
      setTime(0);
      await seekVideo(video, selection.start);
      draw();
      const valid = track.samples.value.filter((p) => p.state !== "gap").length,
        gaps = track.samples.value.length - valid;
      status(
        `Proposed ${valid} source-linked frames for ${selection.label}; ${gaps} gaps. Inspect both arms, legs and identity against the overlay. Low visibility is an estimate, not accuracy. Review in illustrative mode before export.`,
      );
    } catch (e) {
      if (job === token) status(e.message);
    } finally {
      if (job === token) job = null;
      if (!job) $("focus-progress").hidden = true;
      controls();
    }
  }
  $("follow-player").onclick = follow;
  $("cancel-inference").onclick = () => {
    cancel();
    status("Processing cancelled. The previous scene is preserved.");
    draw();
  };
  function instruction(text) {
    if (job) return;
    const scene = getScene();
    if (!scene.videoBinding && boardCue) {
      boardCue(text);
      return;
    }
    const sourceTime = scene.performance
        ? getTime() + scene.clocks.videoOffset.value
        : video.currentTime,
      plan = focusCue(text, sourceTime);
    $("focus-choices").replaceChildren();
    if (plan.analyze) {
      follow();
      return;
    }
    if (plan.question) {
      $("focus-cue-status").textContent = plan.question;
      for (const choice of plan.choices) {
        const button = document.createElement("button");
        button.textContent = choice;
        button.onclick = () => {
          if (/position|angle/i.test(choice)) {
            $("focus-cue-status").textContent =
              "This prototype can preview hand height or timing. For position or hand angle, describe the desired motion in the notes; no ungrounded change was applied.";
          } else {
            $("focus-cue").value = choice;
            instruction(choice);
          }
        };
        $("focus-choices").append(button);
      }
      return;
    }
    if (!scene.performance) {
      status(
        "Follow the selected player first so the cue has a source-linked target.",
      );
      return;
    }
    pending = plan.correction;
    $("focus-cue-status").textContent =
      plan.description +
      " Preview only; confirm to keep this variation. Original observations are preserved.";
    controls();
    draw();
  }
  $("apply-focus-cue").onclick = () => instruction($("focus-cue").value);
  $("confirm-focus").onclick = () => {
    if (!pending) return;
    const correction = pending;
    pending = null;
    mutate(() => getScene().performance.corrections.value.push(correction));
    $("focus-cue-status").textContent =
      "Coach variation confirmed. Review/export approval was invalidated. Undo restores the previous version.";
    controls();
    draw();
  };
  $("discard-focus").onclick = () => {
    pending = null;
    $("focus-cue-status").textContent =
      "Preview discarded; source proposals unchanged.";
    controls();
    draw();
  };
  async function transcribe(blob) {
    try {
      await transcribeLocal(blob);
    } catch (e) {
      $("speech-status").textContent =
        `Local speech unavailable: ${e.message}. Type the instruction instead.`;
    }
  }
  async function transcribeLocal(blob) {
    if (job) {
      status("Finish or cancel the current processing first.");
      return;
    }
    const worker = new LocalWorker("./speech-worker.js", (p) => {
        $("speech-status").textContent =
          `Loading local speech model: ${p.file || p.status} ${p.progress ? Math.round(p.progress) + "%" : ""}`;
      }),
      token = { worker };
    job = token;
    controls();
    try {
      $("speech-status").textContent = "Decoding local audio…";
      const audio = await audioSamples(blob);
      let energy = 0;
      for (const x of audio) energy += x * x;
      if (audio.length < 3200 || Math.sqrt(energy / audio.length) < 0.0015)
        throw Error(
          "No usable speech detected. Record a short clear instruction or type it.",
        );
      await worker.call({ type: "init" });
      $("speech-status").textContent = "Transcribing on this device…";
      const result = await worker.call({ type: "transcribe", audio }, [
        audio.buffer,
      ]);
      if (job !== token) return;
      if (!result.text.trim())
        throw Error(
          "No transcript returned. Type the instruction or try clearer audio.",
        );
      job = null;
      mutate(() => {
        getScene().transcript = {
          value: result.text.trim(),
          status: "inferred-awaiting-review",
          source:
            "Local Whisper tiny.en transcription; coach must check the wording",
        };
      });
      $("focus-cue").value = result.text.trim();
      $("speech-status").textContent =
        "Local transcript ready. Check the words, then Use transcript as player instruction. No audio was uploaded.";
    } catch (e) {
      if (job === token) $("speech-status").textContent = e.message;
    } finally {
      worker.close();
      if (job === token) job = null;
      controls();
      draw();
    }
  }
  let voiceBlob = null;
  $("voice-file").onchange = async () => {
    const f = $("voice-file").files[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      $("speech-status").textContent =
        "Use a voice note below 20 MB and 60 seconds, or type the instruction.";
      return;
    }
    voiceBlob = f;
    if (voiceURL) URL.revokeObjectURL(voiceURL);
    voiceURL = URL.createObjectURL(f);
    $("audio").src = voiceURL;
    $("transcribe-audio").disabled = false;
    await transcribe(f);
  };
  $("transcribe-audio").onclick = () => voiceBlob && transcribe(voiceBlob);
  $("use-voice").onclick = () => {
    $("focus-cue").value = $("transcript").value;
    instruction($("transcript").value);
  };
  function render() {
    const track = getScene().performance;
    if (track !== lastTrack) {
      pending = null;
      lastTrack = track;
    }
    const focused = !!track;
    $("contact").closest("section").hidden = focused;
    $("scene").setAttribute(
      "aria-label",
      focused
        ? "Source-linked selected-player 3D body proposal"
        : "3D projected volleyball court with template human motion",
    );
    document.querySelector(".preview h2").textContent = focused
      ? "Selected-player 3D preview"
      : "3D court preview";
    const hint = document.querySelector(".preview .hint");
    if (hint)
      hint.textContent = focused
        ? "Model-estimated body pose · image-space root travel · no calibrated court/floor or ball"
        : "Articulated template motion · illustrative arcs · 2.43m net · no biomechanical accuracy claim";
    const motion = document.querySelector(".motion-panel");
    if (motion) motion.hidden = focused;
    controls();
  }
  function overlay(c, b) {
    const track = getScene().performance,
      sample = track && sampleAt(track, video.currentTime);
    c.save();
    if (sample) {
      c.lineWidth = 3;
      for (const [a, d] of LINKS) {
        const p = sample.points[a],
          q = sample.points[d];
        c.strokeStyle =
          Math.min(p.visibility, q.visibility) < 0.5 ? "#ffa35c" : "#62ffe0";
        c.beginPath();
        c.moveTo(b.x + p.x * b.w, b.y + p.y * b.h);
        c.lineTo(b.x + q.x * b.w, b.y + q.y * b.h);
        c.stroke();
      }
      for (const p of sample.points) {
        c.fillStyle = p.visibility < 0.5 ? "#ffa35c" : "#62ffe0";
        c.beginPath();
        c.arc(b.x + p.x * b.w, b.y + p.y * b.h, 3, 0, 7);
        c.fill();
      }
    }
    for (const seed of seeds) {
      if (Math.abs(seed.time - video.currentTime) > 0.1) continue;
      c.strokeStyle = "#fff283";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(b.x + seed.x * b.w, b.y + seed.y * b.h, 13, 0, 7);
      c.stroke();
    }
    if (track && !sample) {
      c.fillStyle = "#ffdc83";
      c.font = "bold 17px system-ui";
      c.fillText("Tracking gap · seek a clear frame and reselect", 25, 35);
    }
    c.restore();
  }
  window.addEventListener("beforeunload", () => {
    cancel();
    if (voiceURL) URL.revokeObjectURL(voiceURL);
  });
  return {
    get busy() {
      return !!job;
    },
    get pending() {
      return !!pending;
    },
    cancel,
    async startExample() {
      seeds = [{ x: 0.595, y: 0.575, time: 1.8 }];
      $("focus-label").value = "Near-court receiver";
      $("focus-start").value = 1.5;
      $("focus-end").value = 2.7;
      await seekVideo(video, 1.8);
      setTime(0);
      await follow();
    },
    clearPreview() {
      if (pending) {
        pending = null;
        $("focus-cue-status").textContent =
          "Unconfirmed variation cleared by a scene edit.";
      }
    },
    selectPoint,
    mediaChanged,
    overlay,
    render,
    preview(scene) {
      if (!pending || !scene.performance) return scene;
      const copy = structuredClone(scene);
      copy.performance.corrections.value.push(pending);
      return copy;
    },
    async recorded(blob) {
      voiceBlob = blob;
      $("transcribe-audio").disabled = false;
      await transcribe(blob);
    },
  };
}
