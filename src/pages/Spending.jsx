import React from "react";
import DataTable from "../ui/DataTable";
import { usd, dt } from "../lib/format";
import { toCSV, downloadCSV } from "../lib/csv";
// Placeholder data for now; swap with API call via getJSON('/spending?...')
const sample = Array.from({length:50}).map((_,i)=>({
  id: i+1,
  date: `2024-${String((i%12)+1).padStart(2,'0')}-15`,
  district: ["Austin ISD","Northside ISD","Sharyland ISD"][i%3],
  vendor: ["Vendor A","Vendor B","Vendor C"][i%3],
  category: ["Instruction","Facilities","Transportation"][i%3],
  amount: Math.round(Math.random()*90000)+1000
}));
const COLUMNS = [
  { key:"date", label:"Date", format:v=>dt(v) },
  { key:"district", label:"District" },
  { key:"vendor", label:"Vendor" },
  { key:"category", label:"Category" },
  { key:"amount", label:"Amount", align:"right", format:v=>usd.format(v) },
];

export default function Spending(){
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState(sample);
  const filtered = React.useMemo(()=>{
    if(!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter(r =>
      r.district.toLowerCase().includes(needle) ||
      r.vendor.toLowerCase().includes(needle) ||
      r.category.toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const exportCSV = () => {
    const csv = toCSV(filtered, COLUMNS);
    downloadCSV("spending.csv", csv);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-bold">Spending</h1>
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter by district, vendor, category" className="border rounded-xl px-3 py-2 w-72"/>
          <button onClick={exportCSV} className="rounded-xl border px-3 py-2 hover:bg-gray-50">Export CSV</button>
        </div>
      </header>
      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <DataTable columns={COLUMNS} rows={filtered} initialSort={{ key:"date", dir:"desc" }} />
      </section>
    </div>
  );
}
