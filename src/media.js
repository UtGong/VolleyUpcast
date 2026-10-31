export async function fetchSampleClip(url, signal, fetcher = fetch) {
  const response = await fetcher(url, { signal, cache: "no-cache" });
  if (!response.ok)
    throw Error(`Sample video download failed (HTTP ${response.status})`);
  const blob = await response.blob();
  if (!blob.size) throw Error("Sample video download was empty");
  return blob;
}
export function waitForVideo(video, timeout = 10000) {
  if (video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const clean = () => {
      clearTimeout(timer);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("error", failed);
    };
    const ready = () => {
      clean();
      resolve();
    };
    const failed = () => {
      clean();
      reject(Error("This browser could not decode the sample video"));
    };
    const timer = setTimeout(() => {
      clean();
      reject(Error("Sample video did not become ready; retry the sample"));
    }, timeout);
    video.addEventListener("loadeddata", ready, { once: true });
    video.addEventListener("error", failed, { once: true });
  });
}
