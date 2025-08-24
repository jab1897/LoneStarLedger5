import React from "react";
import { Link, useParams } from "react-router-dom";
import StatPill from "../ui/StatPill";
import DataTable from "../ui/DataTable";

export default function DistrictDetail(){
  const { id } = useParams();

  const spending = React.useMemo(()=>Array.from({length:15}).map((_,i)=>({
    date:`2024-${String((i%12)+1).padStart(2,'0')}-15`,
    vendor:["Vendor A","Vendor B","Vendor C"][i%3],
    category:["Instruction","Facilities","Transportation"][i%3],
    amount: Math.round(Math.random()*90000)+1000
  })),[]);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-600">
        <Link className="hover:underline" to="/districts">Districts</Link>
        <span className="px-2">/</span>
        <span className="text-gray-900 font-medium">District {id}</span>
      </nav>

      <header className="bg-white border rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">District {id}</h1>
            <p className="text-gray-600 mt-1">County name • Region 20 • UIL 6A</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill label="Enrollment" value="34,210" />
            <StatPill label="Per pupil" value="$11,842" />
            <StatPill label="Total spend" value="$405M" />
          </div>
        </div>
      </header>

      <section className="bg-white border rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold">Recent spending</h2>
        <DataTable
          columns={[
            { key:"date", label:"Date" },
            { key:"vendor", label:"Vendor" },
            { key:"category", label:"Category" },
            { key:"amount", label:"Amount", align:"right", format:(v)=>v.toLocaleString("en-US",{style:"currency",currency:"USD"}) },
          ]}
          rows={spending}
          initialSort={{ key:"date", dir:"desc" }}
        />
      </section>
    </div>
  );
}
