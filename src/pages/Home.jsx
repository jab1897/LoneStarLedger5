import React, { useEffect, useState } from "react"; 
import { Link } from "react-router-dom";
import StatCard from "../ui/StatCard";
import EntityCard from "../ui/EntityCard";
import DataTable from "../ui/DataTable";
import { getStatewideStats } from "../lib/data";
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

const toNumber = (v) => {
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

export default function Home() {
  const [stats, setStats] = useState(null);
  const [indebted, setIndebted] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [superintendents, setSuperintendents] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const districtsCsv = "/data/Current_Districts_2025.csv";
        const s = await getStatewideStats(districtsCsv);
        setStats(s);
      } catch (e) {
        console.error("Failed to load statewide stats:", e);
        setStats(null);
      }
    })();
  }, [getStatewideStats]);

  useEffect(() => {
    (async () => {
      try {
        const [d, p, s] = await Promise.all([
          fetchCSV("/data/home/indebted.csv"),
          fetchCSV("/data/home/performance.csv"),
          fetchCSV("/data/home/superintendents.csv"),
        ]);
        setIndebted(
          d.filter((r) => r.NAME && r.DISTRICT_N && r.Debt).slice(0, 10)
        );
        setPerformance(
          p
            .filter((r) => r.NAME && r.DISTRICT_N && r.DISTRICT_SCORE)
            .slice(0, 10)
        );
        setSuperintendents(
          s
            .filter(
              (r) =>
                r.DISTRICT_NAME && r.DISTRICT_N && r.FTE_SALARY && r.SUPERINTENDENT_NAME
            )
            .slice(0, 10)
        );
      } catch (e) {
        console.error("Failed to load home tables:", e);
        setIndebted([]);
        setPerformance([]);
        setSuperintendents([]);
      }
    })();
  }, [fetchCSV]);

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
    name: r.NAME,
    debt: toNumber(r.Debt),
    perDebt: toNumber(r["Per-Pupil Debt"]),
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

  const perfRows = performance.map((r) => ({
    id: r.DISTRICT_N,
    name: r.NAME,
    grade: r.DISTRICT_GRADE,
    score: toNumber(r.DISTRICT_SCORE),
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

  const supRows = superintendents.map((r) => ({
    id: r.DISTRICT_N,
    district: r.DISTRICT_NAME,
    superintendent: r.SUPERINTENDENT_NAME,
    salary: toNumber(r.FTE_SALARY),
    enrollment: toNumber(r.ENROLLMENT),
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

      {/* 👇 Add the map back here */}
      <TexasMap />

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
