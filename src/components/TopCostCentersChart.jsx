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

const CHART_H_DEFAULT = 360;
const CHART_H_MOBILE = 280;

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
 * Grouped bar chart: top 5 object codes, bars per year. Bars per year are
 * colored from the --viz-1..--viz-5 palette.
 */
export default function TopCostCentersChart({ topObjects, years }) {
  const colors = useChartColors();
  const isMobile = useIsMobile(640);
  const reducedMotion = prefersReducedMotion();
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

  const yearColors = years.map(
    (_, i) => colors.palette[i % colors.palette.length]
  );

  return (
    <div>
      {/* Sort pills */}
      <div className="sort-pills mb-3">
        <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)] mr-1">
          Sort
        </span>
        {SORT_OPTIONS.map((opt) => {
          const active = sortMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className="sort-pill"
              onClick={() => setSortMode(opt.id)}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer
        width="100%"
        height={isMobile ? CHART_H_MOBILE : CHART_H_DEFAULT}
      >
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, bottom: isMobile ? 48 : 24, left: 8 }}
        >
          <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: isMobile ? 10 : 11, fill: colors.text }}
            stroke={colors.border}
            tickLine={false}
            interval={0}
            angle={isMobile ? -45 : -16}
            textAnchor="end"
            height={isMobile ? 70 : 60}
          />
          <YAxis
            tickFormatter={fmtShortUSD}
            tick={{ fontSize: 12, fill: colors.text }}
            stroke={colors.border}
            tickLine={false}
            width={isMobile ? 52 : 70}
          />
          <Tooltip
            cursor={{ fill: "rgba(12, 58, 107, 0.05)" }}
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
              isAnimationActive={!reducedMotion}
              animationDuration={reducedMotion ? 0 : 700}
              animationBegin={reducedMotion ? 0 : i * 80}
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
