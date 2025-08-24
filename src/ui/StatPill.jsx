import React from "react";
export default function StatPill({ label, value }){
  return (
    <div className="rounded-xl border px-3 py-2 text-sm bg-gray-50">
      <p className="text-gray-600">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
