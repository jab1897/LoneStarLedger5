import React from "react";
import { useParams, Link } from "react-router-dom";
import { getCampusById, getCampusFeatureById } from "../lib/campuses";
import StatPill from "../ui/StatPill";
import LeafMap from "../ui/Map";
import GradeScorePill from "../ui/GradeScorePill";
import { usd, num } from "../lib/format";

const parsePct = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?%$/.test(s)) {
    const n = Number(s.replace(/%$/, ""));
    return Number.isFinite(n) ? n / 100 : null;
  }
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return n > 1 ? n / 100 : n;
};

const toPct = (v, digits = 1) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const clamped = Math.max(0, Math.min(1, n));
  return `${(clamped * 100).toFixed(digits)}%`;
};

export default function CampusDetail() {
  const { id } = useParams();

  const [row, setRow] = React.useState(null);
  const [fields, setFields] = React.useState({});
  const [geom, setGeom] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { row, fields } = await getCampusById(id);
        if (alive) {
          setRow(row);
          setFields(fields);
        }
        try {
          const feat = await getCampusFeatureById(id);
          if (alive && feat) {
            setGeom({ type: "FeatureCollection", features: [feat] });
          }
        } catch {
          /* ignore geometry errors */
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

  const name = row && fields.CAMPUS_NAME ? row[fields.CAMPUS_NAME] : `Campus ${id}`;

  const campusGrade = row && fields.CAMPUS_GRADE ? row[fields.CAMPUS_GRADE] : null;
  const campusScore = row && fields.CAMPUS_SCORE ? Number(row[fields.CAMPUS_SCORE]) : NaN;
  const grades = row && fields.GRADES ? row[fields.GRADES] : undefined;
  const enrollmentNum = row && fields.ENROLLMENT ? Number(row[fields.ENROLLMENT]) : NaN;
  const readingNot = row && fields.READING_NOT ? parsePct(row[fields.READING_NOT]) : null;
  const mathNot = row && fields.MATH_NOT ? parsePct(row[fields.MATH_NOT]) : null;
  const attendanceRate = row && fields.ATTEND_RATE ? parsePct(row[fields.ATTEND_RATE]) : null;
  const chronicAbs = row && fields.CHRONIC_ABS ? parsePct(row[fields.CHRONIC_ABS]) : null;
  const teacherSalary = row && fields.AVG_TEACH_SAL ? Number(row[fields.AVG_TEACH_SAL]) : NaN;
  const adminSalary = row && fields.AVG_ADMIN_SAL ? Number(row[fields.AVG_ADMIN_SAL]) : NaN;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-600">
        <Link className="hover:underline" to="/campuses">
          Campuses
        </Link>
        <span className="px-2">/</span>
        <span className="text-gray-900 font-medium">{name}</span>
      </nav>

      <header className="bg-white border rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{name}</h1>
            {(campusGrade || Number.isFinite(campusScore)) && (
              <div className="mt-3 flex items-center gap-2">
                <span className="font-bold">Campus Grade</span>
                <GradeScorePill grade={campusGrade} score={campusScore} />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label="Grades" value={grades || "—"} />
            <StatPill
              label="Enrollment"
              value={Number.isNaN(enrollmentNum) ? "—" : num.format(enrollmentNum)}
            />
            <StatPill label="Reading Not On Grade-Level" value={toPct(readingNot)} />
            <StatPill label="Math Not On Grade-Level" value={toPct(mathNot)} />
            <StatPill label="Attendance Rate" value={toPct(attendanceRate)} />
            <StatPill label="Chronic Absenteeism Rate" value={toPct(chronicAbs)} />
            <StatPill
              label="Teacher Salary"
              value={Number.isNaN(teacherSalary) ? "—" : usd.format(teacherSalary)}
            />
            <StatPill
              label="Average Admin Salary"
              value={Number.isNaN(adminSalary) ? "—" : usd.format(adminSalary)}
            />
          </div>
        </div>
      </header>

      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold">Campus Location</h2>
        {geom ? (
          <LeafMap geom={geom} height={420} />
        ) : (
          <p className="text-gray-600">
            No geometry could be found for this campus yet.
          </p>
        )}
      </section>

      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold">Campus Facts</h2>
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
          <div className="text-gray-600">
            No campus record found in the CSV for ID {id}.
          </div>
        )}
      </section>
    </div>
  );
}

