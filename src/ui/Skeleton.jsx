import React from "react";

/**
 * Shimmer skeleton placeholder. Use the `variant` prop or pass custom
 * `className` / inline style for unusual shapes.
 *
 * Variants:
 *   "text"  — 0.85em line
 *   "title" — slightly taller, narrower
 *   "value" — KPI-sized
 *   "block" — 100px rectangle
 *   "chart" — 320px rectangle (matches our line chart height)
 *   "pill"  — short rounded-full placeholder
 */
export default function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
  style,
  ...rest
}) {
  const modifier = `skeleton--${variant}`;
  const classes = `skeleton ${modifier} ${className}`.trim();
  const mergedStyle = { ...(style || {}) };
  if (width !== undefined) mergedStyle.width = width;
  if (height !== undefined) mergedStyle.height = height;
  if (variant === "pill") {
    mergedStyle.borderRadius = "999px";
    if (!mergedStyle.height) mergedStyle.height = "1.5rem";
    if (!mergedStyle.width) mergedStyle.width = "5rem";
  }
  return (
    <span
      className={classes}
      style={mergedStyle}
      aria-hidden="true"
      {...rest}
    />
  );
}

/**
 * Convenience composite: a "Loading KPI card" — 3 stacked skeleton shapes
 * shaped like a label + big value + trend row, inside the same .card + .kpi
 * container the real KPI row uses, so there is no layout shift.
 */
export function SkeletonKPI({ accent = "brand" }) {
  return (
    <div
      className={`card stat-card kpi kpi--dense ${
        accent === "accent" ? "kpi--accent" : "kpi--brand"
      }`}
    >
      <Skeleton variant="title" width="55%" />
      <Skeleton variant="value" width="80%" />
      <Skeleton variant="text" width="35%" />
    </div>
  );
}

/** Skeleton block sized like a chart container. */
export function SkeletonChart({ height = 320 }) {
  return <Skeleton variant="chart" height={height} />;
}

/** Skeleton rows for a table (N rows of even height). */
export function SkeletonTableRows({ rows = 4 }) {
  return (
    <div style={{ display: "grid", gap: "0.5rem", padding: "0.5rem 0" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="block" height={38} />
      ))}
    </div>
  );
}
