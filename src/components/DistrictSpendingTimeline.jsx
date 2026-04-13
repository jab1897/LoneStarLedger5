import React from "react";
import { Link } from "react-router-dom";
import { getDistrictSpendingTimeline } from "../lib/districtSpendingTimeline";
import SpendingKPIRow from "./SpendingKPIRow";
import SpendingLineChart from "./SpendingLineChart";
import TopCostCentersChart from "./TopCostCentersChart";
import CompositionShiftChart from "./CompositionShiftChart";
import YearDetailTable from "./YearDetailTable";
import Skeleton, {
  SkeletonKPI,
  SkeletonChart,
  SkeletonTableRows,
} from "../ui/Skeleton";
import ChartDownloadButton from "./ChartDownloadButton";

/**
 * District-scoped Spending Over Time section. Rendered on DistrictDetail
 * between the DistrictSpendingPie and the District Boundary map.
 */
export default function DistrictSpendingTimeline({ districtId, districtName }) {
  const [timeline, setTimeline] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Refs for PNG export
  const lineRef = React.useRef(null);
  const barRef = React.useRef(null);
  const compRef = React.useRef(null);

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

  const safeDownloadName = (kind) =>
    `${String(districtName || districtId)
      .replace(/[^\w]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40)}_${kind}`;

  return (
    <section className="section-card space-y-7">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <span className="eyebrow eyebrow--brand">Trajectory · 2018 → 2024</span>
          <h2 className="section-title mt-1">Spending Over Time</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
        </div>
        <Link
          to="/spending"
          className="text-sm font-semibold text-[var(--brand-500)] hover:underline whitespace-nowrap"
        >
          View full statewide trends →
        </Link>
      </header>

      {error && !loading && (
        <p className="text-sm text-[var(--danger-500)]">
          Could not load spending timeline: {error}
        </p>
      )}

      {/* -- KPIs --------------------------------------------------- */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonKPI />
          <SkeletonKPI />
          <SkeletonKPI />
        </div>
      ) : timeline ? (
        <SpendingKPIRow kpis={timeline.kpis} />
      ) : null}

      {/* -- Line chart --------------------------------------------- */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="subsection-title">
            <span className="subsection-title__dot" />
            Total Spending
          </h3>
          {!loading && timeline && (
            <ChartDownloadButton
              targetRef={lineRef}
              filename={safeDownloadName("total_spending")}
            />
          )}
        </div>
        <div ref={lineRef} className="chart-frame">
          {loading ? (
            <SkeletonChart height={320} />
          ) : timeline ? (
            <SpendingLineChart totals={timeline.totals} />
          ) : null}
        </div>
      </div>

      {/* -- Top cost centers --------------------------------------- */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="subsection-title">
            <span
              className="subsection-title__dot"
              style={{ background: "var(--viz-2)" }}
            />
            Top Cost Centers
          </h3>
          {!loading && timeline && (
            <ChartDownloadButton
              targetRef={barRef}
              filename={safeDownloadName("top_cost_centers")}
            />
          )}
        </div>
        <div ref={barRef} className="chart-frame">
          {loading ? (
            <SkeletonChart height={360} />
          ) : timeline ? (
            <TopCostCentersChart
              topObjects={timeline.topObjects}
              years={timeline.years}
            />
          ) : null}
        </div>
      </div>

      {/* -- Composition shift --------------------------------------- */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="subsection-title">
              <span
                className="subsection-title__dot"
                style={{ background: "var(--viz-4)" }}
              />
              Spending Composition Shift
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              How each year's spending splits across macro categories.
            </p>
          </div>
          {!loading && timeline && (
            <ChartDownloadButton
              targetRef={compRef}
              filename={safeDownloadName("composition_shift")}
            />
          )}
        </div>
        <div ref={compRef} className="chart-frame">
          {loading ? (
            <Skeleton variant="block" height={220} />
          ) : timeline ? (
            <CompositionShiftChart macroSeries={timeline.macroSeries} />
          ) : null}
        </div>
      </div>

      {/* -- Detail table -------------------------------------------- */}
      <div className="space-y-3 pt-1">
        <div>
          <h3 className="subsection-title">
            <span
              className="subsection-title__dot"
              style={{ background: "var(--accent-500)" }}
            />
            Year-over-Year Detail
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Click a year to expand its object-code breakdown.
          </p>
        </div>
        {loading ? (
          <SkeletonTableRows rows={4} />
        ) : timeline ? (
          <YearDetailTable
            totals={timeline.totals}
            byObject={timeline.byObject}
          />
        ) : null}
      </div>
    </section>
  );
}
