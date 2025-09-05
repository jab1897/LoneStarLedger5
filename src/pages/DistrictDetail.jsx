// src/pages/DistrictDetail.jsx
import React from "react";
import { Link, useParams } from "react-router-dom";
import StatPill from "../ui/StatPill";
import { fetchJSON, findFeatureByProp } from "../lib/staticData";
import { usd, num } from "../lib/format";
import LeafMap from "../ui/Map";
import { loadDistrictsCSV } from "../lib/data";
import { getCampusesForDistrict } from "../lib/campuses";
import DataTable from "../ui/DataTable";

const DISTRICTS_CSV = import.meta.env.VITE_DISTRICTS_CSV || "/data/Current_Districts_2025.csv";
const DISTRICTS_GEOJSON =
  import.meta.env.VITE_DISTRICTS_GEOJSON ||
  import.meta.env.VITE_TEXAS_GEOJSON ||
  "/data/Current_Districts_2025.geojson";
const KEY = "DISTRICT_N";

// Try split GeoJSON first; fall back to statewide and pick the feature
async function tryLoadDistrictFeature(id) {
  const splitPath = `/data/geojson/district_${id}.geojson`;
  try {
    return await fetchJSON(splitPath);
  } catch {
    const big = await fetchJSON(DISTRICTS_GEOJSON);
    const feat = findFeatureByProp(big, KEY, id);
    if (!feat) throw new Error(`No feature with ${KEY}=${id} in big GeoJSON`);
    return { type: "FeatureCollection", features: [feat] };
  }
}

// helpers
const norm = (s) => String(s || "").toLowerCase().replace(/[-_ ]+/g, "").replace(/[^a-z0-9]/g, "");
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

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

const toPct = (v, digits = 1) => {
  const n = toNum(v);
  if (!Number.isFinite(n)) return "—";
  const clamped = Math.max(0, Math.min(1, n));
  return `${(clamped * 100).toFixed(digits)}%`;
};

const oneMinus = (v) => {
  const n = toNum(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, 1 - n)) : NaN;
};

