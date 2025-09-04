// Lightweight CSV loaders & mappers for homepage cards (no new deps)

// numeric helper
const _num = function(v) {
  const n = Number(String(v == null ? "" : v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

// build candidate URL list (absolute + relative), include case variants & singular/plural
function _candidates(base) {
  const variants = Array.isArray(base) ? base : [base];
  const all = [];
  for (var i = 0; i < variants.length; i++) {
    var v = variants[i];
    var abs = v.charAt(0) === "/" ? v : "/" + v;
    var rel = v.charAt(0) === "/" ? v.slice(1) : v;
    all.push(abs, rel);
  }
  return Array.from(new Set(all));
}

// fetch first successful text response
async function _fetchFirstGood(textPaths) {
  const tries = _candidates(textPaths);
  for (var i = 0; i < tries.length; i++) {
    var p = tries[i];
    try {
      const res = await fetch(p, { cache: "no-cache" });
      if (res && res.ok) {
        const t = await res.text();
        return { text: t, tried: tries, okPath: p };
      }
    } catch (_) {}
  }
  return { text: null, tried: tries, okPath: null };
}

// naive CSV parser
function _parseCSV(text) {
  if (!text) return { headers: [], rows: [] };
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(function(h){ return h.trim(); });
  const rows = lines.slice(1).map(function(line){
    const cells = line.split(",");
    const obj = {};
    headers.forEach(function(h, i){ obj[h] = (cells[i] == null ? "" : cells[i]).trim(); });
    return obj;
  });
  return { headers: headers, rows: rows };
}

const _firstKey = function(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (obj[k] != null && obj[k] !== "") return k;
  }
  return null;
};

// ---------- LOADERS ----------

// SUPERINTENDENTS
export async function loadSuperintendents() {
  const res = await _fetchFirstGood("data/home/superintendents.csv");
  if (!res.text) {
    console.info("[home] superintendents file not found. tried:", res.tried);
    return { tried: res.tried, okPath: null, rows: [] };
  }
  const parsed = _parseCSV(res.text);
  const mapped = parsed.rows.map(function(r){
    const idKey = _firstKey(r, ["DISTRICT_N","DISTRICT_ID","DISTRICT_NUMBER"]);
    const nameKey = _firstKey(r, ["DISTRICT_NAME","NAME","DNAME"]);
    const supKey = _firstKey(r, ["SUPERINTENDENT_NAME","SUPT_NAME","SUPERINTENDENT"]);
    const salKey = _firstKey(r, ["FTE_SALARY","SUPERINTENDENT_SALARY","SUPT_SALARY","BASE_FTE_SALARY"]);
    const enrKey = _firstKey(r, ["ENROLLMENT","ENR","STUDENTS"]);

    var id = r[idKey];
    var name = r[nameKey];
    var supName = r[supKey] == null ? "" : r[supKey];
    var fteSalary = _num(r[salKey]);
    var enroll = _num(r[enrKey]);
    return { id: id, name: name, supName: supName, fteSalary: fteSalary, enroll: enroll };
  }).filter(function(d){ return d && d.id && d.name && Number.isFinite(d.fteSalary); });

  return { tried: res.tried, okPath: res.okPath, rows: mapped };
}

// INDEBTED
export async function loadIndebted() {
  const res = await _fetchFirstGood([
    "data/home/indebted.csv",
    "data/home/Indebted.csv"
  ]);
  if (!res.text) {
    console.info("[home] indebted file not found. tried:", res.tried);
    return { tried: res.tried, okPath: null, rows: [] };
  }
  const parsed = _parseCSV(res.text);
  const mapped = parsed.rows.map(function(r){
    var id = r.DISTRICT_N || r.DISTRICT_ID || r.DISTRICT_NUMBER;
    var name = r.DISTRICT_NAME || r.NAME || r.DNAME || "";
    var enroll = _num(r.ENROLLMENT || r.ENR || r.STUDENTS);
    var debt = _num(r.DEBT_PER_STUDENT) || _num(r.TOTAL_DEBT) || _num(r.DEBT) || _num(r.DEBT_TOTAL);
    return { id: id, name: name, enroll: enroll, debt: debt };
  }).filter(function(d){ return d.id && d.name && Number.isFinite(d.debt); });
  return { tried: res.tried, okPath: res.okPath, rows: mapped };
}

// PERFORMANCE
export async function loadPerformance() {
  const res = await _fetchFirstGood([
    "data/home/performance.csv",
    "data/home/Performance.csv"
  ]);
  if (!res.text) {
    console.info("[home] performance file not found. tried:", res.tried);
    return { tried: res.tried, okPath: null, rows: [] };
  }
  const parsed = _parseCSV(res.text);
  const mapped = parsed.rows.map(function(r){
    var id = r.DISTRICT_N || r.DISTRICT_ID || r.DISTRICT_NUMBER;
    var name = r.DISTRICT_NAME || r.NAME || r.DNAME || "";
    var enroll = _num(r.ENROLLMENT || r.ENR || r.STUDENTS);
    var score = _num(r.OVERALL_SCORE || r.SCORE || r.ACCOUNTABILITY_SCORE);
    if (!Number.isFinite(score)) {
      var rating = String(r.OVERALL_RATING || r.RATING || "").toUpperCase();
      var map = {A:95, B:85, C:75, D:65, F:55};
      score = map[rating] == null ? NaN : map[rating];
    }
    return { id: id, name: name, enroll: enroll, score: score };
  }).filter(function(d){ return d.id && d.name && Number.isFinite(d.score); });
  return { tried: res.tried, okPath: res.okPath, rows: mapped };
}

// enrollment buckets (unchanged)
export const ENROLL_BUCKETS = [
  { key: "all",   label: "All sizes",   test: function(){ return true; } },
  { key: "lt1k",  label: "< 1,000",     test: function(n){ return n < 1000; } },
  { key: "1k5k",  label: "1,000–4,999", test: function(n){ return n >= 1000 && n < 5000; } },
  { key: "5k20k", label: "5,000–19,999",test: function(n){ return n >= 5000 && n < 20000; } },
  { key: "20k+",  label: "20,000+",     test: function(n){ return n >= 20000; } }
];

export const usd0 = function(n){ return Number.isFinite(n) ? "$" + Math.round(n).toLocaleString() : "—"; };
export const int0 = function(n){ return Number.isFinite(n) ? Math.round(n).toLocaleString() : "—"; };

