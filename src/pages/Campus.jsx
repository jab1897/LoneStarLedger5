import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCampusById } from "../lib/campuses";
import CampusMap from "../components/CampusMap";

const fmtInt = (n) =>
  n === null || n === undefined || n === "" || Number.isNaN(+n)
    ? "—"
    : new Intl.NumberFormat("en-US").format(Math.round(+n));

const fmtMoney = (n) =>
  n === null || n === undefined || n === "" || Number.isNaN(+n)
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.round(+String(n).replace(/[\$,]/g, "")));

export default function Campus() {
  const { id } = useParams(); // /campus/:id
  const [row, setRow] = useState(null);
  const [fields, setFields] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        const { row, fields } = await getCampusById(id);
        if (on) { setRow(row || null); setFields(fields || null); }
      } catch (e) { console.error(e); if (on) { setRow(null); setFields(null); } }
      finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [id]);

  const kpis = useMemo(() => {
    if (!row || !fields) return null;
    const f = fields;
    const v = (k) => (f[k] ? row[f[k]] : undefined);
    return [
      { label: "Reading On Grade-Level", value: v("READING_OGR") ?? "—" },
      { label: "Math On Grade-Level", value: v("MATH_OGR") ?? "—" },
      { label: "Teacher Count", value: fmtInt(v("TEACHER_COUNT")) },
      { label: "Admin Count", value: fmtInt(v("ADMIN_COUNT")) },
      { label: "Average Admin Salary", value: fmtMoney(v("AVG_ADMIN_SAL")) },
      { label: "Average Teacher Salary", value: fmtMoney(v("AVG_TEACH_SAL")) },
      { label: "Campus Grade", value: v("CAMPUS_GRADE") ?? "—" },
      { label: "Campus Score", value: v("CAMPUS_SCORE") ?? "—" },
    ];
  }, [row, fields]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!row || !fields)
    return (
      <div className="p-6 space-y-4">
        <div className="text-2xl font-bold">Campus not found</div>
        <Link className="text-indigo-700 underline" to="/districts">Back</Link>
      </div>
    );

  const name = fields.CAMPUS_NAME ? row[fields.CAMPUS_NAME] : "Campus";
  const code = fields.CAMPUS_ID ? row[fields.CAMPUS_ID] : id;
  const districtId = fields.DISTRICT_ID ? row[fields.DISTRICT_ID] : "";

  return (
    <div className="space-y-8 px-4 md:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {name} <span className="text-gray-500">({code})</span>
          </h1>
          {districtId ? (
            <div className="text-gray-600 mt-2">
              District: <Link className="text-indigo-700 underline" to={`/district/${encodeURIComponent(districtId)}`}>{districtId}</Link>
            </div>
          ) : null}
        </div>
        <Link to="/" className="shrink-0 inline-flex items-center rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
          ← Home
        </Link>
      </div>

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

      <section className="bg-white rounded-2xl border p-6 md:p-8">
        <h2 className="text-xl font-semibold mb-4">Map</h2>
        <CampusMap campusId={String(code)} />
      </section>
    </div>
  );
}
