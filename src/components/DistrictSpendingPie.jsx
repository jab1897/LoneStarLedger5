import React from "react";
import { usd } from "../lib/format";

const CATEGORY_CONFIG = [
  {
    id: "teacher-compensation",
    column: "Teacher Compensation Spending",
    label: "Teacher compensation",
    legend: "Teacher compensation",
    color: "#4169E1",
  },
  {
    id: "non-teacher-compensation",
    column: "Non-Teacher Compensation Spending",
    label: "Non-teacher compensation",
    legend: "Non-teacher compensation",
    color: "#FFD700",
  },
  {
    id: "capital-outlay",
    column: "Capital Outlay & Debt Service Spending",
    label: "Capital outlay & debt service",
    legend: "Capital outlay & debt service",
    color: "#1E3A8A",
  },
  {
    id: "other-operating",
    column: "Other Operating Expenses Spending",
    label: "Other operating expenses",
    legend: "Other operating expenses",
    color: "#4682B4",
  },
  {
    id: "recapture",
    column: "Recapture",
    label: "Recapture",
    legend: "Recapture",
    color: "#FF7F0E",
  },
];

const TOTAL_COLUMN = "Total Spending";

const VIEWBOX_WIDTH = 520;
const VIEWBOX_HEIGHT = 400;
const CENTER_X = VIEWBOX_WIDTH / 2;
const CENTER_Y = VIEWBOX_HEIGHT / 2;
const OUTER_RADIUS = 160;
const INNER_RADIUS = OUTER_RADIUS * 0.58;
const LABEL_RADIUS = OUTER_RADIUS + 34;

const normalizeKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

