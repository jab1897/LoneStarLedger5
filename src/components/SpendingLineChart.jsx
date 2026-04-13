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

const CHART_H = 320;

/**
 * Total Spending Over Time.
 *
 * Line 1 = this district (bold, --viz-1), with a 10%-opacity area fill underneath.
 * Line 2 = statewide average per district (dashed, --viz-8).
 */
export default function SpendingLineChart({ totals }) {
  const colors = useChartColors();

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

  return (
    <div style={{ width: "100%" }}>
      <ResponsiveContainer width="100%" height={CHART_H}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 12, left: 8 }}
        >
          <defs>
            <linearGradient id="districtFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.total} stopOpacity={0.18} />
              <stop offset="100%" stopColor={colors.total} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: colors.text }}
            stroke={colors.border}
          />
          <YAxis
            tickFormatter={fmtShortUSD}
            tick={{ fontSize: 12, fill: colors.text }}
            stroke={colors.border}
            width={70}
          />
          <Tooltip
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
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="district"
            name="This district"
            stroke={colors.total}
            strokeWidth={2.5}
            dot={{ r: 4, strokeWidth: 1, stroke: colors.surface, fill: colors.total }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="statewide"
            name="Statewide avg / district"
            stroke={colors.statewide}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3, strokeWidth: 1, stroke: colors.surface, fill: colors.statewide }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
