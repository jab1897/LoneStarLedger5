import React from "react";
import { Link } from "react-router-dom";
export default function StatCard({ label, value, to }) {
  return (
    <Link to={to} className="card card-link stat-card" aria-label={`${label} – ${value}`}>
      <div className="kpi">
        <div className="label">{label}</div>
        <div className="value">{value}</div>
      </div>
    </Link>
  );
}
