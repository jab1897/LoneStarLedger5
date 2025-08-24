import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function Home() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .listDistrictsGeo()
      .then((fc) => {
        if (cancelled) return;
        const features = Array.isArray(fc?.features) ? fc.features : [];
        // Map to a simple shape for the list
        const items = features.map((f) => {
          const p = f?.properties || {};
          return {
            id: p.DISTRICT_N ?? p.id ?? p.code ?? "",
            name: p.DISTNAME ?? p.name ?? "Unnamed District",
          };
        });
        setRows(items.filter((r) => r.id));
      })
      .catch((e) => !cancelled && setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <main>
        <p className="error">Error: {err}</p>
        <p className="muted">
          Tip: Backend paths come from <code>/geojson/districts</code>.
        </p>
      </main>
    );
  }
  if (!rows.length) return <main><p>Loading…</p></main>;

  return (
    <main>
      <h1>Lone Star Ledger</h1>
      <p className="muted">Tap a district to view details.</p>
      <ul className="list">
        {rows.map((d) => (
          <li key={d.id}>
            <Link to={`/district/${d.id}`}>{d.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
