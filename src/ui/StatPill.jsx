import React from "react";

export default function StatPill({ label, value, color = "gray" }) {
  const styles = {
    gray: "bg-gray-50",
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
  };
  const cls = styles[color] || styles.gray;

  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${cls}`}>
      <p className="text-gray-600">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
