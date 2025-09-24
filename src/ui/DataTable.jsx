import React from "react";
export default function DataTable({ columns, rows, initialSort }) {
  const [sort, setSort] = React.useState(
    initialSort || { key: columns[0]?.key, dir: "asc" }
  );

  const sorted = React.useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];

      // Try numeric comparison first
      const an =
        typeof av === "number" ? av : Number(String(av).replace(/[\$,]/g, ""));
      const bn =
        typeof bv === "number" ? bv : Number(String(bv).replace(/[\$,]/g, ""));
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        const diff = an - bn;
        return sort.dir === "asc" ? diff : -diff;
      }

      // Fallback to string comparison
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      if (as === bs) return 0;
      const cmp = as > bs ? 1 : -1;
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, sort]);

  const toggle = (key) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  };

  return (
    <div className="data-table">
      <div className="data-table__scroller">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={c.align === "right" ? "align-right" : undefined}
                >
                  <button onClick={() => toggle(c.key)}>
                    {c.label}
                    {sort.key === c.key && (
                      <span aria-hidden>{sort.dir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => (
              <tr key={idx}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={c.align === "right" ? "align-right" : undefined}
                  >
                    {c.format ? c.format(row[c.key], row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
