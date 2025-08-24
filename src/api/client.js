// src/api/client.js
const BASE = "https://lonestarledger2-0.onrender.com";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

/**
 * Expected shapes:
 * - /geojson/districts -> { type:"FeatureCollection", features:[{ properties:{DISTRICT_N, DISTNAME, ...}, geometry:... }, ...] }
 * - /geojson/districts.props.geojson -> likely a FeatureCollection of just properties (works the same as above)
 * - /stats/state -> object
 * - /summary/state -> object
 */
export const api = {
  health: () => request("/health"),

  // Geo endpoints
  listDistrictsGeo: () => request("/geojson/districts"),
  listDistrictProps: () => request("/geojson/districts.props.geojson"),

  // Convenience: find a district by DISTRICT_N from the geo collection
  async getDistrictById(districtN) {
    const fc = await request("/geojson/districts");
    const feature = (fc?.features || []).find(
      (f) =>
        f?.properties?.DISTRICT_N?.toString() === districtN?.toString() ||
        f?.properties?.id?.toString() === districtN?.toString()
    );
    if (!feature) throw new Error(`District ${districtN} not found`);
    return feature; // return full GeoJSON feature
  },

  // State-level data (used as working example for CampusDetail)
  getStateStats: () => request("/stats/state"),
  getStateSummary: () => request("/summary/state"),
};
