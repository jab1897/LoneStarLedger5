// src/lib/campuses.js
import { fetchCSV, fetchJSON } from "./staticData";

// Data locations (env first, then public/ fallback)
const CAMPUSES_CSV =
  import.meta.env.VITE_CAMPUSES_CSV || "/data/Schools_2024_to_2025.csv";
const CAMPUSES_GEOJSON =
  import.meta.env.VITE_CAMPUSES_GEOJSON || "/data/Schools_2024_to_2025.geojson";

const _cache = { rows: null, fields: null, byCampusId: null };

// ---------- helpers ----------
const norm = (s) =>
  String(s || "").toLowerCase().replace(/[-_ ]+/g, "").replace(/[^a-z0-9]/g, "");

// Normalize any ID that might contain quotes/spaces/left‑padded zeros.
// e.g. "'015901" -> "15901", 015901 -> "15901"
export const canonId = (v) =>
  String(v ?? "").replace(/['"]/g, "").replace(/\D/g, "").replace(/^0+/, "");

function bestHeader(row0, aliases = [], fuzzy = []) {
  const keys = Object.keys(row0 || {});
  const nm = new Map(keys.map((k) => [norm(k), k]));
  for (const a of aliases) {
    const k = nm.get(norm(a));
    if (k) return k;
  }
  for (const k of keys) {
    const raw = k.toLowerCase();
    if (fuzzy.some((re) => re.test(raw))) return k;
  }
  return null;
}

// One pass to detect the relevant columns in the CSV
function detectFields(row0) {
  return {
    // district id on each campus row
    DISTRICT_ID: bestHeader(
      row0,
      [
        "USER_District_Number",
        "District Number",
        "District_ID",
        "DISTRICT_N",
        "DISTRICT_ID",
        "LEAID",
        "LEA_ID",
        "LEA CODE",
        "LEA",
      ],
      [/district.*(number|id|code)/i, /\blea\b/i, /lea.*id/i, /lea.*code/i]
    ),
    // campus id / code
    CAMPUS_ID: bestHeader(
      row0,
      [
        "USER_School_Number",
        "USER_Campus_Number",
        "Campus ID",
        "CAMPUS_ID",
        "CAMPUS_N",
        "School Number",
        "CAMPUS",
        "SCHOOL_ID",
        "SCHOOL_NUMBER",
      ],
      [/campus.*(id|number)/i, /school.*(id|number)/i]
    ),
    // campus name
    CAMPUS_NAME: bestHeader(
      row0,
      [
        "USER_School_Name",
        "Campus Name",
        "CAMPUS_NAME",
        "NAME",
        "School Name",
        "SCHOOL_NAME",
      ],
      [/campus.*name/i, /school.*name/i]
    ),
    // score / rating (used to sort)
    CAMPUS_SCORE: bestHeader(
      row0,
      ["Campus Score", "CAMPUS_SCORE", "CampusScore", "SCORE", "RATING", "GRADE"],
      [/score/i, /rating/i, /grade/i]
    ),

    // Optional KPIs used on /campus/:id
    READING_OGR: bestHeader(
      row0,
      ["Reading OGL", "READING_OGR", "Reading On Grade-Level"],
      [/reading.*(og|on.?grade)/i]
    ),
    MATH_OGR: bestHeader(
      row0,
      ["Math OGL", "MATH_OGR", "Math On Grade-Level"],
      [/math.*(og|on.?grade)/i]
    ),
    TEACHER_COUNT: bestHeader(
      row0,
      ["Teacher Count", "TEACHER_COUNT"],
      [/teacher.*count/i]
    ),
    ADMIN_COUNT: bestHeader(
      row0,
      ["Admin Count", "ADMIN_COUNT"],
      [/admin.*count/i]
    ),
    AVG_ADMIN_SAL: bestHeader(
      row0,
      ["Average Admin Salary", "AVG_ADMIN_SAL"],
      [/admin.*salary/i]
    ),
    AVG_TEACH_SAL: bestHeader(
      row0,
      ["Average Teacher Salary", "AVG_TEACH_SAL"],
      [/teacher.*salary/i]
    ),
    CAMPUS_GRADE: bestHeader(
      row0,
      ["Campus Grade", "CAMPUS_GRADE", "GRADE"],
      [/campus.*grade/i]
    ),
  };
}

async function loadCSV() {
  if (_cache.rows) return _cache;
  const rows = await fetchCSV(CAMPUSES_CSV);
  const row0 = rows[0] || {};
  const fields = detectFields(row0);

  // Build by-id index for quick lookup
  const idKey = fields.CAMPUS_ID;
  const byCampusId = new Map();
  if (idKey) {
    for (const r of rows) {
      const k = r?.[idKey];
      if (k !== undefined && k !== null && k !== "") {
        byCampusId.set(String(k), r);
        byCampusId.set(canonId(k), r); // also index by canonical numeric form
      }
    }
  }

  _cache.rows = rows;
  _cache.fields = fields;
  _cache.byCampusId = byCampusId;
  return _cache;
}

// ---------- exported API ----------

// Get every campus row (unfiltered) + detected field names
export async function getAllCampuses() {
  const { rows, fields } = await loadCSV();
  return { rows, fields };
}

// Campuses for a given district (id may include left zeros or quotes)
export async function getCampusesForDistrict(districtId) {
  const { rows, fields } = await loadCSV();
  const did = canonId(districtId);
  const k = fields.DISTRICT_ID;
  const filtered = k ? rows.filter((r) => canonId(r?.[k]) === did) : [];
  return { rows: filtered, fields };
}

// Find a single campus by campus id
export async function getCampusById(campusId) {
  const { fields, byCampusId } = await loadCSV();
  const id = String(campusId);
  const cand =
    byCampusId.get(id) ||
    byCampusId.get(canonId(id)) ||
    null;
  return { row: cand, fields };
}

// Return a FeatureCollection of campus points for a district (for the map overlay)
export async function getCampusFeaturesForDistrict(districtId) {
  try {
    const fc = await fetchJSON(CAMPUSES_GEOJSON);
    const feats = (fc?.features || []);
    if (!feats.length) return { type: "FeatureCollection", features: [] };
    const props0 = feats[0]?.properties || {};
    const distKey =
      bestHeader(
        props0,
        ["USER_District_Number", "DISTRICT_N", "DISTRICT_ID", "LEAID", "LEA_ID", "LEA CODE", "LEA"],
        [/district.*(number|id|code)/i, /\blea\b/i, /lea.*id/i, /lea.*code/i]
      ) || "DISTRICT_N";

    const want = canonId(districtId);
    const out = feats.filter((f) => canonId(f?.properties?.[distKey]) === want);
    return { type: "FeatureCollection", features: out };
  } catch {
    return { type: "FeatureCollection", features: [] };
  }
}
