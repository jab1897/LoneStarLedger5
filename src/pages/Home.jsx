import React, { useEffect, useState } from "react"; 
import { Link } from "react-router-dom";
import StatCard from "../ui/StatCard";
import EntityCard from "../ui/EntityCard";
import DataTable from "../ui/DataTable";
import { getStatewideStats, getDetectedFields } from "../lib/data";
import { loadSuperintendents, loadIndebted, loadPerformance } from "../lib/homeData";
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

const scoreToGrade = (n) => {
  if (!Number.isFinite(n)) return "—";
  if (n >= 90) return "A";
  if (n >= 80) return "B";
  if (n >= 70) return "C";
  if (n >= 60) return "D";
  return "F";
};

export default function Home() {
  const [stats, setStats] = useState(null);
  const [indebted, setIndebted] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [superintendents, setSuperintendents] = useState([]);

  const [userLoc, setUserLoc] = useState(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState(null);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoMsg("Location services are unavailable in this browser.");
      return;
    }
    setGeoBusy(true);
    setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        if (typeof latitude === "number" && typeof longitude === "number") {
          setUserLoc({ lat: latitude, lng: longitude });
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

  useEffect(() => {
    (async () => {
      try {
        const districtsCsv = "/data/Current_Districts_2025.csv";
        const [s, fields] = await Promise.all([
          getStatewideStats(districtsCsv),
          getDetectedFields(districtsCsv),
        ]);
        console.table(fields); // Inspect which headers were used
        setStats(s);
      } catch (e) {
        console.error("Failed to load statewide stats:", e);
        setStats(null);
      }
    })();
  }, []);

  useEffect(() => {
    loadIndebted().then(setIndebted).catch(() => setIndebted([]));
    loadPerformance().then(setPerformance).catch(() => setPerformance([]));
    loadSuperintendents().then(setSuperintendents).catch(() => setSuperintendents([]));
  }, []);

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

  const debtRows = indebted.slice(0, 10).map((r) => ({
    id: r.id,
    name: r.name,
    debt: r.debt,
    perDebt: r.perDebt,
  }));

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

  const perfRows = performance.slice(0, 10).map((r) => ({
    id: r.id,
    name: r.name,
    grade: scoreToGrade(r.score),
    score: r.score,
  }));

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

  const supRows = superintendents.slice(0, 10).map((r) => ({
    id: r.id,
    district: r.name,
    superintendent: r.supName,
    salary: r.fteSalary,
    enrollment: r.enroll,
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

        {/* Your 8 KPIs */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Spending" value={fmtMoney(stats?.totalSpendingSum)} to="/spending" />
          <StatCard label="Enrollment" value={fmtInt(stats?.enrollmentTotal)} to="/districts" />
          <StatCard label="Avg Per-Student Spending" value={fmtMoney(stats?.perStudentSpendingAvgFixed)} to="/districts" />
          <StatCard label="District Debt" value={fmtMoney(stats?.districtDebtTotal)} to="/districts" />
          <StatCard label="Per-Pupil Debt" value={fmtMoney(stats?.perPupilDebtAvg)} to="/districts" />
          <StatCard label="Average Teacher Salary" value={fmtMoney(stats?.teacherSalaryAvg)} to="/districts" />
          <StatCard label="Average Principal Salary" value={fmtMoney(stats?.principalSalaryAvg)} to="/districts" />
          <StatCard label="Superintendent Salary" value={fmtMoney(stats?.superintendentSalaryAvg)} to="/districts" />
        </div>
      </section>

      {/* 👇 Map with geolocation control */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Center the map on your current location (Texas only).</div>
          <button
            onClick={requestLocation}
            disabled={geoBusy}
            className={`font-bold text-base md:text-lg px-4 py-2 rounded-md ${
              geoBusy
                ? "opacity-60 cursor-not-allowed bg-gray-300"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {geoBusy ? "Locating…" : "Use My Location"}
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

      {/* Recently viewed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Recently viewed</h2>
          <Link to="/districts" className="text-sm text-blue-700 hover:underline">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EntityCard title="Austin ISD" subtitle="Travis County" tags={["Large","Urban"]} to="/district/227901" />
          <EntityCard title="Northside ISD" subtitle="Bexar County" tags={["Large","Urban"]} to="/district/015915" />
          <EntityCard title="Sharyland ISD" subtitle="Hidalgo County" tags={["Mid","Suburban"]} to="/district/108911" />
        </div>
      </section>
    </div>
  );
}
