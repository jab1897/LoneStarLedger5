import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function Home() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.listDistricts()
      .then((data) => !cancelled && setRows(Array.isArray(data) ? data : (data?.items ?? [])))
      .catch((e) => !cancelled && setErr(e.message));
    return () => { cancelled = true; };
  }, []);

  if (err) return <main><p className="error">Error: {err}</p></main>;
  if (!rows.length) return <main><p>Loading…</p></main>;

  return (
    <main>
      <h1>Lone Star Ledger</h1>
      <p className="muted">Tap a district to view details.</p>
      <ul className="list">
        {rows.map((d) => (
          <li key={d.id ?? d.DISTRICT_N}>
            <Link to={`/district/${d.id ?? d.DISTRICT_N}`}>{d.name ?? d.DISTNAME ?? "Unnamed District"}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
