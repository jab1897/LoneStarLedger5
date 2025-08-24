import React from "react";
import { useParams, Link } from "react-router-dom";
import { fetchCSV, fetchJSON, indexBy } from "../lib/staticData";
import StatPill from "../ui/StatPill";

/** Data sources:
 *  - /data/campuses.csv  (must include "School Number" column)
 *  - /data/geojson/campus_{School_Number}.geojson
 */
const CAMPUSES_CSV = "/data/campuses.csv";
const KEY = "School Number";

export default function CampusDetail(){
  const { id } = useParams(); // id is School Number string/number
  const [row, setRow] = React.useState(null);
  const [feature, setFeature] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(()=>{
    let alive = true;
    setLoading(true); setError(null);

    const geoPath = `/data/geojson/campus_${id}.geojson`;

    Promise.allSettled([
      fetchCSV(CAMPUSES_CSV),
      fetchJSON(geoPath)
    ]).then(([csvRes, geoRes])=>{
      if(!alive) return;

      if (csvRes.status === "fulfilled") {
        const idx = indexBy(csvRes.value, KEY);
        const rec = idx.get(String(id)) || null;
        setRow(rec);
        if (!rec) console.warn(`Campus ${id} not found in campuses.csv`);
      } else {
        setError(String(csvRes.reason));
      }

      if (geoRes.status === "fulfilled") {
        setFeature(geoRes.value); // single‑feature GeoJSON is fine; we only message UI for now
      } else {
        console.warn("Campus GeoJSON load failed:", geoRes.reason);
      }
    }).catch(e => alive && setError(String(e)))
      .finally(()=> alive && setLoading(false));

    return ()=>{ alive = false };
  }, [id]);

  const name = row?.CAMPUS || row?.name || `Campus ${id}`;
  const district = row?.DISTRICT || row?.district || (row?.["District Name"] ?? "");

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-600">
        <Link className="hover:underline" to="/campuses">Campuses</Link>
        <span className="px-2">/</span>
        <span className="text-gray-900 font-medium">{name}</span>
      </nav>

      <header className="bg-white border rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{name}</h1>
            <p className="text-gray-600 mt-1">
              {district ? `District: ${district}` : ""} {row?.["School Number"] ? `• School # ${row["School Number"]}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill label="Grades" value={row?.GRADES || row?.Grades || "—"} />
            <StatPill label="Enrollment" value={row?.ENROLLMENT ?? row?.Enrollment ?? "—"} />
            <StatPill label="Type" value={row?.TYPE || row?.Type || "—"} />
          </div>
        </div>
      </header>

      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold">Campus attributes</h2>
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-700">{error}</div>}
        {!loading && !error && (
          row ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {Object.entries(row).map(([k,v])=>(
                <div key={k} className="bg-gray-50 border rounded-xl px-3 py-2">
                  <div className="text-gray-600">{k}</div>
                  <div className="font-medium break-words">{String(v)}</div>
                </div>
              ))}
            </div>
          ) : <div>No record found in campuses.csv for ID {id}.</div>
        )}
      </section>

      <section className="bg-white border rounded-2xl p-6 space-y-2">
        <h2 className="text-xl font-bold">Geometry</h2>
        {feature
          ? <p className="text-gray-600">GeoJSON loaded for this campus. (We’ll add a map renderer next.)</p>
          : <p className="text-gray-600">No GeoJSON found at <code>/data/geojson/campus_{id}.geojson</code>.</p>}
      </section>
    </div>
  );
}
