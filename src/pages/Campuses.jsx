// src/pages/Campuses.jsx
import React from "react";
import EntityCard from "../ui/EntityCard";
import Pagination from "../ui/Pagination";
import { getAllCampuses } from "../lib/campuses";

export default function Campuses(){
  const [rows, setRows] = React.useState([]);
  const [fields, setFields] = React.useState(null);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const perPage = 24;
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(()=>{
    let alive = true;
    setLoading(true); setError(null);
    getAllCampuses()
      .then(({rows, fields}) => { if(alive){ setRows(rows); setFields(fields);} })
      .catch(e => { if(alive) setError(String(e)); })
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive = false };
  }, []);

  const filtered = React.useMemo(()=>{
    const needle = q.trim().toLowerCase();
    if(!needle) return rows;
    const kName = fields?.CAMPUS_NAME;
    const kDist = fields?.DISTRICT_ID;
    const kId = fields?.CAMPUS_ID;
    return rows.filter(r =>
      String(kName ? r[kName] : r.CAMPUS || r.name || "").toLowerCase().includes(needle) ||
      String(kDist ? r[kDist] : r.DISTRICT_N || "").toLowerCase().includes(needle) ||
      String(kId ? r[kId] : r.id || "").toLowerCase().includes(needle)
    );
  }, [rows, q, fields]);

  const start = (page-1)*perPage;
  const pageItems = filtered.slice(start, start+perPage);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campuses</h1>
        <input value={q} onChange={e=>{ setPage(1); setQ(e.target.value); }}
          placeholder="Search campus name, ID, or district" className="border rounded-xl px-3 py-2 w-80" />
      </header>

      {error && <div className="bg-white border rounded-2xl p-4 text-red-700">{error}</div>}
      {loading && <div className="bg-white border rounded-2xl p-4">Loading…</div>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pageItems.map((c)=>{
              const kName = fields?.CAMPUS_NAME;
              const kId = fields?.CAMPUS_ID;
              const kDist = fields?.DISTRICT_ID;

              const id = (kId && c[kId]) || c.id || c.CAMPUS || "";
              const name = (kName && c[kName]) || c.CAMPUS || c.name || `Campus ${id}`;
              const subtitle = c.DISTRICT || c.district || (kDist ? `District ${c[kDist] ?? ""}` : "");
              return <EntityCard key={id} title={name} subtitle={subtitle} to={`/campus/${id}`} />;
            })}
          </div>
          <Pagination total={filtered.length} perPage={perPage} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
