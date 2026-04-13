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
        className="h-6 w-full rounded-full overflow-hidden flex"
        style={{
          border: "1px solid var(--border)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
        }}
        role="img"
        aria-label={`Staffing split: ${tPct.toFixed(1)}% teachers, ${aPct.toFixed(1)}% administrators`}
      >
        <div
          style={{
            width: `${tPct}%`,
            background: "var(--viz-1)",
            transition: "width 600ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          title={`Teachers: ${num.format(tc)}`}
        />
        <div
          style={{
            width: `${aPct}%`,
            background: "var(--viz-2)",
            transition: "width 600ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          title={`Admin: ${num.format(ac)}`}
        />
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="flex items-baseline gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ background: "var(--viz-1)" }}
            aria-hidden="true"
          />
          <span className="text-[var(--text-muted)] font-medium uppercase tracking-wider">
            Teachers
          </span>
          <span className="tabular-nums font-semibold text-[var(--text-0)]">
            {num.format(tc)}
          </span>
          <span className="text-[var(--text-muted)] tabular-nums">
            · {tPct.toFixed(1)}% · T:S {fmtRatio(tRatio)}
          </span>
        </div>
        <div className="flex items-baseline gap-2 sm:justify-end">
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ background: "var(--viz-2)" }}
            aria-hidden="true"
          />
          <span className="text-[var(--text-muted)] font-medium uppercase tracking-wider">
            Admin
          </span>
          <span className="tabular-nums font-semibold text-[var(--text-0)]">
            {num.format(ac)}
          </span>
          <span className="text-[var(--text-muted)] tabular-nums">
            · {aPct.toFixed(1)}% · A:S {fmtRatio(aRatio)}
          </span>
        </div>
      </div>
    </div>
  );
}
