import React from "react";
import { Link, useParams } from "react-router-dom";
import StatPill from "../ui/StatPill";
import DataTable from "../ui/DataTable";
import { fetchCSV, fetchJSON, indexBy, findFeatureByProp } from "../lib/staticData";
import { usd, num } from "../lib/format";
import Map from "../ui/Map";

const DISTRICTS_CSV = "/data/Current_Districts_2025.csv";
const DISTRICTS_GEOJSON = "/data/Current_Districts_2025.geojson";
const KEY = "DISTRICT_N";

async function tryLoadDistrictFeature(id) {
  const splitPath = `/data/geojson/district_${id}.geojson`;
  try { return await fetchJSON(splitPath); }
  catch {
    const big = await fetchJSON(DISTRICTS_GEOJSON);
    const feat = findFeatureByProp(big, KEY, id);
    if (!feat) throw new Error(`No feature with ${KEY}=${id} in big GeoJSON`);
    return { type: "FeatureCollection", features: [feat] };
  }
}

export default function DistrictDetail(){
  const { id } = useParams();
  const [row, setRow] = React.useState(null);
  const [geom, setGeom] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(()=>{
    let alive = true;
    setLoading(true); setError(null);
    Promise.allSettled([
      fetchCSV(DISTRICTS_CSV),
      tryLoadDistrictFeature(id)
    ]).then(([csvRes, geoRes])=>{
      if(!alive) return;
      if (csvRes.status === "fulfilled") {
        const idx = indexBy(csvRes.value, KEY);
        setRow(idx.get(String(id)) || null);
      } else {
        setError(String(csvRes.reason));
      }
      if (geoRes.status === "fulfilled") setGeom(geoRes.value);
    }).catch(e => alive && setError(String(e)))
      .finally(()=> alive && setLoading(false));
    return ()=>{ alive = false };
  }, [id]);

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
            <h1 className="text-3xl font-extrabold tracking-tight">
              {row?.name || row?.DISTRICT || `District {id}`}
            </h1>
            <p className="text-gray-600 mt-1">{row?.county || row?.COUNTY || ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill label="Enrollment" value={row?.enrollment ? num.format(row.enrollment) : "—"} />
            <StatPill label="Per pupil" value={row?.per_pupil ? usd.format(row.per_pupil) : "—"} />
            <StatPill label="Total spend" value={row?.total_spend ? usd.format(row.total_spend) : "—"} />
          </div>
        </div>
      </header>

      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold">Geometry</h2>
        {geom ? (
          <Map geom={geom} height={420} />
        ) : (
          <p className="text-gray-600">No geometry found for this district yet.</p>
        )}
      </section>

      <section className="bg-white border rounded-2xl p-6 space-y-3">
        <h2 className="text-xl font-bold">District attributes</h2>
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
          ) : <div>No record found in CSV for ID {id}.</div>
        )}
      </section>
    </div>
  );
}
