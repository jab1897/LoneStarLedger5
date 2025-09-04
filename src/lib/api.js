export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const DEFAULT_TIMEOUT = 12000;

export async function getJSON(path, { signal } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, DEFAULT_TIMEOUT);

  function onAbort() {
    ctrl.abort();
  }
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", onAbort);
  }

  try {
    const res = await fetch(API_BASE + path, { signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}
