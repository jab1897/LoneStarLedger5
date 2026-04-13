import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import useSearchSuggestions from "../hooks/useSearchSuggestions";

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
    <div className="app-shell">
      <TopBar />
      <main className="app-shell__content">
        <div className="app-shell__inner">{children}</div>
      </main>
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
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-brand">
          LoneStar <span className="site-brand__accent">Ledger</span>
        </Link>
        <button
          type="button"
          onClick={toggleMenu}
          className="menu-toggle md:hidden"
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
        <nav className="site-nav md:flex">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `site-nav__link${isActive ? " is-active" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="site-controls">
          <div className="site-search">
            <GlobalSearch />
          </div>
          <button
            className="btn btn-subtle"
            type="button"
            aria-label="Toggle theme"
            onClick={() => {
              if (typeof window !== "undefined" && window.OTSTheme?.toggle) {
                window.OTSTheme.toggle();
              }
            }}
          >
            <svg width="18" height="18" aria-hidden="true" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 15a6 6 0 1 0 0-12a6 6 0 0 0 0 12Zm8-7a1 1 0 0 1 1 1h1a1 1 0 1 1 0 2h-1a1 1 0 1 1-2 0h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1-1ZM4 11a1 1 0 0 1 1 1H4a1 1 0 1 1 0-2h1a1 1 0 0 1-1 1Zm12.95 6.536l.707.707a1 1 0 1 1-1.414 1.414l-.707-.707a1 1 0 1 1 1.414-1.414ZM6.343 6.343l.707.707A1 1 0 0 1 5.636 8.16l-.707-.707A1 1 0 1 1 6.343 6.343Zm10.607-2.829a1 1 0 0 1 1.415 1.414l-.708.707a1 1 0 0 1-1.414-1.414l.707-.707ZM6.343 17.657a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 1 1 1.414-1.414l.707.707Z"
              />
            </svg>
            Theme
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="site-mobile-nav md:hidden">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMenu}
              className={({ isActive }) =>
                `site-mobile-link${isActive ? " is-active" : ""}`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>Built for Texans who want clarity in education data.</p>
      </div>
    </footer>
  );
}

function GlobalSearch() {
  const [q, setQ] = React.useState("");
  const location = useLocation();
  const nav = useNavigate();
  const [focused, setFocused] = React.useState(false);
  const blurTimeout = React.useRef(null);
  const { suggestions } = useSearchSuggestions(q, { limit: 8 });

  const onSubmit = (e) => {
    e.preventDefault();
    nav(`/search?q=${encodeURIComponent(q)}`);
  };

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const existing = params.get("q");
    if (existing) setQ(existing);
  }, [location.search]);

  React.useEffect(() => () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
  }, []);

  const handleSelect = (item) => {
    setQ(item.name);
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setFocused(false);
    if (item.type === "district") {
      nav(`/district/${encodeURIComponent(item.id)}`);
    } else if (item.type === "campus") {
      nav(`/campus/${encodeURIComponent(item.id)}`);
    } else {
      nav(`/search?q=${encodeURIComponent(item.name)}`);
    }
  };

  const showSuggestions = focused && q.trim().length > 0 && suggestions.length > 0;

  return (
    <form onSubmit={onSubmit}>
      <div className="autocomplete">
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search district, campus, or vendor"
          aria-label="Search the site"
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
            {suggestions.map((item) => (
              <button
                key={item.key}
                type="button"
                className="suggestion-option"
                onMouseDown={(evt) => evt.preventDefault()}
                onClick={() => handleSelect(item)}
              >
                <span className="suggestion-option__label">{item.name}</span>
                <span className="suggestion-option__meta">
                  {item.type === "district"
                    ? `District • ${item.id}${item.county ? ` • ${item.county}` : ""}`
                    : `Campus • ${item.id}${item.district ? ` • ${item.district}` : ""}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="submit" aria-label="Run search">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          width="20"
          height="20"
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
