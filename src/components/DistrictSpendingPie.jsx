import React, { forwardRef } from "react";
import { usd } from "../lib/format";

const CATEGORY_CONFIG = [
  {
    id: "teacher-compensation",
    label: "Teacher compensation",
    columnNames: ["Teacher Compensation Spending", "Teacher Compensation"],
    color: "#4169E1",
  },
  {
    id: "non-teacher-compensation",
    label: "Non-teacher compensation",
    columnNames: ["Non-Teacher Compensation Spending", "Non Teacher Compensation Spending"],
    color: "#FFD700",
  },
  {
    id: "capital-outlay",
    label: "Capital outlay & debt service",
    columnNames: ["Capital Outlay & Debt Service Spending", "Capital Outlay and Debt Service Spending"],
    color: "#1E3A8A",
  },
  {
    id: "other-operating",
    label: "Other operating expenses",
    columnNames: ["Other Operating Expenses Spending", "Other Operating Spending"],
    color: "#4682B4",
  },
  {
    id: "recapture",
    label: "Recapture",
    columnNames: ["Recapture"],
    color: "#FF7F0E",
  },
];

const TOTAL_FIELD_CANDIDATES = [
  "Total Spending",
  "TOTAL_SPENDING",
  "TOTAL SPENDING",
  "TOTAL_EXPENDITURES",
  "TOTAL EXPENSES",
];

const SIZE = 320;
const RADIUS = SIZE / 2;
const INNER_RADIUS = RADIUS * 0.58;
const LABEL_RADIUS = (RADIUS + INNER_RADIUS) / 2;

const LIGHTEN_DELTA = 0.1;

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[-_ ]+/g, "")
    .replace(/[^a-z0-9]/g, "");

const parseAmount = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const str = String(value).trim();
  if (!str) return 0;
  const cleaned = str.replace(/[$,\s]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const lighten = (hex, delta = LIGHTEN_DELTA) => {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  if (normalized.length !== 6) return hex;
  const num = parseInt(normalized, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const lightenChannel = (c) => Math.min(255, Math.round(c + (255 - c) * delta));
  const rr = lightenChannel(r);
  const gg = lightenChannel(g);
  const bb = lightenChannel(b);
  return `#${((rr << 16) | (gg << 8) | bb).toString(16).padStart(6, "0")}`;
};

const polarToCartesian = (cx, cy, radius, angleDeg) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
};

const describeDonutArc = (cx, cy, outerR, innerR, startAngle, endAngle) => {
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);

  return [
    "M",
    outerStart.x,
    outerStart.y,
    "A",
    outerR,
    outerR,
    0,
    largeArcFlag,
    0,
    outerEnd.x,
    outerEnd.y,
    "L",
    innerStart.x,
    innerStart.y,
    "A",
    innerR,
    innerR,
    0,
    largeArcFlag,
    1,
    innerEnd.x,
    innerEnd.y,
    "Z",
  ].join(" ");
};

