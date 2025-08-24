import React from "react";
import { Link } from "react-router-dom";
export default function EntityCard({ title, subtitle, tags = [], to = "#" }){
  return (
    <Link to={to} className="block bg-white border rounded-2xl p-5 hover:shadow-sm">
      <h3 className="font-bold">{title}</h3>
      {subtitle && <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>}
      {tags.length>0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t,i)=>(
            <span key={i} className="text-xs bg-gray-100 border rounded-full px-2 py-1">{t}</span>
          ))}
        </div>
      )}
    </Link>
  );
}
