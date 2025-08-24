import Papa from "papaparse";

/** Fetch CSV from /public -> array of objects. Uses worker for large files. */
export async function fetchCSV(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true, worker: true });
  if (parsed.errors?.length) console.warn("CSV parse errors:", parsed.errors.slice(0,3));
  return parsed.data;
}

/** Fetch JSON (GeoJSON) from /public */
export async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return await res.json();
}

/** Build a Map index by key from an array of rows */
export function indexBy(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(String(r[key]), r);
  return m;
}

/** Find matching feature by a property key */
export function findFeatureByProp(geojson, propKey, propValue) {
  const want = String(propValue);
  const feats = geojson?.features || [];
  for (const f of feats) {
    const v = f?.properties?.[propKey];
    if (v != null && String(v) === want) return f;
  }
  return null;
}
