import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../ui/StatCard";
import EntityCard from "../ui/EntityCard";
import { getStatewideStats, getDetectedFields } from "../lib/data";

const fmtInt = (n) =>
  typeof n === "number" && !Number.isNaN(n)
    ? new Intl.NumberFormat("en-US").format(Math.round(n))
    : "—";

const fmtMoney = (n) =>
  typeof n === "number" && !Number.isNaN(n)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
    : "—";

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, fields] = await Promise.all([getStatewideStats(), getDetectedFields()]);
        // Inspect what headers we detected (open DevTools console)
        console.table(fields);
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

        {/* 8 KPIs */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1) Sum of Total Spending */}
          <StatCard label="Total spending" value={fmtMoney(stats?.totalSpendingSum)} to="/spending" />
          {/* 2) Sum of Enrollment */}
          <StatCard label="Total enrollment" value={fmtInt(stats?.enrollmentTotal)} to="/districts" />
          {/* 3) Avg per-student spending (fixed) */}
          <StatCard label="Avg per-student spending" value={fmtMoney(stats?.perStudentSpendingAvgFixed)} to="/districts" />
          {/* 4) Sum of District Debt */}
          <StatCard label="Total district debt" value={fmtMoney(stats?.districtDebtTotal)} to="/districts" />
          {/* 5) Avg per-student debt */}
          <StatCard label="Avg per-student debt" value={fmtMoney(stats?.perStudentDebtAvg)} to="/districts" />
          {/* 6) Avg Teacher Salary */}
          <StatCard label="Avg teacher salary" value={fmtMoney(stats?.teacherSalaryAvg)} to="/districts" />
          {/* 7) Avg Principal Salary */}
          <StatCard label="Avg principal salary" value={fmtMoney(stats?.principalSalaryAvg)} to="/districts" />
          {/* 8) Avg Superintendent Salary */}
          <StatCard label="Avg superintendent salary" value={fmtMoney(stats?.superintendentSalaryAvg)} to="/districts" />
        </div>
      </section>

      {/* Keep your map + Recently viewed sections below as-is */}
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
