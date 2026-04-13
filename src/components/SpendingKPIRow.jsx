import React from "react";
import AnimatedValue from "../ui/AnimatedValue";
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
  if (!change || !Number.isFinite(change.delta)) {
    return (
      <div className="card kpi kpi--dense">
        <span className="label">{label}</span>
        <span className="value">—</span>
      </div>
    );
  }
  const { delta, pct, startYear, endYear } = change;
  const tc = trendClass(delta);
  const arrow = tc === "up" ? "▲" : tc === "down" ? "▼" : "·";
  return (
    <div className="card kpi kpi--dense">
      <span className="label">{label}</span>
      <span className="value">
        <AnimatedValue value={delta} format={valueFormatter} />
      </span>
      <span className={`trend ${tc}`}>
        <span aria-hidden="true">{arrow}</span>
        {fmtSignedPct(pct)}
      </span>
      {Number.isFinite(startYear) && Number.isFinite(endYear) && (
        <span className="sub">
          {startYear} → {endYear}
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
