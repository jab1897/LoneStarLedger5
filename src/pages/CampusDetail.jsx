import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";

export default function CampusDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.getCampus(id)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setErr(e.message));
    return () => { cancelled = true; };
  }, [id]);

  if (err) return <main><p className="error">Error: {err}</p></main>;
  if (!data) return <main><p>Loading…</p></main>;

  return (
    <main>
      <h2>{data.name ?? data.CAMPNAME ?? `Campus ${id}`}</h2>
      <p className="muted">Campus id {data.id ?? data.CAMPUS_ID ?? id}</p>

      <div className="card">
        <div><strong>Level:</strong> {data.level ?? data.GRADE_SPAN ?? "—"}</div>
        <div><strong>Enrollment:</strong> {data.enrollment ?? data.ENROLLMENT ?? "—"}</div>
        <div><strong>District:</strong> {data.districtName ?? data.DISTNAME ?? "—"}</div>
      </div>

      <p style={{ marginTop: 24 }}>
        <Link to="/">← Back to all districts</Link>
      </p>
    </main>
  );
}

