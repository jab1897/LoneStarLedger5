import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadDistrictsCSV } from "../lib/data";

const fmtNum = (n) => (n === null || n === undefined || n === "" || Number.isNaN(+n)
  ? "—"
  : new Intl.NumberFormat("en-US").format(+n));

export default function DistrictsPage() {
  const [rows, setRows] = useState([]);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set()); // counties
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [sort, setSort] = useState({ key: "DISTRICT", dir: "asc" }); // name-first sort
  const nav = useNavigate();

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        const { rows, counties } = await loadDistrictsCSV();
        if (!on) return;
        setRows(rows);
        setCounties(counties);
      } catch (e) {
        console.error(e);
        setRows([]);
        setCounties([]);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  // ---- filtering/search ----
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;

    if (q) {
      const isIdLike = /^\d{3,}$/.test(q);
      list = rows.filter((r) => {
        const id = String(r.DISTRICT_N ?? "").toLowerCase();
        const name = String(r.DISTRICT ?? "").toLowerCase();
        return isIdLike ? id.includes(q) : (name.includes(q) || id.includes(q));
      });

      // bubble exact ID match to the top (so power users jump fast)
      const exactIdx = list.findIndex((r) => String(r.DISTRICT_N ?? "") === query.trim());
      if (exactIdx > 0) {
        const hit = list.splice(exactIdx, 1)[0];
        list.unshift(hit);
      }
    }

    if (selected.size) {
      list = list.filter((r) => selected.has(String(r.COUNTY)));
    }

    // sort
    const { key, dir } = sort;
    list = [...list].sort((a, b) => {
      const A = (a?.[key] ?? "").toString();
      const B = (b?.[key] ?? "").toString();

      if (key === "DISTRICT_N") {
        const nA = Number(A), nB = Number(B);
        if (!Number.isNaN(nA) && !Number.isNaN(nB)) {
          return dir === "asc" ? nA - nB : nB - nA;
        }
      }
      return dir === "asc" ? A.localeCompare(B) : B.localeCompare(A);
    });

    return list;
  }, [rows, query, selected, sort]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const pageRows = filtered.slice((page - 1) * size, page * size);

  const toggleCounty = (c) => {
    const next = new Set(selected);
    next.has(c) ? next.delete(c) : next.add(c);
    setSelected(next);
    setPage(1);
  };

  const goSort = (key) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
    setPage(1);
  };

  // Enter key → if user typed an exact ID, go straight to detail
  const tryGoToExactId = () => {
    const typed = query.trim();
    if (!/^\d{5,}$/.test(typed)) return;
    const hit = rows.find((r) => String(r.DISTRICT_N ?? "") === typed);
    if (hit) nav(`/district/${encodeURIComponent(typed)}`);
  };

  return (
    <div className="px-4 md:px-8">
      <h1 className="text-3xl font-extrabold mb-4">Districts</h1>

      <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-6">
        {/* Filters */}
        <aside className="rounded-2xl border p-4 bg-white">
          <input
            className="w-full border rounded-xl px-3 py-2"
            placeholder="Search by District name or ID (e.g., Austin or 227901)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            onKeyDown={(e) => { if (e.key === "Enter") tryGoToExactId(); }}
          />

          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">County</div>
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {counties.map((c) => (
                <label key={c} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(c)}
                    onChange={() => toggleCounty(c)}
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            className="mt-4 w-full bg-indigo-600 text-white rounded-xl py-2 font-semibold"
            onClick={() => { setQuery(""); setSelected(new Set()); setPage(1); setSort({ key: "DISTRICT", dir: "asc" }); }}
          >
            Clear
          </button>
        </aside>

        {/* Results */}
        <section>
          <div className="rounded-2xl border bg-white">
            <div className="px-4 py-3 border-b text-sm text-gray-600 flex items-center justify-between">
              <span>
                {loading ? "Loading…" : `${filtered.length} result${filtered.length === 1 ? "" : "s"}`}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Sort:</span>
                <button className="px-2 py-1 border rounded" onClick={() => goSort("DISTRICT")}>
                  Name {sort.key === "DISTRICT" ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                </button>
                <button className="px-2 py-1 border rounded" onClick={() => goSort("DISTRICT_N")}>
                  ID {sort.key === "DISTRICT_N" ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                </button>
                <select
                  className="ml-2 border rounded px-2 py-1"
                  value={size}
                  onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}
                >
                  {[10,20,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
                </select>
              </div>
            </div>

            {pageRows.length === 0 ? (
              <div className="p-6 text-gray-500">No results.</div>
            ) : (
              <ul className="divide-y">
                {pageRows.map((r) => {
                  const id = String(r.DISTRICT_N ?? "—");
                  const name = r.DISTRICT ?? "—";
                  const county = r.COUNTY ?? "—";
                  const campuses = r.CAMPUSES;
                  const enrollment = r.ENROLLMENT;

                  return (
                    <li key={id} className="p-4 hover:bg-gray-50">
                      <Link className="font-semibold text-indigo-700" to={`/district/${encodeURIComponent(id)}`}>
                        {name} <span className="text-gray-500">({id})</span>
                      </Link>
                      <div className="text-sm text-gray-600 mt-1">
                        {county} County
                        {enrollment ? <span className="ml-3">Enroll: {fmtNum(enrollment)}</span> : null}
                        {campuses ? <span className="ml-3">Campuses: {fmtNum(campuses)}</span> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* pager */}
            <div className="flex items-center gap-2 justify-end p-3 border-t text-sm">
              <button
                className="px-3 py-1 rounded border disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(Math.max(1, page - 1))}
              >Prev</button>
              <div>{page} / {totalPages}</div>
              <button
                className="px-3 py-1 rounded border disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
              >Next</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
