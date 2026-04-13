import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  fmtShortUSD,
  fmtUSD0,
  fmtSignedPct,
  getObjectLabel,
  useChartColors,
  tooltipStyle,
} from "../lib/spendingHelpers";

const CHART_H = 360;

const SORT_OPTIONS = [
  { id: "amount", label: "2024 Amount" },
  { id: "growth", label: "Growth Rate" },
  { id: "alpha",  label: "A–Z" },
];

function sortObjects(list, mode) {
  const arr = [...list];
  if (mode === "growth") {
    arr.sort((a, b) => {
      const av = Number.isFinite(a.growthRate) ? a.growthRate : -Infinity;
      const bv = Number.isFinite(b.growthRate) ? b.growthRate : -Infinity;
      return bv - av;
    });
  } else if (mode === "alpha") {
    arr.sort((a, b) =>
      getObjectLabel(a.objectDescription).localeCompare(
        getObjectLabel(b.objectDescription)
      )
    );
  } else {
    arr.sort((a, b) => (b.total2024 || 0) - (a.total2024 || 0));
  }
  return arr;
}

/**
 * Grouped bar chart: top 5 object codes, bars per year.
 * Bars are colored via --viz-1..--viz-5 palette.
 */
export default function TopCostCentersChart({ topObjects, years }) {
  const colors = useChartColors();
  const [sortMode, setSortMode] = React.useState("amount");

  const sorted = React.useMemo(
    () => sortObjects(topObjects || [], sortMode),
    [topObjects, sortMode]
  );

  if (!topObjects || !topObjects.length || !years || !years.length) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        No object-code data available.
      </p>
    );
  }

  // Build data: one row per object, one key per year.
  const data = sorted.map((obj) => {
    const row = {
      key: obj.objectCode,
      label: getObjectLabel(obj.objectDescription) || `Code ${obj.objectCode}`,
      growthRate: obj.growthRate,
    };
    for (const y of years) {
      row[`y${y}`] = Number.isFinite(obj.byYear?.[y]) ? obj.byYear[y] : 0;
    }
    return row;
  });

  // Palette: --viz-1 through --viz-5 (one per YEAR, so all bars for the same year
  // share a color; top-5 ranking is shown on the X-axis label).
  const yearColors = years.map((_, i) => colors.palette[i % colors.palette.length]);

  return (
    <div>
      {/* Sort pills */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs text-[var(--text-muted)] mr-1">Sort:</span>
        {SORT_OPTIONS.map((opt) => {
          const active = sortMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSortMode(opt.id)}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                active
                  ? "bg-[var(--brand-500)] text-white border-[var(--brand-500)]"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={CHART_H}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 16, left: 8 }}
        >
          <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: colors.text }}
            stroke={colors.border}
            interval={0}
            angle={-16}
            textAnchor="end"
            height={60}
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
              String(name).replace(/^y/, ""),
            ]}
            labelFormatter={(label, payload) => {
              const growth = payload?.[0]?.payload?.growthRate;
              const growthText = Number.isFinite(growth)
                ? ` — ${fmtSignedPct(growth)} since ${years[0]}`
                : "";
              return `${label}${growthText}`;
            }}
            contentStyle={tooltipStyle(colors)}
          />
          <Legend
            verticalAlign="top"
            align="left"
            wrapperStyle={{ fontSize: 12 }}
            formatter={(v) => String(v).replace(/^y/, "")}
          />
          {years.map((y, i) => (
            <Bar
              key={y}
              dataKey={`y${y}`}
              name={`y${y}`}
              fill={yearColors[i]}
              isAnimationActive={false}
            >
              {data.map((_, idx) => (
                <Cell key={`${y}-${idx}`} fill={yearColors[i]} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
