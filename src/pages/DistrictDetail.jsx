import React from "react";
import { Link, useParams } from "react-router-dom";
import StatPill from "../ui/StatPill";
import { fetchCSV, fetchJSON, findFeatureByProp } from "../lib/staticData";
import { usd, num } from "../lib/format";
// Avoid shadowing the global Map class
import LeafMap from "../ui/Map";

const DISTRICTS_CSV = import.meta.env.VITE_DISTRICTS_CSV || "/data/Current_Districts_2025.csv";
const DISTRICTS_GEOJSON =
  import.meta.env.VITE_DISTRICTS_GEOJSON ||
  import.meta.env.VITE_TEXAS_GEOJSON ||
  "/data/Current_Districts_2025.geojson";
const CAMPUSES_CSV = import.meta.env.VITE_CAMPUSES_CSV || "/data/Schools_2024_to_2025.csv";
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

// normalize IDs like "'00130901" → "130901"
const canonId = (v) =>
  String(v ?? "")
    .replace(/['"]/g, "")  // drop spreadsheet-leading apostrophes
    .replace(/\D/g, "")    // keep digits only
    .replace(/^0+/, "");   // left-trim zeros

// Build a resolver map from normalized header -> actual header (handles "-1"/"-2")
function buildHeaderMap(row) {
  const map = new globalThis.Map();
  const keys = Object.keys(row || {});
  for (const k of keys) {
    const base = k.replace(/-\d+$/, "");
    const nk = norm(base);
    if (!map.has(nk)) map.set(nk, k);
  }
  return map;
}

function pick(row, hdrMap, ...labels) {
  for (const label of labels) {
    const key = hdrMap.get(norm(label));
    if (key && row && row[key] !== undefined && row[key] !== "") return row[key];
  }
  return undefined;
}

const toNumSafe = (v) => {
  if (v === null || v === undefined || v === "") return NaN;
  const s = String(v).replace(/[\$,]/g, "");
  const n = Number(s);
  return Number.isNaN(n) ? NaN : n;
};

// ----------------------------------------------------------------------------
export default function DistrictDetail(){
  const { id } = useParams();
  const [row, setRow] = React.useState(null);
  const [hdr, setHdr] = React.useState(new globalThis.Map());
  const [geom, setGeom] = React.useState(null);
  const [campuses, setCampuses] = React.useState([]);             // campus rows for this district
  const [campCols, setCampCols] = React.useState({kName:null,kId:null,kScore:null});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(()=>{
    let alive = true;
    setLoading(true); setError(null);
    Promise.allSettled([
      fetchCSV(DISTRICTS_CSV),
      tryLoadDistrictFeature(id),
      fetchCSV(CAMPUSES_CSV),
    ]).then(([csvRes, geoRes, campRes])=>{
      if(!alive) return;

      // District row
      if (csvRes.status === "fulfilled") {
        const rows = csvRes.value || [];
        const HAll = buildHeaderMap(rows[0] || {});
        const idKeys = ["DISTRICT_N", "DISTRICT_ID", "DISTRICTCODE", "ID"]
          .map(label => HAll.get(norm(label)))
          .filter(Boolean);
        const want = canonId(id);
        let found = null;
        for (const k of idKeys) {
          found = rows.find(r => r[k] != null && canonId(r[k]) === want);
          if (found) break;
        }
        setRow(found || null);
        setHdr(buildHeaderMap(found || rows[0] || {}));
      } else {
        setError(String(csvRes.reason));
      }

      // Geometry
      if (geoRes.status === "fulfilled") setGeom(geoRes.value);

      // Campuses table (join on USER_District_Number → DISTRICT_N with canon id)
      if (campRes.status === "fulfilled") {
        const rows = Array.isArray(campRes.value) ? campRes.value : [];
        const H = buildHeaderMap(rows[0] || {});
        const kDist = H.get(norm("USER_District_Number")) || H.get(norm("DISTRICT_N")) || H.get(norm("DISTRICT_ID"));
        const kName = H.get(norm("Campus Name")) || H.get(norm("CAMPUS_NAME")) || H.get(norm("NAME")) || H.get(norm("Campus"));
        const kId   = H.get(norm("Campus ID"))   || H.get(norm("CAMPUS_ID"))   || H.get(norm("CAMPUS")) || H.get(norm("USER_Campus_Number"));
        const kScore= H.get(norm("Campus Score"))|| H.get(norm("CAMPUS_SCORE"))|| H.get(norm("SCORE"));
        setCampCols({kName,kId,kScore});
        if (kDist) {
          const want = canonId(id);
          let list = rows.filter(r => r[kDist] != null && canonId(r[kDist]) === want);
          if (kScore) {
            list = list.sort((a,b) => {
              const A = toNumSafe(a[kScore]); const B = toNumSafe(b[kScore]);
              if (Number.isNaN(A) && Number.isNaN(B)) return 0;
              if (Number.isNaN(A)) return 1;
              if (Number.isNaN(B)) return -1;
              return B - A; // desc
            });
          }
          setCampuses(list);
        } else {
          setCampuses([]);
        }
      }
    }).catch(e => alive && setError(String(e)))
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive = false };
  }, [id]);

  // Display name: prefer CSV NAME, then GeoJSON's name, then fallback
  const displayName =
    (row && (pick(row, hdr, "NAME") || pick(row, hdr, "DISTRICT", "DISTNAME"))) ||
    (geom?.features?.[0]?.properties?.NAME ||
     geom?.features?.[0]?.properties?.DISTRICT ||
     geom?.features?.[0]?.properties?.DISTNAME) ||
    `District ${id}`;
  const county = row ? (pick(row, hdr, "COUNTY") || "") : "";

  // KPIs via robust header resolution
  let totalSpending   = toNumSafe(pick(row, hdr, "Total Spending"));
  const enrollment    = toNumSafe(pick(row, hdr, "Enrollment"));
  const perStudentCSV = toNumSafe(pick(row, hdr, "Average Per-Student Spending"));
  const districtDebt  = toNumSafe(pick(row, hdr, "Distrit Debt")); // header has typo
  const perPupilDebt  = toNumSafe(pick(row, hdr, "Per-Pupil Debt"));
  const teacherSalary = toNumSafe(pick(row, hdr, "Average Teacher Salary"));
  const principalSal  = toNumSafe(pick(row, hdr, "Average Principal Salary"));
  const superSalary   = toNumSafe(pick(row, hdr, "Superintendent Salary"));

  // Derive per-student if column missing
  const perStudent = !Number.isNaN(perStudentCSV)
    ? perStudentCSV
    : (!Number.isNaN(totalSpending) && !Number.isNaN(enrollment) && enrollment > 0
        ? totalSpending / enrollment
        : NaN);

  // Optional nicer empty state if row & geom missing
  if (!loading && !row && !geom) {
    return (
      <div className="space-y-6">
        <nav className="text-sm text-gray-600">
          <Link className="hover:underline" to="/districts">Districts</Link>
          <span className="px-2">/</span>
          <span className="text-gray-900 font-medium">District {id}</span>
        </nav>
        <div className="bg-white border rounded-2xl p-6">
          <p className="text-gray-700">No district found with ID <strong>{id}</strong>.</p>
        </div>
      </div>
    );
  }

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

          {/* KPI pills */}
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

      {/* Campuses table */}
      <section className="bg-white border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Campuses</h2>
          <div className="text-sm text-gray-500">
            {campuses.length ? `${campuses.length} campus${campuses.length===1?"":"es"}` : "—"}
          </div>
        </div>
        {campuses.length === 0 ? (
          <p className="text-gray-600 text-sm">No campuses found for this district.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-600 border-b">
                <tr>
                  <th className="py-2 pr-3">Campus</th>
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Campus Score</th>
                </tr>
              </thead>
              <tbody>
                {campuses.map((r, i) => {
                  const name = campCols.kName ? r[campCols.kName] : "";
                  const cid  = campCols.kId   ? r[campCols.kId]   : "";
                  const score= campCols.kScore? r[campCols.kScore]: "";
                  const scoreNum = toNumSafe(score);
                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{String(name ?? "")}</td>
                      <td className="py-2 pr-3 text-gray-600">{String(cid ?? "")}</td>
                      <td className="py-2 pr-3">{Number.isNaN(scoreNum) ? "—" : num.format(scoreNum)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
