const BASE = import.meta.env.VITE_API_URL;

function assertBase() {
  if (!BASE) {
    throw new Error("VITE_API_URL is not set. Define it in .env and in Vercel project settings.");
  }
}

async function request(path, options = {}) {
  assertBase();
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

// Example endpoints — adjust paths to match your Render API.
export const api = {
  listDistricts: () => request("/districts"),
  getDistrict: (id) => request(`/districts/${id}`),
  getCampus: (id) => request(`/campuses/${id}`)
};

