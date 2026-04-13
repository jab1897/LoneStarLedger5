// src/lib/districtSpendingTimeline.js
// Loads and aggregates spending/enrollment time-series data for a single
// district. Caches CSVs in module-level state so repeated district navigations
// are cheap (Spending_By_Object_Long.csv is ~14MB — we parse it once).

import Papa from "papaparse";
import {
  toNum,
  canonDistrictId,
  classifyObjectCode,
  MACRO_CATEGORIES,
} from "./spendingHelpers";

const TOTALS_CSV     = "/data/Spending_Longitudinal_Totals.csv";
const BY_OBJECT_CSV  = "/data/Spending_By_Object_Long.csv";
const ENROLLMENT_CSV = "/data/Enrollment_Longitudinal.csv";

/* ------------------------------------------------------------------ */
/* CSV fetch + parse helpers                                           */
/* ------------------------------------------------------------------ */

async function fetchCsv(url) {
  const text = await fetch(url, { cache: "force-cache" }).then((r) => {
    if (!r.ok) throw new Error(`Fetch ${url} failed: ${r.status}`);
    return r.text();
  });
  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });
  // Strip BOM from header keys
  return parsed.data.map((r) => {
    const clean = {};
    for (const k of Object.keys(r)) {
      const nk = String(k).replace(/^\uFEFF/, "").trim();
      clean[nk] = r[k];
    }
    return clean;
  });
}

/* ------------------------------------------------------------------ */
/* Module caches                                                       */
/* ------------------------------------------------------------------ */

let _totalsCache = null;
let _byObjectCache = null;
let _enrollmentCache = null;

async function loadTotals() {
  if (_totalsCache) return _totalsCache;
  _totalsCache = await fetchCsv(TOTALS_CSV);
  return _totalsCache;
}

async function loadByObject() {
  if (_byObjectCache) return _byObjectCache;
  _byObjectCache = await fetchCsv(BY_OBJECT_CSV);
  return _byObjectCache;
}

async function loadEnrollment() {
  if (_enrollmentCache) return _enrollmentCache;
  _enrollmentCache = await fetchCsv(ENROLLMENT_CSV);
  return _enrollmentCache;
}

/* ------------------------------------------------------------------ */
/* Row filters                                                         */
/* ------------------------------------------------------------------ */

const STATEWIDE_KEY = "STATEWIDE";

const isStatewideRow = (row) =>
  String(row?.DISTRICT_N || "").trim().toUpperCase() === STATEWIDE_KEY;

