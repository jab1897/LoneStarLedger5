// src/pages/DistrictDetail.jsx
import React from "react";
import { Link, useParams } from "react-router-dom";
import StatPill from "../ui/StatPill";
import { fetchJSON, findFeatureByProp } from "../lib/staticData";
import { usd, num } from "../lib/format";
import LeafMap from "../ui/Map";
import { loadDistrictsCSV } from "../lib/data";
import { getCampusesForDistrict } from "../lib/campuses";
import { gradeFromScore, gradeColorClass, toPct } from "../lib/ribbon";

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
function norm(s) {
  return String(s || "").toLowerCase().replace(/[-_ ]+/g, "").replace(/[^a-z0-9]/g, "");
}
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
function toNumSafe(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const s = String(v).replace(/[\$,]/g, "");
  const n = Number(s);
  return Number.isNaN(n) ? NaN : n;
}

export default function DistrictDetail() {
  const { id } = useParams();
  const [row, setRow] = React.useState(null);
  const [hdr, setHdr] = React.useState(new globalThis.Map());
  const [geom, setGeom] = React.useState(null);

  // campuses
  const [campuses, setCampuses] = React.useState([]);
  const [campFields, setCampFields] = React.useState(null);
  const [campSearch, setCampSearch] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(function () {
    let alive = true;
    setLoading(true);
    setError(null);

    (async function () {
      try {
        // Districts (for KPIs + name)
        const { rows, fields: F } = await loadDistrictsCSV(DISTRICTS_CSV);
        const found =
          rows.find(function (r) {
            return String(r[F.ID] ?? "") === String(id);
          }) || null;
        setRow(found);
        setHdr(buildHeaderMap(found || rows[0] || {}));

        // GeoJSON
        try {
          const g = await tryLoadDistrictFeature(id);
          if (alive) setGeom(g);
        } catch {}

        // Campuses for this district
        try {
          const { rows: crows, fields } = await getCampusesForDistrict(id);
          if (alive) {
            setCampuses(crows || []);
            setCampFields(fields || null);
          }
        } catch (e) {
          if (alive) {
            console.warn("[Campuses] load failed:", e);
            setCampuses([]);
            setCampFields(null);
          }
        }
      } catch (e) {
        if (alive) setError(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return function () {
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
  function k(label) {
    var alts = Array.prototype.slice.call(arguments, 1);
    return toNumSafe(pick.apply(null, [row, hdr, label].concat(alts)));
  }
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

  // campuses table (search + sort by score desc)
  var campusesSorted = [];
  if (campuses && campuses.length && campFields) {
    var f = campFields;
    var nameK = f.CAMPUS_NAME;
    var idK = f.CAMPUS_ID;
    var scoreK = f.CAMPUS_SCORE;

    var list = campuses.map(function (r) {
      return {
        id: idK ? String(r[idK]) : "",
        name: nameK ? String(r[nameK]) : "",
        score: scoreK ? toNumSafe(r[scoreK]) : NaN,
        raw: r,
      };
    });

    var q = campSearch.trim().toLowerCase();
    if (q)
      list = list.filter(function (x) {
        return x.name.toLowerCase().includes(q) || x.id.includes(q);
      });

    list.sort(function (a, b) {
      var s =
        (Number.isNaN(b.score) ? -Infinity : b.score) -
        (Number.isNaN(a.score) ? -Infinity : a.score);
      return s || a.name.localeCompare(b.name);
    });

    campusesSorted = list;
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-700">Error: {error}</div>;

  /* LSL:RIBBON VARS (no hooks, no arrows) */
  var ribbonScore = NaN;
  var ribbonGrade = null;

  // aliases for district-level score/grade
  var SCORE_KEYS = [
    "Overall Score","District Score","SCORE","Overall Rating","RATING SCORE",
    "OVR_SCORE","OVR SCORE","OVERALL","OVERALL_SCORE","SCORE_OVERALL",
    "Overall Scaled Score","Scaled Score"
  ];
  var GRADE_KEYS = [
    "Overall Grade","District Grade","GRADE","RATING","Letter Grade",
    "LETTER_GRADE","OVERALL_GRADE","Accountability Rating"
  ];

  // numeric score from row
  var __raw = toNumSafe(pick.apply(null, [row, hdr].concat(SCORE_KEYS)));
  if (!Number.isNaN(__raw)) ribbonScore = Math.round(__raw);

  // letter grade from row
  var __g = pick.apply(null, [row, hdr].concat(GRADE_KEYS));
  if (__g) ribbonGrade = String(__g).trim().toUpperCase();

  // fallback: average campus scores when district row lacks a score
  if (
    !Number.isFinite(ribbonScore) &&
    Array.isArray(campuses) &&
    campFields &&
    campFields.CAMPUS_SCORE
  ) {
    var __scores = campuses
      .map(function (c) {
        return toNumSafe(c[campFields.CAMPUS_SCORE]);
      })
      .filter(function (n) {
        return Number.isFinite(n);
      });
    if (__scores.length)
      ribbonScore = Math.round(
        __scores.reduce(function (a, b) {
          return a + b;
        }, 0) / __scores.length
      );
  }

  // derive letter from score if still missing
  if (!ribbonGrade && Number.isFinite(ribbonScore)) ribbonGrade = gradeFromScore(ribbonScore);

  // last-resort label
  var __displayGrade = ribbonGrade || "Unrated";
  /* END LSL:RIBBON VARS */

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
            <div data-testid="district-grade-wrapper" className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-bold">District Grade</span>
              <span
                data-testid="district-grade"
                className={
                  "inline-flex items-center gap-3 rounded-2xl px-4 py-1.5 text-white shadow ring-1 ring-black/10 " +
                  gradeColorClass(__displayGrade)
                }
                title={
                  "TEA rating " + __displayGrade +
                  (Number.isFinite(ribbonScore) ? " · score " + ribbonScore : "")
                }
              >
                <span className="text-2xl font-extrabold leading-none">{__displayGrade}</span>
                {Number.isFinite(ribbonScore) ? (
                  <span className="ml-2 text-xl font-semibold leading-none">{ribbonScore}</span>
                ) : null}
              </span>
            </div>
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
            {campusesSorted.length ? `${campusesSorted.length} campus${campusesSorted.length === 1 ? "" : "es"}` : "—"}
          </div>
        </div>

        <input
          className="border rounded-xl px-3 py-2 w-full md:w-96"
          placeholder="Search campus name or ID"
          value={campSearch}
          onChange={function (e) { setCampSearch(e.target.value); }}
        />

        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600 border-b">
              <tr>
                <th className="py-2 pr-3">Campus</th>
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Score</th>
                <th className="py-2 pr-3">Grade</th>
                <th className="py-2 pr-3 text-right">Reading OGL</th>
                <th className="py-2 pr-3 text-right">Math OGL</th>
                <th className="py-2 pr-3 text-right">Teachers</th>
                <th className="py-2 pr-3 text-right">Admins</th>
              </tr>
            </thead>
            <tbody>
              {campusesSorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-500">
                    No campuses found for this district.
                  </td>
                </tr>
              ) : (
                campusesSorted.map(function (c, i) {
                  const f = campFields;
                  const r = c.raw;
                  const grade = f.CAMPUS_GRADE ? r[f.CAMPUS_GRADE] : null;
                  const read = f.READING_OGR ? r[f.READING_OGR] : null;
                  const math = f.MATH_OGR ? r[f.MATH_OGR] : null;
                  const tcnt = f.TEACHER_COUNT ? r[f.TEACHER_COUNT] : "—";
                  const acnt = f.ADMIN_COUNT ? r[f.ADMIN_COUNT] : "—";
                  return (
                    <tr key={c.id + "-" + i} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{c.name}</td>
                      <td className="py-2 pr-3 text-gray-600">{c.id}</td>
                      <td className="py-2 pr-3">{Number.isNaN(c.score) ? "—" : num.format(c.score)}</td>
                      <td className="py-2 pr-3">{grade ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{toPct(read)}</td>
                      <td className="py-2 pr-3 text-right">{toPct(math)}</td>
                      <td className="py-2 pr-3 text-right">{tcnt ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{acnt ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
