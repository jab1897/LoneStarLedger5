export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const DEFAULT_TIMEOUT = 12000;

export async function getJSON(path, { signal } = {}) {
  const timeoutSignal = AbortSignal.timeout(DEFAULT_TIMEOUT);
  const combined = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;
  const res = await fetch(API_BASE + path, { signal: combined });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
