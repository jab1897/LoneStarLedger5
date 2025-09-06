// src/lib/homeData.js
// Robust CSV loaders for the home cards (arrays only, no layout changes).

// -------- quote-aware CSV parsing (no deps) --------
function stripBOM(t){ return t && t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t; }
function splitCSV(line){
  const out=[]; let cur="", i=0, inQ=false;
  while(i<line.length){
    const ch=line[i];
    if(inQ){
      if(ch === '"'){
        if(i+1<line.length && line[i+1] === '"'){ cur+='"'; i+=2; continue; }
        inQ=false; i++; continue;
      }
      cur+=ch; i++; continue;
    } else {
      if(ch === '"'){ inQ=true; i++; continue; }
      if(ch === ','){ out.push(cur.trim()); cur=""; i++; continue; }
      cur+=ch; i++; continue;
    }
  }
  out.push(cur.trim());
  return out;
}
function parseCSV(text){
  if(!text) return { headers: [], rows: [] };
  const s = stripBOM(text).replace(/\r/g,"");
  const lines = s.split("\n").filter(l => l.trim().length>0);
  if(!lines.length) return { headers: [], rows: [] };
  const headers = splitCSV(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cells = splitCSV(line);
    const obj = {};
    headers.forEach((h,i)=>{ obj[h] = (cells[i] ?? "").trim(); });
    return obj;
  });
  return { headers, rows };
}

// -------- helpers --------
const num = (v) => {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g,""));
  return Number.isFinite(n) ? n : NaN;
};
const firstKey = (obj, keys) => keys.find(k => obj[k] != null && obj[k] !== "") || null;
const debugOn = () => {
  try {
    const usp = new URLSearchParams(window.location.search);
    return usp.get("debug") === "csv";
  } catch { return false; }
};

// Always fetch from /public served paths: /data/home/*.csv
async function fetchPublic(path){
  const res = await fetch(path, { cache: "no-store" });
  const text = res.ok ? await res.text() : null;
  if (debugOn()) {
    console.info("[home.csv] fetch", { path, status: res.status, bytes: text ? text.length : 0 });
  }
  return text;
}

// -------- loaders: each returns an ARRAY of mapped rows --------

// 1) Superintendents table: DISTRICT_N (id), DISTRICT_NAME (name), SUPERINTENDENT_NAME, FTE_SALARY, ENROLLMENT
export async function loadSuperintendents(){
  const text = await fetchPublic("/data/home/superintendents.csv");
  if(!text) return [];
  const parsed = parseCSV(text);

  const rows = parsed.rows.map(r => {
    const idKey   = firstKey(r, ["DISTRICT_N","DISTRICT_ID","DISTRICT_NUMBER","ID"]);
    const nameKey = firstKey(r, ["DISTRICT_NAME","NAME","DNAME"]);
    const supKey  = firstKey(r, ["SUPERINTENDENT_NAME","SUPT_NAME","SUPERINTENDENT"]);
    const salKey  = firstKey(r, ["FTE_SALARY","SUPERINTENDENT_SALARY","SUPT_SALARY","BASE_FTE_SALARY"]);
    const enrKey  = firstKey(r, ["ENROLLMENT","Enrollment","ENR","STUDENTS"]);
    return {
      id: r[idKey],
      name: r[nameKey],
      supName: r[supKey] ?? "",
      fteSalary: num(r[salKey]),
      enroll: num(r[enrKey])
    };
  }).filter(d => d.id && d.name && Number.isFinite(d.fteSalary));

  if (debugOn()) {
    console.info("[home.superintendents]", {
      headers: parsed.headers, first: parsed.rows[0], mapped: rows.length
    });
  }
  return rows;
}

// 2) Indebted table: id, name, debt metric, enroll
export async function loadIndebted(){
  const text = await fetchPublic("/data/home/indebted.csv");
  if(!text) return [];
  const parsed = parseCSV(text);

  const rows = parsed.rows.map(r => {
    const id   = r.DISTRICT_N ?? r.DISTRICT_ID ?? r.DISTRICT_NUMBER ?? r.ID;
    const name = r.DISTRICT_NAME ?? r.NAME ?? r.DNAME ?? "";
    const enroll = num(r.ENROLLMENT ?? r.Enrollment ?? r.ENR ?? r.STUDENTS);

    // prefer explicit total-debt columns; fall back to per‑pupil debt * enrollment
    let debt = num(r.TOTAL_DEBT ?? r.DEBT ?? r.DEBT_TOTAL ?? r.Debt ?? r["Debt"]);
    const perDebt = num(r.DEBT_PER_STUDENT ?? r["Per-Pupil Debt"] ?? r.PER_PUPIL_DEBT);
    if (!Number.isFinite(debt) && Number.isFinite(perDebt) && Number.isFinite(enroll) && enroll > 0) {
      debt = perDebt * enroll;
    }

    return { id, name, enroll, debt };
  }).filter(d => d.id && d.name && Number.isFinite(d.debt));

  if (debugOn()) {
    console.info("[home.indebted]", {
      headers: parsed.headers, first: parsed.rows[0], mapped: rows.length
    });
  }
  return rows;
}

// 3) Performance table: id, name, score (0–100), enroll
export async function loadPerformance(){
  const text = await fetchPublic("/data/home/performance.csv");
  if(!text) return [];
  const parsed = parseCSV(text);

  const rows = parsed.rows.map(r => {
    const id   = r.DISTRICT_N ?? r.DISTRICT_ID ?? r.DISTRICT_NUMBER ?? r.ID;
    const name = r.DISTRICT_NAME ?? r.NAME ?? r.DNAME ?? "";
    const enroll = num(r.ENROLLMENT ?? r.Enrollment ?? r.ENR ?? r.STUDENTS);
    let score = num(r.OVERALL_SCORE ?? r.SCORE ?? r.ACCOUNTABILITY_SCORE);
    if (!Number.isFinite(score)) {
      const rating = String(r.OVERALL_RATING ?? r.RATING ?? "").toUpperCase();
      score = { A:95, B:85, C:75, D:65, F:55 }[rating] ?? NaN;
    }
    return { id, name, score, enroll };
  }).filter(d => d.id && d.name && Number.isFinite(d.score));

  if (debugOn()) {
    console.info("[home.performance]", {
      headers: parsed.headers, first: parsed.rows[0], mapped: rows.length
    });
  }
  return rows;
}

// Enrollment buckets & formatters (already used by HomeCharts)
export const ENROLL_BUCKETS = [
  { key: "all",   label: "All sizes",   test: () => true },
  { key: "lt1k",  label: "< 1,000",     test: (n) => n < 1000 },
  { key: "1k5k",  label: "1,000–4,999", test: (n) => n >= 1000 && n < 5000 },
  { key: "5k20k", label: "5,000–19,999",test: (n) => n >= 5000 && n < 20000 },
  { key: "20k+",  label: "20,000+",     test: (n) => n >= 20000 },
];
export const usd0 = (n) => Number.isFinite(n) ? "$" + Math.round(n).toLocaleString() : "—";

