import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";

export default function DistrictDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.getDistrict(id)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setErr(e.message));
    return () => { cancelled = true; };
  }, [id]);

  if (err) return <main><p className="error">Error: {err}</p></main>;
  if (!data) return <main><p>Loading…</p></main>;

  return (
    <main>
      <h2>{data.name ?? data.DISTNAME ?? `District ${id}`}</h2>
      <p className="muted">District id {data.id ?? data.DISTRICT_N ?? id}</p>

      <div className="card">
        <div><strong>Enrollment:</strong> {data.enrollment ?? data.ENROLLMENT ?? "—"}</div>
        <div><strong>Campuses:</strong> {Array.isArray(data.campuses) ? data.campuses.length : data.CAMPUS_COUNT ?? "—"}</div>
      </div>

      {Array.isArray(data.campuses) && data.campuses.length > 0 && (
        <>
          <h3>Campuses</h3>
          <ul className="list">
            {data.campuses.map((c) => (
              <li key={c.id ?? c.CAMPUS_ID}>
                <Link to={`/campus/${c.id ?? c.CAMPUS_ID}`}>{c.name ?? c.CAMPNAME ?? "Campus"}</Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <p style={{ marginTop: 24 }}>
        <Link to="/">← Back to all districts</Link>
      </p>
    </main>
  );
}

