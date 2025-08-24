import React from "react";
import FilterSidebar from "../ui/FilterSidebar";
import EntityCard from "../ui/EntityCard";
import Pagination from "../ui/Pagination";
import { fetchCSV } from "../lib/staticData";

const CSV_PATH = "/data/Current_Districts_2025.csv";
const KEY = "DISTRICT_N";

export default function Districts() {
  const [rows, setRows] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const perPage = 24;
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(()=>{
    let alive = true;
    setLoading(true); setError(null);
    fetchCSV(CSV_PATH)
      .then(data => { if(alive) setRows(data); })
      .catch(e => { if(alive) setError(String(e)); })
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive = false };
  }, []);

  const filtered = React.useMemo(()=>{
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r =>
      String(r.name||r.DISTRICT||"").toLowerCase().includes(needle) ||
      String(r.county||r.COUNTY||"").toLowerCase().includes(needle) ||
      String(r[KEY]||"").includes(needle)
    );
  }, [rows, q]);

  const start = (page-1)*perPage;
  const pageItems = filtered.slice(start, start+perPage);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-6">
      <aside>
        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <input value={q} onChange={e=>{ setPage(1); setQ(e.target.value); }}
            placeholder="Search district" className="w-full border rounded-xl px-3 py-2" />
          <FilterSidebar filters={{ county: ["Bexar","Travis","Hidalgo"] }} />
        </div>
      </aside>
      <main className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Districts</h1>
          <span className="text-sm text-gray-600">{filtered.length.toLocaleString()} found</span>
        </div>
        {error && <div className="bg-white border rounded-2xl p-4 text-red-700">{error}</div>}
        {loading && <div className="bg-white border rounded-2xl p-4">Loading…</div>}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pageItems.map((d) => {
              const id = d[KEY] || d.id;
              const name = d.name || d.DISTRICT || `District ${id}`;
              const county = d.county || d.COUNTY || "";
              return <EntityCard key={id} title={name} subtitle={county} to={`/district/${id}`} />;
            })}
          </div>
        )}
        <Pagination total={filtered.length} perPage={perPage} page={page} onPageChange={setPage} />
      </main>
    </div>
  );
}
