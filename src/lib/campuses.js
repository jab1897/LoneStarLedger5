// src/lib/campuses.js
import Papa from "papaparse";

/** Data locations */
const CAMPUSES_CSV = "/data/Schools_2024_to_2025.csv";

const CAMPUSES_GEOJSON = "/data/Schools_2024_to_2025.geojson";

/** -------- helpers -------- */
const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[-_\s]+/g, "")
    .replace(/[^a-z0-9]/g, "");

const canonId = (v) =>
  String(v ?? "")
    .replace(/['"]/g, "")
    .replace(/\D/g, "")        // digits only
    .replace(/^0+/, "");       // strip leading zeros

function buildHeaderMap(row) {
  // de-duplicate headers Papa may rename: "Foo","Foo-1"
  const m = new globalThis.Map();
  for (const k of Object.keys(row || {})) {
    const base = k.replace(/-\d+$/, "");
    const nk = norm(base);
    if (!m.has(nk)) m.set(nk, k);
  }
  return m;
}

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

function toNumSafe(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const s = String(v).replace(/[\$,]/g, "");
  const n = Number(s);
  return Number.isNaN(n) ? NaN : n;
}

/** -------- CSV loader (keeps leading zeros) -------- */
let _campCache = null;

async function loadCampusesCSV() {
  if (_campCache) return _campCache;

  const text = await fetch(CAMPUSES_CSV, { cache: "force-cache" }).then((r) => {
    if (!r.ok) throw new Error(`Campus CSV fetch ${r.status}: ${CAMPUSES_CSV}`);
    return r.text();
  });

  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: false,   // keep IDs as strings
    skipEmptyLines: true,
    worker: false,
  });
  if (parsed.errors?.length) {
    console.warn("[Campuses] CSV parse warnings:", parsed.errors.slice(0, 3));
  }

  const rows = parsed.data.map((r) => {
    const clean = {};
    for (const k of Object.keys(r)) {
      const nk = String(k).replace(/^\uFEFF/, "").trim(); // drop BOM/space
      clean[nk] = r[k];
    }
    return clean;
  });

  const row0 = rows.find((r) => Object.keys(r).length) || {};
  const hdr = buildHeaderMap(row0);

  // Detect important headers (aliases + fuzzy)
  const fields = {
    DISTRICT_ID: bestHeader(
      row0,
      [
        "USER_District_Number",
        "DISTRICT_N",
        "DISTRICT_ID",
        "LEAID",
        "LEA",
        "LEA CODE",
        "LEA_ID",
      ],
      [/district.*(number|id|code)/i, /\blea(\s*id|\s*code)?\b/i]
    ),
    DISTRICT_NAME: bestHeader(
      row0,
      ["District Name", "DISTRICT", "DISTNAME", "LEA_NAME", "LEA NAME"],
      [/district.*name/i, /lea.*name/i]
    ),
    CAMPUS_ID: bestHeader(
      row0,
      [
        "USER_School_Number",
        "USER_Campus_Number",
        "CAMPUS_ID",
        "Campus ID",
        "SCHOOL_NUMBER",
        "SCHOOL ID",
        "School Number",
        "Column2",
      ],
      [/campus.*(id|number)/i, /school.*(id|number)/i]
    ),
    CAMPUS_NAME: bestHeader(
      row0,
      ["USER_School_Name", "Campus Name", "CAMPUS_NAME", "SCHOOL_NAME", "NAME"],
      [/campus.*name/i, /school.*name/i]
    ),
    CAMPUS_SCORE: bestHeader(
      row0,
      ["Campus Score", "CAMPUS_SCORE", "CampusScore", "SCORE", "RATING", "GRADE"],
      [/score/i, /rating/i, /grade/i]
    ),
    CAMPUS_GRADE: bestHeader(
      row0,
      ["Campus Grade", "CAMPUS_GRADE", "Grade", "CAMPUS_GRADE_L"],
      [/campus.*grade/i]
    ),
    GRADES: bestHeader(
      row0,
      ["Grades", "GRADE_RANGE", "USER_Grade_Range"],
      [/grade.*range/i, /^grades?$/i]
    ),
    ENROLLMENT: bestHeader(
      row0,
      ["Enrollment", "ENROLLMENT"],
      [/enroll/i]
    ),
    READING_OGR: bestHeader(
      row0,
      ["Reading OGL", "Reading On Grade-Level", "READING_OGL", "READING OGL"],
      [/read.*(on.*grade|ogl)/i]
    ),
    MATH_OGR: bestHeader(
      row0,
      ["Math OGL", "MATH_OGL", "Math On Grade-Level", "MATH OGL"],
      [/math.*(on.*grade|ogl)/i]
    ),
    READING_NOT: bestHeader(
      row0,
      [
        "Reading Not On Grade-Level",
        "Reading Not on Grade-Level",
        "READING_NOT_GL",
        "READING_NOT_OGR",
        "Share of Students Not on Grade-Level: Reading",
      ],
      [/read.*not.*grade/i]
    ),
    MATH_NOT: bestHeader(
      row0,
      [
        "Math Not On Grade-Level",
        "Math Not on Grade-Level",
        "MATH_NOT_GL",
        "MATH_NOT_OGR",
        "Share of Students Not on Grade-Level: Math",
      ],
      [/math.*not.*grade/i]
    ),
    ATTEND_RATE: bestHeader(
      row0,
      ["Attendance Rate", "ATTENDANCE_RATE"],
      [/attendance/i]
    ),
    CHRONIC_ABS: bestHeader(
      row0,
      [
        "Chronic Absenteeism Rate",
        "Chronic Absenteeism",
        "CHRONIC_ABSENTEEISM_RATE",
      ],
      [/absentee/i]
    ),
    TEACHER_COUNT: bestHeader(
      row0,
      ["Teacher Count", "TEACHERS", "TEACHER_COUNT"],
      [/teacher.*count/i]
    ),
    ADMIN_COUNT: bestHeader(
      row0,
      ["Admin Count", "ADMIN_COUNT", "Administrators"],
      [/admin.*count/i]
    ),
    AVG_ADMIN_SAL: bestHeader(
      row0,
      ["Average Admin Salary", "ADMIN_AVG_SALARY", "AVG_ADMIN_SAL"],
      [/admin.*salary/i]
    ),
    AVG_TEACH_SAL: bestHeader(
      row0,
      ["Average Teacher Salary", "TEACHER_AVG_SALARY", "AVG_TEACH_SAL"],
      [/teacher.*salary/i]
    ),
  };

  // Resolve to *actual* keys present (using the header map)
  for (const k of Object.keys(fields)) {
    const label = fields[k];
    fields[k] = label ? hdr.get(norm(label)) || label : null;
  }

  _campCache = { rows, fields };
  return _campCache;
}

