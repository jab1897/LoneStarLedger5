import Papa from "papaparse";

export async function fetchCSV(path) {
  const res = await fetch(path, { cache: "force-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  const text = await res.text();
  if (/^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)) {
    throw new Error(`fetchCSV(${path}) returned HTML — check SPA rewrites or file path.`);
  }
  let parsed;
  try {
    // Keep everything as strings so we do not lose leading zeros on IDs
    parsed = Papa.parse(text, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      worker: true,
      transformHeader: (h) => h.trim(),
      transform: (v) => (typeof v === "string" ? v.trim() : v),
    });
  } catch (e) {
    throw e;
  }
  return Array.isArray(parsed?.data) ? parsed.data : [];
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
