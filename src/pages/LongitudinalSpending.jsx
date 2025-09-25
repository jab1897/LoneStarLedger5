// src/pages/LongitudinalSpending.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, CartesianGrid
} from "recharts";

// Absolute URLs to CSV files served from public/
const BY_OBJECT_CSV = "/data/Spending_By_Object_Long.csv";

// Small CSV parser that supports quoted fields and embedded commas
function parseCSV(text, delimiter = ",") {
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;

  function pushField() { row.push(field); field = ""; }
  function pushRow() { if (row.length) rows.push(row); row = []; }

  for (; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === delimiter) {
        pushField();
      } else if (c === "\n") {
        pushField(); pushRow();
      } else if (c === "\r") {
        // swallow CR and handle CRLF
      } else {
        field += c;
      }
    }
  }
  // flush last field and row
  pushField(); pushRow();

  // remove empty trailing rows
  while (rows.length && rows[rows.length - 1].every(v => v === "")) rows.pop();

  if (!rows.length) return [];

  // dedupe headers if duplicated
  const header = rows[0];
  const nameMap = {};
  const headers = header.map(h => {
    const key = h || "col";
    nameMap[key] = (nameMap[key] || 0) + 1;
    return nameMap[key] === 1 ? key : `${key}_${nameMap[key]}`;
  });

  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    const arr = rows[r];
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = arr[c] ?? "";
    }
    out.push(obj);
  }
  return out;
}

// coerce numbers like "$3,182,288.00" to 3182288
const toNumber = (v) => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/\$/g, "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

// compact friendly money format for axes and tooltips
const fmtShortUSD = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n || 0);

// Robust number parsing for currency strings and plain numbers
const toNum = (v) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.replace(/[^\d.-]/g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

// Formatters for KPIs
const fmtUSD = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(Number.isFinite(n) ? n : 0);
const fmtInt = (n) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
    .format(Number.isFinite(n) ? Math.round(n) : 0);
const fmtPct = (r) =>
  Number.isFinite(r)
    ? new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(r)
    : "—";
const signed = (n, format) => (Number.isFinite(n) ? (n > 0 ? "+" : "") + (typeof format === "function" ? format(n) : n) : "—");

// Generic change calculators on a Map<year, value>
function calcChange(map) {
  const years = Array.from(map.keys()).sort((a, b) => a - b);
  if (years.length < 2) return null;
  const startYear = years[0];
  const endYear = years[years.length - 1];
  const start = toNum(map.get(startYear));
  const end = toNum(map.get(endYear));
  const delta = end - start;
  const pct = start !== 0 ? delta / start : null;
  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return { startYear, endYear, start, end, delta, pct, trend };
}
function calcShareByYear(numerByYear, denomByYear) {
  const years = Array.from(numerByYear.keys()).filter((y) => denomByYear.has(y)).sort((a, b) => a - b);
  const map = new Map();
  years.forEach((y) => {
    const num = toNum(numerByYear.get(y));
    const den = toNum(denomByYear.get(y));
    map.set(y, den > 0 ? num / den : NaN);
  });
  return map;
}
function calcCAGR(map) {
  const ch = calcChange(map);
  if (!ch) return null;
  const years = ch.endYear - ch.startYear;
  if (!Number.isFinite(years) || years <= 0 || ch.start <= 0 || ch.end <= 0) return null;
  const cagr = Math.pow(ch.end / ch.start, 1 / years) - 1;
  const trend = cagr > 0 ? "up" : cagr < 0 ? "down" : "flat";
  return { ...ch, cagr, trend };
}

// Data files
const TOTALS_CSV = "/data/Spending_Longitudinal_Totals.csv";
const ENROLLMENT_CSV = "/data/Enrollment_Longitudinal.csv";

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mql = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);
  return isMobile;
}

// local loader with error logging
async function loadCsv(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.error("CSV fetch failed", url, res.status);
    return [];
  }
  const text = await res.text();
  const rows = parseCSV(text);
  return rows;
}

