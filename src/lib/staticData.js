import Papa from "papaparse";

export async function fetchCSV(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  const text = await res.text();
  // Keep everything as strings so we do not lose leading zeros on IDs
  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
    worker: true,
  });
  if (parsed.errors?.length) console.warn("CSV parse errors:", parsed.errors.slice(0, 3));
  return parsed.data;
}

export async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return await res.json();
}

// Remove left padding zeros for canonical matching
function canonId(v) {
  const s = String(v ?? "");
  return s.replace(/^0+/, "");
}

export function indexBy(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const raw = String(r[key]);
    const can = canonId(raw);
    m.set(raw, r);
    if (can !== raw) m.set(can, r);
  }
  return m;
}

export function findFeatureByProp(geojson, propKey, propValue) {
  const want = String(propValue);
  const wantCanon = canonId(want);
  const feats = geojson?.features || [];
  for (const f of feats) {
    const v = f?.properties?.[propKey];
    if (v != null) {
      const s = String(v);
      if (s === want || canonId(s) === wantCanon) return f;
    }
  }
  return null;
}
