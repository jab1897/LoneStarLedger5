// src/lib/data.js
import Papa from "papaparse";

/**
 * EXACT column names you gave (top priority), with sensible fallbacks after them.
 * If your CSV uses exactly these, they'll be picked; otherwise we'll try fallbacks.
 */
const KEYS = {
  ID: ["DISTRICT_N", "DISTRICT_ID", "DISTRICTCODE", "ID"],
  NAME: ["NAME", "DISTRICT_NAME", "DISTRICT", "DISTNAME"],
  COUNTY: ["COUNTY", "COUNTY_NAME"],

  TOTAL_SPENDING: [
    "Total Spending",
    "TOTAL_SPENDING", "TOTAL EXPENDITURES", "TOTAL_EXPENDITURES",
    "TOTAL SPENDING", "TOTAL OUTLAYS", "TOTAL_OUTLAYS",
    "SPENDING_TOTAL", "EXPENDITURES_TOTAL", "TOTAL_EXPENSE", "TOTAL_EXPENSES",
  ],
  ENROLLMENT: [
    "Enrollment",
    "ENROLLMENT", "TOTAL_ENROLLMENT", "STUDENTS", "TOTAL_STUDENTS",
  ],
  // fixed to $18,125 by spec; no CSV field needed
  DISTRICT_DEBT: [
    "Distrit Debt", // (typo preserved, per your field name)
    "District Debt", "TOTAL_DEBT", "DEBT_TOTAL", "OUTSTANDING_DEBT",
    "DEBT OUTSTANDING", "DEBT_OUTSTANDING",
  ],
  PER_PUPIL_DEBT: [
    "Per-Pupil Debt",
    "PER_PUPIL_DEBT", "DEBT_PER_STUDENT", "DEBT PER STUDENT",
  ],
  TEACHER_SALARY: [
    "Average Teacher Salary",
    "AVG_TEACHER_SALARY", "AVERAGE_TEACHER_SALARY", "TEACHER_AVG_SALARY",
    "TEACHER SALARY (AVG)", "TEACHER_SALARY_AVG", "TEACHER_SALARY",
  ],
  PRINCIPAL_SALARY: [
    "Average Principal Salary",
    "AVG_PRINCIPAL_SALARY", "AVERAGE_PRINCIPAL_SALARY", "PRINCIPAL_AVG_SALARY",
    "PRINCIPAL SALARY (AVG)", "PRINCIPAL_SALARY_AVG", "PRINCIPAL_SALARY",
  ],
  SUPERINTENDENT_SALARY: [
    "Superintendent Salary",
    "AVG_SUPERINTENDENT_SALARY", "AVERAGE_SUPERINTENDENT_SALARY",
    "SUPERINTENDENT_AVG_SALARY", "SUPERINTENDENT SALARY (AVG)",
    "SUPERINTENDENT_SALARY_AVG", "SUPERINTENDENT_SALARY",
  ],
};

const NUM = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(String(v).replace(/[\$,]/g, ""));

const IS_NUM = (v) => v !== null && v !== undefined && v !== "" && !Number.isNaN(NUM(v));

function pickKey(row, candidates) {
  for (const k of candidates) if (k in row) return k;
  return null;
}

let _cache = null;

