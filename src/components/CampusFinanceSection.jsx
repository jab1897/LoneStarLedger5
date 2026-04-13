import React from "react";
import { usd } from "../lib/format";
import { deriveCampusFinance } from "../lib/campusFinance";
import AnimatedValue from "../ui/AnimatedValue";
import StaffingBar from "./StaffingBar";
import ComparisonRow from "./ComparisonRow";
import CampusCompensationChart from "./CampusCompensationChart";

const fmtUSD = (v) =>
  Number.isFinite(v)
    ? usd.format(Math.round(v))
    : "—";

function KpiTile({ label, rawValue, valueFormatter, sub, accent }) {
  const hasValue = Number.isFinite(rawValue);
  const accentClass =
    accent === "accent" ? "kpi--accent" : accent === "brand" ? "kpi--brand" : "";
  return (
    <div className={`card kpi kpi--dense ${accentClass}`}>
      <span className="label">{label}</span>
      <span className="value">
        {hasValue ? (
          <AnimatedValue value={rawValue} format={valueFormatter} />
        ) : (
          "—"
        )}
      </span>
      {sub && <span className="sub">{sub}</span>}
    </div>
  );
}

/**
 * Campus Finances — a compelling campus-level financial profile section
 * rendered between the header StatPills and the Campus Location map on
 * CampusDetail.
 */
export default function CampusFinanceSection({
  row,
  fields,
  districtRow,
  districtFields,
  campusName,
}) {
  const fin = React.useMemo(
    () => deriveCampusFinance({ row, fields, districtRow, districtFields }),
    [row, fields, districtRow, districtFields]
  );

  const hasDistrict = !!districtRow && !!districtFields;
  const hasAnyCompensation =
    (Number.isFinite(fin.teacherComp) && fin.teacherComp > 0) ||
    (Number.isFinite(fin.adminComp) && fin.adminComp > 0);

  return (
    <section className="section-card space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <span className="eyebrow eyebrow--brand">Financials</span>
          <h2 className="section-title mt-1">Campus Finances</h2>
          {campusName && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{campusName}</p>
          )}
        </div>
      </header>

      {/* A. KPI tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiTile
          label="Est. Campus Spending"
          rawValue={fin.estSpending}
          valueFormatter={fmtUSD}
          sub="Estimate · district per-pupil × enrollment"
          accent="accent"
        />
        <KpiTile
          label="Avg Teacher Salary"
          rawValue={fin.teacherSal}
          valueFormatter={fmtUSD}
          accent="brand"
        />
        <KpiTile
          label="Avg Admin Salary"
          rawValue={fin.adminSal}
          valueFormatter={fmtUSD}
          accent="brand"
        />
      </div>

      {/* B. Staffing Breakdown */}
      <div className="space-y-3 pt-1">
        <h3 className="subsection-title">
          <span className="subsection-title__dot" />
          Staffing Breakdown
        </h3>
        <StaffingBar
          teacherCount={fin.teacherCount}
          adminCount={fin.adminCount}
          tRatio={fin.tRatio}
          aRatio={fin.aRatio}
        />
      </div>

      {/* C. Compensation Split */}
      <div className="space-y-3 pt-1">
        <h3 className="subsection-title">
          <span
            className="subsection-title__dot"
            style={{ background: "var(--viz-1)" }}
          />
          Compensation Split
        </h3>
        {hasAnyCompensation ? (
          <CampusCompensationChart
            teacherComp={fin.teacherComp}
            adminComp={fin.adminComp}
          />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Compensation data unavailable.
          </p>
        )}
      </div>

      {/* D. How This Campus Compares */}
      {hasDistrict && (
        <div className="space-y-3 pt-1">
          <h3 className="subsection-title">
            <span
              className="subsection-title__dot"
              style={{ background: "var(--accent-500)" }}
            />
            How This Campus Compares
          </h3>
          <div>
            <ComparisonRow
              label="Teacher Salary"
              campus={fin.teacherSal}
              district={fin.districtTeachSal}
              kind="usd"
              higherIsBetter
            />
            <ComparisonRow
              label={
                <>
                  Principal / Admin Salary
                  <sup className="ml-0.5">†</sup>
                </>
              }
              campus={fin.adminSal}
              district={fin.districtPrincSal}
              kind="usd"
              higherIsBetter
            />
          </div>
        </div>
      )}

      {/* E. Disclaimer footnote */}
      <p className="text-[11px] leading-relaxed text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
        <span className="font-semibold">Methodology.</span> Estimated campus
        spending derives from the parent district's per-pupil figure multiplied
        by campus enrollment; actual campus-level expenditure data is coming
        soon.
        {hasDistrict && (
          <>
            {" "}
            <span aria-hidden="true">†</span> District-level salary data tracks
            principals only; campus admin includes assistant principals.
          </>
        )}
      </p>
    </section>
  );
}