/** -------- public API -------- */

export async function getAllCampuses() {
  // convenience for listing page
  return loadCampusesCSV();
}

export async function getCampusesForDistrict(districtId) {
  const want = canonId(districtId);
  const { rows, fields } = await loadCampusesCSV();
  const kDist = fields.DISTRICT_ID;
  if (!kDist) return { rows: [], fields };

  let list = rows.filter((r) => r?.[kDist] != null && canonId(r[kDist]) === want);

  // Sort campuses by score (lowest first) but keep rows lacking scores
  const kScore = fields.CAMPUS_SCORE;
  if (kScore) {
    list = list.sort((a, b) => {
      const A = toNumSafe(a[kScore]);
      const B = toNumSafe(b[kScore]);
      const aVal = Number.isFinite(A) && A > 0 ? A : Infinity;
      const bVal = Number.isFinite(B) && B > 0 ? B : Infinity;
      return aVal - bVal;
    });
  }
  return { rows: list, fields };
}

export async function getCampusById(campusId) {
  const want = canonId(campusId);
  const { rows, fields } = await loadCampusesCSV();
  const kId = fields.CAMPUS_ID;
  const row = kId ? rows.find((r) => canonId(r[kId]) === want) : null;
  return { row: row || null, fields };
}

export async function getCampusFeatureById(campusId) {
  const want = canonId(campusId);

  if (CAMPUSES_GEOJSON) {
    try {
      const fc = await fetch(CAMPUSES_GEOJSON, { cache: "force-cache" }).then((r) => r.json());
      const keys = [
        "CAMPUS_ID",
        "CAMPUS",
        "CAMPUS_N",
        "USER_School_Number",
        "School Number",
        "SCHOOL_NUMBER",
        "ID",
      ];
      const feat = (fc.features || []).find((f) => {
        const p = f.properties || {};
        return keys.some((k) => p[k] != null && canonId(p[k]) === want);
      });
      if (feat) return feat;
    } catch (e) {
      console.warn("[Campuses] campus GeoJSON load failed:", e);
    }
  }

  // fallback: synthesize from CSV if lat/lon exist
  const { rows, fields } = await loadCampusesCSV();
  const row0 = rows[0] || {};
  const latKey =
    bestHeader(row0, ["LAT", "Latitude", "Y"], [/^lat$/i, /latitude/i]) || null;
  const lonKey =
    bestHeader(row0, ["LON", "LONG", "Longitude", "X"], [/^lon$|^lng$/i, /long/i, /longitude/i]) || null;

  const kId = fields.CAMPUS_ID;
  if (!latKey || !lonKey || !kId) return null;
  const row = rows.find(
    (r) => r[latKey] && r[lonKey] && canonId(r[kId]) === want
  );
  if (!row) return null;

  return {
    type: "Feature",
    properties: {
      CAMPUS_ID: fields.CAMPUS_ID ? row[fields.CAMPUS_ID] : "",
      CAMPUS_NAME: fields.CAMPUS_NAME ? row[fields.CAMPUS_NAME] : "",
      CAMPUS_SCORE: fields.CAMPUS_SCORE ? row[fields.CAMPUS_SCORE] : "",
    },
    geometry: {
      type: "Point",
      coordinates: [Number(row[lonKey]), Number(row[latKey])],
    },
  };
}

