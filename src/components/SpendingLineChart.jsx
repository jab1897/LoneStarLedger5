import React from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  fmtShortUSD,
  fmtUSD0,
  useChartColors,
  tooltipStyle,
} from "../lib/spendingHelpers";

const CHART_H_DEFAULT = 320;
const CHART_H_MOBILE = 240;

function useIsMobile(breakpoint = 640) {
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

/**
 * Total Spending Over Time. District line (bold, viz-1) with 10% area fill;
 * statewide average per district line (dashed, viz-8).
 */
export default function SpendingLineChart({ totals }) {
  const colors = useChartColors();
  const isMobile = useIsMobile(640);
  const reducedMotion = prefersReducedMotion();

  if (!totals || !totals.length) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        No spending timeline data available.
      </p>
    );
  }

  const data = totals.map((t) => ({
    year: t.year,
    district: Number.isFinite(t.totalSpending) ? t.totalSpending : null,
    statewide: Number.isFinite(t.statewidePerDistrict)
      ? t.statewidePerDistrict
      : null,
  }));

  const height = isMobile ? CHART_H_MOBILE : CHART_H_DEFAULT;

  return (
    <div style={{ width: "100%" }}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 12, left: 8 }}
        >
          <defs>
            <linearGradient id="districtFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.total} stopOpacity={0.22} />
              <stop offset="100%" stopColor={colors.total} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: colors.text }}
            stroke={colors.border}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtShortUSD}
            tick={{ fontSize: 12, fill: colors.text }}
            stroke={colors.border}
            tickLine={false}
            width={isMobile ? 52 : 70}
          />
          <Tooltip
            cursor={{ stroke: colors.border, strokeWidth: 1, strokeDasharray: "4 4" }}
            formatter={(value, name) => [
              Number.isFinite(value) ? fmtUSD0(value) : "—",
              name,
            ]}
            labelFormatter={(y) => `Year ${y}`}
            contentStyle={tooltipStyle(colors)}
          />
          <Legend verticalAlign="top" align="left" wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="district"
            name="This district"
            stroke="none"
            fill="url(#districtFill)"
            isAnimationActive={!reducedMotion}
            animationDuration={reducedMotion ? 0 : 900}
          />
          <Line
            type="monotone"
            dataKey="district"
            name="This district"
            stroke={colors.total}
            strokeWidth={2.5}
            dot={{ r: 4, strokeWidth: 1.5, stroke: colors.surface, fill: colors.total }}
            activeDot={{ r: 6 }}
            isAnimationActive={!reducedMotion}
            animationDuration={reducedMotion ? 0 : 900}
          />
          <Line
            type="monotone"
            dataKey="statewide"
            name="Statewide avg / district"
            stroke={colors.statewide}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3, strokeWidth: 1, stroke: colors.surface, fill: colors.statewide, shape: "square" }}
            isAnimationActive={!reducedMotion}
            animationDuration={reducedMotion ? 0 : 900}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
