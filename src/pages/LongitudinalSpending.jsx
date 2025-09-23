import React, { useEffect, useMemo, useState } from "react";
import { fetchCSV } from "../lib/staticData";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, CartesianGrid,
} from "recharts";

const COLORS = {
  total: "#0B3D91",
  teacher: "#0B3D91",
  nonTeacher: "#1F66D1",
  capital: "#4D8FEA",
  other: "#7FB1F2",
  recapture: "#FFC72C",
};

const fmtMoney = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);

const toNumber = (value) => {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/[^0-9.-]+/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function LongitudinalSpending() {
  const [totals, setTotals] = useState([]);
  const [objects, setObjects] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(["STATEWIDE"]); // default statewide

  useEffect(() => {
    fetchCSV("/data/Spending_Longitudinal_Totals.csv").then(setTotals);
    fetchCSV("/data/Spending_By_Object_Long.csv").then(setObjects);
  }, []);

  const districts = useMemo(() => {
    const map = new Map();
    [...totals, ...objects].forEach(r => {
      if (!map.has(r.DISTRICT_N)) map.set(r.DISTRICT_N, r.District_Name);
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [totals, objects]);

  const addDistrict = (id) => {
    if (!selected.includes(id)) setSelected(prev => [...prev, id]);
    setQuery("");
  };
  const removeDistrict = (id) => setSelected(prev => prev.filter(x => x !== id));

  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase();
    return districts.filter(d => d.name.toLowerCase().includes(q) || d.id.includes(query)).slice(0, 10);
  }, [districts, query]);

  const years = useMemo(() => {
    const s = new Set(
      totals.filter(r => selected.includes(r.DISTRICT_N)).map(r => Number(r.Year))
    );
    return Array.from(s).sort((a, b) => a - b);
  }, [totals, selected]);

  // overall spending line data
  const overallSeries = useMemo(() => {
    return years.map(year => {
      const rows = totals.filter(
        r => selected.includes(r.DISTRICT_N) && Number(r.Year) === year
      );
      const total = rows.reduce((acc, r) => acc + toNumber(r.Total_Spending), 0);
      return { Year: year, Total: total };
    });
  }, [totals, years, selected]);

  // cost center data using object long
  const costCenterSeries = useMemo(() => {
    // sum selected districts per year per object long
    const byYear = new Map();
    objects.forEach(r => {
      if (!selected.includes(r.DISTRICT_N)) return;
      const y = Number(r.Year);
      const key = r.Object_Description_Long;
      const m = byYear.get(y) || {};
      m[key] = (m[key] || 0) + toNumber(r.Object_Spending);
      byYear.set(y, m);
    });
    const sortedYears = Array.from(byYear.keys()).sort((a, b) => a - b);
    return sortedYears.map(y => ({ Year: y, ...byYear.get(y) }));
  }, [objects, selected]);

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

      {/* overall spending */}
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
      </section>

      {/* cost centers by object long */}
      <section>
        <h2 className="text-xl font-bold mb-2">Cost centers by object</h2>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={costCenterSeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Year" />
            <YAxis />
            <Tooltip formatter={(v, n) => [fmtMoney(v), n]} />
            <Legend />
            {/* Render top five series by average spend so legend stays readable */}
            {Object.entries(
              costCenterSeries.reduce((acc, row) => {
                Object.keys(row).forEach(k => { if (k !== "Year") acc[k] = (acc[k] || 0) + (row[k] || 0); });
                return acc;
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([k], i) => {
                const fills = [COLORS.teacher, COLORS.nonTeacher, COLORS.capital, COLORS.other, COLORS.recapture];
                return <Bar key={k} dataKey={k} name={k} fill={fills[i % fills.length]} />;
              })}
          </BarChart>
        </ResponsiveContainer>
      </section>
    </main>
  );
}
