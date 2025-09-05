import { Link } from "react-router-dom";
import SearchBar from "./SearchBar";

export default function Header() {
  return (
    <header
      style={{
        padding: 12,
        borderBottom: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Link to="/" style={{ fontWeight: 700 }}>
        Lone Star Ledger
      </Link>
      <div style={{ flex: 1, maxWidth: 400 }}>
        <SearchBar />
      </div>
      <nav style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
        <Link to="/">Home</Link>
      </nav>
    </header>
  );
}

