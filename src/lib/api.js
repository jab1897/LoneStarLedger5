export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const DEFAULT_TIMEOUT = 12000;

export async function getJSON(path, { signal } = {}) {
  const ctrl = new AbortController();
  const timeout = setTimeout(()=>ctrl.abort(), DEFAULT_TIMEOUT);
  try {
    const res = await fetch(API_BASE + path, { signal: signal || ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}
