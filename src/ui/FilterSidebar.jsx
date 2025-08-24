import React from "react";
export default function FilterSidebar({ filters = {} }){
  return (
    <div className="bg-white border rounded-2xl p-4 space-y-4">
      <h2 className="text-sm font-bold tracking-wide text-gray-700">Filters</h2>
      {Object.entries(filters).map(([name, values])=> (
        <fieldset key={name} className="border-t pt-4">
          <legend className="text-sm font-medium capitalize">{name}</legend>
          <div className="mt-2 space-y-2">
            {values.map((v)=> (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <button className="w-full mt-2 rounded-xl bg-blue-700 text-white py-2.5 text-sm font-semibold hover:bg-blue-800">Apply</button>
    </div>
  );
}
