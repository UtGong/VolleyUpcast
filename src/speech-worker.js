import { pipeline, env } from "../vendor/transformers/transformers.web.min.js";
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = new URL("../models/", import.meta.url).pathname;
env.useBrowserCache = true;
env.useWasmCache = false;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;
env.backends.onnx.wasm.wasmPaths = {
  mjs: new URL("../vendor/ort/ort-wasm-simd-threaded.mjs", import.meta.url)
    .href,
  wasm: new URL("../vendor/ort/ort-wasm-simd-threaded.wasm", import.meta.url)
    .href,
};
let recognizer;
self.onmessage = async ({ data }) => {
  try {
    recognizer ??= pipeline("automatic-speech-recognition", "whisper-tiny.en", {
      device: "wasm",
      dtype: "q8",
      local_files_only: true,
      progress_callback: (p) =>
        self.postMessage({
          id: data.id,
          type: "progress",
          status: p.status,
          file: p.file,
          progress: p.progress,
        }),
    });
    const task = await recognizer;
    if (data.type === "init") {
      self.postMessage({ id: data.id, type: "ready" });
      return;
    }
    const result = await task(data.audio, {
      chunk_length_s: 20,
      stride_length_s: 3,
      return_timestamps: false,
      max_new_tokens: 128,
    });
    self.postMessage({ id: data.id, type: "transcript", text: result.text });
  } catch (e) {
    recognizer = null;
    self.postMessage({
      id: data.id,
      type: "error",
      message: e.message || String(e),
    });
  }
};
