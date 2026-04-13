// src/lib/spendingHelpers.js
// Shared utilities for the Spending Over Time section on DistrictDetail.
// Helper patterns are lifted from LongitudinalSpending.jsx so that the
// district-scoped section feels visually consistent with the statewide page.

import React from "react";

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

/** Parse a currency/number string (e.g. "$99,988,017.00") into a finite number, else NaN. */
export const toNum = (v) => {
  if (v === null || v === undefined || v === "") return NaN;
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  const s = String(v).replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
};

/** Canonicalize a district ID to digits-only, leading zeros stripped. */
export const canonDistrictId = (v) =>
  String(v ?? "").replace(/['"]/g, "").replace(/\D/g, "").replace(/^0+/, "");

/* ------------------------------------------------------------------ */
/* Formatters                                                          */
/* ------------------------------------------------------------------ */

export const fmtShortUSD = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(n) ? n : 0);

export const fmtUSD0 = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

export const fmtUSDShort = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const trim = (x) => String(x.toFixed(1)).replace(/\.0$/, "");
  if (abs >= 1_000_000_000) return `${sign}$${trim(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}$${trim(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}$${trim(abs / 1_000)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
};

export const fmtInt = (n) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? Math.round(n) : 0
  );

export const fmtSignedPct = (r) =>
  Number.isFinite(r)
    ? (r >= 0 ? "+" : "") +
      new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(r)
    : "—";

export const fmtSignedUSDShort = (n) =>
  Number.isFinite(n) ? (n >= 0 ? "+" : "−") + fmtUSDShort(Math.abs(n)) : "—";

export const fmtSignedInt = (n) =>
  Number.isFinite(n) ? (n >= 0 ? "+" : "−") + fmtInt(Math.abs(n)) : "—";

/* ------------------------------------------------------------------ */
/* Change / CAGR helpers (work on Map<year, value>)                    */
/* ------------------------------------------------------------------ */

export function calcChange(map) {
  const years = Array.from(map.keys()).sort((a, b) => a - b);
  if (years.length < 2) return null;
  const startYear = years[0];
  const endYear = years[years.length - 1];
  const start = toNum(map.get(startYear));
  const end = toNum(map.get(endYear));
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const delta = end - start;
  const pct = start !== 0 ? delta / start : null;
  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return { startYear, endYear, start, end, delta, pct, trend };
}

/* ------------------------------------------------------------------ */
/* Theme-aware chart colors (pattern from LongitudinalSpending.jsx)    */
/* ------------------------------------------------------------------ */

const FALLBACK_CHART_COLORS = {
  total: "#0072B2",
  palette: [
    "#0072B2", "#E69F00", "#56B4E9", "#009E73",
    "#F0E442", "#D55E00", "#CC79A7", "#999999",
  ],
  positive: "#10B981",
  negative: "#DC2626",
  grid: "rgba(15, 23, 42, 0.15)",
};

function readCssVar(name, fallback) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return value ? value.trim() || fallback : fallback;
}

export function getChartColors() {
  const palette = Array.from({ length: 8 }, (_, i) =>
    readCssVar(`--viz-${i + 1}`, FALLBACK_CHART_COLORS.palette[i])
  );
  return {
    total: palette[0] || FALLBACK_CHART_COLORS.total,
    statewide: palette[7] || FALLBACK_CHART_COLORS.palette[7],
    palette,
    positive: readCssVar("--success-500", FALLBACK_CHART_COLORS.positive),
    negative: readCssVar("--danger-500", FALLBACK_CHART_COLORS.negative),
    grid: readCssVar("--grid-color", FALLBACK_CHART_COLORS.grid),
    surface: readCssVar("--surface-0", "#ffffff"),
    text: readCssVar("--text-0", "#0F172A"),
    border: readCssVar("--border", "rgba(15,23,42,0.15)"),
    radius: readCssVar("--radius-md", "12px"),
  };
}

export function useChartColors() {
  const [colors, setColors] = React.useState(getChartColors);
  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const root = document.documentElement;
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === "data-theme")) {
        setColors(getChartColors());
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return colors;
}

/** Standard recharts Tooltip contentStyle object derived from the current theme. */
export function tooltipStyle(colors) {
  return {
    fontSize: 13,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: colors.radius,
    borderColor: colors.border,
  };
}

/* ------------------------------------------------------------------ */
/* Object-code labels                                                  */
/* ------------------------------------------------------------------ */

const TEACHER_PAY_LABEL = "Teacher Pay";

export const OBJECT_LABEL_OVERRIDES = {
  "BUILDING PURCHASE, CONSTRUCTION OR IMPROVEMENTS": "Building Purchases",
  "CONSULTING SERVICES": "Consultants",
  "PROFESSIONAL SERVICES": "Professional Services",
  "MISCELLANEOUS CONTRACTED SERVICES": "Miscellaneous Contracts",
  "TEACHER PAY & OTHER PROFESSIONALS": TEACHER_PAY_LABEL,
  "LEGAL SERVICES": "Legal Services",
  "LOBBYING": "Lobbying",
};

const SMALL_WORDS = new Set([
  "and", "or", "the", "for", "of", "to", "a", "an", "in", "on", "by",
]);
const ACRONYM_WORDS = new Set([
  "ADA", "ACT", "CTE", "ELL", "ESL", "FICA", "FTE", "GT", "IDEA", "IRS",
  "PEIMS", "SAT", "SSA", "TEA", "TRS", "TSI",
]);

export function toTitleCase(value) {
  if (!value) return "";
  const parts = String(value).split(/([\s\/\-&,]+)/);
  return parts
    .map((part, index) => {
      if (/^[\s\/\-&,]+$/.test(part)) return part;
      const lower = part.toLowerCase();
      if (SMALL_WORDS.has(lower) && index !== 0 && index !== parts.length - 1) {
        return lower;
      }
      if (ACRONYM_WORDS.has(part.toUpperCase())) {
        return part.toUpperCase();
      }
      if (/^[0-9]+$/.test(lower)) {
        return part;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("")
    .replace(/\bId\b/g, "ID");
}

export function getObjectLabel(raw) {
  const base = String(raw || "").trim();
  if (!base) return "";
  const override = OBJECT_LABEL_OVERRIDES[base.toUpperCase()];
  return override || toTitleCase(base);
}

/* ------------------------------------------------------------------ */
/* Macro categories (5-6 buckets rolling up ~50 object codes)          */
/* ------------------------------------------------------------------ */

export const MACRO_CATEGORIES = [
  { id: "teacher",    label: "Teacher Compensation", order: 0 },
  { id: "support",    label: "Support Staff",        order: 1 },
  { id: "benefits",   label: "Benefits",             order: 2 },
  { id: "contracted", label: "Contracted Services",  order: 3 },
  { id: "capital",    label: "Capital & Facilities", order: 4 },
  { id: "other",      label: "Other",                order: 5 },
];

/**
 * Classify a 4-digit PEIMS object code into one of the macro buckets.
 * Codes are compared numerically to support both "6112" and 6112.
 */
export function classifyObjectCode(code) {
  const n = parseInt(String(code ?? "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(n)) return "other";
  if (n === 6112 || n === 6119) return "teacher";
  if (n === 6121 || n === 6122 || n === 6129) return "support";
  if (n >= 6141 && n <= 6146) return "benefits";
  if (n >= 6211 && n <= 6299) return "contracted";
  if (n >= 6600) return "capital";
  return "other";
}
