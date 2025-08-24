// src/api/client.js
// Hardwired to your Render backend:
const BASE = "https://lonestarledger2-0.onrender.com";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
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

// Adjust endpoints if your API differs
export const api = {
  listDistricts: () => request("/districts"),
  getDistrict: (id) => request(`/districts/${id}`),
  getCampus: (id) => request(`/campuses/${id}`)
};
