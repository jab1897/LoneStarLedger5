import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { loadDistrictsCSV } from "../lib/data";

export default function TexasMap() {
  const [geo, setGeo] = useState(null);
  const [byId, setById] = useState({});

  useEffect(() => {
    const url = import.meta.env.VITE_TEXAS_GEOJSON;
    fetch(url, { cache: "force-cache" })
      .then((r) => r.json())
      .then(setGeo)
      .catch((e) => {
        console.error("Failed to load GeoJSON", e);
        setGeo(null);
      });

    loadDistrictsCSV().then(({ byId }) => setById(byId)).catch(console.error);
  }, []);

  const style = useMemo(() => ({
    weight: 1,
    color: "#444",
    fillOpacity: 0.18,
  }), []);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">Texas districts map</h2>
      <div className="h-[520px] w-full rounded-2xl overflow-hidden border bg-white">
        <MapContainer
          center={[31.0, -99.0]}
          zoom={6}
          minZoom={5}
          maxZoom={12}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {geo && (
            <GeoJSON
              data={geo}
              style={() => style}
              onEachFeature={(feature, layer) => {
                const props = feature?.properties || {};
                const code = String(props.DISTRICT_N ?? props.DISTRICT_ID ?? "");
                const name = String(props.NAME ?? props.DISTRICT ?? props.DISTNAME ?? "District");
                const row = code && byId[code] ? byId[code] : null;

                const lines = [
                  `<strong>${name}</strong>`,
                  code ? `ID: ${code}` : null,
                  row?.ENROLLMENT ? `Enrollment: ${new Intl.NumberFormat().format(+row.ENROLLMENT)}` : null,
                  row?.CAMPUSES ? `Campuses: ${new Intl.NumberFormat().format(+row.CAMPUSES)}` : null,
                  row?.ADA ? `ADA: ${new Intl.NumberFormat().format(+row.ADA)}` : null,
                ].filter(Boolean);

                layer.bindTooltip(lines.join("<br/>"), { sticky: true });
                layer.on("click", () => {
                  if (code) window.location.href = `/district/${encodeURIComponent(code)}`;
                });
              }}
            />
          )}
        </MapContainer>
      </div>
    </section>
  );
}