const parseAmount = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const str = String(value).trim();
  if (!str) return 0;
  const numeric = Number(str.replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const lighten = (hex, amount = 0.1) => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const mix = (channel) => Math.min(255, Math.round(channel + (255 - channel) * amount));
  const nr = mix(r);
  const ng = mix(g);
  const nb = mix(b);
  return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1).toUpperCase()}`;
};

const polarToCartesian = (cx, cy, radius, angle) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle),
});

const describeArc = (cx, cy, innerR, outerR, startAngle, endAngle) => {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const startInner = polarToCartesian(cx, cy, innerR, endAngle);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    "M",
    startOuter.x,
    startOuter.y,
    "A",
    outerR,
    outerR,
    0,
    largeArc,
    1,
    endOuter.x,
    endOuter.y,
    "L",
    startInner.x,
    startInner.y,
    "A",
    innerR,
    innerR,
    0,
    largeArc,
    0,
    endInner.x,
    endInner.y,
    "Z",
  ].join(" ");
};

const computeSlices = (dataset, districtId) => {
  const rows = dataset?.rows || [];
  if (!rows.length || !districtId) {
    return {
      slices: [],
      total: 0,
      fileTotal: 0,
      missingColumns: [],
      row: null,
    };
  }

  const fields = dataset.fields || {};
  const idCandidates = [];
  if (fields.ID) idCandidates.push(fields.ID);
  idCandidates.push("DISTRICT_N", "DISTRICT_ID", "DISTRICT", "ID");

  let row = null;
  for (const candidate of idCandidates) {
    if (!candidate) continue;
    row = rows.find((r) => candidate in r && String(r[candidate]) === String(districtId));
    if (row) break;
  }

  if (!row) {
    return {
      slices: [],
      total: 0,
      fileTotal: 0,
      missingColumns: CATEGORY_CONFIG.map((c) => c.column),
      row: null,
    };
  }

  const sample = rows.find((r) => r && Object.keys(r).length) || row;
  const headerMap = new Map();
  for (const source of [sample, row]) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      const norm = normalizeKey(key);
      if (!headerMap.has(norm)) headerMap.set(norm, key);
    }
  }

  const missingColumns = [];
  const slices = CATEGORY_CONFIG.map((config) => {
    const columnKey = headerMap.get(normalizeKey(config.column));
    if (!columnKey) missingColumns.push(config.column);
    const raw = columnKey ? row[columnKey] : null;
    const value = parseAmount(raw);
    return {
      ...config,
      value,
      percent: 0,
      tooltipPercent: "0.00",
      percentLabel: "0.0",
      columnKey: columnKey || null,
    };
  });

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const fileTotalKey = headerMap.get(normalizeKey(TOTAL_COLUMN));
  const fileTotal = parseAmount(fileTotalKey ? row[fileTotalKey] : null);

  let currentAngle = -Math.PI / 2;
  const decorated = slices.map((slice) => {
    const angle = total > 0 ? (slice.value / total) * Math.PI * 2 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    const percent = total > 0 ? (slice.value / total) * 100 : 0;
    return {
      ...slice,
      startAngle,
      endAngle,
      midAngle: startAngle + (endAngle - startAngle) / 2,
      percent,
      tooltipPercent: percent.toFixed(2),
      percentLabel: percent.toFixed(1),
    };
  });

  return {
    slices: decorated,
    total,
    fileTotal,
    missingColumns,
    row,
  };
};

const DistrictSpendingPie = React.forwardRef(function DistrictSpendingPie(
  { districtId, districtName, dataset },
  ref
) {
  const containerRef = React.useRef(null);
  const svgRef = React.useRef(null);
  const chartInstanceId = React.useId();
  const titleId = `${chartInstanceId}-title`;
  const descId = `${chartInstanceId}-desc`;
  const tableId = `${chartInstanceId}-table`;

  const [hoveredIndex, setHoveredIndex] = React.useState(null);
  const [tooltip, setTooltip] = React.useState(null);

  const data = React.useMemo(() => computeSlices(dataset, districtId), [dataset, districtId]);

  React.useEffect(() => {
    if (data.missingColumns && data.missingColumns.length) {
      console.warn(
        `[DistrictSpendingPie] Missing columns for district ${districtId}: ${data.missingColumns.join(", ")}`
      );
    }
  }, [data.missingColumns, districtId]);

  React.useEffect(() => {
    setHoveredIndex(null);
    setTooltip(null);
  }, [districtId]);

  const mismatchInfo = React.useMemo(() => {
    const difference = Math.abs((data.fileTotal || 0) - (data.total || 0));
    const denom = data.total !== 0 ? data.total : data.fileTotal;
    const percent = denom ? (difference / denom) * 100 : 0;
    const exceeds = percent > 1;
    return {
      difference,
      percent,
      exceeds,
    };
  }, [data.fileTotal, data.total]);

  const handlePointerMove = (event, slice, index) => {
    if (!containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    setHoveredIndex(index);
    setTooltip({
      x,
      y,
      slice,
    });
  };

  const handlePointerLeave = () => {
    setHoveredIndex(null);
    setTooltip(null);
  };

  const handleFocus = (slice, index) => {
    setHoveredIndex(index);
    if (!containerRef.current) return;
    setTooltip({
      x: containerRef.current.clientWidth / 2,
      y: containerRef.current.clientHeight / 2,
      slice,
    });
  };

  const isEmpty = data.total <= 0;

  let tooltipContent = null;
  if (tooltip) {
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const width = containerRef.current?.clientWidth || 0;
    const height = containerRef.current?.clientHeight || 0;
    const left = clamp(tooltip.x, 24, Math.max(width - 24, 24));
    const top = clamp(tooltip.y, 24, Math.max(height - 24, 24));
    tooltipContent = (
      <div
        className="pointer-events-none absolute rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg"
        style={{
          left,
          top,
          transform: "translate(-50%, -110%)",
        }}
      >
        <div className="font-medium text-gray-900">{tooltip.slice.label}</div>
        <div className="text-gray-600">
          {usd.format(tooltip.slice.value)}
          {" "}•{" "}
          {Number.parseFloat(tooltip.slice.tooltipPercent).toFixed(2)}%
        </div>
      </div>
    );
  }

  React.useImperativeHandle(ref, () => ({
    async exportPNG() {
      if (!svgRef.current) {
        throw new Error("Pie chart is not available for export.");
      }
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgRef.current);
      if (!source.match(/^<svg[^>]+xmlns="http:\/\/www.w3.org\/2000\/svg"/)) {
        source = source.replace(
          /^<svg/,
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
        );
      }
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            try {
              const viewBox = svgRef.current.viewBox?.baseVal;
              const width = viewBox?.width || svgRef.current.clientWidth || VIEWBOX_WIDTH;
              const height = viewBox?.height || svgRef.current.clientHeight || VIEWBOX_HEIGHT;
              const canvas = document.createElement("canvas");
              canvas.width = Math.round(width);
              canvas.height = Math.round(height);
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                reject(new Error("Canvas 2D context is not available."));
                return;
              }
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL("image/png"));
            } catch (err) {
              reject(err);
            }
          };
          image.onerror = (err) => reject(err);
          image.src = url;
        });
        return dataUrl;
      } finally {
        URL.revokeObjectURL(url);
      }
    },
  }));

  if (!dataset || !districtId) {
    return <p className="text-gray-600">Spending data is loading…</p>;
  }

  if (!data.row) {
    return (
      <div className="text-center text-gray-600">
        We couldn’t find a spending record for this district.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">
          District spending breakdown FY 2025
        </h2>
        <p className="text-gray-600">
          {districtName} (DISTRICT_N {districtId})
        </p>
      </div>

      {isEmpty ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-gray-600">
          We don’t have spending details for this district in the five required categories.
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-center">
          <div className="relative w-full max-w-[520px] md:max-w-[480px]" ref={containerRef}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
              role="img"
              aria-label={`Spending breakdown pie chart for ${districtName} in fiscal year 2025`}
              aria-describedby={tableId}
              className="w-full"
              onMouseLeave={handlePointerLeave}
            >
              <title id={titleId}>
                Spending breakdown pie chart for {districtName} in fiscal year 2025
              </title>
              <desc id={descId}>
                Percentage allocation across teacher compensation, non-teacher compensation, capital outlay and debt service, other operating expenses, and recapture.
              </desc>
              {data.slices.map((slice, index) => {
                const path = describeArc(
                  CENTER_X,
                  CENTER_Y,
                  INNER_RADIUS,
                  OUTER_RADIUS,
                  slice.startAngle,
                  slice.endAngle
                );
                const labelPoint = polarToCartesian(CENTER_X, CENTER_Y, LABEL_RADIUS, slice.midAngle);
                const anchor = labelPoint.x >= CENTER_X ? "start" : "end";
                const lineStart = polarToCartesian(
                  CENTER_X,
                  CENTER_Y,
                  OUTER_RADIUS + 8,
                  slice.midAngle
                );
                const lineEnd = polarToCartesian(CENTER_X, CENTER_Y, LABEL_RADIUS - 8, slice.midAngle);
                const fill = hoveredIndex === index ? lighten(slice.color, 0.1) : slice.color;
                return (
                  <g key={slice.id}>
                    <path
                      d={path}
                      fill={fill}
                      stroke="#ffffff"
                      strokeWidth={1}
                      tabIndex={0}
                      onMouseMove={(event) => handlePointerMove(event, slice, index)}
                      onFocus={() => handleFocus(slice, index)}
                      onBlur={handlePointerLeave}
                      onMouseLeave={handlePointerLeave}
                      aria-label={`${slice.label} ${slice.percentLabel} percent`}
                    />
                    <line
                      x1={lineStart.x}
                      y1={lineStart.y}
                      x2={lineEnd.x}
                      y2={lineEnd.y}
                      stroke="#CBD5F5"
                      strokeWidth={1}
                    />
                    <text
                      x={labelPoint.x}
                      y={labelPoint.y}
                      textAnchor={anchor}
                      style={{
                        fontSize: "12px",
                        fill: "#1F2937",
                        fontWeight: 500,
                      }}
                    >
                      {`${slice.label} ${slice.percentLabel} percent`}
                    </text>
                  </g>
                );
              })}

              <circle cx={CENTER_X} cy={CENTER_Y} r={INNER_RADIUS} fill="#FFFFFF" />
              <text
                x={CENTER_X}
                y={CENTER_Y - 6}
                textAnchor="middle"
                style={{ fontSize: "14px", fill: "#1F2937", fontWeight: 600 }}
              >
                Total
              </text>
              <text
                x={CENTER_X}
                y={CENTER_Y + 18}
                textAnchor="middle"
                style={{ fontSize: "14px", fill: "#1F2937", fontWeight: 600 }}
              >
                {usd.format(data.total)}
              </text>
            </svg>

            {tooltipContent}
          </div>

          <div className="w-full max-w-md md:w-60">
            <h3 className="sr-only">Spending legend</h3>
            <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-1" role="list">
              {data.slices.map((slice, index) => (
                <li
                  key={`legend-${slice.id}`}
                  className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 transition hover:border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500"
                >
                  <span
                    className="mt-0.5 inline-block h-4 w-4 flex-shrink-0 rounded"
                    style={{
                      backgroundColor:
                        hoveredIndex === index ? lighten(slice.color, 0.1) : slice.color,
                      border: "1px solid #ffffff",
                    }}
                  />
                  <button
                    type="button"
                    className="text-left"
                    tabIndex={0}
                    onFocus={() => handleFocus(slice, index)}
                    onBlur={handlePointerLeave}
                    onMouseEnter={(event) => handlePointerMove(event, slice, index)}
                    onMouseLeave={handlePointerLeave}
                  >
                    <div className="font-semibold text-gray-900">{slice.legend}</div>
                    <div className="text-gray-600">
                      {slice.percentLabel}% • {usd.format(slice.value)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {mismatchInfo.exceeds && (
        <p className="mt-4 text-sm text-amber-700">
          Note: file total differs from computed total by {usd.format(mismatchInfo.difference)} and
          {" "}
          {mismatchInfo.percent.toFixed(2)} percent for DISTRICT_N = {districtId}.
        </p>
      )}

      <table id={tableId} className="sr-only">
        <caption>Spending detail for screen readers</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Dollars</th>
            <th scope="col">Percent of total</th>
          </tr>
        </thead>
        <tbody>
          {data.slices.map((slice) => (
            <tr key={`sr-${slice.id}`}>
              <td>{slice.legend}</td>
              <td>{usd.format(slice.value)}</td>
              <td>{slice.tooltipPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default DistrictSpendingPie;
