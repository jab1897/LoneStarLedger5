import { loadDistrictsCSV } from "./data";
import { getAllCampuses } from "./campuses";

let cachePromise = null;

function clean(value) {
  return String(value ?? "").trim();
}

export async function loadSearchIndex() {
  if (!cachePromise) {
    cachePromise = Promise.all([loadDistrictsCSV(), getAllCampuses()])
      .then(([districtData, campusData]) => {
        const distFields = districtData?.fields || {};
        const districtRows = districtData?.rows || [];
        const districts = districtRows
          .map((row) => {
            const id = distFields.ID ? clean(row[distFields.ID]) : "";
            const name = distFields.NAME ? clean(row[distFields.NAME]) : id;
            if (!id || !name) return null;
            const county = distFields.COUNTY ? clean(row[distFields.COUNTY]) : "";
            return {
              key: `district:${id}`,
              type: "district",
              id,
              name,
              county,
              search: `${name} ${id} ${county}`.toLowerCase(),
            };
          })
          .filter(Boolean);

        const campFields = campusData?.fields || {};
        const campusRows = campusData?.rows || [];
        const campuses = campusRows
          .map((row) => {
            const id = campFields.CAMPUS_ID ? clean(row[campFields.CAMPUS_ID]) : "";
            const name = campFields.CAMPUS_NAME ? clean(row[campFields.CAMPUS_NAME]) : id;
            if (!id || !name) return null;
            const districtId = campFields.DISTRICT_ID ? clean(row[campFields.DISTRICT_ID]) : "";
            const district = campFields.DISTRICT_NAME ? clean(row[campFields.DISTRICT_NAME]) : "";
            return {
              key: `campus:${id}`,
              type: "campus",
              id,
              name,
              districtId,
              district,
              search: `${name} ${id} ${district} ${districtId}`.toLowerCase(),
            };
          })
          .filter(Boolean);

        return {
          districts,
          campuses,
          all: [...districts, ...campuses],
        };
      })
      .catch((err) => {
        cachePromise = null;
        throw err;
      });
  }
  return cachePromise;
}
