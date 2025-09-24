// src/pages/LongitudinalSpending.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, CartesianGrid
} from "recharts";

// Absolute URLs to CSV files served from public/
const TOTALS_CSV = "/data/Spending_Longitudinal_Totals.csv";
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

  const isMobile = useIsMobile();
  const CHART_H_LINE = isMobile ? 280 : 360;
  const CHART_H_BAR = isMobile ? 320 : 420;
  const AXIS_FONT = { fontSize: isMobile ? 12 : 13 };
  const LINE_STROKE = isMobile ? 3.5 : 3.75;
  const DOT_R = isMobile ? 3.5 : 4.5;
  const ACTIVE_DOT_R = isMobile ? 6.5 : 7.5;
  const chartColors = useChartColors();

  useEffect(() => {
    let cancelled = false;
    async function go() {
      try {
        setLoading(true);
        const [tRows, oRows] = await Promise.all([loadCsv(TOTALS_CSV), loadCsv(BY_OBJECT_CSV)]);

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

        if (!cancelled) {
          setTotals(t);
          setObjects(o);
          setError("");
        }
      } catch (e) {
        console.error("Data load error", e);
        if (!cancelled) setError("Could not load spending data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    go();
    return () => { cancelled = true; };
  }, []);

  const districts = useMemo(() => {
    const map = new Map();
    totals.forEach(r => { if (!map.has(r.DISTRICT_N)) map.set(r.DISTRICT_N, r.District_Name); });
    if (map.size === 0) {
      objects.forEach(r => { if (!map.has(r.DISTRICT_N)) map.set(r.DISTRICT_N, r.District_Name); });
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [totals, objects]);

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

  const handleObjectSelect = (event) => {
    const { value } = event.target;
    if (!value) return;
    addObject(value);
    setObjectSelectValue("");
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
          <select
            id="object-filter"
            value={objectSelectValue}
            onChange={handleObjectSelect}
            disabled={!objectOptions.length}
            className="select"
          >
            <option value="" disabled>
              {objectOptions.length ? "Select cost center" : "Loading cost centers"}
            </option>
            {objectOptions.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
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
