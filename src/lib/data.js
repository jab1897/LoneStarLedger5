import Papa from "papaparse";

const NUM = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
let _cache = null;

export async function loadDistrictsCSV(csvUrl) {
  if (_cache) return _cache;

  const url = csvUrl || import.meta.env.VITE_DISTRICTS_CSV;
  if (!url) throw new Error("VITE_DISTRICTS_CSV is not set");

  const text = await fetch(url, { cache: "force-cache" }).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch CSV: ${r.status}`);
    return r.text();
  });

  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  const rows = parsed.data.filter(Boolean);
  const byId = {};
  const countiesSet = new Set();

  let campusesTotal = 0;
  let enrollmentTotal = 0;
  let adaTotal = 0;

  for (const r of rows) {
    const id = r.DISTRICT_N || r.DISTRICT_ID || r.DISTRICTCODE;
    if (id) byId[String(id)] = r;
    if (r.COUNTY) countiesSet.add(String(r.COUNTY));

    campusesTotal   += NUM(r.CAMPUSES);
    enrollmentTotal += NUM(r.ENROLLMENT);
    adaTotal        += NUM(r.ADA);
  }

  const districtsCount = rows.length;
  const campusesAvg   = districtsCount ? Math.round(campusesTotal / districtsCount) : 0;
  const enrollmentAvg = districtsCount ? Math.round(enrollmentTotal / districtsCount) : 0;
  const adaAvg        = districtsCount ? Math.round(adaTotal / districtsCount) : 0;

  _cache = {
    rows,
    byId,
    counties: Array.from(countiesSet).sort(),
    stats: {
      districtsCount,
      campusesTotal,
      enrollmentTotal,
      adaTotal,
      campusesAvg,
      enrollmentAvg,
      adaAvg,
    },
  };
  return _cache;
}

export async function getStatewideStats(csvUrl) {
  const { stats } = await loadDistrictsCSV(csvUrl);
  return stats;
}