export async function loadDistrictsCSV(csvUrl) {
  if (_cache) return _cache;

  const url = csvUrl || import.meta.env.VITE_DISTRICTS_CSV;
  if (!url) throw new Error("VITE_DISTRICTS_CSV is not set");

  const text = await fetch(url, { cache: "force-cache" }).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch CSV: ${r.status}`);
    return r.text();
  });

  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  // Normalize headers (strip BOM/whitespace)
  const rows = parsed.data.filter(Boolean).map((r) => {
    const clean = {};
    for (const k of Object.keys(r)) {
      const nk = String(k).replace(/^\uFEFF/, "").trim();
      clean[nk] = r[k];
    }
    return clean;
  });

  if (!rows.length) {
    _cache = emptyResult();
    return _cache;
  }

  // Detect headers with a representative row
  const sample = rows.find((r) => Object.keys(r).length > 0) || rows[0];
  const F = {
    ID: pickKey(sample, KEYS.ID),
    NAME: pickKey(sample, KEYS.NAME),
    COUNTY: pickKey(sample, KEYS.COUNTY),
    TOTAL_SPENDING: pickKey(sample, KEYS.TOTAL_SPENDING),
    ENROLLMENT: pickKey(sample, KEYS.ENROLLMENT),
    DISTRICT_DEBT: pickKey(sample, KEYS.DISTRICT_DEBT),
    PER_PUPIL_DEBT: pickKey(sample, KEYS.PER_PUPIL_DEBT),
    TEACHER_SALARY: pickKey(sample, KEYS.TEACHER_SALARY),
    PRINCIPAL_SALARY: pickKey(sample, KEYS.PRINCIPAL_SALARY),
    SUPERINTENDENT_SALARY: pickKey(sample, KEYS.SUPERINTENDENT_SALARY),
  };

  // Lookup helpers
  const getId = (r) => (F.ID ? String(r[F.ID]) : "");
  const getCounty = (r) => (F.COUNTY ? String(r[F.COUNTY]) : "");

  const byId = {};
  const countiesSet = new Set();

  // Totals
  let totalSpendingSum = 0;
  let enrollmentTotal = 0;
  let districtDebtTotal = 0;

  // Averages (means of district-level values)
  let perPupilDebtSum = 0,
    perPupilDebtCount = 0;

  let teacherSalarySum = 0,
    teacherSalaryCount = 0;
  let principalSalarySum = 0,
    principalSalaryCount = 0;
  let superintendentSalarySum = 0,
    superintendentSalaryCount = 0;

  for (const r of rows) {
    const id = getId(r);
    if (id) byId[id] = r;

    const county = getCounty(r);
    if (county) countiesSet.add(county);

    if (F.TOTAL_SPENDING && IS_NUM(r[F.TOTAL_SPENDING])) {
      totalSpendingSum += NUM(r[F.TOTAL_SPENDING]);
    }
    if (F.ENROLLMENT && IS_NUM(r[F.ENROLLMENT])) {
      enrollmentTotal += NUM(r[F.ENROLLMENT]);
    }
    if (F.DISTRICT_DEBT && IS_NUM(r[F.DISTRICT_DEBT])) {
      districtDebtTotal += NUM(r[F.DISTRICT_DEBT]);
    }

    if (F.PER_PUPIL_DEBT && IS_NUM(r[F.PER_PUPIL_DEBT])) {
      perPupilDebtSum += NUM(r[F.PER_PUPIL_DEBT]);
      perPupilDebtCount++;
    }

    if (F.TEACHER_SALARY && IS_NUM(r[F.TEACHER_SALARY])) {
      teacherSalarySum += NUM(r[F.TEACHER_SALARY]);
      teacherSalaryCount++;
    }
    if (F.PRINCIPAL_SALARY && IS_NUM(r[F.PRINCIPAL_SALARY])) {
      principalSalarySum += NUM(r[F.PRINCIPAL_SALARY]);
      principalSalaryCount++;
    }
    if (F.SUPERINTENDENT_SALARY && IS_NUM(r[F.SUPERINTENDENT_SALARY])) {
      superintendentSalarySum += NUM(r[F.SUPERINTENDENT_SALARY]);
      superintendentSalaryCount++;
    }
  }

  const perPupilDebtAvg = perPupilDebtCount
    ? Math.round(perPupilDebtSum / perPupilDebtCount)
    : 0;

  const teacherSalaryAvg = teacherSalaryCount
    ? Math.round(teacherSalarySum / teacherSalaryCount)
    : 0;

  const principalSalaryAvg = principalSalaryCount
    ? Math.round(principalSalarySum / principalSalaryCount)
    : 0;

  const superintendentSalaryAvg = superintendentSalaryCount
    ? Math.round(superintendentSalarySum / superintendentSalaryCount)
    : 0;

  // Fixed value per your spec
  const perStudentSpendingAvgFixed = 18125;

  _cache = {
    rows,
    byId,
    counties: Array.from(countiesSet).sort(),
    fields: F,
    stats: {
      // (1)
      totalSpendingSum,
      // (2)
      enrollmentTotal,
      // (3) fixed
      perStudentSpendingAvgFixed,
      // (4)
      districtDebtTotal,
      // (5) average of district-level "Per-Pupil Debt" values
      perPupilDebtAvg,
      // (6–8)
      teacherSalaryAvg,
      principalSalaryAvg,
      superintendentSalaryAvg,
    },
  };
  return _cache;
}

function emptyResult() {
  return {
    rows: [],
    byId: {},
    counties: [],
    fields: {},
    stats: {
      totalSpendingSum: 0,
      enrollmentTotal: 0,
      perStudentSpendingAvgFixed: 18125,
      districtDebtTotal: 0,
      perPupilDebtAvg: 0,
      teacherSalaryAvg: 0,
      principalSalaryAvg: 0,
      superintendentSalaryAvg: 0,
    },
  };
}

export async function getStatewideStats(csvUrl) {
  const { stats } = await loadDistrictsCSV(csvUrl);
  return stats;
}

export async function getDetectedFields(csvUrl) {
  const { fields } = await loadDistrictsCSV(csvUrl);
  return fields;
}
