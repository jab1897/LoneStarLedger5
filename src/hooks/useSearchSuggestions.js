import { useEffect, useMemo, useState } from "react";
import { loadSearchIndex } from "../lib/searchIndex";

export default function useSearchSuggestions(term, options = {}) {
  const { limit = 8, types } = options;
  const [index, setIndex] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadSearchIndex()
      .then((data) => {
        if (!cancelled) setIndex(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const q = (term || "").trim().toLowerCase();
    if (!q || !index) return [];
    const pool = types ? index.all.filter((item) => types.includes(item.type)) : index.all;
    if (!pool.length) return [];

    const hits = [];
    for (const item of pool) {
      if (item.search.includes(q)) {
        hits.push(item);
        if (hits.length >= limit) break;
      }
    }
    return hits;
  }, [term, index, types, limit]);

  return { suggestions, error, ready: Boolean(index), loading: !index && !error };
}
