import { parseCSV } from "./csvUtils";

function dbgOn() {
  if (import.meta?.env?.DEV) return true;
  try {
    const usp = new URLSearchParams(window.location.search);
    return usp.get("debug") === "csv";
  } catch { return false; }
}

async function head(url) {
  try { const r = await fetch(url, { method: "HEAD", cache: "no-store" }); return r.status; }
  catch { return 0; }
}
async function get(url) {
  try {
    const r = await fetch(url, { method: "GET", cache: "no-store" });
    const text = r.ok ? await r.text() : null;
    return { ok: r.ok, status: r.status, text };
  } catch { return { ok: false, status: 0, text: null }; }
}

/**
 * Fetch CSV rows from a public asset path like "/data/home/superintendents.csv".
 * Returns an array of row objects keyed by header names.
 */
export async function fetchCSV(path) {
  // Build candidate URLs in order of preference
  const rawBase = import.meta.env.BASE_URL || "/";
  const base = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
  const asAbs = (p) => (p.startsWith("/") ? p : "/" + p);
  const primary = base + asAbs(path);
  const cacheBust = `${primary}${primary.includes("?") ? "&" : "?"}v=${Date.now()}`;
  const fallbackPublic = base + asAbs(path.startsWith("/") ? "public" + path : "public/" + path);

  const tried = [];
  let okUrl = null, bytes = 0, hStatus = 0, gStatus = 0, text = null;

  for (const url of [primary, cacheBust, fallbackPublic]) {
    tried.push(url);
    hStatus = await head(url);
    const g = await get(url);
    gStatus = g.status;
    if (g.ok && g.text) {
      okUrl = url; text = g.text; bytes = g.text.length;
      break;
    }
  }

  if (dbgOn()) {
    console.info("[fetchCSV] diag", {
      requested: path,
      tried,
      okUrl,
      headStatus: hStatus,
      getStatus: gStatus,
      bytes,
      origin: typeof window !== "undefined" ? window.location.origin : "",
      baseUrl: import.meta.env.BASE_URL || "/",
    });
    if (okUrl === fallbackPublic) {
      console.warn("[fetchCSV] WARNING: only /public/... URL succeeded. At runtime you should fetch /data/... not /public/...");
    }
  }

  if (!okUrl || !text) return [];

  const { rows } = parseCSV(text);
  return rows;
}

export async function fetchJSON(path) {
  const res = await fetch(path, { cache: "force-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return await res.json();
}

export function indexBy(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(String(r[key]), r);
  return m;
}

export function findFeatureByProp(geojson, propKey, propValue) {
  const want = String(propValue);
  const feats = geojson?.features || [];
  for (const f of feats) {
    const v = f?.properties?.[propKey];
    if (v != null && String(v) == want) return f;
  }
  return null;
}
