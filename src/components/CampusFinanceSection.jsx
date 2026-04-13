import React from "react";
import { usd } from "../lib/format";
import { deriveCampusFinance } from "../lib/campusFinance";
import StaffingBar from "./StaffingBar";
import ComparisonRow from "./ComparisonRow";
import CampusCompensationChart from "./CampusCompensationChart";

const fmtUSD = (v) => (Number.isFinite(v) ? usd.format(v) : "—");

function KpiTile({ label, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 kpi">
      <p className="label text-sm text-[var(--text-muted)]">{label}</p>
      <p
        className="value font-bold text-gray-900"
        style={{
          fontVariantNumeric: "tabular-nums",
          fontWeight: 700,
          fontSize: "clamp(1.35rem, 2.6vw, 1.85rem)",
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs italic text-[var(--text-muted)] mt-1">{sub}</p>
      )}
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
    <section className="bg-white border rounded-2xl p-6 space-y-6 section-card">
      <header className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-900">Campus Finances</h2>
        {campusName && (
          <p className="text-sm text-[var(--text-muted)]">{campusName}</p>
        )}
      </header>

      {/* A. KPI tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiTile
          label="Est. Campus Spending"
          value={fmtUSD(fin.estSpending)}
          sub="Estimate (district per-pupil × enrollment)"
        />
        <KpiTile label="Avg Teacher Salary" value={fmtUSD(fin.teacherSal)} />
        <KpiTile label="Avg Admin Salary" value={fmtUSD(fin.adminSal)} />
      </div>

      {/* B. Staffing Breakdown */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900">Staffing Breakdown</h3>
        <StaffingBar
          teacherCount={fin.teacherCount}
          adminCount={fin.adminCount}
          tRatio={fin.tRatio}
          aRatio={fin.aRatio}
        />
      </div>

      {/* C. Compensation Split */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900">Compensation Split</h3>
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
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-gray-900">
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
      <p className="text-xs italic text-[var(--text-muted)]">
        Spending estimate based on district per-pupil figure. Campus-level
        expenditure data coming soon.
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
