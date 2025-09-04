export function stripBOM(t) {
  return t && t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t;
}

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
