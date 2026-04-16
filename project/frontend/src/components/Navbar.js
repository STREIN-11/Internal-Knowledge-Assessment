import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const username = localStorage.getItem("username");

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>🧠 Knowledge Assistant</div>
      <div style={styles.links}>
        <Link style={{ ...styles.link, ...(pathname === "/" ? styles.active : {}) }} to="/">📄 Docs</Link>
        <Link style={{ ...styles.link, ...(pathname === "/chat" ? styles.active : {}) }} to="/chat">💬 Chat</Link>
      </div>
      <div style={styles.user}>
        <span style={styles.username}>👤 {username}</span>
        <button className="btn btn-outline" style={{ padding: "6px 14px" }} onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, background: "#fff", boxShadow: "0 1px 8px rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 100 },
  brand: { fontWeight: 700, fontSize: 18, color: "#4f46e5" },
  links: { display: "flex", gap: 24 },
  link: { fontWeight: 600, fontSize: 15, color: "#6b7280", padding: "4px 0", borderBottom: "2px solid transparent" },
  active: { color: "#4f46e5", borderBottom: "2px solid #4f46e5" },
  user: { display: "flex", alignItems: "center", gap: 12 },
  username: { fontSize: 14, color: "#6b7280" },
};
