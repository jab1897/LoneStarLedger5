import React from "react";
import { Link, useParams } from "react-router-dom";
import StatPill from "../ui/StatPill";
import { fetchCSV, fetchJSON, findFeatureByProp } from "../lib/staticData";
import { usd, num } from "../lib/format";
import LeafMap from "../ui/Map";
import { loadDistrictsCSV } from "../lib/data";

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

// helpers
const norm = (s) => String(s || "").toLowerCase().replace(/[-_ ]+/g, "").replace(/[^a-z0-9]/g, "");
const canonId = (v) => String(v ?? "").replace(/['"]/g,"").replace(/\D/g,"").replace(/^0+/, "");
function buildHeaderMap(row) {
  const map = new globalThis.Map();
  for (const k of Object.keys(row || {})) {
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

// Find the best header by aliases + fuzzy regex fallback
function bestHeader(row0, aliases = [], fuzzy = []) {
  const keys = Object.keys(row0 || {});
  const nm = new Map(keys.map(k => [norm(k), k]));
  for (const a of aliases) {
    const k = nm.get(norm(a));
    if (k) return k;
  }
  if (fuzzy && fuzzy.length) {
    for (const k of keys) {
      const raw = k.toLowerCase();
      if (fuzzy.some(re => re.test(raw))) return k;
    }
  }
  return null;
}

export default function DistrictDetail() {
  const { id } = useParams();
  const [row, setRow] = React.useState(null);
  const [hdr, setHdr] = React.useState(new globalThis.Map());
  const [geom, setGeom] = React.useState(null);
  const [campuses, setCampuses] = React.useState([]);
  const [campCols, setCampCols] = React.useState({kName:null,kId:null,kScore:null});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);

    (async () => {
      try {
        // --- District CSV ---
        const { rows, fields: F } = await loadDistrictsCSV(DISTRICTS_CSV);
        const allHdr = buildHeaderMap(rows[0] || {});
        const idKeys = [
          F?.ID,
          "DISTRICT_N","DISTRICT_C","DISTRICT_ID","SDLEA","DISTRICTCODE","ID"
        ].filter(Boolean);
        const realKeys = idKeys.map(lbl => allHdr.get(norm(lbl)) || lbl).filter(Boolean);
        const want = canonId(id);

        let found = null;
        for (const k of realKeys) {
          found = rows.find(r => r?.[k] != null && canonId(r[k]) === want);
          if (found) break;
        }
        setRow(found || null);
        setHdr(buildHeaderMap(found || rows[0] || {}));

        // --- GeoJSON ---
        try {
          const g = await tryLoadDistrictFeature(id);
          if (alive) setGeom(g);
        } catch {}

        // --- Campuses CSV (robust) ---
        try {
          const campusRows = await fetchCSV(CAMPUSES_CSV);
          const row0 = campusRows[0] || {};
          // exact aliases + fuzzy patterns
          const kDist  = bestHeader(row0,
             ["USER_District_Number","USER District Number","DISTRICT_N","DISTRICT_ID","LEAID","LEA_ID","LEA CODE","LEA"],
             [/district.*(number|id|code)/i, /\blea\b/i, /lea.*id/i, /lea.*code/i]
          );
          const kName  = bestHeader(row0,
             ["USER_School_Name","Campus Name","CAMPUS_NAME","NAME","SCHOOL_NAME"],
             [/campus.*name/i, /school.*name/i]
          );
          const kId    = bestHeader(row0,
             ["USER_School_Number","Campus ID","USER_Campus_Number","CAMPUS_ID","SCHOOL_ID","SCHOOL_NUMBER"],
             [/campus.*(id|number)/i, /school.*(id|number)/i]
          );
          const kScore = bestHeader(row0,
             ["Campus Score","CAMPUS_SCORE","CampusScore","SCORE","RATING","GRADE"],
             [/score/i, /rating/i, /grade/i]
          );
          setCampCols({kName,kId,kScore});

          const chosen = { kDist, kName, kId, kScore };
          console.info("[Campuses] headers chosen:", chosen, "CSV headers:", Object.keys(row0));

          if (kDist) {
            // prefer the value we matched on from the row if present
            const distCanon = canonId(found?.[realKeys[0]] ?? id);
            let list = campusRows.filter(r => r?.[kDist] != null && canonId(r[kDist]) === distCanon);
            if (kScore) {
              list = list.sort((a,b) => {
                const A = toNumSafe(a[kScore]); const B = toNumSafe(b[kScore]);
                if (Number.isNaN(A) && Number.isNaN(B)) return 0;
                if (Number.isNaN(A)) return 1;
                if (Number.isNaN(B)) return -1;
                return B - A;
              });
            }
            console.info(`[Campuses] matched ${list.length} rows for district ${distCanon}`);
            if (alive) setCampuses(list);
          } else {
            console.warn("[Campuses] Could not detect district id column in campus CSV");
            if (alive) setCampuses([]);
          }
        } catch (e) {
          console.warn("[Campuses] CSV load failed:", e);
          if (alive) setCampuses([]);
        }

      } catch (e) {
        if (alive) setError(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [id]);

  // Title prefers CSV NAME, else GeoJSON
  const displayName =
    (row && (pick(row, hdr, "NAME") || pick(row, hdr, "DISTRICT", "DISTNAME"))) ||
    (geom?.features?.[0]?.properties?.NAME ||
     geom?.features?.[0]?.properties?.DISTRICT ||
     geom?.features?.[0]?.properties?.DISTNAME) ||
    `District ${id}`;
  const county = row ? (pick(row, hdr, "COUNTY") || "") : "";

  // KPIs from CSV row
  const k = (label, ...alts) => toNumSafe(pick(row, hdr, label, ...alts));
  let totalSpending   = k("Total Spending","TOTAL_SPENDING");
  const enrollment    = k("Enrollment","ENROLLMENT","TOTAL_ENROLLMENT","STUDENTS");
  const perStudentCSV = k("Average Per-Student Spending","Per-Pupil Spending","Per Pupil Spending");
  const districtDebt  = k("Distrit Debt","District Debt","TOTAL_DEBT");
  const perPupilDebt  = k("Per-Pupil Debt","DEBT_PER_STUDENT","DEBT PER STUDENT");
  const teacherSalary = k("Average Teacher Salary","TEACHER_SALARY");
  const principalSal  = k("Average Principal Salary","PRINCIPAL_SALARY");
  const superSalary   = k("Superintendent Salary","SUPERINTENDENT_SALARY");

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
        <span className="text-gray-900 font-medium">{displayName}</span>
      </nav>

      <header className="bg-white border rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{displayName}</h1>
            <p className="text-gray-600 mt-1">{county}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label="Enrollment" value={Number.isNaN(enrollment) ? "—" : num.format(enrollment)} />
            <StatPill label="Per pupil"  value={Number.isNaN(perStudent) ? "—" : usd.format(perStudent)} />
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

      <section className="bg-white border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Campuses</h2>
          <div className="text-sm text-gray-500">{campuses.length ? `${campuses.length} campus${campuses.length===1?"":"es"}` : "—"}</div>
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
