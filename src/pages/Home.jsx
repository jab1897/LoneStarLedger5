import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../ui/StatCard";
import EntityCard from "../ui/EntityCard";
import { getStatewideStats } from "../lib/data";

const fmt = (n) =>
  typeof n === "number" && !Number.isNaN(n)
    ? new Intl.NumberFormat("en-US").format(n) + "+"
    : "—";

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // pulls from VITE_DISTRICTS_CSV in .env(.local)
    getStatewideStats().then(setStats).catch((e) => {
      console.error("Failed to load statewide stats:", e);
      setStats(null);
    });
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

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Districts" value={fmt(stats?.districtsCount)} to="/districts" />
          <StatCard
            label="Campuses"
            value={fmt(stats?.campusesTotal)}
            to="/campuses"
          />
          {/* keep placeholder until we wire the spending table */}
          <StatCard label="Line items" value="2.1M+" to="/spending" />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Recently viewed</h2>
          <Link to="/districts" className="text-sm text-blue-700 hover:underline">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EntityCard
            title="Austin ISD"
            subtitle="Travis County"
            tags={["Large", "Urban"]}
            to="/district/227901"
          />
          <EntityCard
            title="Northside ISD"
            subtitle="Bexar County"
            tags={["Large", "Urban"]}
            to="/district/015915"
          />
          <EntityCard
            title="Sharyland ISD"
            subtitle="Hidalgo County"
            tags={["Mid", "Suburban"]}
            to="/district/108911"
          />
        </div>
      </section>
    </div>
  );
}
