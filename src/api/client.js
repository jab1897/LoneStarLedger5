// src/api/client.js
// Fixed Render base:
const BASE = "https://lonestarledger2-0.onrender.com";

// We’ll auto-detect if your API uses a prefix like /api or /v1
const CANDIDATE_PREFIXES = ["", "/api", "/v1", "/api/v1", "/v1/api"];
let apiPrefix = sessionStorage.getItem("apiPrefix") || null;
let inited = false;

async function probePrefix(prefix) {
  // Try to fetch districts list as a probe; it's read-only and safe.
  // If your API needs a different probe (e.g., /health), we can switch this.
  const url = `${BASE}${prefix}/districts`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return false;
    // quick sanity: array or object acceptable
    await res.json();
    return true;
  } catch {
    return false;
  }
}

async function ensurePrefix() {
  if (inited) return;
  inited = true; // prevent concurrent probes
  if (apiPrefix) return;

  for (const p of CANDIDATE_PREFIXES) {
    const ok = await probePrefix(p);
    if (ok) {
      apiPrefix = p;
      sessionStorage.setItem("apiPrefix", apiPrefix);
      return;
    }
  }
  // If we got here, none matched—fall back to "" so errors surface clearly.
  apiPrefix = "";
}

async function request(path, options = {}) {
  await ensurePrefix();
  const url = `${BASE}${apiPrefix}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

// Public API wrappers
export const api = {
  init: ensurePrefix,
  listDistricts: () => request(`/districts`),
  getDistrict: (id) => request(`/districts/${id}`),
  getCampus: (id) => request(`/campuses/${id}`),
};