const FALLBACK_CHART_COLORS = {
  total: "#0072B2",
  teacher: "#56B4E9",
  palette: ["#0072B2", "#E69F00", "#56B4E9", "#009E73", "#F0E442", "#D55E00", "#CC79A7", "#999999"],
  positive: "#10B981",
  negative: "#DC2626",
  grid: "rgba(15, 23, 42, 0.15)",
};

function readCssVar(name, fallback) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return value ? value.trim() || fallback : fallback;
}

function getChartColors() {
  const palette = Array.from({ length: 8 }, (_, i) =>
    readCssVar(`--viz-${i + 1}`, FALLBACK_CHART_COLORS.palette[i])
  );
  return {
    total: palette[0] || FALLBACK_CHART_COLORS.total,
    teacher: palette[2] || FALLBACK_CHART_COLORS.teacher,
    palette,
    positive: readCssVar("--success-500", FALLBACK_CHART_COLORS.positive),
    negative: readCssVar("--danger-500", FALLBACK_CHART_COLORS.negative),
    grid: readCssVar("--grid-color", FALLBACK_CHART_COLORS.grid),
  };
}

function useChartColors() {
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

const TEACHER_PAY_LABEL = "Teacher Pay";

const OBJECT_LABEL_OVERRIDES = {
  "BUILDING PURCHASE, CONSTRUCTION OR IMPROVEMENTS": "Building Purchases",
  "CONSULTING SERVICES": "Consultants",
  "PROFESSIONAL SERVICES": "Professional Services",
  "MISCELLANEOUS CONTRACTED SERVICES": "Miscellaneous Contracts",
  "TEACHER PAY & OTHER PROFESSIONALS": TEACHER_PAY_LABEL,
  "LEGAL SERVICES": "Legal Services",
  "LOBBYING": "Lobbying",
};

const DEFAULT_OBJECTS = [
  "Consultants",
  "Professional Services",
  "Miscellaneous Contracts",
  "Legal Services",
  "Lobbying",
];

const SMALL_WORDS = new Set(["and", "or", "the", "for", "of", "to", "a", "an", "in", "on", "by"]);
const ACRONYM_WORDS = new Set([
  "ADA",
  "ACT",
  "CTE",
  "ELL",
  "ESL",
  "FICA",
  "FTE",
  "GT",
  "IDEA",
  "IRS",
  "PEIMS",
  "SAT",
  "SSA",
  "TEA",
  "TRS",
  "TSI",
]);

function toTitleCase(value) {
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

function getObjectLabel(raw) {
  const base = String(raw || "").trim();
  if (!base) return "";
  const override = OBJECT_LABEL_OVERRIDES[base.toUpperCase()];
  return override || toTitleCase(base);
}

export default function LongitudinalSpending() {
  const [totals, setTotals] = useState([]);     // rows with DISTRICT_N, District_Name, Year, Total_Spending
  const [objects, setObjects] = useState([]);   // rows with DISTRICT_N, District_Name, Year, Object_Description_Long, Object_Spending
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(["STATEWIDE"]); // default statewide chip
  const [selectedObjects, setSelectedObjects] = useState(DEFAULT_OBJECTS);
  const [objectSelectValue, setObjectSelectValue] = useState("");
  const [performanceRows, setPerformanceRows] = useState([]); // district grades
  const [enrollmentRows, setEnrollmentRows] = useState([]);   // normalized long rows
  const loadCancelled = useRef(false);

  const isMobile = useIsMobile();
  const CHART_H_LINE = isMobile ? 280 : 360;
  const CHART_H_BAR = isMobile ? 320 : 420;
  const AXIS_FONT = { fontSize: isMobile ? 12 : 13 };
  const LINE_STROKE = isMobile ? 3.5 : 3.75;
  const DOT_R = isMobile ? 3.5 : 4.5;
  const ACTIVE_DOT_R = isMobile ? 6.5 : 7.5;
  const chartColors = useChartColors();

  const loadSpendingData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRows, oRows, perfMaybe, enrWide] = await Promise.all([
        loadCsv(TOTALS_CSV),
        loadCsv(BY_OBJECT_CSV),
        // Prefer existing helper if present, otherwise silently ignore
        (async () => {
          try {
            const { loadPerformance } = await import("../lib/homeData");
            return await loadPerformance();
          } catch {
            try { return await loadCsv("/data/home/performance.csv"); } catch { return []; }
          }
        })(),
        loadCsv(ENROLLMENT_CSV).catch(() => []),
      ]);

      if (loadCancelled.current) return;

      // normalize column names exactly as expected
      const t = tRows.map(r => ({
        DISTRICT_N: r.DISTRICT_N ?? r.DISTRICT ?? r.District_ID ?? "",
        District_Name: r.District_Name ?? r.DISTNAME ?? r.District ?? "",
        Year: Number(r.Year),
        Total_Spending: toNumber(r.Total_Spending ?? r.Total ?? r.Amount ?? r.SumOfACTAMT)
      })).filter(r => r.Year && r.DISTRICT_N);

      const o = oRows.map(r => ({
        DISTRICT_N: r.DISTRICT_N ?? r.DISTRICT ?? r.District_ID ?? "",
        District_Name: r.District_Name ?? r.DISTNAME ?? r.District ?? "",
        Year: Number(r.Year),
        Object_Code: r.Object_Code ?? r.OBJECT ?? "",
        Object_Description_Long: r.Object_Description_Long ?? r.OBJECTX_LONG ?? r.Object_Long ?? "",
        Object_Spending: toNumber(r.Object_Spending ?? r.Amount ?? r.SumOfACTAMT)
      })).filter(r => r.Year && r.DISTRICT_N && r.Object_Description_Long);

      if (loadCancelled.current) return;

      setTotals(t);
      setObjects(o);
      setPerformanceRows(Array.isArray(perfMaybe) ? perfMaybe : []);
      // Normalize enrollment wide to long: {DISTRICT_N, District_Name, Year, Enrollment}
      const enrLong = (Array.isArray(enrWide) ? enrWide : []).flatMap(r => {
        const id = String(r.District ?? r.DISTRICT_N ?? r.District_ID ?? r.id ?? "").trim();
        const name = String(r["LEA Name"] ?? r.District_Name ?? r.NAME ?? "").trim();
        if (!id) return [];
        return Object.keys(r).map(k => {
          const y = Number.parseInt(k, 10);
          if (!Number.isFinite(y) || String(y).length !== 4) return null;
          const val = toNum(r[k]);
          if (!Number.isFinite(val)) return null;
          return { DISTRICT_N: id, District_Name: name, Year: y, Enrollment: val };
        }).filter(Boolean);
      });
      setEnrollmentRows(enrLong);
      setError("");
    } catch (e) {
      console.error("Data load error", e);
      if (!loadCancelled.current) setError("Could not load spending data");
    } finally {
      if (!loadCancelled.current) setLoading(false);
    }
  }, [loadCancelled, setError, setLoading, setObjects, setTotals]);

  useEffect(() => {
    loadCancelled.current = false;
    loadSpendingData();
    return () => {
      loadCancelled.current = true;
    };
  }, [loadSpendingData]);

  const districts = useMemo(() => {
    const map = new Map();
    totals.forEach(r => { if (!map.has(r.DISTRICT_N)) map.set(r.DISTRICT_N, r.District_Name); });
    if (map.size === 0) {
      objects.forEach(r => { if (!map.has(r.DISTRICT_N)) map.set(r.DISTRICT_N, r.District_Name); });
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [totals, objects]);

  // Grades lookup: id -> { grade, score }
  const gradesById = useMemo(() => {
    const m = new Map();
    (performanceRows || []).forEach(r => {
      const id = String(r.id ?? r.DISTRICT_N ?? r.District_ID ?? "").trim();
      if (!id) return;
      const grade = String(r.rating ?? r.DISTRICT_GRADE ?? r.RATING ?? "").trim();
      const scoreRaw = r.score ?? r.OVERALL_SCORE ?? r.DISTRICT_SCORE;
      const score = Number.isFinite(Number(scoreRaw)) ? Number(scoreRaw) : undefined;
      m.set(id, { grade, score });
    });
    return m;
  }, [performanceRows]);

  const addDistrict = (id) => { if (!selected.includes(id)) setSelected(prev => [...prev, id]); setQuery(""); };
  const removeDistrict = (id) => setSelected(prev => prev.filter(x => x !== id));

  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase();
    return districts.filter(d => d.name.toLowerCase().includes(q) || d.id.includes(query)).slice(0, 10);
  }, [districts, query]);

  const totalsByYear = useMemo(() => {
    const map = new Map();
    totals.forEach(r => {
      if (!selected.includes(r.DISTRICT_N)) return;
      const y = Number(r.Year);
      if (!y) return;
      map.set(y, (map.get(y) || 0) + toNumber(r.Total_Spending));
    });
    return map;
  }, [totals, selected]);

  const objectsByYear = useMemo(() => {
    const map = new Map();
    objects.forEach(r => {
      if (!selected.includes(r.DISTRICT_N)) return;
      const y = Number(r.Year);
      if (!y) return;
      const name = getObjectLabel(r.Object_Description_Long ?? r.Object_Long ?? r.OBJECTX_LONG ?? "");
      if (!name) return;
      const totalsForYear = map.get(y) || {};
      totalsForYear[name] = (totalsForYear[name] || 0) + toNumber(r.Object_Spending);
      map.set(y, totalsForYear);
    });
    return map;
  }, [objects, selected]);

  // Collect all known object keys from the aggregated year map
  const allObjectKeys = useMemo(() => {
    const s = new Set();
    objectsByYear.forEach(row => Object.keys(row || {}).forEach(k => s.add(k)));
    return Array.from(s);
  }, [objectsByYear]);

  // Try to resolve the teacher pay object key
  const teacherObjectKey = useMemo(() => {
    if (!allObjectKeys.length) return null;
    const guesses = [
      "Teacher Pay & Other Professionals",
      "Teachers and Other Professional Personnel",
      "Teacher Salaries",
      "6119 Teachers and Other Professional Personnel",
      "611X Teachers",
    ].map(s => s.toLowerCase());
    const lower = allObjectKeys.map(s => s.toLowerCase());
    // exact name guesses
    for (const g of guesses) {
      const idx = lower.findIndex(k => k === g);
      if (idx >= 0) return allObjectKeys[idx];
    }
    // fuzzy match contains teacher and either pay or salary
    const idx2 = lower.findIndex(k => k.includes("teacher") && (k.includes("pay") || k.includes("salari")));
    if (idx2 >= 0) return allObjectKeys[idx2];
    // last resort: any key containing teacher
    const idx3 = lower.findIndex(k => k.includes("teacher"));
    return idx3 >= 0 ? allObjectKeys[idx3] : null;
  }, [allObjectKeys]);

  // Resolve non classroom service keys by pattern
  const nonClassroomKeys = useMemo(() => {
    if (!allObjectKeys.length) return [];
    const pats = [/consult/i, /professional\s*services?/i, /legal/i, /lobby/i, /misc/i, /contract/i];
    return allObjectKeys.filter(k => pats.some(rx => rx.test(k)));
  }, [allObjectKeys]);

  // Build KPI numerator maps by year
  const teacherPayByYear = useMemo(() => {
    const map = new Map();
    if (!teacherObjectKey) return map;
    objectsByYear.forEach((row, y) => map.set(y, toNum(row?.[teacherObjectKey])));
    return map;
  }, [objectsByYear, teacherObjectKey]);

  const nonClassroomByYear = useMemo(() => {
    const map = new Map();
    objectsByYear.forEach((row, y) => {
      let sum = 0;
      nonClassroomKeys.forEach(k => { sum += toNum(row?.[k]); });
      map.set(y, sum);
    });
    return map;
  }, [objectsByYear, nonClassroomKeys]);

  // Enrollment aggregated across selected
  const enrollmentByYear = useMemo(() => {
    const map = new Map();
    (enrollmentRows || []).forEach(r => {
      if (!selected.includes(r.DISTRICT_N)) return;
      const y = Number(r.Year);
      if (!Number.isFinite(y)) return;
      map.set(y, (map.get(y) || 0) + toNum(r.Enrollment));
    });
    return map;
  }, [enrollmentRows, selected]);

  // Per student series
  const perStudentByYear = useMemo(() => {
    const map = new Map();
    enrollmentByYear.forEach((enr, y) => {
      const total = toNum(totalsByYear.get(y));
      if (Number.isFinite(enr) && enr > 0 && Number.isFinite(total)) {
        map.set(y, total / enr);
      }
    });
    return map;
  }, [enrollmentByYear, totalsByYear]);

  const teacherPerStudentByYear = useMemo(() => {
    const map = new Map();
    enrollmentByYear.forEach((enr, y) => {
      const tp = toNum(teacherPayByYear.get(y));
      if (Number.isFinite(enr) && enr > 0 && Number.isFinite(tp)) {
        map.set(y, tp / enr);
      }
    });
    return map;
  }, [enrollmentByYear, teacherPayByYear]);

  // KPI change objects
  const kpiTotal = useMemo(() => calcChange(totalsByYear), [totalsByYear]);
  const kpiTeacher = useMemo(() => calcChange(teacherPayByYear), [teacherPayByYear]);
  const teacherShareByYear = useMemo(() => calcShareByYear(teacherPayByYear, totalsByYear), [teacherPayByYear, totalsByYear]);
  const kpiTeacherShare = useMemo(() => calcChange(teacherShareByYear), [teacherShareByYear]);
  const nonClassroomShareByYear = useMemo(() => calcShareByYear(nonClassroomByYear, totalsByYear), [nonClassroomByYear, totalsByYear]);
  const kpiNonClassroomShare = useMemo(() => calcChange(nonClassroomShareByYear), [nonClassroomShareByYear]);
  const kpiEnroll = useMemo(() => calcChange(enrollmentByYear), [enrollmentByYear]);
  const perStudentChange = useMemo(() => calcChange(perStudentByYear), [perStudentByYear]);
  const teacherPerStudentChange = useMemo(() => calcChange(teacherPerStudentByYear), [teacherPerStudentByYear]);
  const totalCagr = useMemo(() => calcCAGR(totalsByYear), [totalsByYear]);

  const totalYears = useMemo(() => Array.from(totalsByYear.keys()).sort((a, b) => a - b), [totalsByYear]);
  const objectYears = useMemo(() => Array.from(objectsByYear.keys()).sort((a, b) => a - b), [objectsByYear]);
  const years = useMemo(() => {
    const set = new Set([...totalYears, ...objectYears]);
    return Array.from(set).sort((a, b) => a - b);
  }, [totalYears, objectYears]);

  // Overall spending series across selected districts
  const overallSeries = useMemo(() => {
    if (!years.length) return [];
    return years.map(year => {
      const totalsForYear = objectsByYear.get(year) || {};
      const total = totalsByYear.get(year) || 0;
      const teacherPay = totalsForYear[TEACHER_PAY_LABEL] || 0;
      return {
        Year: year,
        Total: total,
        [TEACHER_PAY_LABEL]: teacherPay,
      };
    });
  }, [years, totalsByYear, objectsByYear]);

  // Cost centers by object long across selected districts
  const costCenterSeries = useMemo(() => {
    if (!selectedObjects.length) return [];
    return objectYears.map(year => {
      const totalsForYear = objectsByYear.get(year) || {};
      const row = { Year: year };
      selectedObjects.forEach(name => {
        row[name] = totalsForYear[name] || 0;
      });
      return row;
    });
  }, [objectYears, objectsByYear, selectedObjects]);

  const objectOptions = useMemo(() => {
    const opts = new Set();
    objects.forEach(r => {
      const name = getObjectLabel(r.Object_Description_Long ?? r.Object_Long ?? r.OBJECTX_LONG ?? "");
      if (name) opts.add(name);
    });
    return Array.from(opts).sort((a, b) => a.localeCompare(b));
  }, [objects]);

  useEffect(() => {
    if (!objectOptions.length) return;
    setSelectedObjects(prev => {
      const filtered = prev.filter(name => objectOptions.includes(name));
      let next = filtered;
      if (filtered.length === 0) {
        const fallback = DEFAULT_OBJECTS.filter(name => objectOptions.includes(name));
        if (fallback.length) {
          next = fallback;
        } else {
          next = objectOptions.slice(0, Math.min(5, objectOptions.length));
        }
      }
      if (next.length === prev.length && next.every((name, idx) => name === prev[idx])) {
        return prev;
      }
      return next;
    });
  }, [objectOptions]);

  const addObject = (name) => {
    if (!name) return;
    setSelectedObjects(prev => (prev.includes(name) ? prev : [...prev, name]));
  };

  const removeObject = (name) => {
    setSelectedObjects(prev => prev.filter(item => item !== name));
  };

  // When the user types, show datalist suggestions and auto add on exact match
  const handleObjectInputChange = (event) => {
    const v = event.target.value;
    setObjectSelectValue(v);
    const match = objectOptions.find(
      (opt) => opt.toLowerCase() === v.trim().toLowerCase()
    );
    if (match) {
      addObject(match);
      setObjectSelectValue("");
    }
  };

  // Allow pressing Enter to add the typed value if it exactly matches an option
  const handleObjectKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const v = objectSelectValue.trim();
      if (!v) return;
      const match = objectOptions.find(
        (opt) => opt.toLowerCase() === v.toLowerCase()
      );
      if (match) {
        addObject(match);
        setObjectSelectValue("");
      }
    }
  };

  return (
    <main className="space-y-8">
      <section className="section-card space-y-4">
        <h1 className="section-heading">Spending over time</h1>

        <div className="space-y-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search district by name or ID"
            className="input"
            aria-label="Search for a district by name or ID"
          />
          {query && filteredOptions.length > 0 && (
            <div className="suggestion-panel">
              {filteredOptions.map(o => (
                <button
                  key={o.id}
                  type="button"
                  className="suggestion-option"
                  onClick={() => addDistrict(o.id)}
                >
                  {o.name} ({o.id})
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {selected.map(id => {
              const name = districts.find(d => d.id === id)?.name || id;
              return (
                <button key={id} onClick={() => removeDistrict(id)} type="button" className="pill">
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {loading && <div className="notice">Loading spending data</div>}
        {error && <div className="notice error">{error}</div>}
      </section>

      {/* KPIs */}
      <section className="section-card space-y-4">
        <h2 className="section-heading">Key metrics</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Total funding change */}
          <div className="stat-card">
            <div className="kpi">
              <div className="label">Total funding change</div>
              <div className="value">
                {kpiTotal ? `${signed(kpiTotal.pct, fmtPct)} (${signed(kpiTotal.delta, fmtUSD)})` : "—"}
              </div>
              {kpiTotal && <div className={`trend ${kpiTotal.trend}`}>{kpiTotal.startYear} to {kpiTotal.endYear}</div>}
            </div>
          </div>

          {/* Teacher pay change */}
          <div className="stat-card">
            <div className="kpi">
              <div className="label">Teacher pay change</div>
              <div className="value">
                {kpiTeacher && teacherObjectKey
                  ? `${signed(kpiTeacher.pct, fmtPct)} (${signed(kpiTeacher.delta, fmtUSD)})`
                  : teacherObjectKey ? "—" : "Teacher pay object not found"}
              </div>
              {kpiTeacher && <div className={`trend ${kpiTeacher.trend}`}>{kpiTeacher.startYear} to {kpiTeacher.endYear}</div>}
            </div>
          </div>

          {/* Teacher pay share of total */}
          <div className="stat-card">
            <div className="kpi">
              <div className="label">Teacher pay share of total</div>
              <div className="value">
                {kpiTeacherShare
                  ? `${fmtPct(kpiTeacherShare.end)} (${signed(kpiTeacherShare.delta * 100, (n) => `${n.toFixed(1)} pp`)})`
                  : "—"}
              </div>
              {kpiTeacherShare && <div className={`trend ${kpiTeacherShare.trend}`}>{kpiTeacherShare.startYear} to {kpiTeacherShare.endYear}</div>}
            </div>
          </div>

          {/* Non classroom services share */}
          <div className="stat-card">
            <div className="kpi">
              <div className="label">Non classroom services share</div>
              <div className="value">
                {kpiNonClassroomShare
                  ? `${fmtPct(kpiNonClassroomShare.end)} (${signed(kpiNonClassroomShare.delta * 100, (n) => `${n.toFixed(1)} pp`)})`
                  : "—"}
              </div>
              {kpiNonClassroomShare && <div className={`trend ${kpiNonClassroomShare.trend}`}>{kpiNonClassroomShare.startYear} to {kpiNonClassroomShare.endYear}</div>}
            </div>
          </div>

          {/* Change in enrollment */}
          <div className="stat-card">
            <div className="kpi">
              <div className="label">Change in enrollment</div>
              <div className="value">
                {kpiEnroll
                  ? `${signed(kpiEnroll.pct, fmtPct)} (${signed(kpiEnroll.delta, fmtInt)})`
                  : "Add /data/Enrollment_Longitudinal.csv"}
              </div>
              {kpiEnroll && <div className={`trend ${kpiEnroll.trend}`}>{kpiEnroll.startYear} to {kpiEnroll.endYear}</div>}
            </div>
          </div>

          {/* Per student funding change */}
          <div className="stat-card">
            <div className="kpi">
              <div className="label">Per student funding change</div>
              <div className="value">
                {perStudentChange
                  ? `${signed(perStudentChange.pct, fmtPct)} (${signed(perStudentChange.delta, fmtUSD)})`
                  : "Add enrollment CSV"}
              </div>
              {perStudentChange && <div className={`trend ${perStudentChange.trend}`}>{perStudentChange.startYear} to {perStudentChange.endYear}</div>}
            </div>
          </div>

          {/* Teacher pay per student change */}
          <div className="stat-card">
            <div className="kpi">
              <div className="label">Teacher pay per student change</div>
              <div className="value">
                {teacherPerStudentChange && teacherObjectKey
                  ? `${signed(teacherPerStudentChange.pct, fmtPct)} (${signed(teacherPerStudentChange.delta, fmtUSD)})`
                  : "Requires enrollment and teacher pay"}
              </div>
              {teacherPerStudentChange && <div className={`trend ${teacherPerStudentChange.trend}`}>{teacherPerStudentChange.startYear} to {teacherPerStudentChange.endYear}</div>}
            </div>
          </div>

          {/* Total funding CAGR */}
          <div className="stat-card">
            <div className="kpi">
              <div className="label">Total funding CAGR</div>
              <div className="value">{totalCagr ? fmtPct(totalCagr.cagr) : "—"}</div>
              {totalCagr && <div className={`trend ${totalCagr.trend}`}>{totalCagr.startYear} to {totalCagr.endYear}</div>}
            </div>
          </div>

          {/* District grade when a single non statewide district is selected */}
          {(() => {
            const nonState = selected.filter(id => id !== "STATEWIDE");
            if (nonState.length !== 1) return null;
            const only = nonState[0];
            const g = gradesById.get(only);
            return (
              <div className="stat-card">
                <div className="kpi">
                  <div className="label">District grade</div>
                  <div className="value">{g ? (g.grade || "Not found") : "Not found"}</div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Overall spending */}
      <section className="section-card">
        <h2 className="section-heading">Overall spending</h2>
        <ResponsiveContainer width="100%" height={CHART_H_LINE}>
          <LineChart
            data={overallSeries}
            margin={{ top: 8, right: isMobile ? 8 : 16, bottom: 12, left: 8 }}
          >
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="Year"
              tick={AXIS_FONT}
              tickMargin={8}
              minTickGap={isMobile ? 6 : 12}
              axisLine={false}
            />
            <YAxis
              tick={AXIS_FONT}
              tickFormatter={fmtShortUSD}
              width={isMobile ? 58 : 70}
              axisLine={false}
              domain={[0, "dataMax"]}
            />
            <Tooltip
              formatter={(v) => fmtShortUSD(v)}
              labelFormatter={(y) => `Year ${y}`}
              contentStyle={{
                fontSize: isMobile ? 12 : 13,
                backgroundColor: "var(--surface-0)",
                color: "var(--text-0)",
                borderRadius: "var(--radius-md)",
                borderColor: "var(--border)",
              }}
            />
            <Legend
              verticalAlign="top"
              align="left"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 6, fontSize: isMobile ? 12 : 13 }}
            />
            <Line
              type="monotone"
              dataKey="Total"
              name="Total"
              stroke={chartColors.total}
              strokeWidth={LINE_STROKE}
              strokeLinecap="round"
              dot={{ r: DOT_R, stroke: chartColors.total, fill: chartColors.total }}
              activeDot={{ r: ACTIVE_DOT_R, strokeWidth: 2, stroke: chartColors.total, fill: chartColors.total }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey={TEACHER_PAY_LABEL}
              name={TEACHER_PAY_LABEL}
              stroke={chartColors.teacher}
              strokeWidth={LINE_STROKE}
              strokeLinecap="round"
              dot={{ r: DOT_R, stroke: chartColors.teacher, fill: chartColors.teacher }}
              activeDot={{
                r: ACTIVE_DOT_R,
                strokeWidth: 2,
                stroke: chartColors.teacher,
                fill: chartColors.teacher,
              }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
        {!loading && overallSeries.length === 0 && (
          <div className="notice" style={{ marginTop: "0.75rem" }}>
            No data available for current selection
          </div>
        )}
      </section>

      {/* Cost centers by object */}
      <section className="section-card">
        <h2 className="section-heading">Cost centers by object</h2>
        <div className="space-y-2 mb-4">
          <label htmlFor="object-filter" className="block text-sm font-semibold text-[var(--text-muted)]">
            Add or remove cost centers
          </label>
          <div className="search-with-help">
            <input
              id="object-filter"
              className="input input--with-inline-link"
              type="text"
              placeholder={objectOptions.length ? "Search cost centers then press Enter" : "Loading cost centers"}
              value={objectSelectValue}
              onChange={handleObjectInputChange}
              onKeyDown={handleObjectKeyDown}
              list="object-filter-list"
              disabled={!objectOptions.length}
              aria-label="Search cost centers"
            />
            <a
              className="inline-help-link"
              href="https://tea.texas.gov/finance-and-grants/financial-compliance/financial-accountability-system-resource-guide"
              target="_blank"
              rel="noopener noreferrer"
              title="Open the TEA Financial Accountability System Resource Guide"
            >
              Need Help Interpreting the Cost Centers? Click here to find what they mean
            </a>
            <datalist id="object-filter-list">
              {objectOptions.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedObjects.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => removeObject(name)}
                className="pill"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={CHART_H_BAR}>
          <BarChart
            data={costCenterSeries}
            margin={{ top: 8, right: isMobile ? 8 : 16, bottom: 12, left: 8 }}
            barCategoryGap={isMobile ? "28%" : "24%"}
            barGap={isMobile ? 2 : 4}
            maxBarSize={isMobile ? 28 : 36}
          >
            <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="Year"
              tick={AXIS_FONT}
              tickMargin={8}
              minTickGap={isMobile ? 6 : 12}
              axisLine={false}
            />
            <YAxis
              tick={AXIS_FONT}
              tickFormatter={fmtShortUSD}
              width={isMobile ? 58 : 70}
              axisLine={false}
              domain={[0, "dataMax"]}
            />
            <Tooltip
              formatter={(v, n) => [fmtShortUSD(v), n]}
              labelFormatter={(y) => `Year ${y}`}
              contentStyle={{
                fontSize: isMobile ? 12 : 13,
                backgroundColor: "var(--surface-0)",
                color: "var(--text-0)",
                borderRadius: "var(--radius-md)",
                borderColor: "var(--border)",
              }}
            />
            <Legend
              verticalAlign="top"
              align="left"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 6, fontSize: isMobile ? 12 : 13 }}
            />
            {selectedObjects.map((k, i) => {
              const fills = chartColors.palette;
              return <Bar key={k} dataKey={k} name={k} fill={fills[i % fills.length]} />;
            })}
          </BarChart>
        </ResponsiveContainer>
        {!loading && (selectedObjects.length === 0 || costCenterSeries.length === 0) && (
          <div className="notice" style={{ marginTop: "0.75rem" }}>
            {selectedObjects.length === 0
              ? "Select at least one cost center to display spending trends"
              : "No data available for current selection"}
          </div>
        )}
      </section>
    </main>
  );
}
