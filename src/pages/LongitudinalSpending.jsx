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

// friendly money format
const fmtMoney = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

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

const COLORS = {
  total: "#0B3D91",
  teacher: "#0B3D91",
  nonTeacher: "#1F66D1",
  capital: "#4D8FEA",
  other: "#7FB1F2",
  recapture: "#FFC72C",
};

export default function LongitudinalSpending() {
  const [totals, setTotals] = useState([]);     // rows with DISTRICT_N, District_Name, Year, Total_Spending
  const [objects, setObjects] = useState([]);   // rows with DISTRICT_N, District_Name, Year, Object_Description_Long, Object_Spending
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(["STATEWIDE"]); // default statewide chip

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

  const years = useMemo(() => {
    const s = new Set(totals.filter(r => selected.includes(r.DISTRICT_N)).map(r => Number(r.Year)));
    return Array.from(s).sort((a, b) => a - b);
  }, [totals, selected]);

  // Overall spending series across selected districts
  const overallSeries = useMemo(() => {
    if (!years.length) return [];
    return years.map(year => {
      const rows = totals.filter(r => selected.includes(r.DISTRICT_N) && Number(r.Year) === year);
      const total = rows.reduce((acc, r) => acc + toNumber(r.Total_Spending), 0);
      return { Year: year, Total: total };
    });
  }, [totals, years, selected]);

  // Cost centers by object long across selected districts
  const costCenterSeries = useMemo(() => {
    const map = new Map(); // year -> { objectName: sum }
    objects.forEach(r => {
      if (!selected.includes(r.DISTRICT_N)) return;
      const y = Number(r.Year);
      const name = r.Object_Description_Long;
      const m = map.get(y) || {};
      m[name] = (m[name] || 0) + toNumber(r.Object_Spending);
      map.set(y, m);
    });
    const ys = Array.from(map.keys()).sort((a, b) => a - b);
    return ys.map(y => ({ Year: y, ...map.get(y) }));
  }, [objects, selected]);

  // choose top five object series to keep the legend readable
  const topKeys = useMemo(() => {
    const totalsByKey = {};
    costCenterSeries.forEach(row => {
      Object.keys(row).forEach(k => {
        if (k === "Year") return;
        totalsByKey[k] = (totalsByKey[k] || 0) + toNumber(row[k]);
      });
    });
    return Object.entries(totalsByKey).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
  }, [costCenterSeries]);

  return (
    <main className="px-4 md:px-8 space-y-8">
      <h1 className="text-3xl font-extrabold">Spending over time</h1>

      {/* search and selected chips */}
      <div className="space-y-3">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search district by name or ID"
          className="w-full max-w-xl border rounded px-3 py-2"
        />
        {query && (
          <div className="border rounded p-2 max-w-xl bg-white">
            {filteredOptions.map(o => (
              <div key={o.id} className="cursor-pointer py-1 px-2 hover:bg-gray-100" onClick={() => addDistrict(o.id)}>
                {o.name} ({o.id})
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {selected.map(id => {
            const name = districts.find(d => d.id === id)?.name || id;
            return (
              <button key={id} onClick={() => removeDistrict(id)} className="px-2 py-1 rounded bg-blue-100">
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading spending data</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Overall spending */}
      <section>
        <h2 className="text-xl font-bold mb-2">Overall spending</h2>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={overallSeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Year" />
            <YAxis />
            <Tooltip formatter={(v) => fmtMoney(v)} />
            <Legend />
            <Line type="monotone" dataKey="Total" stroke={COLORS.total} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        {!loading && overallSeries.length === 0 && (
          <div className="text-sm text-gray-500 mt-2">No data available for current selection</div>
        )}
      </section>

      {/* Cost centers by object */}
      <section>
        <h2 className="text-xl font-bold mb-2">Cost centers by object</h2>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={costCenterSeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Year" />
            <YAxis />
            <Tooltip formatter={(v, n) => [fmtMoney(v), n]} />
            <Legend />
            {topKeys.map((k, i) => {
              const fills = [COLORS.teacher, COLORS.nonTeacher, COLORS.capital, COLORS.other, COLORS.recapture];
              return <Bar key={k} dataKey={k} name={k} fill={fills[i % fills.length]} />;
            })}
          </BarChart>
        </ResponsiveContainer>
        {!loading && costCenterSeries.length === 0 && (
          <div className="text-sm text-gray-500 mt-2">No data available for current selection</div>
        )}
      </section>
    </main>
  );
}
