import React from "react";
import { Link, useParams } from "react-router-dom";
import StatPill from "../ui/StatPill";
// import DataTable from "../ui/DataTable"; // (not used here)
import { fetchCSV, fetchJSON, indexBy, findFeatureByProp } from "../lib/staticData";
import { usd, num } from "../lib/format";
import Map from "../ui/Map";

const DISTRICTS_CSV = "/data/Current_Districts_2025.csv";
const DISTRICTS_GEOJSON = "/data/Current_Districts_2025.geojson";
const KEY = "DISTRICT_N";

async function tryLoadDistrictFeature(id) {
  const splitPath = `/data/geojson/district_${id}.geojson`;
  try { return await fetchJSON(splitPath); }
  catch {
    const big = await fetchJSON(DISTRICTS_GEOJSON);
    const feat = findFeatureByProp(big, KEY, id);
    if (!feat) throw new Error(`No feature with ${KEY}=${id} in big GeoJSON`);
    return { type: "FeatureCollection", features: [feat] };
  }
}

// safe number
const toNum = (v) => (v === null || v === undefined || v === "" ? NaN : Number(v));

export default function DistrictDetail(){
  const { id } = useParams();
  const [row, setRow] = React.useState(null);
  const [geom, setGeom] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(()=>{
    let alive = true;
    setLoading(true); setError(null);
    Promise.allSettled([
      fetchCSV(DISTRICTS_CSV),
      tryLoadDistrictFeature(id)
    ]).then(([csvRes, geoRes])=>{
      if(!alive) return;

      if (csvRes.status === "fulfilled") {
        const idx = indexBy(csvRes.value, KEY);
        setRow(idx.get(String(id)) || null);
      } else {
        setError(String(csvRes.reason));
      }

      if (geoRes.status === "fulfilled") setGeom(geoRes.value);
    }).catch(e => alive && setError(String(e)))
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive = false };
  }, [id]);

  // Derive display name (name first, ID in gray)
  const displayName = row?.NAME ?? row?.DISTRICT ?? row?.DISTNAME ?? `District ${id}`;
  const county = row?.COUNTY ?? row?.county ?? "";

  // Pull KPI fields from your exact CSV headers
  const totalSpendingRaw   = row?.["Total Spending"];
  const enrollmentRaw      = row?.["Enrollment"];
  const perStudentRaw      = row?.["Average Per-Student Spending"];  // may be missing
  const districtDebtRaw    = row?.["Distrit Debt"];                   // (typo preserved)
  const perPupilDebtRaw    = row?.["Per-Pupil Debt"];
  const teacherSalaryRaw   = row?.["Average Teacher Salary"];
  const principalSalaryRaw = row?.["Average Principal Salary"];
  const superSalaryRaw     = row?.["Superintendent Salary"];

  const totalSpending = toNum(totalSpendingRaw);
  const enrollment    = toNum(enrollmentRaw);
  const perStudentCSV = toNum(perStudentRaw);
  const perStudent = !Number.isNaN(perStudentCSV)
    ? perStudentCSV
    : (!Number.isNaN(totalSpending) && !Number.isNaN(enrollment) && enrollment > 0
        ? totalSpending / enrollment
        : NaN);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-600">
        <Link className="hover:underline" to="/districts">Districts</Link>
        <span className="px-2">/</span>
        <span className="text-gray-900 font-medium">
          {displayName} <span className="text-gray-500">({id})</span>
        </span>
      </nav>

      <header className="bg-white border rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{displayName}</h1>
            <p className="text-gray-600 mt-1">{county}</p>
          </div>

          {/* KPIs driven by CSV headers */}
          <div className="flex flex-wrap gap-2">
            <StatPill label="Enrollment" value={Number.isNaN(enrollment) ? "—" : num.format(enrollment)} />
            <StatPill label="Per pupil" value={Number.isNaN(perStudent) ? "—" : usd.format(perStudent)} />
            <StatPill label="Total spend" value={Number.isNaN(totalSpending) ? "—" : usd.format(totalSpending)} />

            {/* Optional: show the salary/debt trio on wide screens */}
            <StatPill label="District debt" value={districtDebtRaw ? usd.format(toNum(districtDebtRaw)) : "—"} />
            <StatPill label="Per‑pupil debt" value={perPupilDebtRaw ? usd.format(toNum(perPupilDebtRaw)) : "—"} />
            <StatPill label="Teacher salary" value={teacherSalaryRaw ? usd.format(toNum(teacherSalaryRaw)) : "—"} />
            <StatPill label="Principal salary" value={principalSalaryRaw ? usd.format(toNum(principalSalaryRaw)) : "—"} />
            <StatPill label="Superintendent" value={superSalaryRaw ? usd.format(toNum(superSalaryRaw)) : "—"} />
          </div>
        </div>
      </header>

      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold">Geometry</h2>
        {geom
          ? <Map geom={geom} height={420} />
          : <p className="text-gray-600">No geometry found for this district yet.</p>}
      </section>

      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold">District attributes</h2>
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-700">{error}</div>}
        {!loading && !error && (
          row ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {Object.entries(row).map(([k,v])=>(
                <div key={k} className="bg-gray-50 border rounded-xl px-3 py-2">
                  <div className="text-gray-600">{k}</div>
                  <div className="font-medium break-words">{String(v)}</div>
                </div>
              ))}
            </div>
          ) : <div>No record found in CSV for ID {id}.</div>
        )}
      </section>
    </div>
  );
}
