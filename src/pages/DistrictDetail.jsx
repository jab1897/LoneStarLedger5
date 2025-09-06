// src/pages/DistrictDetail.jsx
import React from "react";
import { Link, useParams } from "react-router-dom";
import StatPill from "../ui/StatPill";
import { fetchJSON, findFeatureByProp } from "../lib/staticData";
import { usd, num } from "../lib/format";
import LeafMap from "../ui/Map";
import DataTable from "../ui/DataTable";
import { loadDistrictsCSV } from "../lib/data";
import { getCampusesForDistrict } from "../lib/campuses";

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
function pickHdr(row, hdrMap, ...labels) {
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

// First non-empty from keys
const pick = (row, ...keys) => {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
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

const gradeColor = (g) => {
  switch (String(g || "").toUpperCase()) {
    case "A":
      return "bg-green-800";
    case "B":
      return "bg-emerald-800";
    case "C":
      return "bg-amber-700";
    case "D":
      return "bg-orange-700";
    case "F":
      return "bg-red-800";
    default:
      return "bg-gray-700";
  }
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
    (row && (pickHdr(row, hdr, "NAME") || pickHdr(row, hdr, "DISTRICT", "DISTNAME"))) ||
    (geom?.features?.[0]?.properties?.NAME ||
      geom?.features?.[0]?.properties?.DISTRICT ||
      geom?.features?.[0]?.properties?.DISTNAME) ||
    `District ${id}`;
  const county = row ? pickHdr(row, hdr, "COUNTY") || "" : "";

  // KPIs from CSV row
  const k = (label, ...alts) => toNumSafe(pickHdr(row, hdr, label, ...alts));
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

  // Resolve district-level score/grade; fallback to campus average if needed
  const dsRaw = toNum(
    pick(
      row,
      "Overall Score",
      "District Score",
      "SCORE",
      "OVERALL_SCORE",
      "Overall Scaled Score",
      "Scaled Score"
    )
  );
  const dgRaw = pick(
    row,
    "Overall Grade",
    "District Grade",
    "GRADE",
    "RATING",
    "OVERALL_GRADE",
    "Accountability Rating"
  );
  let ribbonScore = Number.isFinite(dsRaw) ? Math.round(dsRaw) : NaN;
  if (!Number.isFinite(ribbonScore) && Array.isArray(campuses) && campuses.length) {
    const nums = campuses
      .map((c) => toNum(c?.score ?? c?.["Campus Score"]))
      .filter(Number.isFinite);
    if (nums.length) ribbonScore = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  }
  let ribbonGrade = dgRaw
    ? String(dgRaw).trim().toUpperCase()
    : Number.isFinite(ribbonScore)
    ? ribbonScore >= 90
      ? "A"
      : ribbonScore >= 80
      ? "B"
      : ribbonScore >= 70
      ? "C"
      : ribbonScore >= 60
      ? "D"
      : "F"
    : null;

  // campuses table rows
  const campusRows = React.useMemo(
    () =>
      (campuses || []).map((r) => {
        const campusId = pick(
          r,
          "USER_School_Number",
          "CAMPUS_N",
          "CAMPUS_ID",
          "Campus Number",
          "Campus_Number",
          "ID"
        );

        const campusName = pick(r, "USER_School_Name", "CAMPUS_NAME", "Campus", "NAME");
        const campusGrade =
          pick(r, "Campus Grade", "CAMPUS_GRADE", "Campus_Rating", "RATING") || "—";
        const campusScore = toNum(pick(r, "Campus Score", "SCORE", "OVERALL_SCORE"));

        let readingNot = pick(
          r,
          "Share of Students Not on Grade-Level: Reading",
          "Reading Not on Grade-Level",
          "READING_NOT_GL",
          "READING_NOT_OGR"
        );
        let mathNot = pick(
          r,
          "Share of Students Not on Grade-Level: Math",
          "Math Not on Grade-Level",
          "MATH_NOT_GL",
          "MATH_NOT_OGR"
        );

        if (readingNot === null) {
          const readOGL = pick(
            r,
            "Reading On Grade-Level",
            "READING_OGR",
            "READING_OGL",
            "Reading OGL"
          );
          if (readOGL !== null) {
            const n = toNum(readOGL);
            readingNot = Number.isFinite(n) ? Math.max(0, Math.min(1, 1 - n)) : null;
          }
        }
        if (mathNot === null) {
          const mathOGL = pick(
            r,
            "Math On Grade-Level",
            "MATH_OGR",
            "MATH_OGL",
            "Math OGL"
          );
          if (mathOGL !== null) {
            const n = toNum(mathOGL);
            mathNot = Number.isFinite(n) ? Math.max(0, Math.min(1, 1 - n)) : null;
          }
        }

        const enrollment = toNum(
          pick(r, "Enrollment", "ENROLLMENT", "EnrolLment", "ENR", "STUDENTS")
        );

        return {
          campusId,
          campusName,
          campusGrade,
          campusScore: Number.isFinite(campusScore) ? campusScore : NaN,
          readingNot,
          mathNot,
          enrollment: Number.isFinite(enrollment) ? enrollment : null,
          teachers: toNum(r["Teacher Count"]),
          admins: toNum(r["Admin Count"]),
        };
      }),
    [campuses]
  );

  const filteredCampuses = React.useMemo(() => {
    const q = campSearch.trim().toLowerCase();
    let list = campusRows;
    if (q) {
      list = list.filter((r) => {
        const name = String(r.campusName || "").toLowerCase();
        const idStr = String(r.campusId || "");
        return name.includes(q) || idStr.includes(q);
      });
    }
    return list;
  }, [campusRows, campSearch]);

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
    {
      key: "campusScore",
      label: "Score",
      align: "right",
      format: (v) => (Number.isFinite(v) ? num.format(v) : "—"),
    },
    {
      key: "readingNot",
      label: "Reading Not On Grade-Level",
      align: "right",
      format: (v) => (v == null ? "—" : toPct(v)),
    },
    {
      key: "mathNot",
      label: "Math Not On Grade-Level",
      align: "right",
      format: (v) => (v == null ? "—" : toPct(v)),
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
            {(ribbonGrade || Number.isFinite(ribbonScore)) && (
              <div className="mt-2">
                <span
                  className={[
                    "inline-flex items-center gap-4 rounded-2xl px-5 py-2 text-3xl font-extrabold leading-none text-white shadow ring-1 ring-black/10",
                    gradeColor(ribbonGrade),
                  ].join(" ")}
                  title={`TEA rating ${ribbonGrade || "—"}${
                    Number.isFinite(ribbonScore) ? ` • score ${ribbonScore}` : ""
                  }`}
                >
                  <span className="tracking-tight">{ribbonGrade || "—"}</span>
                  <span className="opacity-90">•</span>
                  <span className="tracking-tight">
                    {Number.isFinite(ribbonScore) ? ribbonScore : "—"}
                  </span>
                </span>
              </div>
            )}
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
            {filteredCampuses.length
              ? `${filteredCampuses.length} campus${filteredCampuses.length === 1 ? "" : "es"}`
              : "—"}
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
          rows={filteredCampuses}
          initialSort={{ key: "campusScore", dir: "desc" }}
        />
      </section>
    </div>
  );
}
