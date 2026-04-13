import React from "react";
import { Link } from "react-router-dom";
import { getDistrictSpendingTimeline } from "../lib/districtSpendingTimeline";
import SpendingKPIRow from "./SpendingKPIRow";
import SpendingLineChart from "./SpendingLineChart";
import TopCostCentersChart from "./TopCostCentersChart";
import CompositionShiftChart from "./CompositionShiftChart";
import YearDetailTable from "./YearDetailTable";

/**
 * District-scoped Spending Over Time section. Rendered on DistrictDetail
 * between the DistrictSpendingPie and the District Boundary map.
 *
 * Props:
 *   districtId   — the route param (DISTRICT_N)
 *   districtName — display name (for the header)
 */
export default function DistrictSpendingTimeline({ districtId, districtName }) {
  const [timeline, setTimeline] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!districtId) return undefined;
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const t = await getDistrictSpendingTimeline(districtId);
        if (alive) setTimeline(t);
      } catch (e) {
        if (alive) setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [districtId]);

  const subtitle =
    districtName && String(districtName).trim()
      ? String(districtName).trim()
      : `District ${districtId}`;

  return (
    <section className="bg-white border rounded-2xl p-6 space-y-6 section-card">
      <header className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Spending Over Time</h2>
          <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>
        </div>
        <Link
          to="/spending"
          className="text-sm font-medium text-[var(--brand-500)] hover:underline"
        >
          View full statewide trends →
        </Link>
      </header>

      {loading && (
        <p className="text-sm text-[var(--text-muted)]">Loading spending timeline…</p>
      )}

      {error && !loading && (
        <p className="text-sm text-[var(--danger-500)]">
          Could not load spending timeline: {error}
        </p>
      )}

      {timeline && !loading && !error && (
        <>
          <SpendingKPIRow kpis={timeline.kpis} />

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900">
              Total Spending
            </h3>
            <SpendingLineChart totals={timeline.totals} />
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900">
              Top Cost Centers
            </h3>
            <TopCostCentersChart
              topObjects={timeline.topObjects}
              years={timeline.years}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900">
              Spending Composition Shift
            </h3>
            <p className="text-xs text-[var(--text-muted)] -mt-1">
              How each year's spending is split across macro categories.
            </p>
            <CompositionShiftChart macroSeries={timeline.macroSeries} />
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900">
              Year-over-Year Detail
            </h3>
            <p className="text-xs text-[var(--text-muted)] -mt-1">
              Click a year to expand its object-code breakdown.
            </p>
            <YearDetailTable
              totals={timeline.totals}
              byObject={timeline.byObject}
            />
          </div>
        </>
      )}
    </section>
  );
}
