import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../ui/StatCard";
import DataTable from "../ui/DataTable";
import { getStatewideStats, getDetectedFields } from "../lib/data";
import { fetchCSV } from "../lib/staticData";
import TexasMap from "../components/TexasMap";

const fmtInt = (n) =>
  typeof n === "number" && !Number.isNaN(n)
    ? new Intl.NumberFormat("en-US").format(Math.round(n))
    : "—";

const fmtMoney = (n) =>
  typeof n === "number" && !Number.isNaN(n)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n)
    : "—";

// Robust number parser for currency / ints: strips non-numeric (except . and -)
const toNumber = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (v == null) return NaN;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

// Pick first finite number from a list of candidate keys on a row
const pickNumber = (row, keys) => {
  for (const k of keys) {
    const n = toNumber(row[k]);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
};

export default function Home() {
  const [stats, setStats] = useState(null);
  const [indebted, setIndebted] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [superintendents, setSuperintendents] = useState([]);
  const [userLoc, setUserLoc] = useState(null); // { lat, lng }
  const [geoMsg, setGeoMsg] = useState(null); // string | null
  const [geoBusy, setGeoBusy] = useState(false);

  // Statewide KPIs
  useEffect(() => {
    (async () => {
      try {
        const districtsCsv = "/data/Current_Districts_2025.csv";
        const [s, fields] = await Promise.all([
          getStatewideStats(districtsCsv),
          getDetectedFields(districtsCsv),
        ]);
        console.table(fields); // which headers were used in KPI calc
        setStats(s);
      } catch (e) {
        console.error("Failed to load statewide stats:", e);
        setStats(null);
      }
    })();
  }, []);

  // Request browser geolocation on demand
  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoMsg("Location services are not available in this browser.");
      return;
    }
    setGeoBusy(true);
    setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        if (typeof latitude === "number" && typeof longitude === "number") {
          setUserLoc({ lat: latitude, lng: longitude });
          setGeoMsg(null);
        } else {
          setGeoMsg("Could not read your device location.");
        }
        setGeoBusy(false);
      },
      (err) => {
        setGeoMsg(err?.message || "Location permission was denied.");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Home tables (CSV-backed)
  useEffect(() => {
    (async () => {
      try {
        const [d, p, s] = await Promise.all([
          fetchCSV("/data/home/indebted.csv"),
          fetchCSV("/data/home/performance.csv"),
          fetchCSV("/data/home/superintendents.csv"),
        ]);

        // Keep rows small (UI sorts anyway). Filter to rows that have id+name.
        const hasIdName = (r) => r && r.DISTRICT_N && (r.DISTRICT_NAME || r.NAME);

        setIndebted(d.filter(hasIdName).slice(0, 10));
        setPerformance(p.filter(hasIdName).slice(0, 10));
        setSuperintendents(s.filter(hasIdName).slice(0, 10));
      } catch (e) {
        console.error("Failed to load home tables:", e);
        setIndebted([]);
        setPerformance([]);
        setSuperintendents([]);
      }
    })();
  }, []);

  // ----- Most Indebted Districts -----
  const debtCols = [
    {
      key: "name",
      label: "District",
      format: (v, row) => (
        <Link to={`/district/${row.id}`} className="text-indigo-700 hover:underline">
          {v}
        </Link>
      ),
    },
    { key: "debt", label: "Debt", align: "right", format: (v) => fmtMoney(v) },
    {
      key: "perDebt",
      label: "Per-Pupil Debt",
      align: "right",
      format: (v) => fmtMoney(v),
    },
  ];

  const debtRows = indebted.map((r) => ({
    id: r.DISTRICT_N,
    name: r.DISTRICT_NAME || r.NAME,
    // allow several header variants
    debt: pickNumber(r, ["Debt", "TOTAL_DEBT", "DEBT", "DEBT_TOTAL"]),
    perDebt: pickNumber(r, ["Per-Pupil Debt", "DEBT_PER_STUDENT", "PER_PUPIL_DEBT"]),
  }));

  // ----- Top Performing Districts -----
  const perfCols = [
    {
      key: "name",
      label: "District",
      format: (v, row) => (
        <Link to={`/district/${row.id}`} className="text-indigo-700 hover:underline">
          {v}
        </Link>
      ),
    },
    { key: "grade", label: "Grade" },
    { key: "score", label: "Score", align: "right" },
  ];

  const perfRows = performance.map((r) => ({
    id: r.DISTRICT_N,
    name: r.DISTRICT_NAME || r.NAME,
    grade: r.DISTRICT_GRADE || r.OVERALL_RATING || r.RATING,
    score: pickNumber(r, [
      "DISTRICT_SCORE",
      "OVERALL_SCORE",
      "SCORE",
      "ACCOUNTABILITY_SCORE",
    ]),
  }));

  // ----- Superintendent Salaries -----
  const supCols = [
    {
      key: "district",
      label: "District",
      format: (v, row) => (
        <Link to={`/district/${row.id}`} className="text-indigo-700 hover:underline">
          {v}
        </Link>
      ),
    },
    { key: "superintendent", label: "Superintendent" },
    {
      key: "salary",
      label: "Salary",
      align: "right",
      format: (v) => fmtMoney(v),
    },
    {
      key: "enrollment",
      label: "Enrollment",
      align: "right",
      format: (v) => fmtInt(v),
    },
  ];

  const supRows = superintendents.map((r) => ({
    id: r.DISTRICT_N,
    district: r.DISTRICT_NAME || r.NAME,
    superintendent:
      r.SUPERINTENDENT_NAME || r.SUPT_NAME || r.SUPERINTENDENT,
    salary: pickNumber(r, [
      "FTE_SALARY",
      "SUPERINTENDENT_SALARY",
      "SUPT_SALARY",
      "BASE_FTE_SALARY",
    ]),
    enrollment: pickNumber(r, ["ENROLLMENT", "ENR", "STUDENTS"]),
  }));

  return (
    <div className="space-y-10">
      <section className="bg-white rounded-2xl border p-6 md:p-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Education money should be easy to follow
        </h1>
        <p className="mt-2 text-gray-600">
          Explore Texas districts, campuses, and spending records in one place.
        </p>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Spending"
            value={fmtMoney(stats?.totalSpendingSum)}
            to="/spending"
          />
          <StatCard
            label="Enrollment"
            value={fmtInt(stats?.enrollmentTotal)}
            to="/districts"
          />
          <StatCard
            label="Avg Per-Student Spending"
            value={fmtMoney(stats?.perStudentSpendingAvgFixed)}
            to="/districts"
          />
          <StatCard
            label="District Debt"
            value={fmtMoney(stats?.districtDebtTotal)}
            to="/districts"
          />
          <StatCard
            label="Per-Pupil Debt"
            value={fmtMoney(stats?.perPupilDebtAvg)}
            to="/districts"
          />
          <StatCard
            label="Average Teacher Salary"
            value={fmtMoney(stats?.teacherSalaryAvg)}
            to="/districts"
          />
          <StatCard
            label="Average Principal Salary"
            value={fmtMoney(stats?.principalSalaryAvg)}
            to="/districts"
          />
          <StatCard
            label="Superintendent Salary"
            value={fmtMoney(stats?.superintendentSalaryAvg)}
            to="/districts"
          />
        </div>
      </section>

      {/* Map + geolocation control */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Center the map on your current location (Texas only).
          </div>
          <button
            onClick={requestLocation}
            disabled={geoBusy}
            className={`px-3 py-1.5 rounded-md border text-sm ${
              geoBusy ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
            }`}
          >
            {geoBusy ? "Locating…" : "Use my location"}
          </button>
        </div>
        {geoMsg && <div className="text-xs text-gray-500">{geoMsg}</div>}
        <TexasMap userLocation={userLoc} userZoom={12} />
      </section>

      {/* Home tables */}
      <section className="space-y-8">
        <div>
          <h2 className="text-xl font-bold mb-2">Most Indebted Districts</h2>
          <DataTable
            columns={debtCols}
            rows={debtRows}
            initialSort={{ key: "debt", dir: "desc" }}
          />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Top Performing Districts</h2>
          <DataTable
            columns={perfCols}
            rows={perfRows}
            initialSort={{ key: "score", dir: "desc" }}
          />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Superintendent Salaries</h2>
          <DataTable
            columns={supCols}
            rows={supRows}
            initialSort={{ key: "salary", dir: "desc" }}
          />
        </div>
      </section>

      {/* Recently viewed removed by request */}
    </div>
  );
}

