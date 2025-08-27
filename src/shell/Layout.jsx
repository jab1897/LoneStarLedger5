import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

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
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <Link to="/" className="font-black tracking-tight text-xl">
          LoneStar Ledger
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink to="/districts" className={({isActive})=>`hover:text-blue-700 ${isActive?'text-blue-700':'text-gray-600'}`}>Districts</NavLink>
          <NavLink to="/campuses" className={({isActive})=>`hover:text-blue-700 ${isActive?'text-blue-700':'text-gray-600'}`}>Campuses</NavLink>
          <NavLink to="/spending" className={({isActive})=>`hover:text-blue-700 ${isActive?'text-blue-700':'text-gray-600'}`}>Spending</NavLink>
          <NavLink to="/about" className={({isActive})=>`hover:text-blue-700 ${isActive?'text-blue-700':'text-gray-600'}`}>About</NavLink>
        </nav>
        <div className="ml-auto w-full md:w-96">
          <GlobalSearch />
        </div>
      </div>
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

  const navigate = useNavigate();
  const onSubmit = (e) => {
    e.preventDefault();
    const raw = (q || "").trim();
    const digits = raw.replace(/[\'\"]/g, "").replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length >= 8) {
      navigate(`/campus/${digits}`);
      return;
    }
    if (digits.length == 6) {
      navigate(`/district/${digits}`);
      return;
    }
    navigate(`/districts?q=${encodeURIComponent(raw)}`);
  };

  React.useEffect(()=>{
    const params = new URLSearchParams(location.search);
    const existing = params.get("q");
    if (existing) setQ(existing);
  }, [location.search]);

  return (
    <form onSubmit={onSubmit} className="relative">
      <input
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        placeholder="Search district, campus, or vendor"
        className="w-full rounded-xl border bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 px-4 py-2.5 pr-10"
      />
      <button aria-label="Search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-500"><path fillRule="evenodd" d="M10 2a8 8 0 105.293 14.293l4.207 4.207a1 1 0 001.414-1.414l-4.207-4.207A8 8 0 0010 2zm-6 8a6 6 0 1110.392 4.392A6 6 0 014 10z" clipRule="evenodd"/></svg>
      </button>
    </form>
  );
}
