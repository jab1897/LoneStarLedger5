import React from "react";
import { num } from "../lib/format";

const GRADE_COLORS = {
  A: "bg-green-700 text-white",
  B: "bg-green-300 text-gray-900",
  C: "bg-yellow-300 text-gray-900",
  D: "bg-amber-700 text-white",
  F: "bg-red-600 text-white",
};

export default function GradeScorePill({ grade, score }) {
  const g = String(grade || "").toUpperCase();
  const color = GRADE_COLORS[g] || "bg-gray-300 text-gray-900";
  const showScore = Number.isFinite(score);
  if (!g && !showScore) return null;
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-base font-bold ${color}`}
    >
      {g && <span>{g}</span>}
      {showScore && <span>{num.format(score)}</span>}
    </div>
  );
}
