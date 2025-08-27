// src/pages/Campuses.jsx
import React from "react";
import { Link } from "react-router-dom";
import { loadCampuses } from "../lib/campuses";

const fmt = new Intl.NumberFormat("en-US");

export default function Campuses() {
  const [rows, setRows] = React.useState([]);
  const [fields, setFields] = React.useState(null);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        const { rows, fields } = await loadCampuses();
        if (on) {
          setRows(rows);
          setFields(fields);
        }
      } catch (e) {
        if (on) setError(String(e));
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  const list = React.useMemo(() => {
    if (!rows?.length || !fields) return [];
    const f = fields;
    const nameK = f.CAMPUS_NAME;
    const idK = f.CAMPUS_ID;
    const distK = f.DISTRICT_ID;
    const scoreK = f.CAMPUS_SCORE;

    let L = rows.map((r) => ({
      id: idK ? String(r[idK]) : "",
      name: nameK ? String(r[nameK]) : "",
      district: distK ? String(r[distK]) : "",
      score: scoreK ? Number(String(r[scoreK]).replace(/[\$,]/g, "")) : NaN,
    }));

    const needle = q.trim().toLowerCase();
    if (needle) {
      L = L.filter(
        (x) =>
          x.name.toLowerCase().includes(needle) ||
          x.id.toLowerCase().includes(needle) ||
          x.district.toLowerCase().includes(needle)
      );
    }

    L.sort((a, b) => {
      const s = (Number.isNaN(b.score) ? -Infinity : b.score) - (Number.isNaN(a.score) ? -Infinity : a.score);
      return s || a.name.localeCompare(b.name);
    });

    return L;
  }, [rows, fields, q]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campuses</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search campus name, ID, or district"
          className="border rounded-xl px-3 py-2 w-80"
        />
      </header>

      {error && <div className="bg-white border rounded-2xl p-4 text-red-700">{error}</div>}
      {loading && <div className="bg-white border rounded-2xl p-4">Loading…</div>}

      {!loading && !error && (
        <>
          {list.length === 0 ? (
            <div className="bg-white border rounded-2xl p-4 text-gray-600">No campuses.</div>
          ) : (
            <div className="bg-white border rounded-2xl p-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-600 border-b">
                  <tr>
                    <th className="py-2 pr-3">Campus</th>
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">District</th>
                    <th className="py-2 pr-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-3">
                        <Link className="text-indigo-700 font-medium" to={`/campus/${encodeURIComponent(c.id)}`}>
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-gray-600">{c.id}</td>
                      <td className="py-2 pr-3 text-gray-600">{c.district}</td>
                      <td className="py-2 pr-3">{Number.isNaN(c.score) ? "—" : fmt.format(c.score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
