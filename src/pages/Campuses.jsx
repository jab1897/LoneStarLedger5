import React from "react";
import EntityCard from "../ui/EntityCard";
import Pagination from "../ui/Pagination";
import { fetchCSV } from "../lib/staticData";

const CSV_PATH = "/data/campuses.csv"; // upload
const KEY = "CAMPUS_N";                // change if your key differs

export default function Campuses(){
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
    if(!needle) return rows;
    return rows.filter(r =>
      String(r.name||r.CAMPUS||"").toLowerCase().includes(needle) ||
      String(r.DISTRICT_N||"").includes(needle) ||
      String(r[KEY]||"").includes(needle)
    );
  }, [rows, q]);

  const start = (page-1)*perPage;
  const pageItems = filtered.slice(start, start+perPage);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campuses</h1>
        <input value={q} onChange={e=>{ setPage(1); setQ(e.target.value); }}
          placeholder="Search campus" className="border rounded-xl px-3 py-2 w-72" />
      </header>

      {error && <div className="bg-white border rounded-2xl p-4 text-red-700">{error}</div>}
      {loading && <div className="bg-white border rounded-2xl p-4">Loading…</div>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pageItems.map(c=>{
              const id = c[KEY] || c.id;
              const name = c.name || c.CAMPUS || `Campus ${id}`;
              const subtitle = c.DISTRICT || c.district || `District ${c.DISTRICT_N || ""}`;
              return <EntityCard key={id} title={name} subtitle={subtitle} to={`/campus/${id}`} />;
            })}
          </div>
          <Pagination total={filtered.length} perPage={perPage} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
