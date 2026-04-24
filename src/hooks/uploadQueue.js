// Offline upload queue — drivers in the field often have flaky cell signal,
// so a freight-bill submission that hits a network error is held in
// localStorage and replayed once we're back online (App-level flusher).
// Queue entry shape: { id, fb, queuedAt, attempts }.
// localStorage limit (~5MB) comfortably fits a few queued submissions —
// photos are pre-compressed to ~100-300KB each.

export const FB_UPLOAD_QUEUE_KEY = "fbt:fbUploadQueue";

export const readUploadQueue = () => {
  try { return JSON.parse(localStorage.getItem(FB_UPLOAD_QUEUE_KEY) || "[]"); }
  catch { return []; }
};

export const writeUploadQueue = (q) => {
  try { localStorage.setItem(FB_UPLOAD_QUEUE_KEY, JSON.stringify(q)); }
  catch (e) { console.warn("upload queue write failed (quota?):", e); }
};

export const enqueueUpload = (fb) => {
  const q = readUploadQueue();
  const entry = {
    id: "q-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    fb,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };
  q.push(entry);
  writeUploadQueue(q);
  return entry.id;
};

export const removeFromUploadQueue = (id) => {
  writeUploadQueue(readUploadQueue().filter((e) => e.id !== id));
};
