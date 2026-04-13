import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  fmtUSD0,
  MACRO_CATEGORIES,
  useChartColors,
  tooltipStyle,
} from "../lib/spendingHelpers";

const CHART_H = 220;

function useIsBelow(breakpoint) {
  const [is, setIs] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const sync = () => setIs(mql.matches);
    sync();
    mql.addEventListener?.("change", sync);
    return () => mql.removeEventListener?.("change", sync);
  }, [breakpoint]);
  return is;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Below 768px the horizontal bars become unreadable — swap to a compact table. */
function CompositionTable({ macroSeries, colors }) {
  const sorted = [...macroSeries].sort((a, b) => b.year - a.year);
  return (
    <div className="data-table">
      <div className="data-table__scroller">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left">Year</th>
              {MACRO_CATEGORIES.map((c) => (
                <th key={c.id} className="align-right">
                  <span
                    className="inline-block h-2 w-2 rounded-full mr-1 align-middle"
                    style={{
                      background:
                        colors.palette[
                          MACRO_CATEGORIES.findIndex((x) => x.id === c.id) %
                            colors.palette.length
                        ],
                    }}
                    aria-hidden="true"
                  />
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const total = row.total || 0;
              return (
                <tr key={row.year}>
                  <td className="tabular-nums">{row.year}</td>
                  {MACRO_CATEGORIES.map((c) => {
                    const pct =
                      total > 0 ? ((row[c.id] || 0) / total) * 100 : 0;
                    return (
                      <td
                        key={c.id}
                        className="align-right tabular-nums"
                        title={fmtUSD0(row[c.id] || 0)}
                      >
                        {pct.toFixed(1)}%
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 100% stacked horizontal bars — one bar per year, segments for each macro
 * spending category. Below 768px, renders as a compact percentage table.
 */
export default function CompositionShiftChart({ macroSeries }) {
  const colors = useChartColors();
  const isSmall = useIsBelow(768);
  const reducedMotion = prefersReducedMotion();

  if (!macroSeries || !macroSeries.length) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        No composition data available.
      </p>
    );
  }

  if (isSmall) {
    return <CompositionTable macroSeries={macroSeries} colors={colors} />;
  }

  // Convert absolute dollars to percentages (0-100) per year.
  const data = macroSeries.map((row) => {
    const total = row.total || 0;
    const out = { year: row.year, _rawTotal: total };
    for (const cat of MACRO_CATEGORIES) {
      out[cat.id] = total > 0 ? ((row[cat.id] || 0) / total) * 100 : 0;
      out[`${cat.id}_usd`] = row[cat.id] || 0;
    }
    return out;
  });

  const h = Math.max(CHART_H, data.length * 48 + 60);

  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, bottom: 12, left: 8 }}
      >
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${Math.round(v)}%`}
          tick={{ fontSize: 11, fill: colors.text }}
          stroke={colors.border}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="year"
          tick={{ fontSize: 12, fill: colors.text }}
          stroke={colors.border}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ fill: "rgba(12, 58, 107, 0.05)" }}
          formatter={(value, name, ctx) => {
            const pct = Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
            const usd = ctx?.payload?.[`${ctx?.dataKey}_usd`];
            const raw = Number.isFinite(usd) ? ` · ${fmtUSD0(usd)}` : "";
            const label =
              MACRO_CATEGORIES.find((c) => c.id === name)?.label || name;
            return [`${pct}${raw}`, label];
          }}
          labelFormatter={(y) => `Year ${y}`}
          contentStyle={tooltipStyle(colors)}
        />
        <Legend
          verticalAlign="top"
          align="left"
          wrapperStyle={{ fontSize: 12 }}
          formatter={(name) =>
            MACRO_CATEGORIES.find((c) => c.id === name)?.label || name
          }
        />
        {MACRO_CATEGORIES.map((cat, i) => (
          <Bar
            key={cat.id}
            dataKey={cat.id}
            stackId="comp"
            fill={colors.palette[i % colors.palette.length]}
            isAnimationActive={!reducedMotion}
            animationDuration={reducedMotion ? 0 : 600}
            animationBegin={reducedMotion ? 0 : i * 60}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
