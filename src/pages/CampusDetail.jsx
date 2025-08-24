import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";

/**
 * Your backend doesn't expose campus-by-id yet.
 * To keep this route "working", we'll show state summary as a placeholder.
 * Swap this later when /campuses/:id (or similar) exists.
 */
export default function CampusDetail() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .getStateSummary()
      .then((d) => !cancelled && setSummary(d))
      .catch((e) => !cancelled && setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (err) return <main><p className="error">Error: {err}</p></main>;
  if (!summary) return <main><p>Loading…</p></main>;

  return (
    <main>
      <h2>Campus {id}</h2>
      <p className="muted">Placeholder view using /summary/state</p>

      <div className="card">
        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
{JSON.stringify(summary, null, 2)}
        </pre>
      </div>

      <p style={{ marginTop: 24 }}>
        <Link to="/">← Back to all districts</Link>
      </p>
    </main>
  );
}