const matchesDistrict = (row, wantCanonical) => {
  if (isStatewideRow(row)) return false;
  const v = row?.DISTRICT_N;
  if (v === null || v === undefined || v === "") return false;
  return canonDistrictId(v) === wantCanonical;
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Load the spending timeline for a single district.
 *
 * @returns {Promise<{
 *   years: number[],
 *   totals: Array<{year:number, totalSpending:number, enrollment:number, perStudent:number, statewidePerDistrict:number}>,
 *   byObject: Array<{year:number, objectCode:string, objectDescription:string, spending:number}>,
 *   topObjects: Array<{objectCode:string, objectDescription:string, byYear: Record<number, number>, total2024:number, growthRate:number}>,
 *   kpis: { totalChange:{start,end,delta,pct}, perStudentChange:{start,end,delta,pct}, enrollmentChange:{start,end,delta,pct} },
 *   macroSeries: Array<{year:number, teacher:number, support:number, benefits:number, contracted:number, capital:number, other:number, total:number}>,
 *   statewideTotals: Array<{year:number, totalSpending:number, districtCount:number, perDistrictAvg:number}>,
 * }>}
 */
export async function getDistrictSpendingTimeline(districtId) {
  const want = canonDistrictId(districtId);

  const [totalsRaw, byObjectRaw, enrollmentRaw] = await Promise.all([
    loadTotals(),
    loadByObject(),
    loadEnrollment(),
  ]);

  /* ---- totals for this district --------------------------------- */
  const districtTotalsByYear = new Map();
  for (const r of totalsRaw) {
    if (!matchesDistrict(r, want)) continue;
    const y = parseInt(r.Year, 10);
    const v = toNum(r.Total_Spending);
    if (Number.isFinite(y) && Number.isFinite(v)) {
      districtTotalsByYear.set(y, v);
    }
  }

  /* ---- statewide totals (for dashed comparison line) ------------- */
  const statewideTotalByYear = new Map();
  const districtCountByYear = new Map();
  for (const r of totalsRaw) {
    const y = parseInt(r.Year, 10);
    if (!Number.isFinite(y)) continue;
    if (isStatewideRow(r)) {
      statewideTotalByYear.set(y, toNum(r.Total_Spending));
    } else {
      districtCountByYear.set(y, (districtCountByYear.get(y) || 0) + 1);
    }
  }

  /* ---- enrollment for this district ----------------------------- */
  // Enrollment CSV has columns: District, LEA Name, 2024, 2023, 2022, 2018
  const enrollmentByYear = new Map();
  for (const r of enrollmentRaw) {
    if (canonDistrictId(r.District) !== want) continue;
    for (const key of Object.keys(r)) {
      const y = parseInt(key, 10);
      if (!Number.isFinite(y)) continue;
      const v = toNum(r[key]);
      if (Number.isFinite(v)) enrollmentByYear.set(y, v);
    }
    break; // one row per district
  }

  /* ---- merged years --------------------------------------------- */
  const years = Array.from(
    new Set([
      ...districtTotalsByYear.keys(),
      ...enrollmentByYear.keys(),
      ...statewideTotalByYear.keys(),
    ])
  ).sort((a, b) => a - b);

  const totals = years.map((year) => {
    const totalSpending = districtTotalsByYear.get(year) ?? NaN;
    const enrollment = enrollmentByYear.get(year) ?? NaN;
    const perStudent =
      Number.isFinite(totalSpending) &&
      Number.isFinite(enrollment) &&
      enrollment > 0
        ? totalSpending / enrollment
        : NaN;
    const statewideTotal = statewideTotalByYear.get(year);
    const districtCount = districtCountByYear.get(year);
    const statewidePerDistrict =
      Number.isFinite(statewideTotal) && districtCount
        ? statewideTotal / districtCount
        : NaN;
    return { year, totalSpending, enrollment, perStudent, statewidePerDistrict };
  });

  const statewideTotals = years.map((year) => ({
    year,
    totalSpending: statewideTotalByYear.get(year) ?? NaN,
    districtCount: districtCountByYear.get(year) ?? 0,
    perDistrictAvg:
      Number.isFinite(statewideTotalByYear.get(year)) &&
      districtCountByYear.get(year)
        ? statewideTotalByYear.get(year) / districtCountByYear.get(year)
        : NaN,
  }));

  /* ---- by-object for this district ------------------------------ */
  const byObject = [];
  for (const r of byObjectRaw) {
    if (!matchesDistrict(r, want)) continue;
    const year = parseInt(r.Year, 10);
    const spending = toNum(r.Object_Spending);
    if (!Number.isFinite(year) || !Number.isFinite(spending)) continue;
    byObject.push({
      year,
      objectCode: String(r.Object_Code || "").trim(),
      objectDescription: String(r.Object_Description_Long || "").trim(),
      spending,
    });
  }

  /* ---- top 5 object codes by 2024 spending ---------------------- */
  const latestYear =
    years.length > 0 ? years[years.length - 1] : null;

  const byCode = new Map();
  for (const row of byObject) {
    if (!byCode.has(row.objectCode)) {
      byCode.set(row.objectCode, {
        objectCode: row.objectCode,
        objectDescription: row.objectDescription,
        byYear: new Map(),
      });
    }
    const entry = byCode.get(row.objectCode);
    // Prefer a non-empty description if we've seen it.
    if (row.objectDescription && !entry.objectDescription) {
      entry.objectDescription = row.objectDescription;
    }
    entry.byYear.set(row.year, row.spending);
  }

  const topObjects = Array.from(byCode.values())
    .map((entry) => {
      const latest = latestYear ? toNum(entry.byYear.get(latestYear)) : NaN;
      const startYear = years[0];
      const startVal = startYear ? toNum(entry.byYear.get(startYear)) : NaN;
      const growthRate =
        Number.isFinite(latest) && Number.isFinite(startVal) && startVal > 0
          ? (latest - startVal) / startVal
          : NaN;
      return {
        objectCode: entry.objectCode,
        objectDescription: entry.objectDescription,
        byYear: Object.fromEntries(entry.byYear),
        total2024: Number.isFinite(latest) ? latest : 0,
        growthRate,
      };
    })
    .sort((a, b) => b.total2024 - a.total2024)
    .slice(0, 5);

  /* ---- macro category series ------------------------------------ */
  const macroAgg = new Map(); // year -> { teacher, support, ... total }
  const blank = () =>
    MACRO_CATEGORIES.reduce(
      (acc, c) => ({ ...acc, [c.id]: 0 }),
      { total: 0 }
    );
  for (const row of byObject) {
    const bucket = classifyObjectCode(row.objectCode);
    if (!macroAgg.has(row.year)) macroAgg.set(row.year, blank());
    const slot = macroAgg.get(row.year);
    slot[bucket] += row.spending;
    slot.total += row.spending;
  }
  const macroSeries = Array.from(macroAgg.entries())
    .map(([year, v]) => ({ year, ...v }))
    .sort((a, b) => a.year - b.year);

  /* ---- KPIs ----------------------------------------------------- */
  const firstYear = years[0];
  const lastYear = years[years.length - 1];
  const kpi = (startVal, endVal) => {
    if (!Number.isFinite(startVal) || !Number.isFinite(endVal)) {
      return { start: startVal, end: endVal, delta: NaN, pct: NaN };
    }
    const delta = endVal - startVal;
    const pct = startVal !== 0 ? delta / startVal : NaN;
    return { start: startVal, end: endVal, delta, pct };
  };

  const totalChange = kpi(
    districtTotalsByYear.get(firstYear),
    districtTotalsByYear.get(lastYear)
  );
  const enrollmentChange = kpi(
    enrollmentByYear.get(firstYear),
    enrollmentByYear.get(lastYear)
  );

  const perStudentFirst =
    Number.isFinite(districtTotalsByYear.get(firstYear)) &&
    enrollmentByYear.get(firstYear) > 0
      ? districtTotalsByYear.get(firstYear) / enrollmentByYear.get(firstYear)
      : NaN;
  const perStudentLast =
    Number.isFinite(districtTotalsByYear.get(lastYear)) &&
    enrollmentByYear.get(lastYear) > 0
      ? districtTotalsByYear.get(lastYear) / enrollmentByYear.get(lastYear)
      : NaN;
  const perStudentChange = kpi(perStudentFirst, perStudentLast);

  const kpis = {
    totalChange: { ...totalChange, startYear: firstYear, endYear: lastYear },
    enrollmentChange: { ...enrollmentChange, startYear: firstYear, endYear: lastYear },
    perStudentChange: { ...perStudentChange, startYear: firstYear, endYear: lastYear },
  };

  return {
    years,
    totals,
    byObject,
    topObjects,
    kpis,
    macroSeries,
    statewideTotals,
  };
}
