import React from "react";
export default function About(){
  return (
    <div className="bg-white border rounded-2xl p-6 space-y-3 max-w-3xl">
      <h1 className="text-2xl font-bold">About LoneStar Ledger</h1>
      <p className="text-gray-700">We make Texas K-12 finance and operations easier to understand — districts, campuses, vendors, and line items in one place.</p>
      <ul className="list-disc pl-5 text-gray-700">
        <li>Data sources: TEA, Comptroller, local districts (more soon)</li>
        <li>Open data exports (CSV) on most tables</li>
        <li>Feedback or corrections: <a className="text-blue-700 underline" href="mailto:borrego.jorge1897@gmail.com">email us</a></li>
      </ul>
    </div>
  );
}
