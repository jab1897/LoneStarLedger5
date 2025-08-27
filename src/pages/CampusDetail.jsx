import React from "react";
import { useParams, Link } from "react-router-dom";
import { fetchCSV, fetchJSON } from "../lib/staticData";
import StatPill from "../ui/StatPill";
import LeafMap from "../ui/Map";

// Use your env vars with safe fallbacks
const CAMPUSES_CSV =
  import.meta.env.VITE_CAMPUSES_CSV || "/data/Schools_2024_to_2025.csv";
const CAMPUSES_GEOJSON =
  import.meta.env.VITE_CAMPUSES_GEOJSON || "/data/Schools_2024_to_2025.geojson";

// --- helpers ---------------------------------------------------------------
const norm = (s) =>
  String(s || "").toLowerCase().replace(/[-_ ]+/g, "").replace(/[^a-z0-9]/g, "");

const canonId = (v) =>
  String(v ?? "")
    .replace(/['"]/g, "")       // strip Excel-style leading apostrophes
    .replace(/\D/g, "")         // keep digits only
    .replace(/^0+/, "");        // drop leading zeros for matching

function buildHeaderMap(row) {
  const map = new globalThis.Map();
  for (const k of Object.keys(row || {})) {
    const base = k.replace(/-\d+$/, ""); // handle duplicate header suffixes
    const nk = norm(base);
    if (!map.has(nk)) map.set(nk, k);
  }
  return map;
}

function bestHeader(row0, aliases = [], fuzzy = []) {
  const keys = Object.keys(row0 || {});
  const nm = new Map(keys.map((k) => [norm(k), k]));
  for (const a of aliases) {
    const k = nm.get(norm(a));
    if (k) return k;
  }
  if (fuzzy && fuzzy.length) {
    for (const k of keys) {
      const raw = k.toLowerCase();
      if (fuzzy.some((re) => re.test(raw))) return k;
    }
  }
  return null;
}

const toNum = (v) => {
  if (v === null || v === undefined || v === "") return NaN;
  const s = String(v).replace(/[\$,]/g, "");
  const n = Number(s);
  return Number.isNaN(n) ? NaN : n;
};

// Find one campus feature in a statewide GeoJSON by matching on likely id props
function findCampusFeatureById(fc, idCanon) {
  const idKeys = [
    "CAMPUS_ID", "CAMPUS", "CAMPUS_N", "School Number", "SCHOOL_NUMBER",
    "USER_School_Number", "SCHOOL_ID", "SCHOOL", "ID"
  ];
  for (const f of fc?.features || []) {
    const p = f?.properties || {};
    for (const k of idKeys) {
      if (k in p && canonId(p[k]) === idCanon) return f;
    }
    // last resort: scan every prop
    for (const v of Object.values(p)) {
      if (canonId(v) === idCanon) return f;
    }
  }
  return null;
}

// --- component -------------------------------------------------------------
export default function CampusDetail() {
  const { id } = useParams();
  const idCanon = canonId(id);

  const [row, setRow] = React.useState(null);
  const [hdr, setHdr] = React.useState(new globalThis.Map());
  const [geom, setGeom] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // 1) Load the campuses CSV (env-driven)
        const rows = await fetchCSV(CAMPUSES_CSV);
        const row0 = rows[0] || {};
        const h = buildHeaderMap(row0);

        // robust header detection
        const kId = bestHeader(
          row0,
          ["USER_School_Number", "Campus ID", "CAMPUS_ID", "School Number", "SCHOOL_NUMBER"],
          [/campus.*(id|number)/i, /school.*(id|number)/i]
        );
        const kName = bestHeader(
          row0,
          ["USER_School_Name", "Campus Name", "CAMPUS_NAME", "School Name", "NAME"],
          [/campus.*name/i, /school.*name/i]
        );
        const kDist = bestHeader(
          row0,
          ["USER_District_Number", "DISTRICT_N", "LEAID", "LEA_ID", "LEA CODE"],
          [/district.*(number|id|code)/i, /\blea\b/i]
        );
        const kGrades = bestHeader(row0, ["Grades", "GRADES"], [/grade/i]);
        const kEnroll = bestHeader(row0, ["Enrollment", "ENROLLMENT"], [/enroll/i]);
        const kType = bestHeader(row0, ["Type", "TYPE"], [/type/i]);

        // find record by canonical campus id across the detected id column
        let rec = null;
        if (kId) {
          rec = rows.find((r) => r?.[kId] != null && canonId(r[kId]) === idCanon) || null;
        } else {
          // worst case: scan every cell for a matching canonical id
          rec = rows.find((r) =>
            Object.values(r || {}).some((v) => canonId(v) === idCanon)
          ) || null;
        }

        if (alive) {
          setRow(rec);
          setHdr(h);
        }

        // 2) Load geometry: split -> statewide fallback
        try {
          const splitPath = `/data/geojson/campus_${idCanon}.geojson`;
          const g = await fetchJSON(splitPath);
          if (alive) setGeom(g);
        } catch {
          try {
            const big = await fetchJSON(CAMPUSES_GEOJSON);
            const feat = findCampusFeatureById(big, idCanon);
            if (feat && alive) {
              setGeom({ type: "FeatureCollection", features: [feat] });
            }
          } catch {
            /* ignore – no geometry available */
          }
        }
      } catch (e) {
        if (alive) setError(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, idCanon]);

  // Title prefers CSV campus name
  const name =
    (row &&
      (row[bestHeader(Object.fromEntries(hdr), ["USER_School_Name", "Campus Name", "CAMPUS_NAME", "School Name", "NAME"], [/campus.*name/i, /school.*name/i])] ||
        row.CAMPUS ||
        row.NAME)) ||
    `Campus ${idCanon}`;

  // District link (if present)
  const distRaw =
    row &&
    (row[bestHeader(Object.fromEntries(hdr), ["USER_District_Number", "DISTRICT_N", "LEAID", "LEA_ID", "LEA CODE"], [/district.*(number|id|code)/i, /\blea\b/i])] ||
      row.DISTRICT_N ||
      row.DISTRICT_ID);
  const distId = distRaw ? canonId(distRaw) : "";

  // KPI pulls with graceful fallback
  const grades =
    row &&
    (row[bestHeader(Object.fromEntries(hdr), ["Grades", "GRADES"], [/grade/i])] ||
      row.GRADES ||
      row.Grades);
  const enrollmentNum = toNum(
    row &&
      (row[bestHeader(Object.fromEntries(hdr), ["Enrollment", "ENROLLMENT"], [/enroll/i])] ||
        row.ENROLLMENT ||
        row.Enrollment)
  );
  const type =
    row &&
    (row[bestHeader(Object.fromEntries(hdr), ["Type", "TYPE"], [/type/i])] ||
      row.TYPE ||
      row.Type);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-600">
        <Link className="hover:underline" to="/campuses">Campuses</Link>
        <span className="px-2">/</span>
        <span className="text-gray-900 font-medium">{name}</span>
      </nav>

      <header className="bg-white border rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{name}</h1>
            <p className="text-gray-600 mt-1">
              {distId ? (
                <>District: <Link className="text-indigo-700 underline" to={`/district/${encodeURIComponent(distId)}`}>{distId}</Link></>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label="Grades" value={grades || "—"} />
            <StatPill label="Enrollment" value={Number.isNaN(enrollmentNum) ? "—" : new Intl.NumberFormat("en-US").format(enrollmentNum)} />
            <StatPill label="Type" value={type || "—"} />
          </div>
        </div>
      </header>

      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold">Geometry</h2>
        {geom ? (
          <LeafMap geom={geom} height={420} />
        ) : (
          <p className="text-gray-600">
            No geometry could be found for this campus yet.
          </p>
        )}
      </section>

      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold">Campus attributes</h2>
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-700">{error}</div>}
        {!loading && !error && row && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {Object.entries(row).map(([k, v]) => (
              <div key={k} className="bg-gray-50 border rounded-xl px-3 py-2">
                <div className="text-gray-600">{k}</div>
                <div className="font-medium break-words">{String(v)}</div>
              </div>
            ))}
          </div>
        )}
        {!loading && !error && !row && (
          <div className="text-gray-600">No campus record found in the CSV for ID {idCanon}.</div>
        )}
      </section>
    </div>
  );
}
