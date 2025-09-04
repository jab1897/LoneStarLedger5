// Lightweight CSV loaders & mappers for homepage cards (no deps)

// ===== utils =====
function stripBOM(t) { return t && t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t; }

// Quote-aware CSV parser (handles commas in quotes and "" escapes)
export function parseCSV(text) {
  if (!text) return { headers: [], rows: [] };
  const s = stripBOM(String(text)).replace(/\r/g, "");
  const lines = s.split("\n").filter(function(l){ return l.trim().length > 0; });

  function splitCSV(line) {
    var out = [];
    var cur = "";
    var i = 0;
    var inQ = false;
    while (i < line.length) {
      var ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        cur += ch; i++; continue;
      } else {
        if (ch === '"') { inQ = true; i++; continue; }
        if (ch === ',') { out.push(cur.trim()); cur = ""; i++; continue; }
        cur += ch; i++; continue;
      }
    }
    out.push(cur.trim());
    return out;
  }

  if (!lines.length) return { headers: [], rows: [] };
  const headers = splitCSV(lines[0]).map(function(h){ return h.trim(); });
  const rows = lines.slice(1).map(function(line){
    const cells = splitCSV(line);
    const obj = {};
    headers.forEach(function(h, idx){ obj[h] = (cells[idx] == null ? "" : cells[idx]).trim(); });
    return obj;
  });
  return { headers: headers, rows: rows };
}

function toNum(v) {
  const n = Number(String(v == null ? "" : v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function firstKey(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (obj[k] != null && obj[k] !== "") return k;
  }
  return null;
}

async function fetchCSV(path) {
  try {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) return { ok: false, path: path, text: null, bytes: 0 };
    const text = await res.text();
    return { ok: true, path: path, text: text, bytes: text.length };
  } catch (e) {
    return { ok: false, path: path, text: null, bytes: 0 };
  }
}

// ===== loaders =====
export async function loadSuperintendents() {
  const f = await fetchCSV("/data/home/superintendents.csv");
  if (!f.ok) return { rows: [], headers: [], error: "File not found at " + f.path };

  const parsed = parseCSV(f.text);
  const rows = parsed.rows.map(function(r){
    const idKey   = firstKey(r, ["DISTRICT_N","DISTRICT_ID","DISTRICT_NUMBER"]);
    const nameKey = firstKey(r, ["DISTRICT_NAME","NAME","DNAME"]);
    const supKey  = firstKey(r, ["SUPERINTENDENT_NAME","SUPT_NAME","SUPERINTENDENT"]);
    const salKey  = firstKey(r, ["FTE_SALARY","SUPERINTENDENT_SALARY","SUPT_SALARY","BASE_FTE_SALARY"]);
    const enrKey  = firstKey(r, ["ENROLLMENT","ENR","STUDENTS"]);
    var id = r[idKey];
    var name = r[nameKey];
    return {
      id: id,
      name: name,
      supName: r[supKey] == null ? "" : r[supKey],
      fteSalary: toNum(r[salKey]),
      enroll: toNum(r[enrKey])
    };
  }).filter(function(d){ return d.id && d.name && Number.isFinite(d.fteSalary); });

  if (import.meta && import.meta.env && import.meta.env.DEV) {
    console.info("[home:superintendents] path:", f.path, "bytes:", f.bytes);
    console.info("[home:superintendents] headers:", parsed.headers);
    console.info("[home:superintendents] first row:", parsed.rows[0]);
    console.info("[home:superintendents] mapped rows:", rows.length);
  }
  return { rows: rows, headers: parsed.headers, error: rows.length ? null : "No mapped rows" };
}

export async function loadIndebted() {
  const f = await fetchCSV("/data/home/indebted.csv");
  if (!f.ok) return { rows: [], headers: [], error: "File not found at " + f.path };

  const parsed = parseCSV(f.text);
  const rows = parsed.rows.map(function(r){
    var id = r.DISTRICT_N || r.DISTRICT_ID || r.DISTRICT_NUMBER;
    var name = r.DISTRICT_NAME || r.NAME || r.DNAME || "";
    var enroll = toNum(r.ENROLLMENT || r.ENR || r.STUDENTS);
    var debt = toNum(r.DEBT_PER_STUDENT) || toNum(r.TOTAL_DEBT) || toNum(r.DEBT) || toNum(r.DEBT_TOTAL);
    return { id: id, name: name, debt: debt, enroll: enroll };
  }).filter(function(d){ return d.id && d.name && Number.isFinite(d.debt); });

  if (import.meta && import.meta.env && import.meta.env.DEV) {
    console.info("[home:indebted] path:", f.path, "bytes:", f.bytes);
    console.info("[home:indebted] headers:", parsed.headers);
    console.info("[home:indebted] first row:", parsed.rows[0]);
    console.info("[home:indebted] mapped rows:", rows.length);
  }
  return { rows: rows, headers: parsed.headers, error: rows.length ? null : "No mapped rows" };
}

export async function loadPerformance() {
  const f = await fetchCSV("/data/home/performance.csv");
  if (!f.ok) return { rows: [], headers: [], error: "File not found at " + f.path };

  const parsed = parseCSV(f.text);
  const rows = parsed.rows.map(function(r){
    var id = r.DISTRICT_N || r.DISTRICT_ID || r.DISTRICT_NUMBER;
    var name = r.DISTRICT_NAME || r.NAME || r.DNAME || "";
    var enroll = toNum(r.ENROLLMENT || r.ENR || r.STUDENTS);
    var score = toNum(r.OVERALL_SCORE || r.SCORE || r.ACCOUNTABILITY_SCORE);
    if (!Number.isFinite(score)) {
      var rating = String(r.OVERALL_RATING || r.RATING || "").toUpperCase();
      var map = { A:95, B:85, C:75, D:65, F:55 };
      score = map[rating] == null ? NaN : map[rating];
    }
    return { id: id, name: name, score: score, enroll: enroll };
  }).filter(function(d){ return d.id && d.name && Number.isFinite(d.score); });

  if (import.meta && import.meta.env && import.meta.env.DEV) {
    console.info("[home:performance] path:", f.path, "bytes:", f.bytes);
    console.info("[home:performance] headers:", parsed.headers);
    console.info("[home:performance] first row:", parsed.rows[0]);
    console.info("[home:performance] mapped rows:", rows.length);
  }
  return { rows: rows, headers: parsed.headers, error: rows.length ? null : "No mapped rows" };
}

// enrollment buckets
export const ENROLL_BUCKETS = [
  { key: "all",   label: "All sizes",   test: function(){ return true; } },
  { key: "lt1k",  label: "< 1,000",     test: function(n){ return n < 1000; } },
  { key: "1k5k",  label: "1,000–4,999", test: function(n){ return n >= 1000 && n < 5000; } },
  { key: "5k20k", label: "5,000–19,999",test: function(n){ return n >= 5000 && n < 20000; } },
  { key: "20k+",  label: "20,000+",     test: function(n){ return n >= 20000; } }
];

export function usd0(n) { return Number.isFinite(n) ? "$" + Math.round(n).toLocaleString() : "—"; }
export function int0(n) { return Number.isFinite(n) ? Math.round(n).toLocaleString() : "—"; }
