// src/lib/spending.js
import Papa from "papaparse";

const KEYS = {
  DISTRICT_ID: ["DISTRICT_N", "DISTRICT_ID", "DISTRICTCODE", "DISTRICT"],
  DATE: ["DATE", "TxDate", "POST_DATE", "INVOICE_DATE"],
  VENDOR: ["VENDOR", "PAYEE", "SUPPLIER"],
  CATEGORY: ["CATEGORY", "OBJECT", "ACCOUNT", "FUNCTION"],
  AMOUNT: ["AMOUNT", "TOTAL", "EXPENSE", "DEBIT", "LINE_AMOUNT"],
  DESCRIPTION: ["DESCRIPTION", "DESC", "MEMO", "LINE_DESCRIPTION"],
};

const NUM = (v) =>
  v === null || v === undefined || v === ""
    ? 0
    : Number(String(v).replace(/[\$,]/g, ""));

const pickKey = (row, candidates) => {
  for (const k of candidates) if (k in row) return k;
  return null;
};

let _cache = null;

export async function loadSpendingCSV(csvUrl) {
  if (_cache) return _cache;

  const url = csvUrl || import.meta.env.VITE_SPENDING_CSV;
  if (!url) throw new Error("VITE_SPENDING_CSV is not set");

  const text = await fetch(url, { cache: "force-cache" }).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch spending CSV: ${r.status}`);
    return r.text();
  });

  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  const rows = parsed.data
    .filter(Boolean)
    .map((r) => {
      const clean = {};
      for (const k of Object.keys(r)) {
        const nk = String(k).replace(/^\uFEFF/, "").trim();
        clean[nk] = r[k];
      }
      return clean;
    });

  const sample = rows[0] || {};
  const F = {
    DISTRICT_ID: pickKey(sample, KEYS.DISTRICT_ID),
    DATE: pickKey(sample, KEYS.DATE),
    VENDOR: pickKey(sample, KEYS.VENDOR),
    CATEGORY: pickKey(sample, KEYS.CATEGORY),
    AMOUNT: pickKey(sample, KEYS.AMOUNT),
    DESCRIPTION: pickKey(sample, KEYS.DESCRIPTION),
  };

  // normalized records
  const normalized = rows.map((r) => ({
    districtId: F.DISTRICT_ID ? String(r[F.DISTRICT_ID]) : "",
    date: F.DATE ? String(r[F.DATE]) : "",
    vendor: F.VENDOR ? String(r[F.VENDOR]) : "",
    category: F.CATEGORY ? String(r[F.CATEGORY]) : "",
    amount: F.AMOUNT ? NUM(r[F.AMOUNT]) : 0,
    description: F.DESCRIPTION ? String(r[F.DESCRIPTION]) : "",
    _raw: r,
  }));

  // index by district
  const byDistrict = new Map();
  for (const rec of normalized) {
    if (!rec.districtId) continue;
    if (!byDistrict.has(rec.districtId)) byDistrict.set(rec.districtId, []);
    byDistrict.get(rec.districtId).push(rec);
  }

  // collect distinct categories for filters
  const categories = Array.from(
    new Set(normalized.map((r) => r.category).filter(Boolean))
  ).sort();

  _cache = { raw: rows, records: normalized, byDistrict, categories, fields: F };
  return _cache;
}

export async function getSpendingForDistrict(districtId) {
  const { byDistrict, categories, fields } = await loadSpendingCSV();
  return {
    rows: byDistrict.get(String(districtId)) || [],
    categories,
    fields,
  };
}
