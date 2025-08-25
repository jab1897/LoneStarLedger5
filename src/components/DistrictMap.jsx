// src/components/DistrictMap.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { getCampusFeaturesForDistrict } from "../lib/campuses";

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
  const [geo, setGeo] = useState(null);          // district polygons
  const [feature, setFeature] = useState(null);
  const [campusFC, setCampusFC] = useState(null); // campus points (FeatureCollection)
  const gjRef = useRef(null);

  useEffect(() => {
    const url = import.meta.env.VITE_TEXAS_GEOJSON;
    fetch(url, { cache: "force-cache" })
      .then((r) => r.json())
      .then((fc) => setGeo(fc))
      .catch((e) => { console.error("Failed to load GeoJSON", e); setGeo(null); });
  }, []);

  useEffect(() => {
    if (!geo || !districtId) return;
    const id = String(districtId);
    const feats = (geo.features || []).filter((f) => {
      const p = f.properties || {};
      const a = String(p.DISTRICT_N ?? p.DISTRICT_ID ?? "");
      return a === id;
    });
    setFeature(feats.length ? { type: "FeatureCollection", features: [feats[0]] } : null);
  }, [geo, districtId]);

  useEffect(() => {
    // overlay campuses if env is present
    if (!districtId || !import.meta.env.VITE_CAMPUSES_GEOJSON) {
      setCampusFC(null);
      return;
    }
    getCampusFeaturesForDistrict(districtId)
      .then((fc) => setCampusFC(fc))
      .catch(() => setCampusFC(null));
  }, [districtId]);

  const polyStyle = useMemo(() => ({ weight: 2, color: "#1f3a8a", fillOpacity: 0.2 }), []);
  const ptStyle = useMemo(
    () => ({ radius: 5, weight: 1, color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.9 }),
    []
  );

  return (
    <div className="h-[420px] w-full rounded-2xl overflow-hidden border bg-white">
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
              style={() => polyStyle}
              onEachFeature={(f, layer) => {
                const p = f.properties || {};
                const code = String(p.DISTRICT_N ?? p.DISTRICT_ID ?? "");
                const name = String(p.NAME ?? p.DISTRICT ?? p.DISTNAME ?? "District");
                layer.bindTooltip(`<strong>${name}${code ? ` (${code})` : ""}</strong>`, { sticky: true });
              }}
            />
            <FitToLayer layerRef={gjRef} />
          </>
        ) : null}

        {/* campus points */}
        {campusFC && campusFC.features?.length ? (
          <GeoJSON
            key="campuses"
            data={campusFC}
            pointToLayer={(_f, latlng) => {
              // circle markers avoid Leaflet icon URL issues
              return window.L.circleMarker(latlng, ptStyle);
            }}
            onEachFeature={(f, layer) => {
              const p = f.properties || {};
              const cname = String(p.CAMPUS_NAME ?? p.NAME ?? "Campus");
              const cid = String(p.CAMPUS_ID ?? p.CAMPUS ?? "");
              const cscore = p.CAMPUS_SCORE ?? p.SCORE ?? null;
              const lines = [
                `<strong>${cname}${cid ? ` (${cid})` : ""}</strong>`,
                cscore !== null && cscore !== undefined ? `Score: ${cscore}` : null,
              ].filter(Boolean);
              layer.bindTooltip(lines.join("<br/>"), { sticky: true });
              layer.on("click", () => {
                if (cid) window.location.href = `/campus/${encodeURIComponent(cid)}`;
              });
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
