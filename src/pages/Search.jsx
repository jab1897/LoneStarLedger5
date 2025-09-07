import React from "react";
import { Link, useLocation } from "react-router-dom";
import { loadDistrictsCSV } from "../lib/data";
import { getAllCampuses } from "../lib/campuses";

export default function SearchPage() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const q = params.get("q") || "";
  const term = q.trim().toLowerCase();
  const [districts, setDistricts] = React.useState([]);
  const [campuses, setCampuses] = React.useState([]);
  const [campFields, setCampFields] = React.useState(null);
  const [distFields, setDistFields] = React.useState(null);

  React.useEffect(() => {
    if (!term) {
      setDistricts([]);
      setCampuses([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const [{ rows: dRows, fields: dF }, { rows: cRows, fields: cF }] = await Promise.all([
          loadDistrictsCSV(),
          getAllCampuses(),
        ]);
        if (!active) return;
        setDistFields(dF);
        setCampFields(cF);
        const dId = dF.ID;
        const dName = dF.NAME;
        const districts = dRows.filter((r) => {
          const id = String(r[dId] ?? "").toLowerCase();
          const name = String(r[dName] ?? "").toLowerCase();
          return id.includes(term) || name.includes(term);
        });
        const cId = cF.CAMPUS_ID;
        const cName = cF.CAMPUS_NAME;
        const dField = cF.DISTRICT_NAME;
        const campuses = cRows.filter((r) => {
          const id = String(r[cId] ?? "").toLowerCase();
          const name = String(r[cName] ?? "").toLowerCase();
          const dname = dField ? String(r[dField] ?? "").toLowerCase() : "";
          return id.includes(term) || name.includes(term) || dname.includes(term);
        });
        setDistricts(districts.slice(0, 20));
        setCampuses(campuses.slice(0, 20));
      } catch (e) {
        console.error("Search failed", e);
        setDistricts([]);
        setCampuses([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [term]);

  return (
    <div className="px-4 md:px-8">
      <h1 className="text-3xl font-extrabold mb-4">Search</h1>
      {term === "" ? (
        <p>Type in the search box above to look for a district or campus.</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-2">Districts</h2>
            {districts.length ? (
              <ul className="list-disc pl-5 space-y-1">
                {districts.map((r, i) => (
                  <li key={i}>
                    <Link
                      to={`/district/${encodeURIComponent(r[distFields.ID])}`}
                      className="text-indigo-700 hover:underline"
                    >
                      {r[distFields.NAME] || r[distFields.ID]}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No district matches.</p>
            )}
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Campuses</h2>
            {campuses.length ? (
              <ul className="list-disc pl-5 space-y-1">
                {campuses.map((r, i) => (
                  <li key={i}>
                    <Link
                      to={`/campus/${encodeURIComponent(r[campFields.CAMPUS_ID])}`}
                      className="text-indigo-700 hover:underline"
                    >
                      {r[campFields.CAMPUS_NAME] || r[campFields.CAMPUS_ID]}
                    </Link>
                    {campFields.DISTRICT_NAME && (
                      <span className="text-gray-600">
                        {" "}- {r[campFields.DISTRICT_NAME]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No campus matches.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
