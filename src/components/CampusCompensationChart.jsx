import React from "react";
import { usd } from "../lib/format";

/**
 * Two-slice compensation donut for CampusDetail. Mirrors the geometry,
 * hover behavior, and legend-card pattern of DistrictSpendingPie, but is
 * scoped to teacher vs admin compensation only.
 */

const SIZE = 300;
const RADIUS = SIZE / 2;
const INNER_RADIUS = RADIUS * 0.6;
const LIGHTEN_DELTA = 0.1;

const TEACHER_COLOR = "#0072B2"; // --viz-1
const ADMIN_COLOR = "#E69F00";   // --viz-2

const lighten = (hex, delta = LIGHTEN_DELTA) => {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  if (normalized.length !== 6) return hex;
  const n = parseInt(normalized, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const lc = (c) => Math.min(255, Math.round(c + (255 - c) * delta));
  return `#${((lc(r) << 16) | (lc(g) << 8) | lc(b)).toString(16).padStart(6, "0")}`;
};

const polarToCartesian = (cx, cy, radius, angleDeg) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) };
};

const describeDonutArc = (cx, cy, outerR, innerR, startAngle, endAngle) => {
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  return [
    "M", outerStart.x, outerStart.y,
    "A", outerR, outerR, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
    "L", innerStart.x, innerStart.y,
    "A", innerR, innerR, 0, largeArcFlag, 1, innerEnd.x, innerEnd.y,
    "Z",
  ].join(" ");
};

export default function CampusCompensationChart({ teacherComp, adminComp }) {
  const chartRef = React.useRef(null);
  const [activeId, setActiveId] = React.useState(null);
  const [tooltip, setTooltip] = React.useState(null);

  const { slices, total } = React.useMemo(() => {
    const raw = [
      { id: "teacher", label: "Teacher compensation", value: teacherComp, color: TEACHER_COLOR },
      { id: "admin",   label: "Admin compensation",   value: adminComp,   color: ADMIN_COLOR },
    ].filter((s) => Number.isFinite(s.value) && s.value > 0);

    const t = raw.reduce((sum, s) => sum + s.value, 0);
    if (!t) return { slices: [], total: 0 };

    let currentAngle = -90;
    const built = raw.map((s) => {
      const percent = (s.value / t) * 100;
      const angle = (percent / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;
      return {
        ...s,
        percent,
        startAngle,
        endAngle,
        labelText: `${s.label} ${percent.toFixed(1)} percent`,
        tooltipText: `${usd.format(s.value)} • ${percent.toFixed(1)} percent`,
      };
    });
    return { slices: built, total: t };
  }, [teacherComp, adminComp]);

  const handleSliceEnter = (slice) => setActiveId(slice.id);
  const handleSliceLeave = () => {
    setActiveId(null);
    setTooltip(null);
  };
  const handleMouseMove = (event, slice) => {
    if (!chartRef.current) return;
    const bounds = chartRef.current.getBoundingClientRect();
    setTooltip({
      id: slice.id,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      text: slice.tooltipText,
    });
  };
  const handleLegendFocus = (slice) => {
    setActiveId(slice.id);
    const rect = chartRef.current?.getBoundingClientRect();
    const fallback = SIZE / 2;
    setTooltip({
      id: slice.id,
      x: rect ? rect.width / 2 : fallback,
      y: rect ? rect.height / 2 : fallback,
      text: slice.tooltipText,
    });
  };
  const handleLegendBlur = () => {
    setActiveId(null);
    setTooltip(null);
  };

  if (!slices.length) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Compensation data unavailable.
      </p>
    );
  }

  const ariaLabel = "Campus compensation breakdown donut chart";

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
      <div className="flex-1 flex justify-center">
        <div
          ref={chartRef}
          className="relative flex items-center justify-center w-full"
          style={{ width: "min(100%, 300px)", maxWidth: 300 }}
        >
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label={ariaLabel}
            className="w-full h-auto"
          >
            <title>{ariaLabel}</title>
            {slices.map((slice) => {
              const isActive = activeId === slice.id;
              const fill = isActive ? lighten(slice.color) : slice.color;
              return (
                <g key={slice.id}>
                  <path
                    d={describeDonutArc(
                      RADIUS,
                      RADIUS,
                      RADIUS - 2,
                      INNER_RADIUS,
                      slice.startAngle,
                      slice.endAngle
                    )}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={1}
                    tabIndex={0}
                    focusable="true"
                    role="listitem"
                    aria-label={slice.labelText}
                    onMouseEnter={() => handleSliceEnter(slice)}
                    onMouseLeave={handleSliceLeave}
                    onMouseMove={(event) => handleMouseMove(event, slice)}
                    onFocus={() => handleLegendFocus(slice)}
                    onBlur={handleLegendBlur}
                  />
                </g>
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-medium text-gray-500">Total comp</span>
            <span className="text-lg font-semibold text-gray-900">
              {usd.format(total)}
            </span>
          </div>
          {tooltip && (
            <div
              className="pointer-events-none absolute bg-gray-900 text-white text-xs rounded-md px-2 py-1 shadow-lg"
              style={{
                left: Math.min(Math.max(tooltip.x, 0), chartRef.current?.offsetWidth || SIZE),
                top: Math.min(Math.max(tooltip.y, 0), chartRef.current?.offsetHeight || SIZE),
                transform: "translate(-50%, -120%)",
                maxWidth: 220,
                whiteSpace: "normal",
              }}
            >
              {tooltip.text}
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {slices.map((slice) => (
          <button
            key={slice.id}
            type="button"
            className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              activeId === slice.id
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-white hover:bg-slate-50"
            }`}
            onMouseEnter={() => handleSliceEnter(slice)}
            onMouseLeave={handleSliceLeave}
            onFocus={() => handleLegendFocus(slice)}
            onBlur={handleLegendBlur}
          >
            <span
              className="inline-flex h-3.5 w-3.5 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  activeId === slice.id ? lighten(slice.color) : slice.color,
                boxShadow: "0 0 0 1px rgba(255,255,255,0.9)",
              }}
              aria-hidden="true"
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">{slice.label}</span>
              <span className="text-xs text-gray-600">
                {slice.percent.toFixed(1)}% · {usd.format(slice.value)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
