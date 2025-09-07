// src/lib/campuses.js
import Papa from "papaparse";

/\*\* Data locations (env-first) \*/
const CAMPUSES\_CSV =
import.meta.env.VITE\_CAMPUSES\_CSV || "/public/data/Schools\_2024\_to\_2025.csv";

const CAMPUSES\_GEOJSON =
import.meta.env.VITE\_CAMPUSES\_GEOJSON || "/data/Schools\_2024\_to\_2025.geojson";

/\*\* -------- helpers -------- \*/
const norm = (s) =>
String(s ?? "")
.toLowerCase()
.trim()
.replace(/\[-\_\s]+/g, "")
.replace(/\[^a-z0-9]/g, "");

const canonId = (v) =>
String(v ?? "")
.replace(/\['"]/g, "")
.replace(/\D/g, "")        // digits only
.replace(/^0+/, "");       // strip leading zeros

function buildHeaderMap(row) {
// de-duplicate headers Papa may rename: "Foo","Foo-1"
const m = new globalThis.Map();
for (const k of Object.keys(row || {})) {
const base = k.replace(/-\d+\$/, "");
const nk = norm(base);
if (!m.has(nk)) m.set(nk, k);
}
return m;
}

function bestHeader(row0, aliases = \[], fuzzy = \[]) {
const keys = Object.keys(row0 || {});
const nm = new Map(keys.map((k) => \[norm(k), k]));
for (const a of aliases) {
const k = nm.get(norm(a));
if (k) return k;
}
for (const k of keys) {
const raw = k.toLowerCase();
if (fuzzy.some((re) => re.test(raw))) return k;
}
return null;
}

function toNumSafe(v) {
if (v === null || v === undefined || v === "") return NaN;
const s = String(v).replace(/\[\$,]/g, "");
const n = Number(s);
return Number.isNaN(n) ? NaN : n;
}

/\*\* -------- CSV loader (keeps leading zeros) -------- \*/
let \_campCache = null;

async function loadCampusesCSV() {
if (\_campCache) return \_campCache;

const text = await fetch(CAMPUSES\_CSV, { cache: "force-cache" }).then((r) => {
if (!r.ok) throw new Error(`Campus CSV fetch ${r.status}: ${CAMPUSES_CSV}`);
return r.text();
});

const parsed = Papa.parse(text, {
header: true,
dynamicTyping: false,   // keep IDs as strings
skipEmptyLines: true,
worker: false,
});
if (parsed.errors?.length) {
console.warn("\[Campuses] CSV parse warnings:", parsed.errors.slice(0, 3));
}

const rows = parsed.data.map((r) => {
const clean = {};
for (const k of Object.keys(r)) {
const nk = String(k).replace(/^\uFEFF/, "").trim(); // drop BOM/space
clean\[nk] = r\[k];
}
return clean;
});

const row0 = rows.find((r) => Object.keys(r).length) || {};
const hdr = buildHeaderMap(row0);

// Detect important headers (aliases + fuzzy)
const fields = {
DISTRICT\_ID: bestHeader(
row0,
\[
"USER\_District\_Number",
"DISTRICT\_N",
"DISTRICT\_ID",
"LEAID",
"LEA",
"LEA CODE",
"LEA\_ID",
],
\[/district.*(number|id|code)/i, /\blea(\s*id|\s\*code)?\b/i]
),
DISTRICT\_NAME: bestHeader(
row0,
\["District Name", "DISTRICT", "DISTNAME", "LEA\_NAME", "LEA NAME"],
\[/district.*name/i, /lea.*name/i]
),
CAMPUS\_ID: bestHeader(
row0,
\[
"USER\_School\_Number",
"USER\_Campus\_Number",
"CAMPUS\_ID",
"Campus ID",
"SCHOOL\_NUMBER",
"SCHOOL ID",
"School Number",
"Column2",
],
\[/campus.*(id|number)/i, /school.*(id|number)/i]
),
CAMPUS\_NAME: bestHeader(
row0,
\["USER\_School\_Name", "Campus Name", "CAMPUS\_NAME", "SCHOOL\_NAME", "NAME"],
\[/campus.\*name/i, /school.\*name/i]
),
CAMPUS\_SCORE: bestHeader(
row0,
\["Campus Score", "CAMPUS\_SCORE", "CampusScore", "SCORE", "RATING", "GRADE"],
\[/score/i, /rating/i, /grade/i]
),
CAMPUS\_GRADE: bestHeader(
row0,
\["Campus Grade", "CAMPUS\_GRADE", "Grade", "CAMPUS\_GRADE\_L"],
\[/campus.\*grade/i]
),
GRADES: bestHeader(
row0,
\["Grades", "GRADE\_RANGE", "USER\_Grade\_Range"],
\[/grade.*range/i, /^grades?\$/i]
),
ENROLLMENT: bestHeader(
row0,
\["Enrollment", "ENROLLMENT"],
\[/enroll/i]
),
READING\_OGR: bestHeader(
row0,
\["Reading OGL", "Reading On Grade-Level", "READING\_OGL", "READING OGL"],
\[/read.*(on.*grade|ogl)/i]
),
MATH\_OGR: bestHeader(
row0,
\["Math OGL", "MATH\_OGL", "Math On Grade-Level", "MATH OGL"],
\[/math.*(on.\*grade|ogl)/i]
),
READING\_NOT: bestHeader(
row0,
\[
"Reading Not On Grade-Level",
"Reading Not on Grade-Level",
"READING\_NOT\_GL",
"READING\_NOT\_OGR",
"Share of Students Not on Grade-Level: Reading",
],
\[/read.\*not.\*grade/i]
),
MATH\_NOT: bestHeader(
row0,
\[
"Math Not On Grade-Level",
"Math Not on Grade-Level",
"MATH\_NOT\_GL",
"MATH\_NOT\_OGR",
"Share of Students Not on Grade-Level: Math",
],
\[/math.\*not.\*grade/i]
),
ATTEND\_RATE: bestHeader(
row0,
\["Attendance Rate", "ATTENDANCE\_RATE"],
\[/attendance/i]
),
CHRONIC\_ABS: bestHeader(
row0,
\[
"Chronic Absenteeism Rate",
"Chronic Absenteeism",
"CHRONIC\_ABSENTEEISM\_RATE",
],
\[/absentee/i]
),
TEACHER\_COUNT: bestHeader(
row0,
\["Teacher Count", "TEACHERS", "TEACHER\_COUNT"],
\[/teacher.\*count/i]
),
ADMIN\_COUNT: bestHeader(
row0,
\["Admin Count", "ADMIN\_COUNT", "Administrators"],
\[/admin.\*count/i]
),
AVG\_ADMIN\_SAL: bestHeader(
row0,
\["Average Admin Salary", "ADMIN\_AVG\_SALARY", "AVG\_ADMIN\_SAL"],
\[/admin.\*salary/i]
),
AVG\_TEACH\_SAL: bestHeader(
row0,
\["Average Teacher Salary", "TEACHER\_AVG\_SALARY", "AVG\_TEACH\_SAL"],
\[/teacher.\*salary/i]
),
};

// Resolve to *actual* keys present (using the header map)
for (const k of Object.keys(fields)) {
const label = fields\[k];
fields\[k] = label ? hdr.get(norm(label)) || label : null;
}

\_campCache = { rows, fields };
return \_campCache;
}

/\*\* -------- public API -------- \*/

export async function getAllCampuses() {
// convenience for listing page
return loadCampusesCSV();
}

export async function getCampusesForDistrict(districtId) {
const want = canonId(districtId);
const { rows, fields } = await loadCampusesCSV();
const kDist = fields.DISTRICT\_ID;
if (!kDist) return { rows: \[], fields };

let list = rows.filter((r) => r?.\[kDist] != null && canonId(r\[kDist]) === want);

// --- RESOLVED: keep all rows but sort by score (missing/zero -> Infinity so they appear last)
const kScore = fields.CAMPUS\_SCORE;
if (kScore) {
list = list
.map((r) => {
const s = toNumSafe(r\[kScore]);
return {
row: r,
score: Number.isFinite(s) && s > 0 ? s : Infinity,
};
})
.sort((a, b) => a.score - b.score)
.map((o) => o.row);
}

return { rows: list, fields };
}

export async function getCampusById(campusId) {
const want = canonId(campusId);
const { rows, fields } = await loadCampusesCSV();
const kId = fields.CAMPUS\_ID;
const row = kId ? rows.find((r) => canonId(r\[kId]) === want) : null;
return { row: row || null, fields };
}

export async function getCampusFeatureById(campusId) {
const want = canonId(campusId);

if (CAMPUSES\_GEOJSON) {
try {
const fc = await fetch(CAMPUSES\_GEOJSON, { cache: "force-cache" }).then((r) => r.json());
const keys = \[
"CAMPUS\_ID",
"CAMPUS",
"CAMPUS\_N",
"USER\_School\_Number",
"School Number",
"SCHOOL\_NUMBER",
"ID",
];
const feat = (fc.features || \[]).find((f) => {
const p = f.properties || {};
return keys.some((k) => p\[k] != null && canonId(p\[k]) === want);
});
if (feat) return feat;
} catch (e) {
console.warn("\[Campuses] campus GeoJSON load failed:", e);
}
}

// fallback: synthesize from CSV if lat/lon exist
const { rows, fields } = await loadCampusesCSV();
const row0 = rows\[0] || {};
const latKey =
bestHeader(row0, \["LAT", "Latitude", "Y"], \[/^lat\$/i, /latitude/i]) || null;
const lonKey =
bestHeader(row0, \["LON", "LONG", "Longitude", "X"], \[/^lon\$|^lng\$/i, /long/i, /longitude/i]) || null;

const kId = fields.CAMPUS\_ID;
if (!latKey || !lonKey || !kId) return null;
const row = rows.find(
(r) => r\[latKey] && r\[lonKey] && canonId(r\[kId]) === want
);
if (!row) return null;

return {
type: "Feature",
properties: {
CAMPUS\_ID: fields.CAMPUS\_ID ? row\[fields.CAMPUS\_ID] : "",
CAMPUS\_NAME: fields.CAMPUS\_NAME ? row\[fields.CAMPUS\_NAME] : "",
CAMPUS\_SCORE: fields.CAMPUS\_SCORE ? row\[fields.CAMPUS\_SCORE] : "",
},
geometry: {
type: "Point",
coordinates: \[Number(row\[lonKey]), Number(row\[latKey])],
},
};
}

export async function getCampusFeaturesForDistrict(districtId) {
// Prefer point GeoJSON if provided; else synthesize from CSV lat/lon (if present)
const want = canonId(districtId);

if (CAMPUSES\_GEOJSON) {
try {
const fc = await fetch(CAMPUSES\_GEOJSON, { cache: "force-cache" }).then((r) => r.json());
const keys = \[
"DISTRICT\_N", "DISTRICT\_ID", "LEAID", "LEA", "USER\_District\_Number",
];
const feats = (fc.features || \[]).filter((f) => {
const p = f.properties || {};
return keys.some((k) => p\[k] != null && canonId(p\[k]) === want);
});
if (feats.length) {
return { type: "FeatureCollection", features: feats };
}
} catch (e) {
console.warn("\[Campuses] campus GeoJSON load failed:", e);
}
}

// fallback: synthesize points from CSV if lat/lon exist
const { rows, fields } = await loadCampusesCSV();
const row0 = rows\[0] || {};
const latKey =
bestHeader(row0, \["LAT", "Latitude", "Y"], \[/^lat\$/i, /latitude/i]) || null;
const lonKey =
bestHeader(row0, \["LON", "LONG", "Longitude", "X"], \[/^lon\$|^lng\$/i, /long/i, /longitude/i]) || null;

if (!latKey || !lonKey || !fields.DISTRICT\_ID) return null;

const pts = rows
.filter((r) => canonId(r\[fields.DISTRICT\_ID]) === want)
.filter((r) => r\[latKey] && r\[lonKey])
.map((r) => ({
type: "Feature",
properties: {
CAMPUS\_ID: fields.CAMPUS\_ID ? r\[fields.CAMPUS\_ID] : "",
CAMPUS\_NAME: fields.CAMPUS\_NAME ? r\[fields.CAMPUS\_NAME] : "",
CAMPUS\_SCORE: fields.CAMPUS\_SCORE ? r\[fields.CAMPUS\_SCORE] : "",
},
geometry: {
type: "Point",
coordinates: \[Number(r\[lonKey]), Number(r\[latKey])],
},
}));

return pts.length
? { type: "FeatureCollection", features: pts }
: null;
}