const DistrictSpendingPie = forwardRef(function DistrictSpendingPie(
  { dataset, districtId, districtName, className = "" },
  ref
) {
  const svgRef = React.useRef(null);
  const chartRef = React.useRef(null);
  const [activeId, setActiveId] = React.useState(null);
  const [tooltip, setTooltip] = React.useState(null);

  const data = React.useMemo(() => {
    if (!dataset || !districtId) {
      return {
        row: null,
        slices: [],
        total: 0,
        fileTotal: 0,
        mismatch: null,
        missingColumns: [],
      };
    }

    const rows = dataset.rows || [];
    if (!rows.length) {
      return {
        row: null,
        slices: [],
        total: 0,
        fileTotal: 0,
        mismatch: null,
        missingColumns: [],
      };
    }

    const sample = rows.find((r) => r && Object.keys(r).length > 0) || rows[0];
    const sampleMap = new Map();
    if (sample) {
      Object.keys(sample).forEach((key) => {
        sampleMap.set(norm(key), key);
      });
    }

    let idKey = dataset.fields?.ID;
    if (!idKey) {
      idKey = sampleMap.get(norm("DISTRICT_N")) || sampleMap.get(norm("DISTRICT ID"));
    }

    const targetRow = rows.find((r) => {
      if (!r) return false;
      if (idKey && r[idKey] !== undefined && r[idKey] !== null) {
        return String(r[idKey]) === String(districtId);
      }
      return Object.keys(r).some(
        (key) => norm(key) === norm("DISTRICT_N") && String(r[key]) === String(districtId)
      );
    });

    if (!targetRow) {
      return {
        row: null,
        slices: [],
        total: 0,
        fileTotal: 0,
        mismatch: null,
        missingColumns: CATEGORY_CONFIG.map((c) => c.columnNames[0]),
      };
    }

    const rowMap = new Map();
    Object.keys(targetRow).forEach((key) => rowMap.set(norm(key), key));

    const missingColumns = [];

    const slicesBase = CATEGORY_CONFIG.map((cat) => {
      const columnKey = cat.columnNames
        .map((candidate) => rowMap.get(norm(candidate)))
        .find(Boolean);
      if (!columnKey) missingColumns.push(cat.columnNames[0]);
      const raw = columnKey ? targetRow[columnKey] : 0;
      const value = parseAmount(raw);
      return {
        ...cat,
        columnKey,
        value,
      };
    });

    const total = slicesBase.reduce((sum, slice) => sum + (Number.isFinite(slice.value) ? slice.value : 0), 0);

    const totalColumn = TOTAL_FIELD_CANDIDATES.map((candidate) => rowMap.get(norm(candidate))).find(Boolean);
    const fileTotal = parseAmount(totalColumn ? targetRow[totalColumn] : 0);

    let mismatch = null;
    if (total > 0 && fileTotal > 0) {
      const diff = Math.abs(fileTotal - total);
      const pct = (diff / total) * 100;
      if (pct > 1) {
        mismatch = {
          diff,
          pct,
        };
      }
    }

    let currentAngle = -90;
    const slices = total
      ? slicesBase.map((slice) => {
          const fraction = total ? slice.value / total : 0;
          const percent = fraction * 100;
          const angle = percent / 100 * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          const midAngle = startAngle + angle / 2;
          currentAngle = endAngle;
          return {
            ...slice,
            percent,
            startAngle,
            endAngle,
            midAngle,
            labelText: `${slice.label} ${percent.toFixed(1)} percent`,
            tooltipText: `${usd.format(slice.value)} • ${percent.toFixed(2)} percent`,
          };
        })
      : slicesBase;

    return {
      row: targetRow,
      slices,
      total,
      fileTotal,
      mismatch,
      missingColumns,
    };
  }, [dataset, districtId]);

  React.useEffect(() => {
    if (data.missingColumns.length) {
      console.warn(
        `[DistrictSpendingPie] Missing spending columns for district ${districtId}: ${data.missingColumns.join(", ")}`
      );
    }
  }, [data.missingColumns, districtId]);

  React.useImperativeHandle(
    ref,
    () => ({
      async exportAsPNG() {
        if (!svgRef.current) throw new Error("Pie chart is not available for export");
        const svgElement = svgRef.current;
        const serialized = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        try {
          const image = new Image();
          image.crossOrigin = "anonymous";
          const promise = new Promise((resolve, reject) => {
            image.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = SIZE;
              canvas.height = SIZE;
              const ctx = canvas.getContext("2d");
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, SIZE, SIZE);
              ctx.drawImage(image, 0, 0, SIZE, SIZE);
              URL.revokeObjectURL(url);
              resolve(canvas.toDataURL("image/png"));
            };
            image.onerror = () => {
              URL.revokeObjectURL(url);
              reject(new Error("Failed to render chart as image"));
            };
          });
          image.src = url;
          return promise;
        } catch (error) {
          URL.revokeObjectURL(url);
          throw error;
        }
      },
    }),
    []
  );

  const handleSliceEnter = (slice) => {
    setActiveId(slice.id);
  };

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

  if (!dataset || !districtId) {
    return null;
  }

  if (!data.row) {
    return (
      <section className={`bg-white border rounded-2xl p-6 ${className}`}>
        <h2 className="text-xl font-bold">District spending breakdown FY 2025</h2>
        <p className="text-gray-600 mt-2">No spending data available for this district.</p>
      </section>
    );
  }

  if (!data.total) {
    return (
      <section className={`bg-white border rounded-2xl p-6 ${className}`}>
        <h2 className="text-xl font-bold">District spending breakdown FY 2025</h2>
        <p className="text-gray-600 mt-2">
          We don’t have spending details for this district yet. Please check back soon.
        </p>
      </section>
    );
  }

  const ariaLabel = `Spending breakdown pie chart for ${districtName || `district ${districtId}`} in fiscal year 2025`;

  return (
    <section className={`bg-white border rounded-2xl p-6 ${className}`}>
      <header className="space-y-1">
        <h2 className="text-xl font-bold">District spending breakdown FY 2025</h2>
        <p className="text-gray-600">{districtName ? `${districtName} (DISTRICT_N ${districtId})` : `DISTRICT_N ${districtId}`}</p>
      </header>

      <div className="mt-6 flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="flex-1 flex justify-center">
          <div
            ref={chartRef}
            className="relative"
            style={{ width: "min(100%, 520px)", maxWidth: 520 }}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="img"
              aria-label={ariaLabel}
            >
              <title>{ariaLabel}</title>
              {data.slices.map((slice) => {
                const isActive = activeId ? activeId === slice.id : false;
                const fill = isActive ? lighten(slice.color) : slice.color;
                return (
                  <g key={slice.id}>
                    <path
                      d={describeDonutArc(RADIUS, RADIUS, RADIUS - 2, INNER_RADIUS, slice.startAngle, slice.endAngle)}
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
                    {slice.percent > 0 && (
                      <text
                        x={polarToCartesian(RADIUS, RADIUS, LABEL_RADIUS, slice.midAngle).x}
                        y={polarToCartesian(RADIUS, RADIUS, LABEL_RADIUS, slice.midAngle).y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-semibold"
                        fill="#111827"
                      >
                        {slice.labelText}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
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

        <div className="lg:w-64 space-y-3">
          <h3 className="text-base font-semibold text-gray-900">Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {data.slices.map((slice) => (
              <button
                key={slice.id}
                type="button"
                className={`flex items-center justify-between rounded-full border px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  activeId === slice.id ? "bg-blue-50 border-blue-400" : "bg-white border-gray-200"
                }`}
                onMouseEnter={() => handleSliceEnter(slice)}
                onMouseLeave={handleSliceLeave}
                onFocus={() => handleLegendFocus(slice)}
                onBlur={handleLegendBlur}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: activeId === slice.id ? lighten(slice.color) : slice.color,
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.8)",
                    }}
                    aria-hidden="true"
                  />
                  <span className="font-medium text-gray-900">{slice.label}</span>
                </span>
                <span className="text-gray-600">{slice.percent.toFixed(1)}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {data.mismatch && (
        <p className="mt-4 text-xs text-amber-700">
          Note: file total differs from computed total by {usd.format(data.mismatch.diff)} and
          {" "}
          {data.mismatch.pct.toFixed(1)} percent for DISTRICT_N = {districtId}.
        </p>
      )}

      <table className="sr-only">
        <caption>{`Spending details for ${districtName || districtId}`}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Dollars</th>
            <th scope="col">Percent</th>
          </tr>
        </thead>
        <tbody>
          {data.slices.map((slice) => (
            <tr key={slice.id}>
              <td>{slice.label}</td>
              <td>{usd.format(slice.value)}</td>
              <td>{slice.percent.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
});

export default DistrictSpendingPie;
