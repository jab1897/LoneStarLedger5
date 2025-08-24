import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loadDistrictsCSV } from "../lib/data";

const fmtNum = (n) =>
  n === null || n === undefined || n === "" || Number.isNaN(+n)
    ? "—"
    : new Intl.NumberFormat("en-US").format(+n);

const isIdLike = (q) => /^\d{3,}$/.test((q || "").trim());

// minimal highlighter
function highlight(text, q) {
  if (!q) return text;
  const needle = q.trim();
  if (!needle) return text;
  const str = String(text);
  const idx = str.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {str.slice(0, idx)}
      <mark className="bg-yellow-100 rounded px-0.5">
        {str.slice(idx, idx + needle.length)}
      </mark>
      {str.slice(idx + needle.length)}
    </>
  );
}

export default function DistrictsPage() {
  const [rows, setRows] = useState([]);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);

  // URL state
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();

  const [query, setQuery] = useState(sp.get("q") || "");
  const [selected, setSelected] = useState(
    new Set((sp.get("county") || "").split(",").filter(Boolean))
  );
  const [page, setPage] = useState(Number(sp.get("p") || 1));
  const [size, setSize] = useState(Number(sp.get("s") || 20));
  const [sort, setSort] = useState({
    key: sp.get("sort") || "DISTRICT", // name-first
    dir: sp.get("dir") || "asc",
  });

  // sync URL (debounced a bit)
  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams();
      if (query) next.set("q", query);
      if (selected.size) next.set("county", Array.from(selected).join(","));
      if (page !== 1) next.set("p", String(page));
      if (size !== 20) next.set("s", String(size));
      if (!(sort.key === "DISTRICT" && sort.dir === "asc")) {
        next.set("sort", sort.key);
        next.set("dir", sort.dir);
      }
      setSp(next, { replace: true });
    }, 150);
    return () => clearTimeout(id);
  }, [query, selected, page, size, sort, setSp]);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        const { rows, counties } = await loadDistrictsCSV();
        if (!on) return;
        setRows(rows);
        setCounties(counties);
      } catch {
        setRows([]);
        setCounties([]);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;

    if (q) {
      list = rows.filter((r) => {
        const id = String(r.DISTRICT_N ?? "").toLowerCase();
        const name = String(r.NAME ?? r.DISTRICT ?? r.DISTNAME ?? "").toLowerCase();
        return isIdLike(q) ? id.includes(q) : name.includes(q) || id.includes(q);
      });

      // bubble exact ID match
      const exact = rows.find((r) => String(r.DISTRICT_N ?? "") === query.trim());
      if (exact) list = [exact, ...list.filter((r) => r !== exact)];
    }

    if (selected.size) {
      list = list.filter((r) => selected.has(String(r.COUNTY)));
    }

    // sort (Name uses display field: NAME ?? DISTRICT ?? DISTNAME)
    const { key, dir } = sort;
    list = [...list].sort((a, b) => {
      const Araw = (key === "DISTRICT")
        ? (a.NAME ?? a.DISTRICT ?? a.DISTNAME ?? "")
        : (a?.[key] ?? "");
      const Braw = (key === "DISTRICT")
        ? (b.NAME ?? b.DISTRICT ?? b.DISTNAME ?? "")
        : (b?.[key] ?? "");
      const A = String(Araw);
      const B = String(Braw);

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
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(1);
  };

  const handleEnter = () => {
    const typed = query.trim();
    if (!isIdLike(typed)) return;
    const hit = rows.find((r) => String(r.DISTRICT_N ?? "") === typed);
    if (hit) nav(`/district/${encodeURIComponent(typed)}`);
  };

  const clearAll = () => {
    setQuery("");
    setSelected(new Set());
    setPage(1);
    setSort({ key: "DISTRICT", dir: "asc" });
  };

  return (
    <div className="px-4 md:px-8">
      <h1 className="text-3xl font-extrabold mb-4">Districts</h1>

      <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-6">
        {/* Filters */}
        <aside className="rounded-2xl border p-4 bg-white">
          <div className="relative">
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Search by District name or ID (e.g., Austin or 227901)"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleEnter(); }}
            />
            {isIdLike(query) && (
              <button
                onClick={handleEnter}
                className="absolute right-1 top-1 bg-indigo-600 text-white text-xs px-2 py-1 rounded-lg"
                title="Go to this District ID"
              >
                Open {query.trim()}
              </button>
            )}
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">County</div>
            <div className="flex flex-wrap gap-2 max-h-56 overflow-auto">
              {counties.map((c) => {
                const active = selected.has(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCounty(c)}
                    className={`px-3 py-1 rounded-full border text-sm ${active ? "bg-indigo-50 border-indigo-400 text-indigo-800" : "bg-white hover:bg-gray-50"}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className="mt-4 w-full bg-indigo-600 text-white rounded-xl py-2 font-semibold"
            onClick={clearAll}
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
                  const rawName = r.NAME ?? r.DISTRICT ?? r.DISTNAME ?? "—";
                  const county = r.COUNTY ?? "—";
                  const campuses = r.CAMPUSES;
                  const enrollment = r.ENROLLMENT;

                  return (
                    <li key={id} className="p-4 hover:bg-gray-50">
                      <Link className="font-semibold text-indigo-700" to={`/district/${encodeURIComponent(id)}`}>
                        {highlight(rawName, query)}{" "}
                        <span className="text-gray-500">
                          ({highlight(id, isIdLike(query) ? query : "")})
                        </span>
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
