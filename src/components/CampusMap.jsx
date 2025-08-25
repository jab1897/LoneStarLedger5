import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { getCampusFeatureById } from "../lib/campuses";

function FitToLayer({ layerRef }) {
  const map = useMap();
  useEffect(() => {
    const layer = layerRef.current;
    if (layer && layer.getBounds && layer.getBounds().isValid()) {
      map.fitBounds(layer.getBounds(), { padding: [28, 28] });
    }
  }, [layerRef, map]);
  return null;
}

export default function CampusMap({ campusId }) {
  const [feature, setFeature] = useState(null);
  const gjRef = useRef(null);

  useEffect(() => {
    getCampusFeatureById(campusId).then((f) => {
      if (!f) return setFeature(null);
      // Represent as FeatureCollection for GeoJSON component
      setFeature({ type: "FeatureCollection", features: [f] });
    }).catch(() => setFeature(null));
  }, [campusId]);

  const ptStyle = useMemo(
    () => ({ radius: 7, weight: 2, color: "#1f2937", fillColor: "#3b82f6", fillOpacity: 0.95 }),
    []
  );

  return (
    <div className="h-[380px] w-full rounded-2xl overflow-hidden border bg-white">
      <MapContainer center={[31, -99]} zoom={6} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {feature ? (
          <>
            <GeoJSON
              ref={gjRef}
              data={feature}
              pointToLayer={(_f, latlng) => window.L.circleMarker(latlng, ptStyle)}
              onEachFeature={(f, layer) => {
                const p = f.properties || {};
                const name = String(p.CAMPUS_NAME ?? p.NAME ?? "Campus");
                const id = String(p.CAMPUS_ID ?? p.CAMPUS ?? "");
                layer.bindTooltip(`<strong>${name}${id ? ` (${id})` : ""}</strong>`, { sticky: true });
              }}
            />
            <FitToLayer layerRef={gjRef} />
          </>
        ) : null}
      </MapContainer>
    </div>
  );
}