export default function DistrictDetail() {
  const { id } = useParams();
  const [row, setRow] = React.useState(null);
  const [hdr, setHdr] = React.useState(new globalThis.Map());
  const [geom, setGeom] = React.useState(null);

  // campuses
  const [campuses, setCampuses] = React.useState([]);
  const [campSearch, setCampSearch] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Districts (for KPIs + name)
        const { rows, fields: F } = await loadDistrictsCSV(DISTRICTS_CSV);
        const found = rows.find((r) => String(r[F.ID] ?? "") === String(id)) || null;
        setRow(found);
        setHdr(buildHeaderMap(found || rows[0] || {}));

        // GeoJSON
        try {
          const g = await tryLoadDistrictFeature(id);
          if (alive) setGeom(g);
        } catch {}

        // Campuses for this district
        try {
          const { rows: crows } = await getCampusesForDistrict(id);
          if (alive) {
            setCampuses(crows || []);
          }
        } catch (e) {
          if (alive) {
            console.warn("[Campuses] load failed:", e);
            setCampuses([]);
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
  }, [id]);

  // Title prefers CSV NAME, else GeoJSON
  const displayName =
    (row && (pick(row, hdr, "NAME") || pick(row, hdr, "DISTRICT", "DISTNAME"))) ||
    (geom?.features?.[0]?.properties?.NAME ||
      geom?.features?.[0]?.properties?.DISTRICT ||
      geom?.features?.[0]?.properties?.DISTNAME) ||
    `District ${id}`;
  const county = row ? pick(row, hdr, "COUNTY") || "" : "";

  // KPIs from CSV row
  const k = (label, ...alts) => toNumSafe(pick(row, hdr, label, ...alts));
  let totalSpending = k("Total Spending", "TOTAL_SPENDING");
  const enrollment = k("Enrollment", "ENROLLMENT", "TOTAL_ENROLLMENT", "STUDENTS");
  const perStudentCSV = k("Average Per-Student Spending", "Per-Pupil Spending", "Per Pupil Spending");
  const districtDebt = k("Distrit Debt", "District Debt", "TOTAL_DEBT");
  const perPupilDebt = k("Per-Pupil Debt", "DEBT_PER_STUDENT", "DEBT PER STUDENT");
  const teacherSalary = k("Average Teacher Salary", "TEACHER_SALARY");
  const principalSal = k("Average Principal Salary", "PRINCIPAL_SALARY");
  const superSalary = k("Superintendent Salary", "SUPERINTENDENT_SALARY");

  const perStudent = !Number.isNaN(perStudentCSV)
    ? perStudentCSV
    : !Number.isNaN(totalSpending) && !Number.isNaN(enrollment) && enrollment > 0
    ? totalSpending / enrollment
    : NaN;

  // campuses table rows
  const campusRows = React.useMemo(() => {
    const rows = (campuses || []).map((r) => {
      const campusId = r["USER_School_Number"];
      const campusName = r["USER_School_Name"];
      const campusGrade = r["Campus Grade"] || "—";
      const campusScore = toNum(r["Campus Score"]);

      const readingOGL = r["Reading On Grade-Level"];
      const mathOGL = r["Math On Grade-Level"];

      const readingNot = oneMinus(readingOGL);
      const mathNot = oneMinus(mathOGL);

      return {
        campusId,
        campusName,
        campusGrade,
        campusScore: Number.isFinite(campusScore) ? campusScore : "—",
        readingNot,
        mathNot,
        enrollment: toNum(r["EnrolLment"]),
        teachers: toNum(r["Teacher Count"]),
        admins: toNum(r["Admin Count"]),
        teacherSalary: toNum(r["Average Teacher Salary"]),
        adminSalary: toNum(r["Average Admin Salary"]),
      };
    });

    const q = campSearch.trim().toLowerCase();
    if (q) {
      return rows.filter(
        (x) =>
          String(x.campusName || "").toLowerCase().includes(q) ||
          String(x.campusId || "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [campuses, campSearch]);

  const campusCols = [
    {
      key: "campusName",
      label: "Campus",
      format: (v, row) =>
        row.campusId ? (
          <Link
            to={`/campus/${encodeURIComponent(row.campusId)}`}
            className="text-indigo-700 hover:underline"
            title={`Open ${v}`}
          >
            {v}
          </Link>
        ) : v || "—",
    },
    {
      key: "campusGrade",
      label: "Grade",
      format: (v) => (v ? String(v).toUpperCase() : "—"),
    },
    { key: "campusScore", label: "Score", align: "right" },
    {
      key: "readingNot",
      label: "Share of Students Not on Grade-Level: Reading",
      align: "right",
      format: (v) => (Number.isFinite(v) ? toPct(v) : "—"),
    },
    {
      key: "mathNot",
      label: "Share of Students Not on Grade-Level: Math",
      align: "right",
      format: (v) => (Number.isFinite(v) ? toPct(v) : "—"),
    },
    {
      key: "enrollment",
      label: "Enrollment",
      align: "right",
      format: (v) => (Number.isFinite(v) ? v.toLocaleString() : "—"),
    },
    {
      key: "teachers",
      label: "Teachers",
      align: "right",
      format: (v) => (Number.isFinite(v) ? v.toLocaleString() : "—"),
    },
    {
      key: "admins",
      label: "Admins",
      align: "right",
      format: (v) => (Number.isFinite(v) ? v.toLocaleString() : "—"),
    },
  ];

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-700">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-600">
        <Link className="hover:underline" to="/districts">
          Districts
        </Link>
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
        {geom ? <LeafMap geom={geom} height={420} /> : <p className="text-gray-600">No geometry found.</p>}
      </section>

      {/* Campuses */}
      <section className="bg-white border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Campuses</h2>
          <div className="text-sm text-gray-500">
            {campusRows.length ? `${campusRows.length} campus${campusRows.length === 1 ? "" : "es"}` : "—"}
          </div>
        </div>

        <input
          className="border rounded-xl px-3 py-2 w-full md:w-96"
          placeholder="Search campus name or ID"
          value={campSearch}
          onChange={(e) => setCampSearch(e.target.value)}
        />

        <DataTable
          columns={campusCols}
          rows={campusRows}
          initialSort={{ key: "campusScore", dir: "desc" }}
        />
      </section>
    </div>
  );
}
