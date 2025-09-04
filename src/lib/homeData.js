// src/lib/homeData.js
// Hardened loaders that fetch /public data, parse quote-aware CSV, and log diagnostics.
import { fetchCSVWithDiag, parseCSV } from "../lib/csvDebug";

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const firstKey = (obj, keys) => keys.find(k => obj[k] != null && obj[k] !== "") || null;

function csvDebugEnabled() {
  try { if (import.meta?.env?.DEV) return true; } catch {}
  try {
    const usp = new URLSearchParams(window.location.search);
    return (usp.get("debug") === "csv");
  } catch {}
  return False;
}
const CSV_DEBUG = csvDebugEnabled();

// ====== Exports used by homepage cards (keep names/signatures) ======

// 1) Superintendents — returns ARRAY only (to avoid layout changes)
export async function loadSuperintendents() {
  const { diag, text } = await fetchCSVWithDiag("/data/home/superintendents.csv");
  if (!text) {
    if (CSV_DEBUG) console.warn("[CSV:superintendents] fetch failed", diag);
    return [];
  }
  const parsed = parseCSV(text);
  const rows = parsed.rows.map(r => {
    const idKey   = firstKey(r, ["DISTRICT_N","DISTRICT_ID","DISTRICT_NUMBER"]);
    const nameKey = firstKey(r, ["DISTRICT_NAME","NAME","DNAME"]);
    const supKey  = firstKey(r, ["SUPERINTENDENT_NAME","SUPT_NAME","SUPERINTENDENT"]);
    const salKey  = firstKey(r, ["FTE_SALARY","SUPERINTENDENT_SALARY","SUPT_SALARY","BASE_FTE_SALARY"]);
    const enrKey  = firstKey(r, ["ENROLLMENT","ENR","STUDENTS"]);
    const id = r[idKey]; const name = r[nameKey];
    return {
      id,
      name,
      supName: r[supKey] ?? "",
      fteSalary: toNum(r[salKey]),
      enroll: toNum(r[enrKey]),
    };
  }).filter(d => d.id && d.name && Number.isFinite(d.fteSalary));

  if (CSV_DEBUG) {
    console.info("[CSV:superintendents] path ok. headers:", parsed.headers);
    console.info("[CSV:superintendents] first row:", parsed.rows[0]);
    console.info("[CSV:superintendents] mapped:", rows.length);
  }
  return rows;
}

// 2) Indebted — returns ARRAY only
export async function loadIndebted() {
  const { diag, text } = await fetchCSVWithDiag("/data/home/indebted.csv");
  if (!text) {
    if (CSV_DEBUG) console.warn("[CSV:indebted] fetch failed", diag);
    return [];
  }
  const parsed = parseCSV(text);
  const rows = parsed.rows.map(r => {
    const id    = r.DISTRICT_N ?? r.DISTRICT_ID ?? r.DISTRICT_NUMBER;
    const name  = r.DISTRICT_NAME ?? r.NAME ?? r.DNAME ?? "";
    const enroll= toNum(r.ENROLLMENT ?? r.ENR ?? r.STUDENTS);
    const debt  = toNum(r.DEBT_PER_STUDENT ?? r.TOTAL_DEBT ?? r.DEBT ?? r.DEBT_TOTAL);
    return { id, name, debt, enroll };
  }).filter(d => d.id && d.name && Number.isFinite(d.debt));

  if (CSV_DEBUG) {
    console.info("[CSV:indebted] headers:", parsed.headers);
    console.info("[CSV:indebted] first row:", parsed.rows[0]);
    console.info("[CSV:indebted] mapped:", rows.length);
  }
  return rows;
}

// 3) Performance — returns ARRAY only
export async function loadPerformance() {
  const { diag, text } = await fetchCSVWithDiag("/data/home/performance.csv");
  if (!text) {
    if (CSV_DEBUG) console.warn("[CSV:performance] fetch failed", diag);
    return [];
  }
  const parsed = parseCSV(text);
  const rows = parsed.rows.map(r => {
    const id    = r.DISTRICT_N ?? r.DISTRICT_ID ?? r.DISTRICT_NUMBER;
    const name  = r.DISTRICT_NAME ?? r.NAME ?? r.DNAME ?? "";
    const enroll= toNum(r.ENROLLMENT ?? r.ENR ?? r.STUDENTS);
    let score   = toNum(r.OVERALL_SCORE ?? r.SCORE ?? r.ACCOUNTABILITY_SCORE);
    if (!Number.isFinite(score)) {
      const rating = String(r.OVERALL_RATING ?? r.RATING ?? "").toUpperCase();
      score = { A:95, B:85, C:75, D:65, F:55 }[rating] ?? NaN;
    }
    return { id, name, score, enroll };
  }).filter(d => d.id && d.name && Number.isFinite(d.score));

  if (CSV_DEBUG) {
    console.info("[CSV:performance] headers:", parsed.headers);
    console.info("[CSV:performance] first row:", parsed.rows[0]);
    console.info("[CSV:performance] mapped:", rows.length);
  }
  return rows;
}

// Buckets + formatters used by UI
export const ENROLL_BUCKETS = [
  { key: "all",   label: "All sizes",   test: () => true },
  { key: "lt1k",  label: "< 1,000",     test: (n) => n < 1000 },
  { key: "1k5k",  label: "1,000–4,999", test: (n) => n >= 1000 && n < 5000 },
  { key: "5k20k", label: "5,000–19,999",test: (n) => n >= 5000 && n < 20000 },
  { key: "20k+",  label: "20,000+",     test: (n) => n >= 20000 },
];
export const usd0 = (n) => Number.isFinite(n) ? "$" + Math.round(n).toLocaleString() : "—";
export const int0 = (n) => Number.isFinite(n) ? Math.round(n).toLocaleString() : "—";