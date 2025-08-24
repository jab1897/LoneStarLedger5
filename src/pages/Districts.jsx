import React from "react";
import FilterSidebar from "../ui/FilterSidebar";
import EntityCard from "../ui/EntityCard";
import Pagination from "../ui/Pagination";

export default function Districts() {
  const [items] = React.useState(Array.from({length:12}).map((_,i)=>({
    id:i,
    name:`Sample ISD ${i+1}`,
    county:"Sample County",
    tags:[i%2?"Urban":"Rural", i%3?"Mid":"Small"]
  })));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-6">
      <aside>
        <FilterSidebar filters={{ county: ["Bexar","Travis","Hidalgo"], size:["Small","Mid","Large"], locale:["Urban","Suburban","Rural"] }} />
      </aside>
      <main className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Districts</h1>
          <select className="border rounded-lg px-3 py-2 text-sm">
            <option>Sort by name</option>
            <option>Sort by enrollment</option>
            <option>Sort by spending</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((d)=>(
            <EntityCard key={d.id} title={d.name} subtitle={d.county} tags={d.tags} to={`/district/${d.id}`} />
          ))}
        </div>
        <Pagination total={120} perPage={12} />
      </main>
    </div>
  );
}
