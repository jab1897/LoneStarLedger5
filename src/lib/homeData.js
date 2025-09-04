// Lightweight CSV loaders & mappers for homepage cards (no new deps)

const num = (v) => {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

async function fetchText(path) {
  try {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

function parseCSV(text) {
  if (!text) return { headers: [], rows: [] };
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cells = line.split(","); // assumes no embedded commas
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? "").trim(); });
    return obj;
  });
  return { headers, rows };
}

const firstKey = (obj, keys) => keys.find(k => obj[k] != null && obj[k] !== "") || null;

// ----- Loaders -----
export async function loadSuperintendents() {
  const txt = await fetchText("/data/home/superintendents.csv");
  const { rows } = parseCSV(txt);
  return rows.map(r => {
    const id = r.DISTRICT_ID ?? r.DISTRICT ?? r.DISTRICT_NUMBER ?? r.DISTRICT_N;
    const name = r.DISTRICT_NAME ?? r.NAME ?? r.DNAME ?? "";
    const payKey = firstKey(r, ["SUPERINTENDENT_SALARY","SUPT_SALARY","SALARY"]);
    const pay = num(r[payKey]);
    return { id, name, pay };
  }).filter(d => d.id && d.name && Number.isFinite(d.pay));
}

export async function loadIndebted() {
  const txt = await fetchText("/data/home/indebted.csv");
  const { rows } = parseCSV(txt);
  return rows.map(r => {
    const id = r.DISTRICT_ID ?? r.DISTRICT ?? r.DISTRICT_NUMBER ?? r.DISTRICT_N;
    const name = r.DISTRICT_NAME ?? r.NAME ?? r.DNAME ?? "";
    const enrollKey = firstKey(r, ["ENROLLMENT","ENR","STUDENTS"]);
    const enroll = num(r[enrollKey]);
    const debtKey = firstKey(r, ["DEBT_PER_STUDENT","TOTAL_DEBT","DEBT","DEBT_TOTAL"]);
    const debt = num(r[debtKey]);
    return { id, name, debt, enroll };
  }).filter(d => d.id && d.name && Number.isFinite(d.debt));
}

export async function loadPerformance() {
  const txt = await fetchText("/data/home/performance.csv");
  const { rows } = parseCSV(txt);
  return rows.map(r => {
    const id = r.DISTRICT_ID ?? r.DISTRICT ?? r.DISTRICT_NUMBER ?? r.DISTRICT_N;
    const name = r.DISTRICT_NAME ?? r.NAME ?? r.DNAME ?? "";
    const enrollKey = firstKey(r, ["ENROLLMENT","ENR","STUDENTS"]);
    const enroll = num(r[enrollKey]);
    const scoreKey = firstKey(r, ["OVERALL_SCORE","SCORE","ACCOUNTABILITY_SCORE"]);
    let score = num(r[scoreKey]);
    if (!Number.isFinite(score)) {
      const rating = (r.OVERALL_RATING || r.RATING || "").toUpperCase();
      score = {A:95,B:85,C:75,D:65,F:55}[rating] ?? NaN; // midpoint map
    }
    return { id, name, score, enroll };
  }).filter(d => d.id && d.name && Number.isFinite(d.score));
}

export const ENROLL_BUCKETS = [
  { key: "all",   label: "All sizes",   test: () => true },
  { key: "lt1k",  label: "< 1,000",     test: (n) => n < 1000 },
  { key: "1k5k",  label: "1,000–4,999", test: (n) => n >= 1000 && n < 5000 },
  { key: "5k20k", label: "5,000–19,999",test: (n) => n >= 5000 && n < 20000 },
  { key: "20k+",  label: "20,000+",     test: (n) => n >= 20000 },
];

export const usd0 = (n) => Number.isFinite(n) ? "$" + Math.round(n).toLocaleString() : "—";
