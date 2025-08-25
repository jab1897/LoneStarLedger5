// src/pages/District.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadDistrictsCSV } from "../lib/data";
import { getSpendingForDistrict } from "../lib/spending";
import DistrictMap from "../components/DistrictMap"; // 👈 NEW

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

// local numeric parser for row values
const NUM = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(String(v).replace(/[\$,]/g, ""));

export default function District() {
  const { id } = useParams(); // /district/:id
  const [row, setRow] = useState(null);
  const [fields, setFields] = useState(null);
  const [loading, setLoading] = useState(true);

  // spending state (kept visible per your preference)
  const [spRows, setSpRows] = useState([]);
  const [spCats, setSpCats] = useState([]);
  const [spLoading, setSpLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  // pagination
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        const { byId, rows, fields } = await loadDistrictsCSV();
        let r = byId?.[String(id)] ?? null;
        if (!r) r = rows.find((x) => String(x[fields.ID] ?? "") === String(id));
        if (on) {
          setRow(r || null);
          setFields(fields || null);
        }
      } catch (e) {
        console.error(e);
        if (on) {
          setRow(null);
          setFields(null);
        }
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, [id]);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setSpLoading(true);
        const { rows, categories } = await getSpendingForDistrict(id);
        if (on) {
          setSpRows(rows);
          setSpCats(categories);
        }
      } catch (e) {
        console.error(e);
        if (on) {
          setSpRows([]);
          setSpCats([]);
        }
      } finally {
        if (on) setSpLoading(false);
      }
    })();
    return () => { on = false; };
  }, [id]);

  const kpis = useMemo(() => {
    if (!row || !fields) return null;
    const get = (key) => {
      const k = fields[key];
      return k ? row[k] : undefined;
    };

    // 👇 compute per-student spending from this district's row
    const totalSpending = NUM(get("TOTAL_SPENDING"));
    const enrollment = NUM(get("ENROLLMENT"));
    const perStudentSpending = enrollment > 0 ? Math.round(totalSpending / enrollment) : 0;

    return [
      { label: "Total Spending", value: fmtMoney(totalSpending) },
      { label: "Enrollment", value: fmtInt(enrollment) },
      { label: "Per-Student Spending", value: fmtMoney(perStudentSpending) }, // ← computed
      { label: "District Debt", value: fmtMoney(get("DISTRICT_DEBT")) },
      { label: "Per-Pupil Debt", value: fmtMoney(get("PER_PUPIL_DEBT")) },
      { label: "Average Teacher Salary", value: fmtMoney(get("TEACHER_SALARY")) },
      { label: "Average Principal Salary", value: fmtMoney(get("PRINCIPAL_SALARY")) },
      { label: "Superintendent Salary", value: fmtMoney(get("SUPERINTENDENT_SALARY")) },
    ];
  }, [row, fields]);

  const filteredSpending = useMemo(() => {
    let list = spRows;

    // keyword (vendor/description/category)
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (r) =>
          r.vendor.toLowerCase().includes(needle) ||
          r.description.toLowerCase().includes(needle) ||
          r.category.toLowerCase().includes(needle)
      );
    }

    // category
    if (cat) list = list.filter((r) => r.category === cat);

    // amount range
    const min = Number(minAmt || 0);
    const max = Number(maxAmt || 0);
    if (minAmt !== "" && !Number.isNaN(min)) list = list.filter((r) => r.amount >= min);
    if (maxAmt !== "" && !Number.isNaN(max)) list = list.filter((r) => r.amount <= max);

    // date range (inclusive)
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (from || to) {
      list = list.filter((r) => {
        const d = r.date ? new Date(r.date) : null;
        if (!d) return false;
        if (from && d < from) return false;
        if (to) {
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);
          if (d > toEnd) return false;
        }
        return true;
      });
    }

    // sort
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "amount") return dir * (a.amount - b.amount);
      if (sortKey === "vendor") return dir * a.vendor.localeCompare(b.vendor);
      if (sortKey === "category") return dir * a.category.localeCompare(b.category);
      // default: date
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return dir * (da - db);
    });

    return list;
  }, [spRows, q, cat, minAmt, maxAmt, fromDate, toDate, sortKey, sortDir]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filteredSpending.length / size));
  const pageRows = filteredSpending.slice((page - 1) * size, page * size);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!row || !fields)
    return (
      <div className="p-6 space-y-4">
        <div className="text-2xl font-bold">District not found</div>
        <Link className="text-indigo-700 underline" to="/districts">
          Back to Districts
        </Link>
      </div>
    );

  const name = row[fields.NAME] ?? row.DISTRICT ?? row.DISTNAME ?? "District";
  const county = row[fields.COUNTY] ?? "—";
  const code = String(row[fields.ID] ?? id ?? "—");

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
        <Link
          to="/"
          className="shrink-0 inline-flex items-center rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          title="View on statewide map"
        >
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

      {/* 🗺️ District Map */}
      <section className="bg-white rounded-2xl border p-6 md:p-8">
        <h2 className="text-xl font-semibold mb-4">Map</h2>
        <DistrictMap districtId={code} />
        {/* Future: when campus GeoJSON/CSV land, we will add campus points here */}
      </section>

      {/* Spending Table (kept visible as a reminder) */}
      <section className="bg-white rounded-2xl border p-6 md:p-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold">Spending</h2>
          <div className="text-sm text-gray-500">
            {spLoading ? "Loading…" : `${filteredSpending.length} result${filteredSpending.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Search vendor, description, category"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
          <select
            className="border rounded-lg px-3 py-2"
            value={cat}
            onChange={(e) => { setCat(e.target.value); setPage(1); }}
          >
            <option value="">All categories</option>
            {spCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            className="border rounded-lg px-3 py-2"
            type="number" inputMode="numeric" placeholder="Min amount"
            value={minAmt} onChange={(e) => { setMinAmt(e.target.value); setPage(1); }}
          />
          <input
            className="border rounded-lg px-3 py-2"
            type="number" inputMode="numeric" placeholder="Max amount"
            value={maxAmt} onChange={(e) => { setMaxAmt(e.target.value); setPage(1); }}
          />
          <div className="grid grid-cols-2 gap-2">
            <input className="border rounded-lg px-3 py-2" type="date" value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
            <input className="border rounded-lg px-3 py-2" type="date" value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
          </div>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            className="border rounded-lg px-2 py-1"
            value={sortKey}
            onChange={(e) => { setSortKey(e.target.value); setPage(1); }}
          >
            <option value="date">Date</option>
            <option value="amount">Amount</option>
            <option value="vendor">Vendor</option>
            <option value="category">Category</option>
          </select>
          <button
            className="border rounded-lg px-2 py-1"
            onClick={() => { setSortDir((d) => (d === "asc" ? "desc" : "asc")); setPage(1); }}
            title="Toggle sort direction"
          >
            {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Vendor</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4">Description</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-gray-500">No results.</td></tr>
              ) : (
                pageRows.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-4 whitespace-nowrap">{r.date || "—"}</td>
                    <td className="py-2 pr-4">{r.vendor || "—"}</td>
                    <td className="py-2 pr-4">{r.category || "—"}</td>
                    <td className="py-2 pr-4 text-right">{fmtMoney(r.amount)}</td>
                    <td className="py-2 pr-4">{r.description || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="flex items-center gap-2 justify-end pt-3 text-sm">
          <span>Rows per page:</span>
          <select
            className="border rounded px-2 py-1"
            value={size}
            onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}
          >
            {[10,25,50,100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >Prev</button>
          <div>{page} / {totalPages}</div>
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >Next</button>
        </div>
      </section>

      {/* Campuses placeholder */}
      <section className="bg-white rounded-2xl border p-6">
        <h3 className="text-lg font-semibold">Campuses</h3>
        <p className="text-gray-600 mt-1">
          Coming next: campus points overlay, campus count, names, and search.
        </p>
      </section>
    </div>
  );
}
