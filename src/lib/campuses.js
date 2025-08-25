// src/lib/campuses.js
import Papa from "papaparse";

/** ENV expected:
 *  VITE_CAMPUSES_CSV      -> /data/Schools_2024_to_2025.csv
 *  VITE_CAMPUSES_GEOJSON  -> /data/Schools_2024_to_2025.geojson
 */

// Likely column names (exact names first, fallbacks after)
const KEYS = {
  CAMPUS_ID: ["CAMPUS_ID", "CAMPUS", "CDN", "CAMPUSCODE", "ID"],
  CAMPUS_NAME: ["CAMPUS_NAME", "NAME", "SCHOOL_NAME"],
  DISTRICT_ID: ["DISTRICT_N", "DISTRICT_ID", "DISTRICTCODE", "DISTRICT"],

  READING_OGR: ["Reading On Grade-Level", "READING_ON_GRADE_LEVEL", "READ_ON_GRADE"],
  MATH_OGR: ["Math On Grade-Level", "MATH_ON_GRADE_LEVEL", "MATH_ON_GRADE"],
  TEACHER_COUNT: ["Teacher Count", "TEACHER_COUNT", "TEACHERS"],
  ADMIN_COUNT: ["Admin Count", "ADMIN_COUNT", "ADMINS"],

  AVG_ADMIN_SAL: ["Average Admin Salary", "AVG_ADMIN_SALARY", "ADMIN_SALARY_AVG"],
  AVG_TEACH_SAL: ["Average Teacher Salary", "AVG_TEACHER_SALARY", "TEACHER_SALARY_AVG"],

  CAMPUS_GRADE: ["Campus Grade", "CAMPUS_GRADE", "GRADE"],
  CAMPUS_SCORE: ["Campus Score", "CAMPUS_SCORE", "SCORE"],
};

const NUM = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(String(v).replace(/[\$,]/g, ""));

const pickKey = (row, candidates) => {
  for (const k of candidates) if (k in row) return k;
  return null;
};

let _csvCache = null;

export async function loadCampusesCSV(csvUrl) {
  if (_csvCache) return _csvCache;

  const url = csvUrl || import.meta.env.VITE_CAMPUSES_CSV;
  if (!url) throw new Error("VITE_CAMPUSES_CSV is not set");

  const text = await fetch(url, { cache: "force-cache" }).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch campuses CSV: ${r.status}`);
    return r.text();
  });

  const parsed = Papa.parse(text, { header: true, dynamicTyping: false, skipEmptyLines: true });
  const rows = parsed.data.filter(Boolean).map((r) => {
    const clean = {};
    for (const k of Object.keys(r)) clean[String(k).replace(/^\uFEFF/, "").trim()] = r[k];
    return clean;
  });

  const sample = rows[0] || {};
  const F = {
    CAMPUS_ID: pickKey(sample, KEYS.CAMPUS_ID),
    CAMPUS_NAME: pickKey(sample, KEYS.CAMPUS_NAME),
    DISTRICT_ID: pickKey(sample, KEYS.DISTRICT_ID),
    READING_OGR: pickKey(sample, KEYS.READING_OGR),
    MATH_OGR: pickKey(sample, KEYS.MATH_OGR),
    TEACHER_COUNT: pickKey(sample, KEYS.TEACHER_COUNT),
    ADMIN_COUNT: pickKey(sample, KEYS.ADMIN_COUNT),
    AVG_ADMIN_SAL: pickKey(sample, KEYS.AVG_ADMIN_SAL),
    AVG_TEACH_SAL: pickKey(sample, KEYS.AVG_TEACH_SAL),
    CAMPUS_GRADE: pickKey(sample, KEYS.CAMPUS_GRADE),
    CAMPUS_SCORE: pickKey(sample, KEYS.CAMPUS_SCORE),
  };

  const byId = {};
  for (const r of rows) {
    const id = F.CAMPUS_ID ? String(r[F.CAMPUS_ID]) : "";
    if (id) byId[id] = r;
  }

  const byDistrict = new Map();
  for (const r of rows) {
    const did = F.DISTRICT_ID ? String(r[F.DISTRICT_ID]) : "";
    if (!did) continue;
    if (!byDistrict.has(did)) byDistrict.set(did, []);
    byDistrict.get(did).push(r);
  }

  _csvCache = { rows, fields: F, byId, byDistrict };
  return _csvCache;
}

export async function getCampusesForDistrict(districtId) {
  const { byDistrict, fields } = await loadCampusesCSV();
  return { rows: byDistrict.get(String(districtId)) || [], fields };
}

export async function getCampusById(campusId) {
  const { byId, fields } = await loadCampusesCSV();
  return { row: byId[String(campusId)] || null, fields };
}

// ---- GEOJSON ----
let _geoCache = null;

export async function loadCampusesGeoJSON(geoUrl) {
  if (_geoCache) return _geoCache;
  const url = geoUrl || import.meta.env.VITE_CAMPUSES_GEOJSON;
  if (!url) throw new Error("VITE_CAMPUSES_GEOJSON is not set");
  const fc = await fetch(url, { cache: "force-cache" }).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch campuses GeoJSON: ${r.status}`);
    return r.json();
  });
  _geoCache = fc;
  return _geoCache;
}

export async function getCampusFeaturesForDistrict(districtId) {
  const fc = await loadCampusesGeoJSON();
  const id = String(districtId);
  const feats = (fc.features || []).filter((f) => {
    const p = f.properties || {};
    const d = String(p.DISTRICT_N ?? p.DISTRICT_ID ?? p.DISTRICT ?? "");
    return d === id;
  });
  return { type: "FeatureCollection", features: feats };
}

export async function getCampusFeatureById(campusId) {
  const fc = await loadCampusesGeoJSON();
  const id = String(campusId);
  const f = (fc.features || []).find((f) => {
    const p = f.properties || {};
    const c = String(p.CAMPUS_ID ?? p.CAMPUS ?? p.ID ?? "");
    return c === id;
  });
  return f || null;
}
