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

  const style = useMemo(
    () => ({ weight: 1, color: "#444", fillOpacity: 0.18 }),
    []
  );

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
                const name = String(
                  props.NAME ?? props.DISTRICT ?? props.DISTNAME ?? "District"
                );

                const row = code && byId[code] ? byId[code] : null;
                const enrollment = row?.ENROLLMENT;
                const campuses = row?.CAMPUSES;
                const ada = row?.ADA;

                const lines = [
                  `<strong>${name}${code ? ` (${code})` : ""}</strong>`,
                  enrollment
                    ? `Enrollment: ${new Intl.NumberFormat("en-US").format(+enrollment)}`
                    : null,
                  campuses
                    ? `Campuses: ${new Intl.NumberFormat("en-US").format(+campuses)}`
                    : null,
                  ada
                    ? `ADA: ${new Intl.NumberFormat("en-US").format(+ada)}`
                    : null,
                ].filter(Boolean);

                layer.bindTooltip(lines.join("<br/>"), { sticky: true });
                layer.on("click", () => {
                  if (code) window.location.href = `/district/${encodeURIComponent(code)}`;
                });
                layer.on("mouseover", () => layer.setStyle({ weight: 2, fillOpacity: 0.28 }));
                layer.on("mouseout", () => layer.setStyle({ weight: 1, fillOpacity: 0.18 }));
              }}
            />
          )}
        </MapContainer>
      </div>
    </section>
  );
}
