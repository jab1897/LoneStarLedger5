import React from "react";
export default function Pagination({ total = 0, perPage = 20 }){
  const pages = Math.max(1, Math.ceil(total / perPage));
  return (
    <div className="flex items-center justify-between bg-white border rounded-2xl p-3 text-sm">
      <p className="text-gray-600">{total.toLocaleString()} results</p>
      <div className="flex items-center gap-2">
        <button className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Prev</button>
        <button className="px-3 py-1.5 rounded-lg border bg-gray-100">1</button>
        {pages>1 && <button className="px-3 py-1.5 rounded-lg border">2</button>}
        {pages>2 && <span className="px-1">…</span>}
        <button className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Next</button>
      </div>
    </div>
  );
}
