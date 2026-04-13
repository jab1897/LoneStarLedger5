import React from "react";
import { num } from "../lib/format";

/**
 * Horizontal stacked bar showing teacher vs admin staffing split,
 * with student-ratio annotations underneath.
 *
 * Props:
 *   teacherCount, adminCount, tRatio, aRatio — all may be NaN
 */
export default function StaffingBar({ teacherCount, adminCount, tRatio, aRatio }) {
  const tc = Number.isFinite(teacherCount) ? teacherCount : 0;
  const ac = Number.isFinite(adminCount) ? adminCount : 0;
  const total = tc + ac;

  if (total <= 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">Staffing data unavailable.</p>
    );
  }

  const tPct = (tc / total) * 100;
  const aPct = (ac / total) * 100;

  const fmtRatio = (r) =>
    Number.isFinite(r) && r > 0 ? `1:${(1 / r).toFixed(1)}` : "—";

  return (
    <div>
      <div
        className="h-6 w-full rounded-full overflow-hidden flex border border-gray-200"
        role="img"
        aria-label={`Staffing split: ${tPct.toFixed(1)}% teachers, ${aPct.toFixed(1)}% administrators`}
      >
        <div
          style={{ width: `${tPct}%`, background: "var(--viz-1)" }}
          title={`Teachers: ${num.format(tc)}`}
        />
        <div
          style={{ width: `${aPct}%`, background: "var(--viz-2)" }}
          title={`Admin: ${num.format(ac)}`}
        />
      </div>
      <div className="mt-2 flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-gray-700">
        <span>
          <span
            className="inline-block h-2 w-2 rounded-full mr-2 align-middle"
            style={{ background: "var(--viz-1)" }}
          />
          Teachers: {num.format(tc)} ({tPct.toFixed(1)}%) · T:S ratio {fmtRatio(tRatio)}
        </span>
        <span>
          <span
            className="inline-block h-2 w-2 rounded-full mr-2 align-middle"
            style={{ background: "var(--viz-2)" }}
          />
          Admin: {num.format(ac)} ({aPct.toFixed(1)}%) · A:S ratio {fmtRatio(aRatio)}
        </span>
      </div>
    </div>
  );
}
