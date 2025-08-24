export function toCSV(rows, columns) {
  const header = columns.map(c=>`"${c.label.replaceAll('"','""')}"`).join(',');
  const body = rows.map(r => columns.map(c=>{
    const v = r[c.key];
    const s = v == null ? '' : String(v);
    return `"${s.replaceAll('"','""')}"`;
  }).join(',')).join('\n');
  return header + '\n' + body;
}
export function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  URL.revokeObjectURL(url); a.remove();
}
