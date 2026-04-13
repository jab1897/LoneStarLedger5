import React from "react";
import { usd, num } from "../lib/format";

const CHIP_STYLES = {
  gray: "bg-gray-50 border-gray-200 text-gray-700",
  green: "bg-green-100 border-green-200 text-green-800",
  yellow: "bg-yellow-100 border-yellow-200 text-yellow-800",
  amber: "bg-amber-100 border-amber-200 text-amber-800",
  red: "bg-red-100 border-red-200 text-red-800",
};

const fmt = (v, kind) => {
  if (!Number.isFinite(v)) return "—";
  if (kind === "usd") return usd.format(v);
  if (kind === "pct") return `${(v * 100).toFixed(1)}%`;
  return num.format(v);
};

const fmtDelta = (v, kind) => {
  if (!Number.isFinite(v)) return "—";
  const sign = v >= 0 ? "+" : "−";
  const abs = Math.abs(v);
  if (kind === "usd") return `${sign}${usd.format(abs)}`;
  if (kind === "pct") return `${sign}${(abs * 100).toFixed(1)}%`;
  return `${sign}${num.format(abs)}`;
};

/**
 * Horizontal comparison row showing a single metric for the campus vs the
 * district average, with a color-coded delta chip.
 *
 * Props:
 *   label            — metric label (string, may include footnote marker)
 *   campus, district — numeric values (may be NaN)
 *   kind             — "usd" | "num" | "pct"
 *   higherIsBetter   — default true; flips green/red polarity when false
 */
export default function ComparisonRow({
  label,
  campus,
  district,
  kind = "usd",
  higherIsBetter = true,
}) {
  const hasBoth = Number.isFinite(campus) && Number.isFinite(district);
  const delta = hasBoth ? campus - district : NaN;
  const pctDelta = hasBoth && district !== 0 ? (delta / district) * 100 : NaN;

  let color = "gray";
  let chipText = "no comparison";
  let arrow = "";

  if (hasBoth) {
    const absPct = Number.isFinite(pctDelta) ? Math.abs(pctDelta) : 0;
    const favorable = higherIsBetter ? delta >= 0 : delta <= 0;

    if (absPct < 2) {
      color = "gray";
    } else if (favorable) {
      color = absPct > 10 ? "green" : "yellow";
    } else {
      color = absPct > 10 ? "red" : "amber";
    }

    arrow = delta === 0 ? "" : delta > 0 ? "▲" : "▼";
    const pctText = Number.isFinite(pctDelta)
      ? ` (${pctDelta >= 0 ? "+" : "−"}${Math.abs(pctDelta).toFixed(1)}%)`
      : "";
    chipText = `${fmtDelta(delta, kind)}${pctText}`;
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-[var(--text-muted)] tabular-nums">
          Campus: <span className="text-gray-900 font-semibold">{fmt(campus, kind)}</span>
          <span className="mx-2">·</span>
          District avg: <span className="text-gray-900 font-semibold">{fmt(district, kind)}</span>
        </p>
      </div>
      <div
        className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums ${CHIP_STYLES[color]}`}
      >
        {arrow && <span aria-hidden="true">{arrow}</span>}
        <span>{chipText}</span>
      </div>
    </div>
  );
}
