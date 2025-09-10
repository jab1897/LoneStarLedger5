import React from "react";
import { Link, useParams } from "react-router-dom";
import StatPill from "../ui/StatPill";
import GradeScorePill from "../ui/GradeScorePill";
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
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s !== "" && s !== "." && s !== "-") return v;
    }
  }
  return null;
};

const toNum = (v) => {
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim();
  if (s === "" || s === "." || s === "-") return NaN;
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

// If v is numeric (0..1 or 0..100), output a pretty percent; if it’s already a string like "24%", pass it through.
const toPct = (v, digits = 0) => {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  if (s.endsWith("%")) return s;
  const n = toNum(v);
  if (!Number.isFinite(n)) return s || "—";
  const frac = n > 1 ? n / 100 : n;
  const clamped = Math.max(0, Math.min(1, frac));
  return `${(clamped * 100).toFixed(digits)}%`;
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

  const readingNot = toNum(
    pickHdr(
      row,
      hdr,
      "Not On Grade Level Reading",
      "Reading Not On Grade Level",
      "Reading Not on Grade-Level"
    )
  );
  const mathNot = toNum(
    pickHdr(
      row,
      hdr,
      "Not On Grade Level Math",
      "Math Not On Grade Level",
      "Math Not on Grade-Level"
    )
  );
  const ssNot = toNum(
    pickHdr(
      row,
      hdr,
      "Not On Grade Level SS",
      "Not On Grade Level Social Studies",
      "Social Studies Not On Grade Level"
    )
  );
  const scienceNot = toNum(
    pickHdr(
      row,
      hdr,
      "Not On Grade Level Science",
      "Science Not On Grade Level",
      "Science Not on Grade-Level"
    )
  );

  const districtGrade = pickHdr(row, hdr, "District Grade", "DISTRICT_GRADE", "Grade");
  const districtScore = k("District Score", "DISTRICT_SCORE", "Score");

  const perStudent = !Number.isNaN(perStudentCSV)
    ? perStudentCSV
    : !Number.isNaN(totalSpending) && !Number.isNaN(enrollment) && enrollment > 0
    ? totalSpending / enrollment
    : NaN;

  const pctColor = (v) => {
    if (!Number.isFinite(v)) return "gray";
    const p = v > 1 ? v : v * 100;
    if (p <= 10) return "green";
    if (p > 10 && p <= 20) return "yellow";
    if (p > 20 && p <= 30) return "amber";
    if (p > 40) return "red";
    return "gray";
  };

  // campuses table rows
  const campusRows = React.useMemo(
    () =>
      (campuses || [])
        .map((r) => {
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
          const campusGrade = pick(
            r,
            "Campus Grade",
            "CAMPUS_GRADE",
            "Campus_Rating",
            "RATING"
          );
          const campusScore = toNum(pick(r, "Campus Score", "SCORE", "OVERALL_SCORE"));

          // --- RESOLVED: keep CSV "Not On Grade-Level" values as-is (strings or numbers) ---
          const readingNot = pick(
            r,
            "Share of Students Not on Grade-Level: Reading",
            "Reading Not On Grade-Level",
            "Reading Not on Grade-Level",
            "READING_NOT_GL",
            "READING_NOT_OGR"
          );
          const mathNot = pick(
            r,
            "Share of Students Not on Grade-Level: Math",
            "Math Not On Grade-Level",
            "Math Not on Grade-Level",
            "MATH_NOT_GL",
            "MATH_NOT_OGR"
          );

          const teacherSalary = toNum(
            pick(
              r,
              "Average Teacher Salary",
              "TEACHER_AVG_SALARY",
              "AVG_TEACH_SAL",
              "AVG_TEACHER_SALARY"
            )
          );
          const adminSalary = toNum(
            pick(
              r,
              "Average Admin Salary",
              "ADMIN_AVG_SALARY",
              "AVG_ADMIN_SAL",
              "AVG_ADMIN_SALARY"
            )
          );

          return {
            campusId,
            campusName,
            campusGrade,
            campusScore:
              Number.isFinite(campusScore) && campusScore > 0 ? campusScore : Infinity,
            readingNot,
            mathNot,
            teacherSalary: Number.isFinite(teacherSalary) ? teacherSalary : null,
            adminSalary: Number.isFinite(adminSalary) ? adminSalary : null,
          };
        })
        // --- RESOLVED: keep rows that have a name (don’t drop campuses for missing score) ---
        .filter((r) => r.campusName),
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
      key: "teacherSalary",
      label: "Avg Teacher Salary",
      align: "right",
      format: (v) => (Number.isFinite(v) ? usd.format(v) : "—"),
    },
    {
      key: "adminSalary",
      label: "Avg Admin Salary",
      align: "right",
      format: (v) => (Number.isFinite(v) ? usd.format(v) : "—"),
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
            {(districtGrade || Number.isFinite(districtScore)) && (
              <div className="mt-3 flex items-center gap-2">
                <span className="font-bold">TEA's District Grade</span>
                <GradeScorePill grade={districtGrade} score={districtScore} />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label="Enrollment" value={Number.isNaN(enrollment) ? "—" : num.format(enrollment)} />
            <StatPill label="Per-Pupil Spending" value={Number.isNaN(perStudent) ? "—" : usd.format(perStudent)} />
            <StatPill label="Total District Spending" value={Number.isNaN(totalSpending) ? "—" : usd.format(totalSpending)} />
            <StatPill label="District debt" value={Number.isNaN(districtDebt) ? "—" : usd.format(districtDebt)} />
            <StatPill label="Per‑pupil debt" value={Number.isNaN(perPupilDebt) ? "—" : usd.format(perPupilDebt)} />
            <StatPill label="Average Teacher Salary" value={Number.isNaN(teacherSalary) ? "—" : usd.format(teacherSalary)} />
            <StatPill label="Average Principal Salary" value={Number.isNaN(principalSal) ? "—" : usd.format(principalSal)} />
            <StatPill label="Superintendent" value={Number.isNaN(superSalary) ? "—" : usd.format(superSalary)} />
            <StatPill
              label="Not On Grade Level Reading"
              value={Number.isFinite(readingNot) ? toPct(readingNot) : "-"}
              color={pctColor(readingNot)}
            />
            <StatPill
              label="Not On Grade Level Math"
              value={Number.isFinite(mathNot) ? toPct(mathNot) : "-"}
              color={pctColor(mathNot)}
            />
            <StatPill
              label="Not On Grade Level SS"
              value={Number.isFinite(ssNot) ? toPct(ssNot) : "-"}
              color={pctColor(ssNot)}
            />
            <StatPill
              label="Not On Grade Level Science"
              value={Number.isFinite(scienceNot) ? toPct(scienceNot) : "-"}
              color={pctColor(scienceNot)}
            />
          </div>
        </div>
      </header>

      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold">District Boundary</h2>
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
          initialSort={{ key: "campusScore", dir: "asc" }}
        />
      </section>
    </div>
  );
}
