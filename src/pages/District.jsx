// src/pages/District.jsx  (REPLACE with this whole file if easier)
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadDistrictsCSV } from "../lib/data";
import { getSpendingForDistrict } from "../lib/spending";
import { getCampusesForDistrict } from "../lib/campuses";
import DistrictMap from "../components/DistrictMap";

const fmtInt = (n) =>
  n === null || n === undefined || n === "" || Number.isNaN(+n)
    ? "—"
    : new Intl.NumberFormat("en-US").format(Math.round(+n));

const fmtMoney = (n) =>
  n === null || n === undefined || n === "" || Number.isNaN(+n)
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Math.round(+String(n).replace(/[\$,]/g, "")));

const NUM = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(String(v).replace(/[\$,]/g, ""));

export default function District() {
  const { id } = useParams();
  const [row, setRow] = useState(null);
  const [fields, setFields] = useState(null);
  const [loading, setLoading] = useState(true);

  // spending (kept visible)
  const [spRows, setSpRows] = useState([]);
  const [spCats, setSpCats] = useState([]);
  const [spLoading, setSpLoading] = useState(true);

  // spending filters
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);

  // campuses
  const [campRows, setCampRows] = useState([]);       // raw CSV rows for this district
  const [campFields, setCampFields] = useState(null);
  const [campSearch, setCampSearch] = useState("");

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        const { byId, rows, fields } = await loadDistrictsCSV();
        let r = byId?.[String(id)] ?? null;
        if (!r) r = rows.find((x) => String(x[fields.ID] ?? "") === String(id));
        if (on) { setRow(r || null); setFields(fields || null); }
      } catch (e) {
        console.error(e);
        if (on) { setRow(null); setFields(null); }
      } finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [id]);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setSpLoading(true);
        const { rows, categories } = await getSpendingForDistrict(id);
        if (on) { setSpRows(rows); setSpCats(categories); }
      } catch (e) {
        console.error(e);
        if (on) { setSpRows([]); setSpCats([]); }
      } finally { if (on) setSpLoading(false); }
    })();
    return () => { on = false; };
  }, [id]);

  // load campuses CSV for this district
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const { rows, fields } = await getCampusesForDistrict(id);
        if (on) { setCampRows(rows || []); setCampFields(fields || null); }
      } catch (e) {
        console.error(e);
        if (on) { setCampRows([]); setCampFields(null); }
      }
    })();
    return () => { on = false; };
  }, [id]);

  const kpis = useMemo(() => {
    if (!row || !fields) return null;
    const get = (key) => (fields[key] ? row[fields[key]] : undefined);
    const totalSpending = NUM(get("TOTAL_SPENDING"));
    const enrollment = NUM(get("ENROLLMENT"));
    const perStudentSpending = enrollment > 0 ? Math.round(totalSpending / enrollment) : 0;

    return [
      { label: "Total Spending", value: fmtMoney(totalSpending) },
      { label: "Enrollment", value: fmtInt(enrollment) },
      { label: "Per-Student Spending", value: fmtMoney(perStudentSpending) },
      { label: "District Debt", value: fmtMoney(get("DISTRICT_DEBT")) },
      { label: "Per-Pupil Debt", value: fmtMoney(get("PER_PUPIL_DEBT")) },
      { label: "Average Teacher Salary", value: fmtMoney(get("TEACHER_SALARY")) },
      { label: "Average Principal Salary", value: fmtMoney(get("PRINCIPAL_SALARY")) },
      { label: "Superintendent Salary", value: fmtMoney(get("SUPERINTENDENT_SALARY")) },
    ];
  }, [row, fields]);

  // spending filtered/paged (unchanged from earlier)
  const filteredSpending = useMemo(() => {
    let list = spRows;
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (r) =>
          r.vendor.toLowerCase().includes(needle) ||
          r.description.toLowerCase().includes(needle) ||
          r.category.toLowerCase().includes(needle)
      );
    }
    if (cat) list = list.filter((r) => r.category === cat);
    const min = Number(minAmt || 0);
    const max = Number(maxAmt || 0);
    if (minAmt !== "" && !Number.isNaN(min)) list = list.filter((r) => r.amount >= min);
    if (maxAmt !== "" && !Number.isNaN(max)) list = list.filter((r) => r.amount <= max);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (from || to) {
      list = list.filter((r) => {
        const d = r.date ? new Date(r.date) : null;
        if (!d) return false;
        if (from && d < from) return false;
        if (to) { const toEnd = new Date(to); toEnd.setHours(23, 59, 59, 999); if (d > toEnd) return false; }
        return true;
      });
    }
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "amount") return dir * (a.amount - b.amount);
      if (sortKey === "vendor") return dir * a.vendor.localeCompare(b.vendor);
      if (sortKey === "category") return dir * a.category.localeCompare(b.category);
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return dir * (da - db);
    });
    return list;
  }, [spRows, q, cat, minAmt, maxAmt, fromDate, toDate, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSpending.length / size));
  const pageRows = filteredSpending.slice((page - 1) * size, page * size);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!row || !fields)
    return (
      <div className="p-6 space-y-4">
        <div className="text-2xl font-bold">District not found</div>
        <Link className="text-indigo-700 underline" to="/districts">Back to Districts</Link>
      </div>
    );

  const name = row[fields.NAME] ?? row.DISTRICT ?? row.DISTNAME ?? "District";
  const county = row[fields.COUNTY] ?? "—";
  const code = String(row[fields.ID] ?? id ?? "—");

  // ---- campuses list (sorted by Campus Score desc, with search) ----
  const campusesSorted = useMemo(() => {
    if (!campRows || !campFields) return [];
    const scoreKey = campFields.CAMPUS_SCORE;
    const nameKey = campFields.CAMPUS_NAME;
    const idKey = campFields.CAMPUS_ID;
    const q = campSearch.trim().toLowerCase();

    let list = campRows.map((r) => ({
      id: idKey ? String(r[idKey]) : "",
      name: nameKey ? String(r[nameKey]) : "",
      score: scoreKey ? NUM(r[scoreKey]) : 0,
      raw: r,
    }));

    if (q) list = list.filter((x) => x.name.toLowerCase().includes(q) || x.id.includes(q));

    // sort by score desc, tie-breaker by name asc
    list.sort((a, b) => (b.score - a.score) || a.name.localeCompare(b.name));

    return list;
  }, [campRows, campFields, campSearch]);

  return (
    <div className="space-y-8 px-4 md:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {name} <span className="text-gray-500">({code})</span>
          </h1>
          <div className="text-gray-600 mt-2">{county} County</div>
        </div>
        <Link to="/" className="shrink-0 inline-flex items-center rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
          ← Home
        </Link>
      </div>

      {/* KPIs */}
      <section className="bg-white rounded-2xl border p-6 md:p-8">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis?.map((k) => (
            <div key={k.label} className="rounded-xl border p-4">
              <div className="text-sm text-gray-600">{k.label}</div>
              <div className="text-2xl font-bold mt-1">{k.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 🗺️ Map with campus points */}
      <section className="bg-white rounded-2xl border p-6 md:p-8">
        <h2 className="text-xl font-semibold mb-4">Map</h2>
        <DistrictMap districtId={code} />
      </section>

      {/* 🏫 Campuses panel */}
      <section className="bg-white rounded-2xl border p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Campuses</h2>
          <div className="text-sm text-gray-500">{campusesSorted.length} campus{campusesSorted.length === 1 ? "" : "es"}</div>
        </div>

        <input
          className="border rounded-xl px-3 py-2 w-full md:w-96 mb-4"
          placeholder="Search campus name or ID"
          value={campSearch}
          onChange={(e) => setCampSearch(e.target.value)}
        />

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Campus</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Grade</th>
                <th className="py-2 pr-4">Reading OGL</th>
                <th className="py-2 pr-4">Math OGL</th>
                <th className="py-2 pr-4 text-right">Teachers</th>
                <th className="py-2 pr-4 text-right">Admins</th>
              </tr>
            </thead>
            <tbody>
              {campusesSorted.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-gray-500">No campuses.</td></tr>
              ) : (
                campusesSorted.map((c) => {
                  const f = campFields;
                  const r = c.raw;
                  const grade = f.CAMPUS_GRADE ? r[f.CAMPUS_GRADE] : "—";
                  const read = f.READING_OGR ? r[f.READING_OGR] : "—";
                  const math = f.MATH_OGR ? r[f.MATH_OGR] : "—";
                  const tcnt = f.TEACHER_COUNT ? r[f.TEACHER_COUNT] : "—";
                  const acnt = f.ADMIN_COUNT ? r[f.ADMIN_COUNT] : "—";
                  return (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4">
                        <Link className="text-indigo-700 font-medium" to={`/campus/${encodeURIComponent(c.id)}`}>
                          {c.name} <span className="text-gray-500">({c.id})</span>
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{c.score || c.score === 0 ? c.score : "—"}</td>
                      <td className="py-2 pr-4">{grade ?? "—"}</td>
                      <td className="py-2 pr-4">{read ?? "—"}</td>
                      <td className="py-2 pr-4">{math ?? "—"}</td>
                      <td className="py-2 pr-4 text-right">{fmtInt(tcnt)}</td>
                      <td className="py-2 pr-4 text-right">{fmtInt(acnt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Spending (unchanged) */}
      {/* ... keep your existing Spending section here ... */}
      {/* (omitted in this snippet for brevity — your current code is fine) */}
    </div>
  );
}
