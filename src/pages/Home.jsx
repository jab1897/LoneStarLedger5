import React, { useEffect, useState } from "react"; 
import { Link } from "react-router-dom";
import StatCard from "../ui/StatCard";
import EntityCard from "../ui/EntityCard";
import { getStatewideStats, getDetectedFields } from "../lib/data";
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

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, fields] = await Promise.all([
          getStatewideStats(),
          getDetectedFields(),
        ]);
        console.table(fields); // Inspect which headers were used
        setStats(s);
      } catch (e) {
        console.error("Failed to load statewide stats:", e);
        setStats(null);
      }
    })();
  }, []);

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
