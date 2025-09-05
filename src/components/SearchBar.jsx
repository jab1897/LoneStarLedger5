import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { fetchCSV } from "../lib/staticData";

const DEBOUNCE_MS = 200;
const get = (o, ks) => {
  for (const k of ks) if (o?.[k]) return o[k];
  return null;
};

function DropdownPortal({ anchorRef, open, children }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const update = () => setRect(anchorRef.current.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(anchorRef.current);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update, true);
    };
  }, [open, anchorRef]);

  if (!open || !rect) return null;
  const style = {
    position: "fixed",
    left: rect.left + "px",
    top: rect.bottom + "px",
    width: rect.width + "px",
    zIndex: 99999,
  };
  return createPortal(
    <div style={style} className="z-[99999]">
      {children}
    </div>,
    document.body
  );
}

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [districts, setDistricts] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const nav = useNavigate();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    console.info("[Search] mounted");
  }, []);

  // Load datasets once
  useEffect(() => {
    (async () => {
      try {
        const drows = await fetchCSV("/data/Current_Districts_2025.csv");
        const crows = await fetchCSV("/data/Current_Campuses_2025.csv").catch(() => []);
        const d = (drows || [])
          .map((r) => ({
            id: get(r, ["DISTRICT_N", "DISTRICT_ID", "DISTRICT_NUMBER", "ID"]),
            name: get(r, ["DISTRICT_NAME", "NAME", "DNAME"]),
          }))
          .filter((x) => x.id && x.name);
        const c = (crows || [])
          .map((r) => ({
            id: get(r, ["CAMPUS_N", "CAMPUS_ID", "ID"]),
            name: get(r, ["CAMPUS_NAME", "NAME"]),
          }))
          .filter((x) => x.id && x.name);
        setDistricts(d);
        setCampuses(c);
      } catch (e) {
        console.error("[Search] datasets failed to load", e);
      }
    })();
  }, []);

  // Debounced suggestion builder
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const term = q.trim().toLowerCase();
      if (!term) {
        setSuggestions([]);
        setActive(0);
        setOpen(false);
        return;
      }
      const match = (list) => list.filter((x) => x.name.toLowerCase().includes(term));
      const d = match(districts).slice(0, 6).map((x) => ({ ...x, type: "district" }));
      const c = match(campuses).slice(0, 6).map((x) => ({ ...x, type: "campus" }));
      const combined = [...d, ...c];
      setSuggestions(combined);
      setActive(0);
      setOpen(combined.length > 0);
      console.info("[Search] suggestions", { q: term, d: d.length, c: c.length });
    }, DEBOUNCE_MS);
    return () => timer.current && clearTimeout(timer.current);
  }, [q, districts, campuses]);

  const go = (item) => {
    if (!item) return;
    console.info("[Search] go", item);
    if (item.type === "district") nav(`/district/${encodeURIComponent(item.id)}`);
    else if (item.type === "campus") nav(`/campus/${encodeURIComponent(item.id)}`);
    setQ("");
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
      setOpen(true);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length) {
        go(suggestions[active] || suggestions[0]);
      } else {
        const term = q.trim().toLowerCase();
        const pick = [...districts, ...campuses].find((x) => x.name.toLowerCase().includes(term));
        if (pick) {
          go({ ...pick, type: districts.includes(pick) ? "district" : "campus" });
        }
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Click outside to close
  useEffect(() => {
    const onClick = (ev) => {
      if (rootRef.current && !rootRef.current.contains(ev.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={rootRef} className="relative w-full" role="combobox" aria-expanded={open}>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search district or campus"
        className="w-full rounded-md bg-gray-50 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-autocomplete="list"
        aria-controls="search-suggestions"
      />

      <DropdownPortal anchorRef={inputRef} open={open}>
        <ul
          id="search-suggestions"
          className="bg-white border rounded-md shadow max-h-72 overflow-auto z-[99999]"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.type}-${s.id}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
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
      </DropdownPortal>
    </div>
  );
}

