// src/components/DistrictMap.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";

function FitToLayer({ layerRef }) {
  const map = useMap();
  useEffect(() => {
    const layer = layerRef.current;
    if (layer && layer.getBounds && layer.getBounds().isValid()) {
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    }
  }, [layerRef, map]);
  return null;
}

export default function DistrictMap({ districtId }) {
  const [geo, setGeo] = useState(null);
  const [feature, setFeature] = useState(null);
  const gjRef = useRef(null);

  useEffect(() => {
    const url = import.meta.env.VITE_TEXAS_GEOJSON;
    fetch(url, { cache: "force-cache" })
      .then((r) => r.json())
      .then((fc) => {
        setGeo(fc);
      })
      .catch((e) => {
        console.error("Failed to load GeoJSON", e);
        setGeo(null);
      });
  }, []);

  // pick the district feature by DISTRICT_N / DISTRICT_ID
  useEffect(() => {
    if (!geo || !districtId) return;
    const id = String(districtId);
    const feats = (geo.features || []).filter((f) => {
      const p = f.properties || {};
      const a = String(p.DISTRICT_N ?? p.DISTRICT_ID ?? "");
      return a === id;
    });
    setFeature(
      feats.length
        ? { type: "FeatureCollection", features: [feats[0]] }
        : null
    );
  }, [geo, districtId]);

  const style = useMemo(() => ({ weight: 2, color: "#1f3a8a", fillOpacity: 0.2 }), []);

  return (
    <div className="h-[420px] w-full rounded-2xl overflow-hidden border bg-white">
      <MapContainer
        center={[31, -99]}
        zoom={6}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {feature ? (
          <>
            <GeoJSON
              ref={gjRef}
              data={feature}
              style={() => style}
              onEachFeature={(f, layer) => {
                const p = f.properties || {};
                const code = String(p.DISTRICT_N ?? p.DISTRICT_ID ?? "");
                const name = String(p.NAME ?? p.DISTRICT ?? p.DISTNAME ?? "District");
                layer.bindTooltip(`<strong>${name}${code ? ` (${code})` : ""}</strong>`, { sticky: true });
              }}
            />
            <FitToLayer layerRef={gjRef} />
          </>
        ) : (
          <></>
        )}
      </MapContainer>
    </div>
  );
}
