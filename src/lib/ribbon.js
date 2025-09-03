// Canonical helpers used across the app (no arrows, no template literals)
export function gradeFromScore(s) {
  const n = Number(String(s == null ? "" : s).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return null;
  if (n >= 90) return "A";
  if (n >= 80) return "B";
  if (n >= 70) return "C";
  if (n >= 60) return "D";
  return "F";
}

export function gradeColorClass(g) {
  const t = String(g == null ? "" : g).toUpperCase();
  if (t === "A") return "bg-green-800";
  if (t === "B") return "bg-emerald-800";
  if (t === "C") return "bg-amber-700";
  if (t === "D") return "bg-orange-700";
  if (t === "F") return "bg-red-800";
  return "bg-gray-700";
}

export function toPct(v, digits = 1) {
  if (v == null || v === "") return "—";
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return "—";
  const clamped = Math.max(0, Math.min(1, n));
  return (clamped * 100).toFixed(digits) + "%";
}
