import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCSV } from "../lib/staticData";

const DEBOUNCE_MS = 200;

// Alias helper: return first non-empty key
const get = (obj, keys) => {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return null;
};

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [districts, setDistricts] = useState([]); // { id, name }
  const [campuses, setCampuses] = useState([]);   // { id, name }
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const nav = useNavigate();
  const boxRef = useRef(null);
  const timer = useRef(null);

  // Load datasets once
  useEffect(() => {
    (async () => {
      try {
        const drows = await fetchCSV("/data/Current_Districts_2025.csv");
        const crows = await fetchCSV("/data/Current_Campuses_2025.csv").catch(() => []);
        const d = (drows || [])
          .map(r => ({
            id: get(r, ["DISTRICT_N", "DISTRICT_ID", "DISTRICT_NUMBER", "ID"]),
            name: get(r, ["DISTRICT_NAME", "NAME", "DNAME"])
          }))
          .filter(x => x.id && x.name);
        const c = (crows || [])
          .map(r => ({
            id: get(r, ["CAMPUS_N", "CAMPUS_ID", "ID"]),
            name: get(r, ["CAMPUS_NAME", "NAME"])
          }))
          .filter(x => x.id && x.name);
        setDistricts(d);
        setCampuses(c);
      } catch (e) {
        console.error("Search datasets failed to load", e);
      }
    })();
  }, []);

  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const term = q.trim().toLowerCase();
      if (!term) {
        setSuggestions([]);
        setActive(0);
        return;
      }
      const match = list => list.filter(x => x.name.toLowerCase().includes(term));
      const d = match(districts).slice(0, 6).map(x => ({ ...x, type: "district" }));
      const c = match(campuses).slice(0, 6).map(x => ({ ...x, type: "campus" }));
      setSuggestions([...d, ...c]);
      setActive(0);
    }, DEBOUNCE_MS);
    return () => timer.current && clearTimeout(timer.current);
  }, [q, districts, campuses]);

  const go = item => {
    if (!item) return;
    if (item.type === "district") nav(`/district/${encodeURIComponent(item.id)}`);
    else if (item.type === "campus") nav(`/campus/${encodeURIComponent(item.id)}`);
    setQ("");
    setOpen(false);
  };

  const onKeyDown = e => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(a => Math.min(a + 1, suggestions.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      go(suggestions[active]);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    const onClick = e => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative w-full" role="combobox" aria-expanded={open}>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        placeholder="Search district or campus"
        className="w-full rounded-md bg-gray-50 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-autocomplete="list"
        aria-controls="search-suggestions"
      />
      {open && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-md shadow max-h-72 overflow-auto"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.type}-${s.id}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(s)}
              className={`px-3 py-2 cursor-pointer ${i === active ? "bg-indigo-50" : ""}`}
              role="option"
              aria-selected={i === active}
            >
              <div className="flex items-center justify-between">
                <div className="truncate">{s.name}</div>
                <span className="ml-3 text-xs text-gray-500 uppercase">{s.type}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

