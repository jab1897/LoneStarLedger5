import React from "react";
import {
  fmtSignedUSDShort,
  fmtSignedPct,
  fmtSignedInt,
} from "../lib/spendingHelpers";

function trendClass(delta) {
  if (!Number.isFinite(delta) || delta === 0) return "flat";
  return delta > 0 ? "up" : "down";
}

function KpiCard({ label, change, valueFormatter }) {
  if (!change) {
    return (
      <div className="card stat-card kpi">
        <span className="label">{label}</span>
        <span className="value">—</span>
      </div>
    );
  }
  const { delta, pct, startYear, endYear } = change;
  const tc = trendClass(delta);
  const arrow = tc === "up" ? "▲" : tc === "down" ? "▼" : "·";
  return (
    <div className="card stat-card kpi">
      <span className="label">{label}</span>
      <span className="value">{valueFormatter(delta)}</span>
      <span className={`trend ${tc}`} style={{ fontSize: "0.9rem", fontWeight: 600 }}>
        <span aria-hidden="true">{arrow}</span> {fmtSignedPct(pct)}
      </span>
      {Number.isFinite(startYear) && Number.isFinite(endYear) && (
        <span
          style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
        >
          {startYear}→{endYear}
        </span>
      )}
    </div>
  );
}

/**
 * Three-card KPI row showing Total Change, Per-Student Change, Enrollment Change.
 * Expects the `kpis` object returned by getDistrictSpendingTimeline().
 */
export default function SpendingKPIRow({ kpis }) {
  if (!kpis) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiCard
        label="Total Change"
        change={kpis.totalChange}
        valueFormatter={fmtSignedUSDShort}
      />
      <KpiCard
        label="Per-Student Change"
        change={kpis.perStudentChange}
        valueFormatter={fmtSignedUSDShort}
      />
      <KpiCard
        label="Enrollment Change"
        change={kpis.enrollmentChange}
        valueFormatter={fmtSignedInt}
      />
    </div>
  );
}
