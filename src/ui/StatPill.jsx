import React from "react";

export default function StatPill({ label, value, color = "gray", boldLabel = false }) {
  const styles = {
    gray: "bg-gray-50 border-gray-200",
    green: "bg-green-100 border-green-200",
    yellow: "bg-yellow-100 border-yellow-200",
    amber: "bg-amber-100 border-amber-200",
    red: "bg-red-100 border-red-200",
  };
  const cls = styles[color] || styles.gray;
  const labelCls = boldLabel ? "text-gray-900 font-semibold" : "text-gray-900";

  return (
    <div className={`rounded-xl border px-3 py-2 text-sm text-gray-900 ${cls}`}>
      <p className={labelCls}>{label}</p>
      <p className="font-bold text-gray-900">{value}</p>
    </div>
  );
}
