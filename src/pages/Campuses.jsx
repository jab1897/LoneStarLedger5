// src/pages/Campuses.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllCampuses } from "../lib/campuses";
import useSearchSuggestions from "../hooks/useSearchSuggestions";

const fmtInt = (n) =>
  n === null || n === undefined || n === "" || Number.isNaN(+n)
    ? "—"
    : new Intl.NumberFormat("en-US").format(Math.round(+n));

export default function CampusesPage() {
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const blurTimeout = useRef(null);
  const nav = useNavigate();
  const { suggestions: campusSuggestions } = useSearchSuggestions(q, {
    limit: 6,
    types: ["campus"],
  });

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setLoading(true);
        const { rows, fields } = await getAllCampuses();
        if (on) { setRows(rows); setFields(fields); }
      } catch (e) {
        console.error(e);
        if (on) { setRows([]); setFields(null); }
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  useEffect(() => () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
  }, []);

  const showSuggestions = focused && q.trim().length > 0 && campusSuggestions.length > 0;

  const handleSelect = (item) => {
    setQ(item.name);
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setFocused(false);
    if (item.type === "campus") {
      nav(`/campus/${encodeURIComponent(item.id)}`);
    } else if (item.type === "district") {
      nav(`/district/${encodeURIComponent(item.id)}`);
    } else {
      nav(`/search?q=${encodeURIComponent(item.name)}`);
    }
  };

  const list = useMemo(() => {
    if (!rows || !fields) return [];
    const fk = fields;
    const needle = q.trim().toLowerCase();

    const mapped = rows.map((r) => ({
      id: fk.CAMPUS_ID ? String(r[fk.CAMPUS_ID] ?? "") : "",
      name: fk.CAMPUS_NAME ? String(r[fk.CAMPUS_NAME] ?? "") : "",
      distId: fk.DISTRICT_ID ? String(r[fk.DISTRICT_ID] ?? "") : "",
      distName: fk.DISTRICT_NAME ? String(r[fk.DISTRICT_NAME] ?? "") : "",
      score: fk.CAMPUS_SCORE ? r[fk.CAMPUS_SCORE] : null,
      raw: r,
    }));

    let out = mapped;
    if (needle) {
      out = out.filter(
        (x) =>
          x.name.toLowerCase().includes(needle) ||
          x.id.toLowerCase().includes(needle) ||
          x.distId.toLowerCase().includes(needle) ||
          x.distName.toLowerCase().includes(needle)
      );
    }

    // Sort by score desc (if present), then name asc
    out.sort((a, b) => {
      const A = a.score == null ? NaN : Number(String(a.score).replace(/[\$,]/g, ""));
      const B = b.score == null ? NaN : Number(String(b.score).replace(/[\$,]/g, ""));
      if (!Number.isNaN(A) || !Number.isNaN(B)) {
        if (Number.isNaN(A)) return 1;
        if (Number.isNaN(B)) return -1;
        if (B !== A) return B - A;
      }
      return a.name.localeCompare(b.name);
    });

    return out;
  }, [rows, fields, q]);

  return (
    <div className="space-y-6 px-4 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Campuses</h1>
        <div className="autocomplete w-full md:w-96">
          <input
            className="border rounded-xl px-3 py-2 w-full"
            placeholder="Search campus name, ID, or district"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              if (blurTimeout.current) clearTimeout(blurTimeout.current);
              setFocused(true);
            }}
            onBlur={() => {
              blurTimeout.current = window.setTimeout(() => setFocused(false), 120);
            }}
          />
          {showSuggestions && (
            <div className="suggestion-panel suggestion-panel--overlay">
              {campusSuggestions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="suggestion-option"
                  onMouseDown={(evt) => evt.preventDefault()}
                  onClick={() => handleSelect(item)}
                >
                  <span className="suggestion-option__label">{item.name}</span>
                  <span className="suggestion-option__meta">
                    {item.type === "campus"
                      ? `Campus • ${item.id}${item.district ? ` • ${item.district}` : ""}`
                      : `District • ${item.id}`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border rounded-2xl p-6">Loading…</div>
      ) : list.length === 0 ? (
        <div className="bg-white border rounded-2xl p-6">No campuses.</div>
      ) : (
        <div className="overflow-x-auto bg-white border rounded-2xl">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600 border-b">
              <tr>
                <th className="py-2 pr-4">Campus</th>
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">District</th>
                <th className="py-2 pr-4">Score</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={`${c.id}-${c.distId}`} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-4">
                    <Link className="text-indigo-700 font-medium" to={`/campus/${encodeURIComponent(c.id)}`}>
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{c.id}</td>
                  <td className="py-2 pr-4">{c.distName || c.distId}</td>
                  <td className="py-2 pr-4">{fmtInt(c.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
