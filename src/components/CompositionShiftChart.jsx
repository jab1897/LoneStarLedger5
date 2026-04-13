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

const CHART_H = 200;

/**
 * 100% stacked horizontal bars — one bar per year, segments for each macro
 * spending category. Shows how the composition of spending shifts over time.
 */
export default function CompositionShiftChart({ macroSeries }) {
  const colors = useChartColors();

  if (!macroSeries || !macroSeries.length) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        No composition data available.
      </p>
    );
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

  // Dynamic height: enough room per year bar, clamped at 200px minimum.
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
        />
        <YAxis
          type="category"
          dataKey="year"
          tick={{ fontSize: 12, fill: colors.text }}
          stroke={colors.border}
          width={48}
        />
        <Tooltip
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
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
