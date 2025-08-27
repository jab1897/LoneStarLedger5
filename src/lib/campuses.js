// src/lib/campuses.js
import { fetchCSV } from "./staticData";

// ENV (falls back to public/data)
const CAMPUSES_CSV =
  import.meta.env.VITE_CAMPUSES_CSV || "/data/Schools_2024_to_2025.csv";

// ────────────────────────────────────────────────────────────────────────────
// utilities
const norm = (s) => String(s || "").toLowerCase().replace(/[-_ ]+/g, "").replace(/[^a-z0-9]/g, "");
const canon = (v) => String(v ?? "").replace(/['"]/g, "").replace(/\D/g, "").replace(/^0+/, "");

/** Pick best header using exact aliases first, then fuzzy regex. */
function bestHeader(row0, aliases = [], fuzzy = []) {
  const keys = Object.keys(row0 || {});
  const byNorm = new globalThis.Map(keys.map((k) => [norm(k), k]));
  for (const a of aliases) {
    const k = byNorm.get(norm(a));
    if (k) return k;
  }
  if (fuzzy?.length) {
    for (const k of keys) {
      const raw = k.toLowerCase();
      if (fuzzy.some((re) => re.test(raw))) return k;
    }
  }
  return null;
}

function detectFields(row0) {
  // District, Campus, Names, Scores + useful KPIs
  const DISTRICT_ID = bestHeader(
    row0,
    [
      "USER_District_Number",
      "USER District Number",
      "DISTRICT_N",
      "DISTRICT_ID",
      "LEAID",
      "LEA_ID",
      "LEA CODE",
      "LEA",
    ],
    [/district.*(number|id|code)/i, /\blea\b/i, /lea.*(id|code)/i]
  );

  const CAMPUS_ID = bestHeader(
    row0,
    [
      "USER_School_Number",
      "USER_Campus_Number",
      "School Number",
      "Campus Number",
      "CAMPUS_ID",
      "CAMPUS_N",
      "SCHOOL_ID",
      "SCHOOL_NUMBER",
    ],
    [/campus.*(id|number)/i, /school.*(id|number)/i]
  );

  const CAMPUS_NAME = bestHeader(
    row0,
    ["USER_School_Name", "CAMPUS_NAME", "Campus Name", "School Name", "NAME"],
    [/campus.*name/i, /school.*name/i]
  );

  const CAMPUS_SCORE = bestHeader(
    row0,
    ["Campus Score", "CAMPUS_SCORE", "CampusScore", "SCORE", "RATING", "OVERALL SCORE"],
    [/score/i, /rating/i, /grade.*score/i]
  );

  const READING_OGR = bestHeader(row0, ["Reading OGL", "READING_OGR", "Reading On Grade Level"], [/read.*on.*grade/i]);
  const MATH_OGR = bestHeader(row0, ["Math OGL", "MATH_OGR", "Math On Grade Level"], [/math.*on.*grade/i]);

  const TEACHER_COUNT = bestHeader(row0, ["Teacher Count", "TEACHER_COUNT", "Teachers"], [/teacher.*count/i]);
  const ADMIN_COUNT = bestHeader(row0, ["Admin Count", "ADMIN_COUNT", "Administrators"], [/admin.*count/i]);

  const AVG_ADMIN_SAL = bestHeader(row0, ["Average Admin Salary", "AVG_ADMIN_SAL"], [/admin.*salary/i]);
  const AVG_TEACH_SAL = bestHeader(row0, ["Average Teacher Salary", "AVG_TEACH_SAL"], [/teacher.*salary/i]);

  const CAMPUS_GRADE = bestHeader(row0, ["Campus Grade", "CAMPUS_GRADE", "GRADE"], [/grade$/i]);

  return {
    DISTRICT_ID,
    CAMPUS_ID,
    CAMPUS_NAME,
    CAMPUS_SCORE,
    READING_OGR,
    MATH_OGR,
    TEACHER_COUNT,
    ADMIN_COUNT,
    AVG_ADMIN_SAL,
    AVG_TEACH_SAL,
    CAMPUS_GRADE,
  };
}

const _cache = { rows: null, fields: null };

/** Load entire campuses CSV once and detect fields */
export async function loadCampuses(csvUrl) {
  if (_cache.rows && _cache.fields) return _cache;
  const url = csvUrl || CAMPUSES_CSV;
  const rows = await fetchCSV(url);
  const row0 = rows[0] || {};
  const fields = detectFields(row0);
  _cache.rows = rows;
  _cache.fields = fields;
  return { rows, fields };
}

/** Get all campuses for a given district (ID canonicalized) */
export async function getCampusesForDistrict(districtId, csvUrl) {
  const { rows, fields } = await loadCampuses(csvUrl);
  const kDist = fields.DISTRICT_ID;
  if (!kDist) return { rows: [], fields };
  const want = canon(districtId);
  let list = rows.filter((r) => r?.[kDist] != null && canon(r[kDist]) === want);

  const kScore = fields.CAMPUS_SCORE;
  if (kScore) {
    list = list.sort((a, b) => {
      const A = Number(String(a[kScore]).replace(/[\$,]/g, ""));
      const B = Number(String(b[kScore]).replace(/[\$,]/g, ""));
      if (Number.isNaN(A) && Number.isNaN(B)) return 0;
      if (Number.isNaN(A)) return 1;
      if (Number.isNaN(B)) return -1;
      return B - A;
    });
  }
  return { rows: list, fields };
}

/** Lookup a single campus by campus id */
export async function getCampusById(campusId, csvUrl) {
  const { rows, fields } = await loadCampuses(csvUrl);
  const kId = fields.CAMPUS_ID;
  if (!kId) return { row: null, fields };
  const want = canon(campusId);
  const row = rows.find((r) => r?.[kId] != null && canon(r[kId]) === want) || null;
  return { row, fields };
}
