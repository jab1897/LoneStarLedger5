import React, { useEffect, useState } from "react";
import StatCard from "../ui/StatCard";

export default function SpendingPage() {
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = import.meta.env.VITE_SPENDING_CSV;
    if (!url) {
      setError("MISSING_ENV");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        // TODO: parse CSV once ready
        setRows([]); // placeholder
      } catch (e) {
        console.error(e);
        setError("LOAD_FAILED");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (error === "MISSING_ENV") {
    return (
      <div className="px-4 md:px-8">
        <h1 className="text-3xl font-extrabold mb-4">Spending</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-xl">
          <p className="font-semibold">Spending data coming soon</p>
          <p className="text-sm mt-2">
            This feature depends on a statewide spending CSV that has not been provided yet.
          </p>
        </div>
      </div>
    );
  }

  if (error === "LOAD_FAILED") {
    return (
      <div className="px-4 md:px-8">
        <h1 className="text-3xl font-extrabold mb-4">Spending</h1>
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl">
          <p className="font-semibold">Failed to load spending data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8">
      <h1 className="text-3xl font-extrabold mb-4">Spending</h1>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="space-y-4">
          {/* Placeholder content until real parsing is added */}
          <StatCard label="Total Spending" value="—" />
          <StatCard label="Vendors" value="—" />
        </div>
      )}
    </div>
  );
}
