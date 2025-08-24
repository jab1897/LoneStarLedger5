import React from "react";
export default function DataTable({ columns, rows, initialSort }){
  const [sort, setSort] = React.useState(initialSort || { key: columns[0]?.key, dir: "asc" });

  const sorted = React.useMemo(()=>{
    const out = [...rows];
    out.sort((a,b)=>{
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, sort]);

  const toggle = (key) => {
    setSort((s)=> s.key===key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  };

  return (
    <div className="overflow-hidden border rounded-2xl">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map((c)=> (
                <th key={c.key} className={`text-left font-semibold px-4 py-3 ${c.align==='right'?'text-right':''}`}>
                  <button onClick={()=>toggle(c.key)} className="inline-flex items-center gap-1 hover:underline">
                    {c.label}
                    {sort.key===c.key && (<span aria-hidden>{sort.dir==='asc'?'▲':'▼'}</span>)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row,idx)=> (
              <tr key={idx} className="odd:bg-white even:bg-gray-50">
                {columns.map((c)=> (
                  <td key={c.key} className={`px-4 py-3 ${c.align==='right'?'text-right':''}`}>
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
