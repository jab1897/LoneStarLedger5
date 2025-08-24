import React from "react";
import { Link } from "react-router-dom";
export default function StatCard({ label, value, to }){
  return (
    <Link to={to} className="block bg-white border rounded-2xl p-5 hover:shadow-sm">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </Link>
  );
}
