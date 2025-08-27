import React from "react";
import { fetchCSV } from "../lib/staticData";
import { num } from "../lib/format";

const CAMPUSES_CSV = import.meta.env.VITE_CAMPUSES_CSV || "/data/Schools_2024_to_2025.csv";

const norm = (s) => String(s || "").toLowerCase().replace(/[-_ ]+/g, "").replace(/[^a-z0-9]/g, "");
function bestHeader(row0, aliases = [], fuzzy = []) {
  const keys = Object.keys(row0 || {});
  const nm = new Map(keys.map(k => [norm(k), k]));
  for (const a of aliases) {
    const k = nm.get(norm(a));
    if (k) return k;
  }
  for (const k of keys) {
    const raw = k.toLowerCase();
    if (fuzzy.some(re => re.test(raw))) return k;
  }
  return null;
}
const toNumSafe = (v) => {
  if (v === null || v === undefined || v === "") return NaN;
  const s = String(v).replace(/[\$,]/g, "");
  const n = Number(s);
  return Number.isNaN(n) ? NaN : n;
};

export default function CampusesPage() {
  const [rows, setRows] = React.useState([]);
  const [cols, setCols] = React.useState({kDist:null,kName:null,kId:null,kScore:null});
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let on = true;
    setLoading(true); setError(null);
    fetchCSV(CAMPUSES_CSV)
      .then(list => {
        if (!on) return;
        const row0 = list[0] || {};
        const kDist  = bestHeader(row0,
          ["USER_District_Number","USER District Number","DISTRICT_N","DISTRICT_ID","LEAID","LEA_ID","LEA CODE","LEA"],
          [/district.*(number|id|code)/i, /\blea\b/i, /lea.*id/i, /lea.*code/i]
        );
        const kName  = bestHeader(row0,
          ["USER_School_Name","Campus Name","CAMPUS_NAME","NAME","SCHOOL_NAME"],
          [/campus.*name/i, /school.*name/i]
        );
        const kId    = bestHeader(row0,
          ["USER_School_Number","Campus ID","USER_Campus_Number","CAMPUS_ID","SCHOOL_ID","SCHOOL_NUMBER"],
          [/campus.*(id|number)/i, /school.*(id|number)/i]
        );
        const kScore = bestHeader(row0,
          ["Campus Score","CAMPUS_SCORE","CampusScore","SCORE","RATING","GRADE"],
          [/score/i, /rating/i, /grade/i]
        );
        setCols({kDist,kName,kId,kScore});
        setRows(list);
        console.info("[CampusesPage] headers:", {kDist,kName,kId,kScore}, "sample headers:", Object.keys(row0));
      })
      .catch(e => {
        console.warn("[CampusesPage] CSV load failed:", e);
        if (on) setError(String(e));
      })
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, []);

  const filtered = React.useMemo(() => {
    if (!rows.length) return [];
    const {kName,kId,kDist,kScore} = cols;
    let list = rows;
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = rows.filter(r =>
        String(kName ? r[kName] : "").toLowerCase().includes(needle) ||
        String(kId ? r[kId] : "").toLowerCase().includes(needle) ||
        String(kDist ? r[kDist] : "").toLowerCase().includes(needle)
      );
    }
    if (kScore) {
      list = [...list].sort((a,b) => {
        const A = toNumSafe(a[kScore]); const B = toNumSafe(b[kScore]);
        if (Number.isNaN(A) && Number.isNaN(B)) return 0;
        if (Number.isNaN(A)) return 1;
        if (Number.isNaN(B)) return -1;
        return B - A;
      });
    }
    return list;
  }, [rows, cols, q]);

  return (
    <div className="px-4 md:px-8 space-y-4">
      <h1 className="text-3xl font-extrabold">Campuses</h1>

      <div className="max-w-md">
        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Search campus name, ID, or district"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
      </div>

      {loading ? <div className="text-gray-600">Loading…</div> : null}
      {error   ? <div className="text-red-600 text-sm">Error: {error}</div> : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="text-gray-600">No campuses.</div>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600 border-b">
              <tr>
                <th className="py-2 px-3">Campus</th>
                <th className="py-2 px-3">Campus ID</th>
                <th className="py-2 px-3">District #</th>
                <th className="py-2 px-3">Campus Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r,i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 px-3 font-medium">{String(cols.kName ? r[cols.kName] : "")}</td>
                  <td className="py-2 px-3">{String(cols.kId ? r[cols.kId] : "")}</td>
                  <td className="py-2 px-3">{String(cols.kDist ? r[cols.kDist] : "")}</td>
                  <td className="py-2 px-3">
                    {(() => {
                      const v = toNumSafe(cols.kScore ? r[cols.kScore] : "");
                      return Number.isNaN(v) ? "—" : num.format(v);
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 text-xs text-gray-500">
            Showing {filtered.length} of {rows.length}
          </div>
        </div>
      ) : null}
    </div>
  );
}
