import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

const NAV_LINKS = [
  { to: "/districts", label: "Districts" },
  { to: "/campuses", label: "Campuses" },
  { to: "/spending", label: "Trends in Spending" },
  { to: "/why-no-amount-of-money-is-enough", label: "Why No Amount of Money is Enough" },
  { to: "/solutions", label: "Solutions" },
  { to: "/about", label: "About" },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <TopBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
      <Footer />
    </div>
  );
}

function TopBar() {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const toggleMenu = () => {
    setMenuOpen((open) => !open);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <Link to="/" className="font-black tracking-tight text-xl">
          LoneStar Ledger
        </Link>
        <button
          type="button"
          onClick={toggleMenu}
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6l-12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `hover:text-blue-700 ${isActive ? "text-blue-700" : "text-gray-600"}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex-1 min-w-0 md:flex-none md:w-96">
          <GlobalSearch />
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-1.5">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `block rounded-lg px-2 py-2 text-base font-medium hover:bg-gray-50 ${
                    isActive ? "text-blue-700" : "text-gray-700"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-gray-600">
        <p>Built for Texans who want clarity in education data.</p>
      </div>
    </footer>
  );
}

function GlobalSearch() {
  const [q, setQ] = React.useState("");
  const location = useLocation();
  const nav = useNavigate();

  const onSubmit = (e) => {
    e.preventDefault();
    nav(`/search?q=${encodeURIComponent(q)}`);
  };

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const existing = params.get("q");
    if (existing) setQ(existing);
  }, [location.search]);

  return (
    <form onSubmit={onSubmit} className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search district, campus, or vendor"
        className="w-full rounded-xl border bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 px-4 py-2.5 pr-10"
      />
      <button
        aria-label="Search"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 text-gray-500"
        >
          <path
            fillRule="evenodd"
            d="M10 2a8 8 0 105.293 14.293l4.207 4.207a1 1 0 001.414-1.414l-4.207-4.207A8 8 0 0010 2zm-6 8a6 6 0 1110.392 4.392A6 6 0 014 10z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </form>
  );
}
