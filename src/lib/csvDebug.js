// src/lib/csvDebug.js
// Quote-aware CSV parsing + debug fetch (no external deps)

/** Strip UTF-8 BOM if present */
export function stripBOM(t) {
  return t && t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t;
}

/** Quote-aware CSV splitter (handles commas in quotes and "" escapes). */
function splitCSV(line) {
  const out = [];
  let cur = "", i = 0, inQ = false;
  while (i < line.length) {
    const ch = line[i];
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

/** Parse CSV text into { headers, rows } */
export function parseCSV(text) {
  if (!text) return { headers: [], rows: [] };
  const s = stripBOM(text).replace(/\r/g, "");
  const lines = s.split("\n").filter(l => l.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  const headers = splitCSV(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const cells = splitCSV(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? "").trim(); });
    return obj;
  });
  return { headers, rows };
}

/** Build absolute public URL (honors BASE_URL if non-/) */
export function pub(path) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  const rel  = path.startsWith("/") ? path : "/" + path;
  return base + rel;
}

/** Fetch with diagnostics: HEAD then GET (no-store). Returns { diag, text }. */
export async function fetchCSVWithDiag(path) {
  const url = pub(path);
  let head = { ok:false, status:0 }, get = { ok:false, status:0, text:null };

  try {
    const h = await fetch(url, { method: "HEAD", cache: "no-store" });
    head = { ok: h.ok, status: h.status };
  } catch { head = { ok: false, status: 0 }; }

  try {
    const r = await fetch(url, { method: "GET", cache: "no-store" });
    get = { ok: r.ok, status: r.status, text: r.ok ? await r.text() : null };
  } catch { get = { ok: false, status: 0, text: null }; }

  const bytes = get.text ? get.text.length : 0;

  const diag = {
    requested: path,
    url,
    baseUrl: import.meta.env.BASE_URL || "/",
    origin: (typeof window !== "undefined" && window.location && window.location.origin) ? window.location.origin : "",
    headStatus: head.status,
    getStatus: get.status,
    bytes
  };
  return { diag, text: get.text };
}