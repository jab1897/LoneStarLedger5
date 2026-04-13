// src/lib/campusFinance.js
// Pure derivation helpers for the Campus Finances section on CampusDetail.
// No React imports — easy to unit test later.

/** Parse a CSV string/number/empty into a finite number, or NaN. */
export const safeNum = (v) => {
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Derive all campus-finance metrics from a campus row + parent district row.
 *
 * @param {{ row: object|null, fields: object, districtRow: object|null, districtFields: object|null }} inputs
 * @returns {object} derived metrics; every field is either a finite number or NaN/null.
 */
export function deriveCampusFinance({ row, fields, districtRow, districtFields }) {
  const cv = (k) => (fields?.[k] ? safeNum(row?.[fields[k]]) : NaN);
  const dv = (k) => (districtFields?.[k] ? safeNum(districtRow?.[districtFields[k]]) : NaN);

  const enrollment   = cv("ENROLLMENT");
  const teacherCount = cv("TEACHER_COUNT");
  const adminCount   = cv("ADMIN_COUNT");
  const teacherSal   = cv("AVG_TEACH_SAL");
  const adminSal     = cv("AVG_ADMIN_SAL");

  const perPupilSpend     = dv("PER_PUPIL_SPENDING");
  const districtTeachSal  = dv("TEACHER_SALARY");
  const districtPrincSal  = dv("PRINCIPAL_SALARY");

  const estSpending =
    Number.isFinite(perPupilSpend) && Number.isFinite(enrollment)
      ? perPupilSpend * enrollment
      : NaN;

  const teacherComp =
    Number.isFinite(teacherSal) && Number.isFinite(teacherCount)
      ? teacherSal * teacherCount
      : NaN;

  const adminComp =
    Number.isFinite(adminSal) && Number.isFinite(adminCount)
      ? adminSal * adminCount
      : NaN;

  const totalComp =
    (Number.isFinite(teacherComp) ? teacherComp : 0) +
    (Number.isFinite(adminComp) ? adminComp : 0);

  const tRatio =
    Number.isFinite(teacherCount) && Number.isFinite(enrollment) && enrollment > 0
      ? teacherCount / enrollment
      : NaN;

  const aRatio =
    Number.isFinite(adminCount) && Number.isFinite(enrollment) && enrollment > 0
      ? adminCount / enrollment
      : NaN;

  // TODO(phase-later): district-wide teacher/admin student ratios require a
  // TEA staffing FTE file not currently in the repo. Until then we omit the
  // ratio-vs-district comparison row and show only the campus ratio.

  return {
    enrollment,
    teacherCount,
    adminCount,
    teacherSal,
    adminSal,
    estSpending,
    perPupilSpend,
    teacherComp,
    adminComp,
    totalComp,
    tRatio,
    aRatio,
    districtTeachSal,
    districtPrincSal,
  };
}