export async function getCampusFeaturesForDistrict(districtId) {
  // Prefer point GeoJSON if provided; else synthesize from CSV lat/lon (if present)
  const want = canonId(districtId);

  if (CAMPUSES_GEOJSON) {
    try {
      const fc = await fetch(CAMPUSES_GEOJSON, { cache: "force-cache" }).then((r) => r.json());
      const keys = [
        "DISTRICT_N", "DISTRICT_ID", "LEAID", "LEA", "USER_District_Number",
      ];
      const feats = (fc.features || []).filter((f) => {
        const p = f.properties || {};
        return keys.some((k) => p[k] != null && canonId(p[k]) === want);
      });
      if (feats.length) {
        return { type: "FeatureCollection", features: feats };
      }
    } catch (e) {
      console.warn("[Campuses] campus GeoJSON load failed:", e);
    }
  }

  // fallback: synthesize points from CSV if lat/lon exist
  const { rows, fields } = await loadCampusesCSV();
  const row0 = rows[0] || {};
  const latKey =
    bestHeader(row0, ["LAT", "Latitude", "Y"], [/^lat$/i, /latitude/i]) || null;
  const lonKey =
    bestHeader(row0, ["LON", "LONG", "Longitude", "X"], [/^lon$|^lng$/i, /long/i, /longitude/i]) || null;

  if (!latKey || !lonKey || !fields.DISTRICT_ID) return null;

  const pts = rows
    .filter((r) => canonId(r[fields.DISTRICT_ID]) === want)
    .filter((r) => r[latKey] && r[lonKey])
    .map((r) => ({
      type: "Feature",
      properties: {
        CAMPUS_ID: fields.CAMPUS_ID ? r[fields.CAMPUS_ID] : "",
        CAMPUS_NAME: fields.CAMPUS_NAME ? r[fields.CAMPUS_NAME] : "",
        CAMPUS_SCORE: fields.CAMPUS_SCORE ? r[fields.CAMPUS_SCORE] : "",
      },
      geometry: {
        type: "Point",
        coordinates: [Number(r[lonKey]), Number(r[latKey])],
      },
    }));

  return pts.length
    ? { type: "FeatureCollection", features: pts }
    : null;
}
