import React from "react";
import { Link } from "react-router-dom";
export default function NotFound(){
  return (
    <div className="max-w-xl mx-auto bg-white border rounded-2xl p-6 mt-10 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-gray-600 mt-2">Try going back to the homepage.</p>
      <Link to="/" className="inline-block mt-4 px-4 py-2 rounded-lg bg-blue-700 text-white">Home</Link>
    </div>
  );
}
