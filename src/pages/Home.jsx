import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatCard from "../ui/StatCard";
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
  const [heroSearch, setHeroSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const districtsCsv = "/data/Current_Districts_2025.csv";
        const [s, fields] = await Promise.all([
          getStatewideStats(districtsCsv),
          getDetectedFields(districtsCsv),
        ]);
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

  const debtRows = indebted
    .slice()
    .sort((a, b) => b.debt - a.debt)
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      name: r.name,
      debt: r.debt,
      perDebt: Number.isFinite(r.perDebt)
        ? r.perDebt
        : Number.isFinite(r.debt) && Number.isFinite(r.enroll) && r.enroll > 0
        ? r.debt / r.enroll
        : NaN,
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

  const perfRows = performance
    .slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, 10)
    .map((r) => ({
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

  const onHeroSearch = (e) => {
    e.preventDefault();
    const next = heroSearch.trim();
    if (next.length === 0) {
      navigate("/search");
      return;
    }
    navigate(`/search?q=${encodeURIComponent(next)}`);
  };

  return (
    <div className="space-y-12">
      <section className="hero">
        <div className="hero-inner">
          <h1>Follow the money in Texas schools</h1>
          <p className="lead">Search any district or campus and see spending beside student results.</p>
          <form className="hero-actions" role="search" onSubmit={onHeroSearch}>
            <input
              className="input"
              type="search"
              placeholder="Search a district or campus"
              aria-label="Search a district or campus"
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">
              Search my district
            </button>
            <button
              className="btn btn-text"
              type="button"
              onClick={() => navigate("/about")}
            >
              How we source the data
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Spending"
            value="$99,988,017,629.00"
            to="/why-no-amount-of-money-is-enough"
          />
          <StatCard
            label="Enrollment (Excluding Charter Schools)"
            value={fmtInt(stats?.enrollmentTotal)}
            to="/districts"
          />
          <StatCard
            label="Avg Per-Student Spending (Excluding Charter School Students)"
            value={fmtMoney(19217)}
            to="/districts"
          />
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
        <div className="section-card">
          <h2 className="section-heading">Most Indebted Districts</h2>
          <DataTable
            columns={debtCols}
            rows={debtRows}
            initialSort={{ key: "debt", dir: "desc" }}
          />
        </div>
        <div className="section-card">
          <h2 className="section-heading">Worst Performing Districts</h2>
          <DataTable
            columns={perfCols}
            rows={perfRows}
            initialSort={{ key: "score", dir: "asc" }}
          />
        </div>
        <div className="section-card">
          <h2 className="section-heading">Superintendent Salaries</h2>
          <DataTable
            columns={supCols}
            rows={supRows}
            initialSort={{ key: "salary", dir: "desc" }}
          />
        </div>
      </section>

    </div>
  );
}
