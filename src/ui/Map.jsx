import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

function FitToGeom({ geom } = {}) {
  const map = useMap();
  useEffect(() => {
    if (!geom) return;
    try {
      const layer = L.geoJSON(geom);
      const b = layer.getBounds();
      if (b && b.isValid()) map.fitBounds(b, { padding: [20,20] });
    } catch {}
  }, [geom, map]);
  return null;
}

export default function Map({ geom, height = 420 } = {}) {
  const style = useMemo(()=>({
    weight: 2,
    color: "#1d4ed8",
    fillColor: "#93c5fd",
    fillOpacity: 0.25
  }), []);
  return (
    <div className="overflow-hidden rounded-2xl border" style={{height}}>
      <MapContainer
        style={{height: "100%", width: "100%"}}
        center={[31.0, -99.0]} zoom={6} scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geom && <GeoJSON data={geom} style={style} />}
        <FitToGeom geom={geom} />
      </MapContainer>
    </div>
  );
}
