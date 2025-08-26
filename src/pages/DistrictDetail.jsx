import React from "react";
import { Link, useParams } from "react-router-dom";
import StatPill from "../ui/StatPill";
import { fetchCSV, fetchJSON, indexBy, findFeatureByProp } from "../lib/staticData";
import { usd, num } from "../lib/format";
import LeafMap from "../ui/Map";

const DISTRICTS_CSV = "/data/Current_Districts_2025.csv";
const DISTRICTS_GEOJSON = "/data/Current_Districts_2025.geojson";
const KEY = "DISTRICT_N";

// Try split GeoJSON first; fall back to statewide and pick the feature
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

// --- header helpers ----------------------------------------------------------
const norm = (s) => String(s || "")
  .toLowerCase()
  .replace(/[-_ ]+/g, "")         // remove separators
  .replace(/[^a-z0-9]/g, "");     // strip punctuation

// Build a resolver map from normalized header -> actual header (handles "-1"/"-2")
function buildHeaderMap(row) {
  const map = new globalThis.Map();
  const keys = Object.keys(row || {});
  for (const k of keys) {
    // strip "-<num>" suffix that parsers add for duplicates
    const base = k.replace(/-\d+$/, "");
    const nk = norm(base);
    if (!map.has(nk)) map.set(nk, k);
  }
  return map;
}

function pick(row, hdrMap, ...labels) {
  for (const label of labels) {
    const key = hdrMap.get(norm(label));
    if (key && row[key] !== undefined && row[key] !== "") return row[key];
  }
  return undefined;
}

const toNum = (v) => (v === null || v === undefined || v === "" ? NaN : Number(v));

// ----------------------------------------------------------------------------
export default function DistrictDetail(){
  const { id } = useParams();
  const [row, setRow] = React.useState(null);
  const [hdr, setHdr] = React.useState(new globalThis.Map());
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
        const found = idx.get(String(id)) || null;
        setRow(found);
        setHdr(buildHeaderMap(found || {}));
      } else {
        setError(String(csvRes.reason));
      }

      if (geoRes.status === "fulfilled") setGeom(geoRes.value);
    }).catch(e => alive && setError(String(e)))
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive = false };
  }, [id]);

  // Name first, ID in gray
  const displayName =
    (row && (pick(row, hdr, "NAME") || pick(row, hdr, "DISTRICT", "DISTNAME"))) ||
    `District ${id}`;
  const county = row ? (pick(row, hdr, "COUNTY") || "") : "";

  // KPIs via robust header resolution
  let totalSpending   = toNum(pick(row, hdr, "Total Spending"));
  const enrollment    = toNum(pick(row, hdr, "Enrollment"));
  const perStudentCSV = toNum(pick(row, hdr, "Average Per-Student Spending"));
  const districtDebt  = toNum(pick(row, hdr, "Distrit Debt")); // header has typo
  const perPupilDebt  = toNum(pick(row, hdr, "Per-Pupil Debt"));
  const teacherSalary = toNum(pick(row, hdr, "Average Teacher Salary"));
  const principalSal  = toNum(pick(row, hdr, "Average Principal Salary"));
  const superSalary   = toNum(pick(row, hdr, "Superintendent Salary"));

  // Derive per-student if column missing
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

          {/* KPIs */}
          <div className="flex flex-wrap gap-2">
            <StatPill label="Enrollment" value={Number.isNaN(enrollment) ? "—" : num.format(enrollment)} />
            <StatPill label="Per pupil" value={Number.isNaN(perStudent) ? "—" : usd.format(perStudent)} />
            <StatPill label="Total spend" value={Number.isNaN(totalSpending) ? "—" : usd.format(totalSpending)} />
            <StatPill label="District debt" value={Number.isNaN(districtDebt) ? "—" : usd.format(districtDebt)} />
            <StatPill label="Per‑pupil debt" value={Number.isNaN(perPupilDebt) ? "—" : usd.format(perPupilDebt)} />
            <StatPill label="Teacher salary" value={Number.isNaN(teacherSalary) ? "—" : usd.format(teacherSalary)} />
            <StatPill label="Principal salary" value={Number.isNaN(principalSal) ? "—" : usd.format(principalSal)} />
            <StatPill label="Superintendent" value={Number.isNaN(superSalary) ? "—" : usd.format(superSalary)} />
          </div>
        </div>
      </header>

      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold">Geometry</h2>
        {geom
          ? <LeafMap geom={geom} height={420} />
          : <p className="text-gray-600">No geometry found for this district yet.</p>}
      </section>

      {/* Placeholder for next phase */}
      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold">Campuses (coming soon)</h2>
        <p className="text-gray-600 text-sm">
          This panel will list campuses in the district, sorted by Campus Score, with search and map markers.
        </p>
      </section>
    </div>
  );
}
