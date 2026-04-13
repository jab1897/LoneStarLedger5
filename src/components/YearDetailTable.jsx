import React from "react";
import {
  fmtUSD0,
  fmtInt,
  fmtSignedPct,
  getObjectLabel,
} from "../lib/spendingHelpers";

/**
 * Year-over-year detail table with accordion rows. Clicking a year reveals
 * the object-code breakdown for that year (sorted by spending descending).
 *
 * Props:
 *   totals   — the totals[] array from getDistrictSpendingTimeline()
 *   byObject — the flat byObject[] array from getDistrictSpendingTimeline()
 */
export default function YearDetailTable({ totals, byObject }) {
  const [expanded, setExpanded] = React.useState(new Set());

  const objectsByYear = React.useMemo(() => {
    const map = new Map();
    for (const row of byObject || []) {
      if (!map.has(row.year)) map.set(row.year, []);
      map.get(row.year).push(row);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (b.spending || 0) - (a.spending || 0));
    }
    return map;
  }, [byObject]);

  if (!totals || !totals.length) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        No detail data available.
      </p>
    );
  }

  const sorted = [...totals].sort((a, b) => b.year - a.year);
  const firstYear = Math.min(...totals.map((t) => t.year));
  const byYearTotal = new Map(totals.map((t) => [t.year, t.totalSpending]));
  const firstTotal = byYearTotal.get(firstYear);

  const toggle = (year) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  return (
    <div className="data-table">
      <div className="data-table__scroller">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left" style={{ width: 36 }} aria-label="Expand" />
              <th className="text-left">Year</th>
              <th className="align-right">Total Spending</th>
              <th className="align-right">Enrollment</th>
              <th className="align-right">Per-Student</th>
              <th className="align-right">Change %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isOpen = expanded.has(row.year);
              const objects = objectsByYear.get(row.year) || [];
              const pctVsStart =
                Number.isFinite(row.totalSpending) &&
                Number.isFinite(firstTotal) &&
                firstTotal > 0 &&
                row.year !== firstYear
                  ? (row.totalSpending - firstTotal) / firstTotal
                  : NaN;

              return (
                <React.Fragment key={row.year}>
                  <tr
                    onClick={() => toggle(row.year)}
                    style={{ cursor: "pointer" }}
                    aria-expanded={isOpen}
                  >
                    <td>
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-block",
                          transition: "transform 120ms ease",
                          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                      >
                        ▸
                      </span>
                    </td>
                    <td>{row.year}</td>
                    <td className="align-right tabular-nums">
                      {Number.isFinite(row.totalSpending)
                        ? fmtUSD0(row.totalSpending)
                        : "—"}
                    </td>
                    <td className="align-right tabular-nums">
                      {Number.isFinite(row.enrollment)
                        ? fmtInt(row.enrollment)
                        : "—"}
                    </td>
                    <td className="align-right tabular-nums">
                      {Number.isFinite(row.perStudent)
                        ? fmtUSD0(row.perStudent)
                        : "—"}
                    </td>
                    <td className="align-right tabular-nums">
                      {row.year === firstYear
                        ? "baseline"
                        : Number.isFinite(pctVsStart)
                          ? fmtSignedPct(pctVsStart)
                          : "—"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={6} style={{ background: "var(--surface-1)" }}>
                        {objects.length === 0 ? (
                          <p className="text-xs text-[var(--text-muted)] px-3 py-2">
                            No object-code detail for {row.year}.
                          </p>
                        ) : (
                          <div style={{ padding: "0.5rem 1rem" }}>
                            <p className="text-xs text-[var(--text-muted)] mb-2">
                              Object-code breakdown, {row.year}:
                            </p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr>
                                  <th className="text-left">Code</th>
                                  <th className="text-left">Description</th>
                                  <th className="align-right">Spending</th>
                                  <th className="align-right">Share</th>
                                </tr>
                              </thead>
                              <tbody>
                                {objects.map((o) => {
                                  const share =
                                    Number.isFinite(row.totalSpending) &&
                                    row.totalSpending > 0
                                      ? o.spending / row.totalSpending
                                      : NaN;
                                  return (
                                    <tr key={`${row.year}-${o.objectCode}`}>
                                      <td className="tabular-nums">
                                        {o.objectCode}
                                      </td>
                                      <td>
                                        {getObjectLabel(o.objectDescription) ||
                                          "—"}
                                      </td>
                                      <td className="align-right tabular-nums">
                                        {fmtUSD0(o.spending)}
                                      </td>
                                      <td className="align-right tabular-nums">
                                        {Number.isFinite(share)
                                          ? `${(share * 100).toFixed(1)}%`
                                          : "—"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
