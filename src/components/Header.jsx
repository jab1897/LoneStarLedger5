import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 12 }}>
      <Link to="/" style={{ fontWeight: 700 }}>Lone Star Ledger</Link>
      <nav style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
        <Link to="/">Home</Link>
      </nav>
    </header>
  );
}

