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
      if (b && b.isValid()) {
        const sw = b.getSouthWest();
        const ne = b.getNorthEast();
        if (sw.equals(ne)) {
          map.setView(b.getCenter(), 15);
        } else {
          map.fitBounds(b, { padding: [20, 20] });
        }
      }
    } catch {}
  }, [geom, map]);
  return null;
}

export default function Map({ geom, height = 420 } = {}) {
  const style = useMemo(
    () => ({
      weight: 2,
      color: "#1d4ed8",
      fillColor: "#93c5fd",
      fillOpacity: 0.25,
    }),
    []
  );
  const icon = useMemo(
    () =>
      L.icon({
        iconUrl: "/icons/school.svg",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    []
  );
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
        {geom && (
          <GeoJSON
            data={geom}
            style={style}
            pointToLayer={(_, latlng) => L.marker(latlng, { icon })}
          />
        )}
        <FitToGeom geom={geom} />
      </MapContainer>
    </div>
  );
}
