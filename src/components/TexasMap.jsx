// src/components/TexasMap.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";

function FitToLayer({ layerRef }) {
  const map = useMap();
  useEffect(() => {
    const layer = layerRef.current;
    try {
      if (layer && layer.getBounds && layer.getBounds().isValid()) {
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      }
    } catch {}
  }, [layerRef, map]);
  return null;
}

export default function TexasMap() {
  const [fc, setFc] = useState(null);
  const gjRef = useRef(null);
  const url = import.meta.env.VITE_TEXAS_GEOJSON
           || import.meta.env.VITE_DISTRICTS_GEOJSON
           || "/data/Current_Districts_2025.geojson";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(url, { cache: "force-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        const data = await res.json();
        setFc(data);
      } catch (e) {
        console.error("Failed to load statewide GeoJSON:", e);
        setFc(null);
      }
    })();
  }, [url]);

  const polyStyle = useMemo(() => ({ weight: 1, color: "#1f3a8a", fillOpacity: 0.15 }), []);

  return (
    <div className="h-[420px] w-full rounded-2xl overflow-hidden border bg-white">
      <MapContainer center={[31, -99]} zoom={6} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fc ? (
          <>
            <GeoJSON ref={gjRef} data={fc} style={() => polyStyle} />
            <FitToLayer layerRef={gjRef} />
          </>
        ) : null}
      </MapContainer>
    </div>
  );
}
