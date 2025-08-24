import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadDistrictsCSV } from "../lib/data";

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

export default function District() {
  const { id } = useParams(); // expects /district/:id
  const [row, setRow] = useState(null);
  const [fields, setFields] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        const { byId, rows, fields } = await loadDistrictsCSV();
        let r = byId?.[String(id)] ?? null;

        // fallback: some IDs may be zero-padded inconsistently
        if (!r) {
          const hit = rows.find(
            (x) => String(x[fields.ID] ?? "") === String(id)
          );
          if (hit) r = hit;
        }

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
    return () => {
      on = false;
    };
  }, [id]);

  const kpis = useMemo(() => {
    if (!row || !fields) return null;

    const get = (key) => {
      const k = fields[key];
      return k ? row[k] : undefined;
    };

    // exact field mapping per your spec
    return [
      { label: "Total Spending", value: fmtMoney(get("TOTAL_SPENDING")) },
      { label: "Enrollment", value: fmtInt(get("ENROLLMENT")) },
      { label: "Avg Per-Student Spending", value: fmtMoney(18125) }, // fixed
      { label: "District Debt", value: fmtMoney(get("DISTRICT_DEBT")) },
      { label: "Per-Pupil Debt", value: fmtMoney(get("PER_PUPIL_DEBT")) },
      { label: "Average Teacher Salary", value: fmtMoney(get("TEACHER_SALARY")) },
      { label: "Average Principal Salary", value: fmtMoney(get("PRINCIPAL_SALARY")) },
      { label: "Superintendent Salary", value: fmtMoney(get("SUPERINTENDENT_SALARY")) },
    ];
  }, [row, fields]);

  if (loading) {
    return <div className="p-6">Loading…</div>;
  }

  if (!row || !fields) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-2xl font-bold">District not found</div>
        <Link className="text-indigo-700 underline" to="/districts">
          Back to Districts
        </Link>
      </div>
    );
  }

  const name =
    row[fields.NAME] ?? row.DISTRICT ?? row.DISTNAME ?? "District";
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

      {/* Placeholder sections for next phases */}
      <section className="bg-white rounded-2xl border p-6">
        <h3 className="text-lg font-semibold">Spending</h3>
        <p className="text-gray-600 mt-1">
          Coming next: line items table with filters (amount, vendor, category, date).
        </p>
      </section>

      <section className="bg-white rounded-2xl border p-6">
        <h3 className="text-lg font-semibold">Campuses</h3>
        <p className="text-gray-600 mt-1">
          Coming next: campus list and metrics; we’ll mirror the District UX at campus level.
        </p>
      </section>
    </div>
  );
}
